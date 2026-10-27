#include "bh_stream.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define CHECK(condition) do { if (!(condition)) { \
    fprintf(stderr, "FAIL %u: %s\n", (unsigned)__LINE__, #condition); return EXIT_FAILURE; \
} } while (0)
static bh_stream stream;
static bh_transfer transfer;
static uint8_t staging[BH_TRANSFER_PACKAGE_MAX], reply[BH_TRANSFER_REPLY];
static unsigned installs;
static int install(void *context, const uint8_t *package, size_t size)
{
    (void)context; (void)package; (void)size;
    ++installs;
    return 0;
}
static void put32(uint8_t *p, uint32_t n)
{
    for (unsigned i = 0; i < 4; ++i) p[i] = (uint8_t)(n >> (i * 8u));
}
static void frame(uint8_t *bytes, size_t size, uint32_t op)
{
    memset(bytes, 0, size);
    memcpy(bytes, "BHT1", 4);
    put32(bytes + 4, op); put32(bytes + 8, 7);
    put32(bytes + 16, (uint32_t)size - BH_TRANSFER_HEADER);
}
static void crc(uint8_t *bytes, size_t size)
{
    put32(bytes + 20, 0);
    put32(bytes + 20, bh_package_crc32(bytes, size));
}
static int feed(const uint8_t *bytes, size_t size, uint32_t now, unsigned expected)
{
    unsigned replies = 0;
    for (size_t i = 0; i < size; ++i) {
        const bh_stream_result result = bh_stream_push(&stream, bytes[i], now, reply);
        CHECK(result != BH_STREAM_INVALID && result != BH_STREAM_BUSY);
        if (result == BH_STREAM_REPLY) {
            ++replies;
            CHECK(memcmp(reply, "BHR1", 4) == 0);
        }
        CHECK(stream.used < sizeof(stream.bytes));
    }
    CHECK(replies == expected);
    return EXIT_SUCCESS;
}
int main(void)
{
    CHECK(bh_transfer_init(&transfer, staging, sizeof(staging), 3, NULL, install) == 0);
    CHECK(bh_stream_init(&stream, &transfer) == 0);
    uint8_t begin[32];
    frame(begin, sizeof(begin), BH_TRANSFER_BEGIN);
    put32(begin + 24, 320); put32(begin + 28, 123);
    crc(begin, sizeof(begin));
    CHECK(feed(begin, sizeof(begin), 0, 1) == EXIT_SUCCESS);
    CHECK(transfer.state == BH_TRANSFER_RECEIVING);
    uint8_t status[24]; frame(status, sizeof(status), BH_TRANSFER_STATUS); crc(status, sizeof(status));
    for (size_t split = 0; split <= sizeof(status); ++split) {
        CHECK(feed(status, split, 10, split == sizeof(status) ? 1u : 0u) == EXIT_SUCCESS);
        CHECK(feed(status + split, sizeof(status) - split, 11, split == sizeof(status) ? 0u : 1u) == EXIT_SUCCESS);
    }
    uint8_t combined[48]; memcpy(combined, status, 24); memcpy(combined + 24, status, 24);
    CHECK(feed(combined, sizeof(combined), 12, 2) == EXIT_SUCCESS);
    uint8_t bad[24]; memcpy(bad, status, 24); bad[20] ^= 1;
    CHECK(feed(bad, sizeof(bad), 13, 0) == EXIT_SUCCESS);
    CHECK(feed(status, sizeof(status), 14, 1) == EXIT_SUCCESS);
    frame(bad, sizeof(bad), BH_TRANSFER_STATUS); put32(bad + 16, UINT32_MAX);
    CHECK(feed(bad, sizeof(bad), 15, 0) == EXIT_SUCCESS);
    CHECK(feed(status, sizeof(status), 16, 1) == EXIT_SUCCESS);
    CHECK(feed(status, 10, UINT32_MAX - 100u, 0) == EXIT_SUCCESS);
    CHECK(bh_stream_poll(&stream, 898) == BH_STREAM_WAITING);
    CHECK(bh_stream_poll(&stream, 899) == BH_STREAM_EXPIRED && stream.used == 0);
    CHECK(transfer.state == BH_TRANSFER_RECEIVING && transfer.received == 0);
    CHECK(feed(status, sizeof(status), 900, 1) == EXIT_SUCCESS);
    uint8_t data[152]; frame(data, sizeof(data), BH_TRANSFER_DATA);
    memcpy(data + 24, status, sizeof(status)); crc(data, sizeof(data));
    CHECK(feed(data, sizeof(data), 901, 1) == EXIT_SUCCESS);
    CHECK(transfer.received == 128 && memcmp(staging, status, sizeof(status)) == 0);
    uint32_t random = 1;
    for (unsigned i = 0; i < 100000; ++i) {
        random = random * 1664525u + 1013904223u;
        CHECK(bh_stream_push(&stream, (uint8_t)(random >> 24), 902, reply) != BH_STREAM_REPLY);
        CHECK(stream.used < sizeof(stream.bytes));
    }
    CHECK(bh_stream_poll(&stream, 1902) == BH_STREAM_EXPIRED);
    CHECK(feed(status, sizeof(status), 1903, 1) == EXIT_SUCCESS);
    CHECK(installs == 0 && transfer.received == 128);
    stream.dispatching = true;
    CHECK(bh_stream_push(&stream, 0, 1904, reply) == BH_STREAM_BUSY);
    CHECK(bh_stream_poll(&stream, 1904) == BH_STREAM_BUSY);
    stream.dispatching = false;
    CHECK(bh_stream_push(&stream, 0, 1904, NULL) == BH_STREAM_INVALID);
    CHECK(bh_stream_init(NULL, &transfer) == -1);
    puts("BHT1 stream: split/coalesced frames, CRC resync, lengths, timeout wrap, nested magic and 100000 noise bytes passed");
    return EXIT_SUCCESS;
}
