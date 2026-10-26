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


class ConfiguracionComision(Base):
    """Modelo ORM que representa la tabla 'configuracion_comision' en PostgreSQL."""

    __tablename__ = "configuracion_comision"
    __table_args__ = (
        CheckConstraint(
            "porcentaje >= 0 AND porcentaje <= 100",
            name="configuracion_comision_porcentaje_check",
        ),
        CheckConstraint(
            "estado IN ('ACTIVA', 'INACTIVA')",
            name="configuracion_comision_estado_check",
        ),
        CheckConstraint(
            "fecha_fin IS NULL OR fecha_fin >= fecha_inicio",
            name="chk_fechas_configuracion",
        ),
    )

    id_configuracion: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    porcentaje: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    fecha_inicio: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    fecha_fin: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ACTIVA",
        server_default="ACTIVA",
    )
    id_administrador: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("usuario.id_usuario", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )

    # Relaciones
    administrador: Mapped["Usuario"] = relationship("Usuario")
    comisiones: Mapped[list["Comision"]] = relationship(
        "Comision", back_populates="configuracion"
    )


class Comision(Base):
    """Modelo ORM que representa la tabla 'comision' en PostgreSQL (sin monto redundante)."""

    __tablename__ = "comision"
    __table_args__ = (
        CheckConstraint(
            "porcentaje_aplicado >= 0 AND porcentaje_aplicado <= 100",
            name="comision_porcentaje_aplicado_check",
        ),
        CheckConstraint(
            "estado IN ('GENERADA', 'PAGADA', 'ANULADA')",
            name="comision_estado_check",
        ),
    )

    id_comision: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    porcentaje_aplicado: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False
    )
    fecha_generacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="GENERADA",
        server_default="GENERADA",
    )
    id_viaje: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("viaje.id_viaje", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    id_configuracion: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "configuracion_comision.id_configuracion",
            onupdate="CASCADE",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    # Relaciones
    viaje: Mapped["Viaje"] = relationship("Viaje")
    configuracion: Mapped["ConfiguracionComision"] = relationship(
        "ConfiguracionComision", back_populates="comisiones"
    )

    def calcular_comision(self, precio_final: Optional[Decimal]) -> Decimal:
        """Calcula el valor monetario de la comisión sin almacenarlo de forma redundante."""
        if precio_final is None:
            return Decimal("0.00")
        return round((precio_final * self.porcentaje_aplicado) / Decimal("100"), 2)