/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "spectrum.h"
#include <stddef.h>
#include <string.h>

bh_spectrum_result bh_spectrum_init(bh_spectrum *state, const bh_spectrum_config *config)
{
    if (state == NULL || config == NULL || config->first_10hz == 0 ||
        config->step_10hz == 0 || config->bins == 0 || config->bins > BH_SPECTRUM_MAX_BINS ||
        config->settle_ms == 0 || config->settle_ms > 1000 ||
        config->samples_per_bin == 0 || config->samples_per_bin > 16 ||
        (uint64_t)config->first_10hz + (uint64_t)(config->bins - 1U) * config->step_10hz > UINT32_MAX)
        return BH_SPECTRUM_INVALID_CONFIG;
    const bh_spectrum_config checked = *config;
    memset(state, 0, sizeof(*state));
    state->config = checked;
    state->initialized = true;
    state->tune_required = true;
    return BH_SPECTRUM_OK;
}

bh_spectrum_result bh_spectrum_frequency(const bh_spectrum *state, uint32_t *frequency_10hz)
{
    if (state == NULL || !state->initialized)
        return BH_SPECTRUM_NOT_INITIALIZED;
    if (frequency_10hz == NULL)
        return BH_SPECTRUM_INVALID_CONFIG;
    *frequency_10hz = state->config.first_10hz + (uint32_t)state->bin * state->config.step_10hz;
    return BH_SPECTRUM_OK;
}

bh_spectrum_result bh_spectrum_tuned(bh_spectrum *state, uint32_t tick_ms)
{
    if (state == NULL || !state->initialized)
        return BH_SPECTRUM_NOT_INITIALIZED;
    if (!state->tune_required)
        return BH_SPECTRUM_ALREADY_TUNED;
    state->tune_tick = tick_ms;
    state->tune_required = false;
    return BH_SPECTRUM_OK;
}

static void advance_bin(bh_spectrum *state)
{
    state->samples = 0;
    state->sum = 0;
    state->bin++;
    if (state->bin == state->config.bins) {
        state->bin = 0;
        state->frames++;
    }
    state->tune_required = true;
}

bh_spectrum_result bh_spectrum_sample(bh_spectrum *state, uint32_t tick_ms, uint16_t raw_rssi, bool *bin_complete)
{
    if (state == NULL || !state->initialized)
        return BH_SPECTRUM_NOT_INITIALIZED;
    if (bin_complete == NULL)
        return BH_SPECTRUM_INVALID_CONFIG;
    *bin_complete = false;
    if (state->tune_required)
        return BH_SPECTRUM_TUNE_REQUIRED;
    if (tick_ms - state->tune_tick < state->config.settle_ms)
        return BH_SPECTRUM_NOT_SETTLED;
    state->sum += raw_rssi;
    state->samples++;
    if (state->samples < state->config.samples_per_bin)
        return BH_SPECTRUM_OK;
    const uint16_t level = (uint16_t)(state->sum / state->samples);
    state->levels[state->bin] = level;
    if (level > state->peaks[state->bin])
        state->peaks[state->bin] = level;
    advance_bin(state);
    *bin_complete = true;
    return BH_SPECTRUM_OK;
}

bh_spectrum_result bh_spectrum_skip(bh_spectrum *state)
{
    if (state == NULL || !state->initialized)
        return BH_SPECTRUM_NOT_INITIALIZED;
    if (!state->tune_required)
        return BH_SPECTRUM_ALREADY_TUNED;
    state->levels[state->bin] = 0;
    state->peaks[state->bin] = 0;
    advance_bin(state);
    return BH_SPECTRUM_OK;
}

bh_spectrum_result bh_spectrum_clear_peaks(bh_spectrum *state)
{
    if (state == NULL || !state->initialized)
        return BH_SPECTRUM_NOT_INITIALIZED;
    memcpy(state->peaks, state->levels, sizeof(state->peaks));
    return BH_SPECTRUM_OK;
}
