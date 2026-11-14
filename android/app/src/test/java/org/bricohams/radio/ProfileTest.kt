package org.bricohams.radio

import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class ProfileTest {
    private val app get() = RuntimeEnvironment.getApplication()

    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()

    private fun buttons(activity: MainActivity) = views(activity.window.decorView).filterIsInstance<Button>()

    @Test fun profileUsbDeviceMatching() {
        val stored = UsbIdentity(0x10C4, 0xEA70, "ABC", 0)
        val other = UsbIdentity(0x10C4, 0xEA70, "XYZ", 0)
        val exact = UsbIdentity(0x10C4, 0xEA70, "ABC", 0)
        assertSame(exact, UsbIdentity.find(stored, listOf(other, exact)))
        // Serial missing on the attached device or in the profile: falls back to vid/pid/port.
        assertSame(other, UsbIdentity.find(stored, listOf(other)))
        val noSerial = UsbIdentity(0x10C4, 0xEA70, null, 0)
        assertSame(exact, UsbIdentity.find(noSerial, listOf(exact)))
        // Different port or not attached.
        assertNull(UsbIdentity.find(stored, listOf(UsbIdentity(0x10C4, 0xEA70, "ABC", 1))))
        assertNull(UsbIdentity.find(stored, listOf(UsbIdentity(0x1A86, 0x7523, null, 0))))
        assertNull(UsbIdentity.find(stored, emptyList()))
        ProfileStore.saveUsbDevice(app, stored)
        assertEquals(stored, ProfileStore.usbDevice(app))
    }

    @Test fun profileRoundTripsAndKeepsLegacyRigSettingsInStep() {
        ProfileStore.save(app, StationProfile(ProfileRadio.IC705, "ea1abc", CatTransport.USB_SERIAL, 115200, "a4"))
        val loaded = ProfileStore.load(app)
        assertEquals(ProfileRadio.IC705, loaded.radio)
        assertEquals("EA1ABC", loaded.callsign)
        assertEquals(CatTransport.USB_SERIAL, loaded.transport)
        assertEquals(115200, loaded.baud)
        assertEquals("A4", loaded.civAddress)
        val rig = app.getSharedPreferences(RigActivity.PREFERENCES, android.content.Context.MODE_PRIVATE)
        assertEquals("IC705", rig.getString("model", null))
        assertEquals(115200, rig.getInt("baud", 0))
        assertTrue(ProfileStore.isConfigured(app))
    }

    @Test fun invalidValuesAreRejectedAndNothingIsStored() {
        assertThrows(IllegalArgumentException::class.java) {
            ProfileStore.save(app, StationProfile(ProfileRadio.FT817, "!!", CatTransport.USB_SERIAL, 4800))
        }
        assertThrows(IllegalArgumentException::class.java) {
            ProfileStore.save(app, StationProfile(ProfileRadio.FT817, "EA1ABC", CatTransport.USB_SERIAL, 10))
        }
        assertThrows(IllegalArgumentException::class.java) {
            StationProfile(ProfileRadio.IC705, "EA1ABC", CatTransport.USB_SERIAL, 115200, "FF").validated()
        }
        assertFalse(ProfileStore.isConfigured(app))
    }

    @Test fun firstLaunchOpensWizardAndConfiguredProfileDoesNot() {
        val first = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            assertEquals(ProfileActivity::class.java.name, shadowOf(first.get()).nextStartedActivity?.component?.className)
        } finally { first.pause().stop().destroy() }
        ProfileStore.save(app, StationProfile(ProfileRadio.UVK5, "EA1ABC", CatTransport.USB_SERIAL))
        val second = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            assertNull(shadowOf(second.get()).nextStartedActivity)
        } finally { second.pause().stop().destroy() }
    }

    @Test fun wizardWalksRadioCallsignCatAndSavesTheProfile() {
        val controller = Robolectric.buildActivity(ProfileActivity::class.java).setup()
        try {
            val activity = controller.get()
            fun click(label: Int) = views(activity.window.decorView).filterIsInstance<Button>()
                .single { it.text == activity.getString(label) }.performClick()
            click(R.string.profile_next)
            assertTrue(views(activity.window.decorView).filterIsInstance<android.widget.TextView>()
                .any { it.text == activity.getString(R.string.profile_radio_required) })
            views(activity.window.decorView).filterIsInstance<android.widget.RadioButton>()
                .single { it.text == ProfileRadio.FT857.label(activity) }.performClick()
            click(R.string.profile_next)
            activity.findViewById<EditText>(R.id.profile_callsign).setText("ea1abc")
            click(R.string.profile_next)
            // Step 3 of 4 is the location; a lone locator fills approximate centre coordinates.
            assertTrue(views(activity.window.decorView).filterIsInstance<android.widget.TextView>()
                .any { it.text == activity.getString(R.string.profile_step, 3, 4, activity.getString(R.string.profile_step_location)) })
            activity.findViewById<EditText>(R.id.profile_locator).setText("im98ib")
            assertEquals("38.06250", activity.findViewById<EditText>(R.id.profile_latitude).text.toString())
            click(R.string.profile_next)
            assertTrue(views(activity.window.decorView).filterIsInstance<android.widget.TextView>()
                .any { it.text == activity.getString(R.string.profile_step, 4, 4, activity.getString(R.string.profile_step_cat)) })
            click(R.string.profile_test)
            assertTrue(views(activity.window.decorView).filterIsInstance<android.widget.TextView>()
                .any { it.text == activity.getString(R.string.profile_test_no_usb) })
            click(R.string.profile_save)
            val saved = ProfileStore.load(app)
            assertEquals(ProfileRadio.FT857, saved.radio)
            assertEquals("EA1ABC", saved.callsign)
            assertEquals(4800, saved.baud)
            assertEquals("IM98ib", saved.locator)
            assertTrue(saved.approximate)
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun typingCoordinatesUpdatesTheLocator() {
        ProfileStore.save(app, StationProfile(ProfileRadio.FT857, "EA1ABC", CatTransport.USB_SERIAL, 4800))
        val controller = Robolectric.buildActivity(ProfileActivity::class.java).setup()
        try {
            val activity = controller.get()
            fun click(label: Int) = views(activity.window.decorView).filterIsInstance<Button>()
                .single { it.text == activity.getString(label) }.performClick()
            click(R.string.profile_next); click(R.string.profile_next)
            activity.findViewById<EditText>(R.id.profile_latitude).setText("41.714775")
            activity.findViewById<EditText>(R.id.profile_longitude).setText("-72.72726")
            assertEquals("FN31pr", activity.findViewById<EditText>(R.id.profile_locator).text.toString())
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun locationIsStoredSharedWithSatellitesAndShownInSummaryAndAdif() {
        ProfileStore.save(app, StationProfile(ProfileRadio.UVK5, "EA1ABC", CatTransport.USB_SERIAL,
            latitude = "38.0625", longitude = "-1,2917", heightKm = "0.2"))
        val loaded = ProfileStore.load(app)
        assertEquals("IM98ib", loaded.locator)
        assertFalse(loaded.approximate)
        assertEquals("-1.2917", loaded.longitude)
        val observer = app.getSharedPreferences("satellite-observer", android.content.Context.MODE_PRIVATE)
        assertEquals("38.0625", observer.getString("latitude", null))
        assertEquals("-1.2917", observer.getString("longitude", null))
        assertEquals("0.2", observer.getString("height", null))
        assertTrue(ProfileStore.summary(app).endsWith("Locator: IM98ib"))
        val contact = Contact(call = "EA1XYZ", utc = java.time.Instant.parse("2025-01-01T10:00:00Z"),
            frequencyMHz = "145.500", mode = "FM", sent = "59", received = "59", notes = "")
        assertTrue(Adif.export(listOf(contact), null, ProfileStore.locator(app)).contains("<MY_GRIDSQUARE:6>IM98ib"))
        assertFalse(Adif.export(listOf(contact)).contains("MY_GRIDSQUARE"))
    }

    @Test fun locatorOnlyProfileGetsApproximateCentreAndInvalidLocationIsRejected() {
        val checked = StationProfile(ProfileRadio.UVK5, "EA1ABC", CatTransport.USB_SERIAL, locator = "JN58").validated()
        assertTrue(checked.approximate)
        assertEquals("48.50000", checked.latitude)
        assertEquals("JN58", checked.locator)
        for (bad in listOf(StationProfile(ProfileRadio.UVK5, "EA1ABC", CatTransport.USB_SERIAL, locator = "ZZ99"),
            StationProfile(ProfileRadio.UVK5, "EA1ABC", CatTransport.USB_SERIAL, latitude = "95", longitude = "0"),
            StationProfile(ProfileRadio.UVK5, "EA1ABC", CatTransport.USB_SERIAL, latitude = "10"))) {
            assertThrows(IllegalArgumentException::class.java) { ProfileStore.save(app, bad) }
        }
        assertFalse(ProfileStore.isConfigured(app))
    }

    @Test fun aprsAndRigScreensReadTheProfileCallsign() {
        assertEquals("", ProfileStore.aprsCall(app, "7"))
        ProfileStore.save(app, StationProfile(ProfileRadio.RT950, "ea1abc", CatTransport.BLE))
        assertEquals("EA1ABC", ProfileStore.aprsCall(app, ""))
        assertEquals("EA1ABC-7", ProfileStore.aprsCall(app, "7"))
        assertTrue(Ax25Address.isValid(ProfileStore.aprsCall(app, "7")))
        assertEquals("EA1ABC", ProfileStore.requireCallsign(app))
    }

    @Test fun logbookStationDefaultsToTheProfileCallsign() {
        ProfileStore.save(app, StationProfile(ProfileRadio.UVK5, "EA1ABC", CatTransport.USB_SERIAL))
        val controller = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            val activity = controller.get()
            buttons(activity).single { it.text == activity.getString(R.string.tab_logbook) }.performClick()
            assertEquals("EA1ABC", activity.findViewById<EditText>(R.id.logbook_station).text.toString())
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun capabilityTableGreysOutToolsTheRadioCannotUse() {
        assertFalse(ProfileRadio.FT817.supports(Tool.CHANNELS))
        assertFalse(ProfileRadio.FT817.supports(Tool.DIAGNOSTICS))
        assertTrue(ProfileRadio.FT817.supports(Tool.RIG_CAT))
        assertTrue(ProfileRadio.UVK5.supports(Tool.CHANNELS))
        assertFalse(ProfileRadio.UVK5.supports(Tool.RIG_CAT))
        assertTrue(ProfileRadio.values().all { it.supports(Tool.SSTV) })
        assertTrue((null as ProfileRadio?).allows(Tool.CHANNELS))

        ProfileStore.save(app, StationProfile(ProfileRadio.FT817, "EA1ABC", CatTransport.USB_SERIAL, 4800))
        val controller = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            val activity = controller.get()
            val channels = buttons(activity).single { it.text == activity.getString(R.string.home_open_channels) }
            assertFalse(channels.isEnabled)
            assertTrue(channels.contentDescription.toString().contains(ProfileRadio.FT817.label(activity)))
            assertTrue(buttons(activity).single { it.text == activity.getString(R.string.home_open_rig_cat) }.isEnabled)
            assertTrue(buttons(activity).single { it.text == activity.getString(R.string.home_open_satellites) }.isEnabled)
        } finally { controller.pause().stop().destroy() }
    }
}
