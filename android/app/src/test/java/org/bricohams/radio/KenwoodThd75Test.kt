package org.bricohams.radio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class KenwoodThd75Test {
    private fun sent(transport: ScriptedRadio) = transport.writes.map { String(it, Charsets.US_ASCII) }
    private fun radio(answer: (String) -> String): Pair<Th75Rig, ScriptedRadio> {
        val transport = ScriptedRadio { ascii(answer(String(it, Charsets.US_ASCII))) }
        return Th75Rig(transport) to transport
    }

    @Test fun identifyChecksTheModel() {
        val (rig, transport) = radio { "ID TH-D75\r" }
        assertEquals("TH-D75", rig.identify())
        assertEquals(listOf("ID\r"), sent(transport))
        assertThrows(LocalizedArgumentException::class.java) { radio { "ID TH-D74\r" }.first.identify() }
    }

    @Test fun frequencyIsParsed() {
        val (rig, transport) = radio { "FQ 0,0145500000\r" }
        assertEquals(145_500_000L, rig.frequency(Vfo.A))
        assertEquals(listOf("FQ 0\r"), sent(transport))
    }

    @Test fun setFrequencyLeavesMemoryModeThenReadsBack() {
        var vfoMode = 1
        var hz = 0L
        val (rig, transport) = radio {
            when {
                it == "VM 1\r" -> "VM 1,$vfoMode\r"
                it == "VM 1,0\r" -> { vfoMode = 0; "" }
                it.startsWith("FQ 1,") -> { hz = it.substring(5, 15).toLong(); "" }
                it == "FQ 1\r" -> "FQ 1,%010d\r".format(hz)
                else -> "?\r"
            }
        }
        rig.setFrequency(Vfo.B, 131_725_000)
        assertEquals(listOf("VM 1\r", "VM 1,0\r", "FQ 1,0131725000\r", "FQ 1\r"), sent(transport))
    }

    @Test fun readBackMismatchIsNotConfirmed() {
        val (rig, _) = radio { if (it == "VM 1\r") "VM 1,0\r" else if (it == "FQ 1\r") "FQ 1,0131700000\r" else "" }
        assertThrows(LocalizedStateException::class.java) { rig.setFrequency(Vfo.B, 131_725_000) }
    }

    @Test fun bandAOnlyTunesTheAmateurBands() {
        val (rig, transport) = radio { "" }
        val error = assertThrows(LocalizedArgumentException::class.java) { rig.setFrequency(Vfo.A, 131_725_000) }
        assertEquals(R.string.err_rig_range, error.text.id)
        assertTrue(transport.writes.isEmpty())
    }

    @Test fun modesAreMappedPerBand() {
        val (rig, transport) = radio { if (it == "MD 1\r") "MD 1,2\r" else "" }
        rig.setMode(Vfo.B, RigMode.AM)
        assertEquals(listOf("MD 1,2\r", "MD 1\r"), sent(transport))
        assertThrows(LocalizedUnsupportedException::class.java) { rig.setMode(Vfo.A, RigMode.AM) }
    }

    @Test fun drModeReadsAsDv() {
        val (rig, _) = radio { if (it == "BC\r") "BC 0\r" else if (it == "FQ 0\r") "FQ 0,0145500000\r" else "MD 0,7\r" }
        assertEquals(RigStatus(145_500_000L, RigMode.DV), rig.status())
    }

    @Test fun rejectionsRaiseRigRejected() {
        for (reply in listOf("?\r", "N\r")) {
            val error = assertThrows(LocalizedIOException::class.java) { radio { reply }.first.frequency(Vfo.A) }
            assertEquals(R.string.err_rig_rejected, error.text.id)
        }
    }

    @Test fun pttKeysAndUnkeysTheActiveBand() {
        val (rig, transport) = radio { if (it == "TX\r") "TX\r" else "RX\r" }
        rig.ptt(true)
        rig.ptt(false)
        assertEquals(listOf("TX\r", "RX\r"), sent(transport))
    }

    @Test fun selectTxVfoSetsTheControlBandAndConfirms() {
        val (rig, transport) = radio { if (it == "BC\r") "BC 0\r" else "" }
        rig.selectTxVfo(Vfo.A)
        assertEquals(listOf("BC 0\r", "BC\r"), sent(transport))
        val (stuck, _) = radio { if (it == "BC\r") "BC 1\r" else "" }
        assertThrows(LocalizedStateException::class.java) { stuck.selectTxVfo(Vfo.A) }
    }

    @Test fun tunabilityIsCheckedPerVfo() {
        val rig = Th75Rig(ScriptedRadio())
        rig.checkTunable(Vfo.A, 145_850_000)
        rig.checkTunable(Vfo.A, 436_795_000)
        rig.checkTunable(Vfo.A, 137_100_000)
        rig.checkTunable(Vfo.B, 100_000_000)
        val error = assertThrows(LocalizedArgumentException::class.java) { rig.checkTunable(Vfo.A, 100_000_000) }
        assertEquals(R.string.err_rig_range, error.text.id)
    }

    @Test fun memoriesAndSplitAreUnsupported() {
        val rig = Th75Rig(ScriptedRadio())
        assertThrows(LocalizedUnsupportedException::class.java) { rig.memories(1..2) }
        assertThrows(LocalizedUnsupportedException::class.java) { rig.writeMemory(RigMemory(1, 145_500_000L, RigMode.FM, "")) }
        assertThrows(LocalizedUnsupportedException::class.java) { rig.setSplit(true) }
    }
}
