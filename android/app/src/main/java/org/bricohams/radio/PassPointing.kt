package org.bricohams.radio

import kotlin.math.abs
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.roundToInt

/** Pure maths of the pass chart and "Apuntar" mode; no Android classes so it runs in JVM tests. */
object PassPointing {
    /** The phone counts as aimed when both az and el are within this many degrees of the satellite. */
    const val TOLERANCE_DEG = 5.0
    const val DEFAULT_STEP_SECONDS = 10

    /** How far the phone is from the satellite: turn > 0 means right, raise > 0 means up. */
    data class Aim(val turn: Double, val raise: Double) {
        val onTarget get() = abs(turn) <= TOLERANCE_DEG && abs(raise) <= TOLERANCE_DEG
    }

    /** Localised patterns, each taking the whole-degree amount. */
    data class Phrases(val left: (Int) -> String, val right: (Int) -> String, val up: (Int) -> String, val down: (Int) -> String,
        val onTarget: String)

    /** AOS to LOS inclusive, one sample every [stepSeconds]; the last step is shortened so LOS is always sampled exactly. */
    fun sampleTrack(pass: SatellitePass, stepSeconds: Int = DEFAULT_STEP_SECONDS, look: (Long) -> SatelliteLook): List<SatelliteLook> {
        require(stepSeconds in 1..60 && pass.los.time > pass.aos.time) { "Trayectoria de pase invalida." }
        val step = stepSeconds * 1000L
        val times = ArrayList<Long>()
        var time = pass.aos.time
        while (time < pass.los.time) { times.add(time); time += step }
        times.add(pass.los.time)
        return times.map(look)
    }

    /** Magnetic heading from the sensors to true north; declination is positive when magnetic north is east of true north. */
    fun trueAzimuth(magnetic: Double, declination: Double) = PassGeometry.wrap(magnetic + declination)

    /**
     * Direction of the phone's top edge (+Y) from an Android rotation matrix (device to world, x east, y north, z up).
     * Works held upright or flat, with no axis remapping; azimuth is meaningless within a few degrees of the zenith.
     * Returns (magnetic azimuth 0..360, elevation -90..90).
     */
    fun topDirection(matrix: FloatArray): Pair<Double, Double> {
        require(matrix.size == 9) { "Matriz de rotacion invalida." }
        val east = matrix[1].toDouble()
        val north = matrix[4].toDouble()
        val up = matrix[7].toDouble().coerceIn(-1.0, 1.0)
        return Pair(PassGeometry.wrap(Math.toDegrees(atan2(east, north))), Math.toDegrees(asin(up)))
    }

    fun aim(deviceAzimuth: Double, deviceElevation: Double, target: SatelliteLook) = Aim(
        PassGeometry.turn(deviceAzimuth, target.azimuth),
        target.elevation.coerceIn(0.0, 90.0) - deviceElevation.coerceIn(-90.0, 90.0))

    fun instruction(aim: Aim, phrases: Phrases): String {
        if (aim.onTarget) return phrases.onTarget
        val parts = ArrayList<String>()
        val turn = aim.turn.roundToInt()
        val raise = aim.raise.roundToInt()
        if (turn != 0) parts.add((if (turn < 0) phrases.left else phrases.right)(abs(turn)))
        if (raise != 0) parts.add((if (raise > 0) phrases.up else phrases.down)(abs(raise)))
        return parts.joinToString(" · ")
    }

    /** Linear low-pass for elevation. */
    fun smoothLinear(previous: Double, next: Double, factor: Double) = previous + factor * (next - previous)
}
