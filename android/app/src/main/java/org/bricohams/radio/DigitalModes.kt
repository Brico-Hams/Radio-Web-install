package org.bricohams.radio

enum class DigitalMode(val label: String, val periodsMs: List<Long>, val defaultPeriodMs: Long, val purpose: Int) {
    FT8("FT8", listOf(15_000L), 15_000L, R.string.rig_dig_purpose_ft8),
    FT4("FT4", listOf(7_500L), 7_500L, R.string.rig_dig_purpose_ft4),
    // JS8Call speeds: slow, normal, fast, turbo.
    JS8("JS8", listOf(30_000L, 15_000L, 10_000L, 6_000L), 15_000L, R.string.rig_dig_purpose_js8),
    WSPR("WSPR", listOf(120_000L), 120_000L, R.string.rig_dig_purpose_wspr),
    Q65("Q65", listOf(15_000L, 30_000L, 60_000L, 120_000L, 300_000L), 60_000L, R.string.rig_dig_purpose_q65),
    JT65("JT65", listOf(60_000L), 60_000L, R.string.rig_dig_purpose_jt65),
    JT9("JT9", listOf(60_000L), 60_000L, R.string.rig_dig_purpose_jt9),
    FST4("FST4", listOf(60_000L, 120_000L, 300_000L, 900_000L, 1_800_000L), 60_000L, R.string.rig_dig_purpose_fst4),
    FST4W("FST4W", listOf(120_000L, 300_000L, 900_000L, 1_800_000L), 120_000L, R.string.rig_dig_purpose_fst4w)
}

object DigitalFrequencies {
    // Community dial frequencies (IARU band plans / common practice); verify locally, editable by the user.
    val table: Map<DigitalMode, List<Long>> = mapOf(
        DigitalMode.FT8 to listOf(1840000L, 3573000L, 5357000L, 7074000L, 10136000L, 14074000L, 18100000L, 21074000L,
            24915000L, 28074000L, 50313000L, 144174000L),
        DigitalMode.FT4 to listOf(3575000L, 7047500L, 10140000L, 14080000L, 18104000L, 21140000L, 24919000L, 28180000L,
            50318000L, 144170000L),
        DigitalMode.JS8 to listOf(1842000L, 3578000L, 7078000L, 10130000L, 14078000L, 18104000L, 21078000L, 24922000L,
            28078000L, 50318000L, 144178000L),
        DigitalMode.WSPR to listOf(136000L, 474200L, 1836600L, 3568600L, 5287200L, 7038600L, 10138700L, 14095600L,
            18104600L, 21094600L, 24924600L, 28124600L, 50293000L, 144489000L),
        DigitalMode.Q65 to listOf(50275000L, 144116000L),
        DigitalMode.JT65 to listOf(1838000L, 3570000L, 7076000L, 10138000L, 14076000L, 18102000L, 21076000L, 24917000L,
            28076000L, 50310000L),
        DigitalMode.JT9 to listOf(1839000L, 3572000L, 7078000L, 10140000L, 14078000L, 18104000L, 21078000L, 24919000L,
            28078000L),
        DigitalMode.FST4 to listOf(136000L, 474200L),
        DigitalMode.FST4W to listOf(136000L, 474200L)
    )

    private val bands = listOf(
        "2200m" to 135_700L..137_800L, "630m" to 472_000L..479_000L, "160m" to 1_800_000L..2_000_000L,
        "80m" to 3_500_000L..4_000_000L, "60m" to 5_250_000L..5_450_000L, "40m" to 7_000_000L..7_300_000L,
        "30m" to 10_100_000L..10_150_000L, "20m" to 14_000_000L..14_350_000L, "17m" to 18_068_000L..18_168_000L,
        "15m" to 21_000_000L..21_450_000L, "12m" to 24_890_000L..24_990_000L, "10m" to 28_000_000L..29_700_000L,
        "6m" to 50_000_000L..54_000_000L, "2m" to 144_000_000L..148_000_000L
    )

    fun bandLabel(hz: Long): String = bands.firstOrNull { hz in it.second }?.first ?: ""

    fun forRig(mode: DigitalMode, model: RigModel): List<Long> = table.getValue(mode).filter { it in model.rangeHz }
}

object DigitalClock {
    fun slotStart(nowMs: Long, periodMs: Long): Long = nowMs - Math.floorMod(nowMs, periodMs)
    fun msToNextSlot(nowMs: Long, periodMs: Long): Long = periodMs - Math.floorMod(nowMs, periodMs)
    /** FT8: even slots start at :00 and :30. */
    fun isEvenSlot(nowMs: Long, periodMs: Long): Boolean = Math.floorDiv(nowMs, periodMs) % 2 == 0L
}

/** CAT mode for digital work; on the IC-705 the data mode (DATA ON) is selected on the radio, not changed here. */
fun dataMode(model: RigModel): RigMode = when (model) {
    RigModel.FT817, RigModel.FT818, RigModel.FT857, RigModel.FT897, RigModel.FTX1 -> RigMode.DATA_U
    RigModel.IC705, RigModel.TRUSDX, RigModel.QMX, RigModel.QDX -> RigMode.USB
}
