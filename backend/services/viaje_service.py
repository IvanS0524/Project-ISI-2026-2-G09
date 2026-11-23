from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.database.repository import (
    busqueda_repository,
    comision_repository,
    usuario_repository,
    viaje_repository,
)
from backend.models.viaje import Viaje
from backend.schemas.viaje import ViajeActualizarEstado, ViajeCrear

TIMEOUT_VIAJE_SOLICITADO_MIN = 5

# Máquina de estados del viaje: estado actual -> estados destino permitidos.
TRANSICIONES_VIAJE: dict[str, set[str]] = {
    "SOLICITADO": {"ACEPTADO", "EN_CURSO", "COMPLETADO", "CANCELADO"},
    "ACEPTADO": {"EN_CURSO", "COMPLETADO", "CANCELADO"},
    "EN_CURSO": {"COMPLETADO", "CANCELADO"},
    "COMPLETADO": set(),
    "CANCELADO": set(),
}


def solicitar_viaje(db: Session, datos: ViajeCrear) -> Viaje:
    """
    Caso de Uso DSS05P: Selecciona una oferta de transporte y registra el viaje
    en estado 'SOLICITADO'.
    """
    oferta = busqueda_repository.obtener_oferta_por_id(db, datos.id_oferta)
    if not oferta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La oferta con id {datos.id_oferta} no existe.",
        )

    if oferta.estado in ("NO_DISPONIBLE", "EXPIRADA"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La oferta seleccionada no está disponible (estado actual: {oferta.estado}).",
        )

    viaje_existente = viaje_repository.obtener_viaje_por_oferta(
        db, datos.id_oferta
    )
    if viaje_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta oferta ya fue seleccionada previamente para un viaje.",
        )

    viaje = viaje_repository.crear_viaje(
        db=db,
        datos=datos,
        estado="SOLICITADO",
        fecha_hora_inicio=datetime.now(),
    )
    busqueda_repository.actualizar_estado_oferta(db, oferta, "SELECCIONADA")
    return viaje


def obtener_viaje(db: Session, id_viaje: int) -> Viaje:
    """Obtiene el detalle de un viaje por su ID."""
    viaje = viaje_repository.obtener_viaje_por_id(db, id_viaje)
    if not viaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El viaje con id {id_viaje} no existe.",
        )
    return viaje


def limpiar_viajes_solicitados_huerfanos(
    db: Session,
    viajes: list[Viaje],
    minutos_limite: int = TIMEOUT_VIAJE_SOLICITADO_MIN,
) -> list[Viaje]:
    """
    Marca automáticamente como CANCELADO (precio_final = 0.00) cualquier viaje
    huérfano en estado SOLICITADO con más de `minutos_limite` minutos desde inicio.
    """
    limite = timedelta(minutes=minutos_limite)
    actualizados: list[Viaje] = []

    for viaje in viajes:
        if viaje.estado != "SOLICITADO" or viaje.fecha_hora_inicio is None:
            continue
        ahora_cmp = (
            datetime.now(viaje.fecha_hora_inicio.tzinfo)
            if viaje.fecha_hora_inicio.tzinfo is not None
            else datetime.now()
        )
        if (ahora_cmp - viaje.fecha_hora_inicio) > limite:
            viaje.estado = "CANCELADO"
            viaje.precio_final = Decimal("0.00")
            viaje.fecha_hora_fin = (
                ahora_cmp
                if ahora_cmp >= viaje.fecha_hora_inicio
                else viaje.fecha_hora_inicio
            )
            actualizados.append(viaje)

    if actualizados:
        db.commit()
        for viaje in actualizados:
            db.refresh(viaje)

    return viajes


def consultar_historial_usuario(db: Session, id_usuario: int) -> list[Viaje]:
    """Caso de Uso DSS06P: Lista el historial de viajes realizados por un pasajero."""
    usuario = usuario_repository.obtener_por_id(db, id_usuario)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario consultado no existe.",
        )
    viajes = viaje_repository.listar_viajes_por_usuario(db, id_usuario)
    return limpiar_viajes_solicitados_huerfanos(db, viajes)


def listar_viajes_sistema(
    db: Session, estado: Optional[str] = None
) -> list[Viaje]:
    """Caso de Uso Administrador: Lista todos los viajes registrados en el sistema."""
    return viaje_repository.listar_todos_los_viajes(db, estado=estado)


def actualizar_estado_viaje(
    db: Session, id_viaje: int, datos: ViajeActualizarEstado
) -> Viaje:
    """
    Actualiza el estado de un viaje (SOLICITADO -> ACEPTADO -> EN_CURSO -> COMPLETADO / CANCELADO).
    Si pasa a COMPLETADO, fija precio_final y genera la comisión correspondiente.
    """
    viaje = obtener_viaje(db, id_viaje)

    if datos.estado != viaje.estado and datos.estado not in TRANSICIONES_VIAJE.get(viaje.estado, set()):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Transición de estado no permitida: {viaje.estado} -> {datos.estado}.",
        )

    if datos.estado == "COMPLETADO":
        if datos.fecha_hora_fin is None:
            datos.fecha_hora_fin = datetime.now()
        if datos.precio_final is None and viaje.oferta is not None:
            datos.precio_final = viaje.oferta.precio_estimado

    elif datos.estado == "CANCELADO":
        if datos.fecha_hora_fin is None:
            datos.fecha_hora_fin = datetime.now()
        if datos.precio_final is None:
            datos.precio_final = Decimal("0.00")

    viaje_actualizado = viaje_repository.actualizar_estado_viaje(
        db, viaje, datos
    )

    # Si el viaje se completó y aún no tiene comisión registrada, generarla automáticamente
    if viaje_actualizado.estado == "COMPLETADO":
        comision_existente = comision_repository.obtener_comision_por_viaje(
            db, viaje_actualizado.id_viaje
        )
        config_activa = comision_repository.obtener_configuracion_activa(db)
        if not comision_existente and config_activa:
            comision_repository.crear_comision_viaje(
                db=db,
                id_viaje=viaje_actualizado.id_viaje,
                id_configuracion=config_activa.id_configuracion,
                porcentaje_aplicado=config_activa.porcentaje,
                estado="GENERADA",
            )

    return viaje_actualizado