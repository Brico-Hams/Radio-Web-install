# Radtel RT-950 Pro · Desarrollo, flasheo y recuperación

Guía de banco para reducir el riesgo de dejar la radio sin arrancar. Los hallazgos de ingeniería inversa se refieren a las unidades y versiones estudiadas. La causa del incidente previo sigue sin determinarse.

Documentación detallada: docs/rt950-pro/README.md
## Qué se está programando

| Operación | Alcance y precaución |
|---|---|
| CPS/CHIRP o RadiCodex por BLE | Clonación de canales y ajustes. En variantes de 960 canales, tratar `0x7800–0x7FFF` como reservado. Los canales 961–990 de variantes compatibles ocupan parte de ese tramo. Si la variante es desconocida, trabajar en solo lectura. Mantener protegida también la cola `0xE000–0xFFFF`. |
| Actualización de firmware por cable | Escribe la aplicación interna del MCU. El flasheador de referencia envía un contenedor `.btf` por Web Serial. Verificar la compatibilidad exacta de la imagen, el cargador y el cable. |
| Almacenamiento externo y calibración | Una copia CPS no cubre todos los datos de fábrica. La herramienta comunitaria de respaldo de almacenamiento requiere arrancar su firmware auxiliar. Preparar una copia independiente si el trabajo afecta ese almacenamiento. |
| Consola nicFW950 por BLE | Interfaz de comandos del firmware alternativo. Identificar primero qué firmware arranca en la radio y usar la herramienta correspondiente. |

Fuentes: [mapa de memoria de NathanBarguss](https://github.com/NathanBarguss/Chirp_Radtel-RT-950-Pro/blob/254d2cd/docs/MemoryMap.md), [driver de pe1hvh](https://github.com/pe1hvh/chirp_radtel_rt950pro/blob/6060640/README.md), [Web Flasher y copia de almacenamiento](https://github.com/nicsure/RT-950-Pro-Web-Flasher/blob/818f37b/README.md) y [consola nicFW950](https://github.com/nicsure/nicFW950_BTLE_Console/blob/5bd0f22/README.md).

## Antes de escribir

1. Registrar modelo exacto **RT-950 Pro**, revisión de placa si se conoce, versión actual, variante de canales, herramienta, cable y síntomas previos. Si falta un dato necesario para confirmar compatibilidad, detenerse.
2. Con el firmware original operativo, guardar una copia de la configuración y verificar que se puede abrir. Registrar tamaño y SHA-256. Guardar por separado el paquete oficial de recuperación exacto para la unidad, sus instrucciones y el hash. Un hash identifica los bytes. La procedencia y la compatibilidad se comprueban aparte.
3. Confirmar en solo lectura que se puede entrar en el cargador y que la herramienta obtiene la respuesta esperada. Los procedimientos comunitarios describen combinaciones distintas según el modo. Usar la secuencia documentada para la unidad y comprobar la respuesta del cargador antes de escribir.
4. Usar una unidad de pruebas, batería cargada, cable estable y puerto directo. Reservar tiempo para recuperar y probar la radio. Conservar intactos el cargador, la calibración y los sectores desconocidos. Si el cambio requiere tocarlos, detenerse hasta disponer de un método de respaldo y recuperación validado.

## Antes de construir una imagen experimental

- Fijar el commit, toolchain, linker script, conversor BTF y herramienta de carga. Guardar ELF, mapa, binario, BTF y hashes. Revisar el espacio de Flash y RAM, pila, vector de reset, inicio de aplicación y final real de la imagen.
- Para la unidad AT32F403A documentada, distinguir el comienzo de la Flash interna en `0x08000000` y la aplicación en `0x08003000`. El contenedor BTF tiene su propio mapa de offsets. Verificar la transformación BTF con el empaquetador correspondiente. Mantener fuera de la escritura la región del cargador.
- Verificar el último bloque útil. Se documentó un cargador que perdía el último bloque enviado y corrompía recursos y datos al final de la imagen. El empaquetador del autor añade un bloque de relleno completo para esa variante. Confirmar el comportamiento con el mismo cargador y empaquetador antes de adoptar ese ajuste.
- En el primer arranque, mantener TX inhibido y evitar inicializar o migrar almacenamiento persistente hasta comprobar el mapa. Validar por etapas alimentación y arranque, pantalla y teclas, recepción, persistencia y reinicio. Probar TX únicamente con configuración autorizada y carga ficticia adecuada.
- Guardar el log de transferencia. Un ACK confirma un paso del protocolo. La validación exige comprobar que la radio arranca en frío y funciona. El cargador UART estudiado carece de lectura de firmware. Si la compilación permite calcular la huella de la aplicación desde el equipo, comprobar también el tramo final.

Referencias: [análisis del formato BTF y fallos de carga de jaymart1983](https://github.com/jaymart1983/rt950-pro-re/blob/4ecc044/FINDINGS.md) y [protocolo de carga documentado por Hertzz58](https://github.com/Hertzz58/Radtel-RT950-Pro-Firmware/blob/b49804b/tools/README.md).

## Si la radio deja de arrancar

1. Conservar la imagen usada, su hash, el log, la versión previa y el último estado observado. Detener los intentos con imágenes distintas y evitar los borrados masivos.
2. Si responde el cargador físico, seguir la recuperación documentada de esa unidad por cable con la imagen oficial previamente verificada. Comprobar el resultado con un arranque en frío y una prueba de recepción. Restaurar los ajustes después, solo si el formato y la variante coinciden.
3. Si el cargador no responde tras comprobar alimentación, cable, puerto y procedimiento exacto, pasar a soporte del fabricante o a diagnóstico de banco. El acceso SWD requiere confirmar placa, pines y tensiones. Empezar por diagnóstico y lectura cuando sea posible. Un borrado global o un volcado de otra unidad puede eliminar el cargador y datos propios de fábrica.
4. Para cerrar el incidente, registrar qué respondió, qué se recuperó y qué se verificó. Ante una causa incierta, mantenerla como pendiente en el registro.

Validación actual: contraste documental. La recuperación y las comprobaciones de flasheo siguen pendientes en una unidad física.
