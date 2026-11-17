# -*- coding: utf-8 -*-
"""
Aba "CAT Menu": árvore de grupos, busca, linhas de itens (ler/gravar),
leitura/gravação em lote e backup/restore em JSON.
"""

import datetime
import json
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk
from typing import List, Optional

from ..cat import ALL_ITEMS, BY_KEY, MENU, CatError, Item, find_group, search_items
from .theme import AMBER, FONT_TITLE, GRAY, GREEN, RED, SEP
from .widgets import ScrollFrame

BACKUP_FORMAT = "ftx1-menu-backup-1"


# --------------------------------------------------------------------------
# Uma linha = um item de menu
# --------------------------------------------------------------------------
class Row:
    def __init__(self, page, parent, item: Item, r: int, crumb=False):
        self.page, self.item = page, item
        self.raw: Optional[str] = None
        self.alive = True
        self._loading = False
        self.var = tk.StringVar()

        title = f"{item.path1} › {item.path2} › {item.name}" if crumb else item.name
        ttk.Label(parent, text=f"{item.p3:02d}", width=3, anchor="e").grid(
            row=r, column=0, padx=(4, 2), pady=2, sticky="e")
        ttk.Label(parent, text=title, anchor="w").grid(row=r, column=1, padx=4, sticky="w")

        if item.kind == "enum":
            self.w = ttk.Combobox(parent, textvariable=self.var, state="readonly", width=34,
                                  values=[f"{c}{SEP}{l}" for c, l in item.opts])
        elif item.kind in ("int", "sint"):
            self.w = ttk.Spinbox(parent, textvariable=self.var, from_=item.lo, to=item.hi,
                                 increment=item.step, width=10)
        else:
            self.w = ttk.Entry(parent, textvariable=self.var, state="readonly", width=34)
        self.w.grid(row=r, column=2, padx=4, sticky="w")

        if item.kind in ("int", "sint"):
            note = f"{item.lo} to {item.hi} {item.unit}".strip()
        elif item.kind == "text":
            note = f"text, {item.digits} chars (read-only)"
        elif item.kind == "ro":
            note = item.hint
        else:
            note = ""
        ttk.Label(parent, text=note, foreground=GRAY, wraplength=320, justify="left").grid(
            row=r, column=3, padx=4, sticky="w")

        ttk.Button(parent, text="Read", width=5, command=self.read).grid(row=r, column=4, padx=2)
        self.btn_w = ttk.Button(parent, text="Write", width=7, command=self.write)
        self.btn_w.grid(row=r, column=5, padx=2)
        if not item.writable:
            self.btn_w.state(["disabled"])
        self.status = ttk.Label(parent, text="", width=26, anchor="w")
        self.status.grid(row=r, column=6, padx=4, sticky="w")
        self.var.trace_add("write", self._edited)

    # -- helpers ----------------------------------------------------------
    def set_status(self, text, color=GRAY):
        if self.alive:
            try:
                self.status.config(text=text, foreground=color)
            except tk.TclError:
                self.alive = False

    def show_raw(self, raw: str):
        if not self.alive:
            return
        self.raw = raw
        it = self.item
        self._loading = True
        try:
            if it.kind == "enum":
                lab = dict(it.opts).get(raw)
                self.var.set(f"{raw}{SEP}{lab}" if lab is not None
                             else f"{raw}{SEP}(not in table)")
            elif it.kind in ("int", "sint"):
                self.var.set(str(it.decode(raw)))
            else:
                self.var.set(raw)
        except (ValueError, tk.TclError):
            try:
                self.var.set(raw)
            except tk.TclError:
                self.alive = False
        finally:
            self._loading = False

    def current_raw(self) -> str:
        it = self.item
        if it.kind == "enum":
            code = self.var.get().split(SEP, 1)[0].strip()
            return it.encode(code)
        return it.encode(self.var.get())

    def dirty(self) -> bool:
        if not self.item.writable or self.raw is None:
            return False
        try:
            return self.item.norm(self.current_raw()) != self.item.norm(self.raw)
        except ValueError:
            return False

    def _edited(self, *_):
        """Marca visualmente o que foi alterado e ainda não gravado."""
        if self._loading or not self.alive:
            return
        if self.raw is None:
            self.set_status("Not read yet", GRAY)
        elif self.dirty():
            self.set_status("Changed (not written)", AMBER)
        else:
            self.set_status("Read", GREEN)

    def read(self):
        self.page.read_rows([self])

    def write(self):
        self.page.write_rows([self])


# --------------------------------------------------------------------------
# Página
# --------------------------------------------------------------------------
class MenuPage(ttk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self.app = app
        self.rows: List[Row] = []
        self.cur_group = None
        self._build()

    def _build(self):
        body = ttk.PanedWindow(self, orient="horizontal")
        body.pack(fill="both", expand=True)

        left = ttk.Frame(body)
        self.search_var = tk.StringVar()
        ttk.Label(left, text="Search items:").pack(anchor="w")
        ttk.Entry(left, textvariable=self.search_var).pack(fill="x", pady=(0, 4))
        self.search_var.trace_add("write", lambda *_: self.on_search())
        self.tree = ttk.Treeview(left, show="tree", selectmode="browse")
        self.tree.pack(fill="both", expand=True)
        for p1, n1, groups in MENU:
            top_id = self.tree.insert("", "end", text=f"{p1:02d}  {n1}")
            for p2, n2, items in groups:
                self.tree.insert(top_id, "end", text=f"{p2:02d}  {n2}  ({len(items)})",
                                 values=(p1, p2))
        self.tree.bind("<<TreeviewSelect>>", self.on_tree)
        body.add(left, weight=1)

        right = ttk.Frame(body)
        self.title_lbl = ttk.Label(right, text="Select a group on the left", font=FONT_TITLE)
        self.title_lbl.pack(anchor="w", pady=(0, 4))
        self.sf = ScrollFrame(right)
        self.sf.pack(fill="both", expand=True)
        body.add(right, weight=4)

        bar = ttk.Frame(self, padding=(6, 4))
        bar.pack(fill="x")
        ttk.Button(bar, text="Read List", command=self.read_all_visible).pack(side="left")
        ttk.Button(bar, text="Write Changes", command=self.write_dirty).pack(side="left", padx=4)
        self.auto_var = tk.BooleanVar(value=bool(self.app.settings.get("auto_read_group")))
        ttk.Checkbutton(bar, text="Read when opening a group", variable=self.auto_var).pack(
            side="left", padx=12)
        ttk.Button(bar, text="Save Backup…", command=self.backup).pack(side="right")
        ttk.Button(bar, text="Restore Backup…", command=self.restore).pack(side="right", padx=4)

    # -- eventos de conexão -----------------------------------------------------
    def on_connected(self):
        if self.rows and self.auto_var.get() and self.cur_group:
            self.read_all_visible()

    def on_disconnected(self):
        pass

    def save_settings(self):
        self.app.settings.set("auto_read_group", bool(self.auto_var.get()))

    # -- navegação --------------------------------------------------------------
    def on_tree(self, _=None):
        sel = self.tree.selection()
        if not sel:
            return
        vals = self.tree.item(sel[0], "values")
        if not vals:                                      # nó de P1: abre/fecha
            self.tree.item(sel[0], open=not self.tree.item(sel[0], "open"))
            return
        p1, p2 = int(vals[0]), int(vals[1])
        self.show_group(p1, p2)

    def show_group(self, p1: int, p2: int):
        found = find_group(p1, p2)
        if not found:
            return
        n1, n2, items = found
        self.cur_group = (p1, p2)
        self.show_items(items, f"{p1:02d} {n1}  ›  {p2:02d} {n2}")
        if self.app.radio and self.auto_var.get():
            self.read_all_visible()

    def on_search(self):
        q = self.search_var.get().strip()
        if len(q) < 2:
            if not q and self.cur_group is None and self.rows:
                self.show_items([], "Select a group on the left")
            return
        hits = search_items(q, limit=150)
        total = len([it for it in ALL_ITEMS
                     if all(t in it.path.lower() for t in q.lower().split())])
        self.cur_group = None
        note = "  (first 150)" if total > 150 else ""
        self.show_items(hits, f"Search “{q}”: {total} items{note}", crumb=True)

    def show_items(self, items, title, crumb=False):
        for r in self.rows:
            r.alive = False
        self.sf.clear()
        self.title_lbl.config(text=title)
        self.rows = [Row(self, self.sf.inner, it, i, crumb) for i, it in enumerate(items)]

    # -- leitura ------------------------------------------------------------------
    def read_all_visible(self):
        self.read_rows(list(self.rows))

    def read_rows(self, rows: List[Row]):
        if not rows or not self.app.need_conn():
            return
        app = self.app

        def job(radio):
            n = len(rows)
            for i, row in enumerate(rows, 1):
                if app.worker.stop_event.is_set():
                    break
                app.ui(lambda r=row: r.set_status("Reading…"))
                try:
                    raw = radio.read_menu(row.item)
                except CatError as exc:
                    app.ui(lambda r=row, e=exc: r.set_status(
                        "Rejected (?)" if "rejected" in str(e) else "No response", RED))
                else:
                    app.ui(lambda r=row, v=raw: (r.show_raw(v), r.set_status("Read", GREEN)))
                app.progress(i, n, "Reading")

        app.run(job, "Read", key="menu-batch")

    # -- gravação -----------------------------------------------------------------
    def write_dirty(self):
        rows = [r for r in self.rows if r.dirty()]
        if not rows:
            messagebox.showinfo("Write", "No values have changed in this list.\n"
                                "(Read the items before changing them.)")
            return
        self.write_rows(rows)

    def write_rows(self, rows: List[Row]):
        if not self.app.need_conn():
            return
        plan = []
        for row in rows:
            try:
                plan.append((row, row.current_raw()))
            except ValueError as e:
                messagebox.showerror("Invalid Value", str(e))
                return
        lines = [f"{r.item.path1} › {r.item.path2} › {r.item.name}  →  {r.item.pretty(raw)}"
                 for r, raw in plan]
        text = "\n".join(lines[:20]) + (f"\n… and {len(lines) - 20} more" if len(lines) > 20 else "")
        if any(r.item.risky for r, _ in plan):
            text += ("\n\nWarning: CAT-x RATE / STOP BIT / TIME OUT and TUN/LIN PORT SELECT "
                     "change the CAT port configuration. You may need to reconnect using "
                     "the new baud rate after writing.")
        if not messagebox.askokcancel("Write to Radio", text):
            return
        app = self.app

        def job(radio):
            n = len(plan)
            for i, (row, raw) in enumerate(plan, 1):
                if app.worker.stop_event.is_set():
                    break
                app.ui(lambda r=row: r.set_status("Writing…"))
                try:
                    back = radio.write_menu(row.item, raw)
                except CatError:
                    app.ui(lambda r=row: r.set_status("Sent, not confirmed", AMBER))
                else:
                    if row.item.norm(back) == row.item.norm(raw):
                        app.ui(lambda r=row, v=back: (r.show_raw(v), r.set_status("Written ✓", GREEN)))
                    else:
                        app.ui(lambda r=row, v=back: (r.show_raw(v), r.set_status(f"Read back: {v}", RED)))
                app.progress(i, n, "Writing")

        app.run(job, "Write", key="menu-batch")

    # -- backup / restore -----------------------------------------------------------
    def _backup_dir(self) -> str:
        stored = self.app.settings.get("backup_dir")
        return stored if stored and Path(stored).is_dir() else str(Path.home())

    def backup(self):
        if not self.app.need_conn():
            return
        stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        path = filedialog.asksaveasfilename(
            title="Save Menu Backup", defaultextension=".json", initialdir=self._backup_dir(),
            initialfile=f"ftx1_menu_{stamp}.json", filetypes=[("JSON", "*.json")])
        if not path:
            return
        self.app.settings.set("backup_dir", str(Path(path).parent))
        app = self.app

        def job(radio):
            data, missing = {}, []
            n = len(ALL_ITEMS)
            for i, it in enumerate(ALL_ITEMS, 1):
                if app.worker.stop_event.is_set():
                    return None
                try:
                    data[it.key] = radio.read_menu(it)
                except CatError:
                    missing.append(it.key)
                app.progress(i, n, "Backup")
            payload = {
                "format": BACKUP_FORMAT,
                "created": datetime.datetime.now().isoformat(timespec="seconds"),
                "app_version": app.version,
                "firmware_main": app.fw,
                "items": data,
                "names": {k: BY_KEY[k].path for k in data},
                "no_response": missing,
            }
            with open(path, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=1)
            return len(data), len(missing)

        def then(res):
            if res:
                app.log(f"Backup saved to {path}: read {res[0]} items, {res[1]} did not respond.")

        app.run(job, "Backup", then, key="menu-batch")

    def restore(self):
        if not self.app.need_conn():
            return
        path = filedialog.askopenfilename(title="Restore Menu Backup", initialdir=self._backup_dir(),
                                          filetypes=[("JSON", "*.json")])
        if not path:
            return
        try:
            with open(path, encoding="utf-8") as f:
                payload = json.load(f)
            saved = payload["items"]
            if payload.get("format") != BACKUP_FORMAT:
                raise ValueError("Unknown backup format")
        except (OSError, ValueError, KeyError) as e:
            messagebox.showerror("Invalid Backup", str(e))
            return
        app = self.app

        def compare(radio):                               # 1) descobrir diferenças
            diffs, skipped = [], 0
            keys = [k for k in saved if k in BY_KEY and BY_KEY[k].writable]
            for i, k in enumerate(keys, 1):
                if app.worker.stop_event.is_set():
                    return None
                it = BY_KEY[k]
                if it.risky:
                    skipped += 1
                    continue
                try:
                    now = radio.read_menu(it)
                except CatError:
                    continue
                if it.norm(now) != it.norm(saved[k]):
                    diffs.append((it, now, saved[k]))
                app.progress(i, len(keys), "Comparing")
            return diffs, skipped

        def then(res):
            if res is None:
                return
            diffs, skipped = res
            if skipped:
                app.log(f"Skipped {skipped} CAT port configuration items.")
            if not diffs:
                messagebox.showinfo("Restore", "The radio already matches the backup.")
                return
            lines = [f"{it.path2} › {it.name}: {it.pretty(now)} → {it.pretty(new)}"
                     for it, now, new in diffs[:20]]
            more = f"\n… and {len(diffs) - 20} more" if len(diffs) > 20 else ""
            if not messagebox.askokcancel(
                    "Restore Backup", f"{len(diffs)} items differ from the backup:\n\n"
                    + "\n".join(lines) + more + "\n\nWrite these values to the radio?"):
                return

            def write(radio):                             # 2) gravar diferenças
                bad = 0
                for i, (it, _, new) in enumerate(diffs, 1):
                    if app.worker.stop_event.is_set():
                        break
                    try:
                        back = radio.write_menu(it, new)
                        if it.norm(back) != it.norm(new):
                            bad += 1
                            app.ui(lambda it=it, b=back: app.log(f"Warning: {it.name} read back as {b}"))
                    except CatError:
                        bad += 1
                        app.ui(lambda it=it: app.log(f"Not confirmed: {it.name}"))
                    app.progress(i, len(diffs), "Restoring")
                return bad

            app.run(write, "Restore", lambda bad: app.log(
                f"Restore finished; {bad} item(s) were not confirmed."), key="menu-batch")

        app.run(compare, "Compare with backup", then, key="menu-batch")
