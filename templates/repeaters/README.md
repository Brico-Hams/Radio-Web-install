# Plantillas de repetidores por radio y pais

Archivos generados por `npm run templates:build` (sin red) a partir de `data/channel-templates/<CC>.json`. No editar a mano.

- Radios: RadiCodex (`radicodex`, .csv); Radtel RT-950 Pro (`rt950pro`, .csv); Quansheng UV-K5 V3 (`uvk5v3`, .csv); AnyTone AT-D878 (`d878`, .json); Yaesu FTX-1 (`ftx1`, .csv).
- Paises con datos: 41 de 80. Archivos: 205. Generado: 2026-11-16T13:02:58.321Z.
- Ruta: `templates/repeaters/<radio>/<CC>.<ext>`. `index.json` lista cada archivo con canales, descartados y SHA-256 (`path` es relativo a esta carpeta).

## Formato

Cada archivo usa el mismo exportador que la aplicacion (`templateExportFile`): CSV de referencia (RadiCodex, RT-950 Pro, FTX-1), CSV compatible con CHIRP (UV-K5 V3) o proyecto AnyTone (AT-D878). Se descartan, y se cuentan en `dropped`, los canales fuera de las bandas del modelo, con una modulacion que no soporta o que no caben en sus zonas, bancos o memorias.

## Solo RX

Los repetidores son canales de solo recepcion: el TX queda bloqueado y la entrada nominal y el tono publicado se conservan solo como referencia. Ningun archivo programa la radio por si mismo; verifica la actividad local, las restricciones y tu licencia antes de usarlos.

## Fuentes y permisos

- https://hearham.com/api/repeaters/v1
- https://hearham.com/repeaters
- https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson

- Repetidores: [HearHam](https://hearham.com/repeaters), usados con el permiso publicado en esa pagina. Cobertura parcial; no es un registro nacional completo.
- Regiones: [Natural Earth](https://www.naturalearthdata.com/) (limites administrativos, dominio publico).
- Sin datos no se inventa nada: un pais sin repetidores utilizables no genera archivos.

## Paises pendientes de fuente

- AL Albania: HearHam no publica repetidores FM operativos utilizables para este pais.
- AD Andorra: HearHam no publica repetidores FM operativos utilizables para este pais.
- BY Bielorrusia: HearHam no publica repetidores FM operativos utilizables para este pais.
- BA Bosnia y Herzegovina: HearHam no publica repetidores FM operativos utilizables para este pais.
- BG Bulgaria: HearHam no publica repetidores FM operativos utilizables para este pais.
- HR Croacia: HearHam no publica repetidores FM operativos utilizables para este pais.
- FI Finlandia: HearHam no publica repetidores FM operativos utilizables para este pais.
- GR Grecia: HearHam no publica repetidores FM operativos utilizables para este pais.
- IS Islandia: HearHam no publica repetidores FM operativos utilizables para este pais.
- XK Kosovo: HearHam no publica repetidores FM operativos utilizables para este pais.
- LV Letonia: HearHam no publica repetidores FM operativos utilizables para este pais.
- LI Liechtenstein: HearHam no publica repetidores FM operativos utilizables para este pais.
- LT Lituania: HearHam no publica repetidores FM operativos utilizables para este pais.
- LU Luxemburgo: HearHam no publica repetidores FM operativos utilizables para este pais.
- MT Malta: HearHam no publica repetidores FM operativos utilizables para este pais.
- MD Moldavia: HearHam no publica repetidores FM operativos utilizables para este pais.
- MC Mónaco: HearHam no publica repetidores FM operativos utilizables para este pais.
- ME Montenegro: HearHam no publica repetidores FM operativos utilizables para este pais.
- RO Rumanía: HearHam no publica repetidores FM operativos utilizables para este pais.
- SM San Marino: HearHam no publica repetidores FM operativos utilizables para este pais.
- SK Eslovaquia: HearHam no publica repetidores FM operativos utilizables para este pais.
- SI Eslovenia: HearHam no publica repetidores FM operativos utilizables para este pais.
- UA Ucrania: HearHam no publica repetidores FM operativos utilizables para este pais.
- VA Ciudad del Vaticano: HearHam no publica repetidores FM operativos utilizables para este pais.
- CR Costa Rica: HearHam no publica repetidores FM operativos utilizables para este pais.
- SV El Salvador: HearHam no publica repetidores FM operativos utilizables para este pais.
- GT Guatemala: HearHam no publica repetidores FM operativos utilizables para este pais.
- BS Bahamas: HearHam no publica repetidores FM operativos utilizables para este pais.
- CU Cuba: HearHam no publica repetidores FM operativos utilizables para este pais.
- GD Granada: HearHam no publica repetidores FM operativos utilizables para este pais.
- HT Haití: HearHam no publica repetidores FM operativos utilizables para este pais.
- LC Santa Lucía: HearHam no publica repetidores FM operativos utilizables para este pais.
- BO Bolivia: HearHam no publica repetidores FM operativos utilizables para este pais.
- GY Guyana: HearHam no publica repetidores FM operativos utilizables para este pais.
- PY Paraguay: HearHam no publica repetidores FM operativos utilizables para este pais.
- PE Perú: HearHam no publica repetidores FM operativos utilizables para este pais.
- SR Surinam: HearHam no publica repetidores FM operativos utilizables para este pais.
- UY Uruguay: HearHam no publica repetidores FM operativos utilizables para este pais.
- VE Venezuela: HearHam no publica repetidores FM operativos utilizables para este pais.

Rusia y Turquia no estan incluidas: no hay una division fiable de su parte europea con estas fuentes.

## Regenerar

```
npm run fetch:channel-templates
npm run templates:build
```
