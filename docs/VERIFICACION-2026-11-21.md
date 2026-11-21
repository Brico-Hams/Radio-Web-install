# Verificación de compilaciones: 21 de noviembre de 2026

Ejecución en Windows sobre la copia `D:\Git\Radio-Web-install`. Una
compilación cruzada o una prueba simulada no acredita funcionamiento en el
sistema o dispositivo de destino.

## Resultados

| Componente | Resultado en esta máquina |
|---|---|
| Workspace JavaScript | 483 pruebas aprobadas; `npm run check` aprobado. |
| Host y agente Python | 242 pruebas, una omitida por requerir POSIX; comprobaciones de ayuda y contrato diagnóstico aprobadas. |
| Agente ZIPAPP | Paquete nuevo y prueba aislada: 18 pruebas, una omitida. |
| Host wheel | Paquete nuevo, 11 recursos web verificados y 15 pruebas aisladas, una omitida. |
| Consola web | 97 pruebas Vitest, lint y compilación TypeScript/Vite aprobados. |
| Agente USB Android y núcleo | Pruebas unitarias y lint de ambos módulos y APK debug del agente aprobados. El núcleo agotó inicialmente un plazo de espera de cinco segundos y pasó al repetir; no se ha determinado la causa. |
| Cliente Android Capacitor | Sincronización, lint, APK debug y APK release sin firmar completados. La firma v2 del debug se verificó; el release no es publicable sin firma de producción. |
| RadiCodex Android | Ensamblados GitHub debug y release y F-Droid release; lint vital de las dos variantes release aprobado. La firma v2 del debug se verificó y los releases están sin firmar. |
| Cliente iOS Capacitor | Recursos sincronizados y comparados con la compilación web; no compilado ni firmado. |

La suite amplia `:app:testGithubDebugUnitTest` de RadiCodex no terminó: se
observaron errores `OutOfMemoryError` en hilos `anonymous-diagnostics` y se
detuvo la ejecución propia para proteger la máquina compartida. No se ha
establecido la causa raíz ni debe considerarse superada por compilar un APK.
Después se ejecutaron aisladamente `AnonymousDiagnosticsTest` (3 pruebas),
`RemoteStationActivityTest` (3) y `AppLanguageTest` (2): las ocho pasaron.
Esto no sustituye la suite completa. La compilación también mostró advertencias
Kotlin en `AcarsChannels.kt`, `MainActivity.kt` y `NetControlActivity.kt`.

## Artefactos y límites

Los paquetes de esta ejecución se encuentran en
`remote-station/dist/verification-20261121` (ruta local: `dist/` está en
.gitignore y los artefactos no están versionados),
separados de distribuciones anteriores. Las firmas de depuración no son
credenciales de publicación. Los hashes verifican integridad de archivos, no
la seguridad ni el funcionamiento del producto. El
manifiesto SHA-256 (`remote-station/dist/verification-20261121/SHA256SUMS.txt`, local, no versionado)
pertenece únicamente a esta ejecución; los binarios son artefactos locales
generados y no se han publicado.

No se ejecutaron compilaciones o pruebas nativas en Linux, ARM/Raspberry Pi,
macOS, iOS/iPadOS ni FreeBSD. Para completarlas se requieren sus entornos y,
cuando corresponda, dispositivos físicos y certificados de firma. La matriz
CI preparada no equivale a una ejecución remota.

Tampoco se realizó aceptación física de Android OTG, audio o transmisión RF.
La evidencia limitada de lectura USB de la FTX-1 y sus restricciones figura en
la [documentación del hardware](../remote-station/docs/hardware/ftx1-spa1.md).
El espectro nativo sigue sin protocolo de extracción verificado.
