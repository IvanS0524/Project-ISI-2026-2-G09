from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.schemas.busqueda import OfertaRespuesta

EstadoViajeLiteral = Literal[
    "SOLICITADO", "ACEPTADO", "EN_CURSO", "COMPLETADO", "CANCELADO"
]


class ViajeCrear(BaseModel):
    """Esquema de entrada para registrar un viaje al seleccionar una oferta (DSS05P)."""

    id_oferta: int = Field(
        ...,
        gt=0,
        description="Identificador único de la oferta seleccionada por el pasajero",
        examples=[3],
    )


class ViajeActualizarEstado(BaseModel):
    """Esquema de entrada para actualizar el estado y datos de cierre de un viaje."""

    estado: EstadoViajeLiteral = Field(..., examples=["COMPLETADO"])
    precio_final: Optional[Decimal] = Field(
        None, ge=0, examples=[Decimal("15500.00")]
    )
    fecha_hora_inicio: Optional[datetime] = None
    fecha_hora_fin: Optional[datetime] = None


class ViajeRespuesta(BaseModel):
    """Esquema de salida con el detalle del viaje y la oferta seleccionada (DSS06P)."""

    id_viaje: int
    fecha_hora_inicio: Optional[datetime] = None
    fecha_hora_fin: Optional[datetime] = None
    precio_final: Optional[Decimal] = None
    estado: str
    id_oferta: int
    oferta: Optional[OfertaRespuesta] = None

    model_config = ConfigDict(from_attributes=True)