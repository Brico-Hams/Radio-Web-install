#include "bh_store.h"
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHECK(condition) do { if (!(condition)) { \
    fprintf(stderr, "FAIL %u: %s\n", (unsigned)__LINE__, #condition); return EXIT_FAILURE; \
} } while (0)
typedef struct {
    uint8_t flash[2 * BH_STORE_BANK_SIZE];
    unsigned operations;
    unsigned fail_at;
    bool partial;
    bool silent_write;
    bool invalid_write;
    bool silent_erase;
} device;
static device radio;
static uint8_t original_flash[sizeof(radio.flash)];
static uint8_t scratch[BH_STORE_PACKAGE_MAX];
static bool fail(device *state) { return ++state->operations == state->fail_at; }
static int read_flash(void *context, uint32_t address, uint8_t *bytes, size_t size)
{
    device *state = context;
    if (address > sizeof(state->flash) || size > sizeof(state->flash) - address || fail(state))
        return -1;
    memcpy(bytes, state->flash + address, size);
    return 0;
}
static int erase(void *context, unsigned bank)
{
    device *state = context;
    if (bank >= 2) return -1;
    const bool failed = fail(state);
    if (state->silent_erase) return failed ? -1 : 0;
    if (!failed || state->partial)
        memset(state->flash + bank * BH_STORE_BANK_SIZE, 0xff, failed ? 1024 : BH_STORE_BANK_SIZE);
    return failed ? -1 : 0;
}
static int write_flash(void *context, uint32_t address, const uint8_t *bytes, size_t size)
{
    device *state = context;
    if (address >= sizeof(state->flash) || size == 0 || size > 128 ||
        size > sizeof(state->flash) - address || address / 128 != (address + size - 1) / 128) {
        state->invalid_write = true;
        return -1;
    }
    const bool failed = fail(state);
    if (state->silent_write) return 0;
    if (!failed || state->partial)
        for (size_t i = 0; i < (failed ? size / 2 : size); ++i)
            state->flash[address + i] &= bytes[i];
    return failed ? -1 : 0;
}
static void put32(uint8_t *bytes, uint32_t value)
{
    for (unsigned i = 0; i < 4; ++i) bytes[i] = (uint8_t)(value >> (i * 8));
}
static void fixture(uint8_t *bytes, size_t size, const char *name)
{
    memset(bytes, 0, size);
    memcpy(bytes, "BHA1", 4);
    put32(bytes + 4, 64);
    put32(bytes + 8, BH_PACKAGE_API_VERSION);
    put32(bytes + 12, 1);
    put32(bytes + 16, (uint32_t)size - 64);
    memcpy(bytes + 40, name, strlen(name));
    put32(bytes + 36, bh_package_crc32(bytes + 64, size - 64));
    put32(bytes + 60, bh_package_crc32(bytes, 60));
}
int main(void)
{
    uint8_t first[320], second[448];
    fixture(first, sizeof(first), "First");
    fixture(second, sizeof(second), "Second");
    memset(radio.flash, 0xff, sizeof(radio.flash));
    const bh_store_io io = {&radio, read_flash, erase, write_flash};
    bh_store_record record;
    CHECK(bh_store_read(&io, 7, scratch, sizeof(scratch), &record) == BH_STORE_EMPTY);
    CHECK(bh_store_install(&io, 7, first, sizeof(first), scratch, sizeof(scratch), &record) == BH_STORE_OK);
    CHECK(record.bank == 0 && record.generation == 1 && strcmp(record.package.name, "First") == 0);
    memcpy(original_flash, radio.flash, sizeof(original_flash));
    radio.operations = 0;
    CHECK(bh_store_install(&io, 7, second, sizeof(second), scratch, sizeof(scratch), &record) == BH_STORE_OK);
    const unsigned operations = radio.operations;
    CHECK(record.bank == 1 && record.generation == 2);
    CHECK(!radio.invalid_write && memcmp(original_flash, radio.flash, BH_STORE_BANK_SIZE) == 0);
    for (unsigned partial = 0; partial < 2; ++partial)
        for (unsigned interruption = 1; interruption <= operations; ++interruption) {
            memcpy(radio.flash, original_flash, sizeof(original_flash));
            radio.operations = 0; radio.fail_at = interruption; radio.partial = partial != 0;
            CHECK(bh_store_install(&io, 7, second, sizeof(second), scratch, sizeof(scratch), &record) != BH_STORE_OK);
            CHECK(memcmp(original_flash, radio.flash, BH_STORE_BANK_SIZE) == 0);
            radio.fail_at = 0;
            CHECK(bh_store_read(&io, 7, scratch, sizeof(scratch), &record) == BH_STORE_OK);
            CHECK(record.generation == 1 || record.generation == 2);
            if (record.generation == 1) CHECK(memcmp(scratch, first, sizeof(first)) == 0);
            else CHECK(memcmp(scratch, second, sizeof(second)) == 0);
        }
    memcpy(radio.flash, original_flash, sizeof(original_flash));
    radio.fail_at = 0; radio.partial = false; radio.silent_write = true;
    CHECK(bh_store_install(&io, 7, second, sizeof(second), scratch, sizeof(scratch), &record) == BH_STORE_CORRUPT);
    radio.silent_write = false;
    CHECK(bh_store_read(&io, 7, scratch, sizeof(scratch), &record) == BH_STORE_OK && record.generation == 1);
    CHECK(bh_store_install(&io, 7, first, sizeof(first), first, sizeof(first), &record) == BH_STORE_INVALID);
    CHECK(bh_store_install(&io, 7, scratch, sizeof(first), scratch, sizeof(scratch), &record) == BH_STORE_INVALID);
    CHECK(bh_store_install(&io, 7, NULL, 0, scratch, sizeof(scratch), &record) == BH_STORE_INVALID);
    CHECK(bh_store_install(&io, 7, second, sizeof(second), scratch, sizeof(scratch), &record) == BH_STORE_OK);
    radio.flash[BH_STORE_BANK_SIZE + BH_STORE_HEADER_SIZE + 65] ^= 1;
    CHECK(bh_store_read(&io, 7, scratch, sizeof(scratch), &record) == BH_STORE_OK && record.generation == 1);
    CHECK(bh_store_install(&io, 7, second, sizeof(second), scratch, sizeof(scratch), &record) == BH_STORE_OK);
    CHECK(bh_store_install(&io, 7, first, sizeof(first), scratch, sizeof(scratch), &record) == BH_STORE_OK);
    CHECK(record.bank == 0 && record.generation == 3);
    memcpy(radio.flash, original_flash, sizeof(original_flash));
    put32(radio.flash + 8, UINT32_MAX);
    put32(radio.flash + 24, bh_package_crc32(radio.flash, 24));
    CHECK(bh_store_install(&io, 7, second, sizeof(second), scratch, sizeof(scratch), &record) == BH_STORE_GENERATION_EXHAUSTED);
    radio.flash[24] ^= 1;
    CHECK(bh_store_read(&io, 7, scratch, sizeof(scratch), &record) == BH_STORE_CORRUPT);
    CHECK(bh_store_install(&io, 7, second, sizeof(second), scratch, sizeof(scratch), &record) == BH_STORE_CORRUPT);
    memcpy(radio.flash, original_flash, sizeof(original_flash));
    first[65] ^= 1;
    CHECK(bh_store_install(&io, 7, first, sizeof(first), scratch, sizeof(scratch), &record) == BH_STORE_INVALID);
    first[65] ^= 1;
    memcpy(radio.flash, original_flash, sizeof(original_flash));
    CHECK(bh_store_install(&io, 7, second, sizeof(second), scratch, sizeof(scratch), &record) == BH_STORE_OK);
    memcpy(original_flash, radio.flash, sizeof(original_flash));
    radio.silent_erase = true;
    CHECK(bh_store_install(&io, 7, first, sizeof(first), scratch, sizeof(scratch), &record) == BH_STORE_CORRUPT);
    CHECK(memcmp(original_flash, radio.flash, sizeof(original_flash)) == 0);
    radio.silent_erase = false;
    CHECK(bh_store_read(&io, 7, scratch, sizeof(scratch), &record) == BH_STORE_OK && record.generation == 2);

    memset(radio.flash, 0xff, sizeof(radio.flash));
    radio.operations = 0;
    CHECK(bh_store_install(&io, 7, first, sizeof(first), scratch, sizeof(scratch), &record) == BH_STORE_OK);
    const unsigned initial_operations = radio.operations;
    for (unsigned partial = 0; partial < 2; ++partial)
        for (unsigned interruption = 1; interruption <= initial_operations; ++interruption) {
            memset(radio.flash, 0xff, sizeof(radio.flash));
            radio.operations = 0; radio.fail_at = interruption; radio.partial = partial != 0;
            CHECK(bh_store_install(&io, 7, first, sizeof(first), scratch, sizeof(scratch), &record) != BH_STORE_OK);
            radio.fail_at = 0;
            const bh_store_result result = bh_store_read(&io, 7, scratch, sizeof(scratch), &record);
            CHECK(result == BH_STORE_EMPTY || result == BH_STORE_OK);
            if (result == BH_STORE_OK)
                CHECK(record.generation == 1 && memcmp(scratch, first, sizeof(first)) == 0);
        }
    radio.partial = false;
    static uint8_t ram[BH_PACKAGE_RAM_MAX];
    uint8_t with_bss[320];
    fixture(with_bss, sizeof(with_bss), "Load");
    put32(with_bss + 20, 16);
    put32(with_bss + 16, sizeof(with_bss) - BH_PACKAGE_HEADER_SIZE - 16u);
    put32(with_bss + 24, 32);
    memset(with_bss + BH_PACKAGE_HEADER_SIZE, 0x5a, sizeof(with_bss) - BH_PACKAGE_HEADER_SIZE);
    put32(with_bss + 36, bh_package_crc32(with_bss + BH_PACKAGE_HEADER_SIZE,
        sizeof(with_bss) - BH_PACKAGE_HEADER_SIZE));
    put32(with_bss + 60, bh_package_crc32(with_bss, 60));
    memset(radio.flash, 0xff, sizeof(radio.flash));
    memset(ram, 0xcc, sizeof(ram));
    CHECK(bh_store_load(&io, 7, scratch, sizeof(scratch), ram, sizeof(ram), &record) == BH_STORE_EMPTY);
    CHECK(ram[0] == 0xcc);
    CHECK(bh_store_install(&io, 7, with_bss, sizeof(with_bss), scratch, sizeof(scratch), &record) == BH_STORE_OK);
    const bh_store_record before_load = record;
    CHECK(bh_store_load(&io, 7, scratch, sizeof(scratch), ram, 255, &record) == BH_STORE_NO_SPACE);
    CHECK(memcmp(&record, &before_load, sizeof(record)) == 0);
    for (size_t i = 0; i < sizeof(ram); ++i) CHECK(ram[i] == 0xcc);
    CHECK(bh_store_load(&io, 7, scratch, sizeof(scratch), scratch + 1, 100, &record) == BH_STORE_INVALID);
    CHECK(bh_store_load(&io, 7, scratch, sizeof(scratch), ram, sizeof(ram), &record) == BH_STORE_OK);
    CHECK(record.package.bss_size == 32 && strcmp(record.package.name, "Load") == 0);
    for (size_t i = 0; i < 256; ++i) CHECK(ram[i] == 0x5a);
    for (size_t i = 256; i < 288; ++i) CHECK(ram[i] == 0);
    CHECK(ram[288] == 0xcc);
    memset(ram, 0xcc, sizeof(ram));
    radio.fail_at = radio.operations + 1;
    CHECK(bh_store_load(&io, 7, scratch, sizeof(scratch), ram, sizeof(ram), &record) == BH_STORE_IO_ERROR);
    CHECK(ram[0] == 0xcc);
    radio.fail_at = 0;
    static uint8_t largest[BH_PACKAGE_HEADER_SIZE + BH_PACKAGE_CODE_MAX];
    fixture(largest, sizeof(largest), "Maximum");
    memset(radio.flash, 0xff, sizeof(radio.flash));
    CHECK(bh_store_install(&io, 7, largest, sizeof(largest), scratch, sizeof(scratch), &record) == BH_STORE_OK);
    CHECK(record.size == sizeof(largest) && memcmp(scratch, largest, sizeof(largest)) == 0);
    CHECK(bh_store_read(&io, 7, scratch, sizeof(scratch), &record) == BH_STORE_OK);
    CHECK(BH_STORE_PACKAGE_MAX == 4160u);
    const unsigned before_small_scratch = radio.operations;
    CHECK(bh_store_read(&io, 7, scratch, sizeof(scratch) - 1u, &record) == BH_STORE_INVALID);
    CHECK(bh_store_install(&io, 7, largest, sizeof(largest), scratch, sizeof(scratch) - 1u,
        &record) == BH_STORE_INVALID);
    CHECK(radio.operations == before_small_scratch);
    put32(largest + 16, BH_PACKAGE_RAM_MAX - BH_PACKAGE_DATA_MAX);
    put32(largest + 20, BH_PACKAGE_DATA_MAX);
    put32(largest + 60, bh_package_crc32(largest, 60));
    CHECK(bh_store_install(&io, 7, largest, sizeof(largest), scratch, sizeof(scratch), &record) == BH_STORE_OK);
    CHECK(record.package.data_size == BH_PACKAGE_DATA_MAX);
    CHECK(bh_store_load(&io, 7, scratch, sizeof(scratch), ram, sizeof(ram), &record) == BH_STORE_OK);
    CHECK(memcmp(ram, largest + BH_PACKAGE_HEADER_SIZE, sizeof(ram)) == 0);
    memcpy(radio.flash + (record.bank ^ 1u) * BH_STORE_BANK_SIZE,
        radio.flash + record.bank * BH_STORE_BANK_SIZE, BH_STORE_BANK_SIZE);
    CHECK(bh_store_read(&io, 7, scratch, sizeof(scratch), &record) == BH_STORE_CORRUPT);
    CHECK(!radio.invalid_write);
    printf("Dual-bank store: %u interruption/failure scenarios, erase verification, maximum package and generation checks passed\n",
        (operations + initial_operations) * 2);
    return EXIT_SUCCESS;
}
