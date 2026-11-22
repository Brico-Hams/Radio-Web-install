package org.bricohams.radio

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.view.View
import java.util.Locale
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

internal fun toolsNumber(value: Double, digits: Int): String =
    if (value.isFinite()) String.format(Locale.ROOT, "%.${digits}f", value) else "∞"

/** Base of the radio-tools graphics: rounded panel in palette colours (follows night mode), shared paints, TalkBack on. */
abstract class ToolsChartView(context: Context, private val aspect: Float) : View(context) {
    protected val colors = Brand.Palette(context)
    protected val density = resources.displayMetrics.density
    private val panel = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = colors.surface }
    protected val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    protected val route = Path()

    init { importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES }

    protected fun stroke(color: Int, width: Float) = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE; strokeWidth = width * density; this.color = color
        strokeJoin = Paint.Join.ROUND; strokeCap = Paint.Cap.ROUND
    }
    protected fun text(size: Float, color: Int = colors.text, align: Paint.Align = Paint.Align.CENTER, bold: Boolean = false) =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color; textSize = size * density; textAlign = align
            if (bold) isFakeBoldText = true
        }
    protected fun dashed(paint: Paint) = paint.apply { pathEffect = DashPathEffect(floatArrayOf(8 * density, 6 * density), 0f) }
    protected fun baseline(paint: Paint, y: Float) = y + paint.textSize * 0.35f

    protected open fun heightFor(width: Int) = (width * aspect).toInt()

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        setMeasuredDimension(width, heightFor(width))
    }

    protected abstract fun draw(canvas: Canvas, w: Float, h: Float)

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawRoundRect(0f, 0f, width.toFloat(), height.toFloat(), 20 * density, 20 * density, panel)
        draw(canvas, width.toFloat(), height.toFloat())
    }
}

/** Equirectangular map with both stations and the short great-circle path, split at the antimeridian. */
class ToolsWorldMapView(context: Context) : ToolsChartView(context, 0.5f) {
    var land: List<List<Pair<Double, Double>>> = emptyList()
        set(value) { field = value; rebuild(); invalidate() }
    private var from: Maidenhead.LatLon? = null
    private var to: Maidenhead.LatLon? = null
    private var fromName = ""
    private var toName = ""
    private val landPath = Path()
    private val ground = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = colors.surfaceHigh }
    private val grid = stroke(colors.outline, 1f)
    private val routeLine = stroke(colors.orange, 2.5f)
    private val label = text(12f, colors.text, Paint.Align.LEFT, true)

    init { contentDescription = context.getString(R.string.tools_cd_map_empty) }

    fun show(from: Maidenhead.LatLon?, to: Maidenhead.LatLon?, fromName: String, toName: String, distanceKm: Double?) {
        this.from = from; this.to = to; this.fromName = fromName; this.toName = toName
        contentDescription = if (from != null && to != null && distanceKm != null)
            context.getString(R.string.tools_cd_map, fromName, toName, toolsNumber(distanceKm, 0))
        else context.getString(R.string.tools_cd_map_empty)
        rebuild(); invalidate()
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
        landPath.reset(); route.reset()
        if (width == 0) return
        land.forEach { trace(landPath, it, true) }
        val a = from
        val b = to
        if (a != null && b != null) {
            trace(route, RadioTools.greatCirclePath(a, b).map { Pair(it.longitude, it.latitude) }, false)
        }
    }

    private fun station(canvas: Canvas, point: Maidenhead.LatLon, name: String, color: Int, w: Float, h: Float) {
        val (x, y) = WorldMap.project(point.longitude, point.latitude, w, h)
        fill.color = colors.surface
        canvas.drawCircle(x, y, 7 * density, fill)
        fill.color = color
        canvas.drawCircle(x, y, 5 * density, fill)
        if (name.isEmpty()) return
        val right = x < w * 0.7f
        label.textAlign = if (right) Paint.Align.LEFT else Paint.Align.RIGHT
        canvas.drawText(name, x + (if (right) 9 else -9) * density, y - 8 * density, label)
    }

    override fun draw(canvas: Canvas, w: Float, h: Float) {
        for (step in 1 until 12) canvas.drawLine(w * step / 12f, 0f, w * step / 12f, h, grid)
        for (step in 1 until 6) canvas.drawLine(0f, h * step / 6f, w, h * step / 6f, grid)
        canvas.drawPath(landPath, ground)
        canvas.drawPath(route, routeLine)
        from?.let { station(canvas, it, fromName, colors.positive, w, h) }
        to?.let { station(canvas, it, toName, colors.orange, w, h) }
    }
}

/** Compass rose with the short-path bearing (solid) and the long-path bearing (dashed). */
class CompassRoseView(context: Context) : ToolsChartView(context, 1f) {
    private var shortBearing: Double? = null
    private val longBearing get() = shortBearing?.let { (it + 180) % 360 }
    private val ring = stroke(colors.outline, 1.5f)
    private val tick = stroke(colors.muted, 1f)
    private val shortLine = stroke(colors.orange, 4f)
    private val longLine = dashed(stroke(colors.muted, 3f))
    private val cardinal = text(15f, colors.text, bold = true)
    private val legend = text(12f, colors.text, Paint.Align.LEFT)
    private val cardinals = listOf(R.string.tools_cardinal_n, R.string.tools_cardinal_e, R.string.tools_cardinal_s, R.string.tools_cardinal_w)
        .map { context.getString(it) }
    private val shortLabel = context.getString(R.string.tools_legend_short)
    private val longLabel = context.getString(R.string.tools_legend_long)

    init { contentDescription = context.getString(R.string.tools_cd_compass_empty) }

    override fun heightFor(width: Int) = min(width, (300 * density).toInt())

    fun show(bearing: Double?) {
        shortBearing = bearing
        contentDescription = if (bearing == null) context.getString(R.string.tools_cd_compass_empty)
        else context.getString(R.string.tools_cd_compass, toolsNumber(bearing, 0), toolsNumber(longBearing ?: 0.0, 0))
        invalidate()
    }

    private fun arrow(canvas: Canvas, cx: Float, cy: Float, radius: Float, degrees: Double, paint: Paint) {
        val angle = Math.toRadians(degrees)
        val ux = sin(angle).toFloat()
        val uy = -cos(angle).toFloat()
        val tipX = cx + ux * radius
        val tipY = cy + uy * radius
        canvas.drawLine(cx, cy, tipX, tipY, paint)
        val head = 12 * density
        for (side in listOf(-0.4, 0.4)) {
            val a = angle + Math.PI + side
            canvas.drawLine(tipX, tipY, tipX + sin(a).toFloat() * head, tipY - cos(a).toFloat() * head, paint)
        }
    }

    override fun draw(canvas: Canvas, w: Float, h: Float) {
        val cx = w / 2
        val cy = h / 2
        val radius = min(cx, cy) - 30 * density
        if (radius <= 0f) return
        canvas.drawCircle(cx, cy, radius, ring)
        for (step in 0 until 36) {
            val angle = Math.toRadians(step * 10.0)
            val inner = radius - (if (step % 9 == 0) 14 else if (step % 3 == 0) 9 else 5) * density
            canvas.drawLine(cx + sin(angle).toFloat() * inner, cy - cos(angle).toFloat() * inner,
                cx + sin(angle).toFloat() * radius, cy - cos(angle).toFloat() * radius, tick)
        }
        cardinals.forEachIndexed { index, name ->
            val angle = Math.toRadians(index * 90.0)
            cardinal.color = if (index == 0) colors.orange else colors.text
            canvas.drawText(name, cx + sin(angle).toFloat() * (radius + 16 * density),
                baseline(cardinal, cy - cos(angle).toFloat() * (radius + 16 * density)), cardinal)
        }
        val short = shortBearing ?: return
        arrow(canvas, cx, cy, radius - 6 * density, longBearing ?: return, longLine)
        arrow(canvas, cx, cy, radius - 6 * density, short, shortLine)
        fill.color = colors.text
        canvas.drawCircle(cx, cy, 4 * density, fill)
        val y1 = 14 * density
        val y2 = 32 * density
        canvas.drawLine(8 * density, y1 - 4 * density, 26 * density, y1 - 4 * density, shortLine)
        canvas.drawText("$shortLabel ${toolsNumber(short, 0)}°", 32 * density, y1, legend)
        canvas.drawLine(8 * density, y2 - 4 * density, 26 * density, y2 - 4 * density, longLine)
        canvas.drawText("$longLabel ${toolsNumber(longBearing ?: 0.0, 0)}°", 32 * density, y2, legend)
    }
}

/** Semicircle gauge for the SWR from 1.0 to 3.0+: green up to 1.5, amber up to 2.0, red above. */
class SwrGaugeView(context: Context) : ToolsChartView(context, 0.55f) {
    private var swr: Double? = null
    private val amber = Color.rgb(255, 193, 7)
    private val band = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 18 * density }
    private val needle = stroke(colors.text, 3f)
    private val tick = text(12f, colors.muted)
    private val value = text(22f, colors.text, bold = true)
    private val oval = RectF()

    init { contentDescription = context.getString(R.string.tools_cd_swr_empty) }

    fun show(value: Double?) {
        swr = value
        contentDescription = if (value == null) context.getString(R.string.tools_cd_swr_empty)
        else context.getString(R.string.tools_cd_swr, toolsNumber(value, 2), context.getString(quality(value)))
        invalidate()
    }

    private fun fraction(swr: Double) = ((swr - 1.0) / 2.0).coerceIn(0.0, 1.0)

    override fun draw(canvas: Canvas, w: Float, h: Float) {
        val cx = w / 2
        val cy = h * 0.72f
        val radius = min(cx - 28 * density, cy - 16 * density)
        if (radius <= 0f) return
        oval.set(cx - radius, cy - radius, cx + radius, cy + radius)
        val segments = listOf(Triple(0.0, 0.25, colors.positive), Triple(0.25, 0.5, amber), Triple(0.5, 1.0, colors.error))
        for ((start, end, color) in segments) {
            band.color = color
            canvas.drawArc(oval, (180 + start * 180).toFloat(), ((end - start) * 180).toFloat(), false, band)
        }
        for ((swrValue, text) in listOf(1.0 to "1", 1.5 to "1.5", 2.0 to "2", 3.0 to "3+")) {
            val angle = Math.toRadians(180 + fraction(swrValue) * 180)
            val r = radius + 20 * density
            canvas.drawText(text, cx + cos(angle).toFloat() * r, baseline(tick, cy + sin(angle).toFloat() * r), tick)
        }
        val current = swr ?: return
        val angle = Math.toRadians(180 + fraction(current) * 180)
        canvas.drawLine(cx, cy, cx + cos(angle).toFloat() * (radius - 8 * density), cy + sin(angle).toFloat() * (radius - 8 * density), needle)
        fill.color = colors.text
        canvas.drawCircle(cx, cy, 6 * density, fill)
        canvas.drawText(if (current > 3.0) "3.0+" else toolsNumber(current, 2), cx, cy + 34 * density, value)
    }

    companion object {
        /** Text quality of an SWR, so the state never relies on colour alone. */
        fun quality(swr: Double) = when {
            swr <= 1.5 -> R.string.tools_swr_good
            swr <= 2.0 -> R.string.tools_swr_fair
            else -> R.string.tools_swr_poor
        }
    }
}

/** Attenuation (dB/100 m) of the selected cable against frequency on a logarithmic axis, with a marker for the entered frequency. */
class CoaxChartView(context: Context) : ToolsChartView(context, 0.62f) {
    private var cable: String? = null
    private var markerMHz: Double? = null
    private var markerDb: Double? = null
    private val axis = stroke(colors.outline, 1f)
    private val curve = stroke(colors.accent, 2.5f)
    private val markerLine = dashed(stroke(colors.orange, 1.5f))
    private val small = text(10f, colors.muted)
    private val smallRight = text(10f, colors.muted, Paint.Align.RIGHT)
    private val axisLabel = text(10f, colors.muted, Paint.Align.LEFT)
    private val markerText = text(12f, colors.text, Paint.Align.LEFT, true)

    init { contentDescription = context.getString(R.string.tools_cd_coax_empty) }

    fun show(cable: String?, markerMHz: Double?, markerDb: Double?) {
        this.cable = cable?.takeIf { RadioTools.COAX_TABLE.containsKey(it) }
        this.markerMHz = markerMHz; this.markerDb = markerDb
        val name = this.cable
        contentDescription = if (name == null) context.getString(R.string.tools_cd_coax_empty) else {
            val points = RadioTools.COAX_TABLE.getValue(name)
            var text = context.getString(R.string.tools_cd_coax, name, toolsNumber(points.first().second, 1), toolsNumber(points.last().second, 1))
            if (markerMHz != null && markerDb != null) text += " " + context.getString(R.string.tools_cd_coax_at, toolsNumber(markerDb, 2), toolsNumber(markerMHz, 1))
            text
        }
        invalidate()
    }

    override fun draw(canvas: Canvas, w: Float, h: Float) {
        val name = cable ?: return
        val points = RadioTools.COAX_TABLE.getValue(name)
        val left = 42 * density
        val right = w - 14 * density
        val top = 16 * density
        val bottom = h - 28 * density
        val f0 = points.first().first
        val f1 = points.last().first
        val yMax = points.last().second * 1.1
        fun x(f: Double) = left + (ln(f / f0) / ln(f1 / f0)).toFloat() * (right - left)
        fun y(db: Double) = bottom - (db / yMax).toFloat() * (bottom - top)
        for (step in 0..2) {
            val db = yMax * step / 2
            canvas.drawLine(left, y(db), right, y(db), axis)
            canvas.drawText(toolsNumber(db, 0), left - 6 * density, baseline(smallRight, y(db)), smallRight)
        }
        for ((f, _) in points) {
            canvas.drawLine(x(f), bottom, x(f), bottom + 4 * density, axis)
            canvas.drawText(f.toLong().toString(), x(f), bottom + 16 * density, small)
        }
        canvas.drawText("dB/100 m", left, top - 4 * density, axisLabel)
        canvas.drawText("MHz", right, h - 4 * density, smallRight)
        route.reset()
        for (step in 0..48) {
            val f = f0 * Math.pow(f1 / f0, step / 48.0)
            val px = x(f)
            val py = y(RadioTools.coaxDbPer100m(name, f.coerceIn(f0, f1)))
            if (step == 0) route.moveTo(px, py) else route.lineTo(px, py)
        }
        canvas.drawPath(route, curve)
        val mf = markerMHz
        val md = markerDb
        if (mf != null && md != null && mf in f0..f1) {
            canvas.drawLine(x(mf), top, x(mf), bottom, markerLine)
            fill.color = colors.orange
            canvas.drawCircle(x(mf), y(md), 5 * density, fill)
            val label = toolsNumber(md, 1) + " dB"
            val onLeft = x(mf) > (left + right) / 2
            markerText.textAlign = if (onLeft) Paint.Align.RIGHT else Paint.Align.LEFT
            canvas.drawText(label, x(mf) + (if (onLeft) -8 else 8) * density, y(md) - 8 * density, markerText)
        }
    }
}

/** Horizontal 0-60 dBm scale with the equivalent watts under each step and a marker for the current level. */
class PowerLadderView(context: Context) : ToolsChartView(context, 0.4f) {
    private var dBm: Double? = null
    private val track = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = colors.surfaceHigh }
    private val bar = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = colors.accent }
    private val axis = stroke(colors.muted, 1f)
    private val top = text(11f, colors.text)
    private val bottom = text(10f, colors.muted)
    private val valueText = text(13f, colors.text, bold = true)
    private val watts = listOf("1 mW", "10 mW", "100 mW", "1 W", "10 W", "100 W", "1 kW")
    private val marker = Path()

    init { contentDescription = context.getString(R.string.tools_cd_power_empty) }

    override fun heightFor(width: Int) = (130 * density).toInt()

    fun show(value: Double?) {
        dBm = value
        contentDescription = if (value == null) context.getString(R.string.tools_cd_power_empty)
        else context.getString(R.string.tools_cd_power, toolsNumber(value, 1))
        invalidate()
    }

    override fun draw(canvas: Canvas, w: Float, h: Float) {
        val left = 24 * density
        val right = w - 24 * density
        val barTop = h * 0.42f
        val barBottom = barTop + 16 * density
        fun x(level: Double) = left + (level.coerceIn(0.0, 60.0) / 60.0).toFloat() * (right - left)
        canvas.drawRoundRect(left, barTop, right, barBottom, 8 * density, 8 * density, track)
        val level = dBm
        if (level != null) {
            canvas.drawRoundRect(left, barTop, max(x(level), left + 8 * density), barBottom, 8 * density, 8 * density, bar)
        }
        for (step in 0..6) {
            val px = x(step * 10.0)
            canvas.drawLine(px, barBottom, px, barBottom + 5 * density, axis)
            canvas.drawText((step * 10).toString(), px, baseline(top, barTop - 10 * density), top)
            canvas.drawText(watts[step], px, barBottom + 18 * density, bottom)
        }
        if (level != null) {
            val px = x(level)
            marker.reset()
            marker.moveTo(px - 7 * density, barBottom + 24 * density); marker.lineTo(px + 7 * density, barBottom + 24 * density)
            marker.lineTo(px, barBottom + 12 * density); marker.close()
            fill.color = colors.orange
            canvas.drawPath(marker, fill)
            valueText.textAlign = Paint.Align.CENTER
            val labelX = px.coerceIn(left + 30 * density, right - 30 * density)
            canvas.drawText(toolsNumber(level, 1) + " dBm", labelX, barBottom + 40 * density, valueText)
        }
    }
}

/** Half-wave dipole and quarter-wave vertical drawn with their lengths. */
class AntennaDiagramView(context: Context) : ToolsChartView(context, 0.62f) {
    private var halfWaveM: Double? = null
    private var quarterWaveM: Double? = null
    private val wire = stroke(colors.orange, 4f)
    private val ground = stroke(colors.muted, 3f)
    private val dimension = stroke(colors.accent, 1.5f)
    private val caption = text(13f, colors.text, bold = true)
    private val length = text(13f, colors.accent, bold = true)
    private val dipoleCaption = context.getString(R.string.tools_diagram_dipole)
    private val verticalCaption = context.getString(R.string.tools_diagram_vertical)

    init { contentDescription = context.getString(R.string.tools_cd_antenna_empty) }

    fun show(halfWave: Double?, quarterWave: Double?) {
        halfWaveM = halfWave; quarterWaveM = quarterWave
        contentDescription = if (halfWave == null || quarterWave == null) context.getString(R.string.tools_cd_antenna_empty)
        else context.getString(R.string.tools_cd_antenna, toolsNumber(halfWave, 2), toolsNumber(quarterWave, 2))
        invalidate()
    }

    private fun dimensionLine(canvas: Canvas, x1: Float, x2: Float, y: Float) {
        canvas.drawLine(x1, y, x2, y, dimension)
        val size = 5 * density
        canvas.drawLine(x1, y - size, x1, y + size, dimension)
        canvas.drawLine(x2, y - size, x2, y + size, dimension)
    }

    override fun draw(canvas: Canvas, w: Float, h: Float) {
        val half = w / 2
        canvas.drawText("$dipoleCaption λ/2", half / 2, baseline(caption, 22 * density), caption)
        canvas.drawText("$verticalCaption λ/4", half + half / 2, baseline(caption, 22 * density), caption)
        // Dipole: two arms around the feed point.
        val dl = 14 * density
        val dr = half - 14 * density
        val dy = h * 0.45f
        val mid = (dl + dr) / 2
        canvas.drawLine(dl, dy, mid - 4 * density, dy, wire)
        canvas.drawLine(mid + 4 * density, dy, dr, dy, wire)
        fill.color = colors.text
        canvas.drawCircle(mid, dy, 4 * density, fill)
        dimensionLine(canvas, dl, dr, dy + 30 * density)
        halfWaveM?.let { canvas.drawText(toolsNumber(it, 2) + " m", mid, baseline(length, dy + 50 * density), length) }
        // Vertical: element over a ground plane with radials.
        val vx = half + half / 2 - 10 * density
        val groundY = h * 0.80f
        val top = h * 0.22f + 14 * density
        canvas.drawLine(vx, groundY, vx, top, wire)
        canvas.drawLine(vx - half * 0.32f, groundY + 10 * density, vx + half * 0.32f, groundY + 10 * density, ground)
        canvas.drawLine(vx, groundY, vx - half * 0.28f, groundY + 10 * density, ground)
        canvas.drawLine(vx, groundY, vx + half * 0.28f, groundY + 10 * density, ground)
        val dimX = vx + half * 0.3f
        canvas.drawLine(dimX, groundY, dimX, top, dimension)
        canvas.drawLine(dimX - 5 * density, top, dimX + 5 * density, top, dimension)
        canvas.drawLine(dimX - 5 * density, groundY, dimX + 5 * density, groundY, dimension)
        length.textAlign = Paint.Align.CENTER
        quarterWaveM?.let { canvas.drawText(toolsNumber(it, 2) + " m", dimX - 4 * density, baseline(length, top - 10 * density), length) }
    }
}

/** One bar per amateur band of the region on a logarithmic frequency axis; the band of the entered frequency is highlighted. */
class BandPlanView(context: Context) : ToolsChartView(context, 1f) {
    private var region = 1
    private var frequency: Double? = null
    private val bar = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = colors.muted }
    private val active = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = colors.orange }
    private val label = text(12f, colors.text, Paint.Align.LEFT)
    private val range = text(10f, colors.muted, Paint.Align.LEFT)
    private val markerLine = dashed(stroke(colors.orange, 1.5f))
    private val rows get() = RadioTools.REGION_BANDS.getValue(region)

    init { contentDescription = context.getString(R.string.tools_cd_bands, region) }

    override fun heightFor(width: Int) = ((rows.size * ROW_DP + 20) * density).toInt()

    fun show(region: Int, frequencyMHz: Double?) {
        this.region = region; this.frequency = frequencyMHz
        val band = frequencyMHz?.let { RadioTools.bandOf(it, region) }
        contentDescription = if (band == null) context.getString(R.string.tools_cd_bands, region)
        else context.getString(R.string.tools_cd_bands_active, region, band)
        requestLayout(); invalidate()
    }

    override fun draw(canvas: Canvas, w: Float, h: Float) {
        val left = 56 * density
        val right = w - 12 * density
        val f0 = 1.7
        val f1 = 1400.0
        fun x(f: Double) = left + (ln(f.coerceIn(f0, f1) / f0) / ln(f1 / f0)).toFloat() * (right - left)
        val current = frequency
        val currentBand = current?.let { RadioTools.bandOf(it, region) }
        rows.forEachIndexed { index, entry ->
            val cy = (10 + index * ROW_DP + ROW_DP / 2) * density
            val chosen = entry.band == currentBand
            label.isFakeBoldText = chosen
            label.color = if (chosen) colors.accent else colors.text
            canvas.drawText(entry.band, 12 * density, baseline(label, cy), label)
            val x0 = x(entry.minMHz)
            val x1 = max(x(entry.maxMHz), x0 + 4 * density)
            canvas.drawRoundRect(x0, cy - 6 * density, x1, cy + 6 * density, 4 * density, 4 * density, if (chosen) active else bar)
            val text = "${entry.minMHz} – ${entry.maxMHz}"
            val width = range.measureText(text)
            val rightSide = x1 + 6 * density + width <= w - 4 * density
            canvas.drawText(text, if (rightSide) x1 + 6 * density else x0 - 6 * density - width, baseline(range, cy), range)
        }
        if (current != null && current in f0..f1) {
            canvas.drawLine(x(current), 4 * density, x(current), h - 4 * density, markerLine)
        }
    }

    private companion object { const val ROW_DP = 24 }
}
