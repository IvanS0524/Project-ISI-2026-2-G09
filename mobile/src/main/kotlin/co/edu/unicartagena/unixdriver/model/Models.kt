package co.edu.unicartagena.unixdriver.model

enum class Role { PASAJERO, ADMINISTRADOR }

enum class VehicleType(val label: String) { MOTO("Moto"), CARRO("Carro") }

enum class PlatformId { UBER, DIDI, INDRIVE }

enum class TripStatus(val label: String) {
    SOLICITADO("Solicitado"),
    EN_CURSO("En curso"),
    FINALIZADO("Finalizado"),
    CANCELADO("Cancelado"),
}

enum class PlatformStatus { CONSULTANDO, DISPONIBLE, SIN_DISPONIBILIDAD, SIN_RESPUESTA }

data class User(
    val id: Int,
    val nombre: String,
    val correo: String,
    val telefono: String,
    val rol: Role,
    val activo: Boolean,
    val contrasena: String,
)

data class Driver(
    val id: Int,
    val nombre: String,
    val vehiculo: String,
    val placa: String,
    val calificacion: Double,
)

data class PlatformInfo(
    val id: PlatformId,
    val nombre: String,
    /** Color ARGB, por ejemplo 0xFF111111 */
    val color: Long,
    /** Multiplicador de tarifa simulado respecto a la tarifa base */
    val factor: Double,
    /** Minutos base de llegada del conductor (simulado) */
    val etaBase: Int,
)

data class SearchQuery(
    val origen: String,
    val destino: String,
    val vehicleType: VehicleType,
)

data class TransportOffer(
    val id: String,
    val platform: PlatformId,
    val vehicleType: VehicleType,
    val precioEstimado: Int,
    /** Minutos hasta que llega el conductor */
    val tiempoEstimado: Int,
    /** Kilómetros */
    val distancia: Double,
    val driver: Driver,
    val recomendada: Boolean = false,
)

data class Trip(
    val id: Long,
    val userId: Int,
    val fechaMillis: Long,
    val origen: String,
    val destino: String,
    val platform: PlatformId,
    val vehicleType: VehicleType,
    val driver: Driver,
    val distancia: Double,
    val tiempoLlegada: Int,
    val precioFinal: Int,
    val comisionPorcentaje: Double,
    val comisionMonto: Int,
    val estado: TripStatus,
    val metodoPago: String? = null,
)

data class CommissionConfig(
    val id: Int,
    val porcentaje: Double,
    val fechaInicioMillis: Long,
    val activa: Boolean,
)
