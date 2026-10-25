/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BRICOHAMS_SPECTRUM_H
#define BRICOHAMS_SPECTRUM_H

#include <stdbool.h>
#include <stdint.h>

#define BH_SPECTRUM_MAX_BINS 128

typedef enum {
    BH_SPECTRUM_OK = 0,
    BH_SPECTRUM_INVALID_CONFIG,
    BH_SPECTRUM_NOT_INITIALIZED,
    BH_SPECTRUM_TUNE_REQUIRED,
    BH_SPECTRUM_NOT_SETTLED,
    BH_SPECTRUM_ALREADY_TUNED
} bh_spectrum_result;

typedef struct {
    uint32_t first_10hz;
    uint32_t step_10hz;
    uint16_t bins;
    uint16_t settle_ms;
    uint8_t samples_per_bin;
} bh_spectrum_config;

typedef struct {
    bool initialized;
    bool tune_required;
    bh_spectrum_config config;
    uint32_t tune_tick;
    uint32_t sum;
    uint32_t frames;
    uint16_t bin;
    uint8_t samples;
    uint16_t levels[BH_SPECTRUM_MAX_BINS];
    uint16_t peaks[BH_SPECTRUM_MAX_BINS];
} bh_spectrum;

bool bh_spectrum_config_valid(const bh_spectrum_config *config);
bh_spectrum_result bh_spectrum_init(bh_spectrum *state, const bh_spectrum_config *config);
bh_spectrum_result bh_spectrum_frequency(const bh_spectrum *state, uint32_t *frequency_10hz);
bh_spectrum_result bh_spectrum_tuned(bh_spectrum *state, uint32_t tick_ms);
bh_spectrum_result bh_spectrum_sample(bh_spectrum *state, uint32_t tick_ms, uint16_t raw_rssi, bool *bin_complete);
bh_spectrum_result bh_spectrum_clear_peaks(bh_spectrum *state);
bh_spectrum_result bh_spectrum_skip(bh_spectrum *state);

#endif
