package org.bricohams.radio

/**
 * Read-only probe of the Radtel RT-S10 over BLE. Its Bluetooth protocol is undocumented, so this only describes what the
 * radio advertises (GATT services) and the outcome of the optional identification handshake. Pure logic, no Android types.
 */
object RtS10Probe {
    const val PROP_READ = 0x02
    const val PROP_WRITE_NO_RESPONSE = 0x04
    const val PROP_WRITE = 0x08
    const val PROP_NOTIFY = 0x10
    const val PROP_INDICATE = 0x20

    const val RADTEL_SERVICE = "0000ffe0-0000-1000-8000-00805f9b34fb"
    const val RADTEL_SERIAL = "0000ffe1-0000-1000-8000-00805f9b34fb"

    data class Characteristic(val uuid: String, val properties: Int)

    data class Service(val uuid: String, val characteristics: List<Characteristic>)

    sealed class Handshake {
        object NotTried : Handshake()
        data class Ok(val model: String) : Handshake()
        data class Failed(val message: String) : Handshake()
    }

    data class Report(
        val deviceName: String,
        val address: String,
        val services: List<Service>,
        val handshake: Handshake = Handshake.NotTried
    ) {
        fun report(): String = RtS10Probe.report(this)
    }

    /** True when the ffe0 service exposes the ffe1 serial characteristic. */
    fun hasRadtelSerial(services: List<Service>): Boolean = services.any { service ->
        service.uuid.equals(RADTEL_SERVICE, ignoreCase = true) &&
            service.characteristics.any { it.uuid.equals(RADTEL_SERIAL, ignoreCase = true) }
    }

    fun describeProperties(properties: Int): String {
        val names = listOf(PROP_READ to "read", PROP_WRITE to "write", PROP_WRITE_NO_RESPONSE to "write-no-response",
            PROP_NOTIFY to "notify", PROP_INDICATE to "indicate")
        return names.filter { properties and it.first != 0 }.joinToString(", ") { it.second }.ifEmpty { "none" }
    }

    /** Plain text for the developers: no location and no callsign, only what the radio exposes. */
    fun report(report: Report): String = buildString {
        appendLine("RadiCodex RT-S10 probe (experimental, read-only)")
        appendLine("Device: ${report.deviceName.ifBlank { "(no name)" }}")
        appendLine("Address: ${report.address}")
        appendLine("Services: ${report.services.size}")
        for (service in report.services) {
            appendLine("Service ${service.uuid}")
            for (characteristic in service.characteristics) {
                appendLine("  Characteristic ${characteristic.uuid}: ${describeProperties(characteristic.properties)}")
            }
        }
        appendLine("Radtel serial ffe1: ${if (hasRadtelSerial(report.services)) "present" else "absent"}")
        append("Handshake: ")
        append(when (val result = report.handshake) {
            Handshake.NotTried -> "not tried"
            is Handshake.Ok -> "ok, model ${result.model}"
            is Handshake.Failed -> "failed: ${result.message}"
        })
    }
}
