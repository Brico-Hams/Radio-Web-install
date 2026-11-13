package org.bricohams.radio

import java.io.IOException
import java.nio.charset.Charset
import java.util.Random

/**
 * Radtel RT-950 Pro clone protocol (identical over BLE and the programming cable). The XOR key table, the key selection
 * rule, the channel record and the APRS block layout are ported from pe1hvh/chirp_radtel_rt950pro (MIT); pacing and the
 * fixed key frame come from infamy/NeonPlug (MIT). See ACKNOWLEDGEMENTS.md. The radio has no live CAT: a clone session
 * mutes RX and commits to flash.
 */
object Rt950Protocol {
    private val KEY_TEXT = listOf("BHT ", "CO 7", "A ES", " EIY", "M PQ", "XN Y", "RVB ", " HQP", "W RC", "MS N",
        " SAT", "K DH", "ZO R", "C SL", "6RB ", " JCG", "PN V", "J PK", "EK L", "I LZ")
    val KEYS: List<ByteArray> = KEY_TEXT.map { it.toByteArray(Charsets.US_ASCII) }
    val HANDSHAKE: ByteArray = "PROGRAMBT9000U".toByteArray(Charsets.US_ASCII)
    const val ACK = 0x06
    const val END = 0x45
    const val CMD_READ = 0x52
    const val CMD_WRITE = 0x57
    const val CMD_READ_APRS = 0x54
    const val CMD_WRITE_APRS = 0x58
    const val BLOCK = 0x80
    const val HEADER = 4
    const val CHANNEL_SIZE = 32
    const val CHANNEL_COUNT = 990
    const val ZONES = 10
    const val ZONE_SLOTS = 99
    /** Last block address of the channel table that may be written; 0x7C00 and above are unknown and never touched. */
    const val LAST_WRITABLE_MAIN = 0x7B80
    const val KEY_FRAME_SIZE = 25

    /** NeonPlug's fixed frame; selects key index 1. */
    val FIXED_KEY_FRAME: ByteArray = byteArrayOf(0x53, 0x45, 0x4E, 0x44, 0x21, 0x05, 0x0D, 0x01, 0x01, 0x01, 0x04, 0x11,
        0x08, 0x05, 0x0D, 0x0D, 0x01, 0x11, 0x0F, 0x09, 0x12, 0x09, 0x10, 0x04, 0x00)

    class Region(val name: String, val cmd: Int, val address: Int, val length: Int) {
        val blocks get() = length / BLOCK
    }

    /** Regions that are safe to read, in backup order. Zone names are read as two blocks like the vendor software. */
    val READ_REGIONS = listOf(
        Region("channels", CMD_READ, 0x0000, 0x7C00),
        Region("vfo", CMD_READ, 0x8000, 0x0100),
        Region("function", CMD_READ, 0x9000, 0x0100),
        Region("dtmf", CMD_READ, 0xA000, 0x0200),
        Region("modulation", CMD_READ, 0xB000, 0x0200),
        Region("modulation-names", CMD_READ, 0xD000, 0x0300),
        Region("aprs", CMD_READ_APRS, 0x0000, 0x0080),
        Region("zone-names", CMD_READ, 0xC000, 0x0100))

    fun isReadable(cmd: Int, address: Int): Boolean = when (cmd) {
        CMD_READ_APRS -> address == 0
        CMD_READ -> address % BLOCK == 0 && READ_REGIONS.any {
            it.cmd == CMD_READ && address >= it.address && address < it.address + it.length
        }
        else -> false
    }

    /** Only the channel table and the APRS block may ever be written. */
    fun isWritable(cmd: Int, address: Int): Boolean = when (cmd) {
        CMD_WRITE -> address % BLOCK == 0 && address in 0..LAST_WRITABLE_MAIN
        CMD_WRITE_APRS -> address == 0
        else -> false
    }

    fun header(cmd: Int, address: Int) = byteArrayOf(cmd.toByte(), (address shr 8).toByte(), address.toByte(), BLOCK.toByte())

    fun ackTimeoutMs(cmd: Int, address: Int): Long = when {
        cmd == CMD_WRITE_APRS || cmd == CMD_READ_APRS -> 30000
        address >= 0x8000 -> 10000
        else -> 8000
    }

    fun pauseMs(cmd: Int, address: Int): Long = when {
        cmd == CMD_WRITE_APRS -> 100
        address >= 0x8000 -> 50
        else -> 0
    }

    /** Index into [KEYS] selected by a SEND frame: code 0x1n picks byte 5+2n, code 0x2n picks byte 6+2n. */
    fun keyIndex(frame: ByteArray): Int {
        requireUi(frame.size == KEY_FRAME_SIZE && frame.copyOfRange(0, 4).contentEquals("SEND".toByteArray(Charsets.US_ASCII))) {
            UiText(R.string.err_rt950_key_frame)
        }
        val code = frame[4].toInt() and 255
        val n = code and 0x0F
        val family = code shr 4
        requireUi((family == 1 || family == 2) && n in 0..4) { UiText(R.string.err_rt950_key_frame) }
        val position = if (family == 2) 6 + 2 * n else 5 + 2 * n
        val index = frame[position].toInt() and 255
        requireUi(index in KEYS.indices) { UiText(R.string.err_rt950_key_frame) }
        return index
    }

    fun buildKeyFrame(random: Random): ByteArray {
        val frame = ByteArray(KEY_FRAME_SIZE)
        "SEND".toByteArray(Charsets.US_ASCII).copyInto(frame)
        frame[4] = ((random.nextInt(2) + 1 shl 4) or random.nextInt(5)).toByte()
        for (index in 5 until 24) frame[index] = random.nextInt(KEYS.size).toByte()
        return frame
    }

    /** XOR is its own inverse. Bytes 0x00/0xFF, the key byte, its complement and any byte under a 0x20 key are left alone. */
    fun crypt(data: ByteArray, key: ByteArray): ByteArray {
        val out = data.copyOf()
        for (index in out.indices) {
            val k = key[index % key.size].toInt() and 255
            val value = out[index].toInt() and 255
            if (k != 0x20 && value != 0x00 && value != 0xFF && value != k && value != (k xor 0xFF)) out[index] = (value xor k).toByte()
        }
        return out
    }

    fun hex(address: Int) = "%04X".format(address)
}

/** Reported when the link drops (or the reply is missing) after the APRS commit: the write must be verified after reconnecting. */
class Rt950AprsUnverifiedException(cause: Throwable? = null) :
    IOException(UiText(R.string.err_rt950_aprs_unverified).toString(), cause), LocalizedError {
    override val text = UiText(R.string.err_rt950_aprs_unverified)
}

class Rt950Backup(val model: String, val parts: List<Part>) {
    class Part(val name: String, val cmd: Int, val address: Int, val data: ByteArray)

    fun part(name: String) = parts.first { it.name == name }
    val aprs: ByteArray get() = part("aprs").data
    fun image(): ByteArray = parts.fold(ByteArray(0)) { all, part -> all + part.data }

    /** Raw 32-byte record of a zone slot (zone 1..10, slot 1..99). */
    fun channelRecord(zone: Int, slot: Int): ByteArray {
        val offset = Rt950Channels.index(zone, slot) * Rt950Protocol.CHANNEL_SIZE
        return part("channels").data.copyOfRange(offset, offset + Rt950Protocol.CHANNEL_SIZE)
    }
}

class Rt950Session(
    private val io: RadioBytes,
    private val random: Random = Random(),
    private val pause: (Long) -> Unit = { Thread.sleep(it) }
) {
    var model: String? = null
        private set
    private var key: ByteArray? = null
    private var aprsCommitted = false
    val open get() = key != null

    private fun step(label: String, request: ByteArray, replyLength: Int): ByteArray = try {
        io.write(request, 3000)
        io.read(replyLength, 3000)
    } catch (error: IOException) {
        throw LocalizedIOException(UiText(R.string.err_rt950_handshake, label), error)
    }

    fun handshake(): String {
        io.discardPending()
        checkUi(step("PROGRAMBT9000U", Rt950Protocol.HANDSHAKE, 1)[0].toInt() == Rt950Protocol.ACK) {
            UiText(R.string.err_rt950_handshake, "PROGRAMBT9000U")
        }
        step("F", "F".toByteArray(), 16)
        val name = String(step("M", "M".toByteArray(), 12), Charsets.US_ASCII).trim()
        checkUi(name.startsWith("RT-950")) { UiText(R.string.err_rt950_model, name) }
        val frame = Rt950Protocol.buildKeyFrame(random)
        val selected = Rt950Protocol.keyIndex(frame)
        checkUi(step("SEND", frame, 1)[0].toInt() == Rt950Protocol.ACK) { UiText(R.string.err_rt950_handshake, "SEND") }
        key = Rt950Protocol.KEYS[selected]
        model = name
        return name
    }

    private fun sessionKey(): ByteArray = key ?: throw LocalizedStateException(UiText(R.string.err_rt950_no_session))

    fun readBlock(cmd: Int, address: Int): ByteArray {
        val xor = sessionKey()
        requireUi(Rt950Protocol.isReadable(cmd, address)) { UiText(R.string.err_rt950_region, Rt950Protocol.hex(address)) }
        io.write(Rt950Protocol.header(cmd, address), 3000)
        val reply = io.read(Rt950Protocol.HEADER + Rt950Protocol.BLOCK, Rt950Protocol.ackTimeoutMs(cmd, address).toInt())
        return Rt950Protocol.crypt(reply.copyOfRange(Rt950Protocol.HEADER, reply.size), xor)
    }

    fun writeBlock(cmd: Int, address: Int, data: ByteArray) {
        val xor = sessionKey()
        requireUi(Rt950Protocol.isWritable(cmd, address)) { UiText(R.string.err_rt950_region, Rt950Protocol.hex(address)) }
        requireUi(data.size == Rt950Protocol.BLOCK) { UiText(R.string.err_rt950_block_size) }
        io.write(Rt950Protocol.header(cmd, address) + Rt950Protocol.crypt(data, xor), 10000)
        val ack = try {
            io.read(1, Rt950Protocol.ackTimeoutMs(cmd, address).toInt())[0].toInt()
        } catch (error: IOException) {
            if (cmd == Rt950Protocol.CMD_WRITE_APRS) throw Rt950AprsUnverifiedException(error)
            throw LocalizedIOException(UiText(R.string.err_rt950_ack, Rt950Protocol.hex(address)), error)
        }
        checkUi(ack == Rt950Protocol.ACK) { UiText(R.string.err_rt950_ack, Rt950Protocol.hex(address)) }
        if (cmd == Rt950Protocol.CMD_WRITE_APRS) aprsCommitted = true
        val wait = Rt950Protocol.pauseMs(cmd, address)
        if (wait > 0) pause(wait)
    }

    /** Best effort: the radio may already have dropped the link after an APRS commit. */
    fun end() {
        if (key == null) return
        try {
            if (aprsCommitted) pause(500)
            io.write(byteArrayOf(Rt950Protocol.END.toByte()), 1000)
        } catch (_: IOException) {
        } finally {
            key = null
            aprsCommitted = false
        }
    }

    fun readAll(progress: ((done: Int, total: Int) -> Unit)? = null): Rt950Backup {
        val name = if (open) requireNotNull(model) else handshake()
        val total = Rt950Protocol.READ_REGIONS.sumOf { it.blocks }
        var done = 0
        val parts = Rt950Protocol.READ_REGIONS.map { region ->
            val data = ByteArray(region.length)
            for (block in 0 until region.blocks) {
                readBlock(region.cmd, region.address + block * Rt950Protocol.BLOCK)
                    .copyInto(data, block * Rt950Protocol.BLOCK)
                progress?.invoke(++done, total)
            }
            Rt950Backup.Part(region.name, region.cmd, region.address, data)
        }
        return Rt950Backup(name, parts)
    }

    fun readAprs(): ByteArray {
        if (!open) handshake()
        return readBlock(Rt950Protocol.CMD_READ_APRS, 0)
    }

    private fun verified(cmd: Int, address: Int, expected: ByteArray) {
        val actual = readBlock(cmd, address)
        checkUi(actual.contentEquals(expected)) { UiText(R.string.err_rt950_verify, Rt950Protocol.hex(address)) }
    }

    /** Read-modify-write of whole blocks from a fresh read; every block is read back and compared. Returns the verified block count. */
    fun writeChannels(zone: Int, slots: Map<Int, Rt950Channel>): Int {
        requireUi(zone in 1..Rt950Protocol.ZONES && slots.isNotEmpty() && slots.keys.all { it in 1..Rt950Protocol.ZONE_SLOTS }) {
            UiText(R.string.err_rt950_slot)
        }
        if (!open) handshake()
        val byBlock = slots.entries.groupBy { (Rt950Channels.index(zone, it.key) * Rt950Protocol.CHANNEL_SIZE) / Rt950Protocol.BLOCK }
        for ((block, entries) in byBlock.toSortedMap()) {
            val address = block * Rt950Protocol.BLOCK
            val fresh = readBlock(Rt950Protocol.CMD_READ, address)
            for ((slot, channel) in entries) {
                val start = Rt950Channels.index(zone, slot) * Rt950Protocol.CHANNEL_SIZE - address
                val previous = fresh.copyOfRange(start, start + Rt950Protocol.CHANNEL_SIZE)
                Rt950Channels.encode(channel, previous).copyInto(fresh, start)
            }
            writeBlock(Rt950Protocol.CMD_WRITE, address, fresh)
            verified(Rt950Protocol.CMD_READ, address, fresh)
        }
        return byBlock.size
    }

    /** A lost link after the commit surfaces as [Rt950AprsUnverifiedException]; it is never reported as success. */
    fun writeAprs(settings: Rt950AprsSettings) {
        if (!open) handshake()
        val fresh = readBlock(Rt950Protocol.CMD_READ_APRS, 0)
        val updated = Rt950Aprs.encode(settings, fresh)
        writeBlock(Rt950Protocol.CMD_WRITE_APRS, 0, updated)
        try {
            verified(Rt950Protocol.CMD_READ_APRS, 0, updated)
        } catch (error: IOException) {
            throw Rt950AprsUnverifiedException(error)
        }
    }
}

sealed class Rt950Tone {
    object Off : Rt950Tone()
    data class Ctcss(val tenthsHz: Int) : Rt950Tone()
    data class Dcs(val code: Int, val inverted: Boolean) : Rt950Tone()

    fun toBytes(): ByteArray = when (this) {
        Off -> byteArrayOf(0, 0)
        is Ctcss -> {
            requireUi(tenthsHz in 1..0xFFFF) { UiText(R.string.err_rt950_value, "CTCSS") }
            byteArrayOf(tenthsHz.toByte(), (tenthsHz shr 8).toByte())
        }
        is Dcs -> {
            val index = Rt950Channels.DCS_CODES.indexOf(code)
            requireUi(index >= 0) { UiText(R.string.err_rt950_value, "DCS") }
            byteArrayOf((index + 1 + if (inverted) Rt950Channels.DCS_CODES.size else 0).toByte(), 0)
        }
    }

    companion object {
        fun fromBytes(low: Int, high: Int): Rt950Tone = when {
            low == 0 && high == 0 || low == 0xFF && high == 0xFF -> Off
            high == 0 -> {
                val size = Rt950Channels.DCS_CODES.size
                if (low in 1..size * 2) Dcs(Rt950Channels.DCS_CODES[(low - 1) % size], low > size) else Off
            }
            else -> Ctcss(high shl 8 or low)
        }
    }
}

/** powerIndex: 0 High, 1 Mid, 2 Low. txHz null means no transmit frequency stored. */
data class Rt950Channel(
    val rxHz: Long,
    val txHz: Long?,
    val rxTone: Rt950Tone = Rt950Tone.Off,
    val txTone: Rt950Tone = Rt950Tone.Off,
    val powerIndex: Int = 0,
    val narrow: Boolean = false,
    val busyLockout: Boolean = false,
    val scanAdd: Boolean = false,
    val txEnabled: Boolean = true,
    val am: Boolean = false,
    val name: String = "",
    val signalling: Int = 0,
    val pttId: Int = 0,
    val scrambler: Int = 0
)

object Rt950Channels {
    val DCS_CODES = intArrayOf(23, 25, 26, 31, 32, 36, 43, 47, 51, 53, 54, 65, 71, 72, 73, 74, 114, 115, 116, 122, 125,
        131, 132, 134, 143, 145, 152, 155, 156, 162, 165, 172, 174, 205, 212, 223, 225, 226, 243, 244, 245, 246, 251, 252,
        255, 261, 263, 265, 266, 271, 274, 306, 311, 315, 325, 331, 332, 343, 346, 351, 356, 364, 365, 371, 411, 412, 413,
        423, 431, 432, 445, 446, 452, 454, 455, 462, 464, 465, 466, 503, 506, 516, 523, 526, 532, 546, 565, 606, 612, 624,
        627, 631, 632, 645, 654, 662, 664, 703, 712, 723, 731, 732, 734, 743, 754)

    fun index(zone: Int, slot: Int): Int {
        requireUi(zone in 1..Rt950Protocol.ZONES && slot in 1..Rt950Protocol.ZONE_SLOTS) { UiText(R.string.err_rt950_slot) }
        return (zone - 1) * Rt950Protocol.ZONE_SLOTS + (slot - 1)
    }

    /** True for an empty slot: RX frequency bytes all 0xFF (or 0x00). */
    fun isBlank(record: ByteArray) = (0 until 4).all { record[it] == 0xFF.toByte() } || (0 until 4).all { record[it] == 0.toByte() }

    private fun decodeFrequency(record: ByteArray, offset: Int): Long? {
        if ((0 until 4).all { record[offset + it] == 0xFF.toByte() || record[offset + it] == 0.toByte() }) return null
        var value = 0L
        for (position in 3 downTo 0) {
            val byte = record[offset + position].toInt() and 255
            val high = byte shr 4
            val low = byte and 15
            if (high > 9 || low > 9) return null
            value = value * 100 + high * 10 + low
        }
        return value * 10
    }

    private fun encodeFrequency(hz: Long?, out: ByteArray, offset: Int) {
        if (hz == null) { for (index in 0 until 4) out[offset + index] = 0xFF.toByte(); return }
        requireUi(hz > 0 && hz % 10 == 0L && hz / 10 < 100_000_000) { UiText(R.string.err_rt950_frequency, hz.toString()) }
        var value = hz / 10
        for (position in 0 until 4) {
            val pair = (value % 100).toInt()
            out[offset + position] = ((pair / 10 shl 4) or pair % 10).toByte()
            value /= 100
        }
    }

    private fun asciiOrBlank(bytes: ByteArray) = String(bytes.takeWhile { it != 0.toByte() && it != 0xFF.toByte() }.toByteArray(), Charsets.ISO_8859_1).trim()

    /** Null for an empty slot or one whose RX frequency is not valid BCD (check [isBlank] to tell them apart). */
    fun decode(record: ByteArray): Rt950Channel? {
        require(record.size == Rt950Protocol.CHANNEL_SIZE)
        val rx = decodeFrequency(record, 0) ?: return null
        fun u(index: Int) = record[index].toInt() and 255
        val flags = u(15)
        return Rt950Channel(rx, decodeFrequency(record, 4), Rt950Tone.fromBytes(u(8), u(9)), Rt950Tone.fromBytes(u(10), u(11)),
            minOf(u(14) and 15, 2), flags and 0x40 != 0, flags and 0x08 != 0, flags and 0x04 != 0, flags and 0x02 != 0,
            flags and 0x01 != 0, asciiOrBlank(record.copyOfRange(20, 32)), u(12) and 15, u(13) and 15, u(14) shr 4)
    }

    /** Rebuilds the record on top of [previous] so bits this app does not model (encryption, FHSS, high nibbles) survive. */
    fun encode(channel: Rt950Channel, previous: ByteArray? = null): ByteArray {
        requireUi(channel.powerIndex in 0..2 && channel.signalling in 0..15 && channel.pttId in 0..15 && channel.scrambler in 0..15) {
            UiText(R.string.err_rt950_value, channel.name)
        }
        requireUi(channel.name.length <= 12 && channel.name.all { it.code in 32..126 }) { UiText(R.string.err_rt950_name, channel.name) }
        val old = previous?.takeIf { it.size == Rt950Protocol.CHANNEL_SIZE && !isBlank(it) }
        val out = old?.copyOf() ?: ByteArray(Rt950Protocol.CHANNEL_SIZE) { 0xFF.toByte() }
        encodeFrequency(channel.rxHz, out, 0)
        encodeFrequency(channel.txHz, out, 4)
        channel.rxTone.toBytes().copyInto(out, 8)
        channel.txTone.toBytes().copyInto(out, 10)
        fun high(index: Int) = if (old == null || old[index] == 0xFF.toByte()) 0 else old[index].toInt() and 0xF0
        out[12] = (high(12) or channel.signalling).toByte()
        out[13] = (high(13) or channel.pttId).toByte()
        out[14] = ((channel.scrambler shl 4) or channel.powerIndex).toByte()
        val kept = if (old == null) 0 else old[15].toInt() and (0x80 or 0x30)
        out[15] = (kept or (if (channel.narrow) 0x40 else 0) or (if (channel.busyLockout) 0x08 else 0) or
            (if (channel.scanAdd) 0x04 else 0) or (if (channel.txEnabled) 0x02 else 0) or (if (channel.am) 0x01 else 0)).toByte()
        val name = channel.name.toByteArray(Charsets.US_ASCII)
        for (index in 0 until 12) out[20 + index] = if (index < name.size) name[index] else 0xFF.toByte()
        return out
    }
}

/** Satellite pass channel plan: the radio cannot be retuned live, so five Doppler-corrected snapshots go into memory slots. */
object Rt950Doppler {
    const val RX_MIN_HZ = 18_000_000L
    const val RX_MAX_HZ = 620_000_000L
    val POINTS = listOf("AOS", "MIDR", "TCA", "MIDS", "LOS")

    fun txAllowed(hz: Long) = hz in 144_000_000L..148_000_000L || hz in 420_000_000L..450_000_000L

    /** [rangeRateKmS] gives the range rate (positive = receding) at a time; [times] are AOS, mid-rise, TCA, mid-set, LOS. */
    fun channels(satellite: String, downHz: Long, upHz: Long?, uplinkTenthsHz: Int?, times: List<Long>,
        rangeRateKmS: (Long) -> Double): List<Rt950Channel> {
        requireUi(times.size == POINTS.size) { UiText(R.string.err_rt950_value, "times") }
        val base = satellite.filter { it.code in 33..126 }.take(7)
        return times.mapIndexed { index, time ->
            val rate = rangeRateKmS(time)
            val rx = Math.round(PassGeometry.dopplerHz(downHz, rate) / 10.0) * 10
            val tx = upHz?.let { Math.round(PassGeometry.dopplerHz(it, rate, uplink = true) / 10.0) * 10 }
            requireUi(rx in RX_MIN_HZ..RX_MAX_HZ) { UiText(R.string.err_rt950_rx_range, "%.5f".format(java.util.Locale.ROOT, rx / 1e6)) }
            requireUi(tx == null || txAllowed(tx)) { UiText(R.string.err_rt950_tx_range, "%.5f".format(java.util.Locale.ROOT, tx!! / 1e6)) }
            Rt950Channel(rx, tx, txTone = if (tx != null && uplinkTenthsHz != null) Rt950Tone.Ctcss(uplinkTenthsHz) else Rt950Tone.Off,
                narrow = true, txEnabled = tx != null, name = "$base ${POINTS[index]}".trim())
        }
    }
}

/** APRS block (128 bytes). Fields keep the driver's names; unset (0xFF) bytes decode as 0 / empty and are left untouched unless edited. */
data class Rt950AprsSettings(
    val aprsEnabled: Boolean = false,
    val gpsEnabled: Boolean = false,
    val timeZone: Int = 0,
    val north: Boolean = true,
    val latDegrees: Int = 0, val latMinutes: Int = 0, val latSeconds: Int = 0,
    val east: Boolean = true,
    val lonDegrees: Int = 0, val lonMinutes: Int = 0, val lonSeconds: Int = 0,
    val altitude: Int = 0,
    val callsign: String = "",
    val ssid: Int = 0,
    val routingSelect: Int = 0,
    val myPosition: Int = 0,
    /** 0 Pedestrian, 1 Bicycle, 2 Car, 3 Recreational vehicle, 4 User defined. */
    val radioSymbol: Int = 0,
    val userIcon: Int = 0,
    val priority: Int = 0,
    val dataTxDelay: Int = 0,
    val decodePromptTone: Boolean = false,
    val rxAutoPopup: Boolean = false,
    val beaconTxType: Int = 0,
    /** 0 = 30 s, then 1, 2, 3, 5, 10, 15, 20, 30, 60 min. */
    val timedBeaconTime: Int = 0,
    val miceType: Int = 0,
    val tncDataType: Int = 0,
    val forwardChannel: Int = 0,
    val forwardRouting: Int = 0,
    val waitForward: Int = 0,
    val customRouting1: String = "", val customRouting1Ssid: Int = 0,
    val customRouting2: String = "", val customRouting2Ssid: Int = 0,
    val sendCustomMessage: Boolean = false,
    val customMessage: String = ""
)

object Rt950Aprs {
    val BEACON_MINUTES = listOf("30 s", "1 min", "2 min", "3 min", "5 min", "10 min", "15 min", "20 min", "30 min", "60 min")

    private fun u(data: ByteArray, index: Int) = data[index].toInt() and 255
    private fun nib(data: ByteArray, index: Int, mask: Int = 0x0F) = if (u(data, index) == 0xFF) 0 else u(data, index) and mask
    private fun bounded(data: ByteArray, index: Int, limit: Int) = if (u(data, index) == 0xFF) 0 else minOf(limit, u(data, index))
    private fun ascii(data: ByteArray, offset: Int, length: Int) =
        String(data.copyOfRange(offset, offset + length).takeWhile { it != 0.toByte() && it != 0xFF.toByte() }.toByteArray(),
            Charsets.US_ASCII).trim()

    private fun message(data: ByteArray): String {
        val raw = data.copyOfRange(79, 119).takeWhile { it != 0.toByte() && it != 0xFF.toByte() }.toByteArray()
        val charset = try { Charset.forName("GB2312") } catch (_: RuntimeException) { Charsets.ISO_8859_1 }
        return String(raw, charset).trim()
    }

    fun decode(block: ByteArray): Rt950AprsSettings {
        require(block.size == Rt950Protocol.BLOCK)
        val altitude = if (u(block, 15) == 0xFF && u(block, 16) == 0xFF) 0
            else ((u(block, 16) shl 8 or u(block, 15)).toShort().toInt()).coerceIn(-10000, 10000)
        return Rt950AprsSettings(nib(block, 0) != 0, nib(block, 1) != 0, nib(block, 6, 0x1F),
            u(block, 7) == 0x4E, bounded(block, 9, 90), bounded(block, 8, 59), bounded(block, 10, 59),
            u(block, 11) != 0x57, bounded(block, 13, 180), bounded(block, 12, 59), bounded(block, 14, 59), altitude,
            ascii(block, 17, 6), nib(block, 23), nib(block, 24), nib(block, 25), nib(block, 26), nib(block, 27, 0x7F),
            nib(block, 29), nib(block, 30), nib(block, 32) != 0, nib(block, 33) != 0, nib(block, 34), nib(block, 36),
            nib(block, 38), nib(block, 39), nib(block, 40), nib(block, 41), nib(block, 42),
            ascii(block, 43, 6), nib(block, 49), ascii(block, 50, 6), nib(block, 56), nib(block, 78) != 0, message(block))
    }

    /** Writes only the fields that differ from [base], on top of [base], so untouched bytes stay exactly as the radio had them. */
    fun encode(settings: Rt950AprsSettings, base: ByteArray): ByteArray {
        require(base.size == Rt950Protocol.BLOCK)
        val old = decode(base)
        val data = base.copyOf()
        fun small(index: Int, name: String, new: Int, previous: Int, max: Int, mask: Int = 0x0F) {
            if (new == previous) return
            requireUi(new in 0..max) { UiText(R.string.err_rt950_value, name) }
            val current = u(data, index)
            data[index] = ((if (current == 0xFF) 0 else current and mask.inv()) or (new and mask)).toByte()
        }
        fun flag(index: Int, name: String, new: Boolean, previous: Boolean) =
            small(index, name, if (new) 1 else 0, if (previous) 1 else 0, 1)
        fun plain(index: Int, name: String, new: Int, previous: Int, max: Int) {
            if (new == previous) return
            requireUi(new in 0..max) { UiText(R.string.err_rt950_value, name) }
            data[index] = new.toByte()
        }
        fun text(offset: Int, length: Int, name: String, new: String, previous: String, upper: Boolean) {
            if (new == previous) return
            val value = if (upper) new.uppercase() else new
            requireUi(value.length <= length && value.all { it.code in 32..126 } &&
                (!upper || value.all { it.isLetterOrDigit() })) { UiText(R.string.err_rt950_value, name) }
            val bytes = value.toByteArray(Charsets.US_ASCII)
            for (index in 0 until length) data[offset + index] = if (index < bytes.size) bytes[index] else 0xFF.toByte()
        }
        flag(0, "APRS", settings.aprsEnabled, old.aprsEnabled)
        flag(1, "GPS", settings.gpsEnabled, old.gpsEnabled)
        small(6, "time zone", settings.timeZone, old.timeZone, 23, 0x1F)
        if (settings.north != old.north) data[7] = (if (settings.north) 0x4E else 0x53).toByte()
        plain(9, "lat", settings.latDegrees, old.latDegrees, 90)
        plain(8, "lat", settings.latMinutes, old.latMinutes, 59)
        plain(10, "lat", settings.latSeconds, old.latSeconds, 59)
        if (settings.east != old.east) data[11] = (if (settings.east) 0x45 else 0x57).toByte()
        plain(13, "lon", settings.lonDegrees, old.lonDegrees, 180)
        plain(12, "lon", settings.lonMinutes, old.lonMinutes, 59)
        plain(14, "lon", settings.lonSeconds, old.lonSeconds, 59)
        if (settings.altitude != old.altitude) {
            requireUi(settings.altitude in -10000..10000) { UiText(R.string.err_rt950_value, "altitude") }
            data[15] = settings.altitude.toByte(); data[16] = (settings.altitude shr 8).toByte()
        }
        text(17, 6, "callsign", settings.callsign, old.callsign, true)
        small(23, "SSID", settings.ssid, old.ssid, 15)
        small(24, "routing", settings.routingSelect, old.routingSelect, 5)
        small(25, "position", settings.myPosition, old.myPosition, 5)
        small(26, "symbol", settings.radioSymbol, old.radioSymbol, 4)
        small(27, "icon", settings.userIcon, old.userIcon, 127, 0x7F)
        small(29, "priority", settings.priority, old.priority, 2)
        small(30, "TX delay", settings.dataTxDelay, old.dataTxDelay, 9)
        flag(32, "prompt tone", settings.decodePromptTone, old.decodePromptTone)
        flag(33, "popup", settings.rxAutoPopup, old.rxAutoPopup)
        small(34, "beacon", settings.beaconTxType, old.beaconTxType, 2)
        small(36, "timed beacon", settings.timedBeaconTime, old.timedBeaconTime, 9)
        small(38, "MIC-E", settings.miceType, old.miceType, 3)
        small(39, "TNC", settings.tncDataType, old.tncDataType, 3)
        small(40, "forward channel", settings.forwardChannel, old.forwardChannel, 15)
        small(41, "forward routing", settings.forwardRouting, old.forwardRouting, 5)
        plain(42, "wait forward", settings.waitForward, old.waitForward, 9)
        text(43, 6, "route 1", settings.customRouting1, old.customRouting1, true)
        small(49, "route 1 SSID", settings.customRouting1Ssid, old.customRouting1Ssid, 15)
        text(50, 6, "route 2", settings.customRouting2, old.customRouting2, true)
        small(56, "route 2 SSID", settings.customRouting2Ssid, old.customRouting2Ssid, 15)
        flag(78, "custom message", settings.sendCustomMessage, old.sendCustomMessage)
        if (settings.customMessage != old.customMessage) {
            requireUi(settings.customMessage.length <= 40 && settings.customMessage.all { it.code in 32..126 }) {
                UiText(R.string.err_rt950_value, "message")
            }
            val bytes = settings.customMessage.toByteArray(Charsets.US_ASCII)
            for (index in 0 until 40) data[79 + index] = if (index < bytes.size) bytes[index] else 0xFF.toByte()
        }
        return data
    }
}
