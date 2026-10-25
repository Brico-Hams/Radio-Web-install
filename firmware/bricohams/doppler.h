/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BRICOHAMS_DOPPLER_H
#define BRICOHAMS_DOPPLER_H

#include <stdbool.h>
#include <stdint.h>

typedef enum {
    BH_DOPPLER_OK = 0,
    BH_DOPPLER_INVALID
} bh_doppler_result;

typedef struct {
    uint32_t receive_10hz;
    uint32_t transmit_nominal_10hz;
    bool receive_only;
} bh_doppler_frequencies;

/* Positive range rate means the satellite is receding. No TX enable is returned. */
bh_doppler_result bh_doppler_calculate(uint32_t downlink_10hz, uint32_t uplink_10hz,
    int32_t range_rate_mm_s, bh_doppler_frequencies *output);

#endif
