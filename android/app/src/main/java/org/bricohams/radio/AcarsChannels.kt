package org.bricohams.radio

import java.util.ArrayDeque
import org.bricohams.digital.AcarsCodec
import org.bricohams.digital.AcarsDemodulator
import org.bricohams.digital.CodecException
import org.bricohams.digital.DecodeRequest
import org.bricohams.digital.PcmAudio
import org.bricohams.digital.WorkBudget

/*
 * LEGAL / SAFETY: ACARS is RECEIVE-ONLY here. Transmitting on aeronautical frequencies (118-137 MHz) is illegal for
 * amateur stations. Nothing in this file, or in the ACARS part of the CAT screen, may key PTT or send encoder audio to a
 * radio; the encoder is only used to write a test WAV file for loopback testing.
 */

enum class AcarsRegion(val labelRes: Int) {
    EUROPE(R.string.acars_region_europe),
    WORLDWIDE(R.string.acars_region_worldwide),
    USA(R.string.acars_region_usa),
    VDL(R.string.acars_region_vdl)
}

data class AcarsChannel(val hz: Long, val region: AcarsRegion) {
    /** VDL2 (D8PSK) is not plain old ACARS and cannot be decoded here. */
    val decodable: Boolean get() = region != AcarsRegion.VDL
}

object AcarsChannels {
    val ALL: List<AcarsChannel> = listOf(
        AcarsChannel(131_550_000L, AcarsRegion.WORLDWIDE),
        AcarsChannel(131_525_000L, AcarsRegion.EUROPE),
        AcarsChannel(131_725_000L, AcarsRegion.EUROPE),
        AcarsChannel(131_825_000L, AcarsRegion.EUROPE),
        AcarsChannel(130_025_000L, AcarsRegion.USA),
        AcarsChannel(130_425_000L, AcarsRegion.USA),
        AcarsChannel(130_450_000L, AcarsRegion.USA),
        AcarsChannel(131_125_000L, AcarsRegion.USA),
        AcarsChannel(129_125_000L, AcarsRegion.USA),
        AcarsChannel(136_900_000L, AcarsRegion.VDL),
        AcarsChannel(136_750_000L, AcarsRegion.VDL),
        AcarsChannel(136_800_000L, AcarsRegion.VDL),
        AcarsChannel(136_850_000L, AcarsRegion.VDL),
        AcarsChannel(136_975_000L, AcarsRegion.VDL)
    )

    const val AIRBAND_MIN_HZ = 118_000_000L
    const val AIRBAND_MAX_HZ = 137_000_000L

    /** Tunes VFO A to the channel in AM. Receive only: this never touches [Rig.ptt]. */
    fun tune(rig: Rig, channel: AcarsChannel) {
        requireUi(rig.model.airbandRx) { UiText(R.string.err_acars_no_airband) }
        requireUi(channel.hz in AIRBAND_MIN_HZ..AIRBAND_MAX_HZ) { UiText(R.string.err_acars_band, mhzText(channel.hz)) }
        checkRange(rig.model, channel.hz)
        rig.setFrequency(Vfo.A, channel.hz)
        rig.setMode(RigMode.AM)
    }
}

data class AcarsEntry(
    val timeMillis: Long, val hz: Long, val registration: String, val label: String,
    val flight: String, val text: String, val crcOk: Boolean
)

/** Newest-last log bounded to [MAX] entries. */
class AcarsLog {
    companion object { const val MAX = 500 }
    private val entries = ArrayDeque<AcarsEntry>()
    fun add(entry: AcarsEntry) {
        entries.addLast(entry)
        while (entries.size > MAX) entries.removeFirst()
    }
    fun snapshot(): List<AcarsEntry> = entries.toList()
    val size: Int get() = entries.size
}

/**
 * Rolling decoder: keeps the last [WINDOW_SECONDS] of audio, decodes every [STEP_SECONDS] of new audio and reports each
 * burst once (bursts are identified by their absolute position in the stream).
 */
class AcarsRolling(
    private val sampleRate: Int,
    private val frequencyHz: Long,
    private val clock: () -> Long = System::currentTimeMillis
) {
    companion object {
        const val WINDOW_SECONDS = 6
        const val STEP_SECONDS = 1
    }
    private val codec = AcarsCodec()
    private val window = FloatArray(sampleRate * WINDOW_SECONDS)
    private var filled = 0
    private var total = 0L
    private var sinceDecode = 0
    private val seen = ArrayDeque<Long>()

    /** Appends audio and returns the entries decoded since the last call. */
    fun feed(samples: FloatArray, count: Int, budget: WorkBudget): List<AcarsEntry> {
        var offset = 0
        val out = ArrayList<AcarsEntry>()
        while (offset < count) {
            val chunk = minOf(count - offset, sampleRate * STEP_SECONDS - sinceDecode)
            append(samples, offset, chunk)
            offset += chunk
            sinceDecode += chunk
            if (sinceDecode >= sampleRate * STEP_SECONDS) {
                sinceDecode = 0
                out.addAll(decodeWindow(budget))
            }
        }
        return out
    }

    private fun append(samples: FloatArray, from: Int, count: Int) {
        if (count >= window.size) {
            System.arraycopy(samples, from + count - window.size, window, 0, window.size)
            filled = window.size
        } else {
            val keep = minOf(filled, window.size - count)
            System.arraycopy(window, filled - keep, window, 0, keep)
            System.arraycopy(samples, from, window, keep, count)
            filled = keep + count
        }
        total += count
    }

    private fun decodeWindow(budget: WorkBudget): List<AcarsEntry> {
        if (filled < sampleRate) return emptyList()
        val audio = PcmAudio(sampleRate, window.copyOf(filled))
        val request = DecodeRequest(clock(), 300.0, 3000.0, 64, 1, budget)
        val results = try {
            codec.decodeFrames(audio, request, true)
        } catch (error: CodecException) {
            if (error.reason == CodecException.Reason.CANCELLED || error.reason == CodecException.Reason.BUDGET_EXCEEDED) throw error
            return emptyList()
        }
        val windowStart = total - filled
        while (seen.isNotEmpty() && seen.peekFirst() < windowStart) seen.removeFirst()
        val out = ArrayList<AcarsEntry>()
        val tolerance = sampleRate / 4
        for (result in results) {
            val absolute = windowStart + result.startSample.toLong() * sampleRate / AcarsCodec.SAMPLE_RATE
            if (seen.any { Math.abs(it - absolute) < tolerance }) continue
            seen.addLast(absolute)
            out.add(entry(result))
        }
        return out
    }

    private fun entry(result: AcarsDemodulator.Result): AcarsEntry {
        val frame = result.frame
        return AcarsEntry(clock(), frequencyHz, frame.registration(), frame.label,
            if (frame.isDownlink) frame.flightId() else "", frame.text, result.crcOk)
    }
}
