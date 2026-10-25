#ifndef BH_TEST_DCS_H
#define BH_TEST_DCS_H
#include <stdint.h>
enum { CODE_TYPE_OFF, CODE_TYPE_CONTINUOUS_TONE, CODE_TYPE_DIGITAL, CODE_TYPE_REVERSE_DIGITAL };
#define DCS_OPTION_COUNT 104u
extern const uint16_t CTCSS_Options[50];
uint8_t DCS_GetCtcssCode(int value);
uint8_t DCS_GetCdcssCode(uint32_t value);
uint16_t DCS_GetOption(uint8_t index);
#endif
