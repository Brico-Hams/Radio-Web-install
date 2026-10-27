# Configurazione comune, backup e diagnostica

Revisione: 25-10-2026. Applicabile concettualmente a FM/DMR; i nomi dei menu,
gli intervalli e i pulsanti dipendono dalla guida del modello e dalla build.

## Prima di configurare

### Provider e download automatico nella versione installata

In Ripetitori apri **Configura API RepeaterBook**, inserisci il token individuale
e User-Agent approvati e conferma la tua approvazione. Vengono conservati solo
nella memoria del server fino al riavvio; il campo token viene svuotato dopo
l'invio. Le variabili `RB_USER_TOKEN`, `RB_APPROVED_USER_AGENT` e `RB_APPROVED=yes`
sono ancora disponibili per configurare il processo dall'ambiente.

In Contatti DMR, **Download automatico DMR** importa un lotto RadioID per
paese/regione (1-10 pagine, massimo 1024) nel codeplug locale. Le stanze sono
gruppi di conversazione: l'opzione BrandMeister usa un prefisso TG, non un paese
RadioID. Salva i gruppi con tipo di chiamata di gruppo e nome TG numerico; poi
assegna il TG al canale nel CPS. Non sottoscrive l'hotspot né apre una stanza.
Non scrive sulla radio e non sincronizza silenziosamente all'avvio.

Per Quansheng, in SAT/passi prepara canali FM o Doppler e premi **Carica SAT /
Doppler preparati nella configurazione Quansheng** dopo aver scelto un modello
FM. È necessario aver letto/aperto una configurazione F4HWN v6. Non carica TLE
nel modulo firmware: prepara memorie di ricezione scaglionate con cambio manuale.

Registra modello, revisione della scheda, famiglia MCU, firmware e data/build.
Salva una foto di SysInf/Radio Info, i file originali e i relativi hash.
Annota il tipo di cavo, la porta, il browser e il programma usato. Solo
un'applicazione deve avere aperta la porta: chiudi CHIRP, CPS, Studio e le altre schede.

Non confondere questi oggetti:

| Oggetto | Contenuto | Non sostituisce |
| --- | --- | --- |
| Firmware | Programma eseguito dal processore | Calibrazione individuale |
| Codeplug/configurazione | Canali, contatti, zone e impostazioni secondo il formato | Backup del firmware o dell'intera radio |
| Calibrazione | Valori di regolazione propri dell'unità | Configurazione di un altro apparecchio dello stesso modello |
| Flash fisica | Immagine di una memoria specifica | Memorie di altri chip non comprese nell'ambito dichiarato |
| Manifesto/SHA256SUMS | Nomi, impronte e metadati | Firma digitale del produttore |
| TLE | Elementi orbitali ed epoca | Frequenze attive o garanzia del servizio del satellite |

Esporta il backup `.rwb.json` fuori dal browser e conserva l'originale senza
modificarlo. IndexedDB dipende da origine, browser e profilo. Passare da localhost,
127.0.0.1, Pages o modalità privata può impedire di vedere gli stessi backup.
Non cancellare i dati del browser per risolvere problemi USB prima di esportarli.

## Beta e modalità PRO

L'applicazione e le compilazioni Bricohams sono in fase **Beta / convalida**.
Attiva **Modalità PRO** prima di collegarti se vuoi eseguire le azioni selezionate
senza digitare parole di conferma né accettare la cancellazione locale dei canali.
La selezione PRO autorizza anche la lettura iniziale senza spuntare un'altra casella.
È un'opzione di questa pagina/sessione; non viene ricordata silenziosamente al
ricaricamento. Non elimina la selezione del modello, le autorizzazioni WebUSB/Web
Serial del browser, il backup completo, CRC, controllo degli hash, rilettura,
blocco durante le attività né protezione di Main. Non controlla le conferme del
CPS/Studio esterno. Durante un'operazione non bisogna navigare né scollegare,
neppure in modalità PRO. Un backup parziale non abilita mai le scritture, a
prescindere da questa modalità.

## Glossario del canale analogico

| Impostazione | Significato | Come scegliere e verificare |
| --- | --- | --- |
| RX | Frequenza ascoltata dalla radio | Usare l'uscita pubblicata dal ripetitore o la frequenza simplex |
| TX | Frequenza di trasmissione | Sul ripetitore usare il suo ingresso; non invertire RX/TX per intuizione |
| Offset e direzione | Differenza tra TX e RX | Verificare la frequenza TX risultante, non solo il segno |
| Modalità | FM, AM o altra supportata | Deve corrispondere al segnale; ricezione AM non autorizza TX AM |
| Step | Passo del VFO | Non è la larghezza di canale; scegliere il raster adatto |
| W/N / larghezza | Deviazione/filtro del canale FM | Corrispondere al sistema; narrow non crea una modalità digitale |
| SQL | Soglia di apertura audio | Iniziare bassa e aumentare solo quanto basta per chiudere il rumore senza perdere segnali |
| CTCSS TX | Tono subaudio trasmesso | Solo se richiesto dal ripetitore |
| DCS TX | Codice digitale subaudio | Non equivale al Color Code DMR; rispettare la polarità se necessario |
| CTCSS/DCS RX | Condizione aggiuntiva per aprire l'audio | Rimuovere il filtro durante la diagnostica; non cifra le comunicazioni |
| Potenza | Livello RF in uscita | Il minimo sufficiente e consentito; i valori dipendono dalla calibrazione |
| RX-only / TXLock | Impedisce la trasmissione su questo canale | Mantenerlo attivo per ascolto e importazioni non verificate |
| Busy lock | Blocco TX quando rileva occupazione | Non elimina la necessità di ascoltare prima di trasmettere |
| TOT | Durata massima della TX continua | Aiuta in caso di PTT bloccata; non è il periodo di scansione |
| VOX | Attiva TX tramite audio | Disattivare nelle prove USB, con auricolari e in ambienti rumorosi |
| Compander | Elaborazione della dinamica | Usarlo solo se l'altra estremità è compatibile |
| Reverse | Scambia temporaneamente ingresso/uscita | Ricontrollare RX/TX all'uscita; non modificare involontariamente il canale salvato |

### Esempio di procedura con un ripetitore

1. Copiare RX, TX, modalità, larghezza e tono dalle informazioni pubblicate dal responsabile.
2. Creare o duplicare un modello compatibile; mantenere RX-only durante la verifica.
3. Ascoltare senza filtro RX per controllare attività e frequenza.
4. Verificare che il tono TX sia quello richiesto, non un'ipotesi del provider.
5. Controllare legalità, potenza e inclusione negli elenchi/zone.
6. Salvare in memoria. Selezionare nuovamente il canale per verificare la persistenza.
7. In questo sito esportare il risultato; non presumere che modificare un file lo abbia scritto sulla radio.

Non vengono fornite frequenze di trasmissione universali: dipendono da
posizione, licenza, banda, servizio e ripetitore specifico.

## Glossario DMR

| Impostazione | Significato | Errore frequente |
| --- | --- | --- |
| Radio ID | Identificatore personale dell'abbonato | Confonderlo con un TG o usare quello di un'altra persona |
| Contatto TX | Destinazione della chiamata e tipo gruppo/privata | Usare un contatto privato quando è richiesto un gruppo |
| TG | Talkgroup, identificativo del gruppo | Credere che programmi da solo la rete del ripetitore |
| TS 1/2 | Time Slot del canale | Confonderlo con numero di canale o Color Code |
| CC 0-15 | Color Code dell'accesso DMR | Trattarlo come password o tono CTCSS |
| RX Group | Insieme di gruppi di ricezione | Confonderlo con una zona di canali |
| Zona | Elenco organizzato di canali | Aspettarsi che modifichi automaticamente TS/CC |
| Filtro DMR | Condizioni per accettare l'audio | Un filtro aperto non autorizza a trasmettere su qualsiasi TG |
| Hotspot | Interfaccia personale RF/rete | Non è per impostazione predefinita un ripetitore convenzionale a due slot |
| Database ID | Relazione ID, nominativo e nome | Non crea contatti TX né abilita l'accesso a una rete |

Per configurare DMR su OpenGD77 segui la [guida dedicata](AYUDA-OPENGD77.md).
Qui non si documentano come radio DMR Quansheng F4HWN/Karina/ARDF.

## Scansione e doppio ascolto

La scansione visita i canali in sequenza; non significa ascoltare
simultaneamente l'intero intervallo. Una velocità maggiore può perdere portanti
brevi, toni o intestazioni digitali. Riprendere per tempo, per portante o
fermarsi sono comportamenti distinti.

I canali prioritari e il doppio ascolto aggiungono visite al ciclo e possono
modificare il tempo di ascolto effettivo. Verifica quale sia il canale TX:
principale, ultimo ricevuto o quello configurato dalla modalità di risposta.
Durante la diagnostica di ricezione usa un solo VFO e disattiva la scansione.

## Impostazioni di sistema

| Gruppo | Cosa modifica | Precauzione |
| --- | --- | --- |
| Retroilluminazione/contrasto/inversione | Leggibilità e consumo | Non modifica la sensibilità RF |
| Beep/voce/avvisi | Segnali dell'interfaccia | Abbassare il volume prima di usare gli auricolari |
| Risparmio/sleep/APO | Ciclo di ricezione o spegnimento | Può ritardare il rilevamento dei segnali e interrompere le sessioni |
| Capacità batteria | Stima/gestione secondo il firmware | Non modifica fisicamente la capacità né calibra la tensione |
| Blocco tastiera/PTT | Azioni consentite | Verificare se blocca anche TX e come si sblocca in quella build |
| Data/ora/UTC | Registro, posizione e orbite | Il fuso orario non sostituisce un orologio corretto |
| Posizione/GPS | Calcoli o servizi che lo usano | Tutelare la privacy e non presumere la presenza del GPS nel modello |
| Scorciatoie/tasti | Azioni brevi/lunghe | Registrare le modifiche; non copiare combinazioni da altri modelli |
| Reset | Ripristina gruppi di valori | Può cancellare canali/impostazioni; non usarlo come prima diagnosi |
| Calibrazione | Frequenza, livelli e altri parametri da banco | Non toccare senza strumenti e procedura del progetto |

## Ripetitori, RadioID e satelliti su questo sito

- Modalità web: RadioID tramite `user.csv`; modalità locale: consultazione tramite server.
  I contatti privati importati non creano zone né assegnano TG ai canali.
- RepeaterBook richiede la versione locale e un token approvato. Una fonte esterna
  può essere incompleta o non aggiornata. Verificare lo stato operativo con il responsabile.
- OpenGD77 qui usa un codeplug standard da 128 KiB. I canali importati si basano
  su un modello compatibile e sono inizialmente RX-only; verificare la zona con CPS.
- Quansheng permette di leggere la configurazione F4HWN v6, aggiungere canali FM
  basati su un modello e cancellare memorie dal file locale. L'invio Beta richiede
  backup Flash completo e rilettura; v6.0 resta in sola lettura. Esporta anche
  progetti/CSV. Quansheng non dispone di una tabella SAT orbitale nativa.
- OpenGD77 distingue la tabella SAT nativa dai canali di ascolto. Consultare limiti
  e capacità effettive dell'editor prima di presumere che un file esteso sia utilizzabile.
- Doppler non è un offset del ripetitore. Dipende da istante, orbita e posizione;
  i canali scaglionati sono approssimazioni, non inseguimento continuo.
- Aggiornare TLE, ora e posizione; verificare epoca e frequenza attiva. Un passaggio
  previsto non garantisce un transponder attivo né la ricezione.
- Per la ricezione, disattivare i toni ereditati salvo requisito noto. Non attivare
  uplink/TX automatico importando un satellite.

## Connessione USB senza confondere le modalità

| Famiglia operativa | Modalità prevista | Cosa non fare |
| --- | --- | --- |
| Quansheng: lettura e slot | Firmware F4HWN compatibile avviato normalmente, protocollo seriale | Non entrare nel bootloader solo per consultare i canali |
| Quansheng: flash esterno | Modalità e strumento specifici dell'hardware | Non usare lo strumento V1 su V3 né confondere packed/RAW |
| OpenGD77: lettura CPS web | Firmware OpenGD77 normale e trasporto della famiglia | Non scegliere DFU o boot ROM |
| OpenGD77: installazione firmware | Strumento ufficiale e sequenza del modello | Non usare il sito come se fosse un flasher MCU |

Sono necessari Chrome/Edge desktop, HTTPS o 127.0.0.1 e autorizzazione del
dispositivo per le API del browser. Un cavo di ricarica può alimentare senza
trasportare dati. USB-C diretto e cavo seriale laterale sono percorsi distinti.
Non modificare il driver di un dispositivo altrui né sostituire tutti i CDC con
WinUSB: verificare identificatori e interfaccia prima di intervenire.

### Timeout / «0 di 1 byte»

1. Salvare il messaggio esatto e l'ultima operazione riuscita.
2. Chiudere gli altri programmi e schede che usano la porta.
3. Scollegare in sicurezza e avviare la radio in modalità normale.
4. Verificare hardware, firmware e porta corretti; provare un cavo dati.
5. Riprovare una lettura, senza scrivere né cancellare.
6. Se viene identificata ma la lettura fallisce, registrare firmware esatto e comando/fase.
   L'identificazione non dimostra il supporto di tutti i comandi.
7. Se l'errore persiste, fermarsi e conservare i log. Non aumentare arbitrariamente
   il baud rate né rimuovere la protezione del backup.

## Lista di controllo finale

- Il file esportato ha formato/dimensione previsti e una copia originale.
- Le modifiche persistono dopo aver chiuso e riaperto il file.
- RX/TX, toni, modalità, TS/CC e RX-only sono corretti, se pertinenti.
- La zona/elenco/banco è quello desiderato, non solo il numero di memoria.
- Non si è confuso «preparato» con «installato».
- Un controllo CRC copre i dati dichiarati, non tutta la sicurezza del firmware
  né la calibrazione di altri chip.

Fonti: connettori, editor e pianificatore di questo sito; manuali collegati
nelle guide [F4HWN](AYUDA-QUANSHENG.md) e [OpenGD77](AYUDA-OPENGD77.md).