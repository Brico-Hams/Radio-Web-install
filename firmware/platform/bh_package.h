/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BH_PACKAGE_H
#define BH_PACKAGE_H

#include <stddef.h>
#include <stdint.h>

#define BH_PACKAGE_HEADER_SIZE 64u
#define BH_PACKAGE_CODE_MAX 4096u
#define BH_PACKAGE_DATA_MAX 1024u
#define BH_PACKAGE_RAM_MAX 4096u
#define BH_PACKAGE_API_VERSION 2u
#define BH_PACKAGE_CAP_DISPLAY 1u
#define BH_PACKAGE_CAP_KEYS 2u
#define BH_PACKAGE_CAP_RX 4u
#define BH_PACKAGE_CAP_MASK 7u

typedef enum {
    BH_PACKAGE_OK = 0,
    BH_PACKAGE_INVALID,
    BH_PACKAGE_INCOMPATIBLE,
    BH_PACKAGE_CORRUPT,
    BH_PACKAGE_CAPABILITY_DENIED,
    BH_PACKAGE_NO_SPACE
} bh_package_result;

typedef struct {
    uint32_t code_size;
    uint32_t data_size;
    uint32_t bss_size;
    uint32_t entry_offset;
    uint32_t capabilities;
    char name[17];
} bh_package_info;

uint32_t bh_package_crc32(const uint8_t *bytes, size_t size);
bh_package_result bh_package_inspect(const uint8_t *bytes, size_t size,
    uint32_t allowed_capabilities, bh_package_info *info);
bh_package_result bh_package_load(const uint8_t *bytes, size_t size,
    uint32_t allowed_capabilities, uint8_t *ram, size_t ram_size,
    bh_package_info *info);

#endif
