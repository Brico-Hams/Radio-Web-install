package org.bricohams.radio

import java.math.BigInteger
import java.security.MessageDigest

/**
 * Ed25519 signature verification (RFC 8032, pure signature check, no signing). Implemented with BigInteger because
 * java.security only offers Ed25519 from API 33 and the app supports API 26+. Verification handles public data only,
 * so the lack of constant-time arithmetic does not matter.
 */
object Ed25519 {
    private val ZERO = BigInteger.ZERO
    private val ONE = BigInteger.ONE
    private val TWO = BigInteger.valueOf(2)
    private val P = ONE.shiftLeft(255).subtract(BigInteger.valueOf(19))
    private val L = ONE.shiftLeft(252).add(BigInteger("27742317777372353535851937790883648493"))
    private val D = BigInteger.valueOf(-121665).multiply(BigInteger.valueOf(121666).modInverse(P)).mod(P)
    private val SQRT_MINUS_ONE = TWO.modPow(P.subtract(ONE).shiftRight(2), P)

    private class Point(val x: BigInteger, val y: BigInteger)

    private val identity = Point(ZERO, ONE)
    private val base: Point by lazy {
        val y = BigInteger.valueOf(4).multiply(BigInteger.valueOf(5).modInverse(P)).mod(P)
        requireNotNull(decode(encodeY(y, 0)))
    }

    private fun fromLittleEndian(bytes: ByteArray): BigInteger = BigInteger(1, bytes.reversedArray())

    private fun encodeY(y: BigInteger, sign: Int): ByteArray {
        val big = y.toByteArray().reversedArray()
        val out = ByteArray(32)
        for (index in 0 until minOf(32, big.size)) out[index] = big[index]
        if (sign == 1) out[31] = (out[31].toInt() or 0x80).toByte()
        return out
    }

    private fun decode(bytes: ByteArray): Point? {
        if (bytes.size != 32) return null
        val sign = (bytes[31].toInt() shr 7) and 1
        val raw = bytes.copyOf()
        raw[31] = (raw[31].toInt() and 0x7f).toByte()
        val y = fromLittleEndian(raw)
        if (y >= P) return null
        val y2 = y.multiply(y).mod(P)
        val u = y2.subtract(ONE).mod(P)
        val v = D.multiply(y2).add(ONE).mod(P)
        if (v.signum() == 0) return null
        val x2 = u.multiply(v.modInverse(P)).mod(P)
        var x = x2.modPow(P.add(BigInteger.valueOf(3)).shiftRight(3), P)
        if (x.multiply(x).mod(P) != x2) x = x.multiply(SQRT_MINUS_ONE).mod(P)
        if (x.multiply(x).mod(P) != x2) return null
        if (x.signum() == 0 && sign == 1) return null
        if (x.testBit(0) != (sign == 1)) x = P.subtract(x)
        return Point(x, y)
    }

    // Unified twisted Edwards addition (a = -1); complete for points on the curve.
    private fun add(a: Point, b: Point): Point {
        val dxy = D.multiply(a.x).multiply(b.x).multiply(a.y).multiply(b.y).mod(P)
        val x = a.x.multiply(b.y).add(b.x.multiply(a.y)).multiply(ONE.add(dxy).mod(P).modInverse(P)).mod(P)
        val y = a.y.multiply(b.y).add(a.x.multiply(b.x)).multiply(ONE.subtract(dxy).mod(P).modInverse(P)).mod(P)
        return Point(x, y)
    }

    private fun multiply(point: Point, scalar: BigInteger): Point {
        var result = identity
        for (bit in scalar.bitLength() - 1 downTo 0) {
            result = add(result, result)
            if (scalar.testBit(bit)) result = add(result, point)
        }
        return result
    }

    fun verify(publicKey: ByteArray, message: ByteArray, signature: ByteArray): Boolean {
        if (publicKey.size != 32 || signature.size != 64) return false
        val r = decode(signature.copyOfRange(0, 32)) ?: return false
        val a = decode(publicKey) ?: return false
        val s = fromLittleEndian(signature.copyOfRange(32, 64))
        if (s >= L) return false
        val digest = MessageDigest.getInstance("SHA-512")
        digest.update(signature, 0, 32)
        digest.update(publicKey)
        digest.update(message)
        val h = fromLittleEndian(digest.digest()).mod(L)
        val left = multiply(base, s)
        val right = add(r, multiply(a, h))
        return left.x == right.x && left.y == right.y
    }
}
