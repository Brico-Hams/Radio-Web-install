# F4HWN: valores de todas las opciones por preset

Documento generado por `npm run build:help`; no editar las filas a mano.

Version: **v6.3.0**. Commit: `ca3a4271386049e7b459b215cef0ad0eea1a30ca`.
Fuente: [presets del commit](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/ca3a4271386049e7b459b215cef0ad0eea1a30ca/CMakePresets.json).

ON = incluido por defecto; OFF = desactivado; N/D = no expuesto en ese preset.
N/D no significa OFF ni permite inferir el default interno de CMake.
Las tablas describen decisiones de compilacion, no el valor actual de los menus de tu radio.

[Explicacion de cada opcion y dependencias](AYUDA-OPCIONES-F4HWN.md).

| Opcion | Custom | FieldOps | Fusion | Labs | Max | Transfer |
| --- | --- | --- | --- | --- | --- | --- |
| `DEV` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | OFF | OFF | ON | ON | ON |
| `ENABLE_AIRCOPY_FLASH` | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_AIRCOPY_UART` | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_ACTION_PICKER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_BEACON` | OFF | ON | OFF | OFF | ON | OFF |
| `ENABLE_FEAT_F4HWN_BEAM` | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` | N/D | OFF | OFF | ON | OFF | OFF |
| `ENABLE_FEAT_F4HWN_FOXHUNT` | OFF | ON | OFF | OFF | ON | OFF |
| `ENABLE_FEAT_F4HWN_FULL_WATCH` | OFF | ON | ON | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | ON | OFF |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MEM` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MENU_CAT` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_HOT_CFG` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_OVERLAY_APPS` | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_FEAT_F4HWN_OVERLAY_BEAM` | N/D | N/D | N/D | ON | N/D | N/D |
| `ENABLE_FEAT_F4HWN_OVERLAY_INFO` | N/D | N/D | N/D | ON | N/D | N/D |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_QRCODE` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | ON | OFF | ON | ON | OFF |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NO_HEAP` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | ON | ON | ON | ON | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON |

## Bricohams local v6.1.0

Commit local fijado: `f556a96e73c3e423a00cf473aeb37f827cac05a5`.
La tabla siguiente es una instantanea de los presets originales de ese commit,
guardada en bricohams-options-v6.1.0.json, no los valores v6.3.0.
Las dos imagenes entregadas Fusion/Labs cambian ENABLE_VOX a OFF respecto
a estos defaults. Todas sus opciones efectivas constan en build-info.json.
FieldOps y Transfer son perfiles admitidos por el builder pero no compilados
en la validacion inicial. Ver [guia Bricohams](BRICOHAMS-FIRMWARE.md).

| Opcion | Fusion | Labs | FieldOps | Transfer |
| --- | --- | --- | --- | --- |
| `DEV` | OFF | OFF | OFF | OFF |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | OFF | ON |
| `ENABLE_AIRCOPY_FLASH` | OFF | OFF | OFF | ON |
| `ENABLE_AIRCOPY_UART` | OFF | OFF | OFF | ON |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_ACTION_PICKER` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_BEACON` | OFF | OFF | ON | OFF |
| `ENABLE_FEAT_F4HWN_BEAM` | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` | OFF | ON | OFF | OFF |
| `ENABLE_FEAT_F4HWN_FOXHUNT` | OFF | OFF | ON | OFF |
| `ENABLE_FEAT_F4HWN_FULL_WATCH` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MEM` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MENU_CAT` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_HOT_CFG` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_OVERLAY_APPS` | OFF | ON | OFF | OFF |
| `ENABLE_FEAT_F4HWN_OVERLAY_BEAM` | N/D | ON | N/D | N/D |
| `ENABLE_FEAT_F4HWN_OVERLAY_INFO` | N/D | ON | N/D | N/D |
| `ENABLE_FEAT_F4HWN_PMR` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_QRCODE` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | ON | ON | OFF |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | ON | ON | ON | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | ON | ON | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | OFF | OFF | OFF | OFF |
| `ENABLE_NO_HEAP` | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | ON | ON | ON | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON |
| `ENABLE_SWD` | ON | ON | ON | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON |
| `ENABLE_UART` | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | ON | ON | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON |

## Versiones historicas

Instantanea consultada el 2026-10-25: 18 versiones fijadas por commit.
Se resuelve herencia CMake, con prioridad al primer padre y al hijo.
Los perfiles son los declarados en las fuentes; NO todos tienen una imagen
publicada ni estan expuestos por el formulario web. Por ejemplo Fusion_ y
Service_ son nombres internos de presets v6.3.0, no nuevas releases.
Las fuentes/snapshots conservan su licencia upstream, no se reclasifican MIT.
La disponibilidad de ediciones y restricciones se explican en
[Quansheng y versiones](AYUDA-QUANSHENG.md).

## Presets publicados v4.3.0

Commit: `77adba2afc1406abd2bb8dc8f963f2ded07067f5`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/77adba2afc1406abd2bb8dc8f963f2ded07067f5/CMakePresets.json).

SHA-256 del archivo de presets: `0754d753c93de0d9b7d44a4b5a8d20a987f21689461d596c42c9d9865684ce54`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AM_FIX` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_AM_FIX_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_CHANNEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_NAVIG_LEFT_RIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REGA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v4.3.1

Commit: `15d97316112876c239020c86f967f56accc6200b`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/15d97316112876c239020c86f967f56accc6200b/CMakePresets.json).

SHA-256 del archivo de presets: `7ce7ffcdc9d4a61bcc00ff3dff9787aa4a8d7c2a4a3b74c01c60b0afafdd8d2d`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AM_FIX` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AM_FIX_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_CHANNEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_NAVIG_LEFT_RIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REGA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v4.3.2

Commit: `e0ac4de1efa671145ebd6148c43aeb13a21cf4d4`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/e0ac4de1efa671145ebd6148c43aeb13a21cf4d4/CMakePresets.json).

SHA-256 del archivo de presets: `d1eba4626ad9ad644edbb8810e720b5255947c75d1409aaec83b7ddf76a831cb`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AM_FIX` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AM_FIX_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_CHANNEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_NAVIG_LEFT_RIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REGA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v5.1.0

Commit: `086858945bd7d1c936f4cee4eac3df64169e78d9`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/086858945bd7d1c936f4cee4eac3df64169e78d9/CMakePresets.json).

SHA-256 del archivo de presets: `4833001f52337c9a74d7fdbb6db16f09a92a6d39ead6d0ee405fbb6dda0ea70f`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REGA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v5.2.0

Commit: `8a8752f80c58716e6bf28d774a19f49ad5b8f6bc`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/8a8752f80c58716e6bf28d774a19f49ad5b8f6bc/CMakePresets.json).

SHA-256 del archivo de presets: `0e4aad35f1094b11d3393e2063dfc3ec84fc4896d7406284a40a5ee40987c363`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MEM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REGA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v5.3.0

Commit: `064a203db0236ce024475462024aa953a4e14944`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/064a203db0236ce024475462024aa953a4e14944/CMakePresets.json).

SHA-256 del archivo de presets: `ffe74b7ca981db800cfaeec93fce08068efa650aee3b0baa5c46f5ca6f6f2019`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MEM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REGA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v5.3.1

Commit: `61aa14cd8656cbf5aa1f16b08972a02107961cb3`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/61aa14cd8656cbf5aa1f16b08972a02107961cb3/CMakePresets.json).

SHA-256 del archivo de presets: `57f34fa8580021acb9f3bb20343ca0691de726c9a06b508aa5e0858b1508698a`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MEM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REGA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v5.4.0

Commit: `786318453f7421cb06792ec0990e2ba00353a476`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/786318453f7421cb06792ec0990e2ba00353a476/CMakePresets.json).

SHA-256 del archivo de presets: `1624065e5bd87581b458b61fa08c669a3800501c8e6905a32d975621d283b66c`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MEM` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_QRCODE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REGA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v5.5.0

Commit: `e21d47260915174f358f1033564844148d5c6590`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/e21d47260915174f358f1033564844148d5c6590/CMakePresets.json).

SHA-256 del archivo de presets: `cd36ec8941b08e0d9280aed854938d7c25c959a28fa1bea2f34473c9197c8d18`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_BEAM` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_MEM` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_QRCODE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REGA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v5.6.0

Commit: `504a2b0fb041db3b072429347d42f45112b9ec47`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/504a2b0fb041db3b072429347d42f45112b9ec47/CMakePresets.json).

SHA-256 del archivo de presets: `467deb167e46e3fead0c5eea098e02717d2ae2e08e04d24bdf5115b686a4026d`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_BEAM` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_MEM` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_QRCODE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REGA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v5.6.1

Commit: `5b4b3e2a71f1f752014634e3a195add1d8a2f6f9`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/5b4b3e2a71f1f752014634e3a195add1d8a2f6f9/CMakePresets.json).

SHA-256 del archivo de presets: `5ab2e68170e6bae3cdf50383daaa38f7ae183d481a22c073d1dc59257759912f`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_BEAM` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_MEM` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_QRCODE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REGA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v5.7.0

Commit: `3bd3ebba2ceb553edc88c3f087ce0c7f420433b2`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/3bd3ebba2ceb553edc88c3f087ce0c7f420433b2/CMakePresets.json).

SHA-256 del archivo de presets: `913a5538eb246f846b08c21e246f5a7bcc3decf5a12e266cc1f67204816cb106`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_BEAM` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_MEM` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_QRCODE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v5.8.0

Commit: `fe9c4e9432694b50aea651084a043aae0b58673d`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/fe9c4e9432694b50aea651084a043aae0b58673d/CMakePresets.json).

SHA-256 del archivo de presets: `e2bb0d74d331099857b97efd4aab2203ef08b2e404503dc1abd06d709ff36dfd`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DEV` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_BEAM` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_FOXHUNT` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_MEM` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_QRCODE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v5.9.0

Commit: `435192e3bf78a208ba9f3c1dc9ad20ddcd3b4684`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/435192e3bf78a208ba9f3c1dc9ad20ddcd3b4684/CMakePresets.json).

SHA-256 del archivo de presets: `839bc565eec103d2201c44f1fea86fa510205b436cc9218e35d60820d9f1dcba`.

| Opcion | Custom | Bandscope | Broadcast | Basic | RescueOps | Game | Fusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DEV` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_ALARM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BLMIN_TMP_OFF` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_ACTION_PICKER` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_BEAM` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_FOXHUNT` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | OFF | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_MEM` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_MENU_CAT` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_QRCODE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | OFF | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | OFF | ON | OFF | OFF | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX_WHEN_AM` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | OFF | ON | OFF | ON | OFF | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON |

## Presets publicados v6.0.0

Commit: `345535de4ca67764bf958c5aa8ab3918b2e7e113`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/345535de4ca67764bf958c5aa8ab3918b2e7e113/CMakePresets.json).

SHA-256 del archivo de presets: `156f91956b7ae1bd48886efdebc92d569a4089ce0f2a49f4d435f2f830175d74`.

| Opcion | Custom | Fusion | FieldOps | Transfer | Labs | Max |
| --- | --- | --- | --- | --- | --- | --- |
| `DEV` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | OFF | OFF | ON | ON | ON |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_ACTION_PICKER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_BEACON` | OFF | OFF | ON | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_BEAM` | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_FOXHUNT` | OFF | OFF | ON | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MEM` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MENU_CAT` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_OVERLAY_APPS` | OFF | OFF | OFF | OFF | ON | OFF |
| `ENABLE_FEAT_F4HWN_OVERLAY_BEAM` | N/D | N/D | N/D | N/D | ON | N/D |
| `ENABLE_FEAT_F4HWN_OVERLAY_TRIVFO` | N/D | N/D | N/D | N/D | OFF | N/D |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_QRCODE` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | ON | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NO_HEAP` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | ON | ON | ON | ON | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON |

## Presets publicados v6.1.0

Commit: `f556a96e73c3e423a00cf473aeb37f827cac05a5`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/CMakePresets.json).

SHA-256 del archivo de presets: `519f845c3c83fe1d29d44e1bd537d7f6ed994cc1a004557d3731f1c582ee7f0e`.

| Opcion | Custom | Fusion | FieldOps | Transfer | Labs | Max |
| --- | --- | --- | --- | --- | --- | --- |
| `DEV` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | OFF | OFF | ON | ON | ON |
| `ENABLE_AIRCOPY_FLASH` | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_AIRCOPY_UART` | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_ACTION_PICKER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_BEACON` | OFF | OFF | ON | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_BEAM` | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` | N/D | OFF | OFF | OFF | ON | OFF |
| `ENABLE_FEAT_F4HWN_FOXHUNT` | OFF | OFF | ON | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_FULL_WATCH` | OFF | ON | ON | ON | ON | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MEM` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MENU_CAT` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_HOT_CFG` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_OVERLAY_APPS` | OFF | OFF | OFF | OFF | ON | OFF |
| `ENABLE_FEAT_F4HWN_OVERLAY_BEAM` | N/D | N/D | N/D | N/D | ON | N/D |
| `ENABLE_FEAT_F4HWN_OVERLAY_INFO` | N/D | N/D | N/D | N/D | ON | N/D |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_QRCODE` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | ON | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NO_HEAP` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | ON | ON | ON | ON | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON |

## Presets publicados v6.2.0

Commit: `0ade03c0b1c94514566fadf7ce1c7a1f542a2283`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/0ade03c0b1c94514566fadf7ce1c7a1f542a2283/CMakePresets.json).

SHA-256 del archivo de presets: `5529a75555192d6568456d946add43837234759ef07306f4cd05e77225f96cf3`.

| Opcion | Custom | Fusion | FieldOps | Transfer | Labs | Max |
| --- | --- | --- | --- | --- | --- | --- |
| `DEV` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | OFF | OFF | ON | ON | ON |
| `ENABLE_AIRCOPY_FLASH` | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_AIRCOPY_UART` | OFF | OFF | OFF | ON | OFF | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_ACTION_PICKER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_BEACON` | OFF | OFF | ON | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_BEAM` | OFF | OFF | OFF | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` | N/D | OFF | OFF | OFF | ON | OFF |
| `ENABLE_FEAT_F4HWN_FOXHUNT` | OFF | OFF | ON | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_FULL_WATCH` | OFF | ON | ON | ON | ON | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MEM` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MENU_CAT` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_HOT_CFG` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_OVERLAY_APPS` | OFF | OFF | OFF | OFF | ON | OFF |
| `ENABLE_FEAT_F4HWN_OVERLAY_BEAM` | N/D | N/D | N/D | N/D | ON | N/D |
| `ENABLE_FEAT_F4HWN_OVERLAY_INFO` | N/D | N/D | N/D | N/D | ON | N/D |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_QRCODE` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | ON | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NO_HEAP` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | ON | ON | ON | ON | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | ON | ON | ON | ON | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON |

## Presets publicados v6.3.0

Commit: `ca3a4271386049e7b459b215cef0ad0eea1a30ca`. [Fuente exacta](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/ca3a4271386049e7b459b215cef0ad0eea1a30ca/CMakePresets.json).

SHA-256 del archivo de presets: `8feff43c5f6c6ccf2a7f4188d2854dff40c7892a644e9bc2dcaec70a5eb7e969`.

| Opcion | Custom | Fusion | FieldOps | Transfer | Labs | Fusion_ | Service_ | Max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DEV` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AGC_SHOW_DATA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_AIRCOPY` | OFF | OFF | OFF | ON | ON | OFF | ON | ON |
| `ENABLE_AIRCOPY_FLASH` | OFF | OFF | OFF | ON | OFF | OFF | ON | OFF |
| `ENABLE_AIRCOPY_UART` | OFF | OFF | OFF | ON | OFF | OFF | ON | OFF |
| `ENABLE_AUDIO_BAR` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BIG_FREQ` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_BOOT_BEEPS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_BYP_RAW_DEMODULATORS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_COPY_CHAN_TO_VFO` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_CUSTOM_MENU_LAYOUT` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_DTMF_CALLING` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_EXTRA_UART_CMD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FASTER_CHANNEL_SCAN` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_ACTION_PICKER` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_BEACON` | OFF | OFF | ON | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_BEAM` | OFF | OFF | OFF | ON | OFF | OFF | ON | ON |
| `ENABLE_FEAT_F4HWN_CA` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_CTR` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_DEBUG` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` | N/D | OFF | OFF | OFF | ON | OFF | ON | OFF |
| `ENABLE_FEAT_F4HWN_FOXHUNT` | OFF | OFF | ON | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_FULL_WATCH` | OFF | ON | ON | ON | ON | ON | ON | OFF |
| `ENABLE_FEAT_F4HWN_GAME` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | ON |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_INV` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MEM` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MENU_CAT` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_HOT_CFG` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_NARROWER` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_OVERLAY_APPS` | OFF | OFF | OFF | OFF | ON | ON | OFF | OFF |
| `ENABLE_FEAT_F4HWN_OVERLAY_BEAM` | N/D | N/D | N/D | N/D | ON | ON | OFF | N/D |
| `ENABLE_FEAT_F4HWN_OVERLAY_INFO` | N/D | N/D | N/D | N/D | ON | ON | OFF | N/D |
| `ENABLE_FEAT_F4HWN_PMR` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_QRCODE` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | OFF | OFF | ON | OFF | ON | ON | OFF | ON |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SLEEP` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FEAT_F4HWN_VOL` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FLASHLIGHT` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_FMRADIO` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_F_CAL_MENU` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_KEEP_MEM_NAME` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_LTO` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NOAA` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_NO_HEAP` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_PWRON_PASSWORD` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_REVERSE_BAT_SYMBOL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_RSSI_BAR` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SCAN_RANGES` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SHOW_CHARGE_LEVEL` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_SMALL_BOLD` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SPECTRUM` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_SWD` | OFF | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_TX1750` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_UART_RW_BK_REGS` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_USB` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_VOICE` | OFF | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| `ENABLE_VOX` | ON | ON | ON | ON | ON | ON | ON | ON |
| `ENABLE_WIDE_RX` | ON | ON | ON | ON | ON | ON | ON | ON |
