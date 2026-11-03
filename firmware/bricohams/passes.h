/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BRICOHAMS_PASSES_H
#define BRICOHAMS_PASSES_H

#include <stdbool.h>
#include <stdint.h>

/* One 4 KiB sector of the ACTIVE config bank: logical addresses below
 * PY25Q16_BANK_SHARED_FROM (0x010000) are banked by the flash driver, and the
 * live config ends at 0x00A178, so calibration (0x010000) is never touched. */
#define BH_PASS_FLASH_ADDR 0x00F000U
#define BH_PASS_MAGIC "BHPS"
#define BH_PASS_MAX 64U
#define BH_PASS_ENTRY_BYTES 32U
#define BH_PASS_ENTRIES_OFFSET 32U
#define BH_PASS_FRAME_MAX 4U
#define BH_PASS_REQUEST_HEADER 12U
#define BH_PASS_REPLY_HEADER 12U
#define BH_PASS_REPLY_MAX (BH_PASS_REPLY_HEADER + BH_PASS_FRAME_MAX * BH_PASS_ENTRY_BYTES)
#define BH_PASS_MAX_DURATION_S 7200U
#define BH_PASS_MIN_HOST_UNIX 1577836800U /* 2020-01-01T00:00:00Z */

enum {
    BH_PASS_OP_INFO = 0,
    BH_PASS_OP_CLEAR,
    BH_PASS_OP_WRITE,
    BH_PASS_OP_COMMIT,
    BH_PASS_OP_READ
};

enum {
    BH_PASS_STATUS_OK = 0,
    BH_PASS_STATUS_LENGTH = 2,
    BH_PASS_STATUS_VERSION = 3,
    BH_PASS_STATUS_OP = 4,
    BH_PASS_STATUS_AUTH = 5,
    BH_PASS_STATUS_RANGE = 6,
    BH_PASS_STATUS_ENTRY = 7,
    BH_PASS_STATUS_VERIFY = 8
};

typedef struct {
    uint32_t norad;
    char name[9];
    uint32_t aos;           /* UTC seconds since 1970 */
    uint16_t tca_offset;    /* seconds after AOS */
    uint16_t los_offset;    /* seconds after AOS */
    uint8_t max_elevation;  /* degrees */
    uint16_t aos_azimuth;   /* degrees */
    uint16_t los_azimuth;   /* degrees */
    uint32_t downlink_10hz; /* 0 = unknown */
} bh_pass;

bool bh_pass_decode(const uint8_t input[BH_PASS_ENTRY_BYTES], bh_pass *pass);
uint8_t bh_pass_count(void);
bool bh_pass_read(uint8_t index, bh_pass *pass);
/* UTC seconds from the clock the host last set, or 0 when it was never set. */
uint32_t bh_pass_clock(uint32_t now_ms);
void bh_pass_civil(uint32_t unix_seconds, uint8_t *day, uint8_t *hour, uint8_t *minute);
uint16_t BH_PASS_Request(const uint8_t *request, uint16_t length, bool authenticated,
    uint32_t now_ms, uint8_t reply[BH_PASS_REPLY_MAX]);

#endif
