/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bh_api.h"
#include "bh_package.h"

extern uint8_t _app_start[], _app_end[];
extern const uint8_t bh_embedded_diagnostics[], bh_embedded_blocks[];
extern const size_t bh_embedded_diagnostics_size, bh_embedded_blocks_size;
static bh_app_entry loaded_entry;

static int dispatch(const uint8_t *package, size_t size, const bh_api *api, const bh_event *event)
{
    if (api == NULL || event == NULL)
        return BH_APP_BAD_API;
    if (event->type == BH_EVENT_START) {
        loaded_entry = NULL;
        bh_package_info info;
        if ((uintptr_t)_app_start != UINT32_C(0x20002000) ||
            (uintptr_t)_app_end - (uintptr_t)_app_start != BH_PACKAGE_RAM_MAX ||
            bh_package_load(package, size, BH_PACKAGE_CAP_DISPLAY | BH_PACKAGE_CAP_KEYS,
                _app_start, BH_PACKAGE_RAM_MAX, &info) != BH_PACKAGE_OK)
            return BH_APP_BAD_API;
        __asm volatile ("dsb\nisb" ::: "memory");
        loaded_entry = (bh_app_entry)(((uintptr_t)_app_start + info.entry_offset) | 1u);
    }
    if (loaded_entry == NULL)
        return BH_APP_BAD_API;
    const int result = loaded_entry(api, event);
    if (result != BH_APP_CONTINUE || event->type == BH_EVENT_STOP)
        loaded_entry = NULL;
    return result;
}

int bh_diagnostics_event(const bh_api *api, const bh_event *event)
{
    return dispatch(bh_embedded_diagnostics, bh_embedded_diagnostics_size, api, event);
}

int bh_blocks_event(const bh_api *api, const bh_event *event)
{
    return dispatch(bh_embedded_blocks, bh_embedded_blocks_size, api, event);
}
