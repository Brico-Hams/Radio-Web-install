/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BH_STREAM_H
#define BH_STREAM_H
#include "bh_transfer.h"

#define BH_STREAM_TIMEOUT_MS 1000u
typedef enum {
    BH_STREAM_WAITING = 0,
    BH_STREAM_REPLY,
    BH_STREAM_REJECTED,
    BH_STREAM_EXPIRED,
    BH_STREAM_INVALID,
    BH_STREAM_BUSY
} bh_stream_result;

typedef struct {
    bh_transfer *transfer;
    uint8_t bytes[BH_TRANSFER_HEADER + BH_TRANSFER_CHUNK];
    size_t used;
    uint32_t last_ms;
    bool dispatching;
} bh_stream;

int bh_stream_init(bh_stream *stream, bh_transfer *transfer);
/* One byte consumed per valid call. Only REPLY makes reply available for TX.
 * REJECTED/EXPIRED are explicit framing errors, not transfer cancellation.
 * Serialize calls; all objects and input/output buffers must be independent.
 */
bh_stream_result bh_stream_push(bh_stream *stream, uint8_t byte, uint32_t now,
    uint8_t reply[BH_TRANSFER_REPLY]);
bh_stream_result bh_stream_poll(bh_stream *stream, uint32_t now);
#endif
