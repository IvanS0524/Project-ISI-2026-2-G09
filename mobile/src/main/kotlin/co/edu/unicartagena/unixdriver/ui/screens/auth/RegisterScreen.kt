package co.edu.unicartagena.unixdriver.ui.screens.auth

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.CheckBoxOutlineBlank
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Icon
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
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.ui.components.Banner
import co.edu.unicartagena.unixdriver.ui.components.NoticeDialog
import co.edu.unicartagena.unixdriver.ui.components.ScreenBody
import co.edu.unicartagena.unixdriver.ui.components.Tone
import co.edu.unicartagena.unixdriver.ui.components.UxButton
import co.edu.unicartagena.unixdriver.ui.components.UxCard
import co.edu.unicartagena.unixdriver.ui.components.UxTextField
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.isValidEmail
import co.edu.unicartagena.unixdriver.util.isValidPhone

@Composable
fun RegisterScreen(store: AppStore) {
    var nombre by remember { mutableStateOf("") }
    var correo by remember { mutableStateOf("") }
    var telefono by remember { mutableStateOf("") }
    var contrasena by remember { mutableStateOf("") }
    var confirmar by remember { mutableStateOf("") }
    var accepted by remember { mutableStateOf(false) }

    var nombreError by remember { mutableStateOf<String?>(null) }
    var correoError by remember { mutableStateOf<String?>(null) }
    var telefonoError by remember { mutableStateOf<String?>(null) }
    var contrasenaError by remember { mutableStateOf<String?>(null) }
    var confirmarError by remember { mutableStateOf<String?>(null) }
    var termsError by remember { mutableStateOf<String?>(null) }
    var submitError by remember { mutableStateOf<String?>(null) }
    var created by remember { mutableStateOf(false) }

    fun submit() {
        nombreError = if (nombre.trim().length < 3) "Escribe tu nombre completo." else null
        correoError = if (!isValidEmail(correo)) "Escribe un correo válido, por ejemplo nombre@correo.com." else null
        telefonoError = if (!isValidPhone(telefono)) "Usa un celular colombiano de 10 dígitos que empiece por 3." else null
        contrasenaError = if (contrasena.length < 6) "La contraseña debe tener al menos 6 caracteres." else null
        confirmarError = if (confirmar != contrasena) "Las contraseñas no coinciden." else null
        termsError = if (!accepted) "Debes aceptar los términos y condiciones para crear tu cuenta." else null
        submitError = null
        val valid = listOf(nombreError, correoError, telefonoError, contrasenaError, confirmarError, termsError).all { it == null }
        if (!valid) return
        val error = store.register(nombre, correo, telefono, contrasena)
        if (error != null) submitError = error else created = true
    }

    ScreenBody {
        UxCard {
            submitError?.let { Banner(it, tone = Tone.Danger) }
            UxTextField("Nombre completo", nombre, { nombre = it }, leadingIcon = Icons.Filled.Person, error = nombreError)
            UxTextField("Correo electrónico", correo, { correo = it }, leadingIcon = Icons.Filled.Email, error = correoError)
            UxTextField("Celular", telefono, { telefono = it }, placeholder = "3001234567", leadingIcon = Icons.Filled.Phone, maxLength = 10, error = telefonoError)
            UxTextField("Contraseña", contrasena, { contrasena = it }, leadingIcon = Icons.Filled.Lock, secure = true, helper = "Mínimo 6 caracteres", error = contrasenaError)
            UxTextField("Confirmar contraseña", confirmar, { confirmar = it }, leadingIcon = Icons.Filled.Lock, secure = true, error = confirmarError)

            Row(
                Modifier.fillMaxWidth().clickable { accepted = !accepted },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Icon(
                    if (accepted) Icons.Filled.CheckBox else Icons.Filled.CheckBoxOutlineBlank,
                    contentDescription = "Aceptar términos",
                    tint = if (accepted) UnixColors.Blue else UnixColors.Muted,
                )
                Text("Acepto los términos y condiciones de UniX Driver", style = UnixText.Body)
            }
            termsError?.let { Text(it, style = UnixText.Small.copy(color = UnixColors.Danger, fontWeight = FontWeight.SemiBold)) }

            UxButton("Crear cuenta", ::submit, Modifier.fillMaxWidth())
        }
    }

    if (created) {
        NoticeDialog(
            title = "Cuenta creada",
            message = "Ya puedes iniciar sesión con tu correo y contraseña.",
            buttonLabel = "Iniciar sesión",
            onClose = { created = false; store.pop() },
        )
    }
}
