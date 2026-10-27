/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BH_SHELL_H
#define BH_SHELL_H
#include "bh_launcher.h"

typedef struct {
    bh_launcher launcher;
    uint32_t tick_ms;
    unsigned selected;
} bh_shell;

int bh_shell_init(bh_shell *shell, const bh_api *services, uint32_t now);
int bh_shell_step(bh_shell *shell, uint32_t key, uint32_t now);
#endif
