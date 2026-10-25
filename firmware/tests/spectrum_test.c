#include "spectrum.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHECK(expression) do { if (!(expression)) { \
    fprintf(stderr, "FAIL line %d: %s\n", __LINE__, #expression); return EXIT_FAILURE; \
} } while (0)

int main(void)
{
    bh_spectrum state = {0};
    const bh_spectrum_config base = {14500000, 1250, 2, 10, 2};
    uint32_t frequency;
    bool complete = true;
    CHECK(bh_spectrum_frequency(&state, &frequency) == BH_SPECTRUM_NOT_INITIALIZED);
    CHECK(bh_spectrum_init(&state, &base) == BH_SPECTRUM_OK);
    CHECK(bh_spectrum_frequency(&state, &frequency) == BH_SPECTRUM_OK && frequency == 14500000);
    CHECK(bh_spectrum_sample(&state, 100, 65535, &complete) == BH_SPECTRUM_TUNE_REQUIRED && !complete);
    CHECK(bh_spectrum_tuned(&state, 100) == BH_SPECTRUM_OK);
    CHECK(bh_spectrum_tuned(&state, 100) == BH_SPECTRUM_ALREADY_TUNED);
    CHECK(bh_spectrum_sample(&state, 109, 65535, &complete) == BH_SPECTRUM_NOT_SETTLED && state.sum == 0);
    CHECK(bh_spectrum_sample(&state, 110, 10, &complete) == BH_SPECTRUM_OK && !complete);
    CHECK(bh_spectrum_sample(&state, 111, 30, &complete) == BH_SPECTRUM_OK && complete);
    CHECK(state.levels[0] == 20 && state.peaks[0] == 20 && state.frames == 0);
    CHECK(bh_spectrum_frequency(&state, &frequency) == BH_SPECTRUM_OK && frequency == 14501250);
    CHECK(bh_spectrum_tuned(&state, UINT32_MAX - 5) == BH_SPECTRUM_OK);
    CHECK(bh_spectrum_sample(&state, 4, UINT16_MAX, &complete) == BH_SPECTRUM_OK && !complete);
    CHECK(bh_spectrum_sample(&state, 5, UINT16_MAX, &complete) == BH_SPECTRUM_OK && complete);
    CHECK(state.levels[1] == UINT16_MAX && state.frames == 1 && state.bin == 0);
    CHECK(bh_spectrum_tuned(&state, 20) == BH_SPECTRUM_OK);
    CHECK(bh_spectrum_sample(&state, 30, 2, &complete) == BH_SPECTRUM_OK);
    CHECK(bh_spectrum_sample(&state, 31, 4, &complete) == BH_SPECTRUM_OK && complete);
    CHECK(state.levels[0] == 3 && state.peaks[0] == 20);
    CHECK(bh_spectrum_clear_peaks(&state) == BH_SPECTRUM_OK && state.peaks[0] == 3);
    CHECK(bh_spectrum_init(&state, &state.config) == BH_SPECTRUM_OK && state.config.bins == 2 && state.frames == 0);
    bh_spectrum_config config = base;
    config.bins = BH_SPECTRUM_MAX_BINS;
    config.samples_per_bin = 16;
    CHECK(bh_spectrum_init(&state, &config) == BH_SPECTRUM_OK);
    for (uint16_t bin = 0; bin < BH_SPECTRUM_MAX_BINS; ++bin) {
        CHECK(bh_spectrum_frequency(&state, &frequency) == BH_SPECTRUM_OK);
        CHECK(frequency == base.first_10hz + (uint32_t)bin * base.step_10hz);
        CHECK(bh_spectrum_tuned(&state, 0) == BH_SPECTRUM_OK);
        for (uint8_t sample = 0; sample < 16; ++sample)
            CHECK(bh_spectrum_sample(&state, 10, UINT16_MAX, &complete) == BH_SPECTRUM_OK);
        CHECK(complete && state.levels[bin] == UINT16_MAX);
    }
    CHECK(state.frames == 1 && state.bin == 0);
    config.first_10hz = UINT32_MAX; config.bins = 2;
    const bh_spectrum snapshot = state;
    CHECK(bh_spectrum_init(&state, &config) == BH_SPECTRUM_INVALID_CONFIG);
    CHECK(memcmp(&state, &snapshot, sizeof(state)) == 0);
    config = base; config.bins = 129;
    CHECK(bh_spectrum_init(&state, &config) == BH_SPECTRUM_INVALID_CONFIG);
    config = base; config.samples_per_bin = 0;
    CHECK(bh_spectrum_init(&state, &config) == BH_SPECTRUM_INVALID_CONFIG);
    CHECK(bh_spectrum_frequency(&state, NULL) == BH_SPECTRUM_INVALID_CONFIG);
    CHECK(bh_spectrum_sample(&state, 10, 0, NULL) == BH_SPECTRUM_INVALID_CONFIG);
    CHECK(bh_spectrum_init(NULL, &base) == BH_SPECTRUM_INVALID_CONFIG);
    CHECK(bh_spectrum_init(&state, NULL) == BH_SPECTRUM_INVALID_CONFIG);
    CHECK(bh_spectrum_skip(NULL) == BH_SPECTRUM_NOT_INITIALIZED);
    bh_spectrum empty = {0};
    CHECK(bh_spectrum_skip(&empty) == BH_SPECTRUM_NOT_INITIALIZED);
    CHECK(bh_spectrum_init(&state, &base) == BH_SPECTRUM_OK);
    state.levels[0] = 500;
    state.peaks[0] = 600;
    CHECK(bh_spectrum_skip(&state) == BH_SPECTRUM_OK);
    CHECK(state.bin == 1 && state.frames == 0 && state.tune_required);
    CHECK(state.levels[0] == 0 && state.peaks[0] == 0);
    CHECK(bh_spectrum_tuned(&state, 1) == BH_SPECTRUM_OK);
    const bh_spectrum tuned_snapshot = state;
    CHECK(bh_spectrum_skip(&state) == BH_SPECTRUM_ALREADY_TUNED);
    CHECK(memcmp(&state, &tuned_snapshot, sizeof(state)) == 0);
    CHECK(bh_spectrum_sample(&state, 11, 100, &complete) == BH_SPECTRUM_OK);
    CHECK(bh_spectrum_sample(&state, 12, 100, &complete) == BH_SPECTRUM_OK);
    CHECK(state.bin == 0 && state.frames == 1);
    CHECK(bh_spectrum_skip(&state) == BH_SPECTRUM_OK);
    CHECK(bh_spectrum_skip(&state) == BH_SPECTRUM_OK);
    CHECK(state.bin == 0 && state.frames == 2 && state.sum == 0 && state.samples == 0);
    puts("Spectrum core: all checks passed (not a hardware validation)");
    return EXIT_SUCCESS;
}
