package co.edu.unicartagena.unixdriver.data

import android.content.Context
import co.edu.unicartagena.unixdriver.util.normalize
import org.json.JSONArray
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

const val ORIGEN_FIJO = "Piedra de Bolívar"

data class Destination(
    val nombre: String,
    val km: Double,
    val idBarrio: Int = 0,
    val localidad: String = "",
    val coordenadaX: Double = -75.508695,
    val coordenadaY: Double = 10.401904,
)

val DESTINATIONS: List<Destination> = listOf(
    Destination("Centro Histórico", 4.8, 1200, "Histórica y del Caribe Norte", -75.551165, 10.423857),
    Destination("Bocagrande", 6.2, 1750, "Histórica y del Caribe Norte", -75.553771, 10.405569),
    Destination("Manga", 4.1, 1700, "Histórica y del Caribe Norte", -75.535183, 10.411239),
    Destination("Getsemaní", 4.9, 1450, "Histórica y del Caribe Norte", -75.54608, 10.421087),
    Destination("Castillogrande", 7.0, 3900, "Histórica y del Caribe Norte", -75.551315, 10.394216),
    Destination("La Boquilla", 11.5, 8650, "De la Virgen y Turística", -75.496534, 10.475329),
    Destination("Amberes", 3.0, 2500, "Histórica y del Caribe Norte", -75.51497, 10.406334),
    Destination("El Laguito", 6.8, 3600, "Histórica y del Caribe Norte", -75.56178, 10.395397),
    Destination("Crespo", 9.4, 50, "Histórica y del Caribe Norte", -75.516465, 10.446519),
    Destination("Piedra de Bolívar", 1.8, 3050, "Histórica y del Caribe Norte", -75.508695, 10.401904),
)

val POPULAR_DESTINATIONS: List<Destination> = DESTINATIONS.take(4)

object BarriosCatalog {
    var barrios: List<Destination> = DESTINATIONS
        private set

    fun init(context: Context) {
        if (barrios.size > DESTINATIONS.size) return
        try {
            val raw = context.assets.open("barrios_cartagena.json").bufferedReader(Charsets.UTF_8).use { it.readText() }
            val arr = JSONArray(raw)
            val list = ArrayList<Destination>(arr.length())
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val rawName = obj.optString("Barrio", "").trim()
                    .replace("ESPA?A", "ESPAÑA")
                    .replace("LA CAMPI?A", "LA CAMPIÑA")
                    .replace("NARI?O", "NARIÑO")
                    .replace("RAFAEL NU?EZ", "RAFAEL NÚÑEZ")
                if (rawName.isEmpty()) continue
                val idBarrio = obj.optInt("IdBarrio", i + 1)
                val loc = obj.optString("LOC", "").trim()
                val lon = obj.optDouble("Coordenadas X", -75.508695)
                val lat = obj.optDouble("Coordenadas Y", 10.401904)
                val distRef = haversineUrbanKm(-75.508695, 10.401904, lon, lat)
                list.add(
                    Destination(
                        nombre = formatBarrioTitle(rawName),
                        km = distRef,
                        idBarrio = idBarrio,
                        localidad = loc,
                        coordenadaX = lon,
                        coordenadaY = lat,
                    ),
                )
            }
            if (list.isNotEmpty()) {
                barrios = list.sortedBy { normalize(it.nombre) }
            }
        } catch (_: Exception) {
            barrios = DESTINATIONS
        }
    }

    fun filterSuggestions(query: String, limit: Int = 5): List<Destination> {
        val q = normalize(query)
        if (q.isEmpty()) return emptyList()
        val exactMatch = barrios.any { normalize(it.nombre) == q }
        if (exactMatch) return emptyList()
        val startsWith = barrios.filter { normalize(it.nombre).startsWith(q) }
        val contains = barrios.filter { !normalize(it.nombre).startsWith(q) && normalize(it.nombre).contains(q) }
        return (startsWith + contains).take(limit)
    }

    fun findBarrio(name: String): Destination? {
        val target = normalize(name)
        if (target.isEmpty()) return null
        barrios.firstOrNull { normalize(it.nombre) == target }?.let { return it }
        DESTINATIONS.firstOrNull { normalize(it.nombre) == target }?.let { return it }
        return barrios.firstOrNull { normalize(it.nombre).contains(target) || target.contains(normalize(it.nombre)) }
    }

    fun distanceBetweenKm(origen: String, destino: String): Double? {
        val bOrigen = findBarrio(origen)
        val bDestino = findBarrio(destino)
        if (bOrigen != null && bDestino != null) {
            if (bOrigen.idBarrio != 0 && bOrigen.idBarrio == bDestino.idBarrio) return 1.8
            if (normalize(bOrigen.nombre) == normalize(bDestino.nombre)) return 1.8
            return haversineUrbanKm(bOrigen.coordenadaX, bOrigen.coordenadaY, bDestino.coordenadaX, bDestino.coordenadaY)
        }
        return bDestino?.km
    }

    private fun haversineUrbanKm(lon1: Double, lat1: Double, lon2: Double, lat2: Double): Double {
        val r = 6371.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
            cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
            sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        val urban = max(1.5, r * c * 1.30)
        return (urban * 10.0).roundToInt() / 10.0
    }

    private fun formatBarrioTitle(upper: String): String {
        val lowercaseWords = setOf("de", "del", "la", "las", "el", "los", "y")
        return upper.lowercase().split(" ").filter { it.isNotBlank() }.mapIndexed { index, word ->
            when {
                word in setOf("i", "ii", "iii", "vi", "xxiii") -> word.uppercase()
                word == "st." -> "St."
                index > 0 && word in lowercaseWords -> word
                else -> word.replaceFirstChar { it.uppercase() }
            }
        }.joinToString(" ")
    }
}
