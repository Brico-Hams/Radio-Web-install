package org.bricohams.radio

import android.Manifest
import android.app.AlertDialog
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.View
import android.view.WindowInsets
import android.view.WindowManager
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.io.IOException
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Control of the Brico-Hams AZ/EL rotor (ESP32, Brico-Hams/antenaSatCommrotor) from the phone: the phone supplies
 * UTC, site, TLE and north/level calibration; the rotor runs its own SGP4 and keeps the antenna on the satellite
 * while CatActivity keeps correcting the radio Doppler.
 */
class RotorActivity : LocalizedActivity() {
    companion object {
        const val EXTRA_PLAN = "satellite-plan"
        private const val PREFERENCES = "rotor"
        private const val BLE_PERMISSION_REQUEST = 71
        private const val TRACK_SAMPLES = 300
        /** Host tests replace the radio link; arguments are (context, BLE selected, token). */
        internal var transportFactory: ((Context, Boolean, String) -> RotorTransport)? = null
    }

    private val colors by lazy { Brand.Palette(this) }
    private val worker = Executors.newSingleThreadScheduledExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var preferences: SharedPreferences
    private lateinit var status: TextView
    private lateinit var notice: TextView
    private lateinit var planInfo: TextView
    private lateinit var token: EditText
    private lateinit var transports: LinearLayout
    private lateinit var autoButton: TextView
    private var useBle = false
    private var plan: SatellitePlan? = null
    private var compass: RotorCompass? = null
    // Worker-thread state.
    private var client: RotorClient? = null
    private var lastTimeSync = 0L
    private var lastTrackAttempt = 0L
    private var lastReacquire = 0L
    private var failures = 0
    @Volatile private var last: RotorStatus? = null
    @Volatile private var armed = false
    @Volatile private var track: List<SatelliteLook> = emptyList()
    @Volatile private var destroyed = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        preferences = getSharedPreferences(PREFERENCES, MODE_PRIVATE)
        useBle = preferences.getBoolean("ble", false)
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = Brand.dp(this@RotorActivity, 16)
            setPadding(padding, padding, padding, padding)
        }
        val scroll = ScrollView(this).apply {
            setBackgroundColor(colors.background)
            addView(body)
            setOnApplyWindowInsetsListener { view, insets ->
                if (Build.VERSION.SDK_INT >= 30) {
                    val bars = insets.getInsets(WindowInsets.Type.systemBars())
                    view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                } else {
                    @Suppress("DEPRECATION")
                    view.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop,
                        insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
                }
                insets
            }
        }
        body.addView(Brand.heading(this, getString(R.string.rotor_title)))
        status = Brand.text(this, 15f).apply {
            setText(R.string.rotor_disconnected)
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        body.addView(Brand.card(this).apply { addView(status) })
        notice = Brand.text(this, 14f, colors.accent).apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        body.addView(notice)
        body.addView(Brand.button(this, getString(R.string.rotor_stop), true) { stopRotor() })

        body.addView(Brand.text(this, 13f, colors.muted).apply { setText(R.string.rotor_intro) })
        transports = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        body.addView(transports)
        renderTransports()
        token = EditText(this).apply {
            id = R.id.rotor_token
            setHint(R.string.rotor_token_hint)
            setTextColor(colors.text); setHintTextColor(colors.muted)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setText(preferences.getString("token", ""))
        }
        body.addView(token)
        body.addView(Brand.row(this,
            Brand.chip(this, getString(R.string.rotor_connect), true) { connect() },
            Brand.chip(this, getString(R.string.rotor_disconnect), false) { disconnect() }))

        planInfo = Brand.text(this, 14f)
        body.addView(Brand.card(this).apply { addView(planInfo) })
        body.addView(Brand.button(this, getString(R.string.rotor_home)) { action { it.home(); getString(R.string.rotor_homing_started) } })
        body.addView(Brand.button(this, getString(R.string.rotor_calibrate)) { calibrateDialog() })
        body.addView(Brand.button(this, getString(R.string.rotor_sync)) { action { synchronize(it) } })
        body.addView(Brand.button(this, getString(R.string.rotor_prepare)) { action { prepare(it) } })
        autoButton = Brand.button(this, getString(R.string.rotor_autotrack)) { toggleAutoTrack() }
        body.addView(autoButton)
        body.addView(Brand.button(this, getString(R.string.rotor_clear)) { action { it.clear(); getString(R.string.rotor_cleared) } })
        body.addView(Brand.text(this, 13f, colors.muted).apply { setText(R.string.rotor_safety) })
        setContentView(scroll)

        intent.getStringExtra(EXTRA_PLAN)?.let { text ->
            try { plan = SatellitePlanJson.decode(text) } catch (error: IllegalArgumentException) { notice.text = errorText(error) }
        }
        renderPlan()
        plan?.let { computeTrack(it) }
        worker.scheduleWithFixedDelay({ poll() }, 1, 1, TimeUnit.SECONDS)
    }

    override fun onDestroy() {
        destroyed = true
        armed = false
        compass?.stop()
        worker.execute { closeClient() }
        worker.shutdown()
        super.onDestroy()
    }

    private fun renderTransports() {
        transports.removeAllViews()
        transports.addView(Brand.chip(this, getString(R.string.rotor_transport_wifi), !useBle) { useBle = false; renderTransports() })
        transports.addView(Brand.chip(this, getString(R.string.rotor_transport_ble), useBle) { useBle = true; renderTransports() })
    }

    private fun ui(block: () -> Unit) = handler.post { if (!destroyed && !isFinishing) block() }

    /** Runs a rotor command serially with polling; the returned text is shown as result. */
    private fun action(command: (RotorClient) -> String) {
        notice.text = ""
        worker.execute {
            val message = try {
                val connected = client ?: throw LocalizedStateException(UiText(R.string.rotor_need_connection))
                command(connected)
            } catch (error: IOException) { errorText(error) }
            catch (error: IllegalArgumentException) { errorText(error) }
            catch (error: IllegalStateException) { errorText(error) }
            ui { notice.text = message }
        }
    }

    private fun connect() {
        val secret = token.text.toString().trim()
        if (!RotorProtocol.validToken(secret)) { notice.setText(R.string.rotor_err_token); return }
        preferences.edit().putString("token", secret).putBoolean("ble", useBle).apply()
        if (useBle && !blePermissions()) return
        status.setText(R.string.rotor_connecting)
        notice.text = if (useBle) getString(R.string.rotor_ble_warning) else ""
        val ble = useBle
        worker.execute {
            closeClient()
            try {
                val transport = transportFactory?.invoke(this, ble, secret)
                    ?: if (ble) BleRotorTransport(this, secret).also { it.connect() } else HttpRotorTransport(this, secret)
                val connected = RotorClient(transport)
                try {
                    val current = connected.status()
                    client = connected; failures = 0; lastTimeSync = 0
                    last = current
                    ui { render(current) }
                } catch (error: IOException) { connected.close(); throw error }
            } catch (error: IOException) { ui { status.setText(R.string.rotor_disconnected); notice.text = errorText(error) } }
            catch (error: IllegalArgumentException) { ui { status.setText(R.string.rotor_disconnected); notice.text = errorText(error) } }
            catch (error: SecurityException) { ui { status.setText(R.string.rotor_disconnected); notice.setText(R.string.rotor_permission_denied) } }
        }
    }

    private fun disconnect() {
        armed = false
        renderAuto()
        worker.execute { closeClient(); ui { status.setText(R.string.rotor_disconnected) } }
    }

    private fun closeClient() {
        try { client?.close() } catch (_: IOException) {}
        client = null; last = null
    }

    private fun blePermissions(): Boolean {
        val needed = if (Build.VERSION.SDK_INT >= 31) arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
            else arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
        val missing = needed.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isEmpty()) return true
        requestPermissions(missing.toTypedArray(), BLE_PERMISSION_REQUEST)
        return false
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != BLE_PERMISSION_REQUEST) return
        if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) connect()
        else notice.setText(R.string.rotor_permission_denied)
    }

    private fun savedObserver(): ObserverPosition? = try {
        val prefs = getSharedPreferences("satellite-observer", MODE_PRIVATE)
        ObserverPosition(prefs.getString("latitude", "")!!.toDouble(), prefs.getString("longitude", "")!!.toDouble(),
            prefs.getString("height", "0")!!.toDouble()).validated()
    } catch (error: NumberFormatException) { null } catch (error: IllegalArgumentException) { null }

    private fun observer(): ObserverPosition = plan?.observer ?: savedObserver()
        ?: throw LocalizedStateException(UiText(R.string.rotor_need_observer))

    // Worker thread.
    private fun syncTime(connected: RotorClient, current: RotorStatus): RotorTimeSync {
        val result = if (current.supportsAppTime) connected.syncTime(System.currentTimeMillis()) else RotorTimeSync.UNSUPPORTED
        lastTimeSync = System.currentTimeMillis()
        return result
    }

    private fun synchronize(connected: RotorClient): String {
        val time = syncTime(connected, connected.status())
        connected.setSite(observer())
        // The firmware drops the selected orbit when the site changes.
        plan?.let { connected.loadSatellite(it.tle) }
        return getString(when (time) {
            RotorTimeSync.APP -> R.string.rotor_time_synced
            RotorTimeSync.GNSS -> R.string.rotor_time_gnss
            RotorTimeSync.UNSUPPORTED -> R.string.rotor_time_unsupported
        })
    }

    private fun prepare(connected: RotorClient): String {
        val selected = plan ?: throw LocalizedStateException(UiText(R.string.rotor_need_plan))
        checkUi(System.currentTimeMillis() < selected.pass.los.time) { UiText(R.string.err_pass_ended) }
        var current = connected.status()
        checkUi(current.homed) { UiText(R.string.rotor_need_homing) }
        checkUi(!current.busy) { UiText(R.string.rotor_need_idle) }
        syncTime(connected, current)
        connected.setSite(selected.observer)
        connected.loadSatellite(selected.tle)
        current = connected.status()
        val target = acquisition(current, System.currentTimeMillis())
            ?: throw LocalizedStateException(UiText(R.string.rotor_err_track))
        connected.move(target.first, target.second)
        return getString(R.string.rotor_prepared, target.first, target.second)
    }

    /** Mechanical AZ/EL where the satellite will be when the antenna arrives (AOS point before the pass). */
    private fun acquisition(current: RotorStatus, now: Long): Pair<Double, Double>? {
        val points = track
        val first = points.firstOrNull { it.elevation >= 0 } ?: return null
        fun mechanical(look: SatelliteLook) = Pair(RotorPlanner.mechanical(look.azimuth, current.northOffset), look.elevation.coerceIn(0.0, 90.0))
        if (now < first.time) return mechanical(first)
        val here = SatellitePasses.at(points, now) ?: return null
        val travel = max(abs(RotorPlanner.mechanical(here.azimuth, current.northOffset) - current.azMechanical),
            abs(here.elevation - current.elevation)) / current.maxDegPerSecond
        val ahead = SatellitePasses.at(points, now + ((travel + 3) * 1000).toLong()) ?: return null
        if (ahead.elevation < 0 || ahead.elevation >= RotorPlanner.ZENITH_LIMIT) return null
        return mechanical(ahead)
    }

    private fun poll() {
        val connected = client ?: return
        try {
            var current = connected.status()
            val now = System.currentTimeMillis()
            if (current.supportsAppTime && current.timeSource != "gnss" && now - lastTimeSync > 60000) {
                syncTime(connected, current)
                current = connected.status()
            }
            failures = 0
            last = current
            if (armed) autoTrack(connected, current, now)
            ui { render(current) }
        } catch (error: IOException) {
            val text = errorText(error)
            if (++failures >= 5) { armed = false; closeClient(); ui { renderAuto(); status.setText(R.string.rotor_disconnected) } }
            ui { notice.text = text }
        } catch (error: RuntimeException) {
            ui { notice.text = errorText(error) }
        }
    }

    private fun autoTrack(connected: RotorClient, current: RotorStatus, now: Long) {
        val selected = plan ?: return
        if (now >= selected.pass.los.time || current.mode == "FAULT") {
            armed = false
            ui { renderAuto(); notice.setText(if (current.mode == "FAULT") R.string.rotor_autotrack_fault else R.string.pass_finished) }
            return
        }
        if (current.busy || now < selected.pass.aos.time - 1000 || now - lastTrackAttempt < 2000) return
        lastTrackAttempt = now
        val response = connected.track()
        when {
            response.code == 202 -> ui { notice.setText(R.string.rotor_tracking_started) }
            response.code == 409 && response.message().contains("Adquisicion") && now - lastReacquire > 10000 -> {
                val target = acquisition(current, now)
                if (target != null) {
                    lastReacquire = now
                    connected.move(target.first, target.second)
                    ui { notice.setText(R.string.rotor_tracking_reacquire) }
                }
            }
            else -> {
                val reason = response.message()
                ui { notice.text = getString(R.string.rotor_tracking_retry, reason) }
            }
        }
    }

    private fun toggleAutoTrack() {
        if (!armed && plan == null) { notice.setText(R.string.rotor_need_plan); return }
        armed = !armed
        lastTrackAttempt = 0
        renderAuto()
        notice.setText(if (armed) R.string.rotor_armed else R.string.rotor_disarmed)
    }

    private fun renderAuto() {
        autoButton.setText(if (armed) R.string.rotor_autotrack_cancel else R.string.rotor_autotrack)
        if (armed) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun stopRotor() {
        armed = false
        renderAuto()
        action { it.stop(); getString(R.string.rotor_stopped) }
    }

    private fun yes(value: Boolean) = getString(if (value) R.string.rotor_yes else R.string.rotor_no)

    private fun render(current: RotorStatus) {
        val time = getString(when {
            !current.utcValid -> R.string.rotor_time_none
            current.timeSource == "app" -> R.string.rotor_time_app
            else -> R.string.rotor_time_gnss_label
        })
        val lines = arrayListOf(
            getString(R.string.rotor_status_mode, current.mode, current.firmwareVersion, current.apiVersion,
                if (useBle) getString(R.string.rotor_transport_ble) else getString(R.string.rotor_transport_wifi)),
            getString(R.string.rotor_status_position, current.azMechanical, current.elevation, current.northOffset, current.maxDegPerSecond),
            getString(R.string.rotor_status_ready, yes(current.homed), yes(current.calibrated && current.level), time, yes(current.siteValid)))
        if (current.mode == "TRACKING" && current.skyAz.isFinite() && current.skyEl.isFinite())
            lines.add(getString(R.string.rotor_status_sky, current.skyAz, current.skyEl))
        if (current.fault.isNotEmpty()) lines.add(getString(R.string.rotor_status_fault, current.fault))
        else if (current.trackingBlocker.isNotEmpty()) lines.add(getString(R.string.rotor_status_blocker, current.trackingBlocker))
        status.text = lines.joinToString("\n")
        renderPlan()
    }

    private fun computeTrack(selected: SatellitePlan) {
        planInfo.setText(R.string.rotor_plan_computing)
        worker.execute {
            try {
                val source = assets.open("satellite-6.0.1.js").bufferedReader().use { it.readText() }
                val adapter = assets.open("orbital-engine.js").bufferedReader().use { it.readText() }
                val sampled = SatelliteOrbit(selected.tle, selected.observer, source, adapter).use { orbit ->
                    SatellitePasses.sample(selected.pass, TRACK_SAMPLES) { orbit.look(it) }
                }
                track = sampled
                ui { renderPlan() }
            } catch (error: IOException) { ui { planInfo.text = errorText(error) } }
            catch (error: IllegalArgumentException) { ui { planInfo.text = errorText(error) } }
            catch (error: IllegalStateException) { ui { planInfo.text = errorText(error) } }
        }
    }

    private fun renderPlan() {
        val selected = plan ?: run { planInfo.setText(R.string.rotor_no_plan); return }
        val points = track
        if (points.isEmpty()) return
        val current = last
        val north = current?.northOffset ?: 0.0
        val speed = current?.maxDegPerSecond ?: RotorStatus.REFERENCE_DEG_PER_SECOND
        val analysis = try { RotorPlanner.plan(points, north, speed) } catch (error: IllegalArgumentException) {
            planInfo.text = errorText(error); return
        }
        val clock = DateTimeFormatter.ofPattern("HH:mm:ss", Locale.ROOT).withZone(ZoneId.systemDefault())
        val lines = arrayListOf(getString(R.string.rotor_plan, selected.tle.name,
            clock.format(Instant.ofEpochMilli(selected.pass.aos.time)), clock.format(Instant.ofEpochMilli(selected.pass.los.time)),
            selected.pass.maximum.elevation, analysis.maxRateDegS, speed))
        val calibrated = current?.calibrated == true
        if (!calibrated) {
            analysis.suggestedCutAzimuth?.let { lines.add(getString(R.string.rotor_plan_cut_advice, it)) }
        } else {
            lines.add(getString(R.string.rotor_plan_aos, analysis.aosAzimuth, analysis.aosElevation))
            if (analysis.crossesCableStop) lines.add(analysis.suggestedCutAzimuth?.let {
                getString(R.string.rotor_plan_cable, analysis.cutAzimuth, it)
            } ?: getString(R.string.rotor_plan_cable_impossible))
        }
        if (analysis.tooFast) lines.add(getString(R.string.rotor_plan_fast))
        if (analysis.zenith) lines.add(getString(R.string.rotor_plan_zenith))
        if (calibrated && analysis.clean) lines.add(getString(R.string.rotor_plan_ok))
        else if (calibrated || analysis.tooFast || analysis.zenith)
            lines.add(getString(R.string.rotor_plan_trackable, (analysis.trackable * 100).roundToInt()))
        planInfo.text = lines.joinToString("\n")
    }

    private fun calibrateDialog() {
        val position = plan?.observer ?: savedObserver()
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = Brand.dp(this@RotorActivity, 20)
            setPadding(padding, padding / 2, padding, 0)
        }
        val headings = ArrayDeque<Double>()
        val reading = TextView(this)
        val field = EditText(this).apply {
            id = R.id.rotor_true_azimuth
            setHint(R.string.rotor_true_azimuth_hint)
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
        }
        val levelBox = CheckBox(this).apply { setText(R.string.rotor_level_confirm) }
        val sensor = RotorCompass(this) { value ->
            headings.addLast(value.trueAzimuth)
            while (headings.size > 25) headings.removeFirst()
            reading.text = getString(R.string.rotor_compass_reading, value.trueAzimuth, value.pitch, value.roll,
                getString(when {
                    value.accuracy <= android.hardware.SensorManager.SENSOR_STATUS_ACCURACY_LOW -> R.string.rotor_compass_unreliable
                    value.level -> R.string.rotor_compass_level
                    else -> R.string.rotor_compass_not_level
                }))
        }
        compass = sensor
        layout.addView(TextView(this).apply { text = getString(R.string.rotor_calibrate_help) })
        if (sensor.available) {
            sensor.start(position)
            layout.addView(TextView(this).apply { text = getString(R.string.rotor_declination, sensor.declination) })
            layout.addView(reading)
            layout.addView(Brand.button(this, getString(R.string.rotor_use_compass)) {
                RotorCompass.circularMean(headings.toList())?.let { field.setText(String.format(Locale.ROOT, "%.1f", it)) }
            })
        } else layout.addView(TextView(this).apply { setText(R.string.rotor_compass_missing) })
        layout.addView(field)
        layout.addView(levelBox)
        val dialog = AlertDialog.Builder(this)
            .setTitle(R.string.rotor_calibrate_title)
            .setView(ScrollView(this).apply { addView(layout) })
            .setPositiveButton(R.string.rotor_calibrate_send, null)
            .setNegativeButton(R.string.rotor_cancel, null)
            .setOnDismissListener { sensor.stop(); if (compass === sensor) compass = null }
            .create()
        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val azimuth = field.text.toString().trim().replace(',', '.').toDoubleOrNull()
                when {
                    azimuth == null || !azimuth.isFinite() || azimuth < 0 || azimuth >= 360 -> field.error = getString(R.string.rotor_err_azimuth)
                    !levelBox.isChecked -> levelBox.error = getString(R.string.rotor_level_required)
                    else -> {
                        dialog.dismiss()
                        action { it.calibrate(azimuth); getString(R.string.rotor_calibrated, azimuth) }
                    }
                }
            }
        }
        dialog.show()
    }
}
