# Biblioteca di aiuto per radio e firmware

Revisione: 25-10-2026. Documentazione originale Bricohams; non sostituisce i
manuali ufficiali né certifica combinazioni non testate sull'hardware.

## Documenti e ordine di lettura

| Guida | Cosa tratta |
| --- | --- |
| [Configurazione comune e procedure](AYUDA-CONFIGURACION.md) | Frequenze, FM/DMR, toni, backup, ripetitori, satelliti, USB e verifica dei risultati |
| [Quansheng F4HWN](AYUDA-QUANSHENG.md) | Avvio da 0 a 100 %, hardware V1/V2/V3, versioni v4/v5/v6, edizioni, menu, slot, CFG, app e ripristino |
| [Atlante tecnico UV-K5 V3](ATLAS-UV-K5-V3.md) | Funzionamento interno: pinout PY32F071, memorie, protocollo seriale, bootloader, SWD, compilazione, modifiche, schemi e foto |
| [Tutte le opzioni di compilazione F4HWN](AYUDA-OPCIONES-F4HWN.md) | Significato di ogni opzione del catalogo, dipendenze e precauzioni |
| [Valori dei preset F4HWN](F4HWN-PRESETS.md) | Matrici ON/OFF di 18 versioni pubblicate v4.3.0-v6.3.0, tutti i preset e i profili locali v6.1.0 |
| [ARDF](AYUDA-ARDF.md) | Guadagno manuale, cicli, sincronizzazione, distanza e differenze hardware |
| [Egzumer originale](AYUDA-EGZUMER.md) | Sorgenti V1, licenza Apache-2.0 e ogni opzione del Makefile esaminato |
| [Pack Dim0s e Karina V3/K1](AYUDA-PACK-DIM0S.md) | Inventario delle varianti, nuove prove PY32, hash e limiti di multiboot/licenza |
| [OpenGD77: configurazione e uso](AYUDA-OPENGD77.md) | FM/DMR, codeplug, canali, TG, TS, filtri, GPS, APRS e satelliti |
| [OpenGD77: radio e revisioni](AYUDA-OPENGD77-MODELOS.md) | Modelli, alias, revisioni, varianti e differenza tra catalogo e identificazione |
| [Karina](KARINA.md) | Inventario, funzioni documentate, ricerca del codice sorgente (chiuso), specifica per la reimplementazione e fonti |
| [Baofeng DM-32UV](DM32UV-FIRMWARE.md) | Hardware HR_C7000/FD6818, stato e licenza OpenGD77, installazione, compilazione di RadioFoundry e protocollo bootloader |
| [Esempi](EJEMPLOS.md) | Firmware open source F4HWN v6.3.0 e moto con licenza, canali PMR446 di esempio e script di analisi |
| [Introduzione ai satelliti](INICIACION-SATELITE.md) | Guida originale in spagnolo per iniziare con satelliti FM e l'immagine BH Satélite |
| [Antenne satellitari](ANTENAS-SATELITE.md) | Yagi bibanda e dipolo a V simulati con MoM proprietario, disegni e componenti STL |
| [Binari di terze parti](BINARIOS-TERCEROS.md) | SHA-256 e origine di Karina, firmware DM-32UV ufficiali e modificati, OpenGD77 DM32 e immagini di fabbrica K1/K5 V3, senza ridistribuirli |
| [Repository della comunità](ENLACES-COMUNIDAD.md) | Catalogo verificato dei repository Quansheng e DM-32UV, collegamenti non funzionanti recuperati e ricerca su altri forge |
| [Bricohams V3](BRICOHAMS-FIRMWARE.md) | Compilazione locale riproducibile di Fusion e Labs e artefatti consegnati |
| [AnyTone](AYUDA-ANYTONE.md) | Preparatore locale JSON/CSV; non è CPS RDT né programmatore USB |
| [Android](ANDROID.md) | Registro, canali FM, CAT e audio sperimentali; autorizzazioni e prove per revisione |
| [Convalida V3 e Android](VALIDACION-INTEGRAL-V3-ANDROID.md) | Evidenze, errori corretti, isolamento dei dati, prove in sospeso e limiti delle modifiche |

Nelle pagine web si può usare la ricerca del browser (Ctrl+F).
I documenti Markdown restano nel repository per la consultazione offline.
La guida web è inclusa anche nel server locale, Pages e programmi di installazione.

## Significato di «supportato»

Ci sono quattro concetti diversi:

1. **Supportato dal progetto firmware:** l'upstream mantiene un'immagine.
2. **Riconosciuto dal connettore:** questo sito conosce una struttura d'identificazione.
3. **Pubblicato nel catalogo:** viene riconosciuto il nome di un file di una fonte
autorizzata. Non equivale a poterlo installare con questo sito.
4. **Provato su una radio:** richiede prove fisiche del modello e della build esatti.
I test automatici del sito non sono questa certificazione.

Una riga in una tabella non autorizza l'uso del firmware di un'altra revisione.
«Download» non significa «flash»; «file verificato» non significa «firmato
 digitalmente».

## Copertura delle versioni

| Famiglia | Copertura specifica di questa biblioteca | Limite |
| --- | --- | --- |
| F4HWN Quansheng PY32 | 18 versioni pubblicate riconosciute; 84 opzioni dell'interfaccia e 94 chiavi distinte nella cronologia dei preset per commit | Le funzioni v6 non vengono attribuite alle versioni precedenti |
| ARDF Quansheng | Release riconosciute del repository V3/UV-K1; guida ARDF locale v0.5 e avvertenze sull'evoluzione | Non si abilita la scrittura negli slot senza compatibilità verificata |
| Bricohams su F4HWN | Fusion, Labs, ARDF, Satellite e Spectrum v6.1.0, opzioni e hash documentati | Letture precedenti e CRC degli slot non certificano l'avvio né tutte le funzioni |
| Piattaforma indipendente Bricohams | Residente sperimentale, Diagnostics e Blocks in BHA1, archiviazione e trasferimento portabili | Senza avvio fisico convalidato né integrazione USB/Flash; BHA1 non è FAP1 e non si installa con il caricatore web esistente |
| Karina | Pack V1 locale e pack V3/K1 del 21-09-2026 esaminato da Dim0s | Esistono binari PY32; non sono dimostrate le sorgenti né la compatibilità multiboot Armel |
| OpenGD77 | Famiglie e modelli documentati; versioni identificate per data/build e varianti di distribuzione | Non esiste una tabella universale dei menu applicabile a tutte le build storiche |
| Quansheng stock, UVMOD, OneOfEleven | Identificazione e riferimenti per evitare confusioni | Non sono protocolli né compilatori integrati in questo sito |

«Tutte le versioni» è documentato come matrice di famiglie, differenze e fonti
per versione, non come promessa che ogni menu esista dal primo firmware. Per una
build specifica, annotare modello, revisione, data, nome del file, commit se
presente e hash. Confrontarli con manuale e note di rilascio. Ciò che non è
confermato è indicato come tale, anziché inventare valori, scorciatoie o mappe.

## Regole di sicurezza e uso legale

- Identificare l'hardware reale, non solo il guscio.
- Conservare la calibrazione originale e il codeplug prima della migrazione.
- Non eseguire cancellazioni, ripristini o reset per un errore della porta senza
  prima conoscerne la causa.
- Su OpenGD77 questo sito mantiene bloccata la scrittura perché non ottiene una
  copia completa e verificata del firmware MCU.
- Su Quansheng le modifiche richiedono un backup completo; Main è protetto.
- I dati importati per l'ascolto iniziano in RX-only.
- Non attivare TX automatico né fuori dalle frequenze autorizzate. Un profilo
  firmware PMR/GMRS/FRS/MURS non omologa una radio.

## Licenze: componenti distinti

La dichiarazione dell'utente «la licenza è MIT» è registrata come dichiarazione
in attesa di associazione al componente, titolare e testo originale della
licenza. Non modifica la licenza di terze parti né quella del repository esistente:

- Il sito dichiara GPL-3.0-or-later nel manifesto e nel file LICENSE.
- Le sorgenti F4HWN esaminate includono Apache-2.0 e NOTICE.
- I driver CHIRP del pack Karina contengono avvisi GPL.
- La licenza esatta del firmware Karina non compare nel pack esaminato.
  La dichiarazione MIT dell'utente non fornisce le sorgenti né dimostra a quali
  file/versioni si applichi. L'avviso corrispondente sarà aggiunto quando esisterà
  un riferimento verificabile.
- OpenGD77 e i suoi componenti sono regolati dai rispettivi avvisi; non presumere MIT.

Non si ridistribuiscono manuali completi, firmware Karina, calibrazioni altrui
né software di terze parti solo perché citati.

## Aggiornare questa biblioteca

Le tabelle dei valori sono generate dai cataloghi fissati, non dalla memoria:

```powershell
npm run build:help
```

Quando cambia un catalogo, verificare il significato delle nuove opzioni,
versioni e dipendenze, rigenerare le pagine ed eseguire i test di aiuto.
L'apertura di una guida non interroga la radio né ne modifica la configurazione.

Lo snapshot storico è in `f4hwn-history-presets.json`: conserva commit,
SHA-256 e contenuto di CMakePresets.json per ogni versione. L'aggiornamento è
esplicito con `node scripts/fetch-help-presets.cjs` dalla radice del repository;
esegue richieste pubbliche a GitHub, non accede alle radio né carica file locali.
Il generatore normale della guida funziona offline e non scarica le sorgenti.