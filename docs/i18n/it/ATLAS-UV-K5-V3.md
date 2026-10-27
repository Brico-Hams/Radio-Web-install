# Atlante tecnico del Quansheng UV-K5 V3 e UV-K1

Revisione: 26-10-2026. Base di conoscenza di hardware, comunicazione, flashing e
sviluppo per UV-K5 V3 e il suo gemello UV-K1. Pin, memorie e protocolli
provengono dal codice sorgente aperto attualmente funzionante su queste radio
([F4HWN V3](https://github.com/armel/uv-k1-k5v3-firmware-custom), Apache-2.0) e
dal [teardown di armel](https://github.com/armel/k1-teardown), non da supposizioni.
Per configurare la radio passo dopo passo, usa la [guida introduttiva da 0 a 100 %](AYUDA-QUANSHENG.md#avvio-da-0-al-100-).

| Blocco | Componente |
| --- | --- |
| MCU | Puya PY32F071 (PY32F071C1BT6), Cortex-M0+ a 72 MHz, 128 KB flash, 16 KB SRAM |
| Ricetrasmettitore | Beken BK4829 |
| Radio FM | Beken BK1080 |
| Memoria dati | Flash SPI PUYA PY25Q16HB, 2 MB |
| Schermo | ST7565, 128x64 monocromatico |
| Audio | Amplificatore LM4898/LN4898 |
| USB-C | Ricarica e programmazione (porta seriale virtuale CDC) |

## Versioni e come identificarle

Il firmware di una versione non funziona su un'altra: il microcontrollore è diverso e
l'immagine non si avvia oppure lascia la radio senza schermo.

| Versione | MCU | Memoria dati | USB-C | Firmware aperto di riferimento |
| --- | --- | --- | --- | --- |
| V1 (UV-K5, K5(8), K6, 5R Plus) | DP32G030, 48 MHz, 64 KB | EEPROM I2C da 8 KB (espandibile) | Solo ricarica | [armel/uv-k5-firmware-custom](https://github.com/armel/uv-k5-firmware-custom) |
| V2 | PY32F030 / PY32G030 | EEPROM I2C | Solo ricarica | [muzkr/uv-k5-firmware-custom](https://github.com/muzkr/uv-k5-firmware-custom) |
| **V3 e UV-K1** | **PY32F071**, 72 MHz, 128 KB | **Flash SPI PY25Q16 da 2 MB** | **Ricarica e programmazione** | [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom) |

- **Etichetta sotto la batteria:** «V2» o «V3». Se non c'è un'indicazione di solito è V1, ma
  il manuale ARDF avverte che esistono etichette V3 su hardware V2: non è una prova univoca.
- **La porta USB-C compare come porta seriale** collegandola al PC: V3/K1.
- **Versione del bootloader** (accendere tenendo premuto PTT): UV-K5 V3 segnala
  `7.00.07`; UV-K1 `7.02.02` o `7.03.0x`. Nei gruppi compaiono UV-K5(8) V3
  con `7.0.11`: se trovi un altro numero, verificalo prima del flashing.
- K1 e K5 V3 condividono la scheda (serigrafia `K1-V5.0`) e il firmware. Nella flash
  di fabbrica cambia solo la seconda riga del messaggio di avvio (`0x007030`).
- Un `.bin` V3 inizia con la tabella dei vettori: parola 0 = stack in SRAM
  (`0x2000xxxx`), parola 1 = reset a `0x0800xxxx` con bit 0 impostato a 1. Un binario
  V1 ha il reset vicino a `0x000000xx`.

## Architettura

Il PY32F071 controlla tutto: programma i registri del BK4829 a ogni modifica
di frequenza, modo, filtro o potenza, legge l'S-meter e gestisce audio,
schermo, tastiera e memoria.

![Diagramma a blocchi dell'UV-K5 V3: MCU, ricetrasmettitore, memoria, schermo, tastiera, audio, USB e batteria](../../atlas/bloques-v3.svg)

## Piedinatura del PY32F071

Assegnazione usata da F4HWN per V3/K1 (`App/board.c`, `App/driver/*.c`). Il numero
fisico del pin è nel [datasheet del PY32F071](https://github.com/armel/k1-teardown/blob/main/datasheet/PY32F071_Datasheet_Rev0.7_EN.pdf).

| Pin | Funzione | Configurazione | Driver |
| --- | --- | --- | --- |
| PA0 | Flash SPI2 SCK | AF8 SPI2 | `py25q16.c` |
| PA1, PA2 | Flash SPI2 MISO/MOSI | AF9 SPI2, prescaler /2, DMA1 | `py25q16.c` |
| PA3 | Flash SPI CS | Uscita | `py25q16.c` |
| PA4 | DAC voce / acquisizione audio RX | Analogico, TIM6 + DMA | `voice.c` |
| PA5 | LCD SPI1 SCK | AF0 SPI1, prescaler /64 | `st7565.c` |
| PA6 | LCD A0 (dato/comando) | Uscita | `st7565.c` |
| PA7 | LCD SPI1 MOSI | AF0 SPI1 | `st7565.c` |
| PA8 | Abilitazione amplificatore audio | Uscita | `gpio.h` |
| PA9, PA10 | USART1 TX/RX (jack Kenwood) | AF1, 38400 baud | `uart.c` |
| PA11, PA12 | USB FS D-/D+ (CDC) | USB | `vcp.c` |
| PA13, PA14 | SWDIO / SWCLK | SWD se si compila `ENABLE_SWD` | `board.c` |
| PB0 | Tensione batteria | ADC1 canale 8, 12 bit | `board.c` |
| PB1 | Analogico riservato | Modalità analogica | `board.c` |
| PB2 | LCD CS | Uscita | `st7565.c` |
| PB3-PB6 | Tastiera, colonne | Uscite | `keyboard.c` |
| PB8 | BK4829 SCK | Uscita, bit-bang | `bk4829.c` |
| PB9 | BK4829 SDIO bidirezionale | Uscita/ingresso, bit-bang | `bk4829.c` |
| PB10 | PTT | Ingresso pull-up, attivo basso | `gpio.h` |
| PB12-PB15 | Tastiera, righe | Ingressi pull-up | `keyboard.c` |
| PC13 | Torcia | Uscita | `board.c` |
| PF5, PF6 | BK1080 SCL/SDA | I2C bit-bang | `i2c.c` |
| PF8 | Retroilluminazione LCD | PWM tramite TIM7 + DMA | `backlight.c` |
| PF9 | BK4829 CS | Uscita | `bk4829.c` |

### Matrice della tastiera

Il firmware porta a livello basso una colonna e legge le quattro righe. La «colonna
0» significa nessuna colonna attiva e legge i laterali. PTT è separato su PB10.

| Riga | Col 0 | PB6 | PB5 | PB4 | PB3 |
| --- | --- | --- | --- | --- | --- |
| PB15 | SIDE1 | MENU | UP | DOWN | EXIT |
| PB14 | SIDE2 | 1 | 2 | 3 | * |
| PB13 | - | 4 | 5 | 6 | 0 |
| PB12 | - | 7 | 8 | 9 | F |

## Bus e periferiche

| Periferica | Bus | Note |
| --- | --- | --- |
| BK4829 | 3 fili bit-bang: CS PF9, SCK PB8, SDIO PB9 | Registro a 8 bit + valore a 16 bit. Il driver usa la stessa API del BK4819 V1 (`bk4819.h`) |
| Flash PY25Q16 | SPI2 + DMA1, CS PA3 | Settori da 4 KB; viene esposta come «EEPROM» tramite una tabella di traduzione |
| LCD ST7565 | SPI1, A0 PA6, CS PB2 | 8 pagine da 128 colonne, bit meno significativo in alto |
| BK1080 | I2C bit-bang PF5/PF6 | Solo con `ENABLE_FMRADIO` |
| Jack Kenwood | USART1 PA9/PA10 | 38400 8N1 |
| USB-C | USB FS PA11/PA12, CDC | Stesso protocollo del jack |
| Voce e audio | DAC PA4, enable PA8 | Le app Labs usano PA4 come ADC per APRS/AFSK |

## Memoria interna

![Mappa della flash interna: bootloader da 10 KB, applicazione da 0x08002800 fino a 118 KB](../../atlas/flash-interna-v3.svg)

- Bootloader `0x08000000-0x080027FF` (10 KB), mai sovrascritto tramite DFU.
- Applicazione da `0x08002800`, massimo `0x1D800` byte (`Core/py32f071xb.ld`).
- Pagine di cancellazione da 256 byte; SRAM da 16 KB.

## Flash esterna da 2 MB

![Mappa della flash esterna con firmware di fabbrica e con multiboot F4HWN](../../atlas/flash-externa-v3.svg)

| Intervallo | Contenuto (multiboot F4HWN) |
| --- | --- |
| `0x000000-0x00BFFF` | Banco di configurazione 0: canali, nomi, VFO, impostazioni |
| `0x010000-0x010FFF` | **Calibrazione** (512 byte utili), specifica di ogni radio |
| `0x011000-0x011FFF` | Logo di avvio: intestazione da 8 byte + bitmap da 1024 byte (firma di fabbrica `0x9ABC5A5A`) |
| `0x018000-0x01FFFF` | Log RX/TX, 8 settori |
| `0x020000 + n*0x20000` | Slot 0-4 da 128 KB: intestazione `FMB1` da 64 byte (dimensione, CRC-32, nome, versione) e immagine a +0x1000. Slot 0 = copia protetta del principale |
| `0x0C0000-0x0FFFFF` | Banchi di configurazione 1-4 (64 KB) |
| `0x100000` / `0x101000` | Stato multiboot ridondante `FMP3` |
| `0x102000-` | App sovrapposte `FAP1`, slot da 8 KB |
| `0x1DE000-0x1FFFFF` | Riserva di interoperabilità con Sonic |

Il firmware di fabbrica salva la voce in `0x100000-0x196FFF`, la stessa zona usata
da F4HWN. Per tornare alla versione di fabbrica usa il ripristino guidato di
[UV Studio](https://armel.github.io/uvstudio/), che ricostruisce quella zona senza
toccare la calibrazione.

## Mappa EEPROM logica

`eeprom_compat.c` traduce indirizzi EEPROM a 16 bit in Flash SPI per
riutilizzare il codice V1 e i driver CHIRP. Al di fuori della tabella si legge `0xFF`.

| Indirizzo logico | Flash fisica | Contenuto |
| --- | --- | --- |
| `0x0000-0x3FFF` | `0x000000` | Frequenze di 1024 memorie x 16 byte |
| `0x4000-0x7FFF` | `0x004000` | Nomi di 1024 memorie x 16 byte |
| `0x8000-0x886D` | `0x008000` | Attributi e nomi degli elenchi |
| `0x9000-0x90E8` | `0x009000` | 14 VFO e Fox Hunt/Beacon |
| `0xA000-0xA177` | `0x00A000` | Impostazioni, FM, elenchi, AES, spettro, F4HWN, versione |
| `0xB000-0xB1FF` | `0x010000` | Calibrazione |
| `0xC000-0xCFFF` | `0x011000` | Logo di avvio |

Questa è la mappa F4HWN. Factory, Karina, IJV o Matoz ne usano un'altra: un driver
CHIRP funziona solo con il firmware per cui è stato scritto.

## Calibrazione

- Ogni radio ha la propria calibrazione in `0x010000`. Non è intercambiabile: le
  «calibrazioni di Karina» o di un'altra unità sono state calcolate per un altro apparato.
- Fai una copia prima del flashing con UV Studio («dump calib») o con la lettura di
  questo web; [K5Tool-bin](https://github.com/Gulihg/K5Tool-bin) estrae i valori
da un dump. Esempi da 512 byte in [k1-teardown/openocd](https://github.com/armel/k1-teardown/tree/main/openocd).
- I comandi F4HWN rifiutano di scrivere quel settore.

## Protocollo seriale di programmazione

Lo stesso sul jack Kenwood e su USB-C: 38400 baud 8N1, ereditato da V1.

![Frame: AB CD, lunghezza, tipo, dimensione, dati, CRC16 e DC BA; blocco offuscato con XOR](../../atlas/trama-serie.svg)

Chiave di offuscamento XOR (indice i mod 16): `16 6C 14 E6 2E 91 0D 40 21 35 D5 40 13 03 E9 80`.
CRC-16 XMODEM: polinomio `0x1021`, valore iniziale 0, su tipo, dimensione e dati
prima dell'offuscamento. Nella risposta la radio riempie il CRC con `clave[n] ^ 0xFF`. Un lettore robusto
richiede intestazione, piè di pagina e lunghezza coerenti e registra solo i CRC non corrispondenti.

| Richiesta | Risposta | Uso | Dati |
| --- | --- | --- | --- |
| `0x0514` | `0x0515` | Handshake e identificazione | u32 timestamp |
| `0x051B` | `0x051C` | Leggere EEPROM | u16 offset, u8 size, u8 pad, u32 timestamp |
| `0x051D` | `0x051E` | Scrivere EEPROM | u16 offset, u8 size, bool allowPassword, u32 timestamp, dati |
| `0x0527` | `0x0528` | RSSI | - |
| `0x0529` | - | Tensione e corrente della batteria | - |
| `0x052F` | - | Variante handshake | u32 timestamp |
| `0x05DD` | - | Riavvio | - |
| `0x0601` / `0x0602` | - | Registri BK4829 (solo `ENABLE_UART_RW_BK_REGS`) | registro, valore |

Estensioni F4HWN Fusion: `0x0720-0x0729` slot e banchi, `0x0730-0x0737` app
sovrapposte, `0x0738` lettura flash fisica, `0x073A`/`0x073C` cancellazione e
programmazione dei settori (rifiutano la calibrazione), `0x073E` CRC-32 di un intervallo.
Lo slot 0 non può essere cancellato né sovrascritto. K5Viewer inietta tasti con
`AA 55 03|04 <tecla>`; PTT è bloccato.

## Bootloader e flashing

Con la radio spenta, tieni premuto PTT e accendila: LED acceso, schermo spento.
Il bootloader di fabbrica ascolta tramite USB-C e jack con gli stessi frame.

![Sequenza DFU: avviso 0x0518, handshake 0x0530, pagine 0x0519 e conferme 0x051A](../../atlas/secuencia-dfu.svg)

Bricohams Studio e UV Studio accettano solo il bootloader `7.00.07` per UV-K5 V3
e `7.02.02`/`7.03.0x` per UV-K1 e convalidano i vettori del `.bin` prima di
aprire la porta. Un'immagine V1 viene «scritta» ma non si avvia.

| Strumento | Uso |
| --- | --- |
| [UV Studio](https://armel.github.io/uvstudio/) | Flashing, multiboot, dump della calibrazione, ripristino di fabbrica |
| [Bricohams Studio](https://brico-hams.github.io/Bricohams-Studio/) | Canali, impostazioni, slot e firmware principale |
| [Multi-UVTools](https://spm81.github.io/Multi-UVTools/) | Flasher web multimodello |
| [Moto](https://github.com/muzkr/moto) | Bootloader UF2 alternativo: disco USB «MOTO» e trascinamento di `.uf2`. Rischioso, senza comandi seriali |

I `*.packed.bin` sono per l'aggiornatore ufficiale; i `.bin` piatti, per
gli strumenti aperti.

## SWD e recupero

Se il bootloader è danneggiato, resta solo SWD (PA13 SWDIO, PA14 SWCLK) con uno
ST-Link. Il PY32 viene trattato come STM32F0 con un altro ID TAP:

```text
openocd -f interface/stlink.cfg -c "set CPUTAPID 0x0bc11477" -f target/stm32f0x.cfg -c "adapter speed 1000" -c "init; reset halt; dump_image K1_PY32F071.bin 0x08000000 0x00020000; shutdown"
```

Non scrivere un'immagine completa della flash esterna con un programmatore: cancelleresti la
calibrazione. Le immagini «Factory_Reconstructed» di k1-teardown sono destinate al
ripristino guidato di UV Studio.

## Compilare il firmware

Base consigliata: [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom),
che già gestisce avvio PY32, HAL Puya, flash SPI, BK4829, USB e protocollo.

```text
git clone --depth 1 https://github.com/armel/uv-k1-k5v3-firmware-custom
cd uv-k1-k5v3-firmware-custom
./compile-firmware.sh Fusion
./compile-firmware.sh Fusion -DENABLE_VOX=OFF
./compile-firmware.sh All
```

Il container usa ARM GNU Toolchain 13.3.rel1, CMake e Ninja. Preset: Custom,
Fusion, FieldOps, Transfer, Labs e Max. Output in `build/<Preset>`.

| Percorso | Contenuto |
| --- | --- |
| `App/driver/` | `bk4829.c`, `py25q16.c`, `st7565.c`, `keyboard.c`, `uart.c`, `vcp.c`, `eeprom_compat.c`, `mb_flash.c` |
| `App/app/` | `spectrum.c`, `scanner.c`, `menu.c`, `uart.c`, `fm.c`, `aircopy.c`, `foxhunt.c` |
| `Core/py32f071xb.ld` | Link a `0x08002800`, 118 KB |
| `CMakePresets.json` | Flag `ENABLE_*` per edizione |

La build riproducibile Bricohams è in [Bricohams V3](BRICOHAMS-FIRMWARE.md)
e ogni opzione in [opzioni F4HWN](AYUDA-OPCIONES-F4HWN.md). Prima di flashare una
build propria, controlla i vettori e che non superi `0x1D800` byte.

## Modifiche hardware

La [matrice di validazione integrale](VALIDACION-INTEGRAL-V3-ANDROID.md) amplia
i criteri di compatibilità, test, limiti ed evidenze in sospeso.
Non esiste una certificazione generale delle modifiche V1 sulla V3. Il
[diagramma Android/CAT/memorie](../../atlas/android-cat-validacion.svg) è funzionale,
non uno schema elettrico misurato né una guida alla saldatura.

| Modifica | V3/K1 | Note |
| --- | --- | --- |
| Espansione EEPROM (M24M02, 24C512) | Non direttamente applicabile | V3 usa Flash SPI da 2 MB, non EEPROM I2C intercambiabile. Riferimento V1: [losehu](https://github.com/losehu/uv-k5-bootloader-custom/wiki) |
| Ricevitore HF SI4732 (schede v5/v6.8) | Non verificato su V3 | I riferimenti qui catalogati sono V1 (CEC HF, Reborn, losehu, Robzyl 512K); non dimostrano supporto PY32 |
| Antenna SMA (17 cm, 38 cm) | Accessorio condizionale | Verificare connettore, sforzi meccanici, banda e ROS; lunghezza o miglioramento RX non certificano TX |
| Modifica satellitare (bobine, LNA) | Non confermata | Non sono disponibili schema né misure di un adattamento a questa revisione V3 |
| Filtro passa-basso TX | Da verificare | [Nannk/quansheng-lpf-mod](https://codeberg.org/Nannk/quansheng-lpf-mod); verificare la scheda misurata |
| Modifica 27 MHz | Riferimento V1, non convalidato V3 | [Wiki](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki/Hardware_Mods_27Mhz); richiede rete RF e misure proprie, non estrapolare valori |
| Cavo di programmazione | USB-C diretto | È valido anche il cavo Kenwood USB-seriale (USART1) |
| Coprocessore o ESP32 | Progettati per V1 | [ESPRI](https://github.com/kamilsss655/ESPRI), [UVK5-Coprocessor](https://github.com/wabulutian/UVK5-Coprocessor), [UVE5](https://github.com/losehu/UVE5) |

I firmware che aumentano l'uscita oltre 5 W possono bruciare lo stadio finale.
Trasmettere fuori dalle bande della propria licenza è illegale anche se il firmware lo consente.

## Schemi e immagini

Nelle fonti di questa revisione non è stato identificato uno schema elettrico
completo e verificato di V3/K1. Ciò non dimostra che non ne esista un altro.
I riferimenti disponibili sono:

- [Teardown K1 di armel](https://github.com/armel/k1-teardown) (Apache-2.0): foto ad alta risoluzione, dump, firmware annotato e datasheet.
- [Foto della scheda UV-K1](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki/UV%E2%80%90K1-PCB) nella wiki.
- [Schema V1 tramite reverse engineering in KiCad](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/tree/main/hardware/KiCad/UVK5_reversing_06-02-2024): CPU, RX, TX, audio, caricatore e BK1080. Schede [RX](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki/Schematic_RX), [TX](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki/Schematic_TX) e [BOM interattiva](https://htmlpreview.github.io/?https://github.com/ludwich66/Quansheng_UV-K5_Wiki/blob/main/hardware/ibom.html). Nessuna licenza dichiarata: viene solo collegato.
- Datasheet: [BK4829](https://github.com/armel/k1-teardown/blob/main/datasheet/BK4829-BEKEN.pdf), [PY32F071](https://github.com/armel/k1-teardown/blob/main/datasheet/PY32F071_Datasheet_Rev0.7_EN.pdf), [PY25Q16HB](https://github.com/armel/k1-teardown/blob/main/datasheet/PY25Q16HB_Datasheet_V1.2.pdf), [BK1080](https://github.com/armel/k1-teardown/blob/main/datasheet/BK1080-BEKEN.pdf), [registri BK4819](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/blob/main/hardware/BK4819V3Registers_List_20201218.pdf).

Foto del teardown UV-K1 (stessa scheda del K5 V3). Autore: F4HWN (armel),
[armel/k1-teardown](https://github.com/armel/k1-teardown), licenza Apache-2.0;
ridotte a 1600 px.

![Vista esplosa completa: batteria, antenna, manopola, guscio con altoparlante, scheda e telaio in alluminio](../../atlas/k1-view-a.jpg)

![Scheda, lato schermo: LCD, LED, SMA, potenziometro e connettore della tastiera; serigrafia K1-V5.0 ZG13](../../atlas/k1-view-b-recto.jpg)

![Scheda, lato RF e MCU: bobine dei filtri, jack Kenwood, USB-C e MCU QFP48](../../atlas/k1-view-b-verso.jpg)

![Dettaglio della Flash SPI PUYA PY25Q16HB da 2 MB](../../atlas/k1-view-c-recto.jpg)

![Dettaglio della MCU PUYA PY32F071 in LQFP48 accanto a USB-C e bobina 4R7](../../atlas/k1-view-c-verso.jpg)

![Parte frontale smontata: cornice, tastiera in gomma e scheda contatti della matrice 4x4](../../atlas/k1-view-d-front.jpg)

![Ordine di montaggio: cornice frontale, telaio interno e scheda principale](../../atlas/k1-view-e-front-back.jpg)

## Firmware e repository per V3/K1

Verificati tramite API GitHub il 26-10-2026; «V3/K1» = l'albero contiene codice PY32.

| Repository | Licenza | Ultimo push | Descrizione |
| --- | --- | --- | --- |
| [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom) | Apache-2.0 | 2026-10-25 | F4HWN Fusion PY32, base di riferimento |
| [Robby69400/Sonic](https://github.com/Robby69400/Sonic) | Apache-2.0 | 2026-10-25 | Successore di Robzyl, fork F4HWN con multiboot |
| [Gogu-Qs/GOGUFW-UV-K1-Messenger](https://github.com/Gogu-Qs/GOGUFW-UV-K1-Messenger) | Apache-2.0 | 2026-10-24 | Messaggistica, ACK, portata |
| [N7SIX/UV-K1Series_ApeX-Edition_v7.6.0](https://github.com/N7SIX/UV-K1Series_ApeX-Edition_v7.6.0) | Apache-2.0 | 2026-10-11 | Edizione ApeX |
| [reald/uv-k1-k5v3-firmware-custom](https://github.com/reald/uv-k1-k5v3-firmware-custom) | Apache-2.0 | 2026-10-19 | ARDF, vedi [guida ARDF](AYUDA-ARDF.md) |
| [fagci/k1-fw](https://github.com/fagci/k1-fw) | Senza licenza | 2026-07-19 | Firmware di fagci per K1/K5 V3 |
| [muzkr/moto](https://github.com/muzkr/moto) | Apache-2.0 | 2025-12-31 | Bootloader UF2 |
| [armel/k1-teardown](https://github.com/armel/k1-teardown) | Apache-2.0 | 2026-09-28 | Foto, dump e datasheet |
| [EthanYan6/uv-k1-k5v3-firmware-custom-3ch](https://github.com/EthanYan6/uv-k1-k5v3-firmware-custom-3ch) | Apache-2.0 | 2026-08-10 | Ascolto di 3 canali |
| [qbs524/uv-k1-k5v3-firmware-custom-main-chn](https://github.com/qbs524/uv-k1-k5v3-firmware-custom-main-chn) | Apache-2.0 | 2025-12-24 | F4HWN in cinese |
| [qrp73/K5TOOL](https://github.com/qrp73/K5TOOL) | GPL-3.0 | 2025-12-18 | EEPROM e flashing da riga di comando |
| [knoinok/quansheng_toolkit](https://github.com/knoinok/quansheng_toolkit) | - | 2026-05-08 | Toolkit desktop K1/K5 V3 |
| [Dim0s/quansheng-UV-K5v3-K1-firmware-pack](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack) | - | 2026-10-25 | Raccolta di binari V3/K1, vedi [pack Dim0s](AYUDA-PACK-DIM0S.md) |

Link non più attivi e dove reperirli:

- `Robby69400/Robzyl*`: eliminati; copie in [K5Quan/Robzyl_K1_](https://github.com/K5Quan/Robzyl_K1_), [K5Quan/Robzyl_512K](https://github.com/K5Quan/Robzyl_512K) e [simoncottingham/Robzyl_K5](https://github.com/simoncottingham/Robzyl_K5); l'autore continua con Sonic.
- `joaquimorg/uv-k5` e `new_ui`: rinominati in [UV-KX](https://github.com/joaquimorg/UV-KX), [UV-KX-firmware](https://github.com/joaquimorg/UV-KX-firmware) e [uv-kx-tools](https://github.com/joaquimorg/uv-kx-tools) (V1).
- `armel/uvtools2`: ora [Robby69400/uvtools2](https://github.com/Robby69400/uvtools2); il web è ancora su <https://armel.github.io/uvtools2/>.
- `bg6ud/uv-k1-k5v3-firmware-custom`: eliminato; vedi i fork F4HWN V3.

Su GitFlic, GitVerse, GitLab e Gitee non è stato trovato nulla su Quansheng; la
comunità russa pubblica binari su 4PDA e Telegram.

## Karina e codice chiuso

Karina è closed source (vedi [Karina](KARINA.md)). Secondo i gruppi russi
è la continuazione di [fagci-mod v1.2.1](https://github.com/fagci/uv-k5-firmware-fagci-mod)
(Apache-2.0, che consente derivati chiusi). Per replicarne le funzioni
correttamente: descriverle dal manuale e dal changelog, partire da F4HWN V3 e
dal codice dello spettro di fagci-mod e [PUNKTRACKER 2.5](https://github.com/Alexuresp/PUNKTRACKER_2.5)
(Apache-2.0, V1). `fagci/s0v4`, `hawk5` e `k1-fw` non hanno licenza: si possono
leggere, non copiare. Non decompilare il binario Karina per ricostruirne il sorgente.

## Fonti

- Codice: [F4HWN V3](https://github.com/armel/uv-k1-k5v3-firmware-custom) (`App/board.c`, `App/driver/*`, `App/app/uart.c`, `mb_flash.h`, `eeprom_compat.c`), [moto](https://github.com/muzkr/moto), Bricohams Studio (`bkFlashMain`).
- Hardware: [k1-teardown](https://github.com/armel/k1-teardown), [Quansheng UV-K5 Wiki](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki).
- Comunità: ricerche mirate nei gruppi Telegram in spagnolo e russo, senza autori né dati personali; [pack Dim0s](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack).
- Riferimenti V1: [amnemonic](https://github.com/amnemonic/Quansheng_UV-K5_Firmware), [losehu](https://github.com/losehu/uv-k5-bootloader-custom/wiki), [wiki di egzumer](https://github.com/egzumer/uv-k5-firmware-custom/wiki).
