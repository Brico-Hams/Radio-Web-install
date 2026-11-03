/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "passes.h"
#include "cat_rx.h"
#include "driver/py25q16.h"
#include <string.h>

static uint32_t bh_clock_unix;
static uint32_t bh_clock_ms;

static uint16_t get16(const uint8_t *in)
{
    return (uint16_t)(in[0] | (in[1] << 8));
}

static uint32_t get32(const uint8_t *in)
{
    return (uint32_t)in[0] | ((uint32_t)in[1] << 8) |
        ((uint32_t)in[2] << 16) | ((uint32_t)in[3] << 24);
}

static void put32(uint8_t *out, uint32_t value)
{
    for (unsigned i = 0; i < 4; ++i)
        out[i] = (uint8_t)(value >> (i * 8U));
}

static uint32_t entry_address(uint8_t index)
{
    return BH_PASS_FLASH_ADDR + BH_PASS_ENTRIES_OFFSET + (uint32_t)index * BH_PASS_ENTRY_BYTES;
}

bool bh_pass_decode(const uint8_t input[BH_PASS_ENTRY_BYTES], bh_pass *pass)
{
    bh_pass value;
    memset(&value, 0, sizeof(value));
    value.norad = get32(&input[0]);
    bool ended = false;
    for (unsigned i = 0; i < 8; ++i) {
        const uint8_t c = input[4 + i];
        if (c == 0)
            ended = true;
        else if (ended || c < 32 || c > 126)
            return false;
        value.name[i] = (char)c;
    }
    value.aos = get32(&input[12]);
    value.tca_offset = get16(&input[16]);
    value.los_offset = get16(&input[18]);
    value.max_elevation = input[20];
    value.aos_azimuth = get16(&input[22]);
    value.los_azimuth = get16(&input[24]);
    value.downlink_10hz = get32(&input[28]);
    if (value.norad == 0 || value.norad == UINT32_MAX || value.name[0] == '\0' ||
        value.aos == 0 || value.aos == UINT32_MAX || value.los_offset == 0 ||
        value.los_offset > BH_PASS_MAX_DURATION_S || value.tca_offset > value.los_offset ||
        value.max_elevation > 90 || value.aos_azimuth >= 360 || value.los_azimuth >= 360 ||
        input[21] != 0 || get16(&input[26]) != 0 ||
        (value.downlink_10hz != 0 && !bh_cat_frequency_valid(value.downlink_10hz)))
        return false;
    if (pass != NULL)
        *pass = value;
    return true;
}

uint8_t bh_pass_count(void)
{
    uint8_t header[8];
    PY25Q16_ReadBuffer(BH_PASS_FLASH_ADDR, header, sizeof(header));
    if (memcmp(header, BH_PASS_MAGIC, 4) != 0 || header[4] != 1 ||
        header[5] > BH_PASS_MAX || (uint8_t)~header[5] != header[6])
        return 0;
    return header[5];
}

bool bh_pass_read(uint8_t index, bh_pass *pass)
{
    if (index >= BH_PASS_MAX)
        return false;
    uint8_t raw[BH_PASS_ENTRY_BYTES];
    PY25Q16_ReadBuffer(entry_address(index), raw, sizeof(raw));
    return bh_pass_decode(raw, pass);
}

uint32_t bh_pass_clock(uint32_t now_ms)
{
    return bh_clock_unix == 0 ? 0 : bh_clock_unix + (uint32_t)(now_ms - bh_clock_ms) / 1000U;
}

void bh_pass_civil(uint32_t unix_seconds, uint8_t *day, uint8_t *hour, uint8_t *minute)
{
    /* Day of month via the proleptic Gregorian days-to-civil algorithm. */
    const uint32_t seconds = unix_seconds % 86400U;
    const uint32_t z = unix_seconds / 86400U + 719468U;
    const uint32_t doe = z % 146097U;
    const uint32_t yoe = (doe - doe / 1460U + doe / 36524U - doe / 146096U) / 365U;
    const uint32_t doy = doe - (365U * yoe + yoe / 4U - yoe / 100U);
    const uint32_t mp = (5U * doy + 2U) / 153U;
    *day = (uint8_t)(doy - (153U * mp + 2U) / 5U + 1U);
    *hour = (uint8_t)(seconds / 3600U);
    *minute = (uint8_t)(seconds / 60U % 60U);
}

static uint8_t write_entries(uint8_t index, uint8_t count, const uint8_t *entries)
{
    for (uint8_t i = 0; i < count; ++i)
        if (!bh_pass_decode(&entries[i * BH_PASS_ENTRY_BYTES], NULL))
            return BH_PASS_STATUS_ENTRY;
    PY25Q16_WriteBuffer(entry_address(index), entries,
        (uint32_t)count * BH_PASS_ENTRY_BYTES, false);
    return BH_PASS_STATUS_OK;
}

static uint8_t commit(uint8_t count)
{
    /* Read back what flash holds before the header makes it visible. */
    for (uint8_t i = 0; i < count; ++i)
        if (!bh_pass_read(i, NULL))
            return BH_PASS_STATUS_VERIFY;
    const uint8_t header[8] = {'B', 'H', 'P', 'S', 1, count, (uint8_t)~count, 0};
    PY25Q16_WriteBuffer(BH_PASS_FLASH_ADDR, header, sizeof(header), false);
    return bh_pass_count() == count ? BH_PASS_STATUS_OK : BH_PASS_STATUS_VERIFY;
}

uint16_t BH_PASS_Request(const uint8_t *request, uint16_t length, bool authenticated,
    uint32_t now_ms, uint8_t reply[BH_PASS_REPLY_MAX])
{
    memset(reply, 0, BH_PASS_REPLY_HEADER);
    reply[0] = 1;
    uint16_t size = BH_PASS_REPLY_HEADER;
    uint8_t status = BH_PASS_STATUS_OK;
    if (request == NULL || length < BH_PASS_REQUEST_HEADER) {
        status = BH_PASS_STATUS_LENGTH;
    } else {
        const uint8_t op = request[1];
        const uint8_t index = request[10];
        const uint8_t count = request[11];
        const uint32_t host_time = get32(&request[6]);
        reply[2] = op;
        reply[8] = index;
        reply[9] = count;
        if (request[0] != 1) status = BH_PASS_STATUS_VERSION;
        else if (op > BH_PASS_OP_READ) status = BH_PASS_STATUS_OP;
        else if (!authenticated) status = BH_PASS_STATUS_AUTH;
        else if (length != BH_PASS_REQUEST_HEADER +
            (op == BH_PASS_OP_WRITE ? (uint16_t)count * BH_PASS_ENTRY_BYTES : 0U))
            status = BH_PASS_STATUS_LENGTH;
        else if ((op == BH_PASS_OP_WRITE || op == BH_PASS_OP_READ) &&
            (count == 0 || count > BH_PASS_FRAME_MAX || index >= BH_PASS_MAX ||
             count > BH_PASS_MAX - index))
            status = BH_PASS_STATUS_RANGE;
        else if (op == BH_PASS_OP_COMMIT && count > BH_PASS_MAX)
            status = BH_PASS_STATUS_RANGE;
        else {
            /* A read must stay pure, and a pre-2020 host time is a broken PC clock: keep the previous clock. */
            if (host_time >= BH_PASS_MIN_HOST_UNIX && op != BH_PASS_OP_READ) {
                bh_clock_unix = host_time;
                bh_clock_ms = now_ms;
            }
            if (op == BH_PASS_OP_CLEAR) {
                PY25Q16_SectorErase(BH_PASS_FLASH_ADDR);
            } else if (op == BH_PASS_OP_WRITE) {
                status = write_entries(index, count, &request[BH_PASS_REQUEST_HEADER]);
            } else if (op == BH_PASS_OP_COMMIT) {
                status = commit(count);
            } else if (op == BH_PASS_OP_READ) {
                PY25Q16_ReadBuffer(entry_address(index), &reply[BH_PASS_REPLY_HEADER],
                    (uint32_t)count * BH_PASS_ENTRY_BYTES);
                size = (uint16_t)(size + count * BH_PASS_ENTRY_BYTES);
            }
        }
    }
    reply[1] = status;
    reply[3] = bh_pass_count();
    put32(&reply[4], bh_pass_clock(now_ms));
    reply[10] = BH_PASS_MAX;
    reply[11] = BH_PASS_ENTRY_BYTES;
    return size;
}
