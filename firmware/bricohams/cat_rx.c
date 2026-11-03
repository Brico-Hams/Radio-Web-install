/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "cat_rx.h"
#include "driver/py25q16.h"
#include <string.h>

bh_cat_rx bh_cat_receiver;
bool bh_cat_remote_enabled;
static bool remote_loaded;

static uint32_t read32(const uint8_t *bytes)
{
    return (uint32_t)bytes[0] | ((uint32_t)bytes[1] << 8) |
        ((uint32_t)bytes[2] << 16) | ((uint32_t)bytes[3] << 24);
}

static void write32(uint8_t *bytes, uint32_t value)
{
    for (unsigned i = 0; i < 4; ++i)
        bytes[i] = (uint8_t)(value >> (i * 8U));
}

bool bh_cat_frequency_valid(uint32_t frequency)
{
    return (frequency >= 13600000U && frequency <= 17400000U) ||
        (frequency >= 40000000U && frequency <= 47000000U);
}

bool bh_cat_start(bh_cat_rx *state, uint32_t nominal)
{
    memset(state, 0, sizeof(*state));
    if (!bh_cat_frequency_valid(nominal))
        return false;
    state->nominal = nominal;
    state->target = nominal;
    state->applied = nominal;
    state->active = true;
    return true;
}

void bh_cat_stop(bh_cat_rx *state)
{
    memset(state, 0, sizeof(*state));
}

void bh_cat_local(bh_cat_rx *state, uint32_t applied)
{
    if (!state->active)
        return;
    state->remote = false;
    state->pending = false;
    state->target = applied;
    state->applied = applied;
}

bool bh_cat_expire(bh_cat_rx *state, uint32_t now)
{
    if (!state->active || !state->remote ||
        (uint32_t)(now - state->last_command) < BH_CAT_TIMEOUT_MS)
        return false;
    state->remote = false;
    state->target = state->nominal;
    state->pending = true;
    return true;
}

void bh_cat_applied(bh_cat_rx *state)
{
    state->applied = state->target;
    state->pending = false;
}

void bh_cat_request(bh_cat_rx *state, const uint8_t *request, uint16_t length,
    uint32_t now, uint8_t reply[BH_CAT_REPLY_SIZE])
{
    memset(reply, 0, BH_CAT_REPLY_SIZE);
    reply[0] = 1;
    uint8_t status = 0;
    if (length != BH_CAT_REQUEST_SIZE || request == NULL) {
        status = 2;
    } else {
        reply[2] = request[2];
        reply[3] = request[3];
        const uint32_t frequency = read32(&request[4]);
        if (request[0] != 1) status = 3;
        else if (request[1] > 2) status = 4;
        else if ((request[1] == 0 || request[1] == 2) && frequency != 0) status = 2;
        else if (request[1] == 1 && !bh_cat_frequency_valid(frequency)) status = 6;
        else if (request[1] != 0 && !state->active) status = 5;
        else if (request[1] != 0) {
            const bool remote = request[1] == 1;
            const uint32_t target = remote ? frequency : state->nominal;
            if (remote || state->remote) {
                /* Same target while already applied is a pure lease renewal: no retune. */
                if (state->remote != remote || state->target != target)
                    state->pending = true;
                state->remote = remote;
                state->target = target;
                if (remote)
                    state->last_command = now;
            }
            status = 1; /* Queued or renewed; the RX loop applies it. */
        }
    }
    reply[1] = status;
    write32(&reply[4], BH_CAT_CAPS_V1 | BH_CAT_CAP_ANY_SCREEN); /* RX set, query, stop/lease; no TX or EEPROM. */
    write32(&reply[8], state->applied);
    write32(&reply[12], (state->active ? 1U : 0U) |
        (state->remote ? 2U : 0U) | (state->pending ? 4U : 0U) |
        (bh_cat_remote_enabled ? BH_CAT_FLAG_ENABLED : 0U) | (state->holdoff ? BH_CAT_FLAG_HOLDOFF : 0U));
}

void bh_cat_remote_store(bool enabled)
{
    const uint8_t flag = enabled ? 1U : 0U;
    const uint8_t raw[BH_CAT_CONFIG_BYTES] = {0xCAU, flag, (uint8_t)~flag, 0U};
    PY25Q16_WriteBuffer(BH_CAT_CONFIG_ADDR, raw, sizeof(raw), false);
}

static bool config_enabled(void)
{
    uint8_t raw[BH_CAT_CONFIG_BYTES];
    PY25Q16_ReadBuffer(BH_CAT_CONFIG_ADDR, raw, sizeof(raw));
    return raw[0] == 0xCAU && raw[1] == 1U && raw[2] == (uint8_t)~raw[1] && raw[3] == 0U;
}

void bh_cat_remote_init(void)
{
    if (remote_loaded)
        return;
    remote_loaded = true;
    bh_cat_remote_enabled = config_enabled();
}

bool bh_cat_remote_set(bool enabled)
{
    remote_loaded = true;
    bh_cat_remote_enabled = enabled;
    if (config_enabled() == enabled)
        return true; /* Only a user toggle that changes the flag touches flash. */
    bh_cat_remote_store(enabled);
    return config_enabled() == enabled;
}

bool bh_cat_user_cancel(bh_cat_rx *state, uint32_t now, uint32_t *tune)
{
    if (!state->active || (!state->remote && !state->pending))
        return false;
    *tune = state->nominal;
    bh_cat_stop(state);
    state->holdoff = true;
    state->holdoff_at = now;
    return true;
}

bool bh_cat_global_tick(bh_cat_rx *state, bool enabled, bool cancel, bool idle_ok,
    uint32_t vfo, uint32_t now, uint32_t *tune)
{
    if (!enabled) {
        const bool retune = state->active && state->remote;
        if (retune)
            *tune = state->nominal;
        bh_cat_stop(state);
        return retune;
    }
    if (cancel && bh_cat_user_cancel(state, now, tune))
        return true;
    if (state->holdoff) {
        if ((uint32_t)(now - state->holdoff_at) < BH_CAT_HOLDOFF_MS)
            return false;
        state->holdoff = false;
    }
    if (!idle_ok)
        return false;
    if (bh_cat_frequency_valid(vfo)) {
        if (!state->active || (!state->remote && !state->pending && state->nominal != vfo))
            bh_cat_start(state, vfo);
    } else if (state->active && !state->remote) {
        bh_cat_stop(state);
    }
    bh_cat_expire(state, now);
    if (!state->active || !state->pending)
        return false;
    *tune = state->target;
    bh_cat_applied(state);
    return true;
}
