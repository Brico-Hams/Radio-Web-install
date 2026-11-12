package org.bricohams.radio

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.Path
import android.util.AttributeSet
import android.view.View
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

/**
 * Polar chart of one pass: horizon at the rim, zenith at the centre. North is up unless [headingUp] is set (Apuntar
 * mode), in which case the azimuth the phone points to is at the top. In that mode a crosshair shows the phone
 * direction and an arrow leads from it to [target].
 */
class PassRadarView @JvmOverloads constructor(context: Context, attrs: AttributeSet? = null) : View(context, attrs) {
    var track: List<SatelliteLook> = emptyList()
        set(value) { field = value; trace(); invalidate() }
    var now = 0L
        set(value) { field = value; trace(); invalidate() }
    /** Azimuth drawn at the top of the screen; null means north up. */
    var headingUp: Double? = null
        set(value) { field = value; trace(); invalidate() }
    /** Phone pointing direction (true azimuth, elevation); null hides the crosshair. */
    var device: Pair<Double, Double>? = null
        set(value) { field = value; invalidate() }
    /** Where the arrow leads (the satellite, or AOS before the pass). */
    var target: SatelliteLook? = null
        set(value) { field = value; invalidate() }
    /** Sun and moon (true azimuth, elevation); drawn only while above the horizon. */
    var sun: PassSky.Horizontal? = null
        set(value) { field = value; invalidate() }
    var moon: PassSky.Horizontal? = null
        set(value) { field = value; invalidate() }
    /** Per track point: true while the satellite is in Earth's shadow (see [PassSky.eclipseFlags]); empty hides the shading. */
    var eclipsed: List<Boolean> = emptyList()
        set(value) { field = value; trace(); invalidate() }
    var legendSunlit = ""
        set(value) { field = value; invalidate() }
    var legendShadow = ""
        set(value) { field = value; invalidate() }
    /** Names where the crosshair comes from (rotor or phone sensors); drawn top left. */
    var sourceLabel = ""
        set(value) { field = value; invalidate() }
    var onTarget = false
        set(value) { field = value; invalidate() }
    var headingLabel = ""
        set(value) { field = value; invalidate() }
    var cardinals = arrayOf("N", "E", "S", "W")
        set(value) { require(value.size == 4); field = value; invalidate() }

    private val colors = Brand.Palette(context)
    private val density = resources.displayMetrics.density
    private val panel = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = colors.surface }
    private val grid = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = density; color = colors.outline }
    private val label = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = colors.text; textSize = 13 * density; textAlign = Paint.Align.CENTER }
    private val small = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = colors.muted; textSize = 11 * density }
    private fun stroke(color: Int, width: Float) = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE; strokeWidth = width * density; this.color = color
        strokeJoin = Paint.Join.ROUND; strokeCap = Paint.Cap.ROUND
    }
    private val pastLine = stroke(colors.muted, 3f)
    private val futureLine = stroke(colors.orange, 3f)
    private val upcomingLine = stroke(colors.orange, 3f).apply { pathEffect = DashPathEffect(floatArrayOf(10 * density, 6 * density), 0f) }
    private val ring = stroke(colors.orange, 2.5f)
    private val cross = stroke(colors.text, 2f)
    private val shadeLine = stroke(colors.muted, 11f).apply { alpha = 110 }
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val shade = Path()
    private val past = Path()
    private val future = Path()
    private val marker = Path()
    private val arrow = Path()
    private var cx = 0f
    private var cy = 0f
    private var radius = 0f
    private var labelDx = 0.7071f
    private var labelDy = -0.7071f
    private val pillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = colors.surface; alpha = 220 }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        setMeasuredDimension(width, minOf(width, (360 * density).toInt()))
    }
    override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
        super.onSizeChanged(width, height, oldWidth, oldHeight)
        cx = width / 2f
        cy = height / 2f
        radius = minOf(cx, cy) - 30 * density
        trace()
    }

    private fun spot(look: SatelliteLook) = PassGeometry.project(look.azimuth, look.elevation, radius, headingUp ?: 0.0)

    // Rebuilt only when time, heading or track change, so onDraw does not allocate.
    private fun trace() {
        past.reset(); future.reset(); shade.reset()
        if (radius <= 0f) return
        pickLabelRadial()
        if (eclipsed.size == track.size) {
            for (index in 1 until track.size) {
                if (!eclipsed[index - 1] || !eclipsed[index]) continue
                val (ax, ay) = spot(track[index - 1])
                val (bx, by) = spot(track[index])
                shade.moveTo(cx + ax, cy + ay); shade.lineTo(cx + bx, cy + by)
            }
        }
        // The future path starts at the last past sample so the two colours join without a gap.
        val firstFuture = track.indexOfFirst { it.time > now }
        track.forEachIndexed { index, look ->
            val (x, y) = spot(look)
            val px = cx + x
            val py = cy + y
            if (firstFuture < 0 || index < firstFuture) { if (index == 0) past.moveTo(px, py) else past.lineTo(px, py) }
            if (firstFuture in 0..index) {
                if (index == firstFuture && index > 0) { val (qx, qy) = spot(track[index - 1]); future.moveTo(cx + qx, cy + qy) }
                else if (index == firstFuture) future.moveTo(px, py)
                future.lineTo(px, py)
            }
        }
    }

    // Of 16 screen radials, the one whose ring labels are farthest from every track sample.
    private fun pickLabelRadial() {
        if (track.isEmpty()) return
        var best = -1f
        for (step in 0 until 16) {
            val angle = Math.toRadians(step * 22.5)
            val dx = sin(angle).toFloat()
            val dy = -cos(angle).toFloat()
            var nearest = Float.MAX_VALUE
            for (look in track) {
                val (x, y) = spot(look)
                for (elevation in intArrayOf(0, 30, 60)) {
                    val d = radius * (90 - elevation) / 90f
                    nearest = minOf(nearest, hypot(x - dx * d, y - dy * d))
                }
            }
            if (nearest > best) { best = nearest; labelDx = dx; labelDy = dy }
        }
    }

    private fun mark(canvas: Canvas, look: SatelliteLook, color: Int, size: Float, text: String) {
        val (x, y) = spot(look)
        fill.color = color
        canvas.drawCircle(cx + x, cy + y, size * density, fill)
        canvas.drawText(text, cx + x + (size + 3) * density, cy + y - (size + 1) * density, small)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (radius <= 0f) return
        val up = headingUp ?: 0.0
        canvas.drawRoundRect(0f, 0f, width.toFloat(), height.toFloat(), 20 * density, 20 * density, panel)
        for (elevation in listOf(0, 30, 60)) canvas.drawCircle(cx, cy, radius * (90 - elevation) / 90f, grid)
        for (az in listOf(0.0, 90.0)) {
            val (x, y) = PassGeometry.project(az, 0.0, radius, up)
            canvas.drawLine(cx - x, cy - y, cx + x, cy + y, grid)
        }
        // Elevation labels sit on the screen radial farthest from the track, on a small pill so they stay legible.
        val pill = pillPaint
        for (elevation in listOf(0, 30, 60, 90)) {
            val text = "$elevation°"
            val distance = radius * (90 - elevation) / 90f
            val lx = cx + labelDx * distance
            val ly = cy + labelDy * distance
            val half = small.measureText(text) / 2 + 3 * density
            val high = small.textSize / 2 + 2 * density
            val px = if (elevation == 0) lx - half else lx + (if (elevation == 90) half else 0f)
            canvas.drawRoundRect(px - half, ly - high, px + half, ly + high, high, high, pill)
            small.textAlign = Paint.Align.CENTER
            canvas.drawText(text, px, ly + small.textSize * 0.35f, small)
        }
        cardinals.forEachIndexed { index, name ->
            val (x, y) = PassGeometry.project(index * 90.0, 0.0, radius + 15 * density, up)
            label.color = if (index == 0) colors.orange else colors.text
            canvas.drawText(name, cx + x, cy + y + label.textSize * 0.35f, label)
        }
        label.color = colors.text
        if (track.size >= 2) {
            canvas.drawPath(shade, shadeLine)
            canvas.drawPath(past, pastLine)
            canvas.drawPath(future, if (now < track.first().time) upcomingLine else futureLine)
            mark(canvas, track.first(), colors.positive, 5f, "AOS")
            mark(canvas, track.last(), Color.rgb(207, 34, 46), 5f, "LOS")
            mark(canvas, track.maxBy { it.elevation }, colors.accent, 4f, "MAX")
        }
        drawBody(canvas, sun, Color.rgb(255, 193, 7), false)
        drawBody(canvas, moon, Color.rgb(200, 200, 210), true)
        val current = SatellitePasses.at(track, now)
        current?.let {
            val (x, y) = spot(it)
            fill.color = colors.text
            canvas.drawCircle(cx + x, cy + y, 7 * density, fill)
            canvas.drawCircle(cx + x, cy + y, 7 * density, ring)
        }
        drawMotion(canvas, current)
        if (device != null) drawPointing(canvas, up)
        drawTopMarker(canvas)
        drawLegend(canvas)
    }

    private fun drawLegend(canvas: Canvas) {
        small.textAlign = Paint.Align.LEFT
        if (sourceLabel.isNotEmpty()) canvas.drawText(sourceLabel, 10 * density, 8 * density + small.textSize, small)
        if (eclipsed.size == track.size && eclipsed.isNotEmpty()) {
            val step = small.textSize + 4 * density
            val sunY = height - 12 * density - step
            val shadowY = height - 12 * density
            val x0 = 10 * density
            val x1 = x0 + 22 * density
            canvas.drawLine(x0, sunY - small.textSize * 0.35f, x1, sunY - small.textSize * 0.35f, futureLine)
            canvas.drawText(legendSunlit, x1 + 6 * density, sunY, small)
            canvas.drawLine(x0, shadowY - small.textSize * 0.35f, x1, shadowY - small.textSize * 0.35f, shadeLine)
            canvas.drawText(legendShadow, x1 + 6 * density, shadowY, small)
        }
        small.textAlign = Paint.Align.CENTER
    }

    // Sun: disc with rays; moon: crescent made from two discs.
    private fun drawBody(canvas: Canvas, body: PassSky.Horizontal?, color: Int, crescent: Boolean) {
        if (body == null || body.elevation < 0) return
        val (x, y) = PassGeometry.project(body.azimuth, body.elevation, radius, headingUp ?: 0.0)
        val px = cx + x
        val py = cy + y
        fill.color = color
        val size = 7 * density
        canvas.drawCircle(px, py, size, fill)
        if (crescent) {
            fill.color = colors.surface
            canvas.drawCircle(px + size * 0.45f, py - size * 0.2f, size * 0.85f, fill)
        } else {
            cross.color = color
            for (step in 0 until 8) {
                val angle = Math.toRadians(step * 45.0)
                val ux = cos(angle).toFloat(); val uy = sin(angle).toFloat()
                canvas.drawLine(px + ux * size * 1.3f, py + uy * size * 1.3f, px + ux * size * 1.8f, py + uy * size * 1.8f, cross)
            }
        }
    }

    // Triangle just ahead of the satellite pointing along its motion, so the direction on the red line is unambiguous.
    private fun drawMotion(canvas: Canvas, current: SatelliteLook?) {
        if (track.size < 2) return
        val from = current ?: track.first()
        val to = SatellitePasses.at(track, (from.time + 10_000).coerceAtMost(track.last().time)) ?: return
        val (ax, ay) = spot(from)
        val (bx, by) = spot(to)
        val angle = PassSky.motionAngle(ax, ay, bx, by) ?: return
        val size = 7 * density
        val tipX = cx + ax + cos(angle).toFloat() * size * 2.6f
        val tipY = cy + ay + sin(angle).toFloat() * size * 2.6f
        arrow.reset()
        arrow.moveTo(tipX + cos(angle).toFloat() * size, tipY + sin(angle).toFloat() * size)
        for (side in listOf(2.5, -2.5)) {
            arrow.lineTo(tipX + cos(angle + side).toFloat() * size, tipY + sin(angle + side).toFloat() * size)
        }
        arrow.close()
        fill.color = colors.orange
        canvas.drawPath(arrow, fill)
    }

    private fun drawPointing(canvas: Canvas, up: Double) {
        val (az, el) = device ?: return
        val (x, y) = PassGeometry.project(az, el, radius, up)
        val color = if (onTarget) colors.positive else colors.text
        cross.color = color
        val px = cx + x
        val py = cy + y
        val arm = 18 * density
        canvas.drawCircle(px, py, 11 * density, cross)
        canvas.drawLine(px - arm, py, px + arm, py, cross)
        canvas.drawLine(px, py - arm, px, py + arm, cross)
        val aimAt = target ?: return
        if (onTarget) return
        val (tx, ty) = spot(aimAt)
        val dx = cx + tx - px
        val dy = cy + ty - py
        val length = hypot(dx, dy)
        if (length < 20 * density) return
        val ux = dx / length
        val uy = dy / length
        val sx = px + ux * 14 * density
        val sy = py + uy * 14 * density
        val ex = cx + tx - ux * 9 * density
        val ey = cy + ty - uy * 9 * density
        cross.color = colors.orange
        canvas.drawLine(sx, sy, ex, ey, cross)
        val angle = atan2(dy, dx)
        val head = 9 * density
        for (side in listOf(-0.5, 0.5)) {
            canvas.drawLine(ex, ey, ex - head * cos(angle + side).toFloat(), ey - head * sin(angle + side).toFloat(), cross)
        }
    }

    // Fixed marker: whatever is at the top of the screen is where the phone points.
    private fun drawTopMarker(canvas: Canvas) {
        val top = 4 * density
        marker.reset()
        marker.moveTo(cx - 8 * density, top); marker.lineTo(cx + 8 * density, top); marker.lineTo(cx, top + 12 * density); marker.close()
        fill.color = colors.orange
        canvas.drawPath(marker, fill)
        if (headingLabel.isNotEmpty()) {
            label.textAlign = Paint.Align.LEFT
            canvas.drawText(headingLabel, cx + 12 * density, top + 12 * density, label)
            label.textAlign = Paint.Align.CENTER
        }
    }
}
