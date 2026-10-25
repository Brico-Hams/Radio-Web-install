#include "cat_rx.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHECK(value) do { if (!(value)) { \
    fprintf(stderr, "FAIL %d: %s\n", __LINE__, #value); return EXIT_FAILURE; \
} } while (0)

int main(void)
{
    bh_cat_rx state = {0};
    uint8_t reply[BH_CAT_REPLY_SIZE];
    uint8_t request[BH_CAT_REQUEST_SIZE] = {1, 0, 0x34, 0x12, 0, 0, 0, 0};
    bh_cat_request(&state, request, sizeof(request), 0, reply);
    CHECK(reply[0] == 1 && reply[1] == 0 && reply[2] == 0x34 && reply[3] == 0x12);
    CHECK(reply[4] == 7 && reply[12] == 0);
    request[1] = 2;
    bh_cat_request(&state, request, sizeof(request), 0, reply);
    CHECK(reply[1] == 5);
    CHECK(bh_cat_start(&state, 43500000));
    CHECK(state.active && state.applied == 43500000);
    for (unsigned length = 0; length < 256; ++length) {
        if (length == BH_CAT_REQUEST_SIZE) continue;
        const bh_cat_rx before = state;
        bh_cat_request(&state, request, (uint16_t)length, 0, reply);
        CHECK(reply[1] == 2 && memcmp(&before, &state, sizeof(state)) == 0);
    }
    bh_cat_request(&state, NULL, BH_CAT_REQUEST_SIZE, 0, reply);
    CHECK(reply[1] == 2);
    request[0] = 2;
    bh_cat_request(&state, request, sizeof(request), 0, reply);
    CHECK(reply[1] == 3);
    request[0] = 1; request[1] = 3;
    bh_cat_request(&state, request, sizeof(request), 0, reply);
    CHECK(reply[1] == 4);
    request[1] = 1;
    bh_cat_request(&state, request, sizeof(request), 0, reply);
    CHECK(reply[1] == 6 && !state.remote && !state.pending);
    const uint32_t target = 14580000;
    for (unsigned i = 0; i < 4; ++i) request[4 + i] = (uint8_t)(target >> (i * 8U));
    const uint32_t start = UINT32_MAX - 2000U;
    bh_cat_request(&state, request, sizeof(request), start, reply);
    CHECK(reply[1] == 1 && reply[12] == 7 && state.target == target && state.applied == 43500000);
    bh_cat_applied(&state);
    CHECK(state.applied == target && !state.pending);
    CHECK(!bh_cat_expire(&state, start + 2999U));
    request[1] = 0; memset(&request[4], 0, 4);
    bh_cat_request(&state, request, sizeof(request), start + 2999U, reply);
    CHECK(reply[1] == 0 && state.last_command == start);
    CHECK(bh_cat_expire(&state, start + 3000U));
    CHECK(state.pending && !state.remote && state.target == state.nominal);
    CHECK(!bh_cat_expire(&state, start + 4000U));
    bh_cat_applied(&state);
    CHECK(state.applied == 43500000);
    request[1] = 1;
    for (unsigned i = 0; i < 4; ++i) request[4 + i] = (uint8_t)(target >> (i * 8U));
    bh_cat_request(&state, request, sizeof(request), 50, reply);
    bh_cat_request(&state, request, sizeof(request), 2500, reply);
    CHECK(!bh_cat_expire(&state, 4000) && state.last_command == 2500);
    request[1] = 2;
    bh_cat_request(&state, request, sizeof(request), 4100, reply);
    CHECK(reply[1] == 2 && state.remote);
    memset(&request[4], 0, 4);
    bh_cat_request(&state, request, sizeof(request), 4100, reply);
    CHECK(reply[1] == 1 && !state.remote && state.pending && state.target == 43500000);
    bh_cat_local(&state, 43500100);
    CHECK(!state.pending && !state.remote && state.applied == 43500100);
    bh_cat_stop(&state);
    CHECK(!state.active && !state.pending && state.applied == 0);
    CHECK(!bh_cat_start(&state, 11800000));
    CHECK(!state.active);
    const uint32_t valid[] = {13600000, 17400000, 40000000, 47000000};
    const uint32_t invalid[] = {0, 13599999, 17400001, 39999999, 47000001, UINT32_MAX};
    for (unsigned i = 0; i < sizeof(valid) / sizeof(valid[0]); ++i) CHECK(bh_cat_frequency_valid(valid[i]));
    for (unsigned i = 0; i < sizeof(invalid) / sizeof(invalid[0]); ++i) CHECK(!bh_cat_frequency_valid(invalid[i]));
    puts("CAT RX protocol checks passed; no hardware validation");
    return EXIT_SUCCESS;
}
