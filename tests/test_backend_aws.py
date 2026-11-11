import os
from decimal import Decimal
import pytest
from sqlalchemy import text

from backend.database.conexion import engine
from backend.models.comision import Comision
from backend.services.busqueda_service import (
    buscar_barrio_binaria,
    cargar_barrios_cartagena,
    obtener_distancia_trayecto_cartagena,
)
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


def test_calculo_dinamico_comision_sin_redundancia():
    """Verifica la regla de negocio: calcular el monto de comisión dinámicamente sin guardarlo en BD."""
    comision = Comision(porcentaje_aplicado=Decimal("5.50"), estado="PENDIENTE")
    monto = comision.calcular_comision(Decimal("15500.00"))
    assert monto == Decimal("852.50")


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