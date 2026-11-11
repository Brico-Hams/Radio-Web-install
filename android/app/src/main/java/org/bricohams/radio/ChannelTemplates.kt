package org.bricohams.radio

import org.json.JSONArray
import org.json.JSONObject
import java.text.Normalizer

/**
 * Offline regional templates. Datasets are the shared data/channel-templates files (bundled by the Gradle sync task);
 * profiles come from profiles.json, generated from the JS table. Everything here is RX-only reference data: it
 * never writes hardware and omits, with a count, whatever a model cannot represent with a safe mode and TX lock.
 */
object ChannelTemplates {
    data class Country(val code: String, val name: String, val pmr: Boolean)
    data class Region(val id: String, val name: String)
    data class Channel(val key: String, val name: String, val rx: String, val tx: String, val modulation: String,
        val narrow: Boolean, val regionId: String, val city: String, val ident: String, val source: String,
        val notes: String, val country: String, val tone: String, val attribution: String, val license: String)
    data class Profile(val id: String, val label: String, val modulations: List<String>,
        val bands: Map<String, List<Pair<Double, Double>>>, val txLock: String, val output: String, val extension: String)
    data class Dataset(val country: Country, val regions: List<Region>, val channels: List<Channel>, val airports: List<Channel>,
        val coverage: String, val airportCoverage: String)
    data class Prepared(val accepted: List<Channel>, val omitted: Int, val reasons: Map<String, Int>, val warnings: List<String>)
    data class Export(val prepared: Prepared, val profile: Profile, val mime: String, val content: String)

    val countries = listOf(Country("ES", "España", true), Country("GB", "United Kingdom", true), Country("US", "United States", false),
        Country("DE", "Deutschland", true), Country("FR", "France", true), Country("HU", "Magyarország", true), Country("IT", "Italia", true))
    // Same order and ids as the JS PROFILES table; the exporter model list.
    val profileIds = listOf("radicodex", "rt950pro", "uvk5v3", "d878", "ftx1")

    fun profiles(json: String): List<Profile> {
        val root = JSONObject(json)
        require(root.getString("format") == "bricohams-template-profiles" && root.getInt("version") == 1)
        val all = root.getJSONObject("profiles")
        return profileIds.map { id ->
            val item = all.getJSONObject(id)
            val bands = item.getJSONObject("bands")
            Profile(id, item.getString("label"), item.getJSONArray("modulations").strings(),
                bands.keys().asSequence().associateWith { key ->
                    val list = bands.getJSONArray(key)
                    (0 until list.length()).map { list.getJSONArray(it).let { pair -> pair.getDouble(0) to pair.getDouble(1) } }
                }, item.getString("txLock"), item.getString("output"), item.getString("extension"))
        }
    }

    fun dataset(country: Country, countryJson: String, airportsJson: String?): Dataset {
        val file = JSONObject(countryJson)
        require(file.getString("format") == "bricohams-country-template" && file.getInt("version") == 1 && file.getString("country") == country.code)
        val regions = file.getJSONArray("regions").objects().map { Region(it.getString("id"), it.getString("name")) }
        val ids = regions.map { it.id }.toSet()
        val channels = file.getJSONArray("channels").objects().map {
            Channel(it.getString("key"), it.getString("name"), it.getString("rx"), it.getString("tx"),
                if (it.getInt("mode") == 0) "FM" else "DMR", false, it.getString("regionId"), it.optString("city"),
                it.optString("callsign"), it.optString("source"), it.optString("notes"), country.code, it.optString("tone"), "", "")
        }.filter { it.regionId in ids }
        var airportChannels = emptyList<Channel>()
        var airportCoverage = ""
        if (airportsJson != null) {
            val airportFile = JSONObject(airportsJson)
            require(airportFile.getString("format") == "bricohams-airport-template" && airportFile.getInt("version") == 1 &&
                airportFile.getString("country") == country.code)
            airportCoverage = airportFile.getString("coverage")
            val airports = airportFile.getJSONObject("airports")
            airportChannels = airportFile.getJSONArray("frequencies").objects().mapNotNull { entry ->
                val ident = entry.getString("ident")
                val airport = airports.optJSONObject(ident) ?: return@mapNotNull null
                if (airport.getString("regionId") !in ids || !airband(entry.getString("rx"))) return@mapNotNull null
                val rx = entry.getString("rx")
                val description = entry.optString("description")
                Channel("ourairports:${entry.getInt("id")}", asciiName("$ident ${entry.getString("type")}", 16), rx, rx, "AM", false,
                    airport.getString("regionId"), airport.optString("municipality"), ident,
                    "https://ourairports.com/airports/$ident/", "${airport.getString("name")}${if (description.isEmpty()) "" else " - $description"}. " +
                        "AM RX only, published frequency; not for navigation.", country.code, "", "OurAirports (public domain)",
                    airportFile.getString("license"))
            }
        }
        return Dataset(country, regions, channels, airportChannels, file.getString("coverage"), airportCoverage)
    }

    /** Repeaters, then airports of the same region, then PMR446 last; PMR never for a country without it (US). */
    fun select(dataset: Dataset, region: String, airports: Boolean, pmr: Boolean): List<Channel> {
        require(region.isEmpty() || dataset.regions.any { it.id == region })
        val byRegion = (dataset.channels + if (airports) dataset.airports else emptyList()).groupBy { it.regionId }
        val channels = dataset.regions.filter { region.isEmpty() || it.id == region }
            .flatMapTo(ArrayList()) { byRegion[it.id].orEmpty() }
        if (pmr && dataset.country.pmr) channels += pmrChannels().map { it.copy(country = dataset.country.code) }
        return channels.distinctBy { it.key }
    }

    fun pmrChannels() = (0 until 16).map { index ->
        val frequency = "%.5f".format(java.util.Locale.ROOT, (44600625 + index * 1250) / 100000.0)
        Channel("pmr446:${index + 1}", "PMR%02d".format(java.util.Locale.ROOT, index + 1), frequency, frequency, "FM", true, "PMR446", "", "",
            "PMR446 analogico solo RX", "", "", "", "", "")
    }

    private fun airband(value: String): Boolean {
        val mhz = value.toDoubleOrNull() ?: return false
        if (!Regex("^\\d{3}\\.\\d{1,5}$").matches(value) || mhz < 118.0 || mhz > 136.975) return false
        val steps = mhz * 120
        return Math.abs(steps - Math.round(steps)) < 0.00061
    }

    fun prepare(profile: Profile, channels: List<Channel>): Prepared {
        val accepted = ArrayList<Channel>()
        val reasons = LinkedHashMap<String, Int>()
        fun omit(reason: String) { reasons[reason] = (reasons[reason] ?: 0) + 1 }
        fun inBands(value: Double?, bands: List<Pair<Double, Double>>) = value != null && bands.any { value >= it.first && value <= it.second }
        for (channel in channels) {
            val rx = channel.rx.toDoubleOrNull()
            val tx = channel.tx.toDoubleOrNull()
            val bands = profile.bands[channel.modulation]
            when {
                channel.modulation !in profile.modulations || bands == null -> omit("modulation:${channel.modulation}")
                channel.modulation == "AM" && channel.tx != channel.rx -> omit("txLock")
                !inBands(rx, bands) || !inBands(tx, bands) || (rx!! < 350) != (tx!! < 350) -> omit("band")
                else -> accepted += channel
            }
        }
        return Prepared(accepted, channels.size - accepted.size, reasons, if (profile.txLock == "none") listOf("rxOnlyNotGuaranteed") else emptyList())
    }

    fun export(profile: Profile, channels: List<Channel>): Export {
        val prepared = prepare(profile, channels)
        requireUi(prepared.accepted.isNotEmpty()) { UiText(R.string.template_none_representable, profile.label) }
        return if (profile.output == "anytone-project") {
            requireUi(prepared.accepted.size <= 4000) { UiText(R.string.template_anytone_capacity) }
            Export(prepared, profile, "application/json", anytoneProject(prepared.accepted))
        }
        else Export(prepared, profile, "text/csv", if (profile.output == "reference-csv") referenceCsv(prepared.accepted) else chirpCsv(prepared.accepted))
    }

    fun asciiName(value: String, length: Int): String {
        val name = Normalizer.normalize(value, Normalizer.Form.NFD).filter { it in ' '..'~' }.trim().take(length)
        require(name.isNotEmpty())
        return name
    }

    private fun cell(value: String): String {
        val text = if (value.isNotEmpty() && value[0] in "=+@-\t\r") "'$value" else value
        return "\"${text.replace("\"", "\"\"")}\""
    }
    private fun csv(rows: List<List<String>>) = rows.joinToString("\r\n", postfix = "\r\n") { row -> row.joinToString(",") { cell(it) } }

    private fun referenceCsv(channels: List<Channel>) = csv(listOf(listOf("Name", "RX_MHz", "TX_nominal_MHz", "Modulation", "RX_Only", "Country",
        "Region_ID", "Locality", "Identifier", "Key", "Source", "Notes")) + channels.map {
        listOf(it.name, it.rx, it.tx, it.modulation, "Yes", it.country, it.regionId, it.city, it.ident, it.key, it.source, it.notes)
    })

    private fun chirpCsv(channels: List<Channel>) = csv(listOf(listOf("Location", "Name", "Frequency", "Duplex", "Offset", "Tone", "rToneFreq",
        "cToneFreq", "DtcsCode", "DtcsPolarity", "RxDtcsCode", "CrossMode", "Mode", "TStep", "Skip", "Comment")) +
        channels.mapIndexed { index, it ->
            listOf(index.toString(), asciiName(it.name, 10), it.rx, "off", "0.000000", "", "88.5", "88.5", "023", "NN", "023", "Tone->Tone",
                if (it.modulation == "AM") "AM" else if (it.narrow) "NFM" else "FM", "5.00", "",
                "RX ONLY. Zone: ${it.regionId}. TX nominal ${it.tx}; tono de proveedor ${it.tone.ifEmpty { "sin dato" }}. ${it.source} ${it.notes} ${it.attribution} ${it.license}")
        })

    private fun anytoneProject(channels: List<Channel>) = JSONObject().apply {
        put("format", "bricohams-anytone-project"); put("version", 1); put("profile", "D878"); put("airband", false); put("fmBroadcast", false)
        put("channels", JSONArray().also { list ->
            for (c in channels) list.put(JSONObject().apply {
                put("name", asciiName(c.name, 16)); put("rx", c.rx); put("tx", c.tx); put("mode", "FM"); put("colorCode", 0); put("timeslot", 1)
                put("talkgroup", 0); put("bandwidth", if (c.narrow) "12.5" else "pending"); put("broadcastOnly", false); put("rxOnly", true)
                put("source", c.source.ifEmpty { "bricohams-template" }.take(500))
                put("zone", c.regionId.ifEmpty { "Plantilla" }); put("notes", c.notes.take(1000))
            })
        }).toString(2)
    }

    private fun JSONArray.objects() = (0 until length()).map { getJSONObject(it) }
    private fun JSONArray.strings() = (0 until length()).map { getString(it) }
}
