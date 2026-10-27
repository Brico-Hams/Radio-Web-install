package org.bricohams.radio

import java.time.Duration
import java.time.Instant
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

data class ArdfObservation(val id: String, val fox: Int, val utc: Instant, val notes: String, val fix: Fix?)
data class BeaconStatistics(val fox: Int, val count: Int, val first: Instant, val last: Instant,
    val located: Int, val meanIntervalSeconds: Double?)
data class ArdfSummary(val count: Int, val spanSeconds: Double, val located: Int,
    val distanceMeters: Double, val distanceSegments: Int, val beacons: List<BeaconStatistics>)

object ArdfStatistics {
    fun calculate(observations: List<ArdfObservation>): ArdfSummary {
        observations.forEach {
            requireUi(it.fox in 1..10) { UiText(R.string.err_ardf_fox_range) }
            it.fix?.validated()
        }
        requireUi(observations.map { it.id }.distinct().size == observations.size) { UiText(R.string.err_ardf_duplicate_observations) }
        val ordered = observations.sortedWith(compareBy<ArdfObservation> { it.utc }.thenBy { it.id })
        fun seconds(first: Instant, last: Instant) = Duration.between(first, last).toMillis() / 1000.0
        fun usable(observation: ArdfObservation): Boolean {
            val fix = observation.fix ?: return false
            val age = seconds(fix.utc, observation.utc)
            return fix.accuracyMeters <= 50 && age in 0.0..30.0
        }
        var distance = 0.0
        var segments = 0
        for ((previous, current) in ordered.zipWithNext()) {
            if (!usable(previous) || !usable(current)) continue
            val first = checkNotNull(previous.fix)
            val last = checkNotNull(current.fix)
            if (seconds(previous.utc, current.utc) !in 0.001..120.0 ||
                seconds(first.utc, last.utc) !in 0.001..120.0) continue
            val latitude = Math.toRadians(last.latitude - first.latitude)
            val longitude = Math.toRadians(last.longitude - first.longitude)
            val haversine = sin(latitude / 2) * sin(latitude / 2) +
                cos(Math.toRadians(first.latitude)) * cos(Math.toRadians(last.latitude)) *
                sin(longitude / 2) * sin(longitude / 2)
            distance += 6371008.8 * 2 * asin(sqrt(haversine.coerceIn(0.0, 1.0)))
            segments++
        }
        val beacons = ordered.groupBy { it.fox }.toSortedMap().map { (fox, entries) ->
            val first = entries.first().utc
            val last = entries.last().utc
            BeaconStatistics(fox, entries.size, first, last, entries.count { it.fix != null },
                if (entries.size > 1) seconds(first, last) / (entries.size - 1) else null)
        }
        return ArdfSummary(ordered.size,
            if (ordered.size > 1) seconds(ordered.first().utc, ordered.last().utc) else 0.0,
            ordered.count { it.fix != null }, distance, segments, beacons)
    }
}
