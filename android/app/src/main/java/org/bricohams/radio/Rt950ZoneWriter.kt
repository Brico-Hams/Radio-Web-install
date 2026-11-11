package org.bricohams.radio

import java.io.IOException
import java.math.BigDecimal

/**
 * Writes a [ChannelTemplates.ZonePlan] for the "rt950pro" profile through [Rt950Session.writeChannels]. Pure planning and
 * checking logic: the caller owns the verified-backup gate and the clone session. Template channels are reference data and
 * are always written with TX inhibited (the channel's txEnabled flag, bit 0x02 of byte 15 as modelled by [Rt950Channel]).
 */
object Rt950ZoneWriter {
    enum class Status { OK, MISMATCH, ERROR, NOT_ATTEMPTED }

    /** [occupied]: non-blank slots of the whole zone in the backup (within the variant's writable range); [replaced]: those among [slots]. */
    class ZoneWrite(val zone: Int, val name: String, val slots: Map<Int, Rt950Channel>, val occupied: Int, val replaced: Int)
    class Plan(val variant: Rt950Variant, val zones: List<ZoneWrite>, val omitted: Int)
    class ZoneResult(val zone: Int, val status: Status, val detail: String? = null)

    /** Null when the channel cannot be represented faithfully (unsupported mode, frequency off the 10 Hz grid, no usable name). */
    fun toChannel(channel: ChannelTemplates.Channel): Rt950Channel? {
        val am = when (channel.modulation) {
            "AM" -> true
            "FM" -> false
            else -> return null
        }
        val rx = hz(channel.rx) ?: return null
        val tx = hz(channel.tx) ?: return null
        val name = try { ChannelTemplates.asciiName(channel.name, 12) } catch (_: IllegalArgumentException) { return null }
        val mapped = Rt950Channel(rx, tx, narrow = channel.narrow, txEnabled = false, am = am, name = name)
        return try { Rt950Channels.encode(mapped); mapped } catch (_: IllegalArgumentException) { null }
    }

    private fun hz(mhz: String): Long? = try {
        val value = BigDecimal(mhz.trim()).movePointRight(6)
        if (value.signum() > 0 && value.stripTrailingZeros().scale() <= 0) value.toBigInteger().longValueExact() else null
    } catch (_: NumberFormatException) { null } catch (_: ArithmeticException) { null }

    /** Slots of [zone] that hold a channel in [saved]; slots of the 961-990 area are ignored unless [variant] is CH990. */
    fun occupiedSlots(saved: Rt950Backup, zone: Int, variant: Rt950Variant): List<Int> =
        (1..Rt950Protocol.ZONE_SLOTS).filter {
            (variant == Rt950Variant.CH990 || !Rt950Protocol.isCh990Slot(zone, it)) && !Rt950Channels.isBlank(saved.channelRecord(zone, it))
        }

    /** First zone (1-10) with no channel at all in [saved]; 1 when every zone holds something. */
    fun defaultFirstZone(saved: Rt950Backup, variant: Rt950Variant): Int =
        (1..Rt950Protocol.ZONES).firstOrNull { occupiedSlots(saved, it, variant).isEmpty() } ?: 1

    private fun isPmrZone(zone: ChannelTemplates.Zone) =
        zone.regionIds.isNotEmpty() && zone.regionIds.all { it == "PMR446" || it == "CB27" }

    /**
     * Regional/SAT zones are shifted so plan zone 1 lands on [firstZone] (n -> n + firstZone - 1); the PMR446/CB zone keeps its
     * index. Throws before anything is written when a shifted zone passes the last available zone or hits the PMR/CB zone.
     */
    fun plan(zonePlan: ChannelTemplates.ZonePlan, saved: Rt950Backup, variant: Rt950Variant, firstZone: Int = 1): Plan {
        requireUi(firstZone in 1..Rt950Protocol.ZONES) { UiText(R.string.err_rt950_first_zone_range, Rt950Protocol.ZONES) }
        val shift = firstZone - 1
        val pmrZone = zonePlan.zones.firstOrNull { isPmrZone(it) }
        val last = if (pmrZone != null) Rt950Protocol.ZONES - 1 else Rt950Protocol.ZONES
        var omitted = zonePlan.omitted
        val target = zonePlan.zones.map { zone -> zone to if (zone === pmrZone) zone.index else zone.index + shift }
        for ((zone, index) in target) {
            if (zone === pmrZone) continue
            requireUi(index <= last && index != pmrZone?.index) {
                UiText(R.string.err_rt950_first_zone_overflow, firstZone, index, last)
            }
        }
        val zones = target.mapNotNull { (zone, index) ->
            val mapped = zone.channels.mapNotNull { toChannel(it) }
            omitted += zone.channels.size - mapped.size
            if (mapped.isEmpty()) return@mapNotNull null
            val slots = mapped.mapIndexed { slot, channel -> slot + 1 to channel }.toMap()
            val occupied = occupiedSlots(saved, index, variant)
            ZoneWrite(index, zone.name, slots, occupied.size, occupied.count { it in slots })
        }
        return Plan(variant, zones, omitted)
    }

    /** Refuses 961-990 without CH990 and occupied zones without [overwrite]. Throws before anything is written. */
    fun check(plan: Plan, variant: Rt950Variant, overwrite: Boolean) {
        requireUi(plan.zones.isNotEmpty()) { UiText(R.string.err_rt950_plan_empty) }
        requireUi(plan.variant == variant) { UiText(R.string.err_rt950_variant_changed) }
        for (zone in plan.zones) {
            requireUi(zone.zone in 1..Rt950Protocol.ZONES && zone.slots.keys.all { it in 1..Rt950Protocol.ZONE_SLOTS }) { UiText(R.string.err_rt950_slot) }
            requireUi(variant == Rt950Variant.CH990 || zone.slots.keys.none { Rt950Protocol.isCh990Slot(zone.zone, it) }) {
                UiText(R.string.err_rt950_variant_range)
            }
            requireUi(overwrite || zone.occupied == 0) { UiText(R.string.err_rt950_zone_occupied, zone.zone, zone.name, zone.occupied) }
        }
    }

    /** Slots whose read-back record does not decode to what was written. */
    fun verifyZone(session: Rt950Session, zone: ZoneWrite): List<Int> {
        val blocks = HashMap<Int, ByteArray>()
        return zone.slots.filter { (slot, channel) ->
            val offset = Rt950Channels.index(zone.zone, slot) * Rt950Protocol.CHANNEL_SIZE
            val address = offset / Rt950Protocol.BLOCK * Rt950Protocol.BLOCK
            val block = blocks.getOrPut(address) { session.readBlock(Rt950Protocol.CMD_READ, address) }
            val start = offset - address
            Rt950Channels.decode(block.copyOfRange(start, start + Rt950Protocol.CHANNEL_SIZE)) != channel
        }.keys.sorted()
    }

    /** Writes zone by zone and stops at the first failure; later zones are reported as [Status.NOT_ATTEMPTED]. */
    fun write(session: Rt950Session, plan: Plan, overwrite: Boolean): List<ZoneResult> {
        check(plan, session.variant, overwrite)
        val results = ArrayList<ZoneResult>()
        var failed = false
        for (zone in plan.zones) {
            if (failed) { results += ZoneResult(zone.zone, Status.NOT_ATTEMPTED); continue }
            val result = try {
                session.writeChannels(zone.zone, zone.slots)
                val bad = verifyZone(session, zone)
                if (bad.isEmpty()) ZoneResult(zone.zone, Status.OK) else ZoneResult(zone.zone, Status.MISMATCH, bad.joinToString(","))
            } catch (error: IllegalStateException) {
                val verify = (error as? LocalizedError)?.text?.id == R.string.err_rt950_verify
                ZoneResult(zone.zone, if (verify) Status.MISMATCH else Status.ERROR, error.message)
            } catch (error: IOException) {
                ZoneResult(zone.zone, Status.ERROR, error.message)
            }
            if (result.status != Status.OK) failed = true
            results += result
        }
        return results
    }

    /** Zones whose flash content may differ from the backup after [results] (written but not OK). */
    fun affectedZones(results: List<ZoneResult>): Set<Int> =
        results.filter { it.status == Status.MISMATCH || it.status == Status.ERROR }.map { it.zone }.toSet()
}
