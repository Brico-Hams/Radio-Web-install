/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BRICOHAMS_ARDF_H
#define BRICOHAMS_ARDF_H

#include <stdbool.h>
#include <stdint.h>

#define BH_ARDF_MAX_FOXES 10
#define BH_ARDF_VFOS 2
#define BH_ARDF_STATS_BYTES 140

typedef enum {
    BH_ARDF_OK = 0,
    BH_ARDF_INVALID_CONFIG,
    BH_ARDF_INVALID_SYNC,
    BH_ARDF_INVALID_GAIN,
    BH_ARDF_NOT_INITIALIZED
} bh_ardf_result;

typedef struct {
    uint8_t fox_count;
    uint32_t duration_ms;
    uint32_t end_notice_ms;
    int32_t correction_ppm;
    uint8_t remember_vfos;
    uint8_t max_gain_index;
} bh_ardf_config;

typedef struct {
    bool timed;
    uint8_t fox;
    uint32_t elapsed_ms;
    uint32_t remaining_ms;
    bool end_notice;
} bh_ardf_view;

typedef struct {
    bool initialized;
    bh_ardf_config config;
    uint32_t last_tick;
    uint64_t phase_scaled;
    uint8_t gains[BH_ARDF_VFOS][BH_ARDF_MAX_FOXES];
    uint16_t gain_valid[BH_ARDF_VFOS];
} bh_ardf;

bh_ardf_result bh_ardf_init(bh_ardf *state, const bh_ardf_config *config, uint32_t tick_ms);
bh_ardf_result bh_ardf_sync(bh_ardf *state, uint8_t fox, uint32_t elapsed_ms, uint32_t tick_ms);
bh_ardf_result bh_ardf_update(bh_ardf *state, uint32_t tick_ms, bh_ardf_view *view);
bh_ardf_result bh_ardf_save_gain(bh_ardf *state, uint8_t vfo, uint8_t fox, uint8_t index);
bh_ardf_result bh_ardf_load_gain(const bh_ardf *state, uint8_t vfo, uint8_t fox, uint8_t *index, bool *available);
void BH_ARDF_StatsRequest(const uint8_t *input, uint16_t length, uint8_t output[BH_ARDF_STATS_BYTES]);

#endif
