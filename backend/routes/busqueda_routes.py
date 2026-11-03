from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.database.conexion import get_db
from backend.database.repository import busqueda_repository
from backend.schemas.busqueda import BusquedaCrear, BusquedaRespuesta
from backend.services import busqueda_service

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
    busqueda = busqueda_repository.obtener_busqueda_por_id(db, id_busqueda)
    if not busqueda:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La búsqueda con id {id_busqueda} no existe.",
        )
    return busqueda