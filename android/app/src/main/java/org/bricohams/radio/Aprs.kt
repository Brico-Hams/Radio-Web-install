package org.bricohams.radio

import java.io.ByteArrayOutputStream

/** KISS framing (FEND 0xC0, FESC 0xDB escaping). Byte 0 of a frame is port<<4 | type, type 0 being data. */
data class KissFrame(val port: Int, val type: Int, val payload: ByteArray)

object Kiss {
    const val FEND = 0xC0
    const val FESC = 0xDB
    const val TFEND = 0xDC
    const val TFESC = 0xDD

    fun encode(port: Int, type: Int, payload: ByteArray): ByteArray {
        val out = ByteArrayOutputStream()
        out.write(FEND)
        fun put(value: Int) = when (value) {
            FEND -> { out.write(FESC); out.write(TFEND) }
            FESC -> { out.write(FESC); out.write(TFESC) }
            else -> out.write(value)
        }
        put(((port and 15) shl 4) or (type and 15))
        for (byte in payload) put(byte.toInt() and 255)
        out.write(FEND)
        return out.toByteArray()
    }

    fun data(payload: ByteArray) = encode(0, 0, payload)
}

/** Streaming decoder: feed notification chunks as they arrive; complete frames are returned. */
class KissDecoder(private val maxFrame: Int = 2048) {
    private val buffer = ByteArrayOutputStream()
    private var escaped = false
    private var overflow = false

    fun feed(bytes: ByteArray): List<KissFrame> {
        val frames = ArrayList<KissFrame>()
        for (raw in bytes) {
            val value = raw.toInt() and 255
            if (value == Kiss.FEND) {
                val body = buffer.toByteArray()
                if (body.isNotEmpty() && !overflow) frames.add(KissFrame(body[0].toInt() shr 4 and 15, body[0].toInt() and 15, body.copyOfRange(1, body.size)))
                buffer.reset(); escaped = false; overflow = false
                continue
            }
            val byte = if (escaped) {
                escaped = false
                when (value) { Kiss.TFEND -> Kiss.FEND; Kiss.TFESC -> Kiss.FESC; else -> value }
            } else if (value == Kiss.FESC) { escaped = true; continue } else value
            if (buffer.size() >= maxFrame) overflow = true else buffer.write(byte)
        }
        return frames
    }

    fun reset() { buffer.reset(); escaped = false; overflow = false }
}

data class Ax25Address(val call: String, val ssid: Int = 0, val repeated: Boolean = false) {
    override fun toString() = (if (ssid == 0) call else "$call-$ssid") + if (repeated) "*" else ""

    fun encode(last: Boolean, commandBit: Boolean = false): ByteArray {
        val out = ByteArray(7)
        for (index in 0 until 6) out[index] = ((if (index < call.length) call[index].code else 0x20) shl 1).toByte()
        out[6] = (0x60 or (ssid shl 1) or (if (repeated || commandBit) 0x80 else 0) or (if (last) 1 else 0)).toByte()
        return out
    }

    companion object {
        private val PATTERN = Regex("[A-Z0-9]{1,6}(-([0-9]|1[0-5]))?")

        fun isValid(text: String) = PATTERN.matches(text.trim().uppercase())

        fun parse(text: String): Ax25Address {
            val clean = text.trim().uppercase().removeSuffix("*")
            requireUi(PATTERN.matches(clean)) { UiText(R.string.err_aprs_callsign, text) }
            val parts = clean.split('-')
            return Ax25Address(parts[0], parts.getOrNull(1)?.toInt() ?: 0)
        }

        fun decode(bytes: ByteArray, offset: Int): Ax25Address {
            val call = String(CharArray(6) { ((bytes[offset + it].toInt() and 255) shr 1).toChar() }).trim()
            val last = bytes[offset + 6].toInt() and 255
            return Ax25Address(call, (last shr 1) and 15, last and 0x80 != 0)
        }
    }
}

class Ax25Frame(val destination: Ax25Address, val source: Ax25Address, val digipeaters: List<Ax25Address>, val info: ByteArray) {
    fun encode(): ByteArray {
        requireUi(digipeaters.size <= 8) { UiText(R.string.err_aprs_path) }
        val out = ByteArrayOutputStream()
        out.write(destination.encode(last = false, commandBit = true))
        out.write(source.encode(last = digipeaters.isEmpty()))
        digipeaters.forEachIndexed { index, digi -> out.write(digi.encode(last = index == digipeaters.lastIndex)) }
        out.write(0x03)
        out.write(0xF0)
        out.write(info)
        return out.toByteArray()
    }

    val path get() = digipeaters.joinToString(",")

    companion object {
        /** Null for anything that is not a UI frame with PID 0xF0. */
        fun decode(bytes: ByteArray): Ax25Frame? {
            if (bytes.size < 16) return null
            var count = 0
            while (count < 10 && 7 * (count + 1) <= bytes.size && bytes[7 * count + 6].toInt() and 1 == 0) count++
            val addresses = count + 1
            if (addresses < 2 || addresses > 10 || 7 * addresses + 2 > bytes.size) return null
            if (bytes[7 * addresses].toInt() and 0xEF != 0x03 || bytes[7 * addresses + 1].toInt() and 255 != 0xF0) return null
            val list = (0 until addresses).map { Ax25Address.decode(bytes, it * 7) }
            return Ax25Frame(list[0], list[1], list.drop(2), bytes.copyOfRange(7 * addresses + 2, bytes.size))
        }
    }
}

sealed class AprsPacket {
    data class Message(val addressee: String, val text: String, val id: String?) : AprsPacket()
    data class Ack(val addressee: String, val id: String) : AprsPacket()
    data class Reject(val addressee: String, val id: String) : AprsPacket()
    data class Other(val text: String) : AprsPacket()
}

object AprsText {
    const val MAX_TEXT = 67
    const val TOCALL = "APZBRC"
    const val RETRY_MS = 30_000L
    const val MAX_RETRIES = 3

    fun padAddressee(call: String) = call.padEnd(9)

    fun cleanText(text: String): String {
        requireUi(text.isNotBlank() && text.length <= MAX_TEXT && text.all { it.code in 32..126 && it != '{' && it != '|' && it != '~' }) {
            UiText(R.string.err_aprs_text, MAX_TEXT)
        }
        return text
    }

    fun message(addressee: String, text: String, id: String?) =
        ":" + padAddressee(addressee) + ":" + cleanText(text) + (if (id != null) "{$id" else "")

    fun ack(addressee: String, id: String) = ":" + padAddressee(addressee) + ":ack$id"

    fun parse(info: ByteArray): AprsPacket {
        val text = String(info, Charsets.ISO_8859_1).trimEnd('\r', '\n')
        if (text.length < 11 || text[0] != ':' || text[10] != ':') return AprsPacket.Other(text)
        val addressee = text.substring(1, 10).trim()
        val body = text.substring(11)
        if (body.startsWith("ack") && body.length > 3 && !body.contains('{')) return AprsPacket.Ack(addressee, body.substring(3))
        if (body.startsWith("rej") && body.length > 3 && !body.contains('{')) return AprsPacket.Reject(addressee, body.substring(3))
        val brace = body.lastIndexOf('{')
        return if (brace >= 0 && body.length - brace - 1 in 1..5) AprsPacket.Message(addressee, body.substring(0, brace), body.substring(brace + 1))
        else AprsPacket.Message(addressee, body, null)
    }
}

class AprsMessenger(
    callsign: String,
    var autoAck: Boolean = true,
    private val sendFrame: (Ax25Frame) -> Unit
) {
    enum class State { RECEIVED, PENDING, ACKED, REJECTED, FAILED }

    class Entry(val outgoing: Boolean, val peer: String, val text: String, val id: String?, val time: Long) {
        var state = if (outgoing) State.PENDING else State.RECEIVED
        var attempts = if (outgoing) 1 else 0
        var lastSent = time
    }

    class Logged(val time: Long, val source: String, val path: String, val text: String)

    var callsign: String = callsign.trim().uppercase()
    var path: List<Ax25Address> = listOf(Ax25Address("WIDE1", 1), Ax25Address("WIDE2", 1))
    val entries = ArrayList<Entry>()
    val log = ArrayList<Logged>()
    private var counter = 0
    private val seen = HashSet<String>()

    private fun frame(info: String) =
        Ax25Frame(Ax25Address(AprsText.TOCALL), Ax25Address.parse(callsign), path, info.toByteArray(Charsets.ISO_8859_1))

    /** The frame [send] would transmit (id placeholder), for validation without sending. */
    fun draft(addressee: String, text: String): Ax25Frame =
        frame(AprsText.message(Ax25Address.parse(addressee).toString(), text, "000"))

    @Synchronized
    fun send(addressee: String, text: String, now: Long): Entry {
        requireUi(callsign.isNotEmpty() && Ax25Address.isValid(callsign)) { UiText(R.string.err_aprs_no_callsign) }
        val peer = Ax25Address.parse(addressee).toString()
        counter = counter % 999 + 1
        val id = counter.toString().padStart(3, '0')
        val info = AprsText.message(peer, text, id)
        val entry = Entry(true, peer, text, id, now)
        entries.add(entry)
        sendFrame(frame(info))
        return entry
    }

    /** Resends unacknowledged messages every 30 s, up to 3 retries, then marks them failed. A failed write stops all retries. */
    @Synchronized
    fun tick(now: Long) {
        for (entry in entries) {
            if (!entry.outgoing || entry.state != State.PENDING || now - entry.lastSent < AprsText.RETRY_MS) continue
            if (entry.attempts > AprsText.MAX_RETRIES) { entry.state = State.FAILED; continue }
            entry.attempts++
            entry.lastSent = now
            try {
                sendFrame(frame(AprsText.message(entry.peer, entry.text, entry.id)))
            } catch (error: Exception) {
                abortPending()
                throw error
            }
        }
    }

    /** Marks every pending outgoing message failed so no further resend happens (link closed or write failed). */
    @Synchronized
    fun abortPending() {
        entries.filter { it.outgoing && it.state == State.PENDING }.forEach { it.state = State.FAILED }
    }

    @Synchronized
    fun receive(raw: ByteArray, now: Long): Ax25Frame? {
        val frame = Ax25Frame.decode(raw) ?: return null
        val source = frame.source.toString()
        val packet = AprsText.parse(frame.info)
        log.add(Logged(now, source, frame.path, when (packet) {
            is AprsPacket.Message -> ":${packet.addressee}: ${packet.text}"
            is AprsPacket.Ack -> ":${packet.addressee}: ack ${packet.id}"
            is AprsPacket.Reject -> ":${packet.addressee}: rej ${packet.id}"
            is AprsPacket.Other -> packet.text
        }))
        val mine = callsign
        when (packet) {
            is AprsPacket.Message -> if (packet.addressee.equals(mine, true) && mine.isNotEmpty()) {
                if (packet.id != null && autoAck) sendFrame(frame(AprsText.ack(source, packet.id)))
                if (packet.id == null || seen.add("$source/${packet.id}/${packet.text}")) {
                    entries.add(Entry(false, source, packet.text, packet.id, now))
                }
            }
            is AprsPacket.Ack -> settle(packet.addressee, source, packet.id, State.ACKED)
            is AprsPacket.Reject -> settle(packet.addressee, source, packet.id, State.REJECTED)
            is AprsPacket.Other -> {}
        }
        return frame
    }

    private fun settle(addressee: String, source: String, id: String, state: State) {
        if (!addressee.equals(callsign, true)) return
        entries.firstOrNull { it.outgoing && it.state == State.PENDING && it.id == id && it.peer.equals(source, true) }?.state = state
    }
}
