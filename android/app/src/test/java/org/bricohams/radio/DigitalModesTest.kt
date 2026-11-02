package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test

class DigitalModesTest {
    private val noon = 12 * 3600_000L

    @Test fun slotAlignmentFt8() {
        val now = noon + 7_500
        assertEquals(noon, DigitalClock.slotStart(now, 15_000))
        assertEquals(7_500, DigitalClock.msToNextSlot(now, 15_000))
        assertTrue(DigitalClock.isEvenSlot(now, 15_000))
        assertFalse(DigitalClock.isEvenSlot(noon + 15_000, 15_000))
    }

    @Test fun ft4UsesSevenAndAHalfSeconds() {
        assertEquals(listOf(7_500L), DigitalMode.FT4.periodsMs)
        assertEquals(noon + 7_500, DigitalClock.slotStart(noon + 9_000, 7_500))
        assertEquals(6_000, DigitalClock.msToNextSlot(noon + 9_000, 7_500))
    }

    @Test fun wsprStartsOnEvenMinutes() {
        val period = DigitalMode.WSPR.defaultPeriodMs
        assertTrue(DigitalClock.isEvenSlot(noon, period))
        assertFalse(DigitalClock.isEvenSlot(noon + 120_000, period))
        assertEquals(noon, DigitalClock.slotStart(noon + 119_999, period))
        assertEquals(1, DigitalClock.msToNextSlot(noon + 119_999, period))
    }

    @Test fun forRigKeepsOnlyTheRadioRange() {
        val wspr = DigitalFrequencies.forRig(DigitalMode.WSPR, RigModel.TRUSDX)
        assertFalse(wspr.contains(136000L))
        assertTrue(DigitalFrequencies.forRig(DigitalMode.FT8, RigModel.TRUSDX).contains(14074000L))
        assertTrue(DigitalFrequencies.forRig(DigitalMode.FT8, RigModel.TRUSDX).none { it > 30_000_000L })
        assertTrue(DigitalFrequencies.forRig(DigitalMode.FT8, RigModel.IC705).contains(144174000L))
    }

    @Test fun dataModeMapping() {
        listOf(RigModel.FT817, RigModel.FT818, RigModel.FT857, RigModel.FT897, RigModel.FTX1)
            .forEach { assertEquals(RigMode.DATA_U, dataMode(it)) }
        assertEquals(RigMode.USB, dataMode(RigModel.IC705))
        assertEquals(RigMode.USB, dataMode(RigModel.TRUSDX))
    }

    @Test fun everyFrequencyHasABandAndEveryModeHasEntries() {
        DigitalMode.values().forEach { mode ->
            val list = DigitalFrequencies.table[mode]
            assertTrue(mode.name, !list.isNullOrEmpty())
            list!!.forEach { assertTrue("$mode $it", DigitalFrequencies.bandLabel(it).isNotEmpty()) }
            assertTrue(mode.periodsMs.contains(mode.defaultPeriodMs))
        }
        assertEquals("20m", DigitalFrequencies.bandLabel(14074000L))
        assertEquals("2200m", DigitalFrequencies.bandLabel(136000L))
    }
}
