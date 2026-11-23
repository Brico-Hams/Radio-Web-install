import re
import unittest
from pathlib import Path

from bricoham_station_agent import menu_settings as ms

ROOT = Path(__file__).resolve().parents[2]
LABEL_NEVER_WRITABLE = re.compile(
    r"MAX POWER|REGION|CALIB|RESET|^CAT|BAUD|STOP BIT|TIME OUT TIMER|PORT SELECT|TUN/LIN"
    r"|USB|AUTO POWER OFF|TX INHIBIT|EMERGENCY FREQ|RPTT SELECT"
)


class FakeRadio:
    def __init__(self, values: dict[str, str]) -> None:
        self.values = values
        self.log: list[str] = []
        self.tx = False
        self.corrupt = False

    def exchange(self, command: str, expect_reply: bool) -> str | None:
        self.log.append(command)
        key = command[:8]
        if expect_reply:
            return f"{key}{self.values[key]};" if self.values[key] is not None else "?;"
        if not self.corrupt or command[8:] == self.values[key]:
            self.values[key] = command[8:]
        return None


class MenuSettingsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.rules = ms.load_rules()
        cls.settings = ms.ftx1_settings(cls.rules)

    def service(self, radio: FakeRadio, *, enabled: bool = True, clock=None) -> ms.MenuSettingsService:
        return ms.MenuSettingsService(
            self.settings,
            exchange=radio.exchange,
            is_transmitting=lambda: radio.tx,
            write_enabled=enabled,
            rules=self.rules,
            clock=clock or (lambda: 1000.0),
        )

    def test_all_403_items_respect_exclusions(self) -> None:
        self.assertEqual(403, len(self.settings))
        doc = (ROOT / "docs" / "FTX1-KNOWLEDGE.md").read_text(encoding="utf-8")
        flagged = {
            f"ex-{m.group(1)}"
            for m in re.finditer(r"`EX(\d{6})`[^;`]*?\*\*(REGION/LIMITES TX|CALIBRACION)\*\*", doc)
        }
        self.assertIn("ex-030503", flagged)
        by_id = {item["id"]: item for item in self.settings}
        for identifier in flagged:
            self.assertFalse(by_id[identifier]["writable"], identifier)
        for identifier in ("ex-030503", "ex-030504"):
            self.assertFalse(by_id[identifier]["writable"])
            self.assertEqual("tx-region", by_id[identifier]["exclusion"])
        for item in self.settings:
            if LABEL_NEVER_WRITABLE.search(item["label"]):
                self.assertFalse(item["writable"], item["label"])

    def test_real_bench_replies(self) -> None:
        by_id = {item["id"]: item for item in self.settings}
        cases = {
            "ex-010413": ("EX0104133;", "3"),
            "ex-020203": ("EX02020305;", "05"),
            "ex-040107": ("EX04010700;", "00"),
            "ex-030503": ("EX030503100;", "100"),
            "ex-010322": ("EX010322000;", "000"),
        }
        for identifier, (reply, value) in cases.items():
            self.assertEqual(value, ms.parse_reply(by_id[identifier], reply))
        self.assertIsNone(ms.parse_reply(by_id["ex-010413"], "?;"))

    def writable(self) -> dict:
        return next(item for item in self.settings if item["writable"] and item["type"] == "enum")

    def test_write_verifies_and_audits(self) -> None:
        setting = self.writable()
        key = setting["read"][:8]
        current = ms.parse_reply(setting, f"{key}{setting['options'][0]['value']};")
        target = next(o["value"] for o in setting["options"] if o["value"] != current)
        radio = FakeRadio({key: current})
        service = self.service(radio)
        result = service.write(setting["id"], target)
        self.assertEqual({"id": setting["id"], "backup": current, "value": target}, result)
        self.assertEqual(target, radio.values[key])
        self.assertEqual(["backup", "written"], [e["event"] for e in service.audit()])

    def test_mismatch_restores_backup(self) -> None:
        setting = self.writable()
        key = setting["read"][:8]
        first, second = (o["value"] for o in setting["options"][:2])
        radio = FakeRadio({key: first})
        radio.corrupt = True
        service = self.service(radio)
        with self.assertRaises(ms.MenuSettingsError) as caught:
            service.write(setting["id"], second)
        self.assertEqual("cat_menu_restored", str(caught.exception))
        self.assertEqual(first, radio.values[key])

    def test_refusals_never_write(self) -> None:
        setting = self.writable()
        key = setting["read"][:8]
        first, second = (o["value"] for o in setting["options"][:2])
        for label, radio, enabled, identifier, value in (
            ("tx", self._tx(key, first), True, setting["id"], second),
            ("disabled", FakeRadio({key: first}), False, setting["id"], second),
            ("excluded", FakeRadio({"EX030503": "100"}), True, "ex-030503", "050"),
            ("range", FakeRadio({key: first}), True, setting["id"], "ZZ"),
        ):
            with self.subTest(label), self.assertRaises((ms.MenuSettingsError, ValueError)):
                self.service(radio, enabled=enabled).write(identifier, value)
            self.assertFalse([c for c in radio.log if len(c) > 8], label)

    def test_listing_is_read_only_while_menu_writes_are_disabled(self) -> None:
        radio = FakeRadio({})
        self.assertTrue(any(item["writable"] for item in self.service(radio, enabled=True).listing()))
        disabled = self.service(radio, enabled=False).listing()
        self.assertFalse(any(item["writable"] for item in disabled))
        self.assertTrue(all(item["readOnlyReason"] for item in disabled))

    def _tx(self, key: str, value: str) -> FakeRadio:
        radio = FakeRadio({key: value})
        radio.tx = True
        return radio

    def test_unavailable_backup_is_not_written(self) -> None:
        setting = self.writable()
        key = setting["read"][:8]
        radio = FakeRadio({key: None})
        with self.assertRaises(ms.MenuSettingsError):
            self.service(radio).write(setting["id"], setting["options"][0]["value"])
        self.assertFalse([c for c in radio.log if len(c) > 8])

    def test_rate_limit(self) -> None:
        setting = self.writable()
        key = setting["read"][:8]
        first, second = (o["value"] for o in setting["options"][:2])
        radio = FakeRadio({key: first})
        service = self.service(radio)
        service.write(setting["id"], second)
        with self.assertRaises(ms.MenuSettingsError) as caught:
            service.write(setting["id"], first)
        self.assertEqual("cat_menu_rate_limited", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
