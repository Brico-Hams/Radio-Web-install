#include "bh_api.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int bh_diagnostics_event(const bh_api *api, const bh_event *event);

#define CHECK(condition) do { if (!(condition)) { \
    fprintf(stderr, "FAIL %u: %s\n", (unsigned)__LINE__, #condition); return EXIT_FAILURE; \
} } while (0)

typedef struct {
    unsigned calls;
    unsigned fail_at;
    char lines[8][22];
} display;

static int result(display *state)
{
    state->calls++;
    return state->calls == state->fail_at ? -1 : 0;
}

static int clear(void *context)
{
    display *state = context;
    memset(state->lines, 0, sizeof(state->lines));
    return result(state);
}

static int text(void *context, uint8_t row, const char *value)
{
    display *state = context;
    if (row >= 8 || strlen(value) >= sizeof(state->lines[0]))
        return -1;
    strcpy(state->lines[row], value);
    return result(state);
}

static int present(void *context)
{
    return result(context);
}

int main(void)
{
    display state = {0};
    bh_api api = {BH_API_VERSION, sizeof(bh_api), &state, clear, text, present, NULL, 0};
    bh_event event = {BH_EVENT_START, 0};
    CHECK(bh_diagnostics_event(&api, &event) == BH_APP_CONTINUE);
    CHECK(state.calls == 6 && strcmp(state.lines[0], "BRICOHAMS APPS") == 0);
    CHECK(strcmp(state.lines[6], "EXIT TO LAUNCHER") == 0);
    event.type = BH_EVENT_KEY;
    CHECK(bh_diagnostics_event(&api, &event) == BH_APP_CONTINUE && state.calls == 6);
    event.key = BH_KEY_EXIT;
    CHECK(bh_diagnostics_event(&api, &event) == BH_APP_EXIT && state.calls == 6);
    event.type = BH_EVENT_STOP;
    CHECK(bh_diagnostics_event(&api, &event) == BH_APP_EXIT);
    event.type = BH_EVENT_START;
    for (unsigned call = 1; call <= 6; ++call) {
        state.calls = 0;
        state.fail_at = call;
        CHECK(bh_diagnostics_event(&api, &event) == BH_APP_SERVICE_ERROR);
        CHECK(state.calls == call);
    }
    api.version++;
    CHECK(bh_diagnostics_event(&api, &event) == BH_APP_BAD_API);
    api.version = BH_API_VERSION;
    api.size--;
    CHECK(bh_diagnostics_event(&api, &event) == BH_APP_BAD_API);
    api.size = sizeof(api);
    api.text = NULL;
    CHECK(bh_diagnostics_event(&api, &event) == BH_APP_BAD_API);
    CHECK(bh_diagnostics_event(NULL, &event) == BH_APP_BAD_API);
    CHECK(bh_diagnostics_event(&api, NULL) == BH_APP_BAD_API);
    puts("Diagnostics app: display lifecycle, exit and service errors passed with mock services");
    return EXIT_SUCCESS;
}
