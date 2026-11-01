package org.bricohams.radio

/** How the scanned channels of a line map to colours. */
enum class SstvLayout {
    /** Channels 0=R, 1=G, 2=B, one image row per line (Martin, Scottie). */
    RGB,
    /** Channel 0=Y, 1=alternating Cr (even lines) / Cb (odd lines) at half width; rows share chroma in pairs. */
    ROBOT36,
    /** Channels 0=Y, 1=Cr, 2=Cb with half-width chroma, one image row per line. */
    ROBOT72,
    /** Channels 0=Y (even row), 1=Cr, 2=Cb, 3=Y (odd row); one line carries two image rows. */
    PD
}

/**
 * One timed element of a line: a fixed tone of [hz], the Robot36 alternating separator ([ALT]),
 * or a scan of [pixels] pixels of [channel] (then [hz] is unused).
 */
data class SstvSegment(val hz: Double, val ms: Double, val channel: Int = -1, val pixels: Int = 0) {
    companion object { const val ALT = -1.0 }
}

/** A channel scan with its start relative to the end of the line's sync pulse (negative if before it). */
data class SstvScan(val channel: Int, val offsetMs: Double, val durationMs: Double, val pixels: Int)

/**
 * Timing table entry shared by the decoder and the encoder. [segments] lists a whole line in transmit order,
 * [syncIndex] being the 1200 Hz sync pulse used for line tracking (it is not the first segment in Scottie).
 */
data class SstvMode(
    val name: String,
    val vis: Int,
    val width: Int,
    val height: Int,
    val layout: SstvLayout,
    val segments: List<SstvSegment>,
    val syncIndex: Int
) {
    val syncMs: Double = segments[syncIndex].ms
    val lineMs: Double = segments.sumOf { it.ms }
    /** Lines on the air: PD sends two image rows per line. */
    val lines: Int = if (layout == SstvLayout.PD) height / 2 else height
    /** Offset of the sync pulse start from the start of the first segment. */
    val syncStartMs: Double = segments.take(syncIndex).sumOf { it.ms }
    /** Time from the first data after the VIS to the end of line 0's sync when the sync is not first (Scottie), else 0. */
    val firstLeadMs: Double = if (syncIndex > 0) syncStartMs + syncMs else 0.0
    val scans: List<SstvScan> = run {
        val syncEnd = syncStartMs + syncMs
        var cursor = 0.0
        val result = ArrayList<SstvScan>()
        for (segment in segments) {
            if (segment.channel >= 0) result.add(SstvScan(segment.channel, cursor - syncEnd, segment.ms, segment.pixels))
            cursor += segment.ms
        }
        result
    }
    val channels: Int = scans.maxOf { it.channel } + 1
    val imageSeconds: Double get() = lines * lineMs / 1000
}

object SstvModes {
    private const val SYNC = 1200.0
    private const val PORCH = 1500.0
    private const val SEPARATOR_PORCH = 1900.0
    private const val ODD_SEPARATOR = 2300.0
    private fun tone(hz: Double, ms: Double) = SstvSegment(hz, ms)
    private fun scan(channel: Int, ms: Double, pixels: Int) = SstvSegment(0.0, ms, channel, pixels)

    private fun martin(name: String, vis: Int, scanMs: Double) = SstvMode(name, vis, 320, 256, SstvLayout.RGB,
        listOf(tone(SYNC, 4.862), tone(PORCH, 0.572),
            scan(1, scanMs, 320), tone(PORCH, 0.572), scan(2, scanMs, 320), tone(PORCH, 0.572),
            scan(0, scanMs, 320), tone(PORCH, 0.572)), 0)

    private fun scottie(name: String, vis: Int, scanMs: Double) = SstvMode(name, vis, 320, 256, SstvLayout.RGB,
        listOf(tone(PORCH, 1.5), scan(1, scanMs, 320), tone(PORCH, 1.5), scan(2, scanMs, 320),
            tone(SYNC, 9.0), tone(PORCH, 1.5), scan(0, scanMs, 320)), 4)

    private fun pd(name: String, vis: Int, width: Int, height: Int, scanMs: Double) =
        SstvMode(name, vis, width, height, SstvLayout.PD,
            listOf(tone(SYNC, 20.0), tone(PORCH, 2.08), scan(0, scanMs, width), scan(1, scanMs, width),
                scan(2, scanMs, width), scan(3, scanMs, width)), 0)

    val ROBOT36 = SstvMode("Robot36", 8, 320, 240, SstvLayout.ROBOT36,
        listOf(tone(SYNC, 9.0), tone(PORCH, 3.0), scan(0, 88.0, 320), tone(SstvSegment.ALT, 4.5),
            tone(SEPARATOR_PORCH, 1.5), scan(1, 44.0, 160)), 0)
    val ROBOT72 = SstvMode("Robot72", 12, 320, 240, SstvLayout.ROBOT72,
        listOf(tone(SYNC, 9.0), tone(PORCH, 3.0), scan(0, 138.0, 320), tone(PORCH, 4.5), tone(SEPARATOR_PORCH, 1.5),
            scan(1, 69.0, 160), tone(ODD_SEPARATOR, 4.5), tone(SEPARATOR_PORCH, 1.5), scan(2, 69.0, 160)), 0)
    val MARTIN_M1 = martin("Martin M1", 44, 146.432)
    val MARTIN_M2 = martin("Martin M2", 40, 73.216)
    val SCOTTIE_S1 = scottie("Scottie S1", 60, 138.24)
    val SCOTTIE_S2 = scottie("Scottie S2", 56, 88.064)
    val PD90 = pd("PD90", 99, 320, 256, 170.24)
    val PD120 = pd("PD120", 95, 640, 496, 121.6)
    val PD180 = pd("PD180", 96, 640, 496, 183.04)

    val ALL: List<SstvMode> = listOf(ROBOT36, ROBOT72, MARTIN_M1, MARTIN_M2, SCOTTIE_S1, SCOTTIE_S2, PD90, PD120, PD180)

    fun byVis(code: Int): SstvMode? = ALL.firstOrNull { it.vis == code }
}

/**
 * Decoded picture. Rows in [lostRows] had no line sync or no signal: they are black when nothing was received
 * and best-effort pixels when only the sync was missed. [decodedRows] counts rows with received data.
 */
data class SstvImage(
    val pixels: IntArray,
    val startSeconds: Double,
    val warning: UiText,
    val width: Int,
    val height: Int,
    val mode: SstvMode,
    val lostRows: BooleanArray,
    val decodedRows: Int
) {
    val lostCount: Int get() = lostRows.count { it }
    val complete: Boolean get() = lostCount == 0
}
