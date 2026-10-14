package co.edu.unicartagena.unixdriver.state

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import co.edu.unicartagena.unixdriver.data.SEED_COMMISSIONS
import co.edu.unicartagena.unixdriver.data.SEED_TRIPS
import co.edu.unicartagena.unixdriver.data.SEED_USERS
import co.edu.unicartagena.unixdriver.model.CommissionConfig
import co.edu.unicartagena.unixdriver.model.Role
import co.edu.unicartagena.unixdriver.model.SearchQuery
import co.edu.unicartagena.unixdriver.model.TransportOffer
import co.edu.unicartagena.unixdriver.model.Trip
import co.edu.unicartagena.unixdriver.model.TripStatus
import co.edu.unicartagena.unixdriver.model.User
import co.edu.unicartagena.unixdriver.service.Pricing
import co.edu.unicartagena.unixdriver.util.normalize

/**
 * Estado global de la app (sesión, viaje activo, historial, comisión y navegación).
 * Cuando exista el backend, estas funciones llamarían a la API en lugar de modificar listas en memoria.
 * Las funciones que pueden fallar devuelven un mensaje de error, o null si todo salió bien.
 */
class AppStore {
    var users by mutableStateOf(SEED_USERS)
        private set
    var trips by mutableStateOf(SEED_TRIPS)
        private set
    var commissions by mutableStateOf(SEED_COMMISSIONS)
        private set
    var activeTrip by mutableStateOf<Trip?>(null)
        private set
    private var currentUserId by mutableStateOf<Int?>(null)

    // ---- Navegación ----
    var stack by mutableStateOf<List<Route>>(listOf(Route.Login))
        private set
    var passengerTab by mutableStateOf(PassengerTab.INICIO)
    var adminTab by mutableStateOf(AdminTab.PANEL)
    /** Correo que se rellena en el login tras registrarse. */
    var loginPrefill by mutableStateOf<String?>(null)

    val route: Route get() = stack.last()
    val canGoBack: Boolean get() = stack.size > 1

    fun push(route: Route) { stack = stack + route }
    fun pop() { if (stack.size > 1) stack = stack.dropLast(1) }
    fun replace(route: Route) { stack = stack.dropLast(1) + route }
    fun resetTo(route: Route) { stack = listOf(route) }

    // ---- Derivados ----
    val currentUser: User? get() = users.firstOrNull { it.id == currentUserId }
    val activeCommission: CommissionConfig get() = commissions.firstOrNull { it.activa } ?: commissions.first()

    // ---- Cuenta ----
    fun login(correo: String, contrasena: String): String? {
        val found = users.firstOrNull { normalize(it.correo) == normalize(correo) && it.contrasena == contrasena }
            ?: return "El correo o la contraseña no son correctos. Revísalos e intenta de nuevo."
        if (!found.activo) return "Tu cuenta está desactivada. Comunícate con un administrador."
        currentUserId = found.id
        passengerTab = PassengerTab.INICIO
        adminTab = AdminTab.PANEL
        resetTo(Route.Home)
        return null
    }

    fun register(nombre: String, correo: String, telefono: String, contrasena: String): String? {
        if (users.any { normalize(it.correo) == normalize(correo) }) {
            return "Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo."
        }
        val nextId = (users.maxOfOrNull { it.id } ?: 0) + 1
        users = users + User(nextId, nombre.trim(), correo.trim(), telefono.trim(), Role.PASAJERO, true, contrasena)
        loginPrefill = correo.trim()
        return null
    }

    fun logout() {
        currentUserId = null
        activeTrip = null
        resetTo(Route.Login)
    }

    fun updateProfile(nombre: String, telefono: String) {
        val id = currentUserId ?: return
        users = users.map { if (it.id == id) it.copy(nombre = nombre.trim(), telefono = telefono.trim()) else it }
    }

    // ---- Viaje ----
    fun requestTrip(offer: TransportOffer, query: SearchQuery) {
        val userId = currentUserId ?: return
        activeTrip = Trip(
            id = System.currentTimeMillis(),
            userId = userId,
            fechaMillis = System.currentTimeMillis(),
            origen = query.origen,
            destino = query.destino,
            platform = offer.platform,
            vehicleType = offer.vehicleType,
            driver = offer.driver,
            distancia = offer.distancia,
            tiempoLlegada = offer.tiempoEstimado,
            precioFinal = offer.precioEstimado,
            comisionPorcentaje = 0.0,
            comisionMonto = 0,
            estado = TripStatus.SOLICITADO,
        )
    }

    fun startTrip() {
        activeTrip = activeTrip?.copy(estado = TripStatus.EN_CURSO)
    }

    fun finishTrip() {
        val pct = activeCommission.porcentaje
        activeTrip = activeTrip?.copy(
            estado = TripStatus.FINALIZADO,
            comisionPorcentaje = pct,
            comisionMonto = Pricing.commission(activeTrip?.precioFinal ?: 0, pct),
        )
    }

    fun cancelTrip() {
        val trip = activeTrip ?: return
        trips = listOf(trip.copy(estado = TripStatus.CANCELADO, comisionPorcentaje = 0.0, comisionMonto = 0)) + trips
        activeTrip = null
    }

    fun payTrip(metodoPago: String): Trip? {
        val trip = activeTrip ?: return null
        val paid = trip.copy(metodoPago = metodoPago)
        trips = listOf(paid) + trips
        activeTrip = null
        return paid
    }

    // ---- Administración ----
    fun setUserActive(userId: Int, activo: Boolean) {
        users = users.map { if (it.id == userId) it.copy(activo = activo) else it }
    }

    fun createCommission(porcentaje: Double): String? {
        if (porcentaje.isNaN() || porcentaje <= 0.0 || porcentaje > 50.0) return "Ingresa un porcentaje mayor que 0 y hasta 50."
        val nextId = (commissions.maxOfOrNull { it.id } ?: 0) + 1
        commissions = listOf(CommissionConfig(nextId, porcentaje, System.currentTimeMillis(), activa = true)) +
            commissions.map { it.copy(activa = false) }
        return null
    }

    fun activateCommission(id: Int) {
        commissions = commissions.map { it.copy(activa = it.id == id) }
    }
}
