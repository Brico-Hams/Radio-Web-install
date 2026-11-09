package org.bricohams.radio

import android.content.Context
import android.hardware.GeomagneticField
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager

/**
 * Where the top edge of the phone points (true azimuth, elevation). Uses the rotation vector, then the geomagnetic one,
 * then accelerometer + magnetometer. Registered only between [start] and [stop]; callers tie those to the lifecycle.
 */
class PointingSensor(context: Context, private val listener: (Reading) -> Unit) : SensorEventListener {
    data class Reading(val trueAzimuth: Double, val elevation: Double, val accuracy: Int)

    private val manager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val fused = manager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
        ?: manager.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR)
    private val accelerometer = if (fused == null) manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) else null
    private val magnetometer = if (fused == null) manager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) else null
    private val matrix = FloatArray(9)
    private val gravity = FloatArray(3)
    private val field = FloatArray(3)
    private var haveGravity = false
    private var haveField = false
    private var accuracy = SensorManager.SENSOR_STATUS_UNRELIABLE
    var declination = 0.0
        private set

    val available get() = fused != null || (accelerometer != null && magnetometer != null)

    fun start(observer: ObserverPosition?, time: Long = System.currentTimeMillis()) {
        declination = observer?.let {
            GeomagneticField(it.latitude.toFloat(), it.longitude.toFloat(), (it.heightKm * 1000).toFloat(), time).declination.toDouble()
        } ?: 0.0
        haveGravity = false; haveField = false
        accuracy = SensorManager.SENSOR_STATUS_UNRELIABLE
        fused?.let { manager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI) }
        accelerometer?.let { manager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI) }
        magnetometer?.let { manager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI) }
    }
    fun stop() = manager.unregisterListener(this)

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {
        // Only the sensor that defines the heading drives the calibration hint.
        if (sensor.type != Sensor.TYPE_ACCELEROMETER) this.accuracy = accuracy
    }
    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> { lowPass(gravity, event.values, haveGravity); haveGravity = true }
            Sensor.TYPE_MAGNETIC_FIELD -> { lowPass(field, event.values, haveField); haveField = true }
            else -> SensorManager.getRotationMatrixFromVector(matrix, event.values)
        }
        val raw = event.sensor.type == Sensor.TYPE_ACCELEROMETER || event.sensor.type == Sensor.TYPE_MAGNETIC_FIELD
        if (raw && !(haveGravity && haveField && SensorManager.getRotationMatrix(matrix, null, gravity, field))) return
        val (azimuth, elevation) = PassPointing.topDirection(matrix)
        listener(Reading(PassPointing.trueAzimuth(azimuth, declination), elevation, accuracy))
    }
    private fun lowPass(target: FloatArray, values: FloatArray, filter: Boolean) {
        for (i in 0..2) target[i] = if (filter) target[i] + 0.15f * (values[i] - target[i]) else values[i]
    }

    companion object {
        fun supported(context: Context): Boolean {
            val manager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
            return manager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR) != null ||
                manager.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR) != null ||
                (manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null && manager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) != null)
        }
    }
}
