# Guida AnyTone e canali locali

Questa pagina descrive il preparatore web AnyTone Beta. Non sostituisce il CPS
ufficiale e non programma la radio tramite USB. I progetti JSON e CSV sono
formati di interscambio proprietari: non sono file RDT e non vanno caricati
direttamente nel CPS supponendo che siano codeplug nativi. Prima di qualsiasi
scrittura, crea una copia originale con il CPS del produttore.

## Funzionalità e modalità

Seleziona un profilo di modello e conferma separatamente le funzionalità che
hai verificato nel manuale della variante esatta. I profili di famiglia non
certificano le caratteristiche di tutte le revisioni. AM aeronautica e FM
commerciale 87.5-108 MHz sono abilitate solo per il profilo "Otro" con
conferma manuale. Verifica che il ricevitore copra la banda e la modalità; una
frequenza accettata non attesta che l'hardware sia in grado di riceverla.

Tutti i canali sono solo in ricezione. AM richiede frequenze RF in MHz, non il
designatore di canale aeronautico 8.33 kHz; il preparatore convalida la griglia
rappresentabile. Non vengono create trasmissioni né certificata la compatibilità
di antenna, filtro, firmware o CPS.

## Aeroporti e banda aeronautica

L'utente fornisce un JSON locale con `results` (1-4000 righe). Ogni record
include `name`, `frequencyMHz` e `source` con riferimento AIP vigente. Per
filtrare in base alla prossimità, può includere `latitude` e `longitude`; quando
si seleziona una posizione, il browser chiede il consenso e la usa localmente
in memoria, senza inviare le coordinate a un servizio. I record privi di
coordinate o esterni al raggio scelto vengono omessi. Senza posizione viene
elaborato l'elenco completo.

Consulta le frequenze RF e i servizi vigenti nell'[AIP ENAIRE](https://aip.enaire.es/).
Non è incluso un database nazionale delle frequenze, i dati non vengono
scaricati automaticamente e i designatori 8.33 kHz non vengono convertiti.
L'app offre il canale 121.500 MHz come opzione manuale, solo RX; verifica la
procedura e la validità nelle fonti ufficiali. Non utilizzare la frequenza di
guardia per le comunicazioni di routine.

## Emittenti FM commerciali locali

Prima di importare le emittenti, verifica nel manuale esatto che l'apparato
riceva la FM commerciale 87.5-108 MHz. Prepara un file locale con `results` e
i campi `name`, `frequencyMHz` (o `frequency`), `latitude`, `longitude` e
`source`. Il filtro usa la distanza in km dalla posizione per cui è stato
concesso il consenso e il raggio selezionato (1-500 km). Non è precaricato
alcun catalogo nazionale né viene eseguito scraping; usa una fonte autorizzata,
aggiornata e adatta alla tua regione. L'applicazione non certifica la licenza
né l'esattezza dei dati forniti.

I canali risultanti sono contrassegnati come `FM_Broadcast_RX` nel CSV di
interscambio, con RX e TX nominali uguali e TX bloccata nell'editor. Questo
contrassegno non abilita la trasmissione né trasforma il CSV in un formato
AnyTone. Per i canali commerciali occorre confermare la capacità nel progetto
JSON e non è possibile aprirli con un profilo radio privo di tale conferma.

## Ripetitori e REMER

È possibile importare dati locali autorizzati di ripetitori da RadioID, URE e
RepeaterBook secondo il formato previsto dall'editor. I toni analogici vengono
conservati come nota da verificare; non vengono dedotti né programmati a partire
dalla frequenza. Verifica validità, shift, CC, TS, TG, contatti, liste di
ricezione e limiti del modello nel CPS.

La scheda REMER è disponibile nei pianificatori compatibili di Quansheng e
OpenGD77. La sua tabella VHF è una trascrizione del riferimento fornito
dall'utente, senza data verificabile; confronta ogni dato con REMER. I CTCSS
sono mostrati come nota e non vengono importati come impostazioni. Le frequenze
HF/SSB sono escluse dall'importazione delle memorie FM. Il fatto che un parser
rilegga un canale convalida solo la struttura del file: non dimostra validità,
ricezione RF né visibilità nel firmware dopo una scrittura.

## Salvataggio e verifica

L'editor consente di aggiungere, modificare ed eliminare canali dal progetto
locale. Esporta il JSON per conservare il lavoro e il CSV solo come riferimento
o interscambio manuale. Quando importi binari OpenGD77 o Quansheng, vengono
trasferiti esclusivamente i campi riconosciuti; parametri proprietari, toni,
zone e contatti possono richiedere una ricostruzione nel CPS di destinazione.
La verifica finale, la conversione nel formato nativo e la scrittura si
eseguono con il CPS ufficiale, dopo aver esaminato il risultato e salvato una
copia intatta.