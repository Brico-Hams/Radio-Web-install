package org.bricohams.radio

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.URL
import javax.net.ssl.HttpsURLConnection

data class Transmitter(val norad: Int, val description: String, val downlinkHz: Long, val mode: String,
    val uplinkHz: Long? = null, val invert: Boolean = false)

object SatelliteSources {
    const val TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle"
    const val TRANSMITTERS_URL = "https://db.satnogs.org/api/transmitters/?format=json"
    const val SATNOGS_TLE_URL = "https://db.satnogs.org/api/tle/?format=json"
    const val AMSAT_TLE_URL = "https://www.amsat.org/tle/current/nasabare.txt"
    const val SOURCE_TIMEOUT_MS = 10000
    private const val MAX_AGE_MS = 7 * 86400000L
    private const val MAX_FUTURE_MS = 86400000L
    private const val MAX_SATELLITES = 250

    enum class TleSource(val label: String) { CELESTRAK("CelesTrak"), SATNOGS("SatNOGS"), AMSAT("AMSAT") }

    class Downloaded(val tle: List<Tle>, val transmitters: List<Transmitter>, val source: TleSource, val warning: String)

    /** Epoch of a TLE in UTC milliseconds, read from line 1 columns 19-32 (yyddd.dddddddd). */
    fun epochMillis(tle: Tle): Long {
        val year = tle.line1.substring(18, 20).trim().toInt().let { if (it < 57) 2000 + it else 1900 + it }
        val day = tle.line1.substring(20, 32).trim().toDouble()
        val start = java.util.GregorianCalendar(java.util.TimeZone.getTimeZone("UTC")).apply {
            clear(); set(year, 0, 1)
        }.timeInMillis
        return start + ((day - 1) * 86400000.0).toLong()
    }

    fun isFresh(tle: Tle, now: Long): Boolean = try {
        val epoch = epochMillis(tle)
        now - epoch <= MAX_AGE_MS && epoch - now <= MAX_FUTURE_MS
    } catch (error: RuntimeException) { false }

    /** Drops stale/future entries; fails when nothing usable remains so the next source is tried. */
    private fun freshOrFail(list: List<Tle>, now: Long, source: TleSource): List<Tle> =
        list.filter { isFresh(it, now) }.ifEmpty { throw IOException("${source.label}: TLE caducados o vacios.") }

    /** SatNOGS DB /api/tle: objects with tle0 (name), tle1, tle2, norad_cat_id; only satellites in [norads] are kept. */
    fun parseSatnogsTle(text: String, norads: Set<Int>): List<Tle> {
        val array = try { JSONArray(text) } catch (error: JSONException) {
            throw IllegalArgumentException("Respuesta SatNOGS no valida: ${error.message}", error)
        }
        val best = HashMap<Int, Tle>()
        for (index in 0 until array.length()) {
            val item = array.optJSONObject(index) ?: continue
            val norad = item.optInt("norad_cat_id", -1)
            if (norad !in norads || item.isNull("tle1") || item.isNull("tle2")) continue
            val name = (if (item.isNull("tle0")) "" else item.optString("tle0")).trim().removePrefix("0 ").trim()
                .filter { it.code in 32..126 }.ifBlank { "NORAD $norad" }
            val tle = try { Tle(name, item.getString("tle1").trim(), item.getString("tle2").trim()).validated() }
                catch (error: RuntimeException) { continue }
            if (tle.norad != norad) continue
            val old = best[norad]
            if (old == null || epochMillis(tle) > epochMillis(old)) best[norad] = tle
        }
        return best.values.sortedBy { it.norad }.take(MAX_SATELLITES)
    }

    /** AMSAT nasabare.txt: plain three-line sets (name, line 1, line 2). */
    fun parseNasabare(bytes: ByteArray): List<Tle> = parseTle(bytes).take(MAX_SATELLITES)

    /**
     * CelesTrak first; when it fails, SatNOGS DB (restricted to satellites with transmitters), then AMSAT.
     * Sources run sequentially on the calling thread; throws only if every source fails.
     */
    fun download(fetch: (String, Int) -> ByteArray, now: Long = System.currentTimeMillis()): Downloaded {
        val failures = ArrayList<String>()
        fun transmittersFor(tle: List<Tle>): Pair<List<Transmitter>, String> = try {
            parseTransmitters(fetch(TRANSMITTERS_URL, 16 * 1024 * 1024).toString(Charsets.UTF_8), tle.map { it.norad }.toSet()) to ""
        } catch (error: IOException) { emptyList<Transmitter>() to (error.message ?: "") }
        catch (error: IllegalArgumentException) { emptyList<Transmitter>() to (error.message ?: "") }

        try {
            val tle = freshOrFail(parseTle(fetch(TLE_URL, 256 * 1024)), now, TleSource.CELESTRAK)
            val (list, warning) = transmittersFor(tle)
            return Downloaded(tle, list, TleSource.CELESTRAK, warning)
        } catch (error: IOException) { failures.add("CelesTrak: ${error.message}") }
        catch (error: IllegalArgumentException) { failures.add("CelesTrak: ${error.message}") }

        try {
            val raw = fetch(TRANSMITTERS_URL, 16 * 1024 * 1024).toString(Charsets.UTF_8)
            val withTransmitters = JSONArray(raw).let { array ->
                (0 until array.length()).map { array.getJSONObject(it).optInt("norad_cat_id", -1) }.filter { it > 0 }.toSet()
            }
            val tle = freshOrFail(parseSatnogsTle(fetch(SATNOGS_TLE_URL, 8 * 1024 * 1024).toString(Charsets.UTF_8), withTransmitters),
                now, TleSource.SATNOGS)
            return Downloaded(tle, parseTransmitters(raw, tle.map { it.norad }.toSet()), TleSource.SATNOGS, "")
        } catch (error: IOException) { failures.add("SatNOGS: ${error.message}") }
        catch (error: IllegalArgumentException) { failures.add("SatNOGS: ${error.message}") }
        catch (error: JSONException) { failures.add("SatNOGS: ${error.message}") }

        try {
            val tle = freshOrFail(parseNasabare(fetch(AMSAT_TLE_URL, 256 * 1024)), now, TleSource.AMSAT)
            val (list, warning) = transmittersFor(tle)
            return Downloaded(tle, list, TleSource.AMSAT, warning)
        } catch (error: IOException) { failures.add("AMSAT: ${error.message}") }
        catch (error: IllegalArgumentException) { failures.add("AMSAT: ${error.message}") }

        throw IOException(failures.joinToString("; "))
    }

    fun fetch(url: String, limit: Int): ByteArray {
        val connection = URL(url).openConnection() as? HttpsURLConnection ?: throw IOException("Solo se admite HTTPS.")
        try {
            connection.connectTimeout = SOURCE_TIMEOUT_MS
            connection.readTimeout = SOURCE_TIMEOUT_MS
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
                downlink, (if (item.isNull("mode")) "" else item.optString("mode")).take(24).filter { it.code >= 32 }.ifBlank { "?" },
                (if (item.isNull("uplink_low")) null else item.optLong("uplink_low", -1)).takeIf { it != null && it > 0 && it % 10 == 0L },
                item.optBoolean("invert", false))
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
                .put("downlinkHz", it.downlinkHz).put("mode", it.mode).put("invert", it.invert)
                .apply { it.uplinkHz?.let { uplink -> put("uplinkHz", uplink) } }) }
        }.toString())
    }
    fun catalog(): List<Tle> = if (tle.isFile) Tle.parseCatalog(tle.readText(Charsets.US_ASCII)) else emptyList()
    fun transmitters(): List<Transmitter> = if (!transmitters.isFile) emptyList() else try {
        val array = JSONArray(transmitters.readText())
        (0 until array.length()).map { array.getJSONObject(it) }.map {
            Transmitter(it.getInt("norad"), it.getString("description"), it.getLong("downlinkHz"), it.getString("mode"),
                if (it.has("uplinkHz")) it.getLong("uplinkHz") else null, it.optBoolean("invert", false))
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
