# Test bench schema

[Español](schema.md) · [English (US)](schema.en.md) · [Français](schema.fr.md) · [Deutsch](schema.de.md)

Each firmware family has a `sources/<id>.es.json` fragment. `scripts/test-bench.cjs` merges them into `catalog.es.json` and checks that the `catalog.<lang>.json` translations have the same IDs, the same `menu` field, and the same placeholders.

```json
{
  "firmware": {
    "id": "f4hwn",
    "name": "F4HWN v6.x (Fusion, FieldOps, Transfer, Labs)",
    "family": "quansheng",
    "radios": ["Quansheng UV-K5 V3", "UV-K1"],
    "version": "v6.1",
    "sources": ["firmware/Fusion61/App/ui/menu.c", "docs/AYUDA-QUANSHENG.md"],
    "summary": "Brief description of the scope.",
    "prerequisites": ["EEPROM backup made with the web application."],
    "slotNotes": "Multiboot notes, optional."
  },
  "sections": [
    {
      "id": "f4hwn.menu",
      "title": "Main menu (MENU)",
      "description": "Optional.",
      "tests": [
        {
          "id": "f4hwn.menu.step",
          "menu": "Step",
          "path": "MENU > Step",
          "values": "2.5k … 100k",
          "steps": ["Enter MENU and choose Step.", "Select 12.5k and confirm."],
          "expected": "The VFO advances in 12.5 kHz steps.",
          "risk": "none",
          "variants": ["fusion", "labs"]
        }
      ]
    }
  ]
}
```

Rules:

- `id` must be unique, lowercase, and dot-separated: `<firmware>.<section>.<test>`; only `[a-z0-9._-]`.
- `menu` is the exact text displayed by the radio or web application. **Do not translate it.** Empty string if the test does not correspond to a menu.
- `path` uses actual key and menu names (not translated).
- `values` contains only actual values from the source (not translated). Empty string if not applicable.
- `risk`: `none` (observation or reversible settings), `rx` (reception), `tx` (transmits: requires a license, dummy load or suitable antenna), `write` (writes to radio memory), `recovery` (may prevent the radio from booting or erase data).
- `variants` is optional: editions where the test exists.
- Translatable fields: `name`, `summary`, `prerequisites`, `slotNotes`, `title`, `description`, `steps`, `expected`. All other fields are identical across languages.
- Procedures are newly written. Third-party manuals are not copied.
- Do not invent menus: each test comes from a repository source cited in `firmware.sources`.
