/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BH_API_H
#define BH_API_H

#include <stddef.h>
#include <stdint.h>

#define BH_API_VERSION 2u
#define BH_EVENT_START 0u
#define BH_EVENT_KEY 1u
#define BH_EVENT_STOP 2u
#define BH_EVENT_TICK 3u
#define BH_KEY_EXIT 1u
#define BH_KEY_LEFT 2u
#define BH_KEY_RIGHT 3u
#define BH_KEY_ROTATE 4u
#define BH_KEY_DOWN 5u
#define BH_KEY_DROP 6u
#define BH_KEY_RESTART 7u
#define BH_APP_CONTINUE 0
#define BH_APP_EXIT 1
#define BH_APP_BAD_API (-1)
#define BH_APP_SERVICE_ERROR (-2)

typedef struct {
    uint32_t version;
    uint32_t size;
    void *context;
    int (*clear)(void *context);
    int (*text)(void *context, uint8_t row, const char *text);
    int (*present)(void *context);
    void *app_state;
    uint32_t app_state_size;
} bh_api;

typedef struct {
    uint32_t type;
    uint32_t key;
} bh_event;

typedef int (*bh_app_entry)(const bh_api *api, const bh_event *event);

#endif
