package co.edu.unicartagena.unixdriver.ui.screens.passenger

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.Box
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import co.edu.unicartagena.unixdriver.data.platformInfo
import co.edu.unicartagena.unixdriver.model.Trip
import co.edu.unicartagena.unixdriver.model.TripStatus
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.state.PassengerTab
import co.edu.unicartagena.unixdriver.state.Route
import co.edu.unicartagena.unixdriver.ui.components.EmptyState
import co.edu.unicartagena.unixdriver.ui.components.PlatformMark
import co.edu.unicartagena.unixdriver.ui.components.ScreenBody
import co.edu.unicartagena.unixdriver.ui.components.StatusBadge
import co.edu.unicartagena.unixdriver.ui.components.UxCard
import co.edu.unicartagena.unixdriver.ui.components.UxChip
import co.edu.unicartagena.unixdriver.ui.components.tone
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.formatCOP
import co.edu.unicartagena.unixdriver.util.formatDate

@Composable
fun HistoryScreen(store: AppStore) {
    var filter by remember { mutableStateOf<TripStatus?>(null) }

    val userId = store.currentUser?.id
    val mine = store.trips.filter { it.userId == userId }.sortedByDescending { it.fechaMillis }
    val visible = if (filter == null) mine else mine.filter { it.estado == filter }

    ScreenBody {
        if (mine.isEmpty()) {
            EmptyState(
                icon = Icons.Filled.History,
                title = "Aún no tienes viajes",
                message = "Cuando completes tu primer viaje aparecerá aquí.",
                actionLabel = "Buscar transporte",
                onAction = { store.passengerTab = PassengerTab.INICIO },
            )
            return@ScreenBody
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            UxChip("Todos", filter == null, { filter = null })
            UxChip("Finalizados", filter == TripStatus.FINALIZADO, { filter = TripStatus.FINALIZADO })
            UxChip("Cancelados", filter == TripStatus.CANCELADO, { filter = TripStatus.CANCELADO })
        }

        if (visible.isEmpty()) {
            EmptyState(icon = Icons.Filled.Search, title = "Sin resultados", message = "No hay viajes con ese estado.")
        }
        visible.forEach { trip -> TripRow(trip) { store.push(Route.TripDetail(trip.id)) } }
    }
}

@Composable
private fun TripRow(trip: Trip, onClick: () -> Unit) {
    Box(Modifier.clip(RoundedCornerShape(22.dp)).clickable(onClick = onClick)) {
        UxCard {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                PlatformMark(trip.platform, 42.dp)
                Column(Modifier.weight(1f)) {
                    Text(trip.destino, style = UnixText.Heading)
                    Text("${formatDate(trip.fechaMillis)} · ${platformInfo(trip.platform).nombre} · ${trip.vehicleType.label}", style = UnixText.Small)
                }
                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(formatCOP(trip.precioFinal), fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = UnixColors.Ink)
                    StatusBadge(trip.estado.label, trip.estado.tone())
                }
            }
        }
    }
}
