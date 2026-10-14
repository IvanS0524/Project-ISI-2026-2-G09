package co.edu.unicartagena.unixdriver.state

import co.edu.unicartagena.unixdriver.model.SearchQuery

sealed interface Route {
    data object Login : Route
    data object Register : Route
    /** Pantalla con barra inferior; muestra las pestañas del pasajero o del administrador según el rol. */
    data object Home : Route
    data class Offers(val query: SearchQuery) : Route
    data object Trip : Route
    data object Payment : Route
    data class TripDetail(val tripId: Long) : Route
}

enum class PassengerTab(val label: String) { INICIO("Inicio"), HISTORIAL("Historial"), PERFIL("Perfil"), MAS("Más") }

enum class AdminTab(val label: String) { PANEL("Panel"), USUARIOS("Usuarios"), COMISION("Comisión"), REPORTES("Reportes") }
