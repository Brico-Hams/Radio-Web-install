#include "ardf.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHECK(expression) do { if (!(expression)) { \
    fprintf(stderr, "FAIL line %d: %s\n", __LINE__, #expression); return EXIT_FAILURE; \
} } while (0)

int main(void)
{
    bh_ardf state = {0};
    bh_ardf_view view;
    const bh_ardf_config base = {5, 60000, 5000, 0, 3, 31};
    CHECK(bh_ardf_update(&state, 0, &view) == BH_ARDF_NOT_INITIALIZED);
    CHECK(bh_ardf_init(&state, &base, 1000) == BH_ARDF_OK);
    CHECK(bh_ardf_update(&state, 1000, &view) == BH_ARDF_OK);
    CHECK(view.timed && view.fox == 1 && view.remaining_ms == 60000 && !view.end_notice);
    CHECK(bh_ardf_update(&state, 56000, &view) == BH_ARDF_OK);
    CHECK(view.fox == 1 && view.remaining_ms == 5000 && view.end_notice);
    CHECK(bh_ardf_update(&state, 61000, &view) == BH_ARDF_OK);
    CHECK(view.fox == 2 && view.elapsed_ms == 0 && !view.end_notice);
    CHECK(bh_ardf_update(&state, 301000, &view) == BH_ARDF_OK);
    CHECK(view.fox == 1 && view.remaining_ms == 60000);
    CHECK(bh_ardf_sync(&state, 4, 59999, 400000) == BH_ARDF_OK);
    CHECK(bh_ardf_update(&state, 400001, &view) == BH_ARDF_OK);
    CHECK(view.fox == 5 && view.elapsed_ms == 0);
    const bh_ardf snapshot = state;
    CHECK(bh_ardf_sync(&state, 0, 0, 1) == BH_ARDF_INVALID_SYNC);
    CHECK(memcmp(&state, &snapshot, sizeof(state)) == 0);
    CHECK(bh_ardf_sync(&state, 1, 60000, 1) == BH_ARDF_INVALID_SYNC);
    CHECK(bh_ardf_update(&state, 400002, NULL) == BH_ARDF_INVALID_CONFIG);

    CHECK(bh_ardf_sync(&state, 1, 0, UINT32_MAX - 9) == BH_ARDF_OK);
    CHECK(bh_ardf_update(&state, 10, &view) == BH_ARDF_OK);
    CHECK(view.elapsed_ms == 20);
    CHECK(bh_ardf_update(&state, 300010, &view) == BH_ARDF_OK);
    CHECK(view.fox == 1 && view.elapsed_ms == 20);

    bh_ardf_config config = base;
    config.correction_ppm = 1000;
    CHECK(bh_ardf_init(&state, &config, 0) == BH_ARDF_OK);
    for (uint32_t t = 1; t <= 1000; ++t)
        CHECK(bh_ardf_update(&state, t, &view) == BH_ARDF_OK);
    CHECK(view.elapsed_ms == 1001);
    config.correction_ppm = -1000;
    CHECK(bh_ardf_init(&state, &config, 0) == BH_ARDF_OK);
    CHECK(bh_ardf_update(&state, 1000, &view) == BH_ARDF_OK);
    CHECK(view.elapsed_ms == 999);

    uint8_t gain = 99;
    bool available = true;
    CHECK(bh_ardf_load_gain(&state, 0, 1, &gain, &available) == BH_ARDF_OK);
    CHECK(!available && gain == 99);
    CHECK(bh_ardf_save_gain(&state, 0, 1, 0) == BH_ARDF_OK);
    CHECK(bh_ardf_save_gain(&state, 1, 1, 31) == BH_ARDF_OK);
    CHECK(bh_ardf_load_gain(&state, 0, 1, &gain, &available) == BH_ARDF_OK && available && gain == 0);
    CHECK(bh_ardf_load_gain(&state, 1, 1, &gain, &available) == BH_ARDF_OK && available && gain == 31);
    CHECK(bh_ardf_save_gain(&state, 2, 1, 1) == BH_ARDF_INVALID_GAIN);
    CHECK(bh_ardf_save_gain(&state, 0, 6, 1) == BH_ARDF_INVALID_GAIN);
    CHECK(bh_ardf_save_gain(&state, 0, 1, 32) == BH_ARDF_INVALID_GAIN);
    CHECK(bh_ardf_init(&state, &state.config, 0) == BH_ARDF_OK);
    CHECK(state.config.fox_count == 5);
    CHECK(bh_ardf_load_gain(&state, 1, 1, &gain, &available) == BH_ARDF_OK && !available);
    config = base; config.remember_vfos = 1;
    CHECK(bh_ardf_init(&state, &config, 0) == BH_ARDF_OK);
    CHECK(bh_ardf_save_gain(&state, 1, 1, 2) == BH_ARDF_OK);
    CHECK(bh_ardf_load_gain(&state, 1, 1, &gain, &available) == BH_ARDF_OK && !available);

    config.fox_count = 0;
    CHECK(bh_ardf_init(&state, &config, 0) == BH_ARDF_OK);
    CHECK(bh_ardf_update(&state, UINT32_MAX, &view) == BH_ARDF_OK && !view.timed && !view.end_notice);
    CHECK(bh_ardf_sync(&state, 1, 0, 0) == BH_ARDF_INVALID_SYNC);
    config = base; config.fox_count = 10; config.duration_ms = 1000; config.end_notice_ms = 0;
    CHECK(bh_ardf_init(&state, &config, 0) == BH_ARDF_OK);
    CHECK(bh_ardf_sync(&state, 10, 0, 0) == BH_ARDF_OK);
    CHECK(bh_ardf_save_gain(&state, 1, 10, 10) == BH_ARDF_OK);
    CHECK(bh_ardf_load_gain(&state, 1, 10, &gain, &available) == BH_ARDF_OK && available && gain == 10);
    CHECK(bh_ardf_update(&state, 1000, &view) == BH_ARDF_OK && view.fox == 1 && !view.end_notice);

    config = base; config.fox_count = 11;
    CHECK(bh_ardf_init(&state, &config, 0) == BH_ARDF_INVALID_CONFIG);
    config = base; config.end_notice_ms = 30001;
    CHECK(bh_ardf_init(&state, &config, 0) == BH_ARDF_INVALID_CONFIG);
    config = base; config.duration_ms = 999;
    CHECK(bh_ardf_init(&state, &config, 0) == BH_ARDF_INVALID_CONFIG);
    config = base; config.correction_ppm = 50001;
    CHECK(bh_ardf_init(&state, &config, 0) == BH_ARDF_INVALID_CONFIG);
    config = base; config.duration_ms = 1000; config.end_notice_ms = 1001;
    CHECK(bh_ardf_init(&state, &config, 0) == BH_ARDF_INVALID_CONFIG);
    config = base; config.remember_vfos = 4;
    CHECK(bh_ardf_init(&state, &config, 0) == BH_ARDF_INVALID_CONFIG);
    config = base; config.duration_ms = 999990; config.fox_count = 10; config.correction_ppm = 50000;
    CHECK(bh_ardf_init(&state, &config, 0) == BH_ARDF_OK);
    CHECK(bh_ardf_update(&state, UINT32_MAX, &view) == BH_ARDF_OK);
    const uint64_t expected = (uint64_t)UINT32_MAX * UINT64_C(1050000) %
        (UINT64_C(999990) * 10 * UINT64_C(1000000)) / UINT64_C(1000000);
    CHECK(view.fox == expected / 999990 + 1);
    CHECK(view.elapsed_ms == expected % 999990);
    bh_ardf partitioned;
    CHECK(bh_ardf_init(&partitioned, &config, 0) == BH_ARDF_OK);
    CHECK(bh_ardf_update(&partitioned, UINT32_MAX / 2, &view) == BH_ARDF_OK);
    CHECK(bh_ardf_update(&partitioned, UINT32_MAX, &view) == BH_ARDF_OK);
    CHECK(partitioned.phase_scaled == state.phase_scaled);
    config.fox_count = 11;
    const bh_ardf before_invalid_init = state;
    CHECK(bh_ardf_init(&state, &config, 0) == BH_ARDF_INVALID_CONFIG);
    CHECK(memcmp(&state, &before_invalid_init, sizeof(state)) == 0);
    CHECK(bh_ardf_init(NULL, &base, 0) == BH_ARDF_INVALID_CONFIG);
    CHECK(bh_ardf_init(&state, NULL, 0) == BH_ARDF_INVALID_CONFIG);
    puts("ARDF core: all checks passed (not a hardware validation)");
    return EXIT_SUCCESS;
}
