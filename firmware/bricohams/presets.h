/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BRICOHAMS_PRESETS_H
#define BRICOHAMS_PRESETS_H

#include "spectrum.h"
#include <stddef.h>

#define BH_PRESET_MAX 8
#define BH_PRESET_RECORD_BYTES 24
#define BH_PRESET_BLOB_BYTES (12 + BH_PRESET_MAX * BH_PRESET_RECORD_BYTES + 4)
#define BH_PRESET_CHUNK_BYTES (BH_PRESET_BLOB_BYTES / 2)
#define BH_PRESET_REPLY_MAX (6 + BH_PRESET_CHUNK_BYTES)

typedef struct {
    char name[9];
    bh_spectrum_config spectrum;
} bh_spectrum_preset;

typedef struct {
    uint8_t count;
    uint8_t selected;
    bh_spectrum_preset entries[BH_PRESET_MAX];
} bh_presets;

typedef enum {
    BH_PRESETS_OK = 0,
    BH_PRESETS_INVALID,
    BH_PRESETS_CORRUPT,
    BH_PRESETS_UNSUPPORTED
} bh_presets_result;

bh_presets_result bh_presets_validate(const bh_presets *presets);
bh_presets_result bh_presets_encode(const bh_presets *presets, uint8_t *output, size_t length);
bh_presets_result bh_presets_decode(bh_presets *presets, const uint8_t *input, size_t length);
uint16_t BH_SPEC_PresetRequest(const uint8_t *input, uint16_t length, uint8_t output[BH_PRESET_REPLY_MAX]);

#endif
