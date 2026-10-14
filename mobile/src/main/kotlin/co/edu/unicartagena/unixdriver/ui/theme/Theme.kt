package co.edu.unicartagena.unixdriver.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/** Paleta tomada de los mockups de login e inicio (azul profundo + azules suaves). */
object UnixColors {
    val Navy = Color(0xFF0B2A6F)
    val Blue = Color(0xFF0B4BC7)
    val BlueSoft = Color(0xFFE9F0FD)
    val ChipBg = Color(0xFFEAF1FD)
    val Orange = Color(0xFFFFA23A)
    val Bg = Color(0xFFF6F9FE)
    val Surface = Color(0xFFFFFFFF)
    val Field = Color(0xFFFBFCFF)
    val FieldFilled = Color(0xFFF1F5FB)
    val Line = Color(0xFFDCE5F3)
    val Ink = Color(0xFF14244F)
    val Muted = Color(0xFF6B7B9C)
    val Placeholder = Color(0xFFA9B6CF)
    val Pin = Color(0xFFF23B4F)
    val Target = Color(0xFF1F9D55)
    val Success = Color(0xFF1E9E5A)
    val SuccessBg = Color(0xFFE3F7EA)
    val Danger = Color(0xFFD8372F)
    val DangerBg = Color(0xFFFDECEA)
    val Warning = Color(0xFF9A5B00)
    val WarningBg = Color(0xFFFFF3DF)
}

object UnixText {
    val Display = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = UnixColors.Navy, letterSpacing = (-0.5).sp)
    val Title = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = UnixColors.Navy)
    val Heading = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Bold, color = UnixColors.Navy)
    val Body = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = UnixColors.Ink)
    val Small = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = UnixColors.Muted)
    val Label = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = UnixColors.Muted)
}

@Composable
fun UnixTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = UnixColors.Blue,
            onPrimary = Color.White,
            background = UnixColors.Bg,
            onBackground = UnixColors.Ink,
            surface = UnixColors.Surface,
            onSurface = UnixColors.Ink,
            error = UnixColors.Danger,
        ),
        content = content,
    )
}
