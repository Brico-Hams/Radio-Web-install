#include "cat_rx.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

extern uint8_t bh_test_flash[0x10000];
extern unsigned bh_test_flash_writes;
extern unsigned bh_test_flash_erases;

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
    CHECK(reply[4] == 15 && reply[12] == 0);
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
    /* Lease renewal with the same frequency refreshes the lease but must not queue a retune. */
    bh_cat_rx lease = {0};
    CHECK(bh_cat_start(&lease, 43500000));
    request[1] = 1;
    for (unsigned i = 0; i < 4; ++i) request[4 + i] = (uint8_t)(target >> (i * 8U));
    bh_cat_request(&lease, request, sizeof(request), 100, reply);
    CHECK(reply[1] == 1 && lease.pending && lease.remote);
    bh_cat_applied(&lease);
    bh_cat_request(&lease, request, sizeof(request), 1100, reply);
    CHECK(reply[1] == 1 && !lease.pending && lease.remote && lease.last_command == 1100);
    CHECK(!bh_cat_expire(&lease, 4000) && bh_cat_expire(&lease, 4100));
    bh_cat_applied(&lease);
    /* Stop while already local is a harmless no-op and keeps the local tuning. */
    bh_cat_local(&lease, 43500200);
    request[1] = 2; memset(&request[4], 0, 4);
    bh_cat_request(&lease, request, sizeof(request), 5000, reply);
    CHECK(reply[1] == 1 && !lease.pending && lease.applied == 43500200);
    /* Not armed answers a status that still reports the idle flags, for host polling. */
    bh_cat_stop(&lease);
    request[1] = 0;
    bh_cat_request(&lease, request, sizeof(request), 6000, reply);
    CHECK(reply[1] == 0 && reply[12] == 0);
    request[1] = 1;
    for (unsigned i = 0; i < 4; ++i) request[4 + i] = (uint8_t)(target >> (i * 8U));
    bh_cat_request(&lease, request, sizeof(request), 6001, reply);
    CHECK(reply[1] == 5 && !lease.pending);

    /* "CAT remoto" persistence: erased and corrupt flash read as OFF, a set persists only the flag. */
    memset(bh_test_flash, 0xff, sizeof(bh_test_flash));
    bh_cat_remote_init();
    CHECK(!bh_cat_remote_enabled);
    CHECK(bh_cat_remote_set(true) && bh_cat_remote_enabled && bh_test_flash_writes == 1);
    CHECK(bh_test_flash[0xF008] == 0xCA && bh_test_flash[0xF009] == 1 && bh_test_flash[0xF00A] == 0xFE);
    CHECK(bh_test_flash[0xF000] == 0xFF && bh_test_flash[0xF00C] == 0xFF);
    CHECK(bh_cat_remote_set(true) && bh_test_flash_writes == 1); /* Unchanged: no flash write. */
    CHECK(bh_cat_remote_set(false) && !bh_cat_remote_enabled && bh_test_flash[0xF009] == 0);
    bh_test_flash[0xF00A] = 0x00; /* Corrupt complement. */
    bh_test_flash[0xF009] = 1;
    CHECK(bh_cat_remote_set(true) && bh_test_flash[0xF00A] == 0xFE);

    /* Global arming (normal VFO screen, no key 8): the flag arms, queued leases tune, nominal follows the VFO. */
    bh_cat_remote_enabled = true;
    bh_cat_rx g = {0};
    uint32_t tune = 0;
    const uint32_t vfo = 14500000, vfo2 = 14600000, rx = 43500000;
    CHECK(!bh_cat_global_tick(&g, true, false, true, vfo, 0, &tune));
    CHECK(g.active && !g.remote && g.nominal == vfo);
    CHECK(!bh_cat_global_tick(&g, true, false, true, vfo2, 10, &tune) && g.nominal == vfo2);
    CHECK(!bh_cat_global_tick(&g, true, false, false, vfo, 20, &tune) && g.nominal == vfo2); /* Not main screen. */
    request[1] = 1;
    for (unsigned i = 0; i < 4; ++i) request[4 + i] = (uint8_t)(rx >> (i * 8U));
    bh_cat_request(&g, request, sizeof(request), 100, reply);
    CHECK(reply[1] == 1 && reply[4] == 15 && (reply[12] & 8));
    CHECK(bh_cat_global_tick(&g, true, false, true, vfo2, 110, &tune) && tune == rx && g.applied == rx && g.remote);
    CHECK(!bh_cat_global_tick(&g, true, false, true, vfo, 120, &tune) && g.nominal == vfo2); /* No follow while remote. */
    /* Same-frequency renewal keeps the lease and does not retune. */
    bh_cat_request(&g, request, sizeof(request), 1000, reply);
    CHECK(!bh_cat_global_tick(&g, true, false, true, vfo2, 1010, &tune) && g.remote);
    /* Lease expiry restores the user's VFO frequency. */
    CHECK(!bh_cat_global_tick(&g, true, false, true, vfo2, 3999, &tune));
    CHECK(bh_cat_global_tick(&g, true, false, true, vfo2, 4000, &tune) && tune == vfo2 && !g.remote && g.applied == vfo2);
    /* Op 2 restores. */
    bh_cat_request(&g, request, sizeof(request), 5000, reply);
    CHECK(bh_cat_global_tick(&g, true, false, true, vfo2, 5010, &tune) && tune == rx);
    request[1] = 2; memset(&request[4], 0, 4);
    bh_cat_request(&g, request, sizeof(request), 5100, reply);
    CHECK(reply[1] == 1 && bh_cat_global_tick(&g, true, false, true, vfo2, 5110, &tune) && tune == vfo2 && !g.remote);
    /* A key press cancels, restores, and blocks re-arming for the hold-off. */
    request[1] = 1;
    for (unsigned i = 0; i < 4; ++i) request[4 + i] = (uint8_t)(rx >> (i * 8U));
    bh_cat_request(&g, request, sizeof(request), 6000, reply);
    CHECK(bh_cat_global_tick(&g, true, false, true, vfo2, 6010, &tune) && g.remote);
    CHECK(bh_cat_global_tick(&g, true, true, true, vfo2, 6020, &tune) && tune == vfo2 && !g.active && g.holdoff);
    bh_cat_request(&g, request, sizeof(request), 6100, reply);
    CHECK(reply[1] == 5 && (reply[12] & 16) && !g.pending);
    CHECK(!bh_cat_global_tick(&g, true, false, true, vfo2, 6020 + BH_CAT_HOLDOFF_MS - 1U, &tune) && !g.active);
    CHECK(!bh_cat_global_tick(&g, true, false, true, vfo2, 6020 + BH_CAT_HOLDOFF_MS, &tune) && g.active && !g.holdoff);
    /* A key without remote control does not start a hold-off. */
    CHECK(!bh_cat_global_tick(&g, true, true, true, vfo2, 12000, &tune) && !g.holdoff);
    /* Invalid VFO frequency (e.g. 50 MHz): not armed, never tuned. */
    bh_cat_rx bad = {0};
    CHECK(!bh_cat_global_tick(&bad, true, false, true, 5000000, 0, &tune) && !bad.active);
    /* Turning the flag off while remote restores the VFO and disarms. */
    bh_cat_request(&g, request, sizeof(request), 13000, reply);
    CHECK(bh_cat_global_tick(&g, true, false, true, vfo2, 13010, &tune) && g.remote);
    bh_cat_remote_enabled = false;
    CHECK(bh_cat_global_tick(&g, false, false, true, vfo2, 13020, &tune) && tune == vfo2 && !g.active);
    bh_cat_request(&g, request, sizeof(request), 13030, reply);
    CHECK(reply[1] == 5 && !(reply[12] & 8));
    CHECK(bh_test_flash_erases == 0); /* The tuned frequency never reaches flash. */
    /* Screen change: a stale SAT-downlink nominal is rebased to the VFO; idle status reports the VFO. */
    bh_cat_rx s = {0};
    CHECK(bh_cat_start(&s, 43032500));
    bh_cat_rebase(&s, 14580000);
    CHECK(s.nominal == 14580000 && s.applied == 14580000 && s.target == 14580000 && !s.pending);
    request[1] = 0; memset(&request[4], 0, 4);
    bh_cat_request(&s, request, sizeof(request), 0, reply);
    CHECK(reply[8] == 0x20 && reply[9] == 0x79 && reply[10] == 0xDE && reply[11] == 0x00); /* 14580000 = 0x00DE7920 */
    CHECK(bh_cat_start(&s, 43032500) && !bh_cat_global_tick(&s, true, false, true, 40000000, 0, &tune));
    CHECK(s.nominal == 40000000 && s.applied == 40000000);
    /* Remote then release returns to the rebased VFO, not the old downlink. */
    bh_cat_start(&s, 43032500);
    bh_cat_rebase(&s, 14500000);
    request[1] = 1;
    for (unsigned i = 0; i < 4; ++i) request[4 + i] = (uint8_t)(14580000U >> (i * 8U));
    bh_cat_request(&s, request, sizeof(request), 10, reply);
    bh_cat_rebase(&s, 43032500); /* A remote lease keeps its target but rebases the nominal. */
    CHECK(s.remote && s.target == 14580000 && s.nominal == 43032500);
    bh_cat_rebase(&s, 14500000);
    request[1] = 2; memset(&request[4], 0, 4);
    bh_cat_request(&s, request, sizeof(request), 20, reply);
    CHECK(bh_cat_global_tick(&s, true, false, true, 14500000, 30, &tune) && tune == 14500000 && s.applied == 14500000);
    puts("CAT RX protocol checks passed; no hardware validation");
    return EXIT_SUCCESS;
}
