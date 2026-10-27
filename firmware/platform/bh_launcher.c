/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bh_launcher.h"
#include <string.h>

static void release(bh_launcher *launcher)
{
    launcher->entry = NULL;
    memset(&launcher->state, 0, sizeof(launcher->state));
}

int bh_launcher_init(bh_launcher *launcher, const bh_api *services)
{
    if (launcher == NULL || services == NULL || services->version != BH_API_VERSION ||
        services->size < sizeof(*services) || services->clear == NULL ||
        services->text == NULL || services->present == NULL)
        return BH_APP_BAD_API;
    const bh_api copy = *services;
    memset(launcher, 0, sizeof(*launcher));
    launcher->api = copy;
    launcher->api.app_state = launcher->state.bytes;
    launcher->api.app_state_size = BH_LAUNCHER_STATE_BYTES;
    return BH_APP_CONTINUE;
}

int bh_launcher_dispatch(bh_launcher *launcher, const bh_event *event)
{
    if (launcher == NULL || event == NULL || launcher->entry == NULL)
        return BH_APP_BAD_API;
    if (launcher->dispatching)
        return BH_LAUNCHER_BUSY;
    if (event->type == BH_EVENT_START || event->type > BH_EVENT_TICK)
        return BH_APP_BAD_API;
    launcher->dispatching = true;
    const int result = launcher->entry(&launcher->api, event);
    launcher->dispatching = false;
    if (result != BH_APP_CONTINUE || event->type == BH_EVENT_STOP)
        release(launcher);
    return result;
}

int bh_launcher_stop(bh_launcher *launcher)
{
    if (launcher == NULL)
        return BH_APP_BAD_API;
    if (launcher->dispatching)
        return BH_LAUNCHER_BUSY;
    if (launcher->entry == NULL)
        return BH_APP_CONTINUE;
    const bh_event stop = {BH_EVENT_STOP, 0};
    return bh_launcher_dispatch(launcher, &stop);
}

int bh_launcher_start(bh_launcher *launcher, bh_app_entry entry)
{
    if (launcher == NULL || entry == NULL || launcher->api.version != BH_API_VERSION ||
        launcher->api.app_state != launcher->state.bytes)
        return BH_APP_BAD_API;
    if (launcher->dispatching)
        return BH_LAUNCHER_BUSY;
    const int stopped = bh_launcher_stop(launcher);
    if (stopped < 0)
        return stopped;
    release(launcher);
    launcher->entry = entry;
    const bh_event start = {BH_EVENT_START, 0};
    launcher->dispatching = true;
    const int result = entry(&launcher->api, &start);
    launcher->dispatching = false;
    if (result != BH_APP_CONTINUE)
        release(launcher);
    return result;
}
