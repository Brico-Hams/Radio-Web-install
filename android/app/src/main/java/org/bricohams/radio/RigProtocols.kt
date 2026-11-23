package org.bricohams.radio

import java.io.ByteArrayOutputStream
import java.io.IOException
import java.util.Locale

/**
 * 5-byte CAT of the Yaesu FT-817/817ND, FT-818ND, FT-857/857D and FT-897/897D (each radio's Operating Manual, chapter
 * "CAT Operation", Opcode Command Chart). 4800 bps default (menu CAT RATE), 8N2. Every command is P1 P2 P3 P4 OPCODE.
 */
object YaesuFiveByte {
    private fun command(opcode: Int, p1: Int = 0, p2: Int = 0, p3: Int = 0, p4: Int = 0) =
        byteArrayOf(p1.toByte(), p2.toByte(), p3.toByte(), p4.toByte(), opcode.toByte())

    // Operating Manual, CAT Operation, command chart "Set Frequency" (opcode 01): 8 BCD digits of the frequency in 10 Hz units
    fun frequencyCommand(hz: Long): ByteArray {
        requireUi(hz in 0 until 1_000_000_000L) { UiText(R.string.err_rig_range, mhzText(hz)) }
        requireUi(hz % 10 == 0L) { UiText(R.string.err_rig_resolution, 10) }
        val digits = String.format(Locale.ROOT, "%08d", hz / 10)
        fun pair(index: Int) = ((digits[index] - '0') shl 4) or (digits[index + 1] - '0')
        return command(0x01, pair(0), pair(2), pair(4), pair(6))
    }
    // Operating Manual, CAT Operation, command chart "Read Frequency and Mode Status" (opcode 03)
    fun readFrequencyMode(): ByteArray = command(0x03)
    // Operating Manual, CAT Operation, command chart "Read Frequency and Mode Status": 4 BCD bytes (10 Hz units) + mode byte
    fun decodeFrequencyMode(bytes: ByteArray): Pair<Long, RigMode?> {
        if (bytes.size != 5) invalidReply()
        var units = 0L
        for (index in 0 until 4) {
            val high = (bytes[index].toInt() shr 4) and 15
            val low = bytes[index].toInt() and 15
            if (high > 9 || low > 9) invalidReply()
            units = units * 100 + high * 10 + low
        }
        return units * 10 to mode(bytes[4].toInt() and 255)
    }
    // Operating Manual, CAT Operation, command chart "Operating Mode" (opcode 07) and "Read Frequency and Mode Status" mode codes
    fun mode(code: Int): RigMode? = when (code) {
        0x00 -> RigMode.LSB
        0x01 -> RigMode.USB
        0x02, 0x82 -> RigMode.CW
        0x03, 0x83 -> RigMode.CW_R
        0x04 -> RigMode.AM
        0x06 -> RigMode.WFM
        0x08 -> RigMode.FM
        0x88 -> RigMode.FM_N
        0x0A -> RigMode.DATA_U
        0x0C -> RigMode.DATA_FM
        else -> null
    }
    fun modeCode(mode: RigMode): Int? = when (mode) {
        RigMode.LSB -> 0x00
        RigMode.USB -> 0x01
        RigMode.CW -> 0x02
        RigMode.CW_R -> 0x03
        RigMode.AM -> 0x04
        RigMode.WFM -> 0x06
        RigMode.FM -> 0x08
        RigMode.DATA_U -> 0x0A
        RigMode.DATA_FM -> 0x0C
        else -> null
    }
    // Operating Manual, CAT Operation, command chart "Operating Mode" (opcode 07)
    fun modeCommand(mode: RigMode): ByteArray {
        val code = requireNotNullUi(modeCode(mode)) { UiText(R.string.err_rig_mode, mode.name) }
        return command(0x07, code)
    }
    // Operating Manual, CAT Operation, command chart "PTT" (opcode 08 on, 88 off)
    fun ptt(on: Boolean): ByteArray = command(if (on) 0x08 else 0x88)
    // Operating Manual, CAT Operation, command chart "Toggle VFO A/B" (opcode 81)
    fun toggleVfo(): ByteArray = command(0x81)
    // Operating Manual, CAT Operation, command chart "Split On/Off" (opcode 02 on, 82 off)
    fun split(on: Boolean): ByteArray = command(if (on) 0x02 else 0x82)
}

/**
 * FT-8x7 rig. The 5-byte protocol cannot tell which VFO is active, so "VFO A" means the VFO that was active when the
 * session started; VFO B is reached by toggling and toggling back.
 */
class YaesuFiveByteRig(private val transport: RadioBytes, override val model: RigModel) : Rig {
    override val supportsVfoB = true
    override val silentVfoB = false
    override val supportsSplit = true
    override val supportsMemories = false

    private fun send(command: ByteArray) {
        transport.discardPending()
        transport.write(command, WRITE_MS)
        try {
            transport.read(1, ACK_MS) // some radios acknowledge with one status byte; keep it out of the next reply
        } catch (_: IOException) {
            // No acknowledgement.
        }
    }
    private fun read(): Pair<Long, RigMode?> {
        var failure: IOException? = null
        repeat(2) {
            transport.discardPending()
            transport.write(YaesuFiveByte.readFrequencyMode(), WRITE_MS)
            try {
                return YaesuFiveByte.decodeFrequencyMode(transport.read(5, READ_MS))
            } catch (error: IOException) {
                failure = error
            }
        }
        throw failure ?: LocalizedIOException(UiText(R.string.err_rig_timeout))
    }
    private fun <T> onVfo(vfo: Vfo, block: () -> T): T {
        if (vfo == Vfo.A) return block()
        send(YaesuFiveByte.toggleVfo())
        try {
            return block()
        } finally {
            send(YaesuFiveByte.toggleVfo())
        }
    }
    override fun identify(): String {
        val (hz, mode) = read()
        return String.format(Locale.ROOT, "FT-%s: %.5f MHz %s", model.name.removePrefix("FT"), hz / 1e6, mode?.name ?: "?")
    }
    override fun status(): RigStatus = read().let { RigStatus(it.first, it.second) }
    override fun frequency(vfo: Vfo): Long = onVfo(vfo) { read().first }
    override fun setFrequency(vfo: Vfo, hz: Long) {
        checkRange(model, hz)
        val rounded = (hz + 5) / 10 * 10
        onVfo(vfo) {
            send(YaesuFiveByte.frequencyCommand(rounded))
            checkUi(read().first == rounded) { UiText(R.string.err_rig_unconfirmed) }
        }
    }
    override fun setMode(mode: RigMode) = send(YaesuFiveByte.modeCommand(mode))
    override fun ptt(on: Boolean) = send(YaesuFiveByte.ptt(on))
    override fun setSplit(on: Boolean) = send(YaesuFiveByte.split(on))
    override fun memories(channels: IntRange, keepGoing: () -> Boolean): List<RigMemory> = unsupported("memories")
    override val supportsMemoryWrite = false
    override fun writeMemory(memory: RigMemory) = unsupported("memory write")
    private companion object {
        const val WRITE_MS = 500
        const val READ_MS = 500
        const val ACK_MS = 50
    }
}

/** Icom IC-705 CI-V, from the "IC-705 CI-V Reference Guide" (Icom, English, rev. 6). */
object IcomCiv {
    const val CONTROLLER = 0xE0
    const val OK = 0xFB
    const val NG = 0xFA
    const val MAX_FRAME = 200

    fun body(vararg values: Int): ByteArray = ByteArray(values.size) { values[it].toByte() }

    // CI-V Reference Guide p.2 "Data format": FE FE <to> <from> <cmd> [sub] [data...] FD
    fun frame(to: Int, body: ByteArray, from: Int = CONTROLLER): ByteArray =
        byteArrayOf(0xFE.toByte(), 0xFE.toByte(), to.toByte(), from.toByte()) + body + 0xFD.toByte()

    // CI-V Reference Guide p.2 "Data format": frequency as 5 BCD bytes, least significant pair first
    fun encodeFrequency(hz: Long): ByteArray {
        requireUi(hz in 0..9_999_999_999L) { UiText(R.string.err_rig_range, mhzText(hz)) }
        val digits = String.format(Locale.ROOT, "%010d", hz)
        return ByteArray(5) { index ->
            val at = 8 - 2 * index
            (((digits[at] - '0') shl 4) or (digits[at + 1] - '0')).toByte()
        }
    }
    fun decodeFrequency(bytes: ByteArray, offset: Int = 0): Long {
        if (bytes.size < offset + 5) invalidReply()
        var hz = 0L
        for (index in 4 downTo 0) {
            val value = bcd(bytes[offset + index].toInt() and 255)
            if (value < 0) invalidReply()
            hz = hz * 100 + value
        }
        return hz
    }
    /** Two BCD digits, or -1 when a nibble is not a digit. */
    fun bcd(byte: Int): Int {
        val high = byte shr 4
        val low = byte and 15
        return if (high > 9 || low > 9) -1 else high * 10 + low
    }
    // CI-V Reference Guide p.17 "Operating mode" mode codes
    fun mode(code: Int): RigMode? = when (code) {
        0x00 -> RigMode.LSB
        0x01 -> RigMode.USB
        0x02 -> RigMode.AM
        0x03 -> RigMode.CW
        0x04 -> RigMode.RTTY
        0x05 -> RigMode.FM
        0x06 -> RigMode.WFM
        0x07 -> RigMode.CW_R
        0x08 -> RigMode.RTTY_R
        0x17 -> RigMode.DV
        else -> null
    }
    fun modeCode(mode: RigMode): Int? = when (mode) {
        RigMode.LSB -> 0x00
        RigMode.USB -> 0x01
        RigMode.AM -> 0x02
        RigMode.CW -> 0x03
        RigMode.RTTY -> 0x04
        RigMode.FM -> 0x05
        RigMode.WFM -> 0x06
        RigMode.CW_R -> 0x07
        RigMode.RTTY_R -> 0x08
        RigMode.DV -> 0x17
        else -> null
    }
    // CI-V Reference Guide p.17 "Operating frequency": 03 read, 05 set
    fun readFrequency() = body(0x03)
    fun setOperatingFrequency(hz: Long) = body(0x05) + encodeFrequency(hz)
    // CI-V Reference Guide p.18 "Selected or unselected VFO frequency settings": 25 00 selected, 25 01 unselected
    fun readVfoFrequency(vfo: Vfo) = body(0x25, vfo.ordinal)
    fun setVfoFrequency(vfo: Vfo, hz: Long) = body(0x25, vfo.ordinal) + encodeFrequency(hz)
    // CI-V Reference Guide p.17 "Operating mode": 04 read
    fun readMode() = body(0x04)
    // CI-V Reference Guide p.17 "Operating mode": 06 set (filter omitted)
    fun setMode(mode: RigMode): ByteArray =
        body(0x06, requireNotNullUi(modeCode(mode)) { UiText(R.string.err_rig_mode, mode.name) })
    // CI-V Reference Guide command table: 1C 00 transceiver status (00 RX, 01 TX)
    fun ptt(on: Boolean) = body(0x1C, 0x00, if (on) 1 else 0)
    // CI-V Reference Guide command table: 0F split OFF (00) / ON (01)
    fun split(on: Boolean) = body(0x0F, if (on) 1 else 0)
    // CI-V Reference Guide p.4 "15 02 Read S-meter level" (0000=S0, 0120=S9, 0241=S9+60 dB)
    fun readSMeter() = body(0x15, 0x02)
    // CI-V Reference Guide p.4 "14 0A Send/read the selected band's RF power" (0000=Minimum ~ 0255=Maximum)
    fun readRfPower() = body(0x14, 0x0A)
    fun setRfPower(level: Int) = body(0x14, 0x0A) + encodeLevel(level)
    // CI-V Reference Guide p.14 "1C 00 Send/read the transceiver's status" (00=RX, 01=TX)
    fun readTxStatus() = body(0x1C, 0x00)
    // CI-V Reference Guide p.5 "19 00 Read the transceiver ID"
    fun readId() = body(0x19, 0x00)
    // CI-V Reference Guide p.22 "Data mode with filter width settings": 1A 06 <00=OFF/01=ON> <01..03 = FIL1..FIL3>; filter 00 when OFF
    fun readDataMode() = body(0x1A, 0x06)
    fun setDataMode(on: Boolean, filter: Int = 1): ByteArray {
        requireUi(!on || filter in 1..3) { UiText(R.string.err_rig_value, filter) }
        return body(0x1A, 0x06, if (on) 1 else 0, if (on) filter else 0)
    }
    // CI-V Reference Guide p.27 "Selected or unselected VFO's operating mode and filter settings": 26 <00 selected/01 unselected>
    // <mode> [data mode] [filter]; the last two can be skipped (DATA OFF and the default filter of the mode are applied)
    fun readVfoMode(vfo: Vfo) = body(0x26, vfo.ordinal)
    fun setVfoMode(vfo: Vfo, mode: RigMode): ByteArray =
        body(0x26, vfo.ordinal, requireNotNullUi(modeCode(mode)) { UiText(R.string.err_rig_mode, mode.name) })
    // CI-V Reference Guide p.4 level data "0000 ~ 0255": four digits in two BCD bytes, hundreds first
    fun encodeLevel(level: Int): ByteArray {
        requireUi(level in 0..255) { UiText(R.string.err_rig_value, level) }
        return body(level / 100, ((level / 10 % 10) shl 4) or (level % 10))
    }
    fun decodeLevel(bytes: ByteArray, offset: Int = 0): Int {
        if (bytes.size < offset + 2) invalidReply()
        val high = bcd(bytes[offset].toInt() and 255)
        val low = bcd(bytes[offset + 1].toInt() and 255)
        if (high < 0 || low < 0 || high * 100 + low > 255) invalidReply()
        return high * 100 + low
    }
    // CI-V Reference Guide p.18 "Memory content": 1A 00 + group (2 BCD bytes) + channel (2 BCD bytes)
    fun readMemory(channel: Int): ByteArray {
        requireUi(channel in 0..99) { UiText(R.string.err_rig_channel, channel) }
        return body(0x1A, 0x00, 0x00, 0x00, 0x00, ((channel / 10) shl 4) or (channel % 10))
    }
    /** [data] follows "1A 00"; returns null for a blank channel. */
    // CI-V Reference Guide p.18 "Memory content": group, channel, split/select, frequency, mode, filter ... name at 99..114
    fun memory(data: ByteArray): RigMemory? {
        if (data.size < 5) invalidReply()
        if (data[4].toInt() and 255 == 0xFF) return null
        if (data.size < 11) invalidReply()
        val channel = bcd(data[2].toInt() and 255) * 100 + bcd(data[3].toInt() and 255)
        if (bcd(data[2].toInt() and 255) < 0 || bcd(data[3].toInt() and 255) < 0) invalidReply()
        val name = if (data.size < 115) "" else
            String(data, 99, 16, Charsets.US_ASCII).filter { it.code in 32..126 }.trimEnd()
        return RigMemory(channel, decodeFrequency(data, 5), mode(data[10].toInt() and 255), name)
    }

    class Frame(val to: Int, val from: Int, val body: ByteArray)

    /** Byte-wise scanner: returns frames from the radio to the controller; echoes, broadcasts and corrupt frames are skipped. */
    class Parser(private val controller: Int = CONTROLLER) {
        private val buffer = ByteArrayOutputStream()
        private var size = 0
        private fun reset(vararg keep: Int) {
            buffer.reset()
            keep.forEach { buffer.write(it) }
            size = keep.size
        }
        fun feed(value: Int): Frame? {
            val byte = value and 255
            when {
                size == 0 -> if (byte == 0xFE) reset(0xFE)
                size == 1 -> if (byte == 0xFE) { buffer.write(byte); size++ } else reset()
                byte == 0xFE -> if (size > 2) reset(0xFE) // new preamble inside a frame: resynchronise
                byte == 0xFD -> {
                    val bytes = buffer.toByteArray()
                    reset()
                    if (bytes.size >= 5 && bytes[2].toInt() and 255 == controller && bytes[3].toInt() and 255 != controller) {
                        return Frame(controller, bytes[3].toInt() and 255, bytes.copyOfRange(4, bytes.size))
                    }
                }
                else -> {
                    buffer.write(byte)
                    size++
                    if (size > MAX_FRAME) reset()
                }
            }
            return null
        }
    }
    /** First frame from the radio found in [bytes], or null. */
    fun parse(bytes: ByteArray, controller: Int = CONTROLLER): Frame? {
        val parser = Parser(controller)
        for (byte in bytes) parser.feed(byte.toInt())?.let { return it }
        return null
    }
}

/** VFO A = selected VFO (25 00), VFO B = unselected VFO (25 01). */
class IcomCivRig(
    private val transport: RadioBytes,
    private val address: Int = 0xA4,
    private val clock: () -> Long = { System.nanoTime() / 1_000_000 }
) : Rig, SettingsIo {
    override val model = RigModel.IC705
    override val supportsVfoB = true
    override val silentVfoB = true
    override val supportsSplit = true
    override val supportsMemories = true

    private fun hex(bytes: ByteArray) = bytes.joinToString(" ") { String.format(Locale.ROOT, "%02X", it.toInt() and 255) }
    private fun exchange(body: ByteArray, accept: (ByteArray) -> Boolean): ByteArray {
        val request = IcomCiv.frame(address, body)
        repeat(2) {
            transport.discardPending()
            transport.write(request, 500)
            val deadline = clock() + 500
            val parser = IcomCiv.Parser()
            while (true) {
                val left = deadline - clock()
                if (left <= 0) break
                val byte = try {
                    transport.read(1, left.toInt())[0].toInt() and 255
                } catch (_: IOException) {
                    break
                }
                val frame = parser.feed(byte) ?: continue
                if (frame.from != address) continue
                val reply = frame.body
                if (reply[0].toInt() and 255 == IcomCiv.NG) throw LocalizedIOException(UiText(R.string.err_rig_rejected, hex(body)))
                if (accept(reply)) return reply
            }
        }
        throw LocalizedIOException(UiText(R.string.err_rig_timeout))
    }
    private fun command(body: ByteArray) {
        exchange(body) { it[0].toInt() and 255 == IcomCiv.OK }
    }
    private fun query(body: ByteArray, size: Int): ByteArray =
        exchange(body) { it.size >= size && it[0] == body[0] && (body.size == 1 || it[1] == body[1]) }
    private fun readVfo(vfo: Vfo) = IcomCiv.decodeFrequency(query(IcomCiv.readVfoFrequency(vfo), 7), 2)

    override fun identify(): String {
        status()
        val id = query(IcomCiv.readId(), 3)[2].toInt() and 255
        return String.format(Locale.ROOT, "IC-705 @%02Xh ID %02Xh", address, id)
    }
    override fun status(): RigStatus {
        val frequency = IcomCiv.decodeFrequency(query(IcomCiv.readFrequency(), 6), 1)
        val mode = IcomCiv.mode(query(IcomCiv.readMode(), 2)[1].toInt() and 255)
        return RigStatus(frequency, mode)
    }
    override fun frequency(vfo: Vfo): Long = readVfo(vfo)
    override fun setFrequency(vfo: Vfo, hz: Long) {
        checkRange(model, hz)
        command(IcomCiv.setVfoFrequency(vfo, hz))
        checkUi(readVfo(vfo) == hz) { UiText(R.string.err_rig_unconfirmed) }
    }
    override fun setMode(mode: RigMode) = command(IcomCiv.setMode(mode))
    override fun ptt(on: Boolean) = command(IcomCiv.ptt(on))
    override fun setSplit(on: Boolean) = command(IcomCiv.split(on))
    override fun readSetting(setting: Ic705Setting): String {
        val body = IcomCiv.readSetting(setting)
        val reply = exchange(body) { it.size >= 4 && (0..3).all { index -> it[index] == body[index] } }
        return IcomCiv.settingDigits(setting, reply)
    }
    override fun writeSetting(setting: Ic705Setting, digits: String) = command(IcomCiv.writeSetting(setting, digits))
    override val supportsMeter = true
    override fun signalLevel(): Int = IcomCiv.decodeLevel(query(IcomCiv.readSMeter(), 4), 2)
    override val supportsRfPower = true
    override fun rfPower(): Int = IcomCiv.decodeLevel(query(IcomCiv.readRfPower(), 4), 2)
    override fun setRfPower(level: Int) {
        command(IcomCiv.setRfPower(level))
        checkUi(rfPower() == level) { UiText(R.string.err_rig_unconfirmed) }
    }
    override val supportsTxStatus = true
    override fun isTransmitting(): Boolean = when (query(IcomCiv.readTxStatus(), 3)[2].toInt() and 255) {
        0 -> false
        1 -> true
        else -> invalidReply()
    }
    override val supportsDataMode = true
    override fun dataModeOn(): Boolean = when (query(IcomCiv.readDataMode(), 4)[2].toInt() and 255) {
        0 -> false
        1 -> true
        else -> invalidReply()
    }
    override fun setDataMode(on: Boolean) {
        command(IcomCiv.setDataMode(on))
        checkUi(dataModeOn() == on) { UiText(R.string.err_rig_unconfirmed) }
    }
    override val supportsVfoMode = true
    override fun vfoMode(vfo: Vfo): RigMode? = IcomCiv.mode(query(IcomCiv.readVfoMode(vfo), 3)[2].toInt() and 255)
    override fun setVfoMode(vfo: Vfo, mode: RigMode) {
        command(IcomCiv.setVfoMode(vfo, mode))
        checkUi(vfoMode(vfo) == mode) { UiText(R.string.err_rig_unconfirmed) }
    }
    override fun memories(channels: IntRange, keepGoing: () -> Boolean): List<RigMemory> {
        requireUi(channels.first >= 0 && channels.last <= 99) { UiText(R.string.err_rig_channel, channels.last) }
        val list = ArrayList<RigMemory>()
        for (channel in channels) {
            if (!keepGoing()) break
            val body = IcomCiv.readMemory(channel)
            val reply = try {
                exchange(body) { it.size >= 2 && it[0].toInt() == 0x1A && it[1].toInt() == 0 }
            } catch (error: LocalizedIOException) {
                if (isRejected(error)) continue else throw error // NG for a channel the radio cannot report: treat as blank
            }
            IcomCiv.memory(reply.copyOfRange(2, reply.size))?.let(list::add)
        }
        return list
    }
    override val supportsMemoryWrite = false
    override fun writeMemory(memory: RigMemory) = unsupported("memory write")
}

/** Yaesu FTX-1, from the "FTX-1 Series CAT Operation Reference Manual" ENG 2508-C (38400 bps, 8N1; format p.4). */
object YaesuFtx1 {
    const val ID_REPLY = "ID0840;"
    const val DEFAULT_CHANNELS_FIRST = 1
    const val DEFAULT_CHANNELS_LAST = 99
    private fun side(vfo: Vfo) = if (vfo == Vfo.A) "FA" else "FB"

    // FTX-1 CAT Operation Reference Manual 2508-C, p.16 "FA FREQUENCY VFO MAIN-SIDE" / "FB FREQUENCY VFO SUB-SIDE"
    fun setFrequency(vfo: Vfo, hz: Long): String {
        requireUi(hz in 0..999_999_999L) { UiText(R.string.err_rig_range, mhzText(hz)) }
        return String.format(Locale.ROOT, "%s%09d;", side(vfo), hz)
    }
    // FTX-1 CAT Operation Reference Manual 2508-C, p.16 "FA FREQUENCY VFO MAIN-SIDE" / "FB FREQUENCY VFO SUB-SIDE"
    fun readFrequency(vfo: Vfo): String = side(vfo) + ";"
    fun parseFrequency(reply: String, vfo: Vfo): Long {
        if (!Regex("${side(vfo)}[0-9]{9};").matches(reply)) invalidReply()
        return reply.substring(2, 11).toLong()
    }
    // FTX-1 CAT Operation Reference Manual 2508-C, p.18 "MD MODE": P2 mode codes
    fun mode(code: Char): RigMode? = when (code) {
        '1' -> RigMode.LSB
        '2' -> RigMode.USB
        '3' -> RigMode.CW
        '4' -> RigMode.FM
        '5', 'D' -> RigMode.AM
        '6' -> RigMode.RTTY
        '7' -> RigMode.CW_R
        '8' -> RigMode.DATA_L
        '9' -> RigMode.RTTY_R
        'A', 'F' -> RigMode.DATA_FM
        'B' -> RigMode.FM_N
        'C', 'E' -> RigMode.DATA_U
        'H', 'I' -> RigMode.DV
        else -> null
    }
    fun modeCode(mode: RigMode): Char? = when (mode) {
        RigMode.LSB -> '1'
        RigMode.USB -> '2'
        RigMode.CW -> '3'
        RigMode.FM -> '4'
        RigMode.AM -> '5'
        RigMode.RTTY -> '6'
        RigMode.CW_R -> '7'
        RigMode.DATA_L -> '8'
        RigMode.RTTY_R -> '9'
        RigMode.DATA_FM -> 'A'
        RigMode.FM_N -> 'B'
        RigMode.DATA_U -> 'C'
        RigMode.DV -> 'H'
        else -> null
    }
    // FTX-1 CAT Operation Reference Manual 2508-C, p.18 "MD MODE" (P1 0 = MAIN)
    fun setMode(mode: RigMode): String =
        "MD0" + requireNotNullUi(modeCode(mode)) { UiText(R.string.err_rig_mode, mode.name) } + ";"
    // FTX-1 CAT Operation Reference Manual 2508-C, p.18 "MD MODE"
    fun readMode(): String = "MD0;"
    fun parseMode(reply: String): RigMode? {
        if (!Regex("MD0.;").matches(reply)) invalidReply()
        return mode(reply[3])
    }
    // FTX-1 CAT Operation Reference Manual 2508-C, p.25 "TX TX SET"
    fun ptt(on: Boolean): String = if (on) "TX1;" else "TX0;"
    // FTX-1 CAT Operation Reference Manual 2508-C, p.25 "ST SPLIT"
    fun split(on: Boolean): String = if (on) "ST1;" else "ST0;"
    // FTX-1 CAT Operation Reference Manual 2508-C, p.17 "ID IDENTIFICATION"
    fun readId(): String = "ID;"
    fun checkId(reply: String) = requireUi(reply == ID_REPLY) { UiText(R.string.err_rig_wrong_model, reply) }
    // FTX-1 CAT Operation Reference Manual 2508-C, p.19 "MR MEMORY CHANNEL READ"
    fun readMemory(channel: Int): String {
        requireUi(channel in 1..999) { UiText(R.string.err_rig_channel, channel) }
        return String.format(Locale.ROOT, "MR%05d;", channel)
    }
    // FTX-1 CAT Operation Reference Manual 2508-C, p.19 "MR MEMORY CHANNEL READ": 30 characters (name comes from MT)
    fun parseMemory(reply: String): RigMemory {
        if (reply.length != 30 || !reply.startsWith("MR") || !reply.endsWith(";") ||
            !reply.substring(2, 16).all { it in '0'..'9' }) invalidReply()
        return RigMemory(reply.substring(2, 7).toInt(), reply.substring(7, 16).toLong(), mode(reply[23]), "")
    }
    // FTX-1 CAT Operation Reference Manual 2508-C, p.20 "MT MEMORY CHANNEL TAG"
    fun readTag(channel: Int): String {
        requireUi(channel in 1..999) { UiText(R.string.err_rig_channel, channel) }
        return String.format(Locale.ROOT, "MT%05d;", channel)
    }
    fun parseTag(reply: String): String {
        if (reply.length != 20 || !reply.startsWith("MT") || !reply.endsWith(";") ||
            !reply.substring(2, 7).all { it in '0'..'9' }) invalidReply()
        return reply.substring(7, 19).filter { it.code in 32..126 }.trim()
    }
    // FTX-1 CAT Operation Reference Manual 2508-C, p.19 "MW MEMORY CHANNEL WRITE": same 30-character layout as the MR answer
    // (P1 channel, P2 frequency, P3 clarifier direction + offset, P4/P5 RX/TX clarifier, P6 mode, P7 1 = memory, P8 tone, P9 fixed, P10 simplex)
    fun writeMemory(channel: Int, hz: Long, mode: RigMode): String {
        requireUi(channel in 1..999) { UiText(R.string.err_rig_channel, channel) }
        requireUi(hz in 30_000L..470_000_000L) { UiText(R.string.err_rig_range, mhzText(hz)) }
        val code = requireNotNullUi(modeCode(mode)) { UiText(R.string.err_rig_mode, mode.name) }
        return String.format(Locale.ROOT, "MW%05d%09d+0000", channel, hz) + "00" + code + "10" + "00" + "0;"
    }
    // FTX-1 CAT Operation Reference Manual 2508-C, p.20 "MT MEMORY CHANNEL TAG": 12 characters, padded with spaces
    fun writeTag(channel: Int, tag: String): String {
        requireUi(channel in 1..999) { UiText(R.string.err_rig_channel, channel) }
        val text = tag.take(12).map { if (it.code in 0x20..0x7E && it != ';') it else ' ' }.joinToString("")
        return String.format(Locale.ROOT, "MT%05d", channel) + text.padEnd(12) + ";"
    }
    // FTX-1 CAT Operation Reference Manual 2508-C, p.20 "MZ SPLIT MEMORY": P2 0 = simplex, 1 = split; P3 TX frequency (9 digits)
    // A real FTX-1 answers MZ for a simplex channel with P2 = 0 followed by its RX frequency, so the same form is written.
    fun writeSplit(channel: Int, txHz: Long?, rxHz: Long): String {
        requireUi(channel in 1..999) { UiText(R.string.err_rig_channel, channel) }
        if (txHz == null) return String.format(Locale.ROOT, "MZ%05d0%09d;", channel, rxHz)
        requireUi(txHz in 30_000L..470_000_000L) { UiText(R.string.err_rig_range, mhzText(txHz)) }
        return String.format(Locale.ROOT, "MZ%05d1%09d;", channel, txHz)
    }
    private fun sideDigit(side: Int): Char {
        requireUi(side in 0..1) { UiText(R.string.err_rig_reply_invalid) }
        return '0' + side
    }
    private fun level(name: String, side: Int, value: Int): String {
        requireUi(value in 0..255) { UiText(R.string.err_rig_range, value.toString()) }
        return String.format(Locale.ROOT, "%s%c%03d;", name, sideDigit(side), value)
    }
    private fun parseLevel(reply: String, name: String, side: Int): Int {
        if (!Regex("$name${sideDigit(side)}[0-9]{3};").matches(reply)) invalidReply()
        return reply.substring(3, 6).toInt().also { if (it > 255) invalidReply() }
    }
    // FTX-1 CAT Operation Reference Manual 2508-C "SM S-METER READING": SM P1; (P1 0 = MAIN, 1 = SUB), answer SM P1 P2P2P2; 000-255, read only
    fun readSMeter(side: Int = 0): String = "SM" + sideDigit(side) + ";"
    fun parseSMeter(reply: String, side: Int = 0): Int = parseLevel(reply, "SM", side)
    // FTX-1 CAT Operation Reference Manual 2508-C "RM READ METER": P1 1 S(MAIN) 2 S(SUB) 3 COMP 4 ALC 5 PO 6 SWR 7 IDD 8 VDD, answer RM P1 P2P2P2 P3P3P3; read only
    fun readMeter(meter: Int): String {
        requireUi(meter in 1..8) { UiText(R.string.err_rig_reply_invalid) }
        return "RM$meter;"
    }
    fun parseMeter(reply: String, meter: Int): Int {
        if (!Regex("RM$meter[0-9]{6};").matches(reply)) invalidReply()
        return reply.substring(3, 6).toInt().also { if (it > 255) invalidReply() }
    }
    // FTX-1 CAT Operation Reference Manual 2508-C "AG AF GAIN": AG P1 P2P2P2; 000-255, read AG P1;
    fun setAfGain(side: Int, value: Int): String = level("AG", side, value)
    fun readAfGain(side: Int): String = "AG" + sideDigit(side) + ";"
    fun parseAfGain(reply: String, side: Int): Int = parseLevel(reply, "AG", side)
    // FTX-1 CAT Operation Reference Manual 2508-C "RG RF GAIN": RG P1 P2P2P2; 000-255, read RG P1;
    fun setRfGain(side: Int, value: Int): String = level("RG", side, value)
    fun readRfGain(side: Int): String = "RG" + sideDigit(side) + ";"
    fun parseRfGain(reply: String, side: Int): Int = parseLevel(reply, "RG", side)
    // FTX-1 CAT Operation Reference Manual 2508-C "SQ SQUELCH LEVEL": SQ P1 P2P2P2; 000-255, read SQ P1;
    fun setSquelch(side: Int, value: Int): String = level("SQ", side, value)
    fun readSquelch(side: Int): String = "SQ" + sideDigit(side) + ";"
    fun parseSquelch(reply: String, side: Int): Int = parseLevel(reply, "SQ", side)
    // FTX-1 CAT Operation Reference Manual 2508-C "SH WIDTH": SH P1 0 P3P3; P3 00-23 indexes "Table 5 (Bandwidth Chart)"; the Hz depends on the mode, so only the index is shown
    fun setWidth(side: Int, index: Int): String {
        requireUi(index in 0..23) { UiText(R.string.err_rig_range, index.toString()) }
        return String.format(Locale.ROOT, "SH%c0%02d;", sideDigit(side), index)
    }
    fun readWidth(side: Int): String = "SH" + sideDigit(side) + ";"
    fun parseWidth(reply: String, side: Int): Int {
        if (!Regex("SH${sideDigit(side)}0[0-9]{2};").matches(reply)) invalidReply()
        return reply.substring(4, 6).toInt().also { if (it > 23) invalidReply() }
    }
    fun widthText(index: Int): String = String.format(Locale.ROOT, "Tabla 5: %02d", index)
    // FTX-1 CAT Operation Reference Manual 2508-C "IS IF SHIFT": IS P1 0 P3 P4P4P4P4; P3 '+'/'-', 0000-1200 Hz in 20 Hz steps, read IS P1;
    fun setIfShift(side: Int, hz: Int): String {
        requireUi(hz in -1200..1200 && hz % 20 == 0) { UiText(R.string.err_rig_range, hz.toString()) }
        return String.format(Locale.ROOT, "IS%c0%c%04d;", sideDigit(side), if (hz < 0) '-' else '+', Math.abs(hz))
    }
    fun readIfShift(side: Int): String = "IS" + sideDigit(side) + ";"
    fun parseIfShift(reply: String, side: Int): Int {
        if (!Regex("IS${sideDigit(side)}0[+-][0-9]{4};").matches(reply)) invalidReply()
        val hz = reply.substring(5, 9).toInt()
        if (hz > 1200 || hz % 20 != 0) invalidReply()
        return if (reply[4] == '-') -hz else hz
    }
    // FTX-1 CAT Operation Reference Manual 2508-C "GT AGC FUNCTION": set P2 0 OFF 1 FAST 2 MID 3 SLOW 4 AUTO; read GT P1; answers GT P1 P3; P3 0 OFF 1 FAST 2 MID 3 SLOW 4 AUTO-FAST 5 AUTO-MID 6 AUTO-SLOW
    fun setAgc(side: Int, mode: Int): String {
        requireUi(mode in 0..4) { UiText(R.string.err_rig_range, mode.toString()) }
        return "GT" + sideDigit(side) + mode + ";"
    }
    fun readAgc(side: Int): String = "GT" + sideDigit(side) + ";"
    fun parseAgc(reply: String, side: Int): Int {
        if (!Regex("GT${sideDigit(side)}[0-6];").matches(reply)) invalidReply()
        return reply[3] - '0'
    }
    /** True when the GT answer [answer] is what the GT set [mode] should leave (AUTO may answer AUTO-FAST/MID/SLOW). */
    fun agcMatches(mode: Int, answer: Int): Boolean = if (mode == 4) answer in 4..6 else answer == mode
    // FTX-1 CAT Operation Reference Manual 2508-C "PA PRE-AMP (IPO)": P1 0 HF/50 (P2 0 IPO 1 AMP1 2 AMP2), 1 VHF (P2 0 OFF 1 ON), 2 UHF (P2 0 OFF 1 ON); read PA P1;
    fun setPreamp(band: Int, value: Int): String {
        requireUi(band in 0..2) { UiText(R.string.err_rig_range, band.toString()) }
        requireUi(value in 0..(if (band == 0) 2 else 1)) { UiText(R.string.err_rig_range, value.toString()) }
        return "PA$band$value;"
    }
    fun readPreamp(band: Int): String {
        requireUi(band in 0..2) { UiText(R.string.err_rig_range, band.toString()) }
        return "PA$band;"
    }
    fun parsePreamp(reply: String, band: Int): Int {
        if (!Regex("PA$band[0-${if (band == 0) 2 else 1}];").matches(reply)) invalidReply()
        return reply[3] - '0'
    }
    // FTX-1 CAT Operation Reference Manual 2508-C "RA RF ATTENUATOR": RA 0 P2; P2 0 OFF 1 ON, read RA0;
    fun setAttenuator(on: Boolean): String = if (on) "RA01;" else "RA00;"
    fun readAttenuator(): String = "RA0;"
    fun parseAttenuator(reply: String): Boolean {
        if (!Regex("RA0[01];").matches(reply)) invalidReply()
        return reply[3] == '1'
    }
    /** Watts the radio accepts for the PC head P1: 1 = FTX-1 field head 5-10 W, 2 = SPA-1 5-100 W. */
    fun powerRange(head: Int): IntRange? = when (head) { 1 -> 5..10; 2 -> 5..100; else -> null }
    // FTX-1 CAT Operation Reference Manual 2508-C "PC POWER CONTROL": PC P1 P2P2P2; read PC; answer PC P1 P2P2P2;
    // [head] is the P1 the radio reported; a value outside that head's range is never sent.
    fun setPower(head: Int, watts: Int): String {
        val range = requireNotNullUi(powerRange(head)) { UiText(R.string.err_rig_reply_invalid) }
        requireUi(watts in range) { UiText(R.string.err_rig_range, watts.toString()) }
        return String.format(Locale.ROOT, "PC%d%03d;", head, watts)
    }
    fun readPower(): String = "PC;"
    /** (head, watts) */
    fun parsePower(reply: String): Pair<Int, Int> {
        if (!Regex("PC[12][0-9]{3};").matches(reply)) invalidReply()
        return (reply[2] - '0') to reply.substring(3, 6).toInt()
    }
    private fun flag(name: String, side: Int, on: Boolean) = name + sideDigit(side) + (if (on) '1' else '0') + ";"
    private fun parseFlag(reply: String, name: String, side: Int): Boolean {
        if (!Regex("$name${sideDigit(side)}[01];").matches(reply)) invalidReply()
        return reply[3] == '1'
    }
    // FTX-1 CAT Operation Reference Manual 2508-C "NL NOISE BLANKER LEVEL" (third_party/ftx1): NL P1 P2P2P2; 000 = OFF, 001-010; read NL P1;
    fun setNoiseBlanker(side: Int, level: Int): String {
        requireUi(level in 0..10) { UiText(R.string.err_rig_value, level) }
        return String.format(Locale.ROOT, "NL%c%03d;", sideDigit(side), level)
    }
    fun readNoiseBlanker(side: Int): String = "NL" + sideDigit(side) + ";"
    fun parseNoiseBlanker(reply: String, side: Int): Int {
        if (!Regex("NL${sideDigit(side)}[0-9]{3};").matches(reply)) invalidReply()
        return reply.substring(3, 6).toInt().also { if (it > 10) invalidReply() }
    }
    // FTX-1 CAT Operation Reference Manual 2508-C "RL NOISE REDUCTION LEVEL" (third_party/ftx1): RL P1 P2P2; 00 = OFF, 01-10; read RL P1;
    fun setNoiseReduction(side: Int, level: Int): String {
        requireUi(level in 0..10) { UiText(R.string.err_rig_value, level) }
        return String.format(Locale.ROOT, "RL%c%02d;", sideDigit(side), level)
    }
    fun readNoiseReduction(side: Int): String = "RL" + sideDigit(side) + ";"
    fun parseNoiseReduction(reply: String, side: Int): Int {
        if (!Regex("RL${sideDigit(side)}[0-9]{2};").matches(reply)) invalidReply()
        return reply.substring(3, 5).toInt().also { if (it > 10) invalidReply() }
    }
    // FTX-1 CAT Operation Reference Manual 2508-C "BC AUTO NOTCH" (third_party/ftx1): BC P1 P2; P2 0 OFF 1 ON; read BC P1;
    fun setAutoNotch(side: Int, on: Boolean): String = flag("BC", side, on)
    fun readAutoNotch(side: Int): String = "BC" + sideDigit(side) + ";"
    fun parseAutoNotch(reply: String, side: Int): Boolean = parseFlag(reply, "BC", side)
    // FTX-1 CAT Operation Reference Manual 2508-C "BP MANUAL NOTCH" (third_party/ftx1): BP P1 0 P3P3P3; 000 OFF / 001 ON; read BP P1 0;
    fun setManualNotch(side: Int, on: Boolean): String =
        "BP" + sideDigit(side) + "0" + (if (on) "001" else "000") + ";"
    fun readManualNotch(side: Int): String = "BP" + sideDigit(side) + "0;"
    fun parseManualNotch(reply: String, side: Int): Boolean {
        if (!Regex("BP${sideDigit(side)}0[0-9]{3};").matches(reply)) invalidReply()
        return when (reply.substring(4, 7)) { "000" -> false; "001" -> true; else -> invalidReply() }
    }
    // FTX-1 CAT Operation Reference Manual 2508-C "BP MANUAL NOTCH" (third_party/ftx1): BP P1 1 P3P3P3; 001-320 x 10 Hz; read BP P1 1;
    fun setManualNotchFrequency(side: Int, step: Int): String {
        requireUi(step in 1..320) { UiText(R.string.err_rig_value, step) }
        return String.format(Locale.ROOT, "BP%c1%03d;", sideDigit(side), step)
    }
    fun readManualNotchFrequency(side: Int): String = "BP" + sideDigit(side) + "1;"
    /** Notch frequency in 10 Hz steps; null when the radio answers with letters (e.g. BP01F35; in FM: no notch available). */
    fun parseManualNotchFrequency(reply: String, side: Int): Int? {
        if (!Regex("BP${sideDigit(side)}1[0-9A-Za-z]{3};").matches(reply)) invalidReply()
        val text = reply.substring(4, 7)
        if (!text.all { it in '0'..'9' }) return null
        return text.toInt().also { if (it !in 1..320) invalidReply() }
    }
    fun notchHz(step: Int): Int = step * 10
    // FTX-1 CAT Operation Reference Manual 2508-C "NA NARROW" (third_party/ftx1): NA P1 P2; P2 0 OFF 1 ON; read NA P1;
    fun setNarrow(side: Int, on: Boolean): String = flag("NA", side, on)
    fun readNarrow(side: Int): String = "NA" + sideDigit(side) + ";"
    fun parseNarrow(reply: String, side: Int): Boolean = parseFlag(reply, "NA", side)
    // FTX-1 CAT Operation Reference Manual 2508-C "CF CLARIFIER" (third_party/ftx1): CF P1 0 0 P4 P5 000; P4 RX clarifier, P5 TX clarifier, 0 OFF 1 ON; read CF P1 00;
    fun setClarifier(side: Int, rx: Boolean, tx: Boolean): String =
        "CF" + sideDigit(side) + "00" + (if (rx) '1' else '0') + (if (tx) '1' else '0') + "000;"
    fun readClarifier(side: Int): String = "CF" + sideDigit(side) + "00;"
    /** (RX clarifier on, TX clarifier on) */
    fun parseClarifier(reply: String, side: Int): Pair<Boolean, Boolean> {
        if (!Regex("CF${sideDigit(side)}00[01][01]000;").matches(reply)) invalidReply()
        return (reply[5] == '1') to (reply[6] == '1')
    }
    // FTX-1 CAT Operation Reference Manual 2508-C "CF CLARIFIER" (third_party/ftx1): CF P1 0 1 P4 P5P5P5P5; P4 '+'/'-', 0000-9999 Hz; read CF P1 01;
    fun setClarifierOffset(side: Int, hz: Int): String {
        requireUi(hz in -9999..9999) { UiText(R.string.err_rig_value, hz) }
        return String.format(Locale.ROOT, "CF%c01%c%04d;", sideDigit(side), if (hz < 0) '-' else '+', Math.abs(hz))
    }
    fun readClarifierOffset(side: Int): String = "CF" + sideDigit(side) + "01;"
    fun parseClarifierOffset(reply: String, side: Int): Int {
        if (!Regex("CF${sideDigit(side)}01[+-][0-9]{4};").matches(reply)) invalidReply()
        val hz = reply.substring(6, 10).toInt()
        return if (reply[5] == '-') -hz else hz
    }
    // FTX-1 CAT Operation Reference Manual 2508-C "KS KEYER SPEED" (third_party/ftx1): KS P1P1P1; 004-060 WPM; read KS;
    fun setKeySpeed(wpm: Int): String {
        requireUi(wpm in 4..60) { UiText(R.string.err_rig_value, wpm) }
        return String.format(Locale.ROOT, "KS%03d;", wpm)
    }
    fun readKeySpeed(): String = "KS;"
    fun parseKeySpeed(reply: String): Int {
        if (!Regex("KS[0-9]{3};").matches(reply)) invalidReply()
        return reply.substring(2, 5).toInt().also { if (it !in 4..60) invalidReply() }
    }
    // FTX-1 CAT Operation Reference Manual 2508-C "LK LOCK" (third_party/ftx1): LK P1; P1 0 OFF 1 ON; read LK;
    fun setLock(on: Boolean): String = if (on) "LK1;" else "LK0;"
    fun readLock(): String = "LK;"
    fun parseLock(reply: String): Boolean {
        if (!Regex("LK[01];").matches(reply)) invalidReply()
        return reply[2] == '1'
    }
    // FTX-1 CAT Operation Reference Manual 2508-C, p.20 "MZ SPLIT MEMORY"
    fun readSplit(channel: Int): String {
        requireUi(channel in 1..999) { UiText(R.string.err_rig_channel, channel) }
        return String.format(Locale.ROOT, "MZ%05d;", channel)
    }
    /** TX frequency of a split channel, null for a simplex one. */
    fun parseSplit(reply: String): Long? {
        if (reply.length != 18 || !reply.startsWith("MZ") || !reply.endsWith(";") ||
            !reply.substring(2, 17).all { it in '0'..'9' }) invalidReply()
        return when (reply[7]) {
            '0' -> null
            '1' -> reply.substring(8, 17).toLong()
            else -> invalidReply()
        }
    }
}

/** VFO A = MAIN (FA), VFO B = SUB (FB). */
class Ftx1Rig(transport: RadioBytes) : Rig {
    private val link = AsciiLink(transport)
    override val model = RigModel.FTX1
    override val supportsVfoB = true
    override val silentVfoB = true
    override val supportsSplit = true
    override val supportsMemories = true

    private fun read(vfo: Vfo): Long =
        YaesuFtx1.parseFrequency(link.request(YaesuFtx1.readFrequency(vfo), if (vfo == Vfo.A) "FA" else "FB"), vfo)
    override fun identify(): String {
        val reply = link.request(YaesuFtx1.readId(), "ID")
        YaesuFtx1.checkId(reply)
        return "FTX-1 " + reply.removeSuffix(";")
    }
    override fun firmwareVersion(): String? = try {
        link.request(YaesuFtx1.readId(), "ID").also { YaesuFtx1.checkId(it) }.removeSuffix(";")
    } catch (error: LocalizedIOException) { null }
    override fun status(): RigStatus =
        RigStatus(read(Vfo.A), YaesuFtx1.parseMode(link.request(YaesuFtx1.readMode(), "MD")))
    override fun frequency(vfo: Vfo): Long = read(vfo)
    /** MAIN S-meter, raw 0-255 (SM0;). Read only. */
    fun signal(): Int = YaesuFtx1.parseSMeter(link.request(YaesuFtx1.readSMeter(0), "SM"), 0)
    fun meter(meter: Int): Int = YaesuFtx1.parseMeter(link.request(YaesuFtx1.readMeter(meter), "RM"), meter)
    // Each setter validates before sending (a rejected value sends nothing) and reads the value back like the other sets.
    private fun setLevel(set: String, read: String, expected: Int, parse: (String) -> Int) =
        confirm(set, read) { parse(it) == expected }
    fun setAfGain(side: Int, value: Int) = setLevel(YaesuFtx1.setAfGain(side, value), YaesuFtx1.readAfGain(side), value) { YaesuFtx1.parseAfGain(it, side) }
    fun setRfGain(side: Int, value: Int) = setLevel(YaesuFtx1.setRfGain(side, value), YaesuFtx1.readRfGain(side), value) { YaesuFtx1.parseRfGain(it, side) }
    fun setSquelch(side: Int, value: Int) = setLevel(YaesuFtx1.setSquelch(side, value), YaesuFtx1.readSquelch(side), value) { YaesuFtx1.parseSquelch(it, side) }
    fun setWidth(side: Int, index: Int) = setLevel(YaesuFtx1.setWidth(side, index), YaesuFtx1.readWidth(side), index) { YaesuFtx1.parseWidth(it, side) }
    fun setIfShift(side: Int, hz: Int) = setLevel(YaesuFtx1.setIfShift(side, hz), YaesuFtx1.readIfShift(side), hz) { YaesuFtx1.parseIfShift(it, side) }
    fun setPreamp(band: Int, value: Int) = setLevel(YaesuFtx1.setPreamp(band, value), YaesuFtx1.readPreamp(band), value) { YaesuFtx1.parsePreamp(it, band) }
    fun setAgc(side: Int, mode: Int) {
        val set = YaesuFtx1.setAgc(side, mode)
        confirm(set, YaesuFtx1.readAgc(side)) { YaesuFtx1.agcMatches(mode, YaesuFtx1.parseAgc(it, side)) }
    }
    fun setAttenuator(on: Boolean) =
        confirm(YaesuFtx1.setAttenuator(on), YaesuFtx1.readAttenuator()) { YaesuFtx1.parseAttenuator(it) == on }
    /** Output power, checked against the range of the head the radio reports with PC; (nothing is sent when it is out of range). */
    fun setPower(watts: Int) = link.transaction {
        val head = YaesuFtx1.parsePower(link.request(YaesuFtx1.readPower(), "PC")).first
        val set = YaesuFtx1.setPower(head, watts)
        confirm(set, YaesuFtx1.readPower()) { YaesuFtx1.parsePower(it) == head to watts }
    }
    override fun setFrequency(vfo: Vfo, hz: Long) {
        checkRange(model, hz)
        link.transaction {
            link.send(YaesuFtx1.setFrequency(vfo, hz))
            link.confirm(hz) { read(vfo) }
        }
    }
    // Receive-only extras: every value is range-checked before sending and read back; nothing here keys the transmitter.
    private fun query(command: String) = link.request(command, command.dropLast(1))
    fun noiseBlanker(side: Int) = YaesuFtx1.parseNoiseBlanker(query(YaesuFtx1.readNoiseBlanker(side)), side)
    fun setNoiseBlanker(side: Int, level: Int) = setLevel(YaesuFtx1.setNoiseBlanker(side, level), YaesuFtx1.readNoiseBlanker(side), level) { YaesuFtx1.parseNoiseBlanker(it, side) }
    fun noiseReduction(side: Int) = YaesuFtx1.parseNoiseReduction(query(YaesuFtx1.readNoiseReduction(side)), side)
    fun setNoiseReduction(side: Int, level: Int) = setLevel(YaesuFtx1.setNoiseReduction(side, level), YaesuFtx1.readNoiseReduction(side), level) { YaesuFtx1.parseNoiseReduction(it, side) }
    fun autoNotch(side: Int) = YaesuFtx1.parseAutoNotch(query(YaesuFtx1.readAutoNotch(side)), side)
    fun setAutoNotch(side: Int, on: Boolean) = confirm(YaesuFtx1.setAutoNotch(side, on), YaesuFtx1.readAutoNotch(side)) { YaesuFtx1.parseAutoNotch(it, side) == on }
    fun manualNotch(side: Int) = YaesuFtx1.parseManualNotch(query(YaesuFtx1.readManualNotch(side)), side)
    fun setManualNotch(side: Int, on: Boolean) = confirm(YaesuFtx1.setManualNotch(side, on), YaesuFtx1.readManualNotch(side)) { YaesuFtx1.parseManualNotch(it, side) == on }
    /** Notch frequency in 10 Hz steps (001-320); null when the radio has no notch in the current mode (e.g. FM). */
    fun manualNotchFrequency(side: Int) = YaesuFtx1.parseManualNotchFrequency(query(YaesuFtx1.readManualNotchFrequency(side)), side)
    /** An unavailable (non-numeric) answer never matches, so it is reported as an unconfirmed setting. */
    fun setManualNotchFrequency(side: Int, step: Int) =
        confirm(YaesuFtx1.setManualNotchFrequency(side, step), YaesuFtx1.readManualNotchFrequency(side)) { YaesuFtx1.parseManualNotchFrequency(it, side) == step }
    fun narrow(side: Int) = YaesuFtx1.parseNarrow(query(YaesuFtx1.readNarrow(side)), side)
    fun setNarrow(side: Int, on: Boolean) = confirm(YaesuFtx1.setNarrow(side, on), YaesuFtx1.readNarrow(side)) { YaesuFtx1.parseNarrow(it, side) == on }
    fun clarifier(side: Int) = YaesuFtx1.parseClarifier(query(YaesuFtx1.readClarifier(side)), side)
    fun setClarifier(side: Int, rx: Boolean, tx: Boolean) =
        confirm(YaesuFtx1.setClarifier(side, rx, tx), YaesuFtx1.readClarifier(side)) { YaesuFtx1.parseClarifier(it, side) == (rx to tx) }
    fun clarifierOffset(side: Int) = YaesuFtx1.parseClarifierOffset(query(YaesuFtx1.readClarifierOffset(side)), side)
    fun setClarifierOffset(side: Int, hz: Int) = setLevel(YaesuFtx1.setClarifierOffset(side, hz), YaesuFtx1.readClarifierOffset(side), hz) { YaesuFtx1.parseClarifierOffset(it, side) }
    fun keySpeed() = YaesuFtx1.parseKeySpeed(query(YaesuFtx1.readKeySpeed()))
    fun setKeySpeed(wpm: Int) = setLevel(YaesuFtx1.setKeySpeed(wpm), YaesuFtx1.readKeySpeed(), wpm) { YaesuFtx1.parseKeySpeed(it) }
    fun lock() = YaesuFtx1.parseLock(query(YaesuFtx1.readLock()))
    fun setLock(on: Boolean) = confirm(YaesuFtx1.setLock(on), YaesuFtx1.readLock()) { YaesuFtx1.parseLock(it) == on }

    override val supportsMeter = true
    override fun signalLevel(): Int = signal()
    override val supportsRfPower = true
    /** The output power as 0..255 of the maximum of the head the radio reports with PC; (5-10 W or 5-100 W). */
    override fun rfPower(): Int {
        val (head, watts) = YaesuFtx1.parsePower(link.request(YaesuFtx1.readPower(), "PC"))
        val max = requireNotNullUi(YaesuFtx1.powerRange(head)) { UiText(R.string.err_rig_reply_invalid) }.last
        return (watts * 255 / max).coerceIn(0, 255)
    }
    override fun setRfPower(level: Int) {
        requireUi(level in 0..255) { UiText(R.string.err_rig_value, level) }
        val head = YaesuFtx1.parsePower(link.request(YaesuFtx1.readPower(), "PC")).first
        val range = requireNotNullUi(YaesuFtx1.powerRange(head)) { UiText(R.string.err_rig_reply_invalid) }
        setPower(Math.round(level * range.last / 255.0).toInt().coerceIn(range))
    }
    // Set commands have no answer (manual p.4), so each one is confirmed with its read command.
    private fun confirm(set: String, read: String, accepted: (String) -> Boolean) = link.transaction {
        link.send(set)
        checkUi(accepted(link.request(read, read.dropLast(1)))) { UiText(R.string.err_rig_unconfirmed) }
    }
    override fun setMode(mode: RigMode) = confirm(YaesuFtx1.setMode(mode), YaesuFtx1.readMode()) { it == YaesuFtx1.setMode(mode) }
    // TX answer 2 = RADIO TX ON, CAT TX OFF (p.25): still transmitting, so only an exact TX0 counts as released.
    override fun ptt(on: Boolean) = confirm(YaesuFtx1.ptt(on), "TX;") { if (on) it == "TX1;" || it == "TX2;" else it == "TX0;" }
    override fun setSplit(on: Boolean) = confirm(YaesuFtx1.split(on), "ST;") { it == YaesuFtx1.split(on) }
    override fun memories(channels: IntRange, keepGoing: () -> Boolean): List<RigMemory> {
        val list = ArrayList<RigMemory>()
        for (channel in channels) {
            if (!keepGoing()) break
            val memory = try {
                YaesuFtx1.parseMemory(link.request(YaesuFtx1.readMemory(channel), "MR"))
            } catch (error: LocalizedIOException) {
                if (isRejected(error)) continue else throw error
            }
            val name = try {
                YaesuFtx1.parseTag(link.request(YaesuFtx1.readTag(channel), "MT"))
            } catch (error: LocalizedIOException) {
                if (isRejected(error)) "" else throw error
            }
            val split = try {
                YaesuFtx1.parseSplit(link.request(YaesuFtx1.readSplit(channel), "MZ"))
            } catch (error: LocalizedIOException) {
                if (isRejected(error)) null else throw error
            }
            list.add(memory.copy(name = name, txHz = split))
        }
        return list
    }
    override val supportsMemoryWrite = true
    override fun writeMemory(memory: RigMemory) {
        val channel = memory.channel
        val mode = requireNotNullUi(memory.mode) { UiText(R.string.err_rig_mode, "?") }
        checkRange(model, memory.frequencyHz)
        memory.txHz?.let { checkRange(model, it) }
        val tag = YaesuFtx1.writeTag(channel, memory.name)
        link.send(YaesuFtx1.writeMemory(channel, memory.frequencyHz, mode))
        link.send(tag)
        link.send(YaesuFtx1.writeSplit(channel, memory.txHz, memory.frequencyHz))
        // The writes have no answer (manual p.4): read the channel back.
        val stored = YaesuFtx1.parseMemory(link.request(YaesuFtx1.readMemory(channel), "MR"))
        val name = YaesuFtx1.parseTag(link.request(YaesuFtx1.readTag(channel), "MT"))
        val split = YaesuFtx1.parseSplit(link.request(YaesuFtx1.readSplit(channel), "MZ"))
        checkUi(stored.frequencyHz == memory.frequencyHz && stored.mode == mode &&
            name == YaesuFtx1.parseTag(tag) && split == memory.txHz) { UiText(R.string.err_rig_unconfirmed) }
    }
}

/**
 * (tr)uSDX CAT: a subset of the Kenwood TS-480 commands, from DL2MAN "5 (tr)uSDX Details", section "(tr)uSDX supported
 * CAT commands" (https://dl2man.de/5-trusdx-details/).  115200 bps 8N1 (measured; 38400 returns garbage); no ID; support (answers "?;"); DTR and
 * RTS stay low (RTS high keys the radio and a DTR/RTS toggle resets it).
 */
object KenwoodTs480Subset {
    const val ID_REPLY = "ID020;"
    const val AUDIO_OFF = "UA0;"
    const val AUDIO_ON_SPEAKER_OFF = "UA2;"
    const val RELEASE = ";RX;UA0;"
    const val RX_RATE = 7825
    const val TX_RATE = 11520

    // DL2MAN "(tr)uSDX supported CAT commands": FA set (11 digits)
    fun setFrequency(hz: Long): String {
        requireUi(hz in 0..99_999_999_999L) { UiText(R.string.err_rig_range, mhzText(hz)) }
        return String.format(Locale.ROOT, "FA%011d;", hz)
    }
    // DL2MAN "(tr)uSDX supported CAT commands": FA read
    fun readFrequency(): String = "FA;"
    fun parseFrequency(reply: String): Long {
        if (!Regex("FA[0-9]{11};").matches(reply)) invalidReply()
        return reply.substring(2, 13).toLong()
    }
    // DL2MAN "(tr)uSDX supported CAT commands": MD 1 LSB, 2 USB, 3 CW, 4 FM, 5 AM
    fun mode(code: Char): RigMode? = when (code) {
        '1' -> RigMode.LSB
        '2' -> RigMode.USB
        '3' -> RigMode.CW
        '4' -> RigMode.FM
        '5' -> RigMode.AM
        else -> null
    }
    fun setMode(mode: RigMode): String {
        val code = when (mode) {
            RigMode.LSB -> '1'
            RigMode.USB -> '2'
            RigMode.CW -> '3'
            RigMode.FM -> '4'
            RigMode.AM -> '5'
            else -> throw LocalizedArgumentException(UiText(R.string.err_rig_mode, mode.name))
        }
        return "MD$code;"
    }
    // DL2MAN "(tr)uSDX supported CAT commands": MD read
    fun readMode(): String = "MD;"
    fun parseMode(reply: String): RigMode? {
        if (!Regex("MD.;").matches(reply)) invalidReply()
        return mode(reply[2])
    }
    // DL2MAN "(tr)uSDX supported CAT commands": TX0 transmit, RX receive
    // The leading ';' ends any CAT audio stream still open ("US...;"), so PTT changes are always parsed as commands.
    fun ptt(on: Boolean): String = if (on) ";TX0;" else ";RX;"
    // DL2MAN "(tr)uSDX supported CAT commands": ID answers ID020 (the TS-480 it emulates)
    fun readId(): String = "ID;"
    fun checkId(reply: String) = requireUi(reply == ID_REPLY) { UiText(R.string.err_rig_wrong_model, reply) }
}

/** CAT audio streaming of the (tr)uSDX (DL2MAN "(tr)uSDX supported CAT commands", UA/US): unsigned 8-bit samples between "US" and ';'. */
object TruSdxStream {
    // DL2MAN "(tr)uSDX supported CAT commands", US: u8 samples, 0x3B (';') would end the stream and is replaced by 0x3A
    fun encode(samples: ShortArray): ByteArray = ByteArray(samples.size) {
        val value = (samples[it].toInt() shr 8) + 128
        (if (value == 0x3B) 0x3A else value).toByte()
    }
    fun decoder() = Decoder()

    class Decoder {
        private var streaming = false
        private var previous = 0
        fun feed(bytes: ByteArray): ShortArray {
            val out = ShortArray(bytes.size)
            var count = 0
            for (item in bytes) {
                val byte = item.toInt() and 255
                if (streaming) {
                    if (byte == ';'.code) { streaming = false; previous = 0 }
                    else out[count++] = ((byte - 128) shl 8).toShort()
                } else if (previous == 'U'.code && byte == 'S'.code) {
                    streaming = true
                    previous = 0
                } else previous = byte
            }
            return out.copyOf(count)
        }
    }
}

/** Single VFO, no split, no memories. */
class TruSdxRig(
    private val transport: RadioBytes,
    private val clock: () -> Long = { System.nanoTime() / 1_000_000 },
    private val sleep: (Long) -> Unit = Thread::sleep
) : Rig {
    private val link = AsciiLink(transport)
    override val model = RigModel.TRUSDX
    override val supportsVfoB = false
    override val silentVfoB = false
    override val supportsSplit = false
    override val supportsMemories = false

    private fun read(): Long = KenwoodTs480Subset.parseFrequency(link.request(KenwoodTs480Subset.readFrequency(), "FA"))
    private fun onlyA(vfo: Vfo) {
        if (vfo == Vfo.B) unsupported("VFO B")
    }
    // The (tr)uSDX answers "?;" to ID;, so it is identified by a valid 11-digit FA; reply. It needs ~1.5 s after the port opens.
    override fun identify(): String {
        sleep(OPEN_DELAY_MS)
        val hz = read()
        return "(tr)uSDX " + mhzText(hz) + " MHz"
    }
    override fun status(): RigStatus =
        RigStatus(read(), KenwoodTs480Subset.parseMode(link.request(KenwoodTs480Subset.readMode(), "MD")))
    override fun frequency(vfo: Vfo): Long {
        onlyA(vfo)
        return read()
    }
    override fun setFrequency(vfo: Vfo, hz: Long) {
        onlyA(vfo)
        checkRange(model, hz)
        link.transaction {
            link.send(KenwoodTs480Subset.setFrequency(hz))
            link.confirm(hz) { read() }
        }
    }
    override fun setMode(mode: RigMode) {
        link.send(KenwoodTs480Subset.setMode(mode))
        checkUi(KenwoodTs480Subset.parseMode(link.request(KenwoodTs480Subset.readMode(), "MD")) == mode) {
            UiText(R.string.err_rig_unconfirmed)
        }
    }
    override fun ptt(on: Boolean) = link.send(KenwoodTs480Subset.ptt(on))
    override fun setSplit(on: Boolean) = unsupported("split")
    override fun memories(channels: IntRange, keepGoing: () -> Boolean): List<RigMemory> = unsupported("memories")
    override val supportsMemoryWrite = false
    override fun writeMemory(memory: RigMemory) = unsupported("memory write")

    /** Transmits [samples11520] through the CAT audio stream; the radio is always released afterwards. */
    fun transmitAudio(samples11520: ShortArray, keepGoing: () -> Boolean) {
        requireUi(samples11520.size <= MAX_TX_SECONDS * KenwoodTs480Subset.TX_RATE) {
            UiText(R.string.err_rig_audio_length, MAX_TX_SECONDS)
        }
        var primary: Throwable? = null
        try {
            transport.write("UA2;TX0;US".toByteArray(Charsets.US_ASCII), AUDIO_WRITE_MS)
            val bytes = TruSdxStream.encode(samples11520)
            var offset = 0
            while (offset < bytes.size && keepGoing()) {
                val end = minOf(offset + CHUNK, bytes.size)
                transport.write(bytes.copyOfRange(offset, end), AUDIO_WRITE_MS)
                offset = end
            }
        } catch (error: Throwable) {
            primary = error
        }
        for (attempt in 1..3) {
            try {
                transport.write(KenwoodTs480Subset.RELEASE.toByteArray(Charsets.US_ASCII), AUDIO_WRITE_MS)
                // Measured on a real (tr)uSDX (R2.00x): CAT replies resume about 1 s after the stream ends.
                sleep(SETTLE_MS)
                break
            } catch (error: IOException) {
                if (primary == null) primary = error
            }
        }
        primary?.let { throw it }
    }
    /** Listens to the CAT audio stream for [seconds] (at most 300) and returns the decoded RX audio at 7825 Hz. */
    fun receiveAudio(seconds: Int, keepGoing: () -> Boolean): PcmAudio {
        val decoder = TruSdxStream.decoder()
        var samples = ShortArray(KenwoodTs480Subset.RX_RATE * 8)
        var count = 0
        transport.discardPending()
        transport.write(KenwoodTs480Subset.AUDIO_ON_SPEAKER_OFF.toByteArray(Charsets.US_ASCII), AUDIO_WRITE_MS)
        try {
            val deadline = clock() + seconds.coerceIn(1, 300) * 1000L
            var silent = 0
            while (clock() < deadline && keepGoing()) {
                val chunk = try {
                    transport.read(READ_CHUNK, 100)
                } catch (_: IOException) {
                    checkUi(++silent < MAX_SILENT_READS) { UiText(R.string.err_rig_timeout) }
                    continue
                }
                silent = 0
                val decoded = decoder.feed(chunk)
                if (count + decoded.size > samples.size) samples = samples.copyOf(maxOf(samples.size * 2, count + decoded.size))
                decoded.copyInto(samples, count)
                count += decoded.size
            }
        } finally {
            transport.write(KenwoodTs480Subset.AUDIO_OFF.toByteArray(Charsets.US_ASCII), AUDIO_WRITE_MS)
        }
        return PcmAudio(KenwoodTs480Subset.RX_RATE, samples.copyOf(count))
    }
    private companion object {
        const val MAX_TX_SECONDS = 110
        const val SETTLE_MS = 1000L
        const val OPEN_DELAY_MS = 1500L
        const val CHUNK = 1152
        const val AUDIO_WRITE_MS = 2000
        const val READ_CHUNK = 256
        const val MAX_SILENT_READS = 20
    }
}

/** QRP Labs QMX / QMX+ and QDX / QDX-M CAT: TS-480 style text commands ending in ';' (never CR/LF, a CR switches to terminal mode). */
object QrpLabsCat {
    private val qmxModes = mapOf(
        '1' to RigMode.LSB, '2' to RigMode.USB, '3' to RigMode.CW, '5' to RigMode.AM,
        '7' to RigMode.CW_R, '6' to RigMode.RTTY, '9' to RigMode.RTTY_R
    )

    // QMX CAT manual 1.04_003, FA/FB set; QDX manual 1.06 §6.8, FA/FB set
    fun setFrequency(vfo: Vfo, hz: Long): String {
        requireUi(hz in 0..99_999_999_999L) { UiText(R.string.err_rig_range, mhzText(hz)) }
        return String.format(Locale.ROOT, if (vfo == Vfo.A) "FA%011d;" else "FB%011d;", hz)
    }
    // QMX CAT manual 1.04_003, FA/FB read; QDX manual 1.06 §6.8, FA/FB read
    fun readFrequency(vfo: Vfo): String = if (vfo == Vfo.A) "FA;" else "FB;"
    // Both manuals show the FB answer as "FA...;" (probably a typo), so either prefix is accepted
    fun parseFrequency(reply: String): Long {
        if (!Regex("F[AB][0-9]{11};").matches(reply)) invalidReply()
        return reply.substring(2, 13).toLong()
    }
    // QMX CAT manual 1.04_003, SP; QDX manual 1.06 §6.8, SP
    fun setSplit(on: Boolean): String = if (on) "SP1;" else "SP0;"
    fun readSplit(): String = "SP;"
    fun parseFlag(reply: String, prefix: String): Boolean {
        if (!Regex("${Regex.escape(prefix)}[01];").matches(reply)) invalidReply()
        return reply[prefix.length] == '1'
    }
    // QMX CAT manual 1.04_003, TQ; QDX manual 1.06 §6.8, TQ
    fun ptt(on: Boolean): String = if (on) "TQ1;" else "TQ0;"
    fun readPtt(): String = "TQ;"
    // QMX CAT manual 1.04_003, MD (MD8 = SWR tune mode, never sent); QDX manual 1.06 §6.8, MD (only LSB or USB)
    fun setMode(model: RigModel, mode: RigMode): String {
        val code = if (model == RigModel.QDX) when (mode) {
            RigMode.LSB -> '1'
            RigMode.USB -> '2'
            else -> null
        } else qmxModes.entries.firstOrNull { it.value == mode }?.key
        return "MD${code ?: throw LocalizedArgumentException(UiText(R.string.err_rig_mode, mode.name))};"
    }
    fun readMode(): String = "MD;"
    // QDX manual 1.06 §6.8: MD answers 3 for USB and 1 for LSB
    fun parseMode(model: RigModel, reply: String): RigMode? {
        if (!Regex("MD.;").matches(reply)) invalidReply()
        val code = reply[2]
        return if (model == RigModel.QDX) when (code) {
            '3' -> RigMode.USB
            '1' -> RigMode.LSB
            else -> null
        } else qmxModes[code]
    }
    // QMX CAT manual 1.04_003, ID; QDX manual 1.06 §6.8, ID (answers ID020, TS-480 emulation)
    fun readId(): String = "ID;"
    fun checkId(reply: String) = KenwoodTs480Subset.checkId(reply)
    // QMX CAT manual 1.04_003, VN (firmware version, e.g. "VN1_00_021QMX;")
    fun readVersion(): String = "VN;"
    fun parseVersion(reply: String): String {
        if (!reply.startsWith("VN") || !reply.endsWith(";")) invalidReply()
        val text = reply.substring(2, reply.length - 1)
        if (text.isEmpty() || text.length > 32 || text.any { it !in ' '..'~' }) invalidReply()
        return text
    }
}

/** QMX / QMX+ and QDX / QDX-M over their USB virtual COM port; no memory channels. */
class QrpLabsRig(transport: RadioBytes, override val model: RigModel) : Rig {
    private val link = AsciiLink(transport)
    override val supportsVfoB = true
    override val silentVfoB = true
    override val supportsSplit = true
    override val supportsMemories = false
    override val supportsMemoryWrite = false

    init {
        require(model == RigModel.QMX || model == RigModel.QDX)
    }

    private fun read(vfo: Vfo): Long =
        QrpLabsCat.parseFrequency(link.request(QrpLabsCat.readFrequency(vfo), if (vfo == Vfo.A) "FA" else "F"))
    private fun readMode(): RigMode? = QrpLabsCat.parseMode(model, link.request(QrpLabsCat.readMode(), "MD"))
    private fun readFlag(command: String, prefix: String): Boolean = QrpLabsCat.parseFlag(link.request(command, prefix), prefix)

    override fun identify(): String {
        // ID; is not required: a radio that stays silent or rejects it is still accepted when it answers FA;.
        val reply = try {
            link.request(QrpLabsCat.readId(), "ID").also { QrpLabsCat.checkId(it) }
        } catch (error: LocalizedIOException) {
            read(Vfo.A)
            null
        }
        if (model == RigModel.QDX) return "QRP Labs QDX" + (reply?.let { " " + it.removeSuffix(";") } ?: "")
        val version = try {
            QrpLabsCat.parseVersion(link.request(QrpLabsCat.readVersion(), "VN"))
        } catch (error: LocalizedIOException) {
            if (!isRejected(error)) throw error
            return "QRP Labs QMX"
        }
        return "QRP Labs QMX $version"
    }
    override fun status(): RigStatus = RigStatus(read(Vfo.A), readMode())
    override fun firmwareVersion(): String? = if (model != RigModel.QMX) null else try {
        QrpLabsCat.parseVersion(link.request(QrpLabsCat.readVersion(), "VN"))
    } catch (error: LocalizedIOException) { null }
    override fun frequency(vfo: Vfo): Long = read(vfo)
    override fun setFrequency(vfo: Vfo, hz: Long) {
        checkRange(model, hz)
        link.transaction {
            link.send(QrpLabsCat.setFrequency(vfo, hz))
            link.confirm(hz) { read(vfo) }
        }
    }
    override fun setMode(mode: RigMode) {
        link.send(QrpLabsCat.setMode(model, mode))
        checkUi(readMode() == mode) { UiText(R.string.err_rig_unconfirmed) }
    }
    override fun ptt(on: Boolean) {
        link.send(QrpLabsCat.ptt(on))
        try {
            checkUi(readFlag(QrpLabsCat.readPtt(), "TQ") == on) { UiText(R.string.err_rig_unconfirmed) }
        } catch (error: Exception) {
            // never leave the radio transmitting
            if (!on) runCatching { link.send("RX;") }
            throw error
        }
    }
    override fun setSplit(on: Boolean) {
        link.send(QrpLabsCat.setSplit(on))
        checkUi(readFlag(QrpLabsCat.readSplit(), "SP") == on) { UiText(R.string.err_rig_unconfirmed) }
    }
    override fun memories(channels: IntRange, keepGoing: () -> Boolean): List<RigMemory> = unsupported("memories")
    override fun writeMemory(memory: RigMemory) = unsupported("memory write")
}

/**
 * Kenwood TH-D75 over its USB virtual COM port. Commands and replies end in CR; "?" (unknown command) and "N" (not available
 * now) are rejections. VFO A = band 0 (144/220/430 MHz, FM/DV), VFO B = band 1 (0.1-524 MHz, all modes); memory channels 0..999 (read, and edit of already programmed ones).
 */
class Th75Rig(transport: RadioBytes) : Rig {
    private val link = AsciiLink(transport, terminator = '\r', rejections = setOf("?", "N"))
    override val model = RigModel.THD75
    override val supportsVfoB = true
    override val silentVfoB = true
    override val supportsSplit = false
    companion object {
        // Command set from the Kenwood TH-D74/TH-D75 PC command reference; verify on a real unit.
        const val ID = "ID\r"
        const val FIRMWARE = "FV 0\r"
        const val ACTIVE_BAND = "BC\r"
        const val TX = "TX\r"
        const val RX = "RX\r"
        const val ID_REPLY = "ID TH-D75"
        const val VFO_MODE = 0
        // Mode digit <-> RigMode; the DR (7) mode reads as DV.
        val MODES = mapOf(
            RigMode.FM to 0, RigMode.DV to 1, RigMode.AM to 2, RigMode.LSB to 3, RigMode.USB to 4, RigMode.CW to 5,
            RigMode.FM_N to 6, RigMode.WFM to 8, RigMode.CW_R to 9
        )
        const val DR_MODE = 7
        // Band A only tunes the amateur 144, 220 and 430 MHz bands, in FM/NFM/DV.
        val BAND_A_RANGES = listOf(136_000_000L..174_000_000L, 216_000_000L..260_000_000L, 410_000_000L..470_000_000L)
        val BAND_A_MODES = setOf(RigMode.FM, RigMode.FM_N, RigMode.DV)
        fun band(vfo: Vfo) = if (vfo == Vfo.A) 0 else 1
        fun frequencyQuery(band: Int) = "FQ $band\r"
        fun frequencyCommand(band: Int, hz: Long) = String.format(Locale.ROOT, "FQ %d,%010d\r", band, hz)
        fun modeQuery(band: Int) = "MD $band\r"
        fun modeCommand(band: Int, code: Int) = "MD $band,$code\r"
        fun vfoModeQuery(band: Int) = "VM $band\r"
        fun vfoModeCommand(band: Int, mode: Int) = "VM $band,$mode\r"
        val CHANNELS = 0..999
        const val NAME_MAX = 16
        // ME field index of the RX frequency (first field after the channel number), TH-D74/D75 PC command reference; verify on a real unit.
        const val MEMORY_FREQUENCY_FIELD = 0
        fun memoryQuery(channel: Int) = String.format(Locale.ROOT, "ME %03d\r", channel)
        fun memoryCommand(channel: Int, fields: List<String>) = String.format(Locale.ROOT, "ME %03d,", channel) + fields.joinToString(",") + "\r"
        fun nameQuery(channel: Int) = String.format(Locale.ROOT, "MN %03d\r", channel)
        fun nameCommand(channel: Int, name: String) = String.format(Locale.ROOT, "MN %03d,", channel) + name + "\r"
        /** Read-only commands of the diagnostics: never a SET, never TX. */
        val DIAGNOSTIC_QUERIES = listOf(
            ID, FIRMWARE, ACTIVE_BAND, vfoModeQuery(0), vfoModeQuery(1), frequencyQuery(0), frequencyQuery(1), modeQuery(0), modeQuery(1)
        )
    }

    /** Numbers after the command word: "FQ 1,0131725000" -> [1, 131725000]. */
    private fun fields(reply: String): List<Long> =
        reply.substringAfter(' ', "").split(',').map { it.trim().toLongOrNull() ?: invalidReply() }
    private fun bandFields(reply: String, band: Int): List<Long> {
        val values = fields(reply)
        if (values.size != 2 || values[0] != band.toLong()) invalidReply()
        return values
    }
    private fun activeBand(): Int {
        val values = fields(link.request(ACTIVE_BAND, "BC"))
        if (values.size != 1 || values[0] !in 0L..1L) invalidReply()
        return values[0].toInt()
    }
    private fun readHz(band: Int): Long = bandFields(link.request(frequencyQuery(band), "FQ"), band)[1]
    private fun readBandMode(band: Int): RigMode? {
        val code = bandFields(link.request(modeQuery(band), "MD"), band)[1].toInt()
        return if (code == DR_MODE) RigMode.DV else MODES.entries.firstOrNull { it.value == code }?.key
    }
    private fun vfoOf(band: Int) = if (band == 0) Vfo.A else Vfo.B

    override fun identify(): String {
        val reply = link.request(ID, "ID")
        if (!reply.startsWith(ID_REPLY)) invalidReply()
        return reply.removePrefix("ID ")
    }
    override fun firmwareVersion(): String? = try {
        link.request(FIRMWARE, "FV").substringAfter(',', "").ifEmpty { null }
    } catch (error: LocalizedIOException) { null }
    override fun status(): RigStatus = link.transaction {
        val band = activeBand()
        RigStatus(readHz(band), readBandMode(band))
    }
    override fun frequency(vfo: Vfo): Long = readHz(band(vfo))
    override fun checkTunable(vfo: Vfo, hz: Long) {
        checkRange(model, hz)
        if (vfo == Vfo.A) requireUi(BAND_A_RANGES.any { hz in it }) { UiText(R.string.err_rig_range, mhzText(hz)) }
    }
    override fun selectTxVfo(vfo: Vfo) {
        val band = band(vfo)
        link.transaction {
            link.send("BC $band\r")
            checkUi(activeBand() == band) { UiText(R.string.err_rig_unconfirmed) }
        }
    }
    override fun setFrequency(vfo: Vfo, hz: Long) {
        checkTunable(vfo, hz)
        val band = band(vfo)
        link.transaction {
            // A frequency can only be set in VFO mode.
            if (bandFields(link.request(vfoModeQuery(band), "VM"), band)[1] != VFO_MODE.toLong()) link.send(vfoModeCommand(band, VFO_MODE))
            link.send(frequencyCommand(band, hz))
            link.confirm(hz) { readHz(band) }
        }
    }
    override fun setMode(mode: RigMode) = setMode(vfoOf(activeBand()), mode)
    override fun setMode(vfo: Vfo, mode: RigMode) {
        val code = MODES[mode] ?: unsupported("mode " + mode.name)
        if (vfo == Vfo.A && mode !in BAND_A_MODES) unsupported("mode " + mode.name + " on VFO A")
        val band = band(vfo)
        link.transaction {
            link.send(modeCommand(band, code))
            checkUi(readBandMode(band) == mode) { UiText(R.string.err_rig_unconfirmed) }
        }
    }
    // TX / RX act on the active band.
    override fun ptt(on: Boolean) {
        try {
            link.request(if (on) TX else RX, if (on) "TX" else "RX")
        } catch (error: Exception) {
            // never leave the radio transmitting
            if (on) runCatching { link.send(RX) }
            throw error
        }
    }
    override fun setSplit(on: Boolean) = unsupported("split")

    /** Sends one of [DIAGNOSTIC_QUERIES] (all read-only) and returns the raw reply; anything else is refused. */
    fun diagnosticReply(command: String): String {
        requireUi(command in DIAGNOSTIC_QUERIES) { UiText(R.string.err_rig_unsupported, command.trim()) }
        return link.request(command, command.trim().substringBefore(' '))
    }

    /** The comma-separated fields after the channel number of an "ME nnn,..." reply; an empty channel answers "N" (rejected). */
    private fun readChannel(channel: Int): List<String> {
        val parts = link.request(memoryQuery(channel), "ME").substringAfter(' ', "").split(',')
        if (parts.size < 2 || parts[0].trim().toIntOrNull() != channel) invalidReply()
        return parts.drop(1)
    }
    private fun channelHz(fields: List<String>): Long = fields[MEMORY_FREQUENCY_FIELD].trim().toLongOrNull() ?: invalidReply()
    private fun readName(channel: Int): String = try {
        val parts = link.request(nameQuery(channel), "MN").substringAfter(' ', "").split(',', limit = 2)
        if (parts.size < 2 || parts[0].trim().toIntOrNull() != channel) invalidReply()
        parts[1].trim()
    } catch (error: LocalizedIOException) {
        if (isRejected(error)) "" else throw error
    }

    override val supportsMemories = true
    override val supportsMemoryWrite = true
    override fun memories(channels: IntRange, keepGoing: () -> Boolean): List<RigMemory> {
        val list = ArrayList<RigMemory>()
        for (channel in channels) {
            if (!keepGoing()) break
            val fields = try {
                readChannel(channel)
            } catch (error: LocalizedIOException) {
                if (isRejected(error)) continue else throw error
            }
            // The mode field index is not confirmed, so the mode stays unknown and the offset/split fields are not decoded.
            list.add(RigMemory(channel, channelHz(fields), null, readName(channel)))
        }
        return list
    }
    /** Read-modify-write: only the RX frequency and the name change; every other field is sent back exactly as read. */
    override fun writeMemory(memory: RigMemory) {
        val channel = memory.channel
        requireUi(channel in CHANNELS) { UiText(R.string.err_rig_channel, channel) }
        checkRange(model, memory.frequencyHz)
        requireUi(memory.name.length <= NAME_MAX && memory.name.all { it in ' '..'~' && it != ',' }) {
            UiText(R.string.err_rig_memory_name, NAME_MAX)
        }
        link.transaction {
            val current = try {
                readChannel(channel)
            } catch (error: LocalizedIOException) {
                if (isRejected(error)) throw LocalizedStateException(UiText(R.string.err_rig_channel_empty, channel)) else throw error
            }
            val updated = current.toMutableList()
            updated[MEMORY_FREQUENCY_FIELD] = String.format(Locale.ROOT, "%010d", memory.frequencyHz)
            link.send(memoryCommand(channel, updated))
            link.send(nameCommand(channel, memory.name))
            val stored = readChannel(channel)
            checkUi(channelHz(stored) == memory.frequencyHz && stored.drop(1) == updated.drop(1) && readName(channel) == memory.name.trim()) {
                UiText(R.string.err_rig_unconfirmed)
            }
        }
    }
}
