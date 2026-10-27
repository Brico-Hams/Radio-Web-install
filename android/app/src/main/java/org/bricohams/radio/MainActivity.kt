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
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlin.concurrent.thread

class MainActivity : Activity() {
    private lateinit var store: RadioStore
    private lateinit var content: LinearLayout
    private lateinit var status: TextView
    private var tab = TAB_HOME
    private var sessionId: String? = null
    private var editingId: String? = null
    private var contactSearch = ""
    private var logbookId = Logbook.GENERAL
    private var lastFrequency = ""
    private var lastMode = "FM"
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
        message(getString(R.string.gps_timeout))
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
                message(getString(R.string.gps_fix, location.accuracy.toInt()))
            }
        }
        override fun onProviderEnabled(provider: String) = Unit
        override fun onProviderDisabled(provider: String) {
            stopLocation()
            message(getString(R.string.gps_disabled))
        }
        @Deprecated("Platform callback")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = RadioStore(this)
        tab = savedInstanceState?.getString("tab") ?: TAB_HOME
        sessionId = savedInstanceState?.getString("session")
        editingId = savedInstanceState?.getString("editing")
        contactSearch = savedInstanceState?.getString("contactSearch") ?: ""
        logbookId = savedInstanceState?.getString("logbook") ?: Logbook.GENERAL
        lastFrequency = savedInstanceState?.getString("lastFrequency") ?: ""
        lastMode = savedInstanceState?.getString("lastMode") ?: "FM"
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
        for ((name, label) in TABS) {
            nav.addView(Button(this).apply {
                setText(label)
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
    private fun text(value: Int) = text(getString(value))
    private fun button(value: String, action: () -> Unit) = Button(this).apply {
        text = value; setOnClickListener { userAction(action) }; content.addView(this)
    }
    private fun button(value: Int, action: () -> Unit) = button(getString(value), action)
    private fun input(label: Int, identifier: Int, initial: String = "", numeric: Boolean = false) =
        input(getString(label), identifier, initial, numeric)
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
            message(errorText(error, R.string.main_invalid_data))
        } catch (error: DateTimeParseException) {
            message(getString(R.string.main_invalid_utc, error.parsedString))
        } catch (error: SQLiteException) {
            message(getString(R.string.main_database_error, errorText(error)))
        } catch (error: IllegalStateException) {
            message(errorText(error, R.string.main_invalid_state))
        } catch (error: SecurityException) {
            message(getString(R.string.main_permission_denied, errorText(error)))
        }
    }
    private fun render() {
        content.removeAllViews()
        message(getString(R.string.main_beta_banner))
        userAction {
            when (tab) {
                TAB_LOGBOOK -> logbook()
                TAB_ARDF -> ardf()
                TAB_MORSE -> morse()
                else -> home()
            }
        }
    }
    private fun home() {
        text("Bricohams Android ${packageManager.getPackageInfo(packageName, 0).versionName}")
        text(R.string.home_offline)
        text(R.string.home_features)
        text(R.string.home_ardf_note)
        text(R.string.home_privacy)
        button(R.string.home_export_json) { export("json") }
        button(R.string.home_open_cat) { startActivity(Intent(this, CatActivity::class.java)) }
        button(R.string.home_open_channels) { startActivity(Intent(this, ChannelActivity::class.java)) }
        button(R.string.home_open_sstv) { startActivity(Intent(this, SstvActivity::class.java)) }
        button(R.string.home_open_live) { startActivity(Intent(this, LiveAudioActivity::class.java)) }
        button(R.string.home_open_satellites) { startActivity(Intent(this, SatelliteActivity::class.java)) }
        button(R.string.home_import_json) {
            AlertDialog.Builder(this).setTitle(R.string.import_json_title)
                .setMessage(R.string.import_json_message)
                .setNegativeButton(R.string.action_cancel, null)
                .setPositiveButton(R.string.import_json_choose) { _, _ ->
                    startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE); type = "application/json"
                    }, 40)
                }.show()
        }
    }
    private fun spinner(identifier: Int, values: List<String>, selected: String) = Spinner(this).apply {
        id = identifier
        adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, values)
        setSelection(values.indexOf(selected).coerceAtLeast(0))
        content.addView(this)
    }
    private fun describe(logbook: Logbook) =
        if (logbook.kind == "GENERAL") logbook.name else "${logbook.name} (${logbook.kind} ${logbook.reference}, ${logbook.stationCall})"
    private fun rstFor(mode: String) = if (mode == "CW" || mode == "RTTY") "599" else "59"
    private fun logbook() {
        val logbooks = store.logbooks()
        val current = logbooks.find { it.id == logbookId } ?: logbooks.first().also { logbookId = it.id; editingId = null }
        val contacts = store.contacts(current.id)
        val editing = editingId?.let { identifier ->
            requireNotNull(contacts.find { it.id == identifier }) { getString(R.string.logbook_missing_contact) }
        }
        text(getString(R.string.logbook_current, describe(current), contacts.size))
        button(getString(R.string.logbook_switch, logbooks.size)) {
            AlertDialog.Builder(this).setTitle(R.string.logbook_books)
                .setItems(logbooks.map(::describe).toTypedArray()) { _, index ->
                    logbookId = logbooks[index].id; editingId = null; contactSearch = ""; render()
                }.show()
        }
        val call = input(R.string.logbook_call, R.id.contact_call, editing?.call ?: "")
        val frequency = input(R.string.logbook_frequency, R.id.contact_frequency, editing?.frequencyMHz ?: lastFrequency, numeric = true)
        val modes = listOf("FM", "SSB", "CW", "AM", "RTTY", "SSTV", "DMR", "DIGITALVOICE")
        val mode = spinner(R.id.contact_mode, modes, editing?.mode ?: lastMode)
        val sent = input(R.string.logbook_sent, R.id.contact_sent, editing?.sent ?: rstFor(lastMode))
        val received = input(R.string.logbook_received, R.id.contact_received, editing?.received ?: rstFor(lastMode))
        // Quick entry: switching mode swaps untouched default reports (59 phone, 599 CW/RTTY); edits keep stored reports.
        if (editing == null) mode.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) {
                for (field in listOf(sent, received)) if (field.text.toString() in setOf("59", "599")) field.setText(rstFor(modes[position]))
            }
            override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
        }
        val utc = input(R.string.logbook_utc_auto, R.id.contact_utc, editing?.utc?.toString() ?: "")
        val notes = input(R.string.logbook_notes, R.id.contact_notes, editing?.notes ?: "")
        button(if (editing == null) R.string.logbook_save_new else R.string.logbook_save_changes) {
            val utcText = utc.text.toString().trim()
            val updated = Contact(call = call.text.toString().trim().uppercase(Locale.ROOT),
                utc = if (utcText.isEmpty()) Instant.now().truncatedTo(ChronoUnit.SECONDS) else Instant.parse(utcText),
                frequencyMHz = frequency.text.toString().trim(),
                mode = mode.selectedItem.toString(), sent = sent.text.toString().trim(),
                received = received.text.toString().trim(), notes = notes.text.toString(), logbook = current.id)
                .let { if (editing != null) it.copy(id = editing.id) else it }.validated()
            fun commit() {
                store.save(updated, editing != null)
                if (editing == null) { lastFrequency = updated.frequencyMHz; lastMode = updated.mode }
                editingId = null
                render()
                message(getString(R.string.logbook_saved_in, updated.call, current.name, updated.utc.toString()))
            }
            val duplicate = current.duplicateOf(updated, contacts)
            if (duplicate == null) commit()
            else AlertDialog.Builder(this).setTitle(getString(R.string.logbook_duplicate_title, updated.call))
                .setMessage(getString(R.string.logbook_duplicate_message, current.name, duplicate.utc.toString(),
                    Adif.band(duplicate.frequencyMHz) ?: duplicate.frequencyMHz + " MHz", duplicate.mode,
                    if (current.kind == "GENERAL") "" else getString(R.string.logbook_duplicate_rule, current.kind)))
                .setNegativeButton(R.string.logbook_dont_save) { _, _ -> message(getString(R.string.logbook_duplicate_not_saved)) }
                .setPositiveButton(R.string.logbook_save_anyway) { _, _ -> userAction(::commit) }.show()
        }
        if (editing != null) {
            button(R.string.logbook_cancel_edit) { editingId = null; render() }
            button(R.string.logbook_delete) {
                AlertDialog.Builder(this).setTitle(getString(R.string.logbook_delete_title, editing.call))
                    .setMessage(R.string.logbook_delete_message)
                    .setNegativeButton(R.string.action_cancel, null)
                    .setPositiveButton(R.string.action_delete) { _, _ -> userAction {
                        store.deleteContact(editing.id); editingId = null; render(); message(getString(R.string.logbook_deleted))
                    } }.show()
            }
        }
        button(R.string.logbook_export_adif) { export("adif") }
        button(R.string.logbook_import_adif) {
            require(!adifImportBusy) { getString(R.string.adif_busy) }
            startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE); type = "*/*"
            }, 41)
        }
        button(getString(R.string.logbook_export_json)) { export("json") }
        text(getString(R.string.logbook_lotw))
        text(getString(R.string.logbook_unsaved))
        val search = input(R.string.logbook_search_label, R.id.contact_search, contactSearch)
        button(getString(R.string.logbook_search)) { contactSearch = search.text.toString().trim(); render() }
        button(getString(R.string.logbook_show_all)) { contactSearch = ""; render() }
        val filtered = contacts.filter {
            contactSearch.isEmpty() || listOf(it.call, it.notes, it.mode, it.frequencyMHz, it.utc.toString())
                .any { value -> value.contains(contactSearch, ignoreCase = true) }
        }
        text(getString(R.string.logbook_matches, filtered.size))
        for (contact in filtered.take(50)) {
            val band = Adif.band(contact.frequencyMHz)?.let { " ($it)" } ?: ""
            text("${contact.call} - ${contact.utc}\n${contact.frequencyMHz} MHz$band ${contact.mode} ${contact.sent}/${contact.received}\n${contact.notes}")
            button(getString(R.string.logbook_edit, contact.call, contact.utc.toString())) { editingId = contact.id; render() }
        }
        if (filtered.size > 50) text(R.string.logbook_truncated)
        text(R.string.logbook_create_help)
        val bookName = input(R.string.logbook_name, R.id.logbook_name)
        val kind = spinner(R.id.logbook_kind, Logbook.KINDS, "GENERAL")
        val reference = input(R.string.logbook_reference, R.id.logbook_reference)
        val station = input(R.string.logbook_station, R.id.logbook_station, current.stationCall)
        button(R.string.logbook_create) {
            val created = store.createLogbook(Logbook(name = bookName.text.toString().trim(), kind = kind.selectedItem.toString(),
                reference = reference.text.toString().trim().uppercase(Locale.ROOT),
                stationCall = station.text.toString().trim().uppercase(Locale.ROOT)))
            logbookId = created.id; editingId = null; contactSearch = ""
            render()
            message(getString(R.string.logbook_created, created.name))
        }
    }
    private fun ardf() {
        val sessions = store.sessions()
        val name = input(R.string.ardf_session_name, R.id.session_name)
        button(R.string.ardf_create) {
            sessionId = store.session(name.text.toString().trim())
            render()
        }
        if (sessions.isEmpty()) {
            text(R.string.ardf_create_first)
            return
        }
        if (sessions.none { it.first == sessionId }) sessionId = sessions.first().first
        button(getString(R.string.ardf_select, sessions.first { it.first == sessionId }.second)) {
            AlertDialog.Builder(this).setTitle(R.string.ardf_session_title)
                .setItems(sessions.map { it.second }.toTypedArray()) { _, index ->
                    sessionId = sessions[index].first; fix = null; render()
                }.show()
        }
        text(store.observations(requireNotNull(sessionId)).groupBy { it.fox }.toSortedMap()
            .map { (beacon, entries) -> getString(R.string.ardf_count_line, beacon, entries.size) }
            .joinToString("\n").ifEmpty { getString(R.string.ardf_no_observations) })
        button(R.string.ardf_stats_button) {
            val observations = store.observations(requireNotNull(sessionId))
            val summary = ArdfStatistics.calculate(observations)
            val report = buildString {
                appendLine(getString(R.string.ardf_stats_observations, summary.count, summary.located))
                appendLine(rootFormat(R.string.ardf_stats_span, summary.spanSeconds))
                appendLine(rootFormat(R.string.ardf_stats_distance, summary.distanceMeters, summary.distanceSegments))
                appendLine(getString(R.string.ardf_stats_disclaimer))
                for (beacon in summary.beacons) {
                    append('\n').appendLine(getString(R.string.ardf_stats_beacon, beacon.fox, beacon.count, beacon.located))
                    appendLine(getString(R.string.ardf_stats_first_last, beacon.first.toString(), beacon.last.toString()))
                    appendLine(beacon.meanIntervalSeconds?.let { rootFormat(R.string.ardf_stats_mean, it) }
                        ?: getString(R.string.ardf_stats_mean_unavailable))
                }
                append('\n').appendLine(getString(R.string.ardf_stats_latest))
                for (observation in observations.takeLast(100).asReversed()) {
                    append('\n').appendLine(getString(R.string.ardf_stats_observation, observation.utc.toString(),
                        observation.fox, observation.notes))
                    val position = observation.fix
                    appendLine(if (position == null) getString(R.string.ardf_stats_no_coordinates) else
                        getString(R.string.ardf_stats_position, position.latitude.toString(), position.longitude.toString(),
                            position.accuracyMeters.toString(), position.utc.toString()))
                }
            }
            AlertDialog.Builder(this).setTitle(R.string.ardf_stats_title)
                .setView(ScrollView(this).apply {
                    addView(TextView(this@MainActivity).apply { text = report; setPadding(dp(16), dp(12), dp(16), dp(12)) })
                }).setPositiveButton(R.string.action_close, null).show()
        }
        val fox = input(R.string.ardf_fox_label, R.id.fox_number, "1", true)
        val notes = input(R.string.ardf_notes_label, R.id.observation_notes)
        text(R.string.ardf_coordinate_note)
        button(R.string.ardf_gps_once) { requestLocation() }
        button(R.string.ardf_save) {
            val age = SystemClock.elapsedRealtimeNanos() - fixElapsedNanos
            val current = if (age in 0..30_000_000_000L) fix else null
            val beacon = fox.text.toString().toIntOrNull()
            require(beacon != null) { getString(R.string.ardf_fox_invalid) }
            store.observe(requireNotNull(sessionId), beacon, notes.text.toString(), current)
            fix = null
            render()
            message(getString(if (current == null) R.string.ardf_saved_without else R.string.ardf_saved_with))
        }
        button(R.string.ardf_export_json) { export("json") }
    }
    private fun morse() {
        text(R.string.morse_text_help)
        val code = input(R.string.morse_code_label, R.id.morse_input, "... --- ...")
        val result = text("")
        button(R.string.morse_interpret) { result.text = Morse.decode(code.text.toString()) }
        text(R.string.morse_audio_help)
        val tone = input(R.string.morse_tone_label, R.id.morse_tone, audioTone.toString(), true)
        val speed = input(R.string.morse_speed_label, R.id.morse_speed, audioSpeed.toString(), true)
        button(R.string.morse_import_wav) {
            val selectedTone = tone.text.toString().toIntOrNull()
            val selectedSpeed = speed.text.toString().toIntOrNull()
            require(selectedTone != null && selectedTone in 300..1200 && selectedSpeed != null && selectedSpeed in 5..45) {
                getString(R.string.morse_invalid_settings)
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
        AlertDialog.Builder(this).setTitle(R.string.location_title)
            .setMessage(R.string.location_message)
            .setNegativeButton(R.string.action_cancel, null)
            .setPositiveButton(R.string.action_continue) { _, _ ->
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
            message(getString(R.string.gps_not_authorized))
            return
        }
        require(locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) { getString(R.string.gps_enable_required) }
        locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 0f, locationListener, Looper.getMainLooper())
        listening = true
        handler.postDelayed(timeout, 30000L)
        message(getString(R.string.gps_waiting))
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
            if (tab == TAB_ARDF && hasWindowFocus()) startLocation()
            else message(getString(R.string.gps_return_to_ardf))
        }
    }
    private fun export(kind: String) {
        require(exportKind == null) { getString(R.string.export_pending) }
        val book = store.logbooks().single { it.id == logbookId }
        if (kind == "adif") Adif.export(store.contacts(book.id), book)
        exportKind = kind
        // POTA expects activator uploads named CALL@PARK-YYYYMMDD.adi.
        val adifName = if (book.kind == "POTA") "${book.stationCall.replace('/', '_')}@${book.reference}-" +
            LocalDate.now(ZoneOffset.UTC).format(DateTimeFormatter.BASIC_ISO_DATE) + ".adi"
            else "bricohams-${book.name.replace(Regex("[^A-Za-z0-9-]+"), "_")}.adi"
        startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = if (kind == "adif") "text/plain" else "application/json"
            putExtra(Intent.EXTRA_TITLE, if (kind == "adif") adifName else "bricohams-field-data.json")
        }, 20)
    }
    @Deprecated("Platform callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 41) {
            val uri = data?.data
            if (resultCode != RESULT_OK || uri == null) {
                message(getString(R.string.adif_cancelled))
                return
            }
            if (adifImportBusy) {
                message(getString(R.string.adif_busy))
                return
            }
            adifImportBusy = true
            val book = logbookId
            message(getString(R.string.adif_validating))
            thread(name = "bricohams-adif-preview") {
                try {
                    val preview = AdifImport.parse(contentResolver.readDocument(uri, AdifImport.MAX_BYTES))
                    runOnUiThread {
                        if (isDestroyed || isFinishing) return@runOnUiThread
                        val warnings = if (preview.ignoredFields.isEmpty()) getString(R.string.adif_all_compatible)
                            else getString(R.string.adif_ignored, preview.ignoredFields.joinToString(", "))
                        AlertDialog.Builder(this).setTitle(getString(R.string.adif_preview_title, preview.contacts.size))
                            .setMessage(getString(R.string.adif_preview_message, warnings))
                            .setNegativeButton(R.string.action_cancel) { _, _ -> adifImportBusy = false; message(getString(R.string.adif_cancelled_unchanged)) }
                            .setOnCancelListener { adifImportBusy = false; message(getString(R.string.adif_cancelled_unchanged)) }
                            .setPositiveButton(R.string.action_import) { _, _ -> saveAdif(preview, book) }.show()
                    }
                } catch (error: IllegalArgumentException) {
                    adifImportError(errorText(error, R.string.adif_invalid))
                } catch (error: IOException) {
                    adifImportError(getString(R.string.adif_read_error, errorText(error)))
                } catch (error: SecurityException) {
                    adifImportError(getString(R.string.adif_permission_error, errorText(error)))
                }
            }
            return
        }
        if (requestCode == 40) {
            val uri = data?.data
            if (resultCode != RESULT_OK || uri == null) {
                message(getString(R.string.json_cancelled))
                return
            }
            message(getString(R.string.json_importing))
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
                            message(getString(R.string.json_imported, imported))
                        }
                    }
                } catch (error: IllegalArgumentException) {
                    exportError(errorText(error, R.string.json_invalid))
                } catch (error: IOException) {
                    exportError(getString(R.string.json_read_error, errorText(error)))
                } catch (error: SecurityException) {
                    exportError(getString(R.string.json_permission_error, errorText(error)))
                } catch (error: SQLiteException) {
                    exportError(getString(R.string.json_reverted, errorText(error)))
                }
            }
            return
        }
        if (requestCode == 30) {
            val uri = data?.data
            if (resultCode != RESULT_OK || uri == null) {
                message(getString(R.string.audio_cancelled))
                return
            }
            val tone = audioTone
            val speed = audioSpeed
            message(getString(R.string.audio_decoding))
            thread(name = "bricohams-morse") {
                try {
                    val bytes = contentResolver.readDocument(uri, MorseAudio.MAX_WAV_BYTES)
                    val decoded = MorseAudio.decode(MorseAudio.readWav(bytes), tone, speed)
                    runOnUiThread {
                        if (!isDestroyed) {
                            audioResult = "${decoded.text}\n${decoded.morse}\n${decoded.warning.resolve(this@MainActivity)}"
                            if (tab == TAB_MORSE) render()
                            message(getString(R.string.audio_done))
                        }
                    }
                } catch (error: IllegalArgumentException) {
                    exportError(errorText(error, R.string.audio_invalid))
                } catch (error: IOException) {
                    exportError(getString(R.string.audio_read_error, errorText(error)))
                } catch (error: SecurityException) {
                    exportError(getString(R.string.audio_permission_error, errorText(error)))
                }
            }
            return
        }
        if (requestCode != 20) return
        val kind = exportKind
        exportKind = null
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null || kind == null) {
            message(getString(R.string.export_cancelled))
            return
        }
        message(getString(R.string.export_running))
        val book = logbookId
        thread(name = "bricohams-export") {
            try {
                val value = RadioStore(applicationContext).use { exportStore ->
                    if (kind == "adif") Adif.export(exportStore.contacts(book), exportStore.logbooks().single { it.id == book })
                    else exportStore.export()
                }
                val stream = contentResolver.openOutputStream(uri, "wt") ?: throw IOException(getString(R.string.provider_no_stream))
                stream.bufferedWriter(Charsets.UTF_8).use { it.write(value) }
                runOnUiThread { if (!isDestroyed) message(getString(R.string.export_saved)) }
            } catch (error: IOException) {
                exportError(getString(R.string.export_write_error, errorText(error)))
            } catch (error: SecurityException) {
                exportError(getString(R.string.export_permission_error, errorText(error)))
            } catch (error: IllegalArgumentException) {
                exportError(errorText(error, R.string.export_invalid))
            } catch (error: SQLiteException) {
                exportError(getString(R.string.export_database_error, errorText(error)))
            }
        }
    }
    private fun exportError(value: String) {
        runOnUiThread { if (!isDestroyed) message(value) }
    }
    private fun saveAdif(preview: AdifPreview, book: String) {
        message(getString(R.string.adif_saving))
        thread(name = "bricohams-adif-save") {
            try {
                val (inserted, skipped) = RadioStore(applicationContext).use { importStore ->
                    importStore.importAdif(preview.contacts.map { it.copy(logbook = book) })
                }
                runOnUiThread {
                    adifImportBusy = false
                    if (!isDestroyed) {
                        render()
                        message(getString(R.string.adif_imported, inserted, skipped, preview.ignoredFields.size))
                    }
                }
            } catch (error: IllegalArgumentException) {
                adifImportError(getString(R.string.adif_save_cancelled, errorText(error)))
            } catch (error: SQLiteException) {
                adifImportError(getString(R.string.adif_reverted, errorText(error)))
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
        outState.putString("logbook", logbookId); outState.putString("lastFrequency", lastFrequency); outState.putString("lastMode", lastMode)
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
    private fun rootFormat(format: Int, vararg values: Any): String = String.format(Locale.ROOT, getString(format), *values)

    companion object {
        // Stable tab identifiers persisted in the instance state; labels come from resources.
        private const val TAB_HOME = "Inicio"
        private const val TAB_LOGBOOK = "Guardia"
        private const val TAB_ARDF = "ARDF"
        private const val TAB_MORSE = "Morse"
        private val TABS = linkedMapOf(TAB_HOME to R.string.tab_home, TAB_LOGBOOK to R.string.tab_logbook,
            TAB_ARDF to R.string.tab_ardf, TAB_MORSE to R.string.tab_morse)
    }
}
