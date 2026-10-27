MEMORY
{
    APP (rwx) : ORIGIN = 0x20002000, LENGTH = 4096
}
SECTIONS
{
    .text : {
        *(.text*)
        *(.rodata*)
        . = ALIGN(4);
    } > APP
    .data : { *(.data*) } > APP
    .bss (NOLOAD) : {
        *(.bss*)
        *(COMMON)
    } > APP
    /DISCARD/ : { *(.comment*) *(.ARM.exidx*) *(.ARM.extab*) }
}
ASSERT(SIZEOF(.data) == 0, "Initialized globals are not supported by this app build")
ASSERT(SIZEOF(.bss) == 0, "Mutable globals require a future app context ABI")
ASSERT(SIZEOF(.text) <= 4096, "App exceeds the experimental RAM budget")
