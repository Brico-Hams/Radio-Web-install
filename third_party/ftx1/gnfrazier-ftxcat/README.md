# ftxcat
Control a Yaesu FTX-1 over USB with Python


## **EXPERIMENTAL**

This project is in pre-alpha stage and all functions have not been tested. 

The FTX-1 is a tempermental radio, you will likely have to do a full reset at some point during the use of this script. 


## **Back Ups**

Prior to use: save your radio memory and configuration files to an SD card, remove the SD card and store in a safe place.

Insert a fresh sd card, format it in the radio, save your configuration files to the new card, then proceed. In the case of a full radio restore use the safe copy.

## **Hit a Snag?**
There is a short [FAQ](./faq.md) for common set up problems. If you find something to contribute, please submit it. 

## **FTX-1 Scripting: The "Maybe Don't" Advisory**

Before executing this Python script on your FTX-1, consult your common sense. Side effects may include instantaneous fire, permanent hardware damage, and an unexpected blue smoke aesthetic. Users have reported sudden hair loss from stress and their dog running away in fear of RF interference. In rare cases, terminal syntax errors may cause sudden death of your warranty or yourself. Do not use if you enjoy a functional radio. If your transceiver begins to glow or speak in tongues, seek a technician immediately. Programming while frustrated, intoxicated, or distracted is not recommended.

## Getting Started

From a Python prompt, [connect to the radio](./Installation_and_Transceiver_Setup.md) then use the module functions with your controller instance. Examples assume the radio is on a serial port (e.g. `/dev/ttyUSB0` on Linux or `COM5` on Windows).

```python
from ftxcontrol import FTX1Controller, get_frequency_main, set_frequency_main
from ftxcontrol import set_rf_power, get_rf_power, get_radio_info

ftx = FTX1Controller("/dev/ttyUSB0")   # or "COM5" on Windows
```

**Get MAIN-side frequency** (returns Hz):

```python
get_frequency_main(ftx)
# 14250000
```

**Set MAIN-side frequency** (e.g. 14.250 MHz):

```python
set_frequency_main(ftx, 14250000)
```

**Set power (main-side)** — 5–10 W for FTX-1 Field (`unit=1`), or 5–100 W with SPA-1 (`unit=2`):

```python
set_rf_power(ftx, 10)
set_rf_power(ftx, 50, unit=2)   # SPA-1
```

**Get current power setting** — returns `(unit, power_watts)`:

```python
get_rf_power(ftx)
# (1, 10)
```

**Get VFO/main-side info** — frequency, mode, memory/VFO, clarifier, etc.:

```python
get_radio_info(ftx)
# {'memory_channel': '00100', 'frequency': 14250000, 'clar_direction': '0', ...}
```

When done:

```python
ftx.close()
```
