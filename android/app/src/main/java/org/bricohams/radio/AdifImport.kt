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
        requireUi(bytes.size <= MAX_BYTES) { UiText(R.string.err_adif_too_large) }
        requireUi(bytes.all { (it.toInt() and 255) in 32..126 || it == 9.toByte() || it == 10.toByte() || it == 13.toByte() }) {
            UiText(R.string.err_adif_ascii)
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
                requireUi(text.substring(offset).isBlank() || (!headerEnded && contacts.isEmpty() && fields.isEmpty())) {
                    UiText(R.string.err_adif_trailing_text)
                }
                break
            }
            val gap = text.substring(offset, open)
            requireUi(gap.isBlank() || (!headerEnded && contacts.isEmpty() && fields.isEmpty())) {
                UiText(R.string.err_adif_stray_text)
            }
            val close = text.indexOf('>', open + 1)
            requireUi(close >= 0 && close - open <= 100) { UiText(R.string.err_adif_tag_truncated) }
            val tag = text.substring(open + 1, close).uppercase(Locale.ROOT)
            offset = close + 1
            if (tag == "EOH") {
                requireUi(!headerEnded && contacts.isEmpty() && !recordEnded) { UiText(R.string.err_adif_header_misplaced) }
                fields.clear()
                headerEnded = true
                continue
            }
            if (tag == "EOR") {
                requireUi(fields.isNotEmpty()) { UiText(R.string.err_adif_empty_record) }
                requireUi(contacts.size < 50000) { UiText(R.string.err_adif_too_many) }
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
            requireUi(match != null) { UiText(R.string.err_adif_tag_unsupported, tag) }
            val name = match.groupValues[1]
            val length = match.groupValues[2].toInt()
            requireUi(fields.size < 512) { UiText(R.string.err_adif_too_many_fields) }
            requireUi(length <= text.length - offset) { UiText(R.string.err_adif_field_truncated, name) }
            requireUi(!fields.containsKey(name)) { UiText(R.string.err_adif_field_duplicate, name) }
            fields[name] = text.substring(offset, offset + length)
            offset += length
            recordEnded = false
        }
        requireUi(fields.isEmpty()) { UiText(R.string.err_adif_missing_eor) }
        requireUi(contacts.isNotEmpty()) { UiText(R.string.err_adif_no_contacts) }
        return AdifPreview(contacts, ignored)
    }
    private fun contact(fields: Map<String, String>, number: Int): Contact {
        fun required(name: String): String = requireNotNullUi(fields[name]) { UiText(R.string.err_adif_record_missing, number, name) }.trim()
        try {
            val dateValue = required("QSO_DATE")
            val timeValue = required("TIME_ON")
            requireUi(dateValue.matches(Regex("[0-9]{8}")) && timeValue.matches(Regex("[0-9]{4}([0-9]{2})?"))) {
                UiText(R.string.err_adif_record_datetime, number)
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
            throw LocalizedArgumentException(UiText(R.string.err_adif_record_date, number), error)
        } catch (error: java.time.DateTimeException) {
            throw LocalizedArgumentException(UiText(R.string.err_adif_record_time, number), error)
        }
    }
}
