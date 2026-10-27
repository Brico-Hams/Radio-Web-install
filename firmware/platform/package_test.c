#include "bh_package.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHECK(condition) do { if (!(condition)) { \
    fprintf(stderr, "FAIL %u: %s\n", (unsigned)__LINE__, #condition); return EXIT_FAILURE; \
} } while (0)

static void write32(uint8_t *bytes, uint32_t value)
{
    for (unsigned index = 0; index < 4; ++index)
        bytes[index] = (uint8_t)(value >> (index * 8u));
}

static void seal(uint8_t *bytes, size_t size)
{
    write32(bytes + 36, bh_package_crc32(bytes + 64, size - 64));
    write32(bytes + 60, bh_package_crc32(bytes, 60));
}

int main(int argc, char **argv)
{
    uint8_t package[72] = {0};
    memcpy(package, "BHA1", 4);
    write32(package + 4, 64);
    write32(package + 8, BH_PACKAGE_API_VERSION);
    write32(package + 12, 1);
    write32(package + 16, 4);
    write32(package + 20, 4);
    write32(package + 24, 8);
    write32(package + 32, BH_PACKAGE_CAP_DISPLAY);
    memcpy(package + 40, "Diagnostics", 11);
    package[64] = 0x70;
    package[65] = 0x47;
    package[68] = 42;
    seal(package, sizeof(package));
    uint8_t ram[32];
    memset(ram, 0xa5, sizeof(ram));
    bh_package_info info = {0};
    CHECK(bh_package_crc32((const uint8_t *)"123456789", 9) == UINT32_C(0xcbf43926));
    CHECK(bh_package_inspect(package, sizeof(package), 1, &info) == BH_PACKAGE_OK);
    CHECK(strcmp(info.name, "Diagnostics") == 0 && info.code_size == 4);
    CHECK(bh_package_load(package, sizeof(package), 1, ram, sizeof(ram), &info) == BH_PACKAGE_OK);
    CHECK(memcmp(ram, package + 64, 8) == 0);
    for (unsigned index = 8; index < 16; ++index) CHECK(ram[index] == 0);
    for (unsigned index = 16; index < 32; ++index) CHECK(ram[index] == 0xa5);
    const bh_package_info saved = info;
    for (size_t size = 0; size < sizeof(package); ++size)
        CHECK(bh_package_inspect(package, size, 1, &info) != BH_PACKAGE_OK);
    for (unsigned index = 0; index < sizeof(package); ++index) {
        package[index] ^= 0x80;
        CHECK(bh_package_load(package, sizeof(package), 1, ram, sizeof(ram), &info) != BH_PACKAGE_OK);
        package[index] ^= 0x80;
        CHECK(memcmp(&info, &saved, sizeof(info)) == 0);
        CHECK(memcmp(ram, package + 64, 8) == 0);
    }
    CHECK(bh_package_inspect(package, sizeof(package), 0, &info) == BH_PACKAGE_CAPABILITY_DENIED);
    CHECK(bh_package_load(package, sizeof(package), 1, ram, 15, &info) == BH_PACKAGE_NO_SPACE);
    write32(package + 8, 1); seal(package, sizeof(package));
    CHECK(bh_package_inspect(package, sizeof(package), 1, &info) == BH_PACKAGE_INCOMPATIBLE);
    write32(package + 8, BH_PACKAGE_API_VERSION);
    write32(package + 28, 4); seal(package, sizeof(package));
    CHECK(bh_package_inspect(package, sizeof(package), 1, &info) == BH_PACKAGE_INVALID);
    write32(package + 28, 1); seal(package, sizeof(package));
    CHECK(bh_package_inspect(package, sizeof(package), 1, &info) == BH_PACKAGE_INVALID);
    write32(package + 28, 0);
    write32(package + 24, UINT32_MAX); seal(package, sizeof(package));
    CHECK(bh_package_inspect(package, sizeof(package), 1, &info) == BH_PACKAGE_INVALID);
    write32(package + 24, 8);
    write32(package + 32, 8); seal(package, sizeof(package));
    CHECK(bh_package_inspect(package, sizeof(package), 7, &info) == BH_PACKAGE_INCOMPATIBLE);
    CHECK(bh_package_load(NULL, 0, 7, ram, sizeof(ram), &info) == BH_PACKAGE_INVALID);
    CHECK(bh_package_load(package, sizeof(package), 7, NULL, 0, &info) == BH_PACKAGE_INVALID);
    if (argc == 2) {
        FILE *file = fopen(argv[1], "rb");
        CHECK(file != NULL);
        uint8_t actual[BH_PACKAGE_HEADER_SIZE + BH_PACKAGE_CODE_MAX + BH_PACKAGE_DATA_MAX + 1];
        const size_t length = fread(actual, 1, sizeof(actual), file);
        CHECK(!ferror(file) && feof(file));
        CHECK(fclose(file) == 0);
        uint8_t app_ram[BH_PACKAGE_RAM_MAX];
        CHECK(bh_package_load(actual, length, BH_PACKAGE_CAP_MASK,
            app_ram, sizeof(app_ram), &info) == BH_PACKAGE_OK);
        CHECK((strcmp(info.name, "Diagnostics") == 0 || strcmp(info.name, "Blocks") == 0) && info.capabilities == 3);
        CHECK(memcmp(app_ram, actual + BH_PACKAGE_HEADER_SIZE, info.code_size) == 0);
        puts("Cross-compiled BHA1 app validated and loaded; ARM code not executed");
    }
    puts("BHA1 package validation/loading checks passed; no execution or hardware validation");
    return EXIT_SUCCESS;
}
