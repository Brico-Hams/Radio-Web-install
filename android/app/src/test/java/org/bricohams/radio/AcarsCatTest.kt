package org.bricohams.radio

import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import org.bricohams.digital.AcarsCodec
import org.bricohams.digital.WorkBudget
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.util.ReflectionHelpers
import java.util.concurrent.ExecutorService
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class AcarsCatTest {
    private class FakeRig(override val model: RigModel) : Rig {
        override val supportsVfoB = true
        override val silentVfoB = false
        override val supportsSplit = true
        override val supportsMemories = false
        override val supportsMemoryWrite = false
        val calls = ArrayList<String>()
        @Volatile var pttCalls = 0
        override fun writeMemory(memory: RigMemory) = unsupported("memory write")
        override fun identify() = "fake"
        override fun status() = RigStatus(0, null)
        override fun frequency(vfo: Vfo) = 0L
        override fun setFrequency(vfo: Vfo, hz: Long) { calls.add("${vfo.name}:$hz") }
        override fun setMode(mode: RigMode) { calls.add("mode:${mode.name}") }
        override fun ptt(on: Boolean) { pttCalls++ }
        override fun setSplit(on: Boolean) { calls.add("split:$on") }
        override fun memories(channels: IntRange, keepGoing: () -> Boolean) = emptyList<RigMemory>()
    }

    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()
    private fun text(activity: RigActivity) = views(activity.window.decorView).filterIsInstance<TextView>().joinToString("\n") { it.text }
    private fun click(activity: RigActivity, label: Int) {
        val text = activity.getString(label)
        assertTrue(views(activity.window.decorView).filterIsInstance<Button>().single { it.text == text }.performClick())
        ReflectionHelpers.getField<ExecutorService>(activity, "worker").submit {}.get(5, TimeUnit.SECONDS)
        ReflectionHelpers.getField<ExecutorService>(activity, "audioWorker").submit {}.get(5, TimeUnit.SECONDS)
        shadowOf(Looper.getMainLooper()).idle()
    }
    private fun withRig(model: RigModel, block: (RigActivity, FakeRig) -> Unit) {
        val controller = Robolectric.buildActivity(RigActivity::class.java).setup()
        try {
            val activity = controller.get()
            val rig = FakeRig(model)
            ReflectionHelpers.setField(activity, "rig", rig)
            block(activity, rig)
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun channelListMatchesTheSpec() {
        assertEquals(listOf(131_550_000L, 131_525_000L, 131_725_000L, 131_825_000L, 130_025_000L, 130_425_000L, 130_450_000L,
            131_125_000L, 129_125_000L, 136_900_000L, 136_750_000L, 136_800_000L, 136_850_000L, 136_975_000L),
            AcarsChannels.ALL.map { it.hz })
        assertTrue(AcarsChannels.ALL.filter { it.region == AcarsRegion.VDL }.all { !it.decodable && it.hz >= 136_000_000L })
        assertTrue(AcarsChannels.ALL.filter { it.region != AcarsRegion.VDL }.all { it.decodable })
    }

    @Test fun tuneUsesVfoAAndAm() {
        val rig = FakeRig(RigModel.FTX1)
        AcarsChannels.tune(rig, AcarsChannels.ALL[1])
        assertEquals(listOf("A:131525000", "mode:AM"), rig.calls)
        assertEquals(0, rig.pttCalls)
    }

    @Test fun rigsWithoutAirbandAreRejected() {
        for (model in RigModel.values().filter { !it.airbandRx }) {
            val rig = FakeRig(model)
            val error = assertThrows(LocalizedArgumentException::class.java) { AcarsChannels.tune(rig, AcarsChannels.ALL[0]) }
            assertEquals(R.string.err_acars_no_airband, error.text.id)
            assertTrue(rig.calls.isEmpty())
            assertEquals(0, rig.pttCalls)
        }
        assertTrue(RigModel.FTX1.airbandRx)
        assertFalse(RigModel.FT817.airbandRx)
    }

    @Test fun tuneButtonTunesAmAndNeverKeysPtt() = withRig(RigModel.FTX1) { activity, rig ->
        click(activity, R.string.acars_tune)
        assertEquals(listOf("A:131550000", "mode:AM"), rig.calls.filter { it.startsWith("A:") || it.startsWith("mode:") })
        assertTrue(text(activity).contains(activity.getString(R.string.acars_tuned, mhzText(131_550_000L))))
        assertEquals(0, rig.pttCalls)
    }

    @Test fun tuneButtonRejectsNonAirbandRig() = withRig(RigModel.FT817) { activity, rig ->
        click(activity, R.string.acars_tune)
        assertTrue(rig.calls.none { it.startsWith("A:") || it.startsWith("mode:") })
        assertTrue(text(activity).contains(activity.getString(R.string.err_acars_no_airband)))
        assertEquals(0, rig.pttCalls)
    }

    @Test fun acarsUiNeverCallsPtt() = withRig(RigModel.FTX1) { activity, rig ->
        click(activity, R.string.acars_tune)
        click(activity, R.string.acars_start)
        click(activity, R.string.acars_generate_wav)
        assertEquals(0, rig.pttCalls)
        assertFalse(rig.calls.any { it.startsWith("ptt") })
    }

    @Test fun rollingDecoderReportsEachBurstOnce() {
        val codec = AcarsCodec()
        val burst = codec.encode("2|N12345|H1|1|M01AABCDEF TEST", 0.0).samples
        val stream = FloatArray(12000) + burst + FloatArray(12000 * 4)
        val rolling = AcarsRolling(12000, 131_525_000L) { 5_000L }
        val found = ArrayList<AcarsEntry>()
        var at = 0
        while (at < stream.size) {
            val count = minOf(1000, stream.size - at)
            found += rolling.feed(stream.copyOfRange(at, at + count), count, WorkBudget { })
            at += count
        }
        assertEquals(1, found.size)
        val entry = found[0]
        assertEquals("N12345", entry.registration)
        assertEquals("H1", entry.label)
        assertEquals("ABCDEF", entry.flight)
        assertTrue(entry.crcOk)
        assertEquals(131_525_000L, entry.hz)
    }

    @Test fun logKeepsAtMost500Entries() {
        val log = AcarsLog()
        repeat(600) { log.add(AcarsEntry(it.toLong(), 131_525_000L, "N1", "H1", "", "T$it", true)) }
        assertEquals(500, log.size)
        assertEquals(100L, log.snapshot().first().timeMillis)
        assertEquals(599L, log.snapshot().last().timeMillis)
    }
}
