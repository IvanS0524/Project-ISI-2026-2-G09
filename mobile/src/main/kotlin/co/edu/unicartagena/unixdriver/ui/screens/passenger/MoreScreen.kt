package co.edu.unicartagena.unixdriver.ui.screens.passenger

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.ui.components.ConfirmDialog
import co.edu.unicartagena.unixdriver.ui.components.Divider
import co.edu.unicartagena.unixdriver.ui.components.NoticeDialog
import co.edu.unicartagena.unixdriver.ui.components.ScreenBody
import co.edu.unicartagena.unixdriver.ui.components.UxCard
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText

private data class MoreItem(val title: String, val message: String, val icon: ImageVector)

private val ITEMS = listOf(
    MoreItem(
        "Acerca de UniX Driver",
        "Prototipo académico de la asignatura Ingeniería de Servicios de Internet, Universidad de Cartagena. " +
            "Uber, DiDi e inDrive son simulados: no se realizan viajes ni cobros reales.",
        Icons.Filled.Info,
    ),
    MoreItem(
        "Términos y condiciones",
        "Este es un prototipo con fines académicos. Los precios, conductores y tiempos que ves son datos simulados.",
        Icons.Filled.Description,
    ),
    MoreItem(
        "Ayuda y soporte",
        "En esta versión no hay soporte en línea. Para dudas, comunícate con el equipo del proyecto.",
        Icons.Filled.SupportAgent,
    ),
)

@Composable
fun MoreScreen(store: AppStore) {
    var selected by remember { mutableStateOf<MoreItem?>(null) }
    var showLogout by remember { mutableStateOf(false) }

    ScreenBody {
        UxCard {
            ITEMS.forEachIndexed { index, item ->
                MoreRow(item.title, item.icon, UnixColors.Navy, UnixColors.BlueSoft, UnixColors.Blue) { selected = item }
                if (index < ITEMS.lastIndex) Divider()
            }
            Divider()
            MoreRow("Cerrar sesión", Icons.AutoMirrored.Filled.Logout, UnixColors.Danger, UnixColors.DangerBg, UnixColors.Danger) {
                showLogout = true
            }
        }
        Text(
            "UniX Driver · prototipo académico · v1.0.0",
            style = UnixText.Small,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
    }

    selected?.let { item -> NoticeDialog(item.title, item.message, "Entendido", onClose = { selected = null }) }

    if (showLogout) {
        ConfirmDialog(
            title = "Cerrar sesión",
            message = "¿Quieres salir de tu cuenta?",
            confirmLabel = "Cerrar sesión",
            destructive = true,
            onConfirm = { showLogout = false; store.logout() },
            onDismiss = { showLogout = false },
        )
    }
}

@Composable
private fun MoreRow(
    title: String,
    icon: ImageVector,
    titleColor: androidx.compose.ui.graphics.Color,
    iconBg: androidx.compose.ui.graphics.Color,
    iconTint: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(42.dp).background(iconBg, RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(22.dp))
        }
        Text(title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = titleColor, modifier = Modifier.weight(1f))
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = UnixColors.Placeholder)
    }
}
