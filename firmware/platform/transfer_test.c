#include "bh_transfer.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define CHECK(condition) do { if (!(condition)) { \
    fprintf(stderr, "FAIL %u: %s\n", (unsigned)__LINE__, #condition); return EXIT_FAILURE; \
} } while (0)
static bh_transfer transfer;
static uint8_t staging[BH_TRANSFER_PACKAGE_MAX], package[320];
static uint8_t request[BH_TRANSFER_HEADER + BH_TRANSFER_CHUNK], reply[BH_TRANSFER_REPLY];
static unsigned installs;
static int install_error, callback_bad;
static void put32(uint8_t *p, uint32_t n)
{
    for (unsigned i = 0; i < 4; ++i) p[i] = (uint8_t)(n >> (i * 8u));
}
static uint32_t get32(const uint8_t *p)
{
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) |
        ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}
static int install(void *context, const uint8_t *bytes, size_t size)
{
    (void)context;
    ++installs;
    if (size != sizeof(package) || memcmp(bytes, package, size) != 0) callback_bad = 1;
    uint8_t nested[BH_TRANSFER_REPLY];
    if (bh_transfer_request(&transfer, request, BH_TRANSFER_HEADER, 0, nested) != BH_TRANSFER_BUSY)
        callback_bad = 1;
    return install_error;
}
static bh_transfer_result send(uint32_t op, uint32_t session, uint32_t offset,
    const uint8_t *payload, uint32_t size, uint32_t now)
{
    memset(request, 0, sizeof(request));
    memcpy(request, "BHT1", 4);
    put32(request + 4, op); put32(request + 8, session);
    put32(request + 12, offset); put32(request + 16, size);
    if (size != 0) memcpy(request + 24, payload, size);
    put32(request + 20, bh_package_crc32(request, BH_TRANSFER_HEADER + size));
    return bh_transfer_request(&transfer, request, BH_TRANSFER_HEADER + size, now, reply);
}
static bh_transfer_result begin(uint32_t session, uint32_t now)
{
    uint8_t payload[8];
    put32(payload, sizeof(package)); put32(payload + 4, bh_package_crc32(package, sizeof(package)));
    return send(BH_TRANSFER_BEGIN, session, 0, payload, 8, now);
}
static int upload(uint32_t session, uint32_t now)
{
    CHECK(begin(session, now) == BH_TRANSFER_OK);
    for (uint32_t offset = 0; offset < sizeof(package); offset += 128u) {
        uint32_t size = (uint32_t)sizeof(package) - offset;
        if (size > 128u) size = 128u;
        CHECK(send(BH_TRANSFER_DATA, session, offset, package + offset, size, now) == BH_TRANSFER_OK);
    }
    return EXIT_SUCCESS;
}
int main(void)
{
    memcpy(package, "BHA1", 4);
    put32(package + 4, 64); put32(package + 8, BH_PACKAGE_API_VERSION);
    put32(package + 12, 1); put32(package + 16, sizeof(package) - 64);
    put32(package + 32, 3); memcpy(package + 40, "External", 8);
    put32(package + 36, bh_package_crc32(package + 64, sizeof(package) - 64));
    put32(package + 60, bh_package_crc32(package, 60));
    CHECK(bh_transfer_init(&transfer, staging, sizeof(staging), 3, NULL, install) == 0);
    CHECK(begin(0, 0) == BH_TRANSFER_BAD_FRAME);
    CHECK(begin(1, 0) == BH_TRANSFER_OK);
    CHECK(begin(2, 1) == BH_TRANSFER_BUSY);
    CHECK(send(BH_TRANSFER_COMMIT, 1, 0, NULL, 0, 2) == BH_TRANSFER_INCOMPLETE);
    CHECK(send(BH_TRANSFER_DATA, 1, 128, package, 128, 3) == BH_TRANSFER_BAD_OFFSET);
    CHECK(send(BH_TRANSFER_DATA, 2, 0, package, 128, 3) == BH_TRANSFER_BAD_SESSION);
    CHECK(send(BH_TRANSFER_DATA, 1, 0, package, 128, 4) == BH_TRANSFER_OK);
    CHECK(begin(1, 5) == BH_TRANSFER_OK && transfer.received == 128);
    CHECK(send(BH_TRANSFER_DATA, 1, 0, package, 128, 6) == BH_TRANSFER_OK && transfer.received == 128);
    uint8_t bad[128]; memcpy(bad, package, sizeof(bad)); bad[50] ^= 1;
    CHECK(send(BH_TRANSFER_DATA, 1, 0, bad, 128, 7) == BH_TRANSFER_BAD_OFFSET);
    CHECK(send(BH_TRANSFER_DATA, 1, UINT32_MAX, package, 1, 8) == BH_TRANSFER_BAD_OFFSET);
    CHECK(send(BH_TRANSFER_DATA, 1, 128, package + 128, 128, 9) == BH_TRANSFER_OK);
    CHECK(send(BH_TRANSFER_DATA, 1, 256, package + 256, 64, 10) == BH_TRANSFER_OK);
    CHECK(installs == 0);
    request[20] ^= 1;
    CHECK(bh_transfer_request(&transfer, request, 88, 11, reply) == BH_TRANSFER_BAD_FRAME);
    CHECK(transfer.received == sizeof(package));
    CHECK(send(BH_TRANSFER_COMMIT, 1, 0, NULL, 0, 12) == BH_TRANSFER_OK && installs == 1);
    CHECK(send(BH_TRANSFER_COMMIT, 1, 0, NULL, 0, 13) == BH_TRANSFER_OK && installs == 1);
    CHECK(begin(1, 14) == BH_TRANSFER_OK && installs == 1);
    CHECK(send(BH_TRANSFER_ABORT, 1, 0, NULL, 0, 15) == BH_TRANSFER_BAD_STATE);
    CHECK(memcmp(reply, "BHR1", 4) == 0 && get32(reply + 28) == bh_package_crc32(reply, 28));
    CHECK(upload(2, 20) == EXIT_SUCCESS);
    install_error = -17;
    CHECK(send(BH_TRANSFER_COMMIT, 2, 0, NULL, 0, 21) == BH_TRANSFER_INSTALL_ERROR && installs == 2);
    CHECK(get32(reply + 24) == (uint32_t)-17);
    CHECK(send(BH_TRANSFER_COMMIT, 2, 0, NULL, 0, 22) == BH_TRANSFER_INSTALL_ERROR && installs == 2);
    CHECK(send(BH_TRANSFER_STATUS, 2, 0, NULL, 0, 23) == BH_TRANSFER_OK);
    CHECK(get32(reply + 20) == BH_TRANSFER_FAILED);
    CHECK(begin(3, UINT32_MAX - 100u) == BH_TRANSFER_OK);
    CHECK(send(BH_TRANSFER_STATUS, 3, 0, NULL, 0, 29898) == BH_TRANSFER_OK);
    CHECK(send(BH_TRANSFER_STATUS, 3, 0, NULL, 0, 29899) == BH_TRANSFER_EXPIRED);
    CHECK(begin(3, 29900) == BH_TRANSFER_EXPIRED);
    CHECK(begin(4, 30000) == BH_TRANSFER_OK);
    CHECK(send(BH_TRANSFER_ABORT, 4, 0, NULL, 0, 30001) == BH_TRANSFER_OK);
    CHECK(send(BH_TRANSFER_DATA, 4, 0, package, 128, 30002) == BH_TRANSFER_BAD_STATE);
    CHECK(upload(5, 30003) == EXIT_SUCCESS);
    staging[100] ^= 1;
    CHECK(send(BH_TRANSFER_COMMIT, 5, 0, NULL, 0, 30004) == BH_TRANSFER_BAD_PACKAGE && installs == 2);
    CHECK(send(BH_TRANSFER_ABORT, 5, 0, NULL, 0, 30005) == BH_TRANSFER_OK);
    CHECK(bh_transfer_init(&transfer, staging, sizeof(staging), 1, NULL, install) == 0);
    CHECK(upload(6, 0) == EXIT_SUCCESS);
    CHECK(send(BH_TRANSFER_COMMIT, 6, 0, NULL, 0, 1) == BH_TRANSFER_BAD_PACKAGE && installs == 2);
    const bh_transfer saved = transfer;
    uint8_t malformed[BH_TRANSFER_HEADER + BH_TRANSFER_CHUNK + 1u];
    uint32_t random = 1;
    for (unsigned iteration = 0; iteration < 10000; ++iteration) {
        for (size_t i = 0; i < sizeof(malformed); ++i) {
            random = random * 1664525u + 1013904223u;
            malformed[i] = (uint8_t)(random >> 24);
        }
        malformed[0] = 0;
        CHECK(bh_transfer_request(&transfer, malformed, iteration % (sizeof(malformed) + 1u),
            2, reply) == BH_TRANSFER_BAD_FRAME);
        CHECK(memcmp(&saved, &transfer, sizeof(saved)) == 0);
    }
    CHECK(installs == 2);
    CHECK(!callback_bad);
    puts("Transfer: sequential upload, duplicate ACKs, CRC, cancellation, timeout wrap, capability and uncertain commit checks passed");
    return EXIT_SUCCESS;
}
