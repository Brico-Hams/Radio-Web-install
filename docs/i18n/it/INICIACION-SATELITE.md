# Introduzione ai satelliti

Autori: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF e Pedro
Roca, fondatori e membri del consiglio di Bricohams.
Informazioni: <https://bricohams.org> e <https://bricohams.com>.

Guida introduttiva in spagnolo associata all'immagine firmware
**BH Satélite** (Bricohams Satélites) per Quansheng UV-K5 V3/K1. La sezione
sulle antenne ha una pagina dedicata: [Antenne per satelliti](ANTENAS-SATELITE.md).

## Origine e crediti

Questa guida nasce dalla lettura di *Radioamadores no Espaço — Guia básico para
operar satélites*, di Carlos Vicente PT2VM, versione 1.1 del 04/09/2025, in
portoghese. L'autore consente la distribuzione gratuita senza fini di lucro,
ma non autorizza espressamente traduzioni o opere derivate. Include inoltre
disegni d'antenna di PY4ZBZ e PY5LO, il cui permesso fu concesso a PT2VM.

Per questo il documento **non è una traduzione letterale e non ne riproduce le
immagini**. Segue un percorso tematico simile, con testo, schemi e antenne
originali Bricohams, adattati alla Spagna e alla UV-K5 con BH Satélite.
Consigliamo di leggere l'originale di PT2VM.

Se l'autore autorizzerà la traduzione, la pubblicheremo separatamente con la
relativa attribuzione.

## Contenuti

1. [Che cos'è un satellite radioamatoriale](#che-cosè-un-satellite-radioamatoriale)
2. [Chi può ascoltare e chi può trasmettere](#chi-può-ascoltare-e-chi-può-trasmettere)
3. [Concetti del passaggio](#concetti-del-passaggio)
4. [Ora UTC, locator e coordinate](#ora-utc-locator-e-coordinate)
5. [Prevedere i passaggi e verificare se il satellite è attivo](#prevedere-i-passaggi-e-verificare-se-il-satellite-è-attivo)
6. [Effetto Doppler](#effetto-doppler)
7. [Satelliti FM per iniziare](#satelliti-fm-per-iniziare)
8. [Apparecchiature della stazione](#apparecchiature-della-stazione)
9. [Operare con BH Satélite sulla UV-K5](#operare-con-bh-satélite-sulla-uv-k5)
10. [Come fare un QSO via satellite](#come-fare-un-qso-via-satellite)
11. [Registrare e confermare i contatti](#registrare-e-confermare-i-contatti)
12. [SSTV e APRS dalla ISS](#sstv-e-aprs-dalla-iss)
13. [Lista di controllo del passaggio](#lista-di-controllo-del-passaggio)
14. [Glossario](#glossario)
15. [Riferimenti](#riferimenti)

## Che cos'è un satellite radioamatoriale

Un satellite radioamatoriale è una stazione radio in orbita che riceve su una
frequenza, l'**uplink** o *salita*, e ritrasmette su un'altra, il **downlink**
o *discesa*. Molti si identificano come OSCAR, acronimo di *Orbiting Satellite
Carrying Amateur Radio*, seguito da un numero di serie, come SO-50 o AO-7.

In base alla funzione, si distinguono tre tipi principali:

- **Ripetitori FM.** Funzionano come un ripetitore montano, ma a centinaia di
  chilometri d'altezza. Può transitare un solo QSO alla volta e sono il miglior
  punto di partenza con una radio portatile.
- **Transponder lineari.** Ritrasmettono un'intera porzione di banda, di decine
di kHz, e supportano molti QSO contemporanei in SSB o CW. Di solito richiedono
apparecchi full duplex e SSB in trasmissione.
- **Digitali e beacon.** Includono APRS, telemetria e SSTV. Molti sono
ricevibili con apparecchiature semplici.

Quasi tutti i satelliti che useremo sono in **orbita bassa (LEO)**, tra 400 e
1000 km. Completano un'orbita in circa 90-100 minuti e ogni passaggio sulla
nostra stazione dura tra 5 e 15 minuti. La Stazione Spaziale Internazionale
(ISS), a circa 400 km, è il satellite con equipaggio più conosciuto dai radioamatori.

## Chi può ascoltare e chi può trasmettere

- **Ascoltare** i satelliti radioamatoriali è alla portata di chiunque abbia un
  ricevitore adeguato.
- **Trasmettere** richiede un'autorizzazione radioamatoriale valida. Operare
  entro le bande, modalità e potenze consentite dal regolamento vigente pubblicato
  nel BOE.
- I segmenti satellitari della Regione 1 IARU sono **145,800-146,000 MHz** e
  **435,000-438,000 MHz**. Non trasmettere qui comunicazioni terrestri.
- I **satelliti militari UHF**, come FleetSatCom o UHF Follow-On, non sono
  radioamatoriali. Usarli è illegale e perseguito. La UV-K5 non deve essere
  impiegata a questo scopo.

## Concetti del passaggio

![Geometria di un passaggio satellitare](../../atlas/sat-pase-orbital.svg)

| Termine | Significato |
| --- | --- |
| AOS | *Acquisition of Signal*: il satellite appare all'orizzonte |
| TCA | *Time of Closest Approach*: massima elevazione e distanza minima |
| LOS | *Loss of Signal*: il satellite scompare oltre l'orizzonte |
| Azimut | Direzione orizzontale in gradi: 0 nord, 90 est, 180 sud, 270 ovest |
| Elevazione | Angolo sopra l'orizzonte, da 0 a 90 gradi |
| Impronta | Area terrestre visibile dal satellite in un dato momento |
| TLE / Keps | Parametri orbitali usati dai programmi per calcolare i passaggi |

Due stazioni possono comunicare se entrambe si trovano nell'impronta nello
stesso momento. Con un satellite LEO la portata tipica raggiunge circa
4000-5000 km. Dalla Spagna si può contattare gran parte dell'Europa e il nord
Africa.

I passaggi con elevazione massima sotto i 15-20 gradi sono brevi e deboli, e
vengono schermati da edifici o montagne. Per iniziare, scegliere passaggi oltre
30 gradi.

## Ora UTC, locator e coordinate

- **UTC.** Le previsioni, gli annunci di attività e i registri usano l'ora UTC.
  Nella Spagna peninsulare UTC è l'ora locale meno 1 h in inverno e meno 2 h in estate.
- **Locator Maidenhead.** È un codice di quattro caratteri, come IM97 nella
  zona di Murcia, che identifica la griglia. Nei QSO via satellite si scambiano
  nominativo e griglia; molti diplomi conteggiano le griglie.
- **Coordinate.** Impostare latitudine, longitudine e altitudine con precisione
  nel predittore. Un errore di qualche chilometro può spostare il passaggio di
  decine di secondi.

## Prevedere i passaggi e verificare se il satellite è attivo

I programmi di previsione usano i TLE, pubblicati e aggiornati continuamente.
Usare sempre TLE degli ultimi giorni.

| Strumento | Piattaforma | Note |
| --- | --- | --- |
| App Android Bricohams | Android | SGP4 proprietario e CAT RX verso BH Satélite; vedi [Android](ANDROID.md) |
| Gpredict | Windows, Linux e macOS | Libero, con controllo rotor e radio |
| Orbitron | Windows | Gratuito e classico, con previsione e Doppler |
| ISS Detector | Android | Semplice; i satelliti radioamatoriali richiedono un'estensione |
| Heavens-Above / N2YO | Web | Passaggi visibili e ISS |
| AMSAT Pass Predictions | Web | Passaggi dei satelliti radioamatoriali |

Il fatto che un satellite sia in orbita non significa che il suo transponder
funzioni. Prima del passaggio:

- Consultare la pagina di stato AMSAT, dove gli operatori comunicano cosa ricevono.
- Controllare gli annunci del satellite: alcuni si attivano solo secondo orari o
  su determinate regioni.
- Verificare su SatNOGS le registrazioni recenti delle stazioni automatiche.

## Effetto Doppler

![Spostamento Doppler durante un passaggio](../../atlas/sat-doppler.svg)

Un satellite LEO si muove a circa 7,5 km/s. Mentre si avvicina, riceviamo il
segnale al di sopra della frequenza nominale; mentre si allontana, al di sotto.
Lo spostamento è approssimativamente:

```text
desplazamiento = frecuencia x velocidad radial / velocidad de la luz
```

| Banda | Frequenza | Doppler massimo approssimativo con 7 km/s |
| --- | --- | --- |
| 2 m | 145,8 MHz | ± 3,4 kHz |
| 70 cm | 436,8 MHz | ± 10,2 kHz |

Conseguenze pratiche:

- In FM, il downlink a 70 cm esce dal filtro se non viene corretto. Quello a 2 m
  di solito è tollerabile senza correzione.
- Correggere soprattutto la frequenza più alta. Sui satelliti FM si regola di
  solito il downlink UHF a passi di 5 kHz.
- La variazione è più rapida intorno al TCA, soprattutto nei passaggi alti.
- Con memorie a gradini, si passa dalla frequenza più alta a quella più bassa
  man mano che procede il passaggio. Con BH Satélite si può anche correggere la
  ricezione manualmente o via CAT; vedi sotto.

## Satelliti FM per iniziare

> Le frequenze e lo stato dei satelliti cambiano. Consultare AMSAT prima di
> programmare e non trasmettere verso un satellite inattivo o in modalità test.

| Satellite | Uplink (TX) | Downlink (RX) | Tono | Note |
| --- | --- | --- | --- | --- |
| SO-50 | 145,850 MHz | 436,795 MHz | 67,0 Hz | 74,4 Hz attiva il suo timer; molto affollato |
| ISS, ripetitore incrociato | 145,990 MHz | 437,800 MHz | 67,0 Hz | Attivo in modo intermittente |
| ISS, voce ARISS in Regione 1 | 145,200 MHz | 145,800 MHz | — | Contatti con le scuole: solo ascolto |
| ISS, APRS | 145,825 MHz | 145,825 MHz | — | Digipeater packet a 1200 bps |
| PO-101 | 437,500 MHz | 145,900 MHz | 141,3 Hz | Attivazioni programmate |

![Piano delle memorie a gradini, esempio SO-50](../../atlas/sat-memorias-fm.svg)

## Apparecchiature della stazione

![Stazione portatile con BH Satélite](../../atlas/sat-estacion-bh.svg)

- **Radio.** La UV-K5 è semiduplex: non riceve durante la trasmissione, quindi
  non puoi ascoltare il tuo eco sul satellite. Con due radio, una per la
  trasmissione e l'altra per la ricezione, sentirai il tuo segnale in tempo
  reale. È il modo migliore per sapere se il segnale arriva.
- **Antenna.** È la parte più importante. Consulta [Antenne per satelliti](ANTENAS-SATELITE.md):
  una Yagi bibanda portatile con disegno quotato e componenti stampabili STL,
  oltre a un dipolo a V fisso per ascoltare la ISS.
- **Polarizzazione.** Il segnale del satellite ruota durante il passaggio. Se
  svanisce, ruota la Yagi portatile sul proprio asse per recuperarlo.
- **Auricolari e registrazione.** Il rumore ambientale copre i segnali deboli.
  Registrando il passaggio si possono riascoltare i nominativi.
- **Potenza.** Con una Yagi, 2-5 W bastano per i satelliti FM. Più potenza non
  compensa un'antenna puntata male e disturba altri utenti.

## Operare con BH Satélite sulla UV-K5

BH Satélite è l'immagine Beta del firmware Bricohams con il profilo Satellite.
Dettagli tecnici, limiti e protocollo: [Firmware Bricohams](BRICOHAMS-FIRMWARE.md).

> **Sperimentale.** Le funzioni Doppler, CAT RX e CAT TX sono state sottoposte
> a test software con primitive RF simulate. **Non sono ancora state convalidate
> sulla radio né mediante misure RF.** Provare prima in ricezione.

1. **Slot corretto.** Nelle radio multi-boot, ogni slot ha il proprio banco
   canali. Programmare le memorie satellitari **solo nello slot BH Satélite**.
   Prima, eseguire un backup completo con [Quansheng](AYUDA-QUANSHENG.md).
2. **Memorie.** Creare una memoria con RX uguale al downlink nominale e TX uguale
   all'uplink, con il relativo tono. Si può usare anche il piano di 5 memorie a gradini.
3. **SAT RX.** Selezionare la memoria e accedere alla modalità Fox Hunt/SAT. Lo
   schermo mostra `SAT RX` e usa RX e TX del canale come valori nominali.
4. **Doppler manuale.** I tasti 4 e 6 sottraggono o sommano 500 m/s alla
   velocità radiale; il tasto 5 azzera. All'inizio del passaggio il satellite
   si avvicina, quindi usare velocità negative per ricevere più in alto.
5. **CAT RX da Android.** Premere 8 sulla radio per visualizzare `CAT READY RX`.
   L'app Bricohams calcola il passaggio con SGP4 e invia la frequenza RX corretta.
   Ogni comando scade dopo 3 s se non viene rinnovato. I tasti 4, 5 e 6
   restituiscono il controllo alla modalità manuale.
6. **Trasmissione.** L'uplink usa la TX nominale del canale: BH Satélite **non
   corregge il Doppler in trasmissione**. La PTT CAT per SSTV richiede
   l'attivazione locale con il tasto 9, un lease di 1500 ms e un limite di 120 s.
7. **Uscita.** EXIT ripristina la configurazione RF del VFO.

La UV-K5 può anche **ascoltare** i transponder lineari in SSB con firmware
F4HWN. Per trasmettervi servono SSB in TX e full duplex, funzioni non offerte
dalla UV-K5. OpenGD77, sulle radio compatibili, include una propria modalità
satellite: [OpenGD77](AYUDA-OPENGD77.md).

## Come fare un QSO via satellite

1. **Ascoltare prima.** Ascoltare uno o due passaggi completi prima di
   trasmettere per conoscere il ritmo e i nominativi abituali.
2. **Breve e chiaro.** Un QSO tipico consiste nello scambio di nominativi e
   griglie, per esempio: «EA5XXX, IM97». Confermare l'altro con «QSL, 73».
3. **Una sola trasmissione alla volta.** Su un ripetitore FM, se due stazioni
   trasmettono contemporaneamente, non se ne sente nessuna. Attendere una pausa
   e non chiamare continuamente.
4. **Non monopolizzare.** Un passaggio dura pochi minuti ed è condiviso da
   molte stazioni. Un contatto per passaggio è una buona regola sui satelliti affollati.
5. **Verificare il proprio segnale.** Con due radio, ascoltare il proprio
   downlink. Se non lo si sente, controllare puntamento, memoria Doppler e tono
   prima di richiamare.

Codici ed espressioni comuni:

| Espressione | Significato |
| --- | --- |
| QRZ | Chi mi sta chiamando? |
| QSL | Ricevuto o confermato |
| QTH / grid | Posizione o griglia |
| 73 | Saluti |
| QRT | Smetto di trasmettere |
| Rover | Stazione mobile che attiva griglie rare |

## Registrare e confermare i contatti

- Annotare data e ora **UTC**, nominativo, griglia del corrispondente, satellite
  e modalità.
- In ADIF usare `PROP_MODE` = `SAT` e `SAT_NAME`, ad esempio `SO-50`.
  Il registro dell'app Android esporta ADIF.
- Caricare i contatti su LoTW o eQSL per confermarli. Il diploma VUCC satellitare
  ARRL richiede 100 griglie confermate.

## SSTV e APRS dalla ISS

- **SSTV.** Durante gli eventi annunciati da ARISS, la ISS trasmette immagini FM
  su 145,800 MHz, normalmente in PD120 o Robot36. Basta il dipolo a V o una Yagi
  e un decoder. L'app Bricohams decodifica Robot36 da WAV.
- **APRS.** Il digipeater ISS a 145,825 MHz ritrasmette pacchetti. Per inviare
  pacchetti servono licenza e un TNC o un'app compatibile.
- **Ascolto della voce.** Durante i contatti ARISS con le scuole, ascoltare
  soltanto il downlink a 145,800 MHz. Non trasmettere sull'uplink.

## Lista di controllo del passaggio

1. Aggiornare i TLE e controllare ora UTC del passaggio, elevazione massima e
   direzioni AOS e LOS.
2. Confermare su AMSAT che il satellite sia attivo.
3. Verificare che la radio si avvii nello slot BH Satélite e che la memoria
   abbia RX, TX e tono corretti.
4. Controllare antenna, coassiale, diplexer, auricolari e registratore.
5. Prima dell'AOS, puntare verso l'orizzonte da cui apparirà il satellite.
6. Durante il passaggio, seguirlo, ruotare l'antenna per la polarizzazione e
   correggere il Doppler.
7. Dopo il passaggio, registrare i contatti in UTC e riascoltare la registrazione.

## Glossario

| Termine | Definizione |
| --- | --- |
| Uplink / salita | Frequenza usata per trasmettere verso il satellite |
| Downlink / discesa | Frequenza su cui il satellite ritrasmette |
| Transponder | Apparato satellitare che converte l'uplink in downlink |
| Semiduplex | Non si riceve durante la trasmissione |
| Full duplex | Ricezione e trasmissione simultanee; permette di ascoltare il proprio eco |
| CTCSS | Tono subaudio che apre il ripetitore satellitare |
| SGP4 | Modello di propagazione orbitale usato con i TLE |
| CAT | Controllo della radio da computer o telefono |

## Riferimenti

- Carlos Vicente PT2VM, *Radioamadores no Espaço — Guia básico para operar
  satélites*, v1.1, 04/09/2025. Ha ispirato il percorso tematico; non viene riprodotto.
- AMSAT: <https://www.amsat.org>. Stato dei satelliti, frequenze e previsioni.
- ARISS: <https://www.ariss.org>. Radioamatori a bordo della ISS.
- CelesTrak: <https://celestrak.org>. Elementi orbitali TLE.
- SatNOGS: <https://satnogs.org>. Rete aperta di stazioni terrestri.
- Bricohams: [Antenne per satelliti](ANTENAS-SATELITE.md),
  [Firmware Bricohams](BRICOHAMS-FIRMWARE.md), [Android](ANDROID.md) e
  [Quansheng](AYUDA-QUANSHENG.md).