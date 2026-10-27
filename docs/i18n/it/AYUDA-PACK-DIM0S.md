# Pack Dim0s: inventario e Karina V3/UV-K1

Revisione: 25-10-2026. Repository fornito dall'utente:
`Dim0s/quansheng-UV-K5v3-K1-firmware-pack`.
Commit esaminato: `52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c`.

## Cosa cambia rispetto all'ispezione precedente

Il pacchetto Karina locale inizialmente esaminato era **V1**. Questo repository
annuncia firmware per **K5 V3, K1 e apparecchi con bootloader 7.x** e contiene
un altro pacchetto Karina con binari separati K1/V3. Pertanto:

- Non è corretto affermare che esista solo Karina V1.
- Resta corretto rifiutare per V3 il binario V1 del pacchetto precedente.
- Esistono nuove prove di **binari Karina PY32**, ma non della loro
  compatibilità con multiboot Armel né della disponibilità dei sorgenti.
- Questo riferimento non rende il pack una fonte ufficiale di ogni autore.

L'intestazione del repository raccomanda di salvare le calibrazioni. Le
informazioni Karina dichiarano che non esiste un collegamento al repository
sorgente e descrivono il firmware come chiuso, con repost di build in un canale
esterno. Ciò da solo non dimostra una licenza specifica: l'avviso MIT indicato
dall'utente resta in attesa di una fonte e di un titolare verificabili.

## Natura e limiti dell'inventario

L'intero albero Git, senza troncamenti, contiene binari, app, documenti, driver
Python e archivi compressi. Nell'albero non sono stati trovati file sorgente
`.c`/`.h`, Makefile né file LICENSE/COPYING/NOTICE riconoscibili dal nome.
Non si afferma di aver ispezionato internamente tutti gli ZIP/RAR del repository.
Per Karina è stato esaminato lo ZIP del 21-09-2026, senza eseguirne i file.

Il pack non viene copiato nel repository web e non si installano EXE, APK,
driver o calibrazioni. I suoi PDF, file e firmware non vengono ridistribuiti.
Un hash SHA-256 calcolato localmente rileva modifiche rispetto al download, ma
non attesta paternità, licenza, sicurezza o corrispondenza con i sorgenti.

## Famiglie presenti

Le funzioni seguenti sono **affermazioni del curatore** del README esaminato,
non prestazioni certificate da Bricohams. Per ogni build occorre consultare
autore e manuale specifici.

| Cartella/progetto | Funzione descritta dal pack | Stato su questo sito |
| --- | --- | --- |
| BD1AHN | Variante a tre VFO | Riferimento documentale; protocollo non convalidato |
| Calypso | Cartelle delle versioni 1.5.0 e 1.7.0 | Inventariata; non si deducono funzioni |
| Delta | Password e protezione dei dati secondo il curatore | Le proprietà crittografiche non sono certificate |
| E25WOP | Funzioni CW e accessori secondo il curatore | Non collegare accessori seguendo le istruzioni di un'altra scheda |
| F4HWN | Release e app, incluse versioni storiche | Preferire la fonte ufficiale Armel già integrata |
| GOGU | Variante F4HWN con messaggistica e altre funzioni | Multiboot dichiarato dal curatore; non convalidato localmente |
| HAWK | Documentazione e file propri | Inventariata; non si deducono funzioni |
| IJV | Versioni con funzioni gratuite/a pagamento secondo il pack | Non distribuire né abilitare funzioni a pagamento senza licenza |
| IOTCU | Variante con modulo Si4732 secondo il pack | Richiede hardware/firmware specifici; non presumere che una radio di serie lo abbia |
| KA50 / KA52 / KA52M | Spettro; KA52M con varianti a 2/3 VFO | Più VFO non equivale a ricevitori RF simultanei |
| Karina | Spettro, acquisizione e preset propri | Nuovi binari K1/V3; slot Armel non verificati |
| Matoz | File propri | Inventariata; non si deducono funzioni |
| N7SIX | Spettro/funzioni CW secondo il curatore | Multiboot dichiarato, non certificato |
| NR7Y | Funzioni CW secondo il curatore | Non presumere la compatibilità elettrica degli accessori |
| PrepperRadio | Messaggistica via modalità FSK secondo il pack | Non certificare cifratura, rete o compatibilità tra varianti |

Il README menziona anche Sonic tramite un collegamento esterno e chiarisce che
non fa parte del pack in quel momento. Una menzione non equivale a un binario
esaminato. Le cartelle di firmware stock e calibrazioni di fabbrica sono
materiale di riferimento: **non usare calibrazioni di un'altra unità come
proprio backup**.

## Multiboot: dichiarazione e verifica

Il curatore elenca F4HWN, GOGU, IOTCU e N7SIX come compatibili con il multiboot
Armel, oltre a Sonic esterno. **Karina non compare nell'elenco.** Prima di
estendere l'ispettore occorre verificare formato, mappa, identificazione,
banchi CFG, ripristino, protocollo, integrità e avvio sull'hardware.

Il sito mantiene il proprio elenco di immagini F4HWN riconosciute. Non si
modifica una stringa né si rinomina un file per aggirarlo. Queste fonti non
vengono aggiunte automaticamente al catalogo di download verificati dagli
autori originali.

## Karina 21-09-2026: prova dello ZIP

File: `Karina/21.09.2026.zip`, 2296162 byte.
SHA-256 del download:

```text
619368c7d08cd2dfdda13aeec4ae5d8fadd70eb78d60bbe908832d53385e2999
```

L'[indice dei binari di terzi](BINARIOS-TERCEROS.md) contiene un download con lo
stesso nome ma di 2161962 byte e un altro SHA-256. Non è stato dimostrato che i
due ZIP abbiano contenuti equivalenti. Questo inventario e gli hash estratti
seguenti si riferiscono esclusivamente al download di 2296162 byte indicato
sopra, non a qualsiasi file chiamato `21.09.2026.zip`.

Inventario interno: cartelle K1 e K5V3, due RAW, due packed, due copie di
`calib11.bin`, due driver CHIRP e tre PDF. Non contiene progetto C, Makefile,
linker né avviso LICENSE riconoscibile dal nome. I nomi russi di alcune voci
presentano problemi di codifica quando si elenca lo ZIP; non sono stati
reinterpretati come nomi di sorgenti né è stato eseguito alcun contenuto.

| Immagine RAW | Byte | SP | Reset |
| --- | ---: | --- | --- |
| `k1_210926_3.bin` | 76288 | `0x20004000` | `0x08010AF5` |
| `v3_210926_3.bin` | 76352 | `0x20004000` | `0x08010B39` |

Questi vettori forniscono prova della famiglia PY32 in entrambe le immagini,
distinta da `Reset=0x0000010B` del pacchetto V1. Un vettore entro i limiti e di
dimensione ammessa **non dimostra** la compatibilità con il caricatore multiboot.
Le varianti packed sono contenitori diversi: non tagliare 18 byte alla cieca.

| File | SHA-256 locale |
| --- | --- |
| `k1_210926_3.bin` | `81328890f55739d917fe9531feb76179b28db2a80672e1383dfb76917a13ee82` |
| `v3_210926_3.bin` | `40467077e32273392da6ff735ff69c0e40779c9236477e4ead287add645db4d4` |
| `k1_210926_3.packed.bin` | `de1d74fd1a3901776c977fb58342264a69ad687c61c58a4063b63e91cd1123bc` |
| `v3_210926_3.packed.bin` | `5ec8598ca8cc5c0df0030137d5fd774bade8569d27b8021fcde147248f088d34` |

`calib11.bin` non è stato ripristinato né se ne raccomanda il ripristino. Le
due copie hanno 512 byte e la stessa impronta, ma ciò non le rende la
calibrazione originale delle due radio dell'utente.

## Configurazioni Karina V3 descritte dal curatore

| Funzione | Significato descritto | Precauzione/versione |
| --- | --- | --- |
| Spettro Delay | Compromesso tra tempo di misura e velocità | Valori minori possono ridurre la sensibilità; non copiare un numero «ottimale» universale |
| Turbo | Accelera la scansione | Secondo la nota stessa, può omettere segnali utili |
| Roger 5 | Parametro riutilizzato per modifiche sperimentali RX | Il significato cambia: il 21-09-2026 sono annunciati accelerazioni permanenti; non trattarlo solo come tono Roger |
| Volume dinamico | Gestione dell'audio/code | Regolazione percettiva, non calibrazione RF |
| Acquisizione vicina/lontana | Rilevamento automatico della frequenza | Influisce su consumo/latenza; non garantisce di localizzare un segnale o registrarli tutti |
| Tre preset | Stati di configurazione dalle note di luglio 2026 | Includono dati propri; non sono slot firmware Armel |
| Beacon/risposta automatica | Funzioni che possono trasmettere automaticamente | Non abilitarle come configurazione iniziale né per provare la radio |
| SQL esteso | Le note di luglio descrivono un intervallo 0-15 | Non applicarlo a versioni precedenti senza verifica |
| Impostazioni/tasti CHIRP | Le note segnalano incompatibilità e blocchi con NONE | Non scrivere con un driver generico né copiare valori da un altro firmware |

La voce del 21-09-2026 descrive modifiche alla chiusura squelch AM, accelerazione,
acquisizione e misure CTCSS/DCS. Quella del 21-08-2026 descrive una correzione
del blocco RX legata a Roger 5. Sono note del pack, non risultati di test.
Il file del 15-08-2026 è identificato come versione di test.

Il testo del pack include cancellazioni, caricamenti di calibrazione e perfino
indicazioni di ignorare errori di verifica. **Non vengono trasformati in
istruzioni di questo sito.** In caso di errore di verifica, fermarsi, conservare
i backup e controllare strumento/hardware/versione; non dichiarare il successo
sulla base di una nota di terzi.

## Cosa manca per un porting o un'integrazione reale

1. Sorgenti e licenza esatti dell'autore per Karina K1/V3.
2. Compilazione riproducibile e mappa della memoria.
3. Specifica/protocollo e compatibilità effettiva di CFG/calibrazione.
4. Verifica del meccanismo multiboot o dimostrazione di un'implementazione compatibile.
5. Test fisici di lettura, backup, avvio, ripristino e recupero.

Karina non è stata portata, compilata né flashata da questo collegamento.
La nuova prova corregge la copertura hardware, non elimina questi requisiti.

## Fonti fissate

- [Albero completo del pack](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c).
- [Cartella Karina](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c/Karina).
- [Note Karina e changelog](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c/Karina).
- [Egzumer: sorgente originale distinta](AYUDA-EGZUMER.md).
- [Inventario del pacchetto Karina V1](KARINA.md).