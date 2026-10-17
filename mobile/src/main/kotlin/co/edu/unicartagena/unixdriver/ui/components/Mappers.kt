package co.edu.unicartagena.unixdriver.ui.components

import co.edu.unicartagena.unixdriver.model.TripStatus

fun TripStatus.tone(): Tone = when (this) {
    TripStatus.SOLICITADO, TripStatus.EN_CURSO -> Tone.Info
    TripStatus.FINALIZADO -> Tone.Success
    TripStatus.CANCELADO -> Tone.Danger
}
