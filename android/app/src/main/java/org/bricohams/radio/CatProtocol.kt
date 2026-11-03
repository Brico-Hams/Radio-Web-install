package org.bricohams.radio

import java.io.Closeable
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder

interface RadioBytes : Closeable {
    fun write(bytes: ByteArray, timeoutMs: Int)
    fun read(length: Int, timeoutMs: Int): ByteArray
    /** Throws away whatever the radio sent before the next request (stale or late replies); stops at the first timeout. */
    fun discardPending() {
        try {
            repeat(DRAIN_LIMIT) { read(1, 1) }
        } catch (_: java.io.IOException) {
            // Nothing left to read.
        }
    }
    companion object {
        const val DRAIN_LIMIT = 2048
    }
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
    /**
     * Validates magic, length and, when present, the CRC-16/XMODEM of the frame. The stock framing accepts a checksum of
     * 0xFFFF as "not computed", so such frames are only protected by the magic, length bounds and whatever the caller checks
     * on the payload (CatProtocol requires exact reply sizes, the sequence number and fixed capability words).
     */
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

/**
 * The radio is not in SAT RX with CAT enabled (key 8). It is a recoverable state, not a link failure: the user can arm the
 * radio and the host keeps polling. Kept an IllegalArgumentException like the validation errors it replaces.
 */
class CatNotArmedException(override val text: UiText = UiText(R.string.err_cat_not_armed)) :
    IllegalArgumentException(text.toString()), LocalizedError

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
        return left.coerceAtMost(ATTEMPT_MS).toInt()
    }
    private fun packetPadding(frame: ByteArray) {
        // F4HWN USB CDC can hold an exact 64-byte packet until the next byte (the web transport pads the same way).
        if (frame.size % 64 == 0) transport.write(byteArrayOf(0), WRITE_MS)
    }
    /**
     * Sends one request and returns the first reply of the expected type that [accept] likes. Pending input is discarded
     * first; frames that are corrupted, of another type or not accepted (stale replies) are skipped and the scan
     * resynchronises on the next magic. A silent attempt is repeated once with the same frame (all requests are idempotent:
     * same sequence, same frequency, lease renewals), then the last failure is raised.
     */
    private fun request(type: Int, payload: ByteArray, expected: Int, attemptMs: Long = ATTEMPT_MS,
        accept: (ByteArray) -> Boolean): ByteArray {
        val frame = QuanshengFrames.encode(type, payload)
        var failure: IOException? = null
        repeat(ATTEMPTS) {
            transport.discardPending()
            val deadline = clock() + attemptMs
            transport.write(frame, remaining(deadline))
            try {
                packetPadding(frame)
                return await(expected, accept, deadline)
            } catch (error: IOException) {
                failure = error
            }
        }
        throw failure ?: LocalizedIOException(UiText(R.string.err_cat_timeout))
    }
    private fun await(expected: Int, accept: (ByteArray) -> Boolean, deadline: Long): ByteArray {
        var previous = 0
        while (true) {
            val byte = transport.read(1, remaining(deadline)).single().toInt() and 255
            if (previous != 0xab || byte != 0xcd) { previous = byte; continue }
            previous = 0
            val length = transport.read(2, remaining(deadline))
            val size = ByteBuffer.wrap(length).order(ByteOrder.LITTLE_ENDIAN).short.toInt() and 65535
            if (size !in 4..512) continue
            val tail = transport.read(size + 4, remaining(deadline))
            val decoded = try {
                QuanshengFrames.decode(byteArrayOf(0xab.toByte(), 0xcd.toByte()) + length + tail)
            } catch (_: IllegalArgumentException) {
                continue
            }
            if (decoded.first == expected && accept(decoded.second)) return decoded.second
        }
    }
    private fun sequenceOf(response: ByteArray) = (response[2].toInt() and 255) or ((response[3].toInt() and 255) shl 8)
    @Synchronized fun identify(): String {
        val timestamp = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN)
            .putInt(System.currentTimeMillis().toInt()).array()
        val response = request(0x0514, timestamp, 0x0515, IDENTIFY_MS) { true }
        requireUi(response.size >= 16) { UiText(R.string.err_cat_identification_incomplete) }
        val firmware = response.takeWhile { it in 0x20..0x7e }.toByteArray().toString(Charsets.US_ASCII).trim()
        requireUi(supportedFirmware(firmware)) { UiText(R.string.err_cat_firmware_unsupported, firmware) }
        return firmware
    }
    @Synchronized private fun exchange(operation: Int, frequency: Long = 0): CatState {
        sequence = (sequence + 1) and 65535
        val expectedSequence = sequence
        val payload = ByteBuffer.allocate(8).order(ByteOrder.LITTLE_ENDIAN)
            .put(1).put(operation.toByte()).putShort(sequence.toShort()).putInt(frequency.toInt()).array()
        if (operation == 1) checkUi(allowTune()) { UiText(R.string.err_cat_tune_cancelled) }
        val response = request(0x7b00, payload, 0x7b01) { it.size == 16 && sequenceOf(it) == expectedSequence }
        requireUi(response[0].toInt() == 1) { UiText(R.string.err_cat_response_invalid) }
        val view = ByteBuffer.wrap(response).order(ByteOrder.LITTLE_ENDIAN)
        val status = response[1].toInt() and 255
        if (status == 5) throw CatNotArmedException()
        requireUi(status == if (operation == 0) 0 else 1) { UiText(R.string.err_cat_rejected, status) }
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
        val expectedSequence = sequence
        val payload = ByteBuffer.allocate(8).order(ByteOrder.LITTLE_ENDIAN)
            .put(1).put(operation.toByte()).putShort(sequence.toShort()).putInt(0).array()
        val response = request(0x7b02, payload, 0x7b03) { it.size == 16 && sequenceOf(it) == expectedSequence }
        requireUi(response[0].toInt() == 1) { UiText(R.string.err_cat_tx_response_invalid) }
        val view = ByteBuffer.wrap(response).order(ByteOrder.LITTLE_ENDIAN)
        requireUi(view.getInt(4) == 8) { UiText(R.string.err_cat_tx_unsupported) }
        val flags = view.getInt(8)
        val denied = (flags shr 8) and 255
        requireUi(flags and 0xffff00e0.toInt() == 0 && denied in 0..MAX_DENIED_STATE) {
            UiText(R.string.err_cat_tx_state_inconsistent)
        }
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
    /**
     * Sets the RX frequency with a single SET. With [confirm] the SET reply is used when it is already applied and
     * otherwise the status is polled (the radio retunes in its RX loop); without it the queued reply is returned as is,
     * which is enough for lease renewals.
     */
    @Synchronized fun tune(frequency10Hz: Long, permit: () -> Boolean = { true }, confirm: Boolean = true): CatState {
        requireUi(inBand(frequency10Hz)) { UiText(R.string.err_cat_rx_band) }
        return change(1, frequency10Hz, permit, confirm)
    }
    @Synchronized fun stop(): CatState = change(2, 0, { true }, true)
    private fun change(operation: Int, frequency: Long, permit: () -> Boolean, confirm: Boolean): CatState {
        checkUi(permit()) { UiText(R.string.err_cat_cancelled_before_set) }
        var state = exchange(operation, frequency)
        if (!state.active) throw CatNotArmedException()
        if (!confirm) return state
        repeat(POLLS + 1) { attempt ->
            if (!state.pending) {
                requireUi(if (operation == 1) state.remote && state.frequency10Hz == frequency else !state.remote) {
                    UiText(R.string.err_cat_change_unconfirmed)
                }
                return state
            }
            if (attempt < POLLS) {
                sleep(POLL_MS)
                state = exchange(0)
                requireUi(state.active) { UiText(R.string.err_cat_left_sat_rx) }
            }
        }
        throw LocalizedIOException(UiText(R.string.err_cat_change_pending))
    }
    companion object {
        // Same budget as the web connector: 1000 ms per CAT exchange, 4000 ms for the hello.
        private const val ATTEMPT_MS = 1000L
        private const val IDENTIFY_MS = 4000L
        private const val WRITE_MS = 500
        private const val ATTEMPTS = 2
        private const val POLL_MS = 75L
        private const val POLLS = 10
        /**
         * VfoState_t of the F4HWN base is NORMAL, BUSY, BAT_LOW, TX_DISABLE, TIMEOUT, ALARM, VOLTAGE_HIGH (0..6); the radio
         * reports it in an 8-bit field, so any byte is accepted and unknown values are shown as a generic denial.
         */
        const val MAX_DENIED_STATE = 255
        fun inBand(frequency10Hz: Long) = frequency10Hz in 13600000..17400000 || frequency10Hz in 40000000..47000000
        /** BricoHams builds, or any build reporting a version >= 6 (the capability words of the CAT reply are checked later). */
        fun supportedFirmware(firmware: String): Boolean {
            val version = Regex("v(\\d+)", RegexOption.IGNORE_CASE).find(firmware)?.groupValues?.get(1)?.toIntOrNull()
            return firmware.contains("bricohams", ignoreCase = true) || (version != null && version >= 6)
        }
    }
}

/** Keeps a manual tune alive: the radio reverts a SET after its 3000 ms lease, so it is renewed well before that. */
class CatLease(
    private val cat: CatProtocol,
    val frequency10Hz: Long,
    private val clock: () -> Long = { System.nanoTime() / 1_000_000 },
    private val permit: () -> Boolean = { true }
) {
    enum class Result { WAITING, RENEWED, REVERTED, LEFT_SAT_RX, STILL_NOT_ARMED, RECOVERED, RETRY }
    private var renewedAt = clock()
    private var armed = true
    private var failures = 0
    /**
     * Call often; it renews at most once per [RENEW_MS]. Leaving SAT RX (CAT not armed) is recoverable: the lease keeps
     * polling and re-applies the tune once the radio is armed again. A silent radio is retried before the error is raised.
     */
    fun renewIfDue(): Result {
        if (clock() - renewedAt < RENEW_MS) return Result.WAITING
        return try {
            val state = cat.query()
            renewedAt = clock()
            failures = 0
            when {
                !state.active -> notArmed()
                !armed -> { armed = true; cat.tune(frequency10Hz, permit, confirm = false); Result.RECOVERED }
                !state.remote -> Result.REVERTED
                else -> { cat.tune(frequency10Hz, permit, confirm = false); Result.RENEWED }
            }
        } catch (_: CatNotArmedException) {
            renewedAt = clock()
            notArmed()
        } catch (error: java.io.IOException) {
            if (++failures > MAX_TRANSIENT_FAILURES) throw error
            Result.RETRY
        }
    }
    private fun notArmed(): Result {
        if (!armed) return Result.STILL_NOT_ARMED
        armed = false
        return Result.LEFT_SAT_RX
    }
    companion object {
        const val LEASE_MS = 3000L
        const val RENEW_MS = 1000L
        const val MAX_TRANSIENT_FAILURES = 2
    }
}
