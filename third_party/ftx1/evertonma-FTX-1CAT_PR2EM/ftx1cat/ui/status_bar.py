# -*- coding: utf-8 -*-
"""
Faixa de status: indicadores do quadro RI (RX/TX, HI-SWR, BUSY, TUNE, SCAN),
S-meter em recepção e PO/SWR/ALC em transmissão (RM, valores brutos 0-255).

A escala 0-255 é a interna do rádio. A conversão para S-units/watts exige
calibração contra o display do FTX-1; até lá a barra mostra o valor bruto.
"""

import tkinter as tk
from tkinter import ttk
from typing import Dict, Optional

from ..cat import commands as C
from .theme import AMBER, GRAY, GREEN, RED

METER_MAX = 255


class Chip(ttk.Label):
    """Rótulo colorido liga/desliga."""

    def __init__(self, master, text, on_color=GREEN):
        super().__init__(master, text=text, width=max(6, len(text) + 1), anchor="center",
                         relief="groove", padding=(4, 1))
        self.on_color = on_color
        self.set(False)

    def set(self, on: bool, text: Optional[str] = None):
        if text is not None:
            self.config(text=text)
        self.config(foreground="white" if on else GRAY,
                    background=self.on_color if on else "")


class Meter(ttk.Frame):
    def __init__(self, master, title):
        super().__init__(master)
        self.title = ttk.Label(self, text=title, width=5, anchor="e")
        self.title.pack(side="left")
        self.var = tk.IntVar(value=0)
        self.bar = ttk.Progressbar(self, orient="horizontal", length=130, maximum=METER_MAX,
                                   variable=self.var)
        self.bar.pack(side="left", padx=(4, 2))
        self.value = ttk.Label(self, text="—", width=4, anchor="w", foreground=GRAY)
        self.value.pack(side="left")

    def set(self, raw: Optional[int]):
        if raw is None:
            self.var.set(0)
            self.value.config(text="—", foreground=GRAY)
        else:
            self.var.set(max(0, min(METER_MAX, int(raw))))
            self.value.config(text=str(int(raw)), foreground=GREEN)


class StatusBar(ttk.Frame):
    def __init__(self, master):
        super().__init__(master, padding=(6, 2))
        self.chips: Dict[str, Chip] = {}
        self.chips["tx"] = Chip(self, "RX", on_color=RED)
        self.chips["swr"] = Chip(self, "HI-SWR", on_color=RED)
        self.chips["busy"] = Chip(self, "BUSY", on_color=GREEN)
        self.chips["tune"] = Chip(self, "TUNE", on_color=AMBER)
        self.chips["scan"] = Chip(self, "SCAN", on_color=AMBER)
        self.chips["live"] = Chip(self, "LIVE", on_color=GREEN)
        for key in ("tx", "swr", "busy", "tune", "scan"):
            self.chips[key].pack(side="left", padx=2)
        self.chips["live"].pack(side="right", padx=2)

        self.meters: Dict[str, Meter] = {}
        self.meters["S"] = Meter(self, "S")
        self.meters["S"].pack(side="left", padx=(16, 4))
        for key, title in (("5", "PO"), ("6", "SWR"), ("4", "ALC")):
            self.meters[key] = Meter(self, title)
            self.meters[key].pack(side="left", padx=4)
        self.clear()

    # -- API ------------------------------------------------------------------
    def clear(self):
        for chip in self.chips.values():
            chip.set(False)
        self.chips["tx"].set(False, "RX")
        self.chips["live"].set(False, "POLL")
        for meter in self.meters.values():
            meter.set(None)

    def set_live(self, live: bool):
        """LIVE = Auto Information ligado; POLL = leitura periódica."""
        self.chips["live"].set(live, "LIVE" if live else "POLL")

    def show_status(self, st: C.RadioStatus):
        tx = self.chips["tx"]
        if st.tx == "1":
            tx.set(True, "TX")
        elif st.tx == "2":
            tx.set(False, "TX INH")
        else:
            tx.set(False, "RX")
        self.chips["swr"].set(st.hi_swr)
        self.chips["busy"].set(st.busy)
        self.chips["tune"].set(st.tuning)
        self.chips["scan"].set(st.scan != "0")

    def show_smeter(self, raw: int):
        self.meters["S"].set(raw)

    def show_meter(self, which: str, raw: int):
        if which in ("1", "2"):
            self.show_smeter(raw)
        elif which in self.meters:
            self.meters[which].set(raw)

    def transmitting(self, on: bool):
        """Em TX o S-meter não faz sentido; em RX, PO/SWR/ALC também não."""
        if on:
            self.meters["S"].set(None)
        else:
            for key in C.TX_METERS:
                self.meters[key].set(None)
