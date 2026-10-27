# Karina: dossier tecnico e limiti di una derivazione Bricohams

Data dell’ispezione: 2026-10-25.

## 1. Stato e ambito

**Nuove evidenze del 25-10-2026:** il collegamento Dim0s fornito successivamente contiene
un altro pacchetto Karina per **V3 e UV-K1**, con vettori PY32. Questo dossier
descrive il pacchetto **V1 locale**, non tutte le varianti Karina esistenti.
Il [rapporto Karina V3 e pack Dim0s](AYUDA-PACK-DIM0S.md) documenta il download,
l’inventario e gli hash. Non è stata dimostrata la compatibilità con gli slot Armel né
sono state trovate fonti o un avviso MIT in quello ZIP.

Questo documento descrive le evidenze del pacchetto locale **Karina-2026.08.21 K5V1
(Fw+Cal+Instr+K5prog+Rolling)** e le confronta con i riferimenti aperti indicati
come tali. Non è codice sorgente recuperato, una traduzione integrale dei suoi
manuali né una certificazione del firmware. Non è stato creato un binario Karina
Bricohams, modificato il bootloader, eseguito il flash di una radio né testato il multiboot V1.
È stata invece realizzata un’**edizione Bricohams V3 indipendente basata su F4HWN**,
descritta in [BRICOHAMS-FIRMWARE.md](BRICOHAMS-FIRMWARE.md); non incorpora codice
Karina né intende esserne un port.

**Impedimento alla derivazione di Karina:** il pacchetto non contiene sorgenti C, assembler,
linker, Makefile né una licenza del firmware. Avere un `.bin` non fornisce il relativo
progetto di compilazione né consente di attribuirgli la licenza di un altro progetto.
I tre file Python sono driver CHIRP, non firmware del processore.

L’attribuzione della licenza MIT al firmware è ancora un’affermazione in sospeso, in attesa di identificare componente, titolare e testo o
fonte verificabile. L’avviso non è stato trovato nel pacchetto esaminato
e ciò non modifica le licenze dei driver o di F4HWN. Anche se la licenza MIT di Karina venisse confermata,
mancherebbe comunque il suo progetto sorgente per ricompilare.

In assenza di sorgenti aperti, la ricostruzione prosegue con un’implementazione
indipendente basata sui comportamenti documentati. La disponibilità
delle sorgenti Karina non è un requisito per scrivere nuove funzioni. Non
è comunque possibile promettere una ricompilazione Karina o un’equivalenza del 100 %
senza implementazione e test. Il primo nucleo proprietario
ARDF, il suo contratto e i punti di integrazione ancora da completare sono descritti in
[Bricohams](BRICOHAMS-FIRMWARE.md#nuevo-nucleo-independiente-ardf).
Sono già create tre immagini indipendenti per gli slot V3: ARDF con cicli,
Satellite con Doppler RX manuale e Spettro con 128 punti, media, peak hold
e otto preset di sessione RAM, oltre a una cattura VFO-PRO proprietaria di sola ricezione.
La cattura consente la sintonia per passo, l’immissione numerica RX, l’audio e le regolazioni
nei campi RX documentati di R13, preservando gli altri bit. Consente di centrare le finestre e scorrere i preset RAM in modo circolare, con blacklist
temporanea di 16 frequenze esatte e ricerca CTCSS/DCS FM opzionale tramite
il rilevatore upstream, da validare in RF. Non modifica la calibrazione,
non salva i toni e non trasmette.
Satellite non implementa TLE/SGP4 né il tracciamento
autonomo. Durante l’ispezione iniziale non era stata flashata nessuna immagine. Il
26-10-2026 sono stati successivamente verificati i CRC degli slot Bricohams nella
Flash esterna, come documentato nella [guida Quansheng](AYUDA-QUANSHENG.md).
Questo non convalida l’avvio di SAT/ARDF/Spettro, l’equivalenza con Karina né la RF.
La suddivisione per funzione non implica che tutti i moduli Karina siano stati ricreati.
I preset dello spettro sono ora esportabili/importabili via USB/UART in file BHSP,
con convalida e rilettura; non hanno persistenza interna EEPROM. L’immagine
Satellite dispone di CAT RX sperimentale e tracciamento orbitale dal web,
non all’interno del MCU. ARDF permette di esportare un riepilogo delle osservazioni manuali,
senza GPS. Restano funzioni e comportamenti da ricostruire e verificare.

È possibile documentare le funzioni osservate e preparare un’implementazione propria
su una base aperta. Tale implementazione non deve essere presentata come Karina
ricompilata né si deve dichiararne l’equivalenza senza averla verificata.

**Ricerca delle sorgenti (26-10-2026).** Nelle fonti consultate non è stato trovato
codice sorgente pubblico di Karina; ciò non prova che non esista.
Il pack Dim0s dichiara il firmware chiuso e senza repository; non sono state trovate sorgenti nemmeno nei gruppi
Telegram in spagnolo e russo esaminati. Non sono state trovate neppure nelle ricerche effettuate su GitHub, Codeberg, GitLab, Gitee,
GitFlic e GitVerse. Secondo il gruppo russo,
Karina continua [fagci-mod v1.2.1](https://github.com/fagci/uv-k5-firmware-fagci-mod)
(Apache-2.0, che consente derivati chiusi) e condivide il codice dello spettro con
[PUNKTRACKER 2.5](https://github.com/Alexuresp/PUNKTRACKER_2.5) (Apache-2.0, V1).
Queste sono le due basi aperte per reimplementare le sue funzioni; `fagci/s0v4`,
`hawk5` e `k1-fw` non hanno licenza e non vengono copiati. Il binario
Karina non viene decompilato. Hardware e protocolli del V3 sono nell’[atlante tecnico](ATLAS-UV-K5-V3.md).

## 2. Metodo e fonti delle evidenze

- Inventario ricorsivo della cartella fornita, senza eseguire EXE, driver o
  binari.
- SHA-256 e lettura dei primi vettori delle immagini.
- Estrazione del testo da cinque PDF, 102 pagine in totale, con PDF.js in una
  directory di strumenti isolata, al di fuori delle dipendenze del web.
- Consultazione di README, Makefile, linker e licenza dei riferimenti aperti.
- Confronto delle immagini locali con i controlli del connettore PY32.

Durante l’estrazione i PDF hanno prodotto avvisi sui font. Diagrammi,
colori delle versioni stabili/di prova e schermate non sono stati verificati
visivamente pagina per pagina. Perciò non si deduce la stabilità da un
colore perso, né si considera che l’inventario documenti esaustivamente l’implementazione interna. I riepiloghi
seguenti sono originali e non riproducono integralmente i manuali.

## 3. Inventario del pacchetto

24 file: 13 `.bin`, 5 PDF, 3 `.py`, 1 `.exe`, 1 `.ini`, 1 `.txt`.

### 3.1. Immagini e dati

| File | Byte | Classificazione prudente |
| --- | ---: | --- |
| `v1_210826_2.bin` | 61412 | Immagine Karina V1 del pacchetto con il nome più recente |
| `v1_210826_2.packed.bin` | 61430 | Contenitore di aggiornamento, non immagine RAW intercambiabile |
| `30.07fw_2.bin` | 61280 | Immagine precedente; il nome non ne certifica la stabilità |
| `30.07fw_2.packed.bin` | 61298 | Variante impacchettata della precedente |
| `16.10fw_7.bin` | 61040 | Immagine storica; l’anno non è dimostrato dal nome |
| `Config-29.01.26.bin` | 7424 | Configurazione, non firmware |
| `28.11.25calib_mic.bin` | 512 | Dati etichettati come calibrazione del microfono |
| `29.01.26calib_sql.bin` | 512 | Dati etichettati come calibrazione SQL |
| `30.07calib_mic.bin` | 512 | Dati etichettati come calibrazione del microfono |
| `30.07calib_sql.bin` | 512 | Dati etichettati come calibrazione SQL |
| `Rolling back (BACKUP)/k5_v4.00.07_publish.bin` | 58726 | Immagine di ripristino del pacchetto; provenienza non verificata |
| `Rolling back (BACKUP)/Reborn-RUS.bin` | 61006 | Altro firmware; non presumere che sia Karina |
| `Rolling back (BACKUP)/my_calibration-FIRST-Power.bin` | 512 | Possibile calibrazione specifica di un’altra unità |

Le etichette `calib` non provano che un file sia il backup originale della
radio dell’utente. **Non applicare calibrazioni altrui né includerle in un
repository pubblico.** Anche l’EXE K5prog non è stato eseguito né certificato.

### 3.2. Impronte verificate

| File | SHA-256 |
| --- | --- |
| `v1_210826_2.bin` | `c7612a86325d10d768efc9fc7330bede203226879aae0a7d6f026418d55166f9` |
| `v1_210826_2.packed.bin` | `7690da5a740fb24c9a36e711f0410c27b7e99e9ab450d0ef0cdc161b21c11c52` |
| `30.07fw_2.bin` | `9e97e28325468a70aebe19a288cd44878e16ad705f05485c92d2bf9dc50f05b7` |
| `30.07fw_2.packed.bin` | `e53b74b9e755175b72acec8e470e90db0c7c08ac53f1023e10e7e3faeee2d08f` |
| `16.10fw_7.bin` | `af51612d4d20b2637c6da2c72d62493f537621685c1ab604165f0e05fc1fe1ee` |

Sono impronte calcolate localmente, non hash confrontati con una pubblicazione
firmata dall’autore.

### 3.3. Manuali

| Documento locale | Pagine | Utilizzo in questo dossier |
| --- | ---: | --- |
| `00-UV-K5V1-КРАТКО установка и настройка.pdf` | 2 | Introduzione all’installazione e alla configurazione |
| `01-UV-K5V1-ПОДРОБНО-Прошивка, Восстановление, CHIRP.pdf` | 17 | Riferimento per installazione, ripristino e CHIRP |
| `02-UV-K5V1_Инструкция Karina_21.08.26.pdf` | 29 | Riferimento funzionale principale di agosto 2026 |
| `03-UV-K5V1_История версий Karina.pdf` | 16 | Cronologia delle modifiche, non sostituisce il codice sorgente |
| `UV-K5(8)_FW_Karina_mod_15.06.2025-R8.pdf` | 38 | Manuale precedente, non automaticamente equivalente a quello del 2026 |

## 4. Hardware e memoria: non confondere V1 e V3

La copertina del manuale principale identifica UV-K5, UV-K5+, UV-K5(8) e UV-K6 **V1**.
La radio descritta in precedenza dall’utente era **UV-K5 V3**.

| Famiglia | Base rilevante | Conseguenza |
| --- | --- | --- |
| UV-K5 V1 | Ecosistema DP32G030 / riferimento OneOfEleven | Immagine e mappa diverse; questo sito non supporta gli slot V3 |
| UV-K5 V3 / UV-K1 | F4HWN PY32F071 in `Multiboot/Fusion61` | Connettore esistente per slot 1-4 e Main protetto |

In `v1_210826_2.bin` si leggono `SP=0x20003FF0` e `Reset=0x0000010B`.
I RAW `16.10fw_7.bin` e `30.07fw_2.bin` presentano gli stessi vettori.
Il connettore V3 si aspetta un reset Thumb all’interno dell’applicazione a partire da
`0x08002800`. Karina V1 **non supera** questo controllo.

Il linker OneOfEleven consultato dichiara 60 KiB di FLASH e 16 KiB di RAM.
L’immagine Karina da 61412 byte lascia solo 28 byte rispetto a 60 KiB;
è un confronto delle dimensioni con quel riferimento, non una mappa interna di Karina.
Non dimostra che ci sia spazio per un altro firmware o un boot manager.
I 18 byte aggiuntivi dei `.packed.bin` non sono spazio libero utilizzabile.

La copertina del manuale Karina avverte che Si4732 non è supportato e che le memorie
ampliate M24M01/M24M02 non vengono sfruttate come memoria ampliata. Nel pacchetto non ci sono prove
di slot firmware compatibili con il Multiboot F4HWN V3.

## 5. Documentazione funzionale di Karina

Le funzioni di questa sezione provengono dal testo del manuale, non da test su
hardware né dall’ispezione del codice di implementazione.

### 5.1. Schermo e stato (manuale principale, pagine 3-4)

- Visualizzazione VFO/canali e ultimo ricevitore attivo.
- Indicatori di risparmio energetico, blocco tastiera e modalità funzione.
- Doppio ascolto, informazioni CTCSS/DCS e appartenenza agli elenchi di scansione.
- Batteria, misuratore del segnale, nomi e frequenza.
- Indicazione delle modalità AM/FM/SSB; l’etichetta SSB non dimostra un ricevitore con
  prestazioni equivalenti a un apparato SSB dedicato.

### 5.2. Menu e persistenza (pagine 5-9)

- SQL, passo di sintonia, potenza, offset, toni e larghezza di banda.
- Blocco del canale occupato, salvataggio della memoria e stile dei nomi.
- Risparmio energetico, VOX, doppio ascolto e comportamento della scansione.
- Regolazioni audio RX/TX e funzioni specifiche di filtraggio.
- Menu nascosti e parametri avanzati: prima di esporli in una build Bricohams
  occorre documentarli tramite le sorgenti.

Il manuale distingue i parametri per VFO, banda e memoria e spiega che alcune
modifiche al canale persistono solo dopo il salvataggio esplicito. Un port non deve
confondere le impostazioni temporanee con i dati persistenti.

### 5.3. Tastiera, ascolto e scansione (pagine 10-16)

- Azioni brevi, lunghe e combinazioni con il tasto funzione.
- Passaggio VFO/MR, copia delle impostazioni e inserimento della frequenza.
- Scansione e funzioni assegnabili ai tasti laterali.
- Il manuale avverte di possibili problemi quando si assegna `NONE` a FN1/FN2 tramite
  strumenti esterni; occorre verificare la compatibilità del driver.

Il manuale descrive anche funzioni di TX automatica e randomizzazione. La loro
presenza nella documentazione non le rende requisiti del nuovo firmware.
Non vengono automatizzate né sono qui fornite sequenze per interferire con servizi.
Una derivazione iniziale deve rispettare i limiti legali e mantenere disattivata la TX automatica.

### 5.4. Analizzatore di spettro (pagine 17-24)

- Schermata dello spettro e visualizzazione dell’attività.
- Sintonia, selezione della frequenza attiva e relazione con le memorie.
- Intervalli di ingresso libero e preset.
- Multipreset e parametri di scansione.
- Vista dettagliata denominata VFO-PRO.
- Parametri di guadagno e registri del ricevitore, inclusi LNA/PGA.
- Il manuale indica che alcuni parametri possono essere scritti nella calibrazione
  all’uscita dallo spettro: non vanno trattati come innocui controlli visivi.

Gli algoritmi, i filtri, i tempi, i limiti e le assegnazioni dei registri nelle
sorgenti Karina non sono stati verificati. Non è corretto implementare offset presunti
sulla base di schermate o testi.

### 5.5. Diagnostica ed evoluzione (pagine 25-29 e cronologia separata)

Il manuale include problemi di utilizzo e configurazione; la cronologia riporta
modifiche a ricezione, squelch, risparmio energetico, scansione, subtoni e spettro.
La voce del 21-08-2026 menziona una correzione del blocco della ricezione associata
a una modalità descritta come Roger 5 e fa riferimento a `29.01.26calib_sql.bin`.
Ciò non certifica che il file sia adatto a un’altra unità.

La cronologia copre versioni dal 2023 al 2026. La codifica a colori
stabile/prova non è conservata in modo affidabile nell’estrazione del testo.
Non si dichiara che tutti i binari della cartella siano stabili.

## 6. CHIRP: cosa c’è e cosa non dimostra

| File Python | Osservazione |
| --- | --- |
| `f4hwn.chirp.driver.v2.8.1+Karina-5.py` | Modello dichiarato UV-K5/1, basato su Egzumer/F4HWN/Karina |
| `Chirp dr Karina-by_M2Boo-K1-2.py` | Modello dichiarato UV-K5V3/K1, sebbene si trovi nel pacchetto V1 |
| `chirp_uvk5_fagci_osfw.py` | Driver UV-K5/Fagci, non dimostra la compatibilità con l’immagine Karina più recente |

Le intestazioni dei driver indicano GPL v2 o successiva. Tale licenza si
riferisce a quei file, non certifica la licenza del firmware chiuso allegato.
I driver dichiarano 38400 baud e una memoria dati di `0x2000` byte.
I due derivati F4HWN/Karina dichiarano la scrittura dei dati fino a `0x1D00` e
la calibrazione a partire da `0x1E00`. Sono dichiarazioni dei driver, non una prova che
tutti e tre siano adatti a tutte le revisioni.

Questi file Python non sono stati importati né eseguiti. Un modulo CHIRP esegue codice sul
PC: va esaminato e scelto in base al modello, al firmware e alla versione specifici.
La presenza di un driver V3 non trasforma il binario V1 in firmware V3.

## 7. Compilazione modulare, patch e multiboot

| Concetto | Cosa fa | Cosa non dimostra |
| --- | --- | --- |
| UVMOD | Combina patch binarie selezionate su un’immagine supportata | Sorgenti Karina, compilazione C o multiboot |
| Opzioni Make/CMake | Includono/escludono codice e producono un’immagine | Più firmware residenti contemporaneamente |
| Overlays RAM | Condividono la memoria di esecuzione tra sezioni | Slot firmware completi selezionabili all’accensione |
| Multiboot F4HWN V3 | Salva immagini nella Flash esterna e le gestisce tramite il proprio protocollo | Compatibilità con V1 o con un’immagine arbitraria |

OneOfEleven dispone di sorgenti Apache-2.0 e opzioni `ENABLE_*` nel Makefile.
Tra queste vi sono ricezione, spettro/panadapter, interfaccia, scansione e funzioni
di comunicazione. Esistono dipendenze: per esempio, il Makefile regola le opzioni UART e la coesistenza di LTO/overlay. Non basta attivarle tutte.
Una base OneOfEleven sarebbe una derivazione di OneOfEleven/DualTachyon, non Karina.

## 8. Libreria Multiboot locale integrata nel web

In Quansheng, selezionare **Libreria locale** e scegliere la cartella
`Documents/Multiboot`. Il browser legge soltanto i file `.bin` selezionati:
non viene configurata un’API che legga percorsi arbitrari del computer né vengono caricati
i file su GitHub.

L’ispezione locale ha trovato 9 file che superano i controlli attuali:

| Edizione | Versioni | Origine locale |
| --- | --- | --- |
| Fusion | 6.0.0 e 6.1.0 | `Fusion61/archive` |
| FieldOps | 6.0.0 e 6.1.0 | `Fusion61/archive` |
| Labs | 6.0.0 e 6.1.0 | `Fusion61/archive` |
| Transfer | 6.0.0 e 6.1.0 | `Fusion61/archive` |
| Fusion compilata localmente | Stringa 6.1.0 | `Fusion61/build/Fusion/f4hwn.fusion.bin` |

Nel test del browser, selezionando la cartella Multiboot completa, sono state
esaminate 71 immagini: 9 ammesse e 62 bloccate. Il test separato di
`Fusion61/archive` ne ha esaminate 44: 8 ammesse e 36 bloccate. Questi risultati
riguardano il contenuto locale esaminato e cambieranno aggiungendo file.

Ogni voce indica il proprio stato o il motivo del blocco. Vengono controllati lunghezza,
vettori PY32, identificazione F4HWN v6.x e nomi delle varianti escluse.
Viene calcolato SHA-256 localmente. Una stringa di versione e vettori corretti
**non certificano autenticità, corrispondenza con i sorgenti né compatibilità
fisica**. La compilazione locale non viene presentata come firmata da Armel.

ARDFv05 contiene sorgenti, ma nelle directory firmware esaminate non è stata trovata
un’immagine ARDF completata; `archive` contiene immagini Fusion precedenti e stock. Non viene offerta un’immagine ARDF presunta sulla base del nome della cartella.
Le pubblicazioni ARDF del catalogo sono solo scaricabili.

Preparare un’immagine non scrive nulla. Per installarla servono ancora una connessione
compatibile, un backup completo verificato, uno slot 1-4, una conferma e il CRC finale.
Main resta protetto. Anche con un falso nome F4HWN, Karina V1 rimane bloccata
perché i suoi vettori non rispettano il formato PY32.

## 9. Contratto necessario per una versione Bricohams riproducibile

Questo è il lavoro ancora da fare, non una descrizione di funzioni già presenti in Karina:

1. Ottenere le sorgenti esatte di Karina, la licenza, le dipendenze e gli strumenti,
   oppure approvare una base aperta alternativa e documentarne le differenze.
2. Scegliere l’hardware separatamente. V1 e V3 richiedono progetti/profili e binari
   diversi. Per gli slot esistenti dell’utente la base applicabile è PY32,
   non il binario V1 del pacchetto.
3. Riprodurre la compilazione senza modifiche prima di intervenire; registrare commit,
   toolchain, opzioni, mappa e hash. Non inventare uno SHA dell’upstream.
4. Creare profili minimi con dipendenze e budget FLASH/RAM.
   Rifiutare opzioni sconosciute e combinazioni che non rientrano nei limiti.
5. Mantenere identità/licenza dell’upstream e aggiungere il marchio Bricohams senza alterare
   artificialmente una stringa per superare la convalida degli slot.
6. Consegnare `.bin`, mappa, rapporto dimensioni, `build-info.json` e `SHA256SUMS`
   che coprano firmware e metadati. Non confondere hash e firma.
7. Per V3, testare avvio, cambio CFG, calibrazione propria, backup,
   ripristino e slot con F4HWN. Per V1, dimostrare prima il supporto
   fisico di archiviazione e una strategia di ripristino del bootloader.
8. Pubblicare solo dopo i test di banco; documentare i limiti RF e non abilitare
   automaticamente trasmissioni fuori dalle bande consentite.

Il web ha già un modulo di opzioni per il workflow
`Brico-Hams/bricohams-firmware`; non è un compilatore Karina. In questa attività
quel workflow non è stato eseguito. È stato aggiunto un builder locale indipendente
per F4HWN v6.1.0 e sono state generate le edizioni Bricohams Fusion e Labs. Il resto di
questa sezione rimane un requisito per derivare Karina, non un’affermazione che
le funzioni Karina siano state reimplementate in quei binari.

## 10. Ripristino e limiti operativi

Il `readme.txt` di rollback descrive operazioni che cancellano dati. Non sono
automatizzate né se ne consiglia l’esecuzione in seguito a un guasto USB. Prima di ogni migrazione servono i backup originali dell’unità, l’identificazione dell’hardware e una procedura di ripristino testata.

Il web mantiene le protezioni di scrittura. I file originali del pacchetto e la cartella
Multiboot non sono stati toccati. Non vengono redistribuiti PDF,
EXE, calibrazioni né firmware Karina.

## 11. Fonti esterne consultate

- [UVMOD: strumento](https://whosmatt.github.io/uvmod/index.html).
- [UVMOD: README](https://github.com/whosmatt/uvmod).
- [OneOfEleven: progetto](https://github.com/OneOfEleven/uv-k5-firmware-custom).
- [OneOfEleven: Makefile](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/Makefile).
- [OneOfEleven: linker](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/firmware.ld).
- [OneOfEleven: licenza Apache-2.0](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/LICENSE).
- [F4HWN V3/UV-K1](https://github.com/armel/uv-k1-k5v3-firmware-custom).

I riferimenti esterni sono stati consultati nei rami pubblicati al momento
dell’ispezione; non è stato fissato un commit per una nuova derivazione. Non si attribuiscono
le loro funzioni o licenze al binario Karina senza prove.

## 12. Ricerca nella comunità (26-10-2026)

Ricerche mirate nei gruppi Telegram «QuanSheng UV-K5 en espanol» e
«Quansheng uv-k5, uv-k5 (8), kr5plus», su GitHub, Codeberg, GitLab, Gitee, GitVerse
e GitFlic (con sessione avviata) e nel pack Dim0s. Senza autori né dati personali.

### Codice sorgente

| Evidenza | Fonte |
| --- | --- |
| «ссылки на репозиторий нет, прошивка закрытая» (non esiste un repository, firmware chiuso); build in `t.me/quansheng_V3_K1` | `Karina/информация.txt` del [pack Dim0s](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack) |
| «Karina non ha github, pubblica le versioni nel suo forum russo» | Gruppo in spagnolo |
| Karina è «la continuazione diretta di fagci b5» e Punktracker condivide il suo codice dello spettro | Gruppo russo |
| Thread «Karina mod Fagci based» (creato il 22-02-2024) e canale dello sviluppatore «k5fw» | Gruppo russo |
| Non sono state trovate sorgenti Karina né progetti Quansheng nelle ricerche eseguite su GitFlic e GitVerse | Ricerche del 26-10-2026; non prova che non esistano |

Conclusione: **in questa revisione non sono state trovate sorgenti pubbliche di Karina**.
La base aperta di riferimento identificata è
[fagci-mod v1.2.1](https://github.com/fagci/uv-k5-firmware-fagci-mod) (Apache-2.0, che
consente derivati chiusi) e [PUNKTRACKER 2.5](https://github.com/Alexuresp/PUNKTRACKER_2.5)
(Apache-2.0, V1, con AFC Doppler). `fagci/s0v4`, `hawk5` e `k1-fw` non hanno licenza:
si possono consultare, non copiare. Decompilare il binario Karina per ricostruirne il sorgente
sarebbe un’opera derivata; la legge europea consente la decompilazione solo per l’interoperabilità.

### Versioni V3/K1 del pack Dim0s

`21.09.2026` (attuale) e le precedenti `23.03.2026`, `11.04.2026`, `10.05.2026`, `22.05.2026`,
`14.06.2026`, `28.06.2026`, `27.07.26`, `29.07.26`, `01.08.26`, `06.08.26`, `11.08.26`,
`15.08.26` (test), `21.08.2026` e `testfsk7`. I file `.packed` sono solo per il flasher
ufficiale; gli altri sono per flasher aperti.

### Specifica funzionale per una reimplementazione pulita

Riepilogo originale di `информация.txt` e del changelog del pack, senza copiare codice:

| Funzione | Comportamento descritto |
| --- | --- |
| Spettro multibanda | Più bande simultanee (aerea, marina, LPD, PMR, personalizzate). «Delay» (2400 predefinito, 1100 consigliato) e «Turbo»; più è alto lo squelch rispetto al rumore, più è veloce |
| Accelerazioni | Dal 21.09.26 permanenti (prima associate a Roger 5); AM con xtal 3 in Roger 5 |
| Volume dinamico | Pressione prolungata su 9 (appare «D») |
| Beacon e risposta automatica | F + pressione prolungata su 1/2/3; beacon con FN2 premuto a lungo, durata secondo TxTime |
| Generatore di tono AM | Incluso |
| Cattura a lunga distanza | SQL=3, SAVE=1:3, Roger=3 e pressione prolungata su 1 (consumo maggiore) |
| Tre preset di stato | Calibrazione, canali e impostazioni; selezione con 0/1/2 all’accensione |
| Ricezione | Cattura automatica con filtro antirumore, misure CTCSS/DCS più lunghe, chiusura lenta dello squelch in AM, LNA regolabile |
| Flash | Su firmware di fabbrica; dopo il flash, PTT+EXIT all’accensione per cancellare, caricare la calibrazione originale e poi quella di Karina |
| CHIRP | Solo la scheda dei canali: modificare «Parametri» interrompe il beacon e può bloccare la radio |
| Problemi noti | Prima memoria senza nome nello spettro, frequenze errate in modalità EXP multibanda, frecce invertite nel menu di K1 |

Percorso consigliato: partire da F4HWN V3 (Apache-2.0), portare lo spettro da fagci-mod e
PUNKTRACKER, implementare queste funzioni come codice proprio e pubblicarlo aperto. L’hardware
e i protocolli del V3 sono nell’[atlante tecnico](ATLAS-UV-K5-V3.md) e il catalogo dei
repository in [collegamenti della comunità](ENLACES-COMUNIDAD.md).