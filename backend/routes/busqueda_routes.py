from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.database.conexion import get_db
from backend.schemas.busqueda import BusquedaCrear, BusquedaRespuesta
from backend.services import busqueda_service, lugar_ia_service

router = APIRouter(prefix="/busquedas", tags=["Búsqueda Unificada y Barrios"])


@router.get(
    "/barrios",
    response_model=list[dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Listar o filtrar los 212 barrios oficiales de Cartagena",
)
def listar_barrios_cartagena(
    q: Optional[str] = Query(
        default=None,
        description="Texto opcional para autocompletar barrios (ej. 'popa', 'bocagrande')",
    )
):
    """Devuelve el catálogo oficial de barrios de Cartagena con sus coordenadas X y Y."""
    return busqueda_service.filtrar_barrios_autocompletado(q)


@router.get(
    "/resolver-lugar",
    response_model=list[dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Resolver un lugar o dirección en Cartagena con coordenadas exactas",
)
def resolver_lugar_cartagena(
    q: str = Query(
        ...,
        min_length=3,
        max_length=120,
        description="Nombre del lugar, sitio turístico, hotel, restaurante o dirección en Cartagena",
    )
):
    """
    Resuelve lugares de Cartagena de Indias devolviendo coordenadas reales exactas
    dentro de la ciudad junto con su barrio oficial más cercano del catálogo S3.
    """
    return lugar_ia_service.resolver_lugar_cartagena(q)


@router.post(
    "/",
    response_model=BusquedaRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Realizar búsqueda unificada de transporte (DSS04P)",
)
def realizar_busqueda_unificada(
    datos: BusquedaCrear, db: Session = Depends(get_db)
):
    """
    Calcula la distancia real entre barrios de Cartagena usando coordenadas oficiales,
    consulta las plataformas activas (Uber, DiDi, inDrive) y ordena las ofertas por recomendación.
    """
    return busqueda_service.ejecutar_busqueda_unificada(db, datos)


@router.get(
    "/{id_busqueda}",
    response_model=BusquedaRespuesta,
    status_code=status.HTTP_200_OK,
    summary="Consultar los resultados de una búsqueda por ID",
)
def obtener_busqueda(id_busqueda: int, db: Session = Depends(get_db)):
    """Recupera una búsqueda registrada junto con todas sus ofertas asociadas."""
    return busqueda_service.obtener_busqueda_por_id(db, id_busqueda)