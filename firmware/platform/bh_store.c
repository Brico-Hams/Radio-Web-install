/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bh_store.h"
#include <stdbool.h>
#include <string.h>

static uint32_t read32(const uint8_t *bytes)
{
    return (uint32_t)bytes[0] | ((uint32_t)bytes[1] << 8) |
        ((uint32_t)bytes[2] << 16) | ((uint32_t)bytes[3] << 24);
}

static void write32(uint8_t *bytes, uint32_t value)
{
    for (unsigned index = 0; index < 4; ++index)
        bytes[index] = (uint8_t)(value >> (index * 8u));
}

static bool valid_io(const bh_store_io *io)
{
    return io != NULL && io->read != NULL && io->write != NULL && io->erase_bank != NULL;
}

static bh_store_result inspect_bank(const bh_store_io *io, unsigned bank, uint32_t capabilities,
    uint8_t *scratch, bh_store_record *record)
{
    uint8_t header[BH_STORE_HEADER_SIZE];
    const uint32_t base = bank * BH_STORE_BANK_SIZE;
    if (io->read(io->context, base, header, sizeof(header)) != 0)
        return BH_STORE_IO_ERROR;
    if (memcmp(header + 28, "DONE", 4) != 0)
        return BH_STORE_EMPTY;
    if (memcmp(header, "BHS1", 4) != 0 ||
        read32(header + 4) != 1 || read32(header + 8) == 0 ||
        read32(header + 20) != 0 || bh_package_crc32(header, 24) != read32(header + 24))
        return BH_STORE_CORRUPT;
    const uint32_t size = read32(header + 12);
    if (size < BH_PACKAGE_HEADER_SIZE || size > BH_STORE_PACKAGE_MAX)
        return BH_STORE_CORRUPT;
    if (io->read(io->context, base + BH_STORE_HEADER_SIZE, scratch, size) != 0)
        return BH_STORE_IO_ERROR;
    bh_package_info info;
    if (bh_package_crc32(scratch, size) != read32(header + 16) ||
        bh_package_inspect(scratch, size, capabilities, &info) != BH_PACKAGE_OK)
        return BH_STORE_CORRUPT;
    *record = (bh_store_record){bank, read32(header + 8), size, info};
    return BH_STORE_OK;
}

bh_store_result bh_store_read(const bh_store_io *io, uint32_t capabilities,
    uint8_t *scratch, size_t scratch_size, bh_store_record *record)
{
    if (!valid_io(io) || scratch == NULL || scratch_size < BH_STORE_PACKAGE_MAX || record == NULL)
        return BH_STORE_INVALID;
    bh_store_record selected = {0};
    bool found = false;
    bool corrupt = false;
    for (unsigned bank = 0; bank < 2; ++bank) {
        bh_store_record candidate;
        const bh_store_result result = inspect_bank(io, bank, capabilities, scratch, &candidate);
        if (result == BH_STORE_IO_ERROR)
            return result;
        if (result == BH_STORE_CORRUPT)
            corrupt = true;
        if (result == BH_STORE_OK) {
            if (found && candidate.generation == selected.generation)
                return BH_STORE_CORRUPT;
            if (!found || candidate.generation > selected.generation)
                selected = candidate;
            found = true;
        }
    }
    if (!found)
        return corrupt ? BH_STORE_CORRUPT : BH_STORE_EMPTY;
    const bh_store_result result = inspect_bank(io, selected.bank, capabilities, scratch, &selected);
    if (result == BH_STORE_OK)
        *record = selected;
    return result;
}

bh_store_result bh_store_install(const bh_store_io *io, uint32_t capabilities,
    const uint8_t *package, size_t package_size, uint8_t *scratch,
    size_t scratch_size, bh_store_record *record)
{
    if (!valid_io(io) || package == NULL || scratch == NULL || record == NULL ||
        scratch_size < BH_STORE_PACKAGE_MAX)
        return BH_STORE_INVALID;
    /* The scratch area must not overlap the immutable package being installed. */
    const uintptr_t input = (uintptr_t)package;
    const uintptr_t work = (uintptr_t)scratch;
    if ((input <= work && work - input < package_size) ||
        (work < input && input - work < scratch_size))
        return BH_STORE_INVALID;
    bh_package_info info;
    if (bh_package_inspect(package, package_size, capabilities, &info) != BH_PACKAGE_OK)
        return BH_STORE_INVALID;
    bh_store_record previous;
    const bh_store_result existing = bh_store_read(io, capabilities, scratch, scratch_size, &previous);
    if (existing != BH_STORE_OK && existing != BH_STORE_EMPTY)
        return existing;
    if (existing == BH_STORE_OK && previous.generation == UINT32_MAX)
        return BH_STORE_GENERATION_EXHAUSTED;
    const unsigned bank = existing == BH_STORE_OK ? previous.bank ^ 1u : 0u;
    const uint32_t generation = existing == BH_STORE_OK ? previous.generation + 1u : 1u;
    const uint32_t base = bank * BH_STORE_BANK_SIZE;
    if (io->erase_bank(io->context, bank) != 0)
        return BH_STORE_IO_ERROR;
    /* A stale commit marker must never survive into a new installation. */
    for (uint32_t offset = 0; offset < BH_STORE_BANK_SIZE; offset += 128u) {
        if (io->read(io->context, base + offset, scratch, 128u) != 0)
            return BH_STORE_IO_ERROR;
        for (size_t index = 0; index < 128u; ++index)
            if (scratch[index] != 0xffu)
                return BH_STORE_CORRUPT;
    }
    /* Avoid crossing a 128-byte programming boundary, including after the header. */
    for (size_t position = 0; position < package_size;) {
        const uint32_t address = base + BH_STORE_HEADER_SIZE + (uint32_t)position;
        size_t length = 128u - address % 128u;
        if (length > package_size - position)
            length = package_size - position;
        if (io->write(io->context, address, package + position, length) != 0 ||
            io->read(io->context, address, scratch, length) != 0)
            return BH_STORE_IO_ERROR;
        if (memcmp(scratch, package + position, length) != 0)
            return BH_STORE_CORRUPT;
        position += length;
    }
    uint8_t header[BH_STORE_HEADER_SIZE] = {0};
    memcpy(header, "BHS1", 4);
    write32(header + 4, 1);
    write32(header + 8, generation);
    write32(header + 12, (uint32_t)package_size);
    write32(header + 16, bh_package_crc32(package, package_size));
    write32(header + 24, bh_package_crc32(header, 24));
    if (io->write(io->context, base, header, 28) != 0 ||
        io->read(io->context, base, scratch, 28) != 0)
        return BH_STORE_IO_ERROR;
    if (memcmp(scratch, header, 28) != 0)
        return BH_STORE_CORRUPT;
    if (io->write(io->context, base + 28, (const uint8_t *)"DONE", 4) != 0)
        return BH_STORE_IO_ERROR;
    bh_store_record installed;
    const bh_store_result result = inspect_bank(io, bank, capabilities, scratch, &installed);
    if (result != BH_STORE_OK)
        return result;
    *record = installed;
    return BH_STORE_OK;
}

bh_store_result bh_store_load(const bh_store_io *io, uint32_t capabilities,
    uint8_t *scratch, size_t scratch_size, uint8_t *ram, size_t ram_size,
    bh_store_record *record)
{
    if (scratch == NULL || ram == NULL || record == NULL)
        return BH_STORE_INVALID;
    const uintptr_t source = (uintptr_t)scratch;
    const uintptr_t destination = (uintptr_t)ram;
    if ((source <= destination && destination - source < scratch_size) ||
        (destination < source && source - destination < ram_size))
        return BH_STORE_INVALID;
    bh_store_record selected;
    const bh_store_result result = bh_store_read(io, capabilities, scratch, scratch_size, &selected);
    if (result != BH_STORE_OK)
        return result;
    bh_package_info loaded;
    const bh_package_result load = bh_package_load(scratch, selected.size, capabilities,
        ram, ram_size, &loaded);
    if (load == BH_PACKAGE_NO_SPACE)
        return BH_STORE_NO_SPACE;
    if (load != BH_PACKAGE_OK)
        return BH_STORE_CORRUPT;
    selected.package = loaded;
    *record = selected;
    return BH_STORE_OK;
}
