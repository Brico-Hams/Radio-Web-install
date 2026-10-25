package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.time.Instant

class ArdfStatisticsTest {
    private val start = Instant.parse("2026-10-25T12:00:00Z")
    private fun observation(id: String, seconds: Long, fox: Int = 1, longitude: Double? = null,
        accuracy: Double = 5.0, age: Long = 0) = ArdfObservation(id, fox, start.plusSeconds(seconds), "",
        longitude?.let { Fix(0.0, it, accuracy, start.plusSeconds(seconds - age)) })

    @Test fun emptyAndSingleObservationHaveNoInventedIntervalsOrDistance() {
        val empty = ArdfStatistics.calculate(emptyList())
        assertEquals(0, empty.count); assertEquals(0.0, empty.spanSeconds, 0.0)
        assertEquals(0, empty.distanceSegments); assertTrue(empty.beacons.isEmpty())
        val single = ArdfStatistics.calculate(listOf(observation("a", 0)))
        assertNull(single.beacons.single().meanIntervalSeconds)
        assertEquals(0, single.located)
    }
    @Test fun sortsByInstantAndComputesIntervalsPerBeaconNotAcrossBeacons() {
        val summary = ArdfStatistics.calculate(listOf(observation("c", 90), observation("b", 20, 2), observation("a", 0)))
        assertEquals(90.0, summary.spanSeconds, 0.0)
        assertEquals(listOf(1, 2), summary.beacons.map { it.fox })
        assertEquals(90.0, summary.beacons.first().meanIntervalSeconds!!, 0.0)
        assertNull(summary.beacons.last().meanIntervalSeconds)
    }
    @Test fun distanceUsesKnownGreatCircleLengthAndCrossesDateLine() {
        val summary = ArdfStatistics.calculate(listOf(observation("a", 0, longitude = 179.999),
            observation("b", 60, longitude = -179.999)))
        assertEquals(222.39016, summary.distanceMeters, 0.01)
        assertEquals(1, summary.distanceSegments)
        assertEquals(2, summary.located)
    }
    @Test fun missingInaccurateStaleFutureAndLongGapPositionsNeverBridge() {
        for (middle in listOf(observation("b", 60), observation("b", 60, longitude = 0.001, accuracy = 51.0),
            observation("b", 60, longitude = 0.001, age = 31), observation("b", 60, longitude = 0.001, age = -1))) {
            val summary = ArdfStatistics.calculate(listOf(observation("a", 0, longitude = 0.0),
                middle, observation("c", 120, longitude = 0.002)))
            assertEquals(0, summary.distanceSegments)
            assertEquals(0.0, summary.distanceMeters, 0.0)
        }
        val gap = ArdfStatistics.calculate(listOf(observation("a", 0, longitude = 0.0),
            observation("b", 121, longitude = 0.001)))
        assertEquals(0, gap.distanceSegments)
    }
    @Test fun repeatedFixAndSameTimestampDoNotInventMovement() {
        val a = observation("a", 0, longitude = 0.0)
        val b = observation("b", 10, longitude = 0.001).copy(fix = a.fix)
        assertEquals(0, ArdfStatistics.calculate(listOf(a, b)).distanceSegments)
        assertEquals(0, ArdfStatistics.calculate(listOf(a, observation("c", 0, longitude = 0.001))).distanceSegments)
    }
    @Test fun rejectsDuplicateIdsInvalidBeaconAndInvalidCoordinates() {
        val a = observation("a", 0)
        assertThrows(IllegalArgumentException::class.java) { ArdfStatistics.calculate(listOf(a, a)) }
        assertThrows(IllegalArgumentException::class.java) { ArdfStatistics.calculate(listOf(a.copy(fox = 11))) }
        assertThrows(IllegalArgumentException::class.java) {
            ArdfStatistics.calculate(listOf(a.copy(fix = Fix(91.0, 0.0, 5.0, start))))
        }
    }
}
