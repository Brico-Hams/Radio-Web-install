import os
import sys
import time
import unittest
from unittest.mock import patch

from bricoham_station_agent.cat import CatConfig, CatError, SerialCat


class ScriptedPort:
    def __init__(self, response: bytes) -> None:
        self.response = response
        self.buffer = bytearray()
        self.writes: list[bytes] = []
        self.port = None
        self.rts = True
        self.dtr = True
        self.closed = False

    def open(self) -> None:
        if self.rts or self.dtr:
            raise AssertionError("Control lines must be inactive before open")

    def close(self) -> None:
        self.closed = True

    def reset_input_buffer(self) -> None:
        self.buffer.clear()

    def write(self, data: bytes) -> int:
        self.writes.append(data)
        self.buffer.extend(self.response)
        return len(data)

    def read(self, size: int = 1) -> bytes:
        result = bytes(self.buffer[:size])
        del self.buffer[:size]
        if not result:
            time.sleep(0.002)
        return result


class SerialCatTests(unittest.TestCase):
    def test_icom_scope_stream_enables_reads_and_always_disables_output(self) -> None:
        # Burst layout from third_party/ftx1/rigplane-rigplane-core docs/api/scope.md; commands 27 11 01 / 27 11 00.
        burst = bytes.fromhex("fefee094270000" "0101" "01" "0040071400" "0050020000" "00" "0908" "fd")
        port = ScriptedPort(burst)
        with patch("bricoham_station_agent.cat.serial.Serial", return_value=port):
            cat = SerialCat(CatConfig("IC-7300", "COM7", 19200))
            stream = cat.scope_stream(0.3, 10)
            frame = next(stream)
            self.assertEqual((frame.start_hz, frame.end_hz, frame.pixels), (14074000, 25000, b"\x09\x08"))
            stream.close()
            self.assertEqual(
                port.writes,
                [bytes.fromhex("fefe94e02710" "01fd"), bytes.fromhex("fefe94e02711" "01fd"), bytes.fromhex("fefe94e02711" "00fd")],
            )
            with self.assertRaises(ValueError):
                next(cat.scope_stream(31, 1))
            self.assertTrue(cat._lock.acquire(blocking=False))
            cat._lock.release()
            cat.close()

    def test_icom_scope_models_use_their_own_address_and_skip_sub_receiver_frames(self) -> None:
        # Addresses from icom_civ._RADIO_ADDRESSES; receiver byte 00 = main scope (IC-705 guide p.28).
        for model, address in (("IC-705", 0xA4), ("IC-7300MK2", 0xB6), ("IC-7610", 0x98), ("IC-905", 0xAC), ("IC-9700", 0xA2)):
            sub = bytes((0xFE, 0xFE, 0xE0, address, 0x27, 0x00, 0x01, 0x01, 0x01, 0x01)) + bytes.fromhex("0040071400" "0050020000" "00" "ff") + b"\xfd"
            main = bytes((0xFE, 0xFE, 0xE0, address, 0x27, 0x00, 0x00, 0x01, 0x01, 0x01)) + bytes.fromhex("0040071400" "0050020000" "00" "07") + b"\xfd"
            port = ScriptedPort(sub + main)
            with patch("bricoham_station_agent.cat.serial.Serial", return_value=port):
                cat = SerialCat(CatConfig(model, "COM7", 115200))
                stream = cat.scope_stream(0.3, 10)
                self.assertEqual(next(stream).pixels, b"\x07", model)
                stream.close()
                # Request frame layout: FE FE <radio> <controller E0> cmd...
                self.assertEqual(port.writes[0][2], address)
                self.assertEqual(port.writes[0][4:6], b"\x27\x10")
                self.assertEqual(port.writes[-1][4:7], b"\x27\x11\x00")
                cat.close()

    def test_scope_is_refused_for_radios_without_a_sourced_scope(self) -> None:
        cat = SerialCat(CatConfig("K4", "COM7", 38400))
        with self.assertRaises(CatError):
            next(cat.scope_stream(1, 1))

    def test_kx2_serial_profile_reads_without_inheriting_k3s_options_or_fm(self) -> None:
        port = ScriptedPort(b"MD$2;")
        with patch("bricoham_station_agent.cat.serial.Serial", return_value=port):
            cat = SerialCat(CatConfig("KX2", "COM7", 38400))
            self.assertEqual(cat.read("MD$")["mode_code"], 2)
            self.assertEqual(port.writes, [b"MD$;"])
            with self.assertRaises(ValueError):
                cat.read("OM")
            port.response = b"MD4;"
            with self.assertRaises(CatError):
                cat.read("MD")
            self.assertFalse(port.rts)
            self.assertFalse(port.dtr)
            cat.close()

    def test_fragmented_reply_echo_and_inactive_control_lines(self) -> None:
        port = ScriptedPort(b"FA;FA00014074000;")
        with patch("bricoham_station_agent.cat.serial.Serial", return_value=port) as factory:
            cat = SerialCat(CatConfig("K4", "COM7", 38400))
            factory.assert_not_called()
            result = cat.read("FA")
            self.assertEqual(result["frequency_hz"], 14_074_000)
            self.assertFalse(result["data_is_simulated"])
            self.assertEqual(result["status"], "experimental")
            self.assertEqual(port.writes, [b"FA;"])
            self.assertIsNone(factory.call_args.kwargs["port"])
            self.assertTrue(factory.call_args.kwargs["exclusive"])
            for flag in ("xonxoff", "rtscts", "dsrdtr"):
                self.assertFalse(factory.call_args.kwargs[flag])
            cat.close()
            self.assertTrue(port.closed)

    def test_refused_exclusive_open_fails_without_writing_or_retrying(self) -> None:
        class BusyPort(ScriptedPort):
            def open(self) -> None:
                super().open()
                raise PermissionError("locked")

        port = BusyPort(b"FA00014074000;")
        with (
            patch("bricoham_station_agent.cat.serial.Serial", return_value=port) as factory,
            self.assertLogs("bricoham.station_agent.cat", level="WARNING"),
        ):
            cat = SerialCat(CatConfig("K4", "COM7", 38400))
            with self.assertRaisesRegex(CatError, "^cat_io_failed$"):
                cat.read("FA")
            self.assertEqual(port.writes, [])
            self.assertTrue(port.closed)
            self.assertEqual(factory.call_count, 1)

    @unittest.skipUnless(
        sys.platform.startswith("linux") or sys.platform == "darwin",
        "PTY and pyserial advisory lock test requires Linux or macOS",
    )
    def test_cooperating_agents_cannot_open_same_posix_port(self) -> None:
        import pty

        master, slave = pty.openpty()
        first = SerialCat(CatConfig("K4", os.ttyname(slave), 38400))
        second = SerialCat(CatConfig("K4", os.ttyname(slave), 38400))
        try:
            first._open()
            with self.assertLogs("bricoham.station_agent.cat", level="WARNING"):
                with self.assertRaisesRegex(CatError, "^cat_io_failed$"):
                    second.read("FA")
            first.close()
            second._open()
        finally:
            first.close()
            second.close()
            os.close(slave)
            os.close(master)

    def test_binary_civ_and_model_specific_decoding(self) -> None:
        port = ScriptedPort(bytes.fromhex("FEFE94E003FD FEFEE094030040071400FD"))
        with patch("bricoham_station_agent.cat.serial.Serial", return_value=port):
            cat = SerialCat(CatConfig("IC-7300", "COM8", 19200))
            self.assertEqual(cat.read("03")["frequency_hz"], 14_074_000)
            self.assertEqual(port.writes, [bytes.fromhex("FEFE94E003FD")])
            cat.close()

        for model, address in (("IC-7100", 0x88), ("IC-7200", 0x76)):
            response = bytes((0xFE, 0xFE, address, 0xE0, 0x03, 0xFD)) + bytes(
                (0xFE, 0xFE, 0xE0, address, 0x03, 0, 0x40, 0x07, 0x14, 0, 0xFD)
            )
            port = ScriptedPort(response)
            with (
                self.subTest(model=model),
                patch("bricoham_station_agent.cat.serial.Serial", return_value=port),
            ):
                cat = SerialCat(CatConfig(model, "COM8", 19200))
                self.assertEqual(cat.read("03")["frequency_hz"], 14_074_000)
                self.assertEqual(port.writes, [bytes((0xFE, 0xFE, address, 0xE0, 0x03, 0xFD))])
                cat.close()

    def test_invalid_queries_and_busy_requests_never_write(self) -> None:
        with patch("bricoham_station_agent.cat.serial.Serial") as factory:
            cat = SerialCat(CatConfig("K4", "COM7", 38400))
            for command in ("TX", "FA00014074000", "MD;"):
                with self.assertRaises(ValueError):
                    cat.read(command)
            with cat._lock, self.assertRaisesRegex(CatError, "cat_busy"):
                cat.read("FA")
            factory.assert_not_called()
        for model in ("IC-7800", "FLEX-8600"):
            with self.assertRaises(ValueError):
                SerialCat(CatConfig(model, "COM7", 38400))
        with self.assertRaises(ValueError):
            CatConfig("K4", "socket://host:1234", 38400)

    def test_timeout_disconnect_bad_reply_and_frame_limit_are_explicit(self) -> None:
        for response, code in (
            (b"", "cat_timeout"),
            (b"FA001;", "cat_invalid_response"),
            (b"X" * 257, "cat_frame_too_large"),
        ):
            port = ScriptedPort(response)
            with (
                self.subTest(code=code),
                patch(
                    "bricoham_station_agent.cat.serial.Serial",
                    return_value=port,
                ),
            ):
                cat = SerialCat(CatConfig("K4", "COM7", 38400, timeout=0.1))
                with self.assertRaisesRegex(CatError, code):
                    cat.read("FA")
                self.assertTrue(port.closed)
        with (
            patch("bricoham_station_agent.cat.serial.Serial", side_effect=OSError("private")),
            self.assertLogs("bricoham.station_agent.cat", level="WARNING"),
        ):
            with self.assertRaisesRegex(CatError, "^cat_io_failed$"):
                SerialCat(CatConfig("K4", "COM7", 38400)).read("FA")

    def test_failure_does_not_retry_until_next_explicit_query(self) -> None:
        failed, recovered = ScriptedPort(b"FA00;"), ScriptedPort(b"FA00014074000;")
        with patch(
            "bricoham_station_agent.cat.serial.Serial", side_effect=[failed, recovered]
        ) as factory:
            cat = SerialCat(CatConfig("K4", "COM7", 38400))
            with self.assertRaises(CatError):
                cat.read("FA")
            self.assertEqual(factory.call_count, 1)
            self.assertEqual(cat.read("FA")["frequency_hz"], 14_074_000)
            self.assertEqual(factory.call_count, 2)
            cat.close()
