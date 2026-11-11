package org.bricohams.radio

enum class ChatStatus(val label: Int, val doc: String) {
    VERIFIED(R.string.aprs_status_verified, "verificado en radio"),
    PENDING_RADIO_TEST(R.string.aprs_status_pending, "pendiente de prueba en radio"),
    UNSUPPORTED(R.string.aprs_status_unsupported, "no soportado")
}

enum class ChatPath(val label: Int) {
    BLE_KISS(R.string.aprs_path_ble_kiss),
    TCP_KISS(R.string.aprs_path_tcp_kiss),
    CAT_ONLY(R.string.aprs_path_cat_only),
    CLONE_ONLY(R.string.aprs_path_clone_only),
    TX_BEACON_ONLY(R.string.aprs_path_tx_beacon_only)
}

/** Links the APRS chat can open; only radios with one of these appear as chat sources. */
enum class ChatLink(val label: Int) {
    RT950_BLE(R.string.aprs_chat_link_rt950),
    KISS_TCP(R.string.aprs_chat_link_tcp)
}

/** [verification] must name the recorded real-radio test whenever [status] is VERIFIED. */
data class ChatRadio(
    val name: String,
    val path: ChatPath,
    val status: ChatStatus,
    val source: String,
    val link: ChatLink? = null,
    val verification: String? = null
) {
    init {
        require(status != ChatStatus.VERIFIED || !verification.isNullOrBlank()) { "VERIFIED needs a recorded verification: $name" }
        require(link == null || status != ChatStatus.UNSUPPORTED) { "UNSUPPORTED cannot be a chat source: $name" }
    }
}

/** Mirror of docs/APRS-CHAT-RADIOS.md. Nothing is simulated: a radio without APRS/KISS reachable from the app is not a chat source. */
object AprsChatRadios {
    private const val RT950_RES = "android/app/src/main/res/values/strings_rt950.xml:57"
    private const val RT950_BLE = "Rt950Ble.kt:23-27; ACKNOWLEDGEMENTS.md:34"

    val ALL = listOf(
        // The app string calls RX verified, but no real-radio test of this build is recorded yet: pending until one is logged.
        ChatRadio("Radtel RT-950 Pro (recepción)", ChatPath.BLE_KISS, ChatStatus.PENDING_RADIO_TEST, "$RT950_RES; $RT950_BLE", ChatLink.RT950_BLE),
        ChatRadio("Radtel RT-950 Pro (transmisión RF)", ChatPath.BLE_KISS, ChatStatus.PENDING_RADIO_TEST,
            "$RT950_RES (TX inferida); lalmonte/radiochat-aprs@9c7b092; erkanz/radtel-RT950PRO@51c84d4", ChatLink.RT950_BLE),
        ChatRadio("Cualquier radio + TNC KISS externo (Direwolf, puente TNC)", ChatPath.TCP_KISS, ChatStatus.PENDING_RADIO_TEST,
            "KissLink.kt (TcpKissLink)", ChatLink.KISS_TCP),
        ChatRadio("Quansheng UV-K5 / BricoHams Satellite", ChatPath.CLONE_ONLY, ChatStatus.UNSUPPORTED, "Diagnostics.kt:12"),
        ChatRadio("Quansheng UV-K10 Pro", ChatPath.CLONE_ONLY, ChatStatus.UNSUPPORTED,
            "docs/UV-K10-PRO-VIABILIDAD.md:7,55 (APRS solo como plan, sin firmware)"),
        ChatRadio("Quansheng TK-11", ChatPath.CLONE_ONLY, ChatStatus.UNSUPPORTED, "docs/TK11-INGENIERIA.md (sin APRS/KISS)"),
        ChatRadio("OpenGD77 (GD-77, DM-1801, RD-5R, MD-UV380, DM-1701, MD-9600, DM-32, UV008 ...)", ChatPath.TX_BEACON_ONLY,
            ChatStatus.UNSUPPORTED, "OpenGd77.kt:25-38; docs/AYUDA-OPENGD77.md:384-386"),
        ChatRadio("AnyTone D878 (solo plantilla de canales)", ChatPath.CLONE_ONLY, ChatStatus.UNSUPPORTED,
            "ChannelTemplates.kt:39,265; docs/AYUDA-ANYTONE.md"),
        ChatRadio("Yaesu FT-817/818/857/897", ChatPath.CAT_ONLY, ChatStatus.UNSUPPORTED, "RigCat.kt:15-18"),
        ChatRadio("Yaesu FTX-1", ChatPath.CAT_ONLY, ChatStatus.UNSUPPORTED, "RigCat.kt:21; Diagnostics.kt:13"),
        ChatRadio("Icom IC-705 (CI-V)", ChatPath.CAT_ONLY, ChatStatus.UNSUPPORTED, "RigCat.kt:19"),
        ChatRadio("(tr)uSDX, QRP Labs QMX/QMX+ y QDX/QDX-M", ChatPath.CAT_ONLY, ChatStatus.UNSUPPORTED, "RigCat.kt:23-26")
    )

    val chatSources get() = ALL.filter { it.link != null }
}
