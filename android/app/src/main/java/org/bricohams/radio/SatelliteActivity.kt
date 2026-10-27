package org.bricohams.radio

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.widget.CheckBox
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.TextView
import java.io.File
import java.io.IOException
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.concurrent.CancellationException
import java.util.concurrent.Executors

class SatelliteActivity : LocalizedActivity() {
    companion object {
        /** Host tests replace this; the app downloads over HTTPS only when the user asks. */
        internal var fetch: (String, Int) -> ByteArray = SatelliteSources::fetch
        private const val DEFAULT_DOWNLINK = 145800000L
    }
    private enum class Page { PASSES, MAP, SATELLITES, SETTINGS, DETAIL }
    private data class OrbitKey(val tle: Tle, val observer: ObserverPosition)
    private class Card(val track: PassTrack, val countdown: TextView, val progress: ProgressBar)

    private val worker = Executors.newSingleThreadExecutor()
    private val audioWorker = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var preferences: SharedPreferences
    private lateinit var store: SatelliteStore
    private lateinit var status: TextView
    private lateinit var countdown: TextView
    private lateinit var countdownName: TextView
    private lateinit var content: FrameLayout
    private lateinit var navigation: LinearLayout
    private val pages = HashMap<Page, ScrollView>()
    private var page = Page.PASSES
    private var catalog: List<Tle> = emptyList()
    private var transmitters: Map<Int, List<Transmitter>> = emptyMap()
    private val selected = LinkedHashSet<Int>()
    private var passes: List<PassTrack> = emptyList()
    private val cards = ArrayList<Card>()
    private var dirty = true
    private var opened: PassTrack? = null
    private var detailStats: TextView? = null
    private var radar: PassRadarView? = null
    private lateinit var map: WorldMapView
    private lateinit var mapInfo: TextView
    private var mapSelected: Int? = null
    private var pendingExport: File? = null
    private var ticks = 0
    @Volatile private var generation = 0
    // Worker thread only: one Rhino context for every satellite.
    private var engine: OrbitalEngine? = null
    private val orbits = HashMap<OrbitKey, SatelliteOrbit>()
    private val ticker = object : Runnable {
        override fun run() {
            tick()
            handler.postDelayed(this, 1000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        preferences = getSharedPreferences("satellite-observer", MODE_PRIVATE)
        store = SatelliteStore(File(filesDir, "satellites"))
        preferences.getString("selected", null)?.split(',')?.mapNotNull { it.toIntOrNull() }?.let { selected.addAll(it) }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Brand.BACKGROUND)
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
        val gutter = Brand.dp(this, 16)
        root.addView(Brand.row(this,
            ImageView(this).apply {
                setImageResource(R.drawable.bricohams_logo)
                contentDescription = getString(R.string.app_name)
                layoutParams = LinearLayout.LayoutParams(Brand.dp(this@SatelliteActivity, 40), Brand.dp(this@SatelliteActivity, 40))
            },
            LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(Brand.dp(this@SatelliteActivity, 12), 0, 0, 0)
                addView(Brand.text(this@SatelliteActivity, 20f, bold = true).apply { setText(R.string.satellite_title) })
                status = Brand.text(this@SatelliteActivity, 13f, Brand.MUTED)
                addView(status)
            }).apply { setPadding(gutter, gutter, gutter, Brand.dp(this@SatelliteActivity, 8)) })
        val banner = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            background = Brand.rounded(this@SatelliteActivity, Brand.SURFACE, 20)
            setPadding(gutter, Brand.dp(this@SatelliteActivity, 10), gutter, Brand.dp(this@SatelliteActivity, 10))
            countdown = Brand.text(this@SatelliteActivity, 34f, Brand.ORANGE, bold = true).apply { gravity = Gravity.CENTER }
            countdownName = Brand.text(this@SatelliteActivity, 14f, Brand.MUTED).apply { gravity = Gravity.CENTER }
            addView(countdown); addView(countdownName)
            isClickable = true; isFocusable = true
            setOnClickListener { nextPass()?.let { openPass(it) } }
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                .apply { setMargins(gutter, 0, gutter, Brand.dp(this@SatelliteActivity, 8)) }
        }
        root.addView(banner)
        content = FrameLayout(this)
        root.addView(content, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
        navigation = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(Brand.dp(this@SatelliteActivity, 8), Brand.dp(this@SatelliteActivity, 6), Brand.dp(this@SatelliteActivity, 8),
                Brand.dp(this@SatelliteActivity, 8))
        }
        root.addView(navigation)
        map = WorldMapView(this).apply {
            onSelect = { mapSelected = it; refreshMap() }
            contentDescription = getString(R.string.satellite_map_description)
        }
        mapInfo = Brand.text(this, 14f)
        audioWorker.execute {
            try {
                val land = WorldMap.parseLand(assets.open("world-land-110m.txt").bufferedReader().use { it.readText() })
                runOnUiThread { if (!isDestroyed) map.land = land }
            } catch (error: IOException) { report(error) }
            catch (error: IllegalArgumentException) { report(error) }
        }
        setContentView(root)
        loadCatalog()
        show(Page.PASSES)
    }

    private fun page(key: Page, build: LinearLayout.() -> Unit) {
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val gutter = Brand.dp(this@SatelliteActivity, 16)
            setPadding(gutter, 0, gutter, gutter)
            build()
        }
        val scroll = pages.getOrPut(key) { ScrollView(this).apply { isFillViewport = true } }
        scroll.removeAllViews()
        scroll.addView(body)
    }
    private fun show(target: Page) {
        if (target == Page.PASSES && dirty) recompute()
        page = target
        when (target) {
            Page.PASSES -> renderPasses()
            Page.MAP -> renderMap()
            Page.SATELLITES -> renderSatellites("")
            Page.SETTINGS -> renderSettings()
            Page.DETAIL -> Unit
        }
        content.removeAllViews()
        content.addView(pages.getValue(target))
        navigation.removeAllViews()
        for ((key, label) in listOf(Page.PASSES to R.string.satellite_tab_passes, Page.MAP to R.string.satellite_tab_map,
            Page.SATELLITES to R.string.satellite_tab_satellites, Page.SETTINGS to R.string.satellite_tab_settings)) {
            navigation.addView(Brand.chip(this, getString(label), key == target || (target == Page.DETAIL && key == Page.PASSES)) { show(key) })
        }
        tick()
    }

    private fun loadCatalog() {
        try {
            catalog = store.catalog()
            transmitters = store.transmitters().groupBy { it.norad }
        } catch (error: IllegalArgumentException) {
            catalog = emptyList(); transmitters = emptyMap()
            report(error)
        }
        if (selected.isEmpty() && catalog.isNotEmpty()) {
            selected.addAll(catalog.map { it.norad }.filter { it in transmitters }.ifEmpty { catalog.map { it.norad }.take(20) })
            saveSelection()
        }
        selected.retainAll(catalog.map { it.norad }.toSet())
        dirty = true
    }
    private fun saveSelection() {
        preferences.edit().putString("selected", selected.joinToString(",")).apply()
        dirty = true
    }
    private fun observer(): ObserverPosition? = try {
        ObserverPosition(preferences.getString("latitude", "")!!.toDouble(), preferences.getString("longitude", "")!!.toDouble(),
            preferences.getString("height", "0")!!.toDouble()).validated()
    } catch (error: NumberFormatException) { null } catch (error: IllegalArgumentException) { null }
    private fun minimum() = preferences.getString("minimum", "10")?.toDoubleOrNull()?.takeIf { it in 0.0..60.0 } ?: 10.0

    private fun orbit(tle: Tle, observer: ObserverPosition): SatelliteOrbit {
        val shared = engine ?: OrbitalEngine(assets.open("satellite-6.0.1.js").bufferedReader().use { it.readText() },
            assets.open("orbital-engine.js").bufferedReader().use { it.readText() }).also { engine = it }
        if (orbits.size > 400) orbits.clear()
        return orbits.getOrPut(OrbitKey(tle, observer)) { SatelliteOrbit(tle, observer, shared) }
    }

    private fun recompute() {
        dirty = false
        val observer = observer()
        val chosen = catalog.filter { it.norad in selected }
        val token = ++generation
        passes = emptyList()
        when {
            catalog.isEmpty() -> { status.setText(R.string.satellite_no_catalog); return }
            observer == null -> { status.setText(R.string.satellite_no_observer); return }
            chosen.isEmpty() -> { status.setText(R.string.satellite_none_selected); return }
        }
        val position = requireNotNull(observer)
        val minimum = minimum()
        val now = System.currentTimeMillis()
        status.text = getString(R.string.satellite_progress, 0, chosen.size)
        worker.execute {
            val found = ArrayList<PassTrack>()
            val errors = ArrayList<String>()
            for ((index, tle) in chosen.withIndex()) {
                if (token != generation) return@execute
                try {
                    orbit(tle, position).predict(now, minimum = minimum).forEach {
                        found.add(PassTrack(SatellitePlan(tle, position, defaultDownlink(tle.norad), it), emptyList()))
                    }
                } catch (error: IllegalArgumentException) {
                    errors.add("${tle.name}: ${errorText(error)}")
                } catch (error: IOException) {
                    errors.add("${tle.name}: ${errorText(error)}")
                }
                val snapshot = found.sortedBy { it.plan.pass.aos.time }
                val done = index + 1
                runOnUiThread {
                    if (token == generation && !isDestroyed) {
                        passes = snapshot
                        status.text = if (done < chosen.size) getString(R.string.satellite_progress, done, chosen.size)
                            else getString(R.string.satellite_results, snapshot.size, chosen.size, errors.size,
                                errors.firstOrNull() ?: "")
                        if (page == Page.PASSES) renderPasses()
                    }
                }
            }
        }
    }
    private fun defaultDownlink(norad: Int) = preferences.getLong("downlink-$norad", 0).takeIf { it > 0 }
        ?: transmitters[norad]?.firstOrNull { it.mode.startsWith("FM") }?.downlinkHz ?: transmitters[norad]?.firstOrNull()?.downlinkHz
        ?: DEFAULT_DOWNLINK

    private fun nextPass(): PassTrack? = System.currentTimeMillis().let { now -> passes.firstOrNull { it.plan.pass.los.time > now } }

    private fun renderPasses() {
        cards.clear()
        page(Page.PASSES) {
            val now = System.currentTimeMillis()
            val upcoming = passes.filter { it.plan.pass.los.time > now }.take(200)
            if (upcoming.isEmpty()) {
                addView(Brand.text(this@SatelliteActivity, 15f, Brand.MUTED).apply {
                    setText(if (catalog.isEmpty()) R.string.satellite_no_catalog else R.string.satellite_no_passes)
                    setPadding(0, Brand.dp(this@SatelliteActivity, 24), 0, 0)
                })
                if (catalog.isEmpty()) addView(Brand.button(this@SatelliteActivity, getString(R.string.satellite_download), true) { download() })
            }
            for (track in upcoming) {
                val pass = track.plan.pass
                val zone = ZoneId.systemDefault()
                val clock = DateTimeFormatter.ofPattern("HH:mm:ss", Locale.ROOT).withZone(zone)
                val day = DateTimeFormatter.ofPattern("EEE dd/MM", Locale.getDefault()).withZone(zone)
                val card = Brand.card(this@SatelliteActivity).apply {
                    isClickable = true; isFocusable = true
                    contentDescription = SatellitePasses.card(track, now, zone, this@SatelliteActivity)
                    setOnClickListener { openPass(track) }
                }
                card.addView(Brand.row(this@SatelliteActivity,
                    Brand.text(this@SatelliteActivity, 15f, Brand.ORANGE, true).apply { text = String.format(Locale.ROOT, "%d", track.plan.tle.norad) },
                    Brand.text(this@SatelliteActivity, 15f, bold = true).apply {
                        text = track.plan.tle.name
                        setPadding(Brand.dp(this@SatelliteActivity, 8), 0, 0, 0)
                        layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                    },
                    Brand.text(this@SatelliteActivity, 15f, Brand.ORANGE, true).apply {
                        text = String.format(Locale.ROOT, "%.0f°", pass.maximum.elevation)
                    }))
                card.addView(Brand.text(this@SatelliteActivity, 14f, Brand.MUTED).apply {
                    text = getString(R.string.satellite_card_times, day.format(Instant.ofEpochMilli(pass.aos.time)),
                        clock.format(Instant.ofEpochMilli(pass.aos.time)), clock.format(Instant.ofEpochMilli(pass.los.time)),
                        pass.aos.azimuth, pass.los.azimuth)
                })
                val modes = transmitters[track.plan.tle.norad]?.map { it.mode }?.distinct()?.take(3)?.joinToString(" · ") ?: ""
                val remaining = Brand.text(this@SatelliteActivity, 13f)
                card.addView(Brand.row(this@SatelliteActivity, remaining.apply {
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                }, Brand.text(this@SatelliteActivity, 13f, Brand.MUTED).apply { text = modes }))
                val bar = ProgressBar(this@SatelliteActivity, null, android.R.attr.progressBarStyleHorizontal).apply {
                    max = 1000
                    progressTintList = android.content.res.ColorStateList.valueOf(Brand.ORANGE)
                }
                card.addView(bar)
                cards.add(Card(track, remaining, bar))
                addView(card)
            }
        }
        tick()
    }

    private fun openPass(track: PassTrack) {
        opened = track
        val tle = track.plan.tle
        page(Page.DETAIL) {
            addView(Brand.row(this@SatelliteActivity,
                Brand.chip(this@SatelliteActivity, getString(R.string.satellite_back), false) { show(Page.PASSES) },
                Brand.text(this@SatelliteActivity, 17f, bold = true).apply {
                    text = getString(R.string.satellite_detail_title, tle.norad, tle.name)
                    setPadding(Brand.dp(this@SatelliteActivity, 10), 0, 0, 0)
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 3f)
                }))
            val view = PassRadarView(this@SatelliteActivity).apply {
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
                this.track = opened?.track.orEmpty()
            }
            radar = view
            addView(view)
            detailStats = Brand.text(this@SatelliteActivity, 15f).also { addView(it) }
            addView(Brand.text(this@SatelliteActivity, 13f, Brand.MUTED).apply { text = SatellitePasses.detail(track, 0, this@SatelliteActivity).substringBeforeLast('\n') })
            addView(Brand.text(this@SatelliteActivity, 16f, Brand.ORANGE, true).apply {
                setText(R.string.satellite_downlinks); setPadding(0, Brand.dp(this@SatelliteActivity, 12), 0, 0)
            })
            val manual = EditText(this@SatelliteActivity).apply {
                id = R.id.satellite_downlink
                setHint(R.string.satellite_manual_downlink)
                setTextColor(Brand.TEXT); setHintTextColor(Brand.MUTED)
                inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            }
            val group = RadioGroup(this@SatelliteActivity)
            val list = transmitters[tle.norad].orEmpty()
            list.forEachIndexed { index, transmitter ->
                group.addView(RadioButton(this@SatelliteActivity).apply {
                    id = View.generateViewId()
                    tag = transmitter.downlinkHz
                    setTextColor(Brand.TEXT)
                    buttonTintList = android.content.res.ColorStateList.valueOf(Brand.ORANGE)
                    text = String.format(Locale.ROOT, "%.4f MHz  %s  %s", transmitter.downlinkHz / 1e6, transmitter.mode, transmitter.description)
                    minHeight = Brand.dp(this@SatelliteActivity, 48)
                    isChecked = transmitter.downlinkHz == track.plan.downlinkHz || (index == 0 && list.none { it.downlinkHz == track.plan.downlinkHz })
                })
            }
            if (list.isEmpty()) {
                addView(Brand.text(this@SatelliteActivity, 13f, Brand.MUTED).apply { setText(R.string.satellite_no_downlinks) })
                manual.setText(String.format(Locale.ROOT, "%.5f", track.plan.downlinkHz / 1e6))
            }
            addView(group); addView(manual)
            addView(Brand.button(this@SatelliteActivity, getString(R.string.satellite_open_cat), true) {
                try {
                    val typed = manual.text.toString().trim()
                    val downlink = if (typed.isNotEmpty()) typed.toBigDecimal().movePointRight(6).longValueExact()
                        else group.findViewById<RadioButton>(group.checkedRadioButtonId)?.tag as? Long
                        ?: throw LocalizedArgumentException(UiText(R.string.err_downlink_choose))
                    requireUi(downlink % 10 == 0L && CatProtocol.inBand(downlink / 10)) { UiText(R.string.err_downlink_band) }
                    requireUi(System.currentTimeMillis() < track.plan.pass.los.time) { UiText(R.string.err_pass_ended) }
                    preferences.edit().putLong("downlink-${tle.norad}", downlink).apply()
                    startActivity(Intent(this@SatelliteActivity, CatActivity::class.java)
                        .putExtra("satellite-plan", SatellitePlanJson.encode(track.plan.copy(downlinkHz = downlink))))
                } catch (error: NumberFormatException) { report(error) }
                catch (error: ArithmeticException) { report(error) }
                catch (error: IllegalArgumentException) { report(error) }
            })
            addView(Brand.text(this@SatelliteActivity, 13f, Brand.MUTED).apply { setText(R.string.satellite_cat_hint) })
        }
        show(Page.DETAIL)
        if (track.track.isEmpty()) {
            val token = generation
            worker.execute {
                try {
                    val orbit = orbit(track.plan.tle, track.plan.observer)
                    val sampled = track.copy(track = SatellitePasses.sample(track.plan.pass) { orbit.look(it) })
                    runOnUiThread {
                        if (!isDestroyed && token == generation) {
                            passes = passes.map { if (it == track) sampled else it }
                            if (opened == track) { opened = sampled; radar?.track = sampled.track; tick() }
                        }
                    }
                } catch (error: IllegalArgumentException) { report(error) }
                catch (error: IOException) { report(error) }
            }
        }
    }

    private fun renderMap() {
        page(Page.MAP) {
            (map.parent as? LinearLayout)?.removeView(map)
            (mapInfo.parent as? LinearLayout)?.removeView(mapInfo)
            addView(map)
            addView(mapInfo.apply { setPadding(0, Brand.dp(this@SatelliteActivity, 10), 0, 0) })
            addView(Brand.text(this@SatelliteActivity, 12f, Brand.MUTED).apply { setText(R.string.satellite_map_hint) })
        }
        refreshMap()
    }
    private fun refreshMap() {
        val observer = observer() ?: return
        val chosen = catalog.filter { it.norad in selected }
        if (chosen.isEmpty()) return
        val focus = mapSelected?.takeIf { it in selected } ?: nextPass()?.plan?.tle?.norad ?: chosen.first().norad
        val token = generation
        worker.execute {
            val now = System.currentTimeMillis()
            val points = chosen.mapNotNull { tle ->
                try {
                    val orbit = orbit(tle, observer)
                    val track = if (tle.norad == focus) (-45..45).map { orbit.geo(now + it * 60000L) } else emptyList()
                    MapSatellite(tle.norad, tle.name, orbit.geo(now), track)
                } catch (error: IllegalArgumentException) { null }
            }
            runOnUiThread {
                if (isDestroyed || token != generation) return@runOnUiThread
                map.observer = observer
                map.satellites = points
                map.selected = focus
                val chosenPoint = points.firstOrNull { it.norad == focus }
                mapInfo.text = if (chosenPoint == null) "" else getString(R.string.satellite_map_info, chosenPoint.norad, chosenPoint.name,
                    chosenPoint.point.latitude, chosenPoint.point.longitude, chosenPoint.point.altitudeKm,
                    passes.firstOrNull { it.plan.tle.norad == focus && it.plan.pass.los.time > now }?.let {
                        SatellitePasses.countdown(it.plan.pass, now, this@SatelliteActivity)
                    } ?: getString(R.string.satellite_map_no_pass))
            }
        }
    }

    private fun renderSatellites(query: String) {
        page(Page.SATELLITES) {
            val search = EditText(this@SatelliteActivity).apply {
                id = R.id.satellite_search
                setHint(R.string.satellite_search)
                setTextColor(Brand.TEXT); setHintTextColor(Brand.MUTED)
                setSingleLine(true)
                setText(query)
            }
            addView(search)
            val list = LinearLayout(this@SatelliteActivity).apply { orientation = LinearLayout.VERTICAL }
            fun fill() {
                list.removeAllViews()
                val text = search.text.toString().trim().lowercase(Locale.ROOT)
                for (tle in catalog.filter { text.isEmpty() || it.name.lowercase(Locale.ROOT).contains(text) || it.norad.toString().startsWith(text) }) {
                    list.addView(CheckBox(this@SatelliteActivity).apply {
                        val modes = transmitters[tle.norad]?.map { it.mode }?.distinct()?.joinToString(" · ")
                        this.text = if (modes == null) getString(R.string.satellite_row, tle.norad, tle.name)
                            else getString(R.string.satellite_row_modes, tle.norad, tle.name, modes)
                        setTextColor(Brand.TEXT)
                        buttonTintList = android.content.res.ColorStateList.valueOf(Brand.ORANGE)
                        minHeight = Brand.dp(this@SatelliteActivity, 48)
                        isChecked = tle.norad in selected
                        setOnCheckedChangeListener { _, checked ->
                            if (checked) selected.add(tle.norad) else selected.remove(tle.norad)
                            saveSelection()
                            status.text = getString(R.string.satellite_selected_count, selected.size, catalog.size)
                        }
                    })
                }
            }
            addView(Brand.row(this@SatelliteActivity,
                Brand.chip(this@SatelliteActivity, getString(R.string.satellite_select_all), false) {
                    selected.addAll(catalog.map { it.norad }); saveSelection(); fill()
                },
                Brand.chip(this@SatelliteActivity, getString(R.string.satellite_select_radio), false) {
                    selected.clear(); selected.addAll(catalog.map { it.norad }.filter { it in transmitters }); saveSelection(); fill()
                },
                Brand.chip(this@SatelliteActivity, getString(R.string.satellite_select_none), false) {
                    selected.clear(); saveSelection(); fill()
                }))
            if (catalog.isEmpty()) addView(Brand.text(this@SatelliteActivity, 15f, Brand.MUTED).apply { setText(R.string.satellite_no_catalog) })
            addView(list)
            search.addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(value: CharSequence?, start: Int, count: Int, after: Int) = Unit
                override fun onTextChanged(value: CharSequence?, start: Int, before: Int, count: Int) = fill()
                override fun afterTextChanged(value: Editable?) = Unit
            })
            fill()
        }
        status.text = getString(R.string.satellite_selected_count, selected.size, catalog.size)
    }

    private fun renderSettings() {
        page(Page.SETTINGS) {
            fun heading(label: Int) = addView(Brand.text(this@SatelliteActivity, 16f, Brand.ORANGE, true).apply {
                setText(label); setPadding(0, Brand.dp(this@SatelliteActivity, 14), 0, Brand.dp(this@SatelliteActivity, 4))
            })
            val fields = LinkedHashMap<String, EditText>()
            fun field(key: String, id: Int, label: Int, initial: String) {
                addView(Brand.text(this@SatelliteActivity, 13f, Brand.MUTED).apply { setText(label) })
                val input = EditText(this@SatelliteActivity).apply {
                    this.id = id
                    setText(preferences.getString(key, initial))
                    setTextColor(Brand.TEXT)
                    setSingleLine(true)
                    inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
                }
                fields[key] = input; addView(input)
            }
            heading(R.string.satellite_observer)
            field("latitude", R.id.satellite_latitude, R.string.satellite_latitude, "")
            field("longitude", R.id.satellite_longitude, R.string.satellite_longitude, "")
            field("height", R.id.satellite_height, R.string.satellite_height, "0")
            field("minimum", R.id.satellite_minimum, R.string.satellite_minimum, "10")
            addView(Brand.button(this@SatelliteActivity, getString(R.string.satellite_use_gps)) { useGps(fields) })
            addView(Brand.button(this@SatelliteActivity, getString(R.string.satellite_save_observer), true) {
                try {
                    fun value(key: String) = fields.getValue(key).text.toString().trim()
                    ObserverPosition(value("latitude").toDouble(), value("longitude").toDouble(), value("height").toDouble()).validated()
                    val minimum = value("minimum").toDouble()
                    require(minimum.isFinite() && minimum in 0.0..60.0) { getString(R.string.satellite_minimum_invalid) }
                    val editor = preferences.edit()
                    fields.forEach { (key, input) -> editor.putString(key, input.text.toString().trim()) }
                    check(editor.commit()) { getString(R.string.satellite_preferences_error) }
                    dirty = true
                    show(Page.PASSES)
                } catch (error: NumberFormatException) { report(error) }
                catch (error: IllegalArgumentException) { report(error) }
                catch (error: IllegalStateException) { report(error) }
            })
            heading(R.string.satellite_data)
            addView(Brand.text(this@SatelliteActivity, 13f, Brand.MUTED).apply {
                text = if (catalog.isEmpty()) getString(R.string.satellite_no_catalog) else getString(R.string.satellite_data_state, catalog.size,
                    transmitters.values.sumOf { it.size }, Instant.ofEpochMilli(store.updated).toString())
            })
            addView(Brand.button(this@SatelliteActivity, getString(R.string.satellite_download), true) { download() })
            addView(Brand.button(this@SatelliteActivity, getString(R.string.satellite_import)) {
                startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply { addCategory(Intent.CATEGORY_OPENABLE); type = "*/*" }, 60)
            })
            addView(Brand.text(this@SatelliteActivity, 12f, Brand.MUTED).apply { setText(R.string.satellite_credits) })
            heading(R.string.satellite_recordings)
            val recordings = File(filesDir, "recordings").listFiles { file -> file.name.endsWith(".wav") }.orEmpty().sortedByDescending { it.lastModified() }
            if (recordings.isEmpty()) addView(Brand.text(this@SatelliteActivity, 13f, Brand.MUTED).apply { setText(R.string.satellite_no_recordings) })
            for (file in recordings) addView(recordingCard(file))
        }
    }

    private fun recordingCard(file: File): View = Brand.card(this).apply {
        val seconds = (file.length() - 44).coerceAtLeast(0) / 2 / PassRecorder.RATE
        addView(Brand.text(this@SatelliteActivity, 15f, bold = true).apply { text = file.nameWithoutExtension })
        addView(Brand.text(this@SatelliteActivity, 13f, Brand.MUTED).apply {
            text = getString(R.string.satellite_recording_info, seconds / 60, seconds % 60, file.length() / 1048576.0)
        })
        val images = LinearLayout(this@SatelliteActivity).apply { orientation = LinearLayout.VERTICAL }
        fun showImages() {
            images.removeAllViews()
            file.parentFile?.listFiles { image -> image.name.startsWith(file.nameWithoutExtension + "-sstv") && image.name.endsWith(".png") }
                .orEmpty().sortedBy { it.name }.forEach { png ->
                    images.addView(ImageView(this@SatelliteActivity).apply {
                        adjustViewBounds = true
                        contentDescription = getString(R.string.sstv_image_description)
                        setImageBitmap(BitmapFactory.decodeFile(png.path))
                    })
                }
        }
        showImages()
        addView(images)
        val result = Brand.text(this@SatelliteActivity, 13f)
        addView(Brand.row(this@SatelliteActivity,
            Brand.chip(this@SatelliteActivity, getString(R.string.satellite_decode_sstv), false) {
                result.setText(R.string.satellite_decoding)
                audioWorker.execute {
                    val message = try {
                        val decoded = PassAudio.decodeSstv(file) { isDestroyed }
                        decoded.forEachIndexed { index, image ->
                            val bitmap = Bitmap.createBitmap(image.pixels, Robot36.WIDTH, Robot36.HEIGHT, Bitmap.Config.ARGB_8888)
                            File(file.parentFile, "${file.nameWithoutExtension}-sstv${index + 1}.png").outputStream().use {
                                check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)) { getString(R.string.png_encode_error) }
                            }
                            bitmap.recycle()
                        }
                        getString(R.string.satellite_decoded, decoded.size, decoded.joinToString { String.format(Locale.ROOT, "%.0f s", it.startSeconds) })
                    } catch (error: IOException) { getString(R.string.sstv_error, errorText(error)) }
                    catch (error: IllegalArgumentException) { getString(R.string.sstv_error, errorText(error)) }
                    catch (error: IllegalStateException) { getString(R.string.sstv_error, errorText(error)) }
                    catch (error: CancellationException) { getString(R.string.live_cancelled) }
                    runOnUiThread { if (!isDestroyed) { result.text = message; showImages() } }
                }
            },
            Brand.chip(this@SatelliteActivity, getString(R.string.satellite_export), false) {
                pendingExport = file
                startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE); type = "audio/wav"; putExtra(Intent.EXTRA_TITLE, file.name)
                }, 61)
            },
            Brand.chip(this@SatelliteActivity, getString(R.string.satellite_delete), false) {
                AlertDialog.Builder(this@SatelliteActivity).setTitle(R.string.satellite_delete_title)
                    .setMessage(getString(R.string.satellite_delete_message, file.name))
                    .setNegativeButton(android.R.string.cancel, null)
                    .setPositiveButton(R.string.satellite_delete) { _, _ ->
                        file.parentFile?.listFiles { image -> image.name.startsWith(file.nameWithoutExtension + "-sstv") }?.forEach { it.delete() }
                        if (!file.delete()) status.setText(R.string.satellite_delete_failed)
                        show(Page.SETTINGS)
                    }.show()
            }))
        addView(result)
    }

    private fun download() {
        status.setText(R.string.satellite_downloading)
        audioWorker.execute {
            try {
                val tle = SatelliteSources.parseTle(fetch(SatelliteSources.TLE_URL, 256 * 1024))
                var warning = ""
                val list = try {
                    SatelliteSources.parseTransmitters(fetch(SatelliteSources.TRANSMITTERS_URL, 16 * 1024 * 1024).toString(Charsets.UTF_8),
                        tle.map { it.norad }.toSet())
                } catch (error: IOException) {
                    warning = errorText(error); store.transmitters()
                } catch (error: IllegalArgumentException) {
                    warning = errorText(error); store.transmitters()
                }
                store.saveCatalog(tle, list)
                runOnUiThread {
                    if (isDestroyed) return@runOnUiThread
                    loadCatalog()
                    status.text = getString(R.string.satellite_downloaded, catalog.size, transmitters.values.sumOf { it.size }, warning)
                    if (page == Page.SETTINGS || page == Page.PASSES) show(page)
                }
            } catch (error: IOException) { report(error) }
            catch (error: IllegalArgumentException) { report(error) }
            catch (error: SecurityException) { report(error) }
        }
    }

    @SuppressLint("MissingPermission")
    private fun useGps(fields: Map<String, EditText>) {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), 62)
            return
        }
        val manager = getSystemService(LOCATION_SERVICE) as LocationManager
        val fix: Location? = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
            .filter { manager.isProviderEnabled(it) }.mapNotNull { manager.getLastKnownLocation(it) }.maxByOrNull { it.time }
        if (fix == null) { status.setText(R.string.satellite_gps_none); return }
        fields.getValue("latitude").setText(String.format(Locale.ROOT, "%.5f", fix.latitude))
        fields.getValue("longitude").setText(String.format(Locale.ROOT, "%.5f", fix.longitude))
        if (fix.hasAltitude()) fields.getValue("height").setText(String.format(Locale.ROOT, "%.3f", fix.altitude / 1000))
        status.text = getString(R.string.satellite_gps_fix, (System.currentTimeMillis() - fix.time) / 60000, fix.accuracy)
    }
    @Deprecated("Platform callback")
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 62) status.setText(if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED)
            R.string.satellite_gps_retry else R.string.satellite_gps_denied)
    }

    private fun tick() {
        val now = System.currentTimeMillis()
        val next = nextPass()
        if (next == null) {
            countdown.text = getString(R.string.satellite_countdown_none)
            countdownName.setText(R.string.satellite_countdown_hint)
        } else {
            val pass = next.plan.pass
            val rising = now < pass.aos.time
            val left = ((if (rising) pass.aos.time else pass.los.time) - now) / 1000
            countdown.text = getString(if (rising) R.string.satellite_countdown_aos else R.string.satellite_countdown_los,
                left / 3600, left / 60 % 60, left % 60)
            countdownName.text = getString(R.string.satellite_countdown_name, next.plan.tle.norad, next.plan.tle.name, pass.maximum.elevation)
        }
        for (card in cards) {
            val pass = card.track.plan.pass
            card.countdown.text = SatellitePasses.countdown(pass, now, this)
            card.countdown.setTextColor(if (now >= pass.aos.time) Brand.GREEN else Brand.TEXT)
            card.progress.progress = (((now - pass.aos.time).toDouble() / (pass.los.time - pass.aos.time)).coerceIn(0.0, 1.0) * 1000).toInt()
        }
        val track = opened
        if (page == Page.DETAIL && track != null) {
            radar?.now = now
            val position = SatellitePasses.at(track.track, now)
            detailStats?.text = if (position == null) SatellitePasses.countdown(track.plan.pass, now, this) else {
                val rate = SatellitePasses.at(track.track, now + 500)?.let { later ->
                    SatellitePasses.at(track.track, now - 500)?.let { later.rangeKm - it.rangeKm }
                } ?: 0.0
                getString(R.string.satellite_live, position.azimuth, position.elevation, position.rangeKm,
                    track.plan.downlinkHz * (1 - rate / 299792.458) / 1e6)
            }
            radar?.contentDescription = getString(R.string.satellite_radar_description, detailStats?.text)
        }
        if (page == Page.MAP && ++ticks % 5 == 0) refreshMap()
    }

    override fun onResume() {
        super.onResume()
        handler.post(ticker)
    }
    override fun onPause() {
        handler.removeCallbacks(ticker)
        super.onPause()
    }
    private fun report(error: Exception) {
        runOnUiThread { if (!isDestroyed) status.text = getString(R.string.satellite_error, errorText(error)) }
    }
    @Deprecated("Platform callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        val uri = data?.data
        if (requestCode !in 60..61) return
        if (resultCode != RESULT_OK || uri == null) { status.setText(R.string.satellite_cancelled); return }
        if (requestCode == 61) {
            val file = pendingExport ?: run { status.setText(R.string.satellite_cancelled); return }
            audioWorker.execute {
                try {
                    val output = contentResolver.openOutputStream(uri, "wt") ?: throw IOException(getString(R.string.provider_no_stream))
                    output.use { stream -> file.inputStream().use { it.copyTo(stream) } }
                    runOnUiThread { if (!isDestroyed) status.setText(R.string.satellite_exported) }
                } catch (error: IOException) { report(error) }
                catch (error: SecurityException) { report(error) }
            }
            return
        }
        status.setText(R.string.satellite_working)
        audioWorker.execute {
            try {
                val imported = SatelliteSources.parseTle(contentResolver.readDocument(uri, 256 * 1024))
                val norads = imported.map { it.norad }.toSet()
                store.saveCatalog(imported, store.transmitters().filter { it.norad in norads })
                runOnUiThread {
                    if (isDestroyed) return@runOnUiThread
                    loadCatalog()
                    status.text = getString(R.string.satellite_imported, catalog.size)
                    if (page == Page.SETTINGS) show(Page.SETTINGS)
                }
            } catch (error: IllegalArgumentException) { report(error) }
            catch (error: IOException) { report(error) }
            catch (error: SecurityException) { report(error) }
        }
    }
    override fun onDestroy() {
        generation++
        worker.execute {
            orbits.values.forEach { it.close() }
            orbits.clear()
            engine?.close()
        }
        worker.shutdown()
        audioWorker.shutdownNow()
        super.onDestroy()
    }
}
