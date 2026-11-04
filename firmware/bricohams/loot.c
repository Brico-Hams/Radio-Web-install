/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "loot.h"
#include <stddef.h>
#include <string.h>

void bh_loot_clear(bh_loot *loot)
{
    if (loot != NULL)
        memset(loot, 0, sizeof(*loot));
}

bool bh_loot_add(bh_loot *loot, uint32_t frequency_10hz)
{
    if (loot == NULL || frequency_10hz == 0 || loot->count > BH_LOOT_MAX)
        return false;
    uint8_t last = loot->count < BH_LOOT_MAX ? loot->count : (uint8_t)(BH_LOOT_MAX - 1U);
    for (uint8_t i = 0; i < loot->count; ++i) {
        if (loot->frequency_10hz[i] == frequency_10hz) {
            last = i;
            break;
        }
    }
    // Shift older entries down; a full list drops the oldest one.
    for (uint8_t i = last; i > 0; --i)
        loot->frequency_10hz[i] = loot->frequency_10hz[i - 1U];
    loot->frequency_10hz[0] = frequency_10hz;
    if (last == loot->count)
        loot->count++;
    return true;
}

bool bh_loot_get(const bh_loot *loot, uint8_t index, uint32_t *frequency_10hz)
{
    if (loot == NULL || frequency_10hz == NULL || index >= loot->count || loot->count > BH_LOOT_MAX)
        return false;
    *frequency_10hz = loot->frequency_10hz[index];
    return true;
}
