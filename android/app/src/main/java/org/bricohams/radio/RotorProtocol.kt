package org.bricohams.radio

import org.json.JSONException
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.util.UUID

/**
 * Wire protocol of the Brico-Hams AZ/EL rotor (Brico-Hams/antenaSatCommrotor, ESP32 firmware).
 * HTTP and BLE carry the same JSON API; BLE wraps it in 20-byte frames for the 23-byte ATT MTU.
 */
object RotorProtocol {
    const val AP_HOST = "192.168.4.1"
    const val BLE_NAME = "PortableSatStation"
    val SERVICE: UUID = UUID.fromString("c8200001-4e53-4253-9000-000000000001")
    val RX: UUID = UUID.fromString("c8200002-4e53-4253-9000-000000000001")
    val TX: UUID = UUID.fromString("c8200003-4e53-4253-9000-000000000001")
    val CCCD: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    const val MAGIC: Byte = 0x53
    const val START = 1
    const val END = 2
    const val FRAME_PAYLOAD = 16
    const val MAX_REQUEST = 2048
    const val MAX_RESPONSE = 8192
    const val TOKEN_MIN = 24
    const val TOKEN_MAX = 128

    fun validToken(token: String) = token.length in TOKEN_MIN..TOKEN_MAX && token.all { it.code in 32..126 }

    fun request(id: Long, method: String, path: String, token: String, body: JSONObject?): ByteArray {
        require(id > 0) { "id" }
        val text = JSONObject().apply {
            put("v", 1); put("id", id); put("method", method); put("path", path); put("token", token)
            put("body", body ?: JSONObject())
        }.toString() + "\n"
        val bytes = text.toByteArray(Charsets.UTF_8)
        if (bytes.size > MAX_REQUEST) throw LocalizedIOException(UiText(R.string.rotor_err_request_large))
        return bytes
    }

    /** Splits a request in START/END frames: [magic, flags, seq lo, seq hi, 1..16 payload bytes]. */
    fun frames(message: ByteArray): List<ByteArray> {
        require(message.isNotEmpty() && message.size <= MAX_REQUEST && message.none { it == 0.toByte() })
        val count = (message.size + FRAME_PAYLOAD - 1) / FRAME_PAYLOAD
        return (0 until count).map { sequence ->
            val start = sequence * FRAME_PAYLOAD
            val end = minOf(message.size, start + FRAME_PAYLOAD)
            var flags = 0
            if (sequence == 0) flags = flags or START
            if (sequence == count - 1) flags = flags or END
            byteArrayOf(MAGIC, flags.toByte(), (sequence and 255).toByte(), (sequence shr 8).toByte()) +
                message.copyOfRange(start, end)
        }
    }

    /** Reassembles notification frames. A new START discards any partial message (e.g. STOP preemption). */
    class Assembler(private val limit: Int = MAX_RESPONSE + 256) {
        private val buffer = ByteArrayOutputStream()
        private var expected = 0
        private var active = false

        /** Returns the complete message, or null while more frames are needed. */
        fun feed(frame: ByteArray): String? {
            if (frame.size < 5 || frame[0] != MAGIC) throw LocalizedIOException(UiText(R.string.rotor_err_frame))
            val flags = frame[1].toInt() and 255
            val sequence = (frame[2].toInt() and 255) or ((frame[3].toInt() and 255) shl 8)
            if (flags and START != 0) { buffer.reset(); expected = 0; active = true }
            if (!active || sequence != expected) { reset(); throw LocalizedIOException(UiText(R.string.rotor_err_frame)) }
            buffer.write(frame, 4, frame.size - 4)
            if (buffer.size() > limit) { reset(); throw LocalizedIOException(UiText(R.string.rotor_err_frame)) }
            expected++
            if (flags and END == 0) return null
            val text = buffer.toString(Charsets.UTF_8.name())
            reset()
            return text
        }
        fun reset() { buffer.reset(); expected = 0; active = false }
    }

    fun parseObject(text: String): JSONObject = try {
        if (text.isBlank()) JSONObject() else JSONObject(text)
    } catch (error: JSONException) {
        throw LocalizedIOException(UiText(R.string.rotor_err_json), error)
    }

    /** Decodes a BLE envelope `{"v":1,"id":n,"code":c,"data":{...}}`. */
    fun envelope(text: String): Triple<Long, Int, JSONObject> {
        val json = parseObject(text)
        if (json.optInt("v") != 1 || !json.has("id") || !json.has("code")) throw LocalizedIOException(UiText(R.string.rotor_err_json))
        return Triple(json.optLong("id"), json.optInt("code"), json.optJSONObject("data") ?: JSONObject())
    }

    /** Text block accepted by the firmware TLE parser: 3LE with a printable ASCII name line. */
    fun tleText(tles: List<Tle>): String = tles.joinToString("") { tle ->
        val name = tle.name.map { if (it.code in 32..126) it else '?' }.joinToString("").trim().take(60)
        (if (name.isEmpty()) "" else "0 $name\n") + tle.line1.trim() + "\n" + tle.line2.trim() + "\n"
    }
}

class RotorException(val code: Int, val detail: String) :
    IOException("HTTP $code: $detail"), LocalizedError {
    override val text: UiText get() = UiText(R.string.rotor_err_response, code, detail)
}

data class RotorResponse(val code: Int, val data: JSONObject) {
    fun message(): String = data.optString("error", data.optString("message", ""))
    fun require(vararg accepted: Int): JSONObject {
        if (code !in accepted) throw RotorException(code, message())
        return data
    }
}

data class RotorStatus(
    val apiVersion: Int,
    val firmwareVersion: String,
    val mode: String,
    val fault: String,
    val hardwareConfigured: Boolean,
    val controlOwner: String,
    val homed: Boolean,
    val calibrated: Boolean,
    val level: Boolean,
    val utcValid: Boolean,
    val utc: Long,
    val timeSource: String,
    val siteValid: Boolean,
    val northOffset: Double,
    val azMechanical: Double,
    val elevation: Double,
    val skyAz: Double,
    val skyEl: Double,
    val trackingBlocker: String,
    val selected: Int,
    val maxDegPerSecond: Double,
    val microsteps: Int,
) {
    val busy get() = mode == "HOMING" || mode == "MOVING" || mode == "TRACKING"
    val supportsAppTime get() = apiVersion >= 2

    companion object {
        /** Speed of the reference build (500 microsteps/s at 80000 per revolution) for API v1 firmware. */
        const val REFERENCE_DEG_PER_SECOND = 2.25

        fun parse(json: JSONObject) = RotorStatus(
            apiVersion = json.optInt("apiVersion", 1),
            firmwareVersion = json.optString("firmwareVersion", "?"),
            mode = json.optString("mode", "?"),
            fault = json.optString("fault", ""),
            hardwareConfigured = json.optBoolean("hardwareConfigured", false),
            controlOwner = json.optString("controlOwner", "none"),
            homed = json.optBoolean("homed", false),
            calibrated = json.optBoolean("calibrated", false),
            level = json.optBoolean("level", false),
            utcValid = json.optBoolean("utcValid", false),
            utc = json.optLong("utc", 0),
            timeSource = json.optString("timeSource", if (json.optBoolean("utcValid")) "gnss" else "none"),
            siteValid = json.optBoolean("siteValid", false),
            northOffset = json.optDouble("northOffset", 0.0),
            azMechanical = json.optDouble("azMechanical", 0.0),
            elevation = json.optDouble("el", 0.0),
            skyAz = json.optDouble("skyAz", Double.NaN),
            skyEl = json.optDouble("skyEl", Double.NaN),
            trackingBlocker = json.optString("trackingBlocker", ""),
            selected = json.optInt("selected", -1),
            maxDegPerSecond = json.optDouble("maxDegPerSecond", REFERENCE_DEG_PER_SECOND)
                .takeIf { it.isFinite() && it > 0 } ?: REFERENCE_DEG_PER_SECOND,
            microsteps = json.optInt("microsteps", 16),
        )
    }
}
