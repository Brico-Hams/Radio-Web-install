# Schéma du banc d'essai

[Español](schema.md) · [English (US)](schema.en.md) · [Français](schema.fr.md) · [Deutsch](schema.de.md)

Chaque famille de firmware possède un fragment `sources/<id>.es.json`. `scripts/test-bench.cjs` les fusionne dans `catalog.es.json` et vérifie que les traductions `catalog.<lang>.json` contiennent les mêmes identifiants, le même champ `menu` et les mêmes paramètres de substitution.

```json
{
  "firmware": {
    "id": "f4hwn",
    "name": "F4HWN v6.x (Fusion, FieldOps, Transfer, Labs)",
    "family": "quansheng",
    "radios": ["Quansheng UV-K5 V3", "UV-K1"],
    "version": "v6.1",
    "sources": ["firmware/Fusion61/App/ui/menu.c", "docs/AYUDA-QUANSHENG.md"],
    "summary": "Brève description du périmètre.",
    "prerequisites": ["Sauvegarde de l'EEPROM effectuée avec l'application web."],
    "slotNotes": "Notes multiboot, facultatives."
  },
  "sections": [
    {
      "id": "f4hwn.menu",
      "title": "Menu principal (MENU)",
      "description": "Facultative.",
      "tests": [
        {
          "id": "f4hwn.menu.step",
          "menu": "Step",
          "path": "MENU > Step",
          "values": "2.5k … 100k",
          "steps": ["Ouvrez MENU et choisissez Step.", "Sélectionnez 12.5k et confirmez."],
          "expected": "Le VFO avance par pas de 12,5 kHz.",
          "risk": "none",
          "variants": ["fusion", "labs"]
        }
      ]
    }
  ]
}
```

Règles :

- `id` unique, en minuscules, avec des points : `<firmware>.<section>.<test>` ; uniquement `[a-z0-9._-]`.
- `menu` est le texte exact affiché par la radio ou l'application web. **Il ne se traduit pas.** Chaîne vide si le test ne correspond pas à un menu.
- `path` utilise les vrais noms des touches et menus (non traduits).
- `values` contient uniquement les valeurs réelles de la source (non traduites). Chaîne vide si sans objet.
- `risk` : `none` (observation ou réglages réversibles), `rx` (réception), `tx` (émission : nécessite licence, charge fictive ou antenne adaptée), `write` (écriture dans la mémoire radio), `recovery` (peut empêcher le démarrage ou effacer des données).
- `variants` facultatif : éditions dans lesquelles le test existe.
- Champs traduisibles : `name`, `summary`, `prerequisites`, `slotNotes`, `title`, `description`, `steps`, `expected`. Tous les autres restent identiques dans toutes les langues.
- Procédures rédigées à neuf. Aucun manuel tiers n'est copié.
- Ne pas inventer de menus : chaque test provient d'une source du dépôt citée dans `firmware.sources`.
