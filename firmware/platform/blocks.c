/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "blocks.h"

static const uint16_t shapes[7][4] = {
    {0x00f0, 0x4444, 0x0f00, 0x2222},
    {0x0066, 0x0066, 0x0066, 0x0066},
    {0x0072, 0x0262, 0x0270, 0x0232},
    {0x0036, 0x0462, 0x0360, 0x0231},
    {0x0063, 0x0264, 0x0630, 0x0132},
    {0x0071, 0x0226, 0x0470, 0x0322},
    {0x0074, 0x0622, 0x0170, 0x0223}
};

static bool occupied(const bh_blocks_state *state, int x, int y, unsigned rotation)
{
    const uint16_t shape = shapes[state->shape][rotation];
    for (unsigned bit = 0; bit < 16; ++bit) {
        if ((shape & (uint16_t)(1u << bit)) == 0)
            continue;
        const int column = x + (int)(bit % 4u);
        const int row = y + (int)(bit / 4u);
        if (column < 0 || column >= BH_BLOCKS_WIDTH || row < 0 || row >= BH_BLOCKS_HEIGHT ||
            (state->rows[row] & (uint16_t)(1u << (unsigned)column)) != 0)
            return true;
    }
    return false;
}

static void spawn(bh_blocks_state *state)
{
    state->random = state->random * UINT32_C(1664525) + UINT32_C(1013904223);
    state->shape = (uint8_t)(((state->random >> 16) * 7u) >> 16);
    state->rotation = 0;
    state->x = 3;
    state->y = 0;
    state->game_over = occupied(state, state->x, state->y, 0);
}

static void advance(bh_blocks_state *state)
{
    if (!occupied(state, state->x, state->y + 1, state->rotation)) {
        state->y++;
        return;
    }
    const uint16_t shape = shapes[state->shape][state->rotation];
    for (unsigned bit = 0; bit < 16; ++bit)
        if ((shape & (uint16_t)(1u << bit)) != 0) {
            const unsigned row = (unsigned)state->y + bit / 4u;
            const unsigned column = (unsigned)(state->x + (int)(bit % 4u));
            state->rows[row] |= (uint16_t)(1u << column);
        }
    unsigned destination = BH_BLOCKS_HEIGHT;
    for (unsigned source = BH_BLOCKS_HEIGHT; source > 0; --source) {
        if (state->rows[source - 1u] == 0x03ffu)
            state->lines++;
        else
            state->rows[--destination] = state->rows[source - 1u];
    }
    while (destination > 0)
        state->rows[--destination] = 0;
    spawn(state);
}

static int draw(const bh_api *api, const bh_blocks_state *state)
{
    if (api->clear(api->context) != 0 ||
        api->text(api->context, 0, state->game_over ? "BLOCKS: GAME OVER" : "BRICOHAMS BLOCKS") != 0)
        return BH_APP_SERVICE_ERROR;
    for (unsigned row = 0; row < BH_BLOCKS_HEIGHT; ++row) {
        char line[BH_BLOCKS_WIDTH + 3];
        uint16_t cells = state->rows[row];
        if (!state->game_over) {
            const uint16_t shape = shapes[state->shape][state->rotation];
            for (unsigned bit = 0; bit < 16; ++bit)
                if ((shape & (uint16_t)(1u << bit)) != 0 &&
                    state->y + (int)(bit / 4u) == (int)row)
                    cells |= (uint16_t)(1u << (unsigned)(state->x + (int)(bit % 4u)));
        }
        line[0] = '|';
        for (unsigned column = 0; column < BH_BLOCKS_WIDTH; ++column)
            line[column + 1u] = (cells & (uint16_t)(1u << column)) != 0 ? '#' : '.';
        line[BH_BLOCKS_WIDTH + 1] = '|';
        line[BH_BLOCKS_WIDTH + 2] = '\0';
        if (api->text(api->context, (uint8_t)(row + 1u), line) != 0)
            return BH_APP_SERVICE_ERROR;
    }
    return api->present(api->context) == 0 ? BH_APP_CONTINUE : BH_APP_SERVICE_ERROR;
}

int bh_blocks_event(const bh_api *api, const bh_event *event)
{
    if (api == NULL || event == NULL || api->version != BH_API_VERSION ||
        api->size < sizeof(*api) || api->clear == NULL || api->text == NULL ||
        api->present == NULL || api->app_state == NULL ||
        api->app_state_size < sizeof(bh_blocks_state) ||
        (uintptr_t)api->app_state % _Alignof(bh_blocks_state) != 0)
        return BH_APP_BAD_API;
    if (event->type == BH_EVENT_STOP ||
        (event->type == BH_EVENT_KEY && event->key == BH_KEY_EXIT))
        return BH_APP_EXIT;
    bh_blocks_state *state = api->app_state;
    if (event->type == BH_EVENT_START ||
        (event->type == BH_EVENT_KEY && event->key == BH_KEY_RESTART)) {
        for (unsigned row = 0; row < BH_BLOCKS_HEIGHT; ++row)
            state->rows[row] = 0;
        state->random = UINT32_C(0x42524943);
        state->lines = 0;
        state->initialized = true;
        spawn(state);
    } else {
        if (!state->initialized)
            return BH_APP_BAD_API;
        if (!state->game_over) {
            if (event->type == BH_EVENT_TICK ||
                (event->type == BH_EVENT_KEY && event->key == BH_KEY_DOWN))
                advance(state);
            else if (event->type == BH_EVENT_KEY) {
                if (event->key == BH_KEY_DROP) {
                    while (!occupied(state, state->x, state->y + 1, state->rotation))
                        state->y++;
                    advance(state);
                } else {
                    int x = state->x;
                    unsigned rotation = state->rotation;
                    if (event->key == BH_KEY_LEFT) x--;
                    if (event->key == BH_KEY_RIGHT) x++;
                    if (event->key == BH_KEY_ROTATE) rotation = (rotation + 1u) % 4u;
                    if (!occupied(state, x, state->y, rotation)) {
                        state->x = (int8_t)x;
                        state->rotation = (uint8_t)rotation;
                    }
                }
            }
        }
    }
    return draw(api, state);
}
