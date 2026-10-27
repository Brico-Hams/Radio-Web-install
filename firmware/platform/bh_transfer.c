/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bh_transfer.h"
#include <string.h>

static uint32_t get32(const uint8_t *p)
{
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) |
        ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static void put32(uint8_t *p, uint32_t value)
{
    for (unsigned i = 0; i < 4; ++i) p[i] = (uint8_t)(value >> (i * 8u));
}

int bh_transfer_init(bh_transfer *transfer, uint8_t *buffer, size_t capacity,
    uint32_t capabilities, void *context,
    int (*install)(void *context, const uint8_t *package, size_t size))
{
    if (transfer == NULL || buffer == NULL || capacity < BH_TRANSFER_PACKAGE_MAX ||
        install == NULL || (capabilities & ~BH_PACKAGE_CAP_MASK) != 0)
        return -1;
    *transfer = (bh_transfer){0};
    transfer->buffer = buffer;
    transfer->capacity = capacity;
    transfer->capabilities = capabilities;
    transfer->context = context;
    transfer->install = install;
    return 0;
}

static bh_transfer_result handle(bh_transfer *transfer, uint32_t operation,
    uint32_t session, uint32_t offset, const uint8_t *payload, uint32_t size, uint32_t now)
{
    if (transfer->state == BH_TRANSFER_RECEIVING &&
        (uint32_t)(now - transfer->last_ms) >= BH_TRANSFER_TIMEOUT_MS)
        transfer->state = BH_TRANSFER_TIMED_OUT;
    if (operation == BH_TRANSFER_BEGIN) {
        if (size != 8 || offset != 0 || session == 0)
            return BH_TRANSFER_BAD_FRAME;
        const uint32_t total = get32(payload), crc = get32(payload + 4);
        if (total < BH_PACKAGE_HEADER_SIZE + 2u || total > BH_TRANSFER_PACKAGE_MAX ||
            total > transfer->capacity)
            return BH_TRANSFER_BAD_PACKAGE;
        if (session == transfer->session) {
            if (total != transfer->total || crc != transfer->crc)
                return BH_TRANSFER_BAD_SESSION;
            if (transfer->state == BH_TRANSFER_TIMED_OUT)
                return BH_TRANSFER_EXPIRED;
            return transfer->state == BH_TRANSFER_RECEIVING || transfer->state == BH_TRANSFER_DONE
                ? BH_TRANSFER_OK : BH_TRANSFER_BAD_STATE;
        }
        if (transfer->state == BH_TRANSFER_RECEIVING)
            return BH_TRANSFER_BUSY;
        transfer->session = session;
        transfer->total = total;
        transfer->crc = crc;
        transfer->received = 0;
        transfer->install_result = 0;
        transfer->state = BH_TRANSFER_RECEIVING;
        transfer->last_ms = now;
        return BH_TRANSFER_OK;
    }
    if (session == 0 || session != transfer->session)
        return BH_TRANSFER_BAD_SESSION;
    if (operation == BH_TRANSFER_STATUS || operation == BH_TRANSFER_ABORT ||
        operation == BH_TRANSFER_COMMIT) {
        if (size != 0 || offset != 0)
            return BH_TRANSFER_BAD_FRAME;
        if (operation == BH_TRANSFER_STATUS)
            return transfer->state == BH_TRANSFER_TIMED_OUT ? BH_TRANSFER_EXPIRED : BH_TRANSFER_OK;
        if (operation == BH_TRANSFER_ABORT) {
            if (transfer->state == BH_TRANSFER_DONE || transfer->state == BH_TRANSFER_FAILED)
                return BH_TRANSFER_BAD_STATE;
            transfer->state = BH_TRANSFER_CANCELLED;
            return BH_TRANSFER_OK;
        }
        if (transfer->state == BH_TRANSFER_DONE)
            return BH_TRANSFER_OK;
        if (transfer->state == BH_TRANSFER_FAILED)
            return BH_TRANSFER_INSTALL_ERROR;
        if (transfer->state == BH_TRANSFER_TIMED_OUT)
            return BH_TRANSFER_EXPIRED;
        if (transfer->state != BH_TRANSFER_RECEIVING)
            return BH_TRANSFER_BAD_STATE;
        if (transfer->received != transfer->total)
            return BH_TRANSFER_INCOMPLETE;
        bh_package_info info;
        if (bh_package_crc32(transfer->buffer, transfer->total) != transfer->crc ||
            bh_package_inspect(transfer->buffer, transfer->total, transfer->capabilities,
                &info) != BH_PACKAGE_OK)
            return BH_TRANSFER_BAD_PACKAGE;
        /* A failed callback can have committed storage: never call it twice. */
        transfer->state = BH_TRANSFER_FAILED;
        transfer->install_result = transfer->install(transfer->context,
            transfer->buffer, transfer->total);
        if (transfer->install_result != 0)
            return BH_TRANSFER_INSTALL_ERROR;
        transfer->state = BH_TRANSFER_DONE;
        return BH_TRANSFER_OK;
    }
    if (operation != BH_TRANSFER_DATA || size == 0)
        return BH_TRANSFER_BAD_FRAME;
    if (transfer->state == BH_TRANSFER_TIMED_OUT)
        return BH_TRANSFER_EXPIRED;
    if (transfer->state != BH_TRANSFER_RECEIVING)
        return BH_TRANSFER_BAD_STATE;
    if (offset > transfer->received || size > transfer->total ||
        offset > transfer->total - size)
        return BH_TRANSFER_BAD_OFFSET;
    if (offset < transfer->received) {
        if (size > transfer->received - offset ||
            memcmp(transfer->buffer + offset, payload, size) != 0)
            return BH_TRANSFER_BAD_OFFSET;
    } else {
        memcpy(transfer->buffer + offset, payload, size);
        transfer->received += size;
    }
    transfer->last_ms = now;
    return BH_TRANSFER_OK;
}

bh_transfer_result bh_transfer_request(bh_transfer *transfer, const uint8_t *request,
    size_t size, uint32_t now, uint8_t reply[BH_TRANSFER_REPLY])
{
    if (transfer == NULL || transfer->install == NULL || request == NULL || reply == NULL)
        return BH_TRANSFER_BAD_FRAME;
    /* Overlapping frames, replies and staging buffers are not permitted. */
    if (transfer->dispatching)
        return BH_TRANSFER_BUSY;
    uint32_t operation = 0, session = 0;
    bh_transfer_result result = BH_TRANSFER_BAD_FRAME;
    if (size >= BH_TRANSFER_HEADER && size <= BH_TRANSFER_HEADER + BH_TRANSFER_CHUNK &&
        memcmp(request, "BHT1", 4) == 0) {
        operation = get32(request + 4);
        session = get32(request + 8);
        const uint32_t payload_size = get32(request + 16);
        uint8_t checked[BH_TRANSFER_HEADER + BH_TRANSFER_CHUNK];
        memcpy(checked, request, size);
        memset(checked + 20, 0, 4);
        if (payload_size == size - BH_TRANSFER_HEADER &&
            bh_package_crc32(checked, size) == get32(request + 20)) {
            transfer->dispatching = true;
            result = handle(transfer, operation, session, get32(request + 12),
                request + BH_TRANSFER_HEADER, payload_size, now);
            transfer->dispatching = false;
        }
    }
    memcpy(reply, "BHR1", 4);
    put32(reply + 4, operation);
    put32(reply + 8, session);
    put32(reply + 12, (uint32_t)result);
    put32(reply + 16, transfer->received);
    put32(reply + 20, (uint32_t)transfer->state);
    put32(reply + 24, (uint32_t)transfer->install_result);
    put32(reply + 28, bh_package_crc32(reply, 28));
    return result;
}
