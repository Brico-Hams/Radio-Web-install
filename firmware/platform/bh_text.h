/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BH_TEXT_H
#define BH_TEXT_H
#include "bh_api.h"
#define BH_TEXT_WIDTH 128u
#define BH_TEXT_ROWS 8u
typedef struct {
    uint8_t pixels[BH_TEXT_ROWS][BH_TEXT_WIDTH];
} bh_text;
int bh_text_clear(void *context);
int bh_text_write(void *context, uint8_t row, const char *text);
#endif
