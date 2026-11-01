package org.bricohams.radio

import java.io.IOException
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToLong

enum class RigMode { LSB, USB, CW, CW_R, AM, FM, FM_N, WFM, RTTY, RTTY_R, DATA_L, DATA_U, DATA_FM, DV }

enum class Vfo { A, B }

enum class RigModel(
    val label: String, val defaultBaud: Int, val stopBits: Int, val rangeHz: LongRange
) {
    FT817("Yaesu FT-817 / FT-817ND", 4800, 2, 100_000L..470_000_000L),
    FT818("Yaesu FT-818ND", 4800, 2, 100_000L..470_000_000L),
    FT857("Yaesu FT-857 / FT-857D", 4800, 2, 100_000L..470_000_000L),
    FT897("Yaesu FT-897 / FT-897D", 4800, 2, 100_000L..470_000_000L),
    IC705("Icom IC-705", 115200, 1, 30_000L..470_000_000L),
    // CAT-1 factory default is 2 stop bits (CAT Operation Reference Manual 2508-C, p.3); 1 also works when the menu is changed.
    FTX1("Yaesu FTX-1", 38400, 2, 30_000L..470_000_000L),
    TRUSDX("(tr)uSDX", 115200, 1, 3_000_000L..30_000_000L)
}

data class RigMemory(val channel: Int, val frequencyHz: Long, val mode: RigMode?, val name: String)
data class RigStatus(val frequencyHz: Long, val mode: RigMode?)

interface Rig {
    val model: RigModel
    val supportsVfoB: Boolean
    /** True when VFO B can be changed without leaving VFO A. */
    val silentVfoB: Boolean
    val supportsSplit: Boolean
    val supportsMemories: Boolean
    /** Short text shown to the user. */
    fun identify(): String
    /** Frequency and mode of the active VFO (VFO A for the satellite downlink). */
    fun status(): RigStatus
    fun frequency(vfo: Vfo): Long
    /** Sets and then reads back; throws LocalizedIOException(err_rig_unconfirmed) if the read-back differs. */
    fun setFrequency(vfo: Vfo, hz: Long)
    fun setMode(mode: RigMode)
    fun ptt(on: Boolean)
    fun setSplit(on: Boolean)
    /** Empty channels are skipped. */
    fun memories(channels: IntRange, keepGoing: () -> Boolean = { true }): List<RigMemory>
}

fun openRig(model: RigModel, transport: RadioBytes, civAddress: Int = 0xA4): Rig = when (model) {
    RigModel.FT817, RigModel.FT818, RigModel.FT857, RigModel.FT897 -> YaesuFiveByteRig(transport, model)
    RigModel.IC705 -> IcomCivRig(transport, civAddress)
    RigModel.FTX1 -> Ftx1Rig(transport)
    RigModel.TRUSDX -> TruSdxRig(transport)
}

internal fun mhzText(hz: Long): String = String.format(Locale.ROOT, "%.6f", hz / 1e6)

internal fun checkRange(model: RigModel, hz: Long) =
    requireUi(hz in model.rangeHz) { UiText(R.string.err_rig_range, mhzText(hz)) }

internal fun unsupported(feature: String): Nothing =
    throw LocalizedUnsupportedException(UiText(R.string.err_rig_unsupported, feature))

internal fun isRejected(error: LocalizedIOException) = error.text.id == R.string.err_rig_rejected

internal fun invalidReply(): Nothing = throw LocalizedArgumentException(UiText(R.string.err_rig_reply_invalid))

/** Text CAT (Yaesu FTX-1, Kenwood-style subsets): commands end in ';', a reply "?;" is a rejection. */
internal class AsciiLink(private val transport: RadioBytes, private val clock: () -> Long = { System.nanoTime() / 1_000_000 }) {
    fun send(command: String) {
        transport.discardPending()
        transport.write(command.toByteArray(Charsets.US_ASCII), WRITE_MS)
    }
    fun request(command: String, prefix: String): String {
        repeat(ATTEMPTS) {
            send(command)
            val deadline = clock() + ATTEMPT_MS
            while (true) {
                val reply = readReply(deadline) ?: break
                if (reply == "?;") throw LocalizedIOException(UiText(R.string.err_rig_rejected, command))
                if (reply.startsWith(prefix)) return reply
            }
        }
        throw LocalizedIOException(UiText(R.string.err_rig_timeout))
    }
    private fun readReply(deadline: Long): String? {
        val text = StringBuilder()
        while (true) {
            val left = deadline - clock()
            if (left <= 0) return null
            val byte = try {
                transport.read(1, left.toInt())[0].toInt() and 255
            } catch (_: IOException) {
                return null
            }
            text.append(byte.toChar())
            if (byte == ';'.code) return text.toString().trim()
            if (text.length > MAX_REPLY) invalidReply()
        }
    }
    companion object {
        const val WRITE_MS = 500
        const val ATTEMPT_MS = 500L
        const val ATTEMPTS = 2
        const val MAX_REPLY = 64
    }
}

object Doppler {
    const val C_KM_S = 299792.458
    /** What we hear; [rangeRateKmS] positive = receding. */
    fun downlink(nominalHz: Long, rangeRateKmS: Double): Long = (nominalHz * (1 - rangeRateKmS / C_KM_S)).roundToLong()
    /** Pre-compensated so that the satellite receives the nominal frequency. */
    fun uplink(nominalHz: Long, rangeRateKmS: Double): Long = (nominalHz / (1 - rangeRateKmS / C_KM_S)).roundToLong()
}

class RigTracker(
    private val rig: Rig,
    private val downlinkHz: Long,
    private val uplinkHz: Long?,
    private val rangeRate: (Long) -> Double,
    private val look: (Long) -> SatelliteLook,
    private val stepHz: Long,
    private val clock: () -> Long = System::currentTimeMillis
) {
    data class Step(val downlinkHz: Long, val uplinkHz: Long?, val look: SatelliteLook, val sentDownlink: Boolean, val sentUplink: Boolean)
    private var splitOn = false
    private var lastDownlink: Long? = null
    private var lastUplink: Long? = null
    private var lastUplinkAt: Long? = null

    fun start(): Step {
        if (uplinkHz != null && rig.supportsSplit) {
            rig.setSplit(true)
            splitOn = true
        }
        return step()
    }
    fun step(): Step {
        val now = clock()
        val position = look(now)
        checkUi(position.elevation >= 0) { UiText(R.string.err_rig_below_horizon) }
        val rate = rangeRate(now)
        val down = Doppler.downlink(downlinkHz, rate)
        val up = uplinkHz?.let { Doppler.uplink(it, rate) }
        checkRange(rig.model, down)
        if (up != null) checkRange(rig.model, up)
        val previousDown = lastDownlink
        val sentDown = previousDown == null || abs(down - previousDown) >= stepHz
        if (sentDown) {
            rig.setFrequency(Vfo.A, down)
            lastDownlink = down
        }
        var sentUp = false
        if (up != null && rig.supportsVfoB) {
            val previousUp = lastUplink
            val previousAt = lastUplinkAt
            val due = previousUp == null || abs(up - previousUp) >= stepHz
            val allowed = rig.silentVfoB || previousAt == null || now - previousAt >= TOGGLE_INTERVAL_MS
            if (due && allowed) {
                rig.setFrequency(Vfo.B, up)
                lastUplink = up
                lastUplinkAt = now
                sentUp = true
            }
        }
        return Step(down, up, position, sentDown, sentUp)
    }
    fun stop() {
        if (!splitOn) return
        splitOn = false
        rig.setSplit(false)
    }
    companion object {
        const val TOGGLE_INTERVAL_MS = 5000L
    }
}
