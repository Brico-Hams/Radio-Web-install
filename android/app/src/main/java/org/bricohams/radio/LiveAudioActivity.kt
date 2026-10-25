package org.bricohams.radio

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.WindowInsets
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import java.io.IOException
import java.util.concurrent.CancellationException
import java.util.concurrent.Executors

class LiveAudioActivity : Activity() {
    private val worker = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var status: TextView
    private lateinit var mode: Spinner
    private lateinit var tone: EditText
    private lateinit var speed: EditText
    private lateinit var start: Button
    private lateinit var stop: Button
    private lateinit var cancel: Button
    private lateinit var export: Button
    private lateinit var image: ImageView
    private var capture: LiveAudio? = null
    private val captureFactory: () -> LiveAudio = { LiveAudio() }
    private var bitmap: Bitmap? = null
    private var busy = false
    private var foreground = false
    private var generation = 0
    private val deadline = Runnable { stopCapture(false) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = (16 * resources.displayMetrics.density).toInt()
            setOnApplyWindowInsetsListener { view, insets ->
                if (Build.VERSION.SDK_INT >= 30) {
                    val bars = insets.getInsets(WindowInsets.Type.systemBars())
                    view.setPadding(bars.left + padding, bars.top + padding, bars.right + padding, bars.bottom + padding)
                } else {
                    @Suppress("DEPRECATION")
                    view.setPadding(insets.systemWindowInsetLeft + padding, insets.systemWindowInsetTop + padding,
                        insets.systemWindowInsetRight + padding, insets.systemWindowInsetBottom + padding)
                }
                insets
            }
        }
        layout.addView(TextView(this).apply { setText(R.string.live_intro); textSize = 18f })
        layout.addView(TextView(this).apply { setText(R.string.live_limits) })
        mode = Spinner(this).apply {
            id = R.id.live_mode
            adapter = ArrayAdapter(this@LiveAudioActivity, android.R.layout.simple_spinner_dropdown_item,
                listOf("Morse", "Robot36"))
        }
        layout.addView(mode)
        fun field(label: Int, identifier: Int, value: String): EditText {
            layout.addView(TextView(this).apply { setText(label) })
            return EditText(this).apply {
                id = identifier; hint = getString(label); setText(value)
                inputType = InputType.TYPE_CLASS_NUMBER; layout.addView(this)
            }
        }
        tone = field(R.string.live_tone, R.id.live_tone, "700")
        speed = field(R.string.live_speed, R.id.live_speed, "15")
        fun button(label: Int, action: () -> Unit) = Button(this).apply {
            setText(label); setOnClickListener { action() }; layout.addView(this)
        }
        start = button(R.string.live_start) { begin() }
        stop = button(R.string.live_stop) { stopCapture(false) }
        cancel = button(R.string.live_cancel) { stopCapture(true) }
        export = button(R.string.sstv_export) {
            startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE); type = "image/png"
                putExtra(Intent.EXTRA_TITLE, "bricohams-robot36-microfono.png")
            }, 61)
        }
        status = TextView(this).apply { setText(R.string.live_idle) }
        layout.addView(status)
        image = ImageView(this).apply {
            adjustViewBounds = true; contentDescription = getString(R.string.sstv_image_description)
        }
        layout.addView(image)
        setContentView(ScrollView(this).apply { addView(layout) })
        controls()
    }
    private fun controls() {
        start.isEnabled = !busy
        mode.isEnabled = !busy; tone.isEnabled = !busy; speed.isEnabled = !busy
        stop.isEnabled = capture != null; cancel.isEnabled = capture != null
        export.isEnabled = !busy && bitmap != null
    }
    private fun begin() {
        if (!foreground || busy) return
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 60)
            return
        }
        val selected = mode.selectedItemPosition
        val toneHz = tone.text.toString().toIntOrNull()
        val wpm = speed.text.toString().toIntOrNull()
        if (selected == 0 && (toneHz == null || toneHz !in 300..1200 || wpm == null || wpm !in 5..45)) {
            status.setText(R.string.live_invalid_morse)
            return
        }
        bitmap = null; image.setImageDrawable(null)
        val recording = captureFactory()
        capture = recording; busy = true
        val token = ++generation
        status.setText(R.string.live_recording)
        controls()
        handler.postDelayed(deadline, LiveAudio.MAX_SECONDS * 1000L)
        worker.execute {
            try {
                val audio = recording.record()
                runOnUiThread {
                    if (token == generation && foreground) {
                        handler.removeCallbacks(deadline); capture = null; controls()
                        status.setText(R.string.live_decoding)
                    }
                }
                if (selected == 0) {
                    val result = MorseAudio.decode(audio, checkNotNull(toneHz), checkNotNull(wpm))
                    show(token) { status.text = getString(R.string.live_morse_result, result.text, result.morse, result.warning) }
                } else {
                    val result = Robot36.decode(audio)
                    val decoded = Bitmap.createBitmap(result.pixels, Robot36.WIDTH, Robot36.HEIGHT, Bitmap.Config.ARGB_8888)
                    runOnUiThread {
                        if (token == generation && foreground && !isDestroyed) {
                            bitmap = decoded; image.setImageBitmap(decoded)
                            status.text = getString(R.string.sstv_complete, result.startSeconds, result.warning)
                        } else decoded.recycle()
                    }
                }
            } catch (error: CancellationException) {
                show(token) { status.setText(R.string.live_cancelled) }
            } catch (error: IOException) {
                failed(token, error)
            } catch (error: IllegalArgumentException) {
                failed(token, error)
            } catch (error: IllegalStateException) {
                failed(token, error)
            } catch (error: SecurityException) {
                failed(token, error)
            } finally {
                runOnUiThread {
                    if (!isDestroyed) {
                        handler.removeCallbacks(deadline); capture = null; busy = false; controls()
                    }
                }
            }
        }
    }
    private fun show(token: Int, action: () -> Unit) {
        runOnUiThread { if (!isDestroyed && foreground && token == generation) action() }
    }
    private fun failed(token: Int, error: Exception) {
        show(token) { status.text = getString(R.string.live_error, error.message) }
    }
    private fun stopCapture(discard: Boolean) {
        handler.removeCallbacks(deadline)
        if (discard) { generation++; status.setText(R.string.live_cancelled) }
        val recording = capture ?: return
        try {
            if (discard) recording.cancel() else recording.stop()
            stop.isEnabled = false; cancel.isEnabled = false
            if (!discard) status.setText(R.string.live_decoding)
        } catch (error: IllegalStateException) {
            status.text = getString(R.string.live_error, error.message)
        }
    }
    @Deprecated("Platform callback")
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 60 && foreground) status.setText(
            if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) R.string.live_permission_ready
            else R.string.live_permission_denied)
    }
    @Deprecated("Platform callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 61) return
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null) { status.setText(R.string.sstv_cancelled); return }
        val snapshot = bitmap
        if (snapshot == null) { status.setText(R.string.live_image_lost); return }
        busy = true; controls()
        worker.execute {
            try {
                val stream = contentResolver.openOutputStream(uri, "wt") ?: throw IOException("Proveedor sin flujo de escritura.")
                stream.use { check(snapshot.compress(Bitmap.CompressFormat.PNG, 100, it)) { "No se pudo codificar PNG." } }
                exportResult(getString(R.string.sstv_saved))
            } catch (error: IOException) {
                exportResult(getString(R.string.live_error, error.message))
            } catch (error: SecurityException) {
                exportResult(getString(R.string.live_error, error.message))
            } catch (error: IllegalStateException) {
                exportResult(getString(R.string.live_error, error.message))
            } finally {
                runOnUiThread { if (!isDestroyed) { busy = false; controls() } }
            }
        }
    }
    private fun exportResult(message: String) {
        runOnUiThread { if (!isDestroyed) status.text = message }
    }
    override fun onResume() { super.onResume(); foreground = true }
    override fun onPause() {
        foreground = false
        stopCapture(true)
        super.onPause()
    }
    override fun onDestroy() {
        handler.removeCallbacks(deadline); worker.shutdownNow()
        super.onDestroy()
    }
}
