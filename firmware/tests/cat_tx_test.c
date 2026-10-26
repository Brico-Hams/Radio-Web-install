#include "cat_tx.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHECK(value) do { if (!(value)) { \
    fprintf(stderr, "FAIL %d: %s\n", __LINE__, #value); return EXIT_FAILURE; \
} } while (0)

static uint32_t flags(const uint8_t *reply)
{
    return (uint32_t)reply[8] | (uint32_t)reply[9] << 8 | (uint32_t)reply[10] << 16 | (uint32_t)reply[11] << 24;
}

int main(void)
{
    bh_cat_tx state = {0};
    uint8_t reply[BH_CAT_TX_REPLY_SIZE];
    uint8_t request[BH_CAT_TX_REQUEST_SIZE] = {1, 0, 0x34, 0x12, 0, 0, 0, 0};
    bh_cat_tx_request(&state, request, sizeof(request), 0, reply);
    CHECK(reply[0] == 1 && reply[1] == BH_CAT_TX_OK && reply[2] == 0x34 && reply[3] == 0x12);
    CHECK(reply[4] == 8 && flags(reply) == 0);

    /* The host cannot key a radio that was not armed on its keypad. */
    request[1] = 1;
    bh_cat_tx_request(&state, request, sizeof(request), 0, reply);
    CHECK(reply[1] == BH_CAT_TX_NOT_ARMED && !state.requested);
    CHECK(bh_cat_tx_poll(&state, 0) == BH_CAT_TX_NONE);

    /* Malformed requests never change state. */
    bh_cat_tx_arm(&state, true);
    for (unsigned length = 0; length < 256; ++length) {
        if (length == BH_CAT_TX_REQUEST_SIZE) continue;
        const bh_cat_tx before = state;
        bh_cat_tx_request(&state, request, (uint16_t)length, 0, reply);
        CHECK(reply[1] == BH_CAT_TX_BAD_LENGTH && memcmp(&before, &state, sizeof(state)) == 0);
    }
    bh_cat_tx_request(&state, NULL, BH_CAT_TX_REQUEST_SIZE, 0, reply);
    CHECK(reply[1] == BH_CAT_TX_BAD_LENGTH);
    request[0] = 2;
    bh_cat_tx_request(&state, request, sizeof(request), 0, reply);
    CHECK(reply[1] == BH_CAT_TX_BAD_VERSION && !state.requested);
    request[0] = 1; request[1] = 3;
    bh_cat_tx_request(&state, request, sizeof(request), 0, reply);
    CHECK(reply[1] == BH_CAT_TX_BAD_OPERATION);
    request[1] = 1; request[7] = 1;
    bh_cat_tx_request(&state, request, sizeof(request), 0, reply);
    CHECK(reply[1] == BH_CAT_TX_BAD_LENGTH && !state.requested);
    request[7] = 0;

    /* Key, renew within the lease, then the lease runs out. */
    bh_cat_tx_request(&state, request, sizeof(request), 100, reply);
    CHECK(reply[1] == BH_CAT_TX_QUEUED && (flags(reply) & 5) == 5);
    CHECK(bh_cat_tx_poll(&state, 110) == BH_CAT_TX_KEY);
    bh_cat_tx_keyed(&state, 0, 110);
    CHECK(bh_cat_tx_poll(&state, 120) == BH_CAT_TX_NONE);
    bh_cat_tx_request(&state, request, sizeof(request), 1500, reply);
    CHECK(reply[1] == BH_CAT_TX_OK && (flags(reply) & 7) == 3);
    CHECK(reply[12] == (uint8_t)(1390 & 255) && reply[13] == (uint8_t)(1390 >> 8));
    CHECK(bh_cat_tx_poll(&state, 1500 + BH_CAT_TX_LEASE_MS - 1) == BH_CAT_TX_NONE);
    CHECK(bh_cat_tx_poll(&state, 1500 + BH_CAT_TX_LEASE_MS) == BH_CAT_TX_UNKEY);
    bh_cat_tx_unkeyed(&state);
    CHECK(!state.keyed && !state.requested && state.armed);

    /* Explicit unkey is honoured even while keyed. */
    bh_cat_tx_request(&state, request, sizeof(request), 4000, reply);
    CHECK(bh_cat_tx_poll(&state, 4000) == BH_CAT_TX_KEY);
    bh_cat_tx_keyed(&state, 0, 4000);
    request[1] = 2;
    bh_cat_tx_request(&state, request, sizeof(request), 4100, reply);
    CHECK(reply[1] == BH_CAT_TX_QUEUED && bh_cat_tx_poll(&state, 4100) == BH_CAT_TX_UNKEY);
    bh_cat_tx_unkeyed(&state);

    /* A stale queued key expires before it is ever applied. */
    request[1] = 1;
    bh_cat_tx_request(&state, request, sizeof(request), 5000, reply);
    CHECK(bh_cat_tx_poll(&state, 5000 + BH_CAT_TX_LEASE_MS) == BH_CAT_TX_NONE && !state.requested);

    /* The time cap unkeys and disarms, even with the host renewing. */
    uint32_t now = 10000;
    bh_cat_tx_request(&state, request, sizeof(request), now, reply);
    CHECK(bh_cat_tx_poll(&state, now) == BH_CAT_TX_KEY);
    bh_cat_tx_keyed(&state, 0, now);
    const uint32_t start = now;
    int action = BH_CAT_TX_NONE;
    while (action == BH_CAT_TX_NONE) {
        now += 1000;
        bh_cat_tx_request(&state, request, sizeof(request), now, reply);
        action = bh_cat_tx_poll(&state, now);
    }
    CHECK(action == BH_CAT_TX_UNKEY && now - start == BH_CAT_TX_MAX_MS);
    bh_cat_tx_unkeyed(&state);
    CHECK(!state.armed && state.limit);
    bh_cat_tx_request(&state, request, sizeof(request), now, reply);
    CHECK(reply[1] == BH_CAT_TX_LIMIT && (flags(reply) & 8) == 8);
    CHECK(bh_cat_tx_poll(&state, now) == BH_CAT_TX_NONE);

    /* The radio's own gates (band, TX lock, battery) refuse until re-armed. */
    bh_cat_tx_arm(&state, true);
    CHECK(!state.limit);
    bh_cat_tx_request(&state, request, sizeof(request), now, reply);
    CHECK(bh_cat_tx_poll(&state, now) == BH_CAT_TX_KEY);
    bh_cat_tx_keyed(&state, 3, now);
    CHECK(!state.keyed && bh_cat_tx_poll(&state, now) == BH_CAT_TX_NONE);
    bh_cat_tx_request(&state, request, sizeof(request), now, reply);
    CHECK(reply[1] == BH_CAT_TX_DENIED && reply[9] == 3 && !state.requested);
    bh_cat_tx_arm(&state, false);
    CHECK(state.denied_state == 0 && !state.armed);
    puts("cat_tx ok");
    return EXIT_SUCCESS;
}
