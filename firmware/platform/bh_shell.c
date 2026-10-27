/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bh_shell.h"

extern int bh_diagnostics_event(const bh_api *, const bh_event *);
extern int bh_blocks_event(const bh_api *, const bh_event *);

static int menu(bh_shell *shell)
{
    const bh_api *api = &shell->launcher.api;
    if (api->clear(api->context) != 0 ||
        api->text(api->context, 0, "BRICOHAMS PLATFORM") != 0 ||
        api->text(api->context, 2, shell->selected == 0 ? "> DIAGNOSTICS" : "  DIAGNOSTICS") != 0 ||
        api->text(api->context, 3, shell->selected == 1 ? "> BLOCKS" : "  BLOCKS") != 0 ||
        api->text(api->context, 5, "UP/DOWN SELECT") != 0 ||
        api->text(api->context, 6, "MENU START EXIT BACK") != 0 ||
        api->text(api->context, 7, "EXPERIMENTAL NO RF") != 0 ||
        api->present(api->context) != 0)
        return BH_APP_SERVICE_ERROR;
    return BH_APP_CONTINUE;
}

int bh_shell_init(bh_shell *shell, const bh_api *services, uint32_t now)
{
    if (shell == NULL)
        return BH_APP_BAD_API;
    const int result = bh_launcher_init(&shell->launcher, services);
    if (result != BH_APP_CONTINUE)
        return result;
    shell->selected = 0;
    shell->tick_ms = now;
    return menu(shell);
}

int bh_shell_step(bh_shell *shell, uint32_t key, uint32_t now)
{
    if (shell == NULL || shell->launcher.api.version != BH_API_VERSION)
        return BH_APP_BAD_API;
    if (shell->launcher.entry == NULL) {
        shell->tick_ms = now;
        if (key == BH_KEY_LEFT || key == BH_KEY_RIGHT || key == BH_KEY_DOWN) {
            shell->selected ^= 1u;
            return menu(shell);
        }
        if (key == BH_KEY_ROTATE) {
            const int result = bh_launcher_start(&shell->launcher,
                shell->selected == 0 ? bh_diagnostics_event : bh_blocks_event);
            if (result < 0)
                return result;
            if (result == BH_APP_EXIT)
                return menu(shell);
        }
        return BH_APP_CONTINUE;
    }
    int result = BH_APP_CONTINUE;
    if (key != 0) {
        const bh_event event = {BH_EVENT_KEY, key};
        result = bh_launcher_dispatch(&shell->launcher, &event);
    }
    if (result < 0)
        return result;
    if (shell->launcher.entry == NULL)
        return menu(shell);
    if ((uint32_t)(now - shell->tick_ms) >= 500u) {
        /* One tick at most: stalls must not cause an unbounded catch-up loop. */
        shell->tick_ms = now;
        const bh_event event = {BH_EVENT_TICK, 0};
        result = bh_launcher_dispatch(&shell->launcher, &event);
        if (result < 0)
            return result;
        if (shell->launcher.entry == NULL)
            return menu(shell);
    }
    return BH_APP_CONTINUE;
}
