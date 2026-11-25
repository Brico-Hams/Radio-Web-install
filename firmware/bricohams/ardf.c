/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "ardf.h"
#include <stddef.h>
#include <string.h>

#define BH_ARDF_SCALE UINT64_C(1000000)

bh_ardf_result bh_ardf_init(bh_ardf *state, const bh_ardf_config *config, uint32_t tick_ms)
{
    if (state == NULL || config == NULL || config->fox_count > BH_ARDF_MAX_FOXES ||
        config->duration_ms < 1000 || config->duration_ms > 999990 ||
        config->end_notice_ms > 30000 || config->end_notice_ms > config->duration_ms ||
        config->correction_ppm < -50000 || config->correction_ppm > 50000 ||
        config->remember_vfos > 3 || config->max_gain_index == 0)
        return BH_ARDF_INVALID_CONFIG;

    /* Allow reinitialization with &state->config without clearing its source. */
    const bh_ardf_config checked = *config;
    memset(state, 0, sizeof(*state));
    state->config = checked;
    state->last_tick = tick_ms;
    state->initialized = true;
    return BH_ARDF_OK;
}

bh_ardf_result bh_ardf_sync(bh_ardf *state, uint8_t fox, uint32_t elapsed_ms, uint32_t tick_ms)
{
    if (state == NULL || !state->initialized)
        return BH_ARDF_NOT_INITIALIZED;
    if (state->config.fox_count == 0 || fox == 0 || fox > state->config.fox_count ||
        elapsed_ms >= state->config.duration_ms)
        return BH_ARDF_INVALID_SYNC;

    state->phase_scaled = ((uint64_t)(fox - 1) * state->config.duration_ms + elapsed_ms) * BH_ARDF_SCALE;
    state->last_tick = tick_ms;
    return BH_ARDF_OK;
}

bh_ardf_result bh_ardf_update(bh_ardf *state, uint32_t tick_ms, bh_ardf_view *view)
{
    if (state == NULL || !state->initialized)
        return BH_ARDF_NOT_INITIALIZED;
    if (view == NULL)
        return BH_ARDF_INVALID_CONFIG;

    /* Unsigned subtraction supports one wrap; callers must sample within 2^32 ms. */
    const uint32_t delta = tick_ms - state->last_tick;
    state->last_tick = tick_ms;
    memset(view, 0, sizeof(*view));
    if (state->config.fox_count == 0)
        return BH_ARDF_OK;

    const uint64_t rate = (uint64_t)(INT32_C(1000000) + state->config.correction_ppm);
    const uint64_t cycle = (uint64_t)(state->config.duration_ms * state->config.fox_count) * BH_ARDF_SCALE;
    const uint64_t advanced = state->phase_scaled + (uint64_t)delta * rate;
    /* Most updates stay in the same cycle; long gaps still reduce exactly. */
    state->phase_scaled = advanced < cycle ? advanced : advanced % cycle;
    /* Validated cycles are at most 9,999,900 ms, so the remaining division is 32-bit. */
    const uint32_t phase_ms = (uint32_t)(state->phase_scaled / BH_ARDF_SCALE);
    view->timed = true;
    view->fox = (uint8_t)(phase_ms / state->config.duration_ms + 1);
    view->elapsed_ms = phase_ms % state->config.duration_ms;
    view->remaining_ms = state->config.duration_ms - view->elapsed_ms;
    view->end_notice = state->config.end_notice_ms != 0 && view->remaining_ms <= state->config.end_notice_ms;
    return BH_ARDF_OK;
}

/*
 * Clock correction model adapted from reald's uv-k1-k5v3-firmware-custom
 * (App/app/ardf.h, tag ARDF-K5v3_K1-v0.6, commit bfdf068f3c78e12e8daa07a48f273d36b38f5816).
 * Copyright 2024 Dennis Real (reald). Licensed under the Apache License 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Changed: integer-only pure function, ppm output with this module's sign and clamp,
 * input validation, no EEPROM persistence.
 */
bh_ardf_result bh_ardf_clock_ppm(int16_t k1, int16_t k2, int16_t temp_deci_c, int32_t *ppm)
{
    if (ppm == NULL || k1 < -BH_ARDF_K_LIMIT || k1 > BH_ARDF_K_LIMIT ||
        k2 < -BH_ARDF_K_LIMIT || k2 > BH_ARDF_K_LIMIT || temp_deci_c < -400 || temp_deci_c > 1250)
        return BH_ARDF_INVALID_CONFIG;

    /* reald: ticks/minute = k1 + k2 * T10 / (K2_RES * TEMP_RES), nominal minute = 6000 ticks. */
    const int64_t k = (int64_t)k1 + (int64_t)k2 * temp_deci_c / 1000;
    int64_t value = -(k * 1000000) / (6000 + k);
    if (value > 50000)
        value = 50000;
    else if (value < -50000)
        value = -50000;
    *ppm = (int32_t)value;
    return BH_ARDF_OK;
}

bh_ardf_result bh_ardf_set_correction(bh_ardf *state, int32_t ppm)
{
    if (state == NULL || !state->initialized)
        return BH_ARDF_NOT_INITIALIZED;
    if (ppm < -50000 || ppm > 50000)
        return BH_ARDF_INVALID_CONFIG;
    /* The phase is kept: only the rate of later updates changes. */
    state->config.correction_ppm = ppm;
    return BH_ARDF_OK;
}

bh_ardf_result bh_ardf_temp_add(bh_ardf_temp *acc, int16_t temp_deci_c)
{
    if (acc == NULL || temp_deci_c < -400 || temp_deci_c > 1250 || acc->count == UINT32_MAX)
        return BH_ARDF_INVALID_CONFIG;
    acc->sum += temp_deci_c;
    acc->count++;
    return BH_ARDF_OK;
}

bh_ardf_result bh_ardf_temp_take(bh_ardf_temp *acc, int16_t fallback_deci_c, int16_t *mean_deci_c)
{
    if (acc == NULL || mean_deci_c == NULL)
        return BH_ARDF_INVALID_CONFIG;
    *mean_deci_c = acc->count != 0 ? (int16_t)(acc->sum / (int32_t)acc->count) : fallback_deci_c;
    acc->sum = 0;
    acc->count = 0;
    return BH_ARDF_OK;
}

static bool valid_gain_slot(const bh_ardf *state, uint8_t vfo, uint8_t fox)
{
    return vfo < BH_ARDF_VFOS && fox > 0 && fox <= state->config.fox_count;
}

bh_ardf_result bh_ardf_save_gain(bh_ardf *state, uint8_t vfo, uint8_t fox, uint8_t index)
{
    if (state == NULL || !state->initialized)
        return BH_ARDF_NOT_INITIALIZED;
    if (!valid_gain_slot(state, vfo, fox) || index > state->config.max_gain_index)
        return BH_ARDF_INVALID_GAIN;
    if ((state->config.remember_vfos & (1U << vfo)) != 0) {
        state->gains[vfo][fox - 1] = index;
        state->gain_valid[vfo] |= (uint16_t)(1U << (fox - 1));
    }
    return BH_ARDF_OK;
}

bh_ardf_result bh_ardf_load_gain(const bh_ardf *state, uint8_t vfo, uint8_t fox, uint8_t *index, bool *available)
{
    if (state == NULL || !state->initialized)
        return BH_ARDF_NOT_INITIALIZED;
    if (!valid_gain_slot(state, vfo, fox) || index == NULL || available == NULL)
        return BH_ARDF_INVALID_GAIN;
    *available = (state->config.remember_vfos & (1U << vfo)) != 0 &&
        (state->gain_valid[vfo] & (1U << (fox - 1))) != 0;
    if (*available)
        *index = state->gains[vfo][fox - 1];
    return BH_ARDF_OK;
}
