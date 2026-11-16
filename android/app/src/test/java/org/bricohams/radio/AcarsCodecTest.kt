package org.bricohams.radio

import org.bricohams.digital.AcarsCodec
import org.bricohams.digital.CodecException
import org.bricohams.digital.CodecRegistry
import org.bricohams.digital.DecodeRequest
import org.bricohams.digital.Mode
import org.bricohams.digital.PcmAudio
import org.bricohams.digital.WindowedSincResampler
import org.bricohams.digital.WorkBudget
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Random
import kotlin.math.sqrt

class AcarsCodecTest {
    private val codec = AcarsCodec()
    private val message = "2|N12345|H1|1|M01AABCDEF POSITION N4012 E00345"
    private fun request(vararg band: Double) =
        DecodeRequest(1_000L, band.getOrElse(0) { 300.0 }, band.getOrElse(1) { 3000.0 }, 8, 1, WorkBudget { })

    private fun padded(audio: PcmAudio, before: Int, after: Int) =
        PcmAudio(audio.sampleRate, FloatArray(before) + audio.samples + FloatArray(after))

    private fun noisy(audio: PcmAudio, snrDb: Double): PcmAudio {
        val power = audio.samples.sumOf { (it * it).toDouble() } / audio.samples.size
        val sigma = sqrt(power / Math.pow(10.0, snrDb / 10))
        val random = Random(1234)
        return PcmAudio(audio.sampleRate, FloatArray(audio.samples.size) {
            (audio.samples[it] + random.nextGaussian() * sigma).toFloat().coerceIn(-1f, 1f)
        })
    }

    private fun assertDecodes(audio: PcmAudio) {
        val decoded = codec.decode(audio, request())
        assertEquals(listOf(message), decoded.map { it.text })
        assertEquals(Mode.ACARS, decoded[0].mode)
        assertEquals(AcarsCodec.PROFILE_ID, decoded[0].profileId)
    }

    @Test fun profileIsRegistered() {
        assertEquals(12000, codec.profile().sampleRate)
        assertEquals(Mode.ACARS, CodecRegistry().require(AcarsCodec.PROFILE_ID).profile().mode)
    }

    @Test fun cleanRoundtripAt12k() {
        val audio = codec.encode(message, 0.0)
        assertEquals(12000, audio.sampleRate)
        assertDecodes(audio)
        assertDecodes(codec.encode(message, 1800.0))
    }

    @Test fun decodesWithSilenceBeforeAndAfter() {
        val audio = codec.encode(message, 0.0)
        assertDecodes(padded(audio, 2400, 2400))
        assertDecodes(padded(audio, 2403, 1777))
    }

    @Test fun decodesAtTenDbSnr() {
        assertDecodes(noisy(padded(codec.encode(message, 0.0), 2400, 2400), 10.0))
    }

    @Test fun decodesResampledFrom48k() {
        val audio = codec.encode(message, 0.0)
        val wide = WindowedSincResampler().convert(audio, 48000, WorkBudget { })
        assertEquals(48000, wide.sampleRate)
        assertDecodes(wide)
    }

    @Test fun decodesTwoBlocksInOneRecording() {
        val first = codec.encode(message, 0.0).samples
        val second = codec.encode("2|D-ABCD|Q0|2|SECOND", 0.0).samples
        val both = PcmAudio(12000, first + FloatArray(1200) + second)
        assertEquals(listOf(message, "2|D-ABCD|Q0|2|SECOND"), codec.decode(both, request()).map { it.text })
    }

    @Test fun silenceYieldsNothing() {
        assertTrue(codec.decode(PcmAudio(12000, FloatArray(24000)), request()).isEmpty())
    }

    @Test fun rejectsBadInput() {
        val empty = assertThrows(CodecException::class.java) { codec.decode(PcmAudio(12000, FloatArray(0)), request()) }
        assertEquals(CodecException.Reason.INVALID_AUDIO, empty.reason)
        val band = assertThrows(CodecException::class.java) { codec.decode(PcmAudio(12000, FloatArray(100)), request(5000.0, 5500.0)) }
        assertEquals(CodecException.Reason.INVALID_AUDIO, band.reason)
        for (bad in listOf("", "hello", "2|N12345|H1|1", "22|N12345|H1|1|X", "2||H1|1|X", "2|N12345|H|1|X", "2|N12345|H1|12|X", "2|TOOLONGREG|H1|1|X",
            "2|N12345|H1|1|" + "x".repeat(221))) {
            val error = assertThrows(CodecException::class.java) { codec.encode(bad, 0.0) }
            assertEquals(bad, CodecException.Reason.INVALID_MESSAGE, error.reason)
        }
        assertThrows(IllegalArgumentException::class.java) { codec.encode(message, 1000.0) }
        assertThrows(IllegalArgumentException::class.java) { codec.encode(message, Double.NaN) }
    }

    @Test fun cancellationPropagates() {
        val audio = codec.encode(message, 0.0)
        val cancelled = DecodeRequest(0, 300.0, 3000.0, 8, 1, WorkBudget {
            throw CodecException(CodecException.Reason.CANCELLED, "stop")
        })
        assertEquals(CodecException.Reason.CANCELLED,
            assertThrows(CodecException::class.java) { codec.decode(audio, cancelled) }.reason)
    }
}
