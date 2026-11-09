package org.bricohams.radio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class VersioningTest {
    private class MemoryStore : KeyValueStore {
        val map = HashMap<String, String>()
        override fun get(key: String) = map[key]
        override fun put(key: String, value: String) { map[key] = value }
    }

    private val v16 = AppVersion(16, "1.0.1")
    private val v17 = AppVersion(17, "1.0.2")

    @Test
    fun freshInstallIsSilentButRemembered() {
        val store = MemoryStore()
        assertNull(VersionTracker.check(store, v16, upgradedInPlace = false))
        assertNull(VersionTracker.check(store, v16, upgradedInPlace = false))
        assertTrue(VersionTracker.history(store).isEmpty())
    }

    @Test
    fun upgradeIsAnnouncedOnce() {
        val store = MemoryStore()
        VersionTracker.check(store, v16, false)
        val change = VersionTracker.check(store, v17, true)
        assertEquals(v16, change?.previous)
        assertEquals(v17, change?.current)
        assertEquals(false, change?.downgrade)
        assertNull(VersionTracker.check(store, v17, true))
        assertEquals(1, VersionTracker.history(store).size)
    }

    @Test
    fun downgradeIsFlagged() {
        val store = MemoryStore()
        VersionTracker.check(store, v17, false)
        assertEquals(true, VersionTracker.check(store, v16, true)?.downgrade)
    }

    @Test
    fun updateOverAVersionWithoutTrackingIsAnnounced() {
        assertNotNull(VersionTracker.check(MemoryStore(), v17, upgradedInPlace = true))
    }

    @Test
    fun changelogFallsBackToBaseLanguageThenSpanish() {
        val files = mapOf("changelog-17.es.md" to "# Hola\n- uno", "changelog-17.en.md" to "# Hi\n- one")
        assertEquals("Hi\n• one", Changelog.load(17, "en-US") { files[it] })
        assertEquals("Hola\n• uno", Changelog.load(17, "fr") { files[it] })
        assertNull(Changelog.load(18, "es") { files[it] })
        assertEquals("• uno", Changelog.load(17, "es", dropTitle = true) { files[it] })
    }

    @Test
    fun firmwareChangeNeedsAPreviousValue() {
        val store = MemoryStore()
        val key = FirmwareTracker.radioKey(0x1A86, 0x7523, "SN1")
        assertNull(FirmwareTracker.record(store, key, "Radio", "fw 1"))
        assertNull(FirmwareTracker.record(store, key, "Radio", "fw 1"))
        val change = FirmwareTracker.record(store, key, "Radio", "fw 2")
        assertEquals("fw 1", change?.before)
        assertEquals("fw 2", change?.now)
        assertNull(FirmwareTracker.record(store, key, "Radio", " "))
        assertNull(FirmwareTracker.record(store, FirmwareTracker.radioKey(0x1A86, 0x7523, "SN2"), "Radio", "fw 9"))
    }

    @Test
    fun slotFingerprintUnavailableWhenNothingRead() {
        assertNull(FirmwareTracker.slotsFingerprint(null))
        assertNull(FirmwareTracker.slotsFingerprint(emptyList()))
    }
}
