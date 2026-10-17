package co.edu.unicartagena.unixdriver.ui.screens.passenger

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import co.edu.unicartagena.unixdriver.data.platformInfo
import co.edu.unicartagena.unixdriver.model.TripStatus
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.ui.components.Divider
import co.edu.unicartagena.unixdriver.ui.components.EmptyState
import co.edu.unicartagena.unixdriver.ui.components.InfoRow
import co.edu.unicartagena.unixdriver.ui.components.PlatformMark
import co.edu.unicartagena.unixdriver.ui.components.RouteMap
import co.edu.unicartagena.unixdriver.ui.components.ScreenBody
import co.edu.unicartagena.unixdriver.ui.components.StatusBadge
import co.edu.unicartagena.unixdriver.ui.components.UxCard
import co.edu.unicartagena.unixdriver.ui.components.tone
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.formatCOP
import co.edu.unicartagena.unixdriver.util.formatDateTime
import co.edu.unicartagena.unixdriver.util.formatPercent

@Composable
fun TripDetailScreen(store: AppStore, tripId: Long) {
    val trip = store.trips.firstOrNull { it.id == tripId }
    if (trip == null) {
        ScreenBody {
            EmptyState(Icons.Filled.Info, "No encontramos este viaje", "Vuelve al historial y selecciona otro viaje.")
        }
        return
    }

    ScreenBody {
        UxCard {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                PlatformMark(trip.platform, 44.dp)
                Column(Modifier.weight(1f)) {
                    Text(trip.destino, style = UnixText.Title)
                    Text(formatDateTime(trip.fechaMillis), style = UnixText.Small)
                }
                StatusBadge(trip.estado.label, trip.estado.tone())
            }
            RouteMap()
        }

        UxCard {
            Text("Recorrido", style = UnixText.Heading)
            InfoRow("Origen", trip.origen)
            InfoRow("Destino", trip.destino)
            InfoRow("Distancia", "${trip.distancia} km")
            InfoRow("Plataforma", platformInfo(trip.platform).nombre)
            InfoRow("Vehículo", trip.vehicleType.label)
        }

        UxCard {
            Text("Conductor", style = UnixText.Heading)
            InfoRow("Nombre", trip.driver.nombre)
            InfoRow("Vehículo", trip.driver.vehiculo)
            InfoRow("Placa", trip.driver.placa)
            InfoRow("Calificación", trip.driver.calificacion.toString())
        }

        if (trip.estado == TripStatus.FINALIZADO) {
            UxCard {
                Text("Pago", style = UnixText.Heading)
                InfoRow("Tarifa del viaje", formatCOP(trip.precioFinal))
                InfoRow("Comisión UniX (${formatPercent(trip.comisionPorcentaje)})", formatCOP(trip.comisionMonto))
                Divider()
                InfoRow("Total pagado", formatCOP(trip.precioFinal + trip.comisionMonto), strong = true)
                trip.metodoPago?.let { InfoRow("Método de pago", it) }
            }
        }
    }
}
