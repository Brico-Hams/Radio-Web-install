package com.pr2em.ftx1cat

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.GridLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.SeekBar
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import android.app.Activity
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale
import java.util.concurrent.Executors
import kotlin.math.roundToInt

class MainActivity : Activity() {
    private val io = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private lateinit var radio: CatRadio
    private lateinit var status: TextView
    private lateinit var frequency: TextView
    private lateinit var portPicker: Spinner
    private lateinit var modePicker: Spinner
    private lateinit var stepPicker: Spinner
    private lateinit var connectButton: Button
    private val ports = mutableListOf<SerialChoice>()
    private var connected = false
    private var suppressModeChange = false
    private var suppressStepChange = false
    private var modeCode = "2"
    private var currentHz = 14_200_000L
    private var permissionChoice: SerialChoice? = null

    private val modes = listOf(
        Mode("1", "LSB"), Mode("2", "USB"), Mode("3", "CW-U"), Mode("4", "FM"),
        Mode("5", "AM"), Mode("6", "RTTY-L"), Mode("7", "CW-L"), Mode("8", "DATA-L"),
        Mode("9", "RTTY-U"), Mode("A", "DATA-FM"), Mode("B", "FM-N"),
        Mode("C", "DATA-U"), Mode("D", "AM-N"), Mode("E", "PSK"),
        Mode("F", "DATA-FM-N"), Mode("H", "C4FM-DN"), Mode("I", "C4FM-VW")
    )
    private data class Mode(val code: String, val label: String)
    private data class Band(val label: String, val code: String)

    private val bands = listOf(
        Band("160 m", "00"), Band("80 m", "01"), Band("60 m", "02"), Band("40 m", "03"),
        Band("30 m", "04"), Band("20 m", "05"), Band("17 m", "06"), Band("15 m", "07"),
        Band("12 m", "08"), Band("10 m", "09"), Band("11 m · DX", "11m"), Band("6 m", "10"),
        Band("4 m / GEN", "11"), Band("AIR", "12"), Band("2 m", "13"), Band("70 cm", "14")
    )
    private val stepSets = mapOf(
        "030604" to listOf("1 kHz", "2.5 kHz", "5 kHz", "10 kHz"),
        "030605" to listOf("2.5 kHz", "5 kHz", "9 kHz", "10 kHz", "12.5 kHz", "25 kHz"),
        "030606" to listOf("5 kHz", "6.25 kHz", "10 kHz", "12.5 kHz", "20 kHz", "25 kHz", "Auto")
    )
    private var activeStepKey = "030604"
    private var activeStepKHz = 1.0
    private val colors = Colors()

    private val permissionAction = "com.pr2em.ftx1cat.USB_PERMISSION"
    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val device = usbDeviceFrom(intent)
            val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
            val choice = permissionChoice
            permissionChoice = null
            if (granted && choice != null && device?.deviceName == choice.driver.device.deviceName) openPort(choice)
            else setStatus("Permissão USB não concedida", false)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = colors.background
        window.navigationBarColor = colors.background
        radio = CatRadio(this)
        registerUsbReceiver()
        buildScreen()
        refreshPorts()
        selectInitialStep()
    }

    @Suppress("DEPRECATION")
    private fun registerUsbReceiver() {
        val filter = IntentFilter().apply {
            addAction(permissionAction)
        }
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        else registerReceiver(usbReceiver, filter)
    }

    private fun buildScreen() {
        val root = ScrollView(this).apply { setBackgroundColor(colors.background); clipToPadding = false }
        val column = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(14), dp(16), dp(24)) }
        root.addView(column)
        setContentView(root)

        val heading = TextView(this).apply {
            text = "FTX-1  ·  CAT CONTROL"; setTextColor(colors.text); textSize = 19f
            typeface = Typeface.DEFAULT_BOLD; letterSpacing = .04f
        }
        column.addView(heading)
        column.addView(label("USB OTG  •  CAT-1  •  38400 bps", 12, colors.muted).apply { setPadding(0, dp(3), 0, dp(12)) })

        val connection = card(column, "CONEXÃO USB")
        portPicker = Spinner(this)
        styleSpinner(portPicker)
        connection.addView(portPicker, matchWrap())
        val connectionRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        status = label("Conecte o FTX-1 por USB-C OTG", 13, colors.muted)
        status.setOnClickListener { refreshPorts(); toast("Lista USB atualizada") }
        connectionRow.addView(status, LinearLayout.LayoutParams(0, dp(48), 1f))
        connectionRow.addView(button("↻", false).apply { setOnClickListener { refreshPorts(); toast("Lista USB atualizada") } },
            LinearLayout.LayoutParams(dp(46), dp(46)).apply { marginEnd = dp(7) })
        connectButton = button("CONECTAR", primary = true)
        connectButton.setOnClickListener { connectSelected() }
        connectionRow.addView(connectButton, LinearLayout.LayoutParams(dp(126), dp(46)))
        connection.addView(connectionRow)

        val tune = card(column, "FREQUÊNCIA MAIN")
        frequency = TextView(this).apply {
            text = formatHz(currentHz); textSize = 31f; typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            gravity = Gravity.CENTER; setTextColor(colors.text); setPadding(0, dp(5), 0, 0)
            setOnClickListener { showFrequencyDialog() }
        }
        tune.addView(frequency, matchWrap())
        tune.addView(label("Toque na frequência para digitar", 12, colors.muted).apply { gravity = Gravity.CENTER; setPadding(0, 0, 0, dp(8)) })
        val dial = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER; setPadding(0, dp(3), 0, dp(8)) }
        val down = button("−", false).apply { textSize = 27f; setOnClickListener { tuneBy(-1) } }
        val up = button("+", false).apply { textSize = 27f; setOnClickListener { tuneBy(1) } }
        dial.addView(down, LinearLayout.LayoutParams(dp(76), dp(52)).apply { marginEnd = dp(14) })
        stepPicker = Spinner(this)
        styleSpinner(stepPicker)
        dial.addView(stepPicker, LinearLayout.LayoutParams(0, dp(52), 1f).apply { marginEnd = dp(14) })
        dial.addView(up, LinearLayout.LayoutParams(dp(76), dp(52)))
        tune.addView(dial)
        tune.addView(label("SINTONIA", 11, colors.accent))

        val bandCard = card(column, "BANDAS")
        val bandGrid = GridLayout(this).apply { columnCount = 4; useDefaultMargins = false }
        bands.forEach { band ->
            val b = button(band.label, false).apply { textSize = 12f; setOnClickListener { selectBand(band) } }
            bandGrid.addView(b, GridLayout.LayoutParams().apply {
                width = 0; height = dp(46); columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
                setMargins(dp(3), dp(3), dp(3), dp(3))
            })
        }
        bandCard.addView(bandGrid, matchWrap())

        val modeCard = card(column, "MODO MAIN")
        modePicker = Spinner(this)
        styleSpinner(modePicker)
        modePicker.adapter = adapter(modes.map { "${it.label}  ·  ${it.code}" })
        modePicker.onItemSelectedListener = SimpleSelection { position ->
            if (!suppressModeChange && position in modes.indices) setMode(modes[position])
        }
        modeCard.addView(modePicker, matchWrap())

        val controls = card(column, "AJUSTES RÁPIDOS")
        controls.addView(label("As alterações são enviadas ao rádio ao soltar o controle.", 12, colors.muted).apply { setPadding(0, 0, 0, dp(5)) })
        val sliderGrid = GridLayout(this).apply { columnCount = 2 }
        controls.addView(sliderGrid)
        addSlider(sliderGrid, "RF POWER", 5, 100, 5, "W") { value -> "PC2${value.toString().padStart(3, '0')};" }
        addSlider(sliderGrid, "D-LEVEL", 0, 120, 60, "dB") { progress -> "SS04${formatSignedHalf(progress - 60)};" }
        addSlider(sliderGrid, "NB", 0, 10, 0, "") { value -> "NL0${value.toString().padStart(3, '0')};" }
        addSlider(sliderGrid, "DNR", 0, 10, 0, "") { value -> "RL0${value.toString().padStart(2, '0')};" }

        val refresh = button("LER VALORES DO RÁDIO", false).apply {
            setOnClickListener { if (connected) readAll() else toast("Conecte o rádio primeiro") }
        }
        column.addView(refresh, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(48)).apply { topMargin = dp(8) })
        column.addView(button("MENU CAT · AVANÇADO", false).apply {
            setOnClickListener { showCatMenuDialog() }
        }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(48)).apply { topMargin = dp(8) })
        column.addView(label("v0.1 · CAT-1 · sem transmissão PTT", 11, colors.muted).apply {
            gravity = Gravity.CENTER; setPadding(0, dp(15), 0, 0)
        })
    }

    private fun addSlider(parent: GridLayout, title: String, min: Int, max: Int, initial: Int, unit: String, command: (Int) -> String) {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(8), dp(6), dp(8), dp(3)); background = rounded(colors.panel2, dp(12)) }
        val row = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        val value = label("—", 16, colors.accent).apply { typeface = Typeface.DEFAULT_BOLD; gravity = Gravity.END }
        row.addView(label(title, 13, colors.text).apply { typeface = Typeface.DEFAULT_BOLD }, LinearLayout.LayoutParams(0, dp(25), 1f))
        row.addView(value, LinearLayout.LayoutParams(dp(86), dp(25)))
        box.addView(row)
        val seek = SeekBar(this).apply {
            this.max = max - min
            progress = initial - min
            isEnabled = false
            minimumHeight = dp(52)
            setPadding(dp(6), dp(12), dp(6), dp(12))
            thumb = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(this@MainActivity.colors.accent)
                setSize(dp(26), dp(26))
                setStroke(dp(2), this@MainActivity.colors.panel)
            }
        }
        val updateLabel = { p: Int ->
            val n = p + min
            value.text = when (title) {
                "D-LEVEL" -> String.format(Locale("pt", "BR"), "%+.1f dB", (p - 60) / 2.0)
                "NB", "DNR" -> if (n == 0) "OFF" else "Nível $n"
                else -> "$n $unit"
            }
        }
        updateLabel(initial - min)
        seek.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(bar: SeekBar?, progress: Int, fromUser: Boolean) {
                updateLabel(progress)
                if (fromUser) queueSliderSend(title, progress + min)
            }
            override fun onStartTrackingTouch(bar: SeekBar?) = Unit
            override fun onStopTrackingTouch(bar: SeekBar?) {
                val valueNow = bar?.progress?.plus(min) ?: return
                queueSliderSend(title, valueNow, immediate = true)
            }
        })
        seek.setOnTouchListener { _, event ->
            if (event.actionMasked == android.view.MotionEvent.ACTION_DOWN) {
                val left = seek.paddingLeft + seek.thumbOffset
                val right = seek.width - seek.paddingRight - seek.thumbOffset
                if (right > left) {
                    val fraction = ((event.x - left.toFloat()) / (right - left).toFloat()).coerceIn(0f, 1f)
                    seek.progress = (fraction * seek.max).roundToInt()
                    queueSliderSend(title, seek.progress + min, immediate = true)
                }
            }
            false
        }
        box.addView(seek)
        parent.addView(box, GridLayout.LayoutParams().apply {
            width = 0; height = dp(108); columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
            setMargins(dp(3), dp(3), dp(3), dp(3))
        })
        sliderBindings += SliderBinding(title, min, max, seek, updateLabel, command)
    }

    private data class SliderBinding(
        val title: String,
        val min: Int,
        val max: Int,
        val seek: SeekBar,
        val update: (Int) -> Unit,
        val command: (Int) -> String
    )
    private val sliderBindings = mutableListOf<SliderBinding>()
    private val pendingSliderSends = mutableMapOf<String, Runnable>()

    private fun queueSliderSend(title: String, value: Int, immediate: Boolean = false) {
        if (!connected) return
        val binding = sliderBindings.firstOrNull { it.title == title } ?: return
        pendingSliderSends.remove(title)?.let(main::removeCallbacks)

        val send = Runnable {
            pendingSliderSends.remove(title)
            if (!connected) return@Runnable
            val latestValue = binding.seek.progress + binding.min
            io.execute {
                runCatching { radio.send(binding.command(latestValue)) }
                    .onFailure { error ->
                        main.post { setStatus("Erro CAT: ${error.message ?: "sem resposta"}", false) }
                    }
            }
        }

        pendingSliderSends[title] = send
        main.postDelayed(send, if (immediate) 0L else 90L)
    }

    private fun clearPendingSliderSends() {
        pendingSliderSends.values.forEach { main.removeCallbacks(it) }
        pendingSliderSends.clear()
    }

    private fun refreshPorts() {
        ports.clear()
        ports.addAll(radio.choices())
        portPicker.adapter = adapter(if (ports.isEmpty()) listOf("Nenhum USB serial encontrado") else ports.map { it.label })
        connectButton.isEnabled = !connected && ports.isNotEmpty()
        if (ports.isEmpty() && !connected) setStatus("Conecte o rádio por USB-C OTG", false)
    }

    private fun connectSelected() {
        val choice = ports.getOrNull(portPicker.selectedItemPosition) ?: return toast("Nenhuma porta USB disponível")
        if (radio.hasPermission(choice.driver.device)) openPort(choice)
        else {
            permissionChoice = choice
            val pending = PendingIntent.getBroadcast(
                this, 0, Intent(permissionAction).setPackage(packageName),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            radio.requestPermission(choice.driver.device, pending)
            setStatus("Aguardando autorização USB…", false)
        }
    }

    private fun openPort(choice: SerialChoice) {
        setStatus("Abrindo ${choice.label}…", false)
        connectButton.isEnabled = false
        io.execute {
            try {
                radio.open(choice)
                val id = radio.query("ID;")
                main.post {
                    connected = true
                    connectButton.text = "DESCONECTAR"
                    connectButton.isEnabled = true
                    connectButton.setOnClickListener { disconnect("Desconectado") }
                    setStatus("Conectado · ID ${id.drop(2).dropLast(1)}", true)
                    sliderBindings.forEach { it.seek.isEnabled = true }
                    readAll()
                    schedulePoll()
                }
            } catch (error: Exception) {
                radio.close()
                main.post {
                    connected = false
                    clearPendingSliderSends()
                    connectButton.isEnabled = true
                    setStatus("Falha: ${error.message ?: "não conectou"}", false)
                }
            }
        }
    }

    private fun disconnect(message: String) {
        connected = false
        clearPendingSliderSends()
        radio.close()
        connectButton.text = "CONECTAR"
        connectButton.setOnClickListener { connectSelected() }
        connectButton.isEnabled = ports.isNotEmpty()
        sliderBindings.forEach { it.seek.isEnabled = false }
        setStatus(message, false)
    }

    private fun readAll() {
        if (!connected) return
        submit("Lendo valores…", {
            val f = runCatching { radio.query("FA;").drop(2).dropLast(1).toLong() }.getOrNull()
            val m = runCatching { radio.query("MD0;").drop(3).dropLast(1) }.getOrNull()
            val pc = runCatching { radio.query("PC;").drop(3).dropLast(1).toInt() }.getOrNull()
            val d = runCatching { radio.query("SS04;").drop(4).dropLast(1).toDouble() }.getOrNull()
            val nb = runCatching { radio.query("NL0;").drop(3).dropLast(1).toInt() }.getOrNull()
            val dnr = runCatching { radio.query("RL0;").drop(3).dropLast(1).toInt() }.getOrNull()
            val keyForStep = m?.takeIf { code -> modes.any { it.code == code } }?.let(::stepKey) ?: activeStepKey
            val step = runCatching { radio.query("EX$keyForStep;").drop(8).dropLast(1).toInt() }.getOrNull()
            main.post {
                if (f != null) { currentHz = f; frequency.text = formatHz(f) }
                if (m != null && modes.any { it.code == m }) showMode(m)
                if (pc != null) setSlider("RF POWER", pc.coerceIn(5, 100))
                if (d != null) setSlider("D-LEVEL", ((d * 2).roundToInt() + 60).coerceIn(0, 120))
                if (nb != null) setSlider("NB", nb.coerceIn(0, 10))
                if (dnr != null) setSlider("DNR", dnr.coerceIn(0, 10))
                if (step != null) showStep(step)
                setStatus("Conectado · valores atualizados", true)
            }
        })
    }

    private fun schedulePoll() {
        main.postDelayed({
            if (!connected) return@postDelayed
            io.execute {
                val f = runCatching { radio.query("FA;", 900).drop(2).dropLast(1).toLong() }.getOrNull()
                val m = runCatching { radio.query("MD0;", 900).drop(3).dropLast(1) }.getOrNull()
                main.post {
                    if (connected) {
                        if (f != null) { currentHz = f; frequency.text = formatHz(f) }
                        if (m != null && modes.any { it.code == m }) showMode(m)
                        schedulePoll()
                    }
                }
            }
        }, 2_500)
    }

    private fun setMode(mode: Mode) {
        if (!connected) { modeCode = mode.code; selectInitialStep(); return }
        submit("Selecionando ${mode.label}…", {
            radio.send("MD0${mode.code};")
            radio.query("MD0;")
            val stepReply = runCatching { radio.query("EX${stepKey(mode.code)};") }.getOrNull()
            main.post {
                modeCode = mode.code
                activeStepKey = stepKey(mode.code)
                updateStepOptions()
                stepReply?.let { showStep(it.drop(8).dropLast(1).toIntOrNull() ?: 0) }
                setStatus("Modo ${mode.label}", true)
            }
        })
    }

    private fun showMode(code: String) {
        modeCode = code
        val index = modes.indexOfFirst { it.code == code }
        if (index >= 0 && modePicker.selectedItemPosition != index) {
            suppressModeChange = true
            modePicker.setSelection(index)
            suppressModeChange = false
        }
        val key = stepKey(code)
        if (key != activeStepKey) {
            activeStepKey = key
            updateStepOptions()
            if (connected) io.execute {
                val step = runCatching { radio.query("EX$key;").drop(8).dropLast(1).toInt() }.getOrNull()
                if (step != null) main.post { showStep(step) }
            }
        }
    }

    private fun stepKey(code: String): String = when (code) {
        "5", "D" -> "030605"
        "4", "A", "B", "F", "H", "I" -> "030606"
        else -> "030604"
    }

    private fun selectInitialStep() {
        activeStepKey = stepKey(modeCode)
        updateStepOptions()
    }

    private fun updateStepOptions() {
        val options = stepSets[activeStepKey] ?: stepSets.getValue("030604")
        suppressStepChange = true
        stepPicker.adapter = adapter(options)
        stepPicker.setSelection(0)
        suppressStepChange = false
        activeStepKHz = options.first().substringBefore(' ').toDouble()
        stepPicker.onItemSelectedListener = SimpleSelection { position ->
            if (!suppressStepChange && position in options.indices) setStep(position)
        }
    }

    private fun showStep(index: Int) {
        val options = stepSets[activeStepKey] ?: return
        val safeIndex = index.coerceIn(options.indices)
        activeStepKHz = options[safeIndex].substringBefore(' ').toDoubleOrNull() ?: 1.0
        suppressStepChange = true
        stepPicker.setSelection(safeIndex)
        suppressStepChange = false
    }

    private fun setStep(index: Int) {
        val options = stepSets[activeStepKey] ?: return
        if (index !in options.indices) return
        activeStepKHz = options[index].substringBefore(' ').toDoubleOrNull() ?: activeStepKHz
        if (connected) submit("Ajustando CH-STEP…", { radio.send("EX$activeStepKey$index;") })
    }

    private fun tuneBy(direction: Int) {
        val target = (currentHz + (activeStepKHz * 1000.0).roundToInt() * direction).coerceIn(30_000, 470_000_000)
        setFrequency(target)
    }

    private fun selectBand(band: Band) {
        if (!connected) return toast("Conecte o rádio primeiro")
        submit("Selecionando ${band.label}…", {
            if (band.code == "11m") {
                radio.send("FA027555000;")
                radio.send("MD02;")
            } else radio.send("BS0${band.code};")
            val f = radio.query("FA;").drop(2).dropLast(1).toLong()
            val m = radio.query("MD0;").drop(3).dropLast(1)
            main.post {
                currentHz = f; frequency.text = formatHz(f)
                if (modes.any { it.code == m }) showMode(m)
                setStatus(if (band.code == "11m") "11 m · 27,555 MHz · USB" else "Banda ${band.label}", true)
            }
        })
    }

    private fun setFrequency(target: Long) {
        if (!connected) return toast("Conecte o rádio primeiro")
        submit("Sintonizando…", {
            radio.send("FA${target.toString().padStart(9, '0')};")
            val actual = radio.query("FA;").drop(2).dropLast(1).toLong()
            main.post { currentHz = actual; frequency.text = formatHz(actual); setStatus("Frequência ajustada", true) }
        })
    }

    private fun showFrequencyDialog() {
        val input = EditText(this).apply { setSingleLine(); inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL; setText(currentHz.toString()) }
        android.app.AlertDialog.Builder(this)
            .setTitle("Frequência MAIN")
            .setMessage("Digite Hz ou MHz. Exemplos: 27555, 27,555 ou 27.555.000")
            .setView(input)
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("SINTONIZAR") { _, _ ->
                runCatching { parseFrequency(input.text.toString()) }
                    .onSuccess { if (it in 30_000L..470_000_000L) setFrequency(it) else toast("Frequência fora da faixa permitida") }
                    .onFailure { toast("Confira o valor informado") }
            }.show()
        input.requestFocus()
    }

    private fun showCatMenuDialog() {
        if (!connected) return toast("Conecte o rádio primeiro")
        val panel = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(22), dp(4), dp(22), 0) }
        val keyInput = EditText(this).apply {
            hint = "Código do item · ex.: 030604"; inputType = InputType.TYPE_CLASS_NUMBER
            setSingleLine()
        }
        val valueInput = EditText(this).apply {
            hint = "Valor conforme tabela do menu CAT"; inputType = InputType.TYPE_CLASS_TEXT
            setSingleLine()
        }
        val result = label("Informe o código EX de 6 dígitos e leia o valor atual.", 12, colors.muted)
        panel.addView(keyInput)
        panel.addView(valueInput)
        panel.addView(result.apply { setPadding(0, dp(8), 0, dp(4)) })
        val dialog = android.app.AlertDialog.Builder(this)
            .setTitle("Menu CAT · itens EX")
            .setMessage("Use o código e o formato indicados no manual ou no programa de computador.")
            .setView(panel)
            .setNegativeButton("FECHAR", null)
            .setNeutralButton("LER", null)
            .setPositiveButton("GRAVAR", null)
            .create()
        dialog.setOnShowListener {
            dialog.getButton(android.app.AlertDialog.BUTTON_NEUTRAL).setOnClickListener {
                val key = keyInput.text.toString().trim()
                if (!key.matches(Regex("[0-9]{6}"))) { toast("O código deve ter 6 algarismos"); return@setOnClickListener }
                setStatus("Lendo item EX$key…", false)
                io.execute {
                    val reply = runCatching { radio.query("EX$key;") }
                    main.post {
                        reply.onSuccess {
                            val raw = it.removePrefix("EX$key").removeSuffix(";")
                            valueInput.setText(raw)
                            result.text = "Valor lido: $raw"
                            setStatus("Item EX$key lido", true)
                        }.onFailure { error -> result.text = error.message ?: "Falha na leitura"; setStatus("Falha ao ler EX$key", false) }
                    }
                }
            }
            dialog.getButton(android.app.AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val key = keyInput.text.toString().trim()
                val raw = valueInput.text.toString().trim()
                if (!key.matches(Regex("[0-9]{6}")) || raw.isEmpty() || raw.contains(';')) {
                    toast("Confira o código e o valor do item"); return@setOnClickListener
                }
                android.app.AlertDialog.Builder(this)
                    .setTitle("Gravar EX$key?")
                    .setMessage("O valor $raw será enviado ao rádio.")
                    .setNegativeButton("CANCELAR", null)
                    .setPositiveButton("GRAVAR") { _, _ ->
                        submit("Gravando EX$key…", {
                            radio.send("EX$key$raw;")
                            val actual = radio.query("EX$key;").removePrefix("EX$key").removeSuffix(";")
                            main.post {
                                valueInput.setText(actual)
                                result.text = "Valor confirmado: $actual"
                                setStatus("Item EX$key atualizado", true)
                            }
                        })
                    }.show()
            }
        }
        dialog.show()
    }

    private fun parseFrequency(raw: String): Long {
        val text = raw.trim().replace(" ", "")
        require(text.isNotEmpty() && !text.endsWith('.') && !text.endsWith(','))
        val groups = text.split('.', ',')
        require(groups.all { it.all(Char::isDigit) })
        if (groups.size > 1 && groups.size <= 3 && groups.drop(1).all { it.length == 3 } && groups.first().length <= 3) {
            return (groups.joinToString("") + "0".repeat((3 - groups.size) * 3)).toLong()
        }
        if (groups.size == 2 && groups[0].length in 1..3 && groups[1].length in 1..6) {
            val fraction = groups[1].padEnd(6, '0').take(6).toLong()
            return groups[0].toLong() * 1_000_000 + fraction
        }
        val digits = groups.joinToString("")
        require(digits.length <= 9)
        if (digits.length == 4) {
            val candidate = digits.substring(0, 3).toLong() * 1_000_000 + digits.last().digitToInt() * 100_000L
            if (candidate in 30_000L..470_000_000L) return candidate
        }
        if (digits.length == 5) return digits.toLong() * 1_000L
        return digits.padEnd(9, '0').toLong()
    }

    private fun setSlider(title: String, value: Int) {
        sliderBindings.firstOrNull { it.title == title }?.let { binding ->
            val p = (value - binding.min).coerceIn(0, binding.max - binding.min)
            binding.seek.progress = p
            binding.update(p)
        }
    }

    private fun submit(message: String, action: () -> Unit) {
        if (!connected) return toast("Conecte o rádio primeiro")
        setStatus(message, false)
        io.execute {
            runCatching { action() }.onFailure { error ->
                main.post { setStatus("Erro CAT: ${error.message ?: "sem resposta"}", false) }
            }
        }
    }

    private fun setStatus(text: String, ok: Boolean) {
        if (!::status.isInitialized) return
        status.text = text
        status.setTextColor(if (ok) colors.good else colors.muted)
    }

    private fun card(parent: LinearLayout, title: String): LinearLayout {
        val wrapper = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(14), dp(12), dp(14), dp(12)); background = rounded(colors.panel, dp(16)) }
        wrapper.addView(label(title, 12, colors.accent).apply { typeface = Typeface.DEFAULT_BOLD; letterSpacing = .06f; setPadding(0, 0, 0, dp(7)) })
        parent.addView(wrapper, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(10) })
        return wrapper
    }

    private fun button(text: String, primary: Boolean): Button = Button(this).apply {
        this.text = text; isAllCaps = false; textSize = 14f
        setTextColor(if (primary) colors.background else colors.text)
        background = rounded(if (primary) colors.accent else colors.panel2, dp(12))
        stateListAnimator = null
    }

    private fun label(text: String, size: Int, color: Int) = TextView(this).apply { this.text = text; textSize = size.toFloat(); setTextColor(color) }

    private fun adapter(items: List<String>) = object : ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, items) {
        override fun getView(position: Int, convertView: View?, parent: ViewGroup): View =
            (super.getView(position, convertView, parent) as TextView).apply {
                setTextColor(colors.text); textSize = 14f; setPadding(dp(12), dp(10), dp(8), dp(10))
            }
        override fun getDropDownView(position: Int, convertView: View?, parent: ViewGroup): View =
            (super.getDropDownView(position, convertView, parent) as TextView).apply {
                setTextColor(colors.text); setBackgroundColor(colors.panel); setPadding(dp(14), dp(12), dp(8), dp(12))
            }
    }

    private fun styleSpinner(spinner: Spinner) {
        spinner.background = rounded(colors.panel2, dp(10))
        spinner.setPopupBackgroundDrawable(rounded(colors.panel, dp(10)))
    }

    private fun matchWrap() = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    private fun dp(value: Int) = (value * resources.displayMetrics.density).roundToInt()
    private fun rounded(color: Int, radius: Int) = GradientDrawable().apply { setColor(color); cornerRadius = radius.toFloat() }

    private fun formatHz(hz: Long): String {
        val symbols = DecimalFormatSymbols(Locale("pt", "BR"))
        return DecimalFormat("#,##0", symbols).format(hz) + " Hz"
    }

    private fun formatSignedHalf(progress: Int): String = String.format(Locale.US, "%+05.1f", progress / 2.0)
    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_SHORT).show()

    @Suppress("DEPRECATION")
    private fun usbDeviceFrom(intent: Intent): UsbDevice? = if (Build.VERSION.SDK_INT >= 33)
        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
    else intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)

    override fun onDestroy() {
        clearPendingSliderSends()
        main.removeCallbacksAndMessages(null)
        io.shutdownNow()
        radio.close()
        runCatching { unregisterReceiver(usbReceiver) }
        super.onDestroy()
    }

    private inner class Colors {
        val background = android.graphics.Color.rgb(16, 24, 32)
        val panel = android.graphics.Color.rgb(25, 39, 49)
        val panel2 = android.graphics.Color.rgb(36, 55, 67)
        val text = android.graphics.Color.rgb(238, 244, 247)
        val muted = android.graphics.Color.rgb(160, 178, 190)
        val accent = android.graphics.Color.rgb(56, 189, 248)
        val good = android.graphics.Color.rgb(74, 222, 128)
    }

    private class SimpleSelection(private val selected: (Int) -> Unit) : android.widget.AdapterView.OnItemSelectedListener {
        override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) = selected(position)
        override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
    }
}
