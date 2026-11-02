# Tutorial dell'APK Android Bricohams

Guida passo passo all'unica APK Bricohams (`org.bricohams.radio`, app nativa Kotlin, Beta). Ogni tutorial indica l'obiettivo, che cosa serve, i passaggi con i testi esatti dello schermo, il risultato atteso e gli errori più comuni. Ambito tecnico completo e limiti sono in [Beta Android Bricohams](ANDROID.md). Le funzioni indicate come sperimentali non sono state validate con una radio reale: provale prima con un carico fittizio o solo in ricezione. L'app non ha un'interfaccia in italiano (offre Español, English (US), Français e Deutsch): le etichette tra virgolette sono quelle inglesi (English (US)) della schermata.

## Prima di iniziare

### Installazione e requisiti

**Obiettivo:** avere l'APK installata e funzionante.

**Serve:** un telefono con Android 8.0 (API 26) o successivo. L'app non richiede né server né account.

1. Scarica l'APK e verifica lo SHA-256 pubblicato (vedi [Beta Android Bricohams](ANDROID.md)).
2. Apri il file dal gestore file o dal browser. Android chiederà di autorizzare l'installazione da quell'app: accetta solo per questo passaggio.
3. L'APK è una build di sviluppo firmata con la chiave debug e non viene distribuita tramite Google Play.
4. Apri Bricohams. Vedrai il banner "BETA - local data. Export your data before uninstalling."

**Risultato atteso:** la schermata principale con le sezioni "Your radio workspace", "Radio and reception", "Your data and backups" e "Scope and privacy".

**Errori comuni:**

- Android blocca l'installazione: manca l'autorizzazione a installare dall'app che apre l'APK.
- Disinstallare l'app cancella i dati locali (SQLite privato): usa prima "Export all data as JSON".

### Permessi e perché vengono richiesti

Bricohams non raccoglie né invia dati. Questi sono i permessi del manifest e il loro scopo:

| Permesso | A che cosa serve |
| --- | --- |
| Posizione (precisa e approssimativa) | Una posizione GPS puntuale in ARDF e "Use last GPS position" nei Satelliti. Nessun tracciamento in background |
| Microfono | Solo quando premi "Start audio capture" o ricevi SSTV in CAT multi-radio. Concederlo non avvia la registrazione |
| Internet e stato della rete | Download HTTPS di TLE (CelesTrak) e frequenze (SatNOGS) e collegamento Wi-Fi al rotore (192.168.4.1) |
| Bluetooth (ricerca e connessione) | Rotore AZ/EL via BLE |
| USB host | Radio tramite cavo OTG. Android chiede il permesso per ogni dispositivo e non si collega mai da solo al collegamento |

Microfono, GPS, USB host, BLE e bussola non sono obbligatori per installare l'app: senza di essi si disattivano solo le funzioni corrispondenti.

### Scegliere la lingua

1. Nella schermata principale apri "Bricohams language".
2. Scegli "System language", Español, English (US), Français o Deutsch.

**Risultato atteso:** la lingua viene salvata sul telefono e applicata a tutte le schermate. Nominativi, nomi dei canali e file dell'utente non vengono tradotti.

## Tutorial

### 1. Log di stazione

**Obiettivo:** registrare contatti, cercarli e spostare i dati in sicurezza.

**Serve:** solo il telefono. Funziona offline.

**Aggiungere un contatto**

1. Apri la scheda "Logbook". Per un log POTA o SOTA, creane uno in "Logbooks": compila il nome del log, "Park or summit reference (blank for General)" (esempi EA-0123 e EA4/MD-001), "My station call" e premi "Create logbook".
2. Digita "Callsign" (da 3 a 20 caratteri: lettere, cifre e /).
3. Lascia vuoto il campo "UTC ISO" per usare l'ora corrente al salvataggio, oppure digita la data.
4. Compila "Frequency MHz", il modo, "Report sent", "Report received" e "Notes".
5. Premi "Save new contact".

**Risultato atteso:** il contatto viene salvato sul telefono; nominativo e note vengono svuotati, frequenza e modo restano. Se esistono già lo stesso nominativo, banda e modo, appare un avviso con "Do not save" o "Save anyway". Per modificare, tocca il contatto e usa "Save contact changes", "Cancel editing" o "Delete this contact" (con conferma).

**Cercare**

1. Digita in "Search this logbook: call, notes, mode or frequency".
2. Premi "Search contacts"; per rivedere tutto, "Show all contacts".

Vengono mostrati i 50 risultati più recenti; le esportazioni includono l'intero log.

**Importare ADIF con anteprima**

1. Premi "Import ADIF into this logbook (preview)" e scegli il file.
2. Controlla l'anteprima: elenca i "Fields NOT kept" e salta i contatti identici. Nulla viene salvato finché non accetti.
3. Accetta per importare in un'unica transazione.

Si accetta solo ADIF ASCII fino a 16 MiB e 50000 contatti. Fai prima una copia JSON.

**Copia JSON e ripristino**

1. Per salvare: "Export all data as JSON" (schermata principale) o "Export full JSON (with accents)" (log).
2. Per ripristinare: "Import Bricohams JSON backup", finestra "Import local backup", "Choose JSON". Non sovrascrive mai: se un ID è in conflitto, l'intera importazione viene annullata.

**Esportare per LoTW**

1. Premi "Export this logbook as ADIF (ASCII)".
2. Firma e carica il file con TQSL su un computer: questa APK non carica su LoTW.

**Errori comuni:**

- Nominativo rifiutato: deve contenere lettere, cifre e /.
- Riferimento POTA o SOTA nel formato sbagliato (EA-0123, EA4/MD-001).
- ADIF con UTF-8 o caratteri di controllo: non accettato; conserva l'originale.

### 2. ARDF e GPS

**Obiettivo:** annotare osservazioni di beacon con la posizione del telefono.

**Serve:** permesso di posizione e cielo aperto per il GPS (facoltativo: si può salvare senza coordinate).

1. Nella scheda "ARDF" digita "New session name" e premi "Create ARDF session" (oppure seleziona una sessione).
2. Indica "Beacon (1-10)" e "Observation notes".
3. Premi "Get GPS position once (30 s)" e accetta la finestra "Position for ARDF". Attendi la posizione.
4. Premi "Save manual observation".
5. Premi "Session statistics and observations" per controllare e "Export sessions and contacts as JSON" per salvare.

**Risultato atteso:** l'osservazione viene salvata con la posizione del telefono (non quella del beacon) se c'è una posizione recente; altrimenti viene salvata senza coordinate. Ogni posizione serve per una sola osservazione e quelle simulate vengono scartate. Le statistiche sommano segmenti GPS con precisione di 50 m o migliore, età di 30 s o meno e distanza di 120 s o meno; non sono un percorso completo.

**Errori comuni:**

- "No recent position after 30 s": cerca il cielo aperto o attiva il GPS.
- GPS disattivato o senza permesso: l'osservazione viene salvata senza coordinate.

### 3. USB CAT RX (F4HWN, sperimentale)

**Obiettivo:** sintonizzare la ricezione di una Quansheng con l'immagine Bricohams SAT RX v1 (base F4HWN v6+).

**Serve:** cavo USB OTG dati (CDC ACM o adattatore a porta singola CH34x, CP210x, FTDI o Prolific). Il CAT funziona solo via USB, non via Bluetooth.

1. Sulla radio attiva SAT RX e premi il tasto 8 (`CAT READY RX`).
2. Nell'app apri "Open experimental USB CAT RX" (schermata "USB / CAT radio") e premi "Choose USB device".
3. Accetta il permesso USB di Android.
4. Premi "Query CAT RX" per confermare lo stato.
5. Digita "RX frequency MHz (up to 5 decimals)" (passi da 10 Hz, VHF 136-174 o UHF 400-470) e premi "Tune RX (renewed until STOP)".
6. Per terminare, "STOP: return to nominal RX" e "Disconnect USB".

**Risultato atteso:** l'app rinnova la sintonia ogni 1,2 s; se smette di farlo, la radio torna alla RX nominale dopo 3 s. I tasti 4, 5 e 6 della radio tornano alla modalità manuale.

**Doppler di un passaggio:** dai Satelliti scegli un passaggio, collega il CAT e premi "Start Doppler for the selected pass" (solo nella finestra del passaggio); "Stop tracking and disconnect USB" lo termina.

**Errori comuni:**

- Nessun dispositivo: controlla adattatore OTG, cavo e firmware; non viene mai usato un dispositivo qualsiasi.
- Permesso USB rifiutato o scaduto: scegli di nuovo il dispositivo.
- USB scollegato: scegli di nuovo il dispositivo prima di usare il CAT.

### 4. Editor di canali Quansheng (Beta)

**Obiettivo:** modificare nome, frequenze, subtoni e potenza di canali FM esistenti su F4HWN v6.

**Serve:** cavo USB OTG, firmware Labs v6.1 o successivo (F4HWN v6.0 è in sola lettura) e da 10 a 20 minuti per la copia.

1. Apri "Edit Quansheng channels over USB (Beta)" ("Quansheng channels") e premi "1. Choose USB device and connect".
2. Premi "2. Full backup (2 MiB Flash, 10-20 min)". La copia viene salvata e verificata nella memoria privata dell'app con SHA256SUMS; copiala fuori dal telefono.
3. Premi "3. Read channels from the radio".
4. Premi "4. Choose channel" e modifica Name (1-10 ASCII), RX (MHz), TX (MHz), tono RX e tono TX (OFF, CTCSS in Hz come 88.5, o DCS come D023N / D023I), Power (USER, LOW1-LOW5, MID, HIGH), Narrow band (12,5 kHz) e "Lock TX on this channel".
5. Premi "5. Apply changes to the local copy".
6. Premi "6. Write to the radio and read back" e conferma la finestra "Write channels to the radio".
7. Riavvia la radio al termine.

**Risultato atteso:** "Write verified by read-back". La scrittura non è protetta dai cali di alimentazione: non scollegare né spegnere la radio.

**Errori comuni:**

- "Write blocked": manca la copia completa verificata di questa sessione.
- Qualsiasi errore, scollegamento o uscita dalla schermata invalida la sessione: ricollega e ripeti la copia.
- RX e TX devono stare nella stessa banda (136-174 o 400-470 MHz).
- Verifica che frequenze, toni e potenza siano legali per te.

### 5. OpenGD77 via USB

**Obiettivo:** vedere lo schermo di una radio OpenGD77 e impostare il suo orologio su UTC.

**Serve:** una radio OpenGD77 e un cavo OTG dati.

1. Apri "OpenGD77 over USB: screen and clock" e premi "Choose USB device"; accetta il permesso.
2. L'app mostra il modello, il firmware e "USB functions" con "Supported" o "Not supported".
3. Premi "Capture screen" per vedere lo schermo della radio.
4. Premi "Sync UTC clock" e riapri il menu Satellite della radio per ricalcolare i passaggi.
5. Usa "Check link" per provare il collegamento e "Disconnect USB" alla fine.

**Risultato atteso:** "Screen captured.", "Clock sent" o "Link OK.". OpenGD77 non ha un CAT di sintonia via USB: niente frequenza, modo, canale, PTT né Doppler dal telefono, e la Flash non viene mai scritta.

**Errori comuni:**

- "No USB CDC radio connected": usa un cavo OTG dati.
- Identificazione sconosciuta: l'app non presume alcun modello.

### 6. CAT multi-radio

**Obiettivo:** controllare frequenza, modo, memorie, satelliti e modi digitali di una radio via USB.

**Serve:** cavo USB OTG o l'interfaccia della radio. Modelli dell'elenco "Radio model": Yaesu FT-817/FT-817ND, FT-818ND, FT-857/FT-857D, FT-897/FT-897D (4800 baud), Icom IC-705 (115200, indirizzo CI-V A4 per impostazione predefinita), Yaesu FTX-1 (38400, firmware MAIN 1.08 o successivo, porta Enhanced COM CAT-1) e (tr)uSDX (115200 con firmware 2.00t o successivo; 38400 come ripiego). I test fisici sono in sospeso: queste radio non sono certificate.

**Collegare e sintonizzare**

1. Apri "CAT multi-radio (FT-817, FT-857, IC-705, FTX-1, (tr)uSDX)" ("Bricohams CAT multi-radio").
2. Sotto "Radio" scegli "Radio model", controlla "Baud rate" (sull'IC-705 anche "CI-V address (hex)"), premi "Choose USB device" e "Connect".
3. Sotto "Frequency and mode" digita "Frequency (MHz)" e premi "Set VFO A" o "Set VFO B".
4. Scegli "Mode" (LSB, USB, CW, CW_R, AM, FM, FM_N, WFM, RTTY, RTTY_R, DATA_L, DATA_U, DATA_FM, DV) e premi "Set mode"; "Read" aggiorna la lettura.
5. "PTT test 3 s" apre la finestra "PTT test": richiede un nominativo, trasmette per 3 s e serve un'antenna adatta o un carico fittizio.

**Memorie**

1. Sotto "Memories" indica "From channel" e "To channel" (massimo 100 per lettura; limiti IC-705 0..99, FTX-1 1..999, altre 1..99) e premi "Read memories".
2. Solo IC-705 e FTX-1 possono leggere le memorie. FT-817/857/897 e (tr)uSDX no.
3. Toccando una riga si offre "Tune" (applica al VFO A) e, solo sul FTX-1, "Edit".
4. Scrittura delle memorie (solo FTX-1): "New channel" o "Edit" apre "Memory channel" con Channel, RX frequency (MHz), Mode, "Name (max. 12 characters)" e "Split TX frequency (MHz, empty = simplex)". Premi "Save"; se il canale contiene già dati, devi confermare la sostituzione.

**Risultato atteso:** "Channel N saved and verified." dopo la rilettura.

**Satellite e salvataggio in memoria**

1. Da un passaggio nei Satelliti premi "Open in CAT multi-radio", oppure digita "Downlink (MHz)", "Uplink (MHz, optional)" e "Doppler step (Hz)" (da 1 a 5000, predefinito 100).
2. Premi "Start tracking"; "Stop tracking" lo termina. Con un uplink si usa lo split; la famiglia FT-817 riprogramma l'uplink sul VFO B al massimo ogni 5 s.
3. Solo FTX-1: "Save transponder to memory" apre l'editor con downlink, uplink e nome del satellite (massimo 12 caratteri) nel primo canale libero.

**Scheda "Digital modes"**

1. Scegli "Digital mode", "Band and frequency" e "Period".
2. Premi "Tune": imposta il VFO A sulla frequenza di dial e sul modo dati (DATA_U su FT-817/818/857/897 e FTX-1; USB su IC-705 e (tr)uSDX; sull'IC-705 attiva DATA ON sulla radio).
3. La riga dell'orologio UTC mostra il prossimo turno pari o dispari. Se compare "Automatic time is off: FT8 needs the clock within ±1 s.", attiva l'ora automatica di Android.
4. Per usare un modem esterno (FT8CN, JS8Call o un'altra app) premi "Release port for a digital app" e scegli la stessa radio in quell'app.

Frequenze di dial standard offerte dall'app (MHz; si mostrano solo quelle comprese nel campo della radio; sono frequenze d'uso comunitario: verificale localmente):

| Modo | Periodi (s) | Frequenze di dial |
| --- | --- | --- |
| FT8 | 15 | 1.840, 3.573, 5.357, 7.074, 10.136, 14.074, 18.100, 21.074, 24.915, 28.074, 50.313, 144.174 |
| FT4 | 7.5 | 3.575, 7.0475, 10.140, 14.080, 18.104, 21.140, 24.919, 28.180, 50.318, 144.170 |
| JS8 | 15, 30, 10, 6 | 1.842, 3.578, 7.078, 10.130, 14.078, 18.104, 21.078, 24.922, 28.078, 50.318, 144.178 |
| WSPR | 120 | 0.136, 0.4742, 1.8366, 3.5686, 5.2872, 7.0386, 10.1387, 14.0956, 18.1046, 21.0946, 24.9246, 28.1246, 50.293, 144.489 |
| Q65 | 15, 30, 60, 120, 300 | 50.275, 144.116 |
| JT65 | 60 | 1.838, 3.570, 7.076, 10.138, 14.076, 18.102, 21.076, 24.917, 28.076, 50.310 |
| JT9 | 60 | 1.839, 3.572, 7.078, 10.140, 14.078, 18.104, 21.078, 24.919, 28.078 |
| FST4 | 60, 120, 300, 900, 1800 | 0.136, 0.4742 |
| FST4W | 120, 300, 900, 1800 | 0.136, 0.4742 |

I modi digitali e le memorie risultano in attesa di validazione su un telefono reale.

**Errori comuni:**

- "This radio cannot read memories" (o messaggio equivalente): quella radio non supporta la lettura.
- Frequenza fuori dal campo della radio: il messaggio indica il campo supportato.
- La connessione si chiude uscendo dalla schermata o scollegando l'USB: ricollega.
- IC-705: espone due porte seriali; scegli quella giusta ("port N").

### 7. Satelliti

**Obiettivo:** calcolare passaggi offline (SGP4), seguirli su mappa e radar e ricevere con Doppler.

**Serve:** la posizione dell'osservatore e, per aggiornare il catalogo, una connessione Internet. Poi funziona offline finché i TLE hanno al massimo 7 giorni.

1. Apri "Open SGP4 satellites and passes" ("Bricohams Satellites"). Se il catalogo manca o ha 24 h o più, si aggiorna da solo (HTTPS con CelesTrak e SatNOGS; la tua posizione non viene inviata). A mano usa "Update TLE and frequencies" o "Import TLE file" nella scheda "Settings", dove si può anche disattivare l'aggiornamento automatico.
2. In "Settings" inserisci latitudine, longitudine, altezza (km, ellissoide WGS84) ed elevazione minima (0-60), oppure premi "Use last GPS position", poi "Save and calculate passes".
3. In "Satellites" scegli con "Search by name or NORAD", "All", "With RX" o "None".
4. In "Passes" vedrai le prossime 24 h con il conto alla rovescia di AOS e LOS. Apri un passaggio per vedere il radar polare (verde AOS, rosso LOS, arancione posizione attuale) e l'elenco dei downlink ("Downlink for CAT RX", "Other frequency (MHz)").
5. In "Map" compaiono satelliti, impronta e una traccia di ±45 min, aggiornati ogni 5 s; tocca un satellite per selezionarlo.
6. Per ricevere: "Connect CAT: Doppler, SSTV and recording" (Quansheng, vedi tutorial 3) oppure "Open in CAT multi-radio" (tutorial 6).
7. Per registrare un passaggio: sul CAT collegato premi "Record full pass (WAV until LOS)" e "Stop pass recording"; il WAV è 16 kHz mono e si ferma a LOS, dopo 2 h o uscendo dalla schermata.
8. Per cercare SSTV: in "Settings" apri "Pass recordings" e premi "SSTV" (esplora finestre di 60 s ogni 23 s alla ricerca di immagini Robot36); ci sono anche "Export" e "Delete" con conferma.

**Risultato atteso:** passaggi con AOS, massimo e LOS. Il Doppler via CAT corregge solo la ricezione (Quansheng); non c'è correzione dell'uplink sulla Quansheng.

**Errori comuni:**

- Nessun passaggio: l'osservatore non è stato salvato in "Settings".
- TLE scaduti (oltre 7 giorni): aggiorna il catalogo.
- Dopo un download fallito, l'aggiornamento automatico attende 15 minuti.

Per le bande e un'introduzione alla ricezione vedi [Introduzione alla ricezione dei satelliti](INICIACION-SATELITE.md).

### 8. Rotore AZ/EL

**Obiettivo:** puntare un rotore sul passaggio selezionato.

**Serve:** il rotore Bricohams via Wi-Fi (192.168.4.1) o "Bluetooth sicuro" (PIN a 6 cifre, BLE), il token di 24-128 caratteri ASCII impostato via USB sul rotore e l'arresto di emergenza fisico a portata di mano. Non c'è alcuna prova con un rotore fisico.

1. Nel dettaglio di un passaggio premi "AZ/EL rotor: prepare and track this pass".
2. Scegli Wi-Fi o Bluetooth, inserisci il token o il PIN e premi "Connect".
3. Premi "Homing (find limit switches)".
4. Premi "Calibrate north and level with the phone": con il telefono piatto sul boom e la parte superiore verso gli elementi, usa "Use compass heading" oppure digita l'azimut vero dell'antenna (0-359,9°), conferma che il palo è in bolla e premi "Calibrate".
5. Premi "Send phone time and location" (il firmware 0.3.0-prototype lo supporta; il firmware API 1 usa l'ora GNSS).
6. Premi "Prepare pass: load TLE and point at AOS" e leggi l'avviso sul taglio del cavo.
7. Premi "Follow automatically from AOS"; "Cancel automatic tracking" lo ferma.

**Risultato atteso:** il rotore punta all'AOS e segue il passaggio con lo schermo tenuto acceso.

**Errori comuni:**

- 409: un altro client controlla il rotore.
- Collegamento BLE perso in movimento: il rotore va in guasto; usa "Clear fault (requires new homing)".
- Il rotore si ferma al fermo del cavo, sopra 89° o se il satellite è più veloce del motore.
- "STOP motors" ferma il movimento in qualsiasi momento. I dettagli sono nella guida del rotore nel repository (docs/ROTOR.md, solo in spagnolo).

### 9. Ricezione audio dal vivo

**Obiettivo:** acquisire audio con il microfono e decodificarlo poi come Morse o SSTV.

**Serve:** il permesso del microfono e l'audio della radio riprodotto vicino al microfono.

1. Apri "Receive Morse / Robot36 with microphone" ("Audio reception").
2. Scegli Morse o SSTV. Per il Morse imposta "Morse tone (300 to 1200 Hz)" e "Morse speed (5 to 45 WPM)".
3. Premi "Start audio capture". Se Android chiede il permesso, concedilo e premi di nuovo: il permesso non avvia la registrazione.
4. Premi "Stop and decode" (oppure "Cancel and discard audio").

**Risultato atteso:** l'audio (PCM mono 48 kHz, fino a 60 s per il Morse o 200 s per l'SSTV) resta solo in memoria e non viene né salvato né trasmesso. Uscire dalla schermata annulla l'acquisizione. La decodifica è sperimentale.

**Errori comuni:**

- L'SSTV richiede l'intestazione VIS completa: inizia prima della trasmissione.
- Nessun permesso del microfono: puoi comunque usare gli importatori WAV.

### 10. Morse

**Obiettivo:** trasformare un testo Morse o un file WAV in testo.

1. Nella scheda "Morse" digita punti e linee (spazio tra le lettere, `/` tra le parole, `?` per un codice sconosciuto) e premi "Interpret Morse text".
2. Per un file (sperimentale): imposta "Tone (300-1200 Hz)" e "Speed (5-45 words/minute)" come numeri interi e premi "Import and decode Morse WAV".

**Risultato atteso:** il testo decodificato. Il WAV deve essere PCM mono a 16 bit, da 8 a 48 kHz, da 0,1 a 60 s e fino a 8 MiB. Non è un decodificatore adattivo: verifica il risultato.

**Errori comuni:**

- Tono o velocità fuori intervallo o non interi.
- WAV stereo o di altro formato.

### 11. SSTV Robot36 (WAV, microfono e trasmissione)

**Obiettivo:** decodificare immagini SSTV e, facoltativamente, trasmetterne una con il PTT CAT (sperimentale).

**Decodificare un WAV**

1. Premi "Open SSTV Robot36 from WAV" ("SSTV from audio") e "Decode SSTV WAV".
2. Scegli un WAV PCM mono a 16 bit, 8000-48000 Hz, fino a 200 s e 24 MiB, con intestazione VIS completa (modi Robot36/72, Martin M1/M2, Scottie S1/S2, PD90/120/180).
3. Premi "Save PNG image" prima di uscire o ruotare lo schermo: l'immagine vive solo in memoria.

**Ricevere con il microfono:** usa il tutorial 9 con SSTV, oppure nella schermata CAT RX "Record SSTV (CAT keeps tuning)" e "Stop recording and decode".

**Trasmettere con CAT TX e PTT (sperimentale, senza validazione RF)**

1. Servono una licenza, una frequenza autorizzata per l'SSTV e un cavo audio dal telefono all'ingresso microfono della radio.
2. Sulla radio, in SAT RX, arma il PTT con il tasto 9 (`CAT TX ARMED`).
3. Nella schermata CAT digita "Callsign (required)": viene stampato sull'immagine.
4. Scegli il modo in "SSTV mode (only those that fit the 110 s transmission limit)" (TX: Robot36/72, Martin M2, Scottie S2, PD90).
5. Premi "Send SSTV via CAT PTT" e conferma "Transmit" nella finestra "Transmit SSTV".
6. Per fermare: "Cancel / Stop TX (releases PTT)" o un tasto qualsiasi della radio.

**Risultato atteso:** immagine inviata con PTT rilasciato e confermato dalla radio; l'app non misura la RF. CAT multi-radio ha anche "Send image", "Stop TX", "Receive SSTV" e "Stop receiving".

**Errori comuni:**

- Rifiuto per TX lock, banda, batteria o modulazione della radio.
- Senza armamento con il tasto 9 o senza nominativo non si trasmette.
- Non si trasmette durante l'inseguimento di un passaggio.

### 12. Modi digitali propri

**Obiettivo:** ricevere e generare `FT8`, `FT4` e `FT2` con il decodificatore Bricohams, senza altre app.

1. Premi "Modi digitali FT8 / FT4 / FT2" nella schermata principale, oppure "Decodificatore e TX propri" nella scheda dei modi digitali del CAT.
2. Scegli il modo: `FT8` (turno di 15 s), `FT4` (7,5 s) o `FT2` (3,75 s, candidato). Vedrai l'orologio UTC e il turno.
3. Per ricevere premi "Ascolta" (microfono o ingresso audio USB di Android) o "Decodifica WAV". La ricezione di `FT4` e `FT2` non è ancora disponibile.
4. Per trasmettere inserisci il tuo nominativo e un messaggio che lo contenga, poi premi "Salva WAV" o "Trasmetti nel prossimo turno". L'app non attiva il PTT: usa il PTT dell'operatore o il VOX. "Ferma TX" interrompe subito.

**Risultato atteso:** l'elenco mostra UTC, SNR, DT, Hz e messaggio; la trasmissione suona una volta, 0,5 s dopo l'inizio del turno.

**Errori comuni:**

- Messaggio non valido, senza nominativo o con tono fuori da 100-5000 Hz.
- Senza permesso del microfono non si può ascoltare.
- `FT2` è un candidato legacy, validato solo con un ricevitore esterno.

## Problemi frequenti

- Non compare alcun dispositivo USB: usa un cavo OTG dati (non solo di ricarica) e controlla che la radio sia nel modo CAT giusto.
- Android non concede il permesso USB: scegli di nuovo il dispositivo; il permesso scade o vale per singolo dispositivo.
- L'app torna alla RX nominale: la sintonia non è stata rinnovata in tempo (3 s senza rinnovo).
- Non compaiono passaggi: salva l'osservatore e aggiorna i TLE.
- Ho perso i dati dopo la reinstallazione: disinstallare cancella il database locale; esporta prima il JSON.
- L'italiano non compare nell'app: l'app offre solo Español, English (US), Français e Deutsch; la guida esiste in italiano.
- Guida alla configurazione generale: [Guida alla configurazione](AYUDA-CONFIGURACION.md). OpenGD77: [Guida OpenGD77](AYUDA-OPENGD77.md).

## Sicurezza in trasmissione

- Trasmetti solo con una licenza, su una frequenza che sei autorizzato a usare, con un carico fittizio o un'antenna adatta e con la potenza minima durante le prove.
- Il nominativo è obbligatorio per l'SSTV via CAT e per il test PTT; deve contenere lettere, cifre e /.
- Limiti del PTT: la radio taglia a 120 s e l'app limita l'audio a 110 s; il "PTT test 3 s" dura 3 s; l'app rinnova il PTT ogni 400 ms e la radio lo rilascia dopo 1,5 s se l'app si blocca.
- Qualsiasi tasto della radio interrompe la trasmissione; durante l'inseguimento di un passaggio non si trasmette.
- Non trasmettere verso satelliti inattivi né in segmenti che non ti spettano; il rispetto della normativa è una tua responsabilità.
- Le funzioni di trasmissione sono sperimentali e senza validazione RF.

## Video dimostrativo

Video con tutti i tutorial: [bricohams-android-demo.mp4](../../media/bricohams-android-demo.mp4).

Capitoli, nell'ordine dei tutorial:

1. Prima di iniziare: installazione, permessi e lingua.
2. Log di stazione.
3. ARDF e GPS.
4. USB CAT RX.
5. Editor di canali Quansheng.
6. OpenGD77.
7. CAT multi-radio e modi digitali.
8. Satelliti.
9. Rotore AZ/EL.
10. Ricezione audio dal vivo.
11. Morse.
12. SSTV Robot36.
13. Problemi frequenti e sicurezza in trasmissione.
