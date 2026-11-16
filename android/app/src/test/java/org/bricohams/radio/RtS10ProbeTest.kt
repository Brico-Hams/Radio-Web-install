package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test

class RtS10ProbeTest {
    private val radtel = RtS10Probe.Service(RtS10Probe.RADTEL_SERVICE, listOf(
        RtS10Probe.Characteristic(RtS10Probe.RADTEL_SERIAL, RtS10Probe.PROP_READ or RtS10Probe.PROP_WRITE_NO_RESPONSE or RtS10Probe.PROP_NOTIFY)))
    private val other = RtS10Probe.Service("0000180a-0000-1000-8000-00805f9b34fb", listOf(
        RtS10Probe.Characteristic("00002a29-0000-1000-8000-00805f9b34fb", RtS10Probe.PROP_READ)))

    @Test fun detectsRadtelSerialOnlyInTheFfe0Service() {
        assertTrue(RtS10Probe.hasRadtelSerial(listOf(other, radtel)))
        assertTrue(RtS10Probe.hasRadtelSerial(listOf(RtS10Probe.Service(RtS10Probe.RADTEL_SERVICE.uppercase(), radtel.characteristics))))
        assertFalse(RtS10Probe.hasRadtelSerial(listOf(other)))
        assertFalse(RtS10Probe.hasRadtelSerial(emptyList()))
        // ffe1 under another service does not count.
        assertFalse(RtS10Probe.hasRadtelSerial(listOf(RtS10Probe.Service(other.uuid, radtel.characteristics))))
        // The ffe0 service without ffe1 does not count either.
        assertFalse(RtS10Probe.hasRadtelSerial(listOf(RtS10Probe.Service(RtS10Probe.RADTEL_SERVICE, other.characteristics))))
    }

    @Test fun rendersPropertyFlags() {
        assertEquals("read", RtS10Probe.describeProperties(0x02))
        assertEquals("write-no-response", RtS10Probe.describeProperties(0x04))
        assertEquals("write", RtS10Probe.describeProperties(0x08))
        assertEquals("notify", RtS10Probe.describeProperties(0x10))
        assertEquals("indicate", RtS10Probe.describeProperties(0x20))
        assertEquals("read, write, write-no-response, notify, indicate", RtS10Probe.describeProperties(0x3E))
        assertEquals("none", RtS10Probe.describeProperties(0))
        // Broadcast (0x01) and other bits are not reported.
        assertEquals("read", RtS10Probe.describeProperties(0x03))
    }

    @Test fun reportListsUuidsAndHandshakeState() {
        val base = RtS10Probe.Report("RT-S10", "AA:BB:CC:DD:EE:FF", listOf(radtel, other))
        val text = base.report()
        assertTrue(text.contains("Device: RT-S10"))
        assertTrue(text.contains("Address: AA:BB:CC:DD:EE:FF"))
        assertTrue(text.contains("Service ${RtS10Probe.RADTEL_SERVICE}"))
        assertTrue(text.contains("Characteristic ${RtS10Probe.RADTEL_SERIAL}: read, write-no-response, notify"))
        assertTrue(text.contains("00002a29-0000-1000-8000-00805f9b34fb: read"))
        assertTrue(text.contains("Radtel serial ffe1: present"))
        assertTrue(text.endsWith("Handshake: not tried"))
        assertEquals(text, base.report())

        assertTrue(base.copy(handshake = RtS10Probe.Handshake.Ok("RT-950 Pro")).report().endsWith("Handshake: ok, model RT-950 Pro"))
        assertTrue(base.copy(handshake = RtS10Probe.Handshake.Failed("timeout")).report().endsWith("Handshake: failed: timeout"))
        val empty = RtS10Probe.Report("", "11:22:33:44:55:66", emptyList()).report()
        assertTrue(empty.contains("Device: (no name)"))
        assertTrue(empty.contains("Radtel serial ffe1: absent"))
    }
}
