/* Host model of one banked config region; any access at/above calibration aborts. */
#include "driver/py25q16.h"
#include <stdlib.h>
#include <string.h>

uint8_t bh_test_flash[0x10000];
unsigned bh_test_flash_writes;
unsigned bh_test_flash_erases;

static void bounds(uint32_t address, uint32_t size)
{
    if (address >= sizeof(bh_test_flash) || size > sizeof(bh_test_flash) - address)
        abort();
}

void PY25Q16_ReadBuffer(uint32_t Address, void *pBuffer, uint32_t Size)
{
    bounds(Address, Size);
    memcpy(pBuffer, &bh_test_flash[Address], Size);
}

void PY25Q16_WriteBuffer(uint32_t Address, const void *pBuffer, uint32_t Size, bool Append)
{
    (void)Append;
    bounds(Address, Size);
    memcpy(&bh_test_flash[Address], pBuffer, Size);
    bh_test_flash_writes++;
}

void PY25Q16_SectorErase(uint32_t Address)
{
    Address -= Address % 0x1000U;
    bounds(Address, 0x1000U);
    memset(&bh_test_flash[Address], 0xff, 0x1000U);
    bh_test_flash_erases++;
}
