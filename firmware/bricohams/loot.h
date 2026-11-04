/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BRICOHAMS_LOOT_H
#define BRICOHAMS_LOOT_H

#include <stdbool.h>
#include <stdint.h>

/*
 * Session-only list of captured frequencies, newest first, without duplicates.
 * Independent implementation of the "Loot" behaviour documented by
 * autumn1rain/karina-v3-k1 (Apache-2.0); capacity is 32 instead of 128 to
 * respect the small RAM budget of the Bricohams slot images.
 */
#define BH_LOOT_MAX 32

typedef struct {
    uint32_t frequency_10hz[BH_LOOT_MAX];
    uint8_t count;
} bh_loot;

void bh_loot_clear(bh_loot *loot);
bool bh_loot_add(bh_loot *loot, uint32_t frequency_10hz);
bool bh_loot_get(const bh_loot *loot, uint8_t index, uint32_t *frequency_10hz);

#endif
