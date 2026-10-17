package co.edu.unicartagena.unixdriver.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import co.edu.unicartagena.unixdriver.data.platformInfo
import co.edu.unicartagena.unixdriver.model.PlatformId
import co.edu.unicartagena.unixdriver.model.TransportOffer
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText
import co.edu.unicartagena.unixdriver.util.formatCOP

// ---------- Marca ----------

/** Logo (cuadrado azul con la U) junto al nombre y el subtítulo. */
@Composable
fun BrandMark(size: Dp = 52.dp, showName: Boolean = true) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        ArtImage(LOGO_PATH, Modifier.size(size))
        if (showName) {
            Column {
                Text("UniX Driver", color = UnixColors.Navy, fontWeight = FontWeight.ExtraBold, fontSize = (size.value * 0.46f).sp)
                Text("Cartagena Movilidad", color = UnixColors.Muted, fontSize = (size.value * 0.27f).sp)
            }
        }
    }
}

@Composable
fun PlatformMark(platform: PlatformId, size: Dp = 40.dp) {
    val info = platformInfo(platform)
    val shape = RoundedCornerShape(size * 0.24f)
    Box(
        Modifier.size(size).clip(shape).background(Color(info.color), shape),
        contentAlignment = Alignment.Center,
    ) {
        when (platform) {
            PlatformId.UBER -> Text("Uber", color = Color.White, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.30f).sp, maxLines = 1)
            PlatformId.INDRIVE -> Text("iD", color = Color(0xFF1B1B1B), fontWeight = FontWeight.Black, fontSize = (size.value * 0.42f).sp)
            PlatformId.DIDI -> Canvas(Modifier.size(size * 0.56f)) {
                val s = this.size.width
                val outer = Path().apply {
                    addRoundRect(
                        RoundRect(
                            0f, s * 0.12f, s, s * 0.96f,
                            CornerRadius(s * 0.12f), CornerRadius(s * 0.12f), CornerRadius(s * 0.46f), CornerRadius(s * 0.46f),
                        ),
                    )
                }
                drawPath(outer, Color.White)
                val inner = Path().apply {
                    addRoundRect(
                        RoundRect(
                            s * 0.26f, s * 0.36f, s * 0.74f, s * 0.78f,
                            CornerRadius(s * 0.05f), CornerRadius(s * 0.05f), CornerRadius(s * 0.22f), CornerRadius(s * 0.22f),
                        ),
                    )
                }
                drawPath(inner, Color(info.color))
            }
        }
    }
}

// ---------- Oferta ----------

@Composable
fun OfferCard(offer: TransportOffer, selected: Boolean, onClick: () -> Unit) {
    val info = platformInfo(offer.platform)
    val shape = RoundedCornerShape(22.dp)
    val borderColor = if (selected || offer.recomendada) UnixColors.Blue else UnixColors.Line
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (selected) UnixColors.BlueSoft else UnixColors.Surface)
            .border(1.5.dp, borderColor, shape)
            .clickable(onClick = onClick)
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PlatformMark(offer.platform, 46.dp)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(info.nombre, style = UnixText.Heading)
                if (offer.recomendada) StatusBadge("Recomendada", Tone.Info)
            }
            Text("Llega en ${offer.tiempoEstimado} min · ${offer.vehicleType.label}", style = UnixText.Small)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Icon(Icons.Filled.Star, contentDescription = null, tint = UnixColors.Orange, modifier = Modifier.size(12.dp))
                Text(offer.driver.calificacion.toString(), style = UnixText.Small)
            }
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(formatCOP(offer.precioEstimado), fontSize = 19.sp, fontWeight = FontWeight.ExtraBold, color = UnixColors.Ink)
            Text("precio estimado", style = UnixText.Small)
        }
    }
}

// ---------- Mapa ilustrativo ----------

/**
 * Mapa ilustrativo (origen → destino). Se reemplazaría por un mapa real al integrar geolocalización.
 * [progress] va de 0 a 1 y ubica el vehículo sobre la ruta; si es null no se dibuja el vehículo.
 */
@Composable
fun RouteMap(modifier: Modifier = Modifier, progress: Float? = null, height: Dp = 150.dp) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Canvas(Modifier.fillMaxWidth().height(height).clip(RoundedCornerShape(14.dp))) {
            drawRect(Color(0xFFD5E1EE))
            val w = size.width
            val h = size.height
            val road = Color(0xFFE8EFF7)
            drawLine(road, Offset(-20f, h * 0.55f), Offset(w + 20f, h * 0.85f), strokeWidth = 26f)
            drawLine(road, Offset(-20f, h * 0.55f), Offset(w * 0.7f, -20f), strokeWidth = 22f)
            drawLine(road, Offset(w * 0.35f, h + 20f), Offset(w + 20f, h * 0.2f), strokeWidth = 18f)

            val a = Offset(w * 0.16f, h * 0.72f)
            val b = Offset(w * 0.84f, h * 0.26f)
            drawLine(UnixColors.Blue, a, b, strokeWidth = 8f, cap = StrokeCap.Round)
            drawCircle(Color.White, radius = 15f, center = a)
            drawCircle(UnixColors.Blue, radius = 11f, center = a)
            drawCircle(Color.White, radius = 15f, center = b)
            drawCircle(UnixColors.Danger, radius = 11f, center = b)
            if (progress != null) {
                val car = Offset(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress)
                drawCircle(Color.White, radius = 20f, center = car)
                drawCircle(UnixColors.Navy, radius = 15f, center = car)
                drawCircle(Color.White, radius = 5f, center = car)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                CircleDot(UnixColors.Blue)
                Text("Origen", style = UnixText.Small)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                CircleDot(UnixColors.Danger)
                Text("Destino", style = UnixText.Small)
            }
        }
    }
}

// ---------- Pasos de estado ----------

enum class StepState { Done, Active, Pending }

data class Step(val title: String, val description: String, val state: StepState)

@Composable
fun StatusSteps(steps: List<Step>) {
    Column {
        steps.forEachIndexed { index, step ->
            val last = index == steps.lastIndex
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(Modifier.width(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    val dotColor = when (step.state) {
                        StepState.Done -> UnixColors.Success
                        StepState.Active -> UnixColors.Blue
                        StepState.Pending -> UnixColors.Line
                    }
                    Box(
                        Modifier
                            .size(22.dp)
                            .background(if (step.state == StepState.Done) UnixColors.Success else UnixColors.Surface, RoundedCornerShape(50))
                            .border(2.dp, dotColor, RoundedCornerShape(50)),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (step.state == StepState.Done) {
                            Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                        } else if (step.state == StepState.Active) {
                            Box(Modifier.size(8.dp).background(UnixColors.Blue, RoundedCornerShape(50)))
                        }
                    }
                    if (!last) {
                        Box(
                            Modifier
                                .width(2.dp)
                                .height(30.dp)
                                .background(if (step.state == StepState.Done) UnixColors.Success else UnixColors.Line),
                        )
                    }
                }
                Column(Modifier.weight(1f).padding(bottom = if (last) 0.dp else 8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        step.title,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (step.state == StepState.Pending) UnixColors.Muted else UnixColors.Ink,
                    )
                    Text(step.description, style = UnixText.Small)
                }
            }
        }
    }
}

// ---------- Indicadores y barras ----------

@Composable
fun StatTile(label: String, value: String, icon: ImageVector, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(22.dp)
    Column(
        modifier.background(UnixColors.Surface, shape).border(1.dp, UnixColors.Line, shape).padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(Modifier.size(34.dp).background(UnixColors.BlueSoft, RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = UnixColors.Blue, modifier = Modifier.size(18.dp))
        }
        Text(value, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = UnixColors.Ink, maxLines = 1)
        Text(label, style = UnixText.Small)
    }
}

@Composable
fun BarRow(label: String, fraction: Float, color: Color, trailing: String) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = UnixText.Body)
            Text(trailing, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = UnixColors.Ink)
        }
        Box(Modifier.fillMaxWidth().height(10.dp).background(UnixColors.Bg, RoundedCornerShape(50))) {
            Box(Modifier.fillMaxWidth(fraction.coerceIn(0.02f, 1f)).height(10.dp).background(color, RoundedCornerShape(50)))
        }
    }
}
