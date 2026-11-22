package org.bricohams.radio

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.text.Editable
import android.text.InputFilter
import android.text.InputType
import android.text.TextWatcher
import android.view.View
import android.view.WindowInsets
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.io.IOException
import java.util.Locale

/**
 * Radio calculators with live graphics (port of the web tools page: tools-core.js / tools-ui.js). Every input updates its
 * results and charts at once; invalid values show the localized error under the section instead of failing.
 */
class ToolsActivity : LocalizedActivity() {
    private companion object {
        const val LOCATION_REQUEST = 81
        const val CUSTOM = "custom"
    }

    private val colors by lazy { Brand.Palette(this) }
    private lateinit var body: LinearLayout
    private var phoneLocation: PhoneLocation? = null

    private lateinit var gpsStatus: TextView
    private lateinit var latEdit: EditText
    private lateinit var lonEdit: EditText
    private lateinit var locatorEdit: EditText
    private lateinit var myEdit: EditText
    private lateinit var otherEdit: EditText
    private lateinit var fwdEdit: EditText
    private lateinit var refEdit: EditText
    private lateinit var ratioEdit: EditText
    private lateinit var customEdit: EditText
    private lateinit var coaxFreqEdit: EditText
    private lateinit var lengthEdit: EditText
    private lateinit var coaxPowerEdit: EditText
    private lateinit var powerValueEdit: EditText
    private lateinit var erpPowerEdit: EditText
    private lateinit var erpLossEdit: EditText
    private lateinit var erpGainEdit: EditText
    private lateinit var antennaFreqEdit: EditText
    private lateinit var velocityEdit: EditText
    private lateinit var bandFreqEdit: EditText
    private lateinit var regionNote: TextView
    private lateinit var customCaption: View

    private lateinit var locatorOut: Output
    private lateinit var coordsOut: Output
    private lateinit var distanceOut: Output
    private lateinit var swrOut: Output
    private lateinit var coaxOut: Output
    private lateinit var powerOut: Output
    private lateinit var erpOut: Output
    private lateinit var antennaOut: Output
    private lateinit var bandOut: Output

    private lateinit var map: ToolsWorldMapView
    private lateinit var compass: CompassRoseView
    private lateinit var gauge: SwrGaugeView
    private lateinit var coaxChart: CoaxChartView
    private lateinit var ladder: PowerLadderView
    private lateinit var antenna: AntennaDiagramView
    private lateinit var bandPlan: BandPlanView

    private var cable = "RG-213"
    private var powerUnit = RadioTools.PowerUnit.W
    private var region = 1
    private var swrByRatio = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = Brand.dp(this@ToolsActivity, 16)
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
        body.addView(BrandUi.sectionHeader(this, getString(R.string.tools_title), getString(R.string.tools_help), large = true))
        BrandUi.firstRunTip(this, "screen_tools", getString(R.string.tools_help))?.let { body.addView(it) }

        val start = startPosition()
        buildLocator(start)
        buildDistance(start)
        buildSwr()
        buildCoax()
        buildPower()
        buildAntenna()
        buildBands()
        buildRst()
        setContentView(scroll)
        refreshAll()
        loadLand()
    }

    override fun onPause() {
        phoneLocation?.stop()
        super.onPause()
    }

    override fun onDestroy() {
        phoneLocation?.stop()
        super.onDestroy()
    }

    // ---- Building blocks ----

    private inner class Output(parent: LinearLayout) {
        val result = Brand.text(this@ToolsActivity, 15f).apply {
            visibility = View.GONE
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        val error = Brand.text(this@ToolsActivity, 14f, colors.error).apply {
            visibility = View.GONE
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        init { parent.addView(result); parent.addView(error) }

        fun clear() {
            result.text = ""; result.visibility = View.GONE
            error.text = ""; error.visibility = View.GONE
        }

        /** Shows the lines produced by [block]; blank input clears quietly, invalid input shows the localized error. */
        fun run(blank: Boolean, block: () -> String): Boolean {
            clear()
            if (blank) return false
            return try {
                result.text = block(); result.visibility = View.VISIBLE
                true
            } catch (failure: IllegalArgumentException) {
                error.text = errorText(failure, R.string.main_invalid_data); error.visibility = View.VISIBLE
                false
            }
        }
    }

    private fun section(title: Int) = BrandUi.card(this, getString(title)).also { body.addView(it) }

    private fun subtitle(parent: LinearLayout, text: Int) = parent.addView(Brand.text(this, 16f, colors.text, true).apply {
        setText(text); setPadding(0, Brand.dp(this@ToolsActivity, 12), 0, 0)
    })

    private fun note(parent: LinearLayout, text: Int) =
        parent.addView(Brand.text(this, 13f, colors.muted).apply { setText(text); setPadding(0, Brand.dp(this@ToolsActivity, 6), 0, 0) })

    private fun watch(edit: EditText, action: () -> Unit) = edit.addTextChangedListener(object : TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
        override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        override fun afterTextChanged(s: Editable?) { action() }
    })

    private fun field(parent: LinearLayout, label: Int, initial: String = "", locator: Boolean = false, onChange: () -> Unit): EditText {
        val caption = Brand.text(this, 14f, colors.muted).apply { setText(label); setPadding(0, Brand.dp(this@ToolsActivity, 8), 0, 0) }
        val edit = EditText(this).apply {
            id = View.generateViewId()
            setTextColor(colors.text); setHintTextColor(colors.muted)
            setSingleLine()
            if (locator) {
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
                filters = arrayOf(InputFilter.LengthFilter(8))
            } else {
                inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
            }
            setText(initial)
        }
        caption.labelFor = edit.id
        parent.addView(caption)
        parent.addView(edit)
        watch(edit, onChange)
        return edit
    }

    /** Chips in rows of three; the selection is kept by the caller. */
    private fun choice(parent: LinearLayout, options: List<Pair<String, String>>, current: () -> String, select: (String) -> Unit) {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        fun render() {
            box.removeAllViews()
            for (chunk in options.chunked(3)) {
                val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
                for ((key, label) in chunk) row.addView(Brand.chip(this, label, key == current()) { select(key); render() })
                box.addView(row)
            }
        }
        render()
        parent.addView(box)
    }

    private fun chart(parent: LinearLayout, view: View) = parent.addView(view, LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
        topMargin = Brand.dp(this@ToolsActivity, 10); bottomMargin = Brand.dp(this@ToolsActivity, 4)
    })

    private fun fmt(value: Double, digits: Int) = toolsNumber(value, digits)

    private fun blank(vararg edits: EditText) = edits.any { it.text.isNullOrBlank() }

    private fun num(edit: EditText): Double {
        val value = edit.text.toString().trim().replace(',', '.').toDoubleOrNull()
        requireUi(value != null && value.isFinite()) { UiText(R.string.tools_err_number) }
        return value
    }

    private fun numOrNull(edit: EditText): Double? = runCatching { num(edit) }.getOrNull()

    private fun refreshAll() {
        updateLocator(); updateDistance(); updateSwr(); updateCoax(); updatePower(); updateErp(); updateAntenna(); updateBands()
    }

    // ---- Start position ----

    /** Saved profile position (or the locator centre), else the last phone fix. */
    private fun startPosition(): Pair<String, String> {
        val profile = ProfileStore.load(this)
        if (profile.latitude.isNotBlank() && profile.longitude.isNotBlank()) return profile.latitude to profile.longitude
        if (Maidenhead.isValid(profile.locator)) {
            val centre = Maidenhead.toLatLon(profile.locator)
            return fmt(centre.latitude, 5) to fmt(centre.longitude, 5)
        }
        PhoneLocation.loadLast(this)?.let { return fmt(it.latitude, 5) to fmt(it.longitude, 5) }
        return "" to ""
    }

    private fun loadLand() {
        Thread {
            try {
                val land = WorldMap.parseLand(assets.open("world-land-110m.txt").bufferedReader().use { it.readText() })
                runOnUiThread { if (!isDestroyed) map.land = land }
            } catch (_: IOException) {
            } catch (_: IllegalArgumentException) {
            }
        }.start()
    }

    // ---- Locator ----

    private fun buildLocator(start: Pair<String, String>) {
        val card = section(R.string.tools_sec_locator)
        latEdit = field(card, R.string.tools_latitude, start.first) { updateLocator() }
        lonEdit = field(card, R.string.tools_longitude, start.second) { updateLocator() }
        card.addView(BrandUi.secondaryButton(this, getString(R.string.tools_use_gps)) { useGps() })
        gpsStatus = Brand.text(this, 14f, colors.accent).apply {
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
            visibility = View.GONE
        }
        card.addView(gpsStatus)
        locatorOut = Output(card)
        subtitle(card, R.string.tools_sub_locator_to_coords)
        locatorEdit = field(card, R.string.tools_locator_input, locator = true) { updateLocator() }
        coordsOut = Output(card)
    }

    private fun updateLocator() {
        locatorOut.run(blank(latEdit, lonEdit)) {
            val lat = num(latEdit)
            val lon = num(lonEdit)
            getString(R.string.tools_locator6, RadioTools.latLonToLocator(lat, lon, 6)) + "\n" +
                getString(R.string.tools_locator8, RadioTools.latLonToLocator(lat, lon, 8))
        }
        coordsOut.run(blank(locatorEdit)) {
            val point = Maidenhead.toLatLon(locatorEdit.text.toString())
            getString(R.string.tools_coords_result, fmt(point.latitude, 5), fmt(point.longitude, 5))
        }
    }

    private fun gps(message: String) { gpsStatus.text = message; gpsStatus.visibility = View.VISIBLE }

    /** Same permission and search flow as the profile screen; a second tap ends the search with the best fix so far. */
    private fun useGps() {
        phoneLocation?.takeIf { it.running }?.let { it.finishNow(); return }
        if (!PhoneLocation.hasPermission(this)) {
            gps(getString(R.string.satellite_gps_asking))
            requestPermissions(PhoneLocation.PERMISSIONS, LOCATION_REQUEST)
            return
        }
        if (!PhoneLocation.servicesEnabled(this)) {
            gps(getString(R.string.satellite_gps_off))
            runCatching { startActivity(Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS)) }
            return
        }
        gps(getString(R.string.satellite_gps_searching, (PhoneLocation.TIMEOUT_MS / 1000).toInt()))
        val search = PhoneLocation(this, { progress -> if (!isDestroyed) showProgress(progress) }) { fix, live ->
            if (!isDestroyed) showFix(fix, live)
        }
        phoneLocation = search
        search.start()
    }

    private fun showProgress(progress: SearchProgress) {
        val seconds = ((progress.remainingMs + 999) / 1000).toInt()
        gps(getString(if (progress.haveFix) R.string.satellite_gps_refining else R.string.satellite_gps_searching, seconds))
    }

    private fun showFix(fix: PositionFix?, live: Boolean) {
        if (fix == null) {
            gps(getString(if (live) R.string.satellite_gps_timeout else R.string.satellite_gps_none))
            return
        }
        val now = System.currentTimeMillis()
        if (fix.ageMs(now) <= LocationSelector.FRESH_MS) PhoneLocation.saveLast(this, fix)
        latEdit.setText(fmt(fix.latitude, 5))
        lonEdit.setText(fmt(fix.longitude, 5))
        runCatching { myEdit.setText(Maidenhead.fromLatLon(fix.latitude, fix.longitude)) }
        val accuracy = fix.accuracyM?.let { String.format(Locale.ROOT, "%.0f m", it) } ?: "?"
        val approximate = if (PhoneLocation.precise(this)) "" else " " + getString(R.string.satellite_gps_approximate)
        gps(getString(R.string.satellite_gps_fix_detail, fix.source, accuracy, fix.ageMs(now) / 1000) + approximate)
    }

    @Deprecated("Platform callback")
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != LOCATION_REQUEST) return
        if (grantResults.any { it == PackageManager.PERMISSION_GRANTED }) useGps() else gps(getString(R.string.satellite_gps_denied))
    }

    // ---- Distance and bearing ----

    private fun buildDistance(start: Pair<String, String>) {
        val card = section(R.string.tools_sec_distance)
        val profile = ProfileStore.load(this)
        val mine = when {
            Maidenhead.isValid(profile.locator) -> Maidenhead.format(profile.locator)
            else -> runCatching { Maidenhead.fromLatLon(start.first.toDouble(), start.second.toDouble()) }.getOrDefault("")
        }
        myEdit = field(card, R.string.tools_my_locator, mine, locator = true) { updateDistance() }
        otherEdit = field(card, R.string.tools_other_locator, locator = true) { updateDistance() }
        distanceOut = Output(card)
        map = ToolsWorldMapView(this)
        chart(card, map)
        compass = CompassRoseView(this)
        chart(card, compass)
    }

    private fun updateDistance() {
        val mine = runCatching { Maidenhead.toLatLon(myEdit.text.toString()) }.getOrNull()
        var other: Maidenhead.LatLon? = null
        var bearing: Double? = null
        var distance: Double? = null
        distanceOut.run(blank(myEdit, otherEdit)) {
            val a = Maidenhead.toLatLon(myEdit.text.toString())
            val b = Maidenhead.toLatLon(otherEdit.text.toString())
            val result = RadioTools.greatCircle(a, b)
            other = b; bearing = result.bearing; distance = result.distanceKm
            fun degrees(value: Double) = (Math.round(value) % 360).toString()
            listOf(getString(R.string.tools_short_path, fmt(result.distanceKm, 1)),
                getString(R.string.tools_long_path, fmt(result.longPathKm, 1)),
                getString(R.string.tools_bearing, degrees(result.bearing)),
                getString(R.string.tools_reverse_bearing, degrees(result.reverseBearing))).joinToString("\n")
        }
        val names = runCatching { Maidenhead.format(myEdit.text.toString()) }.getOrDefault("") to
            runCatching { Maidenhead.format(otherEdit.text.toString()) }.getOrDefault("")
        map.show(mine, other, names.first, names.second, distance)
        compass.show(bearing)
    }

    // ---- SWR ----

    private fun buildSwr() {
        val card = section(R.string.tools_sec_swr)
        fwdEdit = field(card, R.string.tools_swr_forward) { swrByRatio = false; updateSwr() }
        refEdit = field(card, R.string.tools_swr_reflected) { swrByRatio = false; updateSwr() }
        ratioEdit = field(card, R.string.tools_swr_ratio) { swrByRatio = true; updateSwr() }
        swrOut = Output(card)
        gauge = SwrGaugeView(this)
        chart(card, gauge)
    }

    private fun updateSwr() {
        val byRatio = !blank(ratioEdit) && (swrByRatio || blank(fwdEdit, refEdit))
        var swr: Double? = null
        swrOut.run(if (byRatio) false else blank(fwdEdit, refEdit)) {
            val result = if (byRatio) RadioTools.swrFromRatio(num(ratioEdit)) else RadioTools.swrFromPower(num(fwdEdit), num(refEdit))
            swr = result.swr
            listOf(getString(R.string.tools_swr_result, fmt(result.swr, 2)) + " — " + getString(SwrGaugeView.quality(result.swr)),
                getString(R.string.tools_return_loss, fmt(result.returnLossDb, 2)),
                getString(R.string.tools_mismatch_loss, fmt(result.mismatchLossDb, 3)),
                getString(R.string.tools_reflected_percent, fmt(result.reflectedPercent, 2))).joinToString("\n")
        }
        gauge.show(swr)
    }

    // ---- Cable loss ----

    private fun buildCoax() {
        val card = section(R.string.tools_sec_coax)
        val options = RadioTools.COAX_TABLE.keys.map { it to it } + (CUSTOM to getString(R.string.tools_cable_custom))
        note(card, R.string.tools_cable)
        choice(card, options, { cable }) {
            cable = it
            customCaption.visibility = if (it == CUSTOM) View.VISIBLE else View.GONE
            customEdit.visibility = customCaption.visibility
            updateCoax()
        }
        customEdit = field(card, R.string.tools_attenuation) { updateCoax() }
        customCaption = (card.getChildAt(card.indexOfChild(customEdit) - 1))
        customEdit.visibility = View.GONE; customCaption.visibility = View.GONE
        coaxFreqEdit = field(card, R.string.tools_frequency_mhz) { updateCoax() }
        lengthEdit = field(card, R.string.tools_length_m) { updateCoax() }
        coaxPowerEdit = field(card, R.string.tools_power_w) { updateCoax() }
        coaxOut = Output(card)
        note(card, R.string.tools_coax_note)
        coaxChart = CoaxChartView(this)
        chart(card, coaxChart)
    }

    private fun updateCoax() {
        val custom = cable == CUSTOM
        val frequency = numOrNull(coaxFreqEdit)
        val marker = if (custom || frequency == null) null else runCatching { RadioTools.coaxDbPer100m(cable, frequency) }.getOrNull()
        coaxOut.run(blank(lengthEdit, coaxPowerEdit) || blank(if (custom) customEdit else coaxFreqEdit)) {
            val result = RadioTools.coaxLoss(if (custom) null else cable, if (custom) Double.NaN else num(coaxFreqEdit),
                num(lengthEdit), num(coaxPowerEdit), if (custom) num(customEdit) else null)
            listOf(getString(R.string.tools_coax_attenuation_result, fmt(result.dbPer100m, 2)),
                getString(R.string.tools_coax_loss_result, fmt(result.lossDb, 2)),
                getString(R.string.tools_coax_out_result, fmt(result.powerOutW, 1)),
                getString(R.string.tools_coax_eff_result, fmt(result.efficiencyPercent, 1))).joinToString("\n")
        }
        coaxChart.show(if (custom) null else cable, if (marker != null) frequency else null, marker)
    }

    // ---- Power and ERP ----

    private fun buildPower() {
        val card = section(R.string.tools_sec_power)
        subtitle(card, R.string.tools_sub_conversion)
        powerValueEdit = field(card, R.string.tools_value) { updatePower() }
        note(card, R.string.tools_unit)
        choice(card, listOf("W" to "W", "DBM" to "dBm", "DBW" to "dBW"), { powerUnit.name }) {
            powerUnit = RadioTools.PowerUnit.valueOf(it); updatePower()
        }
        powerOut = Output(card)
        ladder = PowerLadderView(this)
        chart(card, ladder)
        subtitle(card, R.string.tools_sub_erp)
        erpPowerEdit = field(card, R.string.tools_equipment_power) { updateErp() }
        erpLossEdit = field(card, R.string.tools_cable_loss_db, "0") { updateErp() }
        erpGainEdit = field(card, R.string.tools_gain_dbd) { updateErp() }
        erpOut = Output(card)
    }

    private fun updatePower() {
        var level: Double? = null
        powerOut.run(blank(powerValueEdit)) {
            val result = RadioTools.power(num(powerValueEdit), powerUnit)
            level = result.dBm
            getString(R.string.tools_power_watts, fmt(result.watts, if (result.watts < 1) 4 else 2)) + "\n" +
                getString(R.string.tools_power_levels, fmt(result.dBm, 2), fmt(result.dBW, 2))
        }
        ladder.show(level)
    }

    private fun updateErp() {
        erpOut.run(blank(erpPowerEdit, erpLossEdit, erpGainEdit)) {
            val result = RadioTools.erp(num(erpPowerEdit), num(erpLossEdit), num(erpGainEdit))
            getString(R.string.tools_erp_result, fmt(result.erpW, 2)) + "\n" + getString(R.string.tools_eirp_result, fmt(result.eirpW, 2))
        }
    }

    // ---- Antenna ----

    private fun buildAntenna() {
        val card = section(R.string.tools_sec_antenna)
        antennaFreqEdit = field(card, R.string.tools_frequency_mhz) { updateAntenna() }
        velocityEdit = field(card, R.string.tools_velocity_factor, "0.95") { updateAntenna() }
        antennaOut = Output(card)
        antenna = AntennaDiagramView(this)
        chart(card, antenna)
    }

    private fun updateAntenna() {
        var lengths: RadioTools.AntennaLengths? = null
        antennaOut.run(blank(antennaFreqEdit, velocityEdit)) {
            val result = RadioTools.antennaLengths(num(antennaFreqEdit), num(velocityEdit))
            lengths = result
            listOf(getString(R.string.tools_wavelength, fmt(result.wavelengthM, 2)),
                getString(R.string.tools_half_wave, fmt(result.halfWaveM, 2)),
                getString(R.string.tools_quarter_wave, fmt(result.quarterWaveM, 2))).joinToString("\n")
        }
        antenna.show(lengths?.halfWaveM, lengths?.quarterWaveM)
    }

    // ---- Band plan ----

    private fun regionText() = getString(when (region) {
        2 -> R.string.tools_region_2
        3 -> R.string.tools_region_3
        else -> R.string.tools_region_1
    })

    private fun buildBands() {
        val card = section(R.string.tools_sec_bands)
        note(card, R.string.tools_band_note)
        note(card, R.string.tools_region)
        choice(card, (1..3).map { it.toString() to getString(R.string.tools_region_chip, it) }, { region.toString() }) {
            region = it.toInt(); regionNote.text = regionText(); updateBands()
        }
        regionNote = Brand.text(this, 14f, colors.muted).apply { text = regionText() }
        card.addView(regionNote)
        bandFreqEdit = field(card, R.string.tools_frequency_mhz) { updateBands() }
        bandOut = Output(card)
        bandPlan = BandPlanView(this)
        chart(card, bandPlan)
    }

    private fun updateBands() {
        var frequency: Double? = null
        bandOut.run(blank(bandFreqEdit)) {
            val value = num(bandFreqEdit)
            frequency = value
            RadioTools.bandOf(value, region)?.let { getString(R.string.tools_band_result, it) } ?: getString(R.string.tools_band_none)
        }
        bandPlan.show(region, frequency)
    }

    // ---- RST ----

    private fun buildRst() {
        val card = section(R.string.tools_sec_rst)
        for ((title, meanings) in listOf(R.string.tools_rst_readability to RadioTools.RST_READABILITY,
            R.string.tools_rst_strength to RadioTools.RST_STRENGTH, R.string.tools_rst_tone to RadioTools.RST_TONE)) {
            subtitle(card, title)
            card.addView(Brand.text(this, 15f).apply {
                text = meanings.mapIndexed { index, id -> "${index + 1} — ${getString(id)}" }.joinToString("\n")
            })
        }
    }
}
