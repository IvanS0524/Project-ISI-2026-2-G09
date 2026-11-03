from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from backend.models.comision import Comision, ConfiguracionComision
from backend.schemas.comision import ConfiguracionComisionCrear


def obtener_configuracion_activa(
    db: Session,
) -> Optional[ConfiguracionComision]:
    """Obtiene la configuración de comisión vigente con estado 'ACTIVA'."""
    return (
        db.query(ConfiguracionComision)
        .filter(ConfiguracionComision.estado == "ACTIVA")
        .order_by(ConfiguracionComision.id_configuracion.desc())
        .first()
    )


def listar_configuraciones(db: Session) -> list[ConfiguracionComision]:
    """Lista todo el historial de configuraciones de comisión."""
    return (
        db.query(ConfiguracionComision)
        .order_by(ConfiguracionComision.id_configuracion.desc())
        .all()
    )


def crear_configuracion_comision(
    db: Session, datos: ConfiguracionComisionCrear
) -> ConfiguracionComision:
    """Crea una nueva regla de porcentaje de comisión por parte de un administrador."""
    nueva_config = ConfiguracionComision(
        porcentaje=datos.porcentaje,
        fecha_inicio=datos.fecha_inicio,
        fecha_fin=datos.fecha_fin,
        estado=datos.estado,
        id_administrador=datos.id_administrador,
    )
    db.add(nueva_config)
    db.commit()
    db.refresh(nueva_config)
    return nueva_config


def crear_comision_viaje(
    db: Session,
    id_viaje: int,
    id_configuracion: int,
    porcentaje_aplicado: Decimal,
    estado: str = "GENERADA",
) -> Comision:
    """Registra la comisión asociada a un viaje (sin almacenar monto redundante)."""
    nueva_comision = Comision(
        id_viaje=id_viaje,
        id_configuracion=id_configuracion,
        porcentaje_aplicado=porcentaje_aplicado,
        estado=estado,
    )
    db.add(nueva_comision)
    db.commit()
    db.refresh(nueva_comision)
    return nueva_comision


def listar_comisiones(db: Session) -> list[Comision]:
    """Lista todas las comisiones generadas para reportes administrativos."""
    return db.query(Comision).order_by(Comision.id_comision.asc()).all()