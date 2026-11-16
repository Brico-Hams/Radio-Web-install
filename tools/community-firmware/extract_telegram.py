#!/usr/bin/env python3
"""Safely extract Telegram Desktop HTML metadata and text to an ignored local directory."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
PAGE_RE = re.compile(r"^messages(?P<number>\d*)\.html$")
REPLY_RE = re.compile(r"#go_to_message(?P<target>[\w-]+)")
TOPIC_PATTERNS = {
    "families": r"f4hwn|quansheng|uv[- ]?k[156]|egzumer|oneofeleven|karina|ijv|fagci|punktracker|robzyl|ro-ko|opengd77|ardf|uvmod",
    "firmware_build": r"firmware|прош[иі]в|прош[иі]т|компил|compil|toolchain|cmake|makefile|gcc|bootloader|dfu",
    "storage_programming": r"flash|eeprom|calibr|калибр|калібр|памят|пам.ят|chirp|uart|serial|\bcat\b|usb|multiboot|k5prog",
    "rf_features": r"squelch|scan|spectrum|agc|dsp|afc|ctcss|dcs|шумодав|шумоподав|скан|спектр|при[её]м|передач|\brx\b|\btx\b",
    "failure_request": r"bug|error|crash|timeout|brick|fail|проблем|ошиб|помил|не работает|не працює|request|would like|хотел|хочу|sugier",
}


def page_sort_key(path: Path) -> tuple[int, str]:
    match = PAGE_RE.match(path.name)
    return (0 if not match or not match.group("number") else int(match.group("number")), path.name)


def normalize_text(value: str) -> str:
    lines = [re.sub(r"[ \t\f\v]+", " ", line).strip() for line in value.splitlines()]
    out: list[str] = []
    for line in lines:
        if line or (out and out[-1]):
            out.append(line)
    return "\n".join(out).strip()


def normalized_message_id(value: str) -> str:
    return value.removeprefix("message")


def parse_date(value: str) -> datetime | None:
    for pattern in ("%d.%m.%Y %H:%M:%S UTC%z", "%Y-%m-%d %H:%M:%S UTC%z", "%Y-%m-%d %H:%M:%S %z"):
        try:
            return datetime.strptime(value, pattern).astimezone(timezone.utc)
        except ValueError:
            continue
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.astimezone(timezone.utc) if parsed.tzinfo is not None else None
    except ValueError:
        return None


def date_sort_key(value: str) -> tuple[datetime, str]:
    parsed = parse_date(value)
    if parsed is None:
        raise ValueError(f"Invalid or timezone-less timestamp: {value!r}")
    return (parsed, value)


def date_range(records: list[dict]) -> dict:
    dates = [record["date"] for record in records if parse_date(record["date"]) is not None]
    return {
        "date_min": min(dates, key=date_sort_key) if dates else None,
        "date_max": max(dates, key=date_sort_key) if dates else None,
        "invalid_dates": sum(bool(record["date"]) and parse_date(record["date"]) is None for record in records),
        "missing_dates": sum(not record["date"] for record in records),
    }


def root_counts(records: list[dict]) -> dict:
    return {
        "user_message_roots": sum("service" not in record["classes"] for record in records),
        "service_roots": sum("service" in record["classes"] for record in records),
        "numeric_ids": sum(normalized_message_id(record["id"]).isdigit() for record in records),
        "non_numeric_ids": sum(not normalized_message_id(record["id"]).isdigit() for record in records),
        "numeric_service_roots": sum("service" in record["classes"] and normalized_message_id(record["id"]).isdigit() for record in records),
    }


class TelegramPageParser(HTMLParser):
    """Keep only message text, export anchors, dates, reply targets, and local media refs."""

    def __init__(self, page_name: str, root: Path):
        super().__init__(convert_charrefs=True)
        self.page_name = page_name
        self.root = root.resolve()
        self.stack: list[dict] = []
        self.messages: list[dict] = []
        self.current: dict | None = None
        self.tag_counts: Counter[str] = Counter()
        self.reply_count = 0
        self.joined_count = 0

    def _frame(self, tag: str, attrs: list[tuple[str, str | None]]) -> dict:
        attr = dict(attrs)
        classes = set((attr.get("class") or "").split())
        parent = self.stack[-1] if self.stack else {}
        return {
            "tag": tag,
            "classes": classes,
            "in_text": (parent.get("in_text", False) or "text" in classes) and "reply_to" not in classes and not parent.get("in_reply", False),
            "in_reply": parent.get("in_reply", False) or "reply_to" in classes,
            "in_date": parent.get("in_date", False) or "date" in classes,
            "in_forwarded": parent.get("in_forwarded", False) or "forwarded" in classes,
            "in_media": parent.get("in_media", False) or bool(classes & {"media", "media_wrap", "media_file"}),
            "attrs": attr,
        }

    def _start(self, tag: str, attrs: list[tuple[str, str | None]], push: bool) -> None:
        self.tag_counts[tag] += 1
        if tag == "br" and self.current is not None and self.stack and self.stack[-1].get("in_text"):
            self.current["text_parts"].append("\n")
        attr = dict(attrs)
        classes = set((attr.get("class") or "").split())
        if tag == "div" and "message" in classes:
            if self.current is not None:
                self._finish_message()
            self.current = {
                "page": self.page_name,
                "id": attr.get("id", ""),
                "classes": sorted(classes),
                "date": "",
                "forwarded_dates": [],
                "text_parts": [],
                "reply_parts": [],
                "reply_to": None,
                "attachments": [],
                "external_links": [],
                "joined": "joined" in classes,
            }
        frame = self._frame(tag, attrs)
        if self.current is not None:
            if "date" in classes and attr.get("title"):
                if frame["in_forwarded"]:
                    self.current["forwarded_dates"].append(attr["title"])
                elif not self.current["date"]:
                    self.current["date"] = attr["title"]
            if "joined" in classes:
                self.current["joined"] = True
            href = attr.get("href")
            if tag == "a" and href:
                reply = REPLY_RE.search(href)
                if reply:
                    self.current["reply_to"] = reply.group("target")
                elif urlsplit(href).scheme in {"http", "https"} and urlsplit(href).netloc:
                    self.current["external_links"].append(href)
                elif not urlsplit(href).scheme and not href.startswith(("#", "mailto:")):
                    self.current["attachments"].append(href)
            for key in ("src",):
                if tag in {"img", "video", "audio", "source"} and attr.get(key):
                    self.current["attachments"].append(attr[key])
        if push and tag not in VOID_TAGS:
            self.stack.append(frame)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._start(tag, attrs, True)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._start(tag, attrs, False)

    def handle_endtag(self, tag: str) -> None:
        if tag == "div" and self.stack:
            # Telegram emits well-nested message roots. Finish only after popping
            # the matching root frame so inner divs cannot close a message early.
            index = next(
                (i for i in range(len(self.stack) - 1, -1, -1)
                 if self.stack[i]["tag"] == "div" and "message" in self.stack[i]["classes"]),
                None,
            )
            if index is not None and not any(
                frame["tag"] == "div" and "message" in frame["classes"]
                for frame in self.stack[index + 1:]
            ):
                if index == len(self.stack) - 1:
                    self.stack.pop()
                    self._finish_message()
                    return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]["tag"] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data: str) -> None:
        if self.current is None:
            return
        if self.stack:
            frame = self.stack[-1]
            if frame.get("in_text"):
                self.current["text_parts"].append(data)
            if frame.get("in_reply"):
                self.current["reply_parts"].append(data)

    def _finish_message(self) -> None:
        if self.current is None:
            return
        record = self.current
        record["text"] = normalize_text("".join(record.pop("text_parts")))
        record["reply_text"] = normalize_text("".join(record.pop("reply_parts")))
        record["attachments"] = list(dict.fromkeys(record["attachments"]))
        record["external_links"] = list(dict.fromkeys(record["external_links"]))
        if record["reply_to"] is not None:
            self.reply_count += 1
        if record["joined"]:
            self.joined_count += 1
        self.messages.append(record)
        self.current = None
        self.stack.clear()

    def close(self) -> None:
        super().close()
        self._finish_message()


def local_attachment(root: Path, ref: str) -> Path | None:
    parsed = urlsplit(ref)
    if parsed.scheme or parsed.netloc or ref.startswith(("#", "mailto:")):
        return None
    decoded = unquote(parsed.path).replace("\\", "/").lstrip("/")
    if not decoded or any(part in {"..", ""} for part in decoded.split("/")):
        return None
    candidate = (root / Path(*decoded.split("/"))).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError:
        return None
    return candidate if candidate.is_file() else None


def inventory_attachments(root: Path) -> dict:
    counts: Counter[str] = Counter()
    sizes: Counter[str] = Counter()
    files = 0
    total_bytes = 0
    symlinks_skipped = 0
    for base, dirs, names in os.walk(root, followlinks=False):
        base_path = Path(base)
        dirs[:] = [name for name in dirs if not (base_path / name).is_symlink()]
        for name in names:
            path = base_path / name
            if path.is_symlink() or not path.is_file():
                symlinks_skipped += 1
                continue
            suffix = path.suffix.lower() or "[no extension]"
            size = path.stat().st_size
            counts[suffix] += 1
            sizes[suffix] += size
            files += 1
            total_bytes += size
    return {
        "files": files,
        "bytes": total_bytes,
        "symlinks_skipped": symlinks_skipped,
        "by_extension": [
            {"extension": extension, "files": count, "bytes": sizes[extension]}
            for extension, count in sorted(counts.items(), key=lambda item: (-item[1], item[0]))
        ],
    }


def parse_export(source: Path, work_dir: Path) -> dict:
    source = source.resolve()
    work_dir.mkdir(parents=True, exist_ok=True)
    pages = sorted(
        (path for path in source.iterdir() if path.is_file() and PAGE_RE.match(path.name)),
        key=page_sort_key,
    )
    if not pages:
        raise ValueError(f"No Telegram messages*.html pages found in {source}")

    inventory: dict = {
        "source_tag": "telegram-community-export",
        "export_directory_name": source.name,
        "pages": [],
        "message_count": 0,
        "message_ids": 0,
        "duplicate_message_ids": [],
        "reply_count": 0,
        "joined_count": 0,
        "date_min": None,
        "date_max": None,
        "attachments": inventory_attachments(source),
        "missing_linked_attachments": [],
        "parse_warnings": [],
    }
    all_messages: list[dict] = []
    seen_ids: Counter[str] = Counter()
    for path in pages:
        data = path.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        parser = TelegramPageParser(path.name, source)
        parser.feed(data.decode("utf-8-sig", errors="replace"))
        parser.close()
        records = parser.messages
        all_messages.extend(records)
        inventory["pages"].append({
            "file": path.name,
            "bytes": len(data),
            "sha256": digest,
            "messages": len(records),
            "message_ids_missing": sum(not bool(record["id"]) for record in records),
            **date_range(records),
            **root_counts(records),
            "reply_count": parser.reply_count,
            "joined_count": parser.joined_count,
            "tags": dict(parser.tag_counts),
        })
        if not records:
            inventory["parse_warnings"].append(f"No message roots parsed in {path.name}")
        for record in records:
            if record["id"]:
                seen_ids[record["id"]] += 1
            for ref in record["attachments"]:
                if local_attachment(source, ref) is None:
                    parsed_ref = urlsplit(ref)
                    if not parsed_ref.scheme and not ref.startswith(("#", "mailto:")):
                        inventory["missing_linked_attachments"].append({
                            "page": record["page"],
                            "message_id": record["id"],
                            "attachment_ref": ref,
                        })
    inventory["message_count"] = len(all_messages)
    inventory["message_ids"] = sum(bool(record["id"]) for record in all_messages)
    inventory["duplicate_message_ids"] = [
        {"id": message_id, "occurrences": count}
        for message_id, count in sorted(seen_ids.items()) if count > 1
    ]
    inventory["reply_count"] = sum(bool(record["reply_to"]) for record in all_messages)
    inventory["joined_count"] = sum(bool(record["joined"]) for record in all_messages)
    inventory.update(date_range(all_messages))
    inventory.update(root_counts(all_messages))
    inventory["forwarded_date_roots"] = sum(bool(record["forwarded_dates"]) for record in all_messages)

    index: dict[str, list[dict]] = {}
    for record in all_messages:
        if record["id"]:
            index.setdefault(normalized_message_id(record["id"]), []).append(record)
    unresolved_replies = []
    for record in all_messages:
        if record["reply_to"]:
            targets = index.get(normalized_message_id(record["reply_to"]), [])
            record["reply_context"] = [
                {"page": target["page"], "id": target["id"], "date": target["date"], "text": target["text"]}
                for target in targets
            ]
            if not targets:
                unresolved_replies.append({"page": record["page"], "id": record["id"], "target": record["reply_to"]})
        else:
            record["reply_context"] = []
    inventory["unresolved_replies"] = unresolved_replies
    previous_user = None
    attachment_targets: dict[str, int] = {}
    attachment_extensions: Counter[str] = Counter()
    for record in all_messages:
        record["continuation_of"] = previous_user if record["joined"] else None
        if "service" not in record["classes"]:
            previous_user = {"page": record["page"], "id": record["id"]}
        for ref in record["attachments"]:
            target = local_attachment(source, ref)
            if target is not None:
                relative = str(target.relative_to(source))
                attachment_extensions[target.suffix.lower() or "[no extension]"] += 1
                attachment_targets.setdefault(relative, target.stat().st_size)
    inventory["linked_attachment_references"] = sum(attachment_extensions.values())
    inventory["linked_attachment_files"] = len(attachment_targets)
    inventory["linked_attachment_bytes"] = sum(attachment_targets.values())
    inventory["linked_attachment_extensions"] = dict(sorted(attachment_extensions.items()))

    candidates = []
    batches = []
    for page in inventory["pages"]:
        records = [record for record in all_messages if record["page"] == page["file"]]
        selected = []
        for record in records:
            if "service" in record["classes"]:
                continue
            body = record["text"] + "\n" + "\n".join(context["text"] for context in record["reply_context"])
            categories = [name for name, pattern in TOPIC_PATTERNS.items() if re.search(pattern, body, re.IGNORECASE)]
            if categories:
                selected.append({**record, "categories": categories})
        candidates.extend(selected)
        batches.append({
            "id": f"B{len(batches) + 1:02}",
            "page": page["file"],
            "roots_indexed": len(records),
            "user_roots": page["user_message_roots"],
            "service_roots": page["service_roots"],
            "lexical_candidates": len(selected),
            "user_roots_not_selected": page["user_message_roots"] - len(selected),
            "full_semantic_review": False,
            "status": "indexado; seleccion lexical, no lectura semantica completa",
            "date_min": page["date_min"],
            "date_max": page["date_max"],
        })
    with (work_dir / "topic-candidates.jsonl").open("w", encoding="utf-8", newline="\n") as output:
        for record in candidates:
            output.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
    (work_dir / "topic-scan-summary.json").write_text(json.dumps({
        "patterns": TOPIC_PATTERNS,
        "candidate_message_count": len(candidates),
        "candidate_pages": {batch["page"]: batch["lexical_candidates"] for batch in batches},
        "interpretation": "Seleccion lexical reproducible; no equivale a relevancia ni a revision semantica.",
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (work_dir / "batches.json").write_text(json.dumps(batches, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    jsonl_path = work_dir / "messages.jsonl"
    with jsonl_path.open("w", encoding="utf-8", newline="\n") as output:
        for record in all_messages:
            output.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
    inventory["parsed_jsonl"] = jsonl_path.name
    inventory["parsed_jsonl_sha256"] = hashlib.sha256(jsonl_path.read_bytes()).hexdigest()
    inventory["parsed_jsonl_bytes"] = jsonl_path.stat().st_size
    inventory["page_count"] = len(pages)
    (work_dir / "inventory.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (work_dir / "README.txt").write_text(
        "DATOS LOCALES IGNORADOS. El contenido de Telegram y los nombres de adjuntos son material privado.\n"
        "No publicar, subir ni ejecutar este contenido; conservar este directorio ignorado por Git.\n"
        "Generado por tools/community-firmware/extract_telegram.py; el original permanece en su directorio local.\n",
        encoding="utf-8",
    )
    return inventory


def self_check() -> None:
    sample = """<html><div class="message default clearfix" id="message-7"><div class="body">
      <div class="date details" title="2026-10-01 10:00:00 UTC+01:00"></div>
      <div class="reply_to details"><a href="#go_to_message8">reply &amp; quoted</a></div>
      <div class="text">One &amp; two<br>three <span>four</span></div>
      <div class="media_wrap"><a href="files/report.pdf">report</a></div></div></div>
      <div class="message joined" id="message8"><div class="text">follow up &lt;ok&gt;</div></div></html>"""
    parser = TelegramPageParser("messages.html", Path("."))
    parser.feed(sample)
    parser.close()
    assert len(parser.messages) == 2, parser.messages
    first, second = parser.messages
    assert first["id"] == "message-7"
    assert first["date"] == "2026-10-01 10:00:00 UTC+01:00"
    assert first["reply_to"] == "8"
    assert first["reply_text"] == "reply & quoted"
    assert first["text"] == "One & two\nthree four"
    assert first["attachments"] == ["files/report.pdf"]
    assert second["joined"] is True
    assert second["text"] == "follow up <ok>"
    parser2 = TelegramPageParser("messages2.html", Path("."))
    parser2.feed('<div class="message"><div class="text"><b>A</b><br/>B</div></div>')
    parser2.close()
    assert parser2.messages[0]["text"] == "A\nB"


def main(argv: list[str] | None = None) -> int:
    command = argparse.ArgumentParser(description=__doc__)
    command.add_argument("source", nargs="?", type=Path)
    command.add_argument("--work-dir", type=Path)
    command.add_argument("--self-check", action="store_true")
    args = command.parse_args(argv)
    if args.self_check:
        self_check()
        print("parser self-check: PASS")
        return 0
    if args.source is None or args.work_dir is None:
        command.error("source and --work-dir are required unless --self-check is used")
    result = parse_export(args.source, args.work_dir)
    print(json.dumps({
        "page_count": result["page_count"],
        "message_count": result["message_count"],
        "message_ids": result["message_ids"],
        "user_message_roots": result["user_message_roots"],
        "service_roots": result["service_roots"],
        "numeric_ids": result["numeric_ids"],
        "numeric_service_roots": result["numeric_service_roots"],
        "invalid_dates": result["invalid_dates"],
        "reply_count": result["reply_count"],
        "joined_count": result["joined_count"],
        "attachment_files": result["attachments"]["files"],
        "missing_linked_attachments": len(result["missing_linked_attachments"]),
        "date_min": result["date_min"],
        "date_max": result["date_max"],
        "work_dir": str(args.work_dir.resolve()),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
