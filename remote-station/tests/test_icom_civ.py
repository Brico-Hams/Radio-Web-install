import unittest

from bricoham_remote_station.drivers.icom_civ import (
    IcomCivMode,
    IcomCivModel,
    IcomReadCommand,
    build_power_set,
    build_query,
    parse_ack,
    parse_frequency_reply,
    parse_mode_reply,
)


class IcomPowerTests(unittest.TestCase):
    def test_ic705_power_frames_follow_the_guide(self) -> None:
        self.assertEqual(build_power_set(IcomCivModel.IC_705, False), bytes.fromhex("FEFEA4E01800FD"))
        self.assertEqual(build_power_set(IcomCivModel.IC_705, True), bytes.fromhex("FEFEA4E01801FD"))
        self.assertTrue(parse_ack(IcomCivModel.IC_705, bytes.fromhex("FEFEE0A4FBFD")))
        self.assertFalse(parse_ack(IcomCivModel.IC_705, bytes.fromhex("FEFEE0A4FAFD")))

    def test_other_models_and_non_boolean_are_refused(self) -> None:
        with self.assertRaises(ValueError):
            build_power_set(IcomCivModel.IC_7300, False)
        with self.assertRaises(ValueError):
            build_power_set(IcomCivModel.IC_705, 0)
        with self.assertRaises(ValueError):
            parse_ack(IcomCivModel.IC_705, bytes.fromhex("FEFEE0A4FCFD"))


class IcomCivProtocolTests(unittest.TestCase):
    def test_builds_queries_with_each_documented_default_address(self) -> None:
        expected_addresses = {
            IcomCivModel.IC_705: 0xA4,
            IcomCivModel.IC_7100: 0x88,
            IcomCivModel.IC_7200: 0x76,
            IcomCivModel.IC_7300: 0x94,
            IcomCivModel.IC_7300_MK2: 0xB6,
            IcomCivModel.IC_7410: 0x80,
            IcomCivModel.IC_7600: 0x7A,
            IcomCivModel.IC_7610: 0x98,
            IcomCivModel.IC_7700: 0x74,
            IcomCivModel.IC_7760: 0xB2,
            IcomCivModel.IC_7850: 0x8E,
            IcomCivModel.IC_7851: 0x8E,
            IcomCivModel.IC_905: 0xAC,
            IcomCivModel.IC_9100: 0x7C,
            IcomCivModel.IC_9700: 0xA2,
            IcomCivModel.IC_R8600: 0x96,
        }
        for model, address in expected_addresses.items():
            with self.subTest(model=model):
                self.assertEqual(
                    build_query(model, IcomReadCommand.FREQUENCY),
                    bytes((0xFE, 0xFE, address, 0xE0, 0x03, 0xFD)),
                )

    def test_builds_only_documented_frequency_and_mode_queries(self) -> None:
        self.assertEqual(
            build_query(IcomCivModel.IC_7300, IcomReadCommand.FREQUENCY),
            b"\xfe\xfe\x94\xe0\x03\xfd",
        )
        self.assertEqual(
            build_query(IcomCivModel.IC_7300_MK2, IcomReadCommand.MODE),
            b"\xfe\xfe\xb6\xe0\x04\xfd",
        )
        self.assertEqual(
            build_query(IcomCivModel.IC_7100, IcomReadCommand.MODE),
            b"\xfe\xfe\x88\xe0\x04\xfd",
        )
        self.assertEqual(
            build_query(IcomCivModel.IC_7200, IcomReadCommand.FREQUENCY),
            b"\xfe\xfe\x76\xe0\x03\xfd",
        )
        with self.assertRaises(ValueError):
            build_query("IC-7800", IcomReadCommand.FREQUENCY)
        with self.assertRaises(ValueError):
            build_query(IcomCivModel.IC_7300, 0x05)

    def test_frequency_reply_decodes_five_little_endian_bcd_bytes(self) -> None:
        self.assertEqual(
            parse_frequency_reply(
                IcomCivModel.IC_7300,
                b"\xfe\xfe\xe0\x94\x03\x00\x40\x07\x14\x00\xfd",
            ),
            14_074_000,
        )

    def test_new_model_replies_are_bound_to_the_documented_addresses(self) -> None:
        for model, address in (
            (IcomCivModel.IC_7100, 0x88),
            (IcomCivModel.IC_7200, 0x76),
        ):
            with self.subTest(model=model):
                self.assertEqual(
                    parse_frequency_reply(
                        model,
                        bytes((0xFE, 0xFE, 0xE0, address, 0x03, 0, 0x40, 0x07, 0x14, 0, 0xFD)),
                    ),
                    14_074_000,
                )
                self.assertEqual(
                    parse_mode_reply(model, bytes((0xFE, 0xFE, 0xE0, address, 0x04, 0x01, 0xFD))),
                    IcomCivMode.USB,
                )

    def test_frequency_reply_rejects_bad_addresses_commands_lengths_and_bcd(self) -> None:
        valid = b"\xfe\xfe\xe0\x94\x03\x00\x40\x07\x14\x00\xfd"
        invalid_frames = (
            b"\xfe\xfe\xe0\x98\x03\x00\x40\x07\x14\x00\xfd",
            b"\xfe\xfe\xe0\x94\x04\x00\x40\x07\x14\x00\xfd",
            b"\xfd\xfe\xe0\x94\x03\x00\x40\x07\x14\x00\xfd",
            b"\xfe\xfe\x94\x94\x03\x00\x40\x07\x14\x00\xfd",
            b"\xfe\xfe\xe0\x94\x03\x00\x40\x07\x14\x00",
            b"\xfe\xfe\xe0\x94\x03\x00\x40\x07\x1a\x00\xfd",
            valid + b"\xfd",
        )
        for frame in invalid_frames:
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_frequency_reply(IcomCivModel.IC_7300, frame)
        with self.assertRaises(ValueError):
            parse_frequency_reply("IC-7300", valid)

    def test_mode_reply_accepts_documented_mode_with_optional_filter(self) -> None:
        self.assertEqual(
            parse_mode_reply(IcomCivModel.IC_705, b"\xfe\xfe\xe0\xa4\x04\x17\x02\xfd"),
            IcomCivMode.DV,
        )
        self.assertEqual(
            parse_mode_reply(IcomCivModel.IC_R8600, b"\xfe\xfe\xe0\x96\x04\x06\xfd"),
            IcomCivMode.WFM,
        )

    def test_mode_reply_rejects_undocumented_mode_filter_and_frame(self) -> None:
        for frame in (
            b"\xfe\xfe\xe0\x94\x04\x09\x02\xfd",
            b"\xfe\xfe\xe0\x94\x04\x01\x04\xfd",
            b"\xfe\xfe\xe0\x94\x04\x01\x02\x03\xfd",
            b"\xfe\xfe\x94\xe0\x04\x01\x02\xfd",
        ):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_mode_reply(IcomCivModel.IC_7300, frame)
        with self.assertRaises(ValueError):
            parse_mode_reply(IcomCivModel.IC_7300, "CI-V")


if __name__ == "__main__":
    unittest.main()
