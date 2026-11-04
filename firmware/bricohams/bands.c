/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bands.h"
#include <stddef.h>

typedef struct {
    const char *name;
    uint32_t first_10hz;
    uint16_t step_10hz;
} bh_band_entry;

static const bh_band_entry bh_bands[BH_BAND_COUNT] = {
    {"402", 40200000U, 1250}, {"2m", 14400000U, 1250}, {"Rail", 15175000U, 1250},
    {"Sea", 15602500U, 1250}, {"Sea2", 15762500U, 1250}, {"430", 43000000U, 1250},
    {"LPD", 43307500U, 1250}, {"435", 43500000U, 1250}, {"PMR", 44600000U, 625},
    {"450", 45000000U, 1250}, {"462", 46200000U, 1250},
};

bool bh_band_rx_allowed(uint32_t first_10hz, uint32_t last_10hz)
{
    return first_10hz <= last_10hz &&
        ((first_10hz >= 13600000U && last_10hz <= 17400000U) ||
         (first_10hz >= 40000000U && last_10hz <= 47000000U));
}

const char *bh_band_name(uint8_t index)
{
    return index < BH_BAND_COUNT ? bh_bands[index].name : NULL;
}

bool bh_band_config(uint8_t index, bh_spectrum_config *config)
{
    if (index >= BH_BAND_COUNT || config == NULL)
        return false;
    const bh_spectrum_config result = {bh_bands[index].first_10hz, bh_bands[index].step_10hz,
        BH_SPECTRUM_MAX_BINS, 20, 1};
    const uint32_t last = result.first_10hz + (uint32_t)(result.bins - 1U) * result.step_10hz;
    if (!bh_band_rx_allowed(result.first_10hz, last) || !bh_spectrum_config_valid(&result))
        return false;
    *config = result;
    return true;
}
