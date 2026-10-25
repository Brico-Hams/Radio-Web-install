/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BRICOHAMS_CAT_RX_H
#define BRICOHAMS_CAT_RX_H
#include <stdbool.h>
#include <stdint.h>

#define BH_CAT_REQUEST_SIZE 8U
#define BH_CAT_REPLY_SIZE 16U
#define BH_CAT_TIMEOUT_MS 3000U

typedef struct {
    uint32_t nominal;
    uint32_t target;
    uint32_t applied;
    uint32_t last_command;
    bool active;
    bool remote;
    bool pending;
} bh_cat_rx;

extern bh_cat_rx bh_cat_receiver;

bool bh_cat_frequency_valid(uint32_t frequency);
bool bh_cat_start(bh_cat_rx *state, uint32_t nominal);
void bh_cat_stop(bh_cat_rx *state);
void bh_cat_local(bh_cat_rx *state, uint32_t applied);
bool bh_cat_expire(bh_cat_rx *state, uint32_t now);
void bh_cat_applied(bh_cat_rx *state);
void bh_cat_request(bh_cat_rx *state, const uint8_t *request, uint16_t length,
    uint32_t now, uint8_t reply[BH_CAT_REPLY_SIZE]);
#endif
