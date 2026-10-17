package co.edu.unicartagena.unixdriver.ui.screens.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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
import co.edu.unicartagena.unixdriver.model.Role
import co.edu.unicartagena.unixdriver.model.User
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.ui.components.ConfirmDialog
import co.edu.unicartagena.unixdriver.ui.components.EmptyState
import co.edu.unicartagena.unixdriver.ui.components.NoticeDialog
import co.edu.unicartagena.unixdriver.ui.components.ScreenBody
import co.edu.unicartagena.unixdriver.ui.components.StatusBadge
import co.edu.unicartagena.unixdriver.ui.components.Tone
import co.edu.unicartagena.unixdriver.ui.components.UxCard
import co.edu.unicartagena.unixdriver.ui.components.UxChip
import co.edu.unicartagena.unixdriver.ui.components.UxTextField
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.initials
import co.edu.unicartagena.unixdriver.util.normalize

private enum class UserFilter { TODOS, ACTIVOS, INACTIVOS }

@Composable
fun AdminUsersScreen(store: AppStore) {
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf(UserFilter.TODOS) }
    var pending by remember { mutableStateOf<Pair<User, Boolean>?>(null) }
    var selfNotice by remember { mutableStateOf(false) }

    val q = normalize(query)
    val visible = store.users.filter { u ->
        val matches = q.isEmpty() || normalize(u.nombre).contains(q) || normalize(u.correo).contains(q)
        val state = when (filter) {
            UserFilter.TODOS -> true
            UserFilter.ACTIVOS -> u.activo
            UserFilter.INACTIVOS -> !u.activo
        }
        matches && state
    }

    ScreenBody {
        UxTextField("Buscar usuario", query, { query = it }, placeholder = "Nombre o correo", leadingIcon = Icons.Filled.Search)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            UxChip("Todos", filter == UserFilter.TODOS, { filter = UserFilter.TODOS })
            UxChip("Activos", filter == UserFilter.ACTIVOS, { filter = UserFilter.ACTIVOS })
            UxChip("Inactivos", filter == UserFilter.INACTIVOS, { filter = UserFilter.INACTIVOS })
        }

        if (visible.isEmpty()) {
            EmptyState(
                Icons.Filled.Person,
                "No encontramos usuarios",
                "Ningún usuario coincide con la búsqueda. Prueba con otro nombre o correo.",
            )
        }

        visible.forEach { user ->
            UxCard {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(44.dp).background(UnixColors.Navy, RoundedCornerShape(15.dp)), contentAlignment = Alignment.Center) {
                        Text(initials(user.nombre), color = Color.White, fontWeight = FontWeight.ExtraBold)
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(user.nombre, style = UnixText.Heading)
                        Text(user.correo, style = UnixText.Small)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            StatusBadge(
                                if (user.rol == Role.ADMINISTRADOR) "Administrador" else "Pasajero",
                                if (user.rol == Role.ADMINISTRADOR) Tone.Info else Tone.Neutral,
                            )
                            StatusBadge(if (user.activo) "Activo" else "Inactivo", if (user.activo) Tone.Success else Tone.Danger)
                        }
                    }
                    Switch(
                        checked = user.activo,
                        onCheckedChange = { next ->
                            if (user.id == store.currentUser?.id) selfNotice = true else pending = user to next
                        },
                        colors = SwitchDefaults.colors(checkedTrackColor = UnixColors.Blue),
                    )
                }
            }
        }
    }

    pending?.let { (user, next) ->
        ConfirmDialog(
            title = if (next) "Activar usuario" else "Desactivar usuario",
            message = if (next) "${user.nombre} podrá volver a iniciar sesión."
            else "${user.nombre} no podrá iniciar sesión hasta que lo actives de nuevo.",
            confirmLabel = if (next) "Activar" else "Desactivar",
            destructive = !next,
            onConfirm = { store.setUserActive(user.id, next); pending = null },
            onDismiss = { pending = null },
        )
    }

    if (selfNotice) {
        NoticeDialog(
            title = "No puedes desactivar tu propia cuenta",
            message = "Pide a otro administrador que lo haga.",
            buttonLabel = "Entendido",
            onClose = { selfNotice = false },
        )
    }
}
