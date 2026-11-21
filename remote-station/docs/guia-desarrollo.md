# Guía de desarrollo

## Entorno

- Python 3.12 o posterior.
- PowerShell en Windows; en otros sistemas se puede invocar `python3`.
- Coordinador: biblioteca estándar; estación-agent: `pyserial==3.5`.
- Herramientas fijadas de desarrollo: [requirements-dev.txt](../requirements-dev.txt).
- Para la consola web: Node.js 22 y npm; dependencias y scripts en
  [apps/web-console](../apps/web-console/README.md).

## Bucle de validación local

```powershell
py -3.12 -m pip install .
py -3.12 -m pip install -r requirements-dev.txt
py -3.12 -m ruff check .
py -3.12 -m ruff format --check .
py -3.12 -m compileall -q bricoham_remote_station tests
py -3.12 -m unittest discover -s tests -v
py -3.12 -m pip_audit -r requirements-dev.txt
py -3.12 -m pip_audit .
npm ci --prefix apps/web-console
npm run test --prefix apps/web-console
npm run lint --prefix apps/web-console
npm run build --prefix apps/web-console
```

## Añadir una capacidad

1. Identificar fabricante/modelo exacto, firmware, interfaz y manual público.
2. No inferir capacidades por familia, control scope, comandos de otro modelo ni
   soporte de Hamlib.
3. Añadir registro con fuente, implementación, test, hardware usado, fecha y
   limitaciones.
4. Añadir pruebas que impidan declarar `verified` sin evidencia de hardware.
5. Si implica TX, detenerse: la fase de TX está bloqueada y no se autoriza
   implícitamente al añadir una capacidad.

## Límites de cambios

El control de radio y el inventario del agente siguen siendo de solo lectura y
solo locales. La enumeración no abre dispositivos. La única escritura HTTP
implementada es el alta de contactos en el logbook opt-in, con permiso de
admin/operador; no habilita rutas de control CAT ni escucha externa.

## Integración offline de protocolos

[El diagnóstico](diagnostico-cat.md) une los codecs al catálogo y a una CLI.
`GET /api/v1/protocols` enumera las consultas; no es una ruta de ejecución CAT.
Las implementaciones de familia deben conservar `family_syntax_only` hasta
disponer de evidencia por modelo. Un encoder sin parser se anuncia como tal.

El [logbook](logbook.md) comparte la lógica SQLite entre CLI y API web. No
dupliques validación o exportación en el handler. La consola exige introducir
datos manuales; no debe registrar la demostración como contactos reales.

Para empaquetar la consola y módulos juntos, ejecuta
`py -3.12 scripts\build_release.py` después de instalar las dependencias npm.
Verifica el wheel en un entorno separado y desde fuera del árbol de fuentes;
comprueba `/`, sus assets y una operación autenticada del logbook.
