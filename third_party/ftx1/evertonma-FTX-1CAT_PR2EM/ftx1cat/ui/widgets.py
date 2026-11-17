# -*- coding: utf-8 -*-
"""Widgets reutilizáveis: painel rolável, dial de sintonia e helpers de Scale."""

import math
import tkinter as tk
from tkinter import ttk
from typing import Callable


# --------------------------------------------------------------------------
# Painel rolável
# --------------------------------------------------------------------------
class ScrollFrame(ttk.Frame):
    def __init__(self, master):
        super().__init__(master)
        self.canvas = tk.Canvas(self, highlightthickness=0)
        self.vsb = ttk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.inner = ttk.Frame(self.canvas)
        self.inner.bind("<Configure>",
                        lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.win = self.canvas.create_window((0, 0), window=self.inner, anchor="nw")
        self.canvas.bind("<Configure>",
                         lambda e: self.canvas.itemconfigure(self.win, width=e.width))
        self.canvas.configure(yscrollcommand=self.vsb.set)
        self.canvas.pack(side="left", fill="both", expand=True)
        self.vsb.pack(side="right", fill="y")
        self.bind("<Enter>", self._bind_wheel)
        self.bind("<Leave>", self._unbind_wheel)

    def _bind_wheel(self, _=None):
        self.canvas.bind_all("<MouseWheel>", self._wheel)
        self.canvas.bind_all("<Button-4>", self._wheel)
        self.canvas.bind_all("<Button-5>", self._wheel)

    def _unbind_wheel(self, _=None):
        self.canvas.unbind_all("<MouseWheel>")
        self.canvas.unbind_all("<Button-4>")
        self.canvas.unbind_all("<Button-5>")

    def _wheel(self, e):
        self.canvas.yview_scroll(wheel_direction(e) * -1, "units")

    def clear(self):
        for w in self.inner.winfo_children():
            w.destroy()
        self.canvas.yview_moveto(0)


def wheel_direction(event) -> int:
    """+1 para cima, -1 para baixo, em Windows/macOS (delta) e Linux (Button-4/5)."""
    num = getattr(event, "num", None)
    if num == 4:
        return 1
    if num == 5:
        return -1
    return 1 if getattr(event, "delta", 0) > 0 else -1


# --------------------------------------------------------------------------
# Dial de sintonia (canvas) — gira com o scroll do mouse
# --------------------------------------------------------------------------
class FrequencyKnob(tk.Canvas):
    def __init__(self, master, on_ticks: Callable[[int], None], size: int = 96):
        super().__init__(master, width=size, height=size, highlightthickness=0,
                         background=master.winfo_toplevel().cget("background"))
        self.on_ticks = on_ticks
        self.size = size
        self.position = 0
        self.bind("<MouseWheel>", self._wheel)
        self.bind("<Button-4>", self._wheel)
        self.bind("<Button-5>", self._wheel)
        self.draw()

    def _wheel(self, event):
        ticks = wheel_direction(event)
        self.position = (self.position + ticks) % 9
        self.draw()
        self.on_ticks(ticks)
        return "break"

    def draw(self):
        self.delete("all")
        s = self.size / 96.0            # desenho original feito para 96 px
        cx = cy = 48 * s

        def oval(a, b, c, d, **kw):
            self.create_oval(a * s, b * s, c * s, d * s, **kw)

        # Aro e corpo do dial, com bordas concêntricas em relevo.
        oval(5, 5, 91, 91, fill="#111315", outline="#08090a", width=2)
        oval(7, 7, 89, 89, fill="#303438", outline="#85898c", width=2)
        oval(11, 11, 85, 85, fill="#1c1f22", outline="#090a0b", width=2)
        oval(15, 15, 81, 81, fill="#34383b", outline="#555a5e", width=1)

        # Ranhuras radiais na face, inspiradas no acabamento facetado do dial físico.
        for groove in range(24):
            angle = math.radians(groove * 15 - 90)
            inner, outer = 12 * s, 31 * s
            x1, y1 = cx + inner * math.cos(angle), cy + inner * math.sin(angle)
            x2, y2 = cx + outer * math.cos(angle), cy + outer * math.sin(angle)
            shade = "#666b6f" if groove % 2 == 0 else "#202326"
            self.create_line(x1, y1, x2, y2, fill=shade, width=2)
            if groove % 2 == 0:
                self.create_line(x1 + 1, y1 + 1, x2 + 1, y2 + 1, fill="#282c2f", width=1)

        # Rebaixo central com um pequeno ressalto circular no miolo.
        oval(30, 30, 66, 66, fill="#25292c", outline="#17191b", width=2)
        oval(34, 34, 62, 62, fill="#111315", outline="#555a5e", width=2)
        oval(39, 39, 57, 57, fill="#25292c", outline="#777c80", width=1)
        oval(43, 42, 53, 52, fill="#171a1c", outline="#0b0c0d", width=1)

        # Pequeno marcador luminoso que acompanha a rolagem do dial.
        pointer_angle = math.radians(-140 + self.position * 35)
        mx = cx + 37 * s * math.cos(pointer_angle)
        my = cy + 37 * s * math.sin(pointer_angle)
        r = 2.5 * s
        self.create_oval(mx - r, my - r, mx + r, my + r,
                         fill="#d6d9dc", outline="#111315", width=1)


# --------------------------------------------------------------------------
# Scale: clique na trilha pula para o valor; scroll ajusta um passo
# --------------------------------------------------------------------------
def bind_scale_interactions(scale: tk.Scale, on_change: Callable[[object], None]) -> None:
    scale.bind("<Button-1>", lambda e: _scale_track_click(scale, e, on_change))
    scale.bind("<ButtonRelease-1>", on_change)
    scale.bind("<KeyRelease>", on_change)
    scale.bind("<MouseWheel>", lambda e: _scale_mousewheel(scale, e, on_change))
    scale.bind("<Button-4>", lambda e: _scale_mousewheel(scale, e, on_change))
    scale.bind("<Button-5>", lambda e: _scale_mousewheel(scale, e, on_change))


def _scale_track_click(scale, event, on_change):
    """Clicar na trilha pula para aquele valor; clicar no botão continua arrastando."""
    vertical = scale.cget("orient") == "vertical"
    axis = 1 if vertical else 0
    pointer = event.y if vertical else event.x
    current_pos = scale.coords()[axis]
    knob_half = int(scale.cget("sliderlength")) / 2
    if abs(pointer - current_pos) <= knob_half:
        return None
    min_pos = scale.coords(float(scale.cget("from")))[axis]
    max_pos = scale.coords(float(scale.cget("to")))[axis]
    if max_pos == min_pos:
        return "break"
    fraction = max(0.0, min(1.0, (pointer - min_pos) / (max_pos - min_pos)))
    low, high = float(scale.cget("from")), float(scale.cget("to"))
    resolution = float(scale.cget("resolution"))
    value = low + fraction * (high - low)
    if resolution > 0:
        value = low + round((value - low) / resolution) * resolution
    scale.set(value)
    on_change(event)
    return "break"


def _scale_mousewheel(scale, event, on_change):
    direction = wheel_direction(event)
    step = float(scale.cget("resolution"))
    if step <= 0:
        step = max(1.0, (float(scale.cget("to")) - float(scale.cget("from"))) / 100)
    low, high = sorted((float(scale.cget("from")), float(scale.cget("to"))))
    value = max(low, min(high, float(scale.get()) + direction * step))
    scale.set(value)
    on_change(event)
    return "break"
