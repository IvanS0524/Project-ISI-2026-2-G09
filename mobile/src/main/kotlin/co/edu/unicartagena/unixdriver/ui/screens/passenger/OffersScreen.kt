package co.edu.unicartagena.unixdriver.ui.screens.passenger

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import co.edu.unicartagena.unixdriver.data.PLATFORM_IDS
import co.edu.unicartagena.unixdriver.data.platformInfo
import co.edu.unicartagena.unixdriver.model.PlatformId
import co.edu.unicartagena.unixdriver.model.PlatformStatus
import co.edu.unicartagena.unixdriver.model.SearchQuery
import co.edu.unicartagena.unixdriver.model.TransportOffer
import co.edu.unicartagena.unixdriver.service.TransportService
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.state.Route
import co.edu.unicartagena.unixdriver.ui.components.Banner
import co.edu.unicartagena.unixdriver.ui.components.ButtonVariant
import co.edu.unicartagena.unixdriver.ui.components.EmptyState
import co.edu.unicartagena.unixdriver.ui.components.InfoRow
import co.edu.unicartagena.unixdriver.ui.components.OfferCard
import co.edu.unicartagena.unixdriver.ui.components.PlatformMark
import co.edu.unicartagena.unixdriver.ui.components.ScreenBody
import co.edu.unicartagena.unixdriver.ui.components.Tone
import co.edu.unicartagena.unixdriver.ui.components.UxButton
import co.edu.unicartagena.unixdriver.ui.components.UxCard
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.formatCOP
import kotlinx.coroutines.launch

private fun initialStatuses(): Map<PlatformId, PlatformStatus> = PLATFORM_IDS.associateWith { PlatformStatus.CONSULTANDO }

private fun statusText(status: PlatformStatus): String = when (status) {
    PlatformStatus.CONSULTANDO -> "Consultando"
    PlatformStatus.DISPONIBLE -> "Con oferta"
    PlatformStatus.SIN_DISPONIBILIDAD -> "Sin disponibilidad"
    PlatformStatus.SIN_RESPUESTA -> "No respondió"
}

@Composable
fun OffersScreen(store: AppStore, query: SearchQuery) {
    var statuses by remember { mutableStateOf(initialStatuses()) }
    var offers by remember { mutableStateOf(emptyList<TransportOffer>()) }
    var selectedId by remember { mutableStateOf<String?>(null) }
    var confirming by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf<String?>(null) }
    var runKey by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()

    // Cada vez que cambia runKey se reinicia la consulta (la anterior se cancela sola).
    LaunchedEffect(runKey) {
        statuses = initialStatuses()
        offers = emptyList()
        selectedId = null
        notice = null
        TransportService.searchOffers(query) { platform, status, offer ->
            statuses = statuses + (platform to status)
            if (offer != null) {
                offers = TransportService.markRecommended(offers.filter { it.platform != platform } + offer)
            }
        }
    }

    val done = PLATFORM_IDS.all { statuses[it] != PlatformStatus.CONSULTANDO }
    val sorted = offers.sortedBy { it.precioEstimado }
    val selected = offers.firstOrNull { it.id == selectedId }
    val missing = PLATFORM_IDS.filter {
        statuses[it] == PlatformStatus.SIN_RESPUESTA || statuses[it] == PlatformStatus.SIN_DISPONIBILIDAD
    }

    fun confirm() {
        val offer = selected ?: return
        scope.launch {
            confirming = true
            val ok = TransportService.confirmOffer(offer)
            confirming = false
            if (ok) {
                store.requestTrip(offer, query)
                store.replace(Route.Trip)
            } else {
                offers = TransportService.markRecommended(offers.filter { it.id != offer.id })
                selectedId = null
                notice = "La oferta de ${platformInfo(offer.platform).nombre} ya no está disponible. Elige otra de la lista."
            }
        }
    }

    ScreenBody(footer = { if (selected != null) OfferFooter(selected, confirming, ::confirm) }) {
        Column {
            Text(query.destino, style = UnixText.Title)
            Text("Desde ${query.origen} · ${query.vehicleType.label}", style = UnixText.Small)
        }

        UxCard {
            Text(if (done) "Consulta terminada" else "Consultando plataformas…", style = UnixText.Heading)
            PLATFORM_IDS.forEach { id ->
                val status = statuses.getValue(id)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    PlatformMark(id, 30.dp)
                    Text(platformInfo(id).nombre, style = UnixText.Body, modifier = Modifier.weight(1f))
                    if (status == PlatformStatus.CONSULTANDO) {
                        CircularProgressIndicator(Modifier.size(18.dp), color = UnixColors.Blue, strokeWidth = 2.dp)
                    } else {
                        Text(
                            statusText(status),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (status == PlatformStatus.DISPONIBLE) UnixColors.Success else UnixColors.Warning,
                        )
                    }
                }
            }
        }

        notice?.let { Banner(it, tone = Tone.Warning) }
        if (done && missing.isNotEmpty() && offers.isNotEmpty()) {
            val names = missing.joinToString(" y ") { platformInfo(it).nombre }
            Banner("$names no ${if (missing.size > 1) "tienen" else "tiene"} oferta ahora. Mostramos las de las demás plataformas.")
        }

        sorted.forEach { offer ->
            OfferCard(offer, selected = offer.id == selectedId, onClick = { selectedId = offer.id })
        }

        if (done && offers.isEmpty()) {
            UxCard {
                EmptyState(
                    icon = Icons.Filled.DirectionsCar,
                    title = "No hay ofertas por ahora",
                    message = "Ninguna plataforma tiene conductores disponibles para este viaje. Intenta de nuevo en unos minutos.",
                    actionLabel = "Buscar de nuevo",
                    onAction = { runKey += 1 },
                )
            }
        }
        if (done && offers.isNotEmpty()) {
            UxButton("Buscar de nuevo", { runKey += 1 }, Modifier.fillMaxWidth(), variant = ButtonVariant.Ghost, icon = Icons.Filled.Refresh)
        }
    }
}

@Composable
private fun OfferFooter(sel: TransportOffer, confirming: Boolean, onConfirm: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(UnixColors.Surface).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        InfoRow("${platformInfo(sel.platform).nombre} · ${sel.vehicleType.label}", formatCOP(sel.precioEstimado), strong = true)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(Icons.Filled.Star, contentDescription = null, tint = UnixColors.Orange, modifier = Modifier.size(13.dp))
            Text(
                "${sel.driver.calificacion} · ${sel.driver.nombre} · ${sel.driver.vehiculo} · ${"%.1f".format(sel.distancia)} km",
                style = UnixText.Small,
            )
        }
        Text("El precio es estimado. La tarifa final y la comisión se calculan al terminar el viaje.", style = UnixText.Small)
        UxButton("Solicitar viaje", onConfirm, Modifier.fillMaxWidth(), icon = Icons.Filled.CheckCircle, loading = confirming)
    }
}
