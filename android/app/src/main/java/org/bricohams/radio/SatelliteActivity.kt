package org.bricohams.radio

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowInsets
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.io.IOException
import java.time.Instant
import java.time.ZoneId
import java.util.concurrent.Executors

class SatelliteActivity : Activity() {
    private val worker = Executors.newSingleThreadExecutor()
    private lateinit var status: TextView
    private lateinit var results: LinearLayout
    private val fields = linkedMapOf<String, EditText>()
    private val controls = ArrayList<Button>()
    private var busy = false
    private lateinit var radar: PassRadarView
    private lateinit var detail: TextView
    private lateinit var openCat: Button
    private val cards = LinkedHashMap<TextView, PassTrack>()
    private var selected: PassTrack? = null
    private val handler = Handler(Looper.getMainLooper())
    private val ticker = object : Runnable {
        override fun run() { refresh(); handler.postDelayed(this, 1000) }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val preferences = getSharedPreferences("satellite-observer", MODE_PRIVATE)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = (16 * resources.displayMetrics.density).toInt()
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
        status = TextView(this).apply { setText(R.string.satellite_intro); textSize = 17f }
        layout.addView(status)
        layout.addView(TextView(this).apply { setText(R.string.satellite_help) })
        fun input(key: String, idValue: Int, label: Int, initial: String = "") {
            layout.addView(TextView(this).apply { setText(label) })
            val input = EditText(this).apply {
                id = idValue
                setText(preferences.getString(key, initial))
                setSingleLine(true)
            }
            fields[key] = input; layout.addView(input)
        }
        fun button(label: Int, action: () -> Unit) {
            val button = Button(this).apply { setText(label); setOnClickListener { action() } }
            controls.add(button); layout.addView(button)
        }
        button(R.string.satellite_import) {
            startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE); type = "*/*"
            }, 60)
        }
        input("name", R.id.satellite_name, R.string.satellite_name)
        input("line1", R.id.satellite_line1, R.string.satellite_line1)
        input("line2", R.id.satellite_line2, R.string.satellite_line2)
        input("latitude", R.id.satellite_latitude, R.string.satellite_latitude)
        input("longitude", R.id.satellite_longitude, R.string.satellite_longitude)
        input("height", R.id.satellite_height, R.string.satellite_height)
        input("frequency", R.id.satellite_downlink, R.string.satellite_downlink)
        input("minimum", R.id.satellite_minimum, R.string.satellite_minimum, "10")
        button(R.string.satellite_predict) {
            if (busy) return@button
            try {
                fun value(key: String) = requireNotNull(fields[key]).text.toString().trim()
                val tle = Tle(value("name"), value("line1"), value("line2")).validated()
                val observer = ObserverPosition(value("latitude").toDouble(), value("longitude").toDouble(), value("height").toDouble()).validated()
                val frequency = value("frequency").toBigDecimal().movePointRight(6).longValueExact()
                require(frequency % 10 == 0L && CatProtocol.inBand(frequency / 10)) { "Downlink en MHz VHF/UHF, paso 10 Hz. Solo RX FM puntual." }
                val minimum = value("minimum").toDouble()
                require(minimum.isFinite() && minimum in 0.0..60.0) { "Elevacion minima de 0 a 60 grados." }
                val saved = fields.mapValues { it.value.text.toString() }
                val now = System.currentTimeMillis()
                setBusy(true)
                clearPasses()
                worker.execute {
                    try {
                        val tracks = SatelliteOrbit(tle, observer, assets.open("satellite-6.0.1.js").bufferedReader().use { it.readText() },
                            assets.open("orbital-engine.js").bufferedReader().use { it.readText() }).use { orbit ->
                            orbit.predict(now, minimum = minimum).map { pass ->
                                PassTrack(SatellitePlan(tle, observer, frequency, pass), SatellitePasses.sample(pass) { orbit.look(it) })
                            }
                        }
                        val editor = preferences.edit()
                        saved.forEach { (key, value) -> editor.putString(key, value) }
                        check(editor.commit()) { "No se pudieron conservar los parametros locales." }
                        runOnUiThread {
                            if (!isDestroyed) {
                                status.text = getString(R.string.satellite_results, tracks.size, Instant.ofEpochMilli(now).toString())
                                showPasses(tracks)
                            }
                        }
                    } catch (error: IllegalArgumentException) { report(error) }
                    catch (error: IOException) { report(error) }
                    catch (error: IllegalStateException) { report(error) }
                    finally { runOnUiThread { if (!isDestroyed) setBusy(false) } }
                }
            } catch (error: IllegalArgumentException) { report(error) }
            catch (error: ArithmeticException) { report(error) }
        }
        results = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        radar = PassRadarView(this).apply { importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES }
        detail = TextView(this)
        openCat = Button(this).apply {
            setText(R.string.satellite_open_cat)
            setOnClickListener {
                val plan = selected?.plan ?: return@setOnClickListener
                startActivity(Intent(this@SatelliteActivity, CatActivity::class.java)
                    .putExtra("satellite-plan", SatellitePlanJson.encode(plan)))
            }
        }
        layout.addView(results)
        fields.values.forEach { input ->
            input.addTextChangedListener(object : android.text.TextWatcher {
                override fun beforeTextChanged(value: CharSequence?, start: Int, count: Int, after: Int) = Unit
                override fun onTextChanged(value: CharSequence?, start: Int, before: Int, count: Int) {
                    clearPasses()
                }
                override fun afterTextChanged(value: android.text.Editable?) = Unit
            })
        }
        setContentView(ScrollView(this).apply { addView(layout) })
    }
    private fun clearPasses() {
        results.removeAllViews(); cards.clear(); selected = null
    }
    private fun showPasses(tracks: List<PassTrack>) {
        clearPasses()
        if (tracks.isEmpty()) return
        results.addView(radar); results.addView(detail); results.addView(openCat)
        results.addView(TextView(this).apply { setText(R.string.satellite_passes_hint) })
        val padding = (8 * resources.displayMetrics.density).toInt()
        for (track in tracks) {
            val card = TextView(this).apply {
                setPadding(padding, padding, padding, padding)
                isClickable = true; isFocusable = true
                setOnClickListener { select(track) }
            }
            cards[card] = track; results.addView(card)
        }
        select(tracks.first())
    }
    private fun select(track: PassTrack) {
        selected = track
        radar.track = track.track
        refresh()
    }
    private fun refresh() {
        val now = System.currentTimeMillis()
        val zone = ZoneId.systemDefault()
        for ((card, track) in cards) {
            card.text = SatellitePasses.card(track, now, zone)
            card.isSelected = track == selected
            card.setBackgroundColor(if (track == selected) 0x3329A0D6 else 0)
        }
        val track = selected ?: return
        radar.now = now
        detail.text = SatellitePasses.detail(track, now)
        radar.contentDescription = getString(R.string.satellite_radar_description, detail.text)
    }
    override fun onResume() {
        super.onResume()
        handler.post(ticker)
    }
    override fun onPause() {
        handler.removeCallbacks(ticker)
        super.onPause()
    }
    private fun setBusy(value: Boolean) {
        busy = value
        controls.forEach { it.isEnabled = !value }
        fields.values.forEach { it.isEnabled = !value }
        if (value) status.setText(R.string.satellite_working)
    }
    private fun report(error: Exception) {
        runOnUiThread { if (!isDestroyed) status.text = getString(R.string.satellite_error, error.message) }
    }
    @Deprecated("Platform callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 60) return
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null) { status.setText(R.string.satellite_cancelled); return }
        setBusy(true)
        clearPasses()
        worker.execute {
            try {
                val bytes = contentResolver.readDocument(uri, 256 * 1024)
                require(bytes.all { (it.toInt() and 255) < 128 }) { "Catalogo TLE debe ser ASCII." }
                val catalog = Tle.parseCatalog(bytes.toString(Charsets.US_ASCII))
                runOnUiThread {
                    if (!isDestroyed) AlertDialog.Builder(this).setTitle(R.string.satellite_select)
                        .setItems(catalog.map { "${it.name} (${it.norad})" }.toTypedArray()) { _, index ->
                            val tle = catalog[index]
                            fields.getValue("name").setText(tle.name)
                            fields.getValue("line1").setText(tle.line1)
                            fields.getValue("line2").setText(tle.line2)
                            status.setText(R.string.satellite_imported)
                        }.show()
                }
            } catch (error: IllegalArgumentException) { report(error) }
            catch (error: IOException) { report(error) }
            catch (error: SecurityException) { report(error) }
            finally { runOnUiThread { if (!isDestroyed) setBusy(false) } }
        }
    }
    override fun onDestroy() {
        worker.shutdownNow()
        super.onDestroy()
    }
}
