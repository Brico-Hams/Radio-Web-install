package org.bricohams.radio

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import org.json.JSONObject
import java.io.Closeable
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/** One JSON request/response exchange with the rotor over any link. Implementations are used from one worker thread. */
interface RotorTransport : Closeable {
    fun exchange(method: String, path: String, body: JSONObject? = null): RotorResponse
    override fun close() {}
}

enum class RotorTimeSync { APP, GNSS, UNSUPPORTED }

/** Typed API of the rotor firmware; every call is blocking and must run off the UI thread. */
class RotorClient(private val transport: RotorTransport) : Closeable {
    private fun post(path: String, body: JSONObject = JSONObject()) = transport.exchange("POST", path, body)

    fun status(): RotorStatus = RotorStatus.parse(transport.exchange("GET", "/api/status").require(200))

    /** Gives the rotor the phone's UTC when it has no GNSS receiver (firmware API v2, see hardware/rotor). */
    fun syncTime(nowMs: Long): RotorTimeSync {
        val response = post("/api/time", JSONObject().put("utcMs", nowMs))
        return when {
            response.code == 200 -> RotorTimeSync.APP
            response.code == 404 -> RotorTimeSync.UNSUPPORTED
            response.code == 409 && response.message().contains("GNSS") -> RotorTimeSync.GNSS
            else -> throw RotorException(response.code, response.message())
        }
    }

    fun setSite(observer: ObserverPosition) {
        observer.validated()
        post("/api/site", JSONObject().put("manual", true).put("lat", observer.latitude)
            .put("lon", observer.longitude).put("alt", observer.heightKm * 1000)).require(200)
    }

    /** Replaces the rotor TLE cache with [tle] alone and selects it (id 0). */
    fun loadSatellite(tle: Tle) {
        post("/api/tle", JSONObject().put("text", RotorProtocol.tleText(listOf(tle.validated())))).require(200)
        post("/api/select", JSONObject().put("id", 0)).require(200)
    }

    fun move(mechanicalAz: Double, elevation: Double) {
        requireUi(mechanicalAz.isFinite() && mechanicalAz in -180.0..180.0 && elevation.isFinite() && elevation in 0.0..90.0) {
            UiText(R.string.rotor_err_track)
        }
        post("/api/move", JSONObject().put("az", mechanicalAz).put("el", elevation)).require(202)
    }
    fun track(): RotorResponse = post("/api/track")
    fun stop() { post("/api/stop").require(200) }
    fun home() { post("/api/home").require(202) }
    fun clear() { post("/api/clear").require(200) }
    fun calibrate(trueAzimuth: Double) {
        requireUi(trueAzimuth.isFinite()) { UiText(R.string.rotor_err_azimuth) }
        post("/api/calibrate", JSONObject().put("trueAz", RotorPlanner.wrap(trueAzimuth) % 360).put("levelConfirmed", true)).require(200)
    }

    override fun close() = transport.close()
}

/**
 * HTTP to the rotor's own Wi-Fi access point. The AP has no internet, so requests are bound to the Wi-Fi network
 * explicitly; otherwise Android may route them over mobile data. Cleartext is allowed only for the AP address.
 */
class HttpRotorTransport(context: Context, private val token: String, private val host: String = RotorProtocol.AP_HOST) : RotorTransport {
    private val connectivity = context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    init { requireUi(RotorProtocol.validToken(token)) { UiText(R.string.rotor_err_token) } }

    @Suppress("DEPRECATION")
    private fun wifi(): Network? = connectivity.allNetworks.firstOrNull {
        connectivity.getNetworkCapabilities(it)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
    }

    override fun exchange(method: String, path: String, body: JSONObject?): RotorResponse {
        val url = URL("http", host, 80, path)
        val network = wifi() ?: throw LocalizedIOException(UiText(R.string.rotor_err_wifi))
        val connection = network.openConnection(url) as HttpURLConnection
        try {
            connection.connectTimeout = 4000
            connection.readTimeout = 8000
            connection.requestMethod = method
            connection.useCaches = false
            connection.setRequestProperty("X-Control-Token", token)
            connection.setRequestProperty("Accept", "application/json")
            if (method == "POST") {
                val bytes = (body ?: JSONObject()).toString().toByteArray(Charsets.UTF_8)
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setFixedLengthStreamingMode(bytes.size)
                connection.outputStream.use { it.write(bytes) }
            }
            val code = connection.responseCode
            val stream = if (code >= 400) connection.errorStream else connection.inputStream
            val text = stream?.use { input ->
                val bytes = input.readBytes()
                if (bytes.size > 128 * 1024) throw LocalizedIOException(UiText(R.string.rotor_err_json))
                String(bytes, Charsets.UTF_8)
            }.orEmpty()
            return RotorResponse(code, RotorProtocol.parseObject(text))
        } catch (error: IOException) {
            if (error is LocalizedError) throw error
            throw LocalizedIOException(UiText(R.string.rotor_err_http, error.message ?: error.javaClass.simpleName), error)
        } finally {
            connection.disconnect()
        }
    }
}
