/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bh_package.h"
#include <stdbool.h>
#include <string.h>

static uint32_t read32(const uint8_t *bytes)
{
    return (uint32_t)bytes[0] | ((uint32_t)bytes[1] << 8) |
        ((uint32_t)bytes[2] << 16) | ((uint32_t)bytes[3] << 24);
}

uint32_t bh_package_crc32(const uint8_t *bytes, size_t size)
{
    uint32_t crc = UINT32_MAX;
    for (size_t index = 0; index < size; ++index) {
        crc ^= bytes[index];
        for (unsigned bit = 0; bit < 8; ++bit)
            crc = (crc >> 1) ^ ((crc & 1u) ? UINT32_C(0xedb88320) : 0u);
    }
    return crc ^ UINT32_MAX;
}

bh_package_result bh_package_inspect(const uint8_t *bytes, size_t size,
    uint32_t allowed_capabilities, bh_package_info *info)
{
    if (bytes == NULL || info == NULL || size < BH_PACKAGE_HEADER_SIZE)
        return BH_PACKAGE_INVALID;
    if (memcmp(bytes, "BHA1", 4) != 0 || read32(bytes + 4) != BH_PACKAGE_HEADER_SIZE)
        return BH_PACKAGE_INVALID;
    if (read32(bytes + 8) != BH_PACKAGE_API_VERSION || read32(bytes + 12) != 1u)
        return BH_PACKAGE_INCOMPATIBLE;
    bh_package_info checked = {0};
    checked.code_size = read32(bytes + 16);
    checked.data_size = read32(bytes + 20);
    checked.bss_size = read32(bytes + 24);
    checked.entry_offset = read32(bytes + 28);
    checked.capabilities = read32(bytes + 32);
    if (checked.code_size < 2u || checked.code_size > BH_PACKAGE_CODE_MAX ||
        (checked.code_size & 1u) != 0 || checked.data_size > BH_PACKAGE_DATA_MAX ||
        checked.bss_size > BH_PACKAGE_RAM_MAX ||
        checked.code_size + checked.data_size + checked.bss_size > BH_PACKAGE_RAM_MAX ||
        (checked.entry_offset & 1u) != 0 || checked.entry_offset > checked.code_size - 2u ||
        size != BH_PACKAGE_HEADER_SIZE + checked.code_size + checked.data_size ||
        read32(bytes + 56) != 0)
        return BH_PACKAGE_INVALID;
    if ((checked.capabilities & ~BH_PACKAGE_CAP_MASK) != 0)
        return BH_PACKAGE_INCOMPATIBLE;
    if ((checked.capabilities & ~allowed_capabilities) != 0)
        return BH_PACKAGE_CAPABILITY_DENIED;
    bool terminated = false;
    for (unsigned index = 0; index < 16; ++index) {
        const uint8_t character = bytes[40u + index];
        if (character == 0)
            terminated = true;
        else if (terminated || character < 32u || character > 126u)
            return BH_PACKAGE_INVALID;
        checked.name[index] = (char)character;
    }
    if (checked.name[0] == '\0')
        return BH_PACKAGE_INVALID;
    if (bh_package_crc32(bytes, 60) != read32(bytes + 60) ||
        bh_package_crc32(bytes + BH_PACKAGE_HEADER_SIZE, size - BH_PACKAGE_HEADER_SIZE) != read32(bytes + 36))
        return BH_PACKAGE_CORRUPT;
    *info = checked;
    return BH_PACKAGE_OK;
}

bh_package_result bh_package_load(const uint8_t *bytes, size_t size,
    uint32_t allowed_capabilities, uint8_t *ram, size_t ram_size,
    bh_package_info *info)
{
    if (ram == NULL || info == NULL)
        return BH_PACKAGE_INVALID;
    bh_package_info checked;
    const bh_package_result result = bh_package_inspect(bytes, size, allowed_capabilities, &checked);
    if (result != BH_PACKAGE_OK)
        return result;
    const size_t used = checked.code_size + checked.data_size + checked.bss_size;
    if (ram_size < used)
        return BH_PACKAGE_NO_SPACE;
    memmove(ram, bytes + BH_PACKAGE_HEADER_SIZE, checked.code_size + checked.data_size);
    memset(ram + checked.code_size + checked.data_size, 0, checked.bss_size);
    *info = checked;
    return BH_PACKAGE_OK;
}
