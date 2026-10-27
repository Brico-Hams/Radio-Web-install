package org.bricohams.radio

import org.mozilla.javascript.Context
import org.mozilla.javascript.Function
import org.mozilla.javascript.NativeArray
import org.mozilla.javascript.Scriptable
import org.mozilla.javascript.ScriptableObject
import java.io.Closeable
import kotlin.math.roundToLong

data class Tle(val name: String, val line1: String, val line2: String) {
    val norad: Int get() = line1.substring(2, 7).trim().toInt()
    fun validated(): Tle {
        requireUi(name.isNotBlank() && name.length <= 120 && name.none { it.code < 32 }) { UiText(R.string.err_tle_name) }
        for ((index, line) in listOf(line1, line2).withIndex()) {
            requireUi(line.length == 69 && line[0] == '1' + index && line[1] == ' ' &&
                line.all { it.code in 32..126 } && line[68].isDigit()) { UiText(R.string.err_tle_line_format) }
            val checksum = line.take(68).sumOf { if (it in '0'..'9') it - '0' else if (it == '-') 1 else 0 } % 10
            requireUi(checksum == line[68] - '0') { UiText(R.string.err_tle_checksum) }
            requireUi(line.substring(2, 7).trim().matches(Regex("[0-9]{1,5}"))) { UiText(R.string.err_tle_norad_numeric) }
        }
        requireUi(norad in 1..99999 && line2.substring(2, 7).trim().toInt() == norad) { UiText(R.string.err_tle_norad_mismatch) }
        return this
    }
    companion object {
        fun parseCatalog(text: String): List<Tle> {
            requireUi(text.length <= 256 * 1024 && text.all { it.code in 32..126 || it in "\r\n\t" }) { UiText(R.string.err_tle_catalog_size) }
            val lines = text.lineSequence().filter { it.isNotBlank() }.map { it.trimEnd('\r') }.toList()
            val result = ArrayList<Tle>()
            var index = 0
            while (index < lines.size) {
                requireUi(result.size < 256) { UiText(R.string.err_tle_catalog_count) }
                requireUi(!lines[index].startsWith("1 ") || lines[index].length == 69) { UiText(R.string.err_tle_line_truncated) }
                val name = if (lines[index].startsWith("1 ")) "NORAD ${lines[index].substring(2, 7).trim()}"
                    else lines[index++].removePrefix("0 ")
                requireUi(index + 1 < lines.size) { UiText(R.string.err_tle_catalog_truncated) }
                result.add(Tle(name, lines[index++], lines[index++]).validated())
            }
            requireUi(result.isNotEmpty() && result.map { it.norad }.distinct().size == result.size) { UiText(R.string.err_tle_catalog_empty) }
            return result
        }
    }
}

data class ObserverPosition(val latitude: Double, val longitude: Double, val heightKm: Double) {
    fun validated(): ObserverPosition {
        requireUi(latitude.isFinite() && latitude in -90.0..90.0 && longitude.isFinite() && longitude in -180.0..180.0 &&
            heightKm.isFinite() && heightKm in -0.5..9.0) { UiText(R.string.err_observer_invalid) }
        return this
    }
}
data class SatelliteLook(val time: Long, val azimuth: Double, val elevation: Double, val rangeKm: Double)
data class SatellitePass(val aos: SatelliteLook, val maximum: SatelliteLook, val los: SatelliteLook, val partialStart: Boolean, val partialEnd: Boolean)
data class SatellitePlan(val tle: Tle, val observer: ObserverPosition, val downlinkHz: Long, val pass: SatellitePass)
data class SatelliteTarget(val frequency10Hz: Long, val look: SatelliteLook)

data class SubPoint(val latitude: Double, val longitude: Double, val altitudeKm: Double)

/** One Rhino context with satellite.js loaded once; many SatelliteOrbit instances can share it on its thread. */
class OrbitalEngine(source: String, adapter: String) : Closeable {
    internal val context: Context = Context.enter().apply {
        optimizationLevel = -1
        languageVersion = Context.VERSION_ES6
        setClassShutter { false }
    }
    internal val scope: Scriptable
    private val factory: Scriptable
    private var closed = false
    init {
        try {
            scope = context.initSafeStandardObjects()
            context.evaluateString(scope, source, "satellite-6.0.1.js", 1, null)
            context.evaluateString(scope, adapter, "orbital-engine.js", 1, null)
            factory = ScriptableObject.getProperty(scope, "BricohamsOrbit") as Scriptable
        } catch (error: Exception) {
            Context.exit()
            throw IllegalArgumentException("No se pudo cargar SGP4: ${error.message}", error)
        }
    }
    internal fun create(): Scriptable {
        check(!closed) { "Motor orbital cerrado." }
        return (ScriptableObject.getProperty(factory, "create") as Function).call(context, scope, factory, emptyArray()) as Scriptable
    }
    override fun close() {
        if (!closed) { closed = true; Context.exit() }
    }
}

class SatelliteOrbit(
    private val tle: Tle,
    private val observer: ObserverPosition,
    private val shared: OrbitalEngine,
    private val ownsEngine: Boolean = false
) : Closeable {
    constructor(tle: Tle, observer: ObserverPosition, source: String, adapter: String) :
        this(tle, observer, OrbitalEngine(source, adapter), true)
    private val context = shared.context
    private val scope = shared.scope
    private val engine: Scriptable
    val epoch: Long
    private var closed = false
    init {
        try {
            tle.validated(); observer.validated()
            engine = shared.create()
            epoch = (call("prepare", arrayOf(tle.line1, tle.line2, observer.latitude, observer.longitude, observer.heightKm)) as Number)
                .toDouble().roundToLong()
        } catch (error: Exception) {
            if (ownsEngine) shared.close()
            throw LocalizedArgumentException(UiText(R.string.err_sgp4_prepare, error), error)
        }
    }
    private fun call(name: String, arguments: Array<Any>): Any =
        (ScriptableObject.getProperty(engine, name) as Function).call(context, scope, engine, arguments)
    fun validateAge(time: Long) {
        requireUi(time - epoch <= 7 * 86400000L && epoch - time <= 86400000L) {
            UiText(R.string.err_tle_stale)
        }
    }
    fun look(time: Long): SatelliteLook {
        checkUi(!closed) { UiText(R.string.err_orbit_closed) }
        validateAge(time)
        val array = try { call("look", arrayOf(time.toDouble())) as NativeArray } catch (error: org.mozilla.javascript.RhinoException) {
            throw LocalizedArgumentException(UiText(R.string.err_sgp4_propagation, error.message), error)
        }
        fun number(index: Int) = (array.get(index, array) as Number).toDouble()
        val point = SatelliteLook(time, number(0), number(1), number(2))
        requireUi(point.azimuth.isFinite() && point.azimuth in 0.0..360.0 &&
            point.elevation.isFinite() && point.elevation in -90.0..90.0 && point.rangeKm.isFinite() && point.rangeKm > 0) { UiText(R.string.err_sgp4_geometry) }
        return point
    }
    fun geo(time: Long): SubPoint {
        check(!closed) { "Motor orbital cerrado." }
        validateAge(time)
        val array = try { call("geo", arrayOf(time.toDouble())) as NativeArray } catch (error: org.mozilla.javascript.RhinoException) {
            throw IllegalArgumentException("Error de propagacion SGP4: ${error.message}", error)
        }
        fun number(index: Int) = (array.get(index, array) as Number).toDouble()
        val point = SubPoint(number(0), number(1), number(2))
        require(point.latitude.isFinite() && point.latitude in -90.0..90.0 && point.longitude.isFinite() &&
            point.longitude in -180.0..180.0 && point.altitudeKm.isFinite() && point.altitudeKm > 0) { "Posicion SGP4 no valida." }
        return point
    }
    fun predict(start: Long, hours: Int = 24, minimum: Double = 10.0): List<SatellitePass> {
        requireUi(hours in 1..48 && minimum.isFinite() && minimum in 0.0..60.0) { UiText(R.string.err_prediction_params) }
        val end = start + hours * 3600000L
        validateAge(start); validateAge(end)
        fun crossing(left: Long, right: Long, rising: Boolean): SatelliteLook {
            var a = left
            var b = right
            while (b - a > 500) {
                val middle = a + (b - a) / 2
                if ((look(middle).elevation >= minimum) == rising) b = middle else a = middle
            }
            return look(a + (b - a) / 2)
        }
        val passes = ArrayList<SatellitePass>()
        var previous = look(start)
        var aos: SatelliteLook? = previous.takeIf { it.elevation >= minimum }
        var maximum = previous
        var time = start
        while (time < end) {
            if (Thread.currentThread().isInterrupted) throw LocalizedInterruptedIOException(UiText(R.string.err_prediction_cancelled))
            // Below the horizon range > 1500 km, so even a 200 km LEO changes elevation under 0.3 deg/s: no crossing is skipped.
            val step = if (aos == null) maxOf(1L, ((minimum - previous.elevation) / 0.4 / 5).toLong()) * 5000 else 5000L
            time = minOf(time + step, end)
            val point = look(time)
            if (aos == null && point.elevation >= minimum) {
                aos = crossing(previous.time, time, true); maximum = point
            }
            if (aos != null) {
                if (point.elevation > maximum.elevation) maximum = point
                if (point.elevation < minimum) {
                    passes.add(SatellitePass(aos, maximum, crossing(previous.time, time, false), aos.time == start, false))
                    aos = null
                }
            }
            previous = point
        }
        if (aos != null) passes.add(SatellitePass(aos, maximum, previous, aos.time == start, true))
        return passes
    }
    fun target(plan: SatellitePlan, time: Long): SatelliteTarget {
        requireUi(plan.tle == tle && plan.observer == observer) { UiText(R.string.err_orbit_plan_mismatch) }
        requireUi(plan.pass.los.time > plan.pass.aos.time && plan.pass.los.time - plan.pass.aos.time <= 2 * 3600000 &&
            time >= plan.pass.aos.time && time < plan.pass.los.time) { UiText(R.string.err_outside_pass) }
        requireUi(CatProtocol.inBand(plan.downlinkHz / 10) && plan.downlinkHz % 10 == 0L) { UiText(R.string.err_downlink_band) }
        val position = look(time)
        requireUi(position.elevation >= 0) { UiText(R.string.err_satellite_below_horizon) }
        val rate = look(time + 500).rangeKm - look(time - 500).rangeKm
        val frequency = (plan.downlinkHz * (1 - rate / 299792.458) / 10).roundToLong()
        requireUi(CatProtocol.inBand(frequency)) { UiText(R.string.err_doppler_band) }
        return SatelliteTarget(frequency, position)
    }
    override fun close() {
        if (!closed) { closed = true; if (ownsEngine) shared.close() }
    }
}
