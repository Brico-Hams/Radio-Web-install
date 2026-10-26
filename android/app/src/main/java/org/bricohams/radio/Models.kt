package org.bricohams.radio

import java.math.BigDecimal
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID

data class Contact(
    val id: String = UUID.randomUUID().toString(),
    val call: String,
    val utc: Instant,
    val frequencyMHz: String,
    val mode: String,
    val sent: String,
    val received: String,
    val notes: String,
    val logbook: String = Logbook.GENERAL
) {
    fun validated(): Contact {
        require(call.matches(Regex("[A-Z0-9/]{3,20}")) && call.any(Char::isLetter) && call.any(Char::isDigit)) {
            "Indicativo invalido: usa letras, numeros y /."
        }
        val frequency = frequencyMHz.toBigDecimalOrNull()
        require(frequency != null && frequency >= BigDecimal("0.1") && frequency <= BigDecimal("1300") &&
            frequency.scale() <= 6) { "Frecuencia invalida: 0.1-1300 MHz y hasta seis decimales." }
        require(mode in setOf("FM", "SSB", "CW", "AM", "RTTY", "SSTV", "DMR", "DIGITALVOICE")) { "Modo no admitido." }
        require(sent.matches(Regex("[0-9+-]{1,8}")) && received.matches(Regex("[0-9+-]{1,8}"))) { "Informes invalidos." }
        require(notes.length <= 2000) { "Notas demasiado largas (maximo 2000 caracteres)." }
        require(utc >= Instant.parse("1900-01-01T00:00:00Z") && utc < Instant.parse("2100-01-01T00:00:00Z")) {
            "Fecha fuera del intervalo admitido (1900-2099)."
        }
        require(logbook.matches(Regex("[A-Za-z0-9-]{1,64}"))) { "Libro de guardia invalido." }
        return this
    }
}

/** Activity logbook; POTA/SOTA templates carry the activator's park or summit reference. */
data class Logbook(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val kind: String,
    val reference: String,
    val stationCall: String
) {
    fun validated(): Logbook {
        require(id.matches(Regex("[A-Za-z0-9-]{1,64}"))) { "ID de libro invalido." }
        require(name.isNotBlank() && name.length <= 120 && name.all { it.code in 32..126 }) {
            "Nombre de libro requerido (ASCII, maximo 120 caracteres)."
        }
        require(kind in KINDS) { "Plantilla de libro no admitida." }
        when (kind) {
            "POTA" -> require(reference.matches(Regex("[A-Z0-9]{1,4}-[0-9]{4,5}"))) { "Referencia POTA invalida (ejemplo EA-0123)." }
            "SOTA" -> require(reference.matches(Regex("[A-Z0-9]{1,4}/[A-Z0-9]{2}-[0-9]{3}"))) { "Referencia SOTA invalida (ejemplo EA4/MD-001)." }
            else -> require(reference.isEmpty()) { "El libro General no lleva referencia." }
        }
        require(if (kind == "GENERAL" && stationCall.isEmpty()) true else
            stationCall.matches(Regex("[A-Z0-9/]{3,20}")) && stationCall.any(Char::isLetter) && stationCall.any(Char::isDigit)) {
            "Indicativo de estacion invalido (obligatorio en POTA/SOTA)."
        }
        return this
    }
    /**
     * Earlier contact that makes [contact] a dupe: same call, band (or exact frequency outside bands) and mode;
     * POTA/SOTA activations count once per UTC day, General logbooks once overall.
     */
    fun duplicateOf(contact: Contact, existing: List<Contact>): Contact? {
        fun slot(value: Contact) = Adif.band(value.frequencyMHz) ?: value.frequencyMHz.toBigDecimal().stripTrailingZeros().toPlainString()
        fun day(value: Contact) = value.utc.atZone(ZoneOffset.UTC).toLocalDate()
        return existing.firstOrNull {
            it.id != contact.id && it.logbook == id && it.call == contact.call && it.mode == contact.mode &&
                slot(it) == slot(contact) && (kind == "GENERAL" || day(it) == day(contact))
        }
    }
    companion object {
        const val GENERAL = "general"
        val KINDS = listOf("GENERAL", "POTA", "SOTA")
    }
}

data class Fix(val latitude: Double, val longitude: Double, val accuracyMeters: Double, val utc: Instant) {
    fun validated(): Fix {
        require(latitude.isFinite() && latitude in -90.0..90.0 && longitude.isFinite() && longitude in -180.0..180.0 &&
            accuracyMeters.isFinite() && accuracyMeters >= 0) { "Posicion GPS invalida." }
        return this
    }
}

object Adif {
    private val date = DateTimeFormatter.ofPattern("yyyyMMdd", Locale.ROOT).withZone(ZoneOffset.UTC)
    private val time = DateTimeFormatter.ofPattern("HHmmss", Locale.ROOT).withZone(ZoneOffset.UTC)
    private fun field(name: String, value: String): String {
        require(value.all { it.code in 32..126 }) {
            "ADIF ASCII: exporta JSON para conservar notas con acentos o caracteres no ASCII."
        }
        return "<$name:${value.length}>$value"
    }
    // ADIF 3.1.4 band enumeration (lower/upper MHz, inclusive) within the 0.1-1300 MHz range the log accepts.
    private val bands = listOf(
        "2190m 0.1357 0.1378", "630m 0.472 0.479", "560m 0.501 0.504", "160m 1.8 2.0", "80m 3.5 4.0",
        "60m 5.06 5.45", "40m 7.0 7.3", "30m 10.1 10.15", "20m 14.0 14.35", "17m 18.068 18.168",
        "15m 21.0 21.45", "12m 24.89 24.99", "10m 28.0 29.7", "8m 40 45", "6m 50 54", "5m 54.000001 69.9",
        "4m 70 71", "2m 144 148", "1.25m 222 225", "70cm 420 450", "33cm 902 928", "23cm 1240 1300"
    ).map { it.split(" ").let { (name, low, high) -> name to BigDecimal(low)..BigDecimal(high) } }
    fun band(frequencyMHz: String): String? = frequencyMHz.toBigDecimalOrNull()?.let { frequency ->
        bands.firstOrNull { frequency in it.second }?.first
    }
    fun export(contacts: List<Contact>, logbook: Logbook? = null): String = buildString {
        append("Bricohams Beta\n<ADIF_VER:5>3.1.4<PROGRAMID:9>Bricohams<EOH>\n")
        logbook?.validated()
        for (contact in contacts) {
            contact.validated()
            require(logbook == null || contact.logbook == logbook.id) { "Contacto de otro libro en la exportacion." }
            append(field("CALL", contact.call))
            append(field("QSO_DATE", date.format(contact.utc)))
            append(field("TIME_ON", time.format(contact.utc)))
            band(contact.frequencyMHz)?.let { append(field("BAND", it)) }
            append(field("FREQ", contact.frequencyMHz))
            append(field("MODE", contact.mode))
            append(field("RST_SENT", contact.sent))
            append(field("RST_RCVD", contact.received))
            if (contact.notes.isNotEmpty()) append(field("COMMENT", contact.notes))
            if (logbook != null && logbook.stationCall.isNotEmpty()) append(field("STATION_CALLSIGN", logbook.stationCall))
            when (logbook?.kind) {
                "POTA" -> append(field("MY_POTA_REF", logbook.reference))
                "SOTA" -> append(field("MY_SOTA_REF", logbook.reference))
            }
            append("<EOR>\n")
        }
    }
}

object Morse {
    private val alphabet = mapOf(
        ".-" to "A", "-..." to "B", "-.-." to "C", "-.." to "D", "." to "E", "..-." to "F",
        "--." to "G", "...." to "H", ".." to "I", ".---" to "J", "-.-" to "K", ".-.." to "L",
        "--" to "M", "-." to "N", "---" to "O", ".--." to "P", "--.-" to "Q", ".-." to "R",
        "..." to "S", "-" to "T", "..-" to "U", "...-" to "V", ".--" to "W", "-..-" to "X",
        "-.--" to "Y", "--.." to "Z", "-----" to "0", ".----" to "1", "..---" to "2",
        "...--" to "3", "....-" to "4", "....." to "5", "-...." to "6", "--..." to "7",
        "---.." to "8", "----." to "9", "-..-." to "/", "..--.." to "?"
    )
    fun decode(input: String): String {
        require(input.length <= 10000 && input.all { it == '.' || it == '-' || it == '/' || it.isWhitespace() }) {
            "Introduce puntos y rayas; espacios separan letras y / separa palabras."
        }
        return input.trim().split(Regex("\\s*/\\s*")).joinToString(" ") { word ->
            word.trim().split(Regex("\\s+")).filter(String::isNotEmpty).joinToString("") { alphabet[it] ?: "?" }
        }
    }
}
