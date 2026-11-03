package org.bricohams.radio

import android.content.Context
import org.robolectric.RuntimeEnvironment
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** The OTA updater exists only in the github flavor; the fdroid flavor must never start a check, download or install. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class OtaFlavorTest {
    private val isGithub get() = BuildConfig.FLAVOR == "github"

    @Test fun flagMatchesTheBuiltFlavor() {
        assertTrue(BuildConfig.FLAVOR == "github" || BuildConfig.FLAVOR == "fdroid")
        assertEquals(isGithub, OtaConfig.enabled)
        assertEquals(isGithub, BuildConfig.OTA_ENABLED)
    }

    @Test fun updaterIsOnlyCreatedWhenEnabled() {
        val context = RuntimeEnvironment.getApplication()
        if (OtaConfig.enabled) {
            OtaPlatform.updater(context)
            return
        }
        try {
            OtaPlatform.updater(context)
            fail("fdroid must not create an updater")
        } catch (error: OtaException) {
            assertEquals(OtaFailure.NOT_CONFIGURED, error.failure)
        }
    }

    @Test fun automaticCheckNeverRunsWithoutTheUpdater() {
        if (OtaConfig.enabled) return
        val activity = org.robolectric.Robolectric.buildActivity(android.app.Activity::class.java).create().get()
        var offered = false
        var transportUsed = false
        val transport = object : OtaTransport {
            override fun get(url: String, maxBytes: Int): ByteArray { transportUsed = true; throw java.io.IOException("blocked") }
            override fun download(url: String, target: java.io.File, expectedSize: Long, onProgress: (Long) -> Unit) { transportUsed = true }
        }
        OtaAutoCheck.run(activity, transport) { offered = true }
        assertFalse(transportUsed)
        assertFalse(offered)
    }

    @Test fun manifestUrlsAreHttpsAndDistinct() {
        assertTrue(OtaConfig.MANIFEST_URL.startsWith("https://"))
        assertTrue(OtaConfig.FALLBACK_MANIFEST_URL.startsWith("https://"))
        assertTrue(OtaConfig.MANIFEST_URL != OtaConfig.FALLBACK_MANIFEST_URL)
    }
}
