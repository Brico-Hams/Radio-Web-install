# -*- coding: utf-8 -*-
"""
Aba "Memories": lê uma faixa de canais do rádio (MR/MT), permite editar
frequência, modo, etiqueta e shift, grava de volta (MW/MT) com diff e
confirmação, chama um canal (VM/MC) e exporta/importa CSV.

Referências: manual CAT pp. 19-20 (MR, MT, MW, MC), p. 26 (VM).
"""

import csv
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk
from typing import Dict, List, Optional

from ..cat import CatError
from ..cat import commands as C
from .theme import AMBER, FONT_TITLE, GRAY, GREEN, RED

CSV_COLUMNS = ["channel", "tag", "frequency_hz", "mode", "shift", "sql_type",
               "clar_offset_hz", "rx_clar", "tx_clar"]
COLUMNS = ("channel", "tag", "frequency", "mode", "shift", "sql", "state")
HEADERS = {"channel": "Ch", "tag": "Tag", "frequency": "Frequency (Hz)", "mode": "Mode",
           "shift": "Shift", "sql": "SQL", "state": "State"}
WIDTHS = {"channel": 50, "tag": 130, "frequency": 130, "mode": 90, "shift": 80, "sql": 120,
          "state": 170}


class MemoryRow:
    """Estado de um canal na tabela: o que o rádio tem e o que o usuário editou."""

    def __init__(self, n: int):
        self.n = n
        self.radio: Optional[C.Info] = None      # como está no rádio (None = vazio)
        self.radio_tag = ""
        self.edit: Optional[C.Info] = None       # edição local (None = igual ao rádio)
        self.edit_tag: Optional[str] = None
        self.local_clear = False                 # removido apenas da tabela local

    @property
    def info(self) -> Optional[C.Info]:
        if self.local_clear:
            return None
        return self.edit if self.edit is not None else self.radio

    @property
    def tag(self) -> str:
        if self.local_clear:
            return ""
        return self.edit_tag if self.edit_tag is not None else self.radio_tag

    @property
    def dirty(self) -> bool:
        if self.local_clear:
            return True
        return (self.edit is not None and self.edit != self.radio) or (
            self.edit_tag is not None and self.edit_tag != self.radio_tag)

    def values(self):
        info = self.info
        if info is None:
            state = "Cleared locally" if self.local_clear else "(empty)"
            return (f"{self.n:03d}", "", "(empty)", "", "", "", state)
        if self.dirty:
            state = "Changed (not written)" if self.radio else "New (not written)"
        else:
            state = "Read"
        return (f"{self.n:03d}", self.tag, C.format_frequency(info.frequency),
                C.mode_name(info.mode), C.SHIFTS.get(info.shift, info.shift),
                C.SQL_TYPES.get(info.sql_type, info.sql_type), state)


class MemoryPage(ttk.Frame):
    def __init__(self, master, app):
        super().__init__(master, padding=6)
        self.app = app
        self.rows: Dict[int, MemoryRow] = {}
        self._clipboard = None
        self._build()

    # ======================================================================
    # Construção
    # ======================================================================
    def _build(self):
        bar = ttk.Frame(self)
        bar.pack(fill="x", pady=(0, 4))
        ttk.Label(bar, text="Channels").pack(side="left")
        self.from_var = tk.IntVar(value=1)
        self.to_var = tk.IntVar(value=99)
        ttk.Spinbox(bar, from_=C.MEMORY_MIN, to=C.MEMORY_MAX, textvariable=self.from_var,
                    width=5).pack(side="left", padx=(4, 2))
        ttk.Label(bar, text="to").pack(side="left")
        ttk.Spinbox(bar, from_=C.MEMORY_MIN, to=C.MEMORY_MAX, textvariable=self.to_var,
                    width=5).pack(side="left", padx=(2, 8))
        ttk.Button(bar, text="Read", command=self.read_range).pack(side="left")
        ttk.Button(bar, text="Write Changes", command=self.write_dirty).pack(side="left", padx=4)
        ttk.Button(bar, text="Recall", command=self.recall_selected).pack(side="left")
        ttk.Button(bar, text="Store VFO here", command=self.store_vfo).pack(side="left", padx=4)
        ttk.Button(bar, text="SET TO VFO", command=self.set_selected_to_vfo).pack(side="left")
        ttk.Button(bar, text="Import CSV…", command=self.import_csv).pack(side="right")
        ttk.Button(bar, text="Export CSV…", command=self.export_csv).pack(side="right", padx=4)

        self.title_lbl = ttk.Label(self, text="Read a range of channels to start. Double-click a "
                                              "row to edit.", font=FONT_TITLE)
        self.title_lbl.pack(anchor="w", pady=(0, 4))

        box = ttk.Frame(self)
        box.pack(fill="both", expand=True)
        self.tree = ttk.Treeview(box, columns=COLUMNS, show="headings", selectmode="extended")
        for col in COLUMNS:
            self.tree.heading(col, text=HEADERS[col])
            self.tree.column(col, width=WIDTHS[col], anchor="w", stretch=(col == "tag"))
        vsb = ttk.Scrollbar(box, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        self.tree.pack(side="left", fill="both", expand=True)
        vsb.pack(side="right", fill="y")
        self.tree.tag_configure("dirty", foreground=AMBER)
        self.tree.tag_configure("empty", foreground=GRAY)
        self.tree.bind("<Double-1>", lambda _e: self.edit_selected())
        self.tree.bind("<Button-3>", self._show_context_menu)

        self.status = ttk.Label(self, text="", foreground=GRAY)
        self.status.pack(anchor="w", pady=(4, 0))

    # ======================================================================
    # Eventos de conexão
    # ======================================================================
    def on_connected(self):
        pass

    def on_disconnected(self):
        self.status.config(text="Disconnected", foreground=GRAY)

    # ======================================================================
    # Tabela
    # ======================================================================
    def _refresh_row(self, row: MemoryRow):
        iid = str(row.n)
        tags = ("dirty",) if row.dirty else (("empty",) if row.info is None else ())
        if self.tree.exists(iid):
            self.tree.item(iid, values=row.values(), tags=tags)
        else:
            # mantém a ordem por número de canal
            index = sum(1 for n in self.rows if n < row.n)
            self.tree.insert("", index, iid=iid, values=row.values(), tags=tags)

    def _row(self, n: int) -> MemoryRow:
        if n not in self.rows:
            self.rows[n] = MemoryRow(n)
        return self.rows[n]

    def _selected(self) -> List[MemoryRow]:
        return [self.rows[int(iid)] for iid in self.tree.selection() if int(iid) in self.rows]

    def _range(self):
        lo, hi = sorted((int(self.from_var.get()), int(self.to_var.get())))
        lo = max(C.MEMORY_MIN, lo)
        hi = min(C.MEMORY_MAX, hi)
        return lo, hi

    # ======================================================================
    # Leitura
    # ======================================================================
    def read_range(self):
        if not self.app.need_conn():
            return
        lo, hi = self._range()
        channels = list(range(lo, hi + 1))
        app = self.app

        def job(radio):
            n = len(channels)
            for i, ch in enumerate(channels, 1):
                if app.worker.stop_event.is_set():
                    break
                info = radio.read_memory(ch)
                tag = radio.read_tag(ch) if info else ""
                app.ui(lambda ch=ch, info=info, tag=tag: self._got(ch, info, tag))
                app.progress(i, n, "Memories")
            return len(channels)

        self.status.config(text=f"Reading channels {lo}-{hi}…", foreground=AMBER)
        app.run(job, f"Read memories {lo}-{hi}", lambda n: self.status.config(
            text=f"Read {n} channels; {sum(1 for r in self.rows.values() if r.radio)} in use.",
            foreground=GREEN), key="memories")

    def _got(self, ch: int, info: Optional[C.Info], tag: str):
        row = self._row(ch)
        row.radio, row.radio_tag = info, tag
        row.local_clear = False
        if row.edit is not None and row.edit == info:
            row.edit = None
        if row.edit_tag is not None and row.edit_tag == tag:
            row.edit_tag = None
        self._refresh_row(row)

    # ======================================================================
    # Edição
    # ======================================================================
    def edit_selected(self):
        rows = self._selected()
        if len(rows) != 1:
            return
        row = rows[0]
        base = row.info or C.Info(f"{row.n:05d}", self.app.quick.frequency_hz or 14_250_000, 0,
                                  False, False, self.app.quick.mode or "2", "1", "0", "0")
        MemoryDialog(self, row.n, base, row.tag, lambda info, tag: self._edited(row, info, tag))

    def _edited(self, row: MemoryRow, info: C.Info, tag: str):
        row.local_clear = False
        row.edit = info
        row.edit_tag = tag
        self._refresh_row(row)

    def store_vfo(self):
        """Copia a sintonia atual (IF) para os canais selecionados (edição local)."""
        rows = self._selected()
        if not rows:
            messagebox.showinfo("Memories", "Select one or more channels first.")
            return
        if not self.app.need_conn():
            return

        def then(info: C.Info):
            for row in rows:
                row.local_clear = False
                row.edit = C.Info(f"{row.n:05d}", info.frequency, info.clar_offset, info.rx_clar,
                                  info.tx_clar, info.mode, "1", info.sql_type, info.shift)
                self._refresh_row(row)

        self.app.run(lambda r: r.read_info(), "Read VFO", then, key="memories", quiet=True)

    # ======================================================================
    # Gravação
    # ======================================================================
    def write_dirty(self):
        rows = [r for r in self.rows.values() if r.dirty and r.info is not None]
        if not rows:
            messagebox.showinfo("Memories", "No writable channel changes. Locally cleared rows "
                                "cannot be erased from the radio with the supported CAT commands.")
            return
        if not self.app.need_conn():
            return
        lines = []
        for r in rows[:20]:
            before = (f"{C.format_frequency(r.radio.frequency)} {C.mode_name(r.radio.mode)} "
                      f"'{r.radio_tag}'" if r.radio else "(empty)")
            after = f"{C.format_frequency(r.info.frequency)} {C.mode_name(r.info.mode)} '{r.tag}'"
            lines.append(f"Ch {r.n:03d}: {before}  →  {after}")
        more = f"\n… and {len(rows) - 20} more" if len(rows) > 20 else ""
        if not messagebox.askokcancel("Write memories",
                                      f"{len(rows)} channel(s) will be overwritten on the radio:\n\n"
                                      + "\n".join(lines) + more + "\n\nContinue?"):
            return
        app = self.app
        plan = [(r.n, r.info, r.tag) for r in rows]

        def job(radio):
            bad = 0
            for i, (n, info, tag) in enumerate(plan, 1):
                if app.worker.stop_event.is_set():
                    break
                try:
                    back = radio.write_memory(info, tag)
                    back_tag = radio.read_tag(n)
                    app.ui(lambda n=n, b=back, t=back_tag: self._got(n, b, t))
                except CatError as exc:
                    bad += 1
                    app.ui(lambda n=n, e=exc: app.log(f"Memory {n:03d} not written: {e}"))
                app.progress(i, len(plan), "Writing")
            return bad

        app.run(job, "Write memories", lambda bad: self.status.config(
            text=f"Write finished; {bad} channel(s) failed." if bad else "All channels written ✓",
            foreground=RED if bad else GREEN), key="memories")

    def recall_selected(self):
        rows = self._selected()
        if len(rows) != 1 or rows[0].radio is None:
            messagebox.showinfo("Memories", "Select one channel that exists on the radio.")
            return
        if not self.app.need_conn():
            return
        n = rows[0].n

        def job(radio):
            radio.recall_memory(n)
            return radio.read_tuning()

        self.app.run(job, f"Recall memory {n:03d}", self.app.quick._apply_tuning, key="memories")

    def set_selected_to_vfo(self):
        """Aplica frequência e modo do canal selecionado ao VFO, sem gravar memória."""
        rows = self._selected()
        if len(rows) != 1:
            messagebox.showinfo("Memories", "Select one channel first.")
            return
        row = rows[0]
        info = row.info
        if info is None:
            messagebox.showinfo("Memories", "The selected channel has no data.")
            return
        if not self.app.need_conn():
            return

        def job(radio):
            radio.set_frequency(info.frequency)
            radio.set_mode(info.mode)
            return radio.read_tuning()

        self.app.run(job, f"Set channel {row.n:03d} to VFO",
                     self.app.quick._apply_tuning, key="memories")

    def _show_context_menu(self, event):
        iid = self.tree.identify_row(event.y)
        if not iid:
            return "break"
        self.tree.selection_set(iid)
        self.tree.focus(iid)
        menu = tk.Menu(self, tearoff=False)
        menu.add_command(label="Cut", command=self.cut_selected)
        menu.add_command(label="Copy", command=self.copy_selected)
        menu.add_command(label="Paste", command=self.paste_selected,
                         state="normal" if self._clipboard else "disabled")
        menu.add_separator()
        menu.add_command(label="Clear", command=self.clear_selected)
        menu.tk_popup(event.x_root, event.y_root)
        return "break"

    def copy_selected(self):
        rows = self._selected()
        if len(rows) != 1 or rows[0].info is None:
            messagebox.showinfo("Memories", "Select one channel that has data.")
            return
        row = rows[0]
        self._clipboard = (row.info, row.tag, None)

    def cut_selected(self):
        rows = self._selected()
        if len(rows) != 1 or rows[0].info is None:
            messagebox.showinfo("Memories", "Select one channel that has data.")
            return
        row = rows[0]
        self._clipboard = (row.info, row.tag, row.n)
        row.local_clear = True
        row.edit = None
        row.edit_tag = None
        self._refresh_row(row)
        self.status.config(text="Channel cut locally; paste it into another row. The radio is unchanged.",
                           foreground=AMBER)

    def paste_selected(self):
        rows = self._selected()
        if len(rows) != 1:
            messagebox.showinfo("Memories", "Select one destination channel.")
            return
        if not self._clipboard:
            return
        source_info, tag, cut_channel = self._clipboard
        row = rows[0]
        row.local_clear = False
        row.edit = C.Info(f"{row.n:05d}", source_info.frequency, source_info.clar_offset,
                          source_info.rx_clar, source_info.tx_clar, source_info.mode, "1",
                          source_info.sql_type, source_info.shift)
        row.edit_tag = tag
        self._refresh_row(row)
        if cut_channel is not None:
            self._clipboard = None
        self.status.config(text=f"Pasted into channel {row.n:03d} locally; click Write Changes to save.",
                           foreground=AMBER)

    def clear_selected(self):
        rows = self._selected()
        if len(rows) != 1:
            messagebox.showinfo("Memories", "Select one channel to clear.")
            return
        row = rows[0]
        if row.info is None:
            messagebox.showinfo("Memories", "The selected row is already empty.")
            return
        if not messagebox.askokcancel(
                "Clear memory row",
                f"Clear the data shown for channel {row.n:03d}? This only clears the local table; "
                "the memory stored in the radio will not be erased."):
            return
        row.local_clear = True
        row.edit = None
        row.edit_tag = None
        self._refresh_row(row)
        self.status.config(text="Row cleared locally; the radio memory is unchanged.", foreground=AMBER)

    # ======================================================================
    # CSV
    # ======================================================================
    def export_csv(self):
        rows = [r for r in self.rows.values() if r.info]
        if not rows:
            messagebox.showinfo("Memories", "Nothing to export. Read some channels first.")
            return
        path = filedialog.asksaveasfilename(title="Export memories", defaultextension=".csv",
                                            initialfile="ftx1_memories.csv",
                                            filetypes=[("CSV", "*.csv")])
        if not path:
            return
        write_csv(path, rows)
        self.status.config(text=f"Exported {len(rows)} channels to {Path(path).name}.", foreground=GREEN)

    def import_csv(self):
        path = filedialog.askopenfilename(title="Import memories", filetypes=[("CSV", "*.csv")])
        if not path:
            return
        try:
            imported = read_csv(path)
        except (OSError, ValueError, KeyError) as exc:
            messagebox.showerror("Import CSV", f"Could not read the file: {exc}")
            return
        for n, info, tag in imported:
            row = self._row(n)
            row.local_clear = False
            row.edit, row.edit_tag = info, tag
            self._refresh_row(row)
        self.status.config(text=f"Imported {len(imported)} channels as local edits. Review and "
                                "click Write Changes.", foreground=AMBER)


# --------------------------------------------------------------------------
# CSV (funções puras, testáveis sem Tk)
# --------------------------------------------------------------------------
def write_csv(path, rows: List[MemoryRow]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        w.writeheader()
        for r in rows:
            i = r.info
            w.writerow({"channel": r.n, "tag": r.tag, "frequency_hz": i.frequency,
                        "mode": C.mode_name(i.mode), "shift": C.SHIFTS.get(i.shift, i.shift),
                        "sql_type": C.SQL_TYPES.get(i.sql_type, i.sql_type),
                        "clar_offset_hz": i.clar_offset, "rx_clar": int(i.rx_clar),
                        "tx_clar": int(i.tx_clar)})


def read_csv(path):
    """-> [(canal, Info, tag)]. Aceita modo por nome ('USB') ou código ('2');
    shift por nome ('+', '-', 'SIMPLEX') ou código; SQL idem."""
    names_to_mode = {m.name: m.code for m in C.MODES}
    shift_by_name = {v: k for k, v in C.SHIFTS.items()}
    sql_by_name = {v: k for k, v in C.SQL_TYPES.items()}
    out = []
    with open(path, newline="", encoding="utf-8") as f:
        for line in csv.DictReader(f):
            n = int(line["channel"])
            C.channel_code(n)
            mode = line.get("mode", "USB").strip()
            mode = names_to_mode.get(mode.upper(), mode)
            if mode not in C.MODE_BY_CODE:
                raise ValueError(f"channel {n}: unknown mode {line.get('mode')!r}")
            shift = line.get("shift", "0").strip() or "0"
            shift = shift_by_name.get(shift.upper(), shift)
            sql = line.get("sql_type", "0").strip() or "0"
            sql = sql_by_name.get(sql.upper(), sql)
            hz = int(float(line["frequency_hz"]))
            if not C.in_rx_range(hz):
                raise ValueError(f"channel {n}: frequency {hz} Hz out of range")
            info = C.Info(f"{n:05d}", hz, int(line.get("clar_offset_hz") or 0),
                          str(line.get("rx_clar", "0")).strip() in ("1", "true", "True"),
                          str(line.get("tx_clar", "0")).strip() in ("1", "true", "True"),
                          mode, "1", sql, shift)
            out.append((n, info, line.get("tag", "")[:C.TAG_LEN]))
    return out


# --------------------------------------------------------------------------
# Diálogo de edição
# --------------------------------------------------------------------------
class MemoryDialog(tk.Toplevel):
    def __init__(self, master, n: int, info: C.Info, tag: str, on_ok):
        super().__init__(master)
        self.title(f"Memory channel {n:03d}")
        self.transient(master.winfo_toplevel())
        self.resizable(False, False)
        self.n, self.base, self.on_ok = n, info, on_ok
        body = ttk.Frame(self, padding=12)
        body.pack(fill="both", expand=True)

        self.tag_var = tk.StringVar(value=tag)
        self.freq_var = tk.StringVar(value=str(info.frequency))
        self.mode_var = tk.StringVar(value=C.mode_name(info.mode))
        self.shift_var = tk.StringVar(value=C.SHIFTS.get(info.shift, "SIMPLEX"))
        self.sql_var = tk.StringVar(value=C.SQL_TYPES.get(info.sql_type, "OFF"))

        def row(r, label, widget):
            ttk.Label(body, text=label).grid(row=r, column=0, sticky="e", padx=(0, 8), pady=3)
            widget.grid(row=r, column=1, sticky="ew", pady=3)

        row(0, "Tag (12 chars)", ttk.Entry(body, textvariable=self.tag_var, width=20))
        row(1, "Frequency (Hz)", ttk.Entry(body, textvariable=self.freq_var, width=20))
        row(2, "Mode", ttk.Combobox(body, textvariable=self.mode_var, state="readonly",
                                    values=[m.name for m in C.MODES], width=18))
        row(3, "Shift", ttk.Combobox(body, textvariable=self.shift_var, state="readonly",
                                     values=list(C.SHIFTS.values()), width=18))
        row(4, "SQL type", ttk.Combobox(body, textvariable=self.sql_var, state="readonly",
                                        values=list(C.SQL_TYPES.values()), width=18))
        ttk.Label(body, text="Tone/DCS numbers are set by the CN command (not yet supported).",
                  foreground=GRAY, wraplength=280).grid(row=5, column=0, columnspan=2, pady=(6, 0))
        buttons = ttk.Frame(body)
        buttons.grid(row=6, column=0, columnspan=2, sticky="e", pady=(10, 0))
        ttk.Button(buttons, text="Cancel", command=self.destroy).pack(side="right")
        ttk.Button(buttons, text="OK", command=self.ok).pack(side="right", padx=(0, 6))
        self.bind("<Return>", lambda _e: self.ok())
        self.bind("<Escape>", lambda _e: self.destroy())
        self.grab_set()

    def ok(self):
        try:
            hz = int("".join(c for c in self.freq_var.get() if c.isdigit()))
            if not C.in_rx_range(hz):
                raise ValueError("frequency out of the receiver range")
            tag = self.tag_var.get()[:C.TAG_LEN]
            if not tag.isascii():
                raise ValueError("tag must use ASCII characters")
        except ValueError as exc:
            messagebox.showerror("Memory", str(exc), parent=self)
            return
        mode = next(m.code for m in C.MODES if m.name == self.mode_var.get())
        shift = next(k for k, v in C.SHIFTS.items() if v == self.shift_var.get())
        sql = next(k for k, v in C.SQL_TYPES.items() if v == self.sql_var.get())
        info = C.Info(f"{self.n:05d}", hz, self.base.clar_offset, self.base.rx_clar,
                      self.base.tx_clar, mode, "1", sql, shift)
        self.on_ok(info, tag)
        self.destroy()
