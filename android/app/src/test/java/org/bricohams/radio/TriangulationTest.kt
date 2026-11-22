package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.ByteArrayInputStream
import java.time.Instant
import javax.xml.parsers.DocumentBuilderFactory

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class TriangulationTest {
    private val now = Instant.parse("2026-11-14T10:00:00Z")
    private val targetLat = 45.02
    private val targetLon = 10.04

    /** An observer who points exactly at the target (great-circle bearing), optionally off by [error] degrees. */
    private fun at(call: String, lat: Double, lon: Double, error: Double = 0.0, uncertainty: Double = 10.0,
        id: String = call, strength: Double? = null): BearingObservation {
        val bearing = Triangulation.rangeBearing(lat, lon, targetLat, targetLon).bearingDeg
        return BearingObservation(id = id, callsign = call, latitude = lat, longitude = lon,
            bearingTrueDeg = (bearing + error + 360.0) % 360.0, uncertaintyDeg = uncertainty, strength = strength, utc = now).validated()
    }
    private fun errorKm(result: TriangulationResult) =
        Triangulation.rangeBearing(targetLat, targetLon, result.latitude!!, result.longitude!!).distanceKm

    private val a get() = at("EA1AAA", 44.80, 10.04)
    private val b get() = at("EA1BBB", 45.02, 9.74)
    private val c get() = at("EA1CCC", 45.25, 10.30)

    @Test fun twoBearingsIntersectAtTheTargetAndGiveItsLocator() {
        val result = Triangulation.estimate(listOf(a, b))
        assertTrue(result.hasEstimate)
        assertEquals(0.0, errorKm(result), 0.3)
        assertEquals("JN55aa", result.locator)
        assertEquals(Maidenhead.fromLatLon(targetLat, targetLon), result.locator)
        assertTrue(result.radius95M > 0.0 && result.semiMajorM >= result.semiMinorM)
        assertTrue(result.warnings.isEmpty())
    }

    @Test fun threeBearingsWithSmallNoiseStayNearTheTargetAndShrinkNothingBelowZero() {
        val result = Triangulation.estimate(listOf(a, b, c))
        assertEquals(0.0, errorKm(result), 0.3)
        assertEquals(3, result.used)
        val noisy = Triangulation.estimate(listOf(a, at("EA1BBB", 45.02, 9.74, error = 2.0), at("EA1CCC", 45.25, 10.30, error = -2.0)))
        assertTrue(errorKm(noisy) < 3.0)
    }

    @Test fun parallelAndReciprocalBearingsAreRejectedWithAWarning() {
        val north = a
        val parallel = north.copy(id = "p", callsign = "EA1PAR", latitude = 44.70)
        val rejected = Triangulation.estimate(listOf(north, parallel))
        assertFalse(rejected.hasEstimate)
        assertEquals(TriangulationWarningKind.NEAR_PARALLEL, rejected.warnings.single().kind)
        val nearly = Triangulation.estimate(listOf(north, parallel.copy(bearingTrueDeg = 5.0)))
        assertFalse(nearly.hasEstimate)
        val reciprocal = Triangulation.estimate(listOf(north, parallel.copy(bearingTrueDeg = (north.bearingTrueDeg + 180.0) % 360.0)))
        assertFalse(reciprocal.hasEstimate)
        assertEquals(10.0, Triangulation.crossingAngle(0.0, 10.0), 1e-9)
        assertEquals(TriangulationWarningKind.TOO_FEW, Triangulation.estimate(listOf(north)).warnings.single().kind)
    }

    @Test fun oneNearParallelPairOnlyWarnsWhenOtherBearingsCross() {
        val twin = a.copy(id = "twin", callsign = "EA1TWN", latitude = 44.75)
        val result = Triangulation.estimate(listOf(a, twin, b))
        assertTrue(result.hasEstimate)
        assertTrue(result.warnings.any { it.kind == TriangulationWarningKind.NEAR_PARALLEL_PAIR })
    }

    @Test fun bearingUncertaintyWeighsTheLeastSquaresFit() {
        val wild = 20.0
        val trusted = Triangulation.estimate(listOf(a, b, at("EA1CCC", 45.25, 10.30, error = wild, uncertainty = 2.0)))
        val doubted = Triangulation.estimate(listOf(a, b, at("EA1CCC", 45.25, 10.30, error = wild, uncertainty = 30.0)))
        assertTrue(errorKm(doubted) < errorKm(trusted))
    }

    @Test fun largerUncertaintyGivesALargerConfidenceRadius() {
        val tight = Triangulation.estimate(listOf(at("A", 44.80, 10.04, uncertainty = 2.0), at("B", 45.02, 9.74, uncertainty = 2.0)))
        val loose = Triangulation.estimate(listOf(at("A", 44.80, 10.04, uncertainty = 20.0), at("B", 45.02, 9.74, uncertainty = 20.0)))
        assertTrue(loose.radius95M > tight.radius95M * 5)
    }

    @Test fun estimateBehindAnObserverIsFlagged() {
        val result = Triangulation.estimate(listOf(a, b.copy(bearingTrueDeg = (b.bearingTrueDeg + 180.0) % 360.0),
            c))
        assertTrue(result.warnings.any { it.kind == TriangulationWarningKind.BEHIND_OBSERVER } || !result.hasEstimate)
    }

    @Test fun signalHintRanksStrongestFirstUsingIaruSUnits() {
        val weak = at("EA1WEA", 44.80, 10.04, strength = 3.0)
        val strong = at("EA1STR", 45.02, 9.74, strength = 7.0)
        val none = c
        val ranking = Triangulation.signalRanking(listOf(weak, none, strong))
        assertEquals(listOf("EA1STR", "EA1WEA"), ranking.map { it.observation.callsign })
        assertEquals(-93.0 - 12.0, ranking.first().dbm, 1e-9)
        assertEquals(-73.0, weak.copy(strength = 9.0, frequencyMhz = 14.2).strengthDbm()!!, 1e-9)
        assertEquals(-90.0, weak.copy(strength = -90.0, strengthUnit = StrengthUnit.DBM).strengthDbm()!!, 1e-9)
    }

    @Test fun importMergesAndDeduplicatesById() {
        val mine = HuntSession(id = "h", name = "Fox", observations = listOf(a, b))
        val theirs = HuntSession(id = "h", name = "Other name", observations = listOf(b.copy(notes = "changed"), c))
        val merged = mine.merge(theirs)
        assertEquals(1, merged.added)
        assertEquals(1, merged.duplicates)
        assertEquals(setOf("EA1AAA", "EA1BBB", "EA1CCC"), merged.session.observations.map { it.id }.toSet())
        assertEquals("", merged.session.observations.single { it.id == "EA1BBB" }.notes)
        assertEquals("Fox", merged.session.name)
        assertEquals(0, merged.session.merge(theirs).added)
    }

    @Test fun jsonRoundTripsAndAcceptsTextAroundIt() {
        val session = HuntSession(id = "h1", name = "Hunt", frequencyMhz = 145.5,
            observations = listOf(a.copy(notes = "near \"the\" church", strength = -90.0, strengthUnit = StrengthUnit.DBM, frequencyMhz = 145.5), b))
        val json = HuntCodec.encode(session)
        assertEquals(session.copy(observations = session.observations.sortedBy { it.id }), HuntCodec.decode(json).let { it.copy(observations = it.observations.sortedBy { o -> o.id }) })
        assertEquals(2, HuntCodec.decode("Hola, mis rumbos:\n$json\n73").observations.size)
        assertThrows(LocalizedArgumentException::class.java) { HuntCodec.decode("{\"format\":\"other\"}") }
        assertThrows(LocalizedArgumentException::class.java) { HuntCodec.decode(json.replace("\"b\":", "\"b\":9999,\"x\":")) }
    }

    @Test fun gpxIsWellFormedGpx11WithObserversAndEstimate() {
        val session = HuntSession(id = "h", name = "Fox & <Co>", observations = listOf(a.copy(notes = "A<B & \"C\""), b))
        val result = Triangulation.estimate(session.observations)
        val gpx = HuntCodec.gpx(session, result, now)
        val document = DocumentBuilderFactory.newInstance().apply { isNamespaceAware = true }
            .newDocumentBuilder().parse(ByteArrayInputStream(gpx.toByteArray(Charsets.UTF_8)))
        val root = document.documentElement
        assertEquals("gpx", root.localName)
        assertEquals("1.1", root.getAttribute("version"))
        assertEquals("http://www.topografix.com/GPX/1/1", root.namespaceURI)
        val waypoints = document.getElementsByTagNameNS("http://www.topografix.com/GPX/1/1", "wpt")
        assertEquals(3, waypoints.length)
        for (i in 0 until waypoints.length) {
            val element = waypoints.item(i) as org.w3c.dom.Element
            assertTrue(element.getAttribute("lat").toDouble() in -90.0..90.0)
            assertTrue(element.getAttribute("lon").toDouble() in -180.0..180.0)
        }
        assertEquals(2, HuntCodec.gpx(session, null, now).split("<wpt ").size - 1)
    }

    @Test fun csvQuotesFieldsAndNeutralisesFormulas() {
        val csv = HuntCodec.csv(HuntSession(id = "h", name = "x", observations = listOf(a.copy(notes = "=1+1, \"hi\""))))
        val lines = csv.trim().lines()
        assertEquals(2, lines.size)
        assertTrue(lines[1].endsWith("\"'=1+1, \"\"hi\"\"\""))
    }
}
