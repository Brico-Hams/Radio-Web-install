package org.bricohams.radio

import android.content.Intent
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.Spinner
import android.widget.TextView
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.util.ReflectionHelpers
import java.util.concurrent.ExecutorService
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class RigActivityTest {
    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()
    private fun text(activity: RigActivity) = views(activity.window.decorView).filterIsInstance<TextView>().joinToString("\n") { it.text }

    @Test fun startsWithoutRadioAndListsModels() {
        val controller = Robolectric.buildActivity(RigActivity::class.java).setup()
        try {
            val activity = controller.get()
            assertTrue(text(activity).contains(activity.getString(R.string.rig_title)))
            val spinner = views(activity.window.decorView).filterIsInstance<Spinner>().first()
            assertEquals(RigModel.values().size, spinner.adapter.count)
            assertEquals(9, spinner.adapter.count)
            assertEquals(RigModel.values().map { it.label }, (0 until spinner.adapter.count).map { spinner.adapter.getItem(it).toString() })
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun memoriesRequireConnection() {
        val controller = Robolectric.buildActivity(RigActivity::class.java).setup()
        try {
            val activity = controller.get()
            val label = activity.getString(R.string.rig_read_memories)
            assertTrue(views(activity.window.decorView).filterIsInstance<Button>().single { it.text == label }.performClick())
            ReflectionHelpers.getField<ExecutorService>(activity, "worker").submit {}.get(5, TimeUnit.SECONDS)
            shadowOf(Looper.getMainLooper()).idle()
            assertTrue(text(activity).contains(activity.getString(R.string.rig_connect_first)))
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun newChannelButtonExists() {
        val controller = Robolectric.buildActivity(RigActivity::class.java).setup()
        try {
            val activity = controller.get()
            val label = activity.getString(R.string.rig_mem_new)
            assertEquals(1, views(activity.window.decorView).filterIsInstance<Button>().count { it.text == label })
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun digitalCardListsFt8() {
        val controller = Robolectric.buildActivity(RigActivity::class.java).setup()
        try {
            val activity = controller.get()
            assertTrue(text(activity).contains(activity.getString(R.string.rig_dig_title)))
            val spinners = views(activity.window.decorView).filterIsInstance<Spinner>()
            assertTrue(spinners.any { it.adapter.count == DigitalMode.values().size && it.adapter.getItem(0).toString().startsWith("FT8") })
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun satelliteCardListsTransponderWithUplink() {
        val point = SatelliteLook(100000, 180.0, 30.0, 1000.0)
        val plan = SatellitePlan(SatellitesTest.tle, SatellitesTest.observer, 145800000,
            SatellitePass(point.copy(time = 99000), point, point.copy(time = 101000), false, false))
        val transmitters = """[{"downlinkHz":145800000,"uplinkHz":437800000,"mode":"FM","description":"Test","invert":false}]"""
        val intent = Intent(RuntimeEnvironment.getApplication(), RigActivity::class.java)
            .putExtra(RigActivity.EXTRA_PLAN, SatellitePlanJson.encode(plan))
            .putExtra(RigActivity.EXTRA_TRANSMITTERS, transmitters)
        val controller = Robolectric.buildActivity(RigActivity::class.java, intent).setup()
        try {
            val activity = controller.get()
            val shown = text(activity)
            assertTrue(shown, shown.contains(activity.getString(R.string.rig_section_satellite)))
            assertTrue(shown, shown.contains("145.800000") && shown.contains("437.800000"))
        } finally { controller.pause().stop().destroy() }
    }
}
