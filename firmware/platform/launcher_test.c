#include "bh_launcher.h"
#include "blocks.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int bh_diagnostics_event(const bh_api *api, const bh_event *event);
#define CHECK(condition) do { if (!(condition)) { \
    fprintf(stderr, "FAIL %u: %s\n", (unsigned)__LINE__, #condition); return EXIT_FAILURE; \
} } while (0)
static bh_launcher launcher;
static bool fail_display;
static unsigned stops;
static int nested_result;
static int clear(void *context) { (void)context; return fail_display ? -1 : 0; }
static int text(void *context, uint8_t row, const char *value)
{
    (void)context;
    return row < 8 && strlen(value) <= 21 ? 0 : -1;
}
static int present(void *context) { (void)context; return 0; }
static int reentrant(const bh_api *api, const bh_event *event)
{
    (void)api;
    if (event->type == BH_EVENT_STOP) { stops++; return BH_APP_EXIT; }
    const bh_event tick = {BH_EVENT_TICK, 0};
    nested_result = bh_launcher_dispatch(&launcher, &tick);
    return BH_APP_CONTINUE;
}
static bool empty(void)
{
    for (unsigned i = 0; i < BH_LAUNCHER_STATE_BYTES; ++i)
        if (launcher.state.bytes[i] != 0) return false;
    return true;
}
int main(void)
{
    const bh_api services = {BH_API_VERSION, sizeof(bh_api), NULL, clear, text, present, NULL, 0};
    CHECK(sizeof(bh_blocks_state) <= BH_LAUNCHER_STATE_BYTES);
    CHECK(bh_launcher_init(&launcher, &services) == 0);
    CHECK(bh_launcher_start(&launcher, bh_blocks_event) == 0);
    CHECK(!empty() && launcher.entry == bh_blocks_event);
    bh_event event = {BH_EVENT_START, 0};
    CHECK(bh_launcher_dispatch(&launcher, &event) == BH_APP_BAD_API);
    event.type = BH_EVENT_TICK;
    CHECK(bh_launcher_dispatch(&launcher, &event) == 0);
    CHECK(bh_launcher_start(&launcher, bh_diagnostics_event) == 0 && empty());
    event.type = BH_EVENT_KEY; event.key = BH_KEY_EXIT;
    CHECK(bh_launcher_dispatch(&launcher, &event) == BH_APP_EXIT);
    CHECK(launcher.entry == NULL && empty());
    CHECK(bh_launcher_start(&launcher, reentrant) == 0 && nested_result == BH_LAUNCHER_BUSY);
    CHECK(bh_launcher_start(&launcher, bh_blocks_event) == 0 && stops == 1);
    fail_display = true;
    event.type = BH_EVENT_TICK;
    CHECK(bh_launcher_dispatch(&launcher, &event) == BH_APP_SERVICE_ERROR);
    CHECK(launcher.entry == NULL && empty());
    CHECK(bh_launcher_start(&launcher, bh_blocks_event) == BH_APP_SERVICE_ERROR);
    CHECK(launcher.entry == NULL && empty());
    fail_display = false;
    CHECK(bh_launcher_stop(&launcher) == 0);
    CHECK(bh_launcher_start(&launcher, NULL) == BH_APP_BAD_API);
    CHECK(bh_launcher_init(NULL, &services) == BH_APP_BAD_API);
    CHECK(bh_launcher_start(&launcher, bh_blocks_event) == 0);
    CHECK(bh_launcher_stop(&launcher) == BH_APP_EXIT && empty());
    puts("Launcher: app switching, cleanup, reentrancy, exit and failure handling passed");
    return EXIT_SUCCESS;
}
