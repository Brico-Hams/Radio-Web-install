package org.bricohams.radio

import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.webkit.PermissionRequest
import android.net.Uri
import android.widget.Button
import android.widget.EditText
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class RemoteStationActivityTest {
    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()

    @Test fun unsafeUrlsAndCrossOriginNavigationAreRejected() {
        assertEquals("https://radio.example:8787/", RemoteStationUrl.parse("https://radio.example:8787"))
        for (value in listOf("http://radio", "https://token@radio", "https://radio/api",
            "https://radio?token=secret", "https://radio#secret", " https://radio", "https://radio:65536")) {
            assertThrows(IllegalArgumentException::class.java) { RemoteStationUrl.parse(value) }
        }
        assertTrue(RemoteStationUrl.sameOrigin("https://radio/help/es/manual.md", "https://radio/"))
        assertFalse(RemoteStationUrl.sameOrigin("https://other/", "https://radio/"))
        assertFalse(RemoteStationUrl.sameOrigin("https://token@radio/", "https://radio/"))
        assertFalse(RemoteStationUrl.sameOrigin("http://radio/", "https://radio/"))
    }

    @Test fun backgroundClosesTheWebClientWithoutAutomaticReconnection() {
        val controller = Robolectric.buildActivity(RemoteStationActivity::class.java).setup()
        try {
            val activity = controller.get()
            val all = views(activity.window.decorView)
            all.filterIsInstance<EditText>().single().setText("https://radio.example:8787")
            all.filterIsInstance<Button>().single { it.text == activity.getString(R.string.remote_connect) }.performClick()
            val browser = all.filterIsInstance<WebView>().single()
            assertEquals("https://radio.example:8787/", shadowOf(browser).lastLoadedUrl)
            assertFalse(all.filterIsInstance<EditText>().single().isEnabled)
            assertFalse(all.filterIsInstance<EditText>().single().isShown)
            assertTrue(all.filterIsInstance<Button>().single {
                it.text == activity.getString(R.string.remote_disconnect)
            }.isShown)
            assertFalse(browser.settings.allowFileAccess)
            assertFalse(browser.settings.allowContentAccess)
            controller.pause()
            assertEquals("about:blank", shadowOf(browser).lastLoadedUrl)
            controller.resume()
            assertEquals("about:blank", shadowOf(browser).lastLoadedUrl)
            assertTrue(all.filterIsInstance<EditText>().single().isEnabled)
            assertTrue(all.filterIsInstance<EditText>().single().isShown)
            assertSame(browser, views(activity.window.decorView).filterIsInstance<WebView>().single())
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun foreignOriginAndAdditionalMediaResourcesAreDenied() {
        val controller = Robolectric.buildActivity(RemoteStationActivity::class.java).setup()
        try {
            val activity = controller.get()
            val all = views(activity.window.decorView)
            all.filterIsInstance<EditText>().single().setText("https://radio.example")
            all.filterIsInstance<Button>().single { it.text == activity.getString(R.string.remote_connect) }.performClick()
            val browser = all.filterIsInstance<WebView>().single()
            for ((url, media) in listOf(
                "https://foreign.example/" to arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE),
                "https://radio.example/" to arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE, PermissionRequest.RESOURCE_VIDEO_CAPTURE)
            )) {
                var denied = false
                val request = object : PermissionRequest() {
                    override fun getOrigin(): Uri = Uri.parse(url)
                    override fun getResources(): Array<String> = media
                    override fun deny() { denied = true }
                    override fun grant(resources: Array<String>) { fail("No permission may be granted") }
                }
                browser.webChromeClient!!.onPermissionRequest(request)
                assertTrue(denied)
            }
        } finally { controller.pause().stop().destroy() }
    }
}
