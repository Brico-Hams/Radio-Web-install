package org.bricohams.radio

import java.io.File
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.Signature
import java.util.Base64
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class OtaTest {
    private val pkg = "org.bricohams.radicodex"
    private val pair = KeyPairGenerator.getInstance("Ed25519").generateKeyPair()
    private val publicKey = pair.public.encoded.let { it.copyOfRange(it.size - 32, it.size) }

    private fun sha(bytes: ByteArray) = Hex.encode(MessageDigest.getInstance("SHA-256").digest(bytes))

    private fun body(code: Long = 17, size: Long = 1000, hash: String = "a".repeat(64), url: String = "https://example.org/a.apk",
        packageName: String = pkg): JSONObject = JSONObject()
        .put("schema", 1).put("package", packageName).put("versionCode", code).put("versionName", "1.0.2").put("minSdk", 26)
        .put("apk", JSONObject().put("url", url).put("sha256", hash).put("size", size))
        .put("notes", JSONObject().put("es", "Novedades ñ").put("en", "News"))

    private fun sign(root: JSONObject, key: java.security.PrivateKey = pair.private): ByteArray {
        val signature = Signature.getInstance("Ed25519").run {
            initSign(key); update(OtaManifestParser.canonical(root).toByteArray(Charsets.UTF_8)); sign()
        }
        return JSONObject(root.toString()).put("signature", Base64.getEncoder().encodeToString(signature)).toString().toByteArray()
    }

    private fun failure(block: () -> Unit): OtaFailure {
        try { block() } catch (error: OtaException) { return error.failure }
        fail("Expected OtaException")
        throw IllegalStateException()
    }

    private fun parse(bytes: ByteArray) = OtaManifestParser.parse(bytes, publicKey, pkg)

    private fun manifest(size: Long, hash: String, code: Long = 17, minSdk: Int = 26) =
        OtaManifest(code, "1.0.2", minSdk, "https://example.org/a.apk", hash, size, mapOf("es" to "x"))

    @Test
    fun validManifestParses() {
        val result = parse(sign(body()))
        assertEquals(17L, result.versionCode)
        assertEquals("1.0.2", result.versionName)
        assertEquals("Novedades ñ", result.notesFor("es-ES"))
        assertEquals("News", result.notesFor("en-US"))
    }

    @Test
    fun canonicalFormIsSortedCompactAndAscii() {
        val json = JSONObject().put("b", 1).put("a", JSONObject().put("z", "é\"").put("y", true))
        assertEquals("{\"a\":{\"y\":true,\"z\":\"\\u00e9\\\"\"},\"b\":1}", OtaManifestParser.canonical(json))
    }

    @Test
    fun missingKeyDisablesTheChannel() {
        assertEquals(OtaFailure.NOT_CONFIGURED, failure { OtaManifestParser.parse(sign(body()), null, pkg) })
    }

    @Test
    fun tamperedContentIsRejectedBySignature() {
        val signed = JSONObject(String(sign(body()))).put("versionCode", 99)
        assertEquals(OtaFailure.BAD_SIGNATURE, failure { parse(signed.toString().toByteArray()) })
    }

    @Test
    fun signatureFromAnotherKeyIsRejected() {
        val other = KeyPairGenerator.getInstance("Ed25519").generateKeyPair()
        assertEquals(OtaFailure.BAD_SIGNATURE, failure { parse(sign(body(), other.private)) })
    }

    @Test
    fun missingSignatureIsRejected() {
        assertEquals(OtaFailure.BAD_SIGNATURE, failure { parse(body().toString().toByteArray()) })
    }

    @Test
    fun wrongPackageInsecureUrlBadHashAndOversizeAreRejectedEvenWhenSigned() {
        assertEquals(OtaFailure.WRONG_PACKAGE, failure { parse(sign(body(packageName = "evil.app"))) })
        assertEquals(OtaFailure.INSECURE_URL, failure { parse(sign(body(url = "http://example.org/a.apk"))) })
        assertEquals(OtaFailure.MANIFEST_INVALID, failure { parse(sign(body(hash = "xyz"))) })
        assertEquals(OtaFailure.SIZE_INVALID, failure { parse(sign(body(size = OtaConfig.MAX_APK_BYTES + 1))) })
        assertEquals(OtaFailure.SIZE_INVALID, failure { parse(sign(body(size = 0))) })
    }

    @Test
    fun invalidAndHugeManifestsAreRejected() {
        assertEquals(OtaFailure.MANIFEST_INVALID, failure { parse("not json".toByteArray()) })
        assertEquals(OtaFailure.MANIFEST_TOO_LARGE, failure { parse(ByteArray(OtaConfig.MAX_MANIFEST_BYTES + 1)) })
    }

    @Test
    fun versionComparison() {
        assertTrue(OtaPolicy.isNewer(16, 17))
        assertTrue(!OtaPolicy.isNewer(16, 16))
        assertTrue(!OtaPolicy.isNewer(16, 15))
        OtaPolicy.requireApplicable(manifest(1, "a".repeat(64)), 16, 28)
        assertEquals(OtaFailure.NOT_NEWER, failure { OtaPolicy.requireApplicable(manifest(1, "a".repeat(64), code = 16), 16, 28) })
        assertEquals(OtaFailure.NOT_NEWER, failure { OtaPolicy.requireApplicable(manifest(1, "a".repeat(64), code = 10), 16, 28) })
        assertEquals(OtaFailure.MIN_SDK, failure { OtaPolicy.requireApplicable(manifest(1, "a".repeat(64), minSdk = 30), 16, 28) })
    }

    @Test
    fun downloadVerification() {
        val bytes = ByteArray(2048) { it.toByte() }
        val file = File.createTempFile("ota", ".apk").also { it.writeBytes(bytes); it.deleteOnExit() }
        OtaPolicy.verifyDownload(file, manifest(bytes.size.toLong(), sha(bytes)))
        assertEquals(OtaFailure.HASH_MISMATCH, failure { OtaPolicy.verifyDownload(file, manifest(bytes.size.toLong(), sha(byteArrayOf(1)))) })
        assertEquals(OtaFailure.SIZE_MISMATCH, failure { OtaPolicy.verifyDownload(file, manifest(bytes.size + 1L, sha(bytes))) })
    }

    @Test
    fun archiveChecks() {
        val m = manifest(1, "a".repeat(64))
        OtaPolicy.verifyArchive(m, pkg, 17, "1.0.2", pkg, 16)
        assertEquals(OtaFailure.WRONG_PACKAGE, failure { OtaPolicy.verifyArchive(m, "evil", 17, "1.0.2", pkg, 16) })
        assertEquals(OtaFailure.APK_VERSION, failure { OtaPolicy.verifyArchive(m, pkg, 18, "1.0.2", pkg, 16) })
        assertEquals(OtaFailure.NOT_NEWER, failure { OtaPolicy.verifyArchive(m, pkg, 17, "1.0.2", pkg, 17) })
    }

    @Test
    fun signerMustMatchExactly() {
        val ours = byteArrayOf(1, 2, 3)
        OtaPolicy.requireSameSigner(listOf(ours), listOf(byteArrayOf(1, 2, 3)))
        assertEquals(OtaFailure.SIGNER_MISMATCH, failure { OtaPolicy.requireSameSigner(listOf(ours), listOf(byteArrayOf(9))) })
        assertEquals(OtaFailure.SIGNER_MISMATCH, failure { OtaPolicy.requireSameSigner(listOf(ours), emptyList()) })
        assertEquals(OtaFailure.SIGNER_MISMATCH, failure { OtaPolicy.requireSameSigner(emptyList(), emptyList()) })
        assertEquals(OtaFailure.SIGNER_MISMATCH, failure { OtaPolicy.requireSameSigner(listOf(ours), listOf(ours, byteArrayOf(7))) })
    }

    @Test
    fun dailyScheduling() {
        val day = OtaConfig.CHECK_INTERVAL_MS
        assertTrue(OtaPolicy.checkDue(0, 1000))
        assertTrue(!OtaPolicy.checkDue(1000, 1000 + day - 1))
        assertTrue(OtaPolicy.checkDue(1000, 1000 + day))
        assertTrue(OtaPolicy.checkDue(5000, 1000))
        assertNull(null)
    }
}
