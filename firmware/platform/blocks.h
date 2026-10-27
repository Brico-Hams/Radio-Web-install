/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BH_BLOCKS_H
#define BH_BLOCKS_H

#include "bh_api.h"
#include <stdbool.h>

#define BH_BLOCKS_WIDTH 10
#define BH_BLOCKS_HEIGHT 6

typedef struct {
    uint16_t rows[BH_BLOCKS_HEIGHT];
    uint32_t random;
    uint32_t lines;
    int8_t x;
    int8_t y;
    uint8_t shape;
    uint8_t rotation;
    bool initialized;
    bool game_over;
} bh_blocks_state;

int bh_blocks_event(const bh_api *api, const bh_event *event);

#endif
