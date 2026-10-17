package co.edu.unicartagena.unixdriver.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import co.edu.unicartagena.unixdriver.ui.theme.UnixColors
import co.edu.unicartagena.unixdriver.ui.theme.UnixText

// ---------- Botón ----------

enum class ButtonVariant { Primary, Secondary, Danger, Ghost }

@Composable
fun UxButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Primary,
    icon: ImageVector? = null,
    trailingIcon: ImageVector? = null,
    loading: Boolean = false,
    enabled: Boolean = true,
) {
    val bg: Color
    val fg: Color
    when (variant) {
        ButtonVariant.Primary -> { bg = UnixColors.Blue; fg = Color.White }
        ButtonVariant.Secondary -> { bg = UnixColors.BlueSoft; fg = UnixColors.Blue }
        ButtonVariant.Danger -> { bg = UnixColors.DangerBg; fg = UnixColors.Danger }
        ButtonVariant.Ghost -> { bg = Color.Transparent; fg = UnixColors.Blue }
    }
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier.heightIn(min = 56.dp),
        shape = RoundedCornerShape(18.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = bg,
            contentColor = fg,
            disabledContainerColor = bg.copy(alpha = 0.5f),
            disabledContentColor = fg.copy(alpha = 0.7f),
        ),
        border = if (variant == ButtonVariant.Ghost) BorderStroke(1.dp, UnixColors.Line) else null,
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = fg, strokeWidth = 2.dp)
        } else {
            if (icon != null) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(22.dp))
                Spacer(Modifier.width(10.dp))
            }
            Text(label, fontWeight = FontWeight.Bold, fontSize = 17.sp)
            if (trailingIcon != null) {
                Spacer(Modifier.width(10.dp))
                Icon(trailingIcon, contentDescription = null, modifier = Modifier.size(22.dp))
            }
        }
    }
}

// ---------- Campo de texto (etiqueta arriba, valor debajo) ----------

@Composable
fun UxTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    error: String? = null,
    helper: String? = null,
    leadingIcon: ImageVector? = null,
    iconTint: Color? = null,
    secure: Boolean = false,
    enabled: Boolean = true,
    maxLength: Int = Int.MAX_VALUE,
) {
    var hidden by remember { mutableStateOf(secure) }
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(18.dp)
    val borderColor = when {
        error != null -> UnixColors.Danger
        focused -> UnixColors.Blue
        else -> UnixColors.Line
    }
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(
            Modifier
                .fillMaxWidth()
                .background(if (enabled) UnixColors.Field else UnixColors.FieldFilled, shape)
                .border(if (focused) 1.5.dp else 1.dp, borderColor, shape)
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            if (leadingIcon != null) {
                Icon(leadingIcon, contentDescription = null, tint = iconTint ?: UnixColors.Muted, modifier = Modifier.size(26.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(label, fontSize = 12.sp, color = UnixColors.Muted)
                BasicTextField(
                    value = value,
                    onValueChange = { if (it.length <= maxLength) onValueChange(it) },
                    modifier = Modifier.fillMaxWidth().onFocusChanged { focused = it.isFocused },
                    enabled = enabled,
                    singleLine = true,
                    textStyle = TextStyle(
                        fontSize = 16.sp,
                        color = UnixColors.Ink,
                        fontWeight = if (enabled) FontWeight.Medium else FontWeight.Bold,
                    ),
                    cursorBrush = SolidColor(UnixColors.Blue),
                    visualTransformation = if (hidden) PasswordVisualTransformation() else VisualTransformation.None,
                    decorationBox = { inner ->
                        Box(Modifier.padding(top = 2.dp)) {
                            if (value.isEmpty()) Text(placeholder, fontSize = 16.sp, color = UnixColors.Placeholder)
                            inner()
                        }
                    },
                )
            }
            if (secure) {
                IconButton(onClick = { hidden = !hidden }) {
                    Icon(
                        if (hidden) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                        contentDescription = if (hidden) "Mostrar contraseña" else "Ocultar contraseña",
                        tint = UnixColors.Muted,
                    )
                }
            }
        }
        when {
            error != null -> Text(error, style = UnixText.Small.copy(color = UnixColors.Danger, fontWeight = FontWeight.SemiBold))
            helper != null -> Text(helper, style = UnixText.Small)
        }
    }
}

// ---------- Tarjeta ----------

@Composable
fun UxCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(24.dp)
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(UnixColors.Surface, shape)
            .border(1.dp, UnixColors.Line, shape)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        content = content,
    )
}

// ---------- Etiquetas y avisos ----------

enum class Tone { Success, Danger, Warning, Info, Neutral }

private fun toneColors(tone: Tone): Pair<Color, Color> = when (tone) {
    Tone.Success -> UnixColors.SuccessBg to UnixColors.Success
    Tone.Danger -> UnixColors.DangerBg to UnixColors.Danger
    Tone.Warning -> UnixColors.WarningBg to UnixColors.Warning
    Tone.Info -> UnixColors.BlueSoft to UnixColors.Blue
    Tone.Neutral -> UnixColors.Bg to UnixColors.Muted
}

@Composable
fun StatusBadge(label: String, tone: Tone = Tone.Neutral, modifier: Modifier = Modifier) {
    val (bg, fg) = toneColors(tone)
    Box(modifier.background(bg, RoundedCornerShape(50)).padding(horizontal = 10.dp, vertical = 4.dp)) {
        Text(label, color = fg, fontSize = 12.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun Banner(message: String, modifier: Modifier = Modifier, tone: Tone = Tone.Info, title: String? = null) {
    val (bg, fg) = toneColors(tone)
    val icon = when (tone) {
        Tone.Success -> Icons.Filled.CheckCircle
        Tone.Danger -> Icons.Filled.Error
        Tone.Warning -> Icons.Filled.Warning
        else -> Icons.Filled.Info
    }
    Row(
        modifier.fillMaxWidth().background(bg, RoundedCornerShape(14.dp)).padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.size(20.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            if (title != null) Text(title, color = fg, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
            Text(message, color = fg, fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium)
        }
    }
}

// ---------- Chip y selector ----------

@Composable
fun UxChip(label: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier, icon: ImageVector? = null) {
    val shape = RoundedCornerShape(50)
    Row(
        modifier
            .clip(shape)
            .background(if (selected) UnixColors.Blue else UnixColors.ChipBg, shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, tint = if (selected) Color.White else UnixColors.Blue, modifier = Modifier.size(16.dp))
        }
        Text(label, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = if (selected) Color.White else UnixColors.Navy)
    }
}

data class SegmentOption<T>(val value: T, val label: String, val icon: ImageVector? = null)

@Composable
fun <T> Segmented(options: List<SegmentOption<T>>, selected: T, onSelect: (T) -> Unit, modifier: Modifier = Modifier) {
    val outer = RoundedCornerShape(18.dp)
    Row(
        modifier.fillMaxWidth().background(UnixColors.Surface, outer).border(1.dp, UnixColors.Line, outer).padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        for (option in options) {
            val active = option.value == selected
            val fg = if (active) Color.White else UnixColors.Navy
            Row(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (active) UnixColors.Blue else Color.Transparent)
                    .clickable { onSelect(option.value) }
                    .padding(vertical = 14.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (option.icon != null) {
                    Icon(option.icon, contentDescription = null, tint = fg, modifier = Modifier.size(24.dp))
                    Spacer(Modifier.width(10.dp))
                }
                Text(option.label, color = fg, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        }
    }
}

// ---------- Estados vacíos y filas de información ----------

@Composable
fun EmptyState(
    icon: ImageVector,
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Column(
        modifier.fillMaxWidth().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(Modifier.size(64.dp).background(UnixColors.BlueSoft, RoundedCornerShape(22.dp)), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = UnixColors.Blue, modifier = Modifier.size(30.dp))
        }
        Text(title, style = UnixText.Heading)
        Text(message, style = UnixText.Body.copy(color = UnixColors.Muted, textAlign = TextAlign.Center))
        if (actionLabel != null && onAction != null) {
            UxButton(actionLabel, onAction, variant = ButtonVariant.Secondary)
        }
    }
}

@Composable
fun InfoRow(label: String, value: String, modifier: Modifier = Modifier, strong: Boolean = false) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = if (strong) UnixText.Heading else UnixText.Body, modifier = Modifier.weight(1f))
        Spacer(Modifier.width(12.dp))
        Text(
            value,
            style = if (strong) UnixText.Title else UnixText.Body.copy(fontWeight = FontWeight.Bold),
            textAlign = TextAlign.End,
        )
    }
}

@Composable
fun Divider() {
    Box(Modifier.fillMaxWidth().height(1.dp).background(UnixColors.Line))
}

// ---------- Diálogos ----------

@Composable
fun ConfirmDialog(
    title: String,
    message: String,
    confirmLabel: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    dismissLabel: String = "Cancelar",
    destructive: Boolean = false,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, fontWeight = FontWeight.Bold) },
        text = { Text(message) },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(confirmLabel, color = if (destructive) UnixColors.Danger else UnixColors.Blue, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(dismissLabel, color = UnixColors.Muted) } },
    )
}

@Composable
fun NoticeDialog(title: String, message: String, buttonLabel: String, onClose: () -> Unit) {
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text(title, fontWeight = FontWeight.Bold) },
        text = { Text(message) },
        confirmButton = { TextButton(onClick = onClose) { Text(buttonLabel, color = UnixColors.Blue, fontWeight = FontWeight.Bold) } },
    )
}

// ---------- Contenedor de pantalla ----------

/** Cuerpo desplazable con padding estándar y un pie fijo opcional. */
@Composable
fun ScreenBody(
    modifier: Modifier = Modifier,
    footer: @Composable () -> Unit = {},
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(modifier.fillMaxSize()) {
        Column(
            Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            content = content,
        )
        footer()
    }
}

@Composable
fun CircleDot(color: Color, size: Int = 10) {
    Box(Modifier.size(size.dp).background(color, CircleShape))
}
