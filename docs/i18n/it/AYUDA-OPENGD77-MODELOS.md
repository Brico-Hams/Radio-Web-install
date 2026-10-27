# OpenGD77: modelli, varianti e ambito del supporto

**Verifica documentale: 2026-10-25.** Complemento della [Guida alla configurazione e all'uso](AYUDA-OPENGD77.md). Distingue la compatibilità documentata dal progetto, le destinazioni del catalogo e i nomi riconosciuti dal connettore. Non sono state effettuate prove fisiche su tutti gli apparecchi.

## 1. Come interpretare le tabelle

- **Guida:** il modello o la variante compare nella guida ufficiale inglese consultata. Una menzione in un titolo, screenshot o esempio non equivale a istruzioni complete di installazione.
- **Pacchetto:** è stato osservato un file pubblicato in uno specifico indice ufficiale. Non certifica tutte le revisioni hardware con un nome commerciale simile.
- **Catalogo:** destinazione in `firmware-core.js`, `TARGETS`; è un selettore di pacchetti, non un caricatore firmware.
- **Identificazione:** etichetta in `gd77-connector.js`, `MODELS`; consente di interpretare un numero del protocollo. Da sola non prova la piena compatibilità operativa.
- **Non confermato:** le fonti consultate non offrono prove sufficienti; non significa necessariamente impossibile o inesistente.

**Tutte le famiglie OpenGD77 sono limitate alla sola lettura della radio su questo sito web.** È possibile leggere/modificare/salvare localmente il codeplug standard, ma **la scrittura è BLOCCATA** perché il backup non include una copia integra e verificata del firmware MCU. Il CPS esterno può offrire altre operazioni; ciò non modifica l'autorizzazione web. Dal catalogo non si esegue il flash. [L]

## 2. Matrice di modelli e destinazioni

In questa tabella, «ID» indica l'etichetta che il connettore può restituire. I nomi scritti senza trattino, con trattino o con spazio sono affiancati solo per facilitare la ricerca; ciò non trasforma varianti diverse nello stesso hardware.

| Modello o denominazione | Evidenze ufficiali e restrizioni | Destinazione in `TARGETS` | Etichetta in `MODELS` | Conclusione pratica |
| --- | --- | --- | --- | --- |
| Radioddity GD-77 / GD77 | Installazione e funzionamento documentati; pacchetto `OpenGD77.zip` [G, F1] | `GD-77`, MK22 | `GD-77` | Scegliere il suo pacchetto, non GD77S |
| Radioddity GD-77S / GD77S | Documentato senza schermo/tastiera; le voci sono essenziali; pacchetto dedicato [G, F1] | `GD-77S`, MK22 | `GD-77S` | Zone con i primi 16 canali accessibili tramite selettore |
| Baofeng DM-1801 / DM1801 | Solo hardware versione 1; revisione 2022 esclusa dalla guida [G, F1] | `DM-1801`, MK22 | `DM-1801` | Verificare la scheda; il pannello frontale non basta |
| Baofeng DM-1801A / DM1801A | Solo hardware versione 1; anche la nuova revisione 2022 è esclusa [G, F1] | `DM-1801A`, MK22 | `DM-1801A` | Immagine diversa da DM1801; la A non è un suffisso trascurabile |
| Baofeng RD-5R / RD5R | Installazione documentata; niente hotspot per il limite USB durante TX [G, F1] | `RD-5R`, MK22 | `RD-5R` | Non confondere con un qualsiasi DM-5R o UV-5R |
| TYT MD-9600 / MD9600 | Mobile documentato con revisioni RF e pacchetti HW separati [G, F3] | `MD-9600-V1`, `-V2`, `-V4`, `-V5`, STM32 | `MD-9600` | L'ID non seleziona automaticamente la revisione |
| Retevis RT-90 / RT90 | Documentato insieme a MD-9600; stessa cautela sulle revisioni [G] | Nessuna chiave RT90; destinazioni MD9600 pertinenti | Nessuna etichetta RT90; la tabella propone `MD-9600` | Associazione ufficiale di famiglia, non garanzia per ogni scheda |
| TYT MD-UV380 / UV380 standard | Installazione/funzionamento documentati; pacchetto `OpenMDUV380.zip` [G, F2] | `MD-UV380`, STM32 | `MD-UV380` | Non scegliere per somiglianza del nome con MD-380 |
| Retevis RT-3S / RT3S | Documentato insieme a MD-UV380 [G] | Nessuna chiave RT3S; la destinazione `MD-UV380` lo indica nell'etichetta | Nessuna etichetta RT3S | Associazione ufficiale; verificare GPS e hardware dell'unità |
| TYT MD-UV390 / UV390 | Incluso nel titolo e nella schermata GPS della guida [G] | Nessuna destinazione con quel nome | Nessuna etichetta UV390 | Menzione ufficiale sì; qui non è confermata l'assegnazione esatta dell'immagine per ogni variante |
| MD-UV380 10W **non PLUS** | La guida descrive un'opzione di scala di potenza sulla piattaforma UV380 non PLUS [G: Radio Options — Mode] | Nessuna destinazione dedicata a 10W non PLUS | Nessun ID separato | La scala non certifica la potenza né modifica l'hardware; verificare le note della variante |
| MD-UV380 10W **PLUS** | Pacchetto ufficiale separato `OpenMDUV380_10W_PLUS.zip` [F2] | `MD-UV380-10W-PLUS`, STM32 | Nessun ID PLUS separato | Hardware distinto secondo l'etichetta locale; non trattare come UV380 standard |
| UV390 pubblicizzato come 10W o PLUS | Nessuna assegnazione specifica verificata nelle fonti consultate | Nessuna destinazione UV390 PLUS | Nessun ID specifico | Non dedurre l'immagine UV380 PLUS dalla sola pubblicità |
| Baofeng DM-1701 / DM1701 | Installazione/funzionamento documentati; pacchetto `OpenDM1701.zip` [G, F2] | `DM-1701`, STM32 | `DM-1701` | Non confondere con RGB |
| Baofeng DM-1701 RGB / DM1701RGB | Etichetta prevista dal connettore; qui non è stata verificata documentazione specifica [L] | Nessuna destinazione RGB | `DM-1701 RGB` | Riconoscimento dell'ID, non pacchetto né installazione confermati |
| Retevis RT-84 / RT84 | Guida d'installazione e pacchetto dedicato `OpenRT84.zip` [G, F2] | `RT-84`, STM32 | Nessuna etichetta RT84 | La presenza nello stesso capitolo di DM1701 non autorizza a scambiare gli ZIP |
| TYT MD-2017 / MD2017 | Illustrazione dei controlli nella guida e pacchetto ufficiale `OpenMD2017.zip` [G, F4] | `MD-2017`, STM32 | `MD-2017` | Evidenza della pubblicazione; non estendere integralmente il manuale UV380 |
| MD-380 / MD380 | Etichetta del connettore; in questa consultazione non è stato verificato un pacchetto o una destinazione [L] | Nessuna destinazione | `MD-380` | **Non è MD-UV380**; bande e compatibilità delle varianti non certificate qui |
| DM-32 / DM32 | Etichetta di identificazione prevista [L] | Nessuna destinazione | `DM-32`, famiglia logica SERIAL | Il nome non certifica firmware, GPS, APRS o mappa completa |
| UV008 | Etichetta di identificazione prevista [L] | Nessuna destinazione | `UV008`, famiglia logica SERIAL | Non sono certificate equivalenze commerciali né capacità RF |

Le destinazioni Quansheng `UV-K1` e `UV-K5-V3`, anch'esse presenti in `TARGETS`, **non sono OpenGD77**. Sono escluse da questa guida.

### Alias e denominazioni aggiuntive nella guida

| Nomi | Cosa è confermato | Cosa non si deve dedurre |
| --- | --- | --- |
| GD-77 ↔ TYT MD-760 | La sezione d'installazione identifica MD-760 come denominazione di GD-77 | Compatibilità di qualsiasi altro TYT simile |
| DM-1801 versione 1 ↔ Baofeng DM-860 | La guida lo indica esplicitamente | Che un DM-1801 del 2022 torni compatibile chiamandosi DM-860 |
| RD-5R ↔ Baofeng DM-5R **Tier 2** | Alias esplicito nella sezione d'installazione | Che qualsiasi DM-5R, compresi altri design/versioni, sia un RD-5R |
| MD-9600 ↔ Retevis RT-90 | Trattamento ufficiale congiunto per installazione e funzionamento | Un'unica immagine per tutte le revisioni di entrambi i marchi |
| MD-UV380 ↔ Retevis RT-3S | Trattamento ufficiale congiunto; indicato anche nell'etichetta del catalogo | Identità con MD-380 o compatibilità automatica di tutte le versioni 10W |
| TYT MD-730 e GD-77S | MD-730 compare nell'elenco dei controlli per entrare in modalità aggiornamento insieme a GD77/GD77S/MD760 | Questa menzione isolata non conferma qui un alias completo GD77S↔MD730 né una destinazione separata |
| DM-1701 e RT-84 | Entrambi hanno istruzioni nello stesso capitolo | Alias dell'immagine: esistono ZIP distinti |
| MD-UV390 e MD-UV380 | La guida documenta UV390 nel suo ambito e la funzione GPS | Immagine intercambiabile per ogni revisione UV390 |
| MD-2017 e Retevis RT82 o altri nomi commerciali | Le fonti esaminate non confermano un alias | Non usare immagini MD2017 basandosi solo su un'equivalenza proposta dal negozio |
| DM1701RGB, DM32, UV008 e altri apparecchi | Solo le etichette locali indicate | Una famiglia di trasporto non dimostra hardware identico |

La tabella evita di trasformare vicinanza commerciale, aspetto esteriore o presenza nello stesso indice in un'equivalenza tecnica.

## 3. Famiglie e protocollo di identificazione del sito web

La classificazione seguente è **quella implementata dal connettore**, non un inventario universale dei microcontrollori di qualsiasi apparecchio venduto con quel nome:
| `radioType` | Etichetta interpretata | Famiglia logica e trasporto scelti dal codice |
| --- | --- | --- |
| 0 | GD-77 | MK22 / USB |
| 1 | GD-77S | MK22 / USB |
| 2 | DM-1801 | MK22 / USB |
| 3 | RD-5R | MK22 / USB |
| 4 | DM-1801A | MK22 / USB |
| 5 | MD-9600 | STM32 / USB |
| 6 | MD-UV380 | STM32 / USB |
| 7 | MD-380 | STM32 / USB |
| 8 | DM-1701 | STM32 / USB |
| 9 | MD-2017 | STM32 / USB |
| 10 | DM-1701 RGB | STM32 / USB |
| 11 | DM-32 | SERIAL / WebSerial a 115200 |
| 12 | UV008 | SERIAL / WebSerial a 115200 |

`connect()` richiede una struttura RadioInfo da 46 byte, accetta versioni della struttura **da 1 a 4**, verifica l'intervallo del tipo e richiede che la famiglia selezionata corrisponda. Estrae modello, firmware e build. Se non riconosce questi dati, rifiuta la struttura: non si deve indovinare una mappa di memoria.

In questa tabella non esistono ID distinti per RT90, RT3S, RT84, UV390, HW V1/V2/V4/V5 o 10W PLUS. Questa assenza impedisce di usare l'elenco come rilevatore univoco di tutte le varianti. Inoltre, non garantisce quale valore restituirà ogni firmware non testato.

Il backup web usa mappe di calibrazione diverse per MK22 e per le altre famiglie, oltre a segmenti per ricostruire il codeplug standard. Il fatto che il codice offra questo percorso non certifica di per sé prove fisiche, validità per build future o una copia completa per ogni modello SERIAL. In caso di risposta imprevista, conserva l'errore e non forzare la famiglia. [L]

## 4. MD-9600 / RT-90: revisioni HW1, HW2, HW4 e HW5

Il progetto spiega che durante la produzione sono cambiati PLL e frequenza intermedia. La serigrafia della scheda potrebbe non bastare: esistono unità il cui hardware è cambiato senza modificare tale dicitura. Il catalogo non risolve questa ambiguità.

| Destinazione locale | File osservato nell'indice ufficiale [F3] | Criterio di selezione |
| --- | --- | --- |
| `MD-9600-V1` | `MD9600_firmware_HW_V1.zip` | Revisione RF compatibile con HW1, documentata per l'unità |
| `MD-9600-V2` | `MD9600_firmware_HW_V2.zip` | Revisione RF compatibile con HW2 |
| `MD-9600-V4` | `MD9600_firmware_HW_V4.zip` | Revisione RF compatibile con HW4 |
| `MD-9600-V5` | `MD9600_firmware_HW_V5.zip` | Revisione RF compatibile con HW5; la guida indirizza le schede 4A al firmware V5 |

L'indice contiene anche varianti giapponesi con prefisso `Japanese_`. Non si osserva una destinazione V3 nel catalogo locale né nell'indice: non inventarne una per continuità numerica.

La guida avverte inoltre che alcune unità molto vecchie marcate come scheda versione 2 potrebbero richiedere il firmware V1. Anche se il testo storico suggerisce di provare un'altra revisione in assenza di RX/TX, questa guida **non trasforma tale osservazione in una procedura universale per flashare alla cieca**. Documenta scheda/unità, consulta le istruzioni della revisione e conserva le copie.

Un codeplug corretto abbinato a un'immagine HW errata può impedire il funzionamento di RX/TX. Modificare TG, filtri o toni non corregge la selezione di PLL/IF. Il numero della versione firmware HW non è la versione del CPS né quella della struttura RadioInfo.

## 5. UV380, UV390, RT3S e varianti 10W

| Caso | Evidenza | Limite della conclusione |
| --- | --- | --- |
| UV380 standard / RT3S | Guida congiunta e destinazione locale `MD-UV380` | Verificare l'unità con/senza GPS e la build |
| UV380 10W non PLUS | Opzione `Mode` che adatta la scala visualizzata secondo la guida | Selezionare la scala non aumenta la potenza fisica |
| UV380 10W PLUS | ZIP ufficiale e destinazione locale separati | Non caricare l'immagine standard solo perché il nome contiene «UV380» |
| UV390 | Menzionato nell'ambito della guida e per il GPS | Non esiste un selettore locale che certifichi automaticamente la variante |
| UV390 10W/PLUS commerciale | Qui non è stata verificata una corrispondenza specifica | Identificare scheda e note ufficiali prima di scegliere l'immagine |

Non si deve dedurre che le versioni non PLUS e PLUS condividano procedura d'installazione, schermo, GPS o calibrazione. Né che tutti i portatili pubblicizzati come «10W» eroghino tale potenza misurata.

## 6. Bande, potenza e funzionalità: ciò che è documentato e ciò che resta da verificare

Qui non viene pubblicata una tabella commerciale di gamme RX/TX o watt per radio: le fonti consultate non verificano in modo uniforme le varianti regionali e le revisioni. Si riportano solo le informazioni supportate e se ne indicano i limiti.

| Funzionalità | Evidenza utilizzabile | Non estendere a… |
| --- | --- | --- |
| FM e DMR | Obiettivo funzionale e modalità della guida per piattaforme supportate; DMR richiede la procedura del codec/donatore | Ogni etichetta del connettore o installazione senza il donatore corretto |
| VHF/UHF | La guida tratta limiti di entrambe le bande e canali FM/DMR | Ricezione simultanea doppia né gamme precise garantite per tutti i modelli |
| Banda 200/220 MHz | Il manuale descrive limiti software e avverte che manca una sezione RX/PA adeguata a 200 MHz e che le spurie sono significative | Considerare tutte le radio «tribanda» o raccomandare TX in tale banda |
| Potenza 5 W / 10 W / mobile | Nella guida ci sono scale e tabelle distinte e un pacchetto PLUS separato | Un unico valore massimo comune né tolleranza al servizio continuo |
| Schermo/tastiera | GD77S non ha né l'uno né l'altra; controlli e dimensioni variano sugli altri modelli | Che uno screenshot o una scorciatoia sia universale |
| GPS | La guida contempla un ricevitore opzionale su MD9600/RT90 e UV380/RT3S; la schermata GPS menziona anche UV390, DM1701 e RT84 con GPS installato | Tutte le unità o GPS garantito su DM1701RGB/DM32/UV008 |
| RTC | Nel capitolo satelliti sono elencati MD9600/RT90, UV380/RT3S e DM1701 nel relativo contesto | Classificare automaticamente come «senza RTC» qualsiasi altro modello successivo |
| Trasmissione FM APRS | Documentata dalla guida; richiede profilo e posizione | Ricezione APRS, messaggi bidirezionali o risorse identiche in ogni build |
| NMEA / registrazione GPS | Opzioni documentate con hardware e memoria adeguati | Che il suffisso NMEA aggiunga un ricevitore o non incida sul database degli ID |
| Hotspot | Documentato per piattaforme compatibili; RD5R/DM5R escluso per USB durante TX | RD5R, full duplex o tutte le nuove etichette del connettore |
| Satelliti | Previsione e correzione Doppler documentate con ora/posizione/Keps | Tutte le modalità spaziali né ascolto della propria trasmissione in duplex |
| Accessibilità vocale | Voci esterne e livelli degli avvisi; essenziali su GD77S | Voci incluse automaticamente in qualsiasi ZIP/lingua |

### Le frequenze del manuale non sono un'omologazione

In `Radio Options — Band Limits`, la guida distingue:

- Limiti TX via software, con un valore predefinito riferito agli Stati Uniti: **144–148, 222–225 e 420–450 MHz**. **Non sono il piano delle bande spagnolo né un'autorizzazione locale.**
- Limiti generali di sintonia descritti per le piattaforme del capitolo: **127–178, 190–282 e 380–564 MHz**, con esclusione esplicita dell'intervallo intermedio su MD9600/RT90.
- Specifiche del circuito AT1846S citate dal testo stesso: **134–174, 200–260 e 400–520 MHz**, con avvertenze sul funzionamento fuori specifica.

Questi numeri descrivono contesti diversi. Non devono diventare «bande garantite per tutti i modelli» né essere applicati a DM32, UV008, RGB o MD380 perché compaiono in un array locale. Il manuale avverte delle emissioni spurie nella banda intermedia per mancanza di stadi appropriati: **questa guida non ne raccomanda l'uso per trasmettere**. Configura i limiti autorizzati nel tuo Paese e le effettive restrizioni dell'apparecchio.

### Limiti del codeplug rispetto alle capacità dell'apparecchio

L'editor web gestisce il binario standard da **128 KiB** ed esclude i canali **1025+**. Ciò non afferma che tutte le radio abbiano lo stesso massimo totale di canali, contatti, ID o zone. Su alcune piattaforme, voci, registrazione GPS e database degli ID si contendono la memoria. Anche la lunghezza selezionata per ciascuna voce del database ID ne modifica la capacità. Consulta il CPS/build e la memoria effettiva dell'unità.

## 7. Controlli e bootloader: non esiste una sequenza universale

La guida usa nomi logici come SK1, SK2, Green, Red e Orange. La posizione varia a seconda della radio e, nei mobili, del pannello o del microfono.

| Famiglia/modello | Differenza operativa documentata | Precauzione |
| --- | --- | --- |
| GD-77 | Due tasti laterali e pulsante superiore; riferimento del manuale | Non trasferire le posizioni a un Baofeng qualsiasi |
| GD-77S | Selettore a 16 posizioni e modalità annunciate a voce | Nessun menu visivo né tastierino numerico |
| DM-1801 / DM-860 | Controlli dedicati MR/VFO e A/B | La revisione 2022 non è convalidata dalla somiglianza dei pulsanti |
| RD-5R / DM-5R Tier 2 | A/B e Band sostituiscono sinistra/destra; accesso prolungato al menu rapido | Non ha lo stesso pulsante Orange fisico del GD77 |
| MD-UV380 / RT-3S | Manopola e funzioni delle frecce diverse | Verificare il contesto: canale/VFO o menu |
| DM-1701 / RT-84 | P1/P2 svolgono le funzioni sinistra/destra | Pacchetti dedicati e posizioni non intercambiabili per intuizione |
| MD-9600 / RT-90 | Corrispondenze specifiche di pannello e microfono | Secondo la guida, la scansione VFO non è gestita interamente dal pannello |
| MD-2017 | La guida include un'illustrazione specifica dei controlli | Non sostituirla con quella UV380 |
| RGB / DM32 / UV008 / MD380 | In questa consultazione non sono state verificate istruzioni specifiche | Non inventare combinazioni |

Per installare il firmware, segui le istruzioni del progetto per la **variante esatta** e usa il caricatore corrispondente in OpenGD77 CPS. La guida distingue combinazioni di tasti laterali su MK22, P1 e pulsante superiore sul mobile, e PTT con un altro tasto su alcuni portatili STM32. Non viene fornita una ricetta universale perché né l'identificazione né il nome commerciale bastano a convalidare tutti i casi.

Su STM32, il contesto del bootloader DFU e il relativo driver sono diversi dalla modalità CPS/USB d'uso normale. Durante l'aggiornamento uno schermo bianco può essere normale. Non provare combinazioni casuali né scrivere file di un'altra famiglia per cercare di far comparire una porta.

## 8. Scenari di selezione sicura

### «Ho un DM-1801: è adatto il pacchetto DM1801?»

1. Identifica se si tratta di hardware versione 1 o della nuova revisione del 2022.
2. Se è la revisione esclusa dalla guida, non usare il pacchetto OpenDM1801 basandoti solo sul nome.
3. Se è un DM1801A, non sostituirlo con DM1801: catalogo e pubblicazione prevedono destinazioni diverse.
4. Se non riesci a determinare la revisione, conserva la configurazione attuale e interrompi l'installazione.

### «Il mio RT3S compare come famiglia MD-UV380»

L'associazione è documentata dal progetto e dall'etichetta del catalogo. Verifica comunque l'hardware, la presenza del GPS e le note dell'immagine. Il nome del gruppo non prova la ricezione simultanea di due canali né trasforma la radio in 10W PLUS.

### «Il connettore riconosce DM32: ora è possibile programmarlo?»

L'etichetta è prevista come tipo 11 con trasporto SERIAL. In `TARGETS` non esiste una destinazione firmware DM32. Qui non sono stati confermati un pacchetto ufficiale né tutte le funzioni. Il sito web non concede l'autorizzazione alla scrittura, anche se identificazione e lettura riescono. Per stato di OpenGD77 su DM-32, installazione, copie e compilazione di firmware aperto: [guida DM-32UV](DM32UV-FIRMWARE.md).

### «Esiste uno ZIP ufficiale per MD2017: perché non compare all'inizio del manuale?»

La guida si evolve per sezioni e l'intestazione non elenca necessariamente tutte le pubblicazioni successive. L'illustrazione dei controlli e l'indice ufficiale sono evidenze aggiuntive specifiche. Non si può dedurre che ogni dettaglio di un altro modello sia applicabile a MD2017 senza verificarlo.

### «Voglio ripristinare il mio MD9600 con una copia di un'altra unità»

Non usare la calibrazione di altri apparecchi. Distingui codeplug, risorse, calibrazione e firmware; identifica la revisione RF e conserva le copie dell'unità. Un'immagine scaricata non sostituisce il backup MCU richiesto dalla politica del sito web.

## 9. Diagnosi della compatibilità

| Indizio | Interpretazione prudente | Azione |
| --- | --- | --- |
| È nel catalogo ma non in `MODELS` con il suo alias | Destinazione del download e identificazione non devono necessariamente usare lo stesso nome | Verificare la famiglia documentata; non pretendere una corrispondenza letterale tra tutti gli alias |
| È in `MODELS` ma non nel catalogo | Esiste un'etichetta di protocollo, non una selezione di firmware scaricabile | Non scegliere un modello simile come sostituto |
| L'apparecchio risponde come MD9600 | È nota la famiglia, non necessariamente HW1/2/4/5 | Determinare la revisione prima dell'installazione |
| È UV380 e il venditore dice «Plus» | Potrebbe essere hardware con un'immagine diversa | Verificare scheda e denominazione completa |
| È UV390 e compare nella guida | Esiste una menzione ufficiale, ma non uno specifico selettore locale | Cercare le note esatte della variante, senza presumere uno ZIP UV380 |
| È MD380 senza «UV» | Nome di modello diverso | Non caricare `OpenMDUV380.zip` per una corrispondenza parziale |
| La famiglia selezionata viene rifiutata | L'identificazione non corrisponde al trasporto atteso o al formato supportato | Conservare l'errore e non disattivare la verifica |
| Il backup termina come incompleto | Nel flusso web manca la copia MCU completa | Esportare ciò che è stato letto; lasciare bloccata la scrittura |
| Manca una funzione presente negli screenshot | Differenza di build, piattaforma, risorse o hardware | Confrontare versione e note, non solo marca/modello |

### Lista di controllo prima di dichiarare il supporto

- [ ] Modello completo e produttore registrati.
- [ ] Revisione effettiva della scheda confermata, quando necessario.
- [ ] Firmware, build e CPS annotati.
- [ ] Alias supportato da una fonte, non solo da un negozio.
- [ ] Immagine scelta per modello/variante, non per somiglianza.
- [ ] GPS, RTC, potenza, schermo e bande non presunti senza evidenze.
- [ ] Modalità USB normale distinta dal bootloader.
- [ ] Copie originali esportate e ambito di ciascuna compreso.
- [ ] Limite di 128 KiB e canali estesi accettato.
- [ ] Scrittura web mantenuta **BLOCCATA**.

## 10. Fonti e ambito temporale

Tutte le fonti seguenti sono state consultate il **2026-10-25**. I collegamenti identificano evidenze, non autorizzano a scaricare firmware per qualsiasi apparecchio.

| Chiave | Fonte verificata | Contributo |
| --- | --- | --- |
| G | [Guida ufficiale inglese](https://raw.githubusercontent.com/LibreDMR/OpenGD77_UserGuide/master/OpenGD77_User_Guide.md); [riferimento fisso 33de63dcb002fcd837419fda25a2e535b940dbcd](https://github.com/LibreDMR/OpenGD77_UserGuide/blob/33de63dcb002fcd837419fda25a2e535b940dbcd/OpenGD77_User_Guide.md) | Modelli d'installazione, avviso DM1801 del 2022, alias espliciti, controlli e funzioni per piattaforma |
| R | [Repository LibreDMR/OpenGD77_UserGuide](https://github.com/LibreDMR/OpenGD77_UserGuide) | Provenienza della guida e dichiarazione GPL 2 per i documenti; viene mantenuto solo l'inglese |
| W | [Pagina iniziale OpenGD77](https://www.opengd77.com/) | Stato del forum e accesso all'archivio statico |
| A | [Archivio del forum](https://www.opengd77.com/archive/index.html) | Contesto storico; l'istantanea visibile è di luglio 2025, non una matrice aggiornata al 2026 |
| F1 | [GD77, 2026-05-04 / 946183e9002d277dfaba616a1eea15bfe959c692](https://www.opengd77.com/downloads/GD77/Firmware/20260504_946183e9002d277dfaba616a1eea15bfe959c692/) | Pacchetti MK22 per modello e varianti NMEA/Japanese, se disponibili |
| F2 | [MDUV380_DM1701, 2026-05-04 / ebd7100bb4c930e6ff0c24202474b5b72e7d6beb](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/) | ZIP dedicati per UV380, UV380 10W PLUS, DM1701 e RT84 |
| F3 | [MD9600, 2026-05-04 / e779365405cbe4a73803a402626294764784b11f](https://www.opengd77.com/downloads/MD9600/Firmware/20260504_e779365405cbe4a73803a402626294764784b11f/) | ZIP HW V1/V2/V4/V5 e varianti giapponesi |
| F4 | [MD2017, 2026-05-05 / 6b43740c89378240c0cabad0ca827e5b0963124e](https://www.opengd77.com/downloads/MD2017/Firmware/20260505_6b43740c89378240c0cabad0ca827e5b0963124e/) | Pubblicazione dell'immagine MD2017 e variante giapponese |
| L | [`firmware-core.js`](../../../firmware-core.js), [`gd77-connector.js`](../../../gd77-connector.js), [`radio-ui.js`](../../../radio-ui.js) | Catalogo, etichette del protocollo e portata effettiva di lettura/modifica/blocco web |

I percorsi `Latest` di tali famiglie puntavano agli indici datati citati; non si afferma che siano tutte le build disponibili né che «Latest» significhi stabile per ogni unità. I nomi `Japanese`, `JA` o `NMEA` descrivono varianti di distribuzione, non nuovi modelli né un'equivalenza di capacità.

La licenza GPL 2 dichiarata dal README della guida **non dimostra una licenza MIT del firmware** né un'unica licenza per CPS, voci, donatori e codec. Prima di ridistribuire, verifica le condizioni di ogni componente.

**Blocchi e lacune mantenuti esplicitamente:** manca un backup MCU integrale sul sito web; la revisione commerciale è ambigua in alcuni apparecchi; non è verificata la corrispondenza UV390 per variante; non è dimostrato il supporto completo per DM1701RGB, DM32, UV008 e MD380 basandosi solo sulle rispettive etichette. Nessuna di queste lacune viene colmata attribuendo a tutti i modelli le funzioni del manuale generale.