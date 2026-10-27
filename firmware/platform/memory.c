/* SPDX-License-Identifier: GPL-3.0-or-later */
#include <stddef.h>
#include <stdint.h>

void *memset(void *destination, int value, size_t size)
{
    uint8_t *out = destination;
    for (size_t i = 0; i < size; ++i) out[i] = (uint8_t)value;
    return destination;
}

void *memcpy(void *destination, const void *source, size_t size)
{
    uint8_t *out = destination;
    const uint8_t *in = source;
    for (size_t i = 0; i < size; ++i) out[i] = in[i];
    return destination;
}

void *memmove(void *destination, const void *source, size_t size)
{
    uint8_t *out = destination;
    const uint8_t *in = source;
    if ((uintptr_t)out <= (uintptr_t)in) {
        for (size_t i = 0; i < size; ++i) out[i] = in[i];
    } else {
        while (size != 0) { --size; out[size] = in[size]; }
    }
    return destination;
}

int memcmp(const void *first, const void *second, size_t size)
{
    const uint8_t *a = first, *b = second;
    for (size_t i = 0; i < size; ++i)
        if (a[i] != b[i]) return a[i] < b[i] ? -1 : 1;
    return 0;
}
