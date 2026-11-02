package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test

class QrpLabsTest {
    private fun sent(radio: ScriptedRadio) = radio.writes.map { String(it, Charsets.US_ASCII) }

    @Test fun encoders() {
        assertEquals("FA00007074000;", QrpLabsCat.setFrequency(Vfo.A, 7_074_000))
        assertEquals("FB00014074000;", QrpLabsCat.setFrequency(Vfo.B, 14_074_000))
        assertEquals("SP1;", QrpLabsCat.setSplit(true))
        assertEquals("TQ1;", QrpLabsCat.ptt(true))
        assertEquals("TQ0;", QrpLabsCat.ptt(false))
        assertEquals("MD2;", QrpLabsCat.setMode(RigModel.QMX, RigMode.USB))
        assertEquals("MD7;", QrpLabsCat.setMode(RigModel.QMX, RigMode.CW_R))
        assertEquals("MD2;", QrpLabsCat.setMode(RigModel.QDX, RigMode.USB))
        assertEquals("MD1;", QrpLabsCat.setMode(RigModel.QDX, RigMode.LSB))
        assertThrows(IllegalArgumentException::class.java) { QrpLabsCat.setMode(RigModel.QDX, RigMode.CW) }
        RigMode.values().forEach { mode ->
            val command = try { QrpLabsCat.setMode(RigModel.QMX, mode) } catch (_: IllegalArgumentException) { null }
            assertNotEquals("MD8;", command)
        }
    }
    @Test fun parsers() {
        assertEquals(RigMode.CW, QrpLabsCat.parseMode(RigModel.QMX, "MD3;"))
        assertNull(QrpLabsCat.parseMode(RigModel.QMX, "MD8;"))
        assertEquals(RigMode.USB, QrpLabsCat.parseMode(RigModel.QDX, "MD3;"))
        assertEquals(RigMode.LSB, QrpLabsCat.parseMode(RigModel.QDX, "MD1;"))
        assertEquals(7_016_000L, QrpLabsCat.parseFrequency("FA00007016000;"))
        assertEquals(7_016_000L, QrpLabsCat.parseFrequency("FB00007016000;"))
        assertThrows(IllegalArgumentException::class.java) { QrpLabsCat.parseFlag("TQ2;", "TQ") }
        assertTrue(QrpLabsCat.parseFlag("SP1;", "SP"))
        assertEquals("1_04_003QMX", QrpLabsCat.parseVersion("VN1_04_003QMX;"))
    }
    @Test fun frequencyRoundTrip() {
        var vfoA = ""
        val radio = ScriptedRadio { request ->
            when (String(request, Charsets.US_ASCII)) {
                "FA00007074000;" -> { vfoA = "FA00007074000;"; ByteArray(0) }
                "FA;" -> ascii(vfoA)
                "FB00014074000;" -> ByteArray(0)
                "FB;" -> ascii("FA00014074000;")
                else -> ByteArray(0)
            }
        }
        val rig = QrpLabsRig(radio, RigModel.QMX)
        rig.setFrequency(Vfo.A, 7_074_000)
        rig.setFrequency(Vfo.B, 14_074_000)
        assertTrue("FB00014074000;" in sent(radio))
        assertThrows(IllegalArgumentException::class.java) { rig.setFrequency(Vfo.A, 145_000_000) }
    }
    @Test fun qdxUsbIsConfirmedByCwCode() {
        val radio = ScriptedRadio { if (String(it, Charsets.US_ASCII) == "MD;") ascii("MD3;") else ByteArray(0) }
        QrpLabsRig(radio, RigModel.QDX).setMode(RigMode.USB)
        assertEquals(listOf("MD2;", "MD;"), sent(radio))
    }
    @Test fun pttIsConfirmedAndReleasedOnFailure() {
        val on = ScriptedRadio { if (String(it, Charsets.US_ASCII) == "TQ;") ascii("TQ1;") else ByteArray(0) }
        QrpLabsRig(on, RigModel.QMX).ptt(true)
        assertEquals(listOf("TQ1;", "TQ;"), sent(on))

        val stuck = ScriptedRadio { if (String(it, Charsets.US_ASCII) == "TQ;") ascii("TQ1;") else ByteArray(0) }
        assertThrows(IllegalStateException::class.java) { QrpLabsRig(stuck, RigModel.QMX).ptt(false) }
        assertEquals(listOf("TQ0;", "TQ;", "RX;"), sent(stuck))
    }
    @Test fun identify() {
        val qmx = ScriptedRadio {
            when (String(it, Charsets.US_ASCII)) {
                "ID;" -> ascii("ID020;")
                "VN;" -> ascii("VN1_04_003QMX;")
                else -> ByteArray(0)
            }
        }
        assertEquals("QRP Labs QMX 1_04_003QMX", QrpLabsRig(qmx, RigModel.QMX).identify())
        val old = ScriptedRadio {
            when (String(it, Charsets.US_ASCII)) {
                "ID;" -> ascii("ID020;")
                "VN;" -> ascii("?;")
                else -> ByteArray(0)
            }
        }
        assertEquals("QRP Labs QMX", QrpLabsRig(old, RigModel.QMX).identify())
        val qdx = ScriptedRadio { if (String(it, Charsets.US_ASCII) == "ID;") ascii("ID020;") else ByteArray(0) }
        assertEquals("QRP Labs QDX ID020", QrpLabsRig(qdx, RigModel.QDX).identify())
        assertEquals(listOf("ID;"), sent(qdx))
    }
    @Test fun noMemories() {
        assertThrows(UnsupportedOperationException::class.java) { QrpLabsRig(ScriptedRadio(), RigModel.QDX).memories(1..2) }
    }
}
