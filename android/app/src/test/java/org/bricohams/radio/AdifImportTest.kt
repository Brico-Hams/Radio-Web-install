package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.time.Instant

class AdifImportTest {
    private val contact = Contact(call = "EA1ABC/P", utc = Instant.parse("2026-10-25T16:01:02Z"),
        frequencyMHz = "145.500", mode = "FM", sent = "59", received = "57", notes = "literal <EOR> <CALL:2>XX")
    private fun parse(value: String) = AdifImport.parse(value.toByteArray(Charsets.US_ASCII))
    @Test fun exportedAdifRoundTripsIncludingTagsInsideLengthDelimitedComment() {
        val preview = parse(Adif.export(listOf(contact)))
        assertEquals(contact.copy(id = preview.contacts.single().id), preview.contacts.single())
        assertTrue(preview.ignoredFields.isEmpty())
    }
    @Test fun headerlessCaseInsensitiveTypedFieldsAndMinuteTimes() {
        val file = Adif.export(listOf(contact.copy(notes = ""))).substringAfter("<EOH>\n")
            .replace("<CALL:", "<call:").replace("<TIME_ON:6>160102", "<time_on:4:T>1601")
            .replace("<BAND:2>2m", "").replace("<EOR>", "<BAND:4>70CM<APP_EXAMPLE:3>abc<eor>")
        val preview = parse(file)
        assertEquals(Instant.parse("2026-10-25T16:01:00Z"), preview.contacts.single().utc)
        assertEquals(setOf("BAND", "APP_EXAMPLE"), preview.ignoredFields)
    }
    @Test fun invalidOrTruncatedRecordsRejectWholePreview() {
        val file = Adif.export(listOf(contact.copy(notes = "")))
        for (bad in listOf(file.replace("<EOR>", ""), file.replace("<EOR>", "<CALL:6>EA2XYZ<EOR>"),
            file.replace("20261025", "20260230"), file.replace("160102", "246000"),
            file.replace("<FREQ:7>145.500", ""), file.replace("<MODE:2>FM", "<MODE:3>FT8"),
            file + "trailing junk", file + "<EOH>", "<EOR>", "<CALL:99999999>x", "<CALL:x>x",
            file.replace("<EOR>", "<UNKNOWN>"), file.replace("<EOR>", "<COMMENT:999>abc"))) {
            assertThrows("Must reject $bad", IllegalArgumentException::class.java) { parse(bad) }
        }
    }
    @Test fun nonAsciiAndOversizedInputFailWithoutSilentConversion() {
        assertThrows(IllegalArgumentException::class.java) { AdifImport.parse("not ASCII \u00f1".toByteArray()) }
        assertThrows(IllegalArgumentException::class.java) { AdifImport.parse(ByteArray(AdifImport.MAX_BYTES + 1)) }
        assertThrows(IllegalArgumentException::class.java) { parse("header only") }
    }
}
