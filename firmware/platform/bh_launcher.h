/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BH_LAUNCHER_H
#define BH_LAUNCHER_H

#include "bh_api.h"
#include <stdbool.h>

#define BH_LAUNCHER_STATE_BYTES 256u
#define BH_LAUNCHER_BUSY (-3)

typedef union {
    uint64_t alignment;
    uint8_t bytes[BH_LAUNCHER_STATE_BYTES];
} bh_launcher_memory;

typedef struct {
    bh_api api;
    bh_app_entry entry;
    bh_launcher_memory state;
    bool dispatching;
} bh_launcher;

int bh_launcher_init(bh_launcher *launcher, const bh_api *services);
int bh_launcher_start(bh_launcher *launcher, bh_app_entry entry);
int bh_launcher_dispatch(bh_launcher *launcher, const bh_event *event);
int bh_launcher_stop(bh_launcher *launcher);

#endif
