from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base


class Plataforma(Base):
    """Modelo ORM que representa la tabla 'plataforma' en PostgreSQL."""

    __tablename__ = "plataforma"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('ACTIVO', 'INACTIVO')",
            name="chk_plataforma_estado",
        ),
    )

    id_plataforma: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    nombre: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True
    )
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="ACTIVO", server_default="ACTIVO"
    )

    # Relación 1:N -> Una plataforma puede ofrecer muchas ofertas
    ofertas: Mapped[list["Oferta"]] = relationship(
        "Oferta", back_populates="plataforma"
    )


class Conductor(Base):
    """Modelo ORM que representa la tabla 'conductor' en PostgreSQL."""

    __tablename__ = "conductor"
    __table_args__ = (
        CheckConstraint(
            "calificacion >= 0 AND calificacion <= 5",
            name="conductor_calificacion_check",
        ),
    )

    id_conductor: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    calificacion: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(3, 2), nullable=True
    )
    telefono: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Relación 1:N -> Un conductor puede aparecer en varias ofertas
    ofertas: Mapped[list["Oferta"]] = relationship(
        "Oferta", back_populates="conductor"
    )


class Vehiculo(Base):
    """Modelo ORM que representa la tabla 'vehiculo' en PostgreSQL."""

    __tablename__ = "vehiculo"

    id_vehiculo: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    placa: Mapped[str] = mapped_column(String(10), nullable=False, unique=True)
    marca: Mapped[str] = mapped_column(String(25), nullable=False)
    modelo: Mapped[str] = mapped_column(String(25), nullable=False)
    tipo: Mapped[str] = mapped_column(String(25), nullable=False)

    # Relación 1:N -> Un vehículo puede estar asociado a varias ofertas
    ofertas: Mapped[list["Oferta"]] = relationship(
        "Oferta", back_populates="vehiculo"
    )


class Busqueda(Base):
    """Modelo ORM que representa la tabla 'busqueda' en PostgreSQL (DSS04P)."""

    __tablename__ = "busqueda"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('PENDIENTE', 'PROCESANDO', 'COMPLETADA', 'SIN_RESULTADOS', 'ERROR')",
            name="busqueda_estado_check",
        ),
    )

    id_busqueda: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    origen: Mapped[str] = mapped_column(String(255), nullable=False)
    destino: Mapped[str] = mapped_column(String(255), nullable=False)
    fecha_hora: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDIENTE",
        server_default="PENDIENTE",
    )
    id_usuario: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("usuario.id_usuario", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )

    # Relaciones
    usuario: Mapped["Usuario"] = relationship("Usuario")
    ofertas: Mapped[list["Oferta"]] = relationship(
        "Oferta", back_populates="busqueda", cascade="all, delete-orphan"
    )


class Oferta(Base):
    """Modelo ORM que representa la tabla 'oferta' en PostgreSQL."""

    __tablename__ = "oferta"
    __table_args__ = (
        CheckConstraint("precio_estimado >= 0", name="oferta_precio_estimado_check"),
        CheckConstraint("tiempo_estimado >= 0", name="oferta_tiempo_estimado_check"),
        CheckConstraint("distancia >= 0", name="oferta_distancia_check"),
        CheckConstraint(
            "estado IN ('DISPONIBLE', 'SELECCIONADA', 'NO_DISPONIBLE', 'EXPIRADA')",
            name="chk_oferta_estado",
        ),
    )

    id_oferta: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    precio_estimado: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    tiempo_estimado: Mapped[int] = mapped_column(Integer, nullable=False)
    distancia: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    fecha_hora_respuesta: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="DISPONIBLE",
        server_default="DISPONIBLE",
    )

    id_busqueda: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("busqueda.id_busqueda", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    id_plataforma: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("plataforma.id_plataforma", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )
    id_conductor: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("conductor.id_conductor", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )
    id_vehiculo: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("vehiculo.id_vehiculo", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )

    # Relaciones N:1 con las tablas maestras
    busqueda: Mapped["Busqueda"] = relationship(
        "Busqueda", back_populates="ofertas"
    )
    plataforma: Mapped["Plataforma"] = relationship(
        "Plataforma", back_populates="ofertas"
    )
    conductor: Mapped["Conductor"] = relationship(
        "Conductor", back_populates="ofertas"
    )
    vehiculo: Mapped["Vehiculo"] = relationship(
        "Vehiculo", back_populates="ofertas"
    )