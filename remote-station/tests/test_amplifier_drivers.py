import json
import unittest
from pathlib import Path

from bricoham_station_agent import amplifier_drivers as drivers
from bricoham_station_agent.accessories import StationAccessories, load_catalog

ROOT = Path(__file__).resolve().parents[2]


class FakeTransport:
    """Scripted link: every write goes to handler(frame), whose return value is queued for read()."""

    def __init__(self, handler, idle=None):
        self.handler = handler
        self.idle = idle
        self.writes = []
        self.queue = []
        self.closed = False

    def write(self, data):
        self.writes.append(bytes(data))
        reply = self.handler(bytes(data))
        if reply:
            self.queue.append(reply if isinstance(reply, bytes) else reply.encode("latin1"))

    def read(self, timeout):
        if self.queue:
            return self.queue.pop(0)
        return self.idle() if self.idle else b""

    def flush(self):
        self.queue.clear()

    def close(self):
        self.closed = True


def kpa_amp(state):
    def handler(frame):
        command = frame.decode("latin1")
        if command == ";":
            return ";"
        if command == "^ON;":
            return f"^ON{state['power']};"
        if command == "^OP;":
            return f"^ON{state['operate']};"
        if command == "^OS1;":
            state["operate"] = 1
        if command == "^OS0;" and not state.get("stuck"):
            state["operate"] = 0
        if command == "^SW;":
            return f"^SW{state['swr']};"
        if command == "^SF;":
            return f"^SF{state['fault']};"
        if command == "^PWF;":
            return "^PWF450;"
        return None

    return FakeTransport(handler)


def expert_status(operate=False, swr="1.1", alarm="N"):
    # Layout of the macexpert-spe example, padded to the 67 data bytes the length byte 0x43 announces.
    data = f",20K,{'O' if operate else 'S'},R,x,1,00,1a,0r,L,  0, 0.00, {swr}, 0.0, 0.0, 33,  0,  0,N,{alarm},  ".encode("latin1")
    assert len(data) == 67
    total = sum(data) & 0xFFFF
    return b"\xaa\xaa\xaa\x43" + data + bytes([total & 0xFF, total >> 8]) + b",\r\n"


def expert_amp(state):
    toggles = []

    def handler(frame):
        if frame == bytes([0x55, 0x55, 0x55, 0x01, 0x90, 0x90]):
            return expert_status(state["operate"], alarm=state.get("alarm", "N"))
        if frame == bytes([0x55, 0x55, 0x55, 0x01, 0x0D, 0x0D]):
            toggles.append(True)
            if not state.get("stuck"):
                state["operate"] = not state["operate"]
            return bytes([0xAA, 0xAA, 0xAA, 0x01, 0x0D, 0x0D])
        return None

    return FakeTransport(handler), toggles


def acom_frame(nibble=6, error=0xFF, swr100=120, power=500, temp=282 + 40, band=5):
    frame = bytearray(72)
    frame[0], frame[1], frame[3] = 0x55, 0x2F, nibble << 4
    for offset, value in ((16, temp), (20, 25), (22, power), (24, 3), (26, swr100)):
        frame[offset:offset + 2] = value.to_bytes(2, "little")
    frame[66], frame[69] = error, band
    frame[71] = (256 - sum(frame[:71]) % 256) % 256
    return bytes(frame)


def acom_amp(state):
    def handler(frame):
        if frame == drivers.ACOM_OPERATE:
            state["nibble"] = 6
        if frame == drivers.ACOM_STANDBY and not state.get("stuck"):
            state["nibble"] = 5
        return None

    return FakeTransport(handler, idle=lambda: acom_frame(state["nibble"], state.get("error", 0xFF), state.get("swr100", 120)))


def gemini_amp(state):
    def handler(frame):
        command = frame.decode("latin1")
        if command == "S\n":
            return f"BAND=14.2M,ANTENNA=1,POWER=300W450,VSWR={state['swr']},CURRENT=12.5,TEMPERATURE=41,STATE=ON,PTT=RX,TRIP={state['trip']}\n"
        if command == "R\n":
            return f"{state['operate']}\n"
        if command == "R1\n":
            state["operate"] = 1
        if command == "R0\n" and not state.get("stuck"):
            state["operate"] = 0
        return None

    return FakeTransport(handler)


class KpaTests(unittest.TestCase):
    def test_read_and_standby(self):
        state = {"power": 1, "operate": 1, "swr": 13, "fault": 0}
        transport = kpa_amp(state)
        driver = drivers.KpaDriver(transport)
        self.assertEqual(driver.read(), {"operate": True, "swr": 1.3, "fault": None, "power_w": 450.0, "temp_c": None})
        state["fault"] = 64
        self.assertTrue(driver.read()["fault"])
        driver.set_operate(False)
        self.assertEqual(state["operate"], 0)
        state.update(operate=1, stuck=True)
        with self.assertRaises(drivers.AmplifierError):
            driver.set_operate(False)
        self.assertFalse(any(frame.startswith(b"^ON0") or frame.startswith(b"^OS1") for frame in transport.writes))

    def test_band_follow_sends_kilohertz(self):
        transport = kpa_amp({"power": 1, "operate": 0})
        drivers.KpaDriver(transport).set_band("20m", 14074000)
        self.assertIn(b"^FR14074;", transport.writes)


class ExpertTests(unittest.TestCase):
    def test_frames_and_checksum(self):
        self.assertEqual(drivers.build_expert_frame([0x90]), bytes([0x55, 0x55, 0x55, 0x01, 0x90, 0x90]))
        status = drivers.parse_expert_status(expert_status(operate=True, swr="1.5", alarm="S"))
        self.assertTrue(status["operate"])
        self.assertEqual(status["swr"], 1.5)
        self.assertEqual(status["temp_c"], 33.0)
        self.assertTrue(status["fault"])
        self.assertIsNone(drivers.parse_expert_status(expert_status()[:30]))
        bad = bytearray(expert_status())
        bad[10] ^= 0xFF
        with self.assertRaises(drivers.AmplifierError):
            drivers.parse_expert_status(bytes(bad))

    def test_operate_toggles_once_after_a_status_read(self):
        state = {"operate": False}
        transport, toggles = expert_amp(state)
        driver = drivers.ExpertDriver(transport)
        driver.set_operate(False)
        self.assertEqual(len(toggles), 0)
        driver.set_operate(True)
        driver.set_operate(True)
        self.assertEqual(len(toggles), 1)
        driver.set_operate(False)
        self.assertEqual(len(toggles), 2)
        state.update(operate=True, stuck=True)
        with self.assertRaises(drivers.AmplifierError):
            driver.set_operate(False)
        self.assertEqual(len(toggles), 3)


class AcomTests(unittest.TestCase):
    def test_telemetry_fields(self):
        status = drivers.parse_acom_telemetry(acom_frame(error=0x24), "700S")
        self.assertTrue(status["operate"])
        self.assertEqual((status["temp_c"], status["power_w"], status["swr"], status["band"]), (40, 500, 1.2, "20m"))
        self.assertIn("Excessive PAM current", status["fault"])
        self.assertIsNone(drivers.parse_acom_telemetry(acom_frame(), "700S")["fault"])
        self.assertFalse(drivers.parse_acom_telemetry(acom_frame(nibble=5), "700S")["operate"])
        self.assertIsNone(drivers.parse_acom_telemetry(acom_frame(nibble=10), "700S")["temp_c"])
        self.assertIsNone(drivers.parse_acom_telemetry(acom_frame(nibble=5), "500S")["temp_c"])
        corrupt = bytearray(acom_frame())
        corrupt[30] ^= 1
        self.assertIsNone(drivers.parse_acom_telemetry(bytes(corrupt), "700S"))
        with self.assertRaises(drivers.AmplifierError):
            drivers.parse_acom_telemetry(acom_frame(), "1000")

    def test_standby_is_confirmed_from_telemetry(self):
        state = {"nibble": 5}
        transport = acom_amp(state)
        driver = drivers.AcomDriver(transport, model="700S")
        driver.set_operate(True)
        self.assertEqual(state["nibble"], 6)
        driver.set_operate(False)
        self.assertEqual(state["nibble"], 5)
        self.assertIn(bytes([0x55, 0x81, 0x08, 0x02, 0x00, 0x05, 0x00, 0x1B]), transport.writes)
        state.update(nibble=6, stuck=True)
        with self.assertRaises(drivers.AmplifierError):
            driver.set_operate(False)
        driver.close()
        self.assertTrue(transport.closed)
        self.assertEqual(transport.writes[-1], bytes([0x55, 0x91, 0x04, 0x16]))


class GeminiTests(unittest.TestCase):
    def test_status_operate_and_trip(self):
        state = {"swr": "1.4", "trip": "NONE", "operate": 1}
        driver = drivers.GeminiDriver(gemini_amp(state))
        reading = driver.read()
        self.assertEqual((reading["operate"], reading["swr"], reading["power_w"], reading["fault"]), (True, 1.4, 450.0, None))
        state["trip"] = "SWR"
        self.assertEqual(driver.read()["fault"], "TRIP SWR")
        driver.set_operate(False)
        self.assertEqual(state["operate"], 0)
        state.update(operate=1, stuck=True)
        with self.assertRaises(drivers.AmplifierError):
            driver.set_operate(False)
        with self.assertRaises(drivers.AmplifierError):
            drivers.parse_gemini_status("garbage")


class SafetyLayerTests(unittest.TestCase):
    def build(self, driver, device="acom-amplifiers", allowed=True):
        return StationAccessories(config={"amplifier": {"device": device, "operate_allowed": allowed}}, amplifier=driver)

    def test_operate_needs_config_and_a_known_band(self):
        state = {"nibble": 5}
        accessories = self.build(drivers.AcomDriver(acom_amp(state)))
        self.assertEqual(accessories.snapshot()["amplifier"]["state"], "standby")
        self.assertEqual(accessories.operate()["reason"], "band_unknown")
        denied = self.build(drivers.AcomDriver(acom_amp(state)), allowed=False)
        self.assertEqual(denied.operate()["reason"], "disabled")
        accessories.follow_band(14074000)
        self.assertTrue(accessories.operate()["ok"])
        self.assertEqual(state["nibble"], 6)
        self.assertEqual(accessories.snapshot()["amplifier"]["verification"], "source-implemented, not hardware-tested")

    def test_every_trigger_returns_to_standby(self):
        for trigger in ("fault", "swr", "emergency", "lease", "disconnect", "close"):
            state = {"nibble": 5}
            accessories = self.build(drivers.AcomDriver(acom_amp(state)))
            accessories.follow_band(14074000)
            self.assertTrue(accessories.operate()["ok"], trigger)
            if trigger == "fault":
                state["error"] = 0x24
                accessories.poll()
            elif trigger == "swr":
                state["swr100"] = 450
                accessories.poll()
            elif trigger == "emergency":
                accessories.emergency_stop("emergency")
            else:
                accessories.standby(trigger)
            self.assertEqual(state["nibble"], 5, trigger)
            self.assertNotEqual(accessories.snapshot()["amplifier"]["state"], "operate", trigger)

    def test_amplifier_leaving_operate_is_followed(self):
        state = {"nibble": 5}
        accessories = self.build(drivers.AcomDriver(acom_amp(state)))
        accessories.follow_band(14074000)
        accessories.operate()
        state["nibble"] = 5
        accessories.poll()
        self.assertEqual(accessories.snapshot()["amplifier"]["state"], "standby")


class LinkTests(unittest.TestCase):
    def test_links_are_lazy_and_validated(self):
        class Boom:
            def create_connection(self, *args, **kwargs):
                raise AssertionError("must not connect")

        tcp = drivers.TcpTransport("192.168.1.50", 4001, socket_module=Boom())
        serial_link = drivers.SerialTransport("COM9", 38400, serial_module=object())
        self.assertIsNotNone(tcp)
        self.assertIsNotNone(serial_link)
        with self.assertRaises(drivers.AmplifierError):
            drivers.TcpTransport("bad host", 1)
        with self.assertRaises(drivers.AmplifierError):
            drivers.SerialTransport("COM9", 0)

    def test_tcp_round_trip_with_a_fake_socket(self):
        class FakeSocket:
            def __init__(self):
                self.sent = []

            def sendall(self, data):
                self.sent.append(data)

            def settimeout(self, value):
                pass

            def recv(self, size):
                return b"0\n"

        fake = FakeSocket()

        class Module:
            @staticmethod
            def create_connection(address, timeout):
                self.assertEqual(address, ("h", 4001))
                return fake

        link = drivers.TcpTransport("h", 4001, socket_module=Module)
        link.write(b"S\n")
        self.assertEqual(fake.sent, [b"S\n"])
        self.assertEqual(link.read(0.1), b"0\n")

    def test_driver_from_config_uses_the_catalog_driver(self):
        catalog = load_catalog()
        config = {"amplifier": {"device": "acom-amplifiers", "host": "h", "tcp_port": 4001, "model": "700S"}}
        self.assertIsInstance(drivers.driver_from_config(catalog, config), drivers.AcomDriver)
        self.assertIsNone(drivers.driver_from_config(catalog, {"amplifier": {"device": "elecraft-kpa500", "host": "h", "tcp_port": 1}}))
        self.assertIsNone(drivers.driver_from_config(catalog, {"amplifier": {"device": "acom-amplifiers"}}))

    def test_catalog_drivers_are_registered(self):
        catalog = json.loads((ROOT / "data" / "station-accessories-catalog.json").read_text(encoding="utf-8"))
        for device in catalog["devices"]:
            if device["kind"] == "amplifier" and device.get("driver"):
                self.assertIn(device["driver"], drivers.DRIVER_FACTORIES)
                self.assertEqual(device["verification"], "source-implemented, not hardware-tested")


if __name__ == "__main__":
    unittest.main()
