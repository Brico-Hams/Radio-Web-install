#include "bh_shell.h"
#include "bh_text.h"
#include "blocks.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define CHECK(condition) do { if (!(condition)) { \
    fprintf(stderr, "FAIL %u: %s\n", (unsigned)__LINE__, #condition); return EXIT_FAILURE; \
} } while (0)

static unsigned frames;
static int fail_present;
static int present(void *context)
{
    if (context == NULL) return -1;
    ++frames;
    return fail_present;
}

int main(void)
{
    bh_text screen;
    const bh_api api = {BH_API_VERSION, sizeof(bh_api), &screen,
        bh_text_clear, bh_text_write, present, NULL, 0};
    bh_shell shell;
    CHECK(bh_shell_init(&shell, &api, 0) == BH_APP_CONTINUE);
    CHECK(frames == 1 && shell.launcher.entry == NULL && shell.selected == 0);
    CHECK(bh_shell_step(&shell, BH_KEY_ROTATE, 10) == BH_APP_CONTINUE);
    CHECK(shell.launcher.entry != NULL && frames == 2);
    CHECK(bh_shell_step(&shell, BH_KEY_EXIT, 20) == BH_APP_CONTINUE);
    CHECK(shell.launcher.entry == NULL && frames == 3);
    CHECK(bh_shell_step(&shell, BH_KEY_DOWN, 30) == BH_APP_CONTINUE);
    CHECK(shell.selected == 1);
    CHECK(bh_shell_step(&shell, BH_KEY_ROTATE, 40) == BH_APP_CONTINUE);
    CHECK(shell.launcher.entry != NULL);
    unsigned before = frames;
    CHECK(bh_shell_step(&shell, 0, 539) == BH_APP_CONTINUE && frames == before);
    CHECK(bh_shell_step(&shell, 0, 540) == BH_APP_CONTINUE && frames == before + 1);
    before = frames;
    CHECK(bh_shell_step(&shell, 0, 5000) == BH_APP_CONTINUE && frames == before + 1);
    shell.tick_ms = UINT32_MAX - 200u;
    before = frames;
    CHECK(bh_shell_step(&shell, 0, 298) == BH_APP_CONTINUE && frames == before);
    CHECK(bh_shell_step(&shell, 0, 299) == BH_APP_CONTINUE && frames == before + 1);
    CHECK(bh_shell_step(&shell, BH_KEY_EXIT, 300) == BH_APP_CONTINUE);
    CHECK(shell.launcher.entry == NULL);
    fail_present = -1;
    CHECK(bh_shell_step(&shell, BH_KEY_DOWN, 310) == BH_APP_SERVICE_ERROR);
    fail_present = 0;
    CHECK(bh_shell_init(NULL, &api, 0) == BH_APP_BAD_API);
    CHECK(bh_shell_step(NULL, 0, 0) == BH_APP_BAD_API);

    CHECK(bh_text_clear(&screen) == 0);
    CHECK(bh_text_write(&screen, 0, "ABC 123") == 0);
    unsigned nonzero = 0;
    for (size_t i = 0; i < BH_TEXT_WIDTH; ++i) nonzero += screen.pixels[0][i] != 0;
    CHECK(nonzero != 0);
    const bh_text saved = screen;
    CHECK(bh_text_write(&screen, 8, "bad") == -1);
    CHECK(bh_text_write(&screen, 0, "1234567890123456789012") == -1);
    CHECK(bh_text_write(&screen, 0, NULL) == -1);
    CHECK(memcmp(&screen, &saved, sizeof(screen)) == 0);
    CHECK(bh_text_write(&screen, 0, "123456789012345678901") == 0);
    CHECK(screen.pixels[0][126] == 0 && screen.pixels[0][127] == 0);
    CHECK(bh_text_write(&screen, 0, "") == 0);
    for (size_t i = 0; i < BH_TEXT_WIDTH; ++i) CHECK(screen.pixels[0][i] == 0);
    CHECK(bh_text_clear(NULL) == -1);
    puts("Resident shell: menus, lifecycle, 500ms ticks, wrap, errors and text bounds passed");
    return EXIT_SUCCESS;
}
