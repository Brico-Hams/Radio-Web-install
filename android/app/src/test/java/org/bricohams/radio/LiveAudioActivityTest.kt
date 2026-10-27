package org.bricohams.radio

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
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
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.util.ReflectionHelpers
import org.robolectric.util.ReflectionHelpers.ClassParameter.from
import java.io.ByteArrayOutputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.ExecutorService
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class LiveAudioActivityTest {
    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()
    private fun button(activity: LiveAudioActivity, label: Int): Button =
        views(activity.window.decorView).filterIsInstance<Button>().single { it.text == activity.getString(label) }
    private fun await(activity: LiveAudioActivity) {
        ReflectionHelpers.getField<ExecutorService>(activity, "worker").submit {}.get(20, TimeUnit.SECONDS)
        shadowOf(Looper.getMainLooper()).idle()
    }
    private fun text(activity: LiveAudioActivity, phrase: String) =
        views(activity.window.decorView).filterIsInstance<TextView>().any { it.text.contains(phrase) }

    @Test fun permissionCallbackNeverStartsRecordingAndDenialIsVisible() {
        val controller = Robolectric.buildActivity(LiveAudioActivity::class.java).setup()
        try {
            val activity = controller.get()
            var opened = false
            ReflectionHelpers.setField(activity, "captureFactory", { opened = true; LiveAudio() })
            button(activity, R.string.live_start).performClick()
            assertFalse(opened)
            ReflectionHelpers.callInstanceMethod<Unit>(activity, "onRequestPermissionsResult",
                from(Int::class.javaPrimitiveType, 60), from(Array<String>::class.java, arrayOf(Manifest.permission.RECORD_AUDIO)),
                from(IntArray::class.java, intArrayOf(PackageManager.PERMISSION_DENIED)))
            assertTrue(text(activity, "Sin permiso de microfono"))
            shadowOf(activity).grantPermissions(Manifest.permission.RECORD_AUDIO)
            ReflectionHelpers.callInstanceMethod<Unit>(activity, "onRequestPermissionsResult",
                from(Int::class.javaPrimitiveType, 60), from(Array<String>::class.java, arrayOf(Manifest.permission.RECORD_AUDIO)),
                from(IntArray::class.java, intArrayOf(PackageManager.PERMISSION_GRANTED)))
            assertFalse(opened)
            assertTrue(text(activity, "Pulsa iniciar"))
        } finally { controller.pause().stop().destroy() }
    }
    @Test fun capturedRobot36ProducesImageAndControlsRecoverWithoutRetainingAudio() {
        val controller = Robolectric.buildActivity(LiveAudioActivity::class.java).setup()
        try {
            val activity = controller.get()
            shadowOf(activity).grantPermissions(Manifest.permission.RECORD_AUDIO)
            val audio = Robot36Test().signal(48000)
            lateinit var capture: LiveAudio
            var offset = 0
            val source = object : LiveAudioTest.Source() {
                override fun read(buffer: ShortArray, count: Int): Int {
                    val size = minOf(count, audio.samples.size - offset)
                    audio.samples.copyInto(buffer, 0, offset, offset + size)
                    offset += size
                    if (offset == audio.samples.size) capture.stop()
                    return size
                }
            }
            capture = LiveAudio { source }
            ReflectionHelpers.setField(activity, "captureFactory", { capture })
            activity.findViewById<Spinner>(R.id.live_mode).setSelection(1)
            button(activity, R.string.live_start).performClick()
            await(activity)
            assertTrue(text(activity, "Imagen completa"))
            val bitmap = ReflectionHelpers.getField<Bitmap>(activity, "bitmap")
            assertEquals(320, bitmap.width); assertEquals(240, bitmap.height)
            assertTrue(source.stopped && source.closed)
            assertTrue(button(activity, R.string.sstv_export).isEnabled)
            assertTrue(button(activity, R.string.live_start).isEnabled)
            assertFalse(button(activity, R.string.live_stop).isEnabled)
            val uri = Uri.parse("content://test/live-robot36.png")
            val bytes = ByteArrayOutputStream()
            shadowOf(activity.contentResolver).registerOutputStream(uri, bytes)
            ReflectionHelpers.callInstanceMethod<Unit>(activity, "onActivityResult",
                from(Int::class.javaPrimitiveType, 61), from(Int::class.javaPrimitiveType, Activity.RESULT_OK),
                from(Intent::class.java, Intent().setData(uri)))
            await(activity)
            val png = bytes.toByteArray()
            val exported = BitmapFactory.decodeByteArray(png, 0, png.size)
            assertEquals(320, exported.width); assertEquals(240, exported.height)
            assertTrue(text(activity, activity.getString(R.string.sstv_saved)))
            controller.recreate()
            assertFalse(button(controller.get(), R.string.sstv_export).isEnabled)
        } finally { controller.pause().stop().destroy() }
    }
    @Test fun leavingScreenCancelsBlockedMicrophoneAndNeverResumesOnReturn() {
        val controller = Robolectric.buildActivity(LiveAudioActivity::class.java).setup()
        try {
            val activity = controller.get()
            shadowOf(activity).grantPermissions(Manifest.permission.RECORD_AUDIO)
            val entered = CountDownLatch(1)
            val released = CountDownLatch(1)
            val source = object : LiveAudioTest.Source() {
                override fun read(buffer: ShortArray, count: Int): Int {
                    entered.countDown()
                    check(released.await(5, TimeUnit.SECONDS))
                    return -3
                }
                override fun stop() { super.stop(); released.countDown() }
            }
            ReflectionHelpers.setField(activity, "captureFactory", { LiveAudio { source } })
            button(activity, R.string.live_start).performClick()
            assertTrue(entered.await(5, TimeUnit.SECONDS))
            controller.pause().stop()
            await(activity)
            assertTrue(source.stopped && source.closed)
            controller.start().resume()
            assertTrue(text(activity, "Captura cancelada"))
            assertTrue(button(activity, R.string.live_start).isEnabled)
            assertFalse(button(activity, R.string.live_stop).isEnabled)
        } finally { controller.pause().stop().destroy() }
    }
    @Test fun capturedMorseDecodesKnownTextWithConfiguredToneAndSpeed() {
        val controller = Robolectric.buildActivity(LiveAudioActivity::class.java).setup()
        try {
            val activity = controller.get()
            shadowOf(activity).grantPermissions(Manifest.permission.RECORD_AUDIO)
            val audio = MorseAudioTest().audio(48000, "... --- ... / . .- .----", 15)
            lateinit var capture: LiveAudio
            var offset = 0
            val source = object : LiveAudioTest.Source() {
                override fun read(buffer: ShortArray, count: Int): Int {
                    val size = minOf(count, audio.samples.size - offset)
                    audio.samples.copyInto(buffer, 0, offset, offset + size)
                    offset += size
                    if (offset == audio.samples.size) capture.stop()
                    return size
                }
            }
            capture = LiveAudio { source }
            ReflectionHelpers.setField(activity, "captureFactory", { capture })
            button(activity, R.string.live_start).performClick()
            await(activity)
            assertTrue(text(activity, "SOS EA1"))
            assertTrue(source.closed)
            assertFalse(button(activity, R.string.sstv_export).isEnabled)
        } finally { controller.pause().stop().destroy() }
    }
    @Test fun hardwareFailureIsVisibleAndAllowsAnotherExplicitAttempt() {
        val controller = Robolectric.buildActivity(LiveAudioActivity::class.java).setup()
        try {
            val activity = controller.get()
            shadowOf(activity).grantPermissions(Manifest.permission.RECORD_AUDIO)
            val source = object : LiveAudioTest.Source() {
                override fun read(buffer: ShortArray, count: Int) = -6
            }
            ReflectionHelpers.setField(activity, "captureFactory", { LiveAudio { source } })
            button(activity, R.string.live_start).performClick()
            await(activity)
            assertTrue(text(activity, "Audio no completado"))
            assertTrue(text(activity, "-6"))
            assertTrue(source.closed)
            assertTrue(button(activity, R.string.live_start).isEnabled)
            assertFalse(button(activity, R.string.sstv_export).isEnabled)
        } finally { controller.pause().stop().destroy() }
    }
    @Test fun sixtySecondDeadlineStopsBlockedReadAndDoesNotRestart() {
        val controller = Robolectric.buildActivity(LiveAudioActivity::class.java).setup()
        try {
            val activity = controller.get()
            shadowOf(activity).grantPermissions(Manifest.permission.RECORD_AUDIO)
            val entered = CountDownLatch(1)
            val stopped = CountDownLatch(1)
            var reads = 0
            val source = object : LiveAudioTest.Source() {
                override fun read(buffer: ShortArray, count: Int): Int {
                    if (reads++ == 0) return super.read(buffer, count)
                    entered.countDown()
                    check(stopped.await(5, TimeUnit.SECONDS))
                    return -3
                }
                override fun stop() { super.stop(); stopped.countDown() }
            }
            ReflectionHelpers.setField(activity, "captureFactory", { LiveAudio { source } })
            button(activity, R.string.live_start).performClick()
            assertTrue(entered.await(5, TimeUnit.SECONDS))
            shadowOf(Looper.getMainLooper()).idleFor(60, TimeUnit.SECONDS)
            await(activity)
            assertTrue(source.stopped && source.closed)
            assertTrue(button(activity, R.string.live_start).isEnabled)
            assertFalse(button(activity, R.string.live_stop).isEnabled)
        } finally { controller.pause().stop().destroy() }
    }
}
