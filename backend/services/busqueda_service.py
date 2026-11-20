import json
import math
import unicodedata
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.services.s3_service import descargar_barrios_desde_s3
from backend.database.repository import busqueda_repository, usuario_repository
from backend.models.busqueda import Busqueda, Oferta
from backend.schemas.busqueda import BusquedaCrear

RUTA_BARRIOS_JSON = (
    Path(__file__).resolve().parent.parent / "data" / "barrios_cartagena.json"
)


def _normalizar_texto(texto: str) -> str:
    """Convierte a mayúsculas y elimina tildes para comparaciones exactas y búsquedas."""
    texto_limpio = texto.strip().upper()
    return "".join(
        c
        for c in unicodedata.normalize("NFD", texto_limpio)
        if unicodedata.category(c) != "Mn"
    )


@lru_cache(maxsize=1)
def cargar_barrios_cartagena() -> list[dict[str, Any]]:
    """
    Carga y ordena alfabéticamente los 212 barrios oficiales.
    Prioriza la descarga desde Amazon S3 (boto3) y usa el JSON local como fallback.
    """
    datos_crudos = descargar_barrios_desde_s3()

    if datos_crudos is None:
        if not RUTA_BARRIOS_JSON.exists():
            return []
        with open(RUTA_BARRIOS_JSON, mode="r", encoding="utf-8") as archivo:
            datos_crudos = json.load(archivo)

    barrios_normalizados = []
    for item in datos_crudos:
        nombre_oficial = str(item.get("Barrio") or item.get("nombre_oficial") or "").strip().upper()
        barrios_normalizados.append(
            {
                "id_barrio": int(item.get("IdBarrio") or item.get("id_barrio") or 0),
                "nombre": nombre_oficial.title(),
                "nombre_oficial": nombre_oficial,
                "clave_busqueda": _normalizar_texto(nombre_oficial),
                "localidad": str(item.get("LOC") or item.get("localidad") or "").strip(),
                "coordenada_x": float(item.get("Coordenadas X") or item.get("coordenada_x") or 0.0),
                "coordenada_y": float(item.get("Coordenadas Y") or item.get("coordenada_y") or 0.0),
            }
        )

    barrios_normalizados.sort(key=lambda b: b["clave_busqueda"])
    return barrios_normalizados


def buscar_barrio_binaria(nombre_barrio: str) -> Optional[dict[str, Any]]:
    """
    Algoritmo de Búsqueda Binaria O(log n) sobre los 212 barrios ordenados de Cartagena.
    Busca primero coincidencia exacta; si el texto incluye referencias adicionales,
    verifica contención sobre el catálogo.
    """
    barrios = cargar_barrios_cartagena()
    if not barrios or not nombre_barrio:
        return None

    objetivo = _normalizar_texto(nombre_barrio)

    # 1. Búsqueda Binaria clásica O(log n)
    izquierda = 0
    derecha = len(barrios) - 1

    while izquierda <= derecha:
        medio = (izquierda + derecha) // 2
        actual = barrios[medio]["clave_busqueda"]

        if actual == objetivo:
            return barrios[medio]
        elif actual < objetivo:
            izquierda = medio + 1
        else:
            derecha = medio - 1

    # 2. Respaldo si el usuario envió "Barrio - Punto de referencia" (ej. "Bocagrande - Av. San Martín")
    for barrio in barrios:
        if barrio["clave_busqueda"] in objetivo or objetivo in barrio["clave_busqueda"]:
            return barrio

    return None


def filtrar_barrios_autocompletado(termino: Optional[str] = None) -> list[dict[str, Any]]:
    """
    Devuelve la lista de barrios para el selector móvil en Kotlin.
    Si se envía 'termino', filtra priorizando los que empiezan por el texto buscado.
    """
    barrios = cargar_barrios_cartagena()
    if not termino or not termino.strip():
        return [
            {
                "id_barrio": b["id_barrio"],
                "nombre": b["nombre"],
                "nombre_oficial": b["nombre_oficial"],
                "localidad": b["localidad"],
                "coordenada_x": b["coordenada_x"],
                "coordenada_y": b["coordenada_y"],
            }
            for b in barrios
        ]

    consulta = _normalizar_texto(termino)
    empiezan_con = []
    contienen = []

    for b in barrios:
        info_publica = {
            "id_barrio": b["id_barrio"],
            "nombre": b["nombre"],
            "nombre_oficial": b["nombre_oficial"],
            "localidad": b["localidad"],
            "coordenada_x": b["coordenada_x"],
            "coordenada_y": b["coordenada_y"],
        }
        if b["clave_busqueda"].startswith(consulta):
            empiezan_con.append(info_publica)
        elif consulta in b["clave_busqueda"]:
            contienen.append(info_publica)

    return empiezan_con + contienen


def _distancia_linea_recta_km(
    lon1: float, lat1: float, lon2: float, lat2: float
) -> float:
    """Calcula la distancia geodésica en línea recta (km) mediante la fórmula de Haversine."""
    radio_tierra_km = 6371.0

    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return radio_tierra_km * c


def calcular_distancia_haversine_km(
    lon1: float, lat1: float, lon2: float, lat2: float
) -> Decimal:
    """
    Calcula la distancia real en kilómetros entre dos coordenadas (X=lon, Y=lat)
    usando la fórmula geodésica de Haversine + factor de ruta urbana de Cartagena (1.30).
    """
    distancia_linea_recta = _distancia_linea_recta_km(lon1, lat1, lon2, lat2)

    # Factor de corrección vial urbana en Cartagena (1.30x) y mínimo de 1.5 km
    distancia_vial = max(1.5, distancia_linea_recta * 1.30)
    return Decimal(str(round(distancia_vial, 2)))


def encontrar_barrio_mas_cercano(lat: float, lon: float) -> Optional[dict[str, Any]]:
    """
    Identifica el barrio oficial de Cartagena (catálogo S3/local) más cercano
    a unas coordenadas (lat, lon) usando distancia geodésica de Haversine.
    """
    barrios = cargar_barrios_cartagena()
    if not barrios or not (math.isfinite(lat) and math.isfinite(lon)):
        return None

    mejor_barrio: Optional[dict[str, Any]] = None
    mejor_distancia = float("inf")

    for barrio in barrios:
        bx = float(barrio.get("coordenada_x") or 0.0)
        by = float(barrio.get("coordenada_y") or 0.0)
        if bx == 0.0 and by == 0.0:
            continue
        dist = _distancia_linea_recta_km(lon, lat, bx, by)
        if dist < mejor_distancia:
            mejor_distancia = dist
            mejor_barrio = barrio

    return mejor_barrio


def _coordenadas_validas(lat: Optional[float], lon: Optional[float]) -> bool:
    """Valida que un par de coordenadas (lat, lon) sea numérico, finito y distinto de (0, 0)."""
    if lat is None or lon is None:
        return False
    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (TypeError, ValueError):
        return False
    return math.isfinite(lat_f) and math.isfinite(lon_f) and not (lat_f == 0.0 and lon_f == 0.0)


def obtener_distancia_trayecto_cartagena(
    origen: str,
    destino: str,
    origen_lat: Optional[float] = None,
    origen_lon: Optional[float] = None,
    destino_lat: Optional[float] = None,
    destino_lon: Optional[float] = None,
) -> Decimal:
    """
    Obtiene la distancia en km usando coordenadas exactas si se envían, o resolviendo
    los barrios oficiales mediante Búsqueda Binaria sobre el catálogo de Cartagena.
    """
    lon1: Optional[float] = None
    lat1: Optional[float] = None
    lon2: Optional[float] = None
    lat2: Optional[float] = None
    barrio_origen: Optional[dict[str, Any]] = None
    barrio_destino: Optional[dict[str, Any]] = None

    if _coordenadas_validas(origen_lat, origen_lon):
        lat1 = float(origen_lat)  # type: ignore[arg-type]
        lon1 = float(origen_lon)  # type: ignore[arg-type]
    else:
        barrio_origen = buscar_barrio_binaria(origen)
        if barrio_origen:
            lon1 = float(barrio_origen["coordenada_x"])
            lat1 = float(barrio_origen["coordenada_y"])

    if _coordenadas_validas(destino_lat, destino_lon):
        lat2 = float(destino_lat)  # type: ignore[arg-type]
        lon2 = float(destino_lon)  # type: ignore[arg-type]
    else:
        barrio_destino = buscar_barrio_binaria(destino)
        if barrio_destino:
            lon2 = float(barrio_destino["coordenada_x"])
            lat2 = float(barrio_destino["coordenada_y"])

    if lon1 is not None and lat1 is not None and lon2 is not None and lat2 is not None:
        if (
            barrio_origen is not None
            and barrio_destino is not None
            and barrio_origen["id_barrio"] == barrio_destino["id_barrio"]
        ):
            return Decimal("1.80")
        return calcular_distancia_haversine_km(lon1, lat1, lon2, lat2)

    # Respaldo determinístico si se ingresa una dirección libre que no menciona un barrio oficial
    semilla = sum(ord(c) for c in (origen + destino)) % 90
    return Decimal(str(round(3.5 + (semilla / 10.0), 2)))


def _calcular_puntaje_recomendacion(oferta: Oferta) -> float:
    """
    Algoritmo multicriterio para ordenar las ofertas de mejor a peor opción:
    Pondera Precio (50%), Tiempo de espera/viaje (30%) y Calificación del conductor (20%).
    """
    precio = float(oferta.precio_estimado)
    tiempo = float(oferta.tiempo_estimado)
    calificacion = (
        float(oferta.conductor.calificacion)
        if oferta.conductor and oferta.conductor.calificacion
        else 4.5
    )
    # Menor puntaje = mejor relación costo/tiempo/calidad
    return (precio * 0.50) + (tiempo * 350.0 * 0.30) - (calificacion * 1200.0 * 0.20)


def ejecutar_busqueda_unificada(db: Session, datos: BusquedaCrear) -> Busqueda:
    """
    Caso de Uso DSS04P: Realiza la búsqueda unificada en Cartagena, calcula tarifas
    según coordenadas oficiales (X, Y), persiste las ofertas y las ordena por recomendación.
    """
    if datos.origen.strip().lower() == datos.destino.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El barrio o punto de origen y el destino no pueden ser iguales.",
        )

    usuario = usuario_repository.obtener_por_id(db, datos.id_usuario)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario solicitante no existe.",
        )

    # 1. Crear el registro de búsqueda en estado 'PROCESANDO'
    busqueda = busqueda_repository.crear_busqueda(
        db, datos, estado="PROCESANDO"
    )

    # 2. Consultar plataformas activas, conductores y vehículos en PostgreSQL
    plataformas = busqueda_repository.listar_plataformas_activas(db)
    conductores = busqueda_repository.listar_conductores(db)
    vehiculos = busqueda_repository.listar_vehiculos(db)

    if not plataformas or not conductores or not vehiculos:
        return busqueda_repository.actualizar_estado_busqueda(
            db, busqueda, "SIN_RESULTADOS"
        )

    # 3. Calcular distancia real usando coordenadas exactas o Búsqueda Binaria sobre Cartagena
    distancia_km = obtener_distancia_trayecto_cartagena(
        datos.origen,
        datos.destino,
        origen_lat=datos.origen_lat,
        origen_lon=datos.origen_lon,
        destino_lat=datos.destino_lat,
        destino_lon=datos.destino_lon,
    )
    minutos_base = max(6, int(round(float(distancia_km) * 2.8)))

    # Perfiles tarifarios por proveedor en Cartagena (Tarifa base + valor por km)
    tarifas_proveedor = {
        "uber": {"base": 5200, "km": 1650, "delta_min": 0},
        "didi": {"base": 4600, "km": 1500, "delta_min": 2},
        "indrive": {"base": 4800, "km": 1550, "delta_min": -2},
    }

    for idx, plataforma in enumerate(plataformas):
        clave_plat = plataforma.nombre.strip().lower()
        if clave_plat not in tarifas_proveedor:
            continue
        config_tarifa = tarifas_proveedor[clave_plat]

        # Redondear a centenas de pesos colombianos (COP)
        precio_bruto = config_tarifa["base"] + (
            float(distancia_km) * config_tarifa["km"]
        )
        precio_cop = Decimal(str(round(precio_bruto / 100.0) * 100))
        tiempo_est = max(4, minutos_base + config_tarifa["delta_min"])

        conductor = conductores[(busqueda.id_busqueda + idx) % len(conductores)]
        vehiculo = vehiculos[(busqueda.id_busqueda + idx) % len(vehiculos)]

        busqueda_repository.crear_oferta(
            db=db,
            id_busqueda=busqueda.id_busqueda,
            id_plataforma=plataforma.id_plataforma,
            id_conductor=conductor.id_conductor,
            id_vehiculo=vehiculo.id_vehiculo,
            precio_estimado=precio_cop,
            tiempo_estimado=tiempo_est,
            distancia=distancia_km,
            estado="DISPONIBLE",
        )

    # 4. Marcar búsqueda como COMPLETADA y ordenar las ofertas con el algoritmo multicriterio
    busqueda = busqueda_repository.actualizar_estado_busqueda(
        db, busqueda, "COMPLETADA"
    )
    busqueda.ofertas.sort(key=_calcular_puntaje_recomendacion)
    return busqueda


def obtener_busqueda_por_id(db: Session, id_busqueda: int):
    """Recupera una búsqueda por su ID y ordena sus ofertas por puntaje de recomendación."""
    busqueda = busqueda_repository.obtener_busqueda_por_id(db, id_busqueda)
    if not busqueda:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La búsqueda con id {id_busqueda} no existe.",
        )
    busqueda.ofertas.sort(key=_calcular_puntaje_recomendacion)
    return busqueda
