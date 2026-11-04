package co.edu.unicartagena.unixdriver.ui.screens.passenger

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import co.edu.unicartagena.unixdriver.data.platformInfo
import co.edu.unicartagena.unixdriver.model.TripStatus
import co.edu.unicartagena.unixdriver.service.Pricing
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.state.Route
import co.edu.unicartagena.unixdriver.ui.components.Banner
import co.edu.unicartagena.unixdriver.ui.components.ButtonVariant
import co.edu.unicartagena.unixdriver.ui.components.ConfirmDialog
import co.edu.unicartagena.unixdriver.ui.components.EmptyState
import co.edu.unicartagena.unixdriver.ui.components.RouteMap
import co.edu.unicartagena.unixdriver.ui.components.ScreenBody
import co.edu.unicartagena.unixdriver.ui.components.StatusBadge
import co.edu.unicartagena.unixdriver.ui.components.Step
import co.edu.unicartagena.unixdriver.ui.components.StepState
import co.edu.unicartagena.unixdriver.ui.components.StatusSteps
import co.edu.unicartagena.unixdriver.ui.components.Tone
import co.edu.unicartagena.unixdriver.ui.components.UxButton
import co.edu.unicartagena.unixdriver.ui.components.UxCard
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.initials
import kotlinx.coroutines.delay
import kotlin.math.ceil

@Composable
fun TripScreen(store: AppStore) {
    val trip = store.activeTrip
    var progress by remember { mutableStateOf(0f) }
    var showCancel by remember { mutableStateOf(false) }
    val estado = trip?.estado

    // Simula el recorrido: avanza el vehículo hasta llegar al destino y pasa al cobro.
    LaunchedEffect(estado) {
        if (estado == TripStatus.EN_CURSO) {
            while (progress < 1f) {
                delay(200)
                progress = (progress + 0.04f).coerceAtMost(1f)
            }
            store.finishTrip()
            store.replace(Route.Payment)
        }
    }

    if (trip == null) {
        ScreenBody {
            EmptyState(
                icon = Icons.Filled.DirectionsCar,
                title = "No tienes un viaje activo",
                message = "Busca transporte para comparar ofertas y solicitar tu viaje.",
                actionLabel = "Ir al inicio",
                onAction = { store.resetTo(Route.Home) },
            )
        }
        return
    }

    val platform = platformInfo(trip.platform)
    val duration = Pricing.tripDuration(trip.distancia)
    val remaining = ceil(duration * (1f - progress)).toInt().coerceAtLeast(0)
    val running = trip.estado == TripStatus.EN_CURSO

    val steps = listOf(
        Step("Solicitud creada", "Origen y destino registrados.", StepState.Done),
        Step("Solicitud distribuida", "Enviada a Uber, DiDi e inDrive.", StepState.Done),
        Step("Conductor asignado", "${platform.nombre} aceptó el viaje.", StepState.Done),
        Step(
            if (running) "Viaje en curso" else "Viaje solicitado",
            if (running) "En ruta a ${trip.destino}." else "Esperando confirmación para solicitar el viaje.",
            StepState.Active,
        ),
        Step("Cobro y comisión", "Se calculan al finalizar el viaje.", StepState.Pending),
    )

    ScreenBody {
        if (running) {
            Banner("Llegas en aproximadamente $remaining min.", title = "En ruta a ${trip.destino}")
        } else {
            Banner(
                "Origen: ${trip.origen} · Destino: ${trip.destino} · llega en ${trip.tiempoLlegada} min.",
                tone = Tone.Success,
                title = "${platform.nombre} asignó un conductor",
            )
        }

        UxCard {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(48.dp).background(UnixColors.Navy, RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                    Text(initials(trip.driver.nombre), color = androidx.compose.ui.graphics.Color.White, fontWeight = FontWeight.ExtraBold)
                }
                Column(Modifier.weight(1f)) {
                    Text(trip.driver.nombre, style = UnixText.Heading)
                    Text("${trip.driver.vehiculo} · ${trip.driver.placa}", style = UnixText.Small)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(Icons.Filled.Star, contentDescription = null, tint = UnixColors.Orange, modifier = Modifier.size(13.dp))
                        Text(trip.driver.calificacion.toString(), style = UnixText.Small)
                    }
                }
                StatusBadge(platform.nombre)
            }

            RouteMap(progress = if (running) progress else 0f)

            if (running) {
                Box(Modifier.fillMaxWidth().height(8.dp).background(UnixColors.Bg, RoundedCornerShape(50))) {
                    Box(Modifier.fillMaxWidth(progress.coerceAtLeast(0.02f)).height(8.dp).background(UnixColors.Blue, RoundedCornerShape(50)))
                }
            }
        }

        if (!running) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                UxButton("Solicitar viaje", { store.startTrip() }, Modifier.weight(1f), icon = Icons.Filled.CheckCircle)
                UxButton("Cancelar", { showCancel = true }, variant = ButtonVariant.Danger)
            }
        }

        UxCard {
            Text("Estado del servicio", style = UnixText.Heading)
            StatusSteps(steps)
        }
    }

    if (showCancel) {
        ConfirmDialog(
            title = "Cancelar viaje",
            message = "¿Seguro que quieres cancelar la solicitud de este viaje?",
            confirmLabel = "Cancelar viaje",
            dismissLabel = "Seguir con el viaje",
            destructive = true,
            onConfirm = {
                showCancel = false
                store.cancelTrip()
                store.resetTo(Route.Home)
            },
            onDismiss = { showCancel = false },
        )
    }
}
