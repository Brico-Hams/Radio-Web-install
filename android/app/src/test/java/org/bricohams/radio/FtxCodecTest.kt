package org.bricohams.radio

import java.io.File
import org.bricohams.digital.CodecException
import org.bricohams.digital.PcmAudio
import org.bricohams.digital.WindowedSincResampler
import org.bricohams.digital.WorkBudget
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

    // One FT8 frame in seeded noise whose power in 2500 Hz is snrDb below the frame's own mean power; with a passband
    // the noise is a sum of sinusoids of constant density inside it and nothing outside, like an SSB receiver.
    private fun snrSlot(snrDb: Double, seed: Long, passband: DoubleArray?): FloatArray {
        val frame = codecs.frame(FtxMode.FT8, "CQ EA1ABC IN80", 1500.0).samples
        val power = frame.sumOf { it.toDouble() * it.toDouble() } / frame.size
        val density = power / Math.pow(10.0, snrDb / 10.0) / 2500.0 // per Hz, one-sided
        val random = java.util.Random(seed) // NOSONAR test-only: seeded Random for reproducible noise
        val samples = DoubleArray(FtxMode.FT8.slotSamples)
        if (passband == null) {
            val sigma = Math.sqrt(density * 6000.0)
            for (i in samples.indices) samples[i] = random.nextGaussian() * sigma
        } else {
            val cell = 2.5
            val count = ((passband[1] - passband[0]) / cell).toInt()
            val amplitude = Math.sqrt(2.0 * density * cell)
            for (k in 0 until count) {
                val step = 2 * Math.PI * (passband[0] + (k + random.nextDouble()) * cell) / FtxCodecs.RATE
                val phase = random.nextDouble() * 2 * Math.PI
                val cosStep = Math.cos(step)
                val sinStep = Math.sin(step)
                var re = Math.cos(phase)
                var im = Math.sin(phase)
                for (i in samples.indices) {
                    samples[i] += amplitude * re
                    val next = re * cosStep - im * sinStep
                    im = re * sinStep + im * cosStep
                    re = next
                }
            }
        }
        val out = FloatArray(samples.size) { samples[it].toFloat() }
        val lead = (FtxMode.FT8.leadMs * FtxCodecs.RATE / 1000).toInt()
        for (i in frame.indices) out[lead + i] += frame[i]
        // The decoder needs samples within [-1, 1]; a common scale leaves the SNR unchanged.
        val peak = out.maxOf { Math.abs(it) }
        if (peak > 0.95f) { val scale = 0.95f / peak; for (i in out.indices) out[i] *= scale }
        return out
    }

    private fun decodedSnr(audio: FloatArray): Double {
        val found = codecs.decodeSlot(FtxMode.FT8, audio, 0L, WorkBudget { })
        val hit = found.firstOrNull { it.text == "CQ EA1ABC IN80" }
        assertNotNull(found.toString(), hit)
        return hit!!.snrDb
    }

    @Test fun ft8SnrFollowsThe2500HzReferenceForWhiteNoise() {
        for ((snrDb, seed) in listOf(-15.0 to 11L, -5.0 to 12L, 5.0 to 13L)) {
            assertEquals("snr at $snrDb dB", snrDb, decodedSnr(snrSlot(snrDb, seed, null)), 3.0)
        }
    }

    @Test fun ft8SnrDoesNotInflateWhenThePassbandLeavesMostOfTheSearchBandEmpty() {
        for ((snrDb, seed) in listOf(-10.0 to 21L, 0.0 to 22L)) {
            assertEquals("snr at $snrDb dB", snrDb, decodedSnr(snrSlot(snrDb, seed, doubleArrayOf(300.0, 2700.0))), 3.0)
        }
    }
}
