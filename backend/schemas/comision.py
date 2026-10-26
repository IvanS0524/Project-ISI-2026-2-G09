from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field

from backend.schemas.viaje import ViajeRespuesta

EstadoConfiguracionLiteral = Literal["ACTIVA", "INACTIVA"]
EstadoComisionLiteral = Literal["GENERADA", "PAGADA", "ANULADA"]


class ConfiguracionComisionCrear(BaseModel):
    """Esquema de entrada para que un administrador cree una regla de comisión."""

    porcentaje: Decimal = Field(
        ..., ge=0, le=100, examples=[Decimal("5.50")]
    )
    fecha_inicio: datetime = Field(
        ..., examples=["2026-10-01T00:00:00"]
    )
    fecha_fin: Optional[datetime] = Field(None)
    estado: EstadoConfiguracionLiteral = Field(default="ACTIVA")
    id_administrador: int = Field(..., gt=0, examples=[5])


class ConfiguracionComisionRespuesta(BaseModel):
    """Esquema de salida para una configuración de comisión."""

    id_configuracion: int
    porcentaje: Decimal
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    estado: str
    id_administrador: int

    model_config = ConfigDict(from_attributes=True)


class ComisionRespuesta(BaseModel):
    """Esquema de salida para la comisión de un viaje con cálculo dinámico del monto."""

    id_comision: int
    porcentaje_aplicado: Decimal
    fecha_generacion: datetime
    estado: str
    id_viaje: int
    id_configuracion: int
    viaje: Optional[ViajeRespuesta] = None
    configuracion: Optional[ConfiguracionComisionRespuesta] = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def monto_calculado(self) -> Decimal:
        """Calcula el valor monetario de la comisión al serializar la respuesta."""
        if self.viaje is None or self.viaje.precio_final is None:
            return Decimal("0.00")
        return round(
            (self.viaje.precio_final * self.porcentaje_aplicado) / Decimal("100"),
            2,
        )