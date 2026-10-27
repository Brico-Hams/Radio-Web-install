# Esquema del banco de pruebas

[Español](schema.md) · [English (US)](schema.en.md) · [Français](schema.fr.md) · [Deutsch](schema.de.md)

Cada familia de firmware tiene un fragmento `sources/<id>.es.json`. `scripts/test-bench.cjs` los une en `catalog.es.json` y comprueba que las traducciones `catalog.<lang>.json` tengan los mismos ids, el mismo campo `menu` y los mismos huecos.

```json
{
  "firmware": {
    "id": "f4hwn",
    "name": "F4HWN v6.x (Fusion, FieldOps, Transfer, Labs)",
    "family": "quansheng",
    "radios": ["Quansheng UV-K5 V3", "UV-K1"],
    "version": "v6.1",
    "sources": ["firmware/Fusion61/App/ui/menu.c", "docs/AYUDA-QUANSHENG.md"],
    "summary": "Texto breve del alcance.",
    "prerequisites": ["Copia de seguridad de la EEPROM hecha con la web."],
    "slotNotes": "Notas de multiboot, opcional."
  },
  "sections": [
    {
      "id": "f4hwn.menu",
      "title": "Menú principal (MENU)",
      "description": "Opcional.",
      "tests": [
        {
          "id": "f4hwn.menu.step",
          "menu": "Step",
          "path": "MENU > Step",
          "values": "2.5k … 100k",
          "steps": ["Entra en MENU y elige Step.", "Selecciona 12.5k y confirma."],
          "expected": "El VFO avanza de 12,5 kHz en 12,5 kHz.",
          "risk": "none",
          "variants": ["fusion", "labs"]
        }
      ]
    }
  ]
}
```

Reglas:

- `id` único, en minúsculas, con puntos: `<firmware>.<sección>.<prueba>`; solo `[a-z0-9._-]`.
- `menu` es el texto exacto que muestra la radio o la web. **No se traduce.** Cadena vacía si la prueba no corresponde a un menú.
- `path` usa los nombres reales de teclas y menús (no se traduce).
- `values` solo valores reales de la fuente (no se traduce). Cadena vacía si no aplica.
- `risk`: `none` (solo mirar o ajustes reversibles), `rx` (recepción), `tx` (transmite: requiere licencia, carga ficticia o antena adecuada), `write` (escribe en la memoria de la radio), `recovery` (puede dejar la radio sin arrancar o borrar datos).
- `variants` opcional: ediciones donde existe la prueba.
- Campos traducibles: `name`, `summary`, `prerequisites`, `slotNotes`, `title`, `description`, `steps`, `expected`. Los demás son idénticos en todos los idiomas.
- Procedimientos redactados de nuevo. No se copian manuales de terceros.
- No se inventan menús: cada prueba sale de una fuente del repositorio, citada en `firmware.sources`.
