package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.time.Instant

class ModelsTest {
    private fun contact() = Contact(call = "EA1ABC/P", utc = Instant.parse("2026-10-25T16:00:01Z"),
        frequencyMHz = "145.500", mode = "FM", sent = "59", received = "57", notes = "Portable")
    private fun invalid(action: () -> Unit) {
        assertThrows(IllegalArgumentException::class.java, action)
    }
    @Test fun adifFieldsAndUtc() {
        val adif = Adif.export(listOf(contact()))
        assertEquals("Bricohams Beta\n<ADIF_VER:5>3.1.4<PROGRAMID:9>Bricohams<EOH>\n" +
            "<CALL:8>EA1ABC/P<QSO_DATE:8>20261025<TIME_ON:6>160001<FREQ:7>145.500" +
            "<MODE:2>FM<RST_SENT:2>59<RST_RCVD:2>57<COMMENT:8>Portable<EOR>\n", adif)
    }
    @Test fun noSilentUnicodeLoss() {
        invalid { Adif.export(listOf(contact().copy(notes = "Espa\u00f1a"))) }
        assertTrue(Adif.export(listOf(contact().copy(notes = "<EOR>"))).contains("<COMMENT:5><EOR>"))
    }
    @Test fun contactBoundaries() {
        for (frequency in listOf("0", "-1", "NaN", "1300.1", "145.1234567", "145,5")) {
            invalid { contact().copy(frequencyMHz = frequency).validated() }
        }
        contact().copy(frequencyMHz = "0.1").validated()
        contact().copy(frequencyMHz = "1300").validated()
        for (call in listOf("", "12345", "ABCDEF", "EA 1A", "<EA1>")) invalid { contact().copy(call = call).validated() }
        invalid { contact().copy(mode = "INVENTED").validated() }
        invalid { contact().copy(notes = "x".repeat(2001)).validated() }
        invalid { contact().copy(sent = "bad").validated() }
        invalid { contact().copy(utc = Instant.parse("2100-01-01T00:00:00Z")).validated() }
    }
    @Test fun gpsNeverAcceptsNonFiniteValues() {
        Fix(-90.0, 180.0, 0.0, Instant.EPOCH).validated()
        for (fix in listOf(Fix(Double.NaN, 0.0, 1.0, Instant.EPOCH), Fix(91.0, 0.0, 1.0, Instant.EPOCH),
            Fix(0.0, -181.0, 1.0, Instant.EPOCH), Fix(0.0, 0.0, -1.0, Instant.EPOCH))) invalid { fix.validated() }
    }
    @Test fun morseTextHasExplicitUnknownSymbols() {
        assertEquals("SOS EA1?", Morse.decode("... --- ... / . .- .---- ..--.."))
        assertEquals("?", Morse.decode("........"))
        assertEquals("", Morse.decode(""))
        invalid { Morse.decode("hello") }
        invalid { Morse.decode(".".repeat(10001)) }
    }
}
