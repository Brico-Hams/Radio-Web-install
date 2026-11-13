package org.bricohams.radio

import java.util.Locale

/** Pure text for the spoken / TalkBack announcement of the rig state and for the S-meter bar. */
object RigSpeech {
    const val MIN_GAP_MS = 2_000L
    const val SIGNAL_MAX = 255

    /** e.g. "145,800 megahercios, FM, señal 120": frequency in MHz with the locale's decimal mark, then mode and S-meter when known. */
    fun text(hz: Long, mode: String?, signal: Int?, locale: Locale, megahertzWord: String, signalWord: String): String {
        val parts = ArrayList<String>()
        parts.add(String.format(locale, "%.3f", hz / 1e6) + " " + megahertzWord)
        if (!mode.isNullOrBlank()) parts.add(mode)
        if (signal != null) parts.add("$signalWord $signal")
        return parts.joinToString(", ")
    }

    /** Simple bar of [width] cells for a raw 0-255 S-meter value. */
    fun bar(signal: Int, width: Int = 10): String {
        val filled = (signal.coerceIn(0, SIGNAL_MAX) * width + SIGNAL_MAX / 2) / SIGNAL_MAX
        return "#".repeat(filled) + "-".repeat(width - filled)
    }
}
