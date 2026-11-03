from datetime import date, datetime
from typing import Optional

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base


class Rol(Base):
    """Modelo ORM que representa la tabla 'rol' en PostgreSQL."""

    __tablename__ = "rol"

    id_rol: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    nombre: Mapped[str] = mapped_column(
        String(30), nullable=False, unique=True
    )

    # Relación 1:N -> Un rol puede estar asignado a muchos usuarios
    usuarios: Mapped[list["Usuario"]] = relationship(
        "Usuario", back_populates="rol"
    )


class Usuario(Base):
    """Modelo ORM que representa la tabla 'usuario' en PostgreSQL."""

    __tablename__ = "usuario"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('ACTIVO', 'INACTIVO', 'SUSPENDIDO')",
            name="chk_usuario_estado",
        ),
    )

    id_usuario: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    correo: Mapped[str] = mapped_column(
        String(150), nullable=False, unique=True
    )
    contrasena: Mapped[str] = mapped_column(String(255), nullable=False)
    telefono: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    fecha_nacimiento: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True
    )
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="ACTIVO", server_default="ACTIVO"
    )
    id_rol: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("rol.id_rol", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )

    # Relación N:1 -> Cada usuario pertenece a un rol
    rol: Mapped["Rol"] = relationship("Rol", back_populates="usuarios")