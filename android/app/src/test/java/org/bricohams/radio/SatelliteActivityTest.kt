package org.bricohams.radio

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowAlertDialog
import org.robolectric.util.ReflectionHelpers
import org.robolectric.util.ReflectionHelpers.ClassParameter.from
import java.io.ByteArrayInputStream
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.concurrent.ExecutorService
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class SatelliteActivityTest {
    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()
    private fun text(activity: Activity) = views(activity.window.decorView).filterIsInstance<TextView>().joinToString("\n") { it.text }
    private fun click(activity: Activity, label: String) {
        assertTrue(views(activity.window.decorView).filterIsInstance<Button>().single { it.text == label }.performClick())
    }
    private fun waitForWorker(activity: Activity) {
        ReflectionHelpers.getField<ExecutorService>(activity, "worker").submit {}.get(30, TimeUnit.SECONDS)
        shadowOf(Looper.getMainLooper()).idle()
    }
    @Test fun importsCatalogAndRejectsBadPositionWithoutStartingCat() {
        val controller = Robolectric.buildActivity(SatelliteActivity::class.java).setup()
        try {
            val activity = controller.get()
            val uri = Uri.parse("content://test/iss.tle")
            val fixture = SatellitesTest.tle
            shadowOf(activity.contentResolver).registerInputStream(uri,
                ByteArrayInputStream("${fixture.name}\n${fixture.line1}\n${fixture.line2}".toByteArray()))
            ReflectionHelpers.callInstanceMethod<Unit>(activity, "onActivityResult",
                from(Int::class.javaPrimitiveType, 60), from(Int::class.javaPrimitiveType, Activity.RESULT_OK),
                from(Intent::class.java, Intent().setData(uri)))
            waitForWorker(activity)
            val list = ShadowAlertDialog.getLatestAlertDialog().listView
            list.performItemClick(list.getChildAt(0), 0, 0)
            assertEquals(fixture.line1, activity.findViewById<EditText>(R.id.satellite_line1).text.toString())
            activity.findViewById<EditText>(R.id.satellite_latitude).setText("91")
            activity.findViewById<EditText>(R.id.satellite_longitude).setText("0")
            activity.findViewById<EditText>(R.id.satellite_height).setText("0")
            click(activity, "Calcular pases de las proximas 24 h")
            assertTrue(text(activity).contains("Observador"))
            assertNull(shadowOf(activity).nextStartedActivity)
            controller.recreate()
            assertEquals(fixture.line1, controller.get().findViewById<EditText>(R.id.satellite_line1).text.toString())
        } finally { controller.pause().stop().destroy() }
    }
    @Test fun calculatesPassesOfflineAndPassSelectionTransfersImmutableParameters() {
        val controller = Robolectric.buildActivity(SatelliteActivity::class.java).setup()
        try {
            val activity = controller.get()
            val today = LocalDate.now(ZoneOffset.UTC)
            val epoch = "%02d%03d.00000000".format(java.util.Locale.ROOT, today.year % 100, today.dayOfYear)
            val base = SatellitesTest.tle.line1.substring(0, 18) + epoch + SatellitesTest.tle.line1.substring(32, 68)
            val checksum = base.sumOf { if (it in '0'..'9') it - '0' else if (it == '-') 1 else 0 } % 10
            val line1 = base + checksum
            for ((id, value) in listOf(R.id.satellite_name to "ISS", R.id.satellite_line1 to line1,
                R.id.satellite_line2 to SatellitesTest.tle.line2, R.id.satellite_latitude to "40.4168",
                R.id.satellite_longitude to "-3.7038", R.id.satellite_height to "0.667", R.id.satellite_downlink to "145.80000")) {
                activity.findViewById<EditText>(id).setText(value)
            }
            click(activity, "Calcular pases de las proximas 24 h")
            waitForWorker(activity)
            val buttons = views(activity.window.decorView).filterIsInstance<Button>()
                .filter { it.text == "Seleccionar este pase para CAT RX" }
            assertTrue(text(activity), buttons.isNotEmpty())
            buttons.first().performClick()
            val intent = shadowOf(activity).nextStartedActivity
            assertEquals(CatActivity::class.java.name, intent.component?.className)
            val plan = SatellitePlanJson.decode(requireNotNull(intent.getStringExtra("satellite-plan")))
            assertEquals(145800000L, plan.downlinkHz)
            assertEquals(line1, plan.tle.line1)
            assertEquals(SatellitesTest.observer, plan.observer)
            assertEquals(plan, SatellitePlanJson.decode(SatellitePlanJson.encode(plan)))
            controller.recreate()
            assertEquals("145.80000", controller.get().findViewById<EditText>(R.id.satellite_downlink).text.toString())
        } finally { controller.pause().stop().destroy() }
    }
}
