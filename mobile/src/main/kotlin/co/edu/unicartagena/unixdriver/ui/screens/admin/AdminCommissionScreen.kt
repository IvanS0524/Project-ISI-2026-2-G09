package co.edu.unicartagena.unixdriver.ui.screens.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import co.edu.unicartagena.unixdriver.service.Pricing
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.ui.components.Banner
import co.edu.unicartagena.unixdriver.ui.components.ButtonVariant
import co.edu.unicartagena.unixdriver.ui.components.InfoRow
import co.edu.unicartagena.unixdriver.ui.components.ScreenBody
import co.edu.unicartagena.unixdriver.ui.components.StatusBadge
import co.edu.unicartagena.unixdriver.ui.components.Tone
import co.edu.unicartagena.unixdriver.ui.components.UxButton
import co.edu.unicartagena.unixdriver.ui.components.UxCard
import co.edu.unicartagena.unixdriver.ui.components.UxTextField
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.formatCOP
import co.edu.unicartagena.unixdriver.util.formatDate
import co.edu.unicartagena.unixdriver.util.formatPercent

private const val EXAMPLE_FARE = 4116

@Composable
fun AdminCommissionScreen(store: AppStore) {
    var value by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var saved by remember { mutableStateOf(false) }

    val parsed = value.replace(',', '.').toDoubleOrNull()
    val previewOk = parsed != null && parsed > 0.0 && parsed <= 50.0

    fun save() {
        saved = false
        val result = store.createCommission(parsed ?: Double.NaN)
        if (result != null) {
            error = result
        } else {
            error = null
            value = ""
            saved = true
        }
    }

    ScreenBody {
        UxCard {
            Text("Comisión vigente", style = UnixText.Label)
            Text(formatPercent(store.activeCommission.porcentaje), fontSize = 48.sp, fontWeight = FontWeight.Black, color = UnixColors.Blue)
            Text(
                "Desde el ${formatDate(store.activeCommission.fechaInicioMillis)}. Se suma a la tarifa de cada viaje finalizado.",
                style = UnixText.Small,
            )
        }

        UxCard {
            Text("Nuevo porcentaje", style = UnixText.Heading)
            if (saved) Banner("Guardamos la configuración. El nuevo porcentaje ya está vigente.", tone = Tone.Success)
            UxTextField(
                label = "Porcentaje de comisión",
                value = value,
                onValueChange = { value = it; saved = false; error = null },
                placeholder = "Ej. 12",
                leadingIcon = Icons.Filled.LocalOffer,
                helper = "Entre 0,1 y 50",
                error = error,
            )
            if (previewOk && parsed != null) {
                Column(Modifier.fillMaxWidth().background(UnixColors.BlueSoft, RoundedCornerShape(12.dp)).padding(12.dp)) {
                    InfoRow("En una tarifa de ${formatCOP(EXAMPLE_FARE)}", "UniX cobra ${formatCOP(Pricing.commission(EXAMPLE_FARE, parsed))}")
                }
            }
            UxButton("Guardar comisión", ::save, Modifier.fillMaxWidth(), enabled = value.isNotBlank())
        }

        UxCard {
            Text("Configuraciones anteriores", style = UnixText.Heading)
            store.commissions.forEach { c ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(formatPercent(c.porcentaje), style = UnixText.Heading)
                        Text("Desde el ${formatDate(c.fechaInicioMillis)}", style = UnixText.Small)
                    }
                    if (c.activa) {
                        StatusBadge("Activa", Tone.Success)
                    } else {
                        UxButton("Activar", { store.activateCommission(c.id) }, variant = ButtonVariant.Ghost)
                    }
                }
            }
        }
    }
}
