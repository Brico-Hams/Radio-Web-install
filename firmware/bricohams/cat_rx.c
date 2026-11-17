/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "cat_rx.h"
#include "cat_tx.h"
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

void bh_cat_rebase(bh_cat_rx *state, uint32_t vfo)
{
    if (!state->active || !bh_cat_frequency_valid(vfo))
        return;
    state->nominal = vfo;
    if (!state->remote) {
        state->target = vfo;
        state->applied = vfo;
        state->pending = false;
    }
}

void bh_cat_local(bh_cat_rx *state, uint32_t applied)
{
    if (!state->active)
        return;
    state->remote = false;
    state->pending = false;
    state->uplink = 0;
    state->uplink_lost = false;
    state->target = applied;
    state->applied = applied;
}

bool bh_cat_expire(bh_cat_rx *state, uint32_t now)
{
    if (!state->active || !state->remote ||
        (uint32_t)(now - state->last_command) < BH_CAT_TIMEOUT_MS)
        return false;
    state->remote = false;
    state->uplink_lost = state->uplink != 0;
    state->uplink = 0;
    state->target = state->nominal;
    state->pending = true;
    return true;
}

void bh_cat_applied(bh_cat_rx *state)
{
    state->applied = state->target;
    state->pending = false;
}

int bh_cat_uplink_select(const bh_cat_rx *state, uint32_t now, uint32_t *uplink)
{
    if (state->active && state->remote && state->uplink != 0) {
        if ((uint32_t)(now - state->last_command) >= BH_CAT_TIMEOUT_MS ||
            !bh_cat_frequency_valid(state->uplink))
            return BH_CAT_UPLINK_REFUSE;
        *uplink = state->uplink;
        return BH_CAT_UPLINK_USE;
    }
    return state->active && state->uplink_lost ? BH_CAT_UPLINK_REFUSE : BH_CAT_UPLINK_NONE;
}

static uint8_t apply(bh_cat_rx *state, uint8_t op, uint32_t frequency, uint32_t uplink, uint32_t now)
{
    if (op > 2) return 4;
    if ((op == 0 || op == 2) && (frequency != 0 || uplink != 0)) return 2;
    if (op == 1 && (!bh_cat_frequency_valid(frequency) ||
        (uplink != 0 && !bh_cat_frequency_valid(uplink)))) return 6;
    if (op != 0 && !state->active) return 5;
    if (op != 0) {
        const bool remote = op == 1;
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
        state->uplink = remote ? uplink : 0;
        state->uplink_lost = false;
        return 1; /* Queued or renewed; the RX loop applies it. */
    }
    return 0;
}

static void fill(const bh_cat_rx *state, bool v2, uint8_t status, const uint8_t *request,
    uint32_t now, uint8_t *reply)
{
    reply[0] = v2 ? 2 : 1;
    reply[1] = status;
    if (request != NULL) {
        reply[2] = request[2];
        reply[3] = request[3];
    }
    write32(&reply[4], BH_CAT_CAPS_V1 | BH_CAT_CAP_ANY_SCREEN |
        (v2 ? BH_CAT_CAP_UPLINK_V2 : 0U)); /* RX set, query, stop/lease; v2 adds the uplink. */
    write32(&reply[8], state->applied);
    uint32_t flags = (state->active ? 1U : 0U) |
        (state->remote ? 2U : 0U) | (state->pending ? 4U : 0U) |
        (bh_cat_remote_enabled ? BH_CAT_FLAG_ENABLED : 0U) | (state->holdoff ? BH_CAT_FLAG_HOLDOFF : 0U);
    uint32_t uplink = 0;
    if (v2) {
        if (bh_cat_uplink_select(state, now, &uplink) != BH_CAT_UPLINK_USE)
            uplink = 0;
        flags |= (uplink != 0 ? BH_CAT_FLAG_UPLINK : 0U) | (bh_cat_transmitter.armed ? BH_CAT_FLAG_TX_ARMED : 0U) |
            (bh_cat_transmitter.keyed ? BH_CAT_FLAG_KEYED : 0U);
        write32(&reply[16], uplink);
    }
    write32(&reply[12], flags);
}

void bh_cat_request(bh_cat_rx *state, const uint8_t *request, uint16_t length,
    uint32_t now, uint8_t reply[BH_CAT_REPLY_SIZE])
{
    memset(reply, 0, BH_CAT_REPLY_SIZE);
    uint8_t status = 0;
    const bool valid = length == BH_CAT_REQUEST_SIZE && request != NULL;
    if (!valid) status = 2;
    else if (request[0] != 1) status = 3;
    else status = apply(state, request[1], read32(&request[4]), 0, now);
    fill(state, false, status, valid ? request : NULL, now, reply);
}

uint16_t bh_cat_request2(bh_cat_rx *state, const uint8_t *request, uint16_t length,
    uint32_t now, uint8_t reply[BH_CAT_REPLY_V2_SIZE])
{
    if (request == NULL || length != BH_CAT_REQUEST_V2_SIZE || request[0] != 2) {
        bh_cat_request(state, request, length, now, reply);
        return BH_CAT_REPLY_SIZE;
    }
    memset(reply, 0, BH_CAT_REPLY_V2_SIZE);
    const uint8_t status = apply(state, request[1], read32(&request[4]), read32(&request[8]), now);
    fill(state, true, status, request, now, reply);
    return BH_CAT_REPLY_V2_SIZE;
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
        /* Idle: nominal and the reported applied frequency both track the real VFO. */
        if (!state->active || (!state->remote && !state->pending &&
            (state->nominal != vfo || state->applied != vfo)))
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
