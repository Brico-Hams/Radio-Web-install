package org.bricohams.radio

import org.json.JSONArray
import org.json.JSONObject
import java.text.Normalizer
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID

enum class NetStationType(val label: Int) {
    MOBILE(R.string.net_type_mobile), BASE(R.string.net_type_base),
    PORTABLE(R.string.net_type_portable), MARITIME(R.string.net_type_maritime)
}
enum class NetPowerSource(val label: Int) {
    AC(R.string.net_source_ac), SOLAR_BATTERY(R.string.net_source_solar), BATTERY(R.string.net_source_battery)
}
enum class NetPurpose(val label: Int) {
    EXERCISE(R.string.net_purpose_exercise), REAL(R.string.net_purpose_real), TEST(R.string.net_purpose_test)
}
enum class NetPriority(val label: Int) {
    ROUTINE(R.string.net_priority_routine), PRIORITY(R.string.net_priority_priority), EMERGENCY(R.string.net_priority_emergency)
}
enum class NetRain(val label: Int) {
    NONE(R.string.net_rain_none), LIGHT(R.string.net_rain_light), MODERATE(R.string.net_rain_moderate), HEAVY(R.string.net_rain_heavy)
}
enum class NetWind(val label: Int) {
    CALM(R.string.net_wind_calm), LIGHT(R.string.net_wind_light), MODERATE(R.string.net_wind_moderate), STRONG(R.string.net_wind_strong)
}
enum class NetSky(val label: Int) {
    CLEAR(R.string.net_sky_clear), FEW_CLOUDS(R.string.net_sky_few), CLOUDY(R.string.net_sky_cloudy), OVERCAST(R.string.net_sky_overcast)
}

/** One station checking in to the net, as asked by voice by the net control operator. */
data class NetCheckIn(
    val id: String = UUID.randomUUID().toString(),
    val order: Int,
    val call: String,
    val name: String = "",
    val utc: Instant,
    val frequencyMHz: String,
    val mode: String,
    val stationType: NetStationType,
    val powerWatts: Int,
    val town: String = "",
    val locator: String = "",
    val powerSource: NetPowerSource = defaultPowerSource(stationType),
    val temperatureC: Double? = null,
    val pressureHpa: Int? = null,
    val rain: NetRain? = null,
    val wind: NetWind? = null,
    val windKmh: Int? = null,
    val windDirection: String = "",
    val sky: NetSky? = null,
    val visibilityKm: Double? = null,
    val rstSent: String = "",
    val rstReceived: String = "",
    val readability: Int? = null,
    val antenna: String = "",
    val equipment: String = "",
    val priority: NetPriority = NetPriority.ROUTINE,
    val message: String = "",
    val remarks: String = ""
) {
    /** Uppercase call and canonical locator; leaves invalid values untouched so [validated] reports them. */
    fun normalized() = copy(call = call.trim().uppercase(), name = name.trim(), town = town.trim(),
        locator = locator.trim().let { if (Maidenhead.isValid(it)) Maidenhead.format(it) else it },
        windDirection = windDirection.trim().uppercase(), antenna = antenna.trim(), equipment = equipment.trim(),
        message = message.trim(), remarks = remarks.trim())

    fun validated(): NetCheckIn {
        requireUi(order >= 1) { UiText(R.string.net_err_order) }
        requireUi(Contact.validCall(call)) { UiText(R.string.err_call_invalid) }
        requireUi(utc >= Instant.parse("1900-01-01T00:00:00Z") && utc < Instant.parse("2100-01-01T00:00:00Z")) {
            UiText(R.string.err_date_range)
        }
        requireUi(Contact.validFrequency(frequencyMHz)) { UiText(R.string.err_frequency_invalid) }
        requireUi(mode in Contact.MODES) { UiText(R.string.err_mode_unsupported) }
        requireUi(powerWatts in POWER_RANGE) { UiText(R.string.net_err_power, POWER_RANGE.first, POWER_RANGE.last) }
        requireUi(town.isNotBlank() || locator.isNotBlank()) { UiText(R.string.net_err_location) }
        requireUi(locator.isEmpty() || Maidenhead.isValid(locator)) { UiText(R.string.profile_locator_invalid) }
        requireUi(temperatureC == null || temperatureC.isFinite() && temperatureC in -60.0..60.0) { UiText(R.string.net_err_weather) }
        requireUi(pressureHpa == null || pressureHpa in 850..1100) { UiText(R.string.net_err_weather) }
        requireUi(windKmh == null || windKmh in 0..300) { UiText(R.string.net_err_weather) }
        requireUi(visibilityKm == null || visibilityKm.isFinite() && visibilityKm in 0.0..500.0) { UiText(R.string.net_err_weather) }
        requireUi(windDirection.isEmpty() || windDirection in DIRECTIONS) { UiText(R.string.net_err_weather) }
        requireUi(listOf(rstSent, rstReceived).all { it.isEmpty() || it.matches(Regex("[0-9+-]{1,8}")) } &&
            (readability == null || readability in 1..5)) { UiText(R.string.net_err_signal) }
        requireUi(listOf(name, town, antenna, equipment).all { it.length <= 80 } && message.length <= 200 &&
            remarks.length <= 500 && listOf(name, town, antenna, equipment, message, remarks).none { it.any(Char::isISOControl) }) {
            UiText(R.string.net_err_text)
        }
        return this
    }

    /** Station-level data of an earlier check-in carried over to a new one; weather, signal and traffic start empty. */
    fun repeating(order: Int, utc: Instant, frequencyMHz: String, mode: String) = NetCheckIn(
        order = order, call = call, name = name, utc = utc, frequencyMHz = frequencyMHz, mode = mode,
        stationType = stationType, powerWatts = powerWatts, town = town, locator = locator, powerSource = powerSource,
        antenna = antenna, equipment = equipment
    )

    companion object {
        val POWER_RANGE = 5..50
        val POWER_STEPS = listOf(5, 10, 20, 25, 30, 40, 50)
        val DIRECTIONS = listOf("N", "NE", "E", "SE", "S", "SW", "W", "NW")
        /** A mobile station runs from its vehicle/portable batteries; everything else defaults to mains. */
        fun defaultPowerSource(type: NetStationType) = if (type == NetStationType.MOBILE) NetPowerSource.BATTERY else NetPowerSource.AC
    }
}

data class NetSummary(
    val checkIns: Int,
    val stations: Int,
    val mobile: Int,
    val base: Int,
    val portable: Int,
    val maritime: Int,
    val powerMin: Int?,
    val powerMax: Int?,
    val powerAverage: Double?,
    val powerSources: Map<NetPowerSource, Int>,
    val priority: Int,
    val emergency: Int
)

data class NetSession(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val controlCall: String,
    val frequencyMHz: String,
    val mode: String,
    val startUtc: Instant,
    val endUtc: Instant? = null,
    val purpose: NetPurpose = NetPurpose.EXERCISE,
    val checkIns: List<NetCheckIn> = emptyList()
) {
    fun validated(): NetSession {
        requireUi(id.matches(Regex("[A-Za-z0-9-]{1,64}"))) { UiText(R.string.err_logbook_id) }
        requireUi(name.isNotBlank() && name.length <= 120 && name.none(Char::isISOControl)) { UiText(R.string.net_err_name) }
        requireUi(Contact.validCall(controlCall)) { UiText(R.string.net_err_control_call) }
        requireUi(Contact.validFrequency(frequencyMHz)) { UiText(R.string.err_frequency_invalid) }
        requireUi(mode in Contact.MODES) { UiText(R.string.err_mode_unsupported) }
        requireUi(endUtc == null || endUtc >= startUtc) { UiText(R.string.net_err_times) }
        requireUi(checkIns.size <= 2000 && checkIns.map { it.id }.toSet().size == checkIns.size) { UiText(R.string.net_err_order) }
        checkIns.forEach { it.validated() }
        return this
    }

    fun nextOrder() = (checkIns.maxOfOrNull { it.order } ?: 0) + 1

    /** Appends the check-in with the next order number, or replaces the one with the same id keeping its number. */
    fun withCheckIn(checkIn: NetCheckIn): NetSession {
        val existing = checkIns.find { it.id == checkIn.id }
        val ready = checkIn.copy(order = existing?.order ?: nextOrder()).normalized().validated()
        return copy(checkIns = (if (existing == null) checkIns + ready else checkIns.map { if (it.id == ready.id) ready else it }))
            .also { requireUi(it.checkIns.size <= 2000) { UiText(R.string.net_err_order) } }
    }

    /** Removes a check-in and renumbers the rest 1..n so exported order numbers stay contiguous. */
    fun withoutCheckIn(checkInId: String): NetSession = copy(
        checkIns = checkIns.filter { it.id != checkInId }.sortedBy { it.order }.mapIndexed { index, it -> it.copy(order = index + 1) })

    fun summary(): NetSummary {
        // One row per distinct station: its latest check-in decides type, power and supply.
        val stations = checkIns.groupBy { it.call }.map { entry -> entry.value.maxBy { it.order } }
        val powers = stations.map { it.powerWatts }
        return NetSummary(
            checkIns = checkIns.size, stations = stations.size,
            mobile = stations.count { it.stationType == NetStationType.MOBILE },
            base = stations.count { it.stationType == NetStationType.BASE },
            portable = stations.count { it.stationType == NetStationType.PORTABLE },
            maritime = stations.count { it.stationType == NetStationType.MARITIME },
            powerMin = powers.minOrNull(), powerMax = powers.maxOrNull(),
            powerAverage = if (powers.isEmpty()) null else powers.average(),
            powerSources = NetPowerSource.values().associateWith { source -> stations.count { it.powerSource == source } },
            priority = checkIns.count { it.priority == NetPriority.PRIORITY },
            emergency = checkIns.count { it.priority == NetPriority.EMERGENCY }
        )
    }

    fun toJson(): JSONObject = JSONObject().apply {
        val summary = summary()
        put("format", FORMAT); put("version", 1)
        put("id", id); put("name", name); put("controlCall", controlCall)
        put("frequencyMHz", frequencyMHz); put("mode", mode)
        put("startUtc", startUtc.toString()); put("endUtc", endUtc?.toString() ?: JSONObject.NULL)
        put("purpose", purpose.name)
        put("stationCount", summary.stations); put("checkInCount", summary.checkIns)
        put("checkIns", JSONArray().apply { checkIns.sortedBy { it.order }.forEach { put(it.toJson()) } })
    }

    companion object {
        const val FORMAT = "radicodex-net-session"

        fun fromJson(json: JSONObject): NetSession {
            requireUi(json.optString("format") == FORMAT && json.optInt("version") == 1) { UiText(R.string.err_backup_format) }
            val rows = json.getJSONArray("checkIns")
            return NetSession(
                id = json.getString("id"), name = json.getString("name"), controlCall = json.getString("controlCall"),
                frequencyMHz = json.getString("frequencyMHz"), mode = json.getString("mode"),
                startUtc = Instant.parse(json.getString("startUtc")),
                endUtc = if (json.isNull("endUtc")) null else Instant.parse(json.getString("endUtc")),
                purpose = enumOf(json.getString("purpose")),
                checkIns = List(rows.length()) { checkInFromJson(rows.getJSONObject(it)) }
            ).validated()
        }

        private inline fun <reified T : Enum<T>> enumOf(value: String): T =
            enumValues<T>().firstOrNull { it.name == value } ?: throw LocalizedArgumentException(UiText(R.string.net_err_field, value))

        private fun JSONObject.optEnum(key: String): String? = if (!has(key) || isNull(key)) null else getString(key)

        private fun checkInFromJson(row: JSONObject): NetCheckIn {
            fun number(key: String): Number? = if (!row.has(key) || row.isNull(key)) null else row.get(key) as? Number
                ?: throw LocalizedArgumentException(UiText(R.string.net_err_field, key))
            val type = enumOf<NetStationType>(row.getString("stationType"))
            return NetCheckIn(
                id = row.getString("id"), order = row.getInt("order"), call = row.getString("call"),
                name = row.optString("name"), utc = Instant.parse(row.getString("utc")),
                frequencyMHz = row.getString("frequencyMHz"), mode = row.getString("mode"),
                stationType = type, powerWatts = row.getInt("powerWatts"),
                town = row.optString("town"), locator = row.optString("locator"),
                powerSource = enumOf(row.getString("powerSource")),
                temperatureC = number("temperatureC")?.toDouble(), pressureHpa = number("pressureHpa")?.toInt(),
                rain = row.optEnum("rain")?.let { enumOf<NetRain>(it) },
                wind = row.optEnum("wind")?.let { enumOf<NetWind>(it) },
                windKmh = number("windKmh")?.toInt(), windDirection = row.optString("windDirection"),
                sky = row.optEnum("sky")?.let { enumOf<NetSky>(it) },
                visibilityKm = number("visibilityKm")?.toDouble(),
                rstSent = row.optString("rstSent"), rstReceived = row.optString("rstReceived"),
                readability = number("readability")?.toInt(),
                antenna = row.optString("antenna"), equipment = row.optString("equipment"),
                priority = enumOf(row.getString("priority")),
                message = row.optString("message"), remarks = row.optString("remarks")
            )
        }

        /** Most recent earlier check-in of [call] across all sessions, to prefill the station's data. */
        fun lastKnown(call: String, sessions: List<NetSession>): NetCheckIn? {
            val wanted = call.trim().uppercase()
            return sessions.flatMap { it.checkIns }.filter { it.call == wanted }.maxByOrNull { it.utc }
        }
    }
}

private fun NetCheckIn.toJson(): JSONObject = JSONObject().apply {
    put("id", id); put("order", order); put("call", call); put("name", name); put("utc", utc.toString())
    put("frequencyMHz", frequencyMHz); put("mode", mode)
    put("stationType", stationType.name); put("powerWatts", powerWatts)
    put("town", town); put("locator", locator); put("powerSource", powerSource.name)
    put("temperatureC", temperatureC ?: JSONObject.NULL); put("pressureHpa", pressureHpa ?: JSONObject.NULL)
    put("rain", rain?.name ?: JSONObject.NULL); put("wind", wind?.name ?: JSONObject.NULL)
    put("windKmh", windKmh ?: JSONObject.NULL); put("windDirection", windDirection)
    put("sky", sky?.name ?: JSONObject.NULL); put("visibilityKm", visibilityKm ?: JSONObject.NULL)
    put("rstSent", rstSent); put("rstReceived", rstReceived); put("readability", readability ?: JSONObject.NULL)
    put("antenna", antenna); put("equipment", equipment)
    put("priority", priority.name); put("message", message); put("remarks", remarks)
}

/** Net session exports: CSV and JSON carry every field; ADIF only standard ADIF 3 fields, the rest goes to COMMENT/NOTES. */
object NetExport {
    private val date = DateTimeFormatter.ofPattern("yyyyMMdd", Locale.ROOT).withZone(ZoneOffset.UTC)
    private val time = DateTimeFormatter.ofPattern("HHmmss", Locale.ROOT).withZone(ZoneOffset.UTC)

    val CSV_COLUMNS = listOf("net", "purpose", "net_control", "net_start_utc", "net_end_utc", "order", "call", "name", "utc",
        "frequency_mhz", "mode", "station_type", "power_w", "town", "locator", "power_source", "temperature_c", "pressure_hpa",
        "rain", "wind", "wind_kmh", "wind_direction", "sky", "visibility_km", "rst_sent", "rst_received", "readability",
        "antenna", "equipment", "priority", "message", "remarks")

    fun json(session: NetSession): String = session.validated().toJson().toString(2)

    private fun csvCell(value: String, text: Boolean = false): String {
        // Free text starting with a spreadsheet formula character is prefixed so it opens as text.
        val safe = if (text && value.firstOrNull() in listOf('=', '+', '-', '@')) "'$value" else value
        return if (safe.any { it == ',' || it == '"' || it == '\n' || it == '\r' }) "\"" + safe.replace("\"", "\"\"") + "\"" else safe
    }

    fun csv(session: NetSession): String = buildString {
        session.validated()
        append(CSV_COLUMNS.joinToString(",")).append("\r\n")
        for (c in session.checkIns.sortedBy { it.order }) {
            val cells = listOf(
                csvCell(session.name, true), session.purpose.name, session.controlCall, session.startUtc.toString(),
                session.endUtc?.toString() ?: "", c.order.toString(), c.call, csvCell(c.name, true), c.utc.toString(),
                c.frequencyMHz, c.mode, c.stationType.name, c.powerWatts.toString(), csvCell(c.town, true), c.locator,
                c.powerSource.name, c.temperatureC?.toString() ?: "", c.pressureHpa?.toString() ?: "", c.rain?.name ?: "",
                c.wind?.name ?: "", c.windKmh?.toString() ?: "", c.windDirection, c.sky?.name ?: "",
                c.visibilityKm?.toString() ?: "", c.rstSent, c.rstReceived, c.readability?.toString() ?: "",
                csvCell(c.antenna, true), csvCell(c.equipment, true), c.priority.name, csvCell(c.message, true),
                csvCell(c.remarks, true)
            )
            append(cells.joinToString(",")).append("\r\n")
        }
    }

    private fun ascii(value: String) = Normalizer.normalize(value, Normalizer.Form.NFD).replace(Regex("\\p{M}+"), "")
        .map { if (it.code in 32..126) it else ' ' }.joinToString("").trim()

    private fun comment(session: NetSession, c: NetCheckIn): String = buildList {
        add("Net ${ascii(session.name)} #${c.order} ${session.purpose.name}")
        add("TYPE=${c.stationType.name}"); add("SUPPLY=${c.powerSource.name}")
        c.temperatureC?.let { add("TEMP_C=$it") }
        c.pressureHpa?.let { add("PRESS_HPA=$it") }
        c.rain?.let { add("RAIN=${it.name}") }
        c.wind?.let { add("WIND=${it.name}") }
        c.windKmh?.let { add("WIND_KMH=$it") }
        if (c.windDirection.isNotEmpty()) add("WIND_DIR=${c.windDirection}")
        c.sky?.let { add("SKY=${it.name}") }
        c.visibilityKm?.let { add("VIS_KM=$it") }
        c.readability?.let { add("READ=$it") }
        if (c.antenna.isNotEmpty()) add("ANT=${ascii(c.antenna)}")
        if (c.equipment.isNotEmpty()) add("RIG=${ascii(c.equipment)}")
        if (c.priority != NetPriority.ROUTINE) add("PRIORITY=${c.priority.name}")
    }.joinToString("; ")

    fun adif(session: NetSession, myGrid: String = ""): String = buildString {
        session.validated()
        append("RadiCodex by BricoHams - Net Control\n<ADIF_VER:5>3.1.4<PROGRAMID:9>RadiCodex<EOH>\n")
        val grid = if (myGrid.isBlank()) "" else Maidenhead.format(myGrid)
        for (c in session.checkIns.sortedBy { it.order }) {
            append(Adif.field("CALL", c.call))
            append(Adif.field("QSO_DATE", date.format(c.utc)))
            append(Adif.field("TIME_ON", time.format(c.utc)))
            Adif.band(c.frequencyMHz)?.let { append(Adif.field("BAND", it)) }
            append(Adif.field("FREQ", c.frequencyMHz))
            append(Adif.field("MODE", c.mode))
            if (c.rstSent.isNotEmpty()) append(Adif.field("RST_SENT", c.rstSent))
            if (c.rstReceived.isNotEmpty()) append(Adif.field("RST_RCVD", c.rstReceived))
            append(Adif.field("TX_PWR", c.powerWatts.toString()))
            if (c.locator.isNotEmpty()) append(Adif.field("GRIDSQUARE", c.locator))
            if (c.town.isNotEmpty()) append(Adif.field("QTH", ascii(c.town)))
            if (c.name.isNotEmpty()) append(Adif.field("NAME", ascii(c.name)))
            append(Adif.field("STATION_CALLSIGN", session.controlCall))
            if (grid.isNotEmpty()) append(Adif.field("MY_GRIDSQUARE", grid))
            append(Adif.field("COMMENT", comment(session, c)))
            val notes = listOfNotNull(c.message.takeIf { it.isNotEmpty() }?.let { "MSG: ${ascii(it)}" },
                c.remarks.takeIf { it.isNotEmpty() }?.let { "REM: ${ascii(it)}" }).joinToString(" | ")
            if (notes.isNotEmpty()) append(Adif.field("NOTES", notes))
            append("<EOR>\n")
        }
    }
}
