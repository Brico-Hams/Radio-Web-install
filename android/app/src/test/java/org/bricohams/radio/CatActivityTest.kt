package org.bricohams.radio

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
import org.robolectric.util.ReflectionHelpers
import java.util.concurrent.ExecutorService
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class CatActivityTest {
    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()
    private fun click(activity: CatActivity, label: String) {
        assertTrue(views(activity.window.decorView).filterIsInstance<Button>().single { it.text == label }.performClick())
    }
    private fun text(activity: CatActivity) = views(activity.window.decorView).filterIsInstance<TextView>().joinToString("\n") { it.text }
    @Test fun noUsbDoesNotGuessDeviceAndFrequencySurvivesRotation() {
        val controller = Robolectric.buildActivity(CatActivity::class.java).setup()
        try {
            val activity = controller.get()
            click(activity, "Elegir dispositivo USB")
            assertTrue(text(activity).contains("No hay dispositivo USB reconocido"))
            activity.findViewById<EditText>(R.id.cat_frequency).setText("145.80000")
            controller.recreate()
            assertEquals("145.80000", controller.get().findViewById<EditText>(R.id.cat_frequency).text.toString())
            click(controller.get(), "Sintonizar RX temporal (3 s)")
            val executor = ReflectionHelpers.getField<ExecutorService>(controller.get(), "worker")
            executor.submit {}.get(5, TimeUnit.SECONDS)
            shadowOf(Looper.getMainLooper()).idle()
            assertTrue(text(controller.get()).contains("Conecta primero USB."))
        } finally { controller.pause().stop().destroy() }
    }
    @Test fun invalidFrequencyDoesNotStartUsbAndLeavingSuspends() {
        val controller = Robolectric.buildActivity(CatActivity::class.java).setup()
        try {
            val activity = controller.get()
            for (frequency in listOf("", "200", "145.800001", "999999999999999999999", "-1")) {
                activity.findViewById<EditText>(R.id.cat_frequency).setText(frequency)
                click(activity, "Sintonizar RX temporal (3 s)")
                assertTrue(text(activity).contains("Introduce MHz"))
            }
            controller.pause().stop()
            assertTrue(text(activity).contains("CAT suspendido"))
            controller.start().resume()
            assertTrue(text(activity).contains("elegir y conectar USB de nuevo"))
        } finally { controller.pause().stop().destroy() }
    }
}
