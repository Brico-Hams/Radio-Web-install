#include "presets.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHECK(expression) do { if (!(expression)) { \
    fprintf(stderr, "FAIL line %d: %s\n", __LINE__, #expression); return EXIT_FAILURE; \
} } while (0)

int main(void)
{
    bh_presets source = {0};
    source.count = 2;
    source.selected = 1;
    strcpy(source.entries[0].name, "VHF");
    source.entries[0].spectrum = (bh_spectrum_config){14500000, 1250, 128, 10, 2};
    strcpy(source.entries[1].name, "UHF");
    source.entries[1].spectrum = (bh_spectrum_config){43800000, 2500, 64, 20, 4};
    uint8_t bytes[BH_PRESET_BLOB_BYTES];
    CHECK(bh_presets_encode(&source, bytes, sizeof(bytes)) == BH_PRESETS_OK);
    CHECK(memcmp(bytes, "BHSP", 4) == 0 && bytes[4] == 1);
    bh_presets decoded = {0};
    CHECK(bh_presets_decode(&decoded, bytes, sizeof(bytes)) == BH_PRESETS_OK);
    CHECK(decoded.count == 2 && decoded.selected == 1);
    CHECK(strcmp(decoded.entries[0].name, "VHF") == 0);
    CHECK(decoded.entries[1].spectrum.first_10hz == 43800000);
    CHECK(decoded.entries[0].spectrum.bins == 128);
    uint8_t roundtrip[BH_PRESET_BLOB_BYTES];
    CHECK(bh_presets_encode(&decoded, roundtrip, sizeof(roundtrip)) == BH_PRESETS_OK);
    CHECK(memcmp(roundtrip, bytes, sizeof(bytes)) == 0);
    const bh_presets previous = decoded;
    for (size_t i = 0; i < sizeof(bytes); ++i) {
        bytes[i] ^= 1;
        CHECK(bh_presets_decode(&decoded, bytes, sizeof(bytes)) == BH_PRESETS_CORRUPT);
        CHECK(memcmp(&decoded, &previous, sizeof(decoded)) == 0);
        bytes[i] ^= 1;
    }
    CHECK(bh_presets_decode(&decoded, bytes, sizeof(bytes) - 1) == BH_PRESETS_INVALID);
    source.selected = 2;
    memset(roundtrip, 0x5a, sizeof(roundtrip));
    CHECK(bh_presets_encode(&source, roundtrip, sizeof(roundtrip)) == BH_PRESETS_INVALID);
    for (size_t i = 0; i < sizeof(roundtrip); ++i) CHECK(roundtrip[i] == 0x5a);
    source.selected = 1;
    source.entries[0].name[8] = 'X';
    CHECK(bh_presets_validate(&source) == BH_PRESETS_INVALID);
    source.entries[0].name[8] = 0;
    source.entries[0].spectrum.step_10hz = 0;
    CHECK(bh_presets_validate(&source) == BH_PRESETS_INVALID);
    CHECK(bh_presets_decode(NULL, bytes, sizeof(bytes)) == BH_PRESETS_INVALID);
    puts("Preset codec: roundtrip, corruption and atomic failure checks passed");
    return EXIT_SUCCESS;
}
