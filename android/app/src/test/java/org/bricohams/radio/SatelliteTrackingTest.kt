package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException

class SatelliteTrackingTest {
    private val target = SatelliteTarget(14580000, SatelliteLook(100000, 180.0, 30.0, 1000.0))
    private class Fixture {
        var utc = 100000L
        var elapsed = 10000L
        val commands = ArrayList<Long>()
        var beforeTune: (() -> Unit)? = null
        var delayed = false
        var badReply = false
        var expired = false
        val tracking = SatelliteTracking({
            if (expired) throw IllegalArgumentException("Fuera del pase")
            SatelliteTarget(14580000, SatelliteLook(it, 180.0, 30.0, 1000.0))
        }, { frequency, permit ->
            beforeTune?.invoke()
            check(permit()) { "Cancelled before SET" }
            commands.add(frequency)
            if (delayed) { utc += 2001; elapsed += 2001 }
            CatState(true, true, badReply, frequency)
        }, { utc }, { elapsed })
    }
    @Test fun renewsEvenIfFrequencyIsUnchangedAndStopsImmediatelyOnCancel() {
        val fixture = Fixture()
        assertEquals(target.frequency10Hz, fixture.tracking.step()?.frequency10Hz)
        fixture.utc += 1000; fixture.elapsed += 1000
        fixture.tracking.step()
        assertEquals(listOf(14580000L, 14580000L), fixture.commands)
        fixture.tracking.cancel()
        assertThrows(IllegalStateException::class.java) { fixture.tracking.step() }
        assertEquals(2, fixture.commands.size)
    }
    @Test fun cancelledBeforeSetNeverSendsLateCommand() {
        val fixture = Fixture()
        fixture.beforeTune = { fixture.tracking.cancel() }
        assertThrows(IllegalStateException::class.java) { fixture.tracking.step() }
        assertTrue(fixture.commands.isEmpty())
        assertFalse(fixture.tracking.active)
    }
    @Test fun rejectsClockJumpSuspensionRepeatedTimeAndExpiredPass() {
        for ((utcShift, elapsedShift) in listOf(0L to 1000L, -1L to 1000L, 2001L to 2001L, 1500L to 500L)) {
            val fixture = Fixture()
            fixture.tracking.step()
            fixture.utc += utcShift; fixture.elapsed += elapsedShift
            assertThrows(IllegalArgumentException::class.java) { fixture.tracking.step() }
            assertFalse(fixture.tracking.active)
            assertEquals(1, fixture.commands.size)
        }
        val fixture = Fixture()
        fixture.expired = true
        assertThrows(IllegalArgumentException::class.java) { fixture.tracking.step() }
        assertTrue(fixture.commands.isEmpty())
    }
    @Test fun delayedPendingAndUsbFailureCannotLookLikeAppliedDoppler() {
        for (fixture in listOf(Fixture().apply { delayed = true }, Fixture().apply { badReply = true })) {
            assertThrows(IllegalArgumentException::class.java) { fixture.tracking.step() }
            assertFalse(fixture.tracking.active)
        }
        val tracking = SatelliteTracking({ target }, { _, _ -> throw IOException("USB perdido") })
        assertThrows(IOException::class.java) { tracking.step() }
        assertFalse(tracking.active)
    }
}
