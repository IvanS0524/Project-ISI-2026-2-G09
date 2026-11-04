package co.edu.unicartagena.unixdriver.service

/*
 * Capa de servicios SIMULADA.
 * Cuando exista el backend (FastAPI), solo hay que reemplazar el cuerpo de estas
 * funciones por llamadas HTTP; las pantallas no cambian.
 */

import co.edu.unicartagena.unixdriver.data.BarriosCatalog
import co.edu.unicartagena.unixdriver.data.DESTINATIONS
import co.edu.unicartagena.unixdriver.data.DRIVERS
import co.edu.unicartagena.unixdriver.data.PLATFORM_IDS
import co.edu.unicartagena.unixdriver.data.platformInfo
import co.edu.unicartagena.unixdriver.model.PlatformId
import co.edu.unicartagena.unixdriver.model.PlatformStatus
import co.edu.unicartagena.unixdriver.model.SearchQuery
import co.edu.unicartagena.unixdriver.model.TransportOffer
import co.edu.unicartagena.unixdriver.model.VehicleType
import co.edu.unicartagena.unixdriver.util.normalize
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.random.Random

object TransportService {

    private fun hash(text: String): Long {
        var h = 0L
        for (c in text) h = (h * 31 + c.code) and 0xFFFFFFFFL
        return h
    }

    fun distanceFor(origen: String, destino: String): Double {
        BarriosCatalog.distanceBetweenKm(origen, destino)?.let { return it }
        val key = normalize(destino)
        DESTINATIONS.firstOrNull { normalize(it.nombre) == key }?.let { return it.km }
        return 3 + (hash("${normalize(origen)}-$key") % 90) / 10.0
    }

    fun distanceFor(destino: String): Double = distanceFor("", destino)

    fun buildOffer(platform: PlatformId, query: SearchQuery): TransportOffer {
        val info = platformInfo(platform)
        val km = distanceFor(query.origen, query.destino)
        val seed = hash("$platform-${normalize(query.origen)}-${normalize(query.destino)}-${query.vehicleType}")
        val pool = DRIVERS.getValue(query.vehicleType)
        return TransportOffer(
            id = "$platform-$seed",
            platform = platform,
            vehicleType = query.vehicleType,
            precioEstimado = Pricing.roundFare(Pricing.baseFare(query.vehicleType, km) * info.factor),
            tiempoEstimado = info.etaBase + (if (query.vehicleType == VehicleType.CARRO) 1 else 0) + (seed % 2).toInt(),
            distancia = km,
            driver = pool[(seed % pool.size).toInt()],
        )
    }

    /** Marca como recomendada la oferta con mejor balance entre precio (70%) y llegada (30%). */
    fun markRecommended(offers: List<TransportOffer>): List<TransportOffer> {
        if (offers.isEmpty()) return offers
        val minPrice = offers.minOf { it.precioEstimado }
        val minEta = offers.minOf { it.tiempoEstimado }
        fun score(o: TransportOffer) =
            o.precioEstimado.toDouble() / minPrice * 0.7 + o.tiempoEstimado.toDouble() / minEta * 0.3
        val best = offers.minBy { score(it) }
        return offers.map { it.copy(recomendada = it.id == best.id) }
    }

    /** Consulta las tres plataformas en paralelo (DSS: bloque `par`). */
    suspend fun searchOffers(
        query: SearchQuery,
        onUpdate: (PlatformId, PlatformStatus, TransportOffer?) -> Unit,
    ) = coroutineScope {
        for (id in PLATFORM_IDS) {
            launch {
                delay(700 + Random.nextLong(1400))
                val roll = Random.nextDouble()
                when {
                    roll < 0.06 -> onUpdate(id, PlatformStatus.SIN_RESPUESTA, null)
                    roll < 0.11 -> onUpdate(id, PlatformStatus.SIN_DISPONIBILIDAD, null)
                    else -> onUpdate(id, PlatformStatus.DISPONIBLE, buildOffer(id, query))
                }
            }
        }
    }

    /** Verifica que la oferta siga vigente antes de solicitar el viaje (flujo alterno A1). */
    @Suppress("UNUSED_PARAMETER")
    suspend fun confirmOffer(offer: TransportOffer): Boolean {
        delay(700)
        return Random.nextDouble() > 0.08
    }
}
