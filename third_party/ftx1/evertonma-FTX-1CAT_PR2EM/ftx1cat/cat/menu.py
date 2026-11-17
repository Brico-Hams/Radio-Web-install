# -*- coding: utf-8 -*-
"""
Tabela do menu do Yaesu FTX-1 (comando EX).

Este módulo é SÓ DADOS + validação: não fala com a porta serial. A comunicação
fica em `ftx1cat.cat.transport`; os demais comandos CAT (FA, MD, PC...) ficam
em `ftx1cat.cat.commands`.

Fonte única dos dados: "FTX-1 CAT Operation Reference Manual", rev. 2507-B
  - Tabela 3 (MENU Chart), páginas 10-16  -> itens, faixas e códigos do P4
  - Tabela 1 (CTCSS), página 8            -> frequências de TONE FREQ
  - Comandos EX (p.9), ID (p.17), VE (p.26)

Pontos em que o manual é ambíguo ou se contradiz (tratados de forma conservadora):
  * O quadro do comando EX (p.9) diz P1 = 01-07, P2 = 01-07, P3 = 01-26, mas a
    Tabela 3 tem P1 até 11 e P3 até 37. Aqui vale a Tabela 3.
  * Itens cujo formato/unidade do P4 não está claro ficam SOMENTE LEITURA
    (kind="ro"), com o texto do manual em `hint`.
  * Itens de texto (MY CALL, DTMF MEMORY, ...) ficam SOMENTE LEITURA (kind="text"):
    o manual indica o número de caracteres, mas não diz como preencher os vazios.
  * Itens sem parâmetro no manual (P4 = "-": DAY/MONTH/YEAR, SD CARD, RESET,
    CALIBRATION, CERTIFICATION, FIRMWARE UPDATE, LAT/LONG, DEVICE LIST...) não
    entram na tabela.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Tuple


# --------------------------------------------------------------------------
# Item de menu
# --------------------------------------------------------------------------
@dataclass
class Item:
    p1: int
    p2: int
    p3: int
    name: str
    kind: str                 # "enum" | "int" | "sint" | "ro" | "text"
    digits: int               # número de caracteres do P4
    opts: List[Tuple[str, str]] = field(default_factory=list)   # enum: [(código, rótulo)]
    lo: int = 0
    hi: int = 0
    step: int = 1
    unit: str = ""
    hint: str = ""
    path1: str = ""
    path2: str = ""

    @property
    def key(self) -> str:
        """Chave P1P2P3 de 6 dígitos, como usada no comando EX."""
        return f"{self.p1:02d}{self.p2:02d}{self.p3:02d}"

    @property
    def path(self) -> str:
        """Caminho legível: 'RADIO SETTING > MODE SSB > AF TREBLE GAIN'."""
        return f"{self.path1} > {self.path2} > {self.name}"

    def label_of(self, code: str) -> str:
        """Rótulo de um código enum (ou o próprio código se não estiver na tabela)."""
        return dict(self.opts).get(code, code)

    @property
    def writable(self):
        return self.kind in ("enum", "int", "sint")

    @property
    def risky(self):
        """Itens que mudam as portas CAT / a porta TUNER-LINEAR."""
        return self.name.startswith("CAT-") or self.name == "TUN/LIN PORT SELECT"

    def encode(self, value):
        """Valor da interface -> P4 (string pronta para o comando EX)."""
        if self.kind == "enum":
            v = str(value)
            if v not in dict(self.opts):
                raise ValueError(f"{self.name}: invalid option '{v}'")
            return v
        if self.kind in ("int", "sint"):
            try:
                n = int(str(value).strip())
            except ValueError:
                raise ValueError(f"{self.name}: '{value}' is not an integer") from None
            if not (self.lo <= n <= self.hi):
                raise ValueError(f"{self.name}: outside the range {self.lo} to {self.hi}")
            if self.kind == "int":
                if (n - self.lo) % self.step:
                    raise ValueError(
                        f"{self.name}: use steps of {self.step} starting at {self.lo}")
                s = str(n).zfill(self.digits)
                if len(s) != self.digits:
                    raise ValueError(f"{self.name}: value does not fit in {self.digits} digits")
                return s
            return f"{'+' if n >= 0 else '-'}{abs(n):0{self.digits - 1}d}"
        raise ValueError(f"{self.name}: item is read-only")

    def decode(self, raw):
        """P4 recebido do radio -> valor (int para numericos, str nos demais)."""
        if self.kind in ("int", "sint"):
            return int(raw.strip())      # "-00" e "+00" viram 0
        return raw

    def norm(self, raw):
        """Forma normalizada para comparar valores ('-00' == '+00')."""
        if self.kind in ("int", "sint"):
            try:
                return int(raw.strip())
            except ValueError:
                return raw
        return raw

    def pretty(self, raw):
        if self.kind == "enum":
            lab = dict(self.opts).get(raw)
            return f"{raw} - {lab}" if lab is not None else f"{raw} (not in table)"
        if self.kind in ("int", "sint"):
            try:
                return f"{self.decode(raw)} {self.unit}".strip()
            except ValueError:
                return raw
        return raw


# --------------------------------------------------------------------------
# Construtores compactos
# --------------------------------------------------------------------------
def _opts(spec):
    out = []
    for part in spec.split("|"):
        code, label = part.split("=", 1)
        out.append((code, label))
    return out


def en(p3, name, spec, digits=1, hint=""):
    return Item(0, 0, p3, name, "enum", digits, opts=_opts(spec), hint=hint)


def nu(p3, name, lo, hi, digits, step=1, unit="", hint=""):
    return Item(0, 0, p3, name, "int", digits, lo=lo, hi=hi, step=step, unit=unit, hint=hint)


def sg(p3, name, lo, hi, unit=""):
    return Item(0, 0, p3, name, "sint", 3, lo=lo, hi=hi, unit=unit)


def ro(p3, name, digits, hint=""):
    return Item(0, 0, p3, name, "ro", digits, hint=hint)


def tx(p3, name, digits):
    return Item(0, 0, p3, name, "text", digits)


# --------------------------------------------------------------------------
# Listas de opcoes reutilizadas (Tabela 3)
# --------------------------------------------------------------------------
OFF_ON = "0=OFF|1=ON"
SLOPE = "0=6 dB/oct|1=18 dB/oct"
LCUT = "00=OFF|" + "|".join(f"{c:02d}={100 + 50 * (c - 1)} Hz" for c in range(1, 20))
HCUT = "00=OFF|" + "|".join(f"{c:02d}={700 + 50 * (c - 1)} Hz" for c in range(1, 68))
TXBPF = "0=50-3050 Hz|1=100-2900 Hz|2=200-2800 Hz|3=300-2700 Hz|4=400-2600 Hz"
MODSRC = "0=MIC|1=USB|2=Bluetooth|3=AUTO"
RPTT = "0=OFF|1=RTS|2=DTR"
NAR_SSB = ("00=300 Hz|01=400 Hz|02=600 Hz|03=850 Hz|04=1100 Hz|05=1200 Hz|06=1500 Hz|"
           "07=1650 Hz|08=1800 Hz|09=1950 Hz|10=2100 Hz|11=2250 Hz|12=2400 Hz|13=2450 Hz|"
           "14=2500 Hz|15=2600 Hz|16=2700 Hz|17=2800 Hz|18=2900 Hz|19=3000 Hz|20=3200 Hz|"
           "21=3500 Hz|22=4000 Hz")
NAR_DATA = ("00=50 Hz|01=100 Hz|02=150 Hz|03=200 Hz|04=250 Hz|05=300 Hz|06=350 Hz|"
            "07=400 Hz|08=450 Hz|09=500 Hz|10=600 Hz|11=800 Hz|12=1200 Hz|13=1400 Hz|"
            "14=1700 Hz|15=2000 Hz|16=2400 Hz|17=3000 Hz|18=3200 Hz|19=3500 Hz|20=4000 Hz")
RATE = "0=4800 bps|1=9600 bps|2=19200 bps|3=38400 bps|4=115200 bps"
TIMEOUT = "0=10 ms|1=100 ms|2=1000 ms|3=3000 ms"
STOPBIT = "0=1 bit|1=2 bit"
SAVER = "0=OFF|1=1 min|2=2 min|3=5 min|4=15 min|5=30 min|6=60 min"
COL4 = "0=BLUE|1=GREEN|2=WHITE|3=NONE"
POPUP = "0=OFF|1=3 s|2=5 s|3=10 s|4=HOLD"
MICFN = ("00=LOCK|01=QMB|02=>/<|03=V/M|04=TUNER|05=VOX/MOX|06=MODE|07=ZIN/SPOT|08=SPLIT|"
         "09=FINE|10=NAR|11=NB|12=DNR|13=FREQ UP|14=FREQ DOWN|15=BAND UP|16=BAND DOWN|"
         "17=ATT|18=IPO|19=DNF|20=AGC")

# Tabela 1 (CTCSS), codigos 000-049
CTCSS_HZ = [67.0, 69.3, 71.9, 74.4, 77.0, 79.7, 82.5, 85.4, 88.5, 91.5, 94.8, 97.4,
            100.0, 103.5, 107.2, 110.9, 114.8, 118.8, 123.0, 127.3, 131.8, 136.5,
            141.3, 146.2, 151.4, 156.7, 159.8, 162.2, 165.5, 167.9, 171.3, 173.8,
            177.3, 179.9, 183.5, 186.2, 189.9, 192.8, 196.6, 199.5, 203.5, 206.5,
            210.7, 218.1, 225.7, 229.1, 233.6, 241.8, 250.3, 254.1]
CTCSS = "|".join(f"{i:02d}={hz} Hz" for i, hz in enumerate(CTCSS_HZ))

EQ1F = "00=OFF|" + "|".join(f"{c:02d}={100 * c} Hz" for c in range(1, 8))
EQ2F = "00=OFF|" + "|".join(f"{c:02d}={700 + 100 * (c - 1)} Hz" for c in range(1, 10))
EQ3F = "00=OFF|" + "|".join(f"{c:02d}={1500 + 100 * (c - 1)} Hz" for c in range(1, 19))


# --------------------------------------------------------------------------
# Blocos repetidos
# --------------------------------------------------------------------------
def _audio():       # P3 01-06
    return [
        sg(1, "AF TREBLE GAIN", -20, 10),
        sg(2, "AF MIDDLE TONE GAIN", -20, 10),
        sg(3, "AF BASS GAIN", -20, 10),
        nu(4, "AGC FAST DELAY", 20, 4000, 4, 20, "ms"),
        nu(5, "AGC MID DELAY", 20, 4000, 4, 20, "ms"),
        nu(6, "AGC SLOW DELAY", 20, 4000, 4, 20, "ms"),
    ]


def _cuts():        # P3 07-10
    return [
        en(7, "LCUT FREQ", LCUT, 2),
        en(8, "LCUT SLOPE", SLOPE),
        en(9, "HCUT FREQ", HCUT, 2),
        en(10, "HCUT SLOPE", SLOPE),
    ]


def _ssb():
    return _audio() + _cuts() + [
        nu(11, "USB OUT LEVEL", 0, 100, 3),
        en(12, "TX BPF SEL", TXBPF),
        en(13, "MOD SOURCE", MODSRC),
        nu(14, "USB MOD GAIN", 0, 100, 3),
        en(15, "RPTT SELECT", RPTT),
        en(16, "NAR WIDTH", NAR_SSB, 2),
        en(17, "CW AUTO MODE", "0=OFF|1=50MHz|2=ON"),
    ]


def _am():          # itens 01-15 iguais ao SSB
    return _ssb()[:15]


_RPT_NOTE = ("Manual: 0 - 100 MHz (P4 = 0000 - 0100, 50 kHz steps); "
             "the P4 unit is unclear")


def _fm():
    return _audio() + _cuts() + [
        nu(11, "USB OUT LEVEL", 0, 100, 3),
        en(12, "MOD SOURCE", MODSRC),
        nu(13, "USB MOD GAIN", 0, 100, 3),
        en(14, "RPTT SELECT", RPTT),
        en(15, "RPT SHIFT", "0=-|1=SIMPLEX|2=+|3=ARS"),
        nu(16, "RPT SHIFT (28MHz)", 0, 1000, 4, 10, "kHz"),
        nu(17, "RPT SHIFT (50MHz)", 0, 4000, 4, 10, "kHz"),
        ro(18, "RPT SHIFT (144MHz)", 4, _RPT_NOTE),
        ro(19, "RPT SHIFT (430MHz)", 4, _RPT_NOTE),
        en(20, "SQL TYPE", "0=OFF|1=ENC|2=TSQ|3=DCS|4=PR FREQ|5=REV TONE"),
        en(21, "TONE FREQ", CTCSS, 2),
        ro(22, "DCS CODE", 2, "Manual: 00 = 023 ... 103 = 754, but specifies only 2 digits"),
        en(23, "DCS RX REVERS", "0=NORMAL|1=REVERS|2=BOTH"),
        en(24, "DCS TX REVERS", "0=NORMAL|1=REVERS"),
        nu(25, "PR FREQ", 300, 3000, 4, 100, "Hz"),
        en(26, "DTMF DELAY", "0=50 ms|1=250 ms|2=450 ms|3=750 ms|4=1000 ms"),
        en(27, "DTMF SPEED", "0=50 ms|1=100 ms"),
    ] + [tx(27 + i, f"DTMF MEMORY{i}", 16) for i in range(1, 11)]


def _data():
    return _audio() + _cuts() + [
        nu(11, "USB OUT LEVEL", 0, 100, 3),
        en(12, "TX BPF SEL", TXBPF),
        en(13, "MOD SOURCE", MODSRC),
        nu(14, "USB MOD GAIN", 0, 100, 3),
        en(15, "RPTT SELECT", RPTT),
        en(16, "NAR WIDTH", NAR_DATA, 2),
        en(17, "PSK TONE", "0=1000 Hz|1=1500 Hz|2=2000 Hz"),
        nu(18, "DATA SHIFT (SSB)", 0, 3000, 4, 10, "Hz"),
    ]


def _rtty():
    return _audio() + _cuts() + [
        nu(11, "USB OUT LEVEL", 0, 100, 3),
        en(12, "RPTT SELECT", RPTT),
        en(13, "NAR WIDTH", NAR_DATA, 2),
        en(14, "MARK FREQUENCY", "0=1275 Hz|1=2125 Hz"),
        en(15, "SHIFT FREQUENCY", "0=170 Hz|1=200 Hz|2=425 Hz|3=850 Hz"),
        en(16, "POLARITY-TX", "0=NOR|1=REV"),
    ]


def _digital():
    popup = "00=OFF|" + "|".join(f"{c:02d}={c + 1} s" for c in range(1, 60)) + "|60=CONTINUE"
    return [
        en(1, "DIGITAL POPUP", popup, 2),
        en(2, "LOCATION SERVICE", OFF_ON),
        en(3, "STANDBY BEEP", OFF_ON),
    ]


def _cw():
    return _audio() + _cuts() + [
        nu(11, "USB OUT LEVEL", 0, 100, 3),
        en(12, "RPTT SELECT", RPTT),
        en(13, "NAR WIDTH", NAR_DATA, 2),
        en(14, "PC KEYING", RPTT),
        en(15, "CW BK-IN TYPE", "0=SEMI|1=FULL"),
        en(16, "CW FREQ DISPLAY", "0=DIRECT FREQ|1=PITCH OFFSET"),
        en(17, "QSK DELAY TIME", "0=15 ms|1=20 ms|2=25 ms|3=30 ms"),
        en(18, "CW INDICATOR", OFF_ON),
    ]


def _keyer():
    return [
        en(1, "KEYER TYPE", "0=OFF|1=BUG|2=ELEKEY-A|3=ELEKEY-B|4=ELEKEY-Y|5=ACS"),
        en(2, "KEYER DOT/DASH", "0=NOR|1=REV"),
        nu(3, "CW WEIGHT", 25, 45, 2, 1, "(x0,1 -> 2,5 a 4,5)"),
        en(4, "NUMBER STYLE", "0=1290|1=AUNO|2=AUNT|3=A2NO|4=A2NT|5=12NO|6=12NT"),
        nu(5, "CONTEST NUMBER", 1, 9999, 4),
    ] + [en(5 + i, f"CW MEMORY {i}", "0=TEXT|1=MESSAGE") for i in range(1, 6)] + [
        nu(11, "REPEAT INTERVAL", 1, 60, 2, 1, "s"),
    ]


def _general():
    return [
        nu(1, "BEEP LEVEL", 0, 100, 3),
        en(2, "RF/SQL VR", "0=RF|1=SQL|2=SQL (FM mode only)"),
        en(3, "TUN/LIN PORT SELECT", "0=EXT-TUNER|1=LINEAR|2=CAT-3|3=GPO"),
        en(4, "TUNER SELECT", "0=INT|1=INT (FAST)|2=EXT|3=ATAS"),
        en(5, "CAT-1 RATE", RATE),
        en(6, "CAT-1 TIME OUT TIMER", TIMEOUT),
        en(7, "CAT-1 CAT-3 STOP BIT", STOPBIT),
        en(8, "CAT-2 RATE", RATE),
        en(9, "CAT-2 TIME OUT TIMER", TIMEOUT),
        en(10, "CAT-3 RATE", RATE),
        en(11, "CAT-3 TIME OUT TIMER", TIMEOUT),
        en(12, "TX TIME OUT TIMER",
           "00=OFF|" + "|".join(f"{c:02d}={c} min" for c in range(1, 31)), 2),
        sg(13, "REF FREQ ADJ", -25, 25),
        en(14, "CHARGE CONTROL", OFF_ON),
        en(15, "SUB BAND MUTE", OFF_ON),
        en(16, "SPEAKER SELECT", "0=Auto|1=INT|2=BOTH"),
        en(17, "DITHER", OFF_ON),
    ]


def _band_scan():
    return [
        en(1, "QMB CH", "0=5ch|1=10ch"),
        en(2, "BAND STACK", OFF_ON),
        en(3, "BAND EDGE", OFF_ON),
        en(4, "SCAN RESUME", "0=BUSY|1=HOLD|2=1 s|3=3 s|4=5 s"),
    ]


def _rx_dsp():
    return [
        en(1, "IF NOTCH WIDTH", "0=NARROW|1=WIDE"),
        en(2, "NB REJECTION", "0=LOW|1=MID|2=HIGH"),
        en(3, "NB WIDTH", "0=NARROW|1=MEDIUM|2=WIDE"),
        en(4, "APF WIDTH", "0=NARROW|1=MEDIUM|2=WIDE"),
        sg(5, "CONTOUR LEVEL", -40, 20),
        nu(6, "CONTOUR WIDTH", 1, 11, 2),
    ]


def _eq(base, prefix):
    return [
        en(base, f"{prefix}PRMTRC EQ1 FREQ", EQ1F, 2),
        sg(base + 1, f"{prefix}PRMTRC EQ1 LEVEL", -20, 10),
        nu(base + 2, f"{prefix}PRMTRC EQ1 BWTH", 0, 10, 2),
        en(base + 3, f"{prefix}PRMTRC EQ2 FREQ", EQ2F, 2),
        sg(base + 4, f"{prefix}PRMTRC EQ2 LEVEL", -20, 10),
        nu(base + 5, f"{prefix}PRMTRC EQ2 BWTH", 0, 10, 2),
        en(base + 6, f"{prefix}PRMTRC EQ3 FREQ", EQ3F, 2),
        sg(base + 7, f"{prefix}PRMTRC EQ3 LEVEL", -20, 10),
        nu(base + 8, f"{prefix}PRMTRC EQ3 BWTH", 0, 10, 2),
    ]


def _tx_audio():
    return ([en(1, "AMC RELEASE TIME", "0=FAST|1=MID|2=SLOW")]
            + _eq(2, "") + _eq(11, "P "))


def _tx_general():
    return [
        nu(1, "MAX POWER (BAT)", 5, 60, 3),
        en(2, "QRP MODE", OFF_ON),
        nu(3, "HF MAX POWER", 5, 10, 3),
        nu(4, "50M MAX POWER", 5, 10, 3),
        nu(5, "70M MAX POWER", 5, 60, 3),
        nu(6, "144M MAX POWER", 5, 100, 3),
        nu(7, "430M MAX POWER", 5, 100, 3),
        nu(8, "AM HF/50 MAX POWER", 5, 25, 3),
        nu(9, "AM V/U MAX POWER", 5, 25, 3),
        en(10, "VOX SELECT", "0=MIC|1=USB|2=Bluetooth"),
        en(11, "EMERGENCY FREQ TX", OFF_ON),
        en(12, "TX INHIBIT", OFF_ON),
        en(13, "METER DETECTOR", "0=AVERAGE|1=PEAK"),
    ]


def _key_dial():
    return [
        en(1, "SSB/CW DIAL STEP", "0=5 Hz|1=10 Hz|2=20 Hz"),
        en(2, "RTTY/PSK DIAL STEP", "0=5 Hz|1=10 Hz|2=20 Hz"),
        en(3, "FM DIAL STEP", "0=5 kHz|1=6.25 kHz|2=10 kHz|3=12.5 kHz|4=20 kHz|5=25 kHz|6=Auto"),
        en(4, "CH STEP", "0=1 kHz|1=2.5 kHz|2=5 kHz|3=10 kHz"),
        en(5, "AM CH STEP", "0=2.5 kHz|1=5 kHz|2=9 kHz|3=10 kHz|4=12.5 kHz|5=25 kHz"),
        en(6, "FM CH STEP", "0=5 kHz|1=6.25 kHz|2=10 kHz|3=12.5 kHz|4=20 kHz|5=25 kHz"),
        en(7, "MAIN STEPS PER REV.", "0=50|1=100|2=200"),
        en(8, "MIC P1", MICFN, 2),
        en(9, "MIC P2", MICFN, 2),
        en(10, "MIC P3", MICFN, 2),
        en(11, "MIC P4", MICFN, 2),
        en(12, "MIC UP", MICFN, 2),
        en(13, "MIC DOWN", MICFN, 2),
        en(14, "MIC SCAN", OFF_ON),
    ]


def _option():
    return [
        en(1, "TUNER TYPE SEL ANT1", "0=INT|1=INT(FAST)|2=EXT|3=ATAS"),
        en(2, "TUNER TYPE SEL ANT2", "0=INT|1=INT(FAST)|2=EXT|3=ATAS"),
        en(3, "ANT2 OPERATION", "0=TRX|1=TX-ANT1, RX-ANT2|2=TRX-ANT1, RX-ANT2"),
        en(4, "HF ANT SELECT", "0=ANT1|1=ANT2"),
        nu(5, "HF MAX POWER", 5, 100, 3),
        nu(6, "50M MAX POWER", 5, 100, 3),
        nu(7, "70M MAX POWER", 5, 50, 3),
        nu(8, "144M MAX POWER", 5, 50, 3),
        nu(9, "430M MAX POWER", 5, 50, 3),
        nu(10, "AM MAX POWER", 5, 25, 3),
        nu(11, "AM V/U MAX POWER", 5, 13, 3),
        en(12, "GPS", OFF_ON),
        en(13, "GPS PINNING", OFF_ON),
        en(14, "GPS BAUDRATE", RATE),
    ]


def _display():
    return [
        tx(1, "MY CALL", 10),
        en(2, "MY CALL TIME", "0=OFF|1=1 s|2=2 s|3=3 s|4=4 s|5=5 s"),
        en(3, "POP-UP TIME", "0=FAST|1=MID|2=SLOW"),
        en(4, "SCREEN SAVER", SAVER),
        en(5, "SCREEN SAVER (BAT)", SAVER),
        en(6, "SAVER TYPE", "0=Logo|1=DIMMER|2=DISP OFF"),
        ro(7, "AUTO POWER OFF", 1,
           "Manual: 0: OFF; 1: 0.5 - 24: 12 (hour), 1 digit - mapping unclear"),
        nu(8, "LED DIMMER", 0, 20, 2),
    ]


def _unit():
    return [
        en(1, "POSITION UNIT", "0=dd°MM.mm'|1=dd°mm'ss''"),
        en(2, "DISTANCE UNIT", "0=km|1=mile"),
        ro(3, "SPEED UNIT", 1, "Manual lista os codigos 0: km/h, 1: knot, 3: mph (sem o 2)"),
        en(4, "ALTITUDE UNIT", "0=m|1=ft"),
        en(5, "TEMP UNIT", "0=°C|1=°F"),
        en(6, "RAIN UNIT", "0=mm|1=INCH"),
        ro(7, "WIND UNIT", 1, "Manual lista os codigos 0: m/s, 2: mph (sem o 1)"),
    ]


def _scope():
    return [
        en(1, "RBW", "0=HIGH|1=MID|2=LOW"),
        en(2, "SCOPE CTR", "0=FILTER|1=CARRIER"),
        en(3, "2D DISP SENSITIVITY", "0=NORMAL|1=HI"),
        en(4, "3DSS DISP SENSITIVITY", "0=NORMAL|1=HI"),
        en(5, "AVERAGE", "0=OFF|1=2|2=4|3=8"),
    ]


def _vfo_color():
    return [
        en(1, "VMI COLOR VFO", COL4),
        en(2, "VMI COLOR MEMORY", COL4),
        en(3, "VMI COLOR CLAR", "0=RED|1=NONE"),
    ]


def _datetime_pos():
    return [
        ro(1, "TIME ZONE", 4,
           "Manual: -12 (-120) ... +14 (+140) h, 0.5 h steps, 4 digits - exact format not specified"),
        en(7, "GPS TIME SET", "0=AUTO|1=MANUAL"),
        en(8, "MY POSITION", "0=GPS|1=MANUAL"),
    ]


def _aprs_general():
    return [
        en(1, "MODEM SELECT", "0=OFF|1=AUTO|2=MAIN|3=SUB"),
        en(2, "MODEM TYPE", "0=1200 bps|1=9600 bps"),
        en(3, "APRS AF MUTE", OFF_ON),
        en(4, "APRS TX DELAY",
           "0=100 ms|1=200 ms|2=300 ms|3=400 ms|4=500 ms|5=750 ms|6=1000 ms"),
        tx(5, "CALLSIGN (APRS)", 8),
        tx(9, "APRS DESTINATION", 6),
    ]


def _aprs_symbol():
    note = "Codigos na Tabela 4 (MY SYMBOL Chart) do manual"
    return [
        en(1, "MY SYMBOL", "0=ICON1|1=ICON2|2=ICON3|3=USER"),
        ro(2, "ICON1", 2, note),
        ro(3, "ICON2", 2, note),
        ro(4, "ICON3", 2, note),
        ro(5, "USER", 2, note),
    ]


def _beacon_set():
    return [
        en(1, "BEACON TYPE", "0=OFF|1=AUTO|2=SMART"),
        en(2, "INFO AMBIGUITY", "0=OFF|1=1dig|2=2dig|3=3dig|4=4dig"),
        en(3, "INFO SPEED/COURSE", OFF_ON),
        en(4, "INFO ALTITUDE", OFF_ON),
        en(5, "POSITION COMMENT",
           "00=Off duty|01=En Route|02=In Service|03=Returning|04=Committed|05=Special|"
           "06=Priority|07=Custom 0|08=Custom 1|09=Custom 2|10=Custom 3|11=Custom 4|"
           "12=Custom 5|13=Custom 6|14=EMERGENCY!", 2),
        en(6, "EMERGENCY BEACON", OFF_ON),
    ]


def _auto_beacon():
    return [
        en(1, "INTERVAL TIME",
           "0=30 s|1=1 min|2=2 min|3=3 min|4=5 min|5=10 min|6=15 min|7=20 min|8=30 min|9=60 min"),
        en(2, "PROPORTIONAL", OFF_ON),
        en(3, "DECAY", OFF_ON),
        nu(4, "AUTO LOW SPEED", 1, 99, 2, 1, "km/h ou mph"),
        nu(5, "BEACON DELAY", 5, 180, 3, 1, "s"),
    ]


def _smart_beacon():
    return [
        nu(1, "SMART LOW SPEED", 2, 30, 2, 1, "km/h ou mph"),
        nu(2, "SMART HIGH SPEED", 3, 90, 2, 1, "km/h ou mph"),
        nu(3, "SMART SLOW RATE", 1, 100, 3, 1, "min"),
        nu(4, "SMART FAST RATE", 10, 180, 3, 1, "s"),
        nu(5, "SMART TURN ANGLE", 5, 90, 2, 1, "graus"),
        nu(6, "SMART TURN SLOPE", 1, 255, 3),
        nu(7, "SMART TURN TIME", 5, 180, 3, 1, "s"),
    ]


def _beacon_text():
    return [
        en(1, "STATUS TEXT SELECT", "0=OFF|1=TEXT1|2=TEXT2|3=TEXT3|4=TEXT4|5=TEXT5"),
        en(2, "TX RATE", "0=1/1|1=1/2|2=1/3|3=1/4|4=1/5|5=1/6|6=1/7|7=1/8"),
        en(3, "BEACON FREQUENCY", "0=None|1=FREQUENCY|2=FREQ & SQL & SHIFT"),
    ] + [tx(3 + i, f"STATUS TEXT{i}", 60) for i in range(1, 6)]


def _station_list():
    names = ["Mic-E", "POSITION", "WEATHER", "OBJECT", "ITEM", "STATUS", "OTHER", "ALTNET"]
    return [en(i + 1, n, OFF_ON) for i, n in enumerate(names)]


def _ringer():
    return [
        en(1, "TX BEACON", OFF_ON),
        en(2, "RX BEACON", OFF_ON),
        en(3, "TX MESSAGE", OFF_ON),
        en(4, "RX MESSAGE", OFF_ON),
        en(7, "MY PACKET", OFF_ON),
    ]


def _msg_fil():
    return ([tx(i, f"MESSAGE GROUP{i}", 9) for i in range(1, 7)]
            + [tx(6 + i, f"BULLETIN {i}", 9) for i in range(1, 4)])


def _preset():
    return [
        tx(1, "PRESET NAME", 12),
        en(2, "CAT-1 RATE", RATE),
        en(3, "CAT-1 TIME OUT TIMER", TIMEOUT),
        en(4, "CAT-1 CAT-3 STOP BIT", STOPBIT),
        nu(5, "AGC FAST DELAY", 20, 4000, 4, 20, "ms"),
        nu(6, "AGC MID DELAY", 20, 4000, 4, 20, "ms"),
        nu(7, "AGC SLOW DELAY", 20, 4000, 4, 20, "ms"),
        en(8, "LCUT FREQ", LCUT, 2),
        en(9, "LCUT SLOPE", SLOPE),
        en(10, "HCUT FREQ", HCUT, 2),
        en(11, "HCUT SLOPE", SLOPE),
        nu(12, "USB OUT LEVEL", 0, 100, 3),
        en(13, "TX BPF SEL", TXBPF),
        en(14, "MOD SOURCE", "0=MIC|1=USB|2=REAR (RTTY/DATA Jack)|3=AUTO"),
        nu(15, "USB MOD GAIN", 0, 100, 3),
        en(16, "RPTT SELECT", "0=OFF|1=RTS|2=DTR|3=DAKY (RTTY/DATA Jack)"),
    ]


def _bluetooth():
    return [
        en(1, "Bluetooth", OFF_ON),
        ro(2, "Device Name : Status", 1, "Manual: P4 values undefined, 1 digit"),
        en(4, "AUDIO", "0=AUTO|1=FIX"),
    ]


# --------------------------------------------------------------------------
# Arvore do menu: [(P1, nome, [(P2, nome, [Item, ...]), ...]), ...]
# --------------------------------------------------------------------------
def _build():
    raw = [
        (1, "RADIO SETTING", [
            (1, "MODE SSB", _ssb()),
            (2, "MODE AM", _am()),
            (3, "MODE FM", _fm()),
            (4, "MODE DATA", _data()),
            (5, "MODE RTTY", _rtty()),
            (6, "DIGITAL", _digital()),
        ]),
        (2, "CW SETTING", [
            (1, "MODE CW", _cw()),
            (2, "KEYER", _keyer()),
        ]),
        (3, "OPERATION SETTING", [
            (1, "GENERAL", _general()),
            (2, "BAND-SCAN", _band_scan()),
            (3, "RX-DSP", _rx_dsp()),
            (4, "TX AUDIO", _tx_audio()),
            (5, "TX GENERAL", _tx_general()),
            (6, "KEY/DIAL", _key_dial()),
            (7, "OPTION", _option()),
        ]),
        (4, "DISPLAY SETTING", [
            (1, "DISPLAY", _display()),
            (2, "UNIT", _unit()),
            (3, "SCOPE", _scope()),
            (4, "VFO IND COLOR", _vfo_color()),
        ]),
        (5, "EXTENSION SETTING", [
            (1, "DATE&TIME / MY POSITION", _datetime_pos()),
        ]),
        (6, "APRS SETTING", [
            (1, "GENERAL", _aprs_general()),
            (2, "MSG TEMPLATE", [tx(i, f"MESSAGE TEXT{i}", 16) for i in range(1, 9)]),
            (3, "MY SYMBOL", _aprs_symbol()),
            (4, "DIGI PATH", [en(1, "PATH SELECT", "0=OFF|1=WIDE1-1|2=WIDE1-1.WIDE2-1")]),
        ]),
        (7, "APRS BEACON", [
            (1, "BEACON SET.", _beacon_set()),
            (2, "AUTO BEACON", _auto_beacon()),
            (3, "SmartBeac.", _smart_beacon()),
            (4, "BEACON TEXT", _beacon_text()),
        ]),
        (8, "APRS FILTER", [
            (1, "LIST SETTING", [en(1, "STATION LIST SORT", "0=TIME|1=CALLSIGN|2=DISTANCE")]),
            (2, "STATION LIST", _station_list()),
            (3, "POPUP", [en(1, "BEACON", POPUP), en(2, "MESSAGE", POPUP),
                          en(3, "MY PACKET", OFF_ON)]),
            (4, "RINGER", _ringer()),
            (6, "MSG FIL.", _msg_fil()),
        ]),
        (9, "PRESET", [(i, f"PRESET{i}", _preset()) for i in range(1, 6)]),
        (11, "BLUETOOTH", [
            (1, "Bluetooth", _bluetooth()),
        ]),
    ]
    menu = []
    for p1, n1, groups in raw:
        gl = []
        for p2, n2, items in groups:
            for it in items:
                it.p1, it.p2, it.path1, it.path2 = p1, p2, n1, n2
            gl.append((p2, n2, items))
        menu.append((p1, n1, gl))
    return menu


MENU = _build()


def all_items() -> List[Item]:
    """Todos os itens, na ordem da Tabela 3."""
    return [it for _, _, groups in MENU for _, _, items in groups for it in items]


def find_group(p1: int, p2: int):
    """Devolve (nome_p1, nome_p2, itens) do grupo, ou None."""
    for q1, n1, groups in MENU:
        for q2, n2, items in groups:
            if (q1, q2) == (p1, p2):
                return n1, n2, items
    return None


def search_items(query: str, limit: int = 150) -> List[Item]:
    """Busca por palavras (todas precisam aparecer no nome ou no caminho)."""
    tokens = query.strip().lower().split()
    if not tokens:
        return []
    return [it for it in ALL_ITEMS
            if all(t in it.path.lower() for t in tokens)][:limit]


ALL_ITEMS: List[Item] = all_items()
BY_KEY: Dict[str, Item] = {it.key: it for it in ALL_ITEMS}

