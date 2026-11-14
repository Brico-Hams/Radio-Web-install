# Architettura di Bricohams Radio Workspace

Bricohams Radio Workspace è un'applicazione web **locale**. Un piccolo server Node.js serve un elenco chiuso di file statici e poche API di sola lettura. Tutta la comunicazione con la radio avviene nel browser tramite WebUSB o Web Serial.

<a id="modos-de-ejecución"></a>
## Modalità di esecuzione

All'avvio, `runtime-mode.js` richiede `runtime.json` (percorso relativo, senza cache). Solo `{"mode":"local"}` attiva la modalità locale; se manca, restituisce 404, non è JSON o la pagina viene aperta come `file://`, l'applicazione parte in **modalità web** senza errori. `server.cjs` lo serve come `{"mode":"local"}` e `scripts/build-pages.cjs` genera `{"mode":"web"}` in `dist/`. Il badge superiore indica «Web · GitHub Pages» o «Locale · installato».

| Aspetto | Web (Pages) | Locale |
| --- | --- | --- |
| Server | Nessuno, solo file statici | `server.cjs` su `127.0.0.1:8787` |
| Firmware F4HWN / ARDF K1-K5 V3 | Cronologia stabile da Armel e reald tramite `api.github.com`; l'utente carica il file e vengono verificati dimensione e SHA-256 pubblicato | Download verificato dal server; ARDF, versioni precedenti alla v6 e SA818 solo per il download |
| Firmware OpenGD77 | Caricamento manuale dello ZIP (nome e firma ZIP; senza hash dell'editore) | Download tramite il server |
| RadioID | Caricamento di `user.csv` (100 MiB, filtrato, 5.000 righe mostrate) e profilo facoltativo in `localStorage` | API tramite server |
| RepeaterBook | Non disponibile | Token approvato, solo sul server |
| Satelliti | `data/satellites.json` giornaliero (`scripts/fetch-satellites.cjs`) | TLE in tempo reale |

I percorsi del client sono sempre relativi. La CSP di ogni HTML è dichiarata in `<meta>` e, poiché `<meta>` non supporta `frame-ancestors`, `app.js` si arresta se la pagina è in un frame. Il sito web ha un'origine propria (vedi ADR-013).

## Vista dei componenti

```mermaid
flowchart LR
  subgraph Equipo["Equipo del usuario (127.0.0.1)"]
    subgraph Navegador["Chrome / Edge de escritorio"]
      UI["app.js / radio-ui.js / planning-ui.js<br/>Interfaz"]
      CON["gd77-connector.js<br/>quansheng-connector.js"]
      TR["transports.js<br/>WebUSB / Web Serial"]
      CORE["radio-core.js<br/>CRC, tramas, permisos"]
      CP["codeplug-editor.js<br/>planning-core.js"]
      BK["backup-store.js<br/>IndexedDB + SHA-256"]
    end
    SRV["server.cjs<br/>estáticos + API"]
    FW["firmware-service.cjs<br/>catálogo y descargas verificadas"]
    DS["data-service.cjs<br/>RadioID, RepeaterBook, SatNOGS, CelesTrak"]
  end
  Radio[("Radio<br/>OpenGD77 / UV-K1 / UV-K5 V3")]
  Ext[("Proveedores oficiales<br/>GitHub Releases, opengd77.com,<br/>RadioID, RepeaterBook, SatNOGS, CelesTrak")]
  UI --> CON --> TR --> Radio
  CON --> CORE
  CON --> BK
  UI --> CP
  UI -- "fetch /api/*" --> SRV
  SRV --> FW --> Ext
  SRV --> DS --> Ext
```

## Moduli

| File | Lato | Responsabilità |
| --- | --- | --- |
| `index.html`, `opengd77.html`, `quansheng.html`, `ayuda.html` | Browser | Scheletri delle pagine con `body[data-page]`, senza script inline. |
| `app.js` | Browser | Interfaccia comune (marchio, navigazione, piè di pagina), guide e pagina di aiuto con ricerca. |
| `radio-ui.js` | Browser | Pannello di connessione, backup automatici, cronologia, esportazione e azioni protette. |
| `transports.js` | Browser | `USBTransport` (CDC su WebUSB, `1FC9:0094`) e `SerialTransport` (Web Serial), con lettura esatta e timeout. |
| `radio-core.js` | Browser / Node | CRC-16/CRC-32, utilità binarie, permessi di scrittura e SHA-256. |
| `gd77-connector.js` | Browser | Protocollo OpenGD77 CPS (`C`/`R`/`W`/`X`) e mappe MK22, STM32 e SERIAL. |
| `quansheng-connector.js` | Browser | Protocollo UART F4HWN (offuscamento XOR, CRC), lettura di calibrazione e Flash, slot Multiboot. |
| `backup-store.js` | Browser | Persistenza in IndexedDB, rilettura verificata ed esportazione `.rwb.json`. |
| `codeplug-editor.js` | Browser / Node | Lettura e scrittura binaria del codeplug OpenGD77: canali, contatti e blocco SAT tipo 3. |
| `planning-core.js` | Browser / Node | Filtri, deduplicazione, CSV, validazione TLE e passaggi SGP4 con `satellite.js`. |
| `planning-ui.js` | Browser | Pannello «Codeplug: contatti, ripetitori e SAT». |
| `firmware-catalog.js` | Browser / Node | Modelli e fonti firmware consentiti. |
| `server.cjs` | Node | Server HTTP su `127.0.0.1:8787`, elenco di file consentiti, intestazioni di sicurezza e routing di `/api/*`. |
| `firmware-service.cjs` | Node | Consultazione di GitHub Releases e opengd77.com con reindirizzamenti controllati, limiti di dimensione e cache. |
| `runtime-mode.js` | Browser | Rileva la modalità (`runtime.json`; web se manca). |
| `radioid-csv.js` | Browser / Node | Lettura filtrata di `user.csv` e profilo locale facoltativo. |
| `scripts/build-pages.cjs`, `scripts/fetch-satellites.cjs` | Node | Generano `dist/` e `data/satellites.json` per Pages. |
| `data-service.cjs` | Node | Proxy di sola lettura verso RadioID, RepeaterBook (credenziali solo sul server), SatNOGS e CelesTrak. |

## Flusso di connessione e backup automatico

```mermaid
sequenceDiagram
  participant U as Usuario
  participant UI as radio-ui.js
  participant C as Conector
  participant R as Radio
  participant B as backup-store.js
  U->>UI: Selecciona el modelo y pulsa Conectar
  UI->>C: open() (gesto del usuario)
  C->>R: Identificación
  C->>R: Leer calibración
  C->>B: Guardar, calcular SHA-256 y releer
  C->>R: Leer Flash o codeplug completo (según la familia)
  C->>C: Verificar CRC, tamaños y cabeceras
  C->>B: Persistir y volver a verificar los hashes
  B-->>UI: Copia completa o parcial
  UI-->>U: Permiso de escritura solo si la copia es completa
  UI->>U: Descarga automática del .rwb.json
```

Prima di ogni scrittura, il backup viene riletto e confrontato con gli hash del permesso. Scollegare la radio, sostituirla o eliminare il backup revoca il permesso.

## Livelli di sicurezza

1. **Rete:** il server ascolta solo su `127.0.0.1`, richiede `Host: 127.0.0.1:<puerto>` e serve un elenco fisso di file.
2. **Browser:** CSP `default-src 'self'; script-src 'self'; style-src 'self'`, `Permissions-Policy`, `nosniff`, `no-referrer` e `no-store`. Non si usa `eval` né si costruisce HTML con dati della radio.
3. **Apparato:** le scritture usano un permesso *fail-closed* legato a un backup verificato. Main non è mai una destinazione. Cancellazione o ripristino richiedono una conferma digitata.
4. **Fonti esterne:** solo fornitori ufficiali, reindirizzamenti a host consentiti, limiti di dimensione e SHA-256 visibile. Le credenziali RepeaterBook non vengono mai inviate al browser.
5. **Dati:** niente telemetria né caricamenti verso server. I backup rimangono nell'IndexedDB del profilo locale e vengono esportati in file dell'utente.

## Limitazioni note

- **OpenGD77:** qui non esiste un protocollo verificato per estrarre l'intero firmware del MCU. Il backup è contrassegnato come **parziale** e la scrittura sulla radio rimane bloccata.
- **Quansheng:** il backup fisico completo della Flash richiede le capacità di lettura e CRC di F4HWN Labs v6.1+. Il web implementa la scrittura Beta di configurazione/canali con backup e rilettura, e le immagini Bricohams SAT incorporano CAT RX sperimentale. Ciò non dimostra scrittura persistente né funzionamento CAT su una radio specifica; consulta la [matrice di validazione](VALIDACION-INTEGRAL-V3-ANDROID.md).
- **RepeaterBook:** richiede un token approvato da RepeaterBook ed è presente solo nella versione locale.
- **Web:** i dati satellitari possono risalire a un giorno prima (avviso dopo 7 giorni) e firmware/RadioID vengono caricati manualmente.
- **Hardware:** esistono letture precedenti di un'unità Quansheng, ma non certificano scritture, residente indipendente o combinazione attuale di APK, slot SAT e telefono. Le prove fisiche di questa revisione sono in sospeso.

## Security review (SonarQube 2026-11-13)

### Corregido

**xml:S6358 – Android application backup should be disabled or restricted** (MEDIUM) — `android/app/src/fdroid/AndroidManifest.xml:6`.
- *Perché era un difetto:* con il backup abilitato, i dati locali (preferenze, file, database) possono essere esportati su Google Cloud o tramite `adb backup`, oppure ripristinati da una copia manipolata (CWE-922, OWASP M9/A1). L'overlay `<application>` del flavor F-Droid non dichiarava l'attributo, quindi l'analisi lo vedeva implicito (predefinito `true`).
- *Modifica:* si aggiunge `android:allowBackup="false"` all'overlay.
- *Nessuna perdita di funzionalità:* il manifest principale dichiara già `allowBackup="false"`, `fullBackupContent="false"` e `dataExtractionRules`; il valore unito non cambia. Verifica: il `manifest merger report` del flavor fdroid (`processFdroidReleaseMainManifest`) mostra `allowBackup=false`.

**xml:S5332 – Clear-text protocols should not be used** (LOW) — stesso file, riga 6.
- *Perché era un difetto:* su Android < 9 `usesCleartextTraffic` è implicitamente `true`, il che consente http non cifrato (intercettazione e manomissione, CWE-319, CWE-200).
- *Modifica:* si aggiunge `android:usesCleartextTraffic="false"` all'overlay.
- *Nessuna perdita di funzionalità:* il manifest principale lo imposta già su `false` e definisce `networkSecurityConfig`; il risultato unito è identico. Verifica: stesso report di unione; il comportamento del rotore/delle radio non cambia.

**kotlin:S2245 – Pseudorandom number generators (PRNGs) should not be used in security contexts** (MEDIUM) — `android/app/src/main/java/org/bricohams/radio/Rt950Protocol.kt:156`.
- *Perché era un difetto:* `Random()` non è un generatore crittograficamente sicuro; se un attaccante conosce o indovina il suo stato interno può prevedere i valori successivi (CWE-338, CWE-330, OWASP A2 Cryptographic Failures). Il valore predefinito di `Rt950Session.random` usava `Random()`.
- *Modifica:* il valore predefinito diventa `SecureRandom()` (`java.security.SecureRandom`, sottoclasse di `java.util.Random`). Il tipo del parametro resta `Random`, quindi i test possono iniettare un'istanza con seme fisso.
- *Nessuna perdita di funzionalità:* `buildKeyFrame` continua a usare gli stessi intervalli (`nextInt(2)+1`, `nextInt(5)`, `nextInt(KEYS.size)`), quindi i byte del protocollo RT-950 non cambiano formato. Verifica: (`Rt950ProtocolTest`: `headersAndKeySelection`, `readAllSkipsUnknownRegions`).

**kotlin:S2245 (MEDIUM)** — `android/app/src/test/java/org/bricohams/radio/Rt950ProtocolTest.kt:93` (e righe 67, 175, 309). Non modificato.
- *Perché Sonar lo segnala:* stesso motivo di cui sopra (PRNG non crittografico, CWE-338/CWE-330).
- *Decisione:* è un test unitario che usa `Random(it.toLong())` con seme fisso per generare frame di chiave riproducibili; non è un contesto di sicurezza (non genera segreti) e `SecureRandom` renderebbe il test non deterministico. Lasciato invariato.
- *Nessuna perdita di funzionalità:* non si tocca nulla. Verifica: `Rt950ProtocolTest` continua a passare; la classe di produzione accetta qualsiasi `Random` iniettato.

### Not changed - requires decision

- **javascript:S4036 (LOW, CWE-426/427)** — `scripts/build-platform-app.cjs:16,20,27,30`, `scripts/build-platform-resident.cjs:55,73,82,85,87,89`, `scripts/export-project.cjs:48,94,177,178,181,230`. Gli script invocano `arm-none-eabi-*`, `git` e `zip` per nome. Non esiste un percorso assoluto fisso valido per tutti i computer (la toolchain ARM e git si installano in posizioni diverse); inventarne uno o richiedere una nuova variabile d'ambiente cambierebbe l'uso. Decisione: accettare il rischio (strumenti di sviluppo eseguiti dallo sviluppatore stesso) oppure definire una variabile d'ambiente per il percorso della toolchain. (L'invocazione di `tar.exe` alla riga 228 usa già un percorso assoluto.)
- **kotlin:S1313 (LOW)** — `android/app/src/main/java/org/bricohams/radio/RotorProtocol.kt:14`. `AP_HOST = "192.168.4.1"` è l'indirizzo di fabbrica del punto di accesso del rotore ESP32; spostarlo nella configurazione romperebbe la connessione predefinita.
- **kotlin:S2245 (MEDIUM)** — `android/app/src/test/java/org/bricohams/radio/FtxEnhancedDecoderTest.kt:59`. È un test unitario con `Random(7)` a seme fisso per riprodurre il pattern di errori; non è un contesto di sicurezza e `SecureRandom` renderebbe il test non deterministico.
- **kotlin:S7204 (HIGH)** — `android/app/build.gradle.kts:52`. Attivare `isMinifyEnabled` richiede regole ProGuard/R8 (non esiste alcun `proguard-rules.pro`) e convalidare su dispositivo che riflessione/JSON/BLE funzionino ancora; non si può garantire senza prove fisiche. Decisione: creare le regole keep e provare un APK release minificato.

### Corregido (SonarQube 2026-11-14)

- **kotlin:S1143:** il `throw` dentro `finally` è rimosso in `RigActivity` e `SstvTransmit`.
- **kotlin:S899:** il risultato di `delete` ora è controllato in `OtaPlatform` e `SatelliteCatalog`.
- **java:S3034 / java:S2184:** aritmetica `byte`/`long` corretta (cast espliciti e maschere prima dell'operazione) in `Osd174`, `FtxFrames`, `FtxReceiver`, `Unpack77` e `Ldpc174`.
- **javascript:S2871:** i comparatori di `sort` ora sono espliciti.
- **javascript:S9383:** le promise fluttuanti sono attese o gestite.
- **javascript:S6324:** i caratteri di controllo sono rimossi dalle espressioni regolari.
- **javascript:S6544:** l'uso improprio delle promise è corretto.
- **javascript:S1143:** il `throw` dentro `finally` è rimosso in `quansheng-factory`.
- **javascript:S7727:** i callback di `map` sono corretti.
- **xml:S6358 / xml:S5332:** il manifest del flavor fdroid dichiara `android:allowBackup="false"` e `android:usesCleartextTraffic="false"`.
- **javascript:S4036:** il `PATH` di build è attendibile; marcato con `NOSONAR`.
- **kotlin:S2245:** l'RNG a seme fisso dei test è deterministico di proposito; marcato con `NOSONAR`.
- **kotlin:S7204:** R8 resta come `TODO` (in attesa di regole keep e prove su dispositivo).
