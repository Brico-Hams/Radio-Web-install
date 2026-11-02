package org.bricohams.digital;

import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/** Bounded RIFF PCM16 I/O. Caller streams are neither closed nor flushed. */
public final class WavIo {
    private static final long MAX_BYTES = 32L * 1024 * 1024;

    private WavIo() {}

    public static PcmAudio read(InputStream input) throws IOException {
        if (input == null) throw new IllegalArgumentException("Input stream required");
        byte[] header = new byte[12];
        readFully(input, header, 0, header.length);
        long riffSize = u32(header, 4);
        if (!tag(header, 0, "RIFF") || !tag(header, 8, "WAVE")
                || riffSize < 4 || riffSize + 8 > MAX_BYTES) {
            throw new IOException("Expected RIFF/WAVE within 32 MiB");
        }
        long remaining = riffSize - 4;
        byte[] scratch = new byte[8192];
        byte[] data = null;
        int rate = 0;
        int channels = 0;
        while (remaining > 0) {
            if (remaining < 8) throw new IOException("Incomplete RIFF chunk header");
            readFully(input, header, 0, 8);
            remaining -= 8;
            long length = u32(header, 4);
            long padded = length + (length & 1);
            // Tolerate writers that omit the final odd chunk's pad byte from the RIFF size;
            // the body must still fit and the pad byte must actually be present.
            if (padded > remaining) {
                if ((length & 1) == 0 || length != remaining) {
                    throw new IOException("Chunk exceeds RIFF boundary");
                }
                remaining = padded;
            }
            if (tag(header, 0, "fmt ")) {
                if (rate != 0 || length < 16 || length == 17) {
                    throw new IOException("Duplicate or incomplete fmt chunk");
                }
                byte[] fmt = new byte[16];
                readFully(input, fmt, 0, 16);
                channels = u16(fmt, 2);
                long sampleRate = u32(fmt, 4);
                if (u16(fmt, 0) != 1 || (channels != 1 && channels != 2) || u16(fmt, 14) != 16
                        || sampleRate < 8000 || sampleRate > 192000
                        || u16(fmt, 12) != 2 * channels || u32(fmt, 8) != sampleRate * 2 * channels) {
                    throw new IOException("Unsupported or inconsistent PCM16 format");
                }
                rate = (int) sampleRate;
                if (length > 16) {
                    readFully(input, scratch, 0, 2);
                    if (u16(scratch, 0) != length - 18) throw new IOException("Invalid fmt extension length");
                    discard(input, length - 18, scratch);
                }
            } else if (tag(header, 0, "data")) {
                if (data != null) throw new IOException("Duplicate data chunk");
                if (rate != 0) checkDataLength(length, rate, channels);
                data = new byte[(int) length]; // Already bounded by the RIFF cap.
                readFully(input, data, 0, data.length);
            } else {
                discard(input, length, scratch);
            }
            if ((length & 1) != 0) readFully(input, scratch, 0, 1);
            remaining -= padded;
        }
        if (rate == 0 || data == null) throw new IOException("Missing fmt or data chunk");
        checkDataLength(data.length, rate, channels);
        float[] samples = new float[data.length / (2 * channels)];
        for (int i = 0, at = 0; i < samples.length; i++, at += 2 * channels) {
            int left = (short) u16(data, at);
            samples[i] = channels == 1 ? left / 32768.0f
                    : (left + (short) u16(data, at + 2)) / 65536.0f;
        }
        return new PcmAudio(rate, samples);
    }

    private static void checkDataLength(long length, int rate, int channels) throws IOException {
        if (length % (2 * channels) != 0 || length / (2 * channels) > 120L * rate) {
            throw new IOException("Incomplete PCM frame or audio longer than 120 seconds");
        }
    }

    /**
     * Quantize round(sample * 32768), saturating only the positive PCM16 endpoint
     * (+1 becomes 32767). Invalid public-array mutations are rejected before output.
     */
    public static void write(PcmAudio audio, OutputStream output) throws IOException {
        if (audio == null || output == null) throw new IllegalArgumentException("PCM and output stream required");
        for (float sample : audio.samples) {
            if (!Float.isFinite(sample) || sample < -1 || sample > 1) {
                throw new IOException("PCM was mutated to invalid samples");
            }
        }
        long dataSize = 2L * audio.samples.length;
        if (dataSize + 44 > MAX_BYTES) throw new IOException("WAV exceeds 32 MiB");
        byte[] header = new byte[44];
        putTag(header, 0, "RIFF");
        put32(header, 4, dataSize + 36);
        putTag(header, 8, "WAVE");
        putTag(header, 12, "fmt ");
        put32(header, 16, 16);
        put16(header, 20, 1);
        put16(header, 22, 1);
        put32(header, 24, audio.sampleRate);
        put32(header, 28, 2L * audio.sampleRate);
        put16(header, 32, 2);
        put16(header, 34, 16);
        putTag(header, 36, "data");
        put32(header, 40, dataSize);
        output.write(header);
        byte[] buffer = new byte[8192];
        for (int start = 0; start < audio.samples.length;) {
            int count = Math.min(buffer.length / 2, audio.samples.length - start);
            for (int i = 0; i < count; i++) {
                int value = Math.min(32767, Math.round(audio.samples[start + i] * 32768.0f));
                put16(buffer, 2 * i, value);
            }
            output.write(buffer, 0, 2 * count);
            start += count;
        }
    }

    private static void readFully(InputStream input, byte[] buffer, int offset, int count) throws IOException {
        int end = offset + count;
        while (offset < end) {
            int read = input.read(buffer, offset, end - offset);
            if (read < 0) throw new EOFException("Truncated RIFF/WAVE");
            if (read == 0) {
                int value = input.read();
                if (value < 0) throw new EOFException("Truncated RIFF/WAVE");
                buffer[offset++] = (byte) value;
            } else {
                offset += read;
            }
        }
    }

    private static void discard(InputStream input, long count, byte[] buffer) throws IOException {
        while (count > 0) {
            int block = (int) Math.min(count, buffer.length);
            readFully(input, buffer, 0, block);
            count -= block;
        }
    }

    private static boolean tag(byte[] buffer, int at, String value) {
        for (int i = 0; i < 4; i++) if ((buffer[at + i] & 255) != value.charAt(i)) return false;
        return true;
    }

    private static int u16(byte[] buffer, int at) {
        return (buffer[at] & 255) | ((buffer[at + 1] & 255) << 8);
    }

    private static long u32(byte[] buffer, int at) {
        return (long) u16(buffer, at) | ((long) u16(buffer, at + 2) << 16);
    }

    private static void putTag(byte[] buffer, int at, String value) {
        for (int i = 0; i < 4; i++) buffer[at + i] = (byte) value.charAt(i);
    }

    private static void put16(byte[] buffer, int at, int value) {
        buffer[at] = (byte) value;
        buffer[at + 1] = (byte) (value >>> 8);
    }

    private static void put32(byte[] buffer, int at, long value) {
        put16(buffer, at, (int) value);
        put16(buffer, at + 2, (int) (value >>> 16));
    }
}
