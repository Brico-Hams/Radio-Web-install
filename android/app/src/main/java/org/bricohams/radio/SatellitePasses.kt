package org.bricohams.radio

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.view.View
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.cos
import kotlin.math.sin

data class PassTrack(val plan: SatellitePlan, val track: List<SatelliteLook>)

object SatellitePasses {
    fun sample(pass: SatellitePass, points: Int = 60, look: (Long) -> SatelliteLook): List<SatelliteLook> {
        require(points in 2..600 && pass.los.time > pass.aos.time) { "Trayectoria de pase invalida." }
        val span = pass.los.time - pass.aos.time
        return (0 until points).map { look(pass.aos.time + span * it / (points - 1)) }
    }
    // North up, east right; horizon at radius, zenith at the centre.
    fun polar(look: SatelliteLook, radius: Float): Pair<Float, Float> {
        val distance = radius * (90 - look.elevation.coerceIn(0.0, 90.0)) / 90
        val angle = Math.toRadians(look.azimuth)
        return Pair((distance * sin(angle)).toFloat(), (-distance * cos(angle)).toFloat())
    }
    fun at(track: List<SatelliteLook>, time: Long): SatelliteLook? {
        if (track.size < 2 || time < track.first().time || time > track.last().time) return null
        val index = track.indexOfLast { it.time <= time }.coerceAtMost(track.size - 2)
        val a = track[index]
        val b = track[index + 1]
        val f = if (b.time == a.time) 0.0 else (time - a.time).toDouble() / (b.time - a.time)
        val turn = (b.azimuth - a.azimuth + 540) % 360 - 180
        return SatelliteLook(time, (a.azimuth + turn * f + 360) % 360, a.elevation + (b.elevation - a.elevation) * f,
            a.rangeKm + (b.rangeKm - a.rangeKm) * f)
    }
    fun countdown(pass: SatellitePass, now: Long): String = when {
        now < pass.aos.time -> "AOS en " + duration(pass.aos.time - now)
        now < pass.los.time -> "En curso, LOS en " + duration(pass.los.time - now)
        else -> "Terminado"
    }
    private fun duration(millis: Long): String {
        val seconds = millis / 1000
        return if (seconds >= 3600) String.format(Locale.ROOT, "%d h %02d min", seconds / 3600, seconds / 60 % 60)
            else String.format(Locale.ROOT, "%d:%02d", seconds / 60, seconds % 60)
    }
    fun card(track: PassTrack, now: Long, zone: ZoneId): String {
        val pass = track.plan.pass
        val day = DateTimeFormatter.ofPattern("dd/MM HH:mm:ss", Locale.ROOT).withZone(zone)
        val clock = DateTimeFormatter.ofPattern("HH:mm:ss", Locale.ROOT).withZone(zone)
        val cut = if (pass.partialStart || pass.partialEnd) " (cortado por la ventana)" else ""
        return String.format(Locale.ROOT, "%s (%d)%s\nAOS %s  LOS %s  %d min\nMax %.1f°  Az %.0f° → %.0f°\n%s",
            track.plan.tle.name, track.plan.tle.norad, cut, day.format(Instant.ofEpochMilli(pass.aos.time)),
            clock.format(Instant.ofEpochMilli(pass.los.time)), (pass.los.time - pass.aos.time + 30000) / 60000,
            pass.maximum.elevation, pass.aos.azimuth, pass.los.azimuth, countdown(pass, now))
    }
    fun detail(track: PassTrack, now: Long): String {
        val plan = track.plan
        val pass = plan.pass
        val position = at(track.track, now)?.let {
            String.format(Locale.ROOT, "Ahora az %.1f°, el %.1f°, %.0f km", it.azimuth, it.elevation, it.rangeKm)
        } ?: countdown(pass, now)
        return String.format(Locale.ROOT, "%s\nAOS %s az %.0f°\nMax %s el %.1f°\nLOS %s az %.0f°\nParcial inicio=%s fin=%s\nObservador %.6f, %.6f, %.3f km; RX %d Hz\n%s",
            plan.tle.name, Instant.ofEpochMilli(pass.aos.time), pass.aos.azimuth, Instant.ofEpochMilli(pass.maximum.time),
            pass.maximum.elevation, Instant.ofEpochMilli(pass.los.time), pass.los.azimuth, pass.partialStart, pass.partialEnd,
            plan.observer.latitude, plan.observer.longitude, plan.observer.heightKm, plan.downlinkHz, position)
    }
}

class PassRadarView(context: Context) : View(context) {
    var track: List<SatelliteLook> = emptyList()
        set(value) { field = value; trace(); invalidate() }
    var now = 0L
        set(value) { field = value; invalidate() }
    private val density = resources.displayMetrics.density
    private val ink = context.obtainStyledAttributes(intArrayOf(android.R.attr.textColorPrimary)).run {
        try { getColor(0, Color.GRAY) } finally { recycle() }
    }
    private val grid = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = density; color = ink; alpha = 110 }
    private val label = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ink; textSize = 13 * density; textAlign = Paint.Align.CENTER }
    private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE; strokeWidth = 3 * density; color = Color.rgb(41, 157, 214)
    }
    private val dot = Paint(Paint.ANTI_ALIAS_FLAG)
    private val path = Path()
    private var cx = 0f
    private var cy = 0f
    private var radius = 0f
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        setMeasuredDimension(width, minOf(width, (320 * density).toInt()))
    }
    override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
        super.onSizeChanged(width, height, oldWidth, oldHeight)
        cx = width / 2f
        cy = height / 2f
        radius = minOf(cx, cy) - 18 * density
        trace()
    }
    // Built outside onDraw so the 1 s refresh does not reallocate the track.
    private fun trace() {
        path.reset()
        track.forEachIndexed { index, look ->
            val (x, y) = SatellitePasses.polar(look, radius)
            if (index == 0) path.moveTo(cx + x, cy + y) else path.lineTo(cx + x, cy + y)
        }
    }
    private fun mark(canvas: Canvas, look: SatelliteLook, color: Int, size: Float) {
        val (x, y) = SatellitePasses.polar(look, radius)
        dot.color = color
        canvas.drawCircle(cx + x, cy + y, size * density, dot)
    }
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (radius <= 0) return
        for (elevation in 0..60 step 30) canvas.drawCircle(cx, cy, radius * (90 - elevation) / 90f, grid)
        canvas.drawLine(cx - radius, cy, cx + radius, cy, grid)
        canvas.drawLine(cx, cy - radius, cx, cy + radius, grid)
        val offset = 5 * density
        canvas.drawText("N", cx, cy - radius - offset, label)
        canvas.drawText("S", cx, cy + radius + offset + label.textSize * 0.8f, label)
        canvas.drawText("E", cx + radius + offset + label.textSize * 0.4f, cy + label.textSize * 0.4f, label)
        canvas.drawText("O", cx - radius - offset - label.textSize * 0.4f, cy + label.textSize * 0.4f, label)
        if (track.size >= 2) {
            canvas.drawPath(path, line)
            mark(canvas, track.first(), Color.rgb(46, 160, 67), 5f)
            mark(canvas, track.last(), Color.rgb(207, 34, 46), 5f)
        }
        SatellitePasses.at(track, now)?.let { mark(canvas, it, Color.rgb(230, 160, 0), 8f) }
    }
}
