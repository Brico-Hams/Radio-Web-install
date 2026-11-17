package org.bricohams.radio

import java.io.IOException
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToLong

enum class RigMode { LSB, USB, CW, CW_R, AM, FM, FM_N, WFM, RTTY, RTTY_R, DATA_L, DATA_U, DATA_FM, DV }

enum class Vfo { A, B; fun other() = if (this == A) B else A }

enum class RigModel(
    val label: String, val defaultBaud: Int, val stopBits: Int, val rangeHz: LongRange,
    /** True when the model receives the 118-137 MHz AM airband (its tuning range covers it). */
    val airbandRx: Boolean = false,
    /** VFO that receives the airband when [airbandRx] is set. */
    val airbandVfo: Vfo = Vfo.A,
    /** VFO that receives the satellite downlink; the uplink is the other VFO (TH-D75: band A is the TX band, band B receives widely). */
    val satDownlinkVfo: Vfo = Vfo.A
) {
    FT817("Yaesu FT-817 / FT-817ND", 4800, 2, 100_000L..470_000_000L),
    FT818("Yaesu FT-818ND", 4800, 2, 100_000L..470_000_000L),
    FT857("Yaesu FT-857 / FT-857D", 4800, 2, 100_000L..470_000_000L),
    FT897("Yaesu FT-897 / FT-897D", 4800, 2, 100_000L..470_000_000L),
    IC705("Icom IC-705", 115200, 1, 30_000L..470_000_000L, airbandRx = true),
    // CAT-1 default is 38400 8N1 on the units in the field (manual 2508-C lists 2 stop bits; the radio accepts 1 from the host).
    FTX1("Yaesu FTX-1", 38400, 1, 30_000L..470_000_000L, airbandRx = true),
    // Measured on a real unit: 115200 8N1 works, 38400 returns garbage; RigActivity retries 38400 as a fallback probe only.
    TRUSDX("(tr)uSDX", 115200, 1, 3_000_000L..30_000_000L),
    // USB CDC virtual COM port (USB 0483:A34C); measured CAT at 38400 with DTR/RTS low. QDX ignores the baud rate (manual 1.06).
    QMX("QRP Labs QMX / QMX+", 38400, 1, 1_800_000L..54_000_000L),
    QDX("QRP Labs QDX / QDX-M", 9600, 1, 3_500_000L..30_000_000L),
    // USB CDC virtual COM port (baud ignored). Band A only covers the 144/220/430 MHz amateur bands (FM/DV); band B receives
    // 0.1-524 MHz including the AM airband.
    THD75("Kenwood TH-D75", 9600, 1, 100_000L..524_000_000L, airbandRx = true, airbandVfo = Vfo.B, satDownlinkVfo = Vfo.B)
}

data class RigMemory(val channel: Int, val frequencyHz: Long, val mode: RigMode?, val name: String, val txHz: Long? = null)
data class RigStatus(val frequencyHz: Long, val mode: RigMode?)

interface Rig {
    val model: RigModel
    val supportsVfoB: Boolean
    /** True when VFO B can be changed without leaving VFO A. */
    val silentVfoB: Boolean
    val supportsSplit: Boolean
    val supportsMemories: Boolean
    val supportsMemoryWrite: Boolean
    /** Short text shown to the user. */
    fun identify(): String
    /** Stable firmware / model identification when the radio can report it (QMX: VN;, FTX-1: ID;); null when it cannot. */
    fun firmwareVersion(): String? = null
    /** Frequency and mode of the active VFO (VFO A for the satellite downlink). */
    fun status(): RigStatus
    fun frequency(vfo: Vfo): Long
    /** Sets and then reads back; throws LocalizedIOException(err_rig_unconfirmed) if the read-back differs. */
    fun setFrequency(vfo: Vfo, hz: Long)
    fun setMode(mode: RigMode)
    /** Mode of a given VFO; rigs that cannot address VFO B by mode only support VFO A. */
    fun setMode(vfo: Vfo, mode: RigMode) { if (vfo == Vfo.A) setMode(mode) else unsupported("mode on VFO B") }
    /** Throws when [hz] cannot be tuned on [vfo]; by default every VFO accepts the model's whole range. */
    fun checkTunable(vfo: Vfo, hz: Long) = checkRange(model, hz)
    /** Selects the VFO that PTT keys, for rigs without split (TH-D75 control band); no-op elsewhere. */
    fun selectTxVfo(vfo: Vfo) {}
    fun ptt(on: Boolean)
    fun setSplit(on: Boolean)
    /** Optional extras; every default says "not supported" so rigs that do not implement them are unaffected. */
    val supportsMeter: Boolean get() = false
    /** S-meter level 0..255 (0 = S0, 255 = full scale of the radio's own scale). */
    fun signalLevel(): Int = unsupported("S-meter")
    val supportsRfPower: Boolean get() = false
    /** Transmit power setting 0..255 (0 = minimum, 255 = maximum). */
    fun rfPower(): Int = unsupported("RF power")
    fun setRfPower(level: Int): Unit = unsupported("RF power")
    val supportsTxStatus: Boolean get() = false
    /** True while the radio is transmitting; read only, never keys the radio. */
    fun isTransmitting(): Boolean = unsupported("TX status")
    val supportsDataMode: Boolean get() = false
    fun dataModeOn(): Boolean = unsupported("data mode")
    fun setDataMode(on: Boolean): Unit = unsupported("data mode")
    /** Mode of either VFO without selecting it. */
    val supportsVfoMode: Boolean get() = false
    fun vfoMode(vfo: Vfo): RigMode? = unsupported("VFO mode")
    fun setVfoMode(vfo: Vfo, mode: RigMode): Unit = unsupported("VFO mode")
    /** Empty channels are skipped. */
    fun memories(channels: IntRange, keepGoing: () -> Boolean = { true }): List<RigMemory>
        /** Replaces the radio's channel and reads it back; throws LocalizedStateException(err_rig_unconfirmed) on a mismatch. */
        fun writeMemory(memory: RigMemory)
    }

fun openRig(model: RigModel, transport: RadioBytes, civAddress: Int = 0xA4): Rig = when (model) {
    RigModel.FT817, RigModel.FT818, RigModel.FT857, RigModel.FT897 -> YaesuFiveByteRig(transport, model)
    RigModel.IC705 -> IcomCivRig(transport, civAddress)
    RigModel.FTX1 -> Ftx1Rig(transport)
    RigModel.TRUSDX -> TruSdxRig(transport)
    RigModel.QMX, RigModel.QDX -> QrpLabsRig(transport, model)
    RigModel.THD75 -> Th75Rig(transport)
}

/**
 * Serial parameters for a rig: DTR and RTS are driven low exactly once at open and never toggled afterwards (a toggle resets the
 * (tr)uSDX and RTS can key the radio). The FTX-1 always uses the CP2105 Enhanced port, whatever port the list offered.
 */
internal fun rigSerialSettings(model: RigModel, baud: Int, requestedPort: Int, enhancedPort: Int? = null, dtr: Boolean = false): SerialSettings =
    SerialSettings(baud, model.stopBits, if (model == RigModel.FTX1 && enhancedPort != null) enhancedPort else requestedPort,
        dtr = dtr, rts = false)

internal fun mhzText(hz: Long): String = String.format(Locale.ROOT, "%.6f", hz / 1e6)

internal fun checkRange(model: RigModel, hz: Long) =
    requireUi(hz in model.rangeHz) { UiText(R.string.err_rig_range, mhzText(hz)) }

internal fun unsupported(feature: String): Nothing =
    throw LocalizedUnsupportedException(UiText(R.string.err_rig_unsupported, feature))

internal fun isRejected(error: LocalizedIOException) = error.text.id == R.string.err_rig_rejected

internal fun invalidReply(): Nothing = throw LocalizedArgumentException(UiText(R.string.err_rig_reply_invalid))

/**
 * Text CAT (Yaesu FTX-1, Kenwood-style subsets): replies end in [terminator] (';', or CR for the Kenwood TH-D75) and a reply in
 * [rejections] ("?;" by default) is a rejection. Every exchange is
 * serialised (one command in flight, a minimum gap between commands) so threads sharing a rig cannot interleave a SET with
 * somebody else's read; use [transaction] to keep a SET and its read-back together.
 */
internal class AsciiLink(
    private val transport: RadioBytes,
    private val clock: () -> Long = { System.nanoTime() / 1_000_000 },
    private val sleep: (Long) -> Unit = Thread::sleep,
    private val terminator: Char = ';',
    private val rejections: Set<String> = setOf("?;")
) {
    private var lastIo = Long.MIN_VALUE / 2
    @Synchronized fun <T> transaction(block: () -> T): T = block()
    @Synchronized fun send(command: String) {
        pace()
        transport.discardPending()
        transport.write(command.toByteArray(Charsets.US_ASCII), WRITE_MS)
        lastIo = clock()
    }
    @Synchronized fun request(command: String, prefix: String): String {
        repeat(ATTEMPTS) { attempt ->
            if (attempt > 0) sleep(RETRY_GAP_MS)
            send(command)
            val deadline = clock() + ATTEMPT_MS
            while (true) {
                val reply = readReply(deadline) ?: break
                if (reply in rejections) throw LocalizedIOException(UiText(R.string.err_rig_rejected, command))
                if (reply.startsWith(prefix)) { lastIo = clock(); return reply }
            }
        }
        throw LocalizedIOException(UiText(R.string.err_rig_timeout))
    }
    /** Reads back after a SET; radios may need a moment to apply it, so a stale value is polled again before failing. */
    @Synchronized fun confirm(expected: Long, read: () -> Long) {
        repeat(CONFIRM_TRIES) { attempt ->
            if (attempt > 0) sleep(CONFIRM_GAP_MS)
            if (read() == expected) return
        }
        throw LocalizedStateException(UiText(R.string.err_rig_unconfirmed))
    }
    private fun pace() {
        val wait = lastIo + MIN_GAP_MS - clock()
        if (wait > 0) sleep(wait)
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
            if (byte == terminator.code) return text.toString().trim()
            if (text.length > MAX_REPLY) invalidReply()
        }
    }
    companion object {
        const val WRITE_MS = 500
        const val ATTEMPT_MS = 800L
        const val ATTEMPTS = 3
        const val MAX_REPLY = 64
        const val MIN_GAP_MS = 20L
        const val RETRY_GAP_MS = 60L
        const val CONFIRM_TRIES = 3
        const val CONFIRM_GAP_MS = 60L
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
    private val clock: () -> Long = System::currentTimeMillis,
    /** True while our own PTT is on; the radio's TX state is unknown on some rigs, so this alone must hold every write. */
    private val pttOn: () -> Boolean = { false }
) {
    data class Step(
        val downlinkHz: Long, val uplinkHz: Long?, val look: SatelliteLook, val sentDownlink: Boolean, val sentUplink: Boolean,
        /** Half duplex: frequency and VFO writes are held while transmitting and resynchronised on the first step after unkey. */
        val heldForTx: Boolean = false
    )
    private var splitOn = false
    private var lastDownlink: Long? = null
    private var lastUplink: Long? = null
    private var lastUplinkAt: Long? = null
    private val downVfo = rig.model.satDownlinkVfo
    private val upVfo = downVfo.other()

    fun start(): Step {
        if (uplinkHz != null && rig.supportsSplit) {
            rig.setSplit(true)
            splitOn = true
        }
        if (uplinkHz != null) rig.selectTxVfo(upVfo)
        return step()
    }
    fun step(): Step {
        val now = clock()
        val position = look(now)
        checkUi(position.elevation >= 0) { UiText(R.string.err_rig_below_horizon) }
        val rate = rangeRate(now)
        val down = Doppler.downlink(downlinkHz, rate)
        val up = uplinkHz?.let { Doppler.uplink(it, rate) }
        rig.checkTunable(downVfo, down)
        if (up != null) rig.checkTunable(upVfo, up)
        if (transmitting()) return Step(down, up, position, sentDownlink = false, sentUplink = false, heldForTx = true)
        val previousDown = lastDownlink
        val sentDown = previousDown == null || abs(down - previousDown) >= stepHz
        if (sentDown) {
            rig.setFrequency(downVfo, down)
            lastDownlink = down
        }
        var sentUp = false
        if (up != null && rig.supportsVfoB) {
            val previousUp = lastUplink
            val previousAt = lastUplinkAt
            val due = previousUp == null || abs(up - previousUp) >= stepHz
            val allowed = rig.silentVfoB || previousAt == null || now - previousAt >= TOGGLE_INTERVAL_MS
            if (due && allowed) {
                rig.setFrequency(upVfo, up)
                lastUplink = up
                lastUplinkAt = now
                sentUp = true
            }
        }
        return Step(down, up, position, sentDown, sentUp)
    }
    private fun transmitting(): Boolean {
        if (pttOn()) return true
        if (!rig.supportsTxStatus) return false
        return try { rig.isTransmitting() } catch (_: IOException) { true } catch (_: LocalizedUnsupportedException) { false }
    }
    /** Turns split off; returns false (and keeps split on so a later call retries) while the radio is transmitting. */
    fun stop(): Boolean {
        if (!splitOn) return true
        if (transmitting()) return false
        splitOn = false
        rig.setSplit(false)
        return true
    }
    companion object {
        const val TOGGLE_INTERVAL_MS = 5000L
    }
}
