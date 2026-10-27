package org.bricohams.radio

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.view.MotionEvent
import android.view.View
import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

data class MapSatellite(val norad: Int, val name: String, val point: SubPoint, val track: List<SubPoint>)

object WorldMap {
    private const val EARTH_KM = 6371.0
    /** Parses world-land-110m.txt: one ring per line, "lon,lat" pairs. */
    fun parseLand(text: String): List<List<Pair<Double, Double>>> = text.lineSequence()
        .filter { it.isNotBlank() && !it.startsWith("#") }
        .map { line ->
            line.trim().split(' ').map { pair ->
                val (lon, lat) = pair.split(',').map(String::toDouble)
                require(lon in -180.0..180.0 && lat in -90.0..90.0) { "Mapa: coordenada fuera de rango." }
                Pair(lon, lat)
            }
        }.toList()
    fun project(longitude: Double, latitude: Double, width: Float, height: Float): Pair<Float, Float> =
        Pair(((longitude + 180) / 360 * width).toFloat(), ((90 - latitude) / 180 * height).toFloat())
    /** Ground circle where the satellite is above 0 degrees, as lon/lat points. */
    fun footprint(point: SubPoint, steps: Int = 72): List<Pair<Double, Double>> {
        val radius = acos(EARTH_KM / (EARTH_KM + point.altitudeKm))
        val lat = Math.toRadians(point.latitude)
        val lon = Math.toRadians(point.longitude)
        return (0..steps).map {
            val bearing = 2 * Math.PI * it / steps
            val lat2 = asin(sin(lat) * cos(radius) + cos(lat) * sin(radius) * cos(bearing))
            val lon2 = lon + atan2(sin(bearing) * sin(radius) * cos(lat), cos(radius) - sin(lat) * sin(lat2))
            Pair(normalize(Math.toDegrees(lon2)), Math.toDegrees(lat2))
        }
    }
    fun normalize(longitude: Double) = ((longitude + 540) % 360) - 180
    /** Splits a lon/lat line where it wraps across the antimeridian, so it is not drawn across the whole map. */
    fun split(points: List<Pair<Double, Double>>): List<List<Pair<Double, Double>>> {
        val result = ArrayList<MutableList<Pair<Double, Double>>>()
        for (point in points) {
            val last = result.lastOrNull()?.lastOrNull()
            if (last == null || abs(point.first - last.first) > 180) result.add(ArrayList())
            result.last().add(point)
        }
        return result
    }
}

class WorldMapView(context: Context) : View(context) {
    var land: List<List<Pair<Double, Double>>> = emptyList()
        set(value) { field = value; rebuild(); invalidate() }
    var satellites: List<MapSatellite> = emptyList()
        set(value) { field = value; rebuild(); invalidate() }
    var selected: Int? = null
        set(value) { field = value; rebuild(); invalidate() }
    var observer: ObserverPosition? = null
        set(value) { field = value; invalidate() }
    var onSelect: (Int) -> Unit = {}
    private val density = resources.displayMetrics.density
    private val landPath = Path()
    private val footprints = Path()
    private val selectedFootprint = Path()
    private val trackPath = Path()
    private val sea = Paint().apply { color = Color.rgb(16, 22, 30) }
    private val ground = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(78, 66, 52) }
    private val grid = Paint().apply { color = Color.argb(40, 255, 255, 255); strokeWidth = density }
    private val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE; strokeWidth = 1.2f * density; color = Color.argb(150, 255, 214, 140)
    }
    private val active = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE; strokeWidth = 2.2f * density; color = Color.rgb(255, 152, 0)
    }
    private val track = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE; strokeWidth = 1.6f * density; color = Color.rgb(220, 60, 50)
    }
    private val dot = Paint(Paint.ANTI_ALIAS_FLAG)
    private val label = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; textSize = 11 * density }
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        setMeasuredDimension(width, width / 2)
    }
    override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
        super.onSizeChanged(width, height, oldWidth, oldHeight)
        rebuild()
    }
    private fun trace(path: Path, points: List<Pair<Double, Double>>, close: Boolean) {
        for (segment in if (close) listOf(points) else WorldMap.split(points)) {
            segment.forEachIndexed { index, (lon, lat) ->
                val (x, y) = WorldMap.project(lon, lat, width.toFloat(), height.toFloat())
                if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            if (close) path.close()
        }
    }
    private fun rebuild() {
        landPath.reset(); footprints.reset(); selectedFootprint.reset(); trackPath.reset()
        if (width == 0) return
        land.forEach { trace(landPath, it, true) }
        for (satellite in satellites) {
            // Beyond a dozen satellites the rings hide the map: only the selected one keeps its footprint.
            if (satellite.norad != selected && satellites.size > 12) continue
            trace(if (satellite.norad == selected) selectedFootprint else footprints, WorldMap.footprint(satellite.point), false)
            if (satellite.norad == selected) trace(trackPath, satellite.track.map { Pair(it.longitude, it.latitude) }, false)
        }
    }
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), sea)
        for (step in 1 until 12) canvas.drawLine(width * step / 12f, 0f, width * step / 12f, height.toFloat(), grid)
        for (step in 1 until 6) canvas.drawLine(0f, height * step / 6f, width.toFloat(), height * step / 6f, grid)
        canvas.drawPath(landPath, ground)
        canvas.drawPath(footprints, ring)
        canvas.drawPath(trackPath, track)
        canvas.drawPath(selectedFootprint, active)
        observer?.let {
            val (x, y) = WorldMap.project(it.longitude, it.latitude, width.toFloat(), height.toFloat())
            dot.color = Color.rgb(46, 160, 67)
            canvas.drawCircle(x, y, 4 * density, dot)
        }
        for (satellite in satellites) {
            val (x, y) = WorldMap.project(satellite.point.longitude, satellite.point.latitude, width.toFloat(), height.toFloat())
            val chosen = satellite.norad == selected
            dot.color = if (chosen) Color.rgb(255, 152, 0) else Color.rgb(255, 214, 140)
            canvas.drawCircle(x, y, (if (chosen) 5 else 3) * density, dot)
            if (chosen || satellites.size <= 12) canvas.drawText(satellite.name, x + 6 * density, y - 4 * density, label)
        }
    }
    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_UP) {
            satellites.minByOrNull {
                val (x, y) = WorldMap.project(it.point.longitude, it.point.latitude, width.toFloat(), height.toFloat())
                (x - event.x) * (x - event.x) + (y - event.y) * (y - event.y)
            }?.let { onSelect(it.norad); performClick() }
        }
        return true
    }
    override fun performClick(): Boolean = super.performClick()
}
