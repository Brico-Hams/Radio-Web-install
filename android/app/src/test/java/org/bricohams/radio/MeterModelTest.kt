package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test

class MeterModelTest {
    @Test fun benchFramesNormalize() {
        // Raw frames read from a real FTX-1 in RX (PC2100: SPA-1 head).
        assertEquals(201, YaesuFtx1.parseMeter("RM8201000;", 8))
        assertEquals(13.66, MeterModel.vddVolts(201).value!!, 0.001)
        assertEquals("S0", MeterModel.sMeter(YaesuFtx1.parseSMeter("SM0000;", 0)).text)
        assertEquals(1.0, MeterModel.swr(0).value!!, 0.0)
        assertEquals(0.0, MeterModel.alcPercent(0).value!!, 0.0)
        val po = MeterModel.poWatts(0, 2)
        assertTrue(po.pending)
        assertEquals("raw", po.unit)
    }

    @Test fun scalesFollowTheSharedModel() {
        assertEquals(200.0, MeterModel.alcPercent(252).value!!, 0.0)
        assertEquals(30.0, MeterModel.compDb(255).value!!, 0.0)
        assertEquals(3.0, MeterModel.drainAmps(255).value!!, 0.0)
        assertTrue(MeterModel.swrFromRaw(255).isInfinite())
        assertEquals(1 + 0.333 * (Math.exp(0.0151 * 100) - 1), MeterModel.swrFromRaw(100), 1e-9)
        assertEquals(15.0, MeterModel.poWatts(255, 1).value!!, 0.0)
        assertEquals("S9", MeterModel.sMeter(128).text)
        assertEquals("S9+40 dB", MeterModel.sMeter(233).text)
        assertEquals(listOf("S1", "S3", "S5", "S7"), listOf(14, 42, 81, 103).map { MeterModel.sMeter(it).text })
    }

    @Test fun tuneIsRefusedAboveTenWatts() {
        assertNull(MeterModel.tunePowerRefusal(10))
        assertEquals("high", MeterModel.tunePowerRefusal(100))
        assertEquals("unknown", MeterModel.tunePowerRefusal(null))
    }
}
