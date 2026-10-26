import json
import pathlib
import struct
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import tg_kb  # noqa: E402


class TelegramKnowledgeBaseTests(unittest.TestCase):
    def test_export_is_classified_scrubbed_and_cataloged(self):
        with tempfile.TemporaryDirectory() as tmp:
            export = pathlib.Path(tmp, "ChatExport_test")
            (export / "files").mkdir(parents=True)
            v3 = struct.pack("<II", 0x20004000, 0x08002B75) + b"F4HWN v6.1.0\x00" + bytes(64)
            v1 = struct.pack("<II", 0x20003FF0, 0x0000010B) + bytes(64)
            (export / "files" / "f4hwn.bin").write_bytes(v3)
            (export / "files" / "karina.bin").write_bytes(v1)
            messages = [
                {"id": 1, "type": "service", "action": "topic_created", "title": "Firmware"},
                {"id": 2, "type": "message", "from": "Juan Perez", "from_id": "user1", "date": "2026-01-02T10:00:00",
                 "reply_to_message_id": 1,
                 "text": ["Para el ", {"type": "bold", "text": "Multiboot"}, " usa F4HWN Labs; llamame al +34 600 123 456 o a juan@example.invalid, @juanito"],
                 "file": "files/f4hwn.bin", "file_name": "f4hwn.bin"},
                {"id": 3, "type": "message", "date": "2026-01-03T11:00:00", "reply_to_message_id": 2,
                 "text": "Karina solo es para V1, no la flashees en V3 https://example.invalid/repo.", "file": "files/karina.bin", "file_name": "karina.bin"},
                {"id": 4, "type": "message", "date": "2026-01-04T12:00:00", "text": "hola"},
                {"id": 5, "type": "message", "date": "2026-01-04T12:00:00", "text": "x", "file": "../outside.bin"},
            ]
            (export / "result.json").write_text(json.dumps({"name": "Grupo Test", "messages": messages}), encoding="utf-8")
            out = pathlib.Path(tmp, "kb")
            stats, files, links = tg_kb.build(out, [export])
            self.assertEqual(stats, [("Grupo Test", 5, 2)])
            self.assertEqual(files, 2)
            self.assertEqual(links, 1)
            everything = "".join(p.read_text(encoding="utf-8") for p in out.glob("*.md"))
            for private in ["Juan Perez", "600 123 456", "juan@example.invalid", "@juanito", "user1"]:
                self.assertNotIn(private, everything, private)
            self.assertIn("· Firmware · msg 3", everything)  # reply chain resolves to the forum topic
            catalog = (out / "archivos.csv").read_text(encoding="utf-8")
            self.assertIn("V3/K1 (PY32F071", catalog)
            self.assertIn("V1/K5(8)/K6 (DP32G030", catalog)
            self.assertIn("F4HWN v6.1.0", catalog)
            self.assertNotIn("outside.bin", catalog)  # attachments outside the export folder are ignored


if __name__ == "__main__":
    unittest.main()
