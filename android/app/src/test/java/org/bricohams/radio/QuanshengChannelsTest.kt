package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.nio.ByteBuffer
import java.nio.ByteOrder

class QuanshengChannelsTest {
    companion object {
        /** A blank F4HWN v6.1.0 configuration with channel 1 = repeater 145.600 / -600 kHz, CTCSS 88.5 TX, HIGH, wide. */
        fun image(): ByteArray {
            val image = ByteArray(QuanshengChannels.CONFIG_SIZE) { 0xff.toByte() }
            for (channel in 0 until 1024) {
                ByteBuffer.wrap(image).order(ByteOrder.LITTLE_ENDIAN).putShort(0x8000 + channel * 2, 7)
                image.fill(0, 0x4000 + channel * 16, 0x4000 + channel * 16 + 16)
            }
            "v6.1.0".toByteArray().copyInto(image, 0xa160)
            image.fill(0, 0xa166, 0xa170)
            val view = ByteBuffer.wrap(image).order(ByteOrder.LITTLE_ENDIAN)
            view.putInt(0, 14560000).putInt(4, 60000)
            image[8] = 0; image[9] = 8; image[10] = 0x10; image[11] = 0x02
            image[12] = (0x01 or (7 shl 2) or 0x20).toByte() // reverse + HIGH + busy lock
            image[13] = 0x0a; image[14] = 0x05; image[15] = 0
            "REPE R1".toByteArray().copyInto(image, 0x4000)
            view.putShort(0x8000, 0x0102) // band 2 plus scan-list bits that must survive
            return image
        }
    }

    @Test fun readsTonesPowerAndFlags() {
        val channel = QuanshengChannels.read(image()).single()
        assertEquals(1, channel.number)
        assertEquals("REPE R1", channel.name)
        assertEquals(14560000L, channel.rx10Hz)
        assertEquals(14500000L, channel.tx10Hz)
        assertEquals(QuanshengTone.Off, channel.rxTone)
        assertEquals("88.5", channel.txTone.label)
        assertEquals(7, channel.power)
        assertFalse(channel.narrow)
        assertFalse(channel.txLock)
    }

    @Test fun updateChangesOnlyTheEditedFields() {
        val before = image()
        val edited = QuanshengChannels.read(before).single().copy(name = "PMR TEST", rx10Hz = 43300000, tx10Hz = 43460000,
            rxTone = QuanshengTone.parse("D023N"), txTone = QuanshengTone.parse("d754i"), power = 2, narrow = true, txLock = true)
        val after = QuanshengChannels.update(before, edited)
        val channel = QuanshengChannels.read(after).single()
        assertEquals(edited, channel)
        assertEquals(1, after[11].toInt() and 15)
        assertEquals(0x01 or 0x20, after[12].toInt() and 0x21) // reverse and busy lock kept
        assertEquals(0x0a, after[13].toInt()); assertEquals(0x05, after[14].toInt())
        assertEquals(0x0105, ByteBuffer.wrap(after).order(ByteOrder.LITTLE_ENDIAN).getShort(0x8000).toInt())
        for (index in after.indices) {
            val inEditedRecord = index < 16 || index in 0x4000 until 0x4010 || index in 0x8000 until 0x8002
            if (!inEditedRecord) assertEquals("byte 0x%x".format(index), before[index], after[index])
        }
        // Writing this edit touches only the blocks of channel 1, as the web planner does.
        val plan = QuanshengMemory.plan(after, before)
        // Hide channel 1, write its record (two 8-byte blocks) and first name block, then restore its attribute.
        assertEquals(listOf(0x8000, 0, 8, 0x4000, 0x8000), plan.map { it.first })
        assertEquals(7, plan.first().second[0].toInt() and 7)
    }

    @Test fun everyToneRoundTripsThroughItsLabel() {
        for (index in QuanshengChannels.CTCSS.indices) assertEquals(QuanshengTone.Ctcss(index), QuanshengTone.parse(QuanshengTone.Ctcss(index).label))
        for (index in QuanshengChannels.DCS.indices) for (inverted in listOf(false, true)) {
            val tone = QuanshengTone.Dcs(index, inverted)
            assertEquals(tone, QuanshengTone.parse(tone.label))
        }
        assertEquals(50, QuanshengChannels.CTCSS.size)
        assertEquals(104, QuanshengChannels.DCS.size)
        assertEquals("D023N", QuanshengTone.Dcs(0, false).label)
        assertEquals(QuanshengTone.Off, QuanshengTone.parse(" off "))
    }

    @Test fun rejectsInvalidInputWithoutChangingTheImage() {
        val before = image()
        val channel = QuanshengChannels.read(before).single()
        for (bad in listOf("89.0", "D024N", "D023X", "abc")) {
            assertThrows(bad, IllegalArgumentException::class.java) { QuanshengTone.parse(bad) }
        }
        for (bad in listOf("120.0", "145.123456", "500")) {
            assertThrows(bad, IllegalArgumentException::class.java) { QuanshengChannels.frequency(bad) }
        }
        assertThrows(IllegalArgumentException::class.java) { QuanshengChannels.update(before, channel.copy(tx10Hz = 43300000)) }
        assertThrows(IllegalArgumentException::class.java) { QuanshengChannels.update(before, channel.copy(name = "")) }
        assertThrows(IllegalArgumentException::class.java) { QuanshengChannels.update(before, channel.copy(name = "ÑANDU")) }
        assertThrows(IllegalArgumentException::class.java) { QuanshengChannels.update(before, channel.copy(power = 8)) }
        assertThrows(IllegalArgumentException::class.java) { QuanshengChannels.update(before, channel.copy(number = 2)) }
        val am = before.copyOf().also { it[11] = 0x12 }
        assertThrows(IllegalArgumentException::class.java) { QuanshengChannels.update(am, channel.copy(mode = 1)) }
        assertArrayEquals(image(), before)
        assertThrows(IllegalArgumentException::class.java) { QuanshengChannels.read(ByteArray(100)) }
        assertThrows(IllegalArgumentException::class.java) { QuanshengChannels.read(before.copyOf().also { "v5.9.0".toByteArray().copyInto(it, 0xa160) }) }
    }

    @Test fun unsetFlagsByteReadsAsLockedAndIsRewrittenCleanly() {
        val image = image().also { it[12] = 0xff.toByte() }
        val channel = QuanshengChannels.read(image).single()
        assertTrue(channel.txLock)
        assertEquals(1, channel.power)
        val after = QuanshengChannels.update(image, channel.copy(txLock = false, power = 6))
        assertEquals(6 shl 2, after[12].toInt() and 0xff)
    }
}
