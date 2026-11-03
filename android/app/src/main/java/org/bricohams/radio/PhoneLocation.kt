package org.bricohams.radio

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.GnssStatus
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper

/** One position candidate, independent of the Android Location class so the selection logic is unit-testable. */
data class PositionFix(
    val source: String,
    val latitude: Double,
    val longitude: Double,
    val altitudeM: Double?,
    val accuracyM: Float?,
    val timeMs: Long
) {
    fun ageMs(now: Long) = (now - timeMs).coerceAtLeast(0)
}

/** Chooses the best fix among candidates (live updates and last-known positions of several providers). */
object LocationSelector {
    /** A fix newer than this is "live": accuracy decides. */
    const val FRESH_MS = 2 * 60_000L
    /** Satellite passes only need a few km, but a day-old position is not trusted. */
    const val STALE_MS = 24 * 3_600_000L

    fun best(candidates: List<PositionFix>, now: Long): PositionFix? {
        val usable = candidates.filter {
            it.ageMs(now) <= STALE_MS && it.latitude in -90.0..90.0 && it.longitude in -180.0..180.0 &&
                !(it.latitude == 0.0 && it.longitude == 0.0)
        }
        val fresh = usable.filter { it.ageMs(now) <= FRESH_MS }
        if (fresh.isNotEmpty()) return fresh.minByOrNull { it.accuracyM ?: Float.MAX_VALUE }
        return usable.maxByOrNull { it.timeMs }
    }
}

/** Search progress shown to the user: countdown, GNSS satellites and whether the network provider is useless. */
data class SearchProgress(val remainingMs: Long, val visibleSatellites: Int?, val usedSatellites: Int?, val networkHint: Boolean, val haveFix: Boolean)

/**
 * Pure timing/selection rules of one search (no Android types, clock injected): the first live fix of any provider is accepted,
 * then [REFINE_MS] more are allowed for a better accuracy; without any fix the search ends at [TIMEOUT_MS].
 */
class FixCollector(private val startMs: Long) {
    companion object {
        const val TIMEOUT_MS = 180_000L
        const val REFINE_MS = 10_000L
        /** Without a network fix after this long, the user is told to enable Google Location Accuracy / Wi-Fi scanning. */
        const val NETWORK_HINT_MS = 15_000L
        /** Good enough: no reason to keep refining. */
        const val GOOD_ACCURACY_M = 20f
    }
    private val live = ArrayList<PositionFix>()
    private val fallback = ArrayList<PositionFix>()
    private var firstFixMs: Long? = null
    private var networkSeen = false

    val haveLiveFix get() = firstFixMs != null

    fun addLastKnown(fix: PositionFix) { fallback.add(fix) }

    fun addLive(fix: PositionFix, now: Long) {
        live.add(fix)
        if (fix.source == "network") networkSeen = true
        if (firstFixMs == null) firstFixMs = now
    }

    fun deadlineMs(): Long = firstFixMs?.let { minOf(it + REFINE_MS, startMs + TIMEOUT_MS) } ?: (startMs + TIMEOUT_MS)

    fun finished(now: Long): Boolean {
        val bestAccuracy = live.mapNotNull { it.accuracyM }.minOrNull()
        return now >= deadlineMs() || (bestAccuracy != null && bestAccuracy <= GOOD_ACCURACY_M)
    }

    fun remainingMs(now: Long) = (deadlineMs() - now).coerceAtLeast(0)

    /** The network provider is unavailable or silent: hint to enable Google Location Accuracy / Wi-Fi scanning. */
    fun networkHint(now: Long, networkEnabled: Boolean) =
        !networkSeen && (!networkEnabled || now - startMs >= NETWORK_HINT_MS)

    /** Live fixes win; last-known positions are only a fallback when nothing live arrived. */
    fun result(now: Long): PositionFix? =
        LocationSelector.best(live, now) ?: LocationSelector.best(fallback, now)
}

/**
 * Phone position for the satellite module: asks every enabled provider (GPS, network, fused on API 31+) for a live update
 * for up to [TIMEOUT_MS] (cold GPS start), reports GNSS satellites and a countdown, and falls back to the last known position.
 * Approximate-only permission (Android 12+) is accepted.
 */
class PhoneLocation(
    private val context: Context,
    private val onProgress: (SearchProgress) -> Unit = {},
    private val onResult: (PositionFix?, Boolean) -> Unit
) {
    companion object {
        const val TIMEOUT_MS = FixCollector.TIMEOUT_MS
        private const val PREFS = "phone_location"

        fun saveLast(context: Context, fix: PositionFix) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString("source", fix.source).putString("lat", fix.latitude.toString()).putString("lon", fix.longitude.toString())
                .putString("alt", fix.altitudeM?.toString()).putString("acc", fix.accuracyM?.toString())
                .putLong("time", fix.timeMs).apply()
        }
        fun loadLast(context: Context): PositionFix? {
            val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val lat = p.getString("lat", null)?.toDoubleOrNull() ?: return null
            val lon = p.getString("lon", null)?.toDoubleOrNull() ?: return null
            return PositionFix(p.getString("source", "saved") ?: "saved", lat, lon, p.getString("alt", null)?.toDoubleOrNull(),
                p.getString("acc", null)?.toFloatOrNull(), p.getLong("time", 0L))
        }
        val PERMISSIONS = arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)

        fun hasPermission(context: Context): Boolean = PERMISSIONS.any {
            context.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED
        }
        fun precise(context: Context): Boolean =
            context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        fun servicesEnabled(context: Context): Boolean {
            val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            return providers(manager).any { manager.isProviderEnabled(it) }
        }
        private fun providers(manager: LocationManager): List<String> {
            val all = manager.allProviders
            return listOf(LocationManager.GPS_PROVIDER, "fused", LocationManager.NETWORK_PROVIDER)
                .filter { it in all && (it != "fused" || Build.VERSION.SDK_INT >= 31) }
        }
        fun toFix(location: Location) = PositionFix(
            location.provider ?: "?", location.latitude, location.longitude,
            if (location.hasAltitude()) location.altitude else null,
            if (location.hasAccuracy()) location.accuracy else null, location.time
        )
    }

    private val handler = Handler(Looper.getMainLooper())
    private val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    private var collector = FixCollector(0)
    private var active = false
    private var visible: Int? = null
    private var used: Int? = null
    private var networkEnabled = false
    private val listener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            val now = System.currentTimeMillis()
            collector.addLive(toFix(location), now)
            if (collector.finished(now)) finish(true) else publish()
        }
        @Deprecated("Platform callback") override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        override fun onProviderEnabled(provider: String) {}
        override fun onProviderDisabled(provider: String) {}
    }
    private val gnss = object : GnssStatus.Callback() {
        override fun onSatelliteStatusChanged(status: GnssStatus) {
            visible = status.satelliteCount
            used = (0 until status.satelliteCount).count { status.usedInFix(it) }
            publish()
        }
    }
    private val tick = object : Runnable {
        override fun run() {
            if (!active) return
            if (collector.finished(System.currentTimeMillis())) finish(true) else { publish(); handler.postDelayed(this, 1000L) }
        }
    }

    val running get() = active

    private fun publish() {
        val now = System.currentTimeMillis()
        onProgress(SearchProgress(collector.remainingMs(now), visible, used, collector.networkHint(now, networkEnabled), collector.haveLiveFix))
    }

    @SuppressLint("MissingPermission")
    fun start() {
        stop()
        if (!hasPermission(context)) { onResult(null, false); return }
        active = true
        visible = null; used = null
        collector = FixCollector(System.currentTimeMillis())
        val enabled = providers(manager).filter { manager.isProviderEnabled(it) }
        networkEnabled = LocationManager.NETWORK_PROVIDER in enabled
        for (provider in providers(manager)) {
            try { manager.getLastKnownLocation(provider)?.let { collector.addLastKnown(toFix(it)) } } catch (_: RuntimeException) { }
        }
        var requested = 0
        for (provider in enabled) {
            try {
                manager.requestLocationUpdates(provider, 1000L, 0f, listener, Looper.getMainLooper())
                requested++
            } catch (_: RuntimeException) { }
        }
        if (requested == 0) { finish(false); return }
        if (precise(context)) try { manager.registerGnssStatusCallback(gnss, handler) } catch (_: RuntimeException) { }
        publish()
        handler.postDelayed(tick, 1000L)
    }

    /** Ends the search now (Cancel button): the best fix collected so far, if any, is still delivered. */
    fun finishNow() { if (active) finish(true) }

    private fun finish(live: Boolean) {
        val fix = collector.result(System.currentTimeMillis())
        stop()
        onResult(fix, live)
    }

    /** Must be called from onPause: location updates never outlive the screen. */
    fun stop() {
        active = false
        handler.removeCallbacks(tick)
        try { manager.removeUpdates(listener) } catch (_: RuntimeException) { }
        try { manager.unregisterGnssStatusCallback(gnss) } catch (_: RuntimeException) { }
    }
}
