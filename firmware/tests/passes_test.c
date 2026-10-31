#include "passes.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

extern uint8_t bh_test_flash[0x10000];
extern unsigned bh_test_flash_erases;

#define CHECK(expression) do { if (!(expression)) { \
    fprintf(stderr, "FAIL line %d: %s\n", __LINE__, #expression); return EXIT_FAILURE; \
} } while (0)

static void put16(uint8_t *out, uint16_t value)
{
    out[0] = (uint8_t)value;
    out[1] = (uint8_t)(value >> 8);
}

static void put32(uint8_t *out, uint32_t value)
{
    for (unsigned i = 0; i < 4; ++i)
        out[i] = (uint8_t)(value >> (i * 8U));
}

static void entry(uint8_t *out, uint32_t norad, const char *name, uint32_t aos)
{
    memset(out, 0, BH_PASS_ENTRY_BYTES);
    put32(&out[0], norad);
    memcpy(&out[4], name, strlen(name));
    put32(&out[12], aos);
    put16(&out[16], 300);
    put16(&out[18], 600);
    out[20] = 45;
    put16(&out[22], 350);
    put16(&out[24], 120);
    put32(&out[28], 14580000U);
}

static uint16_t request(uint8_t *frame, uint8_t op, uint32_t host_time, uint8_t index, uint8_t count)
{
    memset(frame, 0, BH_PASS_REQUEST_HEADER);
    frame[0] = 1;
    frame[1] = op;
    put32(&frame[6], host_time);
    frame[10] = index;
    frame[11] = count;
    return (uint16_t)(BH_PASS_REQUEST_HEADER + (op == BH_PASS_OP_WRITE ? count * BH_PASS_ENTRY_BYTES : 0U));
}

int main(void)
{
    memset(bh_test_flash, 0x5a, sizeof(bh_test_flash));
    uint8_t frame[BH_PASS_REQUEST_HEADER + BH_PASS_FRAME_MAX * BH_PASS_ENTRY_BYTES];
    uint8_t reply[BH_PASS_REPLY_MAX];
    CHECK(bh_pass_count() == 0 && bh_pass_clock(1000) == 0);

    /* Session timestamp mismatch: nothing changes, not even the clock. */
    uint16_t length = request(frame, BH_PASS_OP_CLEAR, 1761955200U, 0, 0);
    CHECK(BH_PASS_Request(frame, length, false, 0, reply) == BH_PASS_REPLY_HEADER);
    CHECK(reply[1] == BH_PASS_STATUS_AUTH && bh_test_flash_erases == 0 && bh_pass_clock(0) == 0);

    CHECK(BH_PASS_Request(frame, length, true, 5000, reply) == BH_PASS_REPLY_HEADER);
    CHECK(reply[0] == 1 && reply[1] == BH_PASS_STATUS_OK && reply[3] == 0 && bh_test_flash_erases == 1);
    CHECK(bh_pass_clock(65000) == 1761955260U);
    CHECK(reply[10] == BH_PASS_MAX && reply[11] == BH_PASS_ENTRY_BYTES);
    CHECK(bh_test_flash[BH_PASS_FLASH_ADDR] == 0xff && bh_test_flash[BH_PASS_FLASH_ADDR - 1] == 0x5a);

    length = request(frame, BH_PASS_OP_WRITE, 0, 0, 2);
    entry(&frame[12], 43017, "AO-91", 1761958800U);
    entry(&frame[44], 25544, "ISS", 1761962400U);
    CHECK(BH_PASS_Request(frame, length, true, 5000, reply) == BH_PASS_REPLY_HEADER);
    CHECK(reply[1] == BH_PASS_STATUS_OK && reply[3] == 0);
    CHECK(BH_PASS_Request(frame, (uint16_t)(length - 1), true, 0, reply) && reply[1] == BH_PASS_STATUS_LENGTH);

    /* Invalid entries are refused before flash is written. */
    length = request(frame, BH_PASS_OP_WRITE, 0, 2, 1);
    entry(&frame[12], 1, "BAD", 1761966000U);
    frame[12 + 20] = 91;
    CHECK(BH_PASS_Request(frame, length, true, 0, reply) && reply[1] == BH_PASS_STATUS_ENTRY);
    CHECK(bh_test_flash[BH_PASS_FLASH_ADDR + BH_PASS_ENTRIES_OFFSET + 2 * BH_PASS_ENTRY_BYTES] == 0xff);
    entry(&frame[12], 1, "BAD", 1761966000U);
    put32(&frame[12 + 28], 53000000U); /* 530 MHz is outside the RX bands. */
    CHECK(BH_PASS_Request(frame, length, true, 0, reply) && reply[1] == BH_PASS_STATUS_ENTRY);
    entry(&frame[12], 1, "B\x01", 1761966000U);
    CHECK(BH_PASS_Request(frame, length, true, 0, reply) && reply[1] == BH_PASS_STATUS_ENTRY);

    /* Range limits. */
    length = request(frame, BH_PASS_OP_WRITE, 0, 63, 2);
    CHECK(BH_PASS_Request(frame, length, true, 0, reply) && reply[1] == BH_PASS_STATUS_RANGE);
    length = request(frame, BH_PASS_OP_WRITE, 0, 0, 5);
    CHECK(BH_PASS_Request(frame, length, true, 0, reply) && reply[1] == BH_PASS_STATUS_RANGE);

    /* Commit verifies every entry before publishing the header. */
    length = request(frame, BH_PASS_OP_COMMIT, 0, 0, 3);
    CHECK(BH_PASS_Request(frame, length, true, 0, reply) && reply[1] == BH_PASS_STATUS_VERIFY && reply[3] == 0);
    length = request(frame, BH_PASS_OP_COMMIT, 0, 0, 65);
    CHECK(BH_PASS_Request(frame, length, true, 0, reply) && reply[1] == BH_PASS_STATUS_RANGE);
    length = request(frame, BH_PASS_OP_COMMIT, 0, 0, 2);
    CHECK(BH_PASS_Request(frame, length, true, 0, reply) && reply[1] == BH_PASS_STATUS_OK && reply[3] == 2);
    CHECK(bh_pass_count() == 2);

    bh_pass pass;
    CHECK(bh_pass_read(1, &pass) && pass.norad == 25544 && strcmp(pass.name, "ISS") == 0);
    CHECK(pass.aos == 1761962400U && pass.tca_offset == 300 && pass.los_offset == 600);
    CHECK(pass.max_elevation == 45 && pass.aos_azimuth == 350 && pass.los_azimuth == 120);
    CHECK(pass.downlink_10hz == 14580000U && !bh_pass_read(2, &pass) && !bh_pass_read(64, &pass));

    length = request(frame, BH_PASS_OP_READ, 0, 0, 2);
    CHECK(BH_PASS_Request(frame, length, true, 0, reply) == BH_PASS_REPLY_HEADER + 2 * BH_PASS_ENTRY_BYTES);
    CHECK(reply[1] == BH_PASS_STATUS_OK && memcmp(&reply[12 + 4], "AO-91", 5) == 0);
    frame[0] = 2;
    CHECK(BH_PASS_Request(frame, length, true, 0, reply) == BH_PASS_REPLY_HEADER && reply[1] == BH_PASS_STATUS_VERSION);
    frame[0] = 1;
    frame[1] = 9;
    CHECK(BH_PASS_Request(frame, length, true, 0, reply) && reply[1] == BH_PASS_STATUS_OP);
    CHECK(BH_PASS_Request(NULL, 0, true, 0, reply) && reply[1] == BH_PASS_STATUS_LENGTH);

    /* A corrupted header hides the table instead of showing garbage. */
    bh_test_flash[BH_PASS_FLASH_ADDR + 6] ^= 1;
    CHECK(bh_pass_count() == 0);
    bh_test_flash[BH_PASS_FLASH_ADDR + 6] ^= 1;
    length = request(frame, BH_PASS_OP_CLEAR, 0, 0, 0);
    CHECK(BH_PASS_Request(frame, length, true, 0, reply) && reply[3] == 0 && bh_pass_count() == 0);

    uint8_t day, hour, minute;
    bh_pass_civil(1761958800U, &day, &hour, &minute); /* 2025-11-01 01:00:00 UTC */
    CHECK(day == 1 && hour == 1 && minute == 0);
    bh_pass_civil(1709208000U, &day, &hour, &minute); /* 2024-02-29 12:00:00 UTC */
    CHECK(day == 29 && hour == 12 && minute == 0);
    bh_pass_civil(0, &day, &hour, &minute);
    CHECK(day == 1 && hour == 0 && minute == 0);
    puts("passes ok");
    return EXIT_SUCCESS;
}
