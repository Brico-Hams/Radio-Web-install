# -*- coding: utf-8 -*-
"""
Camada serial CAT: envia comandos e lê respostas do FTX-1.

Funciona com qualquer objeto "tipo pyserial.Serial" (write/read/in_waiting/
reset_input_buffer). Isso permite usar o simulador (`ftx1cat.cat.simulator`)
nos testes e no modo `--simulate` da interface.

Quadros espontâneos (Auto Information, `AI1;`, p. 6 do manual CAT): quando o
rádio avisa por conta própria que algo mudou, o quadro chega fora de uma
leitura. Em vez de descartá-lo, `Radio` o entrega a `on_frame(frame)`. O
chamador (a interface) deve chamar `pump()` periodicamente enquanto não há
comandos em andamento para recolher esses quadros.
"""

import logging
import threading
import time
from typing import Callable, List, Optional

from . import commands as C
from .menu import Item

log = logging.getLogger(__name__)

Logger = Callable[[str, str], None]   # (direção "TX"/"RX", texto)


class CatError(Exception):
    """Falha de comunicação: o rádio não respondeu no tempo esperado."""


class CatRejected(CatError):
    """O rádio respondeu '?;' — comando desconhecido, parâmetro inválido ou
    estado que não permite o comando (ex.: item de menu inexistente)."""


class Radio:
    """Fala com o rádio por qualquer objeto tipo pyserial.Serial.

    Todo comando termina em ';'. A resposta de leitura repete o comando
    (ex.: 'EX010101+05;'). Quadros que não começam com o prefixo esperado
    (por exemplo, informação automática) vão para `on_frame`. '?;' é erro.
    """

    def __init__(self, ser, timeout: float = 0.8, gap: float = 0.02,
                 logger: Optional[Logger] = None,
                 on_frame: Optional[Callable[[str], None]] = None):
        self.ser = ser
        self.timeout = timeout
        self.gap = gap
        self.logger = logger
        self.on_frame = on_frame
        self.quiet = False          # True suprime o logger (ex.: leitura periódica)
        self.auto_information = False
        self.buf = b""
        self.lock = threading.RLock()

    # -- baixo nível ---------------------------------------------------------
    def _log(self, direction: str, text: str) -> None:
        log.debug("%s %s", direction, text)
        if self.logger and not self.quiet:
            self.logger(direction, text)

    def _write(self, cmd: str) -> None:
        self._log("TX", cmd)
        self.ser.write(cmd.encode("ascii"))

    def _next_frame(self, deadline: float) -> Optional[str]:
        while True:
            i = self.buf.find(b";")
            if i >= 0:
                frame, self.buf = self.buf[:i + 1], self.buf[i + 1:]
                return frame.decode("ascii", "replace")
            n = getattr(self.ser, "in_waiting", 0) or 1
            chunk = self.ser.read(n)
            if chunk:
                self.buf += chunk
                continue
            if time.monotonic() >= deadline:
                return None
            time.sleep(0.005)

    def _unsolicited(self, frame: str) -> None:
        self._log("RX", frame)
        if self.on_frame:
            try:
                self.on_frame(frame)
            except Exception:       # noqa: BLE001 - um handler ruim não derruba a serial
                log.exception("on_frame failed for %r", frame)

    def _drain(self) -> None:
        """Entrega a `on_frame` tudo que já chegou sem bloquear."""
        while True:
            frame = self._next_frame(0)
            if frame is None:
                return
            self._unsolicited(frame)

    def pump(self) -> None:
        """Recolhe quadros espontâneos (AI). Chamar quando a serial está ociosa."""
        with self.lock:
            self._drain()

    def query(self, cmd: str, prefix: str) -> str:
        """Envia `cmd` e espera um quadro que comece com `prefix`."""
        with self.lock:
            self._drain()
            self._write(cmd)
            deadline = time.monotonic() + self.timeout
            while True:
                frame = self._next_frame(deadline)
                if frame is None:
                    raise CatError(f"no response to {cmd}")
                if frame == "?;":
                    self._log("RX", frame)
                    raise CatRejected(f"radio rejected {cmd}")
                if frame.startswith(prefix):
                    self._log("RX", frame)
                    return frame
                self._unsolicited(frame)

    def send(self, cmd: str) -> None:
        """Envia um comando de escrita (que normalmente não tem resposta).

        Espera `gap` segundos olhando a porta: se o rádio responder '?;' nesse
        intervalo, o comando foi recusado e levantamos CatRejected — em vez de
        a recusa ser descartada silenciosamente pela próxima leitura.
        """
        with self.lock:
            self._drain()
            self._write(cmd)
            deadline = time.monotonic() + self.gap
            while True:
                frame = self._next_frame(deadline)
                if frame is None:
                    return
                if frame == "?;":
                    self._log("RX", frame)
                    raise CatRejected(f"radio rejected {cmd}")
                self._unsolicited(frame)

    def close(self) -> None:
        try:
            self.ser.close()
        except Exception:   # noqa: BLE001 - fechar nunca deve derrubar o app
            pass

    # -- menu (EX) ---------------------------------------------------------
    def read_menu(self, item: Item) -> str:
        frame = self.query(f"EX{item.key};", f"EX{item.key}")
        return frame[len("EX") + 6:-1]

    def write_menu(self, item: Item, raw: str) -> str:
        """Grava e devolve o valor relido (CatError se não houver resposta)."""
        self.send(f"EX{item.key}{raw};")
        return self.read_menu(item)

    # -- identificação -----------------------------------------------------
    def identify(self) -> str:
        """ID; -> '0840' (valor fixo segundo o manual)."""
        return C.parse_id(self.query(C.id_cmd(), "ID"))

    def firmware(self, which: int = 0) -> str:
        """VE<n>; -> versão (0 = MAIN CPU)."""
        return C.parse_firmware(self.query(C.firmware_cmd(which), f"VE{which}"))

    def firmwares(self) -> List[tuple]:
        """Versões de todos os CPUs (p. 26); opcionais ausentes são omitidos."""
        names = ["MAIN", "DISPLAY", "SDR", "DSP", "SPA-1", "FC-80"]
        out = []
        for n, name in enumerate(names):
            try:
                fw = self.firmware(n)
            except CatError:
                continue
            if fw.strip("0 -"):
                out.append((name, fw))
        return out

    # -- auto information ----------------------------------------------------
    def set_auto_information(self, on: bool) -> bool:
        """Liga/desliga o AI e confirma lendo de volta. False se o rádio não aceitou."""
        try:
            self.send(C.auto_information_cmd(on))
            frame = self.query("AI;", "AI")
        except CatError:
            self.auto_information = False
            return False
        self.auto_information = frame[2] == "1"
        return self.auto_information == on

    # -- sintonia ------------------------------------------------------------
    def read_frequency(self) -> int:
        return C.parse_frequency(self.query(C.read_frequency_cmd(), "FA"))

    def set_frequency(self, hz: int) -> int:
        """Sintoniza e devolve a frequência que o rádio aceitou."""
        self.send(C.set_frequency_cmd(hz))
        return self.read_frequency()

    def read_mode(self) -> str:
        return C.parse_mode(self.query(C.read_mode_cmd(), "MD0"))

    def set_mode(self, code: str) -> str:
        self.send(C.set_mode_cmd(code))
        return self.read_mode()

    def select_band(self, code: str) -> None:
        self.send(C.select_band_cmd(code))

    def read_info(self) -> C.Info:
        """IF; — frequência, modo, VFO/memória, clarifier, SQL e shift num quadro só."""
        return C.parse_info(self.query(C.read_info_cmd(), "IF"))

    def read_tuning(self):
        """Devolve (frequência, modo, item CH STEP, código do passo, passo em kHz, Info)."""
        info = self.read_info()
        item = C.ch_step_item_for_mode(info.mode)
        step_raw = self.read_menu(item)
        return info.frequency, info.mode, item, step_raw, C.ch_step_khz(item, step_raw), info

    # -- estado e medidores --------------------------------------------------
    def read_status(self) -> C.RadioStatus:
        return C.parse_status(self.query(C.read_status_cmd(), "RI0"))

    def read_smeter(self) -> int:
        return C.parse_smeter(self.query(C.read_smeter_cmd(), "SM0"))

    def read_meter(self, which: str) -> int:
        return C.parse_meter(self.query(C.read_meter_cmd(which), f"RM{which}"))[1]

    # -- controles -----------------------------------------------------------
    def read_control(self, ctl: C.Control) -> float:
        return ctl.value_from_frame(self.query(ctl.read_cmd, ctl.prefix))

    def set_control(self, ctl: C.Control, value: float) -> float:
        """Grava o controle e devolve o valor relido."""
        if ctl.da_slot is not None:
            cmd = C.da_set_cmd(self.query("DA;", "DA"), ctl.da_slot, int(value))
        elif ctl.encode is not None:
            cmd = ctl.encode(value)
        else:
            raise ValueError(f"{ctl.title} is read-only")
        self.send(cmd)
        return self.read_control(ctl)

    def read_rf_power(self):
        """-> (head '1'|'2', watts)."""
        return C.parse_pc(self.query("PC;", "PC"))

    def set_rf_power(self, head: str, watts: int):
        self.send(C.set_rf_power_cmd(head, watts))
        return self.read_rf_power()

    # -- memórias ------------------------------------------------------------
    def read_memory(self, n: int) -> Optional[C.Info]:
        """Canal n, ou None se estiver vazio (o rádio responde '?;')."""
        try:
            return C.parse_info(self.query(C.read_memory_cmd(n), "MR"))
        except CatRejected:
            return None

    def read_tag(self, n: int) -> str:
        try:
            return C.parse_tag(self.query(C.read_tag_cmd(n), "MT"))[1]
        except CatRejected:
            return ""

    def write_memory(self, info: C.Info, tag: Optional[str] = None) -> C.Info:
        """Grava o canal (e a etiqueta, se dada) e relê para confirmar."""
        self.send(C.write_memory_cmd(info))
        if tag is not None:
            self.send(C.write_tag_cmd(int(info.channel), tag))
        back = self.read_memory(int(info.channel))
        if back is None:
            raise CatError(f"memory {info.channel} not stored")
        return back

    def recall_memory(self, n: int) -> None:
        """Entra em modo memória no canal n."""
        self.send(C.vfo_memory_cmd(True))
        self.send(C.select_channel_cmd(n))
