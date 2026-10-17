package co.edu.unicartagena.unixdriver.util

import java.text.Normalizer
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

fun formatCOP(value: Int): String =
    "$ " + value.toString().reversed().chunked(3).joinToString(".").reversed()

private val dateFormat = DateTimeFormatter.ofPattern("dd/MM/yyyy")
private val dateTimeFormat = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")

fun formatDate(millis: Long): String =
    dateFormat.format(Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()))

fun formatDateTime(millis: Long): String =
    dateTimeFormat.format(Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()))

/** Muestra 10, 7.5 o 12.25 sin ceros sobrantes. */
fun formatPercent(value: Double): String =
    (if (value % 1.0 == 0.0) value.toInt().toString() else value.toString().trimEnd('0')) + "%"

private val emailRegex = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
private val phoneRegex = Regex("^3\\d{9}$")

fun isValidEmail(value: String): Boolean = emailRegex.matches(value.trim())

fun isValidPhone(value: String): Boolean = phoneRegex.matches(value.trim())

fun normalize(value: String): String =
    Normalizer.normalize(value, Normalizer.Form.NFD)
        .replace(Regex("\\p{M}"), "")
        .lowercase()
        .trim()

fun initials(name: String): String =
    name.split(" ").filter { it.isNotBlank() }.take(2).joinToString("") { it.first().uppercase() }
