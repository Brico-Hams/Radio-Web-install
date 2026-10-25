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
        require(name.isNotBlank() && name.length <= 120 && name.none { it.code < 32 }) { "Nombre TLE invalido." }
        for ((index, line) in listOf(line1, line2).withIndex()) {
            require(line.length == 69 && line[0] == '1' + index && line[1] == ' ' &&
                line.all { it.code in 32..126 } && line[68].isDigit()) { "TLE: lineas de 69 caracteres, numero y checksum requeridos." }
            val checksum = line.take(68).sumOf { if (it in '0'..'9') it - '0' else if (it == '-') 1 else 0 } % 10
            require(checksum == line[68] - '0') { "Checksum TLE incorrecto." }
            require(line.substring(2, 7).trim().matches(Regex("[0-9]{1,5}"))) { "Solo NORAD numerico clasico, no Alpha-5." }
        }
        require(norad in 1..99999 && line2.substring(2, 7).trim().toInt() == norad) { "NORAD inconsistente." }
        return this
    }
    companion object {
        fun parseCatalog(text: String): List<Tle> {
            require(text.length <= 256 * 1024 && text.all { it.code in 32..126 || it in "\r\n\t" }) { "Catalogo TLE ASCII de hasta 256 KiB." }
            val lines = text.lineSequence().filter { it.isNotBlank() }.map { it.trimEnd('\r') }.toList()
            val result = ArrayList<Tle>()
            var index = 0
            while (index < lines.size) {
                require(result.size < 256) { "Maximo 256 satelites por catalogo." }
                require(!lines[index].startsWith("1 ") || lines[index].length == 69) { "Linea TLE truncada." }
                val name = if (lines[index].startsWith("1 ")) "NORAD ${lines[index].substring(2, 7).trim()}"
                    else lines[index++].removePrefix("0 ")
                require(index + 1 < lines.size) { "Catalogo TLE truncado." }
                result.add(Tle(name, lines[index++], lines[index++]).validated())
            }
            require(result.isNotEmpty() && result.map { it.norad }.distinct().size == result.size) { "Catalogo vacio o con NORAD duplicado." }
            return result
        }
    }
}

data class ObserverPosition(val latitude: Double, val longitude: Double, val heightKm: Double) {
    fun validated(): ObserverPosition {
        require(latitude.isFinite() && latitude in -90.0..90.0 && longitude.isFinite() && longitude in -180.0..180.0 &&
            heightKm.isFinite() && heightKm in -0.5..9.0) { "Observador: latitud -90..90, longitud -180..180, altura -0.5..9 km." }
        return this
    }
}
data class SatelliteLook(val time: Long, val azimuth: Double, val elevation: Double, val rangeKm: Double)
data class SatellitePass(val aos: SatelliteLook, val maximum: SatelliteLook, val los: SatelliteLook, val partialStart: Boolean, val partialEnd: Boolean)
data class SatellitePlan(val tle: Tle, val observer: ObserverPosition, val downlinkHz: Long, val pass: SatellitePass)
data class SatelliteTarget(val frequency10Hz: Long, val look: SatelliteLook)

class SatelliteOrbit(
    private val tle: Tle,
    private val observer: ObserverPosition,
    source: String,
    adapter: String
) : Closeable {
    private val context = Context.enter().apply {
        optimizationLevel = -1
        languageVersion = Context.VERSION_ES6
        setClassShutter { false }
    }
    private val scope: Scriptable
    private val engine: Scriptable
    val epoch: Long
    private var closed = false
    init {
        try {
            tle.validated(); observer.validated()
            scope = context.initSafeStandardObjects()
            context.evaluateString(scope, source, "satellite-6.0.1.js", 1, null)
            context.evaluateString(scope, adapter, "orbital-engine.js", 1, null)
            engine = ScriptableObject.getProperty(scope, "BricohamsOrbit") as Scriptable
            epoch = (call("prepare", arrayOf(tle.line1, tle.line2, observer.latitude, observer.longitude, observer.heightKm)) as Number)
                .toDouble().roundToLong()
        } catch (error: Exception) {
            Context.exit()
            throw IllegalArgumentException("No se pudo preparar SGP4: ${error.message}", error)
        }
    }
    private fun call(name: String, arguments: Array<Any>): Any =
        (ScriptableObject.getProperty(engine, name) as Function).call(context, scope, engine, arguments)
    fun validateAge(time: Long) {
        require(time - epoch <= 7 * 86400000L && epoch - time <= 86400000L) {
            "TLE caducado (>7 dias) o futuro (>24 h). Actualiza el catalogo."
        }
    }
    fun look(time: Long): SatelliteLook {
        check(!closed) { "Motor orbital cerrado." }
        validateAge(time)
        val array = try { call("look", arrayOf(time.toDouble())) as NativeArray } catch (error: org.mozilla.javascript.RhinoException) {
            throw IllegalArgumentException("Error de propagacion SGP4: ${error.message}", error)
        }
        fun number(index: Int) = (array.get(index, array) as Number).toDouble()
        val point = SatelliteLook(time, number(0), number(1), number(2))
        require(point.azimuth.isFinite() && point.azimuth in 0.0..360.0 &&
            point.elevation.isFinite() && point.elevation in -90.0..90.0 && point.rangeKm.isFinite() && point.rangeKm > 0) { "Geometria SGP4 no valida." }
        return point
    }
    fun predict(start: Long, hours: Int = 24, minimum: Double = 10.0): List<SatellitePass> {
        require(hours in 1..48 && minimum.isFinite() && minimum in 0.0..60.0) { "Prediccion: 1-48 horas, elevacion 0-60 grados." }
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
            if (Thread.currentThread().isInterrupted) throw java.io.InterruptedIOException("Prediccion cancelada.")
            time = minOf(time + 5000, end)
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
        require(plan.tle == tle && plan.observer == observer) { "El motor orbital no corresponde al plan CAT." }
        require(plan.pass.los.time > plan.pass.aos.time && plan.pass.los.time - plan.pass.aos.time <= 2 * 3600000 &&
            time >= plan.pass.aos.time && time < plan.pass.los.time) { "Fuera del pase CAT seleccionado." }
        require(CatProtocol.inBand(plan.downlinkHz / 10) && plan.downlinkHz % 10 == 0L) { "Downlink RX fuera de banda o de pasos de 10 Hz." }
        val position = look(time)
        require(position.elevation >= 0) { "Satelite bajo el horizonte." }
        val rate = look(time + 500).rangeKm - look(time - 500).rangeKm
        val frequency = (plan.downlinkHz * (1 - rate / 299792.458) / 10).roundToLong()
        require(CatProtocol.inBand(frequency)) { "Doppler fuera de banda RX." }
        return SatelliteTarget(frequency, position)
    }
    override fun close() {
        if (!closed) { closed = true; Context.exit() }
    }
}
