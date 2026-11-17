package org.bricohams.radio

import org.bricohams.digital.AcarsCrc
import org.bricohams.digital.AcarsFrame
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AcarsCrcTest {
    @Test fun matchesKermitCheckValue() {
        assertEquals(0x2189, AcarsCrc.compute("123456789".toByteArray(Charsets.US_ASCII)))
        assertEquals(0, AcarsCrc.compute(ByteArray(0)))
    }

    @Test fun frameWithBcsLeavesZeroResidue() {
        val bytes = AcarsFrame.of('2', "N12345", "H1", '1', "TEST").toBytes()
        // SOH is excluded from the CRC; the block ends with BCS (2 bytes) and DEL.
        assertEquals(0, AcarsCrc.compute(bytes, 1, bytes.size - 1))
        val body = AcarsCrc.compute(bytes, 1, bytes.size - 3)
        assertEquals(body and 0xFF, bytes[bytes.size - 3].toInt() and 0xFF)
        assertEquals(body ushr 8, bytes[bytes.size - 2].toInt() and 0xFF)
        assertTrue(body != 0)
    }
}
