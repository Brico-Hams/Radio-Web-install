/* SPDX-License-Identifier: GPL-3.0-or-later */
.syntax unified
.cpu cortex-m0plus
.thumb
.section .vectors,"a",%progbits
.balign 256
.word _stack_top
.word Reset_Handler
.rept 13
.word Fault_Handler
.endr
.word SysTick_Handler
.rept 48
.word Fault_Handler
.endr

.section .text.Reset_Handler,"ax",%progbits
.global Reset_Handler
.type Reset_Handler,%function
.thumb_func
Reset_Handler:
    cpsid i
    ldr r0, =_stack_top
    mov sp, r0
    ldr r0, =0xe000ed08
    ldr r1, =0x08002800
    str r1, [r0]
    dsb
    isb
    ldr r0, =_data_start
    ldr r1, =_data_end
    ldr r2, =_data_load
1:
    cmp r0, r1
    bcs 2f
    ldr r3, [r2]
    str r3, [r0]
    adds r0, #4
    adds r2, #4
    b 1b
2:
    ldr r0, =_bss_start
    ldr r1, =_bss_end
    movs r2, #0
3:
    cmp r0, r1
    bcs 4f
    str r2, [r0]
    adds r0, #4
    b 3b
4:
    bl bh_resident_main
    b Fault_Handler
.size Reset_Handler, .-Reset_Handler

.section .text.Fault_Handler,"ax",%progbits
.global Fault_Handler
.type Fault_Handler,%function
.thumb_func
Fault_Handler:
    cpsid i
    b Fault_Handler
.size Fault_Handler, .-Fault_Handler
