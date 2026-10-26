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
            "<CALL:8>EA1ABC/P<QSO_DATE:8>20261025<TIME_ON:6>160001<BAND:2>2m<FREQ:7>145.500" +
            "<MODE:2>FM<RST_SENT:2>59<RST_RCVD:2>57<COMMENT:8>Portable<EOR>\n", adif)
    }
    @Test fun logbookAdifCarriesActivationReferenceAndBand() {
        val pota = Logbook(id = "pota-1", name = "Parque", kind = "POTA", reference = "EA-0123", stationCall = "EA1ABC/P")
        val sota = pota.copy(kind = "SOTA", reference = "EA4/MD-001")
        val inPark = contact().copy(logbook = pota.id, frequencyMHz = "14.285", mode = "SSB")
        val adif = Adif.export(listOf(inPark), pota)
        assertTrue(adif.contains("<BAND:3>20m<FREQ:6>14.285"))
        assertTrue(adif.contains("<STATION_CALLSIGN:8>EA1ABC/P<MY_POTA_REF:7>EA-0123<EOR>"))
        assertTrue(Adif.export(listOf(inPark), sota).contains("<MY_SOTA_REF:10>EA4/MD-001<EOR>"))
        invalid { Adif.export(listOf(contact()), pota) }
        assertFalse(Adif.export(listOf(contact().copy(frequencyMHz = "149"))).contains("<BAND"))
        assertEquals("23cm", Adif.band("1300")); assertEquals("160m", Adif.band("1.8")); assertNull(Adif.band("2.1"))
        for (bad in listOf(pota.copy(reference = "EA-12"), pota.copy(stationCall = ""), sota.copy(reference = "EA-0123"),
            pota.copy(kind = "GENERAL"), pota.copy(kind = "WWFF"), pota.copy(name = " "), pota.copy(id = "bad id"))) {
            invalid { bad.validated() }
        }
        Logbook(name = "Casa", kind = "GENERAL", reference = "", stationCall = "").validated()
    }
    @Test fun dupesMatchCallBandModeAndPerDayForActivations() {
        val pota = Logbook(id = "pota-1", name = "Parque", kind = "POTA", reference = "EA-0123", stationCall = "EA1ABC")
        val first = contact().copy(id = "first", logbook = pota.id, frequencyMHz = "14.285", mode = "SSB")
        val log = listOf(first)
        val again = first.copy(id = "again", frequencyMHz = "14.300", utc = first.utc.plusSeconds(3600))
        assertEquals(first, pota.duplicateOf(again, log))
        assertNull(pota.duplicateOf(first, log))
        assertNull(pota.duplicateOf(again.copy(frequencyMHz = "7.150"), log))
        assertNull(pota.duplicateOf(again.copy(mode = "CW"), log))
        assertNull(pota.duplicateOf(again.copy(call = "EA2XYZ"), log))
        assertNull(pota.duplicateOf(again.copy(utc = Instant.parse("2026-10-26T00:00:00Z")), log))
        val general = Logbook(id = "g", name = "Casa", kind = "GENERAL", reference = "", stationCall = "")
        val home = log.map { it.copy(logbook = "g") }
        assertNotNull(general.duplicateOf(again.copy(logbook = "g", utc = Instant.parse("2026-12-01T00:00:00Z")), home))
        assertNull(general.duplicateOf(again, log))
        val outOfBand = home.map { it.copy(frequencyMHz = "149.000") }
        assertNotNull(general.duplicateOf(again.copy(logbook = "g", frequencyMHz = "149"), outOfBand))
        assertNull(general.duplicateOf(again.copy(logbook = "g", frequencyMHz = "149.5"), outOfBand))
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
