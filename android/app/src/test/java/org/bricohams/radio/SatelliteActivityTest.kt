package org.bricohams.radio

import android.app.Activity
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.TextView
import org.robolectric.RuntimeEnvironment
import org.junit.After
import org.junit.Before
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.shadows.ShadowAlertDialog
import org.robolectric.util.ReflectionHelpers
import java.io.File
import java.io.IOException
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.concurrent.ExecutorService
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class SatelliteActivityTest {
    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()
    private fun all(activity: Activity) = views(activity.window.decorView)
    private fun text(activity: Activity) = all(activity).filterIsInstance<TextView>().joinToString("\n") { it.text }
    private fun click(activity: Activity, label: String) {
        val target = all(activity).filterIsInstance<TextView>().first { it.text.toString() == label && it.isShown }
        assertTrue(label, target.performClick())
    }
    private fun idle(activity: Activity) {
        repeat(3) {
            for (name in listOf("audioWorker", "worker")) {
                ReflectionHelpers.getField<ExecutorService>(activity, name).submit {}.get(60, TimeUnit.SECONDS)
            }
            shadowOf(Looper.getMainLooper()).idle()
        }
    }
    private fun freshTle(daysAgo: Long = 0): Tle {
        val today = LocalDate.now(ZoneOffset.UTC).minusDays(daysAgo)
        val epoch = "%02d%03d.00000000".format(java.util.Locale.ROOT, today.year % 100, today.dayOfYear)
        val base = SatellitesTest.tle.line1.substring(0, 18) + epoch + SatellitesTest.tle.line1.substring(32, 68)
        val checksum = base.sumOf { if (it in '0'..'9') it - '0' else if (it == '-') 1 else 0 } % 10
        return Tle("ISS (ZARYA)", base + checksum, SatellitesTest.tle.line2)
    }
    private fun observer(latitude: String = "40.4168") {
        RuntimeEnvironment.getApplication().getSharedPreferences("satellite-observer", Context.MODE_PRIVATE).edit()
            .putString("latitude", latitude).putString("longitude", "-3.7038").putString("height", "0.667").commit()
    }
    @After fun restoreNetwork() { SatelliteActivity.fetch = SatelliteSources::fetch }
    @Before fun rejectUnexpectedNetwork() {
        SatelliteActivity.fetch = { _, _ -> throw AssertionError("Unexpected network request") }
    }

    @Test fun downloadedCatalogGivesPassCardsRadarAndCatPlanWithSatnogsDownlink() {
        observer()
        val tle = freshTle()
        val requests = ArrayList<String>()
        SatelliteActivity.fetch = { url, _ ->
            requests.add(url)
            if (url == SatelliteSources.TLE_URL) "${tle.name}          \n${tle.line1}\n${tle.line2}\n".toByteArray()
            else """[{"norad_cat_id":25544,"alive":true,"status":"active","downlink_low":437800000,"mode":"FM","description":"Repeater"},
                     {"norad_cat_id":25544,"alive":true,"status":"active","downlink_low":145800000,"mode":"FM","description":"Voice"}]""".toByteArray()
        }
        val controller = Robolectric.buildActivity(SatelliteActivity::class.java).setup()
        try {
            val activity = controller.get()
            assertTrue(text(activity).contains("Sin satelites"))
            // Opening the screen starts the download; a second tap must not duplicate it.
            click(activity, "Actualizar TLE y frecuencias")
            idle(activity)
            assertEquals(listOf(SatelliteSources.TLE_URL, SatelliteSources.TRANSMITTERS_URL), requests)
            val cards = all(activity).filter { it.isClickable && it.contentDescription?.startsWith("ISS (ZARYA) (25544)") == true }
            assertTrue(text(activity), cards.isNotEmpty())
            assertTrue(text(activity), text(activity).contains("AOS ") && text(activity).contains("FM"))
            cards.first().performClick()
            idle(activity)
            val radar = all(activity).filterIsInstance<PassRadarView>().single()
            assertEquals(60, radar.track.size)
            assertTrue(text(activity).contains("437.8000 MHz  FM  Repeater"))
            click(activity, "Conectar CAT: Doppler, SSTV y grabacion")
            val intent = shadowOf(activity).nextStartedActivity
            assertEquals(CatActivity::class.java.name, intent.component?.className)
            val plan = SatellitePlanJson.decode(requireNotNull(intent.getStringExtra("satellite-plan")))
            // FM transmitters are offered in frequency order; the first one is preselected.
            assertEquals(145800000L, plan.downlinkHz)
            assertEquals(tle.line1, plan.tle.line1)
            assertEquals(radar.track.first().time, plan.pass.aos.time)
            assertEquals(radar.track.last().time, plan.pass.los.time)
            activity.findViewById<EditText>(R.id.satellite_downlink).setText("200")
            click(activity, "Conectar CAT: Doppler, SSTV y grabacion")
            assertNull(shadowOf(activity).nextStartedActivity)
            click(activity, "Mapa")
            idle(activity)
            assertTrue(text(activity), text(activity).contains("25544 - ISS (ZARYA)\nLat "))
        } finally { controller.pause().stop().destroy() }
    }

    @Test
    @GraphicsMode(GraphicsMode.Mode.NATIVE)
    fun firstLaunchDrawsLandAndSatellitesWithoutObserverOrGpsPermission() {
        val tle = freshTle()
        val requests = ArrayList<String>()
        SatelliteActivity.fetch = { url, _ ->
            requests.add(url)
            if (url == SatelliteSources.TLE_URL) "${tle.name}\n${tle.line1}\n${tle.line2}\n".toByteArray()
            else "[]".toByteArray()
        }
        val controller = Robolectric.buildActivity(SatelliteActivity::class.java).setup()
        try {
            val activity = controller.get()
            idle(activity)
            val map = all(activity).filterIsInstance<WorldMapView>().single()
            assertNull(map.observer)
            assertEquals(listOf(25544), map.satellites.map { it.norad })
            assertEquals(91, map.satellites.single().track.size)
            assertTrue(map.land.size > 100)
            assertTrue(text(activity), text(activity).contains("25544 - ISS"))
            assertEquals(listOf(SatelliteSources.TLE_URL, SatelliteSources.TRANSMITTERS_URL), requests)
            map.measure(View.MeasureSpec.makeMeasureSpec(600, View.MeasureSpec.EXACTLY),
                View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
            map.layout(0, 0, map.measuredWidth, map.measuredHeight)
            val bitmap = Bitmap.createBitmap(600, 300, Bitmap.Config.ARGB_8888)
            map.draw(Canvas(bitmap))
            val pixels = IntArray(600 * 300)
            bitmap.getPixels(pixels, 0, 600, 0, 0, 600, 300)
            assertTrue("Continents must be drawn", pixels.count { it == Color.rgb(78, 66, 52) } > 1000)
            assertTrue("Selected satellite and footprint must be drawn", pixels.count { it == Color.rgb(255, 152, 0) } > 10)
            bitmap.recycle()
            controller.pause().resume()
            idle(activity)
            assertEquals(2, requests.size)
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun offlineFailureIsVisibleAndManualRetryPopulatesTheOpenMap() {
        var attempts = 0
        SatelliteActivity.fetch = { _, _ -> attempts++; throw IOException("offline-test") }
        val controller = Robolectric.buildActivity(SatelliteActivity::class.java).setup()
        try {
            val activity = controller.get()
            idle(activity)
            assertTrue(text(activity), text(activity).contains("offline-test"))
            assertTrue(all(activity).filterIsInstance<WorldMapView>().single().land.isNotEmpty())
            controller.pause().resume()
            idle(activity)
            assertEquals("Do not retry failed downloads on every resume", 1, attempts)
            val tle = freshTle()
            SatelliteActivity.fetch = { url, _ ->
                if (url == SatelliteSources.TLE_URL) "${tle.name}\n${tle.line1}\n${tle.line2}\n".toByteArray()
                else throw IOException("satnogs-test")
            }

            click(activity, "Actualizar TLE y frecuencias")
            idle(activity)
            assertEquals(25544, all(activity).filterIsInstance<WorldMapView>().single().satellites.single().norad)
            assertTrue(text(activity), text(activity).contains("satnogs-test"))
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun expiredTleIsReportedInsteadOfSilentlyHidingSatellites() {
        val context = RuntimeEnvironment.getApplication()
        context.getSharedPreferences("satellite-observer", Context.MODE_PRIVATE).edit().putBoolean("auto-update", false).commit()
        SatelliteStore(File(context.filesDir, "satellites")).saveCatalog(listOf(freshTle(10)), emptyList())
        val controller = Robolectric.buildActivity(SatelliteActivity::class.java).setup()
        try {
            val activity = controller.get()
            idle(activity)
            assertTrue(all(activity).filterIsInstance<WorldMapView>().single().satellites.isEmpty())
            assertTrue(text(activity), text(activity).contains(activity.getString(R.string.err_tle_stale)))
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun cachedCatalogOfflinePreferenceAndEmptySelectionSurviveReopening() {
        val context = RuntimeEnvironment.getApplication()
        SatelliteStore(File(context.filesDir, "satellites")).saveCatalog(listOf(freshTle()), emptyList())
        val preferences = context.getSharedPreferences("satellite-observer", Context.MODE_PRIVATE)
        preferences.edit().putBoolean("auto-update", false).commit()
        assertTrue(File(context.filesDir, "satellites/catalog.tle").setLastModified(System.currentTimeMillis() - 2 * 86400000L))
        var controller = Robolectric.buildActivity(SatelliteActivity::class.java).setup()
        try {
            val activity = controller.get()
            idle(activity)
            assertEquals(1, all(activity).filterIsInstance<WorldMapView>().single().satellites.size)
            click(activity, "Satelites")
            click(activity, "Ninguno")
            click(activity, "Mapa")
            idle(activity)
            assertTrue(all(activity).filterIsInstance<WorldMapView>().single().satellites.isEmpty())
        } finally { controller.pause().stop().destroy() }
        controller = Robolectric.buildActivity(SatelliteActivity::class.java).setup()
        try {
            idle(controller.get())
            assertTrue(all(controller.get()).filterIsInstance<WorldMapView>().single().satellites.isEmpty())
            assertTrue(text(controller.get()), text(controller.get()).contains("Ningun satelite elegido"))
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun staleCacheRefreshesAutomaticallyAndPreservesSavedSelection() {
        val context = RuntimeEnvironment.getApplication()
        val tle = freshTle()
        SatelliteStore(File(context.filesDir, "satellites")).saveCatalog(listOf(tle), emptyList())
        assertTrue(File(context.filesDir, "satellites/catalog.tle").setLastModified(System.currentTimeMillis() - 2 * 86400000L))
        context.getSharedPreferences("satellite-observer", Context.MODE_PRIVATE).edit().putString("selected", "25544").commit()
        val requests = ArrayList<String>()
        SatelliteActivity.fetch = { url, _ ->
            requests.add(url)
            if (url == SatelliteSources.TLE_URL) "${tle.name}\n${tle.line1}\n${tle.line2}\n".toByteArray()
            else "[]".toByteArray()
        }
        val controller = Robolectric.buildActivity(SatelliteActivity::class.java).setup()
        try {
            idle(controller.get())
            assertEquals(2, requests.size)
            assertEquals(listOf(25544), all(controller.get()).filterIsInstance<WorldMapView>().single().satellites.map { it.norad })
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun selectionSearchObserverValidationAndRecordingDeletion() {
        observer()
        val context = RuntimeEnvironment.getApplication()
        SatelliteStore(File(context.filesDir, "satellites")).saveCatalog(listOf(freshTle()), emptyList())
        val recording = File(context.filesDir, "recordings/20261027-101500-25544.wav").apply {
            parentFile?.mkdirs(); writeBytes(PassAudio.header(16000 * 90) + ByteArray(16000 * 90 * 2))
        }
        File(recording.parentFile, "20261027-101500-25544-sstv1.png").writeBytes(ByteArray(10))
        val controller = Robolectric.buildActivity(SatelliteActivity::class.java).setup()
        try {
            val activity = controller.get()
            idle(activity)
            click(activity, "Satelites")
            val box = all(activity).filterIsInstance<CheckBox>().single()
            assertTrue(box.text.toString(), box.isChecked && box.text.startsWith("25544 - ISS"))
            activity.findViewById<EditText>(R.id.satellite_search).setText("nothing")
            assertTrue(all(activity).filterIsInstance<CheckBox>().isEmpty())
            click(activity, "Ninguno")
            click(activity, "Pases")
            assertTrue(text(activity).contains("Ningun satelite elegido"))
            click(activity, "Ajustes")
            assertTrue(text(activity), text(activity).contains("1 min 30 s"))
            activity.findViewById<EditText>(R.id.satellite_latitude).setText("91")
            click(activity, "Guardar y calcular pases")
            assertTrue(text(activity).contains("Observador: latitud"))
            click(activity, "Borrar")
            ShadowAlertDialog.getLatestAlertDialog().getButton(android.content.DialogInterface.BUTTON_POSITIVE).performClick()
            shadowOf(Looper.getMainLooper()).idle()
            assertFalse(recording.exists())
            assertTrue(recording.parentFile!!.listFiles()!!.isEmpty())
            assertTrue(text(activity).contains("Sin grabaciones"))
        } finally { controller.pause().stop().destroy() }
    }
}
