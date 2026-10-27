package org.bricohams.radio

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.os.Build
import android.os.Bundle
import android.view.WindowInsets
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.io.IOException
import java.util.concurrent.Executors

class SstvActivity : Activity() {
    private val worker = Executors.newSingleThreadExecutor()
    private lateinit var status: TextView
    private lateinit var image: ImageView
    private lateinit var open: Button
    private lateinit var export: Button
    private var bitmap: Bitmap? = null
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
        status = TextView(this).apply { setText(R.string.sstv_intro); textSize = 17f }
        layout.addView(status)
        layout.addView(TextView(this).apply { setText(R.string.sstv_limits) })
        open = Button(this).apply {
            setText(R.string.sstv_open)
            setOnClickListener {
                startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE); type = "audio/*"
                }, 50)
            }
        }
        layout.addView(open)
        export = Button(this).apply {
            setText(R.string.sstv_export); isEnabled = false
            setOnClickListener {
                startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE); type = "image/png"
                    putExtra(Intent.EXTRA_TITLE, "bricohams-robot36.png")
                }, 51)
            }
        }
        layout.addView(export)
        image = ImageView(this).apply {
            adjustViewBounds = true
            contentDescription = getString(R.string.sstv_image_description)
        }
        layout.addView(image)
        setContentView(ScrollView(this).apply { addView(layout) })
    }
    @Deprecated("Platform callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode !in 50..51) return
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null) {
            status.setText(R.string.sstv_cancelled)
            return
        }
        val snapshot = bitmap
        open.isEnabled = false; export.isEnabled = false
        if (requestCode == 50) {
            bitmap = null
            image.setImageDrawable(null)
        }
        status.setText(R.string.sstv_working)
        worker.execute {
            try {
                if (requestCode == 50) {
                    val bytes = contentResolver.readDocument(uri, MorseAudio.MAX_WAV_BYTES)
                    val result = Robot36.decode(MorseAudio.readWav(bytes))
                    val decoded = Bitmap.createBitmap(result.pixels, Robot36.WIDTH, Robot36.HEIGHT, Bitmap.Config.ARGB_8888)
                    runOnUiThread {
                        if (!isDestroyed) {
                            bitmap = decoded; image.setImageBitmap(decoded)
                            status.text = getString(R.string.sstv_complete, result.startSeconds, result.warning.resolve(this@SstvActivity))
                        } else decoded.recycle()
                    }
                } else {
                    requireNotNull(snapshot) { getString(R.string.sstv_image_lost) }
                    val stream = contentResolver.openOutputStream(uri, "wt") ?: throw IOException(getString(R.string.provider_no_stream))
                    stream.use { check(snapshot.compress(Bitmap.CompressFormat.PNG, 100, it)) { getString(R.string.png_encode_error) } }
                    runOnUiThread { if (!isDestroyed) status.setText(R.string.sstv_saved) }
                }
            } catch (error: IllegalArgumentException) {
                report(error)
            } catch (error: IOException) {
                report(error)
            } catch (error: SecurityException) {
                report(error)
            } catch (error: IllegalStateException) {
                report(error)
            } finally {
                runOnUiThread {
                    if (!isDestroyed) { open.isEnabled = true; export.isEnabled = bitmap != null }
                }
            }
        }
    }
    private fun report(error: Exception) {
        runOnUiThread { if (!isDestroyed) status.text = getString(R.string.sstv_error, errorText(error)) }
    }
    override fun onDestroy() {
        worker.shutdownNow()
        super.onDestroy()
    }
}
