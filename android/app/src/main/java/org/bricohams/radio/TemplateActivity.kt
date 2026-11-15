package org.bricohams.radio

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import java.io.IOException

/** Offline regional templates (country, zone, model) with preview and safe export through the system file picker. Never touches hardware. */
class TemplateActivity : LocalizedActivity() {
    private lateinit var country: Spinner
    private lateinit var zone: Spinner
    private lateinit var model: Spinner
    private lateinit var airports: CheckBox
    private lateinit var pmr: CheckBox
    private lateinit var cb: CheckBox
    private lateinit var info: TextView
    private lateinit var preview: TextView
    private lateinit var status: TextView
    private val profiles by lazy { ChannelTemplates.profiles(readAsset("profiles.json")) }
    private var dataset: ChannelTemplates.Dataset? = null
    private var zones = listOf<ChannelTemplates.Region>()
    private var pending: ChannelTemplates.Export? = null
    private val available by lazy { ChannelTemplates.available(ChannelTemplates.coverage(readAssetOrNull("coverage.json"))) }
    private val repeaterIndex by lazy { readRepeaterAsset("index.json")?.let { ChannelTemplates.repeaterIndex(String(it, Charsets.UTF_8)) } }
    private var repeaterCountries = listOf<ChannelTemplates.Country>()
    private lateinit var repeaterRadio: Spinner
    private lateinit var repeaterCountry: Spinner
    private var pendingFile: Pair<ChannelTemplates.RepeaterFile, ByteArray>? = null

    private fun readAsset(name: String) = assets.open("channel-templates/$name").use { String(it.readBytes(), Charsets.UTF_8) }
    // Optional datasets (airports, coverage) are absent for most countries.
    private fun readAssetOrNull(name: String) = try { readAsset(name) } catch (error: IOException) { null }
    private fun readRepeaterAsset(path: String) = try { assets.open("repeater-templates/$path").use { it.readBytes() } } catch (error: IOException) { null }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val refresh = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) { if (parent === country) loadCountry() else render() }
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
        }
        fun picker(label: Int, values: List<String>) = Spinner(this).also {
            it.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, values)
            it.onItemSelectedListener = refresh
            it.contentDescription = getString(label)
            body.addView(Brand.text(this, 14f).apply { setText(label) })
            body.addView(it)
        }
        country = picker(R.string.template_country, available.map { "${it.code} - ${it.name}" })
        zone = picker(R.string.template_zone, listOf(getString(R.string.template_all_zones)))
        model = picker(R.string.template_model, profiles.map { it.label })
        airports = CheckBox(this).apply { setText(R.string.template_airports); isChecked = true; setOnCheckedChangeListener { _, _ -> render() } }
        pmr = CheckBox(this).apply { setText(R.string.template_pmr); isChecked = false; setOnCheckedChangeListener { _, _ -> render() } }
        cb = CheckBox(this).apply { setText(R.string.template_cb); isChecked = false; setOnCheckedChangeListener { _, _ -> render() } }
        info = Brand.text(this, 14f)
        preview = Brand.text(this, 13f).apply { typeface = android.graphics.Typeface.MONOSPACE; setTextIsSelectable(true) }
        status = Brand.text(this, 14f, bold = true).apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        body.addView(airports); body.addView(pmr); body.addView(cb); body.addView(info)
        body.addView(Brand.button(this, getString(R.string.template_export), true) { export() })
        addRepeaterSection(body)
        body.addView(status); body.addView(preview)
        setContentView(ScrollView(this).apply { addView(body) })
        loadCountry()
    }

    private fun loadCountry() {
        try {
            val selected = available[country.selectedItemPosition]
            val loaded = ChannelTemplates.dataset(selected, readAsset("${selected.code}.json"), readAssetOrNull("${selected.code}-airports.json"),
                if (selected.code == "ES") readAssetOrNull("ES-airband-guide.json") else null)
            dataset = loaded
            zones = loaded.regions.sortedBy { it.name }
            zone.onItemSelectedListener = null
            zone.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item,
                listOf(getString(R.string.template_all_zones)) + zones.map { it.name })
            zone.setSelection(0, false)
            zone.onItemSelectedListener = country.onItemSelectedListener
            pmr.visibility = if (selected.pmr) View.VISIBLE else View.GONE
            pmr.isChecked = selected.pmr
            cb.visibility = if (selected.code == "ES") View.VISIBLE else View.GONE
            if (selected.code != "ES") cb.isChecked = false
            render()
        } catch (error: Exception) {
            dataset = null
            preview.text = ""
            status.text = getString(R.string.template_load_error, errorText(error))
        }
    }

    private fun current(): List<ChannelTemplates.Channel> {
        val loaded = dataset ?: return emptyList()
        val region = zones.getOrNull(zone.selectedItemPosition - 1)?.id ?: ""
        return ChannelTemplates.select(loaded, region, airports.isChecked, pmr.isChecked && loaded.country.pmr, cb.isChecked && loaded.country.code == "ES")
    }

    private fun render() {
        val loaded = dataset ?: return
        val channels = current()
        val plan = ChannelTemplates.zonePlan(profiles[model.selectedItemPosition], channels)
        val reasons = plan.reasons.entries.joinToString(", ") { "${it.key}: ${it.value}" }
        info.text = buildString {
            append(getString(R.string.template_counts, plan.accepted.size, plan.omitted))
            if (reasons.isNotEmpty()) append(" (").append(reasons).append(")")
            plan.zones.forEach { append("\n").append(getString(R.string.template_zone_line, it.index, it.name, it.channels.size)) }
            append("\n").append(getString(R.string.template_coverage, loaded.coverage, loaded.airportCoverage))
            if ("rxOnlyNotGuaranteed" in plan.warnings) append("\n").append(getString(R.string.template_rx_not_guaranteed))
        }
        preview.text = plan.accepted.take(PREVIEW_LIMIT).joinToString("\n") { "${it.zone} · ${it.rx} ${it.modulation} ${it.name} ${it.city}".trim() }
            .ifEmpty { getString(R.string.template_none_shown) }
    }

    private fun export() {
        try {
            val result = ChannelTemplates.export(profiles[model.selectedItemPosition], current())
            pending = result
            val code = available[country.selectedItemPosition].code
            startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE); type = result.mime
                putExtra(Intent.EXTRA_TITLE, "radicodex-${zones.getOrNull(zone.selectedItemPosition - 1)?.id ?: code}-${result.profile.id}.${result.profile.extension}")
            }, EXPORT_REQUEST)
        } catch (error: IllegalArgumentException) {
            status.text = getString(R.string.template_error, errorText(error))
        }
    }

    private fun addRepeaterSection(body: LinearLayout) {
        body.addView(Brand.text(this, 16f, bold = true).apply { setText(R.string.template_repeaters_title) })
        val index = repeaterIndex
        if (index == null) { body.addView(Brand.text(this, 14f).apply { setText(R.string.template_repeaters_none) }); return }
        val pendingCodes = index.countries.filterValues { it != "ok" }.keys.sorted().joinToString(", ").ifEmpty { "-" }
        body.addView(Brand.text(this, 14f).apply { text = getString(R.string.template_repeaters_help, pendingCodes) })
        // Europe first, then the Americas; countries without a prebuilt file ("pendiente de fuente") are not listed.
        repeaterCountries = index.countriesWithFiles().sortedBy { it.america }
        fun plain(label: Int, values: List<String>) = Spinner(this).also {
            it.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, values)
            it.contentDescription = getString(label)
            body.addView(Brand.text(this, 14f).apply { setText(label) })
            body.addView(it)
        }
        repeaterRadio = plain(R.string.template_repeaters_radio, index.radios.map { it.name })
        repeaterCountry = plain(R.string.template_repeaters_country, repeaterCountries.map {
            "${getString(if (it.america) R.string.template_repeaters_group_america else R.string.template_repeaters_group_europe)} · ${it.name}"
        })
        body.addView(Brand.button(this, getString(R.string.template_repeaters_download), false) { downloadRepeaters() })
        body.addView(Brand.button(this, getString(R.string.template_repeaters_apply), false) { applyRepeaters() })
    }

    private fun repeaterChoice(): ChannelTemplates.RepeaterFile? {
        val index = repeaterIndex ?: return null
        val radio = index.radios.getOrNull(repeaterRadio.selectedItemPosition) ?: return null
        val chosen = repeaterCountries.getOrNull(repeaterCountry.selectedItemPosition) ?: return null
        return index.file(radio.id, chosen.code)
    }

    private fun downloadRepeaters() {
        val entry = repeaterChoice() ?: run { status.setText(R.string.template_repeaters_none); return }
        val bytes = readRepeaterAsset(entry.path)
        val digest = bytes?.let { java.security.MessageDigest.getInstance("SHA-256").digest(it).joinToString("") { b -> "%02x".format(b) } }
        if (bytes == null || digest != entry.sha256) { status.setText(R.string.template_repeaters_corrupt); return }
        pendingFile = entry to bytes
        startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = if (entry.path.endsWith(".json")) "application/json" else "text/csv"
            putExtra(Intent.EXTRA_TITLE, "repeaters-${entry.radio}-${entry.country}.${entry.path.substringAfterLast('.')}")
        }, REPEATER_REQUEST)
    }

    /** There is no project to load into here, so "Aplicar" selects the same radio and country in the preview/export pickers above. */
    private fun applyRepeaters() {
        val entry = repeaterChoice() ?: run { status.setText(R.string.template_repeaters_none); return }
        val modelIndex = profiles.indexOfFirst { it.id == entry.radio }
        val countryIndex = available.indexOfFirst { it.code == entry.country }
        if (modelIndex < 0 || countryIndex < 0) { status.setText(R.string.template_repeaters_none); return }
        model.setSelection(modelIndex)
        country.setSelection(countryIndex)
        status.text = getString(R.string.template_repeaters_applied, available[countryIndex].name, profiles[modelIndex].label)
    }

    @Deprecated("Platform callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REPEATER_REQUEST) {
            val uri = data?.data
            val saved = pendingFile
            if (resultCode != RESULT_OK || uri == null || saved == null) { status.setText(R.string.template_cancelled); return }
            try {
                val output = contentResolver.openOutputStream(uri, "wt") ?: throw IOException(getString(R.string.provider_no_stream))
                output.use { it.write(saved.second) }
                status.text = getString(R.string.template_repeaters_saved, saved.first.channels, saved.first.dropped)
            } catch (error: IOException) { status.text = getString(R.string.template_error, errorText(error)) }
            catch (error: SecurityException) { status.text = getString(R.string.template_error, errorText(error)) }
            return
        }
        if (requestCode != EXPORT_REQUEST) return
        val uri = data?.data
        val result = pending
        if (resultCode != RESULT_OK || uri == null || result == null) { status.setText(R.string.template_cancelled); return }
        try {
            val output = contentResolver.openOutputStream(uri, "wt") ?: throw IOException(getString(R.string.provider_no_stream))
            output.use { it.write(result.content.toByteArray(Charsets.UTF_8)) }
            status.text = getString(R.string.template_exported, result.prepared.accepted.size, result.prepared.omitted)
        } catch (error: IOException) { status.text = getString(R.string.template_error, errorText(error)) }
        catch (error: SecurityException) { status.text = getString(R.string.template_error, errorText(error)) }
    }

    private companion object {
        const val EXPORT_REQUEST = 71
        const val REPEATER_REQUEST = 72
        const val PREVIEW_LIMIT = 60
    }
}
