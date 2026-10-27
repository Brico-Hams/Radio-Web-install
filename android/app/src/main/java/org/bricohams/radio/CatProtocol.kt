package org.bricohams.radio

import java.io.Closeable
import java.nio.ByteBuffer
import java.nio.ByteOrder

interface RadioBytes : Closeable {
    fun write(bytes: ByteArray, timeoutMs: Int)
    fun read(length: Int, timeoutMs: Int): ByteArray
}

object QuanshengFrames {
    private val key = intArrayOf(0x16, 0x6c, 0x14, 0xe6, 0x2e, 0x91, 0x0d, 0x40, 0x21, 0x35, 0xd5, 0x40, 0x13, 0x03, 0xe9, 0x80)
    fun crc(bytes: ByteArray): Int {
        var crc = 0
        for (byte in bytes) {
            crc = crc xor ((byte.toInt() and 255) shl 8)
            repeat(8) { crc = ((crc shl 1) xor if (crc and 0x8000 != 0) 0x1021 else 0) and 65535 }
        }
        return crc
    }
    fun encode(type: Int, data: ByteArray): ByteArray {
        requireUi(type in 0..65535 && data.size <= 508) { UiText(R.string.err_uart_request_bounds) }
        val size = (data.size + 5) and 1.inv()
        val out = ByteBuffer.allocate(size + 8).order(ByteOrder.LITTLE_ENDIAN)
        out.putShort(0xcdab.toShort()); out.putShort(size.toShort())
        out.putShort(type.toShort()); out.putShort(data.size.toShort()); out.put(data)
        val bytes = out.array()
        out.putShort(4 + size, crc(bytes.copyOfRange(4, 4 + size)).toShort())
        for (index in 0 until size + 2) bytes[4 + index] = (bytes[4 + index].toInt() xor key[index % 16]).toByte()
        out.putShort(6 + size, 0xbadc.toShort())
        return bytes
    }
    fun decode(frame: ByteArray): Pair<Int, ByteArray> {
        requireUi(frame.size >= 12) { UiText(R.string.err_uart_frame_short) }
        val view = ByteBuffer.wrap(frame).order(ByteOrder.LITTLE_ENDIAN)
        val size = view.getShort(2).toInt() and 65535
        requireUi(size in 4..512 && frame.size == size + 8 &&
            view.getShort(0).toInt() and 65535 == 0xcdab &&
            view.getShort(frame.size - 2).toInt() and 65535 == 0xbadc) { UiText(R.string.err_uart_frame_corrupt) }
        val body = frame.copyOfRange(4, frame.size - 2)
        for (index in body.indices) body[index] = (body[index].toInt() xor key[index % 16]).toByte()
        val data = ByteBuffer.wrap(body).order(ByteOrder.LITTLE_ENDIAN)
        val length = data.getShort(2).toInt() and 65535
        val checksum = data.getShort(size).toInt() and 65535
        requireUi(length <= size - 4 && (checksum == 65535 || checksum == crc(body.copyOfRange(0, size)))) {
            UiText(R.string.err_uart_length_crc)
        }
        return (data.getShort(0).toInt() and 65535) to body.copyOfRange(4, 4 + length)
    }
}

data class CatState(val active: Boolean, val remote: Boolean, val pending: Boolean, val frequency10Hz: Long)

/** CAT TX v1 (0x7B02): PTT leased by the host, armed only on the radio (SAT RX, key 9). */
data class PttState(val armed: Boolean, val keyed: Boolean, val pending: Boolean, val limit: Boolean,
    val deniedState: Int, val keyedMs: Long)

class CatProtocol(
    private val transport: RadioBytes,
    private val clock: () -> Long = { System.nanoTime() / 1_000_000 },
    private val sleep: (Long) -> Unit = Thread::sleep,
    private val allowTune: () -> Boolean = { true }
) {
    private var sequence = 0
    private fun remaining(deadline: Long): Int {
        val left = deadline - clock()
        if (left <= 0) throw LocalizedIOException(UiText(R.string.err_cat_timeout))
        return left.coerceAtMost(1000).toInt()
    }
    private fun request(type: Int, payload: ByteArray, expected: Int): ByteArray {
        val deadline = clock() + 1000
        transport.write(QuanshengFrames.encode(type, payload), remaining(deadline))
        var previous = 0
        while (true) {
            val byte = transport.read(1, remaining(deadline)).single().toInt() and 255
            if (previous != 0xab || byte != 0xcd) { previous = byte; continue }
            val length = transport.read(2, remaining(deadline))
            requireUi(length.size == 2) { UiText(R.string.err_uart_length_truncated) }
            val size = ByteBuffer.wrap(length).order(ByteOrder.LITTLE_ENDIAN).short.toInt() and 65535
            requireUi(size in 4..512) { UiText(R.string.err_uart_length_bounds) }
            val tail = transport.read(size + 4, remaining(deadline))
            val (responseType, response) = QuanshengFrames.decode(byteArrayOf(0xab.toByte(), 0xcd.toByte()) + length + tail)
            if (responseType != expected) { previous = 0; continue }
            return response
        }
    }
    @Synchronized fun identify(): String {
        val timestamp = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN)
            .putInt(System.currentTimeMillis().toInt()).array()
        val response = request(0x0514, timestamp, 0x0515)
        requireUi(response.size >= 16) { UiText(R.string.err_cat_identification_incomplete) }
        val firmware = response.copyOfRange(0, 16).takeWhile { it != 0.toByte() }.toByteArray().toString(Charsets.US_ASCII)
        val version = Regex("F4HWN.*v(\\d+)", RegexOption.IGNORE_CASE).find(firmware)?.groupValues?.get(1)?.toIntOrNull()
        requireUi(version != null && version >= 6) { UiText(R.string.err_cat_firmware_unsupported, firmware) }
        return firmware
    }
    @Synchronized private fun exchange(operation: Int, frequency: Long = 0): CatState {
        sequence = (sequence + 1) and 65535
        val payload = ByteBuffer.allocate(8).order(ByteOrder.LITTLE_ENDIAN)
            .put(1).put(operation.toByte()).putShort(sequence.toShort()).putInt(frequency.toInt()).array()
        if (operation == 1) checkUi(allowTune()) { UiText(R.string.err_cat_tune_cancelled) }
        val response = request(0x7b00, payload, 0x7b01)
        requireUi(response.size == 16 && response[0].toInt() == 1) { UiText(R.string.err_cat_response_invalid) }
        val view = ByteBuffer.wrap(response).order(ByteOrder.LITTLE_ENDIAN)
        requireUi(view.getShort(2).toInt() and 65535 == sequence) { UiText(R.string.err_cat_response_sequence) }
        val status = response[1].toInt() and 255
        requireUi(status == if (operation == 0) 0 else 1) {
            if (status == 5) UiText(R.string.err_cat_enable_sat_rx) else UiText(R.string.err_cat_rejected, status)
        }
        requireUi(view.getInt(4) == 7) { UiText(R.string.err_cat_capabilities) }
        val applied = view.getInt(8).toLong() and 0xffffffffL
        val flags = view.getInt(12)
        requireUi(flags in 0..7 && (if (flags and 1 != 0) inBand(applied) else applied == 0L && flags == 0)) {
            UiText(R.string.err_cat_state_inconsistent)
        }
        return CatState(flags and 1 != 0, flags and 2 != 0, flags and 4 != 0, applied)
    }
    @Synchronized private fun ptt(operation: Int, accepted: Set<Int>): PttState {
        sequence = (sequence + 1) and 65535
        val payload = ByteBuffer.allocate(8).order(ByteOrder.LITTLE_ENDIAN)
            .put(1).put(operation.toByte()).putShort(sequence.toShort()).putInt(0).array()
        val response = request(0x7b02, payload, 0x7b03)
        requireUi(response.size == 16 && response[0].toInt() == 1) { UiText(R.string.err_cat_tx_response_invalid) }
        val view = ByteBuffer.wrap(response).order(ByteOrder.LITTLE_ENDIAN)
        requireUi(view.getShort(2).toInt() and 65535 == sequence) { UiText(R.string.err_cat_tx_sequence) }
        requireUi(view.getInt(4) == 8) { UiText(R.string.err_cat_tx_unsupported) }
        val flags = view.getInt(8)
        val denied = (flags shr 8) and 255
        requireUi(flags and 0xffff00e0.toInt() == 0 && denied in 0..5) { UiText(R.string.err_cat_tx_state_inconsistent) }
        val state = PttState(flags and 1 != 0, flags and 2 != 0, flags and 4 != 0, flags and 8 != 0, denied,
            view.getInt(12).toLong() and 0xffffffffL)
        val status = response[1].toInt() and 255
        requireUi(status in accepted) {
            when (status) {
                5 -> UiText(R.string.err_ptt_not_armed)
                7 -> UiText(R.string.err_tx_denied, denied)
                8 -> UiText(R.string.err_tx_limit, CatTransmitter.RADIO_LIMIT_MS / 1000)
                else -> UiText(R.string.err_cat_tx_rejected, status)
            }
        }
        return state
    }
    @Synchronized fun pttQuery(): PttState = ptt(0, setOf(0, 7))
    /** Keys up or renews the lease; the radio drops PTT 1.5 s after the last renewal. */
    @Synchronized fun pttKey(): PttState = ptt(1, setOf(0, 1))
    @Synchronized fun pttRelease(): PttState = ptt(2, setOf(0, 1))
    @Synchronized fun query(): CatState = exchange(0)
    @Synchronized fun tune(frequency10Hz: Long, permit: () -> Boolean = { true }): CatState {
        requireUi(inBand(frequency10Hz)) { UiText(R.string.err_cat_rx_band) }
        return change(1, frequency10Hz, permit)
    }
    @Synchronized fun stop(): CatState = change(2, 0)
    private fun change(operation: Int, frequency: Long, permit: () -> Boolean = { true }): CatState {
        requireUi(exchange(0).active) { UiText(R.string.err_cat_activate) }
        checkUi(permit()) { UiText(R.string.err_cat_cancelled_before_set) }
        exchange(operation, frequency)
        repeat(10) {
            sleep(75)
            val state = exchange(0)
            requireUi(state.active) { UiText(R.string.err_cat_left_sat_rx) }
            if (!state.pending) {
                requireUi(if (operation == 1) state.remote && state.frequency10Hz == frequency else !state.remote) {
                    UiText(R.string.err_cat_change_unconfirmed)
                }
                return state
            }
        }
        throw LocalizedIOException(UiText(R.string.err_cat_change_pending))
    }
    companion object {
        fun inBand(frequency10Hz: Long) = frequency10Hz in 13600000..17400000 || frequency10Hz in 40000000..47000000
    }
}
