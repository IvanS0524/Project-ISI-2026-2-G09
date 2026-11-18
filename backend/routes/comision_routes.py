from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.database.conexion import get_db
from backend.schemas.comision import (
    ComisionRespuesta,
    ConfiguracionComisionCrear,
    ConfiguracionComisionRespuesta,
)
from backend.services import comision_service

router = APIRouter(
    prefix="/comisiones", tags=["Comisiones (Administración)"]
)


@router.get(
    "/configuracion/activa",
    response_model=ConfiguracionComisionRespuesta,
    status_code=status.HTTP_200_OK,
    summary="Consultar la configuración de comisión vigente",
)
def obtener_configuracion_vigente(db: Session = Depends(get_db)):
    """Devuelve la regla de porcentaje de comisión que se encuentra actualmente en estado 'ACTIVA'."""
    return comision_service.obtener_configuracion_vigente(db)


@router.get(
    "/configuracion/historial",
    response_model=list[ConfiguracionComisionRespuesta],
    status_code=status.HTTP_200_OK,
    summary="Consultar historial de configuraciones de comisión (Administrador)",
)
def listar_historial_configuraciones(db: Session = Depends(get_db)):
    """Devuelve todas las configuraciones de porcentaje de comisión ordenadas de la más reciente a la más antigua."""
    return comision_service.listar_historial_configuraciones(db)


@router.post(
    "/configuracion",
    response_model=ConfiguracionComisionRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una nueva configuración de comisión (Administrador)",
)
def configurar_comision(
    datos: ConfiguracionComisionCrear, db: Session = Depends(get_db)
):
    """Permite a un usuario con rol ADMINISTRADOR registrar un nuevo porcentaje de comisión."""
    return comision_service.crear_nueva_configuracion(db, datos)


@router.get(
    "/",
    response_model=list[ComisionRespuesta],
    status_code=status.HTTP_200_OK,
    summary="Listar todas las comisiones generadas con monto calculado",
)
def listar_comisiones_generadas(db: Session = Depends(get_db)):
    """Devuelve el listado de comisiones por viaje incluyendo el cálculo dinámico de 'monto_calculado'."""
    return comision_service.listar_todas_las_comisiones(db)