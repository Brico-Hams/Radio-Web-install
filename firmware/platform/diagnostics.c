/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bh_api.h"

int bh_diagnostics_event(const bh_api *api, const bh_event *event)
{
    if (api == NULL || event == NULL || api->version != BH_API_VERSION ||
        api->size < sizeof(*api) || api->clear == NULL ||
        api->text == NULL || api->present == NULL)
        return BH_APP_BAD_API;
    if (event->type == BH_EVENT_STOP ||
        (event->type == BH_EVENT_KEY && event->key == BH_KEY_EXIT))
        return BH_APP_EXIT;
    if (event->type != BH_EVENT_START)
        return BH_APP_CONTINUE;
    if (api->clear(api->context) != 0 ||
        api->text(api->context, 0, "BRICOHAMS APPS") != 0 ||
        api->text(api->context, 2, "API 2 DIAGNOSTIC") != 0 ||
        api->text(api->context, 4, "DISPLAY TEST") != 0 ||
        api->text(api->context, 6, "EXIT TO LAUNCHER") != 0 ||
        api->present(api->context) != 0)
        return BH_APP_SERVICE_ERROR;
    return BH_APP_CONTINUE;
}
