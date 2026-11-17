# -*- coding: utf-8 -*-
"""
Aba "Quick Controls": sintonia (frequência, dial, CH-STEP, bandas, modos),
sliders dos controles rápidos e parâmetros do botão FUNC.

A página não fala com a serial diretamente: monta "jobs" com o objeto Radio e
entrega ao `app.run(...)`, que os executa na thread de fundo e devolve o
resultado na thread Tk.
"""

import threading
import tkinter as tk
from tkinter import messagebox, ttk
from typing import Dict, Optional

from ..cat import commands as C
from .theme import AMBER, FONT_FREQ, FONT_TITLE, FONT_VALUE, FONT_VALUE_SMALL, GRAY, GREEN, RED
from .widgets import FrequencyKnob, ScrollFrame, bind_scale_interactions


# --------------------------------------------------------------------------
# Card com um slider para um Control (RF POWER, NB, ...)
# --------------------------------------------------------------------------
class SliderCard(ttk.LabelFrame):
    def __init__(self, master, ctl: C.Control, on_change, length=420, font=FONT_VALUE,
                 title: Optional[str] = None):
        super().__init__(master, text=title or ctl.title, padding=10)
        self.ctl = ctl
        self.on_change = on_change
        self.from_radio = False
        self.var = tk.DoubleVar(value=ctl.lo)
        self.value_lbl = ttk.Label(self, text="—", font=font)
        self.value_lbl.pack(anchor="center")
        self.scale = tk.Scale(self, variable=self.var, from_=ctl.lo, to=ctl.hi,
                              resolution=ctl.step, orient="horizontal", showvalue=False,
                              length=length, highlightthickness=0, command=self._moved)
        self.scale.pack(fill="x", padx=8)
        bind_scale_interactions(self.scale, lambda _e: self.on_change(self))
        self.status = ttk.Label(self, text="Waiting for read", foreground=GRAY)
        self.status.pack(anchor="w", pady=(5, 0))

    def _moved(self, value):
        if self.from_radio:
            return
        self.value_lbl.config(text=self.ctl.display(float(value)))
        self.on_change(self)

    def value(self) -> float:
        return float(self.var.get())

    def show_radio_value(self, value: float, keep_slider=False):
        """Mostra o valor lido do rádio. `keep_slider` evita "puxar" o slider de
        volta enquanto o usuário ainda está arrastando (há envio pendente)."""
        if not keep_slider:
            self.from_radio = True
            self.var.set(value)
            self.from_radio = False
            self.value_lbl.config(text=self.ctl.display(value))
        self.set_status(f"Radio: {self.ctl.display(value)}", GREEN)

    def set_status(self, text, color=GRAY):
        self.status.config(text=text, foreground=color)

    def set_range(self, lo: float, hi: float):
        self.scale.configure(from_=lo, to=hi)

    def set_title(self, text: str):
        self.configure(text=text)


# --------------------------------------------------------------------------
# Página
# --------------------------------------------------------------------------
class QuickControlsPage(ttk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.scroll = ScrollFrame(self)
        self.scroll.pack(fill="both", expand=True)
        self.body = ttk.Frame(self.scroll.inner, padding=12)
        self.body.pack(fill="both", expand=True)
        self.frequency_hz: Optional[int] = None
        self.mode: Optional[str] = None
        self.ch_step_item = None
        self.ch_step_from_radio = False
        self.pending_ticks = 0
        self._ticks_lock = threading.Lock()
        self.cards: Dict[str, SliderCard] = {}
        self.func_active: Optional[C.Control] = None
        self.func_from_radio = False
        self.pc_head = "2"                 # '1' field head (5-10 W) ou '2' SPA-1 (5-100 W)
        self.step_khz: Optional[float] = None
        self.memory_channel: Optional[str] = None
        self._build()

    # ======================================================================
    # Construção
    # ======================================================================
    def _build(self):
        body = self.body
        body.columnconfigure(0, weight=1)
        body.columnconfigure(1, weight=1)

        heading = ttk.Frame(body)
        heading.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 6))
        ttk.Button(heading, text="Refresh Values", command=self.read_all).pack(side="right", anchor="n")
        tuning = ttk.Frame(heading)
        tuning.pack(side="left", fill="x", expand=True, padx=(0, 10))
        self._build_tuning(tuning)
        self._build_modes(body)

        ttk.Label(body, text="Values are read when you connect. Changes are sent directly to the radio.",
                  foreground=GRAY).grid(row=2, column=0, columnspan=2, sticky="w", pady=(0, 6))

        self.cards["RF POWER"] = SliderCard(body, C.RF_POWER, self._card_changed,
                                            title="RF POWER — SPA-1")
        self.cards["RF POWER"].grid(row=3, column=0, sticky="nsew", padx=(0, 6), pady=4)
        self.cards["D-LEVEL"] = SliderCard(body, C.D_LEVEL, self._card_changed)
        self.cards["D-LEVEL"].grid(row=3, column=1, sticky="nsew", padx=(6, 0), pady=4)
        self.cards["D-PEAK"] = SliderCard(body, C.D_PEAK, self._card_changed)
        self.cards["D-PEAK"].grid(row=4, column=1, sticky="nsew", padx=(6, 0), pady=4)

        noise = ttk.Frame(body)
        noise.grid(row=4, column=0, sticky="ew", padx=(0, 6), pady=4)
        noise.columnconfigure(0, weight=1)
        noise.columnconfigure(1, weight=1)
        self.cards["NB"] = SliderCard(noise, C.NB, self._card_changed, length=180,
                                      font=FONT_VALUE_SMALL)
        self.cards["NB"].grid(row=0, column=0, sticky="ew", padx=(0, 3))
        self.cards["DNR"] = SliderCard(noise, C.DNR, self._card_changed, length=180,
                                       font=FONT_VALUE_SMALL)
        self.cards["DNR"].grid(row=0, column=1, sticky="ew", padx=(3, 0))

        self._build_func(body)

        ttk.Label(body, foreground=GRAY, wraplength=900,
                  text="HOME has no documented CAT command. CH STEP cannot be assigned to the FUNC button.",
                  ).grid(row=6, column=0, columnspan=2, sticky="w", pady=(6, 0))

    def _build_modes(self, body):
        self.mode_var = tk.StringVar()
        modes = ttk.LabelFrame(body, text="Mode", padding=(5, 3))
        modes.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(0, 6))
        cols = 9
        for i, mode in enumerate(C.MODES):
            ttk.Radiobutton(modes, text=mode.name, value=mode.code, variable=self.mode_var,
                            style="Toolbutton", width=9,
                            command=lambda m=mode.code: self.set_mode(m)).grid(
                row=i // cols, column=i % cols, sticky="ew", padx=2, pady=1)
        for col in range(cols):
            modes.columnconfigure(col, weight=1)

    def _build_tuning(self, tuning):
        box = ttk.LabelFrame(tuning, text="MAIN Frequency", padding=(8, 4))
        box.pack(side="left", fill="y", padx=(0, 8))
        self.freq_lbl = ttk.Label(box, text="---.---.--- Hz", font=FONT_FREQ, width=18,
                                  anchor="center", cursor="hand2")
        self.freq_lbl.pack(fill="x")
        self.freq_lbl.bind("<Button-1>", self.open_frequency_dialog)
        self.freq_hint = ttk.Label(box, text="Scroll the dial to tune", foreground=GRAY,
                                   anchor="center")
        self.freq_hint.pack(fill="x")

        self.knob = FrequencyKnob(tuning, self._knob_ticks)
        self.knob.pack(side="left", padx=(0, 8))

        # CH-STEP vertical
        self.ch_step_var = tk.IntVar(value=0)
        frame = ttk.Frame(tuning, width=76, height=96)
        frame.pack(side="left", padx=(0, 8))
        frame.pack_propagate(False)
        ttk.Label(frame, text="CH-STEP", font=("TkDefaultFont", 8), anchor="center").pack(
            fill="x", pady=(1, 0))
        self.ch_step_scale = tk.Scale(frame, variable=self.ch_step_var, from_=0, to=1,
                                      resolution=1, orient="vertical", showvalue=False,
                                      length=48, width=12, sliderlength=13,
                                      highlightthickness=0, bd=0, command=self._ch_step_moved)
        self.ch_step_scale.pack(fill="y", expand=True, anchor="center")
        self.ch_step_value = ttk.Label(frame, text="—", width=9, font=("TkDefaultFont", 7),
                                       anchor="center")
        self.ch_step_value.pack(fill="x", pady=(0, 1))
        bind_scale_interactions(self.ch_step_scale, lambda _e: self._send_ch_step())

        bands = ttk.LabelFrame(tuning, text="MAIN Bands", padding=(4, 3))
        bands.pack(side="left", fill="both", expand=True, padx=(0, 6))
        for i, band in enumerate(C.BANDS):
            ttk.Button(bands, text=band.label, width=6,
                       command=lambda code=band.code: self.select_band(code)).grid(
                row=i // 8, column=i % 8, sticky="ew", padx=1, pady=1)
        for col in range(8):
            bands.columnconfigure(col, weight=1)


    def _build_func(self, parent):
        self.func_var = tk.StringVar(value="")
        card = ttk.LabelFrame(parent, text="Radio Parameter Controls", padding=8)
        card.grid(row=5, column=0, columnspan=2, sticky="ew", pady=(6, 0))
        ttk.Label(card, text="Select a parameter to adjust. This does not change the function "
                             "assigned to the radio's FUNC button.",
                  foreground=GRAY, wraplength=1100).grid(row=0, column=0, columnspan=3,
                                                        sticky="w", padx=8, pady=(0, 6))
        buttons = ttk.Frame(card)
        buttons.grid(row=1, column=0, sticky="nw", padx=(0, 16))
        adjust = ttk.LabelFrame(card, text="Selected Parameter", padding=8)
        adjust.grid(row=1, column=1, sticky="nsew")
        donation = ("Designed by Everton PR2EM and generated by AI.\n\n"
                    "Enjoying the software? Consider making a donation via PayPal to "
                    "everton.machado@gmail.com.\n\nThank you! 73!")
        ttk.Label(card, text=donation, wraplength=280, justify="left", anchor="center").grid(
            row=1, column=2, sticky="nsew", padx=(16, 8), pady=8)
        card.columnconfigure(0, weight=3)
        card.columnconfigure(1, weight=2)
        card.columnconfigure(2, weight=2)
        for i, (code, label) in enumerate(C.FUNC_BUTTONS):
            ttk.Radiobutton(buttons, text=label, value=code, variable=self.func_var,
                            command=lambda c=code: self.select_func(c)).grid(
                row=i // 4, column=i % 4, sticky="w", padx=8, pady=3)
        self.func_title = ttk.Label(adjust, text="Select a parameter", anchor="center",
                                    font=FONT_TITLE)
        self.func_title.pack(fill="x", pady=(4, 8))
        self.func_value = ttk.Label(adjust, text="", anchor="center", font=("TkDefaultFont", 13, "bold"))
        self.func_value.pack(fill="x")
        self.func_slider_var = tk.DoubleVar(value=0)
        self.func_slider = tk.Scale(adjust, variable=self.func_slider_var, from_=0, to=100,
                                    resolution=1, orient="horizontal", showvalue=False,
                                    highlightthickness=0, state="disabled",
                                    command=self._func_slider_moved)
        self.func_slider.pack(fill="x", padx=8, pady=(0, 6))
        bind_scale_interactions(self.func_slider, lambda _e: self._send_func())
        self.func_status = ttk.Label(adjust, text="", foreground=GRAY, anchor="center")
        self.func_status.pack(fill="x", pady=(2, 4))

    # ======================================================================
    # Eventos de conexão (chamados pelo App)
    # ======================================================================
    def on_connected(self):
        self.read_all()

    def on_disconnected(self):
        for card in self.cards.values():
            card.set_status("Disconnected", GRAY)
        self.ch_step_value.config(text="—", foreground=GRAY)
        self.func_status.config(text="", foreground=GRAY)

    def on_frequency_polled(self, hz: int):
        """Quadro FA (AI) ou leitura periódica: só atualiza se mudou (dial físico)."""
        if hz != self.frequency_hz:
            self.frequency_hz = hz
            self.freq_lbl.config(text=f"{C.format_frequency(hz)} Hz")

    def on_info(self, info: C.Info):
        """Quadro IF (AI ou leitura periódica): frequência, modo e VFO/memória."""
        self.on_frequency_polled(info.frequency)
        self.memory_channel = info.channel if info.vfo_mem == "1" else None
        if info.mode != self.mode:
            self.on_mode(info.mode)
        else:
            self._update_hint()

    def on_mode(self, code: str):
        """Modo mudou no rádio: atualiza os botões e relê o CH STEP do novo modo."""
        self.mode = code
        self.mode_var.set(code)
        self._update_hint()
        if not self.app.radio:
            return

        def job(radio):
            item = C.ch_step_item_for_mode(code)
            raw = radio.read_menu(item)
            return item, raw

        def then(result):
            item, raw = result
            self._show_ch_step(item, raw)
            self.step_khz = C.ch_step_khz(item, raw)
            self._update_hint()

        self.app.run(job, "Reading CH STEP", then, key="ch-step-read", quiet=True)

    def on_rf_power(self, head: str, watts: int):
        """Resposta PC: ajusta a faixa do slider ao hardware (field head ou SPA-1)."""
        card = self.cards["RF POWER"]
        if head != self.pc_head or card.scale.cget("to") != C.PC_HEAD_RANGE.get(head, (5, 100))[1]:
            self.pc_head = head
            lo, hi = C.PC_HEAD_RANGE.get(head, (5, 100))
            card.set_range(lo, hi)
            card.set_title(f"RF POWER — {C.PC_HEAD_NAME.get(head, 'unknown head')} ({lo}-{hi} W)")
        card.show_radio_value(watts, keep_slider=self.app.worker.pending("set:RF POWER"))

    def _update_hint(self):
        parts = [C.mode_name(self.mode)]
        if self.step_khz is not None:
            parts.append(f"Step: {self.step_khz:g} kHz")
        if self.memory_channel:
            ch = self.memory_channel
            parts.append(f"MEM {int(ch) if ch.isdigit() else ch}")
        self.freq_hint.config(text="  •  ".join(parts))

    # ======================================================================
    # Sintonia
    # ======================================================================
    def _apply_tuning(self, result):
        frequency, mode, item, step_raw, step_khz = result[:5]
        if len(result) > 5:
            info = result[5]
            self.memory_channel = info.channel if info.vfo_mem == "1" else None
        self.frequency_hz = int(frequency)
        self.mode = mode
        self.step_khz = step_khz
        self.freq_lbl.config(text=f"{C.format_frequency(frequency)} Hz")
        self.mode_var.set(mode)
        self._update_hint()
        self._show_ch_step(item, step_raw)

    def _run_tuning(self, title, prepare, key=None):
        """Executa `prepare(radio)` e depois relê a sintonia completa."""
        def job(radio):
            prepare(radio)
            return radio.read_tuning()
        return self.app.run(job, title, self._apply_tuning, key=key)

    def select_band(self, code: str):
        if not self.app.need_conn():
            return
        self._run_tuning("Band selection", lambda r: r.select_band(code), key="band")

    def set_mode(self, code: str):
        if not self.app.radio:
            self.mode_var.set(self.mode or "")
            self.app.need_conn()
            return
        self._run_tuning(f"Changing mode to {C.mode_name(code)}",
                         lambda r: r.send(C.set_mode_cmd(code)), key="mode")

    def _knob_ticks(self, ticks: int):
        if not self.app.radio:
            self.app.need_conn()
            return
        with self._ticks_lock:
            self.pending_ticks += ticks

        def job(radio):
            with self._ticks_lock:
                n, self.pending_ticks = self.pending_ticks, 0
            if n:
                mode = radio.read_mode()
                item = C.ch_step_item_for_mode(mode)
                step_khz = C.ch_step_khz(item, radio.read_menu(item))
                current = radio.read_frequency()
                radio.send(C.set_frequency_cmd(
                    C.clamp_frequency(current + round(n * step_khz * 1000))))
            return radio.read_tuning()

        self.app.run(job, "Frequency tuning", self._apply_tuning, key="tune", quiet=True)

    def open_frequency_dialog(self, _event=None):
        dialog = tk.Toplevel(self)
        dialog.title("Set MAIN Frequency")
        dialog.transient(self.winfo_toplevel())
        dialog.resizable(False, False)
        body = ttk.Frame(dialog, padding=14)
        body.pack(fill="both", expand=True)
        ttk.Label(body, text=("Enter up to 9 digits. Punctuation is added automatically.\n"
                              "Examples: 1448 becomes 144.800.000 Hz; 27555 becomes 27.555.000 Hz."),
                  justify="left", wraplength=360).pack(anchor="w", pady=(0, 8))
        var = tk.StringVar()
        entry = ttk.Entry(body, textvariable=var, width=20, font=("TkDefaultFont", 14))
        entry.pack(fill="x", pady=(0, 10))

        def apply(_e=None):
            try:
                target = C.frequency_from_digits(var.get())
            except ValueError:
                messagebox.showwarning("Frequency", "Enter a frequency.", parent=dialog)
                return "break"
            if not C.FREQ_MIN_HZ <= target <= C.FREQ_MAX_HZ:
                messagebox.showerror("Frequency out of range",
                                     "Enter a frequency between 000.030.000 and 470.000.000 Hz.",
                                     parent=dialog)
                return "break"
            if not self.app.need_conn():
                return "break"
            if self._run_tuning("Set MAIN frequency",
                                lambda r: r.send(C.set_frequency_cmd(target)), key="tune"):
                dialog.destroy()
            return "break"

        def format_as_typed(_e=None):
            original = var.get()
            cursor = entry.index(tk.INSERT)
            digits_before = sum(c.isdigit() for c in original[:cursor])
            masked = C.mask_frequency_digits(original)
            if masked != original:
                var.set(masked)
                new_cursor = digits_before + max(0, (digits_before - 1) // 3)
                entry.icursor(min(new_cursor, len(masked)))

        entry.bind("<KeyRelease>", format_as_typed)
        entry.bind("<Return>", apply)
        dialog.bind("<Escape>", lambda _e: dialog.destroy())
        buttons = ttk.Frame(body)
        buttons.pack(fill="x")
        ttk.Button(buttons, text="Cancel", command=dialog.destroy).pack(side="right")
        ttk.Button(buttons, text="Apply", command=apply).pack(side="right", padx=(0, 6))
        dialog.grab_set()
        entry.focus_set()
        return "break"

    # -- CH-STEP ---------------------------------------------------------------
    def _show_ch_step(self, item, raw):
        self.ch_step_item = item
        codes = [c for c, _ in item.opts]
        index = codes.index(str(raw)) if str(raw) in codes else 0
        self.ch_step_from_radio = True
        self.ch_step_scale.configure(from_=0, to=max(0, len(item.opts) - 1), state="normal")
        self.ch_step_var.set(index)
        self.ch_step_from_radio = False
        self.ch_step_value.config(text=item.label_of(str(raw)), foreground=GREEN)

    def _ch_step_moved(self, value):
        if not self.ch_step_item or self.ch_step_from_radio:
            return
        opts = self.ch_step_item.opts
        index = max(0, min(len(opts) - 1, int(round(float(value)))))
        self.ch_step_value.config(text=opts[index][1], foreground=AMBER)
        self._send_ch_step()

    def _send_ch_step(self):
        if not self.ch_step_item or not self.app.radio:
            return
        opts = self.ch_step_item.opts
        index = max(0, min(len(opts) - 1, int(round(self.ch_step_var.get()))))
        requested_khz = float(opts[index][1].split()[0])

        def job(radio):
            # o modo pode ter mudado no rádio: grava no item do modo atual
            item = C.ch_step_item_for_mode(radio.read_mode())
            radio.write_menu(item, C.nearest_ch_step_code(item, requested_khz))
            return radio.read_tuning()

        def then(result):
            self._apply_tuning(result)
            self.app.log(f"CH STEP set to {self.ch_step_value.cget('text')}.")

        self.ch_step_value.config(text="Sending…", foreground=AMBER)
        self.app.run(job, "Setting CH STEP", then, key="ch-step", quiet=True)

    # ======================================================================
    # Sliders dos controles rápidos
    # ======================================================================
    def _card_changed(self, card: SliderCard):
        if not self.app.radio:
            return
        value = card.value()
        key = f"set:{card.ctl.key}"
        if card.ctl is C.RF_POWER:
            head = self.pc_head
            card.set_status("Sending…", AMBER)
            self.app.run(lambda r: r.set_rf_power(head, int(value)), "Setting RF POWER",
                         lambda res: self.on_rf_power(*res), key=key, quiet=True,
                         on_error=lambda e: card.set_status(f"Error: {e}", RED))
            return

        def then(actual):
            card.show_radio_value(actual, keep_slider=self.app.worker.pending(key))
            self.app.log(f"{card.ctl.title} set to {card.ctl.display(actual)}")

        card.set_status("Sending…", AMBER)
        self.app.run(lambda r: r.set_control(card.ctl, value), f"Setting {card.ctl.title}",
                     then, key=key, quiet=True,
                     on_error=lambda e: card.set_status(f"Error: {e}", RED))

    def read_all(self):
        if not self.app.need_conn():
            return

        def job(radio):
            values, errors = {}, {}
            for name, card in self.cards.items():
                try:
                    if card.ctl is C.RF_POWER:
                        values[name] = radio.read_rf_power()      # (head, watts)
                    else:
                        values[name] = radio.read_control(card.ctl)
                except Exception as exc:      # noqa: BLE001 - segue lendo os demais
                    errors[name] = str(exc)
            tuning = radio.read_tuning()
            return values, errors, tuning

        def then(result):
            values, errors, tuning = result
            for name, value in values.items():
                if name == "RF POWER":
                    self.on_rf_power(*value)
                else:
                    self.cards[name].show_radio_value(value)
            for name, error in errors.items():
                self.cards[name].set_status("No response", RED)
                self.app.log(f"Could not read {name}: {error}")
            self._apply_tuning(tuning)
            self.app.log("Quick controls updated.")
            if self.func_var.get():
                self.select_func(self.func_var.get())

        self.app.run(job, "Reading quick controls", then, key="read-quick")

    # ======================================================================
    # Parâmetros FUNC
    # ======================================================================
    def select_func(self, code: str):
        self.func_var.set(code)
        self.app.settings.set("func_parameter", code)
        ctl = C.FUNC_PARAMETERS.get(code)
        self.func_active = None
        self.func_slider.configure(state="disabled")
        self.func_value.config(text="")
        if not ctl:
            self.func_title.config(text="No adjustment available")
            return
        self.func_title.config(text=ctl.title)
        if not self.app.radio:
            self.func_status.config(text="Connect to the radio to read this value.", foreground=GRAY)
            return
        self.func_status.config(text="Reading current value...", foreground=AMBER)

        def then(value):
            if code == self.func_var.get():
                self._show_func(ctl, value)

        self.app.run(lambda r: r.read_control(ctl), f"Reading {ctl.title}", then,
                     key="func", quiet=True,
                     on_error=lambda e: self.func_status.config(text=f"Error: {e}", foreground=RED))

    def _show_func(self, ctl: C.Control, value, keep_slider=False):
        self.func_active = ctl
        self.func_title.config(text=ctl.title)
        lo, hi = (C.PC_HEAD_RANGE.get(self.pc_head, (ctl.lo, ctl.hi)) if ctl.key == "D"
                  else (ctl.lo, ctl.hi))
        self.func_slider.configure(from_=lo, to=hi, resolution=ctl.step, state="normal")
        if not keep_slider:
            self.func_from_radio = True
            self.func_slider_var.set(value)
            self.func_from_radio = False
            self.func_value.config(text=ctl.display(value))
        self.func_status.config(text=f"Radio: {ctl.display(value)}", foreground=GREEN)

    def _func_slider_moved(self, value):
        if self.func_active and not self.func_from_radio:
            self.func_value.config(text=self.func_active.display(float(value)))
            self._send_func()

    def _send_func(self):
        ctl = self.func_active
        if not ctl or not self.app.radio:
            return
        value = float(self.func_slider_var.get())

        def then(actual):
            if self.func_active is ctl:
                self._show_func(ctl, actual, keep_slider=self.app.worker.pending("func:set"))

        if ctl.key == "D":                    # RF POWER: respeita o hardware (PC1/PC2)
            head = self.pc_head

            def set_power(r):
                head_back, watts = r.set_rf_power(head, int(value))
                self.app.ui(lambda: self.on_rf_power(head_back, watts))
                return watts
        else:
            def set_power(r):
                return r.set_control(ctl, value)

        self.func_status.config(text="Sending to radio...", foreground=AMBER)
        self.app.run(set_power, f"Setting {ctl.title}", then,
                     key="func:set", quiet=True,
                     on_error=lambda e: self.func_status.config(text=f"Error: {e}", foreground=RED))
