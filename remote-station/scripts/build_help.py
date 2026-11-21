"""Generate user manuals and the offline setup model list from canonical sources."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from bricoham_remote_station.cat_diagnostics import read_profiles  # noqa: E402


def generated_files() -> dict[Path, str]:
    source = ROOT / "apps" / "web-console"
    content = json.loads((source / "src" / "help-content.json").read_text(encoding="utf-8"))
    if set(content) != {"es", "en", "fr", "pt"}:
        raise ValueError("Help must cover all supported languages.")
    sections = [section["id"] for section in content["es"]["sections"]]
    if len(sections) != len(set(sections)):
        raise ValueError("Duplicate help section.")
    output: dict[Path, str] = {}
    labels = {
        "es": "Referencia técnica (ES)",
        "en": "Technical reference (ES)",
        "fr": "Référence technique (ES)",
        "pt": "Referência técnica (ES)",
    }
    for language, book in content.items():
        if [section["id"] for section in book["sections"]] != sections:
            raise ValueError("Translated help sections do not match.")
        folder = ROOT / "docs" / "help" / language
        introduction = f"# {book['title']}\n\n{book['intro']}\n\n"
        index = introduction + "[Markdown](manual.md)\n\n"
        manual = introduction
        offline = introduction
        for section in book["sections"]:
            if not section["paragraphs"] or not section["steps"]:
                raise ValueError("Incomplete user help.")
            reference = ROOT / "docs" / section["reference"]
            if not reference.is_file():
                raise ValueError(f"Missing technical reference: {reference}")
            body = "\n\n".join(section["paragraphs"]) + "\n\n"
            body += (
                "\n".join(f"{number}. {step}" for number, step in enumerate(section["steps"], 1))
                + "\n"
            )
            title = section["title"]
            index += f"- [{title}]({section['id']}.md)\n"
            article = f"# {title}\n\n{body}"
            technical = f"\n[{labels[language]}](../../{section['reference']})\n"
            output[folder / f"{section['id']}.md"] = article + technical
            heading = f'\n<a id="{section["id"]}"></a>\n\n## {title}\n\n'
            manual += heading + body + technical
            offline += heading + body
        output[folder / "index.md"] = index
        output[folder / "manual.md"] = manual
        output[source / "public" / "help" / language / "manual.md"] = offline
    models = [
        {
            "model": model,
            "protocol": profile.protocol,
            "commands": [
                key for key, query in profile.queries.items() if query.decoder is not None
            ],
        }
        for model, profile in sorted(read_profiles().items())
        if profile.protocol in ("CAT ASCII", "Icom CI-V")
        and profile.binding_status == "model_profile"
    ]
    output[source / "src" / "agent-profiles.json"] = (
        json.dumps(models, indent=2, ensure_ascii=False) + "\n"
    )
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    files = generated_files()
    if args.check:
        different = [
            str(path.relative_to(ROOT))
            for path, text in files.items()
            if not path.is_file() or path.read_text(encoding="utf-8") != text
        ]
        if different:
            print("Generated help is stale:\n" + "\n".join(different), file=sys.stderr)
            return 1
    else:
        for path, text in files.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8", newline="\n")
    print(
        f"Verified {len(files)} generated resources."
        if args.check
        else f"Generated {len(files)} resources."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
