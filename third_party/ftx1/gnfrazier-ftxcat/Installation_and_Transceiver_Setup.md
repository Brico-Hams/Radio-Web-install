# TRANSCEIVER CAT/USB Setup

This guide summarizes the minimum radio and computer settings required to use CAT control over USB with the FTX‑1 series transceiver and the `ftxcontrol.py` script.

---

## 0. Getting the `ftxcat` Project (optional)

**Clone from GitHub (recommended if you use git)**

```bash
git clone https://github.com/gnfrazier/ftxcat.git
cd ftxcat
```

- **Download a ZIP from GitHub (no git required)**
  - Visit the repository page: `https://github.com/gnfrazier/ftxcat`.
  - Click the **Code** button → **Download ZIP**.
  - Extract the ZIP archive.
  - Open a terminal in the extracted `ftxcat` directory for the remaining steps in this guide.

---

## 1. Radio Configuration (FTX‑1)

- **Firmware requirement**
  - Ensure **MAIN firmware ≥ 1.08** (CAT does not work with earlier MAIN firmware).
  - Check via:  
    `FUNC` (press and hold) → `EXTENSION SETTING` → `SOFT VERSION`.

- **USB connection and CAT ports**
  - Connect: **PC → USB cable (USB‑C) → FTX‑1 side USB jack**.
  - The radio exposes **two virtual COM ports**:
    - **Enhanced COM Port (CAT‑1)** – primary CAT (frequency/mode control).  
    - **Standard COM Port (CAT‑2)** – PTT/CW/DATA control or secondary CAT.
  - Use the **Enhanced COM Port (CAT‑1)** for `ftxcontrol.py` unless you have a specific reason to use CAT‑2.

- **CAT communication parameters (must match `ftxcontrol.py`)**
  - `ftxcontrol.py` opens the serial port as:
    - **Baud rate**: `38400` (default, configurable)  
    - **Data bits**: `8`  
    - **Parity**: `None`  
    - **Stop bits**: `1`  
  - On the radio, set (per CAT manual, OPERATION SETTING → GENERAL):
    - `CAT-1 RATE` → **38400 bps** (or match whatever baud you pass to `FTX1Controller`)  
    - `CAT-1 TIME OUT TIMER` → e.g. **100 msec** (default is fine)  
    - `CAT-1 CAT-3 STOP BIT` → **1 bit**  
  - If you instead use CAT‑2:
    - `CAT-2 RATE` → match selected baud (e.g. 38400 bps).  
    - `CAT-2 TIME OUT TIMER` → e.g. 100 msec.

- **Avoid unintended PTT via RTS/DTR (CAT‑2 only)**
  - If using CAT‑2 for CAT and your serial library uses RTS/DTR for flow control, disable RTS/DTR‑based PTT:
    - `RADIO SETTING → MODE SSB RPTT SELECT` → **OFF**  
    - `RADIO SETTING → MODE AM RPTT SELECT` → **OFF**  
    - `RADIO SETTING → MODE FM RPTT SELECT` → **OFF**  
    - `RADIO SETTING → MODE DATA RPTT SELECT` → **OFF**  
    - `RADIO SETTING → MODE RTTY RPTT SELECT` → **OFF**  
    - `CW SETTING → MODE CW RPTT SELECT` → **OFF**  
    - `CW SETTING → PC KEYING` → **OFF**  
    - `PRESET → PRESET1–5 RPTT SELECT` → **OFF**  
  - When using the **Enhanced COM Port (CAT‑1)** with `ftxcontrol.py`, hardware PTT via RTS/DTR is not used.

- **Optional: CAT‑3 (rear TUNER/LINEAR jack)**
  - For USB operation with `ftxcontrol.py`, **CAT‑3 is not required**.  
  - Leave `TUN/LIN PORT SELECT` at its default unless you intentionally use the rear CAT‑3 port and a level‑translator interface.

---

## 2. Windows Computer Setup

### 2.1 USB driver and COM port identification

- **Install Virtual COM driver**
  - Download and install the **Silicon Labs Dual CP210x USB to UART Bridge** driver from the Yaesu support site for the FTX‑1.
  - After installation:
    1. Power on the radio.
    2. Connect the radio to the PC via USB‑C cable.
    3. Open **Device Manager** → expand **Ports (COM & LPT)**.
    4. You should see entries similar to:
       - `Silicon Labs Dual CP210x USB to UART Bridge : Enhanced COM Port (COMx)`  
       - `Silicon Labs Dual CP210x USB to UART Bridge : Standard COM Port (COMy)`
    5. Note the **COM number** for the **Enhanced COM Port**; this is what you will pass to `FTX1Controller` (e.g. `COM5`).

- **If Device Manager shows “!” or “X”**
  - Uninstall and reinstall the virtual COM driver, then reconnect the radio.

### 2.2 Python and `uv` on Windows

On Windows you can either:
- Use an existing Python installation and install `uv`, or  
- Use `uv` to manage and install Python for this project.

**Install `uv` (recommended)**

- From an elevated or user PowerShell prompt:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

- Optionally via WinGet (if available):

```powershell
winget install --id=astral-sh.uv -e
```

**Create/use a Python environment for `ftxcontrol.py`**

From a terminal in the project directory:

```powershell
cd path\to\ftxcat

# Create and activate a project environment (Python will be installed if needed)
uv venv .venv
.\.venv\Scripts\Activate.ps1

# Add required dependency (updates pyproject.toml in this repo)
uv add pyserial
```

**Running `ftxcontrol.py` on Windows**

In PowerShell (with the environment activated):

```powershell
cd path\to\ftxcat
python -c "from ftxcontrol import FTX1Controller; ftx = FTX1Controller('COM5'); print('Connected'); ftx.close()"
```

Adjust `COM5` to the Enhanced COM port you observed in Device Manager, and set `baudrate` if you changed it from the default 38400:

```python
FTX1Controller('COM5', baudrate=38400)
```
--- 
## 2A Windows Subsystem for Linux (WSL2) Setup

### 2A.1 Install USBIPD
Refer to [usbipd-win documentation](https://github.com/dorssel/usbipd-win/wiki/WSL-support)

```powershell
winget install usbipd
```
### 2A.2 Share USB port to WSL

The command usbipd list lists all the USB devices connected to Windows. From an administrator command prompt on Windows, run this command.

```powershell
> usbipd list
Connected:
BUSID  VID:PID    DEVICE                                                        STATE
2-6    06cb:00fc  Synaptics UWP WBDI                                            Not shared
2-8    174f:1813  Integrated Camera, Integrated IR Camera, Camera DFU Device    Not shared
2-10   8087:0033  Intel(R) Wireless Bluetooth(R)                                Not shared
3-1    10c4:ea70  Silicon Labs Dual CP2105 USB to UART Bridge: Enhanced COM...  Not shared
3-2    0d8c:0016  USB Audio Device, USB Input Device                            Not shared
3-3    26aa:0030  USB Serial Device (COM6)                                      Not shared

Persisted:
GUID                                  DEVICE
```
Review the list of devices, look for the Silicon Labs CP2105 Enhanced.

Bind the device to WSL

```
> usbipd bind --busid 3-1
```
Verify that the device has been shared.

```
> usbipd list
Connected:
BUSID  VID:PID    DEVICE                                                        STATE
2-6    06cb:00fc  Synaptics UWP WBDI                                            Not shared
2-8    174f:1813  Integrated Camera, Integrated IR Camera, Camera DFU Device    Not shared
2-10   8087:0033  Intel(R) Wireless Bluetooth(R)                                Not shared
3-1    10c4:ea70  Silicon Labs Dual CP2105 USB to UART Bridge: Enhanced COM...  Shared
3-2    0d8c:0016  USB Audio Device, USB Input Device                            Not shared
3-3    26aa:0030  USB Serial Device (COM6)                                      Not shared

Persisted:
GUID                                  DEVICE
```

### 2A.3 Attach to WSL
Open a WSL prompt. Keep this prompt open to ensure WSL stays active.
Close the adimnistrator powershell command prompt.
Open a _new_ regular powershell prompt

**NOTE Once the device is attached it will not be availible to Windows.**
The device can be restored to windows by running the detach command, exiting all WSL prompts, unplugging the device, or restarting windows. 

```powershell
> usbipd attach --wsl --busid 3-1
usbipd: info: Using WSL distribution 'Ubuntu' to attach; the device will be available in all WSL 2 distributions.
usbipd: info: Loading vhci_hcd module.
usbipd: info: Detected networking mode 'nat'.
usbipd: info: Using IP address 172.26.160.1 to reach the host.
```

Verify the device
```powershell
> usbipd list
Connected:
BUSID  VID:PID    DEVICE                                                        STATE
2-6    06cb:00fc  Synaptics UWP WBDI                                            Not shared
2-8    174f:1813  Integrated Camera, Integrated IR Camera, Camera DFU Device    Not shared
2-10   8087:0033  Intel(R) Wireless Bluetooth(R)                                Not shared
3-1    10c4:ea70  Silicon Labs Dual CP2105 USB to UART Bridge: Enhanced COM...  Attached
3-2    0d8c:0016  USB Audio Device, USB Input Device                            Not shared
3-3    26aa:0030  USB Serial Device (COM6)                                      Not shared

Persisted:
GUID                                  DEVICE
```
### 2A.3 Verifiy in WSL

```bash
$ $ lsusb
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
Bus 001 Device 002: ID 10c4:ea70 Silicon Labs CP2105 Dual UART Bridge
Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
```
Proceed with Linux set up below. 

### 2A.4 Detaching a shared device 

When you would like to connect to your transciever from windows, you must detach the USB ports from WSL.

In a powershell prompt
```powershell
> usbipd detach --busid 3-1
```

---

## 3. Non‑Windows Computer Setup (Linux / macOS)

### 3.1 USB device and serial port

- Connect the radio via USB‑C.
- On Linux, the device will typically appear as **`/dev/ttyUSB0`**, `/dev/ttyUSB1`, etc.
  - Check with:

```bash
dmesg | grep -i ttyUSB
ls /dev/ttyUSB*
```

- On macOS, the device will typically appear as **`/dev/tty.SLAB_USBtoUART`** or similar.
  - Check with:

```bash
ls /dev/tty.*SLAB*
```

- Use the port that corresponds to the **Enhanced COM Port** (CAT‑1). If two ports appear, one will be “Enhanced” and the other “Standard”; verify by trial or by checking the USB device descriptors.

### 3.2 Install `uv` via `curl` (Linux & macOS)

From a shell (bash/zsh/fish) on Linux or macOS:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

If `curl` is not available:

```bash
wget -qO- https://astral.sh/uv/install.sh | sh
```

After installation, ensure the `uv` binary directory is on your `PATH` (the installer will print the path to add, typically `$HOME/.local/bin` or similar).

### 3.3 Create a Python environment and install dependencies

In the project directory (`ftxcat`):

```bash
cd /path/to/ftxcat

# Create and activate a virtual environment for this project
uv venv .venv
source .venv/bin/activate

# Add pyserial for CAT communications (updates pyproject.toml)
uv add pyserial
```

You can later move dependencies into `pyproject.toml` and let `uv` manage them, but `pyserial` is the primary requirement for `ftxcontrol.py`.

### 3.4 Running `ftxcontrol.py` on Linux/macOS

With the environment activated:

```bash
cd /path/to/ftxcat
python -c "from ftxcontrol import FTX1Controller; ftx = FTX1Controller('/dev/ttyUSB0'); print('Connected'); ftx.close()"
```

Adjust `/dev/ttyUSB0` to match the actual device path, and set `baudrate` if you changed the radio’s CAT‑1 or CAT‑2 rate from the default:

```python
FTX1Controller('/dev/ttyUSB0', baudrate=38400)
```

---

## 4. Optional: Using `pyproject.toml` with uv

The cloned repository includes a `pyproject.toml` file that declares the project metadata and dependencies. If you prefer to have `uv` install everything directly from that file:

- **After creating a virtual environment (Windows, PowerShell):**

```powershell
cd path\to\ftxcat
uv venv .venv
.\.venv\Scripts\Activate.ps1
uv sync
```

- **After creating a virtual environment (Linux/macOS, bash/zsh):**

```bash
cd /path/to/ftxcat
uv venv .venv
source .venv/bin/activate
uv sync
```

`uv sync` reads `pyproject.toml` and `uv.lock` (if present) and installs the specified dependencies into the active environment. You can continue to use `uv add <package>` to add new dependencies and keep `pyproject.toml` up to date.

---

## 5. Quick Checklist

- **Radio**
  - MAIN firmware **≥ 1.08**.
  - `CAT-1 RATE` matches `baudrate` in `FTX1Controller` (default 38400).  
  - `CAT-1 CAT-3 STOP BIT` = **1 bit**.  
  - (If using CAT‑2) RPTT/PC KEYING menu items set to **OFF** if RTS/DTR flow control is used.

- **Computer**
  - **Windows**: Silicon Labs Dual CP210x driver installed; Enhanced COM port number known (e.g. `COM5`).  
  - **Linux/macOS**: Serial device identified (e.g. `/dev/ttyUSB0` or `/dev/tty.SLAB_USBtoUART`).
  - `uv` installed via `curl` (Linux/macOS) or PowerShell (Windows).
  - Project virtual environment created with `uv venv` and `pyserial` installed.

With these settings in place, `ftxcontrol.py` should be able to open the serial port and control the FTX‑1 via CAT over USB.

