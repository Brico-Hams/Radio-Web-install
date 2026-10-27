# F4HWN: riferimento a tutte le opzioni del catalogo

Revisione: 25-10-2026. Questa tabella copre **ogni chiave** del catalogo web
v6.3.0, commit `ca3a4271386049e7b459b215cef0ad0eea1a30ca`.
Le descrizioni indicano lo scopo della funzione, non garantiscono che una
combinazione arbitraria compili o funzioni sulla radio.
Sono incluse anche le 10 chiavi aggiuntive trovate nei preset pubblicati delle
18 versioni storiche, senza presentarle come opzioni dell'interfaccia attuale.

## Come leggere le opzioni

- ON/OFF qui sono decisioni di **compilazione**, non necessariamente interruttori
disponibili nel menu della radio.
- Una funzione compilata può richiedere configurazione successiva, risorse,
hardware, app o strumenti esterni.
- OFF di solito rimuove codice/interfaccia; non cancella necessariamente i dati
precedenti.
- Un nome assente non significa OFF: potrebbe non esistere o non essere esposto
da quel catalogo. La [matrice dei preset](F4HWN-PRESETS.md) usa N/D.
- Il modulo web usa v6.3.0; il builder locale Bricohams usa v6.1.0 bloccato.
Non mescolare opzioni/default senza confrontare le due tabelle.
- Il budget massimo dell'immagine PY32 accettato dagli slot è 118 KiB
(120832 byte). Attivare tutto non garantisce che rientri in Flash/RAM.
- L'upstream avvisa che diverse opzioni non F4HWN disattivate per impostazione
default non ricevono supporto salvo documentazione esplicita. Non è consigliabile
attivarle solo perché esiste una casella.

## Piattaforma e protocolli

| Opzione | Spiegazione | Precauzione/configurazione successiva |
| --- | --- | --- |
| `DEV` | Identità e modalità di compilazione di sviluppo | Non è un modulo utente; il builder Bricohams richiede OFF e il catalogo stabile esclude lo sviluppo |
| `ENABLE_FEAT_F4HWN` | Livello delle funzioni F4HWN, identità e menu associati | Richiesto dal profilo Bricohams; non usare OFF per simulare la compatibilità |
| `ENABLE_UART` | Comunicazione UART e codice del protocollo associato | Va mantenuto per la gestione seriale compatibile; da solo non definisce tutti i comandi |
| `ENABLE_USB` | Supporto USB nativo e relativo trasporto su PY32 | Richiede hardware/cavo corretto; non aggiunge USB dati a una V1 |
| `ENABLE_EXTRA_UART_CMD` | Comandi UART aggiuntivi della base | Superficie di controllo aggiuntiva; solo per strumenti noti e versione compatibile |
| `ENABLE_UART_RW_BK_REGS` | Accesso in lettura/scrittura ai registri BK via UART | Diagnostica avanzata; può modificare il funzionamento RF, non abilitarlo senza necessità |
| `ENABLE_SWD` | Disponibilità del debug SWD secondo l'implementazione | Non è una modalità di copia web; verificare gli effetti su pin e scheda |
| `ENABLE_LTO` | Ottimizzazione del collegamento tra unità di compilazione | Modifica risultato/dimensioni; verificare compatibilità toolchain e controlli dello stub |
| `ENABLE_NO_HEAP` | Elimina la riserva heap nel linker della base | Solo se il programma non necessita di allocazione dinamica; non è un acceleratore generico |
| `ENABLE_FEAT_F4HWN_DEBUG` | Strumentazione diagnostica F4HWN | Può consumare memoria/modificare i tempi; non necessaria per l'uso normale |
| `ENABLE_AGC_SHOW_DATA` | Visualizzazione dei dati di controllo automatico del guadagno | Strumento diagnostico; non è una calibrazione automatica |
| `ENABLE_BYP_RAW_DEMODULATORS` | Percorsi di demodulazione RAW della base | Opzione avanzata/non supportata da alcuni preset; consultare l'implementazione, senza presumere una ricezione migliore |
| `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` | Comandi di accesso fisico alla Flash esterna | Necessaria per il backup completo di questo sito su Labs compatibile; non confondere con la lettura della calibrazione |

## Multiboot, CFG e overlay

| Opzione | Spiegazione | Precauzione/configurazione successiva |
| --- | --- | --- |
| `ENABLE_FEAT_F4HWN_MULTIBOOT` | Gestore delle immagini esterne e relativi banchi | Non supporta V1 e non rende compatibile qualsiasi `.bin` |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_HOT_CFG` | Cambio del banco CFG durante l'esecuzione | Modifica impostazioni/canali, non ripristina un altro firmware; richiede dati compatibili |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY` | Workspace/esecuzione RAM usati da multiboot e overlay | Mantenere il controllo di isolamento; non disattivare nel profilo Bricohams |
| `ENABLE_FEAT_F4HWN_OVERLAY_APPS` | Caricatore e menu delle app esterne | Richiede overlay RAM e app ABI/API/caps compatibili; sperimentale |
| `ENABLE_FEAT_F4HWN_OVERLAY_BEAM` | Servizio Beam disponibile alle app overlay | Dipende dal caricatore delle app; non implica l'inclusione di un'app specifica |
| `ENABLE_FEAT_F4HWN_OVERLAY_INFO` | Informazioni di sistema tramite overlay/servizio associato | Dipende dalle app; influisce sul codice diagnostico/uso dello stack secondo la sorgente |

Il CMake esaminato rifiuta APPS senza MULTIBOOT_OVERLAY e BEAM/INFO overlay
senza APPS. Sono dipendenze verificate, non un elenco esaustivo di tutte le
interazioni possibili. Non modificare un binario per fingere che esista un'altra API.

## Ricezione, audio e spettro

| Opzione | Spiegazione | Precauzione/configurazione successiva |
| --- | --- | --- |
| `ENABLE_FMRADIO` | Ricezione radio FM broadcast con l'hardware supportato | Non è la modalità FM di un canale VHF/UHF |
| `ENABLE_NOAA` | Funzioni di ricezione meteorologica NOAA | Disponibilità geografica; non è una rete meteorologica universale |
| `ENABLE_WIDE_RX` | Intervalli di ricezione estesi supportati dal codice | Sensibilità/filtri variano a seconda della banda; non abilita TX legale fuori banda |
| `ENABLE_SPECTRUM` | Analizzatore di spettro della base | Non presumere simultaneità con altre funzioni né prestazioni da analizzatore di laboratorio |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | Migliorie F4HWN dell'analizzatore | Interagisce con SPECTRUM e i parametri persistiti in base alla build |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | Criteri di squelch più sensibili | Può aumentare le aperture dovute al rumore; regolare SQL e provare |
| `ENABLE_FEAT_F4HWN_NARROWER` | Variante di filtro FM più stretta e relativo menu | Adeguare alla larghezza del sistema; non modifica il raster VFO |
| `ENABLE_FEAT_F4HWN_VOL` | Regolazione software dell'audio RX | Diversa dalla manopola e dal guadagno RF |
| `ENABLE_FEAT_F4HWN_AUDIO` | Profili/elaborazione audio RX F4HWN | Selezionare successivamente il profilo audio; non corregge una frequenza sintonizzata male |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | Visualizzazione audio in RX/TX | Non misura la potenza RF né la qualità della modulazione in laboratorio |
| `ENABLE_AUDIO_BAR` | Barra del livello audio | Indicatore visivo, non garantisce l'assenza di distorsione |
| `ENABLE_RSSI_BAR` | Barra dell'intensità del segnale | RSSI non garantisce un audio decodificabile |
| `ENABLE_FEAT_F4HWN_FULL_WATCH` | Ciclo esteso di ascolto A/B e priorità | Verificare RxMode e destinazione della risposta TX; non sono quattro ricevitori paralleli |

## Scansione, memorie e registrazione

| Opzione | Spiegazione | Precauzione/configurazione successiva |
| --- | --- | --- |
| `ENABLE_FASTER_CHANNEL_SCAN` | Migliorie della base alla velocità di scansione dei canali | Diversa dalla modalità rapida aggiuntiva F4HWN |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | Modalità di scansione rapida F4HWN | Può perdere segnali brevi o il riconoscimento dei toni |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | Indicazione dell'avanzamento della scansione | Da sola non modifica l'elenco o l'intervallo |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | Informazioni RSSI durante la scansione | Interpretare insieme a rumore/attenuazione, non come distanza |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | Informazioni sui subtoni/codici rilevati durante la scansione | Confermare il tono prima di programmarlo per TX |
| `ENABLE_SCAN_RANGES` | Scansione entro intervalli configurati | Impostare limiti e passo corretti |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | Modifica il timeout della ricerca dei codici/subtoni della base | Non è il TOT TX; verificare consumo e uscita dalla modalità |
| `ENABLE_COPY_CHAN_TO_VFO` | Copia dei parametri dalla memoria al VFO | Copia temporanea; non sostituisce il salvataggio della memoria |
| `ENABLE_KEEP_MEM_NAME` | Conservazione dei nomi delle memorie nelle operazioni supportate | Verificare la destinazione quando si sovrascrivono canali |
| `ENABLE_FEAT_F4HWN_MEM` | Pagina SysInf sull'uso di Flash e SRAM | Informazioni sulla memoria del programma, non espansione dei canali né EEPROM |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | Ripristino dello stato operativo all'accensione | Può riprendere scansione/spettro; verificare prima delle prove |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | Azione di ripristino dei parametri VFO | Non equivale a ripristinare la calibrazione o tutti i dati |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | Registro attività RX/TX su Flash esterna | Privacy, spazio di archiviazione e compatibilità del formato |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | Riutilizzo circolare del registro quando è pieno | Può sostituire le voci precedenti; esportarle se occorre conservarle |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | Accesso/visualizzazione del RF Log con strumenti K5Viewer | Richiede una versione e un protocollo dello strumento compatibili |

## Interfaccia, schermo ed energia

| Opzione | Spiegazione | Precauzione/configurazione successiva |
| --- | --- | --- |
| `ENABLE_BIG_FREQ` | Visualizzazione della frequenza in grande | Riduce lo spazio disponibile per altri dati secondo il layout |
| `ENABLE_SMALL_BOLD` | Carattere piccolo in grassetto | Modifica la leggibilità, non i parametri del canale |
| `ENABLE_CUSTOM_MENU_LAYOUT` | Ordine/disposizione personalizzata dei menu | I numeri dei menu non sono più un riferimento stabile tra build |
| `ENABLE_BOOT_BEEPS` | Suoni di accensione | Verificare il volume e gli auricolari |
| `ENABLE_VOICE` | Avvisi vocali disponibili nella base | Non presumere una lingua o la copertura di tutti i menu |
| `ENABLE_SHOW_CHARGE_LEVEL` | Visualizzazione del livello di carica | Stima; non è una prova della capacità o dello stato del caricatore |
| `ENABLE_REVERSE_BAT_SYMBOL` | Variante di orientamento/visualizzazione del simbolo della batteria | Solo visiva |
| `ENABLE_PWRON_PASSWORD` | Controllo dell'accesso all'accensione | Rischio di blocco; non cifra la memoria e non sostituisce la sicurezza fisica |
| `ENABLE_FEAT_F4HWN_CTR` | Controllo del contrasto | Regolare SetCtr per lo schermo specifico |
| `ENABLE_FEAT_F4HWN_INV` | Inversione dello schermo | Regolazione visiva |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | Contatori RX/TX visibili | Non è un limite di trasmissione; il limite è configurato da TOT |
| `ENABLE_FEAT_F4HWN_SLEEP` | Deep sleep/spegnimento per inattività secondo il firmware | Verificare SetOff prima di sessioni prolungate |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | Gestione/indicazione della carica USB-C secondo scheda e firmware | Non modifica l'elettronica di carica né rende sicura una batteria danneggiata |
| `ENABLE_FEAT_F4HWN_LOGO` | Logo/interfaccia di avvio F4HWN | Non dimostra la provenienza dell'immagine |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | Logo/visualizzazione in risparmio schermo | Può condizionare il menu SetSav |
| `ENABLE_FEAT_F4HWN_MENU_CAT` | Raggruppamento dei menu per categorie | Le posizioni cambiano rispetto all'elenco classico |
| `ENABLE_FEAT_F4HWN_ACTION_PICKER` | Selettore di azioni/scorciatoie | Verificare le assegnazioni brevi/lunghe per evitare TX accidentali |
| `ENABLE_FEAT_F4HWN_QRCODE` | Codici QR di informazioni/collegamenti | Aprire i collegamenti non è parte del backup né certifica un file |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | Schermata/controllo compatibile con un visualizzatore esterno | Questo sito non implementa tutte le funzioni del visualizzatore |
| `ENABLE_FEAT_F4HWN_GAME` | Gioco incorporato nel profilo che lo supporta | Occupa Flash/RAM; diverso dalle app di gioco Labs |
| `ENABLE_FLASHLIGHT` | Funzione torcia/LED dell'hardware | Non modifica la radio e non è un segnale universale della modalità bootloader |

## TX, trasferimento e profili regionali

| Opzione | Spiegazione | Precauzione/configurazione successiva |
| --- | --- | --- |
| `ENABLE_VOX` | Trasmissione attivata dalla voce/audio | Configurare successivamente la sensibilità; OFF in entrambe le build Bricohams consegnate |
| `ENABLE_TX1750` | Generazione del tono di accesso 1750 Hz | Solo se richiesto dal sistema e con autorizzazione |
| `ENABLE_DTMF_CALLING` | Logica delle chiamate/identificazione DTMF | Non equivale a DMR; configurare ID e tempi con l'interlocutore |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | Trattamento di fine tono CTCSS per fase | Solo se usato dal ricevitore/ripetitore; non è cifratura |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | Modifica gli obiettivi di potenza bassa/media della base | Verificare con strumenti; non usarlo come calibrazione universale |
| `ENABLE_AIRCOPY` | Funzione di trasferimento AirCopy | Richiede compatibilità di entrambe le estremità; non copia l'intero MCU da questo sito |
| `ENABLE_AIRCOPY_UART` | Variante di trasferimento via UART | Cavo/protocollo e firmware devono corrispondere |
| `ENABLE_AIRCOPY_FLASH` | Funzioni AirCopy relative alla Flash | Operazione avanzata sui dati; non presumere un ripristino sicuro tra revisioni |
| `ENABLE_FEAT_F4HWN_PMR` | Profilo/vincoli relativi a PMR | Non omologa antenna, potenza né apparecchio per un servizio esente |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | Profili regionali delle bande/servizi USA | I requisiti legali dipendono dal servizio e dall'apparecchio; non sono universalmente applicabili |
| `ENABLE_FEAT_F4HWN_CA` | Profilo dei limiti delle bande canadesi della base | Non confondere con Carrier Aggregation o ricevitore aggiuntivo |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | Profilo dell'interfaccia/operatività RescueOps | Non autorizza frequenze professionali né trasforma l'apparecchio in dispositivo di sicurezza certificato |
| `ENABLE_FEAT_F4HWN_FOXHUNT` | Strumento RX per la ricerca del segnale con attenuazione/storico | Non equivale al firmware ARDF temporizzato né a un localizzatore GPS |
| `ENABLE_FEAT_F4HWN_BEACON` | Beacon Morse integrato | Può trasmettere automaticamente; mantenerlo disattivato finché non è configurato in modo legale e controllato |
| `ENABLE_FEAT_F4HWN_BEAM` | Trasferimento Beam dei parametri canale/VFO tramite pacchetti della base | Il payload esaminato include frequenza, offset, toni, modalità e nome. Richiede estremità/protocollo compatibili; non è un'antenna direttiva né APRS |
| `ENABLE_F_CAL_MENU` | Menu di calibrazione del riferimento RF | Richiede strumenti e procedura; non attivarlo per risolvere problemi USB |

## Altri parametri, non caselle booleane

### Opzioni storiche o non esposte dal modulo attuale

La loro esistenza è verificata nei preset per commit, ma non implica supporto
attuale. Per le vecchie funzioni non verificate sull'hardware, si mantiene lo
scopo del codice senza fornire sequenze operative speculative.

| Opzione | Spiegazione | Precauzione/configurazione successiva |
| --- | --- | --- |
| `ENABLE_ALARM` | Funzione di allarme della base storica | Può generare audio o TX secondo l'implementazione; non abilitarla per provare una porta né usarla come sistema di soccorso |
| `ENABLE_AM_FIX` | Correzioni del guadagno/ricezione AM dei rami storici | Non trasforma TX in AM né migliora tutte le condizioni RF |
| `ENABLE_AM_FIX_SHOW_DATA` | Diagnostica visibile della correzione AM | Richiede la funzione corrispondente; non è calibrazione automatica |
| `ENABLE_BLMIN_TMP_OFF` | Gestione temporanea della retroilluminazione minima nei rami che la includono | Verificare la logica dei tasti/risparmio di quella versione; non influisce sulla sensibilità |
| `ENABLE_FEAT_F4HWN_OVERLAY_TRIVFO` | Servizio TriVFO del sistema overlay nei preset che lo dichiarano | Non esposto dal catalogo web; non presumere tre ricevitori fisici né compatibilità con app di un'altra release |
| `ENABLE_FEAT_F4HWN_RESET_CHANNEL` | Azione di ripristino del canale nei rami precedenti | Non è garantito che equivalga a RESET_VFO; verificare l'ambito prima di perdere le impostazioni |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | Codice di acquisizione schermate delle versioni precedenti | Può usare un protocollo/strumento diverso da K5Viewer attuale |
| `ENABLE_NAVIG_LEFT_RIGHT` | Selezione della disposizione di navigazione nei preset storici | Non copiarla nelle versioni con SetNav senza verificare la migrazione |
| `ENABLE_REGA` | Segnalazione storica di test/allarme per la rete di emergenza REGA tramite toni ZVEI | Può attivare TX automaticamente. Non provarla su frequenze di emergenza né assegnarla abitualmente ai tasti; richiede autorizzazione e procedura del servizio |
| `ENABLE_TX_WHEN_AM` | Consente un percorso TX mentre nella base storica è selezionata la modalità di ricezione AM | Non garantisce una modulazione AM in uscita né un'autorizzazione legale; non abilitarla per tentare TX aeronautica o su altri servizi |

### Parametri di identità e strumenti

| Parametro CMake | Significato | Trattamento qui |
| --- | --- | --- |
| `CMAKE_BUILD_TYPE` | Livello di configurazione della compilazione | Builder locale Release |
| `TARGET` | Nome dell'eseguibile/artefatto | Builder locale bricohams; non è automaticamente una destinazione hardware |
| `EDITION_STRING` | Identità visualizzata dell'edizione | Bricohams nel builder locale, mantenendo l'identità di protocollo upstream |
| `VERSION_STRING_1/2` | Versioni dei componenti visualizzate | Non modificarle per aggirare la convalida |
| `AUTHOR_STRING`, `AUTHOR_STRING_1/2` | Attribuzione e identità upstream | Conservare avvisi e compatibilità; non dichiarare la paternità altrui |
| `SQL_TONE` | Parametro della base usato in configurazioni specifiche | Non esposto da --option; non modificarlo seguendo una ricetta SA818 su una radio normale |
| `SOURCE_DATE_EPOCH` | Orario della compilazione riproducibile | Fissato al commit nel builder locale; non regola l'orologio della radio |

Questi valori arbitrari non sono consentiti nel builder locale tramite
`--option`. L'elenco di boolean/default e il significato di «assente» si
 trovano nella [matrice generata](F4HWN-PRESETS.md).

## Verifica di una combinazione

1. Scegliere versione e preset come unità, senza copiare flag da un altro commit.
2. Modificare solo ciò che è necessario e registrare la richiesta.
3. Compilare e risolvere gli errori di dipendenze, RAM, Flash e isolamento RAM.
4. Verificare binario, metadati, mappa e SHA256SUMS.
5. Preparare lo slot senza scrivere; verificare che l'ispettore lo accetti.
6. Eseguire un test fisico controllato con backup originale e procedura di recupero nota.

Una compilazione corretta non dimostra RF, assenza di bug né compatibilità dei
dati con tutti i firmware storici.

## Fonti

- [Preset del catalogo v6.3.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/ca3a4271386049e7b459b215cef0ad0eea1a30ca/CMakePresets.json).
- [CMake delle funzioni v6.1 esaminato](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/CMakeLists.txt).
- [Informazioni sulla memoria in SysInf](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/ui/menu.c).
- [Payload Beam esaminato](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/app/beam.c).
- [Modulo storico REGA, riferimento allo scopo](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/e21d47260915174f358f1033564844148d5c6590/App/app/rega.c).
- [README e manuali upstream](https://github.com/armel/uv-k1-k5v3-firmware-custom).
- Catalogo versionato `f4hwn-options.js` e builder `scripts/build-bricohams.cjs`
di questo repository.