from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.database.repository import comision_repository, usuario_repository
from backend.models.comision import Comision, ConfiguracionComision
from backend.schemas.comision import ConfiguracionComisionCrear


def obtener_configuracion_vigente(db: Session) -> ConfiguracionComision:
    """Obtiene la configuración de comisión actualmente ACTIVA."""
    config = comision_repository.obtener_configuracion_activa(db)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe ninguna configuración de comisión activa actualmente.",
        )
    return config


def crear_nueva_configuracion(
    db: Session, datos: ConfiguracionComisionCrear
) -> ConfiguracionComision:
    """
    Caso de Uso Administrador: Registra una nueva regla de comisión.
    Si la nueva regla entra como 'ACTIVA', desactiva las anteriores automáticamente.
    """
    admin = usuario_repository.obtener_por_id(db, datos.id_administrador)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario administrador indicado no existe.",
        )

    if admin.id_rol != 2:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un usuario con rol ADMINISTRADOR puede configurar comisiones.",
        )

    if datos.fecha_fin is not None and datos.fecha_fin < datos.fecha_inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de fin no puede ser anterior a la fecha de inicio.",
        )

    return comision_repository.crear_configuracion_comision(db, datos)


def listar_todas_las_comisiones(db: Session) -> list[Comision]:
    """Lista todas las comisiones generadas por los viajes para reportes administrativos."""
    return comision_repository.listar_comisiones(db)


def listar_historial_configuraciones(
    db: Session,
) -> list[ConfiguracionComision]:
    """Lista el historial completo de configuraciones de porcentaje de comisión."""
    return comision_repository.listar_configuraciones_comision(db)