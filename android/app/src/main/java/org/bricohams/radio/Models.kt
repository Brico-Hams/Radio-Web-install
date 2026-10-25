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
    val notes: String
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
        return this
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
    fun export(contacts: List<Contact>): String = buildString {
        append("Bricohams Beta\n<ADIF_VER:5>3.1.4<PROGRAMID:9>Bricohams<EOH>\n")
        for (contact in contacts) {
            contact.validated()
            append(field("CALL", contact.call))
            append(field("QSO_DATE", date.format(contact.utc)))
            append(field("TIME_ON", time.format(contact.utc)))
            append(field("FREQ", contact.frequencyMHz))
            append(field("MODE", contact.mode))
            append(field("RST_SENT", contact.sent))
            append(field("RST_RCVD", contact.received))
            if (contact.notes.isNotEmpty()) append(field("COMMENT", contact.notes))
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
