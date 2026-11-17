package org.bricohams.radio

import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.roundToInt

/** Builds an RFC 5545 calendar of predicted passes. It never contains the observer position. */
object PassCalendar {
    private val stamp = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'", Locale.ROOT).withZone(ZoneOffset.UTC)

    fun ics(passes: List<PassTrack>, now: Long): String {
        require(passes.isNotEmpty()) { "Calendario: no hay pases." }
        val lines = ArrayList<String>()
        lines.add("BEGIN:VCALENDAR")
        lines.add("VERSION:2.0")
        lines.add("PRODID:-//Bricohams//RadiCodex//ES")
        lines.add("CALSCALE:GREGORIAN")
        for (item in passes) {
            val pass = item.plan.pass
            val name = item.plan.tle.name
            val description = buildString {
                append("NORAD ").append(item.plan.tle.norad)
                append(String.format(Locale.ROOT, "\nAOS az %.0f°", pass.aos.azimuth))
                append(String.format(Locale.ROOT, "\nMax el %.0f°", pass.maximum.elevation))
                append(String.format(Locale.ROOT, "\nLOS az %.0f°", pass.los.azimuth))
                if (item.plan.downlinkHz > 0) append(String.format(Locale.ROOT, "\nDownlink %.4f MHz", item.plan.downlinkHz / 1e6))
            }
            lines.add("BEGIN:VEVENT")
            lines.add("UID:${item.plan.tle.norad}-${pass.aos.time}@radicodex")
            lines.add("DTSTAMP:" + stamp.format(Instant.ofEpochMilli(now)))
            lines.add("DTSTART:" + stamp.format(Instant.ofEpochMilli(pass.aos.time)))
            lines.add("DTEND:" + stamp.format(Instant.ofEpochMilli(pass.los.time)))
            lines.add("SUMMARY:" + escape("$name max ${pass.maximum.elevation.roundToInt()}°"))
            lines.add("DESCRIPTION:" + escape(description))
            lines.add("END:VEVENT")
        }
        lines.add("END:VCALENDAR")
        return lines.joinToString("") { fold(it) + "\r\n" }
    }

    private fun escape(text: String) = text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
        .replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\\n")

    /** Folds at 75 octets per line, never inside a multibyte character; continuation lines start with one space. */
    private fun fold(line: String): String {
        val out = StringBuilder()
        var octets = 0
        var index = 0
        while (index < line.length) {
            val point = line.codePointAt(index)
            val size = String(Character.toChars(point)).toByteArray(Charsets.UTF_8).size
            if (octets + size > 75) {
                out.append("\r\n ")
                octets = 1
            }
            out.appendCodePoint(point)
            octets += size
            index += Character.charCount(point)
        }
        return out.toString()
    }
}
