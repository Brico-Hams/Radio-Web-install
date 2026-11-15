#include "doppler.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHECK(expression) do { if (!(expression)) { \
    fprintf(stderr, "FAIL line %d: %s\n", __LINE__, #expression); return EXIT_FAILURE; \
} } while (0)

int main(void)
{
    bh_doppler_frequencies output = {0};
    CHECK(bh_doppler_calculate(43500000, 14500000, 0, &output) == BH_DOPPLER_OK);
    CHECK(output.receive_10hz == 43500000 && output.transmit_nominal_10hz == 14500000 && output.receive_only);
    CHECK(bh_doppler_calculate(43500000, 14500000, 7500000, &output) == BH_DOPPLER_OK);
    CHECK(output.receive_10hz < 43500000 && output.transmit_nominal_10hz > 14500000);
    CHECK(bh_doppler_calculate(43500000, 14500000, -7500000, &output) == BH_DOPPLER_OK);
    CHECK(output.receive_10hz > 43500000 && output.transmit_nominal_10hz < 14500000);
    for (int32_t rate = -12000000; rate <= 12000000; rate += 100000) {
        CHECK(bh_doppler_calculate(43500000, 14500000, rate, &output) == BH_DOPPLER_OK);
        const double factor = 1.0 - (double)rate / 299792458000.0;
        CHECK(fabs((double)output.receive_10hz - 43500000.0 * factor) <= 0.50001);
        CHECK(fabs((double)output.transmit_nominal_10hz - 14500000.0 / factor) <= 0.50001);
        CHECK(output.receive_only);
    }
    const bh_doppler_frequencies snapshot = output;
    CHECK(bh_doppler_calculate(43500000, 14500000, 12000001, &output) == BH_DOPPLER_INVALID);
    CHECK(memcmp(&snapshot, &output, sizeof(output)) == 0);
    CHECK(bh_doppler_calculate(13600000, 14500000, 12000000, &output) == BH_DOPPLER_INVALID);
    CHECK(bh_doppler_calculate(43500000, 0, 0, &output) == BH_DOPPLER_INVALID);
    CHECK(bh_doppler_calculate(43500000, 14500000, 0, NULL) == BH_DOPPLER_INVALID);
    /* 145.925 MHz up / 436.888 MHz down at +/-7 km/s: receding lowers the downlink and raises the uplink. */
    for (int32_t rate = -7000000; rate <= 7000000; rate += 14000000) {
        CHECK(bh_doppler_calculate(43688800, 14592500, rate, &output) == BH_DOPPLER_OK);
        const double f = 1.0 - (double)rate / 299792458000.0;
        CHECK(fabs((double)output.receive_10hz - 43688800.0 * f) <= 0.50001);
        CHECK(fabs((double)output.transmit_nominal_10hz - 14592500.0 / f) <= 0.50001);
        CHECK((rate > 0) == (output.receive_10hz < 43688800 && output.transmit_nominal_10hz > 14592500));
    }
    puts("Doppler tests passed: signs, rounding and RX-only output; no orbital or radio validation");
    return EXIT_SUCCESS;
}
