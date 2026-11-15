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
    data class Country(val code: String, val name: String, val pmr: Boolean, val america: Boolean = false)
    data class Region(val id: String, val name: String)
    data class Channel(val key: String, val name: String, val rx: String, val tx: String, val modulation: String,
        val narrow: Boolean, val regionId: String, val city: String, val ident: String, val source: String,
        val notes: String, val country: String, val tone: String, val attribution: String, val license: String,
        val region: String = "", val zone: String = "", val slot: Int = 0)
    /** Per-radio layout from profiles.json: absent fields are unknown ("pendiente de fuente"), never guessed. */
    data class Layout(val kind: String, val zones: Int? = null, val slotsPerZone: Int? = null, val nameLength: Int? = null,
        val reservedZone: Int? = null, val reservedFromSlot: Int? = null, val lists: Int? = null, val channelLimit: Int? = null,
        val from: Int? = null, val to: Int? = null)
    data class Profile(val id: String, val label: String, val modulations: List<String>,
        val bands: Map<String, List<Pair<Double, Double>>>, val txLock: String, val output: String, val extension: String, val layout: Layout)
    data class Dataset(val country: Country, val regions: List<Region>, val channels: List<Channel>, val airports: List<Channel>,
        val coverage: String, val airportCoverage: String)
    data class Prepared(val accepted: List<Channel>, val omitted: Int, val reasons: Map<String, Int>, val warnings: List<String>)
    data class Zone(val index: Int, val name: String, val regionIds: List<String>, val channels: List<Channel>)
    data class ZonePlan(val profile: String, val zones: List<Zone>, val reasons: Map<String, Int>, val accepted: List<Channel>,
        val omitted: Int, val warnings: List<String>)
    data class Export(val prepared: Prepared, val plan: ZonePlan, val profile: Profile, val mime: String, val content: String)

    // The importer addresses memories 1-1024; same constant as QUANSHENG_MEMORIES in channel-templates.js.
    private const val QUANSHENG_MEMORIES = 1024

    val countries = listOf(Country("ES", "España", true), Country("GB", "United Kingdom", true), Country("US", "United States", false, true),
        Country("DE", "Deutschland", true), Country("FR", "France", true), Country("HU", "Magyarország", true), Country("IT", "Italia", true)) +
        // Same codes, names and PMR446 flags as COUNTRIES in channel-templates.js (Europe first, then the Americas; no PMR446 there).
        listOf("AL" to "Albania", "AD" to "Andorra", "AT" to "Austria", "BE" to "Bélgica", "BA" to "Bosnia y Herzegovina",
            "BG" to "Bulgaria", "HR" to "Croacia", "CY" to "Chipre", "CZ" to "Chequia", "DK" to "Dinamarca", "EE" to "Estonia",
            "FI" to "Finlandia", "GR" to "Grecia", "IE" to "Irlanda", "IS" to "Islandia", "XK" to "Kosovo", "LV" to "Letonia",
            "LI" to "Liechtenstein", "LT" to "Lituania", "LU" to "Luxemburgo", "MT" to "Malta", "MD" to "Moldavia", "MC" to "Mónaco",
            "ME" to "Montenegro", "NL" to "Países Bajos", "MK" to "Macedonia del Norte", "NO" to "Noruega", "PL" to "Polonia",
            "PT" to "Portugal", "RO" to "Rumanía", "SM" to "San Marino", "RS" to "Serbia", "SK" to "Eslovaquia", "SI" to "Eslovenia",
            "SE" to "Suecia", "CH" to "Suiza", "UA" to "Ucrania", "VA" to "Ciudad del Vaticano").map { Country(it.first, it.second, true) } +
        Country("BY", "Bielorrusia", false) +
        listOf("CA" to "Canadá", "MX" to "México", "BZ" to "Belice", "CR" to "Costa Rica", "SV" to "El Salvador", "GT" to "Guatemala",
            "HN" to "Honduras", "NI" to "Nicaragua", "PA" to "Panamá", "AG" to "Antigua y Barbuda", "BS" to "Bahamas", "BB" to "Barbados",
            "CU" to "Cuba", "DM" to "Dominica", "DO" to "República Dominicana", "GD" to "Granada", "HT" to "Haití", "JM" to "Jamaica",
            "KN" to "San Cristóbal y Nieves", "LC" to "Santa Lucía", "VC" to "San Vicente y las Granadinas", "TT" to "Trinidad y Tobago",
            "AR" to "Argentina", "BO" to "Bolivia", "BR" to "Brasil", "CL" to "Chile", "CO" to "Colombia", "EC" to "Ecuador",
            "GY" to "Guyana", "PY" to "Paraguay", "PE" to "Perú", "SR" to "Surinam", "UY" to "Uruguay", "VE" to "Venezuela")
            .map { Country(it.first, it.second, false, true) }
    // Same order and ids as the JS PROFILES table; the exporter model list.
    val profileIds = listOf("radicodex", "rt950pro", "uvk5v3", "d878", "ftx1")

    const val PENDING = "pendiente de fuente"
    // Countries that shipped before coverage.json existed; used when the coverage file is absent.
    private val LEGACY_CODES = listOf("ES", "GB", "US", "DE", "FR", "HU", "IT")

    /** code -> status from data/channel-templates/coverage.json; empty when the file is missing. */
    fun coverage(json: String?): Map<String, String> {
        if (json == null) return emptyMap()
        val root = JSONObject(json)
        require(root.getString("format") == "bricohams-template-coverage" && root.getInt("version") == 1)
        return root.getJSONArray("countries").objects().associate { it.getString("code") to it.getString("status") }
    }

    /** Countries that can be loaded: status "ok"; countries marked "pendiente de fuente" are excluded. */
    fun available(coverage: Map<String, String>): List<Country> =
        if (coverage.isEmpty()) countries.filter { it.code in LEGACY_CODES } else countries.filter { coverage[it.code] == "ok" }

    data class RepeaterFile(val radio: String, val country: String, val path: String, val channels: Int, val dropped: Int, val sha256: String)
    data class RepeaterRadio(val id: String, val name: String)
    data class RepeaterIndex(val radios: List<RepeaterRadio>, val countries: Map<String, String>, val files: List<RepeaterFile>) {
        fun file(radio: String, country: String) = files.firstOrNull { it.radio == radio && it.country == country }
        /** Countries with status "ok" that have at least one prebuilt file. */
        fun countriesWithFiles(): List<Country> = ChannelTemplates.countries.filter { countries[it.code] == "ok" && files.any { f -> f.country == it.code } }
    }

    /** Parses templates/repeaters/index.json (written by scripts/build-repeater-templates.cjs). */
    fun repeaterIndex(json: String): RepeaterIndex {
        val root = JSONObject(json)
        return RepeaterIndex(
            root.getJSONArray("radios").objects().map { RepeaterRadio(it.getString("id"), it.getString("name")) },
            root.getJSONArray("countries").objects().associate { it.getString("code") to it.getString("status") },
            root.getJSONArray("files").objects().map {
                RepeaterFile(it.getString("radio"), it.getString("country"), it.getString("path"), it.getInt("channels"),
                    it.getInt("dropped"), it.getString("sha256"))
            })
    }

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
                }, item.getString("txLock"), item.getString("output"), item.getString("extension"), layout(item.getJSONObject("layout")))
        }
    }

    private fun layout(item: JSONObject): Layout {
        fun int(source: JSONObject, key: String) = if (source.has(key)) source.getInt(key) else null
        val reserved = item.optJSONObject("reserved")
        return Layout(item.getString("kind"), int(item, "zones"), int(item, "slotsPerZone"), int(item, "nameLength"),
            reserved?.let { int(it, "zone") }, reserved?.let { int(it, "fromSlot") }, int(item, "lists"), int(item, "channelLimit"),
            int(item, "from"), int(item, "to"))
    }

    fun dataset(country: Country, countryJson: String, airportsJson: String?, guideJson: String? = null): Dataset {
        val file = JSONObject(countryJson)
        require(file.getString("format") == "bricohams-country-template" && file.getInt("version") == 1 && file.getString("country") == country.code)
        val regions = file.getJSONArray("regions").objects().map { Region(it.getString("id"), it.getString("name")) }
        val ids = regions.map { it.id }.toSet()
        val names = regions.associate { it.id to it.name }
        val channels = file.getJSONArray("channels").objects().map {
            Channel(it.getString("key"), it.getString("name"), it.getString("rx"), it.getString("tx"),
                if (it.getInt("mode") == 0) "FM" else "DMR", false, it.getString("regionId"), it.optString("city"),
                it.optString("callsign"), it.optString("source"), it.optString("notes"), country.code, it.optString("tone"), "", "",
                names[it.getString("regionId")].orEmpty())
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
                    airportFile.getString("license"), names[airport.getString("regionId")].orEmpty())
            }
            if (guideJson != null) {
                require(country.code == "ES") { "The airband guide only applies to Spain." }
                airportChannels = withGuide(airportChannels, airports, names, ids, country.code, JSONObject(guideJson))
            }
        }
        return Dataset(country, regions, channels, airportChannels, file.getString("coverage"), airportCoverage)
    }

    private const val GUIDE_SOURCE = "ENAIRE AIP via 101ATM AIRBAND Spain AD COM Guide v1.0, p.1"
    private const val GUIDE_ATTRIBUTION = "101ATM AIRBAND Spain AD COM Guide v1.0 (extracted frequencies only; third-party document not redistributed)"

    private fun khz(value: String) = Math.round(value.toDouble() * 1000)

    private fun isAirport(channel: Channel) = channel.key.startsWith("ourairports:") || channel.key.startsWith("airband-guide:")

    /** Validates the third-party guide extract; mhz is the real carrier, icaoChannel is only the 8.33 kHz channel name. */
    private fun validateGuide(guide: JSONObject) {
        val source = guide.getJSONObject("source")
        require(source.getString("title").isNotEmpty() && source.getString("version").isNotEmpty()) { "Airband guide: invalid source." }
        val seen = HashSet<String>()
        for (aerodrome in guide.getJSONArray("aerodromes").objects()) {
            val icao = aerodrome.getString("icao")
            require(Regex("^(LE|GC|GE)[A-Z]{2}$").matches(icao) && seen.add(icao) &&
                aerodrome.getString("kind") in listOf("civil-atc", "civil-afis", "military")) { "Airband guide: invalid aerodrome $icao." }
            for (channel in aerodrome.getJSONArray("channels").objects()) {
                val where = "$icao ${channel.optString("service")}"
                require(channel.getString("service").isNotEmpty() && (Regex("^\\d{3}\\.\\d{3}$").matches(channel.getString("icaoChannel")) || (channel.getString("icaoChannel") == "xxx.xxx" && channel.isNull("mhz")))) {
                    "Airband guide: invalid channel ($where)."
                }
                val missing = channel.isNull("mhz")
                require(!missing || !channel.isNull("note")) { "Airband guide: missing frequency without note ($where)." }
                if (channel.isNull("note")) require(airband("%.5f".format(java.util.Locale.ROOT, channel.getDouble("mhz")))) {
                    "Airband guide: frequency outside the band or grid ($where)."
                }
            }
        }
    }

    /** Guide channels first; OurAirports entries with the same ident and rx (kHz) are dropped, the rest stay unchanged. */
    private fun withGuide(ours: List<Channel>, airports: JSONObject, names: Map<String, String>, regionIds: Set<String>,
        country: String, guide: JSONObject): List<Channel> {
        validateGuide(guide)
        val guided = guide.getJSONObject("source").let { source ->
            guide.getJSONArray("aerodromes").objects().flatMap { aerodrome ->
                val icao = aerodrome.getString("icao")
                val airport = airports.optJSONObject(icao)
                if (airport == null || airport.getString("regionId") !in regionIds) return@flatMap emptyList<Channel>()
                aerodrome.getJSONArray("channels").objects().withIndex().mapNotNull { (index, channel) ->
                    if (!channel.isNull("note")) return@mapNotNull null
                    val rx = "%.5f".format(java.util.Locale.ROOT, channel.getDouble("mhz"))
                    Channel("airband-guide:$icao:$index", asciiName("$icao ${channel.getString("service")}", 16), rx, rx, "AM", false,
                        airport.getString("regionId"), airport.optString("municipality"), icao, GUIDE_SOURCE,
                        "${airport.getString("name")} - ${channel.getString("service")}. AM RX only; ICAO channel ${channel.getString("icaoChannel")}; not for navigation.",
                        country, "", GUIDE_ATTRIBUTION, source.optString("license_note"), names[airport.getString("regionId")].orEmpty())
                }
            }
        }
        val covered = guided.map { "${it.ident}:${khz(it.rx)}" }.toSet()
        return (guided + ours.filter { "${it.ident}:${khz(it.rx)}" !in covered }).groupBy { it.ident }.values.flatten()
    }

    /** Repeaters, then airports of the same region, then PMR446 last; PMR never for a country without it (US). */
    fun select(dataset: Dataset, region: String, airports: Boolean, pmr: Boolean, cb: Boolean = false): List<Channel> {
        require(region.isEmpty() || dataset.regions.any { it.id == region })
        val byRegion = (dataset.channels + if (airports) dataset.airports else emptyList()).groupBy { it.regionId }
        val channels = dataset.regions.filter { region.isEmpty() || it.id == region }
            .flatMapTo(ArrayList()) { byRegion[it.id].orEmpty() }
        if (pmr && dataset.country.pmr) channels += pmrChannels().map { it.copy(country = dataset.country.code) }
        if (cb && dataset.country.code == "ES") channels += cbChannels(dataset.country.code)
        return channels.distinctBy { it.key }
    }

    // CEPT CB channels 1-40 (23-25 out of order by design); Orden ETU/1033/2017. Same list as CB_MHZ in channel-templates.js.
    private val CB_MHZ = listOf(26.965, 26.975, 26.985, 27.005, 27.015, 27.025, 27.035, 27.055, 27.065, 27.075, 27.085, 27.105, 27.115,
        27.125, 27.135, 27.155, 27.165, 27.175, 27.185, 27.205, 27.215, 27.225, 27.255, 27.235, 27.245, 27.265,
        27.275, 27.285, 27.295, 27.305, 27.315, 27.325, 27.335, 27.345, 27.355, 27.365, 27.375, 27.385, 27.395, 27.405)
    const val CB_SOURCE = "https://www.fediea.org/legislacb/oetu10332017-cb.php"

    /** RX only; only Spain has a sourced CB plan here. */
    fun cbChannels(country: String): List<Channel> {
        require(country == "ES")
        return CB_MHZ.flatMapIndexed { index, mhz ->
            listOf("AM", "FM").map { mode ->
                val rx = "%.5f".format(java.util.Locale.ROOT, mhz)
                Channel("cb27:${index + 1}:$mode", "CB%02d %s".format(java.util.Locale.ROOT, index + 1, mode), rx, rx, mode, false, "CB27", "", "",
                    CB_SOURCE, "CB 27 MHz canal ${index + 1} $mode · solo RX.", country, "", "", "")
            }
        }
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

    /** Mirror of templateZonePlan in channel-templates.js: whole regions per zone, split only when larger than a zone, PMR446 last. */
    fun zonePlan(profile: Profile, channels: List<Channel>, variantConfirmed: Boolean = false): ZonePlan {
        val layout = profile.layout
        val prepared = prepare(profile, channels)
        val reasons = LinkedHashMap(prepared.reasons)
        fun overflow(count: Int) { if (count > 0) reasons["capacity"] = (reasons["capacity"] ?: 0) + count }
        val reservedZone = layout.reservedZone
        var room = when (layout.kind) {
            "memories" -> layout.to!! - layout.from!! + 1
            "scanlists" -> QUANSHENG_MEMORIES
            else -> layout.channelLimit ?: Int.MAX_VALUE
        }
        val fullCapacity = layout.slotsPerZone ?: room
        fun zoneCapacity(index: Int) = if (reservedZone == index) minOf(fullCapacity, layout.reservedFromSlot!! - 1) else fullCapacity
        val fixedZones = layout.zones
        val maxZones = fixedZones ?: layout.lists ?: Int.MAX_VALUE
        val regional = LinkedHashMap<String, MutableList<Channel>>()
        val satellite = ArrayList<Channel>()
        val pmr = ArrayList<Channel>()
        for (channel in prepared.accepted) when {
            channel.regionId == "PMR446" || channel.regionId == "CB27" -> pmr += channel
            channel.regionId.isEmpty() || channel.key.startsWith("sat") -> satellite += channel
            else -> regional.getOrPut(channel.regionId) { ArrayList() } += channel
        }
        // The PMR446/CB zone is the last zone whose capacity fits it (else the last zone with the largest capacity).
        val pmrIndex = if (pmr.isNotEmpty() && fixedZones != null) {
            val indexes = (fixedZones downTo 1).toList()
            val best = indexes.maxOf { zoneCapacity(it) }
            indexes.first { zoneCapacity(it) >= minOf(pmr.size, best) }
        } else null
        val regularLimit = if (pmrIndex != null) pmrIndex - 1 else maxZones - if (pmr.isNotEmpty()) 1 else 0
        class Draft(val index: Int, var name: String, val regions: MutableList<Region>, val items: MutableList<Channel>)
        val drafts = ArrayList<Draft>()
        fun take(items: List<Channel>): List<Channel> {
            val kept = items.take(maxOf(0, room))
            overflow(items.size - kept.size); room -= kept.size
            return kept
        }
        fun fill(list: List<Channel>, name: String, regions: MutableList<Region>, last: Boolean = false): List<Draft> {
            val made = ArrayList<Draft>()
            var rest = list
            while (rest.isNotEmpty()) {
                val index = if (last && pmrIndex != null) pmrIndex else drafts.size + 1
                if ((made.isNotEmpty() && last) || (!last && drafts.size >= regularLimit)) { overflow(rest.size); break }
                val size = minOf(rest.size, zoneCapacity(index))
                val items = take(rest.take(size))
                rest = rest.drop(size)
                if (items.isEmpty()) { overflow(rest.size); break }
                val draft = Draft(index, name, regions, items.toMutableList())
                drafts += draft; made += draft
            }
            if (made.size > 1) made.forEachIndexed { part, draft -> draft.name = "$name ${part + 1}/${made.size}" }
            return made
        }
        // Without a per-zone slot count, one zone per region; regions share a zone only when there are more regions than zones.
        val perZone = if (layout.slotsPerZone != null) Int.MAX_VALUE else
            maxOf(1, Math.ceil(regional.size.toDouble() / maxOf(1, regularLimit - if (satellite.isNotEmpty()) 1 else 0)).toInt())
        var current: Draft? = null
        for ((regionId, found) in regional) {
            val list = found.filter { !isAirport(it) } + found.filter { isAirport(it) }
            val name = list.first().region.ifEmpty { regionId }
            val open = current
            if (open != null && open.regions.size < perZone && open.items.size + list.size <= zoneCapacity(open.index) && room >= list.size) {
                open.items += take(list); open.regions += Region(regionId, name)
                open.name = "${open.regions.first().name} - $name"
                continue
            }
            val made = fill(list, name, mutableListOf(Region(regionId, name)))
            current = if (made.size == 1) made[0] else null
        }
        if (satellite.isNotEmpty()) fill(satellite, "SAT", mutableListOf())
        // PMR446 and CB share the last zone ("PMR446 + CB").
        val services = pmr.map { it.regionId }.distinct()
        fun label(id: String) = if (id == "CB27") "CB" else id
        if (pmr.isNotEmpty()) fill(pmr, services.joinToString(" + ") { label(it) }, services.mapTo(ArrayList()) { Region(it, label(it)) }, true)
        val zones = drafts.map { draft ->
            Zone(draft.index, draft.name, draft.regions.map { it.id },
                draft.items.mapIndexed { slot, channel -> channel.copy(zone = draft.name, slot = slot + 1) })
        }
        val accepted = zones.flatMap { it.channels }
        return ZonePlan(profile.id, zones, reasons, accepted, channels.size - accepted.size, prepared.warnings)
    }

    fun export(profile: Profile, channels: List<Channel>, variantConfirmed: Boolean = false): Export {
        val prepared = prepare(profile, channels)
        requireUi(prepared.accepted.isNotEmpty()) { UiText(R.string.template_none_representable, profile.label) }
        if (profile.output == "anytone-project") requireUi(prepared.accepted.size <= (profile.layout.channelLimit ?: 4000)) { UiText(R.string.template_anytone_capacity) }
        val plan = zonePlan(profile, channels, variantConfirmed)
        requireUi(plan.accepted.isNotEmpty()) { UiText(R.string.template_none_representable, profile.label) }
        val planned = Prepared(plan.accepted, plan.omitted, plan.reasons, plan.warnings)
        return when (profile.output) {
            "anytone-project" -> Export(planned, plan, profile, "application/json", anytoneProject(plan.accepted))
            "reference-csv" -> Export(planned, plan, profile, "text/csv", referenceCsv(plan, profile))
            else -> Export(planned, plan, profile, "text/csv", chirpCsv(plan.accepted))
        }
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

    private fun referenceCsv(plan: ZonePlan, profile: Profile): String {
        val layout = profile.layout
        val extra = when (profile.id) { "rt950pro" -> listOf("Zone", "Slot", "Channel_Number"); "ftx1" -> listOf("Memory", "Zone"); else -> listOf("Zone") }
        var memory = layout.from ?: 1
        val rows = ArrayList<List<String>>()
        rows += listOf("Name", "RX_MHz", "TX_nominal_MHz", "Modulation", "RX_Only", "Country", "Region_ID", "Locality", "Identifier", "Key", "Source", "Notes") + extra
        for (zone in plan.zones) for (c in zone.channels) rows += listOf(c.name, c.rx, c.tx, c.modulation, "Yes", c.country, c.regionId,
            c.city, c.ident, c.key, c.source, c.notes) + when (profile.id) {
            "rt950pro" -> listOf(c.zone, c.slot.toString(), ((zone.index - 1) * layout.slotsPerZone!! + c.slot).toString())
            "ftx1" -> listOf((memory++).toString(), c.zone)
            else -> listOf(c.zone)
        }
        return csv(rows)
    }

    private fun chirpCsv(channels: List<Channel>) = csv(listOf(listOf("Location", "Name", "Frequency", "Duplex", "Offset", "Tone", "rToneFreq",
        "cToneFreq", "DtcsCode", "DtcsPolarity", "RxDtcsCode", "CrossMode", "Mode", "TStep", "Skip", "Comment")) +
        channels.mapIndexed { index, it ->
            listOf(index.toString(), asciiName(it.name, 10), it.rx, "off", "0.000000", "", "88.5", "88.5", "023", "NN", "023", "Tone->Tone",
                if (it.modulation == "AM") "AM" else if (it.narrow) "NFM" else "FM", "5.00", "",
                "RX ONLY. Zone: ${it.zone}. TX nominal ${it.tx}; tono de proveedor ${it.tone.ifEmpty { "sin dato" }}. ${it.source} ${it.notes} ${it.attribution} ${it.license}")
        })

    private fun anytoneProject(channels: List<Channel>) = JSONObject().apply {
        put("format", "bricohams-anytone-project"); put("version", 1); put("profile", "D878"); put("airband", false); put("fmBroadcast", false)
        put("channels", JSONArray().also { list ->
            for (c in channels) list.put(JSONObject().apply {
                put("name", asciiName(c.name, 16)); put("rx", c.rx); put("tx", c.tx); put("mode", "FM"); put("colorCode", 0); put("timeslot", 1)
                put("talkgroup", 0); put("bandwidth", if (c.narrow) "12.5" else "pending"); put("broadcastOnly", false); put("rxOnly", true)
                put("source", c.source.ifEmpty { "bricohams-template" }.take(500))
                put("zone", c.zone.ifEmpty { c.regionId }.ifEmpty { "Plantilla" }.take(64)); put("notes", c.notes.take(1000))
            })
        })
    }.toString(2)

    private fun JSONArray.objects() = (0 until length()).map { getJSONObject(it) }
    private fun JSONArray.strings() = (0 until length()).map { getString(it) }
}
