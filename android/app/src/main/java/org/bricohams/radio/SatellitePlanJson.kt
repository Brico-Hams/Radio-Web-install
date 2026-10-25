package org.bricohams.radio

import org.json.JSONObject
import org.json.JSONException

object SatellitePlanJson {
    fun encode(plan: SatellitePlan): String = JSONObject().apply {
        put("name", plan.tle.name); put("line1", plan.tle.line1); put("line2", plan.tle.line2)
        put("latitude", plan.observer.latitude); put("longitude", plan.observer.longitude); put("heightKm", plan.observer.heightKm)
        put("downlinkHz", plan.downlinkHz)
        fun point(value: SatelliteLook) = JSONObject().apply {
            put("time", value.time); put("azimuth", value.azimuth); put("elevation", value.elevation); put("rangeKm", value.rangeKm)
        }
        put("aos", point(plan.pass.aos)); put("maximum", point(plan.pass.maximum)); put("los", point(plan.pass.los))
        put("partialStart", plan.pass.partialStart); put("partialEnd", plan.pass.partialEnd)
    }.toString()
    fun decode(text: String): SatellitePlan {
        require(text.length <= 8192) { "Plan CAT demasiado largo." }
        try {
            val json = JSONObject(text)
            val tle = Tle(json.getString("name"), json.getString("line1"), json.getString("line2")).validated()
            val observer = ObserverPosition(json.getDouble("latitude"), json.getDouble("longitude"), json.getDouble("heightKm")).validated()
            fun point(name: String): SatelliteLook {
                val value = json.getJSONObject(name)
                return SatelliteLook(value.getLong("time"), value.getDouble("azimuth"), value.getDouble("elevation"),
                    value.getDouble("rangeKm")).also {
                    require(it.time in 0..4102444800000L && it.azimuth.isFinite() && it.azimuth in 0.0..360.0 &&
                        it.elevation.isFinite() && it.elevation in -90.0..90.0 && it.rangeKm.isFinite() && it.rangeKm > 0) {
                        "Geometria del plan CAT no valida."
                    }
                }
            }
            val pass = SatellitePass(point("aos"), point("maximum"), point("los"),
                json.getBoolean("partialStart"), json.getBoolean("partialEnd"))
            val frequency = json.getLong("downlinkHz")
            require(frequency % 10 == 0L && CatProtocol.inBand(frequency / 10) && pass.los.time > pass.aos.time &&
                pass.los.time - pass.aos.time <= 2 * 3600000L && pass.maximum.time in pass.aos.time..pass.los.time) { "Intervalo o frecuencia de plan CAT invalido." }
            return SatellitePlan(tle, observer, frequency, pass)
        } catch (error: JSONException) {
            throw IllegalArgumentException("Plan CAT incompleto: ${error.message}", error)
        }
    }
}
