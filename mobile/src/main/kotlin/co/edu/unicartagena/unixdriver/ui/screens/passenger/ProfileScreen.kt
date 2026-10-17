package co.edu.unicartagena.unixdriver.ui.screens.passenger

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import co.edu.unicartagena.unixdriver.model.TripStatus
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.ui.components.Banner
import co.edu.unicartagena.unixdriver.ui.components.ButtonVariant
import co.edu.unicartagena.unixdriver.ui.components.ConfirmDialog
import co.edu.unicartagena.unixdriver.ui.components.ScreenBody
import co.edu.unicartagena.unixdriver.ui.components.Tone
import co.edu.unicartagena.unixdriver.ui.components.UxButton
import co.edu.unicartagena.unixdriver.ui.components.UxCard
import co.edu.unicartagena.unixdriver.ui.components.UxTextField
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.initials
import co.edu.unicartagena.unixdriver.util.isValidPhone

@Composable
fun ProfileScreen(store: AppStore) {
    val user = store.currentUser ?: return
    var nombre by remember(user.id) { mutableStateOf(user.nombre) }
    var telefono by remember(user.id) { mutableStateOf(user.telefono) }
    var nombreError by remember { mutableStateOf<String?>(null) }
    var telefonoError by remember { mutableStateOf<String?>(null) }
    var saved by remember { mutableStateOf(false) }
    var showLogout by remember { mutableStateOf(false) }

    val completed = store.trips.count { it.userId == user.id && it.estado == TripStatus.FINALIZADO }
    val dirty = nombre.trim() != user.nombre || telefono.trim() != user.telefono

    fun save() {
        nombreError = if (nombre.trim().length < 3) "Escribe tu nombre completo." else null
        telefonoError = if (!isValidPhone(telefono)) "Usa un celular colombiano de 10 dígitos que empiece por 3." else null
        saved = false
        if (nombreError == null && telefonoError == null) {
            store.updateProfile(nombre, telefono)
            saved = true
        }
    }

    ScreenBody {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Box(Modifier.size(76.dp).background(UnixColors.Navy, RoundedCornerShape(26.dp)), contentAlignment = Alignment.Center) {
                Text(initials(user.nombre), color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
            }
            Text(user.nombre, style = UnixText.Title)
            Text(if (completed == 1) "1 viaje finalizado" else "$completed viajes finalizados", style = UnixText.Small)
        }

        UxCard {
            Text("Mis datos", style = UnixText.Heading)
            if (saved) Banner("Guardamos los cambios de tu perfil.", tone = Tone.Success)
            UxTextField("Nombre completo", nombre, { nombre = it; saved = false }, leadingIcon = Icons.Filled.Person, error = nombreError)
            UxTextField("Correo electrónico", user.correo, {}, leadingIcon = Icons.Filled.Email, enabled = false, helper = "El correo no se puede cambiar")
            UxTextField("Celular", telefono, { telefono = it; saved = false }, leadingIcon = Icons.Filled.Phone, maxLength = 10, error = telefonoError)
            UxButton("Guardar cambios", ::save, Modifier.fillMaxWidth(), enabled = dirty)
        }

        UxButton(
            "Cerrar sesión",
            { showLogout = true },
            Modifier.fillMaxWidth(),
            variant = ButtonVariant.Danger,
            icon = Icons.AutoMirrored.Filled.Logout,
        )
    }

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
