/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bh_shell.h"
#include "bh_text.h"
#include "py32f0xx.h"
#include "py32f071_ll_bus.h"
#include "py32f071_ll_gpio.h"

static bh_text screen;
static bh_shell shell;
static volatile uint32_t milliseconds;

void SysTick_Handler(void)
{
    ++milliseconds;
}

static void delay_us(uint32_t us)
{
    const uint32_t cycles = SystemCoreClock / 1000000u;
    while (us-- != 0)
        for (volatile uint32_t count = 0; count < cycles; ++count)
            __NOP();
}

static void output(GPIO_TypeDef *port, uint32_t pins)
{
    for (unsigned pin = 0; pin < 16; ++pin)
        if ((pins & (1u << pin)) != 0) {
            LL_GPIO_SetPinMode(port, 1u << pin, LL_GPIO_MODE_OUTPUT);
            LL_GPIO_SetPinOutputType(port, 1u << pin, LL_GPIO_OUTPUT_PUSHPULL);
        }
}

static void lcd_byte(uint8_t byte, int data)
{
    if (data) LL_GPIO_SetOutputPin(GPIOA, LL_GPIO_PIN_6);
    else LL_GPIO_ResetOutputPin(GPIOA, LL_GPIO_PIN_6);
    LL_GPIO_ResetOutputPin(GPIOB, LL_GPIO_PIN_2);
    for (unsigned bit = 0; bit < 8; ++bit) {
        LL_GPIO_ResetOutputPin(GPIOA, LL_GPIO_PIN_5);
        if ((byte & 0x80u) != 0) LL_GPIO_SetOutputPin(GPIOA, LL_GPIO_PIN_7);
        else LL_GPIO_ResetOutputPin(GPIOA, LL_GPIO_PIN_7);
        delay_us(1);
        LL_GPIO_SetOutputPin(GPIOA, LL_GPIO_PIN_5);
        delay_us(1);
        byte = (uint8_t)(byte << 1);
    }
    LL_GPIO_SetOutputPin(GPIOB, LL_GPIO_PIN_2);
}

static int present(void *context)
{
    const bh_text *text = context;
    for (unsigned row = 0; row < BH_TEXT_ROWS; ++row) {
        lcd_byte((uint8_t)(0xb0u | row), 0);
        lcd_byte(0x10, 0);
        lcd_byte(0x04, 0);
        for (unsigned column = 0; column < BH_TEXT_WIDTH; ++column)
            lcd_byte(text->pixels[row][column], 1);
    }
    return 0;
}

static void init_board(void)
{
    LL_IOP_GRP1_EnableClock(LL_IOP_GRP1_PERIPH_GPIOA |
        LL_IOP_GRP1_PERIPH_GPIOB | LL_IOP_GRP1_PERIPH_GPIOF);
    LL_GPIO_ResetOutputPin(GPIOA, LL_GPIO_PIN_8);
    LL_GPIO_SetOutputPin(GPIOA, LL_GPIO_PIN_3 | LL_GPIO_PIN_5);
    LL_GPIO_SetOutputPin(GPIOB, LL_GPIO_PIN_2 | LL_GPIO_PIN_3 |
        LL_GPIO_PIN_4 | LL_GPIO_PIN_5 | LL_GPIO_PIN_6);
    LL_GPIO_SetOutputPin(GPIOF, LL_GPIO_PIN_9);
    LL_GPIO_ResetOutputPin(GPIOF, LL_GPIO_PIN_8);
    output(GPIOA, LL_GPIO_PIN_3 | LL_GPIO_PIN_5 | LL_GPIO_PIN_6 |
        LL_GPIO_PIN_7 | LL_GPIO_PIN_8);
    output(GPIOB, LL_GPIO_PIN_2 | LL_GPIO_PIN_3 | LL_GPIO_PIN_4 |
        LL_GPIO_PIN_5 | LL_GPIO_PIN_6);
    output(GPIOF, LL_GPIO_PIN_8 | LL_GPIO_PIN_9);
    for (unsigned pin = 12; pin < 16; ++pin) {
        LL_GPIO_SetPinMode(GPIOB, 1u << pin, LL_GPIO_MODE_INPUT);
        LL_GPIO_SetPinPull(GPIOB, 1u << pin, LL_GPIO_PULL_UP);
    }
    lcd_byte(0xae, 0);
    lcd_byte(0xe2, 0);
    delay_us(120000);
    static const uint8_t commands[] = {0xa2, 0xc0, 0xa1, 0xa6, 0xa4, 0x24, 0x81, 31, 0x2f, 0x40};
    for (size_t i = 0; i < sizeof(commands); ++i)
        lcd_byte(commands[i], 0);
    bh_text_clear(&screen);
    present(&screen);
    lcd_byte(0xaf, 0);
    LL_GPIO_SetOutputPin(GPIOF, LL_GPIO_PIN_8);
}

static uint32_t read_key(void)
{
    static const uint8_t keys[4][4] = {
        {BH_KEY_ROTATE, 0, BH_KEY_LEFT, 0},
        {BH_KEY_RIGHT, 0, 0, 0},
        {BH_KEY_DOWN, 0, BH_KEY_RIGHT, 0},
        {BH_KEY_EXIT, BH_KEY_DROP, BH_KEY_RESTART, 0}
    };
    const uint32_t columns = LL_GPIO_PIN_3 | LL_GPIO_PIN_4 | LL_GPIO_PIN_5 | LL_GPIO_PIN_6;
    uint32_t result = 0;
    unsigned pressed = 0;
    for (unsigned column = 0; column < 4; ++column) {
        LL_GPIO_SetOutputPin(GPIOB, columns);
        LL_GPIO_ResetOutputPin(GPIOB, 1u << (6u - column));
        delay_us(10);
        const uint32_t rows = LL_GPIO_ReadInputPort(GPIOB);
        for (unsigned row = 0; row < 4; ++row)
            if ((rows & (1u << (15u - row))) == 0) {
                ++pressed;
                result = keys[column][row];
            }
    }
    LL_GPIO_SetOutputPin(GPIOB, columns);
    return pressed == 1 ? result : 0;
}

void bh_resident_main(void)
{
    /* Keep the vendor bootloader's clocks; never change Flash timing here. */
    SystemCoreClockUpdate();
    if (SystemCoreClock < 1000000u || SystemCoreClock > 48000000u)
        for (;;) __NOP();
    SysTick->CTRL = 0;
    NVIC->ICER[0] = UINT32_MAX;
    NVIC->ICPR[0] = UINT32_MAX;
    SCB->ICSR = SCB_ICSR_PENDSTCLR_Msk | SCB_ICSR_PENDSVCLR_Msk;
    init_board();
    SysTick->LOAD = SystemCoreClock / 1000u - 1u;
    SysTick->VAL = 0;
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk | SysTick_CTRL_ENABLE_Msk |
        SysTick_CTRL_TICKINT_Msk;
    __DSB();
    __ISB();
    __enable_irq();
    const bh_api services = {BH_API_VERSION, sizeof(bh_api), &screen,
        bh_text_clear, bh_text_write, present, NULL, 0};
    int result = bh_shell_init(&shell, &services, milliseconds);
    uint32_t sample_time = 0, candidate = 0, accepted = 0;
    unsigned stable = 0;
    uint32_t last_time = milliseconds;
    for (;;) {
        const uint32_t now = milliseconds;
        if (now == last_time)
            continue;
        last_time = now;
        if (result < 0) {
            bh_text_clear(&screen);
            bh_text_write(&screen, 2, "PLATFORM ERROR");
            present(&screen);
            for (;;) __NOP();
        }
        uint32_t key = 0;
        if ((uint32_t)(now - sample_time) >= 10u) {
            sample_time = now;
            const uint32_t reading = read_key();
            if (reading != candidate) { candidate = reading; stable = 1; }
            else if (stable < 3) ++stable;
            if (stable == 3 && candidate != accepted) {
                accepted = candidate;
                key = accepted;
            }
        }
        result = bh_shell_step(&shell, key, now);
    }
}
