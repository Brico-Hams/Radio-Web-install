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
class ChannelActivity : Activity() {
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
                endSession("USB desconectado: sesion cerrada. Vuelve a conectar y a respaldar antes de escribir.")
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
        show(INTRO)
        content.addView(status)
        fun button(label: String, action: () -> Unit) {
            val button = Button(this).apply { text = label; setOnClickListener { action() } }
            controls.add(button); content.addView(button)
        }
        fun field(label: String, hint: String, input: Int): EditText {
            content.addView(TextView(this).apply { text = label })
            return EditText(this).apply { this.hint = hint; inputType = input }.also(content::addView)
        }
        val decimal = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
        val plain = android.text.InputType.TYPE_CLASS_TEXT
        button("1. Elegir dispositivo USB y conectar") { chooseDevice() }
        button("2. Respaldo completo (Flash 2 MiB, 10-20 min)") { backup() }
        button("3. Leer canales de la radio") { readChannels() }
        button("4. Elegir canal") { chooseChannel() }
        name = field("Nombre (1-10 ASCII)", "REPE R1", plain)
        rx = field("RX (MHz)", "145.60000", decimal)
        tx = field("TX (MHz)", "145.00000", decimal)
        rxTone = field("Tono RX: OFF, CTCSS en Hz (88.5) o DCS (D023N / D023I)", "OFF", plain)
        txTone = field("Tono TX: OFF, CTCSS en Hz (88.5) o DCS (D023N / D023I)", "88.5", plain)
        content.addView(TextView(this).apply { text = POWER_LABEL })
        power = Spinner(this).apply {
            adapter = ArrayAdapter(this@ChannelActivity, android.R.layout.simple_spinner_dropdown_item, QuanshengChannels.POWER)
        }.also(content::addView)
        narrow = CheckBox(this).apply { text = NARROW_LABEL }.also(content::addView)
        txLock = CheckBox(this).apply { text = TX_LOCK_LABEL }.also(content::addView)
        button("5. Aplicar cambios a la copia local") { applyEdit() }
        button("6. Escribir en la radio y releer") { confirmWrite() }
        button("Desconectar USB") { endSession("USB desconectado.") }
        setContentView(ScrollView(this).apply { addView(content) })
    }

    private fun show(message: String) { status.text = message }

    private fun chooseDevice() {
        if (busy) return
        val devices = manager.deviceList.values.filter { SerialRadio.description(it) != null }.sortedBy { it.deviceName }
        if (devices.isEmpty()) { show("No hay cable USB-serie o CDC reconocido. Conecta el cable por OTG."); return }
        AlertDialog.Builder(this).setTitle("Selecciona el dispositivo de radio")
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
                        show("Esperando permiso USB de Android.")
                    } catch (error: SecurityException) {
                        show("Permiso USB rechazado por Android: ${error.message}")
                    }
                }
            }.show()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.action != PERMISSION_ACTION) return
        @Suppress("DEPRECATION")
        val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
        if (device == null || device.deviceName != requested?.deviceName) { show("Permiso de otro dispositivo ignorado."); return }
        permissionResult = true
        if (foreground) consumePermission()
    }

    private fun consumePermission() {
        if (!permissionResult) return
        permissionResult = false
        val device = requested
        if (device != null && manager.hasPermission(device)) connect(device) else show("Permiso USB denegado.")
    }

    private fun connect(device: UsbDevice) = operation("Conectando") {
        closeTransport()
        val port = SerialRadio.open(manager, device)
        transport = port
        val radio = QuanshengMemory(port)
        memory = radio
        val found = radio.identify()
        if (radio.legacyReadOnly) "Conectado: $found. F4HWN v6.0: solo lectura; la escritura exige Labs v6.1+."
        else "Conectado: $found. Haz el respaldo completo antes de leer y escribir canales."
    }

    private fun backup() = operation("Respaldo") {
        val radio = requireNotNull(memory) { "Conecta primero la radio." }
        val files = radio.backup { stage, value -> progress("$stage: ${(value * 100).toInt()} %") }
        val saved = QuanshengBackups(File(filesDir, "backups")).save(radio.firmware, files)
        receipt = saved
        "Respaldo completo guardado y verificado en ${saved.directory.absolutePath} (calibracion, Flash 2 MiB con CRC de la radio y Main). " +
            "Copia esa carpeta fuera del telefono si quieres conservarla."
    }

    private fun readChannels() = operation("Lectura") {
        val radio = requireNotNull(memory) { "Conecta primero la radio." }
        val image = radio.readConfiguration { progress("Leyendo configuracion: ${(it * 100).toInt()} %") }
        val channels = QuanshengChannels.read(image)
        original = image; working = image.copyOf(); selected = null
        "Configuracion ${QuanshengChannels.version(image)} leida: ${channels.size} canales. Elige uno para editarlo."
    }

    private fun chooseChannel() {
        if (busy) return
        val image = working ?: run { show("Lee primero los canales de la radio."); return }
        val channels = try { QuanshengChannels.read(image).filter { it.mode == 0 } } catch (error: IllegalArgumentException) {
            show("Configuracion no valida: ${error.message}"); return
        }
        if (channels.isEmpty()) { show("No hay canales FM existentes para editar."); return }
        AlertDialog.Builder(this).setTitle("Canal FM a editar")
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
                show("Editando canal ${channel.number}. Pulsa 5 para aplicar a la copia local.")
            }.show()
    }

    private fun applyEdit() {
        if (busy) return
        val image = working
        val number = selected
        if (image == null || number == null) { show("Lee los canales y elige uno antes de aplicar."); return }
        try {
            val edited = QuanshengChannel(number, name.text.toString().trim(), QuanshengChannels.frequency(rx.text.toString()),
                QuanshengChannels.frequency(tx.text.toString()), 0, QuanshengTone.parse(rxTone.text.toString()),
                QuanshengTone.parse(txTone.text.toString()), power.selectedItemPosition, narrow.isChecked, txLock.isChecked)
            working = QuanshengChannels.update(image, edited)
            val pending = QuanshengMemory.plan(requireNotNull(working), requireNotNull(original)).size
            show("Canal $number actualizado en la copia local ($pending bloques de 8 bytes pendientes). Aun no se ha escrito la radio.")
        } catch (error: IllegalArgumentException) {
            show("No aplicado: ${error.message}")
        } catch (error: ArithmeticException) {
            show("No aplicado: frecuencia con mas de 5 decimales.")
        }
    }

    private fun confirmWrite() {
        if (busy) return
        val image = working
        val base = original
        if (image == null || base == null) { show("Lee los canales antes de escribir."); return }
        if (receipt == null) { show(BACKUP_REQUIRED); return }
        val blocks = QuanshengMemory.plan(image, base).size
        if (blocks == 0) { show("No hay cambios que escribir."); return }
        AlertDialog.Builder(this).setTitle("Escribir canales en la radio")
            .setMessage("Se escribiran $blocks bloques de 8 bytes y se releera toda la configuracion. " +
                "Los canales afectados quedan ocultos hasta terminar; no desconectes ni apagues la radio. " +
                "Comprueba que las frecuencias, tonos y potencia son legales para ti.")
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Escribir") { _, _ -> write(image, base) }.show()
    }

    private fun write(image: ByteArray, base: ByteArray) = operation("Escritura") {
        val radio = requireNotNull(memory) { "Conecta primero la radio." }
        val saved = requireNotNull(receipt) { BACKUP_REQUIRED }
        try {
            QuanshengBackups(File(filesDir, "backups")).verify(saved)
        } catch (error: IllegalArgumentException) {
            receipt = null
            throw IllegalStateException("Escritura bloqueada al verificar el respaldo: ${error.message}", error)
        }
        val blocks = radio.writeConfiguration(image, base) { progress("Escribiendo: ${(it * 100).toInt()} %") }
        original = image.copyOf()
        working = image.copyOf()
        "Escritura verificada por relectura: $blocks bloques. Reinicia la radio para recargar sus memorias."
    }

    private fun progress(message: String) = runOnUiThread { if (!isDestroyed) show(message) }

    private fun operation(label: String, action: () -> String) {
        if (busy || !foreground) return
        busy = true
        controls.forEach { it.isEnabled = false }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        show("$label en curso. No desconectes el cable.")
        val token = generation
        worker.execute {
            val message = try {
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
        receipt = null
        return "Error: ${error.message}. Sesion invalidada: reconecta y repite el respaldo antes de escribir."
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
        endSession("Pantalla cerrada: sesion USB terminada. Vuelve a conectar y respaldar antes de escribir.")
        super.onStop()
    }

    override fun onDestroy() {
        worker.shutdown()
        super.onDestroy()
    }

    companion object {
        private const val PERMISSION_ACTION = "org.bricohams.radio.CHANNEL_USB_PERMISSION"
        private const val INTRO = "Editor de canales Quansheng F4HWN v6 (Beta). Solo canales FM existentes: frecuencia, " +
            "subtonos y potencia. Pasos: conectar, respaldo completo, leer, editar, aplicar y escribir con relectura."
        private const val BACKUP_REQUIRED = "Escritura bloqueada: falta el respaldo completo y verificado de esta sesion."
        private const val POWER_LABEL = "Potencia (USER, LOW1-LOW5, MID, HIGH)"
        private const val NARROW_LABEL = "Banda estrecha (12,5 kHz)"
        private const val TX_LOCK_LABEL = "Bloquear TX en este canal"
    }
}
