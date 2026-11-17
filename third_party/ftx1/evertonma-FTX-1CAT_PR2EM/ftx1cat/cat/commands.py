# -*- coding: utf-8 -*-
"""
Comandos CAT do FTX-1 que NÃO são do menu EX: frequência, modo, banda e os
controles rápidos (potência, NB, DNR, D-LEVEL...).

A ideia deste módulo é concentrar todo o conhecimento do protocolo em um lugar
só, testável sem rádio e sem interface. A interface (ftx1cat.ui) só chama
funções daqui e nunca monta strings "FA...;" por conta própria.

Convenções:
  * Toda função `*_cmd` devolve a string completa do comando, com ';'.
  * Toda função `parse_*` recebe o quadro completo recebido (ex. 'FA014250000;')
    e devolve o valor já convertido.
  * Referências: "FTX-1 CAT Operation Reference Manual", rev. 2507-B.
"""

from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Tuple

from .menu import BY_KEY, Item

# --------------------------------------------------------------------------
# Limites do receptor (manual: 30 kHz - 174 MHz e 400 - 470 MHz)
# --------------------------------------------------------------------------
FREQ_MIN_HZ = 30_000
FREQ_MAX_HZ = 470_000_000
RX_RANGES_HZ = ((30_000, 174_000_000), (400_000_000, 470_000_000))

FREQ_11M_DX_CALL_HZ = 27_555_000   # frequência de chamada DX em 11 m (USB)


def in_rx_range(hz: int) -> bool:
    hz = int(hz)
    return any(lo <= hz <= hi for lo, hi in RX_RANGES_HZ)


def clamp_frequency(hz: int) -> int:
    return max(FREQ_MIN_HZ, min(FREQ_MAX_HZ, int(hz)))


def format_frequency(hz: int) -> str:
    """144800000 -> '144.800.000' (separador de milhar com ponto, como no rádio)."""
    return f"{int(hz):,}".replace(",", ".")


def frequency_from_digits(digits: str) -> int:
    """Interpreta dígitos abreviados digitados pelo usuário.

    Regras (as mesmas da v0.1):
      * 4 dígitos podem ser MHz com uma casa decimal: '1448' -> 144.800.000 Hz.
      * Caso contrário completa com zeros à direita até 9 dígitos:
        '14250' -> 142.500.000 Hz.
      * Se o valor completado cair fora das faixas de RX, tenta ler como kHz:
        '27555' -> 275.550.000 (fora) -> 27.555.000 Hz.
      * Se nada der certo, devolve o valor completado à direita (a interface
        valida a faixa e avisa).
    """
    digits = "".join(c for c in digits if c.isdigit())[:9]
    if not digits:
        raise ValueError("no digits")
    if len(digits) == 4:
        mhz_candidate = int(digits[:3]) * 1_000_000 + int(digits[3]) * 100_000
        if in_rx_range(mhz_candidate):
            return mhz_candidate
    right_padded = int(digits.ljust(9, "0"))
    if not in_rx_range(right_padded):
        khz_candidate = int(digits) * 1000
        if in_rx_range(khz_candidate):
            return khz_candidate
    return right_padded


def mask_frequency_digits(digits: str) -> str:
    """Máscara mostrada enquanto o usuário digita (espelha frequency_from_digits)."""
    digits = "".join(c for c in digits if c.isdigit())[:9]
    if not digits:
        return ""
    if len(digits) == 4:
        mhz_candidate = int(digits[:3]) * 1_000_000 + int(digits[3]) * 100_000
        if in_rx_range(mhz_candidate):
            return f"{digits[:3]}.{digits[3:]}"
    if len(digits) > 3:
        right_padded = int(digits.ljust(9, "0"))
        khz_candidate = int(digits) * 1000
        if not in_rx_range(right_padded) and in_rx_range(khz_candidate):
            return f"{digits[:-3]}.{digits[-3:]}"
    return ".".join(digits[i:i + 3] for i in range(0, len(digits), 3))


# --------------------------------------------------------------------------
# Modos (comando MD0x)
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class Mode:
    code: str      # P2 do comando MD
    name: str      # como aparece no rádio
    family: str    # "ssb" | "cw" | "am" | "fm" | "data" | "rtty" | "psk" | "c4fm"


MODES: List[Mode] = [
    Mode("1", "LSB", "ssb"), Mode("2", "USB", "ssb"), Mode("3", "CW-U", "cw"),
    Mode("4", "FM", "fm"), Mode("5", "AM", "am"), Mode("6", "RTTY-L", "rtty"),
    Mode("7", "CW-L", "cw"), Mode("8", "DATA-L", "data"), Mode("9", "RTTY-U", "rtty"),
    Mode("A", "DATA-FM", "fm"), Mode("B", "FM-N", "fm"), Mode("C", "DATA-U", "data"),
    Mode("D", "AM-N", "am"), Mode("E", "PSK", "psk"), Mode("F", "DATA-FM-N", "fm"),
    Mode("H", "C4FM-DN", "c4fm"), Mode("I", "C4FM-VW", "c4fm"),
]
MODE_BY_CODE: Dict[str, Mode] = {m.code: m for m in MODES}


def mode_name(code: Optional[str]) -> str:
    m = MODE_BY_CODE.get(code or "")
    return m.name if m else "—"


def ch_step_item_for_mode(code: Optional[str]) -> Item:
    """Item do menu KEY/DIAL que define o CH STEP para o modo atual.

    O FTX-1 tem três itens: CH STEP (SSB/CW/DATA...), AM CH STEP e FM CH STEP.
    Os modos C4FM usam o passo de FM.
    """
    family = MODE_BY_CODE[code].family if code in MODE_BY_CODE else "ssb"
    key = {"am": "030605", "fm": "030606", "c4fm": "030606"}.get(family, "030604")
    return BY_KEY[key]


def ch_step_khz(item: Item, raw: str) -> float:
    """'2' + item FM CH STEP -> 10.0 (kHz)."""
    return float(item.label_of(raw).split()[0])


def nearest_ch_step_code(item: Item, khz: float) -> str:
    opts = dict(item.opts)
    return min(opts, key=lambda c: abs(float(opts[c].split()[0]) - khz))


# --------------------------------------------------------------------------
# Bandas (comando BS0xx usa o Band Stack do rádio)
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class Band:
    code: str       # P2 do comando BS; "11m" é tratado à parte (não existe no CAT)
    label: str


BANDS: List[Band] = [
    Band("00", "160m"), Band("01", "80m"), Band("02", "60m"), Band("03", "40m"),
    Band("04", "30m"), Band("05", "20m"), Band("06", "17m"), Band("07", "15m"),
    Band("08", "12m"), Band("09", "10m"), Band("11m", "11m"), Band("10", "6m"),
    Band("11", "4m/GEN"), Band("12", "AIR"), Band("13", "2m"), Band("14", "70cm"),
]


# --------------------------------------------------------------------------
# Comandos simples
# --------------------------------------------------------------------------
def id_cmd() -> str:
    return "ID;"


def parse_id(frame: str) -> str:
    return frame[2:-1]


def firmware_cmd(which: int = 0) -> str:
    return f"VE{which};"


def parse_firmware(frame: str) -> str:
    return frame[3:-1]


def read_frequency_cmd() -> str:
    return "FA;"


def set_frequency_cmd(hz: int) -> str:
    hz = int(hz)
    if not FREQ_MIN_HZ <= hz <= FREQ_MAX_HZ:
        raise ValueError(f"frequency {hz} Hz out of range")
    return f"FA{hz:09d};"


def parse_frequency(frame: str) -> int:
    return int(frame[2:-1])


def read_mode_cmd() -> str:
    return "MD0;"


def set_mode_cmd(code: str) -> str:
    if code not in MODE_BY_CODE:
        raise ValueError(f"unknown mode {code!r}")
    return f"MD0{code};"


def parse_mode(frame: str) -> str:
    return frame[3:-1]


def select_band_cmd(code: str) -> str:
    """Pede a banda ao rádio (Band Stack). '11m' não existe no CAT: sintoniza FA."""
    if code == "11m":
        return set_frequency_cmd(FREQ_11M_DX_CALL_HZ)
    return f"BS0{code};"


# --------------------------------------------------------------------------
# Controles rápidos e parâmetros FUNC
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class Control:
    """Um valor numérico do rádio lido/gravado por um comando CAT próprio.

    `decode` recebe só o payload (quadro sem o prefixo e sem ';').
    `encode` recebe o valor do controle e devolve o comando completo.
    `display` formata o valor para a interface.
    """
    key: str
    title: str
    read_cmd: str
    prefix: str
    lo: float
    hi: float
    step: float
    decode: Callable[[str], float]
    encode: Optional[Callable[[float], str]]
    display: Callable[[float], str]
    da_slot: Optional[int] = None    # CONTRAST/DIMMER vivem dentro do quadro DA

    def payload(self, frame: str) -> str:
        return frame[len(self.prefix):-1]

    def value_from_frame(self, frame: str) -> float:
        return self.decode(self.payload(frame))


def _delay_label(code: float) -> str:
    """VOX DELAY e BK-DELAY: 0-5 = 30/50/100/150/200/250 ms, depois passos de 100 ms."""
    code = int(code)
    ms = [30, 50, 100, 150, 200, 250][code] if code < 6 else (code - 3) * 100
    return f"{ms} ms"


def _level_label(v: float) -> str:
    return "OFF" if int(v) == 0 else f"Level {int(v)}"


# RF POWER: 'PC' + P1 + P2(3). P1 = 1 limita a 10 W (field head); P1 = 2 controla o SPA-1.
RF_POWER = Control("RF POWER", "RF POWER (W)", "PC;", "PC", 5, 100, 1,
                   lambda raw: float(int(raw[1:4])),
                   lambda v: f"PC2{int(v):03d};",
                   lambda v: f"{int(v)} W")
D_LEVEL = Control("D-LEVEL", "D-LEVEL", "SS04;", "SS04", -30, 30, 0.5,
                  lambda raw: float(raw),
                  lambda v: f"SS04{float(v):+05.1f};",
                  lambda v: f"{float(v):+.1f} dB")
D_PEAK = Control("D-PEAK", "D-PEAK", "SS01;", "SS01", 1, 5, 1,
                 lambda raw: int(raw[0]) + 1,
                 lambda v: f"SS01{int(v) - 1}0000;",
                 lambda v: f"LV{int(v)}")
NB = Control("NB", "NB", "NL0;", "NL0", 0, 10, 1,
             lambda raw: int(raw),
             lambda v: f"NL0{int(v):03d};",
             _level_label)
DNR = Control("DNR", "DNR", "RL0;", "RL0", 0, 10, 1,
              lambda raw: int(raw),
              lambda v: f"RL0{int(v):02d};",
              _level_label)

QUICK_CONTROLS: List[Control] = [RF_POWER, D_LEVEL, D_PEAK, NB, DNR]

# Parâmetros do botão FUNC: a chave é o código que o rádio usa na lista FUNC.
# Ajustamos o valor localmente sem alterar a atribuição do botão físico.
FUNC_PARAMETERS: Dict[str, Control] = {
    "3": Control("3", "SCOPE COLOR", "SS03;", "SS03", 1, 11, 1,
                 lambda r: int(r, 16) + 1,
                 lambda v: "SS03" + "0123456789A"[int(v) - 1] + ";",
                 lambda v: f"COLOR-{int(v)}"),
    "4": Control("4", "CONTRAST", "DA;", "DA", 0, 20, 1,
                 lambda r: int(r[2:4]), None, lambda v: str(int(v)), da_slot=2),
    "5": Control("5", "DIMMER", "DA;", "DA", 0, 20, 1,
                 lambda r: int(r[4:6]), None, lambda v: str(int(v)), da_slot=4),
    "7": Control("7", "MIC GAIN", "MG;", "MG", 0, 100, 1,
                 int, lambda v: f"MG{int(v):03d};", lambda v: str(int(v))),
    "8": Control("8", "PROC LEVEL", "PL;", "PL", 0, 100, 1,
                 int, lambda v: f"PL{int(v):03d};", lambda v: str(int(v))),
    "9": Control("9", "AMC LEVEL", "AO;", "AO", 1, 100, 1,
                 int, lambda v: f"AO{int(v):03d};", lambda v: str(int(v))),
    "A": Control("A", "VOX GAIN", "VG;", "VG", 0, 100, 1,
                 int, lambda v: f"VG{int(v):03d};", lambda v: str(int(v))),
    "B": Control("B", "VOX DELAY", "VD;", "VD", 0, 33, 1,
                 int, lambda v: f"VD{int(v):02d};", _delay_label),
    "D": Control("D", "RF POWER (W)", "PC;", "PC", 5, 100, 1,
                 lambda r: int(r[1:4]), lambda v: f"PC2{int(v):03d};", lambda v: f"{int(v)} W"),
    "E": Control("E", "MONI LEVEL", "ML1;", "ML1", 0, 100, 1,
                 int, lambda v: f"ML1{int(v):03d};", lambda v: str(int(v))),
    "F": Control("F", "CW SPEED (WPM)", "KS;", "KS", 4, 60, 1,
                 int, lambda v: f"KS{int(v):03d};", lambda v: f"{int(v)} WPM"),
    "G": Control("G", "CW PITCH (Hz)", "KP;", "KP", 300, 1050, 10,
                 lambda r: 300 + int(r) * 10,
                 lambda v: f"KP{int((v - 300) / 10):02d};", lambda v: f"{int(v)} Hz"),
    "H": Control("H", "BK-DELAY", "SD;", "SD", 0, 33, 1,
                 int, lambda v: f"SD{int(v):02d};", _delay_label),
}

# Ordem e rótulos dos botões na interface
FUNC_BUTTONS: List[Tuple[str, str]] = [
    ("3", "COLOR"), ("4", "CONTRAST"), ("5", "DIMMER"), ("7", "MIC GAIN"),
    ("8", "PROC LEVEL"), ("9", "AMC LEVEL"), ("A", "VOX GAIN"), ("B", "VOX DELAY"),
    ("D", "RF POWER"), ("E", "MONI LEVEL"), ("F", "CW SPEED"), ("G", "CW PITCH"),
    ("H", "BK-DELAY"),
]


def da_set_cmd(current_da_frame: str, slot: int, value: int) -> str:
    """Monta o comando DA trocando só os 2 dígitos do slot (CONTRAST ou DIMMER)."""
    raw = current_da_frame[2:-1]
    raw = raw[:slot] + f"{int(value):02d}" + raw[slot + 2:]
    return f"DA{raw};"


# --------------------------------------------------------------------------
# RF POWER com P1 real: 1 = FTX-1 field head (5-10 W), 2 = SPA-1 (5-100 W)  (p. 21)
# --------------------------------------------------------------------------
PC_HEAD_RANGE: Dict[str, Tuple[int, int]] = {"1": (5, 10), "2": (5, 100)}
PC_HEAD_NAME: Dict[str, str] = {"1": "FTX-1 field head", "2": "SPA-1"}


def parse_pc(frame: str) -> Tuple[str, int]:
    """'PC2013;' -> ('2', 13)."""
    return frame[2], int(frame[3:6])


def set_rf_power_cmd(head: str, watts: int) -> str:
    lo, hi = PC_HEAD_RANGE.get(head, (5, 100))
    watts = int(watts)
    if not lo <= watts <= hi:
        raise ValueError(f"RF POWER {watts} W outside {lo}-{hi} W for head {head}")
    return f"PC{head}{watts:03d};"


# --------------------------------------------------------------------------
# Auto Information (p. 6): o rádio envia sozinho as respostas dos comandos
# marcados "AI" quando o estado muda (FA, MD, IF, RM, RI, PC, NL, RL, ...).
# --------------------------------------------------------------------------
def auto_information_cmd(on: bool) -> str:
    return f"AI{1 if on else 0};"


# --------------------------------------------------------------------------
# IF - INFORMATION VFO MAIN-SIDE (p. 17). Mesmo layout de MR/OI/MW.
#   IF P1(5) P2(9) P3(5) P4 P5 P6 P7 P8 P9(2) P10 ;   -> 30 caracteres
# --------------------------------------------------------------------------
VFO_MEM_MODES = {"0": "VFO", "1": "MEMORY", "2": "MEM TUNE", "3": "QMB", "5": "PMS"}
SQL_TYPES = {"0": "OFF", "1": "CTCSS ENC/DEC", "2": "CTCSS ENC", "3": "DCS",
             "4": "PR FREQ", "5": "REV TONE"}
SHIFTS = {"0": "SIMPLEX", "1": "+", "2": "-"}


@dataclass(frozen=True)
class Info:
    """Conteúdo de um quadro IF/MR/OI."""
    channel: str          # '00000' = VFO/MT/QMB, '00001'-'00999', 'P-01L'..., 'EMGCH'
    frequency: int        # Hz
    clar_offset: int      # Hz, com sinal
    rx_clar: bool
    tx_clar: bool
    mode: str             # código MD
    vfo_mem: str          # P7
    sql_type: str         # P8
    shift: str            # P10

    @property
    def mode_name(self) -> str:
        return mode_name(self.mode)

    def encode(self, prefix: str = "MW") -> str:
        """Monta o payload no mesmo layout (usado por MW)."""
        sign = "-" if self.clar_offset < 0 else "+"
        return (f"{prefix}{self.channel:>5}{self.frequency:09d}{sign}{abs(self.clar_offset):04d}"
                f"{int(self.rx_clar)}{int(self.tx_clar)}{self.mode}{self.vfo_mem}{self.sql_type}"
                f"00{self.shift};")


INFO_LEN = 2 + 5 + 9 + 5 + 1 + 1 + 1 + 1 + 1 + 2 + 1 + 1


def parse_info(frame: str) -> Info:
    """'IF00000014250000+000000200000;' -> Info(...). Aceita IF, MR e OI."""
    if len(frame) != INFO_LEN or not frame.endswith(";"):
        raise ValueError(f"bad info frame {frame!r}")
    p = frame[2:-1]
    return Info(
        channel=p[0:5],
        frequency=int(p[5:14]),
        clar_offset=int(p[14:19]),
        rx_clar=p[19] == "1",
        tx_clar=p[20] == "1",
        mode=p[21],
        vfo_mem=p[22],
        sql_type=p[23],
        shift=p[26],
    )


def read_info_cmd() -> str:
    return "IF;"


# --------------------------------------------------------------------------
# RI - RADIO INFORMATION (p. 22): 'RI0' + P2..P8 + ';'
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class RadioStatus:
    hi_swr: bool
    recording: str        # "0" stop, "1" recording, "2" playing
    tx: str               # "0" RX, "1" TX, "2" TX INHIBIT
    tuning: bool
    scan: str             # "0" stop, "1" scanning, "2" pause
    busy: bool            # squelch aberto

    @property
    def transmitting(self) -> bool:
        return self.tx == "1"


def read_status_cmd() -> str:
    return "RI0;"


def parse_status(frame: str) -> RadioStatus:
    p = frame[3:-1]
    if len(p) != 7:
        raise ValueError(f"bad RI frame {frame!r}")
    return RadioStatus(hi_swr=p[0] == "1", recording=p[1], tx=p[2], tuning=p[4] == "1",
                       scan=p[5], busy=p[6] == "1")


# --------------------------------------------------------------------------
# Medidores: SM (p. 24) e RM (p. 23). Valores brutos 000-255.
# --------------------------------------------------------------------------
METERS: Dict[str, str] = {"1": "S", "2": "S (SUB)", "3": "COMP", "4": "ALC", "5": "PO",
                          "6": "SWR", "7": "IDD", "8": "VDD"}
TX_METERS = ("5", "6", "4")        # PO, SWR, ALC — mostrados durante a transmissão


def read_smeter_cmd() -> str:
    return "SM0;"


def parse_smeter(frame: str) -> int:
    return int(frame[3:6])


def read_meter_cmd(which: str) -> str:
    if which not in METERS:
        raise ValueError(f"unknown meter {which!r}")
    return f"RM{which};"


def parse_meter(frame: str) -> Tuple[str, int]:
    """'RM5123000;' -> ('5', 123)."""
    return frame[2], int(frame[3:6])


# --------------------------------------------------------------------------
# Memórias (pp. 19-20, 26)
# --------------------------------------------------------------------------
MEMORY_MIN, MEMORY_MAX = 1, 999
TAG_LEN = 12


def channel_code(n: int) -> str:
    if not MEMORY_MIN <= int(n) <= MEMORY_MAX:
        raise ValueError(f"memory channel {n} outside {MEMORY_MIN}-{MEMORY_MAX}")
    return f"{int(n):05d}"


def read_memory_cmd(n: int) -> str:
    return f"MR{channel_code(n)};"


def write_memory_cmd(info: Info) -> str:
    return info.encode("MW")


def read_tag_cmd(n: int) -> str:
    return f"MT{channel_code(n)};"


def write_tag_cmd(n: int, tag: str) -> str:
    tag = tag[:TAG_LEN].ljust(TAG_LEN)
    if not tag.isascii():
        raise ValueError("tag must be ASCII")
    return f"MT{channel_code(n)}{tag};"


def parse_tag(frame: str) -> Tuple[int, str]:
    """'MT00001FT8 20m      ;' -> (1, 'FT8 20m')."""
    return int(frame[2:7]), frame[7:-1].rstrip()


def select_channel_cmd(n: int) -> str:
    return f"MC0{channel_code(n)};"


def vfo_memory_cmd(memory: bool) -> str:
    """VM0xx: 00 = VFO, 11 = memória (p. 26)."""
    return "VM011;" if memory else "VM000;"
