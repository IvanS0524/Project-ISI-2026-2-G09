package co.edu.unicartagena.unixdriver.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import co.edu.unicartagena.unixdriver.data.DEMO_ADMIN
import co.edu.unicartagena.unixdriver.data.DEMO_PASAJERO
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.state.Route
import co.edu.unicartagena.unixdriver.ui.components.APPLE_PATH
import co.edu.unicartagena.unixdriver.ui.components.ArtImage
import co.edu.unicartagena.unixdriver.ui.components.Banner
import co.edu.unicartagena.unixdriver.ui.components.BrandMark
import co.edu.unicartagena.unixdriver.ui.components.GOOGLE_PATH
import co.edu.unicartagena.unixdriver.ui.components.NoticeDialog
import co.edu.unicartagena.unixdriver.ui.components.SKYLINE_BOTTOM_PATH
import co.edu.unicartagena.unixdriver.ui.components.SKYLINE_TOP_PATH
import co.edu.unicartagena.unixdriver.ui.components.Tone
import co.edu.unicartagena.unixdriver.ui.components.UxButton
import co.edu.unicartagena.unixdriver.ui.components.UxChip
import co.edu.unicartagena.unixdriver.ui.components.UxTextField
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.isValidEmail

@Composable
fun LoginScreen(store: AppStore) {
    var correo by remember { mutableStateOf(store.loginPrefill ?: "") }
    var contrasena by remember { mutableStateOf("") }
    var keepSession by remember { mutableStateOf(true) }
    var correoError by remember { mutableStateOf<String?>(null) }
    var contrasenaError by remember { mutableStateOf<String?>(null) }
    var authError by remember { mutableStateOf<String?>(null) }
    var notice by remember { mutableStateOf<Pair<String, String>?>(null) }

    LaunchedEffect(Unit) { store.loginPrefill = null }

    fun submit() {
        correoError = if (isValidEmail(correo)) null else "Escribe un correo válido, por ejemplo nombre@correo.com."
        contrasenaError = if (contrasena.isEmpty()) "Escribe tu contraseña." else null
        authError = null
        if (correoError == null && contrasenaError == null) {
            // Si es correcto, el store cambia la ruta según el rol del usuario.
            authError = store.login(correo, contrasena)
        }
    }

    fun useDemo(account: Pair<String, String>) {
        correo = account.first
        contrasena = account.second
        correoError = null
        contrasenaError = null
        authError = null
    }

    Box(Modifier.fillMaxSize().background(UnixColors.Surface)) {
        ArtImage(
            SKYLINE_BOTTOM_PATH,
            Modifier.align(Alignment.BottomCenter).fillMaxWidth(),
            contentScale = ContentScale.FillWidth,
        )

        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(start = 24.dp, end = 24.dp, top = 24.dp, bottom = 150.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            BrandMark(size = 64.dp)

            // Bienvenida con la ilustración de Cartagena detrás
            Box(Modifier.fillMaxWidth()) {
                ArtImage(
                    SKYLINE_TOP_PATH,
                    Modifier.align(Alignment.TopEnd).fillMaxWidth(0.58f),
                    contentScale = ContentScale.FillWidth,
                )
                Column(Modifier.fillMaxWidth(0.66f).padding(top = 20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("¡Bienvenido de nuevo!", fontSize = 34.sp, lineHeight = 40.sp, fontWeight = FontWeight.ExtraBold, color = UnixColors.Navy)
                    Text(
                        "Inicia sesión para comparar y elegir el mejor transporte en Cartagena.",
                        fontSize = 16.sp,
                        lineHeight = 23.sp,
                        color = UnixColors.Muted,
                    )
                }
            }

            authError?.let { Banner(it, tone = Tone.Danger) }

            UxTextField(
                "Correo electrónico", correo, { correo = it },
                placeholder = "tu@email.com", leadingIcon = Icons.Outlined.Email, error = correoError,
            )
            UxTextField(
                "Contraseña", contrasena, { contrasena = it },
                placeholder = "Ingresa tu contraseña", leadingIcon = Icons.Outlined.Lock, secure = true, error = contrasenaError,
            )

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Row(
                    Modifier.clip(RoundedCornerShape(8.dp)).clickable { keepSession = !keepSession },
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    val box = RoundedCornerShape(6.dp)
                    Box(
                        Modifier.size(24.dp)
                            .background(if (keepSession) UnixColors.Blue else Color.Transparent, box)
                            .border(1.5.dp, if (keepSession) UnixColors.Blue else UnixColors.Line, box),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (keepSession) Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    }
                    Text("Recordar mi sesión", style = UnixText.Body.copy(fontSize = 15.sp))
                }
                Text(
                    "¿Olvidaste tu contraseña?",
                    style = UnixText.Body.copy(color = UnixColors.Blue, fontSize = 15.sp),
                    modifier = Modifier.clickable {
                        notice = "Recuperar contraseña" to "En este prototipo académico la recuperación de contraseña no está disponible."
                    },
                )
            }

            UxButton("Iniciar sesión", ::submit, Modifier.fillMaxWidth(), trailingIcon = Icons.AutoMirrored.Filled.ArrowForward)

            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(Modifier.weight(1f).height(1.dp).background(UnixColors.Line))
                Text("o continúa con", style = UnixText.Body.copy(color = UnixColors.Muted, fontSize = 15.sp))
                Box(Modifier.weight(1f).height(1.dp).background(UnixColors.Line))
            }

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                SocialButton("Google", GOOGLE_PATH, Modifier.weight(1f)) {
                    notice = "Google" to "El inicio de sesión con Google no está disponible en este prototipo académico."
                }
                SocialButton("Apple", APPLE_PATH, Modifier.weight(1f)) {
                    notice = "Apple" to "El inicio de sesión con Apple no está disponible en este prototipo académico."
                }
            }

            Row(Modifier.fillMaxWidth().clickable { store.push(Route.Register) }.padding(vertical = 4.dp), horizontalArrangement = Arrangement.Center) {
                Text("¿No tienes una cuenta? ", style = UnixText.Body.copy(color = UnixColors.Muted, fontSize = 15.sp))
                Text("Regístrate", style = UnixText.Body.copy(color = UnixColors.Blue, fontSize = 15.sp, fontWeight = FontWeight.Bold))
            }

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
                Text("Demo:", style = UnixText.Small)
                UxChip("Pasajero", false, { useDemo(DEMO_PASAJERO) })
                UxChip("Administrador", false, { useDemo(DEMO_ADMIN) })
            }
        }
    }

    notice?.let { (title, message) ->
        NoticeDialog(title, message, "Entendido", onClose = { notice = null })
    }
}

@Composable
private fun SocialButton(label: String, iconPath: String, modifier: Modifier, onClick: () -> Unit) {
    val shape = RoundedCornerShape(18.dp)
    Row(
        modifier
            .height(56.dp)
            .clip(shape)
            .background(UnixColors.Surface, shape)
            .border(1.dp, UnixColors.Line, shape)
            .clickable(onClick = onClick),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ArtImage(iconPath, Modifier.size(24.dp))
        Text("  $label", fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = UnixColors.Navy)
    }
}
