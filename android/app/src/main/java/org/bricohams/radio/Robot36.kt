package org.bricohams.radio

/** Robot36 convenience facade over the table-driven [Sstv] engine. */
object Robot36 {
    const val WIDTH = 320
    const val HEIGHT = 240
    /** Robot36 (VIS 8) audio for a 320x240 ARGB image. */
    fun encode(pixels: IntArray, sampleRate: Int = 48000): ShortArray = Sstv.encode(pixels, sampleRate, SstvModes.ROBOT36)
    fun decode(audio: PcmAudio): SstvImage = Sstv.decode(audio)
}
