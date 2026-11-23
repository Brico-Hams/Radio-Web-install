package org.bricohams.radio

import android.net.Uri
import android.webkit.JavascriptInterface
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class AntennaActivityTest {
    private fun activity() = Robolectric.buildActivity(AntennaActivity::class.java).setup().get()

    @Test fun loadsTheBundledAssetPageWithTheDeviceLanguage() {
        val activity = activity()
        assertEquals("https://appassets.invalid/antenna/index.html?lang=es", shadowOf(activity.web).lastLoadedUrl)
        val settings = activity.web.settings
        assertTrue(settings.javaScriptEnabled)
        assertTrue(settings.blockNetworkLoads)
        assertFalse(settings.allowFileAccess)
        assertFalse(settings.allowContentAccess)
    }

    @Test fun servesEveryBundledFileWithTheStrictCspAndBlocksEverythingElse() {
        val activity = activity()
        for (name in AntennaWeb.FILES.keys) {
            val response = AntennaWeb.respond(activity, Uri.parse("https://appassets.invalid/antenna/$name"))
            assertEquals(name, 200, response.statusCode)
            assertEquals(AntennaWeb.CSP, response.responseHeaders["Content-Security-Policy"])
            assertTrue(name, response.data.readBytes().isNotEmpty())
        }
        assertTrue(AntennaWeb.CSP.contains("connect-src 'none'"))
        assertTrue(AntennaWeb.CSP.contains("default-src 'none'"))
        val page = String(activity.assets.open("antenna/index.html").readBytes())
        assertTrue(page.contains(AntennaWeb.CSP))
        for (blocked in listOf("https://example.com/antenna/index.html", "http://appassets.invalid/antenna/index.html",
            "https://appassets.invalid/other.js", "https://appassets.invalid/antenna/../secret", "file:///android_asset/antenna/index.html",
            "https://appassets.invalid/antenna/unknown.js")) {
            val response = AntennaWeb.respond(activity, Uri.parse(blocked))
            assertTrue(blocked, response.statusCode == 403 || response.statusCode == 404)
            assertEquals(blocked, 0, response.data.readBytes().size)
        }
    }

    @Test fun bridgeExposesOnlyTheTwoAllowedMethods() {
        val activity = activity()
        val bridge = shadowOf(activity.web).getJavascriptInterface(AntennaWeb.BRIDGE)
        assertNotNull(bridge)
        val exposed = bridge!!.javaClass.methods.filter { it.isAnnotationPresent(JavascriptInterface::class.java) }.map { it.name }.toSet()
        assertEquals(setOf("activeRadioId", "importCsv"), exposed)
        assertEquals("", (bridge as AntennaBridge).activeRadioId())
    }

    @Test fun pageGetsOnlySourcedMeterRadiosAndNeverAPttCommand() {
        assertEquals("ic705", AntennaWeb.meterRadioId(ProfileRadio.IC705))
        assertEquals("ftx1", AntennaWeb.meterRadioId(ProfileRadio.FTX1))
        for (radio in ProfileRadio.values().filter { it != ProfileRadio.IC705 && it != ProfileRadio.FTX1 }) assertNull(radio.name, AntennaWeb.meterRadioId(radio))
        assertEquals("ftx1", AntennaWeb.bandRadioId(ProfileRadio.FTX1))
        assertEquals("", AntennaWeb.bandRadioId(ProfileRadio.IC705))
        val idle = JSONObject(AntennaWeb.sampleJson("ftx1", false, 7_100_000L, 90))
        assertFalse(idle.getBoolean("ptt"))
        assertTrue(idle.isNull("swr") && idle.isNull("freqHz"))
        val tx = JSONObject(AntennaWeb.sampleJson("ftx1", true, 7_100_000L, 90))
        assertEquals(90, tx.getInt("swr"))
        assertEquals("raw", tx.getString("source"))
        assertEquals("\"a\\u2028b\"", AntennaWeb.jsString("a\u2028b"))
    }
}
