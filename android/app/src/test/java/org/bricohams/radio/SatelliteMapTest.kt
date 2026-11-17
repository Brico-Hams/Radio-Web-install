package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.File

class SatelliteMapTest {
    @Test fun projectionFootprintAndAntimeridianSplit() {
        assertEquals(Pair(0f, 0f), WorldMap.project(-180.0, 90.0, 360f, 180f))
        assertEquals(Pair(180f, 90f), WorldMap.project(0.0, 0.0, 360f, 180f))
        assertEquals(Pair(360f, 180f), WorldMap.project(180.0, -90.0, 360f, 180f))
        val footprint = WorldMap.footprint(SubPoint(0.0, 0.0, 420.0))
        // ISS at 420 km sees about 20.4 degrees of arc to the horizon.
        assertEquals(20.4, footprint.maxOf { it.second }, 0.2)
        assertEquals(-20.4, footprint.minOf { it.second }, 0.2)
        assertEquals(20.4, footprint.maxOf { it.first }, 0.2)
        assertEquals(1, WorldMap.split(footprint).size)
        val wrapped = WorldMap.footprint(SubPoint(0.0, 179.0, 420.0))
        assertTrue(wrapped.all { it.first in -180.0..180.0 })
        assertTrue(WorldMap.split(wrapped).size >= 2)
        assertEquals(-170.0, WorldMap.normalize(190.0), 1e-9)
    }
    @Test fun subsolarPointFollowsSeasonsAndHour() {
        val june = WorldMap.subsolar(java.time.Instant.parse("2024-06-20T12:00:00Z").toEpochMilli())
        assertEquals(23.4, june.first, 0.3)
        assertEquals(0.0, june.second, 3.0)
        val december = WorldMap.subsolar(java.time.Instant.parse("2024-12-21T00:00:00Z").toEpochMilli())
        assertEquals(-23.4, december.first, 0.3)
        assertEquals(180.0, Math.abs(december.second), 3.0)
    }
    @Test fun nightPolygonIsClosedAndInRange() {
        val night = WorldMap.night(java.time.Instant.parse("2024-03-01T06:00:00Z").toEpochMilli())
        assertEquals(night.first(), night.last())
        assertTrue(night.all { it.second in -90.0..90.0 && it.first in -180.0..180.0 })
        val equinoxLike = WorldMap.night(java.time.Instant.parse("2024-03-20T03:06:00Z").toEpochMilli())
        assertTrue(equinoxLike.all { it.second in -90.0..90.0 })
    }
    @Test fun bundledNaturalEarthLandParses() {
        val land = WorldMap.parseLand(File("src/main/assets/world-land-110m.txt").readText())
        assertTrue(land.size > 100 && land.sumOf { it.size } > 4000)
        assertThrows(IllegalArgumentException::class.java) { WorldMap.parseLand("200,0 0,0") }
    }
}
