# -*- coding: utf-8 -*-
"""
Janela principal: conexão com o rádio, abas (Quick Controls / CAT Menu),
log e execução de trabalhos em segundo plano.
"""

import datetime
import logging
import queue
import time
import tkinter as tk
from tkinter import messagebox, ttk
from typing import Callable, Optional

import serial
from serial.tools import list_ports

from .. import __app_name__, __version__
from ..cat import CatError, Radio
from ..cat import commands as C
from .memory_page import MemoryPage
from .menu_page import MenuPage
from .quick_controls import QuickControlsPage
from .settings import Settings
from .status_bar import StatusBar
from .theme import AMBER, BAUDS, GRAY, GREEN, RED, SEP
from .worker import SerialWorker

log = logging.getLogger(__name__)

TICK_MS = 250           # ciclo de estado: recolhe quadros AI, lê RI e medidores
POLL_MS = 600           # sem AI: leitura periódica da sintonia (IF;)
SIMULATOR_PORT = "SIM"  # nome mostrado no combo de portas em --simulate


class App(tk.Tk):
    def __init__(self, settings: Optional[Settings] = None, simulate: bool = False,
                 port: Optional[str] = None, baud: Optional[str] = None):
        super().__init__()
        self.version = __version__
        self.settings = settings or Settings()
        self.simulate = simulate
        self.title(f"{__app_name__} - v{__version__}" + ("  [SIMULATOR]" if simulate else ""))
        self.geometry(self.settings.get("geometry") or "1280x760")
        self.minsize(980, 560)

        self.radio: Optional[Radio] = None
        self.fw = ""
        self.q: "queue.Queue[Callable[[], None]]" = queue.Queue()
        self.worker = SerialWorker(self.ui, self._on_idle_change)
        self._tick_id = None
        self._last_info_poll = 0.0
        self.transmitting = False

        self._build_ui()
        found = self.refresh_ports()
        if port:
            self.port_var.set(port)
        if baud:
            self.baud_var.set(baud)
        self._pump_id = self.after(40, self._pump)
        self.protocol("WM_DELETE_WINDOW", self._close)
        if simulate:
            self.log("Simulator mode: no radio needed. Click Connect.")
        elif found:
            self.log("Ready. CAT-1 (Enhanced COM Port) selected automatically; click Connect.")
        else:
            self.log("Ready. CAT-1 port was not found automatically. Select it and click Connect.")

    # ======================================================================
    # Fila de atualizações da interface (threads -> Tk)
    # ======================================================================
    def ui(self, fn: Callable[[], None]) -> None:
        self.q.put(fn)

    def _pump(self):
        try:
            while True:
                self.q.get_nowait()()
        except queue.Empty:
            pass
        except tk.TclError:
            pass                      # janela fechando
        self._pump_id = self.after(40, self._pump)

    # ======================================================================
    # Construção da janela
    # ======================================================================
    def _build_ui(self):
        top = ttk.Frame(self, padding=6)
        top.pack(fill="x")
        ttk.Label(top, text="Port:").pack(side="left")
        self.port_var = tk.StringVar()
        self.port_cb = ttk.Combobox(top, textvariable=self.port_var, width=46)
        self.port_cb.pack(side="left", padx=4)
        ttk.Button(top, text="↻", width=3, command=self.refresh_ports).pack(side="left")
        ttk.Label(top, text="Baud rate:").pack(side="left", padx=(10, 2))
        self.baud_var = tk.StringVar(value=str(self.settings.get("baud") or "38400"))
        ttk.Combobox(top, textvariable=self.baud_var, values=BAUDS, width=8,
                     state="readonly").pack(side="left")
        self.btn_conn = ttk.Button(top, text="Connect", command=self.toggle_connect)
        self.btn_conn.pack(side="left", padx=10)
        self.conn_lbl = ttk.Label(top, text="Disconnected", foreground=GRAY)
        self.conn_lbl.pack(side="left")
        self.btn_stop = ttk.Button(top, text="Stop", command=self.stop_jobs, state="disabled")
        self.btn_stop.pack(side="right")
        self.prog_lbl = ttk.Label(top, text="", foreground=GRAY)
        self.prog_lbl.pack(side="right", padx=10)

        self.status = StatusBar(self)
        self.status.pack(fill="x", padx=6)

        # Abas em cima, log embaixo, com divisor arrastável entre os dois.
        split = ttk.PanedWindow(self, orient="vertical")
        split.pack(fill="both", expand=True, padx=6)
        self.pages = ttk.Notebook(split)
        split.add(self.pages, weight=1)
        self.quick = QuickControlsPage(self.pages, self)
        self.pages.add(self.quick, text="Quick Controls")
        self.menu = MenuPage(self.pages, self)
        self.pages.add(self.menu, text="CAT Menu")
        self.memories = MemoryPage(self.pages, self)
        self.pages.add(self.memories, text="Memories")
        self.pages.select(self.quick)

        logf = ttk.Frame(split, padding=(0, 4, 0, 6))
        split.add(logf, weight=0)
        head = ttk.Frame(logf)
        head.pack(fill="x")
        ttk.Label(head, text="Log").pack(side="left")
        self.cat_var = tk.BooleanVar(value=bool(self.settings.get("show_cat_commands")))
        # Cópia simples do valor: o logger da serial roda em outra thread e não
        # pode ler variáveis Tk.
        self._show_cat = bool(self.cat_var.get())
        self.cat_var.trace_add("write", lambda *_: setattr(self, "_show_cat", bool(self.cat_var.get())))
        ttk.Checkbutton(head, text="Show commands (TX/RX)", variable=self.cat_var).pack(
            side="left", padx=10)
        ttk.Button(head, text="Clear", width=6, command=self.clear_log).pack(side="right")
        ttk.Button(head, text="Copy", width=6, command=self.copy_log).pack(side="right", padx=4)
        self.logbox = tk.Text(logf, height=6, wrap="none", state="disabled")
        self.logbox.pack(fill="both", expand=True)

        func = self.settings.get("func_parameter")
        if func:
            self.quick.select_func(func)

    # ======================================================================
    # Log
    # ======================================================================
    def log(self, msg: str):
        log.info(msg)
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        self.logbox.config(state="normal")
        self.logbox.insert("end", f"{ts}  {msg}\n")
        if int(self.logbox.index("end-1c").split(".")[0]) > 1500:
            self.logbox.delete("1.0", "300.0")
        self.logbox.see("end")
        self.logbox.config(state="disabled")

    def _cat_log(self, direction: str, text: str):        # chamado da thread serial
        if self._show_cat:
            self.ui(lambda: self._log_raw(f"{direction}  {text}"))

    def _log_raw(self, line: str):
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        self.logbox.config(state="normal")
        self.logbox.insert("end", f"{ts}  {line}\n")
        self.logbox.see("end")
        self.logbox.config(state="disabled")

    def clear_log(self):
        self.logbox.config(state="normal")
        self.logbox.delete("1.0", "end")
        self.logbox.config(state="disabled")

    def copy_log(self):
        self.clipboard_clear()
        self.clipboard_append(self.logbox.get("1.0", "end-1c"))
        self.log("Log copied to clipboard.")

    def progress(self, i: int, n: int, what: str = ""):
        self.ui(lambda: self.prog_lbl.config(text=f"{what} {i}/{n}" if n else ""))

    # ======================================================================
    # Conexão
    # ======================================================================
    def refresh_ports(self) -> bool:
        if self.simulate:
            self.port_cb.config(values=[SIMULATOR_PORT])
            self.port_var.set(SIMULATOR_PORT)
            return True
        detected = list(list_ports.comports())
        ports = [f"{p.device}{SEP}{p.description}" for p in detected]
        self.port_cb.config(values=ports)
        # O CP2105 expõe mais de uma interface. Para CAT, usar a Enhanced COM Port.
        enhanced = [p for p in detected
                    if "cp2105" in (p.description or "").casefold()
                    and "enhanced" in (p.description or "").casefold()]
        remembered = self.settings.get("port")
        if enhanced:
            p = enhanced[0]
            self.port_var.set(f"{p.device}{SEP}{p.description}")
            return True
        if remembered and any(x.startswith(remembered + SEP) or x == remembered for x in ports):
            self.port_var.set(next(x for x in ports if x.startswith(remembered)))
            return True
        if ports and not self.port_var.get():
            self.port_var.set(ports[0])
        return False

    def toggle_connect(self):
        if self.radio:
            self.disconnect()
        else:
            self.connect()

    def _open_port(self):
        if self.simulate:
            from ..cat.simulator import FakeFTX1
            return FakeFTX1()
        port = self.port_var.get().split(SEP)[0].strip()
        if not port:
            raise ValueError("Select the FTX-1 serial port.")
        ser = serial.Serial()
        ser.port = port
        ser.baudrate = int(self.baud_var.get())
        ser.bytesize = 8
        ser.parity = "N"
        ser.stopbits = 1
        ser.timeout = 0.05
        ser.write_timeout = 1
        # DTR/RTS desligados antes de abrir: o manual avisa que, se RPTT SELECT
        # estiver em RTS/DTR, essas linhas comandam o PTT.
        ser.dtr = False
        ser.rts = False
        ser.open()
        return ser

    def connect(self):
        try:
            ser = self._open_port()
        except (serial.SerialException, ValueError, OSError) as e:
            messagebox.showerror("Port Open Error", str(e))
            return
        port = self.port_var.get().split(SEP)[0].strip()
        self.settings.set("port", port)
        self.settings.set("baud", self.baud_var.get())
        self.radio = Radio(ser, logger=self._cat_log, on_frame=self._frame_from_radio)
        self.btn_conn.config(text="Disconnect")
        self.conn_lbl.config(text="Connecting…", foreground=AMBER)
        self.log(f"Port {port} opened at {self.baud_var.get()} bps, 8N1.")

        def job(radio):
            rid = radio.identify()
            fws = radio.firmwares()
            ai = radio.set_auto_information(True)
            return rid, fws, ai

        def then(result):
            rid, fws, ai = result
            self.fw = dict(fws).get("MAIN", "")
            self.conn_lbl.config(text=f"Connected • ID {rid} • MAIN FW {self.fw}", foreground=GREEN)
            versions = ", ".join(f"{name} {fw}" for name, fw in fws)
            self.log(f"Radio responded: ID {rid}. Firmware: {versions}.")
            self.status.set_live(ai)
            if ai:
                self.log("Auto Information on: the radio reports changes by itself.")
            else:
                self.log("Auto Information not accepted; falling back to periodic reads.")
            self.quick.on_connected()
            self.menu.on_connected()
            self.memories.on_connected()
            self._schedule_tick()

        def on_error(exc):
            self.conn_lbl.config(text="No response from radio", foreground=RED)
            self.log("No response to ID;. Check the CAT-1 (Enhanced COM Port), match the baud "
                     "rate to CAT-1 RATE (38400 by default), and use MAIN firmware 1.08 or later.")
            log.warning("identify failed: %s", exc)

        self.run(job, "Identify radio", then, on_error=on_error, quiet=True)

    def disconnect(self):
        self.worker.stop()
        self._cancel_tick()
        radio, self.radio = self.radio, None
        if radio:
            if radio.auto_information:
                try:
                    radio.quiet = True
                    radio.send(C.auto_information_cmd(False))   # best effort, 20 ms
                except Exception:   # noqa: BLE001 - porta pode já estar morta
                    pass
            radio.close()
        self.btn_conn.config(text="Connect")
        self.conn_lbl.config(text="Disconnected", foreground=GRAY)
        self.prog_lbl.config(text="")
        self.transmitting = False
        self.status.clear()
        self.quick.on_disconnected()
        self.menu.on_disconnected()
        self.memories.on_disconnected()
        self.log("Disconnected.")

    def need_conn(self) -> bool:
        if not self.radio:
            messagebox.showinfo("Connection", "Connect to the radio first.")
            return False
        return True

    # ======================================================================
    # Execução em segundo plano
    # ======================================================================
    def run(self, fn, title="", then=None, key=None, quiet=False, on_error=None):
        """Agenda `fn(radio)` na thread serial. Devolve o Job ou None se não
        houver rádio conectado. `then(result)` roda na thread Tk, só se o
        rádio ainda for o mesmo (não houve disconnect no meio)."""
        radio = self.radio
        if radio is None:
            return None
        if not quiet:
            self.log(f"{title}…")

        def _then(result):
            if radio is not self.radio:
                return
            self.prog_lbl.config(text="")
            if not quiet:
                self.log(f"{title}: complete.")
            if then:
                then(result)

        def _error(exc):
            if radio is not self.radio:
                return
            self.prog_lbl.config(text="")
            if isinstance(exc, CatError):
                self.log(f"{title}: {exc}")
            else:
                self.log(f"{title}: error: {exc}")
                log.exception("job %s failed", title)
            if on_error:
                on_error(exc)

        return self.worker.submit(lambda: fn(radio), _then, _error, title=title, key=key)

    def stop_jobs(self):
        self.worker.stop()
        self.log("Stop requested.")

    def _on_idle_change(self, idle: bool):
        try:
            self.btn_stop.config(state="disabled" if idle else "normal")
            if idle:
                self.prog_lbl.config(text="")
        except tk.TclError:
            pass

    # ======================================================================
    # Quadros espontâneos (Auto Information) e ciclo de estado
    # ======================================================================
    def _frame_from_radio(self, frame: str):          # chamado da thread serial
        self.ui(lambda: self._handle_frame(frame))

    def _handle_frame(self, frame: str):
        """Despacha um quadro que o rádio mandou por conta própria."""
        try:
            if frame.startswith("IF"):
                self.quick.on_info(C.parse_info(frame))
            elif frame.startswith("FA"):
                self.quick.on_frequency_polled(C.parse_frequency(frame))
            elif frame.startswith("MD0"):
                self.quick.on_mode(C.parse_mode(frame))
            elif frame.startswith("RI0"):
                self._show_status(C.parse_status(frame))
            elif frame.startswith("RM"):
                self.status.show_meter(*C.parse_meter(frame))
            elif frame.startswith("SM0"):
                self.status.show_smeter(C.parse_smeter(frame))
            elif frame.startswith("PC"):
                self.quick.on_rf_power(*C.parse_pc(frame))
        except (ValueError, IndexError) as exc:
            log.debug("ignored frame %r: %s", frame, exc)

    def _show_status(self, st: C.RadioStatus):
        was_tx = self.transmitting
        self.transmitting = st.transmitting
        self.status.show_status(st)
        if was_tx != self.transmitting:
            self.status.transmitting(self.transmitting)

    def _schedule_tick(self):
        self._cancel_tick()
        if self.radio:
            self._tick_id = self.after(TICK_MS, self._tick)

    def _cancel_tick(self):
        if self._tick_id is not None:
            self.after_cancel(self._tick_id)
            self._tick_id = None

    def _tick(self):
        """A cada TICK_MS, com a serial ociosa: recolhe quadros AI, lê o estado
        (RI) e os medidores; sem AI, lê também a sintonia (IF) a cada POLL_MS."""
        self._tick_id = None
        if not self.radio:
            return
        if not self.worker.is_idle():          # não compete com operações do usuário
            self._schedule_tick()
            return
        now = time.monotonic()
        want_info = (not self.radio.auto_information) and (now - self._last_info_poll) * 1000 >= POLL_MS
        def job(radio):
            radio.quiet = True                 # não polui o log a cada 250 ms
            try:
                radio.pump()
                st = radio.read_status()
                meters = {}
                if st.transmitting:
                    for which in C.TX_METERS:
                        meters[which] = radio.read_meter(which)
                else:
                    meters["1"] = radio.read_smeter()
                info = radio.read_info() if want_info else None
                return st, meters, info
            finally:
                radio.quiet = False

        def then(result):
            st, meters, info = result
            self._show_status(st)
            for which, raw in meters.items():
                self.status.show_meter(which, raw)
            if info is not None:
                self._last_info_poll = now
                self.quick.on_info(info)
            self._schedule_tick()

        self.run(job, "Status tick", then, key="tick", quiet=True,
                 on_error=lambda _e: self._schedule_tick())

    # ======================================================================
    # Encerramento
    # ======================================================================
    def _close(self):
        try:
            self.settings.set("geometry", self.geometry().split("+")[0])
            self.settings.set("show_cat_commands", bool(self.cat_var.get()))
            self.menu.save_settings()
            self.settings.save()
        except Exception:     # noqa: BLE001 - salvar config nunca impede fechar
            log.exception("could not save settings")
        self.disconnect()
        if self._pump_id is not None:
            self.after_cancel(self._pump_id)
            self._pump_id = None
        self.destroy()
