package org.bricohams.radio

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
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

/**
 * Phone position for the satellite module: asks every enabled provider (GPS, network, fused on API 31+) for a live update,
 * falls back to the last known position, and gives up after [TIMEOUT_MS]. Approximate-only permission (Android 12+) is accepted.
 */
class PhoneLocation(private val context: Context, private val onResult: (PositionFix?, Boolean) -> Unit) {
    companion object {
        const val TIMEOUT_MS = 25_000L
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
    private val candidates = ArrayList<PositionFix>()
    private var active = false
    private val listener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            candidates.add(toFix(location))
            // A precise GPS fix ends the wait early; slower providers keep contributing until then.
            val fix = LocationSelector.best(candidates, System.currentTimeMillis())
            if (fix != null && fix.source == LocationManager.GPS_PROVIDER && (fix.accuracyM ?: 1e9f) <= 100f) finish(true)
        }
        @Deprecated("Platform callback") override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        override fun onProviderEnabled(provider: String) {}
        override fun onProviderDisabled(provider: String) {}
    }
    private val timeout = Runnable { finish(true) }

    val running get() = active

    @SuppressLint("MissingPermission")
    fun start() {
        stop()
        if (!hasPermission(context)) { onResult(null, false); return }
        active = true
        candidates.clear()
        val enabled = providers(manager).filter { manager.isProviderEnabled(it) }
        for (provider in providers(manager)) {
            try { manager.getLastKnownLocation(provider)?.let { candidates.add(toFix(it)) } } catch (_: RuntimeException) { }
        }
        var requested = 0
        for (provider in enabled) {
            try {
                manager.requestLocationUpdates(provider, 1000L, 0f, listener, Looper.getMainLooper())
                requested++
            } catch (_: RuntimeException) { }
        }
        if (requested == 0) { finish(false); return }
        handler.postDelayed(timeout, TIMEOUT_MS)
    }

    private fun finish(live: Boolean) {
        val fix = LocationSelector.best(candidates, System.currentTimeMillis())
        stop()
        onResult(fix, live)
    }

    /** Must be called from onPause: location updates never outlive the screen. */
    fun stop() {
        active = false
        handler.removeCallbacks(timeout)
        try { manager.removeUpdates(listener) } catch (_: RuntimeException) { }
    }
}
