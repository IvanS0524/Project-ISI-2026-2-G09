from typing import Optional

from sqlalchemy.orm import Session

from backend.models.usuario import Rol, Usuario
from backend.schemas.usuario import UsuarioActualizar, UsuarioCrear

def obtener_rol_por_id(db: Session, id_rol: int) -> Optional[Rol]:
    """Busca un rol por su identificador único."""
    return db.query(Rol).filter(Rol.id_rol == id_rol).first()

def obtener_por_id(db: Session, id_usuario: int) -> Optional[Usuario]:
    """Busca un usuario en PostgreSQL por su llave primaria (id_usuario)."""
    return db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()

def obtener_por_correo(db: Session, correo: str) -> Optional[Usuario]:
    """Busca un usuario por su correo electrónico único (útil en DSS01P y DSS02P)."""
    return db.query(Usuario).filter(Usuario.correo == correo).first()

def listar_usuarios(
    db: Session,
    id_rol: Optional[int] = None,
    estado: Optional[str] = None,
) -> list[Usuario]:
    """Lista todos los usuarios registrados ordenados por ID (para el Administrador)."""
    consulta = db.query(Usuario)
    if id_rol is not None:
        consulta = consulta.filter(Usuario.id_rol == id_rol)
    if estado is not None:
        consulta = consulta.filter(Usuario.estado == estado.strip().upper())
    return consulta.order_by(Usuario.id_usuario.asc()).all()

def crear_usuario(
    db: Session, datos: UsuarioCrear, contrasena_hash: str
) -> Usuario:
    """Inserta un nuevo usuario en la tabla 'usuario' (DSS01P)."""
    nuevo_usuario = Usuario(
        nombre=datos.nombre,
        correo=datos.correo,
        contrasena=contrasena_hash,
        telefono=datos.telefono,
        fecha_nacimiento=datos.fecha_nacimiento,
        id_rol=datos.id_rol,
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario

def actualizar_usuario(
    db: Session, usuario_db: Usuario, datos: UsuarioActualizar
) -> Usuario:
    """Actualiza los campos del perfil de un usuario existente (DSS03P)."""
    campos_a_actualizar = datos.model_dump(exclude_unset=True)
    for campo, valor in campos_a_actualizar.items():
        setattr(usuario_db, campo, valor)

    db.commit()
    db.refresh(usuario_db)
    return usuario_db


def actualizar_estado_usuario(
    db: Session, usuario_db: Usuario, nuevo_estado: str
) -> Usuario:
    """Actualiza el estado de un usuario ('ACTIVO', 'INACTIVO', 'SUSPENDIDO')."""
    usuario_db.estado = nuevo_estado
    db.commit()
    db.refresh(usuario_db)
    return usuario_db