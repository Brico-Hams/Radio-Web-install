package org.bricohams.radio

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

/** Header found in the audio: [code] has valid even parity; [mode] is null for codes outside [SstvModes.ALL]. */
data class SstvVis(val code: Int, val mode: SstvMode?, val offsetHz: Double, val endSeconds: Double)

/**
 * Multi-mode SSTV engine. The decoder resamples to [WORK_RATE], demodulates the instantaneous frequency,
 * detects the VIS (estimating the tone offset from the 1900 Hz leader), tracks the line syncs, fits them with a
 * linear regression to correct clock drift and resamples every line from the fitted position.
 */
object Sstv {
    const val WORK_RATE = 16000
    const val MIN_RATE = 8000
    const val MAX_RATE = 96000
    const val MAX_TONE_OFFSET_HZ = 100.0
    const val MAX_WAV_BYTES = 24 * 1024 * 1024
    const val MAX_SECONDS = 200
    private const val PER_MS = WORK_RATE / 1000
    private const val CENTER_HZ = 1700.0
    private const val MIX_PERIOD = 160
    private const val HALF = 31
    private const val MIN_POWER = 1e-7
    private const val AMPLITUDE = 23000.0
    private const val LEAD_MS = 100.0
    private const val HEADER_MS = 910.0
    private const val TAIL_MS = 300.0
    private const val SYNC_HZ = 1200.0
    private const val VIS_ONE_HZ = 1100.0
    private const val VIS_ZERO_HZ = 1300.0
    private const val LEADER_HZ = 1900.0

    private val MIX_COS = FloatArray(MIX_PERIOD) { cos(2 * PI * it * CENTER_HZ / WORK_RATE).toFloat() }
    private val MIX_SIN = FloatArray(MIX_PERIOD) { sin(2 * PI * it * CENTER_HZ / WORK_RATE).toFloat() }
    /** Half of the symmetric low-pass applied to the complex baseband (cutoff 1.1 kHz, Hamming). */
    private val TAPS = DoubleArray(HALF + 1).also { taps ->
        val cutoff = 1100.0 / WORK_RATE
        var sum = 0.0
        for (k in 0..HALF) {
            val sinc = if (k == 0) 2 * cutoff else sin(2 * PI * cutoff * k) / (PI * k)
            taps[k] = sinc * (0.54 + 0.46 * cos(PI * k / (HALF + 1)))
            sum += if (k == 0) taps[k] else 2 * taps[k]
        }
        for (k in 0..HALF) taps[k] /= sum
    }

    /** Total transmit time of [encode], in seconds. */
    fun durationSeconds(mode: SstvMode): Double = (LEAD_MS + HEADER_MS + mode.lines * mode.lineMs + TAIL_MS) / 1000

    private fun interrupted() = Thread.currentThread().isInterrupted
    private fun cancelled() = LocalizedInterruptedIOException(UiText(R.string.err_sstv_cancelled))

    // ---------------------------------------------------------------- decoder

    /** Detects the first valid VIS header in [audio] without decoding the image; null when there is none. */
    fun detectVis(audio: PcmAudio): SstvVis? {
        val bins = binsOf(audio)
        val vis = findVis(bins, 0) ?: return null
        return SstvVis(vis.code, SstvModes.byVis(vis.code), vis.offset, (vis.bin + 300) / 1000.0)
    }

    /**
     * Decodes the first SSTV image in [audio] (any sample rate in [MIN_RATE]..[MAX_RATE]). A partial reception
     * returns what was decoded with the missing rows in [SstvImage.lostRows]. [progress] receives
     * (mode, rows decoded, total rows) every few lines.
     */
    fun decode(audio: PcmAudio, progress: ((SstvMode, Int, Int) -> Unit)? = null): SstvImage {
        requireUi(audio.sampleRate in MIN_RATE..MAX_RATE) { UiText(R.string.err_sstv_rate, audio.sampleRate) }
        val frequency = demodulate(resample(audio.samples, audio.sampleRate, WORK_RATE))
        val bins = medianBins(frequency)
        var from = 0
        var unknown = -1
        var vis: Vis? = null
        var mode: SstvMode? = null
        while (mode == null) {
            val candidate = findVis(bins, from) ?: break
            val known = SstvModes.byVis(candidate.code)
            if (known != null) { vis = candidate; mode = known } else { unknown = candidate.code; from = candidate.bin + 300 }
        }
        if (vis == null || mode == null) {
            if (unknown >= 0) throw LocalizedArgumentException(UiText(R.string.err_sstv_unknown_vis, unknown))
            throw LocalizedArgumentException(UiText(R.string.err_robot36_no_header))
        }
        return decodeImage(frequency, vis, mode, progress)
    }

    private class Vis(val bin: Int, val code: Int, val offset: Double)
    private class Observation(val line: Int, val time: Double, val real: Boolean = true)
    private class Fit(val intercept: Double, val slope: Double) { fun at(line: Int) = intercept + slope * line }

    private fun binsOf(audio: PcmAudio): FloatArray {
        requireUi(audio.sampleRate in MIN_RATE..MAX_RATE) { UiText(R.string.err_sstv_rate, audio.sampleRate) }
        return medianBins(demodulate(resample(audio.samples, audio.sampleRate, WORK_RATE)))
    }

    private fun decodeImage(f: FloatArray, vis: Vis, mode: SstvMode, progress: ((SstvMode, Int, Int) -> Unit)?): SstvImage {
        val offset = vis.offset
        val nominal = mode.lineMs * PER_MS
        val before = max(3 * PER_MS, (0.8 * mode.syncMs * PER_MS).toInt())
        val after = 3 * PER_MS
        val window = max(3.0 * PER_MS, 0.03 * nominal).toInt()
        val visEnd = (vis.bin + 300) * PER_MS
        val edge = findEdge(f, visEnd - 25 * PER_MS, visEnd + ((mode.syncMs + 40) * PER_MS).toInt(), before, after, offset)
        requireUi(edge >= 0) { UiText(R.string.err_robot36_align) }

        val observations = ArrayList<Observation>()
        var first = edge - 1.0
        if (mode.firstLeadMs > 0) {
            val predicted = first + mode.firstLeadMs * PER_MS
            val centre = (predicted + 1).roundToInt()
            val refined = findEdge(f, centre - window, centre + window, before, after, offset)
            if (refined >= 0) { first = refined - 1.0; observations.add(Observation(0, first)) } else first = predicted
        } else observations.add(Observation(0, first))
        if (observations.isEmpty()) observations.add(Observation(0, first, false))

        // Pass 1: follow the syncs line by line, predicting each position from the recent regression.
        val lines = mode.lines
        for (line in 1 until lines) {
            if (interrupted()) throw cancelled()
            val centre = (predict(observations, line, nominal) + 1).roundToInt()
            val found = findEdge(f, centre - window, centre + window, before, after, offset)
            if (found >= 0) observations.add(Observation(line, found - 1.0))
        }

        // Pass 2: robust global fit, then a local fit per line to follow slow clock changes.
        val usable = ArrayList<Observation>(observations.filter { it.real })
        val keep = BooleanArray(usable.size) { true }
        var global = if (usable.isEmpty()) null else ols(usable)
        repeat(2) {
            val current = global ?: return@repeat
            var sum = 0.0
            var count = 0
            for ((i, o) in usable.withIndex()) if (keep[i]) { val r = o.time - current.at(o.line); sum += r * r; count++ }
            val limit = max(3 * sqrt(sum / max(count, 1)), 4.0)
            for ((i, o) in usable.withIndex()) keep[i] = abs(o.time - current.at(o.line)) <= limit
            global = ols(usable.filterIndexed { i, _ -> keep[i] }) ?: current
        }
        val good = usable.filterIndexed { i, _ -> keep[i] }
        val synced = BooleanArray(lines)
        for (o in good) synced[o.line] = true
        val fallback = Fit(first, nominal)
        fun fitFor(line: Int): Fit {
            val near = good.filter { abs(it.line - line) <= 24 }
            if (near.size >= 8 && near.last().line - near.first().line >= 12) {
                val local = ols(near)
                if (local != null && abs(local.slope / nominal - 1) <= 0.01) return local
            }
            return global ?: fallback
        }

        val rowsPerLine = mode.height / lines
        val data = arrayOfNulls<Array<FloatArray>>(lines)
        for (line in 0 until lines) {
            if (interrupted()) throw cancelled()
            val fit = fitFor(line)
            val scale = fit.slope / nominal
            val end = fit.at(line)
            val channels = Array(mode.channels) { FloatArray(0) }
            var complete = true
            for (scan in mode.scans) {
                val out = FloatArray(scan.pixels)
                val step = scale * scan.durationMs * PER_MS / scan.pixels
                val known = readScan(f, end + scale * scan.offsetMs * PER_MS, step, scan.pixels, offset, out)
                if (known * 2 < scan.pixels) complete = false
                channels[scan.channel] = out
            }
            // Every scan needs signal: a line cut after its first scan (header-only audio) is not an image line.
            if (complete) data[line] = channels
            if (progress != null && (line % 8 == 7 || line == lines - 1)) {
                progress(mode, data.take(line + 1).count { it != null } * rowsPerLine, mode.height)
            }
        }
        val decodedLines = data.count { it != null }
        requireUi(decodedLines > 0) { UiText(R.string.err_robot36_truncated) }

        val image = assemble(mode, data)
        val lost = BooleanArray(mode.height) { row ->
            val line = row / rowsPerLine
            data[line] == null || !synced[line]
        }
        val startFit = fitFor(0)
        val start = startFit.at(0) - (mode.syncStartMs + mode.syncMs) * PER_MS * startFit.slope / nominal
        val lostCount = lost.count { it }
        val warning = if (lostCount == 0) UiText(R.string.robot36_warning, mode.name, mode.width, mode.height)
        else UiText(R.string.sstv_warning_lost, mode.name, lostCount, mode.height)
        return SstvImage(image, start / WORK_RATE, warning, mode.width, mode.height, mode, lost, decodedLines * rowsPerLine)
    }

    private fun predict(observations: List<Observation>, line: Int, nominal: Double): Double {
        val recent = if (observations.size > 16) observations.subList(observations.size - 16, observations.size) else observations
        val fit = if (recent.size >= 4 && recent.last().line - recent.first().line >= 3) ols(recent) else null
        if (fit != null && abs(fit.slope / nominal - 1) <= 0.01) return fit.at(line)
        val last = observations.last()
        return last.time + (line - last.line) * nominal
    }

    private fun ols(list: List<Observation>): Fit? {
        if (list.size < 2) return null
        val meanLine = list.sumOf { it.line.toDouble() } / list.size
        val meanTime = list.sumOf { it.time } / list.size
        var sxx = 0.0
        var sxy = 0.0
        for (o in list) {
            val dl = o.line - meanLine
            sxx += dl * dl
            sxy += dl * (o.time - meanTime)
        }
        if (sxx < 1e-9) return null
        val slope = sxy / sxx
        return Fit(meanTime - slope * meanLine, slope)
    }

    /**
     * Rising edge at the end of a 1200 Hz sync pulse: the index t in [lo], [hi] maximizing mean(after) - mean(before),
     * with the pulse tone before it. The edge lies between samples t-1 and t, i.e. at time t - 1.
     */
    private fun findEdge(f: FloatArray, lo: Int, hi: Int, before: Int, after: Int, offset: Double): Int {
        val from = max(0, lo - before)
        val to = min(f.size, hi + after)
        if (to - from < before + after + 1) return -1
        val sum = DoubleArray(to - from + 1)
        val count = IntArray(to - from + 1)
        for (i in from until to) {
            val v = f[i]
            val ok = !v.isNaN()
            sum[i - from + 1] = sum[i - from] + if (ok) v.toDouble() else 0.0
            count[i - from + 1] = count[i - from] + if (ok) 1 else 0
        }
        var best = -1
        var bestScore = 0.0
        for (t in max(lo, from + before)..min(hi, to - after)) {
            val b = t - before - from
            val m = t - from
            val a = t + after - from
            val nb = count[m] - count[b]
            val na = count[a] - count[m]
            if (nb < before / 2 || na < after / 2) continue
            val meanBefore = (sum[m] - sum[b]) / nb - offset
            val meanAfter = (sum[a] - sum[m]) / na - offset
            val score = meanAfter - meanBefore
            if (meanBefore !in 1050.0..1350.0 || score < 150) continue
            // Reject the porch->bright-pixel transition (porch inside the "before" window) that would otherwise
            // out-score the real sync end: the stretch just before the edge must be a pure sync tone.
            val pureEnd = m - 12
            val pureStart = pureEnd - max(before / 3, 8)
            val np = count[pureEnd] - count[pureStart]
            if (np < (pureEnd - pureStart) / 2) continue
            if (abs((sum[pureEnd] - sum[pureStart]) / np - offset - 1200.0) > 80) continue
            if (best < 0 || score > bestScore) { best = t; bestScore = score }
        }
        return best
    }

    /** Pixel levels of one scan sampled from the fitted line position; returns how many pixels had signal. */
    private fun readScan(f: FloatArray, start: Double, step: Double, count: Int, offset: Double, out: FloatArray): Int {
        val taps = max(2, ceil(step).toInt())
        var known = 0
        for (x in 0 until count) {
            val from = start + x * step
            var sum = 0.0
            var n = 0
            for (j in 0 until taps) {
                val v = sampleAt(f, from + (j + 0.5) * step / taps + 0.5)
                if (!v.isNaN()) { sum += v; n++ }
            }
            if (n > 0) {
                known++
                out[x] = ((sum / n - offset - 1500) * 255 / 800).coerceIn(0.0, 255.0).toFloat()
            } else out[x] = Float.NaN
        }
        var carry = Float.NaN
        for (x in 0 until count) if (!out[x].isNaN()) carry = out[x] else if (!carry.isNaN()) out[x] = carry
        var next = Float.NaN
        for (x in count - 1 downTo 0) if (!out[x].isNaN()) next = out[x] else out[x] = if (next.isNaN()) 0f else next
        return known
    }

    /** Frequency at fractional index [position] (frequency[n] describes time n - 0.5). */
    private fun sampleAt(f: FloatArray, position: Double): Float {
        val i = floor(position).toInt()
        if (i < 0 || i + 1 >= f.size) return Float.NaN
        val a = f[i]
        val b = f[i + 1]
        return when {
            a.isNaN() -> b
            b.isNaN() -> a
            else -> a + (b - a) * (position - i).toFloat()
        }
    }

    private fun assemble(mode: SstvMode, data: Array<Array<FloatArray>?>): IntArray {
        val width = mode.width
        val pixels = IntArray(width * mode.height) { 0xff000000.toInt() }
        fun byte(value: Double) = value.roundToInt().coerceIn(0, 255)
        fun put(row: Int, y: FloatArray, cr: FloatArray?, cb: FloatArray?) {
            for (x in 0 until width) {
                val luma = y[x * y.size / width].toDouble()
                val red = if (cr == null) 0.0 else cr[x * cr.size / width] - 128.0
                val blue = if (cb == null) 0.0 else cb[x * cb.size / width] - 128.0
                pixels[row * width + x] = (255 shl 24) or (byte(luma + 1.402 * red) shl 16) or
                    (byte(luma - 0.344136 * blue - 0.714136 * red) shl 8) or byte(luma + 1.772 * blue)
            }
        }
        when (mode.layout) {
            SstvLayout.RGB -> for (line in 0 until mode.lines) {
                val d = data[line] ?: continue
                for (x in 0 until width) {
                    pixels[line * width + x] = (255 shl 24) or (byte(d[0][x].toDouble()) shl 16) or
                        (byte(d[1][x].toDouble()) shl 8) or byte(d[2][x].toDouble())
                }
            }
            SstvLayout.ROBOT36 -> for (pair in 0 until mode.height / 2) {
                val even = data[2 * pair]
                val odd = data[2 * pair + 1]
                even?.let { put(2 * pair, it[0], it[1], odd?.get(1)) }
                odd?.let { put(2 * pair + 1, it[0], even?.get(1), it[1]) }
            }
            SstvLayout.ROBOT72 -> for (line in 0 until mode.lines) data[line]?.let { put(line, it[0], it[1], it[2]) }
            SstvLayout.PD -> for (line in 0 until mode.lines) data[line]?.let {
                put(2 * line, it[0], it[1], it[2])
                put(2 * line + 1, it[3], it[1], it[2])
            }
        }
        return pixels
    }

    // ---------------------------------------------------------------- DSP

    /** Windowed-sinc resampler with the low-pass at 0.45 of the lower Nyquist rate; works for any ratio. */
    private fun resample(samples: ShortArray, from: Int, to: Int): FloatArray {
        val size = (samples.size.toLong() * to / from).toInt()
        val out = FloatArray(size)
        if (from == to) {
            for (i in 0 until size) out[i] = samples[i] / 32768f
            return out
        }
        val ratio = from.toDouble() / to
        val cutoff = 0.45 * min(1.0, to.toDouble() / from)
        val half = ceil(5.0 / cutoff).toInt()
        val resolution = 1024
        val kernel = FloatArray(2 * half * resolution + 1) { index ->
            val u = index.toDouble() / resolution - half
            val sinc = if (abs(u) < 1e-9) 2 * cutoff else sin(2 * PI * cutoff * u) / (PI * u)
            val window = 0.42 + 0.5 * cos(PI * u / half) + 0.08 * cos(2 * PI * u / half)
            (sinc * window).toFloat()
        }
        for (n in 0 until size) {
            if (n and 0x3fff == 0 && interrupted()) throw cancelled()
            val t = n * ratio
            val first = floor(t).toInt() - half + 1
            var acc = 0.0
            for (k in max(first, 0)..min(first + 2 * half - 1, samples.size - 1)) {
                acc += samples[k] * kernel[((t - k + half) * resolution + 0.5).toInt()]
            }
            out[n] = (acc / 32768).toFloat()
        }
        return out
    }

    /** Instantaneous frequency (Hz, NaN without signal) via complex baseband at 1.7 kHz; element n describes time n - 0.5. */
    private fun demodulate(x: FloatArray): FloatArray {
        val n = x.size
        val re = FloatArray(n)
        val im = FloatArray(n)
        for (i in 0 until n) {
            val p = i % MIX_PERIOD
            re[i] = x[i] * MIX_COS[p]
            im[i] = -x[i] * MIX_SIN[p]
        }
        val result = FloatArray(n) { Float.NaN }
        var previousRe = 0.0
        var previousIm = 0.0
        var previousPower = 0.0
        for (i in HALF until n - HALF) {
            if (i and 0x1fff == 0 && interrupted()) throw cancelled()
            var a = TAPS[0] * re[i]
            var b = TAPS[0] * im[i]
            for (k in 1..HALF) {
                val tap = TAPS[k]
                a += tap * (re[i - k] + re[i + k])
                b += tap * (im[i - k] + im[i + k])
            }
            val power = a * a + b * b
            if (power > MIN_POWER && previousPower > MIN_POWER) {
                val phase = atan2(b * previousRe - a * previousIm, a * previousRe + b * previousIm)
                result[i] = (CENTER_HZ + phase * WORK_RATE / (2 * PI)).toFloat()
            }
            previousRe = a
            previousIm = b
            previousPower = power
        }
        return result
    }

    /** Median frequency of every millisecond (NaN when mostly silent): cheap, robust base for the VIS search. */
    private fun medianBins(f: FloatArray): FloatArray {
        val count = f.size / PER_MS
        val bins = FloatArray(count)
        val tmp = FloatArray(PER_MS)
        for (bin in 0 until count) {
            var c = 0
            for (i in bin * PER_MS until (bin + 1) * PER_MS) if (!f[i].isNaN()) tmp[c++] = f[i]
            if (c < PER_MS / 2) bins[bin] = Float.NaN else {
                java.util.Arrays.sort(tmp, 0, c)
                bins[bin] = tmp[c / 2]
            }
        }
        return bins
    }

    private fun meanOf(bins: FloatArray, from: Int, until: Int): Double {
        if (from < 0 || until > bins.size || until <= from) return Double.NaN
        var sum = 0.0
        var n = 0
        for (i in from until until) if (!bins[i].isNaN()) { sum += bins[i]; n++ }
        return if (n * 2 < until - from) Double.NaN else sum / n
    }

    /**
     * First header whose leader, start bit, seven data bits, even parity and stop bit agree once every tone is
     * corrected by the offset measured on the 1900 Hz leader. Positions are in milliseconds (bins).
     */
    private fun findVis(bins: FloatArray, from: Int): Vis? {
        var p = max(from, 150)
        while (p + 300 < bins.size) {
            if (p and 0xfff == 0 && interrupted()) throw cancelled()
            val start = meanOf(bins, p + 5, p + 25)
            if (start.isNaN() || start !in 1090.0..1310.0) { p++; continue }
            val leaderFrom = max(0, p - 290)
            val leader = meanOf(bins, leaderFrom, p - 20)
            if (leader.isNaN()) { p++; continue }
            val offset = leader - LEADER_HZ
            if (abs(offset) > MAX_TONE_OFFSET_HZ || abs(start - (SYNC_HZ + offset)) > 60) { p++; continue }
            var steady = 0
            for (i in leaderFrom until p - 20) if (abs(bins[i] - leader) <= 120) steady++
            if (steady < 0.8 * (p - 20 - leaderFrom)) { p++; continue }
            var code = 0
            var ones = 0
            var valid = true
            for (bit in 0..7) {
                val m = meanOf(bins, p + 30 * (bit + 1) + 5, p + 30 * (bit + 1) + 25)
                val one = abs(m - (VIS_ONE_HZ + offset))
                val zero = abs(m - (VIS_ZERO_HZ + offset))
                if (m.isNaN() || min(one, zero) > 70) { valid = false; break }
                if (one < zero) { ones++; if (bit < 7) code = code or (1 shl bit) }
            }
            if (!valid || ones % 2 != 0) { p++; continue }
            val stop = meanOf(bins, p + 275, p + 295)
            if (stop.isNaN() || abs(stop - (SYNC_HZ + offset)) > 70) { p++; continue }
            return Vis(p, code, offset)
        }
        return null
    }

    // ---------------------------------------------------------------- encoder

    /**
     * Audio of [mode] for an ARGB image of the mode's size: 100 ms of silence, VIS header, all lines and 300 ms of
     * silence. [toneOffsetHz] shifts every tone (used to exercise the decoder's offset tolerance).
     */
    fun encode(pixels: IntArray, sampleRate: Int = 48000, mode: SstvMode = SstvModes.ROBOT36, toneOffsetHz: Double = 0.0): ShortArray {
        requireUi(pixels.size == mode.width * mode.height) { UiText(R.string.err_robot36_size, mode.width, mode.height, mode.name) }
        requireUi(sampleRate in MIN_RATE..MAX_RATE) { UiText(R.string.err_robot36_rate) }
        val out = ShortArray(ceil(durationSeconds(mode) * sampleRate).toInt() + 16)
        var written = 0
        var clock = 0.0
        var phase = 0.0
        fun tone(hz: Double, ms: Double) {
            clock += ms * sampleRate / 1000
            val end = min(clock.roundToInt(), out.size)
            val increment = 2 * PI * (hz + toneOffsetHz) / sampleRate
            while (written < end) {
                phase += increment
                if (phase >= 2 * PI) phase -= 2 * PI
                out[written++] = if (hz > 0) (sin(phase) * AMPLITUDE).roundToInt().toShort() else 0
            }
        }
        fun level(value: Double) = 1500 + value.coerceIn(0.0, 255.0) * 800 / 255
        tone(0.0, LEAD_MS)
        tone(LEADER_HZ, 300.0); tone(SYNC_HZ, 10.0); tone(LEADER_HZ, 300.0); tone(SYNC_HZ, 30.0)
        // VIS LSB first (1100 Hz = 1), then even parity and the stop bit.
        for (bit in 0..6) tone(if ((mode.vis shr bit) and 1 == 1) VIS_ONE_HZ else VIS_ZERO_HZ, 30.0)
        tone(if (Integer.bitCount(mode.vis) % 2 == 1) VIS_ONE_HZ else VIS_ZERO_HZ, 30.0)
        tone(SYNC_HZ, 30.0)
        for (line in 0 until mode.lines) {
            for (segment in mode.segments) {
                when {
                    segment.channel >= 0 -> {
                        val values = levels(mode, pixels, line, segment.channel, segment.pixels)
                        for (value in values) tone(level(value), segment.ms / segment.pixels)
                    }
                    segment.hz == SstvSegment.ALT -> tone(if (line % 2 == 0) 1500.0 else 2300.0, segment.ms)
                    else -> tone(segment.hz, segment.ms)
                }
            }
        }
        tone(0.0, TAIL_MS)
        return out.copyOf(written)
    }

    private fun red(p: Int) = (p shr 16) and 255
    private fun green(p: Int) = (p shr 8) and 255
    private fun blue(p: Int) = p and 255
    private fun luma(p: Int) = 0.299 * red(p) + 0.587 * green(p) + 0.114 * blue(p)

    /** Channel values (0..255) of one scan; chroma is averaged over the pixels the decoder shares it with. */
    private fun levels(mode: SstvMode, pixels: IntArray, line: Int, channel: Int, count: Int): DoubleArray {
        val width = mode.width
        val block = width / count
        fun mean(rows: IntRange, x: Int, value: (Int) -> Double): Double {
            var sum = 0.0
            var n = 0
            for (row in rows) for (dx in 0 until block) { sum += value(pixels[row * width + x * block + dx]); n++ }
            return sum / n
        }
        fun lumaOf(row: Int) = DoubleArray(count) { mean(row..row, it, ::luma) }
        fun chromaOf(rows: IntRange, blueDifference: Boolean) = DoubleArray(count) {
            128 + mean(rows, it) { p -> if (blueDifference) (blue(p) - luma(p)) / 1.772 else (red(p) - luma(p)) / 1.402 }
        }
        return when (mode.layout) {
            SstvLayout.RGB -> DoubleArray(count) { x ->
                mean(line..line, x) { p -> (if (channel == 0) red(p) else if (channel == 1) green(p) else blue(p)).toDouble() }
            }
            SstvLayout.ROBOT36 -> if (channel == 0) lumaOf(line) else {
                val first = line - line % 2
                chromaOf(first..first + 1, line % 2 == 1)
            }
            SstvLayout.ROBOT72 -> when (channel) {
                0 -> lumaOf(line)
                1 -> chromaOf(line..line, false)
                else -> chromaOf(line..line, true)
            }
            SstvLayout.PD -> when (channel) {
                0 -> lumaOf(2 * line)
                3 -> lumaOf(2 * line + 1)
                1 -> chromaOf(2 * line..2 * line + 1, false)
                else -> chromaOf(2 * line..2 * line + 1, true)
            }
        }
    }
}
