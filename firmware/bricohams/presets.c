/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "presets.h"
#include <string.h>

static uint32_t crc32(const uint8_t *data, size_t length)
{
    uint32_t crc = UINT32_MAX;
    for (size_t i = 0; i < length; ++i) {
        crc ^= data[i];
        for (unsigned bit = 0; bit < 8; ++bit)
            crc = (crc >> 1) ^ ((crc & 1U) != 0 ? UINT32_C(0xedb88320) : 0);
    }
    return ~crc;
}

static void put32(uint8_t *out, uint32_t value)
{
    for (unsigned i = 0; i < 4; ++i)
        out[i] = (uint8_t)(value >> (i * 8));
}

static uint32_t get32(const uint8_t *in)
{
    uint32_t value = 0;
    for (unsigned i = 0; i < 4; ++i)
        value |= (uint32_t)in[i] << (i * 8);
    return value;
}

bh_presets_result bh_presets_validate(const bh_presets *presets)
{
    if (presets == NULL || presets->count == 0 || presets->count > BH_PRESET_MAX ||
        presets->selected >= presets->count)
        return BH_PRESETS_INVALID;
    for (uint8_t i = 0; i < presets->count; ++i) {
        const bh_spectrum_preset *entry = &presets->entries[i];
        if (entry->name[0] == '\0' || entry->name[8] != '\0')
            return BH_PRESETS_INVALID;
        bool ended = false;
        for (unsigned j = 0; j < 8; ++j) {
            const unsigned char c = (unsigned char)entry->name[j];
            if (c == 0)
                ended = true;
            else if (ended || c < 32 || c > 126)
                return BH_PRESETS_INVALID;
        }
        /* Not bh_spectrum_init: a scratch bh_spectrum costs ~540 B of stack on the UART path. */
        if (!bh_spectrum_config_valid(&entry->spectrum))
            return BH_PRESETS_INVALID;
    }
    return BH_PRESETS_OK;
}

bh_presets_result bh_presets_encode(const bh_presets *presets, uint8_t *output, size_t length)
{
    if (output == NULL || length != BH_PRESET_BLOB_BYTES ||
        bh_presets_validate(presets) != BH_PRESETS_OK)
        return BH_PRESETS_INVALID;
    uint8_t blob[BH_PRESET_BLOB_BYTES] = {0};
    memcpy(blob, "BHSP", 4);
    blob[4] = 1;
    blob[5] = presets->count;
    blob[6] = presets->selected;
    for (uint8_t i = 0; i < presets->count; ++i) {
        uint8_t *record = blob + 12 + (size_t)i * BH_PRESET_RECORD_BYTES;
        const bh_spectrum_preset *entry = &presets->entries[i];
        memcpy(record, entry->name, 8);
        put32(record + 8, entry->spectrum.first_10hz);
        put32(record + 12, entry->spectrum.step_10hz);
        record[16] = (uint8_t)entry->spectrum.bins;
        record[17] = (uint8_t)(entry->spectrum.bins >> 8);
        record[18] = (uint8_t)entry->spectrum.settle_ms;
        record[19] = (uint8_t)(entry->spectrum.settle_ms >> 8);
        record[20] = entry->spectrum.samples_per_bin;
    }
    put32(blob + BH_PRESET_BLOB_BYTES - 4, crc32(blob, BH_PRESET_BLOB_BYTES - 4));
    memcpy(output, blob, sizeof(blob));
    return BH_PRESETS_OK;
}

bh_presets_result bh_presets_decode(bh_presets *presets, const uint8_t *input, size_t length)
{
    if (presets == NULL || input == NULL || length != BH_PRESET_BLOB_BYTES)
        return BH_PRESETS_INVALID;
    if (memcmp(input, "BHSP", 4) != 0 ||
        get32(input + length - 4) != crc32(input, length - 4))
        return BH_PRESETS_CORRUPT;
    if (input[4] != 1)
        return BH_PRESETS_UNSUPPORTED;
    for (unsigned i = 7; i < 12; ++i)
        if (input[i] != 0)
            return BH_PRESETS_UNSUPPORTED;
    bh_presets decoded = {0};
    decoded.count = input[5];
    decoded.selected = input[6];
    if (decoded.count == 0 || decoded.count > BH_PRESET_MAX)
        return BH_PRESETS_INVALID;
    for (unsigned i = 0; i < BH_PRESET_MAX; ++i) {
        const uint8_t *record = input + 12 + (size_t)i * BH_PRESET_RECORD_BYTES;
        if (i >= decoded.count) {
            for (unsigned j = 0; j < BH_PRESET_RECORD_BYTES; ++j)
                if (record[j] != 0)
                    return BH_PRESETS_UNSUPPORTED;
            continue;
        }
        if (record[21] != 0 || record[22] != 0 || record[23] != 0)
            return BH_PRESETS_UNSUPPORTED;
        bh_spectrum_preset *entry = &decoded.entries[i];
        memcpy(entry->name, record, 8);
        entry->spectrum.first_10hz = get32(record + 8);
        entry->spectrum.step_10hz = get32(record + 12);
        entry->spectrum.bins = (uint16_t)((uint16_t)record[16] | (uint16_t)((uint16_t)record[17] << 8));
        entry->spectrum.settle_ms = (uint16_t)((uint16_t)record[18] | (uint16_t)((uint16_t)record[19] << 8));
        entry->spectrum.samples_per_bin = record[20];
    }
    if (bh_presets_validate(&decoded) != BH_PRESETS_OK)
        return BH_PRESETS_INVALID;
    *presets = decoded;
    return BH_PRESETS_OK;
}
