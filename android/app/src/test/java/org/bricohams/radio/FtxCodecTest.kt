package org.bricohams.radio

import java.io.File
import org.bricohams.digital.CodecException
import org.bricohams.digital.PcmAudio
import org.bricohams.digital.WindowedSincResampler
import org.bricohams.digital.fec.Ldpc174
import org.junit.Assert.*
import org.junit.Test

class FtxCodecTest {
    private val ldpc: Ldpc174 by lazy { File("src/main/assets/ftx-ldpc174.json").inputStream().use { Ldpc174.load(it) } }
    private val codecs by lazy { FtxCodecs(ldpc) }

    @Test fun ldpcTableLoadsFromAsset() {
        assertNotNull(ldpc)
    }

    @Test fun slotAudioRoundTripsInEveryMode() {
        for (mode in FtxMode.values()) {
            val slot = codecs.slotAudio(mode, "CQ EA1ABC IN80", 1500.0)
            assertEquals(mode.label, mode.slotSamples, slot.samples.size)
            val found = codecs.decodeAudio(mode, slot) { DeadlineBudget(System.nanoTime() + 60_000_000_000L) }
            assertTrue(mode.label, found.any { it.text == "CQ EA1ABC IN80" })
        }
    }

    @Test fun everyModeHasADecoder() {
        assertNotNull(codecs.decoder(FtxMode.FT4))
        assertNotNull(codecs.decoder(FtxMode.FT2))
        assertNotNull(codecs.decoder(FtxMode.FT8))
    }

    @Test fun slotLengths() {
        assertEquals("15", FtxMode.FT8.slotSecondsText)
        assertEquals("7.5", FtxMode.FT4.slotSecondsText)
        assertEquals("3.75", FtxMode.FT2.slotSecondsText)
        assertTrue(FtxMode.FT2.candidate)
    }

    @Test fun messageValidationAndCallsign() {
        assertNull(FtxMessages.problem("CQ EA1ABC IN80"))
        assertNotNull(FtxMessages.problem(""))
        assertNotNull(FtxMessages.problem("THIS MESSAGE IS FAR TOO LONG TO BE PACKED"))
        assertTrue(FtxMessages.mentions("CQ EA1ABC IN80", "EA1ABC"))
        assertFalse(FtxMessages.mentions("CQ EA1ABCD IN80", "EA1ABC"))
        assertEquals("CQ EA1ABC", FtxMessages.normalize("  cq   ea1abc "))
    }

    @Test fun toneMustKeepWholeBandInRange() {
        assertEquals(1500.0, FtxCodecs.parseTone(FtxMode.FT8, "1500"), 0.0)
        assertEquals(1500.5, FtxCodecs.parseTone(FtxMode.FT8, "1500,5"), 0.0)
        for (bad in listOf("", "abc", "50", "4990", "NaN")) {
            try {
                FtxCodecs.parseTone(FtxMode.FT8, bad)
                fail("accepted $bad")
            } catch (expected: IllegalArgumentException) {
            }
        }
    }

    @Test fun errorsNeverExposeRawText() {
        val reasons = CodecException.Reason.values().map { FtxCodecs.errorText(CodecException(it, "internal detail")).id }
        assertEquals(reasons.size, reasons.toSet().size)
        assertEquals(R.string.error_unknown, FtxCodecs.errorText(IllegalStateException("secret")).id)
        assertEquals(R.string.err_ftx_wav_format, FtxCodecs.errorText(java.io.IOException("secret")).id)
    }

    @Test fun streamResamplerMatchesOneShotConversion() {
        val rate = 48000
        val seconds = 4
        val input = FloatArray(rate * seconds) { (0.5 * Math.sin(2 * Math.PI * 1000.0 * it / rate)).toFloat() }
        val stream = StreamResampler(rate)
        val streamed = ArrayList<Float>()
        for (start in input.indices step 4800) {
            stream.push(input.copyOfRange(start, minOf(input.size, start + 4800))).forEach { streamed.add(it) }
        }
        val reference = WindowedSincResampler().convert(PcmAudio(rate, input), FtxCodecs.RATE) { }.samples
        assertTrue(streamed.size >= FtxCodecs.RATE * (seconds - 1))
        for (i in FtxCodecs.RATE until FtxCodecs.RATE * 2) assertEquals(reference[i].toDouble() * StreamResampler.GAIN, streamed[i].toDouble(), 0.01)
    }

    @Test fun slotCutterAlignsToUtcBoundaries() {
        val cutter = SlotCutter(FtxMode.FT8, 1_000_000_000_000L + 4_000)
        val slots = ArrayList<SlotCutter.Slot>()
        val chunk = FloatArray(FtxCodecs.RATE)
        repeat(40) { slots.addAll(cutter.push(chunk)) }
        assertTrue(slots.isNotEmpty())
        for (slot in slots) {
            assertEquals(0L, Math.floorMod(slot.startUtcMs, 15_000L))
            assertEquals(FtxMode.FT8.slotSamples, slot.samples.size)
        }
    }
}
