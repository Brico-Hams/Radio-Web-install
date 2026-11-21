import unittest

from bricoham_remote_station.drivers.elecraft_k3s_cat import (
    ElecraftK3SDataSubmode,
    ElecraftK3SMode,
    ElecraftK3SReadCommand,
    ElecraftLegacyModel,
    build_query,
    legacy_read_commands,
    parse_bandwidth_reply,
    parse_data_submode_reply,
    parse_frequency_reply,
    parse_legacy_identification_reply,
    parse_legacy_mode_reply,
    parse_mode_reply,
    parse_option_modules_reply,
)
from bricoham_remote_station.drivers.elecraft_k4_cat import ElecraftK4ReadCommand


class ElecraftK3SCatProtocolTests(unittest.TestCase):
    def test_legacy_models_use_a_conservative_subset_and_kx2_rejects_fm(self) -> None:
        for model in ElecraftLegacyModel:
            commands = legacy_read_commands(model)
            self.assertNotIn(ElecraftK3SReadCommand.OPTION_MODULES, commands)
            self.assertNotIn(ElecraftK3SReadCommand.DATA_SUBMODE, commands)
            self.assertEqual(
                parse_legacy_mode_reply(model, ElecraftK3SReadCommand.VFO_B_MODE, b"MD$2;"),
                ElecraftK3SMode.USB,
            )
        with self.assertRaises(ValueError):
            parse_legacy_mode_reply(
                ElecraftLegacyModel.KX2, ElecraftK3SReadCommand.VFO_A_MODE, b"MD4;"
            )
        self.assertEqual(
            parse_legacy_mode_reply(
                ElecraftLegacyModel.KX3, ElecraftK3SReadCommand.VFO_A_MODE, b"MD4;"
            ),
            ElecraftK3SMode.FM,
        )
        with self.assertRaises(ValueError):
            legacy_read_commands("KX2")

    def test_queries_reject_setters_strings_and_other_model_enums(self) -> None:
        for command in ("TX", "K31", "FA", ElecraftK4ReadCommand.VFO_A_FREQUENCY):
            with self.subTest(command=command), self.assertRaises(ValueError):
                build_query(command)
        self.assertEqual(build_query(ElecraftK3SReadCommand.VFO_B_BANDWIDTH), b"BW$;")

    def test_frequency_rejects_wrong_vfo_width_multiple_frames_and_non_decimal(self) -> None:
        self.assertEqual(
            parse_frequency_reply(ElecraftK3SReadCommand.VFO_B_FREQUENCY, b"FB00014060000;"),
            14_060_000,
        )
        for frame in (
            b"FA00014060000;",
            b"FB14060000;",
            b"FB0001406000A;",
            b"FB00014060000;TX;",
            b"FB00014060000;\r\n",
            b"FB" + b"0" * 65 + b";",
        ):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_frequency_reply(ElecraftK3SReadCommand.VFO_B_FREQUENCY, frame)
        for command in ("FB", ElecraftK4ReadCommand.VFO_B_FREQUENCY):
            with self.subTest(command=command), self.assertRaises(ValueError):
                parse_frequency_reply(command, b"FB00014060000;")

    def test_mode_and_bandwidth_are_vfo_specific(self) -> None:
        self.assertEqual(
            parse_mode_reply(ElecraftK3SReadCommand.VFO_B_MODE, b"MD$9;"),
            ElecraftK3SMode.DATA_REVERSE,
        )
        self.assertEqual(
            parse_bandwidth_reply(ElecraftK3SReadCommand.VFO_A_BANDWIDTH, b"BW0270;"),
            2700,
        )
        self.assertEqual(
            parse_bandwidth_reply(ElecraftK3SReadCommand.VFO_B_BANDWIDTH, b"BW$0050;"),
            500,
        )
        for frame in (b"MD$0;", b"MD$8;", b"MD9;", b"MD$99;"):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_mode_reply(ElecraftK3SReadCommand.VFO_B_MODE, frame)
        with self.assertRaises(ValueError):
            parse_bandwidth_reply(ElecraftK3SReadCommand.VFO_A_MODE, b"MD0270;")

    def test_submode_requires_observed_data_mode(self) -> None:
        self.assertEqual(
            parse_data_submode_reply(b"DT2;", ElecraftK3SMode.DATA),
            ElecraftK3SDataSubmode.FSK_D,
        )
        for frame, mode in (
            (b"DT2;", ElecraftK3SMode.USB),
            (b"DT4;", ElecraftK3SMode.DATA),
            (b"DT2;", 6),
        ):
            with self.subTest(frame=frame, mode=mode), self.assertRaises(ValueError):
                parse_data_submode_reply(frame, mode)

    def test_legacy_id_does_not_identify_k3s_board(self) -> None:
        self.assertEqual(parse_legacy_identification_reply(b"ID017;"), "017")
        self.assertTrue(parse_option_modules_reply(b"OM APXSDFfLVR--;").k3s_rf_board)
        legacy = parse_option_modules_reply(b"OM -P-S--------;")
        self.assertFalse(legacy.k3s_rf_board)
        self.assertEqual(legacy.installed_modules, "PS")
        for frame in (b"OM APXSDFfL-V--;", b"OM APXSDFfLVR4-;", b"OM A-F-------02;"):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_option_modules_reply(frame)
        with self.assertRaises(ValueError):
            parse_legacy_identification_reply(b"ID020;")


if __name__ == "__main__":
    unittest.main()
