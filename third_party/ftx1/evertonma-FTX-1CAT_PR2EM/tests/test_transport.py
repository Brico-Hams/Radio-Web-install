# -*- coding: utf-8 -*-
"""Camada serial testada contra o simulador."""

import pytest

from ftx1cat.cat import BY_KEY, CatError, CatRejected, Item, Radio
from ftx1cat.cat import commands as C
from ftx1cat.cat.simulator import FakeFTX1


@pytest.fixture
def fake():
    return FakeFTX1()


@pytest.fixture
def radio(fake):
    return Radio(fake, timeout=0.2, gap=0)


def test_identify_and_firmware(radio):
    assert radio.identify() == "0840"
    assert radio.firmware() == "0113"


def test_frequency_and_mode(radio, fake):
    assert radio.read_frequency() == 28_410_000
    assert radio.set_frequency(14_250_000) == 14_250_000
    assert fake.sent[-2] == "FA014250000"
    assert radio.set_mode("1") == "1"


def test_band_select_uses_band_stack(radio):
    radio.select_band("13")
    freq, mode, item, raw, khz, info = radio.read_tuning()
    assert (freq, mode) == (144_800_000, "4")
    assert item.name == "FM CH STEP" and khz == 12.5


def test_band_11m_tunes_directly(radio):
    radio.select_band("11m")
    assert radio.read_frequency() == C.FREQ_11M_DX_CALL_HZ


def test_menu_read_write(radio):
    it = BY_KEY["010101"]
    assert radio.read_menu(it) == "+00"
    assert radio.write_menu(it, it.encode(-7)) == "-07"


def test_controls(radio):
    assert radio.read_control(C.RF_POWER) == 13
    assert radio.set_control(C.RF_POWER, 42) == 42
    assert radio.set_control(C.FUNC_PARAMETERS["4"], 5) == 5      # CONTRAST via DA
    assert radio.read_control(C.FUNC_PARAMETERS["5"]) == 10       # DIMMER intacto
    with pytest.raises(ValueError):
        radio.set_control(C.Control("x", "x", "XX;", "XX", 0, 1, 1, int, None, str), 1)


def test_rejected_command_raises_fast(radio):
    with pytest.raises(CatRejected):
        radio.query("ZZ;", "ZZ")
    with pytest.raises(CatRejected):
        radio.read_menu(Item(9, 9, 9, "does not exist", "ro", 1))
    with pytest.raises(CatRejected):
        radio.write_menu(BY_KEY["010101"], "+99")          # fora da faixa: rádio recusa


def test_silent_radio_times_out(radio, fake):
    fake.silent = True
    with pytest.raises(CatError) as exc:
        radio.identify()
    assert "no response" in str(exc.value)


def test_logger_receives_tx_rx(fake):
    seen = []
    radio = Radio(fake, timeout=0.2, gap=0, logger=lambda d, t: seen.append((d, t)))
    radio.identify()
    assert seen == [("TX", "ID;"), ("RX", "ID0840;")]


def test_unexpected_frames_are_skipped(fake, radio):
    fake.prepend = b"AI1;MD02;"                # informação automática antes da resposta
    assert radio.read_frequency() == 28_410_000


def test_auto_information_and_unsolicited_frames(fake):
    got = []
    radio = Radio(fake, timeout=0.2, gap=0, on_frame=got.append)
    assert radio.set_auto_information(True) and radio.auto_information
    fake.turn_dial(7_100_000)
    fake.set_tx(True)
    radio.pump()
    assert got == ["FA007100000;", "IF00000007100000+000000200000;", "RI00010000;"]
    got.clear()
    fake.turn_dial(7_200_000)                   # chega antes de uma leitura: não é perdido
    assert radio.read_smeter() == 120
    assert "FA007200000;" in got
    assert radio.set_auto_information(False) and not radio.auto_information


def test_auto_information_rejected(fake, monkeypatch):
    original = fake._handle
    monkeypatch.setattr(fake, "_handle", lambda cmd: "?;" if cmd.startswith("AI") else original(cmd))
    radio = Radio(fake, timeout=0.2, gap=0)
    assert radio.set_auto_information(True) is False
    assert radio.auto_information is False


def test_info_status_meters(radio, fake):
    info = radio.read_info()
    assert info.frequency == 28_410_000 and info.mode == "2" and info.vfo_mem == "0"
    assert radio.read_status().tx == "0"
    fake.set_tx(True)
    assert radio.read_status().transmitting
    fake.meters["5"] = 77
    assert radio.read_meter("5") == 77
    assert radio.read_smeter() == 120
    assert radio.firmwares()[0] == ("MAIN", "0113")


def test_rf_power_with_head(radio, fake):
    assert radio.read_rf_power() == ("2", 13)
    assert radio.set_rf_power("2", 42) == ("2", 42)
    with pytest.raises(CatRejected):
        radio.set_rf_power("1", 8)             # rádio está com SPA-1
    field = Radio(FakeFTX1(head="1"), timeout=0.2, gap=0)
    assert field.read_rf_power() == ("1", 8)
    with pytest.raises(ValueError):
        field.set_rf_power("1", 50)


def test_memories(radio, fake):
    assert radio.read_memory(1).frequency == 7_074_000
    assert radio.read_tag(1) == "FT8 40m"
    assert radio.read_memory(4) is None and radio.read_tag(4) == ""
    info = C.Info("00010", 14_100_000, 0, False, False, "2", "1", "0", "0")
    assert radio.write_memory(info, "TESTE") == info
    assert radio.read_tag(10) == "TESTE"
    radio.recall_memory(10)
    now = radio.read_info()
    assert (now.channel, now.frequency, now.vfo_mem) == ("00010", 14_100_000, "1")
    with pytest.raises(ValueError):
        radio.read_memory(1000)
