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
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.TimeUnit
import org.bricohams.digital.WavIo
import org.bricohams.digital.fec.Ldpc174
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.util.ReflectionHelpers
import org.robolectric.util.ReflectionHelpers.ClassParameter.from

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class FtxActivityTest {
    private fun views(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { views(view.getChildAt(it)) } else emptyList()

    private fun texts(activity: Activity) =
        views(activity.window.decorView).filterIsInstance<TextView>().filter { it !is EditText }.map { it.text.toString() }

    private fun button(activity: Activity, label: String) =
        views(activity.window.decorView).filterIsInstance<Button>().single { it.text == label }

    private fun result(activity: FtxActivity, code: Int, uri: Uri) {
        ReflectionHelpers.callInstanceMethod<Unit>(activity, "onActivityResult",
            from(Int::class.javaPrimitiveType, code), from(Int::class.javaPrimitiveType, Activity.RESULT_OK),
            from(Intent::class.java, Intent().setData(uri)))
        ReflectionHelpers.getField<ExecutorService>(activity, "worker").submit {}.get(120, TimeUnit.SECONDS)
        shadowOf(Looper.getMainLooper()).idle()
    }

    private fun type(activity: Activity, id: Int, value: String) {
        activity.findViewById<EditText>(id).setText(value)
    }

    private fun tap(activity: Activity, label: String) {
        views(activity.window.decorView).filterIsInstance<TextView>().first { it.text == label }.performClick()
    }

    private fun withActivity(block: (FtxActivity) -> Unit) {
        val controller = Robolectric.buildActivity(FtxActivity::class.java).setup()
        try { block(controller.get()) } finally { controller.pause().stop().destroy() }
    }

    private fun codecs(activity: Activity) = FtxCodecs(activity.assets.open("ftx-ldpc174.json").use { Ldpc174.load(it) })

    @Test fun startsInEveryLanguage() {
        for (tag in listOf("es", "en-rUS", "fr", "de")) {
            RuntimeEnvironment.setQualifiers(tag)
            val controller = Robolectric.buildActivity(FtxActivity::class.java)
            controller.setup()
            try {
                val activity = controller.get()
                assertTrue(tag, texts(activity).any { it.contains("FT8") })
                assertTrue(tag, texts(activity).any { it.contains(activity.getString(R.string.ftx_rx_idle)) })
            } finally { controller.pause().stop().destroy() }
        }
    }

    @Test fun ldpcLoadsFromAsset() = withActivity { activity ->
        assertNotNull(activity.assets.open("ftx-ldpc174.json").use { Ldpc174.load(it) })
    }

    @Test fun decodesFt8WavFromPicker() = withActivity { activity ->
        val bytes = ByteArrayOutputStream()
        WavIo.write(codecs(activity).slotAudio(FtxMode.FT8, "CQ EA1ABC IN80", 1500.0), bytes)
        val temp = java.io.File.createTempFile("ftx", ".wav").apply { writeBytes(bytes.toByteArray()); deleteOnExit() }
        val uri = Uri.parse("content://test/ft8.wav")
        shadowOf(activity.contentResolver).registerInputStream(uri, ByteArrayInputStream(temp.readBytes()))
        result(activity, 71, uri)
        assertTrue(texts(activity).any { it.contains("CQ EA1ABC IN80") })
    }

    @Test fun invalidMessageShowsTranslatedReasonAndKeepsTxDisabled() = withActivity { activity ->
        type(activity, R.id.ftx_call, "EA1ABC")
        type(activity, R.id.ftx_message, "THIS MESSAGE IS FAR TOO LONG TO BE PACKED")
        assertTrue(texts(activity).contains(activity.getString(R.string.err_ftx_message_invalid)))
        assertFalse(button(activity, activity.getString(R.string.ftx_tx_next)).isEnabled)
        assertFalse(button(activity, activity.getString(R.string.ftx_save_wav)).isEnabled)
    }

    @Test fun txIsDisabledWithoutCallsignAndEnabledWithIt() = withActivity { activity ->
        type(activity, R.id.ftx_call, "")
        type(activity, R.id.ftx_message, "CQ EA1ABC IN80")
        val transmit = button(activity, activity.getString(R.string.ftx_tx_next))
        assertFalse(transmit.isEnabled)
        assertTrue(texts(activity).contains(activity.getString(R.string.ftx_need_call)))
        type(activity, R.id.ftx_call, "EA1ABC")
        assertTrue(transmit.isEnabled)
        type(activity, R.id.ftx_message, "CQ EA2XYZ IN80")
        assertFalse(transmit.isEnabled)
    }

    @Test fun ft4AndFt2ReceiveAreAvailable() = withActivity { activity ->
        val listen = button(activity, activity.getString(R.string.ftx_listen))
        val decode = button(activity, activity.getString(R.string.ftx_decode_wav))
        for (mode in listOf(FtxMode.FT4, FtxMode.FT2)) {
            tap(activity, if (mode.candidate) activity.getString(R.string.ftx_mode_candidate, mode.label) else mode.label)
            assertTrue(mode.label, listen.isEnabled)
            assertTrue(mode.label, decode.isEnabled)
            assertFalse(mode.label, texts(activity).contains(activity.getString(R.string.ftx_rx_unavailable, mode.label)))
        }
        assertTrue(button(activity, activity.getString(R.string.ftx_save_wav)).visibility == View.VISIBLE)
    }
}
