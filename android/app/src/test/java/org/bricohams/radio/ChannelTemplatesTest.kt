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
}
