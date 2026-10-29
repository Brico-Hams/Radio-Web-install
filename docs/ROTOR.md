# Rotor AZ/EL Bricohams desde la app Android

Integra la app Android con el rotor del proyecto hermano
[Brico-Hams/antenaSatCommrotor](https://github.com/Brico-Hams/antenaSatCommrotor)
(ESP32 + dos motores paso a paso + finales de carrera). Juntos forman la estación
de satélites Bricohams completa:

```
 Satélites (SGP4, TLE, pases) ──► Rotor AZ/EL (ESP32, SGP4 propio) ──► antena
          │                         ▲  Wi-Fi 192.168.4.1 o BLE seguro
          └──► CAT USB (Doppler) ───┼──► radio Quansheng con firmware Bricohams
                                    └── móvil: hora UTC, ubicación, norte (brújula), nivel
```

El móvil hace de **GPS, reloj, brújula e inclinómetro** del rotor, así que la
estación no necesita esos módulos. El rotor sigue el pase con su propio SGP4 y
sus limitadores de seguridad; la app lo prepara, lo arma y lo vigila mientras CAT
corrige el Doppler de la radio en paralelo.

## Requisitos

- Rotor con el firmware de antenaSatCommrotor y, para usar la hora del móvil, el
  parche de [hardware/rotor](../hardware/rotor/README.md) (API 2). Con firmware
  sin parchear (API 1) la app funciona, pero la hora UTC debe venir del GNSS del
  rotor.
- Token de control configurado por USB en el rotor (24-128 caracteres) y, para
  BLE, el PIN de 6 dígitos del rotor.
- Ubicación configurada en Satélites › Ajustes (o la del pase seleccionado).

## Flujo de uso

1. En **Satélites**, abre un pase y pulsa **Rotor AZ/EL: preparar y seguir este
   pase**. La pantalla calcula la trayectoria (300 puntos) y la compara con la
   mecánica del rotor.
2. Elige **Wi-Fi del rotor** (conéctate antes a su red; la app fuerza el tráfico
   por la Wi-Fi aunque no tenga internet) o **Bluetooth seguro** (empareja con el
   PIN la primera vez). Escribe el token y pulsa **Conectar**.
3. **Homing**: busca los finales de carrera de AZ y EL. Tras el homing la antena
   queda a EL 0° apuntando al **corte de cable** (AZ mecánico -180°).
4. Antes de calibrar, la app indica **hacia qué rumbo verdadero dejar el corte de
   cable** para que el pase no lo cruce (mitad del arco del cielo que el pase no
   visita). Gira el trípode hacia ese rumbo.
5. **Calibrar norte y nivel con el móvil**: apoya el móvil plano sobre el boom,
   con la parte superior hacia los elementos. La app usa el vector de rotación,
   corrige la declinación magnética con el modelo WMM de Android y promedia las
   últimas lecturas; también comprueba que el móvil esté nivelado (±1°). Puedes
   escribir el azimut a mano si no hay brújula o hay metales cerca.
6. **Preparar pase**: envía hora UTC y ubicación, carga el TLE (solo ese
   satélite, id 0), lo selecciona y lleva la antena al punto de AOS.
7. **Seguir automáticamente desde AOS**: la app mantiene la pantalla encendida y,
   desde 1 s antes de AOS, pide `/api/track` cada 2 s. Si el rotor responde que la
   antena está a más de 15° (adquisición), la reapunta a donde estará el satélite
   y reintenta. Se desarma en LOS o si el rotor entra en fallo.
8. Abre **CAT** en el mismo pase para el Doppler de la radio: ambos funcionan a la
   vez.

**PARAR motores** está siempre arriba y desarma el seguimiento automático.

## Avisos del plan

- **Cable**: el firmware se detiene si el azimut mecánico cruzaría ±180°. Con el
  rotor calibrado la app avisa y propone el nuevo rumbo del corte.
- **Velocidad**: si el pase exige más °/s que el perfil del motor, el rotor se
  para cerca del máximo. El perfil `esp32_nema17` del parche sube de 2,25 a
  ~5,9°/s.
- **Cénit**: por encima de 89° el firmware detiene el seguimiento.
- Se muestra el porcentaje de pase que se puede seguir sin paradas.

## Seguridad

- Ten a mano la seta de emergencia física: la app no la sustituye.
- Con BLE, si el enlace cae con el rotor en movimiento, el firmware entra en
  **fallo** a propósito; hay que **Borrar fallo**, repetir homing y calibrar.
- La hora enviada por la app vale **10 minutos**; mientras la pantalla del rotor
  esté abierta la app la reenvía cada 60 s. Si el rotor tiene GNSS válido, este
  tiene prioridad.
- Solo hay un dueño del movimiento: si otro cliente (web, BLE) controla el rotor,
  la app recibe 409 y lo muestra.

## Detalles técnicos

| Pieza | Archivo |
| --- | --- |
| Protocolo (JSON HTTP/BLE, tramas de 20 bytes, TLE 3LE) | `android/.../RotorProtocol.kt` |
| Cliente tipado y transporte HTTP ligado a la Wi-Fi | `RotorClient.kt` |
| Transporte BLE con emparejamiento cifrado (MITM) | `RotorBle.kt` |
| Plan de cable, velocidad, cénit y corte sugerido | `RotorPlanner.kt` |
| Brújula + nivel con declinación | `RotorCompass.kt` |
| Pantalla | `RotorActivity.kt` |

- HTTP en texto claro solo hacia `192.168.4.1` (`network_security_config.xml`);
  el resto de la app sigue exigiendo HTTPS. Cada petición lleva `X-Control-Token`.
- Permisos nuevos: `ACCESS_NETWORK_STATE`, `BLUETOOTH_SCAN` (sin ubicación),
  `BLUETOOTH_CONNECT` y, hasta Android 11, `BLUETOOTH`/`BLUETOOTH_ADMIN` y
  ubicación para escanear.

## Validación

- Pruebas host (Robolectric): `RotorTest` (tramas, reensamblado y preferencia de
  STOP, límites, TLE, estados API 1/2, cliente, planificador) y
  `RotorActivityTest` (conexión con transporte simulado, preparar pase, parar,
  errores) y el botón desde `SatelliteActivityTest`.
- **Pendiente**: prueba con rotor físico, Wi-Fi y BLE reales, brújula de móvil
  real y compilación del firmware parcheado con PlatformIO.
