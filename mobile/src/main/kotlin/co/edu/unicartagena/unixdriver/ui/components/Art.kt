package co.edu.unicartagena.unixdriver.ui.components

import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import co.edu.unicartagena.unixdriver.R

const val LOGO_PATH = "art/logo.svg"
const val SKYLINE_TOP_PATH = "art/skyline_top.svg"
const val SKYLINE_BOTTOM_PATH = "art/skyline_bottom.svg"
const val GOOGLE_PATH = "art/google.svg"
const val APPLE_PATH = "art/apple.svg"

@Composable
fun rememberArtPainter(path: String): Painter {
    val resId = when (path) {
        LOGO_PATH -> R.drawable.ic_logo
        SKYLINE_TOP_PATH -> R.drawable.ic_skyline_top
        SKYLINE_BOTTOM_PATH -> R.drawable.ic_skyline_bottom
        GOOGLE_PATH -> R.drawable.ic_google
        APPLE_PATH -> R.drawable.ic_apple
        else -> R.drawable.ic_logo
    }
    return painterResource(id = resId)
}

@Composable
fun ArtImage(
    path: String,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Fit,
    alignment: Alignment = Alignment.Center,
    alpha: Float = 1f,
) {
    Image(
        painter = rememberArtPainter(path),
        contentDescription = null,
        modifier = modifier,
        contentScale = contentScale,
        alignment = alignment,
        alpha = alpha,
    )
}
