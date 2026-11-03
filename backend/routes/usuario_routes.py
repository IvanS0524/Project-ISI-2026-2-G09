from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.database.conexion import get_db
from backend.schemas.usuario import (
    UsuarioActualizar,
    UsuarioCrear,
    UsuarioLogin,
    UsuarioRespuesta,
)
from backend.services import usuario_service

router = APIRouter(prefix="/usuarios", tags=["Usuarios y Autenticación"])


@router.post(
    "/registro",
    response_model=UsuarioRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo usuario (DSS01P)",
)
def registrar_usuario(
    datos: UsuarioCrear, db: Session = Depends(get_db)
):
    """Registra un nuevo pasajero o administrador validando que el correo sea único."""
    return usuario_service.registrar_usuario(db, datos)


@router.post(
    "/login",
    response_model=UsuarioRespuesta,
    status_code=status.HTTP_200_OK,
    summary="Iniciar sesión (DSS02P)",
)
def iniciar_sesion(
    credenciales: UsuarioLogin, db: Session = Depends(get_db)
):
    """Autentica las credenciales del usuario y devuelve su perfil público."""
    return usuario_service.autenticar_usuario(db, credenciales)


@router.get(
    "/{id_usuario}",
    response_model=UsuarioRespuesta,
    status_code=status.HTTP_200_OK,
    summary="Consultar perfil de usuario (DSS03P)",
)
def obtener_perfil(id_usuario: int, db: Session = Depends(get_db)):
    """Obtiene la información del perfil de un usuario por su identificador."""
    return usuario_service.obtener_perfil_usuario(db, id_usuario)


@router.put(
    "/{id_usuario}",
    response_model=UsuarioRespuesta,
    status_code=status.HTTP_200_OK,
    summary="Actualizar perfil de usuario (DSS03P)",
)
def actualizar_perfil(id_usuario: int, datos: UsuarioActualizar, db: Session = Depends(get_db),):
    """Actualiza los datos básicos del perfil del usuario (nombre, teléfono, fecha de nacimiento)."""
    return usuario_service.actualizar_perfil_usuario(db, id_usuario, datos)