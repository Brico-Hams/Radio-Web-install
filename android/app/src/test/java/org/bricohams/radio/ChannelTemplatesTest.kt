package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class ChannelTemplatesTest {
    // The same shared datasets the Gradle sync task bundles; never a copy.
    private val directory = File("../../data/channel-templates")
    private fun text(name: String) = File(directory, name).readText()
    private val profiles = ChannelTemplates.profiles(text("profiles.json")).associateBy { it.id }
    private fun spain() = ChannelTemplates.dataset(ChannelTemplates.countries.first { it.code == "ES" }, text("ES.json"), text("ES-airports.json"))
    private fun airport(frequency: String = "118.30000", transmit: String = frequency) = ChannelTemplates.Channel("ourairports:1", "LEXX TWR", frequency,
        transmit, "AM", false, "ES-A", "", "LEXX", "https://ourairports.com/airports/LEXX/", "", "ES", "", "", "")

    @Test fun everyCountryLoadsWithRepeatersAirportsAndRegionBoundIdentifiers() {
        for (country in ChannelTemplates.countries) {
            val data = ChannelTemplates.dataset(country, text("${country.code}.json"), text("${country.code}-airports.json"))
            val regions = data.regions.map { it.id }.toSet()
            assertTrue(country.code, data.airports.isNotEmpty() && data.airports.all { it.regionId in regions && it.modulation == "AM" })
            assertTrue(data.airports.all { it.source.startsWith("https://ourairports.com/airports/") && it.license == "Public Domain" })
        }
    }

    @Test fun zoneJoinsRepeatersAndAirportsAndPmrIsLastAndNeverUs() {
        val data = spain()
        val region = data.airports.first().regionId
        val selected = ChannelTemplates.select(data, region, true, true)
        assertTrue(selected.take(16).none { it.key.startsWith("pmr446:") } || selected.size == 16)
        assertEquals((1..16).map { "pmr446:$it" }, selected.takeLast(16).map { it.key })
        assertTrue(selected.any { it.key.startsWith("ourairports:") } && selected.any { it.key.startsWith("hearham:") } || data.channels.none { it.regionId == region })
        val us = ChannelTemplates.dataset(ChannelTemplates.countries.first { it.code == "US" }, text("US.json"), null)
        assertTrue(ChannelTemplates.select(us, "", false, true).none { it.key.startsWith("pmr446:") })
    }

    @Test fun profilesOmitAndCountWhatTheModelCannotRepresent() {
        val fm = ChannelTemplates.pmrChannels().first().copy(rx = "145.60000", tx = "145.00000")
        val all = listOf(fm, airport(), airport("118.30000", "118.40000"), fm.copy(modulation = "DMR"), fm.copy(rx = "28.00000", tx = "28.00000"))
        val d878 = ChannelTemplates.prepare(profiles.getValue("d878"), all)
        assertEquals(listOf(fm), d878.accepted)
        assertEquals(mapOf("modulation:AM" to 2, "modulation:DMR" to 1, "band" to 1), d878.reasons)
        assertEquals(2, ChannelTemplates.prepare(profiles.getValue("rt950pro"), all).accepted.size)
        assertEquals(2, ChannelTemplates.prepare(profiles.getValue("uvk5v3"), all).accepted.size)
        assertEquals(2, ChannelTemplates.prepare(profiles.getValue("ftx1"), all).accepted.size)
    }

    @Test fun exportsAreReferenceCsvOrExistingFormatsAndNeverWriteScripts() {
        val fm = ChannelTemplates.pmrChannels().first()
        assertTrue(ChannelTemplates.export(profiles.getValue("uvk5v3"), listOf(airport(), fm)).content.contains("\"AM\""))
        assertTrue(ChannelTemplates.export(profiles.getValue("rt950pro"), listOf(fm.copy(name = "=cmd"))).content.contains("\"'=cmd\""))
        val project = org.json.JSONObject(ChannelTemplates.export(profiles.getValue("d878"), listOf(airport(), fm)).content)
        assertEquals(1, project.getJSONArray("channels").length())
        assertEquals("FM", project.getJSONArray("channels").getJSONObject(0).getString("mode"))
        assertFalse(project.getBoolean("airband"))
        assertThrows(IllegalArgumentException::class.java) { ChannelTemplates.export(profiles.getValue("d878"), listOf(airport())) }
    }

    private fun repeater(region: String, n: Int) = ChannelTemplates.Channel("hearham:$region:$n", "$region$n", "145.60000", "145.00000", "FM", false,
        region, "", "", "", "", "ES", "", "", "", "Region $region")
    private fun region(id: String, repeaters: Int, airports: Int = 0) = (0 until repeaters).map { repeater(id, it) } +
        (0 until airports).map { airport().copy(key = "ourairports:$id:$it", regionId = id, region = "Region $id") }
    private fun pmr() = ChannelTemplates.pmrChannels().map { it.copy(country = "ES") }

    @Test fun regionFilterKeepsRepeatersAndAirportsOfThatRegionOnly() {
        val data = spain()
        val id = data.regions.map { it.id }.first { region -> data.channels.any { it.regionId == region } && data.airports.any { it.regionId == region } }
        val selected = ChannelTemplates.select(data, id, true, false)
        assertTrue(selected.all { it.regionId == id })
        assertTrue(selected.any { it.key.startsWith("hearham:") } && selected.any { it.key.startsWith("ourairports:") })
        assertEquals(data.channels.count { it.regionId == id } + data.airports.count { it.regionId == id }, selected.size)
        assertTrue(selected.filter { it.key.startsWith("ourairports:") }.all { it.region == data.regions.first { region -> region.id == id }.name })
    }

    @Test fun planKeepsRegionsTogetherInOrderWithPmrLast() {
        val plan = ChannelTemplates.zonePlan(profiles.getValue("rt950pro"), region("ES-A", 3, 2) + region("ES-B", 2, 1) + region("ES-C", 1) + pmr())
        assertEquals(listOf("Region ES-A - Region ES-C", "PMR446"), plan.zones.map { it.name })
        assertEquals(listOf(1, 9), plan.zones.map { it.index })
        assertEquals(listOf("Region ES-A", "Region ES-B", "PMR446"),
            ChannelTemplates.zonePlan(profiles.getValue("radicodex"), region("ES-A", 3, 2) + region("ES-B", 2, 1) + pmr()).zones.map { it.name })
        assertEquals(listOf("ES-A", "ES-B", "ES-C"), plan.zones[0].regionIds)
        assertEquals(listOf("hearham", "hearham", "hearham", "ourairports", "ourairports"), plan.zones[0].channels.take(5).map { it.key.substringBefore(":") })
        assertEquals(9, plan.zones[0].channels.last().slot)
    }

    @Test fun rt950ProStopsAtChannel896ForEveryVariantAndPmrTakesTheLastZoneWithRoom() {
        val rt = profiles.getValue("rt950pro")
        val many = (0 until 12).flatMap { region("R$it", 90) } + pmr()
        val plan = ChannelTemplates.zonePlan(rt, many)
        assertEquals((1..9).toList(), plan.zones.map { it.index })
        assertEquals("PMR446", plan.zones[8].name)
        assertEquals(360, plan.reasons["capacity"])
        assertTrue(plan.zones.all { it.channels.size <= 99 })
        val tight = (0 until 10).flatMap { region("T$it", 99) }
        for (confirmed in listOf(false, true)) {
            val locked = ChannelTemplates.zonePlan(rt, tight, variantConfirmed = confirmed)
            assertEquals(5, locked.zones[9].channels.maxOf { it.slot })
            assertEquals(94, locked.reasons["capacity"])
        }
        val csv = ChannelTemplates.export(rt, tight).content
        assertTrue(csv.lines().first().endsWith("\"Zone\",\"Slot\",\"Channel_Number\""))
        assertTrue(csv.contains("\"896\"") && !csv.contains("\"897\""))
    }

    @Test fun regionLargerThanOneZoneIsSplit() {
        val plan = ChannelTemplates.zonePlan(profiles.getValue("rt950pro"), region("BIG", 250))
        assertEquals(listOf("Region BIG 1/3" to 99, "Region BIG 2/3" to 99, "Region BIG 3/3" to 52), plan.zones.map { it.name to it.channels.size })
    }

    @Test fun exportsKeepAirportsAmRxOnlyAndD878OmitsThem() {
        val channels = region("ES-A", 2, 2) + pmr()
        for (id in listOf("rt950pro", "uvk5v3", "ftx1", "radicodex")) {
            val result = ChannelTemplates.export(profiles.getValue(id), channels)
            val airports = result.plan.accepted.filter { it.key.startsWith("ourairports:") }
            assertEquals(id, 2, airports.size)
            assertTrue(id, airports.all { it.modulation == "AM" && it.tx == it.rx })
            assertTrue(id, result.content.contains("\"AM\""))
            assertEquals("PMR446", result.plan.zones.last().name)
        }
        assertTrue(ChannelTemplates.export(profiles.getValue("ftx1"), channels).content.lines().first().endsWith("\"Memory\",\"Zone\""))
        val d878 = ChannelTemplates.export(profiles.getValue("d878"), channels)
        assertEquals(2, d878.plan.reasons["modulation:AM"])
        val items = org.json.JSONObject(d878.content).getJSONArray("channels")
        assertTrue((0 until items.length()).all { items.getJSONObject(it).getString("mode") == "FM" && items.getJSONObject(it).getString("zone").isNotEmpty() })
    }

    @Test fun uvk5ZonesAreNamedSoEachGetsOneScanListAndLayoutsMatchProfiles() {
        val plan = ChannelTemplates.zonePlan(profiles.getValue("uvk5v3"), region("ES-A", 2, 1) + region("ES-B", 1) + pmr())
        assertEquals(listOf("Region ES-A", "Region ES-B", "PMR446"), plan.accepted.map { it.zone }.distinct())
        assertEquals(ChannelTemplates.Layout("scanlists", lists = 24), profiles.getValue("uvk5v3").layout)
        assertEquals(ChannelTemplates.Layout("memories", from = 1, to = 999), profiles.getValue("ftx1").layout)
        assertEquals(ChannelTemplates.Layout("zones", channelLimit = 4000), profiles.getValue("d878").layout)
        val rt = profiles.getValue("rt950pro").layout
        assertEquals(listOf(10, 99, 12, 10, 6), listOf(rt.zones, rt.slotsPerZone, rt.nameLength, rt.reservedZone, rt.reservedFromSlot))
    }

    @Test fun cbIsSpainOnlyRxOnlyAndSharesTheLastZoneWithPmrOnRadiosThatReceive27MHz() {
        val cb = ChannelTemplates.cbChannels("ES")
        assertEquals(80, cb.size)
        assertEquals(listOf("26.96500", "AM", "FM", "27.40500"), listOf(cb[0].rx, cb[0].modulation, cb[1].modulation, cb.last().rx))
        assertTrue(cb.all { it.tx == it.rx && it.source == ChannelTemplates.CB_SOURCE })
        val ftx1 = ChannelTemplates.zonePlan(profiles.getValue("ftx1"), region("ES-A", 1) + pmr() + cb)
        assertEquals("PMR446 + CB", ftx1.zones.last().name)
        assertEquals(96, ftx1.zones.last().channels.size)
        for (id in listOf("rt950pro", "uvk5v3", "d878")) {
            val plan = ChannelTemplates.zonePlan(profiles.getValue(id), region("ES-A", 1) + pmr() + cb)
            assertTrue(id, plan.accepted.none { it.regionId == "CB27" })
            assertEquals(id, "PMR446", plan.zones.last().name)
        }
    }
}
