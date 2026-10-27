package org.bricohams.radio

import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.util.ReflectionHelpers
import java.io.IOException
import java.util.concurrent.ExecutorService
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class ChannelActivityTest {
    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()

    private fun click(activity: ChannelActivity, label: String) {
        assertTrue(views(activity.window.decorView).filterIsInstance<Button>().single { it.text == label }.performClick())
    }

    private fun text(activity: ChannelActivity) =
        views(activity.window.decorView).filterIsInstance<TextView>().joinToString("\n") { it.text }

    private fun drain(activity: ChannelActivity) {
        ReflectionHelpers.getField<ExecutorService>(activity, "worker").submit {}.get(5, TimeUnit.SECONDS)
        shadowOf(Looper.getMainLooper()).idle()
    }

    @Test fun noUsbOrConfigurationNeverOffersAnUnprotectedWrite() {
        val controller = Robolectric.buildActivity(ChannelActivity::class.java).setup()
        try {
            val activity = controller.get()
            click(activity, "1. Elegir dispositivo USB y conectar")
            assertTrue(text(activity).contains("No hay cable USB-serie o CDC reconocido"))
            click(activity, "6. Escribir en la radio y releer")
            assertTrue(text(activity).contains("Lee los canales antes de escribir"))
            click(activity, "2. Respaldo completo (Flash 2 MiB, 10-20 min)")
            drain(activity)
            assertTrue(text(activity).contains("Conecta primero la radio"))
            assertTrue(text(activity).contains("Sesion invalidada"))
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun leavingClearsChannelCopiesAndDoesNotResumeTheSession() {
        val controller = Robolectric.buildActivity(ChannelActivity::class.java).setup()
        try {
            val activity = controller.get()
            val image = QuanshengChannelsTest.image()
            ReflectionHelpers.setField(activity, "original", image)
            ReflectionHelpers.setField(activity, "working", image.copyOf())
            ReflectionHelpers.setField(activity, "selected", 1)
            controller.pause().stop()
            drain(activity)
            assertNull(ReflectionHelpers.getField<ByteArray?>(activity, "original"))
            assertNull(ReflectionHelpers.getField<ByteArray?>(activity, "working"))
            assertNull(ReflectionHelpers.getField<Int?>(activity, "selected"))
            assertNull(ReflectionHelpers.getField<QuanshengBackups.Receipt?>(activity, "receipt"))
            controller.start().resume()
            click(activity, "6. Escribir en la radio y releer")
            assertTrue(text(activity).contains("Lee los canales antes de escribir"))
        } finally { controller.pause().stop().destroy() }
    }

    @Test fun communicationErrorClosesTransportAndRequiresNewConnection() {
        val controller = Robolectric.buildActivity(ChannelActivity::class.java).setup()
        try {
            val activity = controller.get()
            var closed = false
            var writes = 0
            val port = object : RadioBytes {
                override fun write(bytes: ByteArray, timeoutMs: Int) {
                    writes++
                    throw IOException("Disconnected fixture")
                }
                override fun read(length: Int, timeoutMs: Int): ByteArray = throw IOException("No response")
                override fun close() { closed = true }
            }
            ReflectionHelpers.setField(activity, "transport", port)
            ReflectionHelpers.setField(activity, "memory", QuanshengMemory(port))
            click(activity, "2. Respaldo completo (Flash 2 MiB, 10-20 min)")
            drain(activity)
            assertTrue(closed)
            assertEquals(1, writes)
            assertNull(ReflectionHelpers.getField<RadioBytes?>(activity, "transport"))
            assertNull(ReflectionHelpers.getField<QuanshengMemory?>(activity, "memory"))
            assertTrue(text(activity).contains("Disconnected fixture"))
            click(activity, "2. Respaldo completo (Flash 2 MiB, 10-20 min)")
            drain(activity)
            assertEquals(1, writes)
            assertTrue(text(activity).contains("Conecta primero la radio"))
        } finally { controller.pause().stop().destroy() }
    }
}
