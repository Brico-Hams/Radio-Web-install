package org.bricohams.radio

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.URL
import javax.net.ssl.HttpsURLConnection

data class Transmitter(val norad: Int, val description: String, val downlinkHz: Long, val mode: String)

object SatelliteSources {
    const val TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle"
    const val TRANSMITTERS_URL = "https://db.satnogs.org/api/transmitters/?format=json"

    fun fetch(url: String, limit: Int): ByteArray {
        val connection = URL(url).openConnection() as? HttpsURLConnection ?: throw IOException("Solo se admite HTTPS.")
        try {
            connection.connectTimeout = 15000
            connection.readTimeout = 30000
            connection.instanceFollowRedirects = false
            connection.setRequestProperty("User-Agent", "Bricohams-Android")
            if (connection.responseCode != 200) throw IOException("${connection.url.host} respondio HTTP ${connection.responseCode}.")
            connection.inputStream.use { input ->
                val output = java.io.ByteArrayOutputStream()
                val buffer = ByteArray(16384)
                while (true) {
                    if (Thread.currentThread().isInterrupted) throw java.io.InterruptedIOException("Descarga cancelada.")
                    val count = input.read(buffer)
                    if (count < 0) return output.toByteArray()
                    output.write(buffer, 0, count)
                    if (output.size() > limit) throw IOException("Descarga mayor de ${limit / 1024} KiB.")
                }
            }
        } finally { connection.disconnect() }
    }

    /** CelesTrak pads names with spaces; TLE lines end in a checksum digit, so trimming is lossless. */
    fun parseTle(bytes: ByteArray): List<Tle> {
        require(bytes.all { (it.toInt() and 255) < 128 }) { "Catalogo TLE debe ser ASCII." }
        return Tle.parseCatalog(bytes.toString(Charsets.US_ASCII).lineSequence().joinToString("\n") { it.trimEnd() })
            .map { it.copy(name = it.name.trim()) }
    }

    /** Keeps alive, active transmitters of catalogued satellites whose downlink the radio can receive. */
    fun parseTransmitters(text: String, norads: Set<Int>): List<Transmitter> = try {
        val array = JSONArray(text)
        (0 until array.length()).mapNotNull { index ->
            val item = array.getJSONObject(index)
            val norad = item.optInt("norad_cat_id", -1)
            val downlink = if (item.isNull("downlink_low")) -1L else item.optLong("downlink_low", -1)
            if (norad !in norads || !item.optBoolean("alive") || item.optString("status") != "active" ||
                downlink <= 0 || downlink % 10 != 0L || !CatProtocol.inBand(downlink / 10)) null
            else Transmitter(norad, item.optString("description").take(80).filter { it.code >= 32 },
                downlink, (if (item.isNull("mode")) "" else item.optString("mode")).take(24).filter { it.code >= 32 }.ifBlank { "?" })
        }.distinct().sortedWith(compareBy({ it.norad }, { it.downlinkHz }))
    } catch (error: JSONException) {
        throw IllegalArgumentException("Respuesta SatNOGS no valida: ${error.message}", error)
    }
}

/** Private files: last downloaded or imported catalogue and its transmitters. */
class SatelliteStore(private val directory: File) {
    private val tle = File(directory, "catalog.tle")
    private val transmitters = File(directory, "transmitters.json")

    val updated: Long get() = tle.lastModified()

    fun saveCatalog(catalog: List<Tle>, list: List<Transmitter>) {
        require(catalog.isNotEmpty()) { "Catalogo vacio." }
        directory.mkdirs()
        write(tle, catalog.joinToString("") { "${it.name}\n${it.line1}\n${it.line2}\n" })
        write(transmitters, JSONArray().apply {
            list.forEach { put(JSONObject().put("norad", it.norad).put("description", it.description)
                .put("downlinkHz", it.downlinkHz).put("mode", it.mode)) }
        }.toString())
    }
    fun catalog(): List<Tle> = if (tle.isFile) Tle.parseCatalog(tle.readText(Charsets.US_ASCII)) else emptyList()
    fun transmitters(): List<Transmitter> = if (!transmitters.isFile) emptyList() else try {
        val array = JSONArray(transmitters.readText())
        (0 until array.length()).map { array.getJSONObject(it) }.map {
            Transmitter(it.getInt("norad"), it.getString("description"), it.getLong("downlinkHz"), it.getString("mode"))
        }
    } catch (error: JSONException) {
        throw IllegalArgumentException("Frecuencias guardadas danadas; vuelve a actualizar.", error)
    }
    private fun write(target: File, text: String) {
        val temporary = File(directory, target.name + ".tmp")
        temporary.writeText(text)
        if (!temporary.renameTo(target)) {
            target.delete()
            if (!temporary.renameTo(target)) throw IOException("No se pudo guardar ${target.name}.")
        }
    }
}
