package org.bricohams.radio

import android.app.Activity
import android.content.Context
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.TextView
import org.robolectric.RuntimeEnvironment
import org.junit.After
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowAlertDialog
import org.robolectric.util.ReflectionHelpers
import java.io.File
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
    private fun freshTle(): Tle {
        val today = LocalDate.now(ZoneOffset.UTC)
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
