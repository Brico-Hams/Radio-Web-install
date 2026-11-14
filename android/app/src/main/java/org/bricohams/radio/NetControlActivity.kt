package org.bricohams.radio

import android.app.AlertDialog
import android.content.Intent
import android.database.sqlite.SQLiteException
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import java.io.IOException
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.time.temporal.ChronoUnit
import java.util.Locale
import java.util.UUID

private typealias Draft = NetFormDraft

/** Net Control logbook mode: the net control operator collects one voice check-in per station and exports the session. */
class NetControlActivity : LocalizedActivity() {
    private lateinit var store: RadioStore
    private lateinit var drafts: NetDraftStore
    private lateinit var status: TextView
    private lateinit var content: LinearLayout
    private var sessions = listOf<NetSession>()
    private var currentId: String? = null
    private var draft = Draft()
    private var baseline = ""
    private var restored = false
    private var purpose = NetPurpose.EXERCISE
    private val fields = linkedMapOf<String, EditText>()
    private var modeSpinner: Spinner? = null
    private var pendingExport: String? = null
    private val clock = DateTimeFormatter.ofPattern("HH:mm", Locale.ROOT).withZone(ZoneOffset.UTC)
    private val autosave = Runnable { guarded { persist() } }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = RadioStore(applicationContext)
        drafts = NetDraftStore.of(applicationContext)
        status = Brand.text(this, 14f, bold = true).apply {
            text = getString(R.string.net_intro)
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(status); addView(content, LinearLayout.LayoutParams(-1, -2))
        }
        setContentView(ScrollView(this).apply { addView(body) })
        guarded {
            sessions = store.netSessions()
            savedInstanceState?.getString(STATE_SESSION)?.let { id -> sessions.find { it.id == id }?.let { openSession(it) } }
            render()
            if (restored) message(getString(R.string.net_draft_restored))
        }
    }

    override fun onPause() {
        guarded { persist() }
        super.onPause()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        guarded { persist() }
        outState.putString(STATE_SESSION, currentId)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        content.removeCallbacks(autosave)
        store.close()
        super.onDestroy()
    }

    @Deprecated("Platform callback")
    override fun onBackPressed() { leaveSession { super.onBackPressed() } }

    override fun onKeyDown(keyCode: Int, event: android.view.KeyEvent?): Boolean {
        if (keyCode == android.view.KeyEvent.KEYCODE_ESCAPE) { onBackPressed(); return true }
        return super.onKeyDown(keyCode, event)
    }

    /** Opens [session], restoring its unsaved draft when one exists. */
    private fun openSession(session: NetSession) {
        currentId = session.id
        baseline = newDraft(session).toJson().toString()
        val saved = drafts.load(session.id)
        restored = saved != null && saved.toJson().toString() != baseline
        draft = if (restored) saved!! else newDraft(session)
        if (!restored) drafts.clear(session.id)
    }

    private fun dirty(): Boolean {
        capture()
        return currentId != null && draft.toJson().toString() != baseline
    }

    /** Stores the form as the session draft, or removes the draft when the form is untouched. */
    private fun persist() {
        val id = currentId ?: return
        if (dirty()) drafts.save(id, draft) else drafts.clear(id)
    }

    private fun scheduleAutosave() {
        content.removeCallbacks(autosave)
        content.postDelayed(autosave, 600)
    }

    private fun resetForm(session: NetSession, mode: String?) {
        draft = newDraft(session).also { it.mode = mode }
        baseline = draft.toJson().toString()
        restored = false
        drafts.clear(session.id)
    }

    /** Back/escape/"back to sessions": asks before abandoning an unsaved form, then runs [leave]. */
    private fun leaveSession(leave: () -> Unit) {
        val session = current
        if (session == null) { leave(); return }
        guarded {
            if (!dirty()) { drafts.clear(session.id); leave(); return@guarded }
            AlertDialog.Builder(this).setTitle(R.string.net_leave_title).setMessage(R.string.net_leave_message)
                .setPositiveButton(R.string.net_leave_save) { _, _ -> guarded {
                    saveCheckIn(session)
                    leave()
                } }
                .setNeutralButton(R.string.net_leave_keep) { _, _ -> guarded { persist(); leave() } }
                .setNegativeButton(R.string.net_leave_discard) { _, _ -> guarded { drafts.clear(session.id); leave() } }
                .show()
        }
    }

    private fun message(value: String) { status.text = value }

    private fun guarded(action: () -> Unit) {
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
        }
    }

    private fun label(value: String) = Brand.text(this, 14f, Brand.Palette(this).muted).apply {
        text = value; setPadding(0, Brand.dp(this@NetControlActivity, 8), 0, 0)
        content.addView(this)
    }

    private fun heading(value: String) = content.addView(Brand.heading(this, value))

    private fun note(value: String) = content.addView(Brand.text(this, 15f).apply {
        text = value; setPadding(0, Brand.dp(this@NetControlActivity, 4), 0, Brand.dp(this@NetControlActivity, 4))
    })

    private fun button(label: String, primary: Boolean = false, description: String = label, action: () -> Unit) {
        content.addView(Brand.button(this, label, primary) { guarded(action) }.apply { contentDescription = description })
    }

    private fun field(key: String, caption: Int, initial: String, size: Float = 18f, numeric: Boolean = false,
        decimal: Boolean = false, signed: Boolean = false, caps: Boolean = false): EditText {
        val title = label(getString(caption))
        val edit = EditText(this).apply {
            id = View.generateViewId()
            hint = getString(caption); contentDescription = getString(caption)
            textSize = size
            minHeight = Brand.dp(this@NetControlActivity, 56)
            inputType = when {
                numeric -> InputType.TYPE_CLASS_NUMBER or (if (decimal) InputType.TYPE_NUMBER_FLAG_DECIMAL else 0) or
                    (if (signed) InputType.TYPE_NUMBER_FLAG_SIGNED else 0)
                caps -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
                else -> InputType.TYPE_CLASS_TEXT
            }
            setText(initial)
            addTextChangedListener(object : android.text.TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: android.text.Editable?) { if (currentId != null) scheduleAutosave() }
            })
        }
        title.labelFor = edit.id
        content.addView(edit)
        fields[key] = edit
        return edit
    }

    private fun chips(caption: Int, options: List<Pair<String, Boolean>>, onPick: (Int) -> Unit) {
        label(getString(caption))
        val row = Brand.row(this)
        options.forEachIndexed { index, (text, active) ->
            row.addView(Brand.chip(this, text, active) { guarded { capture(); onPick(index); persist(); render() } }.apply {
                contentDescription = getString(R.string.net_chip_description, getString(caption), text)
            })
        }
        content.addView(row, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
    }

    private fun capture() {
        fields.forEach { (key, edit) -> draft.text[key] = edit.text.toString() }
        modeSpinner?.let { draft.mode = it.selectedItem.toString() }
    }

    private fun newDraft(session: NetSession?) = Draft().apply {
        val mode = session?.mode ?: "FM"
        this.mode = mode
        text["power"] = "25"
        session?.let { text["freq"] = it.frequencyMHz }
        text["rstSent"] = if (mode == "CW" || mode == "RTTY") "599" else "59"
        text["rstReceived"] = text["rstSent"]!!
    }

    private val current get() = sessions.find { it.id == currentId }

    private fun render() {
        content.removeAllViews(); fields.clear(); modeSpinner = null
        val session = current
        if (session == null) sessionList() else sessionScreen(session)
    }

    private fun modePicker(caption: Int, selected: String) {
        val title = label(getString(caption))
        modeSpinner = Spinner(this).apply {
            id = View.generateViewId()
            adapter = ArrayAdapter(this@NetControlActivity, android.R.layout.simple_spinner_dropdown_item, Contact.MODES)
            setSelection(Contact.MODES.indexOf(selected).coerceAtLeast(0))
            contentDescription = getString(caption)
            title.labelFor = id
            content.addView(this)
        }
    }

    private fun sessionList() {
        if (sessions.isNotEmpty()) heading(getString(R.string.net_saved_sessions))
        for (session in sessions) {
            val summary = session.summary()
            button(getString(R.string.net_open_session, session.name, session.startUtc.truncatedTo(ChronoUnit.MINUTES).toString(),
                summary.stations, summary.checkIns)) {
                openSession(session); render()
                if (restored) message(getString(R.string.net_draft_restored))
            }
        }
        heading(getString(R.string.net_new_session))
        field("sname", R.string.net_session_name, draft.text["sname"] ?: "")
        field("scall", R.string.net_control_call, draft.text["scall"] ?: ProfileStore.callsign(this), caps = true)
        field("sfreq", R.string.net_frequency, draft.text["sfreq"] ?: "", numeric = true, decimal = true)
        modePicker(R.string.net_mode, draft.mode ?: "FM")
        chips(R.string.net_purpose, NetPurpose.values().map { getString(it.label) to (it == purpose) }) {
            purpose = NetPurpose.values()[it]
        }
        button(getString(R.string.net_start), primary = true) {
            capture()
            fun s(key: String) = draft.text[key].orEmpty().trim()
            val session = NetSession(name = s("sname"), controlCall = s("scall").uppercase(), frequencyMHz = s("sfreq"),
                mode = draft.mode ?: "FM", startUtc = Instant.now().truncatedTo(ChronoUnit.SECONDS), purpose = purpose).validated()
            store.saveNetSession(session)
            sessions = store.netSessions()
            currentId = session.id
            val mode = session.mode
            resetForm(session, mode)
            render()
            message(getString(R.string.net_started, session.name))
        }
    }

    private fun sessionScreen(session: NetSession) {
        val summary = session.summary()
        heading(session.name)
        note(getString(R.string.net_header, session.controlCall, session.frequencyMHz, session.mode, getString(session.purpose.label),
            session.startUtc.truncatedTo(ChronoUnit.MINUTES).toString(),
            session.endUtc?.truncatedTo(ChronoUnit.MINUTES)?.toString() ?: getString(R.string.net_open), summary.checkIns))
        entryForm(session)
        checkInList(session)
        summaryCard(summary)
        button(getString(R.string.net_export_csv)) { export("csv") }
        button(getString(R.string.net_export_json)) { export("json") }
        button(getString(R.string.net_export_adif)) { export("adif") }
        button(getString(if (session.endUtc == null) R.string.net_close else R.string.net_reopen)) {
            saveSession(session.copy(endUtc = if (session.endUtc == null) Instant.now().truncatedTo(ChronoUnit.SECONDS) else null))
            message(getString(if (session.endUtc == null) R.string.net_closed else R.string.net_reopened))
        }
        button(getString(R.string.net_delete_session)) {
            AlertDialog.Builder(this).setTitle(getString(R.string.net_delete_session_title, session.name))
                .setMessage(R.string.net_delete_session_message)
                .setNegativeButton(R.string.action_cancel, null)
                .setPositiveButton(R.string.net_delete) { _, _ -> guarded {
                    store.deleteNetSession(session.id); drafts.clear(session.id)
                    sessions = store.netSessions(); currentId = null; render(); message(getString(R.string.net_session_deleted))
                } }.show()
        }
        button(getString(R.string.net_back_to_sessions)) { leaveSession { currentId = null; render() } }
    }

    private fun saveSession(session: NetSession) {
        store.saveNetSession(session)
        sessions = store.netSessions()
        render()
    }

    private fun entryForm(session: NetSession) {
        val d = draft
        heading(getString(if (d.editing == null) R.string.net_checkin_new else R.string.net_checkin_edit))
        note(getString(R.string.net_utc_auto))
        field("call", R.string.net_call, d.text["call"] ?: "", size = 28f, caps = true)
        button(getString(R.string.net_repeat_last)) { repeatLast() }
        field("name", R.string.net_operator_name, d.text["name"] ?: "")
        field("freq", R.string.net_frequency, d.text["freq"] ?: session.frequencyMHz, numeric = true, decimal = true)
        modePicker(R.string.net_mode, d.mode ?: session.mode)
        chips(R.string.net_station_type, NetStationType.values().map { getString(it.label) to (it == d.type) }) {
            d.type = NetStationType.values()[it]
            if (!d.sourceChosen) d.source = NetCheckIn.defaultPowerSource(d.type)
        }
        chips(R.string.net_power_steps, NetCheckIn.POWER_STEPS.map { it.toString() to (d.text["power"] == it.toString()) }) {
            d.text["power"] = NetCheckIn.POWER_STEPS[it].toString()
        }
        field("power", R.string.net_power_w, d.text["power"] ?: "25", size = 22f, numeric = true)
        field("town", R.string.net_town, d.text["town"] ?: "")
        field("locator", R.string.net_locator, d.text["locator"] ?: "", caps = true)
        chips(R.string.net_power_source, NetPowerSource.values().map { getString(it.label) to (it == d.source) }) {
            d.source = NetPowerSource.values()[it]; d.sourceChosen = true
        }
        heading(getString(R.string.net_weather))
        field("temp", R.string.net_temperature, d.text["temp"] ?: "", numeric = true, decimal = true, signed = true)
        field("pressure", R.string.net_pressure, d.text["pressure"] ?: "", numeric = true)
        chips(R.string.net_rain, NetRain.values().map { getString(it.label) to (it == d.rain) }) {
            d.rain = NetRain.values()[it].takeIf { value -> value != d.rain }
        }
        chips(R.string.net_wind, NetWind.values().map { getString(it.label) to (it == d.wind) }) {
            d.wind = NetWind.values()[it].takeIf { value -> value != d.wind }
        }
        field("windKmh", R.string.net_wind_kmh, d.text["windKmh"] ?: "", numeric = true)
        field("windDir", R.string.net_wind_direction, d.text["windDir"] ?: "", caps = true)
        chips(R.string.net_sky, NetSky.values().map { getString(it.label) to (it == d.sky) }) {
            d.sky = NetSky.values()[it].takeIf { value -> value != d.sky }
        }
        field("vis", R.string.net_visibility, d.text["vis"] ?: "", numeric = true, decimal = true)
        heading(getString(R.string.net_signal))
        field("rstSent", R.string.net_rst_sent, d.text["rstSent"] ?: "")
        field("rstReceived", R.string.net_rst_received, d.text["rstReceived"] ?: "")
        chips(R.string.net_readability, (1..5).map { it.toString() to (it == d.readability) }) {
            d.readability = (it + 1).takeIf { value -> value != d.readability }
        }
        heading(getString(R.string.net_optional))
        field("antenna", R.string.net_antenna, d.text["antenna"] ?: "")
        field("equipment", R.string.net_equipment, d.text["equipment"] ?: "")
        chips(R.string.net_priority, NetPriority.values().map { getString(it.label) to (it == d.priority) }) {
            d.priority = NetPriority.values()[it]
        }
        field("message", R.string.net_message, d.text["message"] ?: "")
        field("remarks", R.string.net_remarks, d.text["remarks"] ?: "")
        if (restored) {
            note(getString(R.string.net_draft_restored))
            button(getString(R.string.net_draft_discard)) { resetForm(session, session.mode); render() }
        }
        button(getString(if (d.editing == null) R.string.net_save_checkin else R.string.net_save_changes), primary = true) { saveCheckIn(session) }
        button(getString(R.string.net_clear_form)) { capture(); resetForm(session, d.mode); render() }
    }

    private fun repeatLast() {
        capture()
        val call = draft.text["call"].orEmpty().trim().uppercase()
        val previous = NetSession.lastKnown(call, sessions)
        if (previous == null) {
            message(getString(R.string.net_no_previous, call))
            return
        }
        draft.text.putAll(mapOf("name" to previous.name, "power" to previous.powerWatts.toString(), "town" to previous.town,
            "locator" to previous.locator, "antenna" to previous.antenna, "equipment" to previous.equipment))
        draft.type = previous.stationType; draft.source = previous.powerSource; draft.sourceChosen = true
        render()
        message(getString(R.string.net_repeated, call))
    }

    private fun saveCheckIn(session: NetSession) {
        capture()
        val d = draft
        fun s(key: String) = d.text[key].orEmpty().trim()
        fun number(key: String): String? = s(key).replace(',', '.').takeIf { it.isNotEmpty() }
        fun int(key: String) = number(key)?.let { it.toIntOrNull() ?: throw LocalizedArgumentException(UiText(R.string.net_err_number, it)) }
        fun decimal(key: String) = number(key)?.let { it.toDoubleOrNull() ?: throw LocalizedArgumentException(UiText(R.string.net_err_number, it)) }
        val existing = session.checkIns.find { it.id == d.editing }
        val checkIn = NetCheckIn(
            id = existing?.id ?: UUID.randomUUID().toString(), order = existing?.order ?: session.nextOrder(),
            call = s("call"), name = s("name"), utc = existing?.utc ?: Instant.now().truncatedTo(ChronoUnit.SECONDS),
            frequencyMHz = s("freq"), mode = d.mode ?: session.mode, stationType = d.type, powerWatts = int("power") ?: 0,
            town = s("town"), locator = s("locator"), powerSource = d.source,
            temperatureC = decimal("temp"), pressureHpa = int("pressure"), rain = d.rain, wind = d.wind,
            windKmh = int("windKmh"), windDirection = s("windDir"), sky = d.sky, visibilityKm = decimal("vis"),
            rstSent = s("rstSent"), rstReceived = s("rstReceived"), readability = d.readability,
            antenna = s("antenna"), equipment = s("equipment"), priority = d.priority,
            message = s("message"), remarks = s("remarks")
        )
        val updated = session.withCheckIn(checkIn)
        val saved = updated.checkIns.first { it.id == checkIn.id }
        store.saveNetSession(updated)
        sessions = store.netSessions()
        val mode = d.mode
        resetForm(updated, mode)
        render()
        message(getString(R.string.net_checkin_saved, saved.order, saved.call))
    }

    private fun checkInList(session: NetSession) {
        heading(getString(R.string.net_checkins, session.checkIns.size))
        if (session.checkIns.isEmpty()) note(getString(R.string.net_no_checkins))
        for (c in session.checkIns.sortedByDescending { it.order }) {
            val card = Brand.card(this)
            card.addView(Brand.text(this, 18f, bold = true).apply {
                text = "#${c.order} ${c.call}" + if (c.name.isEmpty()) "" else " - ${c.name}"
            })
            card.addView(Brand.text(this, 14f, Brand.Palette(this).muted).apply {
                text = getString(R.string.net_item_detail, clock.format(c.utc), getString(c.stationType.label), c.powerWatts,
                    listOf(c.town, c.locator).filter { it.isNotEmpty() }.joinToString(" / "), getString(c.powerSource.label)) +
                    if (c.priority == NetPriority.ROUTINE) "" else "\n" + getString(c.priority.label) +
                        if (c.message.isEmpty()) "" else ": ${c.message}"
            })
            card.addView(Brand.button(this, getString(R.string.net_edit, c.call)) { guarded {
                capture(); loadDraft(c); baseline = draft.toJson().toString(); restored = false; render()
            } }.apply { contentDescription = getString(R.string.net_edit_description, c.order, c.call) })
            card.addView(Brand.button(this, getString(R.string.net_delete_checkin, c.call)) { guarded {
                AlertDialog.Builder(this).setTitle(getString(R.string.net_delete_title, c.call))
                    .setMessage(R.string.net_delete_message)
                    .setNegativeButton(R.string.action_cancel, null)
                    .setPositiveButton(R.string.net_delete) { _, _ -> guarded {
                        saveSession(session.withoutCheckIn(c.id)); message(getString(R.string.net_checkin_deleted, c.call))
                    } }.show()
            } }.apply { contentDescription = getString(R.string.net_delete_description, c.order, c.call) })
            content.addView(card)
        }
    }

    private fun loadDraft(c: NetCheckIn) {
        draft = Draft().apply {
            editing = c.id; mode = c.mode; type = c.stationType; source = c.powerSource; sourceChosen = true
            rain = c.rain; wind = c.wind; sky = c.sky; readability = c.readability; priority = c.priority
            text.putAll(mapOf("call" to c.call, "name" to c.name, "freq" to c.frequencyMHz, "power" to c.powerWatts.toString(),
                "town" to c.town, "locator" to c.locator, "temp" to (c.temperatureC?.toString() ?: ""),
                "pressure" to (c.pressureHpa?.toString() ?: ""), "windKmh" to (c.windKmh?.toString() ?: ""),
                "windDir" to c.windDirection, "vis" to (c.visibilityKm?.toString() ?: ""), "rstSent" to c.rstSent,
                "rstReceived" to c.rstReceived, "antenna" to c.antenna, "equipment" to c.equipment,
                "message" to c.message, "remarks" to c.remarks))
        }
    }

    private fun summaryCard(summary: NetSummary) {
        val card = Brand.card(this)
        card.addView(Brand.heading(this, getString(R.string.net_summary)).apply { setPadding(0, 0, 0, Brand.dp(this@NetControlActivity, 8)) })
        card.addView(Brand.text(this, 15f).apply {
            text = if (summary.checkIns == 0) getString(R.string.net_summary_empty) else listOf(
                getString(R.string.net_summary_stations, summary.stations, summary.checkIns),
                getString(R.string.net_summary_types, summary.mobile, summary.base, summary.portable, summary.maritime),
                getString(R.string.net_summary_power, summary.powerMin, String.format(Locale.ROOT, "%.1f", summary.powerAverage), summary.powerMax),
                getString(R.string.net_summary_sources, summary.powerSources[NetPowerSource.AC], summary.powerSources[NetPowerSource.SOLAR_BATTERY],
                    summary.powerSources[NetPowerSource.BATTERY]),
                getString(R.string.net_summary_traffic, summary.priority, summary.emergency)
            ).joinToString("\n")
            contentDescription = text
        })
        content.addView(card)
    }

    private fun export(kind: String) {
        val session = checkNotNull(current)
        // Fail before opening the file picker when the session cannot be exported.
        when (kind) { "csv" -> NetExport.csv(session); "json" -> NetExport.json(session); else -> NetExport.adif(session) }
        pendingExport = kind
        val slug = session.name.replace(Regex("[^A-Za-z0-9-]+"), "_").trim('_').ifEmpty { "net" }
        startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = when (kind) { "csv" -> "text/csv"; "json" -> "application/json"; else -> "text/plain" }
            putExtra(Intent.EXTRA_TITLE, "net-$slug." + if (kind == "adif") "adi" else kind)
        }, REQUEST_EXPORT)
    }

    @Deprecated("Platform callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_EXPORT) return
        val kind = pendingExport
        pendingExport = null
        val uri = data?.data
        val session = current
        if (resultCode != RESULT_OK || uri == null || kind == null || session == null) {
            message(getString(R.string.export_cancelled))
            return
        }
        try {
            val value = when (kind) {
                "csv" -> NetExport.csv(session)
                "json" -> NetExport.json(session)
                else -> NetExport.adif(session, ProfileStore.locator(this))
            }
            val stream = contentResolver.openOutputStream(uri, "wt") ?: throw IOException(getString(R.string.provider_no_stream))
            stream.bufferedWriter(Charsets.UTF_8).use { it.write(value) }
            message(getString(R.string.export_saved))
        } catch (error: IOException) {
            message(getString(R.string.export_write_error, errorText(error)))
        } catch (error: SecurityException) {
            message(getString(R.string.export_permission_error, errorText(error)))
        } catch (error: IllegalArgumentException) {
            message(errorText(error, R.string.export_invalid))
        }
    }

    private companion object {
        const val REQUEST_EXPORT = 51
        const val STATE_SESSION = "net_session"
    }
}
