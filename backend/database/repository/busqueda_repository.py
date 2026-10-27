from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from backend.models.busqueda import (
    Busqueda,
    Conductor,
    Oferta,
    Plataforma,
    Vehiculo,
)
from backend.schemas.busqueda import BusquedaCrear


def listar_plataformas_activas(db: Session) -> list[Plataforma]:
    """Obtiene todas las plataformas externas con estado 'ACTIVO'."""
    return (
        db.query(Plataforma)
        .filter(Plataforma.estado == "ACTIVO")
        .order_by(Plataforma.id_plataforma.asc())
        .all()
    )


def listar_conductores(db: Session) -> list[Conductor]:
    """Obtiene los conductores registrados en la base de datos."""
    return db.query(Conductor).order_by(Conductor.id_conductor.asc()).all()


def listar_vehiculos(db: Session) -> list[Vehiculo]:
    """Obtiene los vehículos registrados en la base de datos."""
    return db.query(Vehiculo).order_by(Vehiculo.id_vehiculo.asc()).all()


def crear_busqueda(
    db: Session, datos: BusquedaCrear, estado: str = "PROCESANDO"
) -> Busqueda:
    """Registra una nueva solicitud de búsqueda unificada en PostgreSQL (DSS04P)."""
    nueva_busqueda = Busqueda(
        origen=datos.origen,
        destino=datos.destino,
        id_usuario=datos.id_usuario,
        estado=estado,
    )
    db.add(nueva_busqueda)
    db.commit()
    db.refresh(nueva_busqueda)
    return nueva_busqueda


def actualizar_estado_busqueda(
    db: Session, busqueda_db: Busqueda, nuevo_estado: str
) -> Busqueda:
    """Actualiza el estado de una búsqueda (ej. a 'COMPLETADA' o 'SIN_RESULTADOS')."""
    busqueda_db.estado = nuevo_estado
    db.commit()
    db.refresh(busqueda_db)
    return busqueda_db


def crear_oferta(
    db: Session,
    id_busqueda: int,
    id_plataforma: int,
    id_conductor: int,
    id_vehiculo: int,
    precio_estimado: Decimal,
    tiempo_estimado: int,
    distancia: Decimal,
    estado: str = "DISPONIBLE",
) -> Oferta:
    """Inserta una oferta de transporte asociada a una búsqueda en la tabla 'oferta'."""
    nueva_oferta = Oferta(
        id_busqueda=id_busqueda,
        id_plataforma=id_plataforma,
        id_conductor=id_conductor,
        id_vehiculo=id_vehiculo,
        precio_estimado=precio_estimado,
        tiempo_estimado=tiempo_estimado,
        distancia=distancia,
        estado=estado,
    )
    db.add(nueva_oferta)
    db.commit()
    db.refresh(nueva_oferta)
    return nueva_oferta


def obtener_busqueda_por_id(
    db: Session, id_busqueda: int
) -> Optional[Busqueda]:
    """Busca una solicitud de búsqueda por su ID (incluye sus ofertas por relación)."""
    return (
        db.query(Busqueda)
        .filter(Busqueda.id_busqueda == id_busqueda)
        .first()
    )


def obtener_oferta_por_id(db: Session, id_oferta: int) -> Optional[Oferta]:
    """Busca una oferta específica por su identificador único."""
    return db.query(Oferta).filter(Oferta.id_oferta == id_oferta).first()


def actualizar_estado_oferta(
    db: Session, oferta_db: Oferta, nuevo_estado: str
) -> Oferta:
    """Actualiza el estado de una oferta (ej. 'SELECCIONADA', 'EXPIRADA')."""
    oferta_db.estado = nuevo_estado
    db.commit()
    db.refresh(oferta_db)
    return oferta_db