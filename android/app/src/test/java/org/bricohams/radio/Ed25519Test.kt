package org.bricohams.radio

import java.security.KeyPairGenerator
import java.security.Signature
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class Ed25519Test {
    private fun hex(text: String) = Hex.decode(text)!!

    @Test
    fun rfc8032Vector1Verifies() {
        val publicKey = hex("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a")
        val signature = hex(
            "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b"
        )
        assertTrue(Ed25519.verify(publicKey, ByteArray(0), signature))
        assertFalse(Ed25519.verify(publicKey, byteArrayOf(1), signature))
    }

    @Test
    fun jdkSignaturesVerifyAndTamperingIsRejected() {
        val pair = KeyPairGenerator.getInstance("Ed25519").generateKeyPair()
        val publicKey = pair.public.encoded.copyOfRange(pair.public.encoded.size - 32, pair.public.encoded.size)
        val message = "RadiCodex".toByteArray()
        val signature = Signature.getInstance("Ed25519").run { initSign(pair.private); update(message); sign() }
        assertTrue(Ed25519.verify(publicKey, message, signature))
        assertFalse(Ed25519.verify(publicKey, "radicodex".toByteArray(), signature))
        assertFalse(Ed25519.verify(publicKey, message, signature.copyOf().also { it[10] = (it[10].toInt() xor 1).toByte() }))
        assertFalse(Ed25519.verify(publicKey, message, signature.copyOf(63)))
        assertFalse(Ed25519.verify(publicKey.copyOf(31), message, signature))
        // S set to all ones is >= L and must be refused (malleability)
        assertFalse(Ed25519.verify(publicKey, message, signature.copyOf().also { for (i in 32..63) it[i] = 0xff.toByte() }))
    }
}
