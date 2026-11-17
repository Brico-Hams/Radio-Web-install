# -*- coding: utf-8 -*-
"""Comandos CAT fora do menu EX: frequência, modos, bandas, controles."""

import pytest

from ftx1cat.cat import BY_KEY
from ftx1cat.cat import commands as C


@pytest.mark.parametrize("digits, hz", [
    ("1448", 144_800_000),       # MHz com uma decimal
    ("27555", 27_555_000),       # kHz (275.55 MHz cai fora da faixa de RX)
    ("7100", 7_100_000),         # 4 dígitos -> 710.0 MHz fora da faixa -> completa à direita
    ("145", 145_000_000),
    ("433500", 433_500_000),
    ("014250000", 14_250_000),   # 9 dígitos completos
])
def test_frequency_from_digits(digits, hz):
    assert C.frequency_from_digits(digits) == hz


def test_frequency_from_digits_rejects_empty():
    with pytest.raises(ValueError):
        C.frequency_from_digits("abc")


@pytest.mark.parametrize("digits, masked", [
    ("1448", "144.8"), ("27555", "27.555"), ("145", "145"), ("1", "1"),
    ("014250000", "014.250.000"), ("", ""),
])
def test_mask_frequency_digits(digits, masked):
    assert C.mask_frequency_digits(digits) == masked


def test_format_and_clamp():
    assert C.format_frequency(144_800_000) == "144.800.000"
    assert C.clamp_frequency(10) == C.FREQ_MIN_HZ
    assert C.clamp_frequency(10**12) == C.FREQ_MAX_HZ
    assert C.in_rx_range(200_000_000) is False
    assert C.in_rx_range(433_000_000) is True


def test_frequency_commands():
    assert C.set_frequency_cmd(14_250_000) == "FA014250000;"
    assert C.parse_frequency("FA014250000;") == 14_250_000
    with pytest.raises(ValueError):
        C.set_frequency_cmd(1)


def test_mode_commands():
    assert C.set_mode_cmd("2") == "MD02;"
    assert C.parse_mode("MD02;") == "2"
    assert C.mode_name("2") == "USB"
    assert C.mode_name("Z") == "—"
    with pytest.raises(ValueError):
        C.set_mode_cmd("Z")
    assert len({m.code for m in C.MODES}) == len(C.MODES)


def test_band_commands():
    assert C.select_band_cmd("13") == "BS013;"
    assert C.select_band_cmd("11m") == "FA027555000;"
    assert [b.label for b in C.BANDS][:2] == ["160m", "80m"]


def test_ch_step_item_follows_mode_family():
    assert C.ch_step_item_for_mode("2").name == "CH STEP"        # USB
    assert C.ch_step_item_for_mode("5").name == "AM CH STEP"     # AM
    assert C.ch_step_item_for_mode("4").name == "FM CH STEP"     # FM
    assert C.ch_step_item_for_mode("H").name == "FM CH STEP"     # C4FM usa passo de FM
    assert C.ch_step_item_for_mode(None).name == "CH STEP"
    fm = BY_KEY["030606"]
    assert C.ch_step_khz(fm, "3") == 12.5
    assert C.nearest_ch_step_code(fm, 12.0) == "3"
    assert C.nearest_ch_step_code(fm, 100) == "5"


def test_quick_control_encoding():
    assert C.RF_POWER.encode(13) == "PC2013;"
    assert C.RF_POWER.value_from_frame("PC2013;") == 13
    assert C.RF_POWER.display(13) == "13 W"
    assert C.D_LEVEL.encode(-3.5) == "SS04-03.5;"
    assert C.D_LEVEL.value_from_frame("SS04+11.0;") == 11.0
    assert C.D_PEAK.encode(4) == "SS0130000;"
    assert C.D_PEAK.value_from_frame("SS0130000;") == 4
    assert C.NB.encode(7) == "NL0007;"
    assert C.NB.display(0) == "OFF"
    assert C.DNR.encode(7) == "RL007;"


def test_func_parameter_encoding():
    f = C.FUNC_PARAMETERS
    assert f["G"].value_from_frame("KP040;") == 700
    assert f["G"].encode(700) == "KP40;"
    assert f["B"].display(0) == "30 ms"
    assert f["B"].display(10) == "700 ms"
    assert f["3"].value_from_frame("SS03A;") == 11
    assert f["3"].encode(11) == "SS03A;"
    assert f["4"].da_slot == 2 and f["4"].encode is None
    assert C.da_set_cmd("DA001010;", 2, 7) == "DA000710;"
    assert C.da_set_cmd("DA001010;", 4, 3) == "DA001003;"
    assert {code for code, _ in C.FUNC_BUTTONS} == set(f)


def test_parse_info_roundtrip():
    frame = "IF00000014250000+000000200000;"
    info = C.parse_info(frame)
    assert (info.frequency, info.mode, info.vfo_mem, info.channel) == (14_250_000, "2", "0", "00000")
    assert info.encode("IF") == frame
    mem = C.Info("00123", 146_610_000, -150, True, False, "4", "1", "1", "2")
    back = C.parse_info(mem.encode("MR"))
    assert back == mem
    assert len(mem.encode("MW")) == C.INFO_LEN
    with pytest.raises(ValueError):
        C.parse_info("IF123;")


def test_parse_status_and_meters():
    st = C.parse_status("RI01010011;")
    assert st.hi_swr and st.tx == "1" and st.transmitting and st.scan == "1" and st.busy
    assert not st.tuning and st.recording == "0"
    with pytest.raises(ValueError):
        C.parse_status("RI0;")
    assert C.parse_smeter("SM0120;") == 120
    assert C.parse_meter("RM6030000;") == ("6", 30)
    assert C.read_meter_cmd("5") == "RM5;"
    with pytest.raises(ValueError):
        C.read_meter_cmd("9")


def test_rf_power_head():
    assert C.parse_pc("PC1008;") == ("1", 8)
    assert C.set_rf_power_cmd("1", 10) == "PC1010;"
    assert C.set_rf_power_cmd("2", 100) == "PC2100;"
    with pytest.raises(ValueError):
        C.set_rf_power_cmd("1", 50)
    assert C.auto_information_cmd(True) == "AI1;" and C.auto_information_cmd(False) == "AI0;"


def test_memory_commands():
    assert C.read_memory_cmd(7) == "MR00007;"
    assert C.read_tag_cmd(999) == "MT00999;"
    assert C.write_tag_cmd(1, "FT8 20m") == "MT00001FT8 20m     ;"
    assert C.write_tag_cmd(1, "x" * 20) == "MT00001" + "x" * 12 + ";"
    assert C.parse_tag("MT00001FT8 20m     ;") == (1, "FT8 20m")
    assert C.select_channel_cmd(12) == "MC000012;"
    assert C.vfo_memory_cmd(True) == "VM011;" and C.vfo_memory_cmd(False) == "VM000;"
    with pytest.raises(ValueError):
        C.channel_code(0)
    with pytest.raises(ValueError):
        C.write_tag_cmd(1, "ação")
