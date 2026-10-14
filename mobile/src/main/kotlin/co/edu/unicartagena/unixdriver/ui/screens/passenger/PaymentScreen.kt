package co.edu.unicartagena.unixdriver.ui.screens.passenger

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import co.edu.unicartagena.unixdriver.data.platformInfo
import co.edu.unicartagena.unixdriver.model.Trip
import co.edu.unicartagena.unixdriver.model.TripStatus
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.state.Route
import co.edu.unicartagena.unixdriver.ui.components.Banner
import co.edu.unicartagena.unixdriver.ui.components.ButtonVariant
import co.edu.unicartagena.unixdriver.ui.components.Divider
import co.edu.unicartagena.unixdriver.ui.components.EmptyState
import co.edu.unicartagena.unixdriver.ui.components.InfoRow
import co.edu.unicartagena.unixdriver.ui.components.PlatformMark
import co.edu.unicartagena.unixdriver.ui.components.ScreenBody
import co.edu.unicartagena.unixdriver.ui.components.UxButton
import co.edu.unicartagena.unixdriver.ui.components.UxCard
import co.edu.unicartagena.unixdriver.ui.components.UxChip
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.formatCOP
import co.edu.unicartagena.unixdriver.util.formatPercent

private val METHODS = listOf("Tarjeta", "Efectivo", "Nequi")

@Composable
fun PaymentScreen(store: AppStore) {
    var method by remember { mutableStateOf(METHODS.first()) }
    var paidTrip by remember { mutableStateOf<Trip?>(null) }

    val trip = paidTrip ?: store.activeTrip
    if (trip == null || (paidTrip == null && trip.estado != TripStatus.FINALIZADO)) {
        ScreenBody {
            EmptyState(
                icon = Icons.Filled.CreditCard,
                title = "No hay cobros pendientes",
                message = "Cuando termines un viaje, aquí verás el resumen para pagar.",
                actionLabel = "Ir al inicio",
                onAction = { store.resetTo(Route.Home) },
            )
        }
        return
    }

    val total = trip.precioFinal + trip.comisionMonto
    val paid = paidTrip

    ScreenBody {
        if (paid != null) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.size(72.dp).background(UnixColors.Success, RoundedCornerShape(24.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(36.dp))
                }
                Text("Pago registrado", style = UnixText.Title)
                Text(
                    "Gracias por viajar con UniX Driver. Guardamos el viaje en tu historial.",
                    style = UnixText.Body.copy(textAlign = TextAlign.Center),
                )
            }
        } else {
            Column {
                Text("Viaje finalizado", style = UnixText.Title)
                Text("Revisa el cobro antes de pagar.", style = UnixText.Small)
            }
        }

        UxCard {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                PlatformMark(trip.platform, 40.dp)
                Column(Modifier.weight(1f)) {
                    Text("Viaje con ${platformInfo(trip.platform).nombre}", style = UnixText.Heading)
                    Text("Destino: ${trip.destino}", style = UnixText.Small)
                }
            }
            Divider()
            InfoRow("Tarifa del viaje", formatCOP(trip.precioFinal))
            InfoRow("Comisión UniX (${formatPercent(trip.comisionPorcentaje)})", formatCOP(trip.comisionMonto))
            Divider()
            InfoRow("Total a pagar", formatCOP(total), strong = true)
            if (paid != null) InfoRow("Método de pago", paid.metodoPago ?: method)
        }

        if (paid == null) {
            Banner("La comisión por recomendación se suma a la tarifa del viaje.")
            UxCard {
                Text("Método de pago", style = UnixText.Heading)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    METHODS.forEach { m -> UxChip(m, selected = m == method, onClick = { method = m }) }
                }
            }
            UxButton(
                "Pagar ${formatCOP(total)}",
                { paidTrip = store.payTrip(method) },
                Modifier.fillMaxWidth(),
                icon = Icons.Filled.Payments,
            )
        } else {
            UxButton(
                "Ver recibo",
                { store.replace(Route.TripDetail(paid.id)) },
                Modifier.fillMaxWidth(),
                variant = ButtonVariant.Secondary,
            )
            UxButton("Volver al inicio", { store.resetTo(Route.Home) }, Modifier.fillMaxWidth())
        }
    }
}
