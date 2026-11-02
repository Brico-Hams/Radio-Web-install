package org.bricohams.radio

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.view.View
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

/** Pure geometry of the live pass view; no Android classes so it is testable on the JVM. */
object PassGeometry {
    private const val EARTH_KM = 6371.0
    private const val LIGHT_KM_S = 299792.458

    /** How to move a handheld antenna: turn > 0 is right, raise > 0 is up; null when the phone value is unknown. */
    data class Pointing(val turn: Double?, val targetElevation: Double, val raise: Double?)

    fun wrap(degrees: Double) = ((degrees % 360) + 360) % 360

    /** Signed shortest turn from heading to azimuth in [-180, 180): positive = right. */
    fun turn(heading: Double, azimuth: Double) = wrap(azimuth - heading + 180) - 180

    /** Circular low-pass so the rotating radar does not jitter. */
    fun smooth(previous: Double, next: Double, factor: Double) = wrap(previous + factor * turn(previous, next))

    /** Offset from the radar centre; north up at heading 0, otherwise [headingUp] points to the top of the screen. */
    fun project(azimuth: Double, elevation: Double, radius: Float, headingUp: Double = 0.0): Pair<Float, Float> =
        SatellitePasses.polar(SatelliteLook(0, wrap(azimuth - headingUp), elevation, 0.0), radius)

    /** The phone top raised by x degrees reads pitch = -x, so phone elevation is -pitch. */
    fun pointing(heading: Double?, target: SatelliteLook, phoneElevation: Double?) = Pointing(
        heading?.let { turn(it, target.azimuth) }, target.elevation.coerceIn(0.0, 90.0),
        phoneElevation?.let { target.elevation.coerceIn(0.0, 90.0) - it.coerceIn(-90.0, 90.0) })

    /** Spherical-Earth altitude from slant range and elevation; a few km off the SGP4 geodetic value. */
    fun altitudeKm(look: SatelliteLook, observerHeightKm: Double = 0.0): Double {
        val base = EARTH_KM + observerHeightKm
        val radiusSquared = base * base + look.rangeKm * look.rangeKm +
            2 * base * look.rangeKm * sin(Math.toRadians(look.elevation))
        return sqrt(radiusSquared) - EARTH_KM
    }

    /** Range rate in km/s (positive = receding) from the sampled track; 0 at the very edges of the pass. */
    fun rangeRateKmS(track: List<SatelliteLook>, now: Long): Double =
        SatellitePasses.at(track, now + 500)?.let { later ->
            SatellitePasses.at(track, now - 500)?.let { later.rangeKm - it.rangeKm }
        } ?: 0.0

    /** Frequency to tune/transmit so it matches the nominal one at the satellite: down is shifted by -v/c, up by +v/c. */
    fun dopplerHz(nominalHz: Long, rateKmS: Double, uplink: Boolean = false): Double =
        nominalHz * (1 + (if (uplink) 1 else -1) * rateKmS / LIGHT_KM_S)
}

/** Polar view of one pass: horizon at the rim, zenith at the centre, optionally rotated so the phone heading is up. */
class LivePassView(context: Context) : View(context) {
    var track: List<SatelliteLook> = emptyList()
        set(value) { field = value; trace(); invalidate() }
    var now = 0L
        set(value) { field = value; invalidate() }
    /** Azimuth shown at the top of the screen (0 = north up). */
    var headingUp = 0.0
        set(value) { field = value; trace(); invalidate() }
    /** Text beside the fixed phone-heading marker, empty in north-up mode. */
    var headingLabel = ""
        set(value) { field = value; invalidate() }
    var cardinals = arrayOf("N", "E", "S", "W")
        set(value) { require(value.size == 4); field = value; invalidate() }
    private val density = resources.displayMetrics.density
    private val panel = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Brand.SURFACE }
    private val grid = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE; strokeWidth = density; color = Color.WHITE; alpha = 120
    }
    private val label = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE; textSize = 13 * density; textAlign = Paint.Align.CENTER
    }
    private val small = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Brand.MUTED; textSize = 11 * density; textAlign = Paint.Align.LEFT
    }
    private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE; strokeWidth = 3 * density; color = Brand.ORANGE
        strokeJoin = Paint.Join.ROUND; strokeCap = Paint.Cap.ROUND
    }
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val ringStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE; strokeWidth = 2.5f * density; color = Brand.ORANGE
    }
    private val path = Path()
    private val marker = Path()
    private var cx = 0f
    private var cy = 0f
    private var radius = 0f

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        val side = minOf(width, (360 * density).toInt())
        setMeasuredDimension(width, side)
    }
    override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
        super.onSizeChanged(width, height, oldWidth, oldHeight)
        cx = width / 2f
        cy = height / 2f
        radius = minOf(cx, cy) - 30 * density
        trace()
    }
    private fun trace() {
        path.reset()
        track.forEachIndexed { index, look ->
            val (x, y) = PassGeometry.project(look.azimuth, look.elevation, radius, headingUp)
            if (index == 0) path.moveTo(cx + x, cy + y) else path.lineTo(cx + x, cy + y)
        }
    }
    private fun mark(canvas: Canvas, look: SatelliteLook, color: Int, size: Float, text: String) {
        val (x, y) = PassGeometry.project(look.azimuth, look.elevation, radius, headingUp)
        fill.color = color
        canvas.drawCircle(cx + x, cy + y, size * density, fill)
        canvas.drawText(text, cx + x + (size + 3) * density, cy + y - (size + 1) * density, small)
    }
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (radius <= 0) return
        canvas.drawRoundRect(0f, 0f, width.toFloat(), height.toFloat(), 20 * density, 20 * density, panel)
        for (elevation in listOf(0, 30, 60)) canvas.drawCircle(cx, cy, radius * (90 - elevation) / 90f, grid)
        for (az in listOf(0.0, 90.0)) {
            val (x, y) = PassGeometry.project(az, 0.0, radius, headingUp)
            canvas.drawLine(cx - x, cy - y, cx + x, cy + y, grid)
        }
        // Elevation labels sit on a fixed diagonal so they stay readable while the radar turns.
        for (elevation in listOf(0, 30, 60)) {
            val ring = radius * (90 - elevation) / 90f * 0.7071f
            canvas.drawText("$elevation°", cx + ring + 2 * density, cy - ring - 2 * density, small)
        }
        canvas.drawText("90°", cx + 4 * density, cy - 4 * density, small)
        val offset = 15 * density
        cardinals.forEachIndexed { index, name ->
            val (x, y) = PassGeometry.project(index * 90.0, 0.0, radius + offset, headingUp)
            canvas.drawText(name, cx + x, cy + y + label.textSize * 0.35f, label)
        }
        if (track.size >= 2) {
            canvas.drawPath(path, line)
            mark(canvas, track.first(), Brand.GREEN, 5f, "AOS")
            mark(canvas, track.last(), Color.rgb(255, 99, 99), 5f, "LOS")
        }
        SatellitePasses.at(track, now)?.let {
            val (x, y) = PassGeometry.project(it.azimuth, it.elevation, radius, headingUp)
            fill.color = Color.WHITE
            canvas.drawCircle(cx + x, cy + y, 7 * density, fill)
            canvas.drawCircle(cx + x, cy + y, 7 * density, ringStroke)
        }
        // Fixed marker: whatever is at the top of the screen is where the phone points.
        val top = 4 * density
        marker.reset()
        marker.moveTo(cx - 8 * density, top); marker.lineTo(cx + 8 * density, top); marker.lineTo(cx, top + 12 * density); marker.close()
        fill.color = Brand.ORANGE
        canvas.drawPath(marker, fill)
        if (headingLabel.isNotEmpty()) {
            label.textAlign = Paint.Align.LEFT
            canvas.drawText(headingLabel, cx + 12 * density, top + 12 * density, label)
            label.textAlign = Paint.Align.CENTER
        }
    }
}

/** Formats a turn as whole degrees; kept here so tests and UI agree on rounding. */
fun turnDegrees(turn: Double) = abs(turn).roundToInt()
