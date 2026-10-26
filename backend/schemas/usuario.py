from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RolRespuesta(BaseModel):
    """Esquema de salida para la entidad Rol."""

    id_rol: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class UsuarioBase(BaseModel):
    """Atributos comunes compartidos por los esquemas de Usuario."""

    nombre: str = Field(
        ..., min_length=2, max_length=100, examples=["Carlos Mendoza"]
    )
    correo: str = Field(
        ..., max_length=150, examples=["carlos.mendoza@unicartagena.edu.co"]
    )
    telefono: Optional[str] = Field(
        None, max_length=20, examples=["3001234567"]
    )
    fecha_nacimiento: Optional[date] = Field(None, examples=["2003-05-14"])


class UsuarioCrear(UsuarioBase):
    """Esquema de entrada para registrar un nuevo usuario (DSS01P)."""

    contrasena: str = Field(..., min_length=6, max_length=255)
    id_rol: int = Field(
        default=1, description="1 = PASAJERO, 2 = ADMINISTRADOR"
    )


class UsuarioLogin(BaseModel):
    """Esquema de entrada para iniciar sesión (DSS02P)."""

    correo: str = Field(
        ..., examples=["carlos.mendoza@unicartagena.edu.co"]
    )
    contrasena: str = Field(..., examples=["Pasajero123*"])


class UsuarioActualizar(BaseModel):
    """Esquema de entrada para actualizar el perfil del usuario (DSS03P)."""

    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    telefono: Optional[str] = Field(None, max_length=20)
    fecha_nacimiento: Optional[date] = None


class UsuarioRespuesta(UsuarioBase):
    """Esquema de salida con los datos públicos del usuario (sin contraseña)."""

    id_usuario: int
    fecha_registro: datetime
    estado: str
    id_rol: int
    rol: Optional[RolRespuesta] = None

    model_config = ConfigDict(from_attributes=True)