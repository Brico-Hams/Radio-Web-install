/* SPDX-License-Identifier: GPL-3.0-or-later */
ENTRY(Reset_Handler)
MEMORY {
    FLASH (rx) : ORIGIN = 0x08002800, LENGTH = 118K
    CORE (rw) : ORIGIN = 0x20000000, LENGTH = 8K
    APP (rwx) : ORIGIN = 0x20002000, LENGTH = 4K
    STACK (rw) : ORIGIN = 0x20003000, LENGTH = 4K
}
_stack_top = ORIGIN(STACK) + LENGTH(STACK);
SECTIONS {
    .vectors : { KEEP(*(.vectors)) } > FLASH
    .text : { *(.text*) *(.rodata*) . = ALIGN(4); } > FLASH
    .data : {
        . = ALIGN(4); _data_start = .; *(.data*) . = ALIGN(4); _data_end = .;
    } > CORE AT > FLASH
    _data_load = LOADADDR(.data);
    .bss (NOLOAD) : {
        . = ALIGN(8); _bss_start = .; *(.bss*) *(COMMON) . = ALIGN(8); _bss_end = .;
    } > CORE
    .app (NOLOAD) : { _app_start = .; . += LENGTH(APP); _app_end = .; } > APP
    .stack (NOLOAD) : { . += LENGTH(STACK); } > STACK
    /DISCARD/ : { *(.ARM.exidx*) *(.ARM.extab*) *(.comment*) }
}
ASSERT(_bss_end <= ORIGIN(CORE) + LENGTH(CORE), "Resident RAM overflow")
ASSERT(_app_start == 0x20002000, "BHA1 link address mismatch")
