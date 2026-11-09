package org.bricohams.radio

import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.SecureRandom

data class SlotInfo(val slot: Int, val status: Int, val magic: Long, val size: Long, val name: String, val firmware: String)
data class RadioPass(val norad: Long, val name: String, val aosSeconds: Long, val elevation: Int, val downlink10Hz: Long)
data class PassTable(val count: Int, val radioClock: Long, val passes: List<RadioPass>)
data class ArdfDeviceStats(val session: Long, val active: Boolean, val synchronized: Boolean, val foxCount: Int,
    val durationMs: Long, val elapsedMs: Long, val observedFoxes: Int)

/**
 * Read-only queries of the Bricohams / F4HWN extended commands (multiboot slot info, spectrum presets, ARDF statistics,
 * satellite pass table). Nothing here changes the radio: the pass-table clock is never set (host_time is always 0, a non-zero
 * value would overwrite the radio's RAM clock even on a query) and the mutating pass-table operations are refused.
 */
class QuanshengReadOnly(
    private val memory: QuanshengMemory,
    private val random: () -> Int = { SecureRandom().nextInt() },
    private val sequenceStart: Int = 0
) {
    private var sequence = sequenceStart
    private fun le(size: Int) = ByteBuffer.allocate(size).order(ByteOrder.LITTLE_ENDIAN)
    private fun view(bytes: ByteArray) = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
    private fun u8(value: Byte) = value.toInt() and 255

    /** Multiboot slot header (0x0720); slots 0..4, slot 0 is the protected one. */
    fun slotInfo(slot: Int): SlotInfo {
        requireUi(slot in 0..4) { UiText(R.string.err_sat_invalid, "slot") }
        val data = memory.exchange(0x0720, byteArrayOf(slot.toByte()))
        requireUi(data.size == 66 && u8(data[0]) == slot) { UiText(R.string.err_sat_invalid, "slot $slot") }
        val header = view(data.copyOfRange(2, 66))
        fun text(from: Int) = String(data, 2 + from, 16, Charsets.US_ASCII).takeWhile { it != '\u0000' }.filter { it.code in 0x20..0x7e }
        return SlotInfo(slot, u8(data[1]), header.getInt(0).toLong() and 0xffffffffL, header.getInt(8).toLong() and 0xffffffffL,
            text(16), text(32))
    }

    fun slots(): List<SlotInfo> = (0..4).map(::slotInfo)

    private fun presetExchange(operation: Int, token: Int): ByteArray {
        // Only the two export operations exist here: 2/3/4 import data and are never sent.
        require(operation == 0 || operation == 1)
        val response = memory.exchange(0x7b10, le(6).put(1).put(operation.toByte()).putInt(token).array(), 0x7b11, 1500)
        requireUi(response.size == 110 && u8(response[0]) == 1 && view(response).getInt(2) == token) {
            UiText(R.string.err_sat_invalid, "presets")
        }
        requireUi(u8(response[1]) == 0) { UiText(R.string.err_sat_rejected, "presets", u8(response[1])) }
        return response.copyOfRange(6, 110)
    }

    /** BHSP v1 spectrum presets (208 bytes, two halves tied to one transfer token). */
    fun spectrumPresets(): ByteArray {
        var token = random()
        while (token == 0) token = random()
        val bytes = presetExchange(0, token) + presetExchange(1, token)
        requireUi(isValidPresetFile(bytes)) { UiText(R.string.err_sat_invalid, "BHSP") }
        return bytes
    }

    /** Device-side ARDF observation statistics (RAM only, relative times); null when no ARDF session has started yet. */
    fun ardfStats(): ArdfDeviceStats? {
        sequence = (sequence + 1) and 0xffff
        val response = memory.exchange(0x7b20, le(4).put(1).put(0).putShort(sequence.toShort()).array(), 0x7b21, 1500)
        requireUi(response.size == 140 && u8(response[0]) == 1 && (view(response).getShort(4).toInt() and 65535) == sequence) {
            UiText(R.string.err_sat_invalid, "ARDF")
        }
        if (u8(response[1]) == 3) return null
        requireUi(u8(response[1]) == 0) { UiText(R.string.err_sat_rejected, "ARDF", u8(response[1])) }
        val v = view(response)
        val flags = u8(response[2])
        val foxCount = u8(response[3])
        val duration = v.getInt(12).toLong() and 0xffffffffL
        val elapsed = v.getInt(16).toLong() and 0xffffffffL
        val session = v.getInt(8).toLong() and 0xffffffffL
        requireUi(flags <= 15 && foxCount <= 10 && session > 0 && duration in 15000..120000 && duration % 15000 == 0L) {
            UiText(R.string.err_sat_invalid, "ARDF")
        }
        val observed = (0 until 10).count { (v.getShort(20 + it * 12).toInt() and 65535) != 0 }
        return ArdfDeviceStats(session, flags and 1 != 0, flags and 2 != 0, foxCount, duration, elapsed, observed)
    }

    private fun passExchange(operation: Int, index: Int, count: Int): Triple<Int, Long, ByteArray> {
        // 1 = clear, 2 = write, 3 = commit: never sent from here.
        require(operation == 0 || operation == 4)
        val request = le(12).put(1).put(operation.toByte()).putInt(memory.sessionTimestamp).putInt(0)
            .put(index.toByte()).put(count.toByte()).array()
        val reply = memory.exchange(0x7b30, request, 0x7b31, 2000)
        requireUi(reply.size >= 12 && u8(reply[0]) == 1 && u8(reply[2]) == operation && u8(reply[10]) == PASS_MAX &&
            u8(reply[11]) == PASS_BYTES) { UiText(R.string.err_sat_invalid, "pass table") }
        if (u8(reply[1]) == 5 && operation == 0) throw RadioNotAvailableException(UiText(R.string.diag_passes_none))
        requireUi(u8(reply[1]) == 0) { UiText(R.string.err_sat_rejected, "pass table", u8(reply[1])) }
        requireUi(reply.size == 12 + if (operation == 4) count * PASS_BYTES else 0) { UiText(R.string.err_sat_invalid, "pass table") }
        return Triple(u8(reply[3]), view(reply).getInt(4).toLong() and 0xffffffffL, reply.copyOfRange(12, reply.size))
    }

    /** Pass table currently stored in the radio, read without touching its clock. */
    fun passTable(): PassTable {
        val (count, clock, _) = passExchange(0, 0, 0)
        requireUi(count <= PASS_MAX) { UiText(R.string.err_sat_invalid, "pass table") }
        val passes = ArrayList<RadioPass>()
        var index = 0
        while (index < count) {
            val size = minOf(PASS_FRAME_ENTRIES, count - index)
            val (_, _, entries) = passExchange(4, index, size)
            for (item in 0 until size) passes.add(decodePass(entries.copyOfRange(item * PASS_BYTES, (item + 1) * PASS_BYTES)))
            index += size
        }
        return PassTable(count, clock, passes)
    }

    companion object {
        const val PASS_MAX = 64
        const val PASS_BYTES = 32
        const val PASS_FRAME_ENTRIES = 4

        fun decodePass(bytes: ByteArray): RadioPass {
            requireUi(bytes.size == PASS_BYTES) { UiText(R.string.err_sat_invalid, "pass") }
            val v = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
            val norad = v.getInt(0).toLong() and 0xffffffffL
            val aos = v.getInt(12).toLong() and 0xffffffffL
            requireUi(norad in 1 until 0xffffffffL && aos in 1 until 0xffffffffL && (bytes[20].toInt() and 255) <= 90) {
                UiText(R.string.err_sat_invalid, "pass")
            }
            val name = String(bytes, 4, 8, Charsets.US_ASCII).takeWhile { it != '\u0000' }
            return RadioPass(norad, name, aos, bytes[20].toInt() and 255, (v.getInt(28).toLong() and 0xffffffffL))
        }

        /** BHSP v1: magic, version 1, CRC32 of the first 204 bytes stored at 204. */
        fun isValidPresetFile(bytes: ByteArray): Boolean {
            if (bytes.size != 208 || String(bytes, 0, 4, Charsets.US_ASCII) != "BHSP" || bytes[4].toInt() != 1) return false
            val stored = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).getInt(204).toLong() and 0xffffffffL
            return stored == QuanshengMemory.crc32(bytes.copyOfRange(0, 204))
        }
    }
}
