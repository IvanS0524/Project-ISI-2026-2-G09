package co.edu.unicartagena.unixdriver.data

import co.edu.unicartagena.unixdriver.model.Driver
import co.edu.unicartagena.unixdriver.model.VehicleType

val DRIVERS: Map<VehicleType, List<Driver>> = mapOf(
    VehicleType.MOTO to listOf(
        Driver(1, "Andrés R.", "Boxer CT", "XYZ-530", 4.4),
        Driver(2, "Luis P.", "Pulsar NS 160", "KJH-218", 4.7),
        Driver(3, "Jorge T.", "FZ 2.0", "MNB-904", 4.6),
        Driver(4, "Kevin M.", "CB 125F", "RTY-377", 4.5),
    ),
    VehicleType.CARRO to listOf(
        Driver(11, "Carlos M.", "Hyundai Accent", "ABC-123", 4.8),
        Driver(12, "María F.", "Kia Picanto", "DEF-456", 4.9),
        Driver(13, "Rafael O.", "Chevrolet Spark", "GHI-789", 4.5),
        Driver(14, "Sandra V.", "Renault Logan", "JKL-012", 4.7),
    ),
)
