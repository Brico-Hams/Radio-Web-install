package org.bricohams.radio

import android.app.Activity
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
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
import org.robolectric.util.ReflectionHelpers.ClassParameter.from
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.ExecutorService
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class SstvActivityTest {
    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()
    private fun result(activity: SstvActivity, code: Int, uri: Uri) {
        ReflectionHelpers.callInstanceMethod<Unit>(activity, "onActivityResult",
            from(Int::class.javaPrimitiveType, code), from(Int::class.javaPrimitiveType, Activity.RESULT_OK),
            from(Intent::class.java, Intent().setData(uri)))
        ReflectionHelpers.getField<ExecutorService>(activity, "worker").submit {}.get(15, TimeUnit.SECONDS)
        shadowOf(Looper.getMainLooper()).idle()
    }
    private fun wav(audio: PcmAudio): ByteArray {
        val size = audio.samples.size * 2
        return ByteBuffer.allocate(size + 44).order(ByteOrder.LITTLE_ENDIAN).apply {
            put("RIFF".toByteArray()); putInt(size + 36); put("WAVEfmt ".toByteArray()); putInt(16)
            putShort(1); putShort(1); putInt(audio.sampleRate); putInt(audio.sampleRate * 2); putShort(2); putShort(16)
            put("data".toByteArray()); putInt(size)
            audio.samples.forEach { putShort(it) }
        }.array()
    }
    @Test fun decodesWavAndExportsActualPngThenRotationClearsPreview() {
        val controller = Robolectric.buildActivity(SstvActivity::class.java).setup()
        try {
            val activity = controller.get()
            val input = Uri.parse("content://test/robot36.wav")
            shadowOf(activity.contentResolver).registerInputStream(input, ByteArrayInputStream(wav(Robot36Test().signal())))
            result(activity, 50, input)
            assertTrue(views(activity.window.decorView).filterIsInstance<TextView>().any { it.text.contains("Imagen completa") })
            assertTrue(views(activity.window.decorView).filterIsInstance<Button>().single { it.text == "Guardar imagen PNG" }.isEnabled)
            val output = Uri.parse("content://test/image.png")
            val bytes = ByteArrayOutputStream()
            shadowOf(activity.contentResolver).registerOutputStream(output, bytes)
            result(activity, 51, output)
            val png = bytes.toByteArray()
            val image = BitmapFactory.decodeByteArray(png, 0, png.size)
            assertNotNull(image)
            assertEquals(320, image.width)
            assertEquals(240, image.height)
            controller.recreate()
            assertFalse(views(controller.get().window.decorView).filterIsInstance<Button>()
                .single { it.text == "Guardar imagen PNG" }.isEnabled)
        } finally { controller.pause().stop().destroy() }
    }
    @Test fun invalidAudioShowsErrorAndNeverOffersPng() {
        val controller = Robolectric.buildActivity(SstvActivity::class.java).setup()
        try {
            val activity = controller.get()
            val input = Uri.parse("content://test/invalid.wav")
            shadowOf(activity.contentResolver).registerInputStream(input, ByteArrayInputStream(ByteArray(50)))
            result(activity, 50, input)
            assertTrue(views(activity.window.decorView).filterIsInstance<TextView>().any { it.text.contains("SSTV no completado") })
            assertFalse(views(activity.window.decorView).filterIsInstance<Button>().single { it.text == "Guardar imagen PNG" }.isEnabled)
        } finally { controller.pause().stop().destroy() }
    }
}
