package org.bricohams.radio

import android.app.Activity
import android.app.AlertDialog
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.view.WindowInsets
import android.view.WindowManager
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import java.io.File
import java.io.IOException
import java.util.concurrent.Executors

/** Quansheng F4HWN v6 channel editor (frequency, sub-tones, power) with full backup and re-read, as the web editor. */
class ChannelActivity : LocalizedActivity() {
    private val worker = Executors.newSingleThreadExecutor()
    private val manager by lazy { getSystemService(USB_SERVICE) as UsbManager }
    private lateinit var status: TextView
    private lateinit var name: EditText
    private lateinit var rx: EditText
    private lateinit var tx: EditText
    private lateinit var rxTone: EditText
    private lateinit var txTone: EditText
    private lateinit var power: Spinner
    private lateinit var narrow: CheckBox
    private lateinit var txLock: CheckBox
    private val controls = ArrayList<Button>()
    private var requested: UsbDevice? = null
    private var permissionResult = false
    @Volatile private var foreground = false
    @Volatile private var generation = 0
    private var busy = false
    // Session state: a new USB connection always needs a new backup, like the web connector.
    private var transport: RadioBytes? = null
    private var memory: QuanshengMemory? = null
    private var receipt: QuanshengBackups.Receipt? = null
    private var original: ByteArray? = null
    private var working: ByteArray? = null
    private var selected: Int? = null
    private val detachReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            @Suppress("DEPRECATION")
            val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
            if (intent.action == UsbManager.ACTION_USB_DEVICE_DETACHED && device?.deviceName == requested?.deviceName) {
                requested = null
                endSession(getString(R.string.channel_usb_detached))
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
        status = TextView(this).apply { textSize = 17f }
        show(getString(R.string.channel_intro))
        content.addView(status)
        fun button(label: Int, action: () -> Unit) {
            val button = Button(this).apply { setText(label); setOnClickListener { action() } }
            controls.add(button); content.addView(button)
        }
        fun field(label: Int, hint: String, input: Int): EditText {
            content.addView(TextView(this).apply { setText(label) })
            return EditText(this).apply { this.hint = hint; inputType = input }.also(content::addView)
        }
        val decimal = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
        val plain = android.text.InputType.TYPE_CLASS_TEXT
        button(R.string.channel_choose_device) { chooseDevice() }
        button(R.string.channel_backup) { backup() }
        button(R.string.channel_read) { readChannels() }
        button(R.string.channel_choose) { chooseChannel() }
        name = field(R.string.channel_name_label, "REPE R1", plain)
        rx = field(R.string.channel_rx_label, "145.60000", decimal)
        tx = field(R.string.channel_tx_label, "145.00000", decimal)
        rxTone = field(R.string.channel_rx_tone_label, "OFF", plain)
        txTone = field(R.string.channel_tx_tone_label, "88.5", plain)
        content.addView(TextView(this).apply { setText(R.string.channel_power_label) })
        power = Spinner(this).apply {
            adapter = ArrayAdapter(this@ChannelActivity, android.R.layout.simple_spinner_dropdown_item, QuanshengChannels.POWER)
        }.also(content::addView)
        narrow = CheckBox(this).apply { setText(R.string.channel_narrow_label) }.also(content::addView)
        txLock = CheckBox(this).apply { setText(R.string.channel_tx_lock_label) }.also(content::addView)
        button(R.string.channel_apply) { applyEdit() }
        button(R.string.channel_write) { confirmWrite() }
        button(R.string.usb_disconnect) { endSession(getString(R.string.usb_disconnected)) }
        setContentView(ScrollView(this).apply { addView(content) })
    }

    private fun show(message: String) { status.text = message }
    private fun show(message: Int) { status.setText(message) }

    private fun chooseDevice() {
        if (busy) return
        val devices = manager.deviceList.values.filter { SerialRadio.description(it) != null }.sortedBy { it.deviceName }
        if (devices.isEmpty()) { show(R.string.channel_no_devices); return }
        AlertDialog.Builder(this).setTitle(R.string.usb_select_device)
            .setItems(devices.map { "VID %04X PID %04X - %s".format(it.vendorId, it.productId, SerialRadio.description(it)) }.toTypedArray()) { _, index ->
                val device = devices[index]
                requested = device
                if (manager.hasPermission(device)) connect(device)
                else {
                    val flags = PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
                    val intent = Intent(this, ChannelActivity::class.java).apply {
                        action = PERMISSION_ACTION
                        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    }
                    try {
                        manager.requestPermission(device, PendingIntent.getActivity(this, 12, intent, flags))
                        show(R.string.channel_waiting_permission)
                    } catch (error: SecurityException) {
                        show(getString(R.string.channel_permission_rejected, errorText(error)))
                    }
                }
            }.show()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.action != PERMISSION_ACTION) return
        @Suppress("DEPRECATION")
        val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
        if (device == null || device.deviceName != requested?.deviceName) { show(R.string.channel_other_device); return }
        permissionResult = true
        if (foreground) consumePermission()
    }

    private fun consumePermission() {
        if (!permissionResult) return
        permissionResult = false
        val device = requested
        if (device != null && manager.hasPermission(device)) connect(device) else show(R.string.channel_permission_denied)
    }

    private fun connect(device: UsbDevice) {
        val token = generation
        operation(R.string.channel_op_connecting) {
            closeTransport()
            val port = SerialRadio.open(manager, device)
            transport = port
            val radio = QuanshengMemory(port, allowExchange = { foreground && token == generation })
            memory = radio
            val found = radio.identify()
            getString(if (radio.legacyReadOnly) R.string.channel_connected_readonly else R.string.channel_connected, found)
        }
    }

    private fun backup() = operation(R.string.channel_op_backup) {
        val radio = requireNotNull(memory) { getString(R.string.channel_connect_first) }
        val files = radio.backup { stage, value -> progress(getString(R.string.channel_progress, stage.resolve(this@ChannelActivity), (value * 100).toInt())) }
        val saved = QuanshengBackups(File(filesDir, "backups")).save(radio.firmware, files)
        receipt = saved
        getString(R.string.channel_backup_saved, saved.directory.absolutePath)
    }

    private fun readChannels() = operation(R.string.channel_op_read) {
        val radio = requireNotNull(memory) { getString(R.string.channel_connect_first) }
        val image = radio.readConfiguration { progress(getString(R.string.channel_reading_progress, (it * 100).toInt())) }
        val channels = QuanshengChannels.read(image)
        original = image; working = image.copyOf(); selected = null
        getString(R.string.channel_read_done, QuanshengChannels.version(image), channels.size)
    }

    private fun chooseChannel() {
        if (busy) return
        val image = working ?: run { show(R.string.channel_read_first); return }
        val channels = try { QuanshengChannels.read(image).filter { it.mode == 0 } } catch (error: IllegalArgumentException) {
            show(getString(R.string.channel_invalid_configuration, errorText(error))); return
        }
        if (channels.isEmpty()) { show(R.string.channel_no_fm); return }
        AlertDialog.Builder(this).setTitle(R.string.channel_choose_title)
            .setItems(channels.map { "${it.number}. ${it.name} RX ${QuanshengChannels.mhz(it.rx10Hz)} TX ${QuanshengChannels.mhz(it.tx10Hz)}" }.toTypedArray()) { _, index ->
                val channel = channels[index]
                selected = channel.number
                name.setText(channel.name)
                rx.setText(QuanshengChannels.mhz(channel.rx10Hz))
                tx.setText(QuanshengChannels.mhz(channel.tx10Hz))
                rxTone.setText(channel.rxTone.label)
                txTone.setText(channel.txTone.label)
                power.setSelection(channel.power)
                narrow.isChecked = channel.narrow
                txLock.isChecked = channel.txLock
                show(getString(R.string.channel_editing, channel.number))
            }.show()
    }

    private fun applyEdit() {
        if (busy) return
        val image = working
        val number = selected
        if (image == null || number == null) { show(R.string.channel_select_before_apply); return }
        try {
            val edited = QuanshengChannel(number, name.text.toString().trim(), QuanshengChannels.frequency(rx.text.toString()),
                QuanshengChannels.frequency(tx.text.toString()), 0, QuanshengTone.parse(rxTone.text.toString()),
                QuanshengTone.parse(txTone.text.toString()), power.selectedItemPosition, narrow.isChecked, txLock.isChecked)
            working = QuanshengChannels.update(image, edited)
            val pending = QuanshengMemory.plan(requireNotNull(working), requireNotNull(original)).size
            show(getString(R.string.channel_updated, number, pending))
        } catch (error: IllegalArgumentException) {
            show(getString(R.string.channel_not_applied, errorText(error)))
        } catch (error: ArithmeticException) {
            show(R.string.channel_too_many_decimals)
        }
    }

    private fun confirmWrite() {
        if (busy) return
        val image = working
        val base = original
        if (image == null || base == null) { show(R.string.channel_read_before_write); return }
        if (receipt == null) { show(R.string.channel_backup_required); return }
        val blocks = QuanshengMemory.plan(image, base).size
        if (blocks == 0) { show(R.string.channel_no_changes); return }
        AlertDialog.Builder(this).setTitle(R.string.channel_write_title)
            .setMessage(getString(R.string.channel_write_message, blocks))
            .setNegativeButton(R.string.action_cancel, null)
            .setPositiveButton(R.string.action_write) { _, _ -> write(image, base) }.show()
    }

    private fun write(image: ByteArray, base: ByteArray) = operation(R.string.channel_op_write) {
        val radio = requireNotNull(memory) { getString(R.string.channel_connect_first) }
        val saved = requireNotNull(receipt) { getString(R.string.channel_backup_required) }
        try {
            QuanshengBackups(File(filesDir, "backups")).verify(saved)
        } catch (error: IllegalArgumentException) {
            receipt = null
            throw IllegalStateException(getString(R.string.channel_write_blocked, errorText(error)), error)
        }
        val blocks = radio.writeConfiguration(image, base) { progress(getString(R.string.channel_writing_progress, (it * 100).toInt())) }
        original = image.copyOf()
        working = image.copyOf()
        getString(R.string.channel_write_done, blocks)
    }

    private fun progress(message: String) = runOnUiThread { if (!isDestroyed) show(message) }

    private fun operation(label: Int, action: () -> String) {
        if (busy || !foreground) return
        busy = true
        controls.forEach { it.isEnabled = false }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        show(getString(R.string.channel_in_progress, getString(label)))
        val token = generation
        worker.execute {
            val message = try {
                check(foreground && token == generation) { getString(R.string.channel_cancelled_session) }
                action()
            } catch (error: IOException) {
                fail(error)
            } catch (error: IllegalArgumentException) {
                fail(error)
            } catch (error: IllegalStateException) {
                fail(error)
            } catch (error: SecurityException) {
                fail(error)
            } catch (error: UnsupportedOperationException) {
                fail(error)
            }
            runOnUiThread {
                if (token == generation && !isDestroyed) {
                    busy = false
                    controls.forEach { it.isEnabled = true }
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    show(message)
                }
            }
        }
    }

    // Any communication error ends the session: a backup does not carry over to a new connection.
    private fun fail(error: Exception): String {
        closeTransport()
        return getString(R.string.channel_error, errorText(error))
    }

    private fun closeTransport() {
        val port = transport
        transport = null; memory = null; receipt = null
        try { port?.close() } catch (error: IOException) {
            android.util.Log.w("BricohamsChannels", "Cierre USB", error)
        }
    }

    private fun endSession(message: String) {
        generation++
        busy = false
        controls.forEach { it.isEnabled = true }
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        worker.execute { closeTransport() }
        original = null; working = null; selected = null
        show(message)
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

    override fun onStop() {
        foreground = false
        unregisterReceiver(detachReceiver)
        endSession(getString(R.string.channel_screen_closed))
        super.onStop()
    }

    override fun onDestroy() {
        worker.shutdown()
        super.onDestroy()
    }

    companion object {
        private const val PERMISSION_ACTION = "org.bricohams.radio.CHANNEL_USB_PERMISSION"
    }
}
