package org.bricohams.radio

import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale

data class AdifPreview(val contacts: List<Contact>, val ignoredFields: Set<String>)

object AdifImport {
    const val MAX_BYTES = 16 * 1024 * 1024
    private val supported = setOf("CALL", "QSO_DATE", "TIME_ON", "FREQ", "MODE", "RST_SENT", "RST_RCVD", "COMMENT")
    private val date = DateTimeFormatter.BASIC_ISO_DATE
    fun parse(bytes: ByteArray): AdifPreview {
        require(bytes.size <= MAX_BYTES) { "ADIF supera 16 MiB." }
        require(bytes.all { (it.toInt() and 255) in 32..126 || it == 9.toByte() || it == 10.toByte() || it == 13.toByte() }) {
            "Importacion ADIF ASCII: no admite UTF-8, controles ni ADX. Conserva el original."
        }
        val text = bytes.toString(Charsets.US_ASCII)
        val contacts = ArrayList<Contact>()
        val ignored = sortedSetOf<String>()
        var fields = linkedMapOf<String, String>()
        var headerEnded = false
        var recordEnded = false
        var offset = 0
        while (offset < text.length) {
            val open = text.indexOf('<', offset)
            if (open < 0) {
                require(text.substring(offset).isBlank() || (!headerEnded && contacts.isEmpty() && fields.isEmpty())) {
                    "Texto fuera de campos ADIF despues del ultimo registro."
                }
                break
            }
            val gap = text.substring(offset, open)
            require(gap.isBlank() || (!headerEnded && contacts.isEmpty() && fields.isEmpty())) {
                "Texto fuera de campos ADIF."
            }
            val close = text.indexOf('>', open + 1)
            require(close >= 0 && close - open <= 100) { "Etiqueta ADIF truncada o demasiado larga." }
            val tag = text.substring(open + 1, close).uppercase(Locale.ROOT)
            offset = close + 1
            if (tag == "EOH") {
                require(!headerEnded && contacts.isEmpty() && !recordEnded) { "Cabecera ADIF fuera de lugar." }
                fields.clear()
                headerEnded = true
                continue
            }
            if (tag == "EOR") {
                require(fields.isNotEmpty()) { "Registro ADIF vacio." }
                require(contacts.size < 50000) { "ADIF supera 50000 contactos." }
                contacts.add(contact(fields, contacts.size + 1))
                // BAND is derived from FREQ on export, so only a contradicting BAND is information that would be lost.
                val derivedBand = fields["BAND"]?.trim().equals(Adif.band(fields["FREQ"]?.trim() ?: ""), ignoreCase = true)
                ignored.addAll(fields.keys - supported - if (derivedBand) setOf("BAND") else emptySet())
                fields = linkedMapOf()
                headerEnded = true
                recordEnded = true
                continue
            }
            val match = Regex("([A-Z][A-Z0-9_]*):([0-9]{1,8})(?::[A-Z])?").matchEntire(tag)
            require(match != null) { "Etiqueta ADIF no admitida: <$tag>." }
            val name = match.groupValues[1]
            val length = match.groupValues[2].toInt()
            require(fields.size < 512) { "Demasiados campos ADIF en cabecera o registro (maximo 512)." }
            require(length <= text.length - offset) { "Campo ADIF $name truncado." }
            require(!fields.containsKey(name)) { "Campo ADIF duplicado: $name." }
            fields[name] = text.substring(offset, offset + length)
            offset += length
            recordEnded = false
        }
        require(fields.isEmpty()) { "Falta <EOR> al final del ADIF." }
        require(contacts.isNotEmpty()) { "ADIF sin contactos." }
        return AdifPreview(contacts, ignored)
    }
    private fun contact(fields: Map<String, String>, number: Int): Contact {
        fun required(name: String): String = requireNotNull(fields[name]) { "Registro $number: falta $name." }.trim()
        try {
            val dateValue = required("QSO_DATE")
            val timeValue = required("TIME_ON")
            require(dateValue.matches(Regex("[0-9]{8}")) && timeValue.matches(Regex("[0-9]{4}([0-9]{2})?"))) {
                "Registro $number: QSO_DATE YYYYMMDD y TIME_ON HHMM o HHMMSS."
            }
            val normalizedTime = timeValue.padEnd(6, '0')
            val utc = LocalDate.parse(dateValue, date).atTime(
                LocalTime.of(normalizedTime.substring(0, 2).toInt(), normalizedTime.substring(2, 4).toInt(),
                    normalizedTime.substring(4, 6).toInt())
            ).toInstant(ZoneOffset.UTC)
            return Contact(call = required("CALL").uppercase(Locale.ROOT), utc = utc,
                frequencyMHz = required("FREQ"), mode = required("MODE").uppercase(Locale.ROOT),
                sent = required("RST_SENT"), received = required("RST_RCVD"), notes = fields["COMMENT"] ?: "").validated()
        } catch (error: DateTimeParseException) {
            throw IllegalArgumentException("Registro $number: fecha ADIF invalida.", error)
        } catch (error: java.time.DateTimeException) {
            throw IllegalArgumentException("Registro $number: hora ADIF invalida.", error)
        }
    }
}
