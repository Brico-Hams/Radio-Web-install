/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BH_STORE_H
#define BH_STORE_H

#include "bh_package.h"

#define BH_STORE_BANK_SIZE 8192u
#define BH_STORE_HEADER_SIZE 32u
#define BH_STORE_PACKAGE_MAX (BH_PACKAGE_HEADER_SIZE + BH_PACKAGE_RAM_MAX)

typedef struct {
    void *context;
    int (*read)(void *context, uint32_t offset, uint8_t *bytes, size_t size);
    int (*erase_bank)(void *context, unsigned bank);
    int (*write)(void *context, uint32_t offset, const uint8_t *bytes, size_t size);
} bh_store_io;

typedef enum {
    BH_STORE_OK = 0,
    BH_STORE_EMPTY,
    BH_STORE_INVALID,
    BH_STORE_IO_ERROR,
    BH_STORE_CORRUPT,
    BH_STORE_GENERATION_EXHAUSTED,
    BH_STORE_NO_SPACE
} bh_store_result;

typedef struct {
    unsigned bank;
    uint32_t generation;
    uint32_t size;
    bh_package_info package;
} bh_store_record;

bh_store_result bh_store_read(const bh_store_io *io, uint32_t capabilities,
    uint8_t *scratch, size_t scratch_size, bh_store_record *record);
bh_store_result bh_store_install(const bh_store_io *io, uint32_t capabilities,
    const uint8_t *package, size_t package_size, uint8_t *scratch,
    size_t scratch_size, bh_store_record *record);
bh_store_result bh_store_load(const bh_store_io *io, uint32_t capabilities,
    uint8_t *scratch, size_t scratch_size, uint8_t *ram, size_t ram_size,
    bh_store_record *record);

#endif
