package org.bricohams.radio

import java.io.IOException
import java.math.BigDecimal
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import org.bricohams.digital.CodecException
import org.bricohams.digital.DecodeRequest
import org.bricohams.digital.DecodedMessage
import org.bricohams.digital.PcmAudio
import org.bricohams.digital.WindowedSincResampler
import org.bricohams.digital.WorkBudget
import org.bricohams.digital.fec.Ldpc174
import org.bricohams.digital.ft2.LegacyFt2CandidateDecoder
import org.bricohams.digital.ft2.LegacyFt2CandidateEncoder
import org.bricohams.digital.ft4.Ft4Decoder
import org.bricohams.digital.ft4.Ft4Encoder
import org.bricohams.digital.ft8.Ft8Decoder
import org.bricohams.digital.ft8.Ft8Encoder
import org.bricohams.digital.ftx.FtxFrames
import org.bricohams.digital.ftx.Pack77

/** Host-testable core of the FT8 / FT4 / FT2 screen: no Android classes beyond resource ids. */
enum class FtxMode(val label: String, val slotMs: Long, val candidate: Boolean, val spacingHz: Double, val toneCount: Int) {
    FT8("FT8", 15_000, false, Ft8Encoder.TONE_SPACING_HZ, 8),
    FT4("FT4", 7_500, false, Ft4Encoder.TONE_SPACING_HZ, 4),
    FT2("FT2", 3_750, true, LegacyFt2CandidateEncoder.TONE_SPACING_HZ, 4);

    val slotSamples: Int get() = (slotMs * FtxCodecs.RATE / 1000).toInt()
    val slotSecondsText: String get() = BigDecimal(slotMs).divide(BigDecimal(1000)).stripTrailingZeros().toPlainString()
}

fun interface FtxDecoder {
    @Throws(CodecException::class)
    fun decode(audio: PcmAudio, request: DecodeRequest): List<DecodedMessage>
}

/** Stops a codec at its deadline or when the user cancels; the codecs poll it at least every 4096 samples. */
class DeadlineBudget(
    private val deadlineNanos: Long,
    private val cancelled: () -> Boolean = { false },
    private val nanoTime: () -> Long = System::nanoTime
) : WorkBudget {
    @Throws(CodecException::class)
    override fun checkpoint() {
        if (cancelled()) throw CodecException(CodecException.Reason.CANCELLED, "cancelled")
        if (nanoTime() - deadlineNanos > 0) throw CodecException(CodecException.Reason.BUDGET_EXCEEDED, "deadline")
    }
}

object FtxMessages {
    fun normalize(text: String): String = text.trim().uppercase(Locale.ROOT).replace(Regex("\\s+"), " ")

    /** Null when the message packs into 77 bits; otherwise the translated reason. */
    fun problem(message: String): UiText? {
        if (message.isEmpty()) return UiText(R.string.err_ftx_message_empty)
        return try {
            Pack77.pack(message)
            null
        } catch (error: CodecException) {
            FtxCodecs.reason(error)
        } catch (error: IllegalArgumentException) {
            UiText(R.string.err_ftx_message_invalid)
        }
    }

    fun mentions(message: String, call: String): Boolean = message.split(' ').any { it == call }
}

class FtxCodecs(ldpc: () -> Ldpc174) {
    constructor(ldpc: Ldpc174) : this({ ldpc })

    companion object {
        const val RATE = 12_000
        const val LEAD_MS = 500L
        private const val MIN_HZ = 100.0
        private const val MAX_HZ = 4500.0
        private const val RESAMPLE_GAIN = 0.8f

        fun reason(error: CodecException): UiText = UiText(when (error.reason) {
            CodecException.Reason.UNSUPPORTED_PROFILE -> R.string.err_ftx_unsupported
            CodecException.Reason.INVALID_MESSAGE -> R.string.err_ftx_message_invalid
            CodecException.Reason.INVALID_AUDIO -> R.string.err_ftx_audio_invalid
            CodecException.Reason.CANCELLED -> R.string.err_ftx_cancelled
            CodecException.Reason.BUDGET_EXCEEDED -> R.string.err_ftx_budget
            CodecException.Reason.SPEC_DATA_MISSING -> R.string.err_ftx_data_missing
        })

        /** Never exposes exception text: only resource-backed reasons reach the user. */
        fun errorText(error: Throwable): UiText = when (error) {
            is LocalizedError -> error.text
            is CodecException -> reason(error)
            is IOException -> UiText(R.string.err_ftx_wav_format)
            is SecurityException -> UiText(R.string.err_ftx_file_access)
            is OutOfMemoryError -> UiText(R.string.err_ftx_memory)
            else -> UiText(R.string.error_unknown)
        }

        /** Tone-0 frequency in Hz; the whole occupied band must lie within 100..5000 Hz. */
        fun parseTone(mode: FtxMode, text: String): Double {
            val hz = text.trim().replace(',', '.').toDoubleOrNull()
            requireUi(hz != null && hz.isFinite()) { UiText(R.string.err_ftx_tone) }
            try {
                FtxFrames.checkBand(hz, mode.spacingHz, mode.toneCount)
            } catch (error: IllegalArgumentException) {
                throw LocalizedArgumentException(UiText(R.string.err_ftx_tone), error)
            }
            return hz
        }

        fun pcm16(audio: PcmAudio): ShortArray =
            ShortArray(audio.samples.size) { (audio.samples[it] * 32767f).roundToInt().coerceIn(-32768, 32767).toShort() }
    }

    private val tables: Ldpc174 by lazy {
        try {
            ldpc()
        } catch (error: IOException) {
            throw LocalizedIOException(UiText(R.string.err_ftx_data_missing), error)
        }
    }

    /**
     * Receive chain of a mode, or null while it has none. Adding FT4 / FT2 is one line each:
     * `FtxMode.FT4 -> FtxDecoder { audio, request -> Ft4Decoder(tables).decode(audio, request) }`.
     */
    fun decoder(mode: FtxMode): FtxDecoder? = when (mode) {
        FtxMode.FT8 -> FtxDecoder { audio, request -> Ft8Decoder(tables).decode(audio, request) }
        FtxMode.FT4 -> FtxDecoder { audio, request -> Ft4Decoder(tables).decode(audio, request) }
        FtxMode.FT2 -> FtxDecoder { audio, request -> LegacyFt2CandidateDecoder(tables).decode(audio, request) }
    }

    /** The bare transmit frame at 12000 Hz. */
    fun frame(mode: FtxMode, message: String, tone0Hz: Double): PcmAudio = when (mode) {
        FtxMode.FT8 -> Ft8Encoder(tables).encode(message, tone0Hz)
        FtxMode.FT4 -> Ft4Encoder(tables).encode(message, tone0Hz)
        FtxMode.FT2 -> LegacyFt2CandidateEncoder(tables).encode(message, tone0Hz)
    }

    /** A whole slot with the frame starting 0.5 s in, as a transmission would. */
    fun slotAudio(mode: FtxMode, message: String, tone0Hz: Double): PcmAudio {
        val frame = frame(mode, message, tone0Hz)
        val lead = (LEAD_MS * RATE / 1000).toInt()
        requireUi(lead + frame.samples.size <= mode.slotSamples) { UiText(R.string.err_ftx_tx_length) }
        val samples = FloatArray(mode.slotSamples)
        frame.samples.copyInto(samples, lead)
        return PcmAudio(RATE, samples)
    }

    /** Decodes exactly one slot of 12000 Hz audio. */
    fun decodeSlot(mode: FtxMode, samples: FloatArray, startUtcMs: Long, budget: WorkBudget): List<DecodedMessage> {
        val decoder = decoder(mode) ?: throw CodecException(CodecException.Reason.UNSUPPORTED_PROFILE, "no decoder")
        val request = DecodeRequest(startUtcMs, MIN_HZ, MAX_HZ, 40, 40, budget)
        return decoder.decode(PcmAudio(RATE, samples), request).sortedBy { it.audioHz }
    }

    /** Decodes a recording of any rate: resamples to 12000 Hz and decodes consecutive slot-sized windows. */
    fun decodeAudio(mode: FtxMode, audio: PcmAudio, budget: () -> WorkBudget): List<DecodedMessage> {
        var pcm = audio
        if (audio.sampleRate != RATE) {
            val scaled = PcmAudio(audio.sampleRate, FloatArray(audio.samples.size) { audio.samples[it] * RESAMPLE_GAIN })
            pcm = WindowedSincResampler().convert(scaled, RATE, budget())
        }
        val slot = mode.slotSamples
        val found = ArrayList<DecodedMessage>()
        var start = 0
        do {
            val window = FloatArray(slot)
            pcm.samples.copyInto(window, 0, start, min(pcm.samples.size, start + slot))
            found += decodeSlot(mode, window, 0L, budget())
            start += slot
        } while (pcm.samples.size - start >= slot / 2)
        return found
    }
}

private fun gcd(a: Int, b: Int): Int = if (b == 0) a else gcd(b, a % b)

/**
 * Block-wise 12000 Hz conversion of a live stream with the windowed-sinc resampler. Each block of one second is
 * converted with enough surrounding context that the result equals one long conversion, so the capture thread
 * never waits for it. The first block holds the first sample, as the one-shot resampler does.
 */
class StreamResampler(private val inputRate: Int, private val budget: WorkBudget = WorkBudget { }) {
    private val resampler = WindowedSincResampler()
    private val context: Int
    private val contextOut: Int
    private var buffer = FloatArray(0)
    private var length = 0
    private var base = 0L
    private var block = 0L

    init {
        require(inputRate in 8000..192000)
        val g = gcd(inputRate, FtxCodecs.RATE)
        val unit = inputRate / g
        val radius = ceil(48.0 * max(1.0, inputRate / FtxCodecs.RATE.toDouble())).toInt()
        context = (radius + unit) / unit * unit
        contextOut = context / unit * (FtxCodecs.RATE / g)
    }

    @Throws(CodecException::class)
    fun push(samples: FloatArray): FloatArray {
        if (inputRate == FtxCodecs.RATE) return samples.copyOf()
        if (length + samples.size > buffer.size) buffer = buffer.copyOf(max(length + samples.size, buffer.size * 2))
        samples.copyInto(buffer, length)
        length += samples.size
        val produced = ArrayList<FloatArray>()
        while (base + length >= (block + 1) * inputRate + context) {
            val from = block * inputRate - context
            val window = FloatArray(inputRate + 2 * context) { i ->
                buffer[(max(from + i, 0L) - base).toInt()] * GAIN
            }
            val converted = resampler.convert(PcmAudio(inputRate, window), FtxCodecs.RATE, budget)
            produced += converted.samples.copyOfRange(contextOut, contextOut + FtxCodecs.RATE)
            block++
            val drop = ((block * inputRate - context) - base).toInt()
            if (drop > 0) {
                buffer.copyInto(buffer, 0, drop, length)
                length -= drop
                base += drop
            }
        }
        val result = FloatArray(produced.size * FtxCodecs.RATE)
        produced.forEachIndexed { index, part -> part.copyInto(result, index * FtxCodecs.RATE) }
        return result
    }

    // Headroom so the sinc overshoot keeps samples inside the [-1, 1] PcmAudio contract.
    internal companion object { const val GAIN = 0.8f }
}

/** Cuts a continuous 12000 Hz stream into whole UTC-aligned slots. */
class SlotCutter(private val mode: FtxMode, firstSampleUtcMs: Long) {
    class Slot(val startUtcMs: Long, val samples: FloatArray)

    private var buffer = FloatArray(0)
    private var length = 0
    private var base = 0L
    private var nextUtc = -Math.floorDiv(-firstSampleUtcMs, mode.slotMs) * mode.slotMs
    private var nextStart = Math.round((nextUtc - firstSampleUtcMs) * FtxCodecs.RATE / 1000.0)

    fun push(samples: FloatArray): List<Slot> {
        if (length + samples.size > buffer.size) buffer = buffer.copyOf(max(length + samples.size, buffer.size * 2))
        samples.copyInto(buffer, length)
        length += samples.size
        val slots = ArrayList<Slot>()
        val size = mode.slotSamples
        while (base + length >= nextStart + size) {
            val from = (nextStart - base).toInt()
            slots += Slot(nextUtc, buffer.copyOfRange(from, from + size))
            nextStart += size
            nextUtc += mode.slotMs
        }
        val drop = (nextStart - base).toInt().coerceIn(0, length)
        if (drop > 0) {
            buffer.copyInto(buffer, 0, drop, length)
            length -= drop
            base += drop
        }
        return slots
    }
}
