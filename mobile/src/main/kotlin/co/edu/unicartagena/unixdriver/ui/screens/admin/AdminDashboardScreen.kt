package co.edu.unicartagena.unixdriver.ui.screens.admin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.People
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import co.edu.unicartagena.unixdriver.data.platformInfo
import co.edu.unicartagena.unixdriver.model.Role
import co.edu.unicartagena.unixdriver.model.TripStatus
import co.edu.unicartagena.unixdriver.state.AdminTab
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.ui.components.ButtonVariant
import co.edu.unicartagena.unixdriver.ui.components.EmptyState
import co.edu.unicartagena.unixdriver.ui.components.PlatformMark
import co.edu.unicartagena.unixdriver.ui.components.ScreenBody
import co.edu.unicartagena.unixdriver.ui.components.StatTile
import co.edu.unicartagena.unixdriver.ui.components.StatusBadge
import co.edu.unicartagena.unixdriver.ui.components.UxButton
import co.edu.unicartagena.unixdriver.ui.components.UxCard
import co.edu.unicartagena.unixdriver.ui.components.tone
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.formatCOP
import co.edu.unicartagena.unixdriver.util.formatDate
import co.edu.unicartagena.unixdriver.util.formatPercent

@Composable
fun AdminDashboardScreen(store: AppStore) {
    val activeUsers = store.users.count { it.activo && it.rol == Role.PASAJERO }
    val finished = store.trips.filter { it.estado == TripStatus.FINALIZADO }
    val income = finished.sumOf { it.comisionMonto }
    val recent = store.trips.sortedByDescending { it.fechaMillis }.take(5)

    ScreenBody {
        Column {
            Text("Panel", style = UnixText.Display)
            Text("Sesión de ${store.currentUser?.nombre ?: ""}", style = UnixText.Body.copy(color = UnixColors.Muted))
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatTile("Pasajeros activos", activeUsers.toString(), Icons.Filled.People, Modifier.weight(1f))
            StatTile("Viajes finalizados", finished.size.toString(), Icons.Filled.DirectionsCar, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatTile("Ingresos por comisión", formatCOP(income), Icons.Filled.AttachMoney, Modifier.weight(1f))
            StatTile("Comisión vigente", formatPercent(store.activeCommission.porcentaje), Icons.Filled.LocalOffer, Modifier.weight(1f))
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            UxButton("Usuarios", { store.adminTab = AdminTab.USUARIOS }, Modifier.weight(1f), variant = ButtonVariant.Secondary, icon = Icons.Filled.People)
            UxButton("Comisión", { store.adminTab = AdminTab.COMISION }, Modifier.weight(1f), variant = ButtonVariant.Secondary, icon = Icons.Filled.LocalOffer)
        }

        UxCard {
            Text("Viajes recientes", style = UnixText.Heading)
            if (recent.isEmpty()) {
                EmptyState(Icons.Filled.DirectionsCar, "Sin viajes todavía", "Los viajes de los pasajeros aparecerán aquí.")
            }
            recent.forEach { t ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    PlatformMark(t.platform, 34.dp)
                    Column(Modifier.weight(1f)) {
                        Text(t.destino, style = UnixText.Body)
                        Text("${formatDate(t.fechaMillis)} · ${platformInfo(t.platform).nombre}", style = UnixText.Small)
                    }
                    Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(formatCOP(t.precioFinal), fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = UnixColors.Ink)
                        StatusBadge(t.estado.label, t.estado.tone())
                    }
                }
            }
        }

        UxButton(
            "Ver reportes y estadísticas",
            { store.adminTab = AdminTab.REPORTES },
            Modifier.fillMaxWidth(),
            variant = ButtonVariant.Ghost,
            icon = Icons.Filled.BarChart,
        )
    }
}
