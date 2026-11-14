package org.bricohams.radio

import kotlin.math.floor

/**
 * Maidenhead Locator System (IARU Region 1 VHF Managers Handbook, "QTH locator"; defined at the 1980 IARU VHF conference in
 * Maidenhead; see also Wikipedia "Maidenhead Locator System"). Longitude/latitude are offset by 180/90 degrees and split in:
 * field 20x10 degrees (letters A-R), square 2x1 degrees (digits 0-9), subsquare 5x2.5 minutes (letters a-x) and, optionally,
 * extended square 30x15 seconds (digits 0-9). Pure Kotlin, no Android types.
 */
object Maidenhead {
    data class LatLon(val latitude: Double, val longitude: Double)

    private val pattern = Regex("[A-Ra-r]{2}[0-9]{2}(?:[A-Xa-x]{2}(?:[0-9]{2})?)?")

    // Subsquare cells: 5' of longitude (1/12 degree) and 2.5' of latitude (1/24 degree).
    private const val LON_CELLS_PER_DEGREE = 12.0
    private const val LAT_CELLS_PER_DEGREE = 24.0

    /** 6-character locator of a position, e.g. IM98ib. Latitude -90..90 and longitude -180..180 (the poles/antimeridian clamp to the last cell). */
    fun fromLatLon(latitude: Double, longitude: Double): String {
        requireUi(latitude.isFinite() && latitude in -90.0..90.0 && longitude.isFinite() && longitude in -180.0..180.0) {
            UiText(R.string.profile_position_invalid)
        }
        val lon = floor((longitude + 180.0) * LON_CELLS_PER_DEGREE).toInt().coerceIn(0, 4319)
        val lat = floor((latitude + 90.0) * LAT_CELLS_PER_DEGREE).toInt().coerceIn(0, 4319)
        return buildString {
            append('A' + lon / 240); append('A' + lat / 240)
            append('0' + lon % 240 / 24); append('0' + lat % 240 / 24)
            append('a' + lon % 24); append('a' + lat % 24)
        }
    }

    fun isValid(locator: String) = pattern.matches(locator.trim()) && locator.trim().length != 5 && locator.trim().length != 7

    /** Canonical display: field uppercase, subsquare lowercase (IM98ib). Throws the localized error when invalid. */
    fun format(locator: String): String {
        val text = locator.trim()
        requireUi(isValid(text)) { UiText(R.string.profile_locator_invalid) }
        return text.take(2).uppercase() + text.substring(2, 4) + text.drop(4).take(2).lowercase() + text.drop(6)
    }

    /** Centre of the 4, 6 or 8 character locator cell. */
    fun toLatLon(locator: String): LatLon {
        val text = format(locator)
        var lon = (text[0] - 'A') * 20.0 + (text[2] - '0') * 2.0
        var lat = (text[1] - 'A') * 10.0 + (text[3] - '0') * 1.0
        var lonSize = 2.0
        var latSize = 1.0
        if (text.length >= 6) {
            lonSize = 1.0 / LON_CELLS_PER_DEGREE; latSize = 1.0 / LAT_CELLS_PER_DEGREE
            lon += (text[4] - 'a') * lonSize; lat += (text[5] - 'a') * latSize
        }
        if (text.length == 8) {
            lonSize /= 10; latSize /= 10
            lon += (text[6] - '0') * lonSize; lat += (text[7] - '0') * latSize
        }
        return LatLon(lat + latSize / 2 - 90.0, lon + lonSize / 2 - 180.0)
    }
}
