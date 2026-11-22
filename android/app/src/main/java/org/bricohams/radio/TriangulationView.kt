package org.bricohams.radio

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.view.View
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin

/**
 * Simple north-up plot of a hunt in the local tangent plane (east/north metres around the observers' centroid, as used by
 * [Triangulation.estimate]): observers, bearing lines with their uncertainty wedges and the estimate with its 95 % ellipse.
 * Same canvas approach as [WorldMapView]; the list below the plot is the textual fallback.
 */
class TriangulationView(context: Context) : View(context) {
    var observations: List<BearingObservation> = emptyList()
        set(value) { field = value; invalidate() }
    var result: TriangulationResult? = null
        set(value) { field = value; invalidate() }

    private val density = resources.displayMetrics.density
    private val sea = Paint().apply { color = Brand.BACKGROUND }
    private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 1.6f * density; color = Brand.ORBIT_LIGHT }
    private val wedge = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL; color = Brand.ORBIT_LIGHT; alpha = 60 }
    private val observer = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(46, 160, 67) }
    private val target = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Brand.ORANGE }
    private val ellipse = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 2f * density; color = Brand.ORANGE }
    private val label = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; textSize = 11 * density }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        setMeasuredDimension(width, (width * 0.75f).toInt())
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), sea)
        if (observations.isEmpty()) return
        val estimate = result?.takeIf { it.hasEstimate }
        val lat0 = observations.sumOf { it.latitude } / observations.size
        val lon0 = observations.sumOf { it.longitude } / observations.size
        val points = observations.map { Pair(it.latitude, it.longitude) } + listOfNotNull(estimate?.let { Pair(it.latitude!!, it.longitude!!) })
        val offsets = Triangulation.localOffsets(lat0, lon0, points)
        val half = max(offsets.maxOf { max(kotlin.math.abs(it.first), kotlin.math.abs(it.second)) } * 1.4, 500.0)
        val scale = (minOf(width, height) / 2f - 16 * density) / half.toFloat()
        fun px(x: Double) = width / 2f + x.toFloat() * scale
        fun py(y: Double) = height / 2f - y.toFloat() * scale
        val reach = half * 1.5
        observations.forEachIndexed { index, o ->
            val (x, y) = offsets[index]
            val ray = estimate?.let { _ ->
                val (ex, ey) = offsets.last()
                max(kotlin.math.hypot(ex - x, ey - y) * 1.3, half * 0.5)
            } ?: reach
            val path = Path().apply {
                moveTo(px(x), py(y))
                for (delta in listOf(-o.uncertaintyDeg, o.uncertaintyDeg)) {
                    val a = Math.toRadians(o.bearingTrueDeg + delta)
                    lineTo(px(x + sin(a) * ray), py(y + cos(a) * ray))
                }
                close()
            }
            canvas.drawPath(path, wedge)
            val a = Math.toRadians(o.bearingTrueDeg)
            canvas.drawLine(px(x), py(y), px(x + sin(a) * ray), py(y + cos(a) * ray), line)
            canvas.drawCircle(px(x), py(y), 4 * density, observer)
            canvas.drawText(o.callsign, px(x) + 6 * density, py(y) - 4 * density, label)
        }
        if (estimate != null) {
            val (x, y) = offsets.last()
            canvas.save()
            canvas.rotate(estimate.majorAxisAzimuthDeg.toFloat(), px(x), py(y))
            canvas.drawOval(RectF(px(x) - estimate.semiMinorM.toFloat() * scale, py(y) - estimate.semiMajorM.toFloat() * scale,
                px(x) + estimate.semiMinorM.toFloat() * scale, py(y) + estimate.semiMajorM.toFloat() * scale), ellipse)
            canvas.restore()
            canvas.drawCircle(px(x), py(y), 5 * density, target)
        }
        canvas.drawText("N", width - 18 * density, 16 * density, label)
    }
}
