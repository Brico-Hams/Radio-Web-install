package org.bricohams.radio

import android.graphics.Bitmap
import android.graphics.Canvas
import android.view.View
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es")
class PassRadarViewTest {
    @Test fun inflatesAndDrawsNorthUpAndPointingStatesWithoutCrashing() {
        val view = PassRadarView(RuntimeEnvironment.getApplication())
        view.measure(View.MeasureSpec.makeMeasureSpec(720, View.MeasureSpec.EXACTLY), View.MeasureSpec.UNSPECIFIED)
        view.layout(0, 0, view.measuredWidth, view.measuredHeight)
        val canvas = Canvas(Bitmap.createBitmap(view.measuredWidth, view.measuredHeight, Bitmap.Config.ARGB_8888))
        view.draw(canvas)
        val pass = SatellitePass(SatelliteLook(0, 10.0, 0.0, 2000.0), SatelliteLook(300_000, 90.0, 50.0, 600.0),
            SatelliteLook(600_000, 170.0, 0.0, 2000.0), false, false)
        view.track = PassPointing.sampleTrack(pass) { SatelliteLook(it, 10 + it / 3750.0, 50 - kotlin.math.abs(it - 300_000) / 6000.0, 1000.0) }
        for (now in listOf(-1000L, 0L, 250_000L, 600_000L, 700_000L)) { view.now = now; view.draw(canvas) }
        view.now = 250_000L
        view.headingUp = 355.0
        view.device = Pair(355.0, 20.0)
        view.target = view.track[25]
        view.onTarget = false
        view.draw(canvas)
        view.onTarget = true
        view.headingLabel = "Rumbo 355°"
        view.draw(canvas)
        assertTrue(view.track.size > 60)
        assertEquals(720, view.measuredWidth)
    }
}
