# -*- coding: utf-8 -*-
"""
Simulador de FTX-1: um objeto "tipo pyserial.Serial" que responde aos comandos
CAT que o aplicativo usa. Serve para:

  * rodar a interface sem o rádio (`python -m ftx1cat --simulate`);
  * testes automatizados (`pytest`), inclusive em CI;
  * reproduzir cenários de erro (sem resposta, '?;', valores estranhos).

NÃO é uma emulação fiel do firmware: só implementa o subconjunto de comandos
usado aqui, com valores plausíveis. Se um comando desconhecido chegar, responde
'?;' como o rádio real faz.

Para simular o operador mexendo no rádio físico use `turn_dial()`, `set_tx()`
e `set_smeter()`: com Auto Information ligado (`AI1;`), eles emitem os quadros
espontâneos que o rádio real emitiria.
"""

import re
import threading
from typing import Dict, Optional

from . import commands as C
from .menu import ALL_ITEMS, BY_KEY, Item

# Band Stack simulado (código BS -> frequência, modo)
BAND_STACK: Dict[str, tuple] = {
    "00": (1_840_000, "1"), "01": (3_750_000, "1"), "02": (5_357_000, "2"),
    "03": (7_100_000, "1"), "04": (10_120_000, "3"), "05": (14_250_000, "2"),
    "06": (18_120_000, "2"), "07": (21_250_000, "2"), "08": (24_950_000, "2"),
    "09": (28_410_000, "2"), "10": (50_150_000, "2"), "11": (70_200_000, "2"),
    "12": (118_100_000, "5"), "13": (144_800_000, "4"), "14": (433_500_000, "4"),
}


def _default_raw(item: Item) -> str:
    """Valor inicial plausível para um item do menu."""
    if item.kind == "enum":
        return item.opts[0][0]
    if item.kind == "int":
        return str(item.lo).zfill(item.digits)
    if item.kind == "sint":
        return f"+{0:0{item.digits - 1}d}"
    if item.kind == "text":
        return " " * item.digits
    return "0" * item.digits           # "ro"


class FakeFTX1:
    """Porta serial falsa que se comporta como um FTX-1.

    Atributos úteis em testes:
      * `sent`: lista de comandos recebidos (strings).
      * `silent`: se True, não responde nada (simula rádio desligado).
      * `prepend`: bytes enviados antes da próxima resposta (simula Auto Information).
      * `menu`: dict chave -> P4 atual.
      * `memories`: dict canal(int) -> C.Info; `tags`: canal -> etiqueta.
      * `head`: '1' (field head, 5-10 W) ou '2' (SPA-1, 5-100 W).
    """

    def __init__(self, frequency: int = 28_410_000, mode: str = "2",
                 firmware: str = "0113", radio_id: str = "0840", head: str = "2"):
        self.is_open = True
        self.silent = False
        self.prepend = b""
        self.sent = []
        self.menu: Dict[str, str] = {it.key: _default_raw(it) for it in ALL_ITEMS}
        self.frequency = frequency
        self.mode = mode
        self.firmware = firmware
        self.firmwares = {"0": firmware, "1": "0105", "2": "0102", "3": "0101"}
        self.radio_id = radio_id
        self.head = head
        self.watts = 13 if head == "2" else 8
        self.ai = False
        self.tx = "0"                   # 0 RX, 1 TX, 2 TX INHIBIT
        self.hi_swr = False
        self.busy = False
        self.smeter = 120
        self.meters = {"3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0}
        self.vfo_mem = "0"
        self.channel = 1
        self.memories: Dict[int, C.Info] = {}
        self.tags: Dict[int, str] = {}
        self.controls: Dict[str, str] = {
            "SS04": "+11.0",
            "SS01": "30000",   # LV4
            "NL0": "000",
            "RL0": "04",
            "MG": "050", "PL": "050", "AO": "050", "VG": "050", "VD": "05",
            "ML1": "020", "KS": "020", "KP": "040", "SD": "05",
            "SS03": "0",
            "DA": "00101005",  # P1 fixo 00, contraste 10, brilho 10, LED 05 (p. 9)
        }
        # valores de menu mais realistas para o que a interface usa
        self.menu["030604"] = "0"   # CH STEP 1 kHz
        self.menu["030605"] = "1"   # AM CH STEP 5 kHz
        self.menu["030606"] = "3"   # FM CH STEP 12.5 kHz
        self.menu["030202"] = "1"   # BAND STACK ON
        self._rx = b""
        self._pending = b""
        self._lock = threading.Lock()
        self._seed_memories()

    def _seed_memories(self):
        seed = [(1, 7_074_000, "C", "FT8 40m"), (2, 14_074_000, "C", "FT8 20m"),
                (3, 145_000_000, "4", "SIMPLEX"), (5, 146_610_000, "4", "RPT PR")]
        for n, hz, mode, tag in seed:
            self.memories[n] = C.Info(f"{n:05d}", hz, 0, False, False, mode, "1", "0",
                                      "2" if n == 5 else "0")
            self.tags[n] = tag

    # -- interface tipo Serial ------------------------------------------------
    @property
    def in_waiting(self) -> int:
        return len(self._rx)

    def write(self, data: bytes) -> int:
        with self._lock:
            self.sent.extend(c for c in data.decode("ascii").split(";") if c)
            self._pending += data
            while b";" in self._pending:
                cmd, self._pending = self._pending.split(b";", 1)
                reply = self._handle(cmd.decode("ascii"))
                if reply and not self.silent:
                    self._rx += self.prepend + reply.encode("ascii")
                    self.prepend = b""
        return len(data)

    def read(self, n: int = 1) -> bytes:
        with self._lock:
            out, self._rx = self._rx[:n], self._rx[n:]
        return out

    def reset_input_buffer(self) -> None:
        with self._lock:
            self._rx = b""

    def close(self) -> None:
        self.is_open = False

    # -- "operador" mexendo no rádio (gera quadros AI) --------------------------
    def emit(self, frame: str) -> None:
        with self._lock:
            if not self.silent:
                self._rx += frame.encode("ascii")

    def _emit_ai(self, frame: str) -> None:
        if self.ai:
            self.emit(frame)

    def turn_dial(self, hz: int) -> None:
        self.frequency = hz
        self._emit_ai(self._fa())
        self._emit_ai(self._if())

    def change_mode(self, mode: str) -> None:
        self.mode = mode
        self._emit_ai(f"MD0{self.mode};")
        self._emit_ai(self._if())

    def set_tx(self, on: bool) -> None:
        self.tx = "1" if on else "0"
        self._emit_ai(self._ri())

    def set_smeter(self, value: int) -> None:
        self.smeter = value
        self._emit_ai(f"RM1{value:03d}000;")

    # -- quadros ---------------------------------------------------------------
    def _fa(self) -> str:
        return f"FA{self.frequency:09d};"

    def _if(self) -> str:
        ch = f"{self.channel:05d}" if self.vfo_mem == "1" else "00000"
        return C.Info(ch, self.frequency, 0, False, False, self.mode, self.vfo_mem,
                      "0", "0").encode("IF")

    def _ri(self) -> str:
        # RI0 + P2 hi-SWR, P3 gravação, P4 TX, P5 fixo, P6 tuner, P7 scan, P8 busy (p. 22)
        return f"RI0{int(self.hi_swr)}0{self.tx}000{int(self.busy)};"

    # -- comportamento do rádio ----------------------------------------------
    def _handle(self, cmd: str) -> Optional[str]:            # noqa: C901 - um case por comando
        if cmd == "ID":
            return f"ID{self.radio_id};"
        m = re.fullmatch(r"VE(\d)", cmd)
        if m:
            fw = self.firmwares.get(m.group(1))
            return f"VE{m.group(1)}{fw};" if fw else "?;"
        if cmd == "AI":
            return f"AI{int(self.ai)};"
        m = re.fullmatch(r"AI([01])", cmd)
        if m:
            self.ai = m.group(1) == "1"
            return None
        if cmd == "IF":
            return self._if()
        if cmd == "RI0":
            return self._ri()
        if cmd == "SM0":
            return f"SM0{self.smeter:03d};"
        m = re.fullmatch(r"RM([1-8])", cmd)
        if m:
            which = m.group(1)
            value = self.smeter if which in ("1", "2") else self.meters[which]
            return f"RM{which}{value:03d}000;"
        if cmd == "FA":
            return self._fa()
        m = re.fullmatch(r"FA(\d{9})", cmd)
        if m:
            hz = int(m.group(1))
            if not C.in_rx_range(hz):
                return "?;"
            self.frequency = hz
            self.vfo_mem = "0"
            return None
        if cmd == "MD0":
            return f"MD0{self.mode};"
        m = re.fullmatch(r"MD0([0-9A-Z])", cmd)
        if m:
            if m.group(1) not in C.MODE_BY_CODE:
                return "?;"
            self.mode = m.group(1)
            return None
        m = re.fullmatch(r"BS0(\d{2})", cmd)
        if m:
            if m.group(1) not in BAND_STACK:
                return "?;"
            self.frequency, self.mode = BAND_STACK[m.group(1)]
            return None
        if cmd == "PC":
            return f"PC{self.head}{self.watts:03d};"
        m = re.fullmatch(r"PC([12])(\d{3})", cmd)
        if m:
            head, watts = m.group(1), int(m.group(2))
            lo, hi = C.PC_HEAD_RANGE[head]
            if head != self.head or not lo <= watts <= hi:
                return "?;"
            self.watts = watts
            return None
        # -- memórias --------------------------------------------------------
        m = re.fullmatch(r"MR(\d{5})", cmd)
        if m:
            info = self.memories.get(int(m.group(1)))
            return info.encode("MR") if info else "?;"
        m = re.fullmatch(r"MW(\d{5})(.{22})", cmd)
        if m:
            try:
                info = C.parse_info(f"MW{m.group(1)}{m.group(2)};")
            except ValueError:
                return "?;"
            n = int(info.channel)
            if not C.MEMORY_MIN <= n <= C.MEMORY_MAX or info.mode not in C.MODE_BY_CODE:
                return "?;"
            self.memories[n] = info
            return None
        m = re.fullmatch(r"MT(\d{5})", cmd)
        if m:
            n = int(m.group(1))
            if n not in self.memories:
                return "?;"
            return f"MT{n:05d}{self.tags.get(n, '').ljust(C.TAG_LEN)};"
        m = re.fullmatch(r"MT(\d{5})(.{1,12})", cmd)
        if m:
            n = int(m.group(1))
            if n not in self.memories:
                return "?;"
            self.tags[n] = m.group(2).rstrip()
            return None
        if cmd == "MC":
            return f"MC0{self.channel:05d};"
        m = re.fullmatch(r"MC0(\d{5})", cmd)
        if m:
            n = int(m.group(1))
            if n not in self.memories:
                return "?;"
            self.channel = n
            if self.vfo_mem == "1":
                self.frequency, self.mode = self.memories[n].frequency, self.memories[n].mode
            return None
        if cmd == "VM0":
            return f"VM0{'11' if self.vfo_mem == '1' else '00'};"
        m = re.fullmatch(r"VM0(\d{2})", cmd)
        if m:
            self.vfo_mem = "1" if m.group(1) == "11" else "0"
            if self.vfo_mem == "1" and self.channel in self.memories:
                info = self.memories[self.channel]
                self.frequency, self.mode = info.frequency, info.mode
            return None
        # -- menu --------------------------------------------------------------
        m = re.fullmatch(r"EX(\d{6})(.*)", cmd)
        if m:
            key, value = m.groups()
            if key not in BY_KEY:
                return "?;"
            if value:
                item = BY_KEY[key]
                if not item.writable:
                    return "?;"
                try:
                    self.menu[key] = item.encode(item.decode(value))
                except ValueError:
                    return "?;"
                return None
            return f"EX{key}{self.menu[key]};"
        # -- controles: leitura = prefixo exato; escrita = prefixo + payload ---
        for prefix in sorted(self.controls, key=len, reverse=True):
            if cmd == prefix:
                return f"{prefix}{self.controls[prefix]};"
            if cmd.startswith(prefix) and len(cmd) > len(prefix):
                self.controls[prefix] = cmd[len(prefix):]
                return None
        return "?;"
