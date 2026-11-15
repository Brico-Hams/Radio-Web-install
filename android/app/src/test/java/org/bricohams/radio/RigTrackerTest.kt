package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import kotlin.math.abs

class RigTrackerTest {
    private class FakeRig(
        override val model: RigModel = RigModel.FT857,
        override val supportsVfoB: Boolean = true,
        override val silentVfoB: Boolean = false,
        override val supportsSplit: Boolean = true
    ) : Rig {
        override val supportsMemories = false
        override val supportsMemoryWrite = false
        override fun writeMemory(memory: RigMemory) = unsupported("memory write")
        val calls = ArrayList<String>()
        override fun identify() = "fake"
        override fun status() = RigStatus(0, null)
        override fun frequency(vfo: Vfo) = 0L
        override fun setFrequency(vfo: Vfo, hz: Long) { calls.add("${vfo.name}:$hz") }
        override fun setMode(mode: RigMode) = Unit
        override fun ptt(on: Boolean) = Unit
        override fun setSplit(on: Boolean) { calls.add("split:$on") }
        override fun memories(channels: IntRange, keepGoing: () -> Boolean) = emptyList<RigMemory>()
    }
    private var now = 0L
    private var rate = 0.0
    private var elevation = 30.0
    private fun tracker(rig: Rig, uplink: Long? = 435_200_000, step: Long = 100) = RigTracker(
        rig, 145_800_000, uplink, { rate }, { SatelliteLook(it, 0.0, elevation, 1000.0) }, step, { now })

    @Test fun dopplerMath() {
        assertTrue(abs(Doppler.downlink(145_800_000, 7.0) - 145_796_596L) <= 1)
        assertTrue(Doppler.downlink(145_800_000, -7.0) > 145_800_000)
        assertTrue(Doppler.uplink(435_200_000, 7.0) > 435_200_000)
        assertEquals(145_800_000L, Doppler.downlink(145_800_000, 0.0))
        val sent = Doppler.uplink(435_200_000, 7.0)
        assertTrue(abs(sent * (1 - 7.0 / Doppler.C_KM_S) - 435_200_000) < 1.0)
    }
    @Test fun stepsAreSentOnlyBeyondTheThreshold() {
        val rig = FakeRig(silentVfoB = true)
        val tracker = tracker(rig, uplink = null)
        assertTrue(tracker.step().sentDownlink)
        rate = 0.1
        assertFalse(tracker.step().sentDownlink)
        rate = 0.3
        val step = tracker.step()
        assertTrue(step.sentDownlink && !step.sentUplink && step.uplinkHz == null)
        assertEquals(listOf("A:145800000", "A:${step.downlinkHz}"), rig.calls)
    }
    @Test fun splitFollowsStartAndStop() {
        val rig = FakeRig()
        val tracker = tracker(rig)
        tracker.start()
        assertEquals(listOf("split:true", "A:145800000", "B:435200000"), rig.calls)
        tracker.stop()
        assertEquals("split:false", rig.calls.last())
        val plain = FakeRig(supportsSplit = false)
        tracker(plain).apply { start(); stop() }
        assertTrue(plain.calls.none { it.startsWith("split") })
        val receiveOnly = FakeRig()
        tracker(receiveOnly, uplink = null).apply { start(); stop() }
        assertTrue(receiveOnly.calls.none { it.startsWith("split") })
    }
    @Test fun toggleRigsSendTheUplinkAtMostEveryFiveSeconds() {
        val rig = FakeRig()
        val tracker = tracker(rig)
        tracker.start()
        rate = 1.0
        now = 1000
        val early = tracker.step()
        assertTrue(early.sentDownlink && !early.sentUplink)
        now = 5000
        assertTrue(tracker.step().sentUplink)
        assertEquals(2, rig.calls.count { it.startsWith("B:") })
    }
    @Test fun silentRigsSendTheUplinkImmediately() {
        val rig = FakeRig(model = RigModel.IC705, silentVfoB = true)
        val tracker = tracker(rig)
        tracker.start()
        rate = 1.0
        now = 1000
        assertTrue(tracker.step().sentUplink)
        val noVfoB = FakeRig(supportsVfoB = false)
        assertFalse(tracker(noVfoB).step().sentUplink)
    }
    @Test fun toggleRigsNeverWriteVfoBWhileOurPttIsOn() {
        val rig = FakeRig()
        var ptt = false
        val tracker = RigTracker(rig, 436_888_000, 145_925_000, { rate }, { SatelliteLook(it, 0.0, 30.0, 1000.0) }, 100, { now }, { ptt })
        tracker.start()
        val before = rig.calls.size
        ptt = true
        rate = 3.0
        now = 10_000
        val held = tracker.step()
        assertTrue(held.heldForTx && !held.sentDownlink && !held.sentUplink)
        assertEquals(before, rig.calls.size)
        assertFalse(tracker.stop())
        assertEquals("split:true", rig.calls.filter { it.startsWith("split") }.last())
        ptt = false
        now = 20_000
        val resumed = tracker.step()
        assertTrue(!resumed.heldForTx && resumed.sentDownlink && resumed.sentUplink)
        assertTrue(tracker.stop())
        assertEquals("split:false", rig.calls.last())
    }
    @Test fun aRadioReportingTxHoldsEveryWriteAndUnknownStateFallsBackToOurPtt() {
        var tx = true
        val rig = object : Rig by FakeRig(model = RigModel.IC705, silentVfoB = true) {
            val written = ArrayList<String>()
            override fun setFrequency(vfo: Vfo, hz: Long) { written.add("${vfo.name}:$hz") }
            override fun setSplit(on: Boolean) { written.add("split:$on") }
            override val supportsTxStatus = true
            override fun isTransmitting() = tx
        }
        val tracker = tracker(rig)
        assertTrue(tracker.step().heldForTx)
        assertTrue(rig.written.isEmpty())
        tx = false
        assertTrue(tracker.step().sentUplink)
        val unknown = FakeRig(silentVfoB = true)
        assertFalse(tracker(unknown).step().heldForTx)
    }
    @Test fun satelliteExampleUplinkAndDownlinkAtSevenKmPerSecond() {
        for ((rr, downExpected, upExpected) in listOf(
            Triple(7.0, 436_888_000.0 * (1 - 7.0 / Doppler.C_KM_S), 145_925_000.0 / (1 - 7.0 / Doppler.C_KM_S)),
            Triple(-7.0, 436_888_000.0 * (1 + 7.0 / Doppler.C_KM_S), 145_925_000.0 / (1 + 7.0 / Doppler.C_KM_S)))) {
            val rig = FakeRig(model = RigModel.IC705, silentVfoB = true)
            rate = rr
            val tracker = RigTracker(rig, 436_888_000, 145_925_000, { rate }, { SatelliteLook(it, 0.0, 30.0, 1000.0) }, 100, { now })
            val step = tracker.start()
            assertTrue(abs(step.downlinkHz - downExpected) <= 1)
            assertTrue(abs(step.uplinkHz!! - upExpected) <= 1)
            assertEquals(listOf("split:true", "A:${step.downlinkHz}", "B:${step.uplinkHz}"), rig.calls)
            assertTrue((step.downlinkHz < 436_888_000) == (step.uplinkHz!! > 145_925_000))
            tracker.stop()
            assertEquals("split:false", rig.calls.last())
        }
    }
    @Test fun belowHorizonAndOutOfRangeAreRejected() {
        val rig = FakeRig()
        elevation = -1.0
        assertThrows(IllegalStateException::class.java) { tracker(rig).step() }
        assertTrue(rig.calls.isEmpty())
        elevation = 10.0
        assertThrows(IllegalArgumentException::class.java) { tracker(FakeRig(model = RigModel.TRUSDX)).step() }
    }
}
