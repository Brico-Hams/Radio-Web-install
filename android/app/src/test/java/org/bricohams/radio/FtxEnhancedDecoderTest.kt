package org.bricohams.radio

import java.io.File
import java.util.Random
import org.bricohams.digital.CodecRegistry
import org.bricohams.digital.DecodeRequest
import org.bricohams.digital.PcmAudio
import org.bricohams.digital.WorkBudget
import org.bricohams.digital.fec.Crc14
import org.bricohams.digital.fec.Ldpc174
import org.bricohams.digital.fec.Osd174
import org.bricohams.digital.ft2.LegacyFt2CandidateEncoder
import org.bricohams.digital.ftx.ApContext
import org.bricohams.digital.ftx.FtxReceiver
import org.bricohams.digital.ftx.FtxRxProfile
import org.bricohams.digital.ftx.Pack77
import org.junit.Assert.*
import org.junit.Test

/** OSD, a-priori passes, registry and synthetic-signal checks for the FT2 receiver. */
class FtxEnhancedDecoderTest {
    private val ldpc: Ldpc174 by lazy { File("src/main/assets/ftx-ldpc174.json").inputStream().use { Ldpc174.load(it) } }
    private val encoder by lazy { LegacyFt2CandidateEncoder(ldpc) }
    private val budget = WorkBudget { }

    private fun receiver(baseline: Boolean) = FtxReceiver(FtxRxProfile.ft2Candidate(), ldpc).baseline(baseline)

    private fun request(ap: ApContext? = null) = DecodeRequest(0L, 200.0, 3000.0, 40, 40, budget, ap)

    private fun noise(random: Random, sigma: Double) = FloatArray(45000) { (random.nextGaussian() * sigma).toFloat() }

    // The decoder requires samples in [-1,1]; scale down only when the peak exceeds a margin below full scale.
    private fun bounded(samples: FloatArray): FloatArray {
        val peak = samples.maxOf { Math.abs(it) }
        if (peak > 0.95f) { val scale = 0.95f / peak; for (i in samples.indices) samples[i] *= scale }
        return samples
    }

    // Mixes frames into a noise-only slot; snrDb is relative to 2500 Hz and the frame power (0.125).
    private fun slot(random: Random, snrDb: Double, vararg frames: Triple<String, Double, Double>): PcmAudio {
        val sigma = Math.sqrt(0.125 * 6000.0 / 2500.0 / Math.pow(10.0, snrDb / 10.0))
        val samples = noise(random, sigma)
        for ((message, hz, dtSeconds) in frames) {
            val frame = encoder.encode(message, hz).samples
            val offset = Math.round((0.15 + dtSeconds) * 12000).toInt()
            for (i in frame.indices) if (offset + i in samples.indices) samples[offset + i] += frame[i]
        }
        return PcmAudio(12000, bounded(samples))
    }

    private fun codeword(payload: ByteArray): ByteArray = ldpc.encode(Crc14.appendCrc(payload))

    private fun llrs(word: ByteArray, flips: Set<Int>, magnitude: Double) =
        DoubleArray(174) { (if ((word[it].toInt() != 0) != (it in flips)) -magnitude else magnitude) }

    @Test fun osdRecoversWordBeyondWhatHardDecisionsGive() {
        val word = codeword(Pack77.pack("CQ EA1ABC IN80"))
        val osd = Osd174(ldpc)
        val random = Random(7)
        val flips = HashSet<Int>()
        while (flips.size < 8) flips.add(random.nextInt(174))
        // Flipped bits carry low confidence, as noisy symbols do.
        val llr = DoubleArray(174) { i ->
            val sign = if ((word[i].toInt() != 0) != (i in flips)) -1.0 else 1.0
            sign * (if (i in flips) 0.3 else 2.0 + random.nextDouble())
        }
        val result = osd.decode(llr, 2, 28, Double.POSITIVE_INFINITY, budget)
        assertNotNull(result)
        assertArrayEquals(word, result!!.word)
    }

    @Test fun osdRejectsWrongCodewordsByCrc() {
        val osd = Osd174(ldpc)
        val random = Random(11)
        var accepted = 0
        repeat(40) {
            val llr = DoubleArray(174) { random.nextGaussian() }
            val result = osd.decode(llr, 2, 28, Double.POSITIVE_INFINITY, budget)
            if (result != null) {
                accepted++
                assertTrue(ldpc.checksPass(result.word))
            }
        }
        assertEquals("false decodes on random LLRs", 0, accepted)
    }

    @Test fun apPatternsFixTheExpectedBits() {
        val ap = ApContext("EA1ABC", "K1ABC")
        val tags = ap.patterns().map { it.tag }
        assertEquals(listOf("a1", "a2", "a3"), tags)
        val byTag = ap.patterns().associateBy { it.tag }
        assertEquals(32, byTag.getValue("a1").knownCount())
        assertEquals(32, byTag.getValue("a2").knownCount())
        assertEquals(61, byTag.getValue("a3").knownCount())
        val message = Pack77.pack("EA1ABC K1ABC R-10")
        val a3 = byTag.getValue("a3")
        for (i in 0 until 77) if (a3.known[i]) assertEquals("bit $i", message[i], a3.value[i])
        assertEquals(listOf("a1"), ApContext(null, null).patterns().map { it.tag })
    }

    @Test fun registryExposesFt2AsBeta() {
        assertTrue(CodecRegistry().availableProfiles().isEmpty())
        val registry = CodecRegistry(ldpc)
        assertEquals(setOf(CodecRegistry.FT2_PROFILE_ID), registry.availableProfiles())
        assertEquals("beta", CodecRegistry.FT2_LABEL)
        val codec = registry.require(CodecRegistry.FT2_PROFILE_ID)
        val audio = codec.encode("CQ EA1ABC IN80", 1200.0)
        val padded = FloatArray(45000)
        audio.samples.copyInto(padded, 1800)
        val found = codec.decode(PcmAudio(12000, padded), request())
        assertTrue(found.any { it.text == "CQ EA1ABC IN80" })
    }

    @Test fun ft2SlotStartsAfterShortLead() {
        val slot = FtxCodecs { ldpc }.slotAudio(FtxMode.FT2, "CQ EA1ABC IN80", 1500.0)
        val lead = FtxMode.FT2.leadMs * 12000 / 1000
        assertEquals(150L, FtxMode.FT2.leadMs)
        assertTrue(slot.samples.take(lead.toInt()).all { it == 0f })
        assertTrue(slot.samples.drop(lead.toInt()).any { it != 0f })
    }

    @Test fun cleanSignalDecodesWithDtAndFrequencyOffsets() {
        val random = Random(3)
        val enhanced = receiver(false)
        repeat(3) {
            val hz = 600.0 + random.nextInt(1800)
            val dt = random.nextDouble() * 0.6 - 0.3
            val found = enhanced.decode(slot(random, -5.0, Triple("CQ EA1ABC IN80", hz, dt)), request())
            val hit = found.firstOrNull { it.text == "CQ EA1ABC IN80" }
            assertNotNull(hit)
            assertEquals(hz, hit!!.audioHz, 3.0)
            assertEquals(dt, hit.timeOffsetSeconds, 0.05)
        }
    }

    @Test fun twoOverlappingSignalsBothDecode() {
        val random = Random(5)
        val found = receiver(false).decode(
            slot(random, -5.0, Triple("CQ EA1ABC IN80", 1000.0, 0.0), Triple("CQ K1ABC FN42", 1030.0, 0.1)), request())
        val texts = found.map { it.text }
        assertTrue(texts.toString(), "CQ EA1ABC IN80" in texts)
        assertTrue(texts.toString(), "CQ K1ABC FN42" in texts)
    }

    @Test fun weakSignalsDecodeAtLeastAsOftenAsBaseline() {
        val random = Random(9)
        val enhanced = receiver(false)
        val baseline = receiver(true)
        var enhancedCount = 0
        var baselineCount = 0
        repeat(5) {
            val audio = slot(random, -14.0, Triple("CQ EA1ABC IN80", 800.0 + random.nextInt(1500), random.nextDouble() * 0.4 - 0.2))
            if (enhanced.decode(audio, request()).any { it.text == "CQ EA1ABC IN80" }) enhancedCount++
            if (baseline.decode(audio, request()).any { it.text == "CQ EA1ABC IN80" }) baselineCount++
        }
        assertTrue("enhanced $enhancedCount < baseline $baselineCount", enhancedCount >= baselineCount)
    }

    @Test fun pureNoiseNeverDecodes() {
        val random = Random(13)
        val ap = ApContext("EA1ABC", "K1ABC")
        val enhanced = receiver(false)
        repeat(8) {
            val audio = PcmAudio(12000, bounded(noise(random, 0.3)))
            assertTrue(enhanced.decode(audio, request()).isEmpty())
            assertTrue(enhanced.decode(audio, request(ap)).isEmpty())
        }
    }

    @Test fun apTagsAppearOnlyWhenTheCallsMatch() {
        val random = Random(17)
        val message = "EA1ABC K1ABC R-10"
        val audio = slot(random, -12.0, Triple(message, 1400.0, 0.05))
        val matching = receiver(false).decode(audio, request(ApContext("EA1ABC", "K1ABC")))
        for (hit in matching) {
            if (hit.apTag != null) assertEquals(message, hit.text)
        }
        val other = receiver(false).decode(audio, request(ApContext("W9XYZ", "N0ABC")))
        assertTrue(other.none { it.apTag != null })
    }
}
