package co.edu.unicartagena.unixdriver.ui.screens.passenger

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.GpsFixed
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import co.edu.unicartagena.unixdriver.data.BarriosCatalog
import co.edu.unicartagena.unixdriver.data.Destination
import co.edu.unicartagena.unixdriver.data.ORIGEN_FIJO
import co.edu.unicartagena.unixdriver.data.PLATFORM_IDS
import co.edu.unicartagena.unixdriver.data.POPULAR_DESTINATIONS
import co.edu.unicartagena.unixdriver.data.platformInfo
import co.edu.unicartagena.unixdriver.model.SearchQuery
import co.edu.unicartagena.unixdriver.model.TripStatus
import co.edu.unicartagena.unixdriver.model.VehicleType
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.state.PassengerTab
import co.edu.unicartagena.unixdriver.state.Route
import co.edu.unicartagena.unixdriver.ui.components.ArtImage
import co.edu.unicartagena.unixdriver.ui.components.Banner
import co.edu.unicartagena.unixdriver.ui.components.BrandMark
import co.edu.unicartagena.unixdriver.ui.components.NoticeDialog
import co.edu.unicartagena.unixdriver.ui.components.PlatformMark
import co.edu.unicartagena.unixdriver.ui.components.ScreenBody
import co.edu.unicartagena.unixdriver.ui.components.SKYLINE_TOP_PATH
import co.edu.unicartagena.unixdriver.ui.components.SegmentOption
import co.edu.unicartagena.unixdriver.ui.components.Segmented
import co.edu.unicartagena.unixdriver.ui.components.UxButton
import co.edu.unicartagena.unixdriver.ui.components.UxCard
import co.edu.unicartagena.unixdriver.ui.components.UxChip
import co.edu.unicartagena.unixdriver.ui.components.UxTextField
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.normalize

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SearchScreen(store: AppStore) {
    var vehicle by remember { mutableStateOf(VehicleType.MOTO) }
    var origen by remember { mutableStateOf(ORIGEN_FIJO) }
    var destino by remember { mutableStateOf("") }
    var origenError by remember { mutableStateOf<String?>(null) }
    var destinoError by remember { mutableStateOf<String?>(null) }
    var showBell by remember { mutableStateOf(false) }

    val origenSuggestions = BarriosCatalog.filterSuggestions(origen, limit = 4)
    val destinoSuggestions = BarriosCatalog.filterSuggestions(destino, limit = 4)

    fun search() {
        val cleanOrigen = origen.trim()
        val cleanDestino = destino.trim()
        origenError = if (cleanOrigen.length < 3) "Escribe el barrio o punto de origen (mínimo 3 letras)." else null
        destinoError = when {
            cleanDestino.length < 3 -> "Escribe el barrio o lugar al que vas (mínimo 3 letras)."
            normalize(cleanOrigen) == normalize(cleanDestino) -> "El origen y el destino no pueden ser el mismo barrio."
            else -> null
        }
        if (origenError != null || destinoError != null) return
        store.push(Route.Offers(SearchQuery(cleanOrigen, cleanDestino, vehicle)))
    }

    val trip = store.activeTrip

    ScreenBody {
        // Encabezado: logo, notificaciones y avatar
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            BrandMark(size = 52.dp)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(44.dp).clip(CircleShape).clickable { showBell = true }, contentAlignment = Alignment.Center) {
                    Icon(Icons.Outlined.Notifications, contentDescription = "Notificaciones", tint = UnixColors.Ink, modifier = Modifier.size(28.dp))
                    Box(Modifier.align(Alignment.TopEnd).padding(top = 8.dp, end = 9.dp).size(9.dp).background(UnixColors.Pin, CircleShape))
                }
                Box(
                    Modifier.size(52.dp).clip(CircleShape).background(UnixColors.ChipBg, CircleShape)
                        .clickable { store.passengerTab = PassengerTab.PERFIL },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.Person, contentDescription = "Perfil", tint = UnixColors.Blue, modifier = Modifier.size(30.dp))
                }
            }
        }

        // Título con la ilustración de Cartagena detrás
        Box(Modifier.fillMaxWidth()) {
            ArtImage(
                SKYLINE_TOP_PATH,
                Modifier.align(Alignment.TopEnd).fillMaxWidth(0.62f),
                contentScale = ContentScale.FillWidth,
                alpha = 0.9f,
            )
            Column(Modifier.padding(top = 36.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Solicitar viaje", fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, color = UnixColors.Navy)
                Text("Elige tu origen y destino en Cartagena para comparar ofertas", fontSize = 16.sp, color = UnixColors.Muted)
            }
        }

        if (trip != null) {
            Banner(
                "Toca aquí para volver a tu viaje.",
                title = "Tienes un viaje activo",
                modifier = Modifier.clickable {
                    store.push(if (trip.estado == TripStatus.FINALIZADO) Route.Payment else Route.Trip)
                },
            )
        }

        UxCard {
            UxTextField(
                label = "Origen",
                value = origen,
                onValueChange = { origen = it; origenError = null },
                placeholder = "Barrio o punto de partida",
                leadingIcon = Icons.Filled.GpsFixed,
                iconTint = UnixColors.Target,
                error = origenError,
            )

            if (origenSuggestions.isNotEmpty()) {
                SuggestionList(origenSuggestions) { selected ->
                    origen = selected.nombre
                    origenError = null
                }
            }

            UxTextField(
                label = "Destino",
                value = destino,
                onValueChange = { destino = it; destinoError = null },
                placeholder = "Barrio o lugar de destino",
                leadingIcon = Icons.Filled.LocationOn,
                iconTint = UnixColors.Pin,
                error = destinoError,
            )

            if (destinoSuggestions.isNotEmpty()) {
                SuggestionList(destinoSuggestions) { selected ->
                    destino = selected.nombre
                    destinoError = null
                }
            }

            Text("Destinos frecuentes en Cartagena", fontSize = 15.sp, color = UnixColors.Muted)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                POPULAR_DESTINATIONS.forEach { d ->
                    UxChip(
                        d.nombre,
                        selected = normalize(destino) == normalize(d.nombre),
                        onClick = { destino = d.nombre; destinoError = null },
                        icon = Icons.Filled.LocationOn,
                    )
                }
            }

            Segmented(
                options = listOf(
                    SegmentOption(VehicleType.MOTO, "Moto", Icons.Filled.TwoWheeler),
                    SegmentOption(VehicleType.CARRO, "Carro", Icons.Filled.DirectionsCar),
                ),
                selected = vehicle,
                onSelect = { vehicle = it },
            )

            UxButton("Solicitar viaje", ::search, Modifier.fillMaxWidth(), icon = Icons.Filled.Search)
        }

        Text("Plataformas conectadas", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = UnixColors.Navy)
        PLATFORM_IDS.forEach { id ->
            val shape = RoundedCornerShape(20.dp)
            Row(
                Modifier.fillMaxWidth().background(UnixColors.Surface, shape).border(1.dp, UnixColors.Line, shape).padding(14.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                PlatformMark(id, 52.dp)
                Text(platformInfo(id).nombre, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = UnixColors.Navy, modifier = Modifier.weight(1f))
                AvailableBadge()
                Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = UnixColors.Placeholder)
            }
        }
    }

    if (showBell) {
        NoticeDialog("Notificaciones", "No tienes notificaciones nuevas.", "Entendido", onClose = { showBell = false })
    }
}

@Composable
private fun SuggestionList(suggestions: List<Destination>, onSelect: (Destination) -> Unit) {
    val shape = RoundedCornerShape(14.dp)
    Column(Modifier.fillMaxWidth().border(1.dp, UnixColors.Line, shape).background(UnixColors.Field, shape)) {
        suggestions.forEach { s ->
            Row(
                Modifier.fillMaxWidth().clickable { onSelect(s) }.padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.LocationOn, contentDescription = null, tint = UnixColors.Blue)
                Text(s.nombre, style = UnixText.Body)
            }
        }
    }
}

@Composable
private fun AvailableBadge() {
    Row(
        Modifier.background(UnixColors.SuccessBg, RoundedCornerShape(50)).padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(Modifier.size(8.dp).background(UnixColors.Success, CircleShape))
        Text("Disponible", color = UnixColors.Success, fontSize = 14.sp, fontWeight = FontWeight.Medium)
    }
}
