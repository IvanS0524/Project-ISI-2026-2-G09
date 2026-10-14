package co.edu.unicartagena.unixdriver.ui.screens.admin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import co.edu.unicartagena.unixdriver.data.PLATFORM_IDS
import co.edu.unicartagena.unixdriver.data.platformInfo
import co.edu.unicartagena.unixdriver.model.TripStatus
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.ui.components.BarRow
import co.edu.unicartagena.unixdriver.ui.components.EmptyState
import co.edu.unicartagena.unixdriver.ui.components.ScreenBody
import co.edu.unicartagena.unixdriver.ui.components.StatTile
import co.edu.unicartagena.unixdriver.ui.components.UxCard
import co.edu.unicartagena.unixdriver.ui.components.UxChip
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.formatCOP

private const val DAY_MILLIS = 24L * 60 * 60 * 1000

@Composable
fun AdminReportsScreen(store: AppStore) {
    // 0 = todo el historial
    var days by remember { mutableStateOf(30) }

    val since = if (days == 0) 0L else System.currentTimeMillis() - days * DAY_MILLIS
    val inRange = store.trips.filter { it.fechaMillis >= since }
    val done = inRange.filter { it.estado == TripStatus.FINALIZADO }
    val cancelled = inRange.count { it.estado == TripStatus.CANCELADO }
    val billed = done.sumOf { it.precioFinal }
    val income = done.sumOf { it.comisionMonto }
    val average = if (done.isEmpty()) 0 else billed / done.size

    val byPlatform = PLATFORM_IDS.map { id ->
        val list = done.filter { it.platform == id }
        Triple(id, list.size, list.sumOf { it.comisionMonto })
    }
    val topDestinations = done.groupingBy { it.destino }.eachCount().entries.sortedByDescending { it.value }.take(4)
    val maxCount = maxOf(1, byPlatform.maxOf { it.second })
    val maxTop = maxOf(1, topDestinations.maxOfOrNull { it.value } ?: 1)

    ScreenBody {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            UxChip("7 días", days == 7, { days = 7 })
            UxChip("30 días", days == 30, { days = 30 })
            UxChip("Todo", days == 0, { days = 0 })
        }

        if (inRange.isEmpty()) {
            UxCard {
                EmptyState(Icons.Filled.BarChart, "No hay datos para este periodo", "Prueba con un periodo más amplio para ver reportes.")
            }
            return@ScreenBody
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatTile("Viajes finalizados", done.size.toString(), Icons.Filled.CheckCircle, Modifier.weight(1f))
            StatTile("Viajes cancelados", cancelled.toString(), Icons.Filled.Close, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatTile("Ingresos por comisión", formatCOP(income), Icons.Filled.AttachMoney, Modifier.weight(1f))
            StatTile("Tarifa promedio", formatCOP(average), Icons.Filled.Receipt, Modifier.weight(1f))
        }

        UxCard {
            Text("Viajes por plataforma", style = UnixText.Heading)
            byPlatform.forEach { (id, count, comm) ->
                BarRow(
                    label = platformInfo(id).nombre,
                    fraction = count.toFloat() / maxCount,
                    color = Color(platformInfo(id).color),
                    trailing = "$count · ${formatCOP(comm)}",
                )
            }
            Text("El valor a la derecha es la comisión generada por cada plataforma.", style = UnixText.Small)
        }

        UxCard {
            Text("Destinos más pedidos", style = UnixText.Heading)
            if (topDestinations.isEmpty()) {
                Text("Aún no hay viajes finalizados en este periodo.", style = UnixText.Small)
            }
            topDestinations.forEach { entry ->
                BarRow(entry.key, entry.value.toFloat() / maxTop, UnixColors.Blue, entry.value.toString())
            }
        }
    }
}
