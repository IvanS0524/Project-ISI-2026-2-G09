from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PlataformaRespuesta(BaseModel):
    """Esquema de salida para la entidad Plataforma."""

    id_plataforma: int
    nombre: str
    estado: str

    model_config = ConfigDict(from_attributes=True)


class ConductorRespuesta(BaseModel):
    """Esquema de salida para la entidad Conductor."""

    id_conductor: int
    nombre: str
    calificacion: Optional[Decimal] = None
    telefono: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class VehiculoRespuesta(BaseModel):
    """Esquema de salida para la entidad Vehiculo."""

    id_vehiculo: int
    placa: str
    marca: str
    modelo: str
    tipo: str

    model_config = ConfigDict(from_attributes=True)


class BusquedaResumenRespuesta(BaseModel):
    """Esquema resumen de la búsqueda asociada a una oferta (origen, destino y pasajero)."""

    id_busqueda: int
    origen: str
    destino: str
    fecha_hora: datetime
    id_usuario: int

    model_config = ConfigDict(from_attributes=True)


class OfertaRespuesta(BaseModel):
    """Esquema de salida para una oferta de transporte con sus detalles anidados."""

    id_oferta: int
    precio_estimado: Decimal
    tiempo_estimado: int
    distancia: Decimal
    fecha_hora_respuesta: datetime
    estado: str
    id_busqueda: int
    plataforma: PlataformaRespuesta
    conductor: ConductorRespuesta
    vehiculo: VehiculoRespuesta
    busqueda: Optional[BusquedaResumenRespuesta] = None

    model_config = ConfigDict(from_attributes=True)


class BusquedaCrear(BaseModel):
    """Esquema de entrada para solicitar una búsqueda unificada (DSS04P)."""

    origen: str = Field(
        ...,
        min_length=3,
        max_length=255,
        examples=["Universidad de Cartagena - Campus Piedra de Bolívar"],
    )
    destino: str = Field(
        ...,
        min_length=3,
        max_length=255,
        examples=["Centro Histórico - Torre del Reloj"],
    )
    id_usuario: int = Field(..., gt=0, examples=[1])
    origen_lat: Optional[float] = Field(default=None, ge=-90, le=90)
    origen_lon: Optional[float] = Field(default=None, ge=-180, le=180)
    destino_lat: Optional[float] = Field(default=None, ge=-90, le=90)
    destino_lon: Optional[float] = Field(default=None, ge=-180, le=180)


class BusquedaRespuesta(BaseModel):
    """Esquema de salida de una búsqueda unificada con sus ofertas asociadas."""

    id_busqueda: int
    origen: str
    destino: str
    fecha_hora: datetime
    estado: str
    id_usuario: int
    ofertas: list[OfertaRespuesta] = []

    model_config = ConfigDict(from_attributes=True)