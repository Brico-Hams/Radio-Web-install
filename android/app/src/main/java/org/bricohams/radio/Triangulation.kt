package org.bricohams.radio

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.time.Instant
import java.time.format.DateTimeParseException
import java.util.Locale
import java.util.UUID
import kotlin.math.abs
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

/** How [BearingObservation.bearingTrueDeg] was obtained; the stored bearing is always relative to true north. */
enum class BearingSource { COMPASS_TRUE, MANUAL_TRUE, MANUAL_MAGNETIC_CORRECTED }

enum class StrengthUnit { S_UNITS, DBM }

/** One line of bearing: an observer, the direction (degrees TRUE, clockwise from north) and its +/- uncertainty. */
data class BearingObservation(
    val id: String = UUID.randomUUID().toString(),
    val callsign: String,
    val latitude: Double,
    val longitude: Double,
    val bearingTrueDeg: Double,
    val uncertaintyDeg: Double = DEFAULT_UNCERTAINTY_DEG,
    val strength: Double? = null,
    val strengthUnit: StrengthUnit = StrengthUnit.S_UNITS,
    val frequencyMhz: Double? = null,
    val utc: Instant,
    val source: BearingSource = BearingSource.MANUAL_TRUE,
    val notes: String = ""
) {
    companion object { const val DEFAULT_UNCERTAINTY_DEG = 10.0 }

    fun validated(): BearingObservation {
        requireUi(id.isNotBlank() && id.length <= 64) { UiText(R.string.tri_err_import) }
        requireUi(latitude.isFinite() && latitude in -90.0..90.0 && longitude.isFinite() && longitude in -180.0..180.0) {
            UiText(R.string.tri_err_position)
        }
        requireUi(bearingTrueDeg.isFinite() && bearingTrueDeg >= 0.0 && bearingTrueDeg < 360.0) { UiText(R.string.tri_err_bearing) }
        requireUi(uncertaintyDeg.isFinite() && uncertaintyDeg in 0.5..90.0) { UiText(R.string.tri_err_uncertainty) }
        requireUi(frequencyMhz == null || (frequencyMhz.isFinite() && frequencyMhz > 0.0)) { UiText(R.string.tri_err_frequency) }
        requireUi(strength == null || (strength.isFinite() &&
            if (strengthUnit == StrengthUnit.S_UNITS) strength in 0.0..9.0 else strength in -160.0..0.0)) {
            UiText(R.string.tri_err_strength)
        }
        return copy(callsign = callsign.trim().uppercase(Locale.ROOT).take(20), notes = notes.take(500))
    }

    /** Signal level in dBm. S-units follow IARU Region 1 Technical Recommendation R.1: S9 = -73 dBm below 30 MHz, -93 dBm above, 6 dB per S-unit. */
    fun strengthDbm(): Double? {
        val value = strength ?: return null
        if (strengthUnit == StrengthUnit.DBM) return value
        val s9 = if (frequencyMhz != null && frequencyMhz < 30.0) -73.0 else -93.0
        return s9 + (value - 9.0) * 6.0
    }
}

data class HuntSession(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val frequencyMhz: Double? = null,
    val observations: List<BearingObservation> = emptyList()
) {
    data class Merge(val session: HuntSession, val added: Int, val duplicates: Int)

    /** Adds the observations of [other] whose id is not yet known; name and frequency of this session are kept. */
    fun merge(other: HuntSession): Merge {
        val known = observations.mapTo(HashSet()) { it.id }
        val fresh = other.observations.filter { known.add(it.id) }
        val all = (observations + fresh).sortedWith(compareBy<BearingObservation> { it.utc }.thenBy { it.id })
        return Merge(copy(observations = all), fresh.size, other.observations.size - fresh.size)
    }
}

enum class TriangulationWarningKind { TOO_FEW, NEAR_PARALLEL, NEAR_PARALLEL_PAIR, BEHIND_OBSERVER }

data class TriangulationWarning(val kind: TriangulationWarningKind, val first: String? = null, val second: String? = null)

data class RangeBearing(val distanceKm: Double, val bearingDeg: Double)

data class TriangulationResult(
    val latitude: Double?,
    val longitude: Double?,
    val locator: String?,
    /** 95 % confidence ellipse (chi-square, 2 degrees of freedom); axis azimuth is clockwise from true north, 0..180. */
    val semiMajorM: Double,
    val semiMinorM: Double,
    val majorAxisAzimuthDeg: Double,
    val radius95M: Double,
    val warnings: List<TriangulationWarning>,
    val used: Int
) {
    val hasEstimate get() = latitude != null && longitude != null
}

data class SignalRank(val observation: BearingObservation, val dbm: Double)

/**
 * Bearing-line intersection for fox hunting / interference location.
 *
 * Method: weighted least-squares intersection of bearing lines (the classic "Stansfield"-type fix for direction finding, see
 * R. G. Stansfield, "Statistical theory of d.f. fixing", J. IEE 94 (1947), and the least-squares line-intersection solution).
 * Observers are projected onto a local tangent plane (east/north metres) around their centroid using the WGS84 radii of
 * curvature at that latitude; each bearing i gives the line n_i . (p - o_i) = 0 with n_i the unit normal, weighted 1/sigma_i^2
 * (sigma = bearing uncertainty). The covariance of the fix is propagated with the sandwich form A^-1 (sum w^2 s_d^2 n n^T) A^-1,
 * where s_d = range * sigma (radians) is the cross-range error of each line, and the 95 % ellipse scales its eigenvalues by the
 * chi-square quantile for two degrees of freedom. The plane approximation is meant for areas up to a few hundred km.
 */
object Triangulation {
    const val MIN_CROSSING_DEG = 10.0
    private const val CHI2_95_2DOF = 5.991
    private const val WGS84_A = 6378137.0
    private const val WGS84_E2 = 0.00669437999014
    private const val EARTH_MEAN_KM = 6371.0088

    /** Smallest angle between two bearing lines, 0..90 (lines, so a bearing and its reciprocal are parallel). */
    fun crossingAngle(first: Double, second: Double): Double {
        val diff = abs(((first - second) % 180.0 + 180.0) % 180.0)
        return min(diff, 180.0 - diff)
    }

    fun rangeBearing(fromLat: Double, fromLon: Double, toLat: Double, toLon: Double): RangeBearing {
        val p1 = Math.toRadians(fromLat); val p2 = Math.toRadians(toLat)
        val dl = Math.toRadians(toLon - fromLon)
        val a = sin((p2 - p1) / 2).let { it * it } + cos(p1) * cos(p2) * sin(dl / 2).let { it * it }
        val distance = 2 * EARTH_MEAN_KM * asin(min(1.0, sqrt(a)))
        val bearing = atan2(sin(dl) * cos(p2), cos(p1) * sin(p2) - sin(p1) * cos(p2) * cos(dl))
        return RangeBearing(distance, (Math.toDegrees(bearing) + 360.0) % 360.0)
    }

    /** Observations with a signal level, strongest first: the strongest observer is probably the nearest to the transmitter. */
    fun signalRanking(observations: List<BearingObservation>): List<SignalRank> =
        observations.mapNotNull { o -> o.strengthDbm()?.let { SignalRank(o, it) } }.sortedByDescending { it.dbm }

    private class Plane(val lat0: Double, val lon0: Double) {
        private val sin2 = sin(Math.toRadians(lat0)).let { it * it }
        private val n = WGS84_A / sqrt(1 - WGS84_E2 * sin2)
        private val m = WGS84_A * (1 - WGS84_E2) / Math.pow(1 - WGS84_E2 * sin2, 1.5)
        private val cosLat = cos(Math.toRadians(lat0))
        fun x(lon: Double) = n * cosLat * Math.toRadians(wrap(lon - lon0))
        fun y(lat: Double) = m * Math.toRadians(lat - lat0)
        fun lat(y: Double) = lat0 + Math.toDegrees(y / m)
        fun lon(x: Double) = wrap(lon0 + Math.toDegrees(x / (n * cosLat)))
        private fun wrap(deg: Double) = ((deg + 540.0) % 360.0) - 180.0
    }

    fun estimate(observations: List<BearingObservation>): TriangulationResult {
        fun none(vararg warnings: TriangulationWarning) = TriangulationResult(null, null, null, 0.0, 0.0, 0.0, 0.0, warnings.toList(), 0)
        if (observations.size < 2) return none(TriangulationWarning(TriangulationWarningKind.TOO_FEW))

        val parallel = ArrayList<TriangulationWarning>()
        var widest = 0.0
        for (i in observations.indices) for (j in i + 1 until observations.size) {
            val angle = crossingAngle(observations[i].bearingTrueDeg, observations[j].bearingTrueDeg)
            widest = max(widest, angle)
            if (angle < MIN_CROSSING_DEG) {
                parallel.add(TriangulationWarning(TriangulationWarningKind.NEAR_PARALLEL_PAIR, observations[i].callsign, observations[j].callsign))
            }
        }
        if (widest < MIN_CROSSING_DEG) return none(TriangulationWarning(TriangulationWarningKind.NEAR_PARALLEL))

        // Centroid on the sphere of the observers (circular mean of the longitudes keeps the antimeridian correct).
        val lat0 = observations.sumOf { it.latitude } / observations.size
        val lon0 = Math.toDegrees(atan2(observations.sumOf { sin(Math.toRadians(it.longitude)) },
            observations.sumOf { cos(Math.toRadians(it.longitude)) }))
        val plane = Plane(lat0, lon0)
        val ox = observations.map { plane.x(it.longitude) }
        val oy = observations.map { plane.y(it.latitude) }
        val nx = observations.map { cos(Math.toRadians(it.bearingTrueDeg)) }
        val ny = observations.map { -sin(Math.toRadians(it.bearingTrueDeg)) }
        val w = observations.map { 1.0 / (it.uncertaintyDeg * it.uncertaintyDeg) }

        var a11 = 0.0; var a12 = 0.0; var a22 = 0.0; var b1 = 0.0; var b2 = 0.0
        for (i in observations.indices) {
            val c = nx[i] * ox[i] + ny[i] * oy[i]
            a11 += w[i] * nx[i] * nx[i]; a12 += w[i] * nx[i] * ny[i]; a22 += w[i] * ny[i] * ny[i]
            b1 += w[i] * nx[i] * c; b2 += w[i] * ny[i] * c
        }
        val det = a11 * a22 - a12 * a12
        if (abs(det) < 1e-12) return none(TriangulationWarning(TriangulationWarningKind.NEAR_PARALLEL))
        val px = (a22 * b1 - a12 * b2) / det
        val py = (a11 * b2 - a12 * b1) / det

        val i11 = a22 / det; val i12 = -a12 / det; val i22 = a11 / det
        var m11 = 0.0; var m12 = 0.0; var m22 = 0.0
        val warnings = ArrayList<TriangulationWarning>(parallel)
        for (i in observations.indices) {
            val range = sqrt((px - ox[i]) * (px - ox[i]) + (py - oy[i]) * (py - oy[i]))
            val sigmaD = max(range, 1.0) * Math.toRadians(observations[i].uncertaintyDeg)
            val k = w[i] * w[i] * sigmaD * sigmaD
            m11 += k * nx[i] * nx[i]; m12 += k * nx[i] * ny[i]; m22 += k * ny[i] * ny[i]
            val ahead = sin(Math.toRadians(observations[i].bearingTrueDeg)) * (px - ox[i]) +
                cos(Math.toRadians(observations[i].bearingTrueDeg)) * (py - oy[i])
            if (ahead < 0) warnings.add(TriangulationWarning(TriangulationWarningKind.BEHIND_OBSERVER, observations[i].callsign))
        }
        // cov = A^-1 M A^-1 (A symmetric)
        val t11 = i11 * m11 + i12 * m12; val t12 = i11 * m12 + i12 * m22
        val t21 = i12 * m11 + i22 * m12; val t22 = i12 * m12 + i22 * m22
        val c11 = t11 * i11 + t12 * i12; val c12 = t11 * i12 + t12 * i22; val c22 = t21 * i12 + t22 * i22

        val mean = (c11 + c22) / 2
        val spread = sqrt(((c11 - c22) / 2).let { it * it } + c12 * c12)
        val major = max(mean + spread, 0.0)
        val minor = max(mean - spread, 0.0)
        val axisX: Double; val axisY: Double
        if (abs(c12) < 1e-12) { if (c11 >= c22) { axisX = 1.0; axisY = 0.0 } else { axisX = 0.0; axisY = 1.0 } }
        else { axisX = major - c22; axisY = c12 }
        val azimuth = (Math.toDegrees(atan2(axisX, axisY)) + 360.0) % 180.0

        val lat = plane.lat(py)
        val lon = plane.lon(px)
        val locator = if (lat in -90.0..90.0 && lon in -180.0..180.0) Maidenhead.fromLatLon(lat, lon) else null
        return TriangulationResult(
            lat, lon, locator,
            sqrt(CHI2_95_2DOF * major), sqrt(CHI2_95_2DOF * minor), azimuth,
            sqrt(CHI2_95_2DOF * major), warnings, observations.size
        )
    }

    /** Local east/north offset of a point from an origin, metres, for plotting; same plane as [estimate]. */
    fun localOffsets(originLat: Double, originLon: Double, points: List<Pair<Double, Double>>): List<Pair<Double, Double>> {
        val plane = Plane(originLat, originLon)
        return points.map { Pair(plane.x(it.second), plane.y(it.first)) }
    }
}

/** Compact JSON codec (sharing without a server), CSV and GPX 1.1 exports of a [HuntSession]. */
object HuntCodec {
    const val FORMAT = "radicodex-hunt"
    const val MAX_OBSERVATIONS = 2000
    const val MAX_CHARS = 1_000_000

    private fun observationJson(o: BearingObservation) = JSONObject().apply {
        put("i", o.id); put("c", o.callsign); put("la", o.latitude); put("lo", o.longitude)
        put("b", o.bearingTrueDeg); put("u", o.uncertaintyDeg); put("t", o.utc.toString()); put("src", o.source.name)
        o.strength?.let { put("s", it); put("su", o.strengthUnit.name) }
        o.frequencyMhz?.let { put("f", it) }
        if (o.notes.isNotEmpty()) put("n", o.notes)
    }

    fun sessionJson(session: HuntSession) = JSONObject().apply {
        put("format", FORMAT); put("v", 1); put("id", session.id); put("name", session.name)
        session.frequencyMhz?.let { put("f", it) }
        put("o", JSONArray().also { array -> session.observations.forEach { array.put(observationJson(it)) } })
    }

    fun encode(session: HuntSession): String = sessionJson(session).toString()

    fun encodeAll(sessions: List<HuntSession>): String = JSONArray().also { array -> sessions.forEach { array.put(sessionJson(it)) } }.toString()

    /** Accepts the exact JSON or a messaging-app text that merely contains it. Throws the localized import error otherwise. */
    fun decode(text: String): HuntSession {
        requireUi(text.length <= MAX_CHARS) { UiText(R.string.tri_err_import) }
        val start = text.indexOf('{'); val end = text.lastIndexOf('}')
        requireUi(start in 0 until end) { UiText(R.string.tri_err_import) }
        return try { fromJson(JSONObject(text.substring(start, end + 1))) }
        catch (error: JSONException) { throw LocalizedArgumentException(UiText(R.string.tri_err_import), error) }
        catch (error: DateTimeParseException) { throw LocalizedArgumentException(UiText(R.string.tri_err_import), error) }
        catch (error: NoSuchElementException) { throw LocalizedArgumentException(UiText(R.string.tri_err_import), error) }
        catch (error: NumberFormatException) { throw LocalizedArgumentException(UiText(R.string.tri_err_import), error) }
    }

    fun decodeAll(text: String): List<HuntSession> {
        val array = try { JSONArray(text) } catch (error: JSONException) { return emptyList() }
        return (0 until array.length()).mapNotNull {
            try { fromJson(array.getJSONObject(it)) } catch (_: JSONException) { null } catch (_: IllegalArgumentException) { null }
            catch (_: DateTimeParseException) { null }
        }
    }

    private fun fromJson(json: JSONObject): HuntSession {
        requireUi(json.optString("format") == FORMAT && json.optInt("v") == 1) { UiText(R.string.tri_err_import) }
        val array = json.getJSONArray("o")
        requireUi(array.length() <= MAX_OBSERVATIONS) { UiText(R.string.tri_err_import) }
        val observations = (0 until array.length()).map { index ->
            val o = array.getJSONObject(index)
            BearingObservation(
                id = o.getString("i"), callsign = o.optString("c"), latitude = o.getDouble("la"), longitude = o.getDouble("lo"),
                bearingTrueDeg = o.getDouble("b"), uncertaintyDeg = o.optDouble("u", BearingObservation.DEFAULT_UNCERTAINTY_DEG),
                strength = if (o.has("s")) o.getDouble("s") else null,
                strengthUnit = StrengthUnit.values().firstOrNull { it.name == o.optString("su") } ?: StrengthUnit.S_UNITS,
                frequencyMhz = if (o.has("f")) o.getDouble("f") else null,
                utc = Instant.parse(o.getString("t")),
                source = BearingSource.values().firstOrNull { it.name == o.optString("src") } ?: BearingSource.MANUAL_TRUE,
                notes = o.optString("n")
            ).validated()
        }
        val name = json.optString("name").trim()
        requireUi(json.optString("id").isNotBlank() && name.isNotEmpty()) { UiText(R.string.tri_err_import) }
        return HuntSession(json.getString("id").take(64), name.take(80), if (json.has("f")) json.getDouble("f") else null, observations)
    }

    private fun number(value: Double) = String.format(Locale.ROOT, "%.6f", value)

    private fun csvCell(value: String): String {
        val safe = if (value.firstOrNull() in listOf('=', '+', '-', '@')) "'$value" else value
        return if (safe.any { it == ',' || it == '"' || it == '\n' || it == '\r' }) "\"" + safe.replace("\"", "\"\"") + "\"" else safe
    }

    fun csv(session: HuntSession): String = buildString {
        append("id,callsign,utc,latitude,longitude,bearing_true_deg,uncertainty_deg,strength,strength_unit,frequency_mhz,source,notes\n")
        for (o in session.observations) {
            append(listOf(o.id, o.callsign, o.utc.toString(), number(o.latitude), number(o.longitude),
                String.format(Locale.ROOT, "%.1f", o.bearingTrueDeg), String.format(Locale.ROOT, "%.1f", o.uncertaintyDeg),
                o.strength?.toString() ?: "", if (o.strength == null) "" else o.strengthUnit.name,
                o.frequencyMhz?.toString() ?: "", o.source.name, o.notes).joinToString(",") { csvCell(it) }).append('\n')
        }
    }

    private fun xml(value: String) = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;")
        .filter { it == '\t' || it == '\n' || it == '\r' || it >= ' ' }

    /** GPX 1.1: one waypoint per observer and, when there is an estimate, one for the transmitter. */
    fun gpx(session: HuntSession, estimate: TriangulationResult?, now: Instant = Instant.now()): String = buildString {
        append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
        append("<gpx version=\"1.1\" creator=\"RadiCodex\" xmlns=\"http://www.topografix.com/GPX/1/1\">\n")
        append("  <metadata><name>").append(xml(session.name)).append("</name><time>").append(now.toString()).append("</time></metadata>\n")
        for (o in session.observations) {
            append("  <wpt lat=\"").append(number(o.latitude)).append("\" lon=\"").append(number(o.longitude)).append("\">")
            append("<time>").append(o.utc.toString()).append("</time>")
            append("<name>").append(xml(o.callsign.ifEmpty { "OBS" })).append("</name>")
            append("<desc>").append(xml(String.format(Locale.ROOT, "Bearing %.1f deg true +/-%.1f%s%s", o.bearingTrueDeg, o.uncertaintyDeg,
                o.strength?.let { " signal $it ${if (o.strengthUnit == StrengthUnit.S_UNITS) "S" else "dBm"}" } ?: "",
                if (o.notes.isEmpty()) "" else " - " + o.notes))).append("</desc></wpt>\n")
        }
        if (estimate != null && estimate.latitude != null && estimate.longitude != null) {
            append("  <wpt lat=\"").append(number(estimate.latitude)).append("\" lon=\"").append(number(estimate.longitude)).append("\">")
            append("<time>").append(now.toString()).append("</time>")
            append("<name>").append(xml("TX ${session.name}".take(40))).append("</name>")
            append("<desc>").append(xml(String.format(Locale.ROOT, "Estimated transmitter, 95%% radius %.0f m%s", estimate.radius95M,
                estimate.locator?.let { ", locator $it" } ?: ""))).append("</desc></wpt>\n")
        }
        append("</gpx>\n")
    }
}

/** Hunt sessions kept on the phone (private SharedPreferences, same JSON as the shared files). */
class HuntStore(context: android.content.Context) {
    private val prefs = context.getSharedPreferences("ardf_hunts", android.content.Context.MODE_PRIVATE)
    fun sessions(): List<HuntSession> = HuntCodec.decodeAll(prefs.getString("sessions", "[]") ?: "[]")
    fun save(sessions: List<HuntSession>) { prefs.edit().putString("sessions", HuntCodec.encodeAll(sessions)).apply() }
    fun update(session: HuntSession) = save(sessions().filter { it.id != session.id } + session)
}
