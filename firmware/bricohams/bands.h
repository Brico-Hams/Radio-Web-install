/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BRICOHAMS_BANDS_H
#define BRICOHAMS_BANDS_H

#include "spectrum.h"
#include <stdbool.h>
#include <stdint.h>

/*
 * Built-in spectrum windows for common receive-only band plans. Independent
 * implementation of the "band presets" behaviour documented by
 * autumn1rain/karina-v3-k1 (Apache-2.0); no upstream code is reused.
 * Only windows inside the radio's hardware-supported 136-174 / 400-470 MHz
 * ranges are provided; every window uses the existing 128-bin RX-only scanner.
 */
#define BH_BAND_COUNT 11

bool bh_band_rx_allowed(uint32_t first_10hz, uint32_t last_10hz);
const char *bh_band_name(uint8_t index);
bool bh_band_config(uint8_t index, bh_spectrum_config *config);

#endif
