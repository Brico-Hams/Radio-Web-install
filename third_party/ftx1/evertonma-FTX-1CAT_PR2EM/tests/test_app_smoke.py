# -*- coding: utf-8 -*-
"""
Smoke test da interface com o simulador: abre a janela, conecta, mexe nos
controles, lê/grava menu, faz backup e restore. Precisa de um display
(no Linux: `xvfb-run -a pytest`); sem display o teste é pulado.
"""

import json
import os
import sys
import time

import pytest

tk = pytest.importorskip("tkinter")

if sys.platform.startswith("linux") and not os.environ.get("DISPLAY"):
    pytest.skip("no DISPLAY available", allow_module_level=True)

from ftx1cat.cat import BY_KEY  # noqa: E402
from ftx1cat.ui.app import App  # noqa: E402
from ftx1cat.ui.settings import Settings  # noqa: E402


def pump(app, seconds=0.4):
    """Processa eventos Tk e a fila do worker por um tempo."""
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        app.update()
        time.sleep(0.01)


def wait_idle(app, seconds=3.0):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        app.update()
        if app.worker.is_idle() and app.q.empty():
            app.update()
            return
        time.sleep(0.01)
    raise AssertionError("worker did not become idle")


@pytest.fixture
def app(tmp_path):
    try:
        application = App(settings=Settings(tmp_path / "settings.json"), simulate=True)
    except tk.TclError as exc:                      # pragma: no cover
        pytest.skip(f"Tk not usable here: {exc}")
    application.withdraw()
    yield application
    try:
        application._close()
    except tk.TclError:
        pass                                        # o teste já fechou a janela


def test_connect_reads_everything(app):
    app.connect()
    wait_idle(app)
    fake = app.radio.ser
    assert "Connected" in app.conn_lbl.cget("text")
    assert app.quick.freq_lbl.cget("text") == "28.410.000 Hz"
    assert app.quick.mode_var.get() == "2"
    assert app.quick.cards["RF POWER"].value_lbl.cget("text") == "13 W"
    assert "ID" in fake.sent and "IF" in fake.sent and "AI1" in fake.sent
    assert app.status.chips["live"].cget("text") == "LIVE"


def test_band_mode_and_slider(app):
    app.connect()
    wait_idle(app)
    fake = app.radio.ser
    app.quick.select_band("13")
    wait_idle(app)
    assert app.quick.freq_lbl.cget("text") == "144.800.000 Hz"
    assert "FM" in app.quick.freq_hint.cget("text")
    assert "12.5 kHz" in app.quick.freq_hint.cget("text")

    app.quick.set_mode("1")
    wait_idle(app)
    assert fake.mode == "1"

    card = app.quick.cards["NB"]
    card.var.set(7)
    card._moved("7")
    wait_idle(app)
    assert fake.controls["NL0"] == "007"
    assert card.status.cget("text") == "Radio: Level 7"

    app.quick._knob_ticks(+3)                       # 3 passos de 1 kHz para cima
    wait_idle(app)
    assert fake.frequency == 144_800_000 + 3_000


def test_auto_information_follows_physical_dial(app):
    app.connect()
    wait_idle(app)
    fake = app.radio.ser
    fake.turn_dial(7_100_000)                         # "girou o dial": rádio emite FA/IF
    pump(app, 0.8)
    assert app.quick.freq_lbl.cget("text") == "7.100.000 Hz"
    fake.change_mode("4")                             # mudou para FM no painel
    wait_idle(app)
    pump(app, 0.6)
    assert app.quick.mode_var.get() == "4"
    assert "12.5 kHz" in app.quick.freq_hint.cget("text")   # CH STEP de FM relido
    assert "IF" in fake.sent


def test_polling_fallback_when_ai_rejected(app, monkeypatch):
    from ftx1cat.cat.simulator import FakeFTX1
    original = FakeFTX1._handle

    def no_ai(self, cmd):
        return "?;" if cmd.startswith("AI") else original(self, cmd)

    monkeypatch.setattr(FakeFTX1, "_handle", no_ai)
    app.connect()
    wait_idle(app)
    assert app.status.chips["live"].cget("text") == "POLL"
    app.radio.ser.frequency = 7_100_000               # sem AI: só o polling percebe
    pump(app, 1.5)
    assert app.quick.freq_lbl.cget("text") == "7.100.000 Hz"


def test_status_bar_and_meters(app):
    app.connect()
    wait_idle(app)
    fake = app.radio.ser
    pump(app, 0.6)
    assert app.status.chips["tx"].cget("text") == "RX"
    assert app.status.meters["S"].value.cget("text") == "120"
    fake.meters["5"], fake.meters["6"] = 200, 30
    fake.set_tx(True)                                  # quadro RI via AI + tick lê RM
    pump(app, 0.8)
    assert app.status.chips["tx"].cget("text") == "TX"
    assert app.transmitting
    assert app.status.meters["5"].value.cget("text") == "200"
    assert app.status.meters["6"].value.cget("text") == "30"
    assert app.status.meters["S"].value.cget("text") == "—"
    fake.set_tx(False)
    pump(app, 0.8)
    assert app.status.chips["tx"].cget("text") == "RX"


def test_rf_power_follows_head(app):
    app.connect()
    wait_idle(app)
    card = app.quick.cards["RF POWER"]
    assert float(card.scale.cget("to")) == 100 and "SPA-1" in card.cget("text")
    card.var.set(50)
    card._moved("50")
    wait_idle(app)
    assert app.radio.ser.watts == 50 and "PC2050" in app.radio.ser.sent


def test_rf_power_field_head(tmp_path):
    from ftx1cat.cat.simulator import FakeFTX1
    application = App(settings=Settings(tmp_path / "s.json"), simulate=True)
    application.withdraw()
    try:
        application._open_port = lambda: FakeFTX1(head="1")
        application.connect()
        wait_idle(application)
        card = application.quick.cards["RF POWER"]
        assert float(card.scale.cget("to")) == 10 and "field head" in card.cget("text")
        assert card.value_lbl.cget("text") == "8 W"
    finally:
        application._close()


def test_func_parameter_roundtrip(app):
    app.connect()
    wait_idle(app)
    app.quick.select_func("7")                        # MIC GAIN
    wait_idle(app)
    assert app.quick.func_status.cget("text") == "Radio: 50"
    app.quick.func_slider_var.set(60)
    app.quick._func_slider_moved("60")
    wait_idle(app)
    assert app.radio.ser.controls["MG"] == "060"


def test_menu_page_read_and_write(app, monkeypatch):
    app.connect()
    wait_idle(app)
    app.menu.show_group(3, 2)                         # BAND-SCAN
    wait_idle(app)
    rows = {r.item.name: r for r in app.menu.rows}
    assert rows["BAND STACK"].status.cget("text") == "Read"
    row = rows["BAND STACK"]
    row.var.set("0 – OFF")
    assert row.dirty()
    assert "Changed" in row.status.cget("text")
    monkeypatch.setattr("ftx1cat.ui.menu_page.messagebox.askokcancel", lambda *a, **k: True)
    app.menu.write_dirty()
    wait_idle(app)
    assert app.radio.ser.menu["030202"] == "0"
    assert row.status.cget("text") == "Written ✓"


def test_search_and_rejected_item(app):
    app.connect()
    wait_idle(app)
    app.menu.search_var.set("ch step")
    pump(app, 0.2)
    assert {r.item.name for r in app.menu.rows} >= {"CH STEP", "AM CH STEP", "FM CH STEP"}
    assert app.menu.title_lbl.cget("text").startswith("Search")
    app.menu.search_var.set("")
    pump(app, 0.2)
    assert app.menu.rows == []


def test_backup_and_restore(app, tmp_path, monkeypatch):
    app.connect()
    wait_idle(app)
    path = tmp_path / "bk.json"
    monkeypatch.setattr("ftx1cat.ui.menu_page.filedialog.asksaveasfilename", lambda **k: str(path))
    app.menu.backup()
    wait_idle(app, 10)
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["format"] == "ftx1-menu-backup-1"
    assert len(data["items"]) == len(BY_KEY)
    assert data["items"]["030202"] == "1"

    # muda algo no "rádio" e restaura
    app.radio.ser.menu["030202"] = "0"
    app.radio.ser.menu["030105"] = "0"                # CAT-1 RATE: arriscado, deve ser pulado
    monkeypatch.setattr("ftx1cat.ui.menu_page.filedialog.askopenfilename", lambda **k: str(path))
    asked = {}

    def ok(title, text, **k):
        asked["text"] = text
        return True

    monkeypatch.setattr("ftx1cat.ui.menu_page.messagebox.askokcancel", ok)
    app.menu.restore()
    wait_idle(app, 10)
    wait_idle(app, 10)
    assert "1 items differ" in asked["text"]
    assert app.radio.ser.menu["030202"] == "1"
    assert app.radio.ser.menu["030105"] == "0"        # não tocou no CAT-1 RATE


def test_disconnect_and_settings_saved(app, tmp_path):
    app.connect()
    wait_idle(app)
    app.disconnect()
    assert app.radio is None
    assert app.conn_lbl.cget("text") == "Disconnected"
    app._close()
    saved = json.loads((tmp_path / "settings.json").read_text(encoding="utf-8"))
    assert saved["port"] == "SIM"
    assert saved["baud"] == "38400"


def test_memory_page_read_edit_write_recall(app, monkeypatch, tmp_path):
    from ftx1cat.cat import commands as C
    app.connect()
    wait_idle(app)
    page = app.memories
    page.from_var.set(1)
    page.to_var.set(6)
    page.read_range()
    wait_idle(app, 10)
    assert page.tree.item("1", "values")[1] == "FT8 40m"
    assert page.tree.item("4", "values")[2] == "(empty)"
    assert "4 in use" in page.status.cget("text")

    # edita o canal 4 (vazio) como se fosse pelo diálogo
    row = page.rows[4]
    page._edited(row, C.Info("00004", 145_500_000, 0, False, False, "4", "1", "0", "1"), "NOVO")
    assert page.tree.item("4", "values")[-1] == "New (not written)"
    monkeypatch.setattr("ftx1cat.ui.memory_page.messagebox.askokcancel", lambda *a, **k: True)
    page.write_dirty()
    wait_idle(app, 10)
    fake = app.radio.ser
    assert fake.memories[4].frequency == 145_500_000 and fake.tags[4] == "NOVO"
    assert page.tree.item("4", "values")[-1] == "Read"

    # recall
    page.tree.selection_set("4")
    page.recall_selected()
    wait_idle(app)
    assert app.quick.freq_lbl.cget("text") == "145.500.000 Hz"
    assert "MEM 4" in app.quick.freq_hint.cget("text")

    # export / import
    out = tmp_path / "mem.csv"
    monkeypatch.setattr("ftx1cat.ui.memory_page.filedialog.asksaveasfilename", lambda **k: str(out))
    page.export_csv()
    assert "FT8 40m" in out.read_text(encoding="utf-8")
    out.write_text("channel,tag,frequency_hz,mode\n7,CSV,7100000,LSB\n", encoding="utf-8")
    monkeypatch.setattr("ftx1cat.ui.memory_page.filedialog.askopenfilename", lambda **k: str(out))
    page.import_csv()
    assert page.tree.item("7", "values")[1] == "CSV" and page.rows[7].dirty

    # store VFO no canal 8
    page._row(8)
    page._refresh_row(page.rows[8])
    page.tree.selection_set("8")
    page.store_vfo()
    wait_idle(app)
    assert page.rows[8].edit.frequency == 145_500_000
