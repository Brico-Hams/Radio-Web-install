# ARDF Quansheng: guida alla ricezione e configurazione

Revisione: 25-10-2026. Evidenza principale: `ARDFv05/ARDF.md` e repository
reald V3/UV-K1. È un riepilogo originale della configurazione, non una copia del manuale.
I nomi e gli intervalli seguenti corrispondono al documento esaminato;
non sono attribuiti senza verifica a v0.2/v0.4 o ai rami V1/V2.

## Hardware, versioni e limiti

| Famiglia | Fonte corrispondente | Relazione con questo sito |
| --- | --- | --- |
| V1 DP32 | reald/uv-k5-firmware-custom | Non si installa con il connettore PY32 |
| V2 | Progetto DL9CAT V2 collegato da reald | Fuori dal catalogo/connettore |
| V3 / UV-K1 PY32 | reald/uv-k1-k5v3-firmware-custom | Release stabili riconosciute per il download |

Il catalogo riconosce i tag `ARDF-K5v3_K1-vX.Y[.Z]` della fonte V3, non
file arbitrari solo perché contengono «ARDF» nel nome. Su questo sito sono
ancora **solo download**, anche con vettori PY32: la convalida degli slot
ARDF non è abilitata. La cartella ARDFv05 contiene sorgenti e file ereditati;
non rende ogni binario del suo archive una build ARDF attuale.

L'upstream documenta TX disattivata nelle sue release ARDF ufficiali.
Non darlo per scontato per una build di terzi: verifica `ENABLE_PREVENT_TX`
e la versione. Il firmware di radiogoniometria non trasforma la radio in un
ricevitore per gli 80 metri; il documento indica un limite inferiore del chip
di circa 18 MHz, perciò non è adatto all'ARDF a 3.5 MHz.

## Modalità e impostazioni

| Impostazione | Controllo | Scelta e verifica |
| --- | --- | --- |
| ARDF=OFF | Funzionamento fuori dalla schermata/modalità ARDF | Non dimostra che TX sia compilata né consentita |
| ARDF=DF Simple | Radiogoniometria semplice con guadagno manuale | Per la ricerca senza cicli; non richiede la correzione dell'orologio dei cicli |
| ARDF=ARDF | Cicli e visualizzazione delle volpi | Configurare la sincronizzazione con l'evento reale |
| Mode=AM | Demodulazione dei segnali AM dell'attività | Corrispondere al segnale reale; non abilita TX AM |
| Step | Passo di sintonia | Il manuale propone 1 kHz; evita l'arrotondamento della frequenza desiderata |
| Sql | Squelch | Il manuale propone 0 per ascoltare continuamente; regolare il volume con cautela |
| RxMode | Ascolto VFO | MAIN ONLY evita l'alternanza e lo sfarfallio della cronologia del guadagno |
| Guadagno manuale | Sensibilità/attenuazione per indice | Un indice inferiore riduce la sensibilità; abbassarlo avvicinandosi a un segnale intenso |
| NumFox | Numero di trasmettitori nel ciclo | Documento: 1-10; 0 disattiva la temporizzazione; predefinito 5 |
| FoxDur | Durata di ogni turno | Documento: predefinito 60 s, intervallo 1.00-999.99 s; verificare le unità di immissione della build |
| EndSig | Avviso prima della fine del turno | 0 disattiva; documento: 1-30 s. Abbassare il volume prima di usare le cuffie |
| GainRe | Ricorda il guadagno per volpe/VFO | OFF, VFO A, VFO B o BOTH secondo il documento |
| RSS100 | Riferimento per stimare la distanza | Zero disattiva; non è una calibrazione RF dell'intera radio |
| ClkCor | Correzione del timer interno | Solo dopo aver misurato la deriva; non copiare il valore di un'altra unità |
| SetNav | Orientamento dei tasti K1/K5 | Correggere se UP/DOWN sembrano invertiti |
| ChSave | Memorizzazione persistente delle impostazioni | Necessaria se si lavora in MR; VFO e MR non sono la stessa cosa |

Le modifiche del guadagno per indice sono descritte come circa 5 dB;
non sono un attenuatore certificato. Un segnale molto vicino può saturare
nonostante la riduzione del guadagno. Contano antenna, polarizzazione,
orientamento e ambiente.

## Avvio in sola ricezione

1. Identifica l'hardware e il firmware ARDF esatti; salva la configurazione originale.
2. Collega l'antenna e imposta un volume basso; aumentalo gradualmente, soprattutto
   con le cuffie.
3. Seleziona DF Simple per verificare la ricezione senza orologio.
4. Seleziona la modulazione, il passo e la frequenza del segnale autorizzato dell'evento.
5. Usa MAIN ONLY; verifica che sia selezionato VFO se inserisci una frequenza.
6. Regola il guadagno e l'orientamento senza confondere il massimo del rumore con un segnale utile.
7. Per una gara temporizzata, configura NumFox/FoxDur e sincronizza con il ciclo
   reale seguendo lo schermo/la guida della versione installata.
8. Salva se necessario; verifica dopo aver ricaricato VFO/memoria.

Non sono consigliate sequenze universali di sincronizzazione: i tasti e le
modalità possono cambiare tra versioni. Non trasmettere un segnale di prova
senza autorizzazione.

## Promemoria sul guadagno

GainRe conserva i valori per volpe all'inizio del suo turno. Una configurazione
utile è VFO A per la frequenza delle volpi con memoria del guadagno, VFO B
per la baliza continua senza memoria. Se NumFox=0 o GainRe non include il VFO
attivo, non aspettarti una tabella della cronologia per volpe. Il documento
avverte che la tabella visibile può avere limiti diversi dal NumFox massimo:
non dedurre 10 cronologie dal fatto che siano visualizzati 10 turni.

## Distanza: una stima, non navigazione

La previsione si basa su un modello approssimativo di propagazione e su un
riferimento RSS100 dell'insieme trasmettitore-antenna-ricevitore. Terreno,
potenza, altezza e ostacoli cambiano il risultato; non fidarti del numero come
distanza reale. Il manuale descrive la misurazione di un riferimento a 100 m
dal trasmettitore dell'evento, con segnale stabile e orientamento noto. Zero
disattiva la funzione. Non sostituisce cartografia, sicurezza personale né le
istruzioni dell'organizzatore.

## Correzione dell'orologio

Il manuale descrive la deriva del risuonatore interno. Per il caso specifico in
cui si misurano i secondi reali trascorsi mentre l'apparato indica un'ora:

```text
correccion = 6000 - (segundos_reales * 100 / 60)
```

Il documento indica un intervallo da -500 a 500 per ClkCor. Questa formula si
applica solo alla procedura di quella versione, non a qualsiasi menu orologio
di un'altra radio. Non corregge l'oscillatore RF e non richiede modifiche alla
calibrazione RF. Dopo la modifica, ripeti una misurazione e verifica la
sincronizzazione.

## Differenze storiche verificabili

- Il documento indica che prima della v0.4 SetNav si trovava nel menu nascosto;
  non presumere che sia nella stessa posizione in tutte le versioni.
- Per sapere cosa cambia tra v0.2, v0.4, v0.5 e v0.5.1, consulta ogni release;
  un'etichetta più recente non dimostra da sola la compatibilità dei dati.
- Usa il modulo CHIRP incluso nella release. Il driver UV-K5 standard non
  rappresenta necessariamente le sue impostazioni ARDF.
- Non estrapolare V1/V2 al flash V3. Il manuale avverte che k5prog/k5prog_win
  V1 non sono gli strumenti adatti per V3.

## Diagnostica

| Problema | Verifica non distruttiva |
| --- | --- |
| Vengono inserite solo tre cifre | Potrebbe essere selezionata la memoria, non VFO |
| Cambia la frequenza inserita | Verificare Step/raster e limiti di banda |
| La cronologia del guadagno sfarfalla | Disattivare il doppio ascolto |
| Non compare la tabella delle volpi | Verificare NumFox e GainRe per il VFO attivo |
| CHIRP mostra altre impostazioni | Salvare la memoria e verificare modulo/versione |
| Frecce invertite | SetNav; non cambiare firmware per la somiglianza esteriore |
| Errore Header short read | Chiudere i programmi, verificare cavo/porta dati, modalità e firmware; non cancellare la memoria |
| Distanza incoerente | Riferimento RSS100, antenna, potenza e terreno; non ricalibrare la RF alla cieca |

## Fonti

- [Progetto ARDF V3 e UV-K1](https://github.com/reald/uv-k1-k5v3-firmware-custom).
- [Manuale ARDF del progetto](https://github.com/reald/uv-k1-k5v3-firmware-custom/blob/main/ARDF.md).
- [Release ARDF V3](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases).
- [Progetto ARDF V1](https://github.com/reald/uv-k5-firmware-custom).
- [Configurazione comune](AYUDA-CONFIGURACION.md).

Il ramo remoto può evolvere. Per ripetere la configurazione, registra la
versione esatta del manuale, firmware e driver insieme alla tua copia.