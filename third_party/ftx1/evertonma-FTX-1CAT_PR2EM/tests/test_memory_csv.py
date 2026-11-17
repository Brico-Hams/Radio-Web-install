# -*- coding: utf-8 -*-
"""Exportar/importar memórias em CSV (funções puras, sem Tk)."""

import pytest

from ftx1cat.cat import commands as C
from ftx1cat.ui import memory_page as M


def test_csv_roundtrip(tmp_path):
    rows = []
    seed = [(1, 7_074_000, "C", "FT8 40m", "0"), (5, 146_610_000, "4", "RPT PR", "2")]
    for n, hz, mode, tag, shift in seed:
        r = M.MemoryRow(n)
        r.radio = C.Info(f"{n:05d}", hz, 0, False, False, mode, "1", "0", shift)
        r.radio_tag = tag
        rows.append(r)
    path = tmp_path / "m.csv"
    M.write_csv(path, rows)
    text = path.read_text(encoding="utf-8")
    assert "channel,tag,frequency_hz,mode" in text and "DATA-U" in text and ",-," in text
    back = M.read_csv(path)
    assert [(n, i.frequency, i.mode, i.shift, t) for n, i, t in back] == [
        (1, 7_074_000, "C", "0", "FT8 40m"), (5, 146_610_000, "4", "2", "RPT PR")]


def test_csv_accepts_codes_and_rejects_bad_rows(tmp_path):
    path = tmp_path / "m.csv"
    path.write_text("channel,tag,frequency_hz,mode,shift\n12,Repeater,145000000,2,+\n", encoding="utf-8")
    (n, info, tag), = M.read_csv(path)
    assert (n, info.mode, info.shift, tag) == (12, "2", "1", "Repeater")
    path.write_text("channel,tag,frequency_hz,mode\n12,x,145000000,ZZZ\n", encoding="utf-8")
    with pytest.raises(ValueError):
        M.read_csv(path)
    path.write_text("channel,tag,frequency_hz,mode\n12,x,999000000,USB\n", encoding="utf-8")
    with pytest.raises(ValueError):
        M.read_csv(path)


def test_row_state():
    r = M.MemoryRow(3)
    assert r.values()[2] == "(empty)" and not r.dirty
    r.edit = C.Info("00003", 145_000_000, 0, False, False, "4", "1", "0", "0")
    assert r.dirty and r.values()[-1] == "New (not written)"
    r.radio, r.edit = r.edit, None
    assert not r.dirty and r.values()[-1] == "Read"
    r.edit_tag = "SIMPLEX"
    assert r.dirty and r.values()[1] == "SIMPLEX"
