package co.edu.unicartagena.unixdriver.data

import co.edu.unicartagena.unixdriver.model.PlatformId
import co.edu.unicartagena.unixdriver.model.PlatformInfo

val PLATFORMS: Map<PlatformId, PlatformInfo> = mapOf(
    PlatformId.UBER to PlatformInfo(PlatformId.UBER, "Uber", 0xFF000000, factor = 1.09, etaBase = 5),
    PlatformId.DIDI to PlatformInfo(PlatformId.DIDI, "DiDi", 0xFFFF6A13, factor = 1.0, etaBase = 4),
    PlatformId.INDRIVE to PlatformInfo(PlatformId.INDRIVE, "inDrive", 0xFFC6F432, factor = 0.94, etaBase = 7),
)

val PLATFORM_IDS: List<PlatformId> = PlatformId.entries

fun platformInfo(id: PlatformId): PlatformInfo = PLATFORMS.getValue(id)
