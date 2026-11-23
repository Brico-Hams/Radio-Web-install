package org.bricohams.radio

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException

/** Frames from the IC-705 CI-V Reference Guide rev. 6 (printed p.2 frame format, p.5 command 1A 05 0029 "Beep level"). */
class RigSettingsTest {
    private val beep = Ic705Settings.all.first { it.sub == "0029" }
    private val timeout = Ic705Settings.all.first { it.sub == "0043" }

    private class FakeIo(var value: String = "0128") : SettingsIo {
        val writes = ArrayList<String>()
        var failWrites = false
        var corruptFirst = false
        override fun readSetting(setting: Ic705Setting) = value
        override fun writeSetting(setting: Ic705Setting, digits: String) {
            writes.add(digits)
            if (failWrites) throw IOException("NG")
            value = if (corruptFirst && writes.size == 1) "0000" else digits
        }
    }

    private fun service(io: SettingsIo, tx: () -> Boolean? = { false }, clock: () -> Long = { 10_000 }) =
        RigSettingsService(io, tx, clock, 1000)

    @Test fun framesFollowTheGuide() {
        assertArrayEquals(byteArrayOf(0x1A, 0x05, 0x00, 0x29), IcomCiv.readSetting(beep))
        assertArrayEquals(byteArrayOf(0x1A, 0x05, 0x00, 0x29, 0x01, 0x28), IcomCiv.writeSetting(beep, "0128"))
        assertEquals("0128", IcomCiv.settingDigits(beep, byteArrayOf(0x1A, 0x05, 0x00, 0x29, 0x01, 0x28)))
        assertThrows(LocalizedArgumentException::class.java) { IcomCiv.settingDigits(beep, byteArrayOf(0x1A, 0x05, 0x00, 0x29, 0x01)) }
    }

    @Test fun encodeValidatesTheSourcedRange() {
        assertEquals("0200", beep.encode("200"))
        assertNull(beep.encode("256"))
        assertNull(beep.encode("abc"))
        val bool = Ic705Settings.all.first { it.sub == "0031" }
        assertEquals("01", bool.encode("01"))
        assertNull(bool.encode("02"))
    }

    @Test fun writeKeepsBackupAndVerifiesReadBack() {
        val io = FakeIo()
        val service = service(io)
        val result = service.write(beep, "200")
        assertEquals("0128", result.backup)
        assertEquals(listOf("0200"), io.writes)
        assertEquals(listOf("backup", "written"), service.audit().map { it.event })
    }

    @Test fun mismatchRestoresTheBackup() {
        val io = FakeIo().apply { corruptFirst = true }
        assertThrows(LocalizedArgumentException::class.java) { service(io).write(beep, "200") }
        assertEquals(listOf("0200", "0128"), io.writes)
        assertEquals("0128", io.value)
    }

    @Test fun refusesExcludedPendingTransmittingAndRateLimited() {
        val io = FakeIo()
        assertThrows(LocalizedArgumentException::class.java) { service(io).write(timeout, "01") }
        assertThrows(LocalizedArgumentException::class.java) { service(io).write(Ic705Settings.all.first { it.sub == "0001" }, "00") }
        assertThrows(LocalizedArgumentException::class.java) { service(io, tx = { true }).write(beep, "1") }
        assertThrows(LocalizedArgumentException::class.java) { service(io, tx = { null }).write(beep, "1") }
        assertThrows(LocalizedArgumentException::class.java) { service(io).write(beep, "999") }
        assertTrue(io.writes.isEmpty())
        var now = 10_000L
        val limited = service(io, clock = { now })
        limited.write(beep, "1")
        assertThrows(LocalizedArgumentException::class.java) { limited.write(beep, "2") }
        now += 1500
        limited.write(beep, "2")
    }

    @Test fun hardExclusionsAreNeverWritable() {
        val excluded = mapOf("0033" to "tx-region", "0036" to "tx-region", "0037" to "tx-region", "0034" to "auto-off",
            "0043" to "tx-safety", "0044" to "tx-safety", "0071" to "link-serial", "0089" to "calibration-reset")
        for ((sub, reason) in excluded) {
            val setting = Ic705Settings.all.first { it.sub == sub }
            assertFalse(sub, setting.writable)
            assertEquals(sub, reason, setting.exclusion)
        }
    }
}
