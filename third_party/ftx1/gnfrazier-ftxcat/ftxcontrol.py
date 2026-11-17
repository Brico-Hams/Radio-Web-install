import serial
import time
from typing import Literal, Tuple
from enum import Enum

class OperatingMode(Enum):
    """Operating modes for FTX-1"""
    LSB = '1'
    USB = '2'
    CW_U = '3'
    FM = '4'
    AM = '5'
    RTTY_L = '6'
    CW_L = '7'
    DATA_L = '8'
    RTTY_U = '9'
    DATA_FM = 'A'
    FM_N = 'B'
    DATA_U = 'C'
    AM_N = 'D'
    PSK = 'E'
    DATA_FM_N = 'F'
    C4FM_DN = 'H'
    C4FM_VW = 'I'

class AGCMode(Enum):
    """AGC modes"""
    OFF = '0'
    FAST = '1'
    MID = '2'
    SLOW = '3'
    AUTO = '4'

class FTX1Controller:
    """Controller class for Yaesu FTX-1 transceiver"""
    
    def __init__(self, port: str, baudrate: int = 38400, timeout: float = 1.0):
        """
        Initialize connection to FTX-1
        
        Args:
            port: Serial port (e.g., 'COM5' or '/dev/ttyUSB0')
            baudrate: Communication speed (default: 38400)
            timeout: Serial timeout in seconds
        """
        self.ser = serial.Serial(
            port=port,
            baudrate=baudrate,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=timeout
        )
        time.sleep(0.1)  # Allow port to stabilize
        
    def _send_command(self, command: str) -> str:
        """
        Send CAT command and return response
        
        Args:
            command: CAT command string (without terminator)
            
        Returns:
            Response string (without terminator)
        """
        cmd = command + ';'
        self.ser.write(cmd.encode('ascii'))
        time.sleep(0.05)  # Small delay for processing
        
        response = b''
        while True:
            char = self.ser.read(1)
            if not char or char == b';':
                break
            response += char
            
        return response.decode('ascii')
    
    def close(self):
        """Close serial connection"""
        if self.ser and self.ser.is_open:
            self.ser.close()


# =============================================================================
# FREQUENCY CONTROL
# =============================================================================

def set_frequency_main(ftx: FTX1Controller, freq_hz: int) -> None:
    """
    Set MAIN-side VFO frequency
    
    Args:
        ftx: FTX1Controller instance
        freq_hz: Frequency in Hz (30000 - 470000000)
        
    Example:
        set_frequency_main(ftx, 14250000)  # Set to 14.250 MHz
    """
    freq_str = f"{freq_hz:09d}"
    ftx._send_command(f"FA{freq_str}")


def get_frequency_main(ftx: FTX1Controller) -> int:
    """
    Get MAIN-side VFO frequency
    
    Returns:
        Frequency in Hz
    """
    response = ftx._send_command("FA")
    return int(response[2:])


def set_frequency_sub(ftx: FTX1Controller, freq_hz: int) -> None:
    """
    Set SUB-side VFO frequency
    
    Args:
        ftx: FTX1Controller instance
        freq_hz: Frequency in Hz (30000 - 470000000)
    """
    freq_str = f"{freq_hz:09d}"
    ftx._send_command(f"FB{freq_str}")


def get_frequency_sub(ftx: FTX1Controller) -> int:
    """
    Get SUB-side VFO frequency
    
    Returns:
        Frequency in Hz
    """
    response = ftx._send_command("FB")
    return int(response[2:])


# =============================================================================
# MODE CONTROL
# =============================================================================

def set_mode(ftx: FTX1Controller, mode: OperatingMode, side: Literal[0, 1] = 0) -> None:
    """
    Set operating mode
    
    Args:
        ftx: FTX1Controller instance
        mode: Operating mode (OperatingMode enum)
        side: 0 for MAIN, 1 for SUB
        
    Example:
        set_mode(ftx, OperatingMode.USB)
        set_mode(ftx, OperatingMode.CW_U, side=1)
    """
    ftx._send_command(f"MD{side}{mode.value}")


def get_mode(ftx: FTX1Controller, side: Literal[0, 1] = 0) -> str:
    """
    Get operating mode.

    Args:
        side: 0 for MAIN, 1 for SUB

    Returns:
        Mode string P1+P2 (side and mode code), e.g. "02" for MAIN USB.
        Single mode character is response[-1] (e.g. "2" for USB).
    """
    response = ftx._send_command(f"MD{side}")
    return response[3:]


# =============================================================================
# PTT CONTROL
# =============================================================================

def set_ptt(ftx: FTX1Controller, state: bool) -> None:
    """
    Control transmit state
    
    Args:
        ftx: FTX1Controller instance
        state: True to transmit, False to receive
        
    Example:
        set_ptt(ftx, True)   # Start transmitting
        set_ptt(ftx, False)  # Return to receive
    """
    cmd = "TX1" if state else "TX0"
    ftx._send_command(cmd)


def get_ptt_status(ftx: FTX1Controller) -> bool:
    """
    Get PTT status
    
    Returns:
        True if transmitting, False if receiving
    """
    response = ftx._send_command("TX")
    return response[2] == '2'  # TX2 means transmitting


# =============================================================================
# POWER CONTROL
# =============================================================================

def set_rf_power(ftx: FTX1Controller, power_watts: float, unit: Literal[1, 2] = 1) -> None:
    """
    Set RF output power
    
    Args:
        ftx: FTX1Controller instance
        power_watts: Power in watts
        unit: 1 for FTX-1 Field (1-10W), 2 for SPA-1 (5-100W)
        
    Example:
        set_rf_power(ftx, 10)   # Set to 10W
        set_rf_power(ftx, 50, unit=2)  # Set to 50W with SPA-1
    """
    #TODO check setting tenths of watt, especially for field config
    ftx._send_command(f"PC{unit}{power_watts:03d}")


def get_rf_power(ftx: FTX1Controller) -> Tuple[int, float]:
    """
    Get RF output power setting
    
    Returns:
        Tuple of (unit, power_watts)
    """
    response = ftx._send_command("PC")
    unit = int(response[2])
    power = float(response[3:6])
    return (unit, power)


# =============================================================================
# AGC CONTROL
# =============================================================================

def set_agc(ftx: FTX1Controller, mode: AGCMode, side: Literal[0, 1] = 0) -> None:
    """
    Set AGC mode
    
    Args:
        ftx: FTX1Controller instance
        mode: AGC mode (AGCMode enum)
        side: 0 for MAIN, 1 for SUB
        
    Example:
        set_agc(ftx, AGCMode.FAST)
    """
    ftx._send_command(f"GT{side}{mode.value}")


def get_agc(ftx: FTX1Controller, side: Literal[0, 1] = 0) -> str:
    """
    Get AGC mode
    
    Returns:
        AGC mode code
    """
    response = ftx._send_command(f"GT{side}")
    return response[3:]


# =============================================================================
# AUDIO CONTROL
# =============================================================================

def set_af_gain(ftx: FTX1Controller, level: int, side: Literal[0, 1] = 0) -> None:
    """
    Set AF (audio) gain
    
    Args:
        ftx: FTX1Controller instance
        level: Gain level (0-255)
        side: 0 for MAIN, 1 for SUB
        
    Example:
        set_af_gain(ftx, 128)  # Set to 50% volume
    """
    ftx._send_command(f"AG{side}{level:03d}")


def get_af_gain(ftx: FTX1Controller, side: Literal[0, 1] = 0) -> int:
    """
    Get AF gain level
    
    Returns:
        Gain level (0-255)
    """
    response = ftx._send_command(f"AG{side}")
    return int(response[3:6])


def set_squelch(ftx: FTX1Controller, level: int, side: Literal[0, 1] = 0) -> None:
    """
    Set squelch level
    
    Args:
        ftx: FTX1Controller instance
        level: Squelch level (0-255)
        side: 0 for MAIN, 1 for SUB
    """
    ftx._send_command(f"SQ{side}{level:03d}")


def get_squelch(ftx: FTX1Controller, side: Literal[0, 1] = 0) -> int:
    """
    Get squelch level
    
    Returns:
        Squelch level (0-255)
    """
    response = ftx._send_command(f"SQ{side}")
    return int(response[3:6])


# =============================================================================
# S-METER READING
# =============================================================================

def get_s_meter(ftx: FTX1Controller, side: Literal[0, 1] = 0) -> int:
    """
    Get S-meter reading
    
    Args:
        side: 0 for MAIN, 1 for SUB
        
    Returns:
        S-meter value (0-255)
    """
    response = ftx._send_command(f"SM{side}")
    return int(response[3:6])


def get_meter_reading(ftx: FTX1Controller, meter_type: int) -> Tuple[int, int]:
    """
    Get various meter readings
    
    Args:
        meter_type: 1=S(MAIN), 2=S(SUB), 3=COMP, 4=ALC, 5=PO, 6=SWR, 7=IDD, 8=VDD
        
    Returns:
        Tuple of (primary_value, secondary_value)
    """
    response = ftx._send_command(f"RM{meter_type}")
    primary = int(response[3:6])
    secondary = int(response[6:9])
    return (primary, secondary)


# =============================================================================
# VFO/MEMORY OPERATIONS
# =============================================================================

def toggle_vfo_memory(ftx: FTX1Controller, side: Literal[0, 1] = 0) -> None:
    """
    Toggle between VFO and Memory mode
    
    Args:
        side: 0 for MAIN, 1 for SUB
    """
    ftx._send_command(f"VM{side}")


def set_memory_channel(ftx: FTX1Controller, channel: int, side: Literal[0, 1] = 0) -> None:
    """
    Set memory channel

    Args:
        ftx: FTX1Controller instance
        channel: Memory channel (1-99 per CAT manual) TODO test beyond 99
        side: 0 for MAIN, 1 for SUB
    """
    # Manual: MC P2 = 00001-00099 (Memory Channel); PMS/5MHz/EMGCH use other ranges
    if not 1 <= channel <= 99:
        raise ValueError("channel must be 1-99 per CAT manual (00001-00099)")
    ftx._send_command(f"MC{side}{channel:05d}")


def memory_to_vfo(ftx: FTX1Controller) -> None:
    """Transfer memory data to VFO (MAIN-side)"""
    ftx._send_command("MA")


def memory_to_vfo_sub(ftx: FTX1Controller) -> None:
    """Transfer memory data to VFO (SUB-side). Sends MB per CAT manual."""
    ftx._send_command("MB")


# =============================================================================
# SPLIT OPERATION
# =============================================================================

def set_split(ftx: FTX1Controller, state: bool) -> None:
    """
    Enable/disable split operation
    
    Args:
        state: True to enable split, False to disable
    """
    cmd = "ST1" if state else "ST0"
    ftx._send_command(cmd)


def get_split(ftx: FTX1Controller) -> bool:
    """
    Get split status
    
    Returns:
        True if split enabled
    """
    response = ftx._send_command("ST")
    return response[2] == '1'


# =============================================================================
# CLARIFIER (RIT/XIT)
# =============================================================================

def set_clarifier(ftx: FTX1Controller, rx_on: bool, tx_on: bool, 
                  offset_hz: int = 0, side: Literal[0, 1] = 0) -> None:
    """
    Set clarifier (RIT/XIT) settings
    
    Args:
        ftx: FTX1Controller instance
        rx_on: Enable RX clarifier
        tx_on: Enable TX clarifier
        offset_hz: Offset frequency in Hz (-9995 to +9995)
        side: 0 for MAIN, 1 for SUB
        
    Example:
        set_clarifier(ftx, True, False, 100)  # RX clar +100Hz
    """
    rx = '1' if rx_on else '0'
    tx = '1' if tx_on else '0'
    sign = '+' if offset_hz >= 0 else '-'
    freq = abs(offset_hz)
    
    # Set clarifier on/off (P2=0 Fixed, P3=0 CLAR Setting per manual)
    ftx._send_command(f"CF{side}00{rx}{tx}000")
    # Set frequency offset (P2=0 Fixed, P3=1 CLAR Frequency per manual)
    ftx._send_command(f"CF{side}01{sign}{freq:04d}")


# =============================================================================
# BAND OPERATIONS
# =============================================================================

def band_up(ftx: FTX1Controller, side: Literal[0, 1] = 0) -> None:
    """
    Move to next band up
    
    Args:
        side: 0 for MAIN, 1 for SUB
    """
    ftx._send_command(f"BU{side}")


def band_down(ftx: FTX1Controller, side: Literal[0, 1] = 0) -> None:
    """
    Move to next band down
    
    Args:
        side: 0 for MAIN, 1 for SUB
    """
    ftx._send_command(f"BD{side}")


def select_band(ftx: FTX1Controller, band: int, side: Literal[0, 1] = 0) -> None:
    """
    Select specific band
    
    Args:
        band: Band number (0=1.8MHz, 1=3.5MHz, 2=5MHz, 3=7MHz, 4=10MHz,
              5=14MHz, 6=18MHz, 7=21MHz, 8=24.5MHz, 9=28MHz, 10=50MHz,
              11=70MHz/GEN, 12=AIR, 13=144MHz, 14=430MHz)
        side: 0 for MAIN, 1 for SUB
    """
    ftx._send_command(f"BS{side}{band:02d}")


# =============================================================================
# SCAN OPERATIONS
# =============================================================================

def set_scan(ftx: FTX1Controller, mode: Literal[0, 1, 2], side: Literal[0, 1] = 0) -> None:
    """
    Control scanning
    
    Args:
        mode: 0=OFF, 1=Scan UP, 2=Scan DOWN
        side: 0 for MAIN, 1 for SUB
    """
    ftx._send_command(f"SC{side}{mode}")


# =============================================================================
# CW OPERATIONS
# =============================================================================

def set_cw_keyer(ftx: FTX1Controller, state: bool) -> None:
    """
    Enable/disable CW keyer
    
    Args:
        state: True to enable, False to disable
    """
    cmd = "KR1" if state else "KR0"
    ftx._send_command(cmd)


def set_cw_speed(ftx: FTX1Controller, wpm: int) -> None:
    """
    Set CW keyer speed
    
    Args:
        wpm: Words per minute (4-60)
    """
    ftx._send_command(f"KS{wpm:03d}")


def get_cw_speed(ftx: FTX1Controller) -> int:
    """
    Get CW keyer speed
    
    Returns:
        Speed in WPM
    """
    response = ftx._send_command("KS")
    return int(response[2:5])


def set_cw_pitch(ftx: FTX1Controller, pitch_hz: int) -> None:
    """
    Set CW pitch/sidetone frequency
    
    Args:
        pitch_hz: Pitch in Hz (300-1050, in 10Hz steps)
    """
    value = (pitch_hz - 300) // 10
    ftx._send_command(f"KP{value:02d}")


def set_breakin(ftx: FTX1Controller, state: bool) -> None:
    """
    Enable/disable CW break-in
    
    Args:
        state: True to enable, False to disable
    """
    cmd = "BI1" if state else "BI0"
    ftx._send_command(cmd)


# =============================================================================
# FILTER OPERATIONS
# =============================================================================

def set_if_shift(ftx: FTX1Controller, offset_hz: int, side: Literal[0, 1] = 0) -> None:
    """
    Set IF shift
    
    Args:
        offset_hz: Offset in Hz (-1200 to +1200, in 20Hz steps)
        side: 0 for MAIN, 1 for SUB
    """
    sign = '+' if offset_hz >= 0 else '-'
    value = abs(offset_hz)
    ftx._send_command(f"IS{side}0{sign}{value:04d}")


def set_width(ftx: FTX1Controller, width_code: int, side: Literal[0, 1] = 0) -> None:
    """
    Set IF filter width
    
    Args:
        width_code: Width code (0-23, see manual Table 5)
        side: 0 for MAIN, 1 for SUB
    """
    ftx._send_command(f"SH{side}0{width_code:02d}")


def set_narrow(ftx: FTX1Controller, state: bool, side: Literal[0, 1] = 0) -> None:
    """
    Enable/disable narrow filter
    
    Args:
        state: True to enable narrow filter
        side: 0 for MAIN, 1 for SUB
    """
    cmd = f"NA{side}1" if state else f"NA{side}0"
    ftx._send_command(cmd)


# =============================================================================
# NOISE REDUCTION
# =============================================================================

def set_noise_blanker(ftx: FTX1Controller, level: int, side: Literal[0, 1] = 0) -> None:
    """
    Set noise blanker level
    
    Args:
        level: 0=OFF, 1-10=NB level
        side: 0 for MAIN, 1 for SUB
    """
    ftx._send_command(f"NL{side}{level:03d}")


def set_dnr(ftx: FTX1Controller, level: int, side: Literal[0, 1] = 0) -> None:
    """
    Set Digital Noise Reduction level
    
    Args:
        level: 0=OFF, 1-10=DNR level
        side: 0 for MAIN, 1 for SUB
    """
    ftx._send_command(f"RL{side}{level:02d}")


def set_dnf(ftx: FTX1Controller, state: bool, side: Literal[0, 1] = 0) -> None:
    """
    Enable/disable Digital Notch Filter
    
    Args:
        state: True to enable
        side: 0 for MAIN, 1 for SUB
    """
    cmd = f"BC{side}1" if state else f"BC{side}0"
    ftx._send_command(cmd)


# =============================================================================
# INFORMATION RETRIEVAL
# =============================================================================

def get_radio_info(ftx: FTX1Controller) -> dict:
    """
    Get comprehensive radio information
    
    Returns:
        Dictionary with radio status information
    """
    response = ftx._send_command("IF")
    
    return {
        'memory_channel': response[2:7],
        'frequency': int(response[7:16]),
        'clar_direction': response[16],
        'clar_offset': int(response[17:21]),
        'rx_clar': response[21] == '1',
        'tx_clar': response[22] == '1',
        'mode': response[23],
        'vfo_memory': response[24],
        'tone_mode': response[25],
        'repeater_shift': response[28] # Per manual
    }


def get_id(ftx: FTX1Controller) -> str:
    """
    Get transceiver ID
    
    Returns:
        ID string (should be "0840" for FTX-1)
    """
    response = ftx._send_command("ID")
    return response[2:]


def get_firmware_version(ftx: FTX1Controller, cpu: Literal[0, 1, 2, 3, 4, 5]) -> str:
    """
    Get firmware version
    
    Args:
        cpu: 0=MAIN, 1=DISPLAY, 2=SDR, 3=DSP, 4=SPA-1, 5=FC-80
        
    Returns:
        Version string
    """
    response = ftx._send_command(f"VE{cpu}")
    return response[3:]


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def enable_auto_information(ftx: FTX1Controller, state: bool) -> None:
    """
    Enable/disable automatic status updates
    
    Args:
        state: True to enable auto information mode
        
    Note: When enabled, radio automatically sends status updates
    """
    cmd = "AI1" if state else "AI0"
    ftx._send_command(cmd)


def lock_controls(ftx: FTX1Controller, state: bool) -> None:
    """
    Lock/unlock front panel controls
    
    Args:
        state: True to lock controls
    """
    cmd = "LK1" if state else "LK0"
    ftx._send_command(cmd)


def swap_vfo(ftx: FTX1Controller) -> None:
    """Swap MAIN and SUB VFOs"""
    ftx._send_command("SV")


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

def example_usage():
    """Example demonstrating how to use the functions"""
    
    # Initialize connection (adjust COM port as needed)
    ftx = FTX1Controller('COM5', baudrate=38400)
    
    try:
        # Get radio ID
        radio_id = get_id(ftx)
        print(f"Radio ID: {radio_id}")
        
        # Set frequency to 14.250 MHz
        set_frequency_main(ftx, 14250000)
        print(f"Frequency set to: {get_frequency_main(ftx)} Hz")
        
        # Set mode to USB
        set_mode(ftx, OperatingMode.USB)
        print(f"Mode: {get_mode(ftx)}")
        
        # Set RF power to 50W
        set_rf_power(ftx, 50)
        print(f"RF Power: {get_rf_power(ftx)}")
        
        # Read S-meter
        s_meter = get_s_meter(ftx)
        print(f"S-meter: {s_meter}")
        
        # Get comprehensive info
        info = get_radio_info(ftx)
        print(f"Radio Info: {info}")
        
    finally:
        # Always close connection
        ftx.close()


if __name__ == "__main__":
    # Uncomment to run example
    # example_usage()
    pass