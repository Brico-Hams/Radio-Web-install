from __future__ import annotations

import queue
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from . import core


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Respaldo DM-1801 (solo lectura)")
        self.geometry("720x520")
        self.q: queue.Queue = queue.Queue()
        default = Path.home() / "DM1801-Backups"
        default.mkdir(exist_ok=True)
        self.folder = tk.StringVar(value=str(default))
        self.status = tk.StringVar(value="Pulsa «Detectar radio».")
        pad = {"padx": 10, "pady": 5}

        ttk.Label(self, text="Carpeta de destino (se crea una subcarpeta nueva por respaldo):").pack(anchor="w", **pad)
        row = ttk.Frame(self); row.pack(fill="x", **pad)
        ttk.Entry(row, textvariable=self.folder).pack(side="left", fill="x", expand=True)
        ttk.Button(row, text="Elegir…", command=self.choose).pack(side="left", padx=5)

        row2 = ttk.Frame(self); row2.pack(fill="x", **pad)
        self.b_detect = ttk.Button(row2, text="Detectar radio", command=self.detect)
        self.b_detect.pack(side="left")
        self.b_backup = ttk.Button(row2, text="Respaldar codeplug", command=self.backup)
        self.b_backup.pack(side="left", padx=5)

        ttk.Label(self, textvariable=self.status, wraplength=680).pack(anchor="w", **pad)
        self.bar = ttk.Progressbar(self, mode="indeterminate"); self.bar.pack(fill="x", **pad)

        cols = ("Archivo", "Tamaño (bytes)", "SHA256")
        self.tree = ttk.Treeview(self, columns=cols, show="headings", height=4)
        for c, w in zip(cols, (110, 110, 440)):
            self.tree.heading(c, text=c); self.tree.column(c, width=w)
        self.tree.pack(fill="x", **pad)

        box = ttk.LabelFrame(self, text="Componentes adicionales")
        box.pack(fill="both", expand=True, **pad)
        for name, why in core.UNAVAILABLE.items():
            ttk.Label(box, text=f"• {name}: {why}", wraplength=660, justify="left").pack(anchor="w", padx=6, pady=2)
        ttk.Label(self, text="dmrconfig © Serge Vakulenko KK6ABQ, licencia BSD-3 (ver THIRD-PARTY-NOTICES).",
                  foreground="gray").pack(anchor="w", padx=10)
        self.after(150, self.poll)

    def choose(self) -> None:
        d = filedialog.askdirectory(initialdir=self.folder.get(), title="Carpeta de destino")
        if d:
            self.folder.set(d)

    def busy(self, on: bool) -> None:
        for b in (self.b_detect, self.b_backup):
            b.state(["disabled"] if on else ["!disabled"])
        (self.bar.start if on else self.bar.stop)()

    def run_bg(self, fn) -> None:
        self.busy(True)
        def work():
            try:
                self.q.put(("ok", fn()))
            except core.BackupError as e:
                self.q.put(("err", str(e)))
            except Exception as e:  # noqa: BLE001
                self.q.put(("err", f"Error inesperado: {type(e).__name__}"))
        threading.Thread(target=work, daemon=True).start()

    def detect(self) -> None:
        self.status.set("Buscando radio (USB 15A2:0073)…")
        self.run_bg(lambda: ("detect", core.detect_radio()))

    def backup(self) -> None:
        self.status.set("Leyendo la radio… no la desconectes ni la apagues.")
        self.tree.delete(*self.tree.get_children())
        folder = Path(self.folder.get())
        self.run_bg(lambda: ("backup", core.run_backup(folder)))

    def poll(self) -> None:
        try:
            kind, payload = self.q.get_nowait()
        except queue.Empty:
            self.after(150, self.poll); return
        self.busy(False)
        if kind == "err":
            self.status.set(f"Error: {payload}")
            messagebox.showerror("Respaldo DM-1801", payload)
        else:
            what, val = payload
            if what == "detect":
                self.status.set("Radio DM-1801 detectada (USB 15A2:0073)." if val else
                                "No se detecta la radio. Conéctala, enciéndela y reintenta.")
            else:
                for fi in val.files:
                    self.tree.insert("", "end", values=(fi.name, fi.size, fi.sha256))
                self.status.set(f"Respaldo completado y validado en: {val.folder}")
        self.after(150, self.poll)


def main() -> None:
    App().mainloop()
