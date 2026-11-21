package org.bricohams.stationagent

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.app.PendingIntent
import android.content.Intent
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.View
import android.view.WindowManager
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.Switch
import android.widget.TextView
import org.bricohams.radio.AnonymousDiagnostics

class AgentActivity : Activity() {
    private val app get() = application as AgentApplication
    private val handler = Handler(Looper.getMainLooper())
    private val devices = mutableListOf<UsbDevice>()
    private lateinit var host: EditText
    private lateinit var token: EditText
    private lateinit var device: Spinner
    private lateinit var port: Spinner
    private lateinit var baud: Spinner
    private lateinit var status: TextView
    private lateinit var connect: Button
    private val update = object : Runnable {
        override fun run() {
            status.setText(app.status)
            connect.isEnabled = !app.running && app.pending == null
            handler.postDelayed(this, 500)
        }
    }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val margin = (20 * resources.displayMetrics.density).toInt()
            setPadding(margin, margin, margin, margin)
        }
        setContentView(ScrollView(this).apply { addView(body) })
        fun label(resource: Int) = TextView(this).apply {
            setText(resource); textSize = 16f
            body.addView(this)
        }
        fun input(resource: Int, secret: Boolean = false) = EditText(this).apply {
            setHint(resource)
            inputType = InputType.TYPE_CLASS_TEXT or if (secret) InputType.TYPE_TEXT_VARIATION_PASSWORD else InputType.TYPE_TEXT_VARIATION_URI
            isSaveEnabled = false
            importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
            body.addView(this)
        }
        fun select(labels: List<String>) = Spinner(this).apply {
            adapter = ArrayAdapter(this@AgentActivity, android.R.layout.simple_spinner_dropdown_item, labels)
            isSaveEnabled = false
            body.addView(this)
        }
        fun button(resource: Int, action: () -> Unit) = Button(this).apply {
            setText(resource); setOnClickListener { action() }; body.addView(this)
        }
        body.addView(ImageView(this).apply {
            setImageResource(R.drawable.bricohams_logo)
            contentDescription = getString(R.string.app_name)
            adjustViewBounds = true
            maxHeight = (80 * resources.displayMetrics.density).toInt()
        })
        label(R.string.app_name).textSize = 24f
        label(R.string.readonly_notice)
        label(R.string.unsupported_notice)
        status = label(app.status)
        host = input(R.string.host_url)
        token = input(R.string.agent_token, true)
        device = select(listOf(getString(R.string.select_device)))
        button(R.string.refresh) {
            if (!app.running && app.pending == null) refreshDevices()
        }
        port = select(listOf(getString(R.string.select_interface), "Enhanced MI_00 / 0"))
        baud = select(listOf(getString(R.string.select_baud), "38400 / 8N1"))
        connect = button(R.string.connect) { connect() }
        button(R.string.disconnect) {
            app.pending = null
            stopService(Intent(this, AgentService::class.java))
            app.status = R.string.disconnected
        }
        if (Build.VERSION.SDK_INT >= 33) button(R.string.notifications) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        }
        label(R.string.privacy)
        val reporter = input(R.string.reporter_token, true)
        val consent = Switch(this).apply {
            setText(R.string.diagnostics_consent)
            isChecked = AnonymousDiagnostics.enabled()
            isSaveEnabled = false
            setOnCheckedChangeListener { _, checked ->
                if (!checked) AnonymousDiagnostics.disable()
                else {
                    try {
                        AgentConfig.validateToken(reporter.text.toString())
                        require(reporter.text.toString() != token.text.toString()) { "Separate diagnostic token required" }
                        AnonymousDiagnostics.enable(host.text.toString(), reporter.text.toString())
                    } catch (error: IllegalArgumentException) {
                        isChecked = false
                        AnonymousDiagnostics.record("operation_failed", "settings", "warning", error)
                        dialog(getString(R.string.input_failed))
                    }
                }
            }
        }
        body.addView(consent)
        button(R.string.preview_diagnostics) {
            AnonymousDiagnostics.inspect { result ->
                runOnUiThread {
                    dialog(if (result.isSuccess) result.getOrNull() ?: getString(R.string.no_events) else getString(R.string.diagnostics_failed))
                }
            }
        }
        button(R.string.clear_diagnostics) {
            consent.isChecked = false
            AnonymousDiagnostics.clear { result ->
                runOnUiThread {
                    dialog(getString(if (result.isSuccess) R.string.cleared else R.string.diagnostics_failed))
                }
            }
        }
        refreshDevices()
    }

    private fun dialog(message: String) {
        if (!isFinishing && !isDestroyed) AlertDialog.Builder(this)
            .setMessage(message).setPositiveButton(android.R.string.ok, null).show()
    }

    private fun refreshDevices() {
        devices.clear()
        devices.addAll(getSystemService(UsbManager::class.java).deviceList.values.filter {
            it.vendorId == 0x10c4 && it.productId == 0xea70 && it.interfaceCount == 2
        }.sortedBy { it.deviceName })
        device.adapter = ArrayAdapter(
            this, android.R.layout.simple_spinner_dropdown_item,
            listOf(getString(R.string.select_device)) + devices.map { "CP2105 ${it.deviceName}" }
        )
    }

    private fun connect() {
        if (app.running || app.pending != null) {
            dialog(getString(R.string.connecting))
            return
        }
        try {
            require(device.selectedItemPosition in 1..devices.size &&
                port.selectedItemPosition == 1 && baud.selectedItemPosition == 1) { "Select USB explicitly" }
            val selected = devices[device.selectedItemPosition - 1]
            app.pending = AgentConfig(host.text.toString(), token.text.toString(), selected.deviceName, 0, 38400)
            app.status = R.string.connecting
            val manager = getSystemService(UsbManager::class.java)
            if (manager.hasPermission(selected)) UsbPermissionReceiver.begin(this)
            else {
                val intent = Intent(this, UsbPermissionReceiver::class.java).setAction(UsbPermissionReceiver.ACTION)
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
                manager.requestPermission(selected, PendingIntent.getBroadcast(this, 0, intent, flags))
            }
        } catch (error: IllegalArgumentException) {
            app.pending = null
            app.status = R.string.input_failed
            AnonymousDiagnostics.record("operation_failed", "settings", "warning", error)
            dialog(getString(R.string.input_failed))
        } catch (error: SecurityException) {
            app.pending = null
            app.status = R.string.permission_failed
            AnonymousDiagnostics.record("usb_failed", "usb", "warning", error)
            dialog(getString(R.string.permission_failed))
        }
    }

    override fun onResume() {
        super.onResume()
        handler.post(update)
    }
    override fun onPause() {
        handler.removeCallbacks(update)
        super.onPause()
    }
}
