# Testbankschema

[Español](schema.md) · [English (US)](schema.en.md) · [Français](schema.fr.md) · [Deutsch](schema.de.md)

Jede Firmwarefamilie besitzt ein Fragment `sources/<id>.es.json`. `scripts/test-bench.cjs` führt sie in `catalog.es.json` zusammen und prüft, dass die Übersetzungen `catalog.<lang>.json` dieselben IDs, dasselbe Feld `menu` und dieselben Platzhalter enthalten.

```json
{
  "firmware": {
    "id": "f4hwn",
    "name": "F4HWN v6.x (Fusion, FieldOps, Transfer, Labs)",
    "family": "quansheng",
    "radios": ["Quansheng UV-K5 V3", "UV-K1"],
    "version": "v6.1",
    "sources": ["firmware/Fusion61/App/ui/menu.c", "docs/AYUDA-QUANSHENG.md"],
    "summary": "Kurze Beschreibung des Umfangs.",
    "prerequisites": ["EEPROM-Sicherung mit der Webanwendung erstellt."],
    "slotNotes": "Multiboot-Hinweise, optional."
  },
  "sections": [
    {
      "id": "f4hwn.menu",
      "title": "Hauptmenü (MENU)",
      "description": "Optional.",
      "tests": [
        {
          "id": "f4hwn.menu.step",
          "menu": "Step",
          "path": "MENU > Step",
          "values": "2.5k … 100k",
          "steps": ["MENU öffnen und Step wählen.", "12.5k auswählen und bestätigen."],
          "expected": "Der VFO läuft in Schritten von 12,5 kHz weiter.",
          "risk": "none",
          "variants": ["fusion", "labs"]
        }
      ]
    }
  ]
}
```

Regeln:

- `id` ist eindeutig, kleingeschrieben und mit Punkten getrennt: `<firmware>.<abschnitt>.<test>`; nur `[a-z0-9._-]`.
- `menu` ist der genaue Text auf dem Funkgerät oder in der Webanwendung. **Nicht übersetzen.** Leere Zeichenfolge, falls der Test keinem Menü entspricht.
- `path` verwendet die tatsächlichen Tasten- und Menünamen (nicht übersetzt).
- `values` enthält nur tatsächliche Werte der Quelle (nicht übersetzt). Leere Zeichenfolge, falls nicht zutreffend.
- `risk`: `none` (nur Beobachtung oder umkehrbare Einstellungen), `rx` (Empfang), `tx` (sendet: Lizenz, Dummyload oder geeignete Antenne erforderlich), `write` (schreibt in den Funkgerätespeicher), `recovery` (kann den Start verhindern oder Daten löschen).
- `variants` ist optional: Editionen, in denen der Test existiert.
- Übersetzbare Felder: `name`, `summary`, `prerequisites`, `slotNotes`, `title`, `description`, `steps`, `expected`. Alle übrigen Felder sind in allen Sprachen identisch.
- Abläufe werden neu formuliert. Fremde Handbücher werden nicht kopiert.
- Keine Menüs erfinden: Jeder Test stammt aus einer Repositoryquelle, die in `firmware.sources` genannt ist.
