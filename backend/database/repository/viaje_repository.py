from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from backend.models.busqueda import Busqueda, Oferta
from backend.models.viaje import Viaje
from backend.schemas.viaje import ViajeActualizarEstado, ViajeCrear


def obtener_viaje_por_id(db: Session, id_viaje: int) -> Optional[Viaje]:
    """Busca un viaje por su llave primaria (id_viaje)."""
    return db.query(Viaje).filter(Viaje.id_viaje == id_viaje).first()


def obtener_viaje_por_oferta(db: Session, id_oferta: int) -> Optional[Viaje]:
    """Verifica si una oferta ya tiene un viaje asociado (relación 1:1)."""
    return db.query(Viaje).filter(Viaje.id_oferta == id_oferta).first()


def listar_viajes_por_usuario(db: Session, id_usuario: int) -> list[Viaje]:
    """Consulta el historial de viajes de un pasajero navegando Viaje -> Oferta -> Busqueda (DSS06P)."""
    return (
        db.query(Viaje)
        .join(Oferta, Viaje.id_oferta == Oferta.id_oferta)
        .join(Busqueda, Oferta.id_busqueda == Busqueda.id_busqueda)
        .filter(Busqueda.id_usuario == id_usuario)
        .order_by(Viaje.id_viaje.desc())
        .all()
    )


def crear_viaje(
    db: Session,
    datos: ViajeCrear,
    estado: str = "SOLICITADO",
    fecha_hora_inicio: Optional[datetime] = None,
) -> Viaje:
    """Registra un nuevo viaje a partir de la oferta seleccionada (DSS05P)."""
    nuevo_viaje = Viaje(
        id_oferta=datos.id_oferta,
        estado=estado,
        fecha_hora_inicio=fecha_hora_inicio,
    )
    db.add(nuevo_viaje)
    db.commit()
    db.refresh(nuevo_viaje)
    return nuevo_viaje


def actualizar_estado_viaje(
    db: Session, viaje_db: Viaje, datos: ViajeActualizarEstado
) -> Viaje:
    """Actualiza el estado, fechas y precio final de un viaje existente."""
    campos = datos.model_dump(exclude_unset=True)
    for campo, valor in campos.items():
        setattr(viaje_db, campo, valor)

    db.commit()
    db.refresh(viaje_db)
    return viaje_db