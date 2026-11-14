package org.bricohams.radio

import android.app.Activity
import android.content.Context

/** How the app reaches the radio; each radio offers only the transports its existing code supports. */
enum class CatTransport(val label: Int) {
    USB_SERIAL(R.string.profile_transport_usb_serial),
    USB_CDC(R.string.profile_transport_usb_cdc),
    BLE(R.string.profile_transport_ble),
    NETWORK(R.string.profile_transport_network)
}

/** Home-screen tools; each one opens one existing activity. */
enum class Tool(val label: Int, val activity: Class<out Activity>) {
    RIG_CAT(R.string.home_open_rig_cat, RigActivity::class.java),
    UVK5_CAT(R.string.home_open_cat, CatActivity::class.java),
    RT950(R.string.home_open_rt950, Rt950Activity::class.java),
    APRS_CHAT(R.string.home_open_aprs_chat, AprsChatActivity::class.java),
    DIAGNOSTICS(R.string.home_open_diagnostics, DiagnosticsActivity::class.java),
    GD77(R.string.home_open_gd77, OpenGd77Activity::class.java),
    CHANNELS(R.string.home_open_channels, ChannelActivity::class.java),
    TEMPLATES(R.string.home_open_templates, TemplateActivity::class.java),
    SSTV(R.string.home_open_sstv, SstvActivity::class.java),
    LIVE_AUDIO(R.string.home_open_live, LiveAudioActivity::class.java),
    ROTOR(R.string.rotor_title, RotorActivity::class.java)
}

// Phone-side tools that work with any radio: SstvActivity decodes WAV files, LiveAudioActivity uses the phone microphone,
// RotorActivity talks to the separate BricoHams AZ/EL rotor (RotorBle / RotorClient).
private val ANY_RADIO = setOf(Tool.SSTV, Tool.LIVE_AUDIO, Tool.ROTOR)

/**
 * Single capability table: the radios the code supports and the tools each one can use. Every entry cites the class that
 * provides the capability. [rig] is set for the radios driven through [RigModel] (RigActivity).
 */
enum class ProfileRadio(
    val rig: RigModel?,
    private val fixedName: String?,
    val transports: List<CatTransport>,
    own: Set<Tool>
) {
    // YaesuFiveByteRig (RigProtocols.kt), serial CAT through RigActivity.
    FT817(RigModel.FT817, null, listOf(CatTransport.USB_SERIAL), setOf(Tool.RIG_CAT)),
    FT818(RigModel.FT818, null, listOf(CatTransport.USB_SERIAL), setOf(Tool.RIG_CAT)),
    FT857(RigModel.FT857, null, listOf(CatTransport.USB_SERIAL), setOf(Tool.RIG_CAT)),
    FT897(RigModel.FT897, null, listOf(CatTransport.USB_SERIAL), setOf(Tool.RIG_CAT)),
    // IcomCivRig (RigProtocols.kt); no Diagnostics.kt RadioKind and no channel template profile.
    IC705(RigModel.IC705, null, listOf(CatTransport.USB_SERIAL), setOf(Tool.RIG_CAT)),
    // Ftx1Rig (RigProtocols.kt), RadioKind.FTX1 (Diagnostics.kt), template profile "ftx1" (ChannelTemplates.profileIds).
    FTX1(RigModel.FTX1, null, listOf(CatTransport.USB_SERIAL), setOf(Tool.RIG_CAT, Tool.DIAGNOSTICS, Tool.TEMPLATES)),
    // TruSdxRig (RigProtocols.kt), RadioKind.TRUSDX (Diagnostics.kt).
    TRUSDX(RigModel.TRUSDX, null, listOf(CatTransport.USB_SERIAL), setOf(Tool.RIG_CAT, Tool.DIAGNOSTICS)),
    // QrpLabsRig (RigProtocols.kt), USB CDC (RigCat.kt comment); RadioKind.QMX (Diagnostics.kt). QDX has no RadioKind.
    QMX(RigModel.QMX, null, listOf(CatTransport.USB_CDC), setOf(Tool.RIG_CAT, Tool.DIAGNOSTICS)),
    QDX(RigModel.QDX, null, listOf(CatTransport.USB_CDC), setOf(Tool.RIG_CAT)),
    // CatProtocol (CatActivity), QuanshengChannels/QuanshengMemory (ChannelActivity), RadioKind.QUANSHENG (Diagnostics.kt),
    // template profiles "radicodex" and "uvk5v3"; SerialRadio.quanshengSettings(cdc) supports serial and CDC.
    UVK5(null, "Quansheng UV-K5 (BricoHams Satellite)", listOf(CatTransport.USB_SERIAL, CatTransport.USB_CDC),
        setOf(Tool.UVK5_CAT, Tool.CHANNELS, Tool.DIAGNOSTICS, Tool.TEMPLATES)),
    // OpenGd77Link (OpenGd77.kt) over CdcRadio.
    OPENGD77(null, "OpenGD77 (GD-77, DM-1801, RD-5R, MD-UV380, ...)", listOf(CatTransport.USB_CDC), setOf(Tool.GD77)),
    // Rt950Ble / Rt950Activity, AprsChatRadios (BLE KISS link), template profile "rt950pro".
    RT950(null, "Radtel RT-950 Pro", listOf(CatTransport.BLE), setOf(Tool.RT950, Tool.APRS_CHAT, Tool.TEMPLATES)),
    // Template profile "d878" (ChannelTemplates.profileIds): offline channel export only, no connection.
    D878(null, "AnyTone D878", emptyList(), setOf(Tool.TEMPLATES)),
    // TcpKissLink (KissLink.kt): any radio behind an external KISS TNC reachable over TCP; AprsChatActivity.
    KISS_TNC(null, null, listOf(CatTransport.NETWORK), setOf(Tool.APRS_CHAT));

    val tools: Set<Tool> = own + ANY_RADIO

    fun label(context: Context): String = rig?.label ?: fixedName ?: context.getString(R.string.profile_radio_kiss_tnc)

    fun supports(tool: Tool) = tool in tools

    /** Serial rate shown in the CAT step; the Quansheng CAT link has a fixed rate (SerialRadio.quanshengSettings). */
    val defaultBaud: Int get() = rig?.defaultBaud ?: 0
    val usesCivAddress: Boolean get() = rig == RigModel.IC705
}

/** Null (no radio chosen yet) keeps every tool available. */
fun ProfileRadio?.allows(tool: Tool) = this == null || supports(tool)

data class StationProfile(
    val radio: ProfileRadio? = null,
    val callsign: String = "",
    val transport: CatTransport? = null,
    val baud: Int = 0,
    val civAddress: String = DEFAULT_CIV,
    val host: String = "",
    val port: String = "",
    val latitude: String = "",
    val longitude: String = "",
    val heightKm: String = "",
    val locator: String = "",
    /** True when the coordinates are only the centre of [locator] (the operator typed just the locator). */
    val approximate: Boolean = false
) {
    companion object {
        const val DEFAULT_CIV = "A4"
        private fun number(text: String) = text.trim().replace(',', '.')
    }

    /** Blank location is allowed. Coordinates win and give the locator; a lone locator gives approximate centre coordinates. */
    fun validatedLocation(): StationProfile {
        val lat = number(latitude)
        val lon = number(longitude)
        if (lat.isEmpty() && lon.isEmpty()) {
            if (locator.isBlank()) return copy(latitude = "", longitude = "", heightKm = "", locator = "", approximate = false)
            val centre = Maidenhead.toLatLon(locator)
            return copy(latitude = "%.5f".format(java.util.Locale.ROOT, centre.latitude),
                longitude = "%.5f".format(java.util.Locale.ROOT, centre.longitude), heightKm = number(heightKm).ifEmpty { "0" },
                locator = Maidenhead.format(locator), approximate = true).also { it.observer() }
        }
        val height = number(heightKm).ifEmpty { "0" }
        val position = ObserverPosition(lat.toDoubleOrNull() ?: Double.NaN, lon.toDoubleOrNull() ?: Double.NaN,
            height.toDoubleOrNull() ?: Double.NaN).validated()
        val keepLocator = approximate && locator.isNotBlank()
        return copy(latitude = lat, longitude = lon, heightKm = height, approximate = keepLocator,
            locator = if (keepLocator) Maidenhead.format(locator) else Maidenhead.fromLatLon(position.latitude, position.longitude))
    }

    /** The profile position as the satellite observer, or null when no position is set. */
    fun observer(): ObserverPosition? = if (latitude.isBlank() || longitude.isBlank()) null else
        ObserverPosition(number(latitude).toDoubleOrNull() ?: Double.NaN, number(longitude).toDoubleOrNull() ?: Double.NaN,
            number(heightKm).ifEmpty { "0" }.toDoubleOrNull() ?: Double.NaN).validated()

    /** Checks only the connection settings (what "Probar conexión" needs). */
    fun validatedCat(): StationProfile {
        val chosen = requireNotNullUi(radio) { UiText(R.string.profile_radio_required) }
        if (chosen.rig != null) requireUi(baud in 300..4_000_000) { UiText(R.string.rig_invalid_baud) }
        if (chosen.usesCivAddress) {
            requireUi(civAddress.trim().toIntOrNull(16)?.let { it in 0x01..0xDF } == true) { UiText(R.string.rig_invalid_address) }
        }
        if (transport == CatTransport.NETWORK) TcpKissLink.parsePort(port)
        return copy(civAddress = civAddress.trim().uppercase())
    }

    /** The callsign is validated here once, for the whole app. */
    fun validated(): StationProfile = validatedCat().copy(callsign = Callsign.normalize(callsign)).validatedLocation()
}

/** USB serial device (and port of multi-port adapters such as the CP2105) that passed the profile connection test. */
data class UsbIdentity(val vendorId: Int, val productId: Int, val serial: String?, val port: Int) {
    companion object {
        /** Exact match (vid/pid/serial/port) first; otherwise vid/pid/port, which covers adapters whose serial is unreadable or missing. */
        fun find(stored: UsbIdentity, attached: List<UsbIdentity>): UsbIdentity? {
            val samePort = attached.filter { it.vendorId == stored.vendorId && it.productId == stored.productId && it.port == stored.port }
            return samePort.firstOrNull { !stored.serial.isNullOrEmpty() && it.serial == stored.serial } ?: samePort.firstOrNull()
        }

        fun of(device: android.hardware.usb.UsbDevice, port: Int) = UsbIdentity(device.vendorId, device.productId,
            try { device.serialNumber } catch (_: SecurityException) { null }, port)
    }
}

/** The one place where the station profile (radio, callsign, CAT settings) is stored and read. */
object ProfileStore {
    const val PREFERENCES = "profile"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    fun load(context: Context): StationProfile {
        val p = prefs(context)
        val radio = ProfileRadio.values().firstOrNull { it.name == p.getString("radio", null) }
        val transport = CatTransport.values().firstOrNull { it.name == p.getString("transport", null) }
            ?.takeIf { radio != null && it in radio.transports } ?: radio?.transports?.firstOrNull()
        return StationProfile(radio, p.getString("callsign", null) ?: legacyCallsign(context), transport,
            p.getInt("baud", radio?.defaultBaud ?: 0), p.getString("civ", null) ?: StationProfile.DEFAULT_CIV,
            p.getString("host", "") ?: "", p.getString("port", "") ?: "", p.getString("latitude", "") ?: "",
            p.getString("longitude", "") ?: "", p.getString("height_km", "") ?: "", p.getString("locator", "") ?: "",
            p.getBoolean("approximate", false))
    }

    /** Callsign typed in the screens that used to hold their own copy. */
    private fun legacyCallsign(context: Context): String {
        val old = context.getSharedPreferences(RigActivity.PREFERENCES, Context.MODE_PRIVATE).getString("callsign", null)
            ?: context.getSharedPreferences(Rt950Safety.PREFERENCES, Context.MODE_PRIVATE).getString("callsign", null)
        return try { Callsign.normalize(old ?: "") } catch (_: IllegalArgumentException) { "" }
    }

    /** Validates and stores the profile; the legacy per-screen settings that the existing activities read are kept in step. */
    fun save(context: Context, profile: StationProfile) {
        val checked = profile.validated()
        val radio = checked.radio!!
        prefs(context).edit().putString("radio", radio.name).putString("callsign", checked.callsign)
            .putString("transport", checked.transport?.name).putInt("baud", checked.baud)
            .putString("civ", checked.civAddress).putString("host", checked.host.trim()).putString("port", checked.port.trim())
            .putString("latitude", checked.latitude).putString("longitude", checked.longitude)
            .putString("height_km", checked.heightKm).putString("locator", checked.locator)
            .putBoolean("approximate", checked.approximate).apply()
        // Same keys SatelliteActivity reads, so passes use the profile position without asking again.
        if (checked.observer() != null) {
            context.getSharedPreferences("satellite-observer", Context.MODE_PRIVATE).edit()
                .putString("latitude", checked.latitude).putString("longitude", checked.longitude)
                .putString("height", checked.heightKm).apply()
        }
        radio.rig?.let {
            context.getSharedPreferences(RigActivity.PREFERENCES, Context.MODE_PRIVATE).edit()
                .putString("model", it.name).putInt("baud", checked.baud).putString("address", checked.civAddress).apply()
        }
        if (checked.transport == CatTransport.NETWORK) {
            context.getSharedPreferences(Rt950Safety.PREFERENCES, Context.MODE_PRIVATE).edit()
                .putString("host", checked.host.trim()).putString("port", checked.port.trim()).apply()
        }
    }

    fun usbDevice(context: Context): UsbIdentity? {
        val p = prefs(context)
        if (!p.contains("usb_vid")) return null
        return UsbIdentity(p.getInt("usb_vid", 0), p.getInt("usb_pid", 0), p.getString("usb_serial", null), p.getInt("usb_port", 0))
    }

    fun saveUsbDevice(context: Context, device: UsbIdentity) {
        prefs(context).edit().putInt("usb_vid", device.vendorId).putInt("usb_pid", device.productId)
            .putString("usb_serial", device.serial).putInt("usb_port", device.port).apply()
    }

    fun isConfigured(context: Context) = load(context).let { it.radio != null && it.callsign.isNotEmpty() }

    fun callsign(context: Context) = load(context).callsign

    /** The profile callsign, validated; throws the usual localized error when it is missing or invalid. */
    fun requireCallsign(context: Context): String = Callsign.normalize(callsign(context))

    /** Source address for APRS: the profile callsign plus the optional SSID override kept by the chat. */
    fun aprsCall(context: Context, ssid: String): String {
        val base = callsign(context)
        val suffix = ssid.trim()
        return if (base.isEmpty() || suffix.isEmpty() || suffix == "0") base else "$base-$suffix"
    }

    fun describeCallsign(context: Context): String = callsign(context).let {
        if (it.isEmpty()) context.getString(R.string.profile_callsign_missing)
        else context.getString(R.string.profile_callsign_from_profile, it)
    }

    fun summary(context: Context): String {
        val profile = load(context)
        val radio = profile.radio ?: return context.getString(R.string.profile_summary_empty)
        val connection = profile.transport?.let { context.getString(it.label) } ?: context.getString(R.string.profile_transport_none)
        val text = context.getString(R.string.profile_summary, radio.label(context),
            profile.callsign.ifEmpty { context.getString(R.string.profile_callsign_missing_short) }, connection)
        return if (profile.locator.isEmpty()) text else text + "\n" + context.getString(R.string.profile_summary_locator, profile.locator)
    }

    fun locator(context: Context) = load(context).locator
}
