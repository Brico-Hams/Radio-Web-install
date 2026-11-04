#include "bands.h"
#include "loot.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHECK(expression) do { if (!(expression)) { \
    fprintf(stderr, "FAIL line %d: %s\n", __LINE__, #expression); return EXIT_FAILURE; \
} } while (0)

int main(void)
{
    for (uint8_t i = 0; i < BH_BAND_COUNT; ++i) {
        bh_spectrum_config config;
        CHECK(bh_band_config(i, &config));
        CHECK(bh_band_name(i) != NULL && strlen(bh_band_name(i)) <= 8);
        CHECK(config.bins == 128 && config.samples_per_bin == 1 && config.settle_ms == 20);
        CHECK(config.step_10hz == 625 || config.step_10hz == 1250);
        const uint32_t last = config.first_10hz + 127U * config.step_10hz;
        CHECK(bh_band_rx_allowed(config.first_10hz, last));
        CHECK(bh_spectrum_config_valid(&config));
        for (uint8_t j = (uint8_t)(i + 1U); j < BH_BAND_COUNT; ++j)
            CHECK(strcmp(bh_band_name(i), bh_band_name(j)) != 0);
    }
    bh_spectrum_config untouched = {1, 2, 3, 4, 5};
    const bh_spectrum_config before = untouched;
    CHECK(!bh_band_config(BH_BAND_COUNT, &untouched) && memcmp(&untouched, &before, sizeof(before)) == 0);
    CHECK(!bh_band_config(0, NULL) && bh_band_name(BH_BAND_COUNT) == NULL);

    CHECK(bh_band_rx_allowed(13600000, 17400000) && bh_band_rx_allowed(40000000, 47000000));
    CHECK(!bh_band_rx_allowed(13599999, 14000000) && !bh_band_rx_allowed(14000000, 17400001));
    CHECK(!bh_band_rx_allowed(17400000, 40000000) && !bh_band_rx_allowed(39999999, 40000000));
    CHECK(!bh_band_rx_allowed(46000000, 47000001) && !bh_band_rx_allowed(14500000, 14400000));
    // Karina presets outside the supported RX limits (CB, airband, 23 cm...) are not offered.
    CHECK(!bh_band_rx_allowed(2697500, 2799900) && !bh_band_rx_allowed(11500000, 14000000));
    CHECK(!bh_band_rx_allowed(124000000, 130000000));

    bh_loot loot;
    uint32_t value = 0;
    bh_loot_clear(&loot);
    CHECK(loot.count == 0 && !bh_loot_get(&loot, 0, &value));
    CHECK(!bh_loot_add(&loot, 0) && !bh_loot_add(NULL, 1) && loot.count == 0);
    CHECK(bh_loot_add(&loot, 14500000) && bh_loot_add(&loot, 43800000) && bh_loot_add(&loot, 44600625));
    CHECK(loot.count == 3 && bh_loot_get(&loot, 0, &value) && value == 44600625);
    CHECK(bh_loot_get(&loot, 2, &value) && value == 14500000 && !bh_loot_get(&loot, 3, &value));
    CHECK(bh_loot_add(&loot, 14500000) && loot.count == 3);
    CHECK(bh_loot_get(&loot, 0, &value) && value == 14500000);
    CHECK(bh_loot_get(&loot, 1, &value) && value == 44600625);
    CHECK(bh_loot_get(&loot, 2, &value) && value == 43800000);
    CHECK(!bh_loot_get(&loot, 0, NULL) && !bh_loot_get(NULL, 0, &value));

    bh_loot_clear(&loot);
    for (uint32_t i = 1; i <= BH_LOOT_MAX + 5U; ++i)
        CHECK(bh_loot_add(&loot, 14000000U + i));
    CHECK(loot.count == BH_LOOT_MAX);
    CHECK(bh_loot_get(&loot, 0, &value) && value == 14000000U + BH_LOOT_MAX + 5U);
    CHECK(bh_loot_get(&loot, BH_LOOT_MAX - 1U, &value) && value == 14000006U);
    CHECK(bh_loot_add(&loot, 14000006U) && loot.count == BH_LOOT_MAX);
    CHECK(bh_loot_get(&loot, 0, &value) && value == 14000006U);
    CHECK(bh_loot_get(&loot, BH_LOOT_MAX - 1U, &value) && value == 14000007U);
    for (uint8_t i = 0; i < loot.count; ++i)
        for (uint8_t j = (uint8_t)(i + 1U); j < loot.count; ++j)
            CHECK(loot.frequency_10hz[i] != loot.frequency_10hz[j]);
    loot.count = BH_LOOT_MAX + 1U;
    CHECK(!bh_loot_add(&loot, 1) && !bh_loot_get(&loot, 0, &value));
    puts("Band presets and loot: limits, ordering, deduplication and overflow checked");
    return EXIT_SUCCESS;
}
