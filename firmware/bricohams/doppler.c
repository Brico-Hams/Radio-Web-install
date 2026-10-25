/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "doppler.h"
#include <stddef.h>

#define BH_LIGHT_MM_S INT64_C(299792458000)

static bool supported(uint32_t frequency)
{
    return (frequency >= 13600000 && frequency <= 17400000) ||
        (frequency >= 40000000 && frequency <= 47000000);
}

static int64_t rounded_divide(int64_t numerator, int64_t denominator)
{
    return numerator >= 0 ? (numerator + denominator / 2) / denominator :
        -((-numerator + denominator / 2) / denominator);
}

bh_doppler_result bh_doppler_calculate(uint32_t downlink_10hz, uint32_t uplink_10hz,
    int32_t range_rate_mm_s, bh_doppler_frequencies *output)
{
    if (output == NULL || !supported(downlink_10hz) || !supported(uplink_10hz) ||
        range_rate_mm_s < -12000000 || range_rate_mm_s > 12000000)
        return BH_DOPPLER_INVALID;
    const int64_t rate = range_rate_mm_s;
    const int64_t down = (int64_t)downlink_10hz +
        rounded_divide(-(int64_t)downlink_10hz * rate, BH_LIGHT_MM_S);
    const int64_t up = (int64_t)uplink_10hz +
        rounded_divide((int64_t)uplink_10hz * rate, BH_LIGHT_MM_S - rate);
    if (down <= 0 || up <= 0 || down > UINT32_MAX || up > UINT32_MAX ||
        !supported((uint32_t)down) || !supported((uint32_t)up))
        return BH_DOPPLER_INVALID;
    *output = (bh_doppler_frequencies){(uint32_t)down, (uint32_t)up, true};
    return BH_DOPPLER_OK;
}
