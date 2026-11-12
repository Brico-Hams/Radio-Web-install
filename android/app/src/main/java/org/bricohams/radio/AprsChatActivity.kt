package org.bricohams.radio

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.View
import android.view.WindowInsets
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.TextView
import java.io.IOException
import java.util.concurrent.Executors

/**
 * APRS chat over a KISS link chosen by the user: the RT-950 Pro (BLE KISS) or an external TNC over TCP. Radios without
 * APRS/KISS reachable from the app are not offered as sources; see [AprsChatRadios] and docs/APRS-CHAT-RADIOS.md.
 */
class AprsChatActivity : LocalizedActivity() {
    private companion object {
        const val PERMISSION_REQUEST = 96
        const val PREFERENCES = "aprs-chat"
        const val SCAN_MS = 15_000L
    }

    private val colors by lazy { Brand.Palette(this) }
    private val worker = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private lateinit var preferences: android.content.SharedPreferences
    private lateinit var chat: AprsChatPanel
    @Volatile private var link: KissLink? = null
    private var stopScan: (() -> Unit)? = null
    private val found = HashSet<String>()

    private lateinit var status: TextView
    private lateinit var notice: TextView
    private lateinit var diagnostic: TextView
    private lateinit var targetGroup: RadioGroup
    private lateinit var rtx1Check: CheckBox
    private lateinit var bleGroup: LinearLayout
    private lateinit var tcpGroup: LinearLayout
    private lateinit var devices: LinearLayout
    private lateinit var hostEdit: EditText
    private lateinit var portEdit: EditText

    private val ticker = object : Runnable {
        override fun run() {
            chat.tick()
            mainHandler.postDelayed(this, 1000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        preferences = getSharedPreferences(PREFERENCES, MODE_PRIVATE)
        chat = AprsChatPanel(this, preferences, colors, worker, { link }) { notice.text = it }
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = Brand.dp(this@AprsChatActivity, 16)
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
        body.addView(Brand.heading(this, getString(R.string.aprs_chat_title)))
        status = live(Brand.text(this, 15f)).apply { setText(R.string.aprs_chat_disconnected) }
        body.addView(Brand.card(this).apply { addView(status) })
        diagnostic = live(Brand.text(this, 12f, colors.muted))
        body.addView(diagnostic)
        notice = live(Brand.text(this, 14f, colors.accent))
        body.addView(notice)
        body.addView(note(R.string.aprs_chat_intro))
        bleGroup = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; visibility = View.GONE }
        tcpGroup = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; visibility = View.GONE }
        body.addView(Brand.card(this).apply {
            addView(title(R.string.aprs_chat_link_section))
            ChatLink.values().filter { kind -> AprsChatRadios.chatSources.any { it.link == kind } }.forEach { kind ->
                addView(Brand.button(this@AprsChatActivity, getString(kind.label), false) { select(kind) })
            }
            addView(bleGroup)
            addView(tcpGroup)
        })
        buildBle()
        buildTcp()
        body.addView(Brand.card(this).apply {
            addView(title(R.string.rt950_section_messages))
            chat.build(this, R.string.aprs_chat_help)
        })
        body.addView(Brand.card(this).apply {
            addView(title(R.string.aprs_chat_status_section))
            addView(Brand.text(this@AprsChatActivity, 12f, colors.muted).apply {
                text = AprsChatRadios.ALL.joinToString("\n\n") {
                    getString(R.string.aprs_chat_radio_row, it.name, getString(it.path.label), getString(it.status.label), it.source)
                }
            })
        })
        setContentView(scroll)
        mainHandler.post(ticker)
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        stopScan?.invoke()
        val open = link
        link = null
        worker.execute { open?.close() }
        worker.shutdown()
        super.onDestroy()
    }

    private fun live(view: TextView) = view.apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }

    private fun note(text: Int) = Brand.text(this, 13f, colors.muted).apply { setText(text) }

    private fun title(text: Int) = Brand.text(this, 18f, colors.accent, true).apply {
        setText(text)
        if (Build.VERSION.SDK_INT >= 28) isAccessibilityHeading = true
    }

    private fun edit(parent: LinearLayout, label: Int, initial: String, type: Int) = EditText(this).apply {
        setTextColor(colors.text); setHintTextColor(colors.muted)
        inputType = type
        setText(initial)
        contentDescription = getString(label)
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        parent.addView(note(label)); parent.addView(this)
    }

    private fun button(parent: LinearLayout, label: Int, primary: Boolean = false, action: () -> Unit): Button =
        Brand.button(this, getString(label), primary, action).also { parent.addView(it) }

    private fun work(task: () -> Unit) = worker.execute {
        try { task() } catch (error: Exception) { runOnUiThread { notice.text = errorText(error) } }
    }

    private fun select(kind: ChatLink) {
        stopScan?.invoke(); stopScan = null
        work { closeLink() }
        bleGroup.visibility = if (kind == ChatLink.RT950_BLE) View.VISIBLE else View.GONE
        tcpGroup.visibility = if (kind == ChatLink.KISS_TCP) View.VISIBLE else View.GONE
        notice.text = ""
    }

    private fun closeLink() {
        val open = link
        link = null
        open?.close()
        runOnUiThread { status.setText(R.string.aprs_chat_disconnected); diagnostic.text = "" }
    }

    private fun attach(opened: KissLink, label: String) {
        opened.onFrame = chat::onFrame
        opened.onClosed = { runOnUiThread { if (link === opened) { link = null; status.setText(R.string.aprs_chat_link_lost) } } }
        link = opened
        runOnUiThread { status.text = getString(R.string.aprs_chat_connected, label); notice.text = "" }
    }

    // RT-950 Pro over BLE KISS

    private fun buildBle() {
        bleGroup.addView(note(R.string.rt950_msg_help))
        bleGroup.addView(title(R.string.aprs_chat_advanced))
        bleGroup.addView(note(R.string.aprs_chat_advanced_help))
        val ffe1 = preferences.getString("ble-target", KissWriteTarget.FF31.name) == KissWriteTarget.FFE1.name
        targetGroup = RadioGroup(this).apply {
            orientation = RadioGroup.VERTICAL
            listOf(KissWriteTarget.FF31 to R.string.aprs_chat_target_ff31, KissWriteTarget.FFE1 to R.string.aprs_chat_target_ffe1).forEach { (target, label) ->
                addView(RadioButton(this@AprsChatActivity).apply {
                    id = View.generateViewId(); tag = target
                    setText(label); setTextColor(colors.text)
                    minHeight = Brand.dp(this@AprsChatActivity, 48)
                    isChecked = (target == KissWriteTarget.FFE1) == ffe1
                })
            }
        }
        bleGroup.addView(targetGroup)
        rtx1Check = CheckBox(this).apply {
            setText(R.string.aprs_chat_rtx1); setTextColor(colors.text)
            isChecked = preferences.getBoolean("ble-rtx1", false)
            minHeight = Brand.dp(this@AprsChatActivity, 48)
        }
        bleGroup.addView(rtx1Check)
        button(bleGroup, R.string.rt950_scan, true) { startScan() }
        devices = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        bleGroup.addView(devices)
        button(bleGroup, R.string.rt950_disconnect) { work { closeLink() } }
    }

    private fun kissOptions(): Rt950KissOptions {
        val checked = targetGroup.findViewById<RadioButton>(targetGroup.checkedRadioButtonId)
        return Rt950KissOptions(checked?.tag as? KissWriteTarget ?: KissWriteTarget.FF31, rtx1Check.isChecked)
    }

    private fun blePermissions(): Boolean {
        val needed = if (Build.VERSION.SDK_INT >= 31) arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
            else arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
        val missing = needed.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isEmpty()) return true
        requestPermissions(missing.toTypedArray(), PERMISSION_REQUEST)
        return false
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != PERMISSION_REQUEST) return
        if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) startScan()
        else notice.setText(R.string.rt950_permission_denied)
    }

    private fun startScan() {
        if (!blePermissions()) return
        stopScan?.invoke()
        devices.removeAllViews(); found.clear()
        try {
            stopScan = BleRt950Transport.scan(this) { _, address ->
                runOnUiThread { if (found.add(address)) devices.addView(Brand.button(this, getString(R.string.rt950_device, address), false) { connectBle(address) }) }
            }
            notice.setText(R.string.rt950_scanning)
            mainHandler.postDelayed({ stopScan?.invoke(); stopScan = null }, SCAN_MS)
        } catch (error: IOException) {
            notice.text = errorText(error)
        }
    }

    private fun connectBle(address: String) {
        stopScan?.invoke(); stopScan = null
        status.setText(R.string.rt950_connecting)
        val options = kissOptions()
        preferences.edit().putString("ble-target", options.target.name).putBoolean("ble-rtx1", options.rtx1Prefix).apply()
        work {
            closeLink()
            val transport = BleRt950Transport(this, address)
            try {
                transport.connectKiss(options)
            } catch (error: Exception) {
                transport.close()
                runOnUiThread { status.setText(R.string.aprs_chat_disconnected) }
                throw error
            }
            val opened = Rt950BleKissLink.overKiss(transport, options)
            transport.onLost = { opened.onClosed?.invoke() }
            attach(opened, address)
            runOnUiThread { diagnostic.text = getString(R.string.aprs_chat_gatt_diag, transport.diagnostics) }
        }
    }

    // External KISS TNC over TCP

    private fun buildTcp() {
        tcpGroup.addView(note(R.string.aprs_chat_tcp_help))
        hostEdit = edit(tcpGroup, R.string.aprs_chat_host, preferences.getString("host", "") ?: "",
            InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI)
        portEdit = edit(tcpGroup, R.string.aprs_chat_port, preferences.getString("port", "") ?: "", InputType.TYPE_CLASS_NUMBER)
        button(tcpGroup, R.string.aprs_chat_connect, true) { connectTcp() }
        button(tcpGroup, R.string.rt950_disconnect) { work { closeLink() } }
    }

    private fun connectTcp() {
        val host = hostEdit.text.toString().trim()
        val port: Int
        try {
            port = TcpKissLink.parsePort(portEdit.text.toString())
        } catch (error: IllegalArgumentException) {
            notice.text = errorText(error)
            return
        }
        preferences.edit().putString("host", host).putString("port", port.toString()).apply()
        status.setText(R.string.rt950_connecting)
        work {
            closeLink()
            try {
                attach(TcpKissLink.connect(host, port), "$host:$port")
            } catch (error: Exception) {
                runOnUiThread { status.setText(R.string.aprs_chat_disconnected) }
                throw error
            }
        }
    }
}
