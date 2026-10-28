# Deployment

Sono supportati due tipi di deployment: **locale** (server Node sullo stesso computer a cui si collega la radio) e **web pubblico su GitHub Pages** (sito statico, vedi [Web pubblico su GitHub Pages](#web-pubblico-su-github-pages)).

## Requisiti

Il punto di accesso pubblico ufficiale è <https://brico-hams.github.io/Radio-Web-install/>. Condividi questo URL, non le vecchie copie o le anteprime locali. `index.html` dichiara questo URL canonico; le pagine degli strumenti e della guida sono sezioni dello stesso sito, non versioni alternative.

- Node.js 22 o successivo **solo per l'esecuzione dai sorgenti, Arch e FreeBSD**. I pacchetti `.deb` e lo ZIP Windows includono Node.
- Git solo per clonare e aggiornare un'installazione dai sorgenti.
- Chrome, Edge o Brave desktop, per WebUSB/Web Serial. Firefox e Safari non sono compatibili.
- I driver USB richiesti dalla radio: vedi [Aiuto › Driver](../../../ayuda.html#drivers).

## Installazione dai sorgenti

```powershell
git clone https://github.com/Brico-Hams/Radio-Web-install.git
cd Radio-Web-install
npm ci --ignore-scripts
npm start
```

Apri <http://127.0.0.1:8787>. Se apri `localhost`, il server reindirizza a `127.0.0.1`: valida l'intestazione `Host` e serve solo quell'origine. Usa sempre la stessa origine per conservare la cronologia IndexedDB.

Per includere Bricohams Quansheng Studio nella copia locale, esegui `npm run fetch:studio`. Scarica `studio.html` da `Brico-Hams/Bricohams-Studio`, al commit fissato in `studio.lock.json`, e verifica dimensione e SHA-256. Il file non è versionato perché contiene firmware incorporato.

**Aggiornare Studio (autore):** quando il nuovo commit è già su GitHub, esegui `node scripts/fetch-studio.cjs --update <commit-completo>`. Il comando riscrive `studio.lock.json` con dimensione, SHA-256 e hash CSP dei suoi script. Controlla il diff e fai commit del file di lock.

`--ignore-scripts` evita l'esecuzione di script di installazione di terzi. La versione di `satellite.js` è fissata in `package-lock.json`.

## Verifica

```powershell
npm test
npm run check
```

Entrambi i comandi devono terminare senza errori. Poi apri la pagina di aiuto e verifica che sia mostrato il logo Bricohams.

## Installer locali

Scarica il file per il tuo sistema e `SHA256SUMS` dagli **Assets** dell'[ultima Release](https://github.com/Brico-Hams/Radio-Web-install/releases/latest). Sono già disponibili pacchetti da `v0.3.0`. I collegamenti automatici «Source code (zip)» e «Source code (tar.gz)» non sono installer.

| Sistema | File | Installazione |
| --- | --- | --- |
| Debian 12/13, Ubuntu 22.04/24.04, Raspberry Pi OS arm64/armhf | `.deb` per amd64, arm64 o armhf | `sudo apt install ./nombre-del-paquete.deb` (scegli solo la tua architettura) |
| Arch Linux | `*-arch.tar.gz` | Estrai ed esegui `makepkg -si` (richiede `base-devel` e `nodejs`). |
| FreeBSD 14 amd64 | `*-freebsd-amd64.tar.gz` | Estrai ed esegui `su -c './install.sh'` (installa `node22` tramite `pkg` se necessario). |
| Windows 11 x64 | `*-windows-x64.zip` | Estrai lo ZIP ed esegui `powershell -ExecutionPolicy Bypass -File .\Install.ps1`; aggiunge un collegamento al menu Start. |

I `.deb` e lo ZIP Windows includono Node.js 22. Arch usa il pacchetto `nodejs` della distribuzione. FreeBSD richiede `pkg` e il pacchetto `node22`. Raspberry Pi OS a 32 bit necessita di un processore ARMv7 o successivo. L'installer non configura l'avvio automatico né eleva i privilegi per avviare l'applicazione.

Dopo l'installazione, avvia **Bricohams Radio Workspace** dal menu applicazioni/Start oppure esegui `bricohams-radio` su Arch e FreeBSD. Il server rimane associato a `127.0.0.1:8787`; non esporlo alla rete. Su FreeBSD, Chromium potrebbe non offrire WebUSB/Web Serial, quindi l'accesso alle radio è fornito nei limiti del possibile.

### Verificare il download

Controlla l'hash prima di eseguire l'installer. In PowerShell:

```powershell
Get-FileHash .\bricohams-radio-workspace-v0.3.0-windows-x64.zip -Algorithm SHA256
Get-Content .\SHA256SUMS
```

Confronta l'hash completo con la riga dello stesso nome in `SHA256SUMS` (maiuscole/minuscole non contano). Su Linux:

```sh
sha256sum bricohams-radio-workspace-v0.3.0-amd64.deb
cat SHA256SUMS
```

Su FreeBSD usa `sha256 nombre-del-archivo`. Sostituisci nome/versione con il file effettivamente scaricato. Non installare se l'hash differisce. Le somme verificano l'integrità, non una firma dell'editore: i pacchetti non hanno firma del codice.

### Windows 11 x64

1. Scarica `*-windows-x64.zip` ed **estrai tutto il contenuto**; non eseguire lo script dentro lo ZIP.
2. Apri PowerShell nella cartella che contiene `Install.ps1`, `Start.ps1`, `app` e `runtime`.
3. Esegui come utente normale:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1
   ```

4. Si installa in `%LOCALAPPDATA%\Programs\Bricohams Radio Workspace` e crea **Bricohams Radio Workspace** nel menu Start. Non richiede UAC né l'installazione separata di Node.
5. Apri quel collegamento. Se il browser predefinito non è Chrome, Edge o Brave, apri manualmente <http://127.0.0.1:8787> in uno di essi.

`ExecutionPolicy Bypass` riguarda solo il processo che esegue il comando; non modificare permanentemente la policy PowerShell. Una policy aziendale può impedire gli script anche con questa opzione: consulta l'amministratore. L'installer attuale è uno ZIP con script, non un `.exe`/MSI firmato, e non installa driver WinUSB.

### Debian, Ubuntu e Raspberry Pi OS

Controlla l'architettura del **sistema operativo** (non solo quella del processore):

```sh
dpkg --print-architecture
```

Scarica solo il `.deb` con il suffisso corrispondente: `amd64`, `arm64` o `armhf`. Raspberry Pi OS a 64 bit usa `arm64`; quello a 32 bit usa `armhf` e richiede ARMv7 o successivo. Raspberry Pi 1 e Zero/Zero W originali con ARMv6 non sono supportati.

Dalla cartella dei download, per un computer amd64 e la versione iniziale:

```sh
sudo apt install ./bricohams-radio-workspace-v0.3.0-amd64.deb
bricohams-radio
```

Sostituisci il nome con quello del tuo file. Node è incluso in `/opt/bricohams-radio-workspace`; il launcher appare anche nel menu applicazioni. Non eseguire `bricohams-radio` con `sudo`: backup e permessi del browser devono appartenere al tuo utente.

### Arch Linux

```sh
sudo pacman -S --needed base-devel nodejs
mkdir bricohams-installer
tar -xzf bricohams-radio-workspace-v0.3.0-arch.tar.gz -C bricohams-installer
cd bricohams-installer
less PKGBUILD
makepkg -si
bricohams-radio
```

Esegui `makepkg` come utente normale. Il file `*-arch.tar.gz` contiene la ricetta; `*-arch-source.tar.gz` contiene l'applicazione che la ricetta scarica dalla stessa Release e verifica con SHA-256. Non è un pacchetto binario pronto per `pacman -U`, né un pacchetto pubblicato su AUR. Richiede Internet durante la compilazione e Node.js 22 o successivo.

### FreeBSD 14 amd64

```sh
mkdir bricohams-installer
tar -xzf bricohams-radio-workspace-v0.3.0-freebsd-amd64.tar.gz -C bricohams-installer
cd bricohams-installer
su -c './install.sh'
bricohams-radio
```

L'installazione richiede root e repository `pkg` disponibili per installare `node22` se manca. Il programma si installa in `/usr/local/libexec/bricohams-radio-workspace`, con launcher `/usr/local/bin/bricohams-radio`. Torna al tuo utente normale per avviarlo. Non è un pacchetto nativo `.pkg` né un port ufficiale. Server locale e modifica dei file non garantiscono la connessione radio: dipende dalla disponibilità delle API e dei permessi USB/seriali necessari in Chromium.

### Primo avvio, permessi e arresto

- Apri sempre <http://127.0.0.1:8787> nello stesso browser e profilo: i backup appartengono a quell'origine, non alla cartella di installazione. Il badge deve mostrare **Locale · installato**.
- I launcher avviano il server in background; chiudere la scheda non lo ferma. Non viene configurato l'avvio automatico all'accesso. Dai sorgenti, `npm start` rimane nel terminale e si ferma con `Ctrl+C`.
- L'installer non configura driver o permessi USB. Consulta [Aiuto › Driver](../../../ayuda.html#drivers): WinUSB quando necessario su Windows, regole udev e gruppo `dialout`/`uucp` secondo la distribuzione Linux. Accedi nuovamente dopo aver cambiato i gruppi e non eseguire il browser come root.
- Se la porta è occupata, identifica il processo prima di fermarlo. Su Windows: `Get-NetTCPConnection -LocalPort 8787 -State Listen | Select-Object OwningProcess`, poi `Get-Process -Id <PID>` e, solo se è il server Bricohams, `Stop-Process -Id <PID>`. Su Linux usa `ss -lptn 'sport = :8787'`; su FreeBSD, `sockstat -4 -l`. Conferma comando e utente del PID e ferma solo quel processo con `kill <PID>`.
- I log Linux/FreeBSD si trovano in `${XDG_STATE_HOME:-$HOME/.local/state}/bricohams-radio/server.log`. Su Windows, se non parte, esegui da PowerShell `& "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\runtime\node.exe" "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\app\server.cjs"` per vedere l'errore.
- Non serve Internet per servire l'interfaccia e modificare file locali. Le richieste ai fornitori e i download firmware lo richiedono.

## Configurazione

| Variabile | Uso |
| --- | --- |
| `RB_USER_TOKEN` | Token applicativo approvato da RepeaterBook (`rbuapp_…`). |
| `RB_APPROVED_USER_AGENT` | User-Agent registrato nell'approvazione. |
| `RB_APPROVED` | Deve valere `yes` per attivare la funzione. |

Solo il server legge queste variabili. Non salvarle nel repository. La porta `8787` e l'interfaccia `127.0.0.1` sono fissate in `server.cjs` per sicurezza.

Esempio PowerShell per i sorgenti, valido solo per la sessione attuale:

```powershell
$env:RB_USER_TOKEN = "<token aprobado>"
$env:RB_APPROVED_USER_AGENT = "<user-agent aprobado>"
$env:RB_APPROVED = "yes"
npm start
```

Se usi lo ZIP installato, imposta queste variabili in PowerShell ed esegui `& "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\Start.ps1"` dalla stessa sessione. Ferma prima qualsiasi server già avviato: un processo esistente conserva il proprio ambiente precedente. Non esiste ancora una schermata di impostazioni che salvi queste chiavi; non incollarle nel browser o in file pubblici.

## Aggiornamento

**Installer:** esporta prima i backup `.rwb.json`, ferma il server e scarica/verifica la nuova Release. Su Windows esegui nuovamente l'installer estratto; su Debian/Ubuntu/Raspberry Pi usa `sudo apt install ./nuevo-paquete.deb`; su Arch ricostruisci la nuova ricetta con `makepkg -si`; su FreeBSD esegui il nuovo `install.sh`. Riavvia il launcher e ricarica il browser. Le release già pubblicate non cambiano quando si aggiorna `main`; le correzioni richiedono un'altra versione.

**Sorgenti:**

```powershell
git pull
npm ci --ignore-scripts
npm test
npm start
```

Esporta i backup prima di aggiornare il browser o cancellare i dati del sito.

## Documentazione multilingue

L'aiuto è pubblicato in spagnolo (originale), inglese statunitense, tedesco, italiano e francese. I sorgenti tradotti sono in `docs/i18n/<idioma>/` (stesso nome dell'originale) e `README.<idioma>.md`; `npm run build:help` genera `ayuda-*.html` e `ayuda-*.<idioma>.html` con selettore di lingua. `docs/i18n/<idioma>/F4HWN-PRESETS.md` viene generato automaticamente.

Quando modifichi un documento spagnolo, aggiorna le quattro traduzioni e verifica che conservino titoli, blocchi di codice, codice inline, righe di tabella, immagini e link:

```powershell
node scripts/i18n.cjs --fix --strict
npm run build:help
```

`--fix` adatta i percorsi relativi di link e immagini alla cartella di ogni traduzione e li indirizza alla traduzione corrispondente. Corregge anche le ancore dei titoli Markdown tradotti; la guida HTML conserva ancore stabili in tutte le lingue. La verifica include architettura, marchio, decisioni e distribuzione. L'indice dei riferimenti è generato dai titoli tradotti di tutte le guide e collega ogni versione linguistica, incluso l'inglese USA. Il centro completo di aiuto e domande frequenti è disponibile in spagnolo, inglese statunitense, francese e tedesco; le traduzioni sono generate dall'HTML spagnolo e dalle risorse di traduzione versionate. La verifica rigorosa controlla anche la copertura completa e che l'HTML generato sia aggiornato. Le guide e l'indice italiani restano disponibili; il loro collegamento al centro di aiuto usa l'originale spagnolo. I comandi e i messaggi diagnostici esatti sono conservati per facilitare la risoluzione dei problemi. Le fonti esterne mantengono la lingua pubblicata dagli autori. Se traduzione e originale differiscono, prevale lo spagnolo.

## Avvio automatico (facoltativo, dai sorgenti)

Gli installer avviano già il server in background quando si apre il launcher, ma non all'accesso. Questi esempi sono per una copia del repository con Node installato; adatta i percorsi e non combinarli con un altro server sulla stessa porta.

Su Windows, come attività pianificata all'accesso:

```powershell
$action = New-ScheduledTaskAction -Execute "node.exe" -Argument "server.cjs" -WorkingDirectory "C:\ruta\Radio-Web-install"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "Bricohams Radio Workspace" -Action $action -Trigger $trigger
```

Su Linux, come servizio utente systemd (`~/.config/systemd/user/bricohams-radio.service`):

```ini
[Unit]
Description=Bricohams Radio Workspace

[Service]
WorkingDirectory=%h/Radio-Web-install
ExecStart=/usr/bin/node server.cjs
Restart=on-failure

[Install]
WantedBy=default.target
```

Attivalo con `systemctl --user enable --now bricohams-radio`.

<a id="web-pública-en-github-pages"></a>
## Web pubblico su GitHub Pages

Il sito statico viene generato con `npm run build:pages` (cartella `dist/`) e pubblicato da `.github/workflows/pages.yml`. Non include `server.cjs`: `runtime.json` è `{"mode":"web"}` e l'applicazione funziona in modalità web (vedi [Architettura](ARCHITECTURE.md#modalità-di-esecuzione)).

### Perché un'origine propria

IndexedDB (backup radio) e `localStorage` (profilo) sono isolati per
origine, non per percorso. La raccomandazione iniziale era un account
dedicato su `https://<org>.github.io/`. Il sito attuale
`https://brico-hams.github.io/Radio-Web-install/` usa l'eccezione di origine
condivisa: condivide l'archiviazione con altri progetti di
`brico-hams.github.io`, incluso Bricohams Studio. Il sottopercorso non
va presentato come isolamento. Esporta i backup fuori dal browser;
cambiare origine non migra automaticamente i dati del profilo.
Tutti i percorsi del client rimangono relativi.

### Passaggi (a cura dell'autore)

1. Creare l'account o l'organizzazione `<org>`.
2. Creare il repository `<org>.github.io` e caricare questo codice (il push richiede conferma esplicita dell'autore).
3. In *Settings › Pages*, scegliere «GitHub Actions» come origine e attivare «Enforce HTTPS».
4. Creare la variabile Actions `PAGES_ORIGIN` con `https://<org>.github.io` (senza barra finale). Il workflow la usa per recuperare il precedente `data/satellites.json`.
   Il workflow si esegue solo nel repository `<org>/<org>.github.io` (condizione `if: github.repository == ...`): negli altri viene saltato, per non pubblicare sotto un'origine condivisa che esporrebbe backup e profilo (IndexedDB) ad altre pagine.
   Eccezione consapevole: se l'autore accetta di condividere l'origine, creare nel repository la variabile `PAGES_SHARED_ORIGIN_ACCEPTED` con valore `true`. Le variabili non vengono copiate nei fork, che rimangono quindi protetti. Il sito ufficiale attuale usa questa eccezione su `https://brico-hams.github.io/Radio-Web-install/` (vedi ADR-014).
   Il primo push può avvenire prima di definire `PAGES_ORIGIN`: è innocuo, viene saltato il recupero dei dati precedenti e viene emesso un avviso.
5. Eseguire il workflow manualmente la prima volta (*Actions › Pages › Run workflow*).

### Cosa fa il workflow

- Si esegue a ogni push su `main`, ogni giorno alle 05:17 UTC e manualmente.
- Installa con `npm ci --ignore-scripts`, esegue `npm test`, costruisce `dist/` e genera `dist/data/satellites.json` con `scripts/fetch-satellites.cjs`.
- Permessi minimi (`contents: read`, `pages: write`, `id-token: write`), nessun segreto e ogni azione fissata tramite SHA del commit.

### Satelliti

`scripts/fetch-satellites.cjs` interroga SatNOGS per i NORAD di `data/satellites.config.json` (25544, 27607, 43017 e 43678). Se un satellite fallisce o il suo TLE non è valido, conserva gli ultimi dati validi dal file precedente; il web avvisa quando `fetchedAt` supera i 7 giorni. Attribuzione: SatNOGS DB / Libre Space Foundation, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

### Sicurezza del sito statico

Ogni HTML contiene una CSP in `<meta>` (senza script o stili inline; `connect-src` solo `'self'` e `https://api.github.com`) e l'applicazione rifiuta l'esecuzione in un frame, perché GitHub Pages non consente intestazioni personalizzate. Non ci sono account, caricamenti o telemetria. RadioID non viene replicato e RepeaterBook non è disponibile sul web.

Gli installer disponibili sono pubblicati su [GitHub Releases](https://github.com/Brico-Hams/Radio-Web-install/releases). Per generare una nuova pubblicazione, crea e invia un tag `v*`; GitHub Actions valida il progetto, scarica i runtime Node.js 22 verificandone i checksum e allega gli installer con `SHA256SUMS`. Le release includono `.deb` amd64/arm64/armhf, `PKGBUILD` per Arch, installer tarball per FreeBSD e ZIP Windows 11 x64. La prima release deve essere pubblicata inviando un tag; il repository non crea né invia tag automaticamente.

## Esportare il progetto

La [revisione dei requisiti](ESTADO-ENTREGA.md) elenca quanto implementato
e quanto in sospeso. Finché rimane incompleta, l'esportazione richiede
`--beta`: genera un'istantanea di sviluppo, non una consegna finale
certificata. Non costruisce installer, non pubblica e non programma
alcuna radio.

Con Node.js 22+, Git e gli strumenti di archiviazione del sistema:

```powershell
npm run export:project -- --beta `
  --firmware 'C:\ruta\Multiboot\Bricohams' `
  --installers 'C:\ruta\instalables-verificados' `
  --android 'C:\ruta\Android-0.8.3-beta' `
  --output 'C:\ruta\entregas\Bricohams-desarrollo.zip'
```

La destinazione deve essere un nuovo ZIP. Su Windows si usa `tar.exe`
(bsdtar); Linux/FreeBSD richiedono `zip`. Lo strumento usa una propria
directory temporanea e la pulisce al termine, anche in caso di errori.

Se non sono disponibili installer desktop ricostruiti, sostituisci
`--installers` con `--without-installers`. È un'omissione esplicita solo
per istantanee Beta: il manifesto registra `desktopInstallersIncluded: false`
e non è presente la cartella `installers`. Non si riutilizzano vecchi
pacchetti come se fossero nuovi. L'APK indicata con `--android` viene
comunque inclusa e verificata indipendentemente.

Contenuto:

- `android`, quando si indica `--android`: APK Beta debug, APK di test,
  guida, licenze, manifesto di compilazione e SHA256SUMS di una consegna
  creata da `scripts/build-android.ps1`. Verifica tutti gli hash, test host
  senza errori, lint senza errori e corrispondenza esatta di ogni sorgente
  Android con `project`, senza omettere o duplicare file. Confronta anche
  versione e guida. Se l'APK appartiene a sorgenti precedenti, interrompe:
  ricostruire prima di esportare. Conserva gli indicatori dei test
  strumentati e hardware, senza trasformarli in test eseguiti.
  La verifica crittografica della firma APK compete al costruttore;
  l'esportatore verifica integrità/provenienza dichiarata, non esegue l'APK.
  Senza `--android`, il manifesto registra `android: null` e non viene
  inclusa alcuna APK; non viene presentata come consegna con installer Android.

- `project`: sorgenti attuali, inclusi i nuovi file non ignorati da Git,
  documentazione e strumenti. Non include dipendenze installate:
  eseguire `npm ci --ignore-scripts` dopo l'estrazione. Studio viene
  recuperato con `npm run fetch:studio` usando il lock; gli installer
  invece lo includono.
- `history.bundle`: cronologia di HEAD, recuperabile con
  `git clone history.bundle historial`. Le modifiche non ancora committate
  sono in `project`, non nel bundle. Il manifesto indica revisione e stato dirty.
- `firmware`: tutte le sottocartelle della radice indicata che contengono
  `artifacts/build-info.json`, i loro artefatti verificati e i sorgenti
  del relativo clone isolato. Verifica SHA256SUMS, revisione upstream e
  hash dichiarati dei sorgenti. Un sorgente modificato o un manifesto
  non valido interrompe l'esportazione. Le destinazioni senza artefatti
  sono elencate come escluse, non come compilazioni. Se una cartella
  storica contiene solo gli artefatti direttamente (ad esempio Fusion/Labs),
  interrompe invece di omettere quel firmware: individua la costruzione
  originale con `source` e `artifacts` in `firmware-builds`. Riunisci le
  costruzioni complete in una radice di consegna prima di esportare.
- `installers`: pacchetti elencati in SHA256SUMS nella cartella indicata.
  Deve contenere Windows x64, Debian amd64/arm64/armhf, ricetta e sorgenti
  Arch e FreeBSD amd64. Verifica integrità, non esecuzione o provenienza
  della revisione: costruirli e provarli prima. Non mescolare vecchie
  versioni per simulare una nuova consegna.
- `export-info.json` e `SHA256SUMS`: inventario, dimensioni, hash, revisioni,
  compilazioni incluse/escluse e avvertenza sullo stato incompleto.

Non copia `.git`, `.env`, chiavi/certificati, cache, `node_modules`, `dist`,
backup radio o dati scaricati dall'albero del progetto. Da `data` include
solo `satellites.config.json`. Non copia la libreria Multiboot esterna,
calibrazioni radio o configurazione del browser. Le cartelle di firmware
e installer devono essere output di compilazione, non cartelle di dati
personali. Controlla anche la cronologia Git prima di condividerla:
escludere un segreto attuale non lo elimina dai vecchi commit.
Le esclusioni non sostituiscono tale controllo né autorizzano a
ridistribuire componenti senza le relative licenze.

Estrai in una nuova cartella e verifica dentro `Bricohams`:

```sh
sha256sum --check SHA256SUMS
```

In PowerShell, confronta ogni riga con `Get-FileHash -Algorithm SHA256`,
oppure usa `export-info.json` per scorrere i percorsi e confrontare
dimensione e SHA-256. Verifica anche l'hash dello ZIP mostrato
dall'esportatore. Nessuno di questi hash è una firma digitale.
La prova di estrazione/avvio e la copertura funzionale restano
condizioni indipendenti di consegna.

## Deployment non supportati

- **Altro hosting statico diverso da GitHub Pages:** non testato. Per Pages, vedi sopra.
- **Rete locale o Internet:** richiederebbe HTTPS, autenticazione, modifica della validazione di `Host` e revisione CSRF. Non supportato: credenziali e dati della radio sarebbero esposti.
- **Container:** WebUSB/Web Serial vengono eseguiti nel browser dell'host. Un container fornirebbe solo il server e complicherebbe l'accesso a `127.0.0.1`.

## Disinstallazione

Prima esporta i backup e ferma solo il processo server identificato come spiegato sopra.

- **Windows:** elimina la cartella `%LOCALAPPDATA%\Programs\Bricohams Radio Workspace` e il collegamento nel menu Start (`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Bricohams Radio Workspace.lnk`). L'installer ZIP non registra un disinstallatore in «App installate».
- **Debian/Ubuntu/Raspberry Pi OS:** `sudo apt remove bricohams-radio-workspace`.
- **Arch:** `sudo pacman -R bricohams-radio-workspace`.
- **FreeBSD:** l'installer non registra un pacchetto applicativo in `pkg`. Elimina solo `/usr/local/libexec/bricohams-radio-workspace` e `/usr/local/bin/bricohams-radio` come root. Non disinstallare Node se altre applicazioni lo usano.
- **Sorgenti:** elimina la tua copia del repository e, se configurati, la relativa attività pianificata o il servizio utente.

Disinstallare non elimina i backup del browser. Se vuoi cancellare anche quelli, **esporta prima i file** e poi elimina i dati del sito `http://127.0.0.1:8787` nel browser. I log utente Linux/FreeBSD possono essere eliminati separatamente, dopo averli controllati.
