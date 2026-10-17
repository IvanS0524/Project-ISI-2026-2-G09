package co.edu.unicartagena.unixdriver.data

import co.edu.unicartagena.unixdriver.model.CommissionConfig
import co.edu.unicartagena.unixdriver.model.PlatformId
import co.edu.unicartagena.unixdriver.model.Role
import co.edu.unicartagena.unixdriver.model.Trip
import co.edu.unicartagena.unixdriver.model.TripStatus
import co.edu.unicartagena.unixdriver.model.User
import co.edu.unicartagena.unixdriver.model.VehicleType
import co.edu.unicartagena.unixdriver.service.Pricing
import java.time.ZonedDateTime

val SEED_USERS: List<User> = listOf(
    User(1, "Juan Díaz", "juan@unixdriver.com", "3001234567", Role.PASAJERO, true, "123456"),
    User(2, "Administrador UniX", "admin@unixdriver.com", "3009876543", Role.ADMINISTRADOR, true, "admin123"),
    User(3, "Laura Mejía", "laura@unixdriver.com", "3104567890", Role.PASAJERO, true, "123456"),
    User(4, "Carlos Ortega", "carlos@unixdriver.com", "3157778899", Role.PASAJERO, true, "123456"),
    User(5, "Valentina Ruiz", "valentina@unixdriver.com", "3201112233", Role.PASAJERO, false, "123456"),
)

/** Cuentas de demostración que se muestran en la pantalla de inicio de sesión. */
val DEMO_PASAJERO = "juan@unixdriver.com" to "123456"
val DEMO_ADMIN = "admin@unixdriver.com" to "admin123"

private fun daysAgo(days: Long, hour: Int): Long =
    ZonedDateTime.now().minusDays(days).withHour(hour).withMinute(20).withSecond(0).toInstant().toEpochMilli()

private fun seedTrip(
    id: Long,
    userId: Int,
    days: Long,
    hour: Int,
    destino: String,
    platform: PlatformId,
    vehicleType: VehicleType,
    precio: Int,
    estado: TripStatus,
    pct: Double = 10.0,
): Trip {
    val km = DESTINATIONS.firstOrNull { it.nombre == destino }?.km ?: 5.0
    val pool = DRIVERS.getValue(vehicleType)
    val finished = estado == TripStatus.FINALIZADO
    return Trip(
        id = id,
        userId = userId,
        fechaMillis = daysAgo(days, hour),
        origen = ORIGEN_FIJO,
        destino = destino,
        platform = platform,
        vehicleType = vehicleType,
        driver = pool[(id % pool.size).toInt()],
        distancia = km,
        tiempoLlegada = if (Pricing.tripDuration(km) > 10) 5 else 4,
        precioFinal = precio,
        comisionPorcentaje = if (finished) pct else 0.0,
        comisionMonto = if (finished) Pricing.commission(precio, pct) else 0,
        estado = estado,
        metodoPago = if (finished) "Tarjeta" else null,
    )
}

val SEED_TRIPS: List<Trip> = listOf(
    seedTrip(101, 1, 1, 7, "Amberes", PlatformId.DIDI, VehicleType.MOTO, 4120, TripStatus.FINALIZADO),
    seedTrip(102, 1, 3, 18, "Bocagrande", PlatformId.UBER, VehicleType.CARRO, 13400, TripStatus.FINALIZADO),
    seedTrip(103, 1, 6, 13, "Centro Histórico", PlatformId.INDRIVE, VehicleType.MOTO, 4900, TripStatus.CANCELADO),
    seedTrip(104, 3, 2, 8, "Manga", PlatformId.DIDI, VehicleType.CARRO, 9200, TripStatus.FINALIZADO),
    seedTrip(105, 3, 5, 19, "Getsemaní", PlatformId.INDRIVE, VehicleType.MOTO, 4800, TripStatus.FINALIZADO),
    seedTrip(106, 4, 4, 12, "Castillogrande", PlatformId.UBER, VehicleType.CARRO, 13800, TripStatus.FINALIZADO),
    seedTrip(107, 4, 9, 9, "Boquilla", PlatformId.DIDI, VehicleType.CARRO, 17200, TripStatus.FINALIZADO),
    seedTrip(108, 3, 12, 17, "Bocagrande", PlatformId.UBER, VehicleType.MOTO, 6200, TripStatus.FINALIZADO),
    seedTrip(109, 4, 20, 15, "Amberes", PlatformId.INDRIVE, VehicleType.MOTO, 3860, TripStatus.FINALIZADO),
    seedTrip(110, 1, 24, 10, "Manga", PlatformId.DIDI, VehicleType.MOTO, 4400, TripStatus.FINALIZADO),
)

val SEED_COMMISSIONS: List<CommissionConfig> = listOf(
    CommissionConfig(1, 10.0, daysAgo(60, 9), activa = true),
    CommissionConfig(2, 8.0, daysAgo(120, 9), activa = false),
)
