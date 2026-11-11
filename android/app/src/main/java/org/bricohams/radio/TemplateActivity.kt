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

    private fun readAsset(name: String) = assets.open("channel-templates/$name").use { String(it.readBytes(), Charsets.UTF_8) }

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
        country = picker(R.string.template_country, ChannelTemplates.countries.map { "${it.code} - ${it.name}" })
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
        body.addView(status); body.addView(preview)
        setContentView(ScrollView(this).apply { addView(body) })
        loadCountry()
    }

    private fun loadCountry() {
        try {
            val selected = ChannelTemplates.countries[country.selectedItemPosition]
            val loaded = ChannelTemplates.dataset(selected, readAsset("${selected.code}.json"), readAsset("${selected.code}-airports.json"))
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
            val code = ChannelTemplates.countries[country.selectedItemPosition].code
            startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE); type = result.mime
                putExtra(Intent.EXTRA_TITLE, "radicodex-${zones.getOrNull(zone.selectedItemPosition - 1)?.id ?: code}-${result.profile.id}.${result.profile.extension}")
            }, EXPORT_REQUEST)
        } catch (error: IllegalArgumentException) {
            status.text = getString(R.string.template_error, errorText(error))
        }
    }

    @Deprecated("Platform callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
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
        const val PREVIEW_LIMIT = 60
    }
}
