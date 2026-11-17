import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from extract_telegram import TelegramPageParser, date_range, date_sort_key, normalize_text, parse_date, parse_export, root_counts


class TelegramParserTests(unittest.TestCase):
    def parse(self, fragment):
        parser = TelegramPageParser("messages.html", Path("."))
        parser.feed(fragment)
        parser.close()
        return parser

    def test_nested_text_entities_and_multiline(self):
        parser = self.parse(
            '<div class="message default" id="message10">'
            '<div class="text">first &amp; <strong>nested</strong><br>second &lt;tag&gt;</div>'
            '</div>'
        )
        self.assertEqual(len(parser.messages), 1)
        self.assertEqual(parser.messages[0]["text"], "first & nested\nsecond <tag>")

    def test_reply_anchor_and_context_are_captured(self):
        parser = self.parse(
            '<div class="message default" id="message11"><div class="body">'
            '<div class="reply_to"><a href="#go_to_message10">quoted &amp; folded</a></div>'
            '<div class="text">new message <a href="https://example.invalid/ref">ref</a></div></div></div>'
        )
        record = parser.messages[0]
        self.assertEqual(record["reply_to"], "10")
        self.assertEqual(record["reply_text"], "quoted & folded")
        self.assertEqual(record["text"], "new message ref")
        self.assertEqual(record["external_links"], ["https://example.invalid/ref"])
        self.assertEqual(record["attachments"], [])

    def test_joined_messages_and_page_boundary(self):
        first = self.parse('<div class="message joined" id="message1"><div class="text">part one</div></div>')
        parser = TelegramPageParser("messages2.html", Path("."))
        parser.feed('<div class="message default" id="message2"><div class="text">next page</div></div>')
        parser.close()
        second = parser
        self.assertTrue(first.messages[0]["joined"])
        self.assertFalse(second.messages[0]["joined"])
        self.assertEqual(first.messages[0]["page"], "messages.html")
        self.assertEqual(second.messages[0]["page"], "messages2.html")

    def test_missing_or_unclosed_markup_does_not_merge_message_roots(self):
        parser = self.parse(
            '<div class="message default" id="message1"><div class="text">before'
            '<div class="message default" id="message2"><div class="text">after</div></div>'
        )
        self.assertEqual([item["id"] for item in parser.messages], ["message1", "message2"])
        self.assertEqual(parser.messages[0]["text"], "before")
        self.assertEqual(parser.messages[1]["text"], "after")

    def test_text_normalization(self):
        self.assertEqual(normalize_text("  a  \n\n b \t "), "a\n\nb")

    def test_outer_date_survives_forwarded_date(self):
        parser = self.parse(
            '<div class="message default" id="message12516"><div class="body">'
            '<div class="pull_right date details" title="21.04.2025 11:16:48 UTC+01:00"></div>'
            '<div class="forwarded body"><div class="from_name">'
            '<span class="date details" title="16.04.2025 02:28:02 UTC+01:00"></span>'
            '</div><div class="text">forwarded</div></div></div></div>'
        )
        record = parser.messages[0]
        self.assertEqual(record["date"], "21.04.2025 11:16:48 UTC+01:00")
        self.assertEqual(record["forwarded_dates"], ["16.04.2025 02:28:02 UTC+01:00"])

    def test_future_forwarded_date_is_not_publication_maximum(self):
        parser = self.parse(
            '<div class="message default" id="message1"><div class="body">'
            '<div class="date" title="21.04.2025 11:16:48 UTC+01:00"></div>'
            '<div class="forwarded body"><span class="date" title="01.01.2099 00:00:00 UTC+00:00"></span></div>'
            '</div></div>'
        )
        self.assertEqual(date_range(parser.messages)["date_max"], "21.04.2025 11:16:48 UTC+01:00")

    def test_timezone_ordering_and_invalid_dates(self):
        self.assertEqual(parse_date("21.04.2025 11:00:00 UTC+01:00"), parse_date("2025-04-21T10:00:00Z"))
        self.assertLess(date_sort_key("21.04.2025 11:00:00 UTC+02:00"), date_sort_key("21.04.2025 10:00:00 UTC+00:00"))
        for value in ("invalid", "31.02.2025 12:00:00 UTC+01:00", "2025-04-21", ""):
            self.assertIsNone(parse_date(value))
        records = [{"date": date} for date in ("invalid", "", "21.04.2025 11:00:00 UTC+01:00")]
        self.assertEqual(date_range(records), {
            "date_min": "21.04.2025 11:00:00 UTC+01:00",
            "date_max": "21.04.2025 11:00:00 UTC+01:00",
            "invalid_dates": 1, "missing_dates": 1,
        })

    def test_service_class_is_independent_of_numeric_id(self):
        parser = self.parse(
            '<div class="message service" id="message1"></div>'
            '<div class="message service" id="message-1"></div>'
            '<div class="message default" id="message2"></div>'
        )
        self.assertEqual(root_counts(parser.messages), {
            "user_message_roots": 1, "service_roots": 2, "numeric_ids": 2,
            "non_numeric_ids": 1, "numeric_service_roots": 1,
        })

    def test_forwarded_date_never_replaces_missing_or_invalid_outer_date(self):
        parser = self.parse(
            '<div class="message default" id="message1"><div class="forwarded body">'
            '<span class="date" title="01.01.2099 00:00:00 UTC+00:00"></span></div></div>'
            '<div class="message default" id="message2"><div class="date" title="invalid"></div>'
            '<div class="forwarded body"><span class="date" title="01.01.2020 00:00:00 UTC+00:00"></span></div></div>'
        )
        self.assertEqual([record["date"] for record in parser.messages], ["", "invalid"])
        self.assertEqual(date_range(parser.messages), {
            "date_min": None, "date_max": None, "invalid_dates": 1, "missing_dates": 1,
        })

    def test_export_resolves_cross_page_reply_and_continuation_deterministically(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            source, work = root / "source", root / "work"
            source.mkdir()
            (source / "messages.html").write_text(
                '<div class="message default" id="message1"><div class="date" '
                'title="21.04.2025 11:00:00 UTC+01:00"></div>'
                '<div class="text">firmware &amp; test</div></div>', encoding="utf-8"
            )
            (source / "messages2.html").write_text(
                '<div class="message default joined" id="message2"><div class="date" '
                'title="21.04.2025 11:01:00 UTC+01:00"></div>'
                '<div class="reply_to"><a href="#go_to_message1">reply</a></div>'
                '<div class="text">continuation</div></div>'
                '<div class="message service" id="message3"></div>', encoding="utf-8"
            )
            first = parse_export(source, work)
            content = (work / "messages.jsonl").read_bytes()
            second = parse_export(source, work)
            self.assertEqual(content, (work / "messages.jsonl").read_bytes())
            self.assertEqual(first["parsed_jsonl_sha256"], second["parsed_jsonl_sha256"])
            self.assertEqual(first["message_count"], 3)
            self.assertEqual(first["user_message_roots"], 2)
            self.assertEqual(first["numeric_service_roots"], 1)
            self.assertEqual(first["unresolved_replies"], [])
            records = [json.loads(line) for line in content.decode("utf-8").splitlines()]
            self.assertEqual(records[1]["reply_context"][0]["id"], "message1")
            self.assertEqual(records[1]["continuation_of"], {"page": "messages.html", "id": "message1"})


if __name__ == "__main__":
    unittest.main()
