package org.bricohams.radio

import android.content.Context
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
    private fun phrase(context: Context?, id: Int, fallback: String, vararg args: Any): String =
        context?.getString(id, *args) ?: String.format(Locale.ROOT, fallback, *args)
    fun countdown(pass: SatellitePass, now: Long, context: Context? = null): String = when {
        now < pass.aos.time -> phrase(context, R.string.pass_countdown_aos, "AOS en %1\$s", duration(pass.aos.time - now))
        now < pass.los.time -> phrase(context, R.string.pass_countdown_los, "En curso, LOS en %1\$s", duration(pass.los.time - now))
        else -> phrase(context, R.string.pass_finished, "Terminado")
    }
    private fun duration(millis: Long): String {
        val seconds = millis / 1000
        return if (seconds >= 3600) String.format(Locale.ROOT, "%d h %02d min", seconds / 3600, seconds / 60 % 60)
            else String.format(Locale.ROOT, "%d:%02d", seconds / 60, seconds % 60)
    }
    fun card(track: PassTrack, now: Long, zone: ZoneId, context: Context? = null): String {
        val pass = track.plan.pass
        val day = DateTimeFormatter.ofPattern("dd/MM HH:mm:ss", Locale.ROOT).withZone(zone)
        val clock = DateTimeFormatter.ofPattern("HH:mm:ss", Locale.ROOT).withZone(zone)
        val cut = (if (pass.partialStart) phrase(context, R.string.pass_start_unknown, " (en curso, inicio no calculado)") else "") +
            (if (pass.partialEnd) phrase(context, R.string.pass_partial, " (cortado por la ventana)") else "")
        return String.format(Locale.ROOT, "%s (%d)%s\nAOS %s  LOS %s  %d min\nMax %.1f°  Az %.0f° → %.0f°\n%s",
            track.plan.tle.name, track.plan.tle.norad, cut, day.format(Instant.ofEpochMilli(pass.aos.time)),
            clock.format(Instant.ofEpochMilli(pass.los.time)), (pass.los.time - pass.aos.time + 30000) / 60000,
            pass.maximum.elevation, pass.aos.azimuth, pass.los.azimuth, countdown(pass, now, context))
    }
    fun detail(track: PassTrack, now: Long, context: Context? = null): String {
        val plan = track.plan
        val pass = plan.pass
        val position = at(track.track, now)?.let {
            phrase(context, R.string.pass_current, "Ahora az %1\$.1f°, el %2\$.1f°, %3\$.0f km",
                it.azimuth, it.elevation, it.rangeKm)
        } ?: countdown(pass, now, context)
        val text = phrase(context, R.string.pass_detail, "%s\nAOS %s az %.0f°\nMax %s el %.1f°\nLOS %s az %.0f°\nParcial inicio=%s fin=%s\nObservador %.6f, %.6f, %.3f km; RX %d Hz\n%s",
            plan.tle.name, Instant.ofEpochMilli(pass.aos.time), pass.aos.azimuth, Instant.ofEpochMilli(pass.maximum.time),
            pass.maximum.elevation, Instant.ofEpochMilli(pass.los.time), pass.los.azimuth, pass.partialStart, pass.partialEnd,
            plan.observer.latitude, plan.observer.longitude, plan.observer.heightKm, plan.downlinkHz, position)
        return if (pass.partialStart) text.replaceFirst(Regex("AOS [^\\n]*"),
            phrase(context, R.string.pass_start_unknown, " (en curso, inicio no calculado)").trim(' ', '(', ')')) else text
    }
}

