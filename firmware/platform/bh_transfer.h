/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BH_TRANSFER_H
#define BH_TRANSFER_H
#include "bh_package.h"
#include <stdbool.h>

#define BH_TRANSFER_CHUNK 128u
#define BH_TRANSFER_HEADER 24u
#define BH_TRANSFER_REPLY 32u
#define BH_TRANSFER_PACKAGE_MAX (BH_PACKAGE_HEADER_SIZE + BH_PACKAGE_RAM_MAX)
#define BH_TRANSFER_TIMEOUT_MS 30000u
#define BH_TRANSFER_BEGIN 1u
#define BH_TRANSFER_DATA 2u
#define BH_TRANSFER_COMMIT 3u
#define BH_TRANSFER_ABORT 4u
#define BH_TRANSFER_STATUS 5u

typedef enum {
    BH_TRANSFER_OK = 0,
    BH_TRANSFER_BAD_FRAME,
    BH_TRANSFER_BAD_SESSION,
    BH_TRANSFER_BUSY,
    BH_TRANSFER_BAD_OFFSET,
    BH_TRANSFER_INCOMPLETE,
    BH_TRANSFER_BAD_PACKAGE,
    BH_TRANSFER_INSTALL_ERROR,
    BH_TRANSFER_EXPIRED,
    BH_TRANSFER_BAD_STATE
} bh_transfer_result;

typedef enum {
    BH_TRANSFER_IDLE = 0, BH_TRANSFER_RECEIVING, BH_TRANSFER_DONE,
    BH_TRANSFER_FAILED, BH_TRANSFER_CANCELLED, BH_TRANSFER_TIMED_OUT
} bh_transfer_state;

typedef struct {
    uint8_t *buffer;
    size_t capacity;
    uint32_t capabilities;
    void *context;
    int (*install)(void *context, const uint8_t *package, size_t size);
    uint32_t session, total, crc, received, last_ms;
    int install_result;
    bh_transfer_state state;
    bool dispatching;
} bh_transfer;

/* Instance, staging, request and reply must be independent; serialize calls.
 * A busy reentrant request leaves reply untouched. Other initialized requests
 * return a wire reply even on failure. Timeout is checked on valid requests.
 */
int bh_transfer_init(bh_transfer *transfer, uint8_t *buffer, size_t capacity,
    uint32_t capabilities, void *context,
    int (*install)(void *context, const uint8_t *package, size_t size));
bh_transfer_result bh_transfer_request(bh_transfer *transfer, const uint8_t *request,
    size_t size, uint32_t now, uint8_t reply[BH_TRANSFER_REPLY]);
#endif
