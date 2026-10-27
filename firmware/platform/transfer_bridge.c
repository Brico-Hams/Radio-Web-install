/* Desktop integration harness, not a serial driver. */
#include "bh_stream.h"
#include "bh_store.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#ifdef _WIN32
#include <fcntl.h>
#include <io.h>
#endif

static uint8_t flash[2 * BH_STORE_BANK_SIZE];
static uint8_t staging[BH_TRANSFER_PACKAGE_MAX], scratch[BH_STORE_PACKAGE_MAX];
static uint8_t ram[BH_PACKAGE_RAM_MAX];
static unsigned installs;

static int read_flash(void *context, uint32_t offset, uint8_t *bytes, size_t size)
{
    (void)context;
    if (offset > sizeof(flash) || size > sizeof(flash) - offset) return -1;
    memcpy(bytes, flash + offset, size);
    return 0;
}
static int erase_flash(void *context, unsigned bank)
{
    (void)context;
    if (bank >= 2) return -1;
    memset(flash + bank * BH_STORE_BANK_SIZE, 0xff, BH_STORE_BANK_SIZE);
    return 0;
}
static int write_flash(void *context, uint32_t offset, const uint8_t *bytes, size_t size)
{
    (void)context;
    if (offset >= sizeof(flash) || size == 0 || size > 128 ||
        size > sizeof(flash) - offset || offset / 128 != (offset + size - 1u) / 128)
        return -1;
    for (size_t i = 0; i < size; ++i) flash[offset + i] &= bytes[i];
    return 0;
}
static const bh_store_io io = {NULL, read_flash, erase_flash, write_flash};

static int install(void *context, const uint8_t *bytes, size_t size)
{
    (void)context;
    bh_store_record record;
    const bh_store_result result = bh_store_install(&io, 3, bytes, size,
        scratch, sizeof(scratch), &record);
    if (result != BH_STORE_OK) return (int)result;
    if (bh_store_load(&io, 3, scratch, sizeof(scratch), ram, sizeof(ram), &record) != BH_STORE_OK)
        return -100;
    if (memcmp(bytes + BH_PACKAGE_HEADER_SIZE, ram,
        record.package.code_size + record.package.data_size) != 0)
        return -101;
    ++installs;
    return 0;
}

int main(int argc, char **argv)
{
    if (argc != 2) return EXIT_FAILURE;
#ifdef _WIN32
    if (_setmode(_fileno(stdin), _O_BINARY) == -1 ||
        _setmode(_fileno(stdout), _O_BINARY) == -1) return EXIT_FAILURE;
#endif
    memset(flash, 0xff, sizeof(flash));
    bh_transfer transfer;
    if (bh_transfer_init(&transfer, staging, sizeof(staging), 3, NULL, install) != 0)
        return EXIT_FAILURE;
    bh_stream stream;
    if (bh_stream_init(&stream, &transfer) != 0) return EXIT_FAILURE;
    uint8_t reply[BH_TRANSFER_REPLY];
    uint32_t now = 0;
    for (;;) {
        const int byte = fgetc(stdin);
        if (byte == EOF) {
            if (ferror(stdin)) return EXIT_FAILURE;
            break;
        }
        const bh_stream_result result = bh_stream_push(&stream, (uint8_t)byte, now++, reply);
        if (result == BH_STREAM_INVALID || result == BH_STREAM_BUSY)
            return EXIT_FAILURE;
        if (result == BH_STREAM_REPLY &&
            (fwrite(reply, 1, sizeof(reply), stdout) != sizeof(reply) || fflush(stdout) != 0))
            return EXIT_FAILURE;
    }
    bh_store_record record;
    if (bh_store_read(&io, 3, scratch, sizeof(scratch), &record) != BH_STORE_OK ||
        record.generation != installs || installs != (unsigned)strtoul(argv[1], NULL, 10))
        return EXIT_FAILURE;
    fprintf(stderr, "Verified %u installs, generation %u, bank %u\n",
        installs, (unsigned)record.generation, record.bank);
    return EXIT_SUCCESS;
}
