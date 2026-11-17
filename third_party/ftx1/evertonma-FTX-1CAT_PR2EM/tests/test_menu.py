# -*- coding: utf-8 -*-
"""Tabela do menu EX: consistência e codificação de valores."""

import pytest

from ftx1cat.cat import ALL_ITEMS, BY_KEY, MENU, find_group, search_items


def test_keys_are_unique_and_six_digits():
    keys = [it.key for it in ALL_ITEMS]
    assert len(keys) == len(set(keys))
    assert all(len(k) == 6 and k.isdigit() for k in keys)


def test_every_item_has_path():
    for it in ALL_ITEMS:
        assert it.path1 and it.path2, it.key


def test_enum_codes_have_declared_digits():
    for it in ALL_ITEMS:
        if it.kind == "enum":
            for code, _label in it.opts:
                assert len(code) == it.digits, f"{it.path}: code {code!r}"


def test_int_items_fit_in_digits():
    for it in ALL_ITEMS:
        if it.kind == "int":
            assert len(str(it.hi)) <= it.digits, it.path
            assert it.lo <= it.hi


def test_encode_decode_roundtrip_int():
    it = BY_KEY["010104"]                       # AGC FAST DELAY 20-4000 step 20, 4 digits
    assert it.encode(20) == "0020"
    assert it.encode("4000") == "4000"
    assert it.decode("0020") == 20
    with pytest.raises(ValueError):
        it.encode(25)                            # fora do passo
    with pytest.raises(ValueError):
        it.encode(5000)                          # fora da faixa


def test_encode_signed():
    it = BY_KEY["010101"]                       # AF TREBLE GAIN -20..10
    assert it.encode(-5) == "-05"
    assert it.encode(0) == "+00"
    assert it.norm("-00") == it.norm("+00") == 0
    with pytest.raises(ValueError):
        it.encode(11)


def test_encode_enum_and_pretty():
    it = BY_KEY["030202"]                       # BAND STACK OFF/ON
    assert it.encode("1") == "1"
    assert it.pretty("1") == "1 - ON"
    assert "not in table" in it.pretty("9")
    with pytest.raises(ValueError):
        it.encode("2")


def test_readonly_items_cannot_encode():
    ro = next(it for it in ALL_ITEMS if it.kind == "ro")
    assert not ro.writable
    with pytest.raises(ValueError):
        ro.encode("1")


def test_risky_items():
    assert BY_KEY["030105"].risky               # CAT-1 RATE
    assert BY_KEY["030103"].risky               # TUN/LIN PORT SELECT
    assert not BY_KEY["030101"].risky           # BEEP LEVEL


def test_find_group_and_search():
    n1, n2, items = find_group(3, 6)
    assert (n1, n2) == ("OPERATION SETTING", "KEY/DIAL")
    assert any(it.name == "CH STEP" for it in items)
    assert find_group(99, 1) is None
    hits = search_items("ch step")
    assert {it.name for it in hits} >= {"CH STEP", "AM CH STEP", "FM CH STEP"}
    assert search_items("") == []


def test_menu_tree_shape():
    assert [p1 for p1, _, _ in MENU] == [1, 2, 3, 4, 5, 6, 7, 8, 9, 11]
    assert len(ALL_ITEMS) > 350
