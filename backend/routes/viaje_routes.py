from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.database.conexion import get_db
from backend.schemas.viaje import (
    ViajeActualizarEstado,
    ViajeCrear,
    ViajeRespuesta,
)
from backend.services import viaje_service

router = APIRouter(prefix="/viajes", tags=["Viajes e Historial"])


@router.get(
    "/",
    response_model=list[ViajeRespuesta],
    status_code=status.HTTP_200_OK,
    summary="Listar todos los viajes del sistema (Administrador)",
)
def listar_todos_los_viajes(
    estado: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """Lista todos los viajes del sistema con detalles de oferta, conductor, vehículo y origen/destino."""
    return viaje_service.listar_viajes_sistema(db, estado=estado)


@router.post(
    "/solicitar",
    response_model=ViajeRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Solicitar viaje seleccionando una oferta (DSS05P)",
)
def solicitar_viaje(datos: ViajeCrear, db: Session = Depends(get_db)):
    """Registra la selección de una oferta y crea el viaje en estado 'SOLICITADO'."""
    return viaje_service.solicitar_viaje(db, datos)


@router.get(
    "/usuario/{id_usuario}",
    response_model=list[ViajeRespuesta],
    status_code=status.HTTP_200_OK,
    summary="Consultar historial de viajes de un pasajero (DSS06P)",
)
def consultar_historial_pasajero(
    id_usuario: int, db: Session = Depends(get_db)
):
    """Lista todos los viajes asociados a un pasajero con los detalles de la oferta, conductor y vehículo."""
    return viaje_service.consultar_historial_usuario(db, id_usuario)


@router.get(
    "/{id_viaje}",
    response_model=ViajeRespuesta,
    status_code=status.HTTP_200_OK,
    summary="Consultar detalle y estado de un viaje",
)
def obtener_detalle_viaje(id_viaje: int, db: Session = Depends(get_db)):
    """Obtiene la información actual de un viaje específico por su ID."""
    return viaje_service.obtener_viaje(db, id_viaje)


@router.patch(
    "/{id_viaje}/estado",
    response_model=ViajeRespuesta,
    status_code=status.HTTP_200_OK,
    summary="Actualizar el estado de un viaje (ACEPTADO, EN_CURSO, COMPLETADO, CANCELADO)",
)
def actualizar_estado_del_viaje(
    id_viaje: int,
    datos: ViajeActualizarEstado,
    db: Session = Depends(get_db),
):
    """Actualiza el ciclo de vida del viaje. Al pasar a 'COMPLETADO', genera automáticamente la comisión."""
    return viaje_service.actualizar_estado_viaje(db, id_viaje, datos)