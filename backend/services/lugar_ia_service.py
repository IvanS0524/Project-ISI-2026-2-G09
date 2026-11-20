import json
import logging
import math
import os
import re
import unicodedata
from collections import OrderedDict
from pathlib import Path
from typing import Any, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from dotenv import load_dotenv

from backend.services.busqueda_service import (
    buscar_barrio_binaria,
    encontrar_barrio_mas_cercano,
)

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

logger = logging.getLogger(__name__)

# Caja geográfica estricta de Cartagena de Indias, Colombia
CARTAGENA_LAT_MIN = 10.25
CARTAGENA_LAT_MAX = 10.60
CARTAGENA_LON_MIN = -75.65
CARTAGENA_LON_MAX = -75.35

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_USER_AGENT = "UniXDriver-Cartagena/1.0"
HTTP_TIMEOUT_SEC = 5

# Caché LRU en memoria para consultas normalizadas
_MAX_CACHE_SIZE = 256
_CACHE_LUGARES: "OrderedDict[tuple[str, int], list[dict[str, Any]]]" = OrderedDict()


def _normalizar_consulta(texto: str) -> str:
    """Normaliza espacios, mayúsculas y tildes para cachear y deduplicar consultas."""
    limpio = " ".join(str(texto or "").strip().lower().split())
    sin_tildes = "".join(
        c for c in unicodedata.normalize("NFD", limpio) if unicodedata.category(c) != "Mn"
    )
    return sin_tildes


def _en_caja_cartagena(lat: float, lon: float) -> bool:
    """Verifica que las coordenadas estén dentro de la caja geográfica de Cartagena."""
    return (
        math.isfinite(lat)
        and math.isfinite(lon)
        and CARTAGENA_LAT_MIN <= lat <= CARTAGENA_LAT_MAX
        and CARTAGENA_LON_MIN <= lon <= CARTAGENA_LON_MAX
    )


def limpiar_cache_lugares() -> None:
    """Limpia la caché en memoria de lugares resueltos (útil para pruebas)."""
    _CACHE_LUGARES.clear()


def _guardar_en_cache(
    clave: tuple[str, int], resultados: list[dict[str, Any]]
) -> None:
    _CACHE_LUGARES[clave] = [dict(r) for r in resultados]
    _CACHE_LUGARES.move_to_end(clave)
    while len(_CACHE_LUGARES) > _MAX_CACHE_SIZE:
        _CACHE_LUGARES.popitem(last=False)


def _extraer_json_texto(texto: str) -> Optional[dict[str, Any]]:
    """Extrae un objeto JSON desde la respuesta textual de Gemini."""
    if not texto:
        return None
    limpio = texto.strip()
    limpio = re.sub(r"^```(?:json)?\s*", "", limpio, flags=re.IGNORECASE)
    limpio = re.sub(r"\s*```$", "", limpio)
    try:
        parsed = json.loads(limpio)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", limpio, flags=re.DOTALL)
        if not match:
            return None
        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None


def _interpretar_con_gemini(consulta: str) -> Optional[dict[str, str]]:
    """
    Paso A: Si GEMINI_API_KEY está configurada, interpreta la intención del usuario
    en Cartagena de Indias devolviendo nombre_oficial, query_mapa, barrio_probable y categoria.
    """
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key or "tu_api_key" in api_key.lower() or "pega_aqui" in api_key.lower():
        return None

    modelo = (os.getenv("GEMINI_MODEL") or "gemini-flash-lite-latest").strip()
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{quote(modelo, safe='')}:generateContent?key={quote(api_key, safe='')}"
    )

    prompt = (
        "Eres un asistente experto en geografía urbana de Cartagena de Indias, Colombia. "
        "Interpreta el siguiente texto buscado por un pasajero (corrige errores ortográficos y reconoce "
        "sitios turísticos, hoteles, restaurantes, calles, centros comerciales, clínicas o monumentos).\n"
        f"Consulta del usuario: {json.dumps(consulta, ensure_ascii=False)}\n\n"
        "Responde EXCLUSIVAMENTE un objeto JSON válido sin texto adicional con estas 4 claves:\n"
        '- "nombre_oficial": nombre claro y oficial del lugar en Cartagena de Indias.\n'
        '- "query_mapa": texto óptimo para buscarlo en OpenStreetMap/Nominatim en Cartagena, Colombia.\n'
        '- "barrio_probable": nombre del barrio oficial de Cartagena donde se ubica (por ejemplo: '
        '"Centro", "San Diego", "Getsemaní", "Bocagrande", "Castillogrande", "Manga", "Pie de la Popa", "Crespo", "La Boquilla").\n'
        '- "categoria": categoría breve en español (ej. "Turismo", "Hotel", "Restaurante", "Centro comercial", "Clínica", "Monumento", "Dirección").'
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }

    req = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(req, timeout=HTTP_TIMEOUT_SEC) as resp:
            cuerpo = resp.read().decode("utf-8", errors="replace")
            data = json.loads(cuerpo)
    except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        logger.warning("Gemini API no disponible para resolver lugar (%s): %s", consulta, exc)
        return None

    try:
        candidatos = data.get("candidates") or []
        partes = (candidatos[0].get("content") or {}).get("parts") or []
        texto_resp = "".join(str(p.get("text") or "") for p in partes)
    except (IndexError, AttributeError, TypeError):
        return None

    parsed = _extraer_json_texto(texto_resp)
    if not parsed:
        return None

    nombre_oficial = str(parsed.get("nombre_oficial") or "").strip()
    query_mapa = str(parsed.get("query_mapa") or "").strip()
    barrio_probable = str(parsed.get("barrio_probable") or "").strip()
    categoria = str(parsed.get("categoria") or "").strip()

    if not any([nombre_oficial, query_mapa, barrio_probable]):
        return None

    return {
        "nombre_oficial": nombre_oficial,
        "query_mapa": query_mapa,
        "barrio_probable": barrio_probable,
        "categoria": categoria or "Lugar en Cartagena",
    }


def _categoria_desde_nominatim(item: dict[str, Any], defecto: str = "Lugar en Cartagena") -> str:
    tipo = str(item.get("type") or "").lower()
    clase = str(item.get("class") or "").lower()
    mapa_cat = {
        "hotel": "Hotel",
        "hostel": "Hotel",
        "guest_house": "Hotel",
        "restaurant": "Restaurante",
        "cafe": "Restaurante",
        "bar": "Restaurante",
        "fast_food": "Restaurante",
        "hospital": "Clínica",
        "clinic": "Clínica",
        "mall": "Centro comercial",
        "supermarket": "Comercio",
        "attraction": "Turismo",
        "museum": "Turismo",
        "monument": "Monumento",
        "castle": "Monumento",
        "beach": "Playa",
        "university": "Universidad",
        "college": "Universidad",
        "aerodrome": "Aeropuerto",
    }
    if tipo in mapa_cat:
        return mapa_cat[tipo]
    if clase == "tourism":
        return "Turismo"
    if clase == "highway":
        return "Dirección"
    if clase == "amenity":
        return "Lugar de interés"
    return defecto


def _consultar_nominatim_cartagena(query: str, limite: int = 3) -> list[dict[str, Any]]:
    """
    Paso B: Consulta Nominatim (OpenStreetMap) restringido a la caja geográfica de Cartagena.
    """
    texto = str(query or "").strip()
    if len(texto) < 3:
        return []

    params = urlencode(
        {
            "q": texto,
            "format": "json",
            "limit": str(max(1, min(int(limite), 5))),
            "countrycodes": "co",
            "viewbox": f"{CARTAGENA_LON_MIN},{CARTAGENA_LAT_MAX},{CARTAGENA_LON_MAX},{CARTAGENA_LAT_MIN}",
            "bounded": "1",
            "addressdetails": "1",
        }
    )
    req = Request(
        f"{NOMINATIM_SEARCH_URL}?{params}",
        headers={
            "User-Agent": NOMINATIM_USER_AGENT,
            "Accept": "application/json",
            "Accept-Language": "es",
        },
        method="GET",
    )

    try:
        with urlopen(req, timeout=HTTP_TIMEOUT_SEC) as resp:
            cuerpo = resp.read().decode("utf-8", errors="replace")
            datos = json.loads(cuerpo)
    except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        logger.warning("Nominatim no disponible para '%s': %s", texto, exc)
        return []

    return datos if isinstance(datos, list) else []


def _formatear_resultados_nominatim(
    crudos: list[dict[str, Any]],
    fuente: str,
    limite: int,
    gemini_info: Optional[dict[str, str]] = None,
) -> list[dict[str, Any]]:
    resultados: list[dict[str, Any]] = []
    vistos: set[tuple[str, float, float]] = set()

    for idx, item in enumerate(crudos):
        try:
            lat = float(item.get("lat"))  # type: ignore[arg-type]
            lon = float(item.get("lon"))  # type: ignore[arg-type]
        except (TypeError, ValueError):
            continue

        if not _en_caja_cartagena(lat, lon):
            continue

        display_name = str(item.get("display_name") or "").strip()
        nombre_nom = str(item.get("name") or "").strip()
        if not nombre_nom and display_name:
            nombre_nom = display_name.split(",")[0].strip()

        if idx == 0 and gemini_info and gemini_info.get("nombre_oficial"):
            nombre_final = gemini_info["nombre_oficial"]
        else:
            nombre_final = nombre_nom or (gemini_info.get("nombre_oficial") if gemini_info else "") or "Lugar en Cartagena"

        barrio_cercano = encontrar_barrio_mas_cercano(lat, lon)
        nombre_barrio = (
            str(barrio_cercano["nombre"])
            if barrio_cercano and barrio_cercano.get("nombre")
            else "Cartagena"
        )

        categoria_def = (
            gemini_info.get("categoria", "Lugar en Cartagena")
            if (idx == 0 and gemini_info)
            else "Lugar en Cartagena"
        )
        categoria = _categoria_desde_nominatim(item, defecto=categoria_def)

        clave_dedup = (_normalizar_consulta(nombre_final), round(lat, 4), round(lon, 4))
        if clave_dedup in vistos:
            continue
        vistos.add(clave_dedup)

        resultados.append(
            {
                "nombre": nombre_final,
                "barrio": nombre_barrio,
                "categoria": categoria,
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "fuente": fuente,
            }
        )
        if len(resultados) >= limite:
            break

    return resultados


def resolver_lugar_cartagena(
    consulta: str, limite: int = 3
) -> list[dict[str, Any]]:
    """
    Resuelve un lugar, sitio turístico, hotel, restaurante o dirección en Cartagena de Indias:
      - Paso A: Interpretación semántica opcional con Gemini API (si GEMINI_API_KEY está configurada).
      - Paso B: Geocodificación real en Cartagena mediante Nominatim (OpenStreetMap).
      - Paso C: Respaldo con barrio probable sugerido por Gemini + coordenadas oficiales de S3.
    Nunca lanza error 500; retorna [] si la consulta es muy corta o no se encuentran resultados.
    """
    texto = str(consulta or "").strip()
    if len(texto) < 3:
        return []

    limite_seguro = max(1, min(int(limite or 3), 5))
    clave_cache = (_normalizar_consulta(texto), limite_seguro)
    if clave_cache in _CACHE_LUGARES:
        _CACHE_LUGARES.move_to_end(clave_cache)
        return [dict(r) for r in _CACHE_LUGARES[clave_cache]]

    try:
        # Paso A: Interpretación con Gemini (opcional)
        gemini_info = _interpretar_con_gemini(texto)

        # Paso B: Geocodificación real con Nominatim en Cartagena
        resultados: list[dict[str, Any]] = []
        if gemini_info and gemini_info.get("query_mapa"):
            crudos_gemini = _consultar_nominatim_cartagena(
                gemini_info["query_mapa"], limite=limite_seguro
            )
            resultados = _formatear_resultados_nominatim(
                crudos_gemini,
                fuente="gemini+nominatim",
                limite=limite_seguro,
                gemini_info=gemini_info,
            )

        if not resultados:
            query_directa = texto if "cartagena" in texto.lower() else f"{texto}, Cartagena"
            crudos_directos = _consultar_nominatim_cartagena(
                query_directa, limite=limite_seguro
            )
            if not crudos_directos and query_directa != texto:
                crudos_directos = _consultar_nominatim_cartagena(
                    texto, limite=limite_seguro
                )
            resultados = _formatear_resultados_nominatim(
                crudos_directos,
                fuente="nominatim",
                limite=limite_seguro,
                gemini_info=gemini_info,
            )

        # Paso C: Respaldo con barrio sugerido por Gemini + catálogo oficial S3
        if not resultados and gemini_info and gemini_info.get("barrio_probable"):
            barrio_s3 = buscar_barrio_binaria(gemini_info["barrio_probable"])
            if barrio_s3:
                lat_b = float(barrio_s3.get("coordenada_y") or 0.0)
                lon_b = float(barrio_s3.get("coordenada_x") or 0.0)
                if _en_caja_cartagena(lat_b, lon_b):
                    resultados = [
                        {
                            "nombre": gemini_info.get("nombre_oficial") or texto,
                            "barrio": barrio_s3["nombre"],
                            "categoria": gemini_info.get("categoria") or "Lugar en Cartagena",
                            "lat": round(lat_b, 6),
                            "lon": round(lon_b, 6),
                            "fuente": "gemini+s3",
                        }
                    ]

        _guardar_en_cache(clave_cache, resultados)
        return [dict(r) for r in resultados]
    except Exception as exc:
        logger.warning("Error inesperado resolviendo lugar '%s': %s", texto, exc)
        return []
