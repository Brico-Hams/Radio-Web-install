#include "blocks.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHECK(condition) do { if (!(condition)) { \
    fprintf(stderr, "FAIL %u: %s\n", (unsigned)__LINE__, #condition); return EXIT_FAILURE; \
} } while (0)

typedef struct { char rows[8][22]; unsigned draws; bool fail; } screen;
static int clear(void *context) { screen *s = context; memset(s->rows, 0, sizeof(s->rows)); return s->fail ? -1 : 0; }
static int text(void *context, uint8_t row, const char *value)
{
    screen *s = context;
    if (row >= 8 || strlen(value) >= 22) return -1;
    strcpy(s->rows[row], value);
    return 0;
}
static int present(void *context) { ((screen *)context)->draws++; return 0; }

int main(void)
{
    screen display = {0};
    bh_blocks_state state = {0};
    bh_api api = {BH_API_VERSION, sizeof(bh_api), &display, clear, text, present, &state, sizeof(state)};
    bh_event event = {BH_EVENT_TICK, 0};
    CHECK(bh_blocks_event(&api, &event) == BH_APP_BAD_API);
    event.type = BH_EVENT_START;
    CHECK(bh_blocks_event(&api, &event) == 0 && state.initialized && !state.game_over);
    CHECK(strcmp(display.rows[0], "BRICOHAMS BLOCKS") == 0 && display.draws == 1);
    state.shape = 1; state.rotation = 0; state.x = -1; state.y = 0;
    event.type = BH_EVENT_KEY; event.key = BH_KEY_LEFT;
    CHECK(bh_blocks_event(&api, &event) == 0 && state.x == -1);
    event.key = BH_KEY_RIGHT;
    CHECK(bh_blocks_event(&api, &event) == 0 && state.x == 0);
    state.shape = 2;
    event.key = BH_KEY_ROTATE;
    CHECK(bh_blocks_event(&api, &event) == 0 && state.rotation == 1);
    state.shape = 0; state.rotation = 0; state.x = 3; state.y = 3;
    state.rows[5] = (uint16_t)(0x03ffu & ~(15u << 3));
    event.key = BH_KEY_DROP;
    CHECK(bh_blocks_event(&api, &event) == 0 && state.lines == 1 && !state.game_over);
    for (unsigned row = 0; row < BH_BLOCKS_HEIGHT; ++row) CHECK(state.rows[row] == 0);
    state.shape = 1; state.rotation = 0; state.x = 3; state.y = 0;
    state.rows[2] = 0x03ff;
    state.rows[0] = 1;
    state.rows[1] = 1;
    event.key = BH_KEY_DOWN;
    CHECK(bh_blocks_event(&api, &event) == 0 && state.game_over);
    CHECK(strcmp(display.rows[0], "BLOCKS: GAME OVER") == 0);
    event.key = BH_KEY_RESTART;
    CHECK(bh_blocks_event(&api, &event) == 0 && !state.game_over && state.lines == 0);
    for (unsigned iteration = 0; iteration < 10000; ++iteration) {
        event.type = BH_EVENT_KEY;
        event.key = (iteration % 5u) + BH_KEY_LEFT;
        CHECK(bh_blocks_event(&api, &event) == 0);
        for (unsigned row = 0; row < BH_BLOCKS_HEIGHT; ++row)
            CHECK((state.rows[row] & ~0x03ffu) == 0);
        if (state.game_over) { event.key = BH_KEY_RESTART; CHECK(bh_blocks_event(&api, &event) == 0); }
    }
    display.fail = true;
    CHECK(bh_blocks_event(&api, &event) == BH_APP_SERVICE_ERROR);
    display.fail = false;
    event.key = BH_KEY_EXIT;
    CHECK(bh_blocks_event(&api, &event) == BH_APP_EXIT);
    api.app_state_size = 1;
    CHECK(bh_blocks_event(&api, &event) == BH_APP_BAD_API);
    CHECK(bh_blocks_event(NULL, &event) == BH_APP_BAD_API);
    puts("Blocks: movement, rotation, line clear, game over, restart and 10000 mock events passed");
    return EXIT_SUCCESS;
}
