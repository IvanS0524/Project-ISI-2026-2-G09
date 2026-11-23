import os
from datetime import datetime, timedelta
from decimal import Decimal
import pytest
from sqlalchemy import text

from backend.database.conexion import engine
from backend.models.comision import Comision
from backend.models.viaje import Viaje
from backend.services.busqueda_service import (
    buscar_barrio_binaria,
    calcular_distancia_haversine_km,
    cargar_barrios_cartagena,
    encontrar_barrio_mas_cercano,
    obtener_distancia_trayecto_cartagena,
)
from backend.services import lugar_ia_service, viaje_service
from backend.services.s3_service import descargar_barrios_desde_s3


# =====================================================================
# 1. PRUEBAS UNITARIAS (Algoritmos, Catálogo de Barrios y Reglas)
# =====================================================================

def test_catalogo_212_barrios_cartagena():
    """Verifica que el catálogo cargue exactamente los 212 barrios oficiales (desde S3 o fallback local)."""
    barrios = cargar_barrios_cartagena()
    assert len(barrios) == 212


def test_busqueda_binaria_barrio_existente():
    """Verifica que la búsqueda binaria encuentre 'Pie de la Popa' ignorando mayúsculas/tildes."""
    barrio = buscar_barrio_binaria("Pie de la Popa")
    assert barrio is not None
    assert barrio["nombre_oficial"] == "PIE DE LA POPA"
    assert barrio["coordenada_x"] != 0.0
    assert barrio["coordenada_y"] != 0.0


def test_calculo_distancia_haversine_cartagena():
    """Verifica que la distancia Haversine entre Pie de la Popa y Bocagrande sea coherente (> 1 km)."""
    distancia_km = obtener_distancia_trayecto_cartagena("Pie de la Popa", "Bocagrande")
    assert distancia_km > 1.0
    assert distancia_km < 25.0


def test_distancia_trayecto_con_coordenadas_exactas():
    """Verifica que obtener_distancia_trayecto_cartagena priorice coordenadas exactas sobre búsqueda por nombre."""
    # Torre del Reloj (Centro) -> Hotel Caribe (Bocagrande)
    o_lat, o_lon = 10.4236, -75.5492
    d_lat, d_lon = 10.3987, -75.5579
    dist_exacta = obtener_distancia_trayecto_cartagena(
        "Lugar Libre A",
        "Lugar Libre B",
        origen_lat=o_lat,
        origen_lon=o_lon,
        destino_lat=d_lat,
        destino_lon=d_lon,
    )
    esperada = calcular_distancia_haversine_km(o_lon, o_lat, d_lon, d_lat)
    assert dist_exacta == esperada
    assert Decimal("2.0") < dist_exacta < Decimal("10.0")


def test_encontrar_barrio_mas_cercano_cartagena():
    """Verifica la identificación del barrio oficial más cercano a partir de coordenadas de Cartagena."""
    bocagrande = buscar_barrio_binaria("Bocagrande")
    assert bocagrande is not None
    cercano = encontrar_barrio_mas_cercano(
        float(bocagrande["coordenada_y"]),
        float(bocagrande["coordenada_x"]),
    )
    assert cercano is not None
    assert cercano["nombre_oficial"] == "BOCAGRANDE"

    popa = buscar_barrio_binaria("Pie de la Popa")
    assert popa is not None
    cercano_popa = encontrar_barrio_mas_cercano(
        float(popa["coordenada_y"]),
        float(popa["coordenada_x"]),
    )
    assert cercano_popa is not None
    assert cercano_popa["nombre_oficial"] == "PIE DE LA POPA"


def test_resolver_lugar_cartagena_flujos_y_respaldo(monkeypatch):
    """Valida resolución con Nominatim, respaldo Gemini+S3 y manejo seguro de consultas cortas."""
    lugar_ia_service.limpiar_cache_lugares()
    assert lugar_ia_service.resolver_lugar_cartagena("ab") == []

    # Caso 1: Gemini + Nominatim dentro de la caja geográfica de Cartagena
    monkeypatch.setattr(
        lugar_ia_service,
        "_interpretar_con_gemini",
        lambda q: {
            "nombre_oficial": "Hotel Sofitel Legend Santa Clara",
            "query_mapa": "Hotel Santa Clara, Cartagena, Colombia",
            "barrio_probable": "San Diego",
            "categoria": "Hotel",
        },
    )
    monkeypatch.setattr(
        lugar_ia_service,
        "_consultar_nominatim_cartagena",
        lambda q, limite=3: [
            {
                "name": "Sofitel Legend Santa Clara",
                "display_name": "Sofitel Legend Santa Clara, San Diego, Cartagena, Colombia",
                "lat": "10.4293",
                "lon": "-75.5476",
                "class": "tourism",
                "type": "hotel",
            }
        ],
    )
    res_nom = lugar_ia_service.resolver_lugar_cartagena("hotel santa clara")
    assert len(res_nom) == 1
    assert res_nom[0]["nombre"] == "Hotel Sofitel Legend Santa Clara"
    assert res_nom[0]["fuente"] == "gemini+nominatim"
    assert 10.25 <= res_nom[0]["lat"] <= 10.60
    assert -75.65 <= res_nom[0]["lon"] <= -75.35
    assert res_nom[0]["barrio"]

    # Caso 2: Nominatim vacío -> respaldo Gemini + S3
    lugar_ia_service.limpiar_cache_lugares()
    monkeypatch.setattr(lugar_ia_service, "_consultar_nominatim_cartagena", lambda q, limite=3: [])
    res_s3 = lugar_ia_service.resolver_lugar_cartagena("hotel santa clara")
    assert len(res_s3) == 1
    assert res_s3[0]["fuente"] == "gemini+s3"
    assert res_s3[0]["barrio"].upper() == "SAN DIEGO"
    lugar_ia_service.limpiar_cache_lugares()


def test_calculo_dinamico_comision_sin_redundancia():
    """Verifica la regla de negocio: calcular el monto de comisión dinámicamente sin guardarlo en BD."""
    comision = Comision(porcentaje_aplicado=Decimal("5.50"), estado="PENDIENTE")
    monto = comision.calcular_comision(Decimal("15500.00"))
    assert monto == Decimal("852.50")


def test_limpiar_viajes_solicitados_huerfanos():
    """Verifica que viajes en SOLICITADO > 5 min se cancelen automáticamente sin alterar los recientes o completados."""
    class DummyDB:
        def __init__(self):
            self.commits = 0
            self.refreshes = []

        def commit(self):
            self.commits += 1

        def refresh(self, obj):
            self.refreshes.append(obj.id_viaje)

    ahora = datetime.now()
    v_huerfano = Viaje(
        id_viaje=10,
        id_oferta=1,
        estado="SOLICITADO",
        fecha_hora_inicio=ahora - timedelta(minutes=7),
    )
    v_reciente = Viaje(
        id_viaje=11,
        id_oferta=2,
        estado="SOLICITADO",
        fecha_hora_inicio=ahora - timedelta(minutes=2),
    )
    v_completado = Viaje(
        id_viaje=12,
        id_oferta=3,
        estado="COMPLETADO",
        precio_final=Decimal("14000.00"),
        fecha_hora_inicio=ahora - timedelta(minutes=30),
        fecha_hora_fin=ahora - timedelta(minutes=15),
    )

    db = DummyDB()
    resultado = viaje_service.limpiar_viajes_solicitados_huerfanos(
        db, [v_huerfano, v_reciente, v_completado]
    )

    assert len(resultado) == 1 or len(resultado) == 3
    assert v_huerfano.estado == "CANCELADO"
    assert v_huerfano.precio_final == Decimal("0.00")
    assert v_huerfano.fecha_hora_fin is not None
    assert v_reciente.estado == "SOLICITADO"
    assert v_reciente.fecha_hora_fin is None
    assert v_completado.estado == "COMPLETADO"
    assert db.commits == 1
    assert db.refreshes == [10]


# =====================================================================
# 2. PRUEBAS DE INTEGRACIÓN CON AWS (S3 y RDS PostgreSQL)
# =====================================================================

@pytest.mark.skipif(
    not os.getenv("AWS_ACCESS_KEY_ID"),
    reason="Credenciales de AWS no configuradas en el entorno actual",
)
def test_integracion_aws_s3_barrios():
    """Comprueba la descarga directa del JSON de barrios desde el bucket de Amazon S3."""
    datos_s3 = descargar_barrios_desde_s3()
    assert datos_s3 is not None
    assert len(datos_s3) == 212


@pytest.mark.skipif(
    not os.getenv("DATABASE_URL") and os.getenv("USE_RDS_IAM", "false").lower() != "true",
    reason="Conexión a base de datos no configurada en backend/.env",
)
def test_integracion_aws_rds_postgresql():
    """Comprueba la conexión real a PostgreSQL (Amazon RDS) y verifica los datos semilla."""
    with engine.connect() as conn:
        total_usuarios = conn.execute(text("SELECT COUNT(*) FROM usuario")).scalar()
        total_plataformas = conn.execute(text("SELECT COUNT(*) FROM plataforma")).scalar()

        assert total_usuarios >= 5
        assert total_plataformas == 3