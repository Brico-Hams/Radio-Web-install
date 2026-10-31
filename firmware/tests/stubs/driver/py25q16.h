#ifndef BH_TEST_PY25Q16_H
#define BH_TEST_PY25Q16_H
#include <stdbool.h>
#include <stdint.h>
void PY25Q16_ReadBuffer(uint32_t Address, void *pBuffer, uint32_t Size);
void PY25Q16_WriteBuffer(uint32_t Address, const void *pBuffer, uint32_t Size, bool Append);
void PY25Q16_SectorErase(uint32_t Address);
#endif
