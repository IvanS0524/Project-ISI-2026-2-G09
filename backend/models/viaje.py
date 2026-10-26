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
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base


class Viaje(Base):
    """Modelo ORM que representa la tabla 'viaje' en PostgreSQL (DSS05P y DSS06P)."""

    __tablename__ = "viaje"
    __table_args__ = (
        CheckConstraint("precio_final >= 0", name="viaje_precio_final_check"),
        CheckConstraint(
            "estado IN ('SOLICITADO', 'ACEPTADO', 'EN_CURSO', 'COMPLETADO', 'CANCELADO')",
            name="viaje_estado_check",
        ),
        CheckConstraint(
            "fecha_hora_fin IS NULL OR fecha_hora_fin >= fecha_hora_inicio",
            name="chk_fechas_viaje",
        ),
    )

    id_viaje: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    fecha_hora_inicio: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    fecha_hora_fin: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    precio_final: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="SOLICITADO",
        server_default="SOLICITADO",
    )
    id_oferta: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("oferta.id_oferta", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )

    # Relación 1:1 con la Oferta seleccionada
    oferta: Mapped["Oferta"] = relationship("Oferta")