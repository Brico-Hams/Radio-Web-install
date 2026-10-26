package org.bricohams.radio

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.database.sqlite.SQLiteException
import android.graphics.Color
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.text.InputType
import android.view.View
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
import java.nio.ByteBuffer
import java.time.Instant
import java.time.format.DateTimeParseException
import java.util.Locale
import kotlin.concurrent.thread

class MainActivity : Activity() {
    private lateinit var store: RadioStore
    private lateinit var content: LinearLayout
    private lateinit var status: TextView
    private var tab = "Inicio"
    private var sessionId: String? = null
    private var editingId: String? = null
    private var contactSearch = ""
    private var adifImportBusy = false
    private var exportKind: String? = null
    private var audioTone = 700
    private var audioSpeed = 15
    private var audioResult: String? = null
    private var fix: Fix? = null
    private var fixElapsedNanos: Long = 0
    private var listening = false
    private val handler = Handler(Looper.getMainLooper())
    private val timeout = Runnable {
        stopLocation()
        message("Sin posicion reciente tras 30 s. Comprueba cielo abierto y GPS; no se ha inventado una ubicacion.")
    }
    private val locationManager by lazy { getSystemService(LOCATION_SERVICE) as LocationManager }
    private val locationListener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            val age = SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos
            if (!location.hasAccuracy() || age < 0 || age > 30_000_000_000L || location.isFromMockProvider) return
            userAction {
                fix = Fix(location.latitude, location.longitude, location.accuracy.toDouble(),
                    Instant.ofEpochMilli(location.time)).validated()
                fixElapsedNanos = location.elapsedRealtimeNanos
                stopLocation()
                message("Posicion obtenida; precision ${location.accuracy.toInt()} m. Valida durante 30 s. Guarda ahora una observacion.")
            }
        }
        override fun onProviderEnabled(provider: String) = Unit
        override fun onProviderDisabled(provider: String) {
            stopLocation()
            message("GPS desactivado. Se pueden guardar observaciones sin coordenadas.")
        }
        @Deprecated("Platform callback")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = RadioStore(this)
        tab = savedInstanceState?.getString("tab") ?: "Inicio"
        sessionId = savedInstanceState?.getString("session")
        editingId = savedInstanceState?.getString("editing")
        contactSearch = savedInstanceState?.getString("contactSearch") ?: ""
        exportKind = savedInstanceState?.getString("export")
        audioTone = savedInstanceState?.getInt("tone", 700) ?: 700
        audioSpeed = savedInstanceState?.getInt("speed", 15) ?: 15
        audioResult = savedInstanceState?.getString("audioResult")
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(12), dp(16), dp(12))
            setOnApplyWindowInsetsListener { view, insets ->
                if (Build.VERSION.SDK_INT >= 30) {
                    val bars = insets.getInsets(WindowInsets.Type.systemBars())
                    view.setPadding(bars.left + dp(16), bars.top + dp(12), bars.right + dp(16), bars.bottom + dp(12))
                } else {
                    @Suppress("DEPRECATION")
                    view.setPadding(insets.systemWindowInsetLeft + dp(16), insets.systemWindowInsetTop + dp(12),
                        insets.systemWindowInsetRight + dp(16), insets.systemWindowInsetBottom + dp(12))
                }
                insets
            }
        }
        layout.addView(ImageView(this).apply {
            setImageResource(org.bricohams.radio.R.drawable.bricohams_logo)
            adjustViewBounds = true
            contentDescription = "Bricohams"
        }, LinearLayout.LayoutParams(dp(180), dp(67)))
        val nav = LinearLayout(this)
        for (name in listOf("Inicio", "Guardia", "ARDF", "Morse")) {
            nav.addView(Button(this).apply {
                text = name
                textSize = 11f
                setOnClickListener {
                    if (name != tab) {
                        stopLocation()
                        fix = null
                        tab = name
                        render()
                    }
                }
            }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        }
        layout.addView(nav)
        status = TextView(this).apply {
            setTextColor(Color.rgb(255, 183, 77))
            setPadding(0, 8, 0, 8)
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        layout.addView(status)
        val scroll = ScrollView(this)
        content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        scroll.addView(content)
        layout.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(layout)
        render()
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    private fun text(value: String) = TextView(this).apply {
        text = value; textSize = 16f; setPadding(0, 12, 0, 12)
        content.addView(this)
    }
    private fun button(value: String, action: () -> Unit) = Button(this).apply {
        text = value; setOnClickListener { userAction(action) }; content.addView(this)
    }
    private fun input(label: String, identifier: Int, initial: String = "", numeric: Boolean = false): EditText {
        text(label)
        return EditText(this).apply {
            id = identifier
            hint = label
            setText(initial)
            if (numeric) inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            content.addView(this)
        }
    }
    private fun message(value: String) { status.text = value }
    private fun userAction(action: () -> Unit) {
        try {
            action()
        } catch (error: IllegalArgumentException) {
            message(error.message ?: "Datos invalidos.")
        } catch (error: DateTimeParseException) {
            message("Fecha UTC invalida: ${error.parsedString}")
        } catch (error: SQLiteException) {
            message("No se pudo guardar o leer la base local: ${error.message}")
        } catch (error: IllegalStateException) {
            message(error.message ?: "Estado de operacion no valido.")
        } catch (error: SecurityException) {
            message("Permiso denegado: ${error.message}")
        }
    }
    private fun render() {
        content.removeAllViews()
        message("BETA - datos locales. Exporta tus datos antes de desinstalar.")
        userAction {
            when (tab) {
                "Guardia" -> logbook()
                "ARDF" -> ardf()
                "Morse" -> morse()
                else -> home()
            }
        }
    }
    private fun home() {
        text("Bricohams Android 0.7.1 Beta")
        text("Disponible sin red: libro de guardia local con busqueda, importacion ADIF con vista previa, exportacion ADIF/JSON, sesiones ARDF y observaciones GPS puntuales, Morse de texto y WAV PCM experimental.")
        text("CAT RX experimental por USB OTG, CDC y adaptadores USB-serie reconocidos. Satelites SGP4 offline con TLE importados, observador manual, pases y seguimiento Doppler RX. SSTV Robot36 desde WAV con PNG. Captura de microfono Morse/Robot36 de hasta 60 s y decodificacion posterior. Editor Beta de canales Quansheng F4HWN v6 (frecuencia, subtonos y potencia) con respaldo completo y relectura. Pendiente: subida firmada a LoTW.")
        text("Las observaciones ARDF son manuales. La posicion es la del telefono, no la de una baliza. No se graba un recorrido ni se localiza en segundo plano.")
        text("No se recogen ni transmiten datos. El JSON incluye posiciones y contactos: compartelo solo con quien corresponda.")
        button("Exportar todos los datos JSON") { export("json") }
        button("Abrir CAT RX USB experimental") { startActivity(Intent(this, CatActivity::class.java)) }
        button("Editar canales Quansheng por USB (Beta)") { startActivity(Intent(this, ChannelActivity::class.java)) }
        button("Abrir SSTV Robot36 desde WAV") { startActivity(Intent(this, SstvActivity::class.java)) }
        button("Recibir Morse / Robot36 con microfono") { startActivity(Intent(this, LiveAudioActivity::class.java)) }
        button("Abrir satelites SGP4 y pases") { startActivity(Intent(this, SatelliteActivity::class.java)) }
        button("Importar copia JSON Bricohams") {
            AlertDialog.Builder(this).setTitle("Importar copia local")
                .setMessage("Se agregan contactos, sesiones y observaciones. No se borra ni sobrescribe nada: un ID en conflicto cancela toda la importacion. Usa solo copias de confianza.")
                .setNegativeButton("Cancelar", null)
                .setPositiveButton("Elegir JSON") { _, _ ->
                    startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE); type = "application/json"
                    }, 40)
                }.show()
        }
    }
    private fun logbook() {
        val contacts = store.contacts()
        val editing = editingId?.let { identifier ->
            requireNotNull(contacts.find { it.id == identifier }) { "El contacto seleccionado ya no existe." }
        }
        text("Libro de guardia: ${contacts.size} contactos")
        val call = input("Indicativo", R.id.contact_call, editing?.call ?: "")
        val utc = input("UTC ISO (ejemplo 2026-10-25T16:00:00Z)", R.id.contact_utc, editing?.utc?.toString() ?: Instant.now().toString())
        val frequency = input("Frecuencia MHz", R.id.contact_frequency, editing?.frequencyMHz ?: "", numeric = true)
        val modes = listOf("FM", "SSB", "CW", "AM", "RTTY", "SSTV", "DMR", "DIGITALVOICE")
        val mode = Spinner(this).apply {
            id = R.id.contact_mode
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item,
                modes)
            setSelection(modes.indexOf(editing?.mode ?: "FM"))
            content.addView(this)
        }
        val sent = input("Informe enviado", R.id.contact_sent, editing?.sent ?: "59")
        val received = input("Informe recibido", R.id.contact_received, editing?.received ?: "59")
        val notes = input("Notas", R.id.contact_notes, editing?.notes ?: "")
        button(if (editing == null) "Guardar nuevo contacto" else "Guardar cambios del contacto") {
            val updated = Contact(call = call.text.toString().trim().uppercase(Locale.ROOT),
                utc = Instant.parse(utc.text.toString().trim()), frequencyMHz = frequency.text.toString().trim(),
                mode = mode.selectedItem.toString(), sent = sent.text.toString().trim(),
                received = received.text.toString().trim(), notes = notes.text.toString())
            store.save(if (editing != null) updated.copy(id = editing.id) else updated, editing != null)
            editingId = null
            render()
            message("Contacto guardado en el telefono.")
        }
        if (editing != null) {
            button("Cancelar edicion") { editingId = null; render() }
            button("Eliminar este contacto") {
                AlertDialog.Builder(this).setTitle("Eliminar ${editing.call}")
                    .setMessage("Esta accion no se puede deshacer. Exporta tus datos si necesitas conservar una copia.")
                    .setNegativeButton("Cancelar", null)
                    .setPositiveButton("Eliminar") { _, _ -> userAction {
                        store.deleteContact(editing.id); editingId = null; render(); message("Contacto eliminado.")
                    } }.show()
            }
        }
        button("Exportar ADIF (ASCII)") { export("adif") }
        button("Importar ADIF (vista previa)") {
            require(!adifImportBusy) { "Ya hay una importacion ADIF en curso." }
            startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE); type = "*/*"
            }, 41)
        }
        button("Exportar JSON completo (con acentos)") { export("json") }
        text("LoTW: esta APK exporta ADIF. La firma y subida deben realizarse con TQSL en un ordenador; no hay subida LoTW desde Android.")
        text("Los formularios sin guardar se descartan al cambiar de seccion.")
        val search = input("Buscar indicativo, notas, modo o frecuencia", R.id.contact_search, contactSearch)
        button("Buscar contactos") { contactSearch = search.text.toString().trim(); render() }
        button("Mostrar todos los contactos") { contactSearch = ""; render() }
        val filtered = contacts.filter {
            contactSearch.isEmpty() || listOf(it.call, it.notes, it.mode, it.frequencyMHz, it.utc.toString())
                .any { value -> value.contains(contactSearch, ignoreCase = true) }
        }
        text("${filtered.size} coincidencias; orden UTC mas reciente primero.")
        for (contact in filtered.take(50)) {
            text("${contact.call} - ${contact.utc}\n${contact.frequencyMHz} MHz ${contact.mode} ${contact.sent}/${contact.received}\n${contact.notes}")
            button("Editar ${contact.call} (${contact.utc})") { editingId = contact.id; render() }
        }
        if (filtered.size > 50) text("Se muestran las 50 coincidencias mas recientes; la exportacion incluye todos los contactos, no solo la busqueda.")
    }
    private fun ardf() {
        val sessions = store.sessions()
        val name = input("Nombre de nueva sesion", R.id.session_name)
        button("Crear sesion ARDF") {
            sessionId = store.session(name.text.toString().trim())
            render()
        }
        if (sessions.isEmpty()) {
            text("Crea una sesion para registrar observaciones.")
            return
        }
        if (sessions.none { it.first == sessionId }) sessionId = sessions.first().first
        button("Seleccionar sesion: ${sessions.first { it.first == sessionId }.second}") {
            AlertDialog.Builder(this).setTitle("Sesion ARDF")
                .setItems(sessions.map { it.second }.toTypedArray()) { _, index ->
                    sessionId = sessions[index].first; fix = null; render()
                }.show()
        }
        text(store.observationCounts(requireNotNull(sessionId)))
        button("Estadisticas y observaciones de la sesion") {
            val observations = store.observations(requireNotNull(sessionId))
            val summary = ArdfStatistics.calculate(observations)
            val report = buildString {
                append("Observaciones: ${summary.count}; con coordenadas: ${summary.located}\n")
                append(String.format(Locale.ROOT, "Intervalo entre primera y ultima: %.1f s\n", summary.spanSeconds))
                append(String.format(Locale.ROOT, "Suma de segmentos GPS admitidos: %.1f m (%d segmentos)\n",
                    summary.distanceMeters, summary.distanceSegments))
                append("No es recorrido completo ni distancia a la baliza. Solo posiciones consecutivas del telefono con precision <=50 m, antiguedad <=30 s y separacion <=120 s; sin unir huecos ni estimar tramos ausentes.\n")
                for (beacon in summary.beacons) {
                    append("\nBaliza ${beacon.fox}: ${beacon.count} observaciones, ${beacon.located} con coordenadas\n")
                    append("Primera: ${beacon.first}\nUltima: ${beacon.last}\n")
                    append(beacon.meanIntervalSeconds?.let {
                        String.format(Locale.ROOT, "Intervalo medio: %.1f s\n", it)
                    } ?: "Intervalo medio: no disponible con una sola observacion\n")
                }
                append("\nUltimas 100 observaciones (exportar JSON incluye todas):\n")
                for (observation in observations.takeLast(100).asReversed()) {
                    append("\n${observation.utc} - Baliza ${observation.fox}\n${observation.notes}\n")
                    val position = observation.fix
                    append(if (position == null) "SIN coordenadas\n" else
                        "${position.latitude}, ${position.longitude}; precision ${position.accuracyMeters} m; fijacion ${position.utc}\n")
                }
            }
            AlertDialog.Builder(this).setTitle("Estadisticas ARDF Beta")
                .setView(ScrollView(this).apply {
                    addView(TextView(this@MainActivity).apply { text = report; setPadding(dp(16), dp(12), dp(16), dp(12)) })
                }).setPositiveButton("Cerrar", null).show()
        }
        val fox = input("Baliza (1-10)", R.id.fox_number, "1", true)
        val notes = input("Notas de observacion", R.id.observation_notes)
        text("La coordenada se guarda solo al pulsar Guardar. Sin posicion reciente se guarda explicitamente sin GPS. Ninguna coordenada representa la ubicacion de la baliza.")
        button("Obtener posicion GPS una vez (30 s)") { requestLocation() }
        button("Guardar observacion manual") {
            val age = SystemClock.elapsedRealtimeNanos() - fixElapsedNanos
            val current = if (age in 0..30_000_000_000L) fix else null
            val beacon = fox.text.toString().toIntOrNull()
            require(beacon != null) { "Introduce una baliza entre 1 y 10." }
            store.observe(requireNotNull(sessionId), beacon, notes.text.toString(), current)
            fix = null
            render()
            message(if (current == null) "Observacion guardada SIN coordenadas." else "Observacion y posicion del telefono guardadas.")
        }
        button("Exportar sesiones y contactos JSON") { export("json") }
    }
    private fun morse() {
        text("Morse de texto: espacios entre letras y / entre palabras; ? indica un codigo desconocido.")
        val code = input("Puntos y rayas", R.id.morse_input, "... --- ...")
        val result = text("")
        button("Interpretar texto Morse") { result.text = Morse.decode(code.text.toString()) }
        text("Audio experimental: importa WAV PCM mono 16 bits, 8-48 kHz, 0.1-60 s y hasta 8 MiB. Configura el tono y la velocidad reales. No usa microfono ni escucha USB. No es un decodificador adaptativo; verifica el resultado.")
        val tone = input("Tono (300-1200 Hz)", R.id.morse_tone, audioTone.toString(), true)
        val speed = input("Velocidad (5-45 palabras/minuto)", R.id.morse_speed, audioSpeed.toString(), true)
        button("Importar y decodificar WAV Morse") {
            val selectedTone = tone.text.toString().toIntOrNull()
            val selectedSpeed = speed.text.toString().toIntOrNull()
            require(selectedTone != null && selectedTone in 300..1200 && selectedSpeed != null && selectedSpeed in 5..45) {
                "Tono 300-1200 Hz y velocidad 5-45 ppm, ambos enteros."
            }
            audioTone = selectedTone
            audioSpeed = selectedSpeed
            startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE); type = "audio/*"
            }, 30)
        }
        audioResult?.let { text(it) }
    }
    private fun requestLocation() {
        AlertDialog.Builder(this).setTitle("Posicion para ARDF")
            .setMessage("Se solicita una posicion del telefono durante un maximo de 30 s. Solo se guarda al registrar una observacion y se incluye en el JSON exportado. No hay seguimiento en segundo plano.")
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Continuar") { _, _ ->
                userAction {
                    if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION), 10)
                    } else startLocation()
                }
            }.show()
    }
    private fun startLocation() {
        fix = null
        stopLocation()
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            message("GPS preciso no autorizado. Puedes guardar sin coordenadas.")
            return
        }
        require(locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) { "Activa GPS antes de solicitar posicion." }
        locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 0f, locationListener, Looper.getMainLooper())
        listening = true
        handler.postDelayed(timeout, 30000L)
        message("Esperando posicion GPS reciente (maximo 30 s)...")
    }
    private fun stopLocation() {
        handler.removeCallbacks(timeout)
        if (listening) {
            locationManager.removeUpdates(locationListener)
            listening = false
        }
    }
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 10) userAction {
            if (tab == "ARDF" && hasWindowFocus()) startLocation()
            else message("Vuelve a ARDF y solicita posicion cuando estes preparado.")
        }
    }
    private fun export(kind: String) {
        require(exportKind == null) { "Ya hay una exportacion pendiente." }
        if (kind == "adif") Adif.export(store.contacts())
        exportKind = kind
        startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = if (kind == "adif") "text/plain" else "application/json"
            putExtra(Intent.EXTRA_TITLE, if (kind == "adif") "bricohams-log.adi" else "bricohams-field-data.json")
        }, 20)
    }
    @Deprecated("Platform callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 41) {
            val uri = data?.data
            if (resultCode != RESULT_OK || uri == null) {
                message("Importacion ADIF cancelada.")
                return
            }
            if (adifImportBusy) {
                message("Ya hay una importacion ADIF en curso.")
                return
            }
            adifImportBusy = true
            message("Validando ADIF; no se ha guardado ningun contacto.")
            thread(name = "bricohams-adif-preview") {
                try {
                    val preview = AdifImport.parse(contentResolver.readDocument(uri, AdifImport.MAX_BYTES))
                    runOnUiThread {
                        if (isDestroyed || isFinishing) return@runOnUiThread
                        val warnings = if (preview.ignoredFields.isEmpty()) "Todos los campos de contactos son compatibles."
                            else "Campos NO conservados: ${preview.ignoredFields.joinToString(", ")}. El original no se modifica."
                        AlertDialog.Builder(this).setTitle("Importar ${preview.contacts.size} contactos ADIF")
                            .setMessage("$warnings\n\nSe comparan todos los campos conservados: identicos se omiten; diferencias se agregan sin sobrescribir. No combina contactos por indicativo/hora. Exporta antes una copia JSON. Solo se guarda al aceptar.")
                            .setNegativeButton("Cancelar") { _, _ -> adifImportBusy = false; message("Importacion ADIF cancelada sin cambios.") }
                            .setOnCancelListener { adifImportBusy = false; message("Importacion ADIF cancelada sin cambios.") }
                            .setPositiveButton("Importar") { _, _ -> saveAdif(preview) }.show()
                    }
                } catch (error: IllegalArgumentException) {
                    adifImportError(error.message ?: "ADIF invalido.")
                } catch (error: IOException) {
                    adifImportError("No se pudo leer ADIF: ${error.message}")
                } catch (error: SecurityException) {
                    adifImportError("Sin permiso para leer ADIF: ${error.message}")
                }
            }
            return
        }
        if (requestCode == 40) {
            val uri = data?.data
            if (resultCode != RESULT_OK || uri == null) {
                message("Importacion JSON cancelada.")
                return
            }
            message("Importando copia JSON...")
            thread(name = "bricohams-import") {
                try {
                    val imported = RadioStore(applicationContext).use { importStore ->
                        val bytes = contentResolver.readDocument(uri, 16 * 1024 * 1024)
                        val json = Charsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString()
                        importStore.importSnapshot(json)
                    }
                    runOnUiThread {
                        if (!isDestroyed) {
                            render()
                            message("Importacion completada: $imported registros nuevos. Los identicos se conservaron sin duplicar.")
                        }
                    }
                } catch (error: IllegalArgumentException) {
                    exportError(error.message ?: "Copia JSON invalida; no se importo ningun registro.")
                } catch (error: IOException) {
                    exportError("No se pudo leer la copia: ${error.message}")
                } catch (error: SecurityException) {
                    exportError("Sin permiso de lectura: ${error.message}")
                } catch (error: SQLiteException) {
                    exportError("Importacion cancelada y revertida: ${error.message}")
                }
            }
            return
        }
        if (requestCode == 30) {
            val uri = data?.data
            if (resultCode != RESULT_OK || uri == null) {
                message("Importacion de audio cancelada.")
                return
            }
            val tone = audioTone
            val speed = audioSpeed
            message("Decodificando WAV; manten esta pantalla abierta.")
            thread(name = "bricohams-morse") {
                try {
                    val bytes = contentResolver.readDocument(uri, MorseAudio.MAX_WAV_BYTES)
                    val decoded = MorseAudio.decode(MorseAudio.readWav(bytes), tone, speed)
                    runOnUiThread {
                        if (!isDestroyed) {
                            audioResult = "${decoded.text}\n${decoded.morse}\n${decoded.warning}"
                            if (tab == "Morse") render()
                            message("Audio procesado. Revisa las limitaciones y contrasta el texto.")
                        }
                    }
                } catch (error: IllegalArgumentException) {
                    exportError(error.message ?: "Audio invalido.")
                } catch (error: IOException) {
                    exportError("No se pudo leer el WAV: ${error.message}")
                } catch (error: SecurityException) {
                    exportError("Sin permiso para leer audio: ${error.message}")
                }
            }
            return
        }
        if (requestCode != 20) return
        val kind = exportKind
        exportKind = null
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null || kind == null) {
            message("Exportacion cancelada; los datos locales se conservan.")
            return
        }
        message("Exportando datos...")
        thread(name = "bricohams-export") {
            try {
                val value = RadioStore(applicationContext).use { exportStore ->
                    if (kind == "adif") Adif.export(exportStore.contacts()) else exportStore.export()
                }
                val stream = contentResolver.openOutputStream(uri, "wt") ?: throw IOException("Proveedor sin flujo de escritura.")
                stream.bufferedWriter(Charsets.UTF_8).use { it.write(value) }
                runOnUiThread { if (!isDestroyed) message("Archivo guardado. Verifica la copia antes de eliminar datos locales.") }
            } catch (error: IOException) {
                exportError("No se pudo completar el archivo: ${error.message}. Descarta cualquier archivo parcial.")
            } catch (error: SecurityException) {
                exportError("Sin permiso de escritura: ${error.message}")
            } catch (error: IllegalArgumentException) {
                exportError(error.message ?: "Datos de exportacion invalidos.")
            } catch (error: SQLiteException) {
                exportError("No se pudo leer la base local: ${error.message}")
            }
        }
    }
    private fun exportError(value: String) {
        runOnUiThread { if (!isDestroyed) message(value) }
    }
    private fun saveAdif(preview: AdifPreview) {
        message("Guardando ADIF en una transaccion...")
        thread(name = "bricohams-adif-save") {
            try {
                val (inserted, skipped) = RadioStore(applicationContext).use { it.importAdif(preview.contacts) }
                runOnUiThread {
                    adifImportBusy = false
                    if (!isDestroyed) {
                        render()
                        message("ADIF importado: $inserted contactos nuevos, $skipped identicos omitidos. ${preview.ignoredFields.size} campos no conservados indicados en la vista previa.")
                    }
                }
            } catch (error: IllegalArgumentException) {
                adifImportError("ADIF cancelado sin cambios: ${error.message}")
            } catch (error: SQLiteException) {
                adifImportError("Importacion ADIF revertida: ${error.message}")
            }
        }
    }
    private fun adifImportError(value: String) {
        runOnUiThread {
            adifImportBusy = false
            if (!isDestroyed) message(value)
        }
    }
    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString("tab", tab); outState.putString("session", sessionId); outState.putString("export", exportKind)
        outState.putString("editing", editingId)
        outState.putString("contactSearch", contactSearch)
        outState.putInt("tone", audioTone); outState.putInt("speed", audioSpeed); outState.putString("audioResult", audioResult)
        super.onSaveInstanceState(outState)
    }
    override fun onStop() {
        super.onStop()
        stopLocation()
        fix = null
    }
    override fun onDestroy() {
        store.close()
        super.onDestroy()
    }
}
