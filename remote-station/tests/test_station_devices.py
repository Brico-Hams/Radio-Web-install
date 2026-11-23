import unittest

from bricoham_station_agent.rotor import RotorConfig, RotorController, RotorError
from bricoham_station_agent.station_devices import (
    PENDING,
    SUPPORT_MATRIX,
    DeviceError,
    ListedDevice,
    Outlet,
    PowerDevice,
    SerialRotorBackend,
    build_power_device,
    build_signal_path,
    dli_request,
    modbus_read_coils,
    modbus_write_coil,
    modbus_write_coils,
    parse_heading,
    parse_modbus_response,
    parse_rotor_reply,    rotor_frames,
)

OUTLETS = [Outlet("radio", 0, "radio"), Outlet("amp", 1, "amp"), Outlet("rotor", 2, "rotor")]


class FakeDli:
    def __init__(self):
        self.states = {0: True, 1: False, 2: True}
        self.requests = []

    def __call__(self, request):
        self.requests.append(request)
        outlet = int(request.path.split("/")[4])
        if request.method == "PUT":
            self.states[outlet] = request.body == "value=true"
            return 204, ""
        if request.method == "POST":
            return 204, ""
        return 200, "true" if self.states[outlet] else "false"


class FakeModbus:
    def __init__(self):
        self.frames = []
        self.coils = 0

    def __call__(self, frame):
        self.frames.append(frame)
        tid, pdu = frame[:2], frame[7:]
        if pdu[0] == 0x05:
            coil = int.from_bytes(pdu[1:3], "big")
            if int.from_bytes(pdu[3:5], "big") == 0xFF00:
                self.coils |= 1 << coil
            else:
                self.coils &= ~(1 << coil)
            reply = pdu
        elif pdu[0] == 0x01:
            reply = bytes([0x01, 1, self.coils])
        else:
            reply = bytes([pdu[0] | 0x80, 0x01])
        return tid + b"\x00\x00" + (len(reply) + 1).to_bytes(2, "big") + b"\x01" + reply


class PowerTests(unittest.TestCase):
    def device(self, fake, **kwargs):
        options = {"enabled": True, "is_transmitting": lambda: False} | kwargs
        return PowerDevice("pdu", "dli", OUTLETS, fake, **options)

    def test_dli_requests_match_the_rest_reference(self):
        put = dli_request("set", 0, True)
        self.assertEqual(
            (put.method, put.path, put.body, put.headers["X-CSRF"]),
            ("PUT", "/restapi/relay/outlets/0/transient_state/", "value=true", "x"),
        )
        self.assertEqual(dli_request("cycle", 3).path, "/restapi/relay/outlets/3/cycle/")
        self.assertEqual(dli_request("cycle", 3).method, "POST")
        read = dli_request("read", 1)
        self.assertEqual(read.path, "/restapi/relay/outlets/1/physical_state/")
        self.assertEqual(read.headers, {"Accept": "application/json"})
        with self.assertRaises(DeviceError):
            dli_request("read", 8)

    def test_modbus_frames_from_the_sources(self):
        self.assertEqual(
            modbus_write_coil(0, 1, 0, True),
            bytes.fromhex("000000000006010500 00FF00".replace(" ", "")),
        )
        self.assertEqual(
            modbus_read_coils(1, 1, 0, 8), bytes.fromhex("000100000006010100000008")
        )
        self.assertEqual(
            modbus_write_coils(1, 1, 0, [True, True]), bytes.fromhex("00010000000801 0F 00 00 00 02 01 03".replace(" ", ""))
        )
        with self.assertRaises(DeviceError):
            modbus_write_coil(1, 1, 8, True)

    def test_modbus_exception_is_function_plus_0x80(self):
        kwargs = {"transaction": 1, "unit": 1, "function": 0x05}
        with self.assertRaises(DeviceError) as caught:
            parse_modbus_response(bytes.fromhex("000100000003018502"), **kwargs)
        self.assertEqual(caught.exception.code, "modbus_exception")
        with self.assertRaises(DeviceError):
            parse_modbus_response(bytes.fromhex("000200000006010500 00FF00".replace(" ", "")), **kwargs)

    def test_switch_reads_back_physical_state(self):
        fake = FakeDli()
        result = self.device(fake).set("rotor", False)
        self.assertEqual(result, {"outlet": "rotor", "requested": False, "physical": False, "verified": True})
        self.assertEqual([r.method for r in fake.requests], ["PUT", "GET", "GET", "GET"])

    def test_critical_outlets_need_confirmation(self):
        fake = FakeDli()
        device = self.device(fake)
        for call in (lambda: device.set("radio", False), lambda: device.cycle("amp")):
            with self.assertRaises(DeviceError) as caught:
                call()
            self.assertEqual(caught.exception.code, "confirm_required")
        self.assertEqual(fake.requests, [])
        self.assertTrue(device.set("radio", False, confirm=True)["verified"])

    def test_refused_while_transmitting_unknown_or_disabled(self):
        fake = FakeDli()
        for kwargs, code in (
            ({"is_transmitting": lambda: True}, "transmitting"),
            ({"is_transmitting": None}, "transmitting"),
            ({"is_transmitting": lambda: None}, "transmitting"),
        ):
            with self.assertRaises(DeviceError) as caught:
                self.device(fake, **kwargs).set("amp", True)
            self.assertEqual(caught.exception.code, code)
        with self.assertRaises(DeviceError) as caught:
            self.device(fake, enabled=False).set("rotor", True)
        self.assertEqual(caught.exception.code, "control_disabled")
        self.assertEqual(fake.requests, [])

    def test_modbus_relay_switches_and_reads_back(self):
        fake = FakeModbus()
        device = PowerDevice(
            "relay", "modbus", OUTLETS, fake, enabled=True, is_transmitting=lambda: False
        )
        self.assertTrue(device.set("rotor", True)["verified"])
        self.assertEqual(fake.frames[0], bytes.fromhex("000100000006010500 02FF00".replace(" ", "")))
        self.assertEqual(fake.frames[1], bytes.fromhex("000200000006010100000008"))
        with self.assertRaises(DeviceError) as caught:
            device.cycle("rotor")
        self.assertEqual(caught.exception.code, "cycle_unsupported")

    def test_safe_state_never_switches(self):
        fake = FakeDli()
        self.assertEqual(self.device(fake).safe_state(), {"action": "none"})
        self.assertEqual(fake.requests, [])


class FakeSerial:
    def __init__(self, reply=""):
        self.written = []
        self.reply = reply

    def write(self, text):
        self.written.append(text)

    def read(self):
        return self.reply

    def flush(self):
        pass


class RotorProtocolTests(unittest.TestCase):
    def test_command_strings(self):
        self.assertEqual(rotor_frames("dcu1", "move", 90), ["AP1090;", "AM1;"])
        self.assertEqual(rotor_frames("rotorez", "move", 5), ["AP1005;", "AM1;"])
        self.assertIsNone(rotor_frames("dcu1", "read"))
        self.assertEqual(rotor_frames("rotorez", "read"), ["AI1;"])
        self.assertEqual(rotor_frames("rt21", "read"), ["BI1;"])
        self.assertEqual(rotor_frames("rt21", "stop"), [";"])
        self.assertEqual(rotor_frames("dcu1", "stop"), [";", "AS1;"])
        with self.assertRaises(DeviceError):
            rotor_frames("rt21", "move", 451)

    def test_heading_replies(self):
        self.assertEqual(parse_heading(";045"), 45.0)
        self.assertEqual(parse_heading("045;"), 45.0)
        self.assertEqual(parse_heading("\x01123.4;"), 123.4)
        with self.assertRaises(DeviceError):
            parse_heading("abc")

    def test_baud_must_be_documented(self):
        SerialRotorBackend("rt21", FakeSerial(), 9600)
        with self.assertRaises(ValueError):
            SerialRotorBackend("rotorez", FakeSerial(), 9600)
        with self.assertRaises(ValueError):
            SerialRotorBackend("gs232a", FakeSerial())  # no documented default baud
        with self.assertRaises(ValueError):
            SerialRotorBackend("gs232b", FakeSerial(), 600)  # Hamlib gs232b minimum is 1200
        with self.assertRaises(ValueError):
            SerialRotorBackend("rot2prog", FakeSerial(), 1200)  # spid.txt: Rot2Prog is 600 bps
        SerialRotorBackend("rot2prog", FakeSerial())
        SerialRotorBackend("gs232a", FakeSerial(), 9600)

    def test_gs232_frames_follow_hamlib(self):
        for protocol in ("gs232a", "gs232b"):
            self.assertEqual(rotor_frames(protocol, "move", 123.4, 45.6), ["W123 046\r"])
            self.assertEqual(rotor_frames(protocol, "move", 5), ["W005 000\r"])
            self.assertEqual(rotor_frames(protocol, "read"), ["C2\r"])
            self.assertEqual(rotor_frames(protocol, "stop"), ["S\r"])
            with self.assertRaises(DeviceError):
                rotor_frames(protocol, "move", 90, 181)
            with self.assertRaises(DeviceError):
                rotor_frames(protocol, "move", 451)

    def test_gs232_replies(self):
        self.assertEqual(parse_rotor_reply("gs232a", "+0123+0045\r\n")[:2], (123.0, 45.0))
        self.assertEqual(parse_rotor_reply("gs232b", "AZ=123 EL=045\r\n")[:2], (123.0, 45.0))
        self.assertEqual(parse_rotor_reply("gs232b", "AZ=270\r\n")[:2], (270.0, 0.0))
        for protocol, reply in (("gs232a", "AZ=123 EL=045"), ("gs232b", "+0123+0045"), ("gs232a", "?>")):
            with self.assertRaises(DeviceError):
                parse_rotor_reply(protocol, reply)

    def test_rot2prog_frames_follow_spid_txt(self):
        # spid.txt "SET COMMAND": az 123.5, el 77.0 at PH=PV=2.
        self.assertEqual(
            rotor_frames("rot2prog", "move", 123.5, 77.0, (2, 2)).pop().encode("latin-1").hex(),
            "57303936370230383734022f20",
        )
        self.assertEqual(rotor_frames("rot2prog", "stop")[0].encode("latin-1").hex(), "57000000000000000000000f20")
        self.assertEqual(rotor_frames("rot2prog", "read")[0].encode("latin-1").hex(), "57000000000000000000001f20")
        with self.assertRaises(DeviceError):
            rotor_frames("rot2prog", "move", 10, 0)  # resolution unknown
        with self.assertRaises(DeviceError):
            rotor_frames("rot2prog", "move", 10, 0, (3, 3))

    def test_rot2prog_reply_from_spid_txt(self):
        frame = bytes.fromhex("570307020502030904000220").decode("latin-1")
        self.assertEqual(parse_rotor_reply("rot2prog", frame), (12.5, 34.0, 2, 2))
        for bad in (frame[:-1], frame[:-1] + "x", "X" + frame[1:], frame[:5] + "\x03" + frame[6:], frame[:1] + "\x0a" + frame[2:]):
            with self.assertRaises(DeviceError):
                parse_rotor_reply("rot2prog", bad)


def rotor_config(**overrides):
    values = {
        "port": 4533,
        "label": "Rotor",
        "azimuth_min": 0,
        "azimuth_max": 360,
        "elevation_min": 0,
        "elevation_max": 0,
        "motion_enabled": True,
    }
    return RotorConfig(**(values | overrides))


class SerialRotorControllerTests(unittest.TestCase):
    def test_gs232b_moves_with_elevation_and_close_stops(self):
        serial = FakeSerial("AZ=010 EL=000\r\n")
        rotor = RotorController(
            rotor_config(elevation_max=90), SerialRotorBackend("gs232b", serial, 9600)
        )
        self.assertEqual(rotor.snapshot(read_position=True)["position"]["azimuth_deg"], 10.0)
        rotor.operate(
            {"operation": "move", "request_id": "d" * 16, "azimuth_deg": 120, "elevation_deg": 45}
        )
        self.assertIn("W120 045\r", serial.written)
        rotor.close()
        self.assertEqual(serial.written[-1], "S\r")

    def test_rot2prog_moves_with_sensed_resolution_and_stop_is_always_allowed(self):
        serial = FakeSerial(bytes.fromhex("570307020502030904000220").decode("latin-1"))
        rotor = RotorController(
            rotor_config(elevation_max=90), SerialRotorBackend("rot2prog", serial)
        )
        self.addCleanup(rotor.close)
        position = rotor.snapshot(read_position=True)["position"]
        self.assertEqual((position["azimuth_deg"], position["elevation_deg"]), (12.5, 34.0))
        rotor.operate(
            {"operation": "move", "request_id": "e" * 16, "azimuth_deg": 120, "elevation_deg": 45}
        )
        self.assertEqual(serial.written[-1], "W0960\x020810\x02/ ")
        rotor.operate({"operation": "stop"})
        self.assertEqual(serial.written[-1], "W\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x0f ")

    def test_gs232_motion_disabled_refuses_move_but_stop_works(self):
        serial = FakeSerial("+0010+0000")
        rotor = RotorController(
            rotor_config(motion_enabled=False), SerialRotorBackend("gs232a", serial, 4800)
        )
        self.addCleanup(rotor.close)
        with self.assertRaises(RotorError):
            rotor.operate(
                {"operation": "move", "request_id": "f" * 16, "azimuth_deg": 1, "elevation_deg": 0}
            )
        self.assertEqual(serial.written, [])
        rotor.operate({"operation": "stop"})
        self.assertEqual(serial.written, ["S\r"])

    def test_dcu1_moves_without_heading_read_and_stops(self):
        serial = FakeSerial()
        rotor = RotorController(rotor_config(), SerialRotorBackend("dcu1", serial))
        self.addCleanup(rotor.close)
        snapshot = rotor.snapshot(read_position=True)
        self.assertIsNone(snapshot["position"])
        self.assertEqual(snapshot["heading_note"], "sin lectura de rumbo")
        rotor.operate(
            {"operation": "move", "request_id": "a" * 16, "azimuth_deg": 90, "elevation_deg": 0}
        )
        self.assertEqual(serial.written, ["AP1090;", "AM1;"])
        rotor.operate({"operation": "stop"})
        self.assertEqual(serial.written[2:], [";", "AS1;"])

    def test_rotorez_reads_heading_and_close_stops_motion(self):
        serial = FakeSerial(";045")
        rotor = RotorController(rotor_config(), SerialRotorBackend("rotorez", serial))
        self.assertEqual(rotor.snapshot(read_position=True)["position"]["azimuth_deg"], 45.0)
        rotor.operate(
            {"operation": "move", "request_id": "b" * 16, "azimuth_deg": 120, "elevation_deg": 0}
        )
        self.assertIn("AP1120;", serial.written)
        rotor.close()
        self.assertEqual(serial.written[-1], ";")

    def test_motion_disabled_and_transport_failure_are_refused(self):
        serial = FakeSerial()
        rotor = RotorController(
            rotor_config(motion_enabled=False), SerialRotorBackend("dcu1", serial)
        )
        self.addCleanup(rotor.close)
        with self.assertRaises(RotorError):
            rotor.operate(
                {"operation": "move", "request_id": "c" * 16, "azimuth_deg": 1, "elevation_deg": 0}
            )
        self.assertEqual(serial.written, [])


class SignalPathTests(unittest.TestCase):
    def test_stage_order_and_pending_models(self):
        path = build_signal_path(
            [
                ListedDevice("tr", "FTX-1", None, "radio"),
                ListedDevice("pg", model="power-genius-xl"),
                ListedDevice("ag", model="antenna-genius"),
                ListedDevice("ant", "Dipole", None, "antenna"),
            ]
        )
        self.assertEqual(
            [s["stage"] for s in path["stages"]],
            ["radio", "amplifier", "tuner", "switch", "antenna"],
        )
        amp = path["stages"][1]["devices"][0]
        self.assertEqual((amp["control"], amp["controllable"]), (PENDING, False))
        self.assertEqual(path["missing"], ["tuner"])

    def test_support_matrix_rows_have_sources(self):
        for device, link, status, source in SUPPORT_MATRIX:
            self.assertTrue(device and link and source)
            self.assertIn(status, ("ok", "partial", PENDING))


class PowerConfigTests(unittest.TestCase):
    def test_builder_reads_dli_credentials_only_from_environment(self):
        config = {"id": "dli", "kind": "dli", "host": "10.0.0.5", "outlets": [{"name": "fan", "index": 0}]}
        seen = []
        build_power_device(config, {"BRICOHAM_POWER_USER": "u", "BRICOHAM_POWER_PASSWORD": "p"}, lambda: False,
                           dli_transport=lambda *args: seen.append(args) or (lambda request: (204, "")))
        self.assertEqual(seen, [("10.0.0.5", "u", "p", 80)])
        with self.assertRaises(ValueError):
            build_power_device(config, {}, lambda: False)
        with self.assertRaises(ValueError):
            build_power_device({**config, "password": "x"}, {}, lambda: False)
        device = build_power_device({**config, "kind": "modbus"}, {}, lambda: False, modbus_exchange=lambda *a: FakeModbus())
        self.assertFalse(device.enabled)


if __name__ == "__main__":
    unittest.main()
