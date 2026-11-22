# Rotore AZ/EL Bricohams dall'app Android

Integra l'app Android con il rotore del progetto gemello
[Brico-Hams/antenaSatCommrotor](https://github.com/Brico-Hams/antenaSatCommrotor)
(ESP32 + due motori passo-passo + finecorsa). Insieme formano la stazione
satellitare Bricohams completa:

```
 Satélites (SGP4, TLE, pases) ──► Rotor AZ/EL (ESP32, SGP4 propio) ──► antena
          │                         ▲  Wi-Fi 192.168.4.1 o BLE seguro
          └──► CAT USB (Doppler) ───┼──► radio Quansheng con firmware Bricohams
                                    └── móvil: hora UTC, ubicación, norte (brújula), nivel
```

Il telefono fa da **GPS, orologio, bussola e inclinometro** del rotore, quindi la
stazione non ha bisogno di questi moduli. Il rotore segue il passaggio con il proprio SGP4 e
i suoi limitatori di sicurezza; l'app lo prepara, lo arma e lo sorveglia mentre CAT
corregge il Doppler della radio in parallelo.

## Requisiti

- Rotore con il firmware di antenaSatCommrotor `0.3.0-prototype` o successivo
  (API 2, integra la modifica di [hardware/rotor](../../../hardware/rotor/README.md))
  per usare l'ora del telefono. Con un firmware precedente (API 1) l'app funziona,
  ma l'ora UTC deve provenire dal GNSS del rotore.
- Token di controllo configurato via USB sul rotore (24-128 caratteri) e, per
  il BLE, il PIN a 6 cifre del rotore.
- Posizione configurata in Satelliti › Impostazioni (o quella del passaggio selezionato).

## Flusso d'uso

1. In **Satelliti**, apri un passaggio e tocca **Rotore AZ/EL: preparare e seguire questo
   passaggio**. La schermata calcola la traiettoria (300 punti) e la confronta con la
   meccanica del rotore.
2. Scegli **Wi-Fi del rotore** (collegati prima alla sua rete; l'app forza il traffico
   sul Wi-Fi anche se non ha internet) oppure **Bluetooth sicuro** (associa con il
   PIN la prima volta). Scrivi il token e tocca **Connetti**.
3. **Homing**: cerca i finecorsa di AZ ed EL. Dopo l'homing l'antenna
   resta a EL 0° puntata al **taglio del cavo** (AZ meccanico -180°).
4. Prima di calibrare, l'app indica **verso quale rotta vera lasciare il taglio del
   cavo** affinché il passaggio non lo attraversi (metà dell'arco di cielo che il passaggio non
   visita). Ruota il treppiede verso quella rotta.
5. **Calibrare nord e livello con il telefono**: appoggia il telefono piatto sul boom,
   con la parte superiore verso gli elementi. L'app usa il vettore di rotazione,
   corregge la declinazione magnetica con il modello WMM di Android e fa la media delle
   ultime letture; verifica inoltre che il telefono sia in piano (±1°). Puoi
   scrivere l'azimut a mano se non c'è la bussola o ci sono metalli vicini.
6. **Preparare il passaggio**: invia ora UTC e posizione, carica il TLE (solo quel
   satellite, id 0), lo seleziona e porta l'antenna al punto di AOS.
7. **Seguire automaticamente da AOS**: l'app mantiene lo schermo acceso e,
   da 1 s prima dell'AOS, richiede `/api/track` ogni 2 s. Se il rotore risponde che
   l'antenna è a più di 15° (acquisizione), la riposiziona dove sarà il satellite
   e riprova. Si disarma al LOS o se il rotore entra in errore.
8. Apri **CAT** sullo stesso passaggio per il Doppler della radio: entrambi funzionano
   contemporaneamente.

**FERMA motori** è sempre in alto e disarma l'inseguimento automatico.

## Avvisi del piano

- **Cavo**: il firmware si ferma se l'azimut meccanico attraversasse ±180°. Con il
  rotore calibrato l'app avvisa e propone la nuova rotta del taglio.
- **Velocità**: se il passaggio richiede più °/s del profilo del motore, il rotore
  si ferma vicino al massimo. Il profilo `esp32_nema17` del firmware sale da 2,25 a
  ~5,9°/s.
- **Zenit**: oltre 89° il firmware interrompe l'inseguimento.
- Viene mostrata la percentuale di passaggio che si può seguire senza fermate.

## Sicurezza

- Tieni a portata di mano il pulsante di emergenza fisico: l'app non lo sostituisce.
- Con il BLE, se il collegamento cade mentre il rotore è in movimento, il firmware entra in
  **errore** di proposito; bisogna **Cancellare l'errore**, ripetere l'homing e calibrare.
- L'ora inviata dall'app vale **10 minuti**; finché la schermata del rotore
  è aperta l'app la rinvia ogni 60 s. Se il rotore ha un GNSS valido, questo
  ha la priorità.
- C'è un solo proprietario del movimento: se un altro client (web, BLE) controlla il rotore,
  l'app riceve 409 e lo mostra.

## Dettagli tecnici

| Elemento | File |
| --- | --- |
| Protocollo (JSON HTTP/BLE, frame da 20 byte, TLE 3LE) | `android/.../RotorProtocol.kt` |
| Client tipizzato e trasporto HTTP legato al Wi-Fi | `RotorClient.kt` |
| Trasporto BLE con associazione cifrata (MITM) | `RotorBle.kt` |
| Piano di cavo, velocità, zenit e taglio suggerito | `RotorPlanner.kt` |
| Bussola + livello con declinazione | `RotorCompass.kt` |
| Schermata | `RotorActivity.kt` |

- HTTP in chiaro solo verso `192.168.4.1` (`network_security_config.xml`);
  il resto dell'app continua a richiedere HTTPS. Ogni richiesta porta `X-Control-Token`.
- Nuovi permessi: `ACCESS_NETWORK_STATE`, `BLUETOOTH_SCAN` (senza posizione),
  `BLUETOOTH_CONNECT` e, fino ad Android 11, `BLUETOOTH`/`BLUETOOTH_ADMIN` e
  posizione per la scansione.

## Convalida

- Test host (Robolectric): `RotorTest` (frame, riassemblaggio e precedenza di
  STOP, limiti, TLE, stati API 1/2, client, pianificatore) e
  `RotorActivityTest` (connessione con trasporto simulato, preparare il passaggio, fermare,
  errori) e il pulsante da `SatelliteActivityTest`.
- Firmware `0.3.0-prototype`: `esp32` ed `esp32_nema17` compilano con PlatformIO.
- **In sospeso**: prova con rotore fisico, Wi-Fi e BLE reali e bussola di telefono
  reale.
