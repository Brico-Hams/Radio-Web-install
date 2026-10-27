/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bh_stream.h"
#include <string.h>

static uint32_t get32(const uint8_t *p)
{
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) |
        ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static void discard(bh_stream *stream)
{
    --stream->used;
    memmove(stream->bytes, stream->bytes + 1, stream->used);
}

int bh_stream_init(bh_stream *stream, bh_transfer *transfer)
{
    if (stream == NULL || transfer == NULL || transfer->install == NULL)
        return -1;
    *stream = (bh_stream){0};
    stream->transfer = transfer;
    return 0;
}

bh_stream_result bh_stream_poll(bh_stream *stream, uint32_t now)
{
    if (stream == NULL || stream->transfer == NULL)
        return BH_STREAM_INVALID;
    if (stream->dispatching)
        return BH_STREAM_BUSY;
    if (stream->used != 0 && (uint32_t)(now - stream->last_ms) >= BH_STREAM_TIMEOUT_MS) {
        stream->used = 0;
        return BH_STREAM_EXPIRED;
    }
    return BH_STREAM_WAITING;
}

bh_stream_result bh_stream_push(bh_stream *stream, uint8_t byte, uint32_t now,
    uint8_t reply[BH_TRANSFER_REPLY])
{
    if (reply == NULL)
        return BH_STREAM_INVALID;
    bh_stream_result result = bh_stream_poll(stream, now);
    if (result == BH_STREAM_INVALID || result == BH_STREAM_BUSY)
        return result;
    stream->bytes[stream->used++] = byte;
    stream->last_ms = now;
    while (stream->used >= 4) {
        if (memcmp(stream->bytes, "BHT1", 4) != 0) {
            discard(stream);
            result = BH_STREAM_REJECTED;
            continue;
        }
        if (stream->used < BH_TRANSFER_HEADER)
            break;
        const uint32_t payload = get32(stream->bytes + 16);
        if (payload > BH_TRANSFER_CHUNK) {
            discard(stream);
            result = BH_STREAM_REJECTED;
            continue;
        }
        const size_t size = BH_TRANSFER_HEADER + payload;
        if (stream->used < size)
            break;
        uint8_t checked[BH_TRANSFER_HEADER + BH_TRANSFER_CHUNK];
        memcpy(checked, stream->bytes, size);
        memset(checked + 20, 0, 4);
        if (bh_package_crc32(checked, size) != get32(stream->bytes + 20)) {
            discard(stream);
            result = BH_STREAM_REJECTED;
            continue;
        }
        stream->dispatching = true;
        const bh_transfer_result response = bh_transfer_request(stream->transfer,
            stream->bytes, size, now, reply);
        stream->dispatching = false;
        if (response == BH_TRANSFER_BUSY && stream->transfer->dispatching) {
            /* A caller is using the underlying receiver outside this stream. */
            stream->used = 0;
            return BH_STREAM_BUSY;
        }
        stream->used -= size;
        memmove(stream->bytes, stream->bytes + size, stream->used);
        return BH_STREAM_REPLY;
    }
    return result;
}
