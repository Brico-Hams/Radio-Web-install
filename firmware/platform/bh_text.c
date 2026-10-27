/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bh_text.h"
#include <string.h>

/* Original 3x5 row masks, expanded to a 6x8 character cell. */
#define G(a,b,c,d,e) ((a) | ((b) << 3) | ((c) << 6) | ((d) << 9) | ((e) << 12))
static const uint16_t letters[26] = {
    G(2,5,7,5,5), G(3,5,3,5,3), G(6,1,1,1,6), G(3,5,5,5,3),
    G(7,1,3,1,7), G(7,1,3,1,1), G(6,1,5,5,6), G(5,5,7,5,5),
    G(7,2,2,2,7), G(4,4,4,5,2), G(5,5,3,5,5), G(1,1,1,1,7),
    G(5,7,7,5,5), G(5,7,7,7,5), G(2,5,5,5,2), G(3,5,3,1,1),
    G(2,5,5,7,6), G(3,5,3,5,5), G(6,1,2,4,3), G(7,2,2,2,2),
    G(5,5,5,5,7), G(5,5,5,5,2), G(5,5,7,7,5), G(5,5,2,5,5),
    G(5,5,2,2,2), G(7,4,2,1,7)
};
static const uint16_t digits[10] = {
    G(7,5,5,5,7), G(2,3,2,2,7), G(3,4,2,1,7), G(3,4,2,4,3), G(5,5,7,4,4),
    G(7,1,3,4,3), G(6,1,7,5,7), G(7,4,2,2,2), G(7,5,7,5,7), G(7,5,7,4,3)
};

static uint16_t glyph(unsigned char character)
{
    if (character >= 'a' && character <= 'z')
        character = (unsigned char)(character - 'a' + 'A');
    if (character >= 'A' && character <= 'Z')
        return letters[character - 'A'];
    if (character >= '0' && character <= '9')
        return digits[character - '0'];
    switch (character) {
    case ' ': return 0;
    case '.': return 0x2000;
    case ':': return 0x0410;
    case '-': return 0x01c0;
    case '/': return 0x12a4;
    case '>': return 0x2a22;
    case '#': return 0x5f7d;
    case '|': return G(2,2,2,2,2);
    case '[': return 0x324b;
    case ']': return 0x6926;
    default: return 0x2087;
    }
}

int bh_text_clear(void *context)
{
    if (context == NULL)
        return -1;
    memset(context, 0, sizeof(bh_text));
    return 0;
}

int bh_text_write(void *context, uint8_t row, const char *text)
{
    if (context == NULL || text == NULL || row >= BH_TEXT_ROWS)
        return -1;
    size_t length = 0;
    while (length < 22u && text[length] != '\0')
        ++length;
    if (length > 21u)
        return -1;
    bh_text *screen = context;
    memset(screen->pixels[row], 0, BH_TEXT_WIDTH);
    for (size_t index = 0; index < length; ++index) {
        const uint16_t mask = glyph((unsigned char)text[index]);
        for (unsigned column = 0; column < 3; ++column) {
            uint8_t pixels = 0;
            for (unsigned y = 0; y < 5; ++y)
                if ((mask & (1u << (y * 3u + column))) != 0)
                    pixels |= (uint8_t)(1u << (y + 1u));
            screen->pixels[row][index * 6u + column * 2u] = pixels;
            screen->pixels[row][index * 6u + column * 2u + 1u] = pixels;
        }
    }
    return 0;
}
