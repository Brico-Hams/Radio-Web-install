package org.bricohams.radio

import android.content.Context
import android.hardware.GeomagneticField
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.sqrt

/**
 * Phone used as calibration instrument: laid flat on the antenna boom with its top towards the elements it gives the
 * boom's true azimuth (magnetic heading + declination) and whether the boom is level. This replaces the separate
 * magnetometer/IMU boards of the expensive rotor build.
 */
class RotorCompass(context: Context, private val listener: (Reading) -> Unit) : SensorEventListener {
    data class Reading(val trueAzimuth: Double, val pitch: Double, val roll: Double, val accuracy: Int) {
        val level get() = RotorCompass.level(pitch, roll)
    }

    private val sensors = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val rotation = sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
    // Fallback for phones without a fused rotation vector.
    private val accelerometer = if (rotation == null) sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) else null
    private val magnetometer = if (rotation == null) sensors.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) else null
    private val matrix = FloatArray(9)
    private val angles = FloatArray(3)
    private val gravity = FloatArray(3)
    private val field = FloatArray(3)
    private var haveGravity = false
    private var haveField = false
    private var accuracy = SensorManager.SENSOR_STATUS_UNRELIABLE
    var declination = 0.0
        private set

    val available get() = rotation != null || (accelerometer != null && magnetometer != null)

    fun start(observer: ObserverPosition?) {
        declination = observer?.let {
            GeomagneticField(it.latitude.toFloat(), it.longitude.toFloat(), (it.heightKm * 1000).toFloat(), System.currentTimeMillis())
                .declination.toDouble()
        } ?: 0.0
        haveGravity = false; haveField = false
        rotation?.let { sensors.registerListener(this, it, SensorManager.SENSOR_DELAY_UI) }
        accelerometer?.let { sensors.registerListener(this, it, SensorManager.SENSOR_DELAY_UI) }
        magnetometer?.let { sensors.registerListener(this, it, SensorManager.SENSOR_DELAY_UI) }
    }
    fun stop() = sensors.unregisterListener(this)

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) { this.accuracy = accuracy }
    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> { smooth(gravity, event.values, haveGravity); haveGravity = true }
            Sensor.TYPE_MAGNETIC_FIELD -> { smooth(field, event.values, haveField); haveField = true }
            else -> SensorManager.getRotationMatrixFromVector(matrix, event.values)
        }
        if (event.sensor.type != Sensor.TYPE_ROTATION_VECTOR &&
            !(haveGravity && haveField && SensorManager.getRotationMatrix(matrix, null, gravity, field))) return
        SensorManager.getOrientation(matrix, angles)
        listener(Reading(RotorPlanner.wrap(Math.toDegrees(angles[0].toDouble()) + declination),
            Math.toDegrees(angles[1].toDouble()), Math.toDegrees(angles[2].toDouble()), accuracy))
    }
    private fun smooth(target: FloatArray, values: FloatArray, filter: Boolean) {
        for (i in 0..2) target[i] = if (filter) target[i] + 0.15f * (values[i] - target[i]) else values[i]
    }

    companion object {
        fun supported(context: Context): Boolean {
            val manager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
            return manager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR) != null ||
                (manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null && manager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) != null)
        }
        const val LEVEL_TOLERANCE = 1.0
        fun level(pitch: Double, roll: Double) = abs(pitch) <= LEVEL_TOLERANCE && abs(roll) <= LEVEL_TOLERANCE

        /** Mean of headings on the circle, so readings around north (359°, 1°) average to 0°, not 180°. */
        fun circularMean(values: List<Double>): Double? {
            if (values.isEmpty()) return null
            var x = 0.0; var y = 0.0
            values.forEach { x += Math.cos(Math.toRadians(it)); y += Math.sin(Math.toRadians(it)) }
            if (sqrt(x * x + y * y) < 1e-9) return null
            return RotorPlanner.wrap(Math.toDegrees(atan2(y, x)))
        }
    }
}
