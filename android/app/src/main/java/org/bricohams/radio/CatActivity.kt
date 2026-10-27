package org.bricohams.radio

import android.app.Activity
import android.Manifest
import android.app.AlertDialog
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.view.WindowInsets
import java.io.IOException
import java.util.concurrent.CancellationException
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class CatActivity : Activity() {
    private val worker = Executors.newSingleThreadScheduledExecutor()
    private val audioWorker = Executors.newSingleThreadExecutor()
    private lateinit var callsign: EditText
    private lateinit var sstvStatus: TextView
    private lateinit var picture: ImageView
    private var capture: LiveAudio? = null
    private var passRecorder: PassRecorder? = null
    private val manager by lazy { getSystemService(USB_SERVICE) as UsbManager }
    private lateinit var status: TextView
    private var requested: UsbDevice? = null
    private var permissionResult = false
    private var transport: RadioBytes? = null
    private var protocol: CatProtocol? = null
    private var busy = false
    @Volatile private var foreground = false
    @Volatile private var generation = 0
    private val controls = ArrayList<Button>()
    private var selectedPlan: SatellitePlan? = null
    @Volatile private var trackingRequested = false
    @Volatile private var tracker: SatelliteTracking? = null
    private var orbit: SatelliteOrbit? = null
    private val detachReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            @Suppress("DEPRECATION")
            val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
            if (intent.action == UsbManager.ACTION_USB_DEVICE_DETACHED && device?.deviceName == requested?.deviceName) {
                requested = null
                suspendConnection(getString(R.string.cat_usb_detached))
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = (16 * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
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
        status = TextView(this).apply {
            setText(R.string.cat_intro)
            textSize = 17f
        }
        content.addView(status)
        content.addView(TextView(this).apply {
            setText(R.string.cat_help)
        })
        fun button(label: Int, action: () -> Unit) {
            val button = Button(this).apply { setText(label); setOnClickListener { action() } }
            controls.add(button); content.addView(button)
        }
        button(R.string.cat_choose_device) { chooseDevice() }
        button(R.string.cat_query) { operation { requireNotNull(protocol) { getString(R.string.cat_connect_first) }.query() } }
        content.addView(TextView(this).apply { setText(R.string.cat_frequency_label) })
        val frequency = EditText(this).apply {
            id = R.id.cat_frequency
            hint = "145.80000"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
        }
        content.addView(frequency)
        button(R.string.cat_tune) {
            val value = frequency.text.toString().toBigDecimalOrNull()
            val scaled = value?.movePointRight(5)?.stripTrailingZeros()
            if (scaled == null || scaled.scale() > 0 || scaled < java.math.BigDecimal(13600000) ||
                scaled > java.math.BigDecimal(47000000) || !CatProtocol.inBand(scaled.toLong())) {
                status.setText(R.string.cat_invalid_frequency)
            } else operation { requireNotNull(protocol) { getString(R.string.cat_connect_first) }.tune(scaled.longValueExact()) }
        }
        button(R.string.cat_stop) { operation { requireNotNull(protocol) { getString(R.string.cat_connect_first) }.stop() } }
        button(R.string.usb_disconnect) { operation { closeRadio(); null } }
        content.addView(TextView(this).apply { setText(R.string.cat_sstv_help) })
        callsign = EditText(this).apply {
            id = R.id.cat_callsign
            setHint(R.string.cat_callsign_hint)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS
        }
        content.addView(callsign)
        button(R.string.cat_send_robot36) { chooseImage() }
        content.addView(Button(this).apply { setText(R.string.cat_sstv_record); setOnClickListener { startReceive() } })
        content.addView(Button(this).apply { setText(R.string.cat_sstv_stop); setOnClickListener { capture?.stop() } })
        sstvStatus = TextView(this)
        content.addView(sstvStatus)
        picture = ImageView(this).apply { adjustViewBounds = true; contentDescription = getString(R.string.sstv_image_description) }
        content.addView(picture)
        val planText = intent.getStringExtra("satellite-plan")
        if (planText != null) {
            try {
                selectedPlan = SatellitePlanJson.decode(planText)
                val plan = requireNotNull(selectedPlan)
                content.addView(TextView(this).apply {
                    text = getString(R.string.cat_selected_pass, plan.tle.name,
                        java.time.Instant.ofEpochMilli(plan.pass.aos.time).toString(),
                        java.time.Instant.ofEpochMilli(plan.pass.los.time).toString(),
                        plan.downlinkHz.toString())
                })
                button(R.string.cat_start_tracking) { startTracking() }
                content.addView(Button(this).apply {
                    setText(R.string.cat_stop_tracking)
                    setOnClickListener {
                        trackingRequested = false
                        tracker?.cancel()
                        suspendConnection(getString(R.string.cat_tracking_stopped))
                    }
                })
                content.addView(Button(this).apply { setText(R.string.cat_pass_record); setOnClickListener { startPassRecording(plan) } })
                content.addView(Button(this).apply { setText(R.string.cat_pass_record_stop); setOnClickListener { passRecorder?.stop() } })
            } catch (error: IllegalArgumentException) {
                status.text = getString(R.string.cat_plan_error, errorText(error))
            }
        }
        setContentView(ScrollView(this).apply { addView(content) })
    }

    private fun chooseDevice() {
        if (busy) return
        val devices = manager.deviceList.values.filter { SerialRadio.description(it) != null }.sortedBy { it.deviceName }
        if (devices.isEmpty()) {
            status.setText(R.string.cat_no_devices)
            return
        }
        AlertDialog.Builder(this).setTitle(R.string.usb_select_device)
            .setItems(devices.map { "VID %04X PID %04X - %s - %s".format(it.vendorId, it.productId, SerialRadio.description(it), it.deviceName) }.toTypedArray()) { _, index ->
                val device = devices[index]
                requested = device
                if (manager.hasPermission(device)) connect(device)
                else {
                    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                        if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
                    val intent = Intent(this, CatActivity::class.java).apply {
                        action = "org.bricohams.radio.USB_PERMISSION"
                        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    }
                    try {
                        manager.requestPermission(device, PendingIntent.getActivity(this, 11, intent, flags))
                        status.setText(R.string.cat_waiting_permission)
                    } catch (error: SecurityException) {
                        status.text = getString(R.string.cat_permission_error, errorText(error))
                    }
                }
            }.show()
    }
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.action != "org.bricohams.radio.USB_PERMISSION") return
        @Suppress("DEPRECATION")
        val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
        if (device == null || device.deviceName != requested?.deviceName) {
            status.setText(R.string.cat_stale_permission)
            return
        }
        permissionResult = true
        if (foreground) consumePermission()
    }
    private fun consumePermission() {
        if (!permissionResult) return
        permissionResult = false
        val device = requested
        if (device != null && manager.hasPermission(device)) connect(device)
        else status.setText(R.string.cat_permission_denied)
    }
    private fun connect(device: UsbDevice) {
        val token = generation
        operation {
            closeRadio()
            val port = SerialRadio.open(manager, device)
            transport = port
            val cat = CatProtocol(port, allowTune = { foreground && token == generation })
            protocol = cat
            cat.identify()
            cat.query()
        }
    }
    private fun chooseImage() {
        if (busy || trackingRequested || !foreground) return
        try {
            Callsign.normalize(callsign.text.toString())
            requireNotNull(protocol) { getString(R.string.cat_connect_first) }
        } catch (error: IllegalArgumentException) {
            sstvStatus.text = errorText(error)
            return
        }
        startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE); type = "image/*"
        }, 70)
    }
    @Deprecated("Platform callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 70) return
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null) { sstvStatus.setText(R.string.sstv_cancelled); return }
        val call = try { Callsign.normalize(callsign.text.toString()) } catch (error: IllegalArgumentException) {
            sstvStatus.text = errorText(error); return
        }
        audioWorker.execute {
            try {
                val bytes = contentResolver.readDocument(uri, 20 shl 20)
                val source = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: throw IOException(getString(R.string.cat_image_unknown))
                val frame = stamp(source, call)
                source.recycle()
                val pixels = IntArray(Robot36.WIDTH * Robot36.HEIGHT)
                frame.getPixels(pixels, 0, Robot36.WIDTH, 0, 0, Robot36.WIDTH, Robot36.HEIGHT)
                runOnUiThread { if (!isDestroyed && foreground) { picture.setImageBitmap(frame); confirmTransmit(call, pixels) } }
            } catch (error: IOException) {
                sstv(getString(R.string.sstv_error, errorText(error)))
            } catch (error: SecurityException) {
                sstv(getString(R.string.sstv_error, errorText(error)))
            } catch (error: IllegalArgumentException) {
                sstv(getString(R.string.sstv_error, errorText(error)))
            }
        }
    }
    /** 320x240 Robot36 frame with the station callsign printed on it: identification is mandatory. */
    private fun stamp(source: Bitmap, call: String): Bitmap {
        val frame = Bitmap.createScaledBitmap(source, Robot36.WIDTH, Robot36.HEIGHT, true).copy(Bitmap.Config.ARGB_8888, true)
        val canvas = Canvas(frame)
        canvas.drawRect(0f, 200f, 320f, 240f, Paint().apply { color = Color.BLACK })
        canvas.drawText(call, 8f, 232f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE; textSize = 32f; typeface = Typeface.DEFAULT_BOLD
        })
        return frame
    }
    private fun confirmTransmit(call: String, pixels: IntArray) {
        AlertDialog.Builder(this).setTitle(R.string.cat_transmit_title)
            .setMessage(getString(R.string.cat_transmit_message, call))
            .setNegativeButton(R.string.action_cancel) { _, _ -> sstvStatus.setText(R.string.sstv_cancelled) }
            .setPositiveButton(R.string.action_transmit) { _, _ ->
                val token = generation
                sstvStatus.setText(R.string.cat_sstv_sending)
                operation {
                    val cat = requireNotNull(protocol) { getString(R.string.cat_connect_first) }
                    val audio = Robot36.encode(pixels, LiveAudio.SAMPLE_RATE)
                    CatTransmitter(cat).send(audio, LiveAudio.SAMPLE_RATE, AudioTrackSink(LiveAudio.SAMPLE_RATE)) {
                        foreground && token == generation
                    }
                    getString(R.string.cat_robot36_sent, call, audio.size.toDouble() / LiveAudio.SAMPLE_RATE)
                }
            }.show()
    }
    private fun startPassRecording(plan: SatellitePlan) {
        if (capture != null || passRecorder != null || !foreground) return
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 71)
            return
        }
        if (System.currentTimeMillis() >= plan.pass.los.time) { sstvStatus.setText(R.string.cat_pass_over); return }
        val stamp = java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss", java.util.Locale.ROOT)
            .withZone(java.time.ZoneOffset.UTC).format(java.time.Instant.now())
        val file = java.io.File(java.io.File(filesDir, "recordings"), "$stamp-${plan.tle.norad}.wav")
        val recorder = PassRecorder(file, plan.pass.los.time)
        passRecorder = recorder
        sstvStatus.setText(R.string.cat_pass_recording)
        audioWorker.execute {
            val message = try {
                val samples = recorder.record()
                getString(R.string.cat_pass_saved, file.name, samples / PassRecorder.RATE / 60, samples / PassRecorder.RATE % 60)
            } catch (error: CancellationException) {
                getString(R.string.cat_pass_saved, file.name, 0, 0)
            } catch (error: IOException) {
                getString(R.string.sstv_error, errorText(error))
            } catch (error: IllegalStateException) {
                getString(R.string.sstv_error, errorText(error))
            } catch (error: SecurityException) {
                getString(R.string.sstv_error, errorText(error))
            }
            runOnUiThread { if (passRecorder === recorder) passRecorder = null; if (!isDestroyed) sstvStatus.text = message }
        }
    }
    private fun startReceive() {
        if (capture != null || passRecorder != null || !foreground) return
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 71)
            return
        }
        val recording = LiveAudio()
        capture = recording
        sstvStatus.setText(R.string.cat_sstv_recording)
        audioWorker.execute {
            val message = try {
                val result = Robot36.decode(recording.record())
                val decoded = Bitmap.createBitmap(result.pixels, Robot36.WIDTH, Robot36.HEIGHT, Bitmap.Config.ARGB_8888)
                runOnUiThread { if (!isDestroyed) picture.setImageBitmap(decoded) }
                getString(R.string.sstv_complete, result.startSeconds, result.warning.resolve(this@CatActivity))
            } catch (error: CancellationException) {
                getString(R.string.live_cancelled)
            } catch (error: IOException) {
                getString(R.string.sstv_error, errorText(error))
            } catch (error: IllegalArgumentException) {
                getString(R.string.sstv_error, errorText(error))
            } catch (error: IllegalStateException) {
                getString(R.string.sstv_error, errorText(error))
            } catch (error: SecurityException) {
                getString(R.string.sstv_error, errorText(error))
            }
            runOnUiThread { if (capture === recording) capture = null; if (!isDestroyed) sstvStatus.text = message }
        }
    }
    private fun sstv(message: String) {
        runOnUiThread { if (!isDestroyed) sstvStatus.text = message }
    }
    @Deprecated("Platform callback")
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 71) sstvStatus.setText(
            if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) R.string.live_permission_ready
            else R.string.live_permission_denied)
    }
    private fun operation(action: () -> Any?) {
        if (busy || trackingRequested || !foreground) return
        busy = true
        controls.forEach { it.isEnabled = false }
        val token = generation
        worker.execute {
            if (token != generation) return@execute
            var message: String
            try {
                val state = action()
                message = if (state == null) getString(R.string.usb_disconnected) else if (state !is CatState) state.toString() else
                    getString(R.string.cat_state, state.active.toString(), state.remote.toString(), state.pending.toString(),
                        state.frequency10Hz * 10)
            } catch (error: IOException) {
                message = fail(error)
            } catch (error: IllegalArgumentException) {
                message = fail(error)
            } catch (error: IllegalStateException) {
                message = fail(error)
            } catch (error: SecurityException) {
                message = fail(error)
            } catch (error: UnsupportedOperationException) {
                message = fail(error)
            }
            runOnUiThread {
                if (token == generation && !isDestroyed) {
                    busy = false; controls.forEach { it.isEnabled = true }; status.text = message
                }
            }
        }
    }
    private fun fail(error: Exception): String {
        val port = transport
        protocol = null; transport = null
        return try {
            port?.close()
            getString(R.string.cat_failed_closed, errorText(error))
        } catch (cleanup: IOException) {
            getString(R.string.cat_failed_release, errorText(error), errorText(cleanup))
        }
    }
    private fun closeRadio() {
        val cat = protocol
        val port = transport
        protocol = null; transport = null
        var failure: Exception? = null
        try {
            if (cat != null) {
                val state = cat.query()
                if (state.active && (state.remote || state.pending)) cat.stop()
            }
        } catch (error: IOException) {
            failure = error
        } catch (error: IllegalArgumentException) {
            failure = error
        } catch (error: IllegalStateException) {
            failure = error
        } catch (error: SecurityException) {
            failure = error
        } catch (error: UnsupportedOperationException) {
            failure = error
        } finally {
            try { port?.close() } catch (error: IOException) {
                if (failure == null) failure = error else failure.addSuppressed(error)
            }
        }
        failure?.let { throw IOException(getString(R.string.cat_restore_unconfirmed, errorText(it)), it) }
    }
    override fun onStart() {
        super.onStart()
        foreground = true
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(detachReceiver, IntentFilter(UsbManager.ACTION_USB_DEVICE_DETACHED), RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(detachReceiver, IntentFilter(UsbManager.ACTION_USB_DEVICE_DETACHED))
        }
        consumePermission()
    }
    private fun suspendConnection(message: String) {
        trackingRequested = false
        tracker?.cancel()
        generation++
        val token = generation
        busy = false
        controls.forEach { it.isEnabled = true }
        worker.execute {
            disposeOrbit()
            try { closeRadio() } catch (error: IOException) {
                android.util.Log.e("BricohamsCAT", "No se confirmo STOP/cierre al ocultar pantalla", error)
                runOnUiThread {
                    if (token == generation && !isDestroyed)
                        status.text = getString(R.string.cat_stop_error, errorText(error))
                }
            }
        }
        status.text = message
    }
    private fun disposeOrbit() {
        tracker?.cancel()
        tracker = null
        orbit?.close()
        orbit = null
    }
    private fun startTracking() {
        if (busy || trackingRequested || !foreground) return
        val plan = selectedPlan ?: return
        val token = generation
        trackingRequested = true
        controls.forEach { it.isEnabled = false }
        status.setText(R.string.cat_tracking_start)
        worker.execute {
            if (token != generation || !trackingRequested) return@execute
            try {
                val cat = requireNotNull(protocol) { getString(R.string.cat_connect_before_tracking) }
                val engine = SatelliteOrbit(plan.tle, plan.observer,
                    assets.open("satellite-6.0.1.js").bufferedReader().use { it.readText() },
                    assets.open("orbital-engine.js").bufferedReader().use { it.readText() })
                orbit = engine
                tracker = SatelliteTracking({ engine.target(plan, it) }, { frequency, permit -> cat.tune(frequency, permit) })
                trackingStep(token)
            } catch (error: IllegalArgumentException) { trackingError(token, error) }
            catch (error: IllegalStateException) { trackingError(token, error) }
            catch (error: IOException) { trackingError(token, error) }
        }
    }
    private fun trackingStep(token: Int) {
        if (token != generation || !trackingRequested) return
        try {
            val current = requireNotNull(tracker) { getString(R.string.cat_no_tracking_session) }
            val next = current.step()
            if (next != null && token == generation && trackingRequested) {
                runOnUiThread {
                    if (!isDestroyed && token == generation && trackingRequested)
                        status.text = getString(R.string.cat_tracking_status, next.frequency10Hz * 10, next.look.azimuth, next.look.elevation)
                }
                worker.schedule({ trackingStep(token) }, 750, TimeUnit.MILLISECONDS)
            }
        } catch (error: IllegalArgumentException) { trackingError(token, error) }
        catch (error: IllegalStateException) { trackingError(token, error) }
        catch (error: IOException) { trackingError(token, error) }
        catch (error: SecurityException) { trackingError(token, error) }
        catch (error: UnsupportedOperationException) { trackingError(token, error) }
    }
    private fun trackingError(token: Int, error: Exception) {
        if (token != generation) return
        trackingRequested = false
        disposeOrbit()
        var message = getString(R.string.cat_tracking_failed, errorText(error))
        try { closeRadio() } catch (cleanup: IOException) {
            message += " " + getString(R.string.cat_tracking_cleanup_failed, errorText(cleanup))
        }
        val finalMessage = message
        runOnUiThread {
            if (!isDestroyed && token == generation) {
                controls.forEach { it.isEnabled = true }
                status.text = finalMessage
            }
        }
    }
    override fun onStop() {
        foreground = false
        unregisterReceiver(detachReceiver)
        capture?.cancel()
        passRecorder?.stop()
        suspendConnection(getString(R.string.cat_suspended))
        super.onStop()
    }
    override fun onDestroy() {
        worker.shutdown()
        audioWorker.shutdownNow()
        super.onDestroy()
    }
}
