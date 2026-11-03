package org.bricohams.radio

import org.junit.Assert.assertEquals
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** A manifest signed by scripts/ota-manifest.cjs with the real release key must verify in the app, byte for byte. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class OtaCrossSignTest {
    private val manifest = javaClass.getResourceAsStream("/ota/node-signed-manifest.json")!!.readBytes()

    @Test fun nodeSignedManifestVerifiesWithTheEmbeddedPublicKey() {
        val parsed = OtaManifestParser.parse(manifest, OtaConfig.publicKey, "org.bricohams.radicodex")
        assertEquals(17L, parsed.versionCode)
        assertEquals("1.1.0", parsed.versionName)
    }

    @Test fun tamperedManifestIsRejected() {
        val tampered = String(manifest, Charsets.UTF_8).replace("\"1.1.0\"", "\"9.9.9\"").toByteArray()
        try {
            OtaManifestParser.parse(tampered, OtaConfig.publicKey, "org.bricohams.radicodex")
            fail("A modified manifest must not verify")
        } catch (expected: OtaException) {
        }
    }
}
