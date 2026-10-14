package co.edu.unicartagena.unixdriver.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import co.edu.unicartagena.unixdriver.model.Role
import co.edu.unicartagena.unixdriver.state.AdminTab
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.state.PassengerTab
import co.edu.unicartagena.unixdriver.state.Route
import co.edu.unicartagena.unixdriver.ui.components.BrandMark
import co.edu.unicartagena.unixdriver.ui.screens.admin.AdminCommissionScreen
import co.edu.unicartagena.unixdriver.ui.screens.admin.AdminDashboardScreen
import co.edu.unicartagena.unixdriver.ui.screens.admin.AdminReportsScreen
import co.edu.unicartagena.unixdriver.ui.screens.admin.AdminUsersScreen
import co.edu.unicartagena.unixdriver.ui.screens.auth.LoginScreen
import co.edu.unicartagena.unixdriver.ui.screens.auth.RegisterScreen
import co.edu.unicartagena.unixdriver.ui.screens.passenger.HistoryScreen
import co.edu.unicartagena.unixdriver.ui.screens.passenger.MoreScreen
import co.edu.unicartagena.unixdriver.ui.screens.passenger.OffersScreen
import co.edu.unicartagena.unixdriver.ui.screens.passenger.PaymentScreen
import co.edu.unicartagena.unixdriver.ui.screens.passenger.ProfileScreen
import co.edu.unicartagena.unixdriver.ui.screens.passenger.SearchScreen
import co.edu.unicartagena.unixdriver.ui.screens.passenger.TripDetailScreen
import co.edu.unicartagena.unixdriver.ui.screens.passenger.TripScreen
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixTheme

/** Raíz de la app: tema, columna tipo teléfono centrada y selección de pantalla según la ruta. */
@Composable
fun AppRoot(store: AppStore) {
    UnixTheme {
        Box(Modifier.fillMaxSize().background(UnixColors.Bg), contentAlignment = Alignment.TopCenter) {
            Box(Modifier.widthIn(max = 480.dp).fillMaxHeight().background(UnixColors.Bg)) {
                when (val route = store.route) {
                    Route.Login -> LoginScreen(store)
                    Route.Register -> Frame("Crear cuenta", store) { RegisterScreen(store) }
                    Route.Home -> HomeScreen(store)
                    is Route.Offers -> Frame("Ofertas recibidas", store) { OffersScreen(store, route.query) }
                    Route.Trip -> Frame("Tu viaje", store, back = false) { TripScreen(store) }
                    Route.Payment -> Frame("Cobro y comisión", store, back = false) { PaymentScreen(store) }
                    is Route.TripDetail -> Frame("Detalle del viaje", store) { TripDetailScreen(store, route.tripId) }
                }
            }
        }
    }
}

/** Pantalla interna con barra superior clara, título y botón de volver opcional. */
@Composable
private fun Frame(title: String, store: AppStore, back: Boolean = true, content: @Composable () -> Unit) {
    Scaffold(
        containerColor = UnixColors.Bg,
        topBar = {
            Column(Modifier.fillMaxWidth().background(UnixColors.Surface)) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    if (back && store.canGoBack) {
                        IconButton(onClick = { store.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = UnixColors.Navy)
                        }
                    } else {
                        Box(Modifier.padding(start = 12.dp))
                    }
                    Text(title, color = UnixColors.Navy, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                }
                Box(Modifier.fillMaxWidth().height(1.dp).background(UnixColors.Line))
            }
        },
    ) { inner -> Box(Modifier.padding(inner)) { content() } }
}

private data class TabItem(val label: String, val icon: ImageVector)

@Composable
private fun HomeScreen(store: AppStore) {
    val isAdmin = store.currentUser?.rol == Role.ADMINISTRADOR
    val tabs: List<TabItem> =
        if (isAdmin) AdminTab.entries.map { TabItem(it.label, adminIcon(it)) }
        else PassengerTab.entries.map { TabItem(it.label, passengerIcon(it)) }
    val selectedIndex = if (isAdmin) store.adminTab.ordinal else store.passengerTab.ordinal

    Scaffold(
        containerColor = UnixColors.Bg,
        topBar = {
            when {
                isAdmin -> Column(Modifier.fillMaxWidth().background(UnixColors.Surface)) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp)) { BrandMark(size = 44.dp) }
                    Box(Modifier.fillMaxWidth().height(1.dp).background(UnixColors.Line))
                }
                // La pestaña Inicio dibuja su propio encabezado (logo, notificaciones y avatar).
                store.passengerTab == PassengerTab.INICIO -> Unit
                else -> Column(Modifier.fillMaxWidth().background(UnixColors.Surface)) {
                    Text(
                        store.passengerTab.label,
                        color = UnixColors.Navy,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 22.sp,
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
                    )
                    Box(Modifier.fillMaxWidth().height(1.dp).background(UnixColors.Line))
                }
            }
        },
        bottomBar = {
            BottomBar(tabs, selectedIndex) { index ->
                if (isAdmin) store.adminTab = AdminTab.entries[index] else store.passengerTab = PassengerTab.entries[index]
            }
        },
    ) { inner ->
        Box(Modifier.padding(inner)) {
            if (isAdmin) {
                when (store.adminTab) {
                    AdminTab.PANEL -> AdminDashboardScreen(store)
                    AdminTab.USUARIOS -> AdminUsersScreen(store)
                    AdminTab.COMISION -> AdminCommissionScreen(store)
                    AdminTab.REPORTES -> AdminReportsScreen(store)
                }
            } else {
                when (store.passengerTab) {
                    PassengerTab.INICIO -> SearchScreen(store)
                    PassengerTab.HISTORIAL -> HistoryScreen(store)
                    PassengerTab.PERFIL -> ProfileScreen(store)
                    PassengerTab.MAS -> MoreScreen(store)
                }
            }
        }
    }
}

/** Barra inferior: icono y etiqueta en azul con una línea bajo la pestaña activa. */
@Composable
private fun BottomBar(tabs: List<TabItem>, selected: Int, onSelect: (Int) -> Unit) {
    Column(Modifier.fillMaxWidth().background(UnixColors.Surface)) {
        Box(Modifier.fillMaxWidth().height(1.dp).background(UnixColors.Line))
        Row(Modifier.fillMaxWidth().padding(top = 10.dp)) {
            tabs.forEachIndexed { index, tab ->
                val active = index == selected
                val color = if (active) UnixColors.Blue else UnixColors.Muted
                Column(
                    Modifier.weight(1f).clickable { onSelect(index) },
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(tab.icon, contentDescription = tab.label, tint = color, modifier = Modifier.size(28.dp))
                    Text(tab.label, fontSize = 14.sp, fontWeight = if (active) FontWeight.Bold else FontWeight.Medium, color = color)
                    Box(
                        Modifier
                            .padding(top = 8.dp, bottom = 6.dp)
                            .width(52.dp)
                            .height(3.dp)
                            .background(if (active) UnixColors.Blue else Color.Transparent, RoundedCornerShape(50)),
                    )
                }
            }
        }
    }
}

private fun passengerIcon(tab: PassengerTab): ImageVector = when (tab) {
    PassengerTab.INICIO -> Icons.Filled.Home
    PassengerTab.HISTORIAL -> Icons.Outlined.Schedule
    PassengerTab.PERFIL -> Icons.Outlined.Person
    PassengerTab.MAS -> Icons.Outlined.GridView
}

private fun adminIcon(tab: AdminTab): ImageVector = when (tab) {
    AdminTab.PANEL -> Icons.Outlined.Dashboard
    AdminTab.USUARIOS -> Icons.Outlined.People
    AdminTab.COMISION -> Icons.Outlined.LocalOffer
    AdminTab.REPORTES -> Icons.Outlined.BarChart
}
