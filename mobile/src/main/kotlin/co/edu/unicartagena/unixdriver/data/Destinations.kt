package co.edu.unicartagena.unixdriver.data

const val ORIGEN_FIJO = "Universidad de Cartagena"

data class Destination(val nombre: String, val km: Double)

val DESTINATIONS: List<Destination> = listOf(
    Destination("Centro Histórico", 4.8),
    Destination("Bocagrande", 6.2),
    Destination("Manga", 4.1),
    Destination("Getsemaní", 4.9),
    Destination("Castillogrande", 7.0),
    Destination("Boquilla", 11.5),
    Destination("Amberes", 3.0),
    Destination("El Laguito", 6.8),
    Destination("Crespo", 9.4),
    Destination("Turbaco", 14.0),
)

val POPULAR_DESTINATIONS: List<Destination> = DESTINATIONS.take(3)
