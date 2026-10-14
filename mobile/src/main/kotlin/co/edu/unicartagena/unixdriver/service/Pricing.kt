package co.edu.unicartagena.unixdriver.service

import co.edu.unicartagena.unixdriver.model.VehicleType
import kotlin.math.max
import kotlin.math.roundToInt
import kotlin.math.roundToLong

object Pricing {
    /** Tarifa base de referencia antes de aplicar el factor de cada plataforma. */
    fun baseFare(vehicle: VehicleType, km: Double): Double = when (vehicle) {
        VehicleType.MOTO -> 2500 + 520 * km
        VehicleType.CARRO -> 4500 + 1100 * km
    }

    fun roundFare(value: Double): Int = ((value / 10).roundToLong() * 10).toInt()

    fun commission(precio: Int, porcentaje: Double): Int = (precio * porcentaje / 100.0).roundToInt()

    /** Duración estimada del recorrido, en minutos. */
    fun tripDuration(km: Double): Int = max(3, (km * 3).roundToInt())
}
