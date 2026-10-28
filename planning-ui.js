(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  function mountPlanningUI({ page, model, action, download, saveFile = download, log, importChannels, importContacts, importSatellites, readSatellites, templates, cat = null, onStaged = () => {} }) {
    const panel = document.createElement("section");
    panel.id = "planning-panel";
    panel.className = "panel operations planning-panel";
    panel.innerHTML = `<h2>Codeplug: contactos, repetidores y SAT</h2>
      <p>Consulta proveedores solo al pulsar un boton. Los datos se preparan localmente; no se envian copias ni codeplugs. Todos los canales importados empiezan <strong>solo recepcion</strong>. Comprueba bandas, permisos, tonos y parametros antes de transmitir.</p>
      <p class="card-note">${page === "quansheng"
        ? "Quansheng es analogico: no admite contactos DMR. Puedes anadir canales FM a la configuracion F4HWN v6 abierta, o exportar CSV CHIRP. Escritura Beta solo con respaldo Flash completo; v6.0 permanece en solo lectura. SAT se prepara como memorias FM, no como lista orbital nativa."
        : "Anade contactos privados (max. 1024 en total), canales y satelites (lista SAT, max. 25) a tu binario estandar abierto. No es la base masiva de indicativos DMR. Se preservan los registros existentes. Escribir en la radio sigue bloqueado sin respaldo MCU completo."}</p>
      <fieldset id="plan-controls" class="planning-controls">
      <details><summary>Plantillas Murcia: aeropuertos, frecuencias aereas y radiodifusion FM</summary>
        <p>Solo consulta y exportacion: no se convierten a FM VHF/UHF ni se escriben en el banco de canales. AM requiere receptor compatible; FM comercial requiere su receptor de radiodifusion. Las plantillas no prueban que tu firmware pueda programarlas. Verifica AIP/NOTAM y emisoras vigentes. Fuentes consultadas el 26-10-2026.</p>
        <div class="operation-buttons"><button id="plan-airports-save" type="button" class="button secondary">Descargar aeropuertos y guardia AM (JSON)</button><button id="plan-broadcast-save" type="button" class="button secondary">Descargar FM Murcia (JSON)</button><button id="plan-remer-save" type="button" class="button secondary">Descargar REMER VHF solo RX (CHIRP CSV)</button></div>
        <p>AM: Murcia LEMI, San Javier LELC, Alicante-Elche LEAL y guardia 121.500 MHz. Se muestra la portadora RF y, cuando procede, el designador 8.33 kHz por separado. FM Murcia: seleccion de Onda Regional y OR Musica; no es un catalogo exhaustivo de cadenas comerciales ni se filtra por ubicacion.</p>
        <div class="table-scroll"><table><thead><tr><th>Plantilla / servicio</th><th>RF MHz</th><th>Designador</th><th>Modo RX</th><th>Fuente</th></tr></thead><tbody id="plan-regional-templates"></tbody></table></div>
      </details>
      <div class="guide-tabs" role="group" aria-label="Tipo de datos">
        <button type="button" class="guide-tab" data-plan-tab="repeaters" aria-pressed="true">Repetidores</button>
        <button type="button" class="guide-tab" data-plan-tab="remer" aria-pressed="false">REMER</button>
        <button type="button" class="guide-tab" data-plan-tab="contacts" aria-pressed="false" ${page === "quansheng" ? "disabled" : ""}>Contactos DMR</button>
        <button type="button" class="guide-tab" data-plan-tab="sat" aria-pressed="false">SAT / pases</button>
      </div>
      <div class="planning-filters" id="plan-geographic">
        <div><label for="plan-country">Pais (nombre del proveedor, p. ej. Spain)</label><input id="plan-country" value="Spain" maxlength="80"></div>
        <div><label for="plan-region">Zona / estado / provincia (opcional)</label><input id="plan-region" maxlength="80" placeholder="Madrid"></div>
        <div><label for="plan-query">Filtrar resultados visibles por nombre / indicativo / ID</label><input id="plan-query" maxlength="80"></div>
      </div>
      <div id="plan-repeaters">
        <details id="plan-rb-config"><summary>Configurar API RepeaterBook (version instalada)</summary>
          <p>Requiere aprobacion de RepeaterBook para esta aplicacion. Se conserva solo en memoria del servidor local hasta reiniciarlo; el token no se guarda en el navegador ni se devuelve por la API.</p>
          <label for="plan-rb-token">Token individual rbuapp_</label><input id="plan-rb-token" type="password" autocomplete="off" maxlength="247">
          <label for="plan-rb-agent">User-Agent aprobado, con correo de contacto</label><input id="plan-rb-agent" maxlength="240" autocomplete="off">
          <label class="check"><input id="plan-rb-approved" type="checkbox"> Dispongo de aprobacion para esta aplicacion y token</label>
          <button id="plan-rb-config-save" type="button" class="button secondary">Aplicar configuracion local de esta sesion</button>
        </details>
        <p><a href="https://www.repeaterbook.com/api/token_request.php" target="_blank" rel="noopener noreferrer">Solicitar aprobacion de RepeaterBook</a>. Data courtesy of RepeaterBook.com. Solo importacion para programar tu radio con autorizacion; sin scraping, mirrors ni directorio publico.</p>
        <div class="planning-filters">
          <div><label for="plan-mode">Modo de repetidores</label><select id="plan-mode"><option value="FM">FM analogica</option>${page !== "quansheng" ? '<option value="DMR">DMR (requiere plantilla DMR)</option>' : ""}</select></div>
          <div><label for="plan-band">Banda de recepcion compatible con tu equipo</label><select id="plan-band"><option value="both">VHF y UHF (verificar hardware)</option><option value="vhf">Solo VHF</option><option value="uhf">Solo UHF</option></select></div>
          <div><label for="plan-state-id">ID de estado/provincia RepeaterBook (EE.UU./Canada/Mexico)</label><input id="plan-state-id" inputmode="numeric" maxlength="4"></div>
        </div>
        <label class="check"><input id="plan-rb-consent" type="checkbox"><span>Tengo autorizacion para usar estos datos de RepeaterBook en la programacion personal de mi radio.</span></label>
        <div class="operation-buttons"><button id="plan-rb-query" type="button" class="button secondary">Consultar RepeaterBook autorizado</button><button id="plan-rb-status" type="button" class="button secondary">Comprobar configuracion de acceso</button></div>
        <label for="plan-rb-file">Importar repetidores: JSON RepeaterBook autorizado o CSV CHIRP / OpenGD77 (max. 8 MiB)</label><input id="plan-rb-file" type="file" accept=".json,.csv,application/json,text/csv">
        <p>El JSON se muestra para seleccionar y filtrar. Un CSV compatible pasa directamente a Canales preparados; no necesita token RepeaterBook. Los formatos CPS propietarios no se interpretan por su extension.</p>
        <div class="operation-buttons"><button id="plan-bricohams-load" type="button" class="button secondary">Preparar 3 repetidores Bricohams Murcia</button><button id="plan-bricohams-download" type="button" class="button secondary">Descargar fichero preconfigurado CHIRP CSV</button></div>
        <p>Preset del ZIP Bricohams Studio aportado: ED5YBF, ED5YAK y ED5YAL. Vigencia no confirmada; solo RX, sin programar CTCSS. No es el catalogo nacional RepeaterBook. El CSV bloquea TX con Duplex off y conserva TX nominal en el comentario.</p>
        <p id="plan-rb-web-notice" role="status" hidden>La consulta API RepeaterBook requiere servidor y aprobacion. Sin instalar nada puedes importar aqui un JSON obtenido con autorizacion. No se pide ni guarda el token en Pages. <a id="plan-rb-release" href="#" target="_blank" rel="noopener noreferrer" hidden>Version instalada para consulta API</a></p>
        <p id="plan-rb-info" role="status">Sin consultas. El token individual se configura solo en el entorno del servidor.</p>
        <div class="operation-buttons"><button id="plan-rb-select" type="button" class="button secondary">Seleccionar visibles</button><button id="plan-rb-stage" type="button" class="button primary">Anadir seleccion a canales preparados</button></div>
        <div class="table-scroll"><table><thead><tr><th>Elegir</th><th>Nombre</th><th>RX / TX MHz</th><th>Zona</th><th>Modo / tono</th></tr></thead><tbody id="plan-rb-results"></tbody></table></div>
      </div>
      <div id="plan-remer" hidden>
        <h3>REMER Murcia y repetidores nacionales</h3>
        <p>Presets transcritos de la tabla que aportaste; la fecha y vigencia no constan. Selecciona solo los repetidores que quieras preparar. Todas las memorias se importan con TX bloqueada. El CTCSS publicado se conserva como nota: esta importacion no programa tonos ni confirma acceso a la red REMER.</p>
        <p class="card-note">Validacion de formato: canales FM de 2 m (146 MHz), dentro del rango que interpretan F4HWN v6 y el codeplug OpenGD77 estandar. Esto no prueba cobertura RF ni compatibilidad de la variante concreta. La lista se relee tras incorporarla para comprobar que el editor vuelve a mostrar los canales. Para AnyTone se exporta un proyecto/CSV de intercambio, no un archivo CPS nativo.</p>
        <div class="operation-buttons"><button id="plan-remer-select" type="button" class="button secondary">Seleccionar todos los VHF</button><button id="plan-remer-stage" type="button" class="button primary">Anadir REMER seleccionado a canales preparados</button></div>
        <div class="table-scroll"><table><thead><tr><th>Elegir</th><th>REMER / canal</th><th>RX / TX MHz</th><th>CTCSS publicado</th><th>Ubicacion</th></tr></thead><tbody id="plan-remer-results"></tbody></table></div>
        <h3>Frecuencias nacionales REMER en HF (referencia, no importables aquí)</h3>
        <p>La hoja aportada las identifica para SSB (preferentemente USB). F4HWN de esta aplicacion y el codeplug FM/DMR OpenGD77 no implementan SSB ni validan estas bandas; por eso se muestran solo como referencia y se excluyen de la seleccion para evitar codeplugs ilegibles o radios incapaces de sintonizarlas.</p>
        <div class="table-scroll"><table><thead><tr><th>Banda</th><th>Canal</th><th>Frecuencia MHz</th><th>Modulacion indicada</th><th>Disponible para importar</th></tr></thead><tbody id="plan-remer-hf"></tbody></table></div>
      </div>
      <div id="plan-contacts" hidden>
        <fieldset id="plan-dmr-auto"><legend>Descarga de contactos y grupos DMR</legend>
          <p>Consulta e importa al archivo local abierto al pulsar. No escribe la radio, no crea zonas ni asigna TG a canales. Maximo 1024 contactos totales, privados y grupos combinados. No sincroniza en segundo plano.</p>
          <div id="plan-radioid-auto"><label for="plan-auto-pages">Maximo de paginas RadioID (1-10, pais y region de arriba)</label><input id="plan-auto-pages" type="number" min="1" max="10" value="1">
          <button id="plan-contacts-auto" type="button" class="button primary">Descargar e importar contactos RadioID</button></div>
          <label for="plan-tg-prefix">Salas / grupos BrandMeister: prefijo TG (214 para Espana)</label><input id="plan-tg-prefix" value="214" inputmode="numeric" maxlength="7">
          <button id="plan-tg-auto" type="button" class="button primary">Descargar e importar grupos BrandMeister</button>
        </fieldset>
        <p id="plan-contacts-help">RadioID: busqueda paginada por pais y estado. La zona/ciudad adicional y el texto se filtran en la pagina actual. Selecciona paginas conscientemente; no se descarga toda la base automaticamente. Se anaden contactos privados, no grupos de conversacion.</p>
        <div class="operation-buttons"><button id="plan-contacts-query" type="button" class="button secondary">Buscar contactos RadioID</button><button id="plan-contacts-prev" type="button" class="button secondary">Pagina anterior</button><button id="plan-contacts-next" type="button" class="button secondary">Pagina siguiente</button><button id="plan-contacts-select" type="button" class="button secondary">Seleccionar pagina visible</button></div>
        <div id="plan-web-contacts" hidden>
          <p><a href="https://radioid.net/static/user.csv" target="_blank" rel="noopener noreferrer">Descargar user.csv en radioid.net &#8599;</a></p>
          <label for="plan-contacts-csv">Cargar user.csv (max. 100 MiB; se filtra por el pais y la zona de arriba, max. 5000 contactos)</label><input id="plan-contacts-csv" type="file" accept=".csv,text/csv">
          <fieldset><legend>Mi perfil (solo en este navegador, nunca se env&iacute;a)</legend>
            <div class="planning-filters">
              <div><label for="plan-profile-call">Indicativo</label><input id="plan-profile-call" maxlength="10" autocomplete="off"></div>
              <div><label for="plan-profile-id">ID DMR (7 digitos)</label><input id="plan-profile-id" inputmode="numeric" maxlength="7" autocomplete="off"></div>
            </div>
            <div class="operation-buttons"><button id="plan-profile-save" type="button" class="button secondary">Guardar perfil</button><button id="plan-profile-clear" type="button" class="button secondary">Borrar perfil</button></div>
            <p id="plan-profile-status" role="status"></p>
          </fieldset>
        </div>
        <p id="plan-contacts-info" role="status">Sin consulta.</p>
        <div class="table-scroll"><table><thead><tr><th>Elegir</th><th>ID</th><th>Indicativo</th><th>Nombre</th><th>Pais / zona</th></tr></thead><tbody id="plan-contact-results"></tbody></table></div>
        <div class="operation-buttons"><button id="plan-contacts-add" type="button" class="button primary">Anadir seleccion al codeplug local abierto</button><button id="plan-contacts-save" type="button" class="button secondary">Guardar seleccion de contactos JSON</button><button id="plan-contacts-clear" type="button" class="button secondary">Vaciar seleccion de contactos</button></div>
        <p id="plan-contacts-count" role="status">0 contactos seleccionados.</p>
      </div>
      <div id="plan-sat" hidden>
        <p>Los pases se calculan con SGP4 en este navegador, no se descargan como horarios universales. La posicion no se envia a los proveedores. SatNOGS DB publica datos comunitarios: una frecuencia activa no garantiza que el satelite opere ahora como repetidor de voz.</p>
        <div class="planning-filters">
          <div><label for="plan-sat-preset">Elegir satelite (NORAD conocido, comprobar estado operativo)</label><select id="plan-sat-preset"><option value="">Otro NORAD / seleccion manual</option><option value="25544">ISS / 25544</option><option value="27607">SO-50 / 27607</option><option value="43017">AO-91 / 43017</option><option value="43678">PO-101 / 43678</option></select></div>
          <div><label for="plan-norad">NORAD del satelite</label><input id="plan-norad" inputmode="numeric" value="25544" maxlength="5"></div>
          <div><label for="plan-orbit-source">Proveedor orbital</label><select id="plan-orbit-source"><option value="satnogs">SatNOGS DB (TLE)</option><option value="celestrak">CelesTrak (TLE)</option></select></div>
        </div>
        <div class="operation-buttons"><button id="plan-tle-load" type="button" class="button secondary">Actualizar elementos orbitales</button><button id="plan-tx-load" type="button" class="button secondary">Consultar frecuencias SatNOGS</button></div>
        <p id="plan-tle-info" role="status">Sin elementos orbitales.</p>
        <label for="plan-tx">Frecuencia puntual FM de recepcion (solo VHF/UHF)</label><select id="plan-tx"><option value="">Consulta las frecuencias</option></select>
        <p id="plan-tx-info" role="status">No se han consultado frecuencias.</p>
        <div class="operation-buttons"><button id="plan-sat-stage" type="button" class="button secondary">Preparar canal SAT FM solo RX</button>${page !== "quansheng" ? '<button id="plan-sat-codeplug" type="button" class="button primary">Cargar satelite en lista SAT del codeplug local</button><button id="plan-sat-list" type="button" class="button secondary">Ver satelites del codeplug</button>' : ""}</div>
        ${page !== "quansheng" ? '<p id="plan-sat-codeplug-info" role="status">Lista SAT OpenGD77 (max. 25, bloque de datos personalizados tipo 3). Solo RX: sin subida, tonos ni APRS. Se conservan los satelites existentes y el resto de bloques (imagen de arranque, melodia, tema).</p>' : ""}
        <div class="planning-filters">
          <div><label for="plan-lat">Latitud (-90 a 90)</label><input id="plan-lat" type="number" step="any" min="-90" max="90"></div>
          <div><label for="plan-lon">Longitud (-180 a 180)</label><input id="plan-lon" type="number" step="any" min="-180" max="180"></div>
          <div><label for="plan-alt">Altitud del observador, metros (-500 a 9000)</label><input id="plan-alt" type="number" value="0" min="-500" max="9000"></div>
          <div><label for="plan-hours">Proximas horas</label><select id="plan-hours"><option value="24">24</option><option value="48">48</option></select></div>
          <div><label for="plan-elevation">Elevacion minima (grados)</label><input id="plan-elevation" type="number" value="10" min="0" max="60"></div>
        </div>
        <label class="check"><input id="plan-location-consent" type="checkbox"><span>Autorizo usar mi posicion para calcular pases localmente. Si exporto el plan, incluira esa posicion.</span></label>
        <div class="operation-buttons"><button id="plan-gps" type="button" class="button secondary">Usar mi ubicacion (pedir permiso)</button><button id="plan-predict" type="button" class="button primary">Calcular proximos pases</button><button id="plan-pass-save" type="button" class="button secondary">Guardar plan de pases JSON</button><button id="plan-tle-save" type="button" class="button secondary">Guardar TLE para herramienta compatible</button></div>
        <label for="plan-pass-file">Reabrir plan de pases JSON guardado (incluye posicion; recalcula horarios actuales)</label><input id="plan-pass-file" type="file" accept=".json,application/json">
        <p id="plan-pass-info" role="status">TLE obligatorio con epoca de menos de 7 dias. Precision de muestreo 5 s; cruces refinados a 0,5 s. Sin relieve ni correccion atmosferica. No controla antenas; el Doppler se compensa con canales por tramos.</p>
        <div class="table-scroll"><table><thead><tr><th>Inicio UTC</th><th>Maximo UTC</th><th>Fin UTC</th><th>Elevacion max.</th><th>Azimut inicio / fin</th></tr></thead><tbody id="plan-pass-results"></tbody></table></div>
        <div class="planning-filters">
          <div><label for="plan-doppler-pass">Pase para canales Doppler</label><select id="plan-doppler-pass"><option value="">Calcula los pases primero</option></select></div>
          <div><label for="plan-doppler-segments">Canales por pase (1 a 10)</label><input id="plan-doppler-segments" type="number" value="5" min="1" max="10"></div>
        </div>
        <div class="operation-buttons"><button id="plan-doppler-stage" type="button" class="button secondary">Preparar canales con Doppler corregido (solo RX)</button></div>
        ${page === "quansheng" ? '<p>Quansheng: los canales Doppler se cargan como memorias FM escalonadas en la configuracion local F4HWN v6. No es control continuo del modulo Doppler ni carga de TLE en el firmware. Lee primero la configuracion y elige una plantilla FM abajo; el envio fisico mantiene los requisitos de respaldo.</p><button id="plan-qs-load" type="button" class="button primary">Cargar SAT / Doppler preparados en configuracion Quansheng</button>' : ""}
        <p id="plan-doppler-info" role="status">Una memoria por salto de frecuencia igual del Doppler; las ventanas son mas cortas cerca del maximo. Cambia de memoria a la hora indicada; estas memorias no siguen el Doppler solas.</p>
        ${page === "quansheng" ? `<h3>Seguimiento CAT RX Bricohams Beta</h3>
        <p>Solo imagen Satelites con CAT v1: entra en SAT RX y pulsa 8 en la radio. Selecciona un pase actualmente visible y una frecuencia FM. Este navegador calcula Doppler SGP4 y envia RX aproximadamente cada segundo; no carga TLE en la radio ni controla TX. Revisa el reloj del equipo. No inicia automaticamente pases futuros.</p>
        <div class="operation-buttons"><button id="plan-cat-start" type="button" class="button primary">Seguir pase seleccionado por CAT RX</button></div>` : ""}
      </div>
      <hr><h3>Canales preparados (sin escribir en la radio)</h3>
      <button id="plan-pmr-stage" type="button" class="button secondary">Preparar PMR446 analogicos 1-16 (solo RX)</button>
      <label for="plan-channel-csv">Importar lista CSV de canales (OpenGD77 CPS Channels.csv o CHIRP)</label>
      <input id="plan-channel-csv" type="file" accept=".csv,text/csv">
      <p class="card-note">Se convierten canales FM dentro de VHF 136-174 / UHF 400-470 MHz. DMR, AM y formatos CSV propietarios se excluyen; contactos, TG Lists, zonas y tonos no se migran automaticamente. El canal se prepara solo para recepcion.</p>
      <label for="plan-template">Plantilla del archivo abierto: se preservan sus ajustes no importados</label><select id="plan-template"><option value="">Abre o lee una configuracion primero</option></select><button id="plan-template-refresh" type="button" class="button secondary">Actualizar plantillas</button>
      ${page === "quansheng" ? `<label for="plan-scan-group">Agrupacion de escaneo Quansheng</label><select id="plan-scan-group"><option value="none">Una lista para todo el lote</option><option value="zone">Por zona del canal</option><option value="region">Por provincia / region</option><option value="city">Por localidad</option></select>
      <label for="plan-scan-list">Lista unica (0 ninguna, 1-24, 25 todas)</label><input id="plan-scan-list" type="number" min="0" max="25" value="25">
      <p>Por defecto las memorias participan en todas las listas. Agrupar asigna numeros 1-24 libres sin reemplazar listas existentes. Si faltan datos geograficos, se informa y no se cambia el archivo.</p>` : ""}
      <p id="plan-channel-count" role="status">0 canales preparados. Los tonos no se activan automaticamente; revisalos en el editor oficial.</p>
      <div class="table-scroll"><table><thead><tr><th>Nombre</th><th>RX / TX nominal</th><th>Modo</th><th>Fuente</th><th>Quitar</th></tr></thead><tbody id="plan-channel-results"></tbody></table></div>
      <div class="operation-buttons"><button id="plan-channels-add" type="button" class="button primary">Anadir canales al archivo local abierto</button>${page === "quansheng" ? '<button id="plan-chirp-save" type="button" class="button secondary">Exportar canales FM CSV CHIRP (solo RX)</button>' : ""}<button id="plan-channel-save" type="button" class="button secondary">Guardar proyecto de canales JSON</button></div>
      <button type="button" class="button secondary" disabled>Instalacion directa de estos datos no disponible con las garantias actuales</button>
      </fieldset><p id="plan-status" role="status">Listo. Sin solicitudes externas ni geolocalizacion automatica.</p>`;
    if (page === "quansheng") {
      const advanced = document.createElement("details"), summary = document.createElement("summary");
      advanced.id = "plan-advanced";
      summary.textContent = "Fuentes y herramientas avanzadas";
      while (panel.firstChild) advanced.append(panel.firstChild);
      advanced.prepend(summary); panel.append(advanced);
    }
    document.getElementById("radio-operations").before(panel);
    const $ = id => document.getElementById(id);
    let busy = false;
    let web = false;
    let currentTab = "repeaters";
    let repeaters = [];
    let rbRejected = [];
    let contactResult = null;
    let contactQuery = null;
    let orbital = null;
    let transmitters = [];
    let prediction = null;
    let tracker = null;
    let catTimer = null;
    let catStopping = false;
    let uiBusy = false;
    if (cat) {
      const controls = document.createElement("div");
      controls.innerHTML = `<button id="plan-cat-stop" type="button" class="button secondary" disabled>Detener seguimiento CAT</button>
        <p id="plan-cat-status" role="status">Seguimiento CAT detenido. El firmware caduca las ordenes tras 3 s sin renovacion.</p>`;
      panel.append(controls);
      const catStatus = text => { $("plan-cat-status").textContent = text; };
      const updateCatControls = () => {
        $("plan-cat-start").disabled = uiBusy || Boolean(tracker) || catStopping;
        $("plan-cat-stop").disabled = !tracker || catStopping;
      };
      async function stopTracking(reason, cause = null) {
        if (!tracker || catStopping) return;
        catStopping = true;
        clearTimeout(catTimer);
        const current = tracker;
        updateCatControls();
        catStatus(`${reason}: deteniendo y solicitando RX nominal...`);
        let error = cause;
        try { await current.stop(); }
        catch (cleanup) {
          error = error ? new AggregateError([error, cleanup], "Error CAT y de restauracion") : cleanup;
        } finally {
          tracker = null;
          catStopping = false;
          cat.setTracking(false);
          $("plan-controls").disabled = uiBusy;
          updateCatControls();
        }
        if (error) {
          const details = error instanceof AggregateError ? `${error.message}: ${error.errors.map(item => item.message).join("; ")}` : error.message;
          catStatus(`ERROR: ${reason}: ${details}. No se garantiza RX nominal; el firmware debe caducar el lease de 3 s.`);
          cat.error(error);
        } else {
          catStatus(`${reason}. RX nominal confirmado por software; sin medida RF.`);
          log(`CAT: ${reason}. RX nominal confirmado por software.`);
        }
      }
      async function tickCat(first = false) {
        const current = tracker;
        if (!current || catStopping) return;
        try {
          R.assert(document.visibilityState === "visible" && $("plan-location-consent").checked,
            "Pagina no visible o permiso de posicion retirado.");
          if (Date.now() >= current.plan.pass.los.time) {
            await stopTracking("Pase finalizado");
            return;
          }
          const startedAt = Date.now();
          const result = await (first ? current.start() : current.step());
          if (tracker !== current || catStopping || !result) return;
          catStatus(`${prediction.name}: RX ${(result.frequency10Hz / 100000).toFixed(5)} MHz; elevacion ${result.elevation.toFixed(1)} grados; ${new Date(result.time).toISOString()}. Solo RX, confirmacion software.`);
          catTimer = setTimeout(() => tickCat(), Math.max(0, 750 - (Date.now() - startedAt)));
        } catch (error) { await stopTracking("Seguimiento interrumpido", error); }
      }
      $("plan-cat-start").addEventListener("click", () => {
        if (tracker || catStopping || uiBusy) return;
        try {
          requireOrbit(); consentLocation();
          R.assert(document.visibilityState === "visible", "Mantener la pagina visible para CAT.");
          R.assert(prediction && Date.now() - Date.parse(prediction.start) < 15 * 60000,
            "Calcula de nuevo los pases antes de iniciar CAT (caducidad 15 minutos).");
          R.assert($("plan-doppler-pass").value !== "", "Selecciona un pase.");
          const pass = prediction.passes[Number($("plan-doppler-pass").value)];
          const transmitter = transmitters.find(item => item.id === $("plan-tx").value);
          const plan = { orbital, transmitter, pass, observer: prediction.observer };
          R.catPassTarget(orbital, transmitter, pass, prediction.observer);
          tracker = new R.CatPassTracker(cat.connector(), plan);
          cat.setTracking(true);
          $("plan-controls").disabled = true;
          updateCatControls();
          log("CAT: seguimiento RX iniciado para el pase seleccionado; sin TX ni escrituras persistentes.");
          void tickCat(true);
        } catch (error) { catStatus(`ERROR: ${error.message}`); cat.error(error); }
      });
      $("plan-cat-stop").addEventListener("click", () => { void stopTracking("Detenido por el operador"); });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") void stopTracking("Pagina en segundo plano");
      });
      root.addEventListener("pagehide", () => {
        void stopTracking("Pagina cerrada; si no llega STOP, esperar caducidad del lease");
      });
      panel.addEventListener("change", event => {
        if (tracker && event.target.closest("#plan-controls")) void stopTracking("Parametros cambiados");
      });
      panel.addEventListener("input", event => {
        if (tracker && event.target.closest("#plan-controls")) void stopTracking("Parametros cambiados");
      });
    }
    const chosenRepeaters = new Set();
    const chosenREMER = new Set();
    const chosenContacts = new Map();
    const staged = new Map();
    function notify(message) { $("plan-status").textContent = message; log(message); }
    let satFile = null;
    function loadSatFile() {
      satFile = satFile || fetch("data/satellites.json", { credentials: "omit", cache: "no-cache", signal: AbortSignal.timeout(30000) })
        .then(async response => {
          R.assert(response.ok, `Lista diaria de satelites no disponible (HTTP ${response.status}).`);
          return R.validateSatellitesFile(await response.json());
        });
      satFile.catch(() => { satFile = null; }); // allow a retry after a failure
      return satFile;
    }
    async function webSatellite(endpoint, params) {
      R.assert(params.provider === undefined || params.provider === "satnogs", "En la web solo esta disponible SatNOGS.");
      const file = await loadSatFile();
      const sat = R.pickSatellite(file, params.norad);
      return endpoint === "satellite" ? { ...sat, fromFile: true }
        : { norad: sat.norad, source: sat.source, attribution: file.attribution, fetchedAt: sat.fetchedAt, entries: sat.transmitters };
    }
    async function request(endpoint, params = {}) {
      if (endpoint === "talkgroups" && (await R.runtime).mode === "web") {
        const response = await fetch("https://api.brandmeister.network/v2/talkgroup", {
          credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(30000)
        });
        R.assert(response.ok, `BrandMeister respondio HTTP ${response.status}.`);
        const raw = await response.text();
        R.assert(raw.length <= 2 * 1024 * 1024, "Lista BrandMeister demasiado grande.");
        return R.normalizeTalkgroups(JSON.parse(raw), params.prefix);
      }
      if ((endpoint === "satellite" || endpoint === "transmitters") && (await R.runtime).mode === "web") return webSatellite(endpoint, params);
      R.assert(root.location.protocol !== "file:", "Los proveedores requieren npm start y el servidor local.");
      const response = await fetch(`api/data/${endpoint}?${new URLSearchParams(params)}`, {
        credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(40000)
      });
      R.assert((response.headers.get("content-type") || "").includes("application/json"), "API de proveedores no disponible. Reinicia npm start.");
      const result = await response.json();
      R.assert(response.ok, result.error || `Error del proveedor HTTP ${response.status}.`);
      return result;
    }
    function perform(label, operation) {
      return action(label, async () => {
        try { await operation(); }
        catch (error) { $("plan-status").textContent = `ERROR: ${error.message}`; throw error; }
      });
    }
    function attach(id, label, handler) { $(id).addEventListener("click", () => perform(label, handler)); }
    function cell(row, value) {
      const td = document.createElement("td");
      td.textContent = value;
      row.append(td);
      return td;
    }
    function filters() {
      return { country: $("plan-country").value, region: $("plan-region").value, query: $("plan-query").value, band: $("plan-band").value };
    }
    function visibleRepeaters() { return R.filterRecords(repeaters, filters()); }
    function renderRepeaters() {
      $("plan-rb-results").replaceChildren();
      for (const entry of visibleRepeaters()) {
        const row = document.createElement("tr");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.setAttribute("aria-label", `Elegir repetidor ${entry.name} ${entry.rx}`);
        checkbox.checked = chosenRepeaters.has(entry.key);
        checkbox.addEventListener("change", () => checkbox.checked ? chosenRepeaters.add(entry.key) : chosenRepeaters.delete(entry.key));
        cell(row, "").append(checkbox);
        cell(row, entry.name); cell(row, `${entry.rx} / ${entry.tx}`);
        cell(row, `${entry.country} ${entry.region} ${entry.city}`);
        cell(row, `${entry.mode ? "DMR CC " + entry.colorCode : "FM"} / ${entry.tone || "sin dato"}`);
        $("plan-rb-results").append(row);
      }
      $("plan-rb-info").textContent = `${visibleRepeaters().length} visibles de ${repeaters.length}; ${rbRejected.length} excluidos. ${rbRejected.slice(0, 4).map(item => `#${item.index}: ${item.reason}`).join(" | ")} Data courtesy of RepeaterBook.com.`;
    }
    function renderREMER() {
      $("plan-remer-results").replaceChildren();
      for (const entry of R.remerVHFChannels()) {
        const row = document.createElement("tr");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = chosenREMER.has(entry.key);
        checkbox.setAttribute("aria-label", `Elegir REMER ${entry.name} ${entry.rx}`);
        checkbox.addEventListener("change", () => checkbox.checked ? chosenREMER.add(entry.key) : chosenREMER.delete(entry.key));
        cell(row, "").append(checkbox);
        cell(row, entry.name);
        cell(row, `${entry.rx} / ${entry.tx}`);
        cell(row, entry.tone ? `${entry.tone} Hz (nota; no se programa)` : "No indicado");
        cell(row, entry.city);
        $("plan-remer-results").append(row);
      }
      $("plan-remer-hf").replaceChildren(...R.remerHFChannels().map(entry => {
        const row = document.createElement("tr");
        for (const value of [entry.band, entry.channel, entry.frequency, "SSB (USB preferente)", "No: fuera de banda/modo soportados"]) cell(row, value);
        return row;
      }));
    }
    function visibleContacts() {
      // Country/state were applied by RadioID; local text never hides missing-state records by assumption.
      return R.filterRecords(contactResult?.entries || [], { query: $("plan-query").value });
    }
    function renderContacts() {
      $("plan-contact-results").replaceChildren();
      const profile = web && R.profile ? R.profile.get() : null;
      for (const entry of visibleContacts()) {
        const row = document.createElement("tr");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = chosenContacts.has(entry.id);
        checkbox.setAttribute("aria-label", `Elegir contacto ${entry.callsign} ${entry.id}`);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) chosenContacts.set(entry.id, entry); else chosenContacts.delete(entry.id);
          $("plan-contacts-count").textContent = `${chosenContacts.size} contactos seleccionados (se conservan entre paginas).`;
        });
        cell(row, "").append(checkbox);
        const mine = web && profile && String(entry.id) === profile.dmrId;
        for (const value of [entry.id, mine ? `${entry.callsign} (t\u00fa)` : entry.callsign, entry.name, `${entry.country} / ${entry.region} / ${entry.city}`]) cell(row, value);
        $("plan-contact-results").append(row);
      }
      $("plan-contacts-info").textContent = contactResult?.csv
        ? `user.csv: ${contactResult.total} contactos coinciden${contactResult.truncated ? ` (se muestran los primeros ${contactResult.entries.length})` : ""}; ${visibleContacts().length} visibles.`
        : contactResult
        ? `RadioID: pagina ${contactResult.page}/${contactResult.pages}; ${contactResult.total} contactos en la busqueda; ${visibleContacts().length} visibles. ${contactResult.fetchedAt}`
        : "Sin consulta. Los filtros modificados requieren una nueva busqueda.";
      $("plan-contacts-count").textContent = `${chosenContacts.size} contactos seleccionados (se conservan entre paginas).`;
    }
    function renderStaged() {
      $("plan-channel-results").replaceChildren();
      for (const entry of staged.values()) {
        const row = document.createElement("tr");
        cell(row, entry.name); cell(row, `${entry.rx} / ${entry.tx}`); cell(row, entry.mode ? "DMR solo RX" : "FM solo RX");
        cell(row, entry.window ? `${entry.source} · Doppler ${entry.window}` : entry.source);
        const remove = document.createElement("button");
        remove.type = "button"; remove.className = "guide-tab"; remove.textContent = "Quitar";
        remove.addEventListener("click", () => { if (busy) return; staged.delete(entry.key); renderStaged(); });
        cell(row, "").append(remove);
        $("plan-channel-results").append(row);
      }
      $("plan-channel-count").textContent = `${staged.size} canales preparados. Tonos RX/TX desactivados al importar; TX bloqueada. DMR hereda TS, contacto y lista RX de la plantilla: revisar antes de transmitir.`;
      onStaged();
    }
    function stage(entries) {
      R.assert(entries.length > 0, "Selecciona registros primero.");
      const additional = entries.filter(entry => !staged.has(entry.key));
      R.assert(staged.size + additional.length <= 1024, "Maximo 1024 canales preparados.");
      entries.forEach(entry => staged.set(entry.key, entry));
      renderStaged();
      notify(`${additional.length} canales anadidos al proyecto local; no se ha escrito en la radio.`);
    }
    function refreshTemplates() {
      if (!$("plan-template")) return;
      const channels = templates();
      const previous = $("plan-template").value;
      const compatible = channels.filter(channel => [0, 1].includes(channel.mode));
      $("plan-template").replaceChildren(new Option(compatible.length ? "Selecciona canal plantilla con el mismo modo del lote" : "Abre o lee una configuracion con un canal FM plantilla", ""),
        ...compatible.map(channel => new Option(`${channel.number}: ${channel.name} (${channel.mode ? "DMR" : "FM"})`, channel.number)));
      if (compatible.some(channel => String(channel.number) === previous)) $("plan-template").value = previous;
      else if (page === "quansheng" && compatible.length) $("plan-template").value = String(compatible[0].number);
    }
    function invalidatePrediction() {
      prediction = null;
      $("plan-pass-results").replaceChildren();
      $("plan-doppler-pass").replaceChildren(new Option("Calcula los pases primero", ""));
      $("plan-pass-info").textContent = "Datos cambiados: vuelve a calcular los pases antes de exportar.";
    }
    function clearOrbit() {
      orbital = null;
      transmitters = [];
      $("plan-tx").replaceChildren(new Option("Consulta las frecuencias", ""));
      $("plan-tle-info").textContent = "Satelite/proveedor cambiado: actualiza los elementos.";
      $("plan-tx-info").textContent = "Sin frecuencias consultadas.";
      invalidatePrediction();
    }
    panel.querySelectorAll("[data-plan-tab]").forEach(button => button.addEventListener("click", () => {
      currentTab = button.dataset.planTab;
      if ($("plan-advanced") && currentTab === "sat") $("plan-advanced").open = true;
      for (const tab of ["repeaters", "remer", "contacts", "sat"]) $(`plan-${tab}`).hidden = tab !== currentTab;
      $("plan-geographic").hidden = currentTab === "sat" || currentTab === "remer";
      panel.querySelectorAll("[data-plan-tab]").forEach(item => item.setAttribute("aria-pressed", item === button));
    }));
    $("plan-query").addEventListener("input", () => { renderRepeaters(); renderContacts(); });
    for (const id of ["plan-country", "plan-region"]) $(id).addEventListener("input", () => {
      contactResult = null; contactQuery = null; renderContacts(); renderRepeaters();
    });
    $("plan-band").addEventListener("change", renderRepeaters);
    $("plan-mode").addEventListener("change", () => { repeaters = []; rbRejected = []; chosenRepeaters.clear(); renderRepeaters(); });
    function requireRB() { R.assert($("plan-rb-consent").checked, "Confirma tu autorizacion para usar los datos RepeaterBook."); }
    function acceptRepeaters(data) {
      const result = R.normalizeRepeaters(data, $("plan-mode").value);
      repeaters = result.entries;
      rbRejected = result.rejected;
      chosenRepeaters.clear();
      renderRepeaters();
      notify(`${repeaters.length} repetidores compatibles preparados para seleccionar; ${rbRejected.length} excluidos. Consulta el resumen.`);
    }
    attach("plan-rb-status", "Comprobar acceso RepeaterBook", async () => {
      const status = await request("status");
      notify(`${status.repeaterbookConfigured ? "Entorno configurado; la aprobacion se comprueba al consultar." : "Acceso sin configurar."} ${status.notice}`);
    });
    attach("plan-bricohams-load", "Preparar repetidores Bricohams Murcia", async () => {
      stage(R.bricohamsRepeaterChannels());
    });
    for (const row of [...R.murciaAirportTemplate().results, ...R.murciaBroadcastTemplate().results]) {
      const tr = document.createElement("tr");
      for (const value of [row.name, row.frequencyMHz, row.channelDesignator || "-", row.mode]) {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      }
      const td = document.createElement("td");
      const link = document.createElement("a");
      link.href = row.source.replace(/^AIP ENAIRE AD 2\.18 /, "");
      link.textContent = row.mode === "AM" ? "AIP ENAIRE AD 2.18" : "Onda Regional";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      td.append(link);
      tr.append(td);
      $("plan-regional-templates").append(tr);
    }
    attach("plan-airports-save", "Descargar plantilla aeronautica", async () => {
      download("bricohams-aeropuertos-murcia-alicante-rx.json", JSON.stringify(R.murciaAirportTemplate(), null, 2), "application/json");
      notify("Descarga de plantilla AM solicitada; no importada como FM ni escrita en la radio.");
    });
    attach("plan-broadcast-save", "Descargar plantilla FM Murcia", async () => {
      download("bricohams-fm-murcia-rx.json", JSON.stringify(R.murciaBroadcastTemplate(), null, 2), "application/json");
      notify("Descarga de plantilla de radiodifusion solicitada. Sin escritura en la radio; usar receptor FM comercial.");
    });
    attach("plan-remer-save", "Descargar plantilla REMER", async () => {
      download("bricohams-remer-vhf-rx.csv", R.channelCSV(R.remerVHFChannels()), "text/csv;charset=utf-8");
      notify("Descarga REMER solicitada: 11 canales VHF solo RX; tonos no programados, verificar vigencia.");
    });
    attach("plan-bricohams-download", "Descargar repetidores Bricohams Murcia", async () => {
      download("bricohams-repetidores-murcia-rx.csv", R.channelCSV(R.bricohamsRepeaterChannels()), "text/csv;charset=utf-8");
      notify("Descarga CSV solicitada; comprueba Descargas. Preset no verificado en RF, no escrito en la radio.");
    });
    attach("plan-rb-config-save", "Configurar RepeaterBook local", async () => {
      R.assert((await R.runtime).mode === "local", "La configuracion de API requiere la version instalada.");
      try {
        const response = await fetch("api/data/repeaterbook-config", {
          method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({ token: $("plan-rb-token").value, agent: $("plan-rb-agent").value, approved: $("plan-rb-approved").checked })
        });
        const result = await response.json();
        R.assert(response.ok, result.error || "No se pudo configurar RepeaterBook.");
        notify(`RepeaterBook configurado para esta sesion del servidor. ${result.notice}`);
      } finally { $("plan-rb-token").value = ""; }
    });
    attach("plan-rb-query", "Consultar RepeaterBook", async () => {
      requireRB();
      acceptRepeaters(await request("repeaters", { country: $("plan-country").value, region: $("plan-region").value,
        stateId: $("plan-state-id").value, mode: $("plan-mode").value }));
    });
    $("plan-rb-file").addEventListener("change", () => {
      const input = $("plan-rb-file");
      perform("Importar fichero local de repetidores", async () => {
        const file = input.files[0];
        R.assert(file && file.size > 0 && file.size <= 8 * 1024 * 1024, "Archivo: 1 byte a 8 MiB.");
        const text = await file.text();
        if (!text.trimStart().startsWith("{")) importCSV(text);
        else {
          requireRB();
          acceptRepeaters(JSON.parse(text));
        }
      }).finally(() => { input.value = ""; });
    });
    attach("plan-rb-select", "Seleccionar repetidores visibles", async () => {
      visibleRepeaters().forEach(entry => chosenRepeaters.add(entry.key)); renderRepeaters();
    });
    attach("plan-rb-stage", "Preparar repetidores seleccionados", async () => {
      requireRB();
      stage(visibleRepeaters().filter(entry => chosenRepeaters.has(entry.key)));
    });
    $("plan-remer-select").addEventListener("click", () => {
      for (const entry of R.remerVHFChannels()) chosenREMER.add(entry.key);
      renderREMER();
    });
    attach("plan-remer-stage", "Preparar canales REMER seleccionados", async () => {
      stage(R.remerVHFChannels().filter(entry => chosenREMER.has(entry.key)));
    });
    async function loadContacts(pageNumber, fresh = false) {
      R.assert(page !== "quansheng", "Esta radio no admite contactos DMR.");
      if (fresh) contactQuery = { country: $("plan-country").value, region: $("plan-region").value };
      R.assert(contactQuery, "Realiza una nueva busqueda.");
      const result = await request("contacts", { ...contactQuery, page: String(pageNumber) });
      R.assert(Array.isArray(result.entries), "Contactos no reconocidos.");
      contactResult = result;
      renderContacts();
    }
    attach("plan-contacts-query", "Buscar contactos RadioID", () => loadContacts(1, true));
    attach("plan-contacts-auto", "Descargar e importar contactos RadioID", async () => {
      R.assert(page !== "quansheng" && templates().length > 0, "Abre o lee primero un codeplug OpenGD77 con canales.");
      const maximum = Number($("plan-auto-pages").value);
      R.assert(Number.isInteger(maximum) && maximum >= 1 && maximum <= 10, "Selecciona 1-10 paginas.");
      const entries = [];
      const params = { country: $("plan-country").value, region: $("plan-region").value };
      for (let number = 1; number <= maximum; number++) {
        const result = await request("contacts", { ...params, page: String(number) });
        R.assert(Array.isArray(result.entries), "Contactos no reconocidos.");
        entries.push(...result.entries);
        R.assert(entries.length <= 1024, "El lote supera 1024 contactos. Reduce paginas o acota la region. No se ha importado ningun contacto.");
        if (number >= result.pages) break;
      }
      const result = importContacts(entries);
      notify(`${result.added} contactos privados importados; ${result.duplicates} duplicados. Archivo local; sin escribir radio.`);
    });
    attach("plan-tg-auto", "Descargar e importar grupos BrandMeister", async () => {
      R.assert(page !== "quansheng" && templates().length > 0, "Abre o lee primero un codeplug OpenGD77 con canales.");
      const data = await request("talkgroups", { prefix: $("plan-tg-prefix").value });
      R.assert(Array.isArray(data.entries), "Grupos DMR no reconocidos.");
      const result = importContacts(data.entries);
      notify(`${result.added} grupos BrandMeister importados; ${result.duplicates} duplicados. Se guardan como TG numerico; asigna los grupos a tus canales en el CPS.`);
    });
    attach("plan-contacts-prev", "Pagina anterior RadioID", async () => {
      R.assert(contactResult && contactResult.page > 1, "No hay pagina anterior.");
      await loadContacts(contactResult.page - 1);
    });
    attach("plan-contacts-next", "Pagina siguiente RadioID", async () => {
      R.assert(contactResult && contactResult.page < contactResult.pages, "No hay pagina siguiente.");
      await loadContacts(contactResult.page + 1);
    });
    attach("plan-contacts-select", "Seleccionar contactos visibles", async () => {
      R.assert(contactResult, "Busca contactos primero.");
      visibleContacts().forEach(entry => chosenContacts.set(entry.id, entry)); renderContacts();
    });
    attach("plan-contacts-clear", "Vaciar seleccion", async () => { chosenContacts.clear(); renderContacts(); });
    attach("plan-contacts-add", "Anadir contactos al codeplug local", async () => {
      R.assert(page !== "quansheng", "Quansheng no admite contactos DMR.");
      const result = importContacts([...chosenContacts.values()]);
      notify(`${result.added} contactos privados anadidos; ${result.duplicates} duplicados omitidos. Guarda el binario en el editor. Sin escritura en la radio.`);
    });
    attach("plan-contacts-save", "Guardar seleccion RadioID", async () => {
      R.assert(chosenContacts.size > 0, "No hay contactos seleccionados.");
      download("radioid-contact-selection.json", JSON.stringify({ format: "radio-workspace-contacts", source: "https://radioid.net",
        exportedAt: new Date().toISOString(), contacts: [...chosenContacts.values()] }, null, 2), "application/json");
    });
    if ($("plan-template-refresh")) attach("plan-template-refresh", "Actualizar plantillas", refreshTemplates);
    attach("plan-pmr-stage", "Preparar PMR446 solo RX", async () => { stage(R.pmrChannels()); });
    function importCSV(text) {
      const result = R.parseChannelCSV(text);
      R.assert(result.channels.length > 0,
        `${result.format}: no hay canales FM importables. ${result.rejected.length} filas excluidas; ${result.rejected.slice(0, 3).map(item => `fila ${item.row}: ${item.reason}`).join(" | ")}`);
      const added = result.channels.filter(entry => !staged.has(entry.key)).length;
      stage(result.channels);
      const exclusions = result.rejected.slice(0, 3).map(item => `fila ${item.row}: ${item.reason}`).join(" | ");
      notify(`${result.format}: ${added} canales FM anadidos a la preparacion; ${result.channels.length - added} duplicados de la sesion; ${result.rejected.length} filas excluidas.${exclusions ? ` ${exclusions}` : ""} Solo RX; pulsa Anadir canales al archivo local abierto y despues Guarda configuracion local.`);
    }
    $("plan-channel-csv").addEventListener("change", () => {
      const input = $("plan-channel-csv");
      perform("Importar CSV local de canales", async () => {
        const file = input.files[0];
        R.assert(file && file.size > 0 && file.size <= 8 * 1024 * 1024, "Selecciona un CSV de hasta 8 MiB.");
        importCSV(await file.text());
      }).finally(() => { input.value = ""; });
    });
    function channelOptions() {
      R.assert($("plan-template").value !== "", "Abre o lee una configuracion y selecciona un canal plantilla. Una imagen de firmware no es una configuracion de canales.");
      if (page !== "quansheng") return {};
      R.assert($("plan-scan-list").value !== "", "Introduce una lista de escaneo entre 0 y 25.");
      return { groupBy: $("plan-scan-group").value, scanList: Number($("plan-scan-list").value) };
    }
    if ($("plan-channels-add")) attach("plan-channels-add", "Anadir canales al codeplug local", async () => {
      const options = channelOptions();
      const result = importChannels([...staged.values()], Number($("plan-template").value), options);
      refreshTemplates();
      notify(`${result.added} canales anadidos; ${result.duplicates} duplicados omitidos (conservan sus listas). Parser binario: ${result.verified} canales releidos y visibles. ${result.groups?.map(group => `${group.name}: lista ${group.list} para canales nuevos`).join("; ") || ""} Solo RX; guarda el archivo. No se ha escrito en la radio.`);
    });
    if ($("plan-qs-load")) attach("plan-qs-load", "Cargar SAT Doppler en archivo Quansheng", async () => {
      const channels = [...staged.values()].filter(entry => entry.source?.includes("satnogs") || entry.window || entry.norad);
      R.assert(channels.length > 0, "Prepara primero canales SAT o Doppler desde un pase calculado.");
      const result = importChannels(channels, Number($("plan-template").value), channelOptions());
      refreshTemplates();
      notify(`${result.added} memorias SAT/Doppler cargadas en la configuracion Quansheng local; ${result.duplicates} duplicadas. Guarda el binario. No se ha escrito la radio.`);
    });
    if ($("plan-chirp-save")) attach("plan-chirp-save", "Exportar canales FM", async () => {
      download("quansheng-rx-channels.csv", R.channelCSV([...staged.values()]), "text/csv;charset=utf-8");
      notify("CSV CHIRP solo RX exportado. Importalo y revisalo en un controlador compatible con tu modelo/firmware; no es un volcado binario ni una instalacion.");
    });
    attach("plan-channel-save", "Guardar proyecto local", async () => {
      R.assert(staged.size > 0, "No hay canales preparados.");
      download("radio-channel-project.json", JSON.stringify({ format: "radio-workspace-channel-project", version: 1,
        target: model.value, channels: [...staged.values()], warning: "Proyecto local, no codeplug binario. Todos los canales solo RX." }, null, 2), "application/json");
    });
    for (const id of ["plan-norad", "plan-orbit-source"]) $(id).addEventListener("change", clearOrbit);
    for (const id of ["plan-lat", "plan-lon", "plan-alt", "plan-hours", "plan-elevation", "plan-location-consent"]) $(id).addEventListener("change", invalidatePrediction);
    function requireOrbit() {
      R.assert(orbital && orbital.norad === Number($("plan-norad").value), "Actualiza los elementos para el NORAD seleccionado.");
      R.validateTLE(orbital);
    }
    async function loadOrbit() {
      clearOrbit();
      const result = await request("satellite", { norad: $("plan-norad").value, provider: $("plan-orbit-source").value });
      const { epoch } = R.validateTLE(result);
      orbital = result;
      const warning = result.fromFile ? R.satelliteAgeWarning({ fetchedAt: result.fetchedAt }) : null;
      $("plan-tle-info").textContent = `${warning ? `${warning} ` : ""}${result.name} / NORAD ${result.norad}. Epoca UTC ${new Date(epoch).toISOString()}. ${result.source}${result.stale ? " (dato del ultimo despliegue correcto)" : ""}. SatNOGS puede distribuir TLE de terceros; no son una garantia de disponibilidad operativa.`;
    }
    attach("plan-tle-load", "Actualizar TLE oficial", loadOrbit);
    $("plan-sat-preset").addEventListener("change", () => {
      if (!$("plan-sat-preset").value) return;
      $("plan-norad").value = $("plan-sat-preset").value;
      perform("Actualizar TLE del satelite elegido", loadOrbit);
    });
    attach("plan-tx-load", "Consultar frecuencias de satelite", async () => {
      requireOrbit();
      transmitters = [];
      $("plan-tx").replaceChildren(new Option("Consulta en curso", ""));
      const result = await request("transmitters", { norad: String(orbital.norad) });
      R.assert(result.norad === orbital.norad && Array.isArray(result.entries), "Frecuencias de otro satelite.");
      let excluded = 0;
      for (const entry of result.entries) {
        try { R.satelliteChannel(orbital, entry); transmitters.push(entry); }
        catch { excluded++; }
      }
      $("plan-tx").replaceChildren(new Option("Selecciona frecuencia FM para recepcion", ""),
        ...transmitters.map(entry => new Option(`${entry.name}: ${(entry.downlink / 1000000).toFixed(5)} MHz (${entry.mode})`, entry.id)));
      $("plan-tx-info").textContent = `${transmitters.length} frecuencias FM compatibles; ${excluded} modos/rangos no compatibles excluidos. ${result.attribution}`;
    });
    attach("plan-sat-stage", "Preparar canal satelital", async () => {
      requireOrbit();
      const entry = transmitters.find(item => item.id === $("plan-tx").value);
      stage([R.satelliteChannel(orbital, entry)]);
    });
    function describeSatellites(list) {
      return list.length ? list.map(sat => `${sat.name} RX ${sat.rx1.toFixed(5)}${sat.tx1 ? ` / TX ${sat.tx1.toFixed(5)}` : " (solo RX)"}`).join("; ") : "ninguno";
    }
    if ($("plan-sat-codeplug")) attach("plan-sat-codeplug", "Cargar satelite en codeplug local", async () => {
      requireOrbit();
      const entry = transmitters.find(item => item.id === $("plan-tx").value);
      const channel = R.satelliteChannel(orbital, entry);
      const result = importSatellites([{ name: orbital.name.replace(/\s*\(.*?\)\s*/g, " ").trim() || orbital.name, tle1: orbital.tle1, tle2: orbital.tle2, rx: Number(channel.rx) }]);
      $("plan-sat-codeplug-info").textContent = `Satelites en el codeplug local (${result.total}/25): ${describeSatellites(result.satellites)}.`;
      notify(`${result.added} satelite anadido, ${result.replaced} actualizado. Guarda el binario; la escritura en la radio sigue protegida por el respaldo verificado.`);
    });
    if ($("plan-sat-list")) attach("plan-sat-list", "Leer lista SAT del codeplug", async () => {
      const list = readSatellites();
      $("plan-sat-codeplug-info").textContent = `Satelites en el codeplug local (${list.length}/25): ${describeSatellites(list)}.`;
    });
    function consentLocation() { R.assert($("plan-location-consent").checked, "Autoriza expresamente el uso local de tu posicion."); }
    attach("plan-gps", "Obtener posicion con consentimiento", async () => {
      consentLocation();
      R.assert(navigator.geolocation, "Geolocalizacion no disponible; introduce coordenadas manuales.");
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve,
        error => reject(new Error(`No se obtuvo la ubicacion (${error.code}). Introduce coordenadas manuales.`)),
        { timeout: 15000, maximumAge: 60000, enableHighAccuracy: false }));
      $("plan-lat").value = position.coords.latitude;
      $("plan-lon").value = position.coords.longitude;
      $("plan-alt").value = Number.isFinite(position.coords.altitude) ? Math.round(position.coords.altitude) : 0;
      invalidatePrediction();
      notify(`Posicion obtenida solo para este navegador. Precision declarada: ${Math.round(position.coords.accuracy)} m. ${position.coords.altitude === null ? "Sin altitud GPS: se usa 0 m, revisala." : ""}`);
    });
    function calculatePasses() {
      requireOrbit(); consentLocation();
      const numeric = id => { R.assert($(id).value.trim() !== "", "Introduce todas las coordenadas y parametros."); return Number($(id).value); };
      const result = R.predictPasses(orbital, { latitude: numeric("plan-lat"), longitude: numeric("plan-lon"), height: numeric("plan-alt") / 1000 },
        { hours: numeric("plan-hours"), minimum: numeric("plan-elevation") });
      prediction = result;
      $("plan-pass-results").replaceChildren();
      for (const pass of result.passes) {
        const row = document.createElement("tr");
        for (const value of [`${new Date(pass.aos.time).toISOString()}${pass.partialStart ? " (ya visible)" : ""}`,
          new Date(pass.maximum.time).toISOString(), `${new Date(pass.los.time).toISOString()}${pass.partialEnd ? " (fin de ventana)" : ""}`,
          `${pass.maximum.elevation.toFixed(1)} grados`, `${pass.aos.azimuth.toFixed(1)} / ${pass.los.azimuth.toFixed(1)}`]) cell(row, value);
        $("plan-pass-results").append(row);
      }
      $("plan-doppler-pass").replaceChildren(new Option(result.passes.length ? "Selecciona un pase" : "Sin pases en la ventana", ""),
        ...result.passes.map((pass, index) => new Option(`${new Date(pass.aos.time).toISOString().slice(0, 16)} UTC, max. ${pass.maximum.elevation.toFixed(0)} grados`, index)));
      $("plan-pass-info").textContent = `${result.passes.length} pases por encima de ${result.minimumElevation} grados en ${result.hours} h desde ${result.start}. Epoca TLE: ${result.epoch}. Horas UTC, no hora local. Sin escritura en la radio; para el Doppler prepara canales por tramos.`;
    }
    attach("plan-predict", "Calcular pases localmente", calculatePasses);
    $("plan-pass-file").addEventListener("change", () => {
      const input = $("plan-pass-file");
      perform("Reabrir plan de pases", async () => {
        consentLocation();
        const file = input.files[0];
        R.assert(file && file.size > 0 && file.size <= 1024 * 1024, "Selecciona un plan JSON de hasta 1 MiB.");
        const plan = R.validateSatellitePlan(JSON.parse(await file.text()));
        clearOrbit();
        orbital = plan.orbital;
        $("plan-norad").value = String(orbital.norad);
        $("plan-sat-preset").value = "";
        $("plan-lat").value = plan.observer.latitude;
        $("plan-lon").value = plan.observer.longitude;
        $("plan-alt").value = plan.observer.height * 1000;
        $("plan-hours").value = plan.hours;
        $("plan-elevation").value = plan.minimum;
        transmitters = plan.transmitter ? [plan.transmitter] : [];
        $("plan-tx").replaceChildren(new Option("Selecciona frecuencia FM", ""),
          ...transmitters.map(entry => new Option(`${entry.name}: ${(entry.downlink / 1000000).toFixed(5)} MHz`, entry.id)));
        if (plan.transmitter) $("plan-tx").value = plan.transmitter.id;
        $("plan-tle-info").textContent = `${orbital.name} / ${orbital.norad}. TLE del plan local validado; no se ha consultado ningun proveedor.`;
        calculatePasses();
        notify("Plan reabierto y pases recalculados para la hora actual. No se instala en la radio ni graba audio.");
      }).finally(() => { input.value = ""; });
    });
    attach("plan-doppler-stage", "Preparar canales Doppler", async () => {
      requireOrbit(); consentLocation();
      R.assert(prediction && Date.now() - Date.parse(prediction.start) < 15 * 60000, "Calcula de nuevo los pases (caducidad 15 minutos).");
      const pass = prediction.passes[Number($("plan-doppler-pass").value)];
      R.assert($("plan-doppler-pass").value !== "" && pass, "Selecciona un pase.");
      const entry = transmitters.find(item => item.id === $("plan-tx").value);
      const channels = R.dopplerChannels(orbital, entry, pass, prediction.observer, Number($("plan-doppler-segments").value));
      stage(channels);
      $("plan-doppler-info").textContent = channels.map(channel => `${channel.name}: ${channel.rx} MHz, ${channel.window} (error max. ${channel.errorHz} Hz)`).join("; ");
    });
    attach("plan-pass-save", "Guardar prediccion de pases", async () => {
      requireOrbit(); consentLocation();
      R.assert(prediction, "Calcula primero los pases.");
      const result = await saveFile(`sat-${orbital.norad}-passes.json`, JSON.stringify({ format: "radio-workspace-satellite-plan", version: 1,
        orbital, prediction, transmitter: transmitters.find(entry => entry.id === $("plan-tx").value) || null,
        warning: "Contiene tu posicion. Plan local, no formato de instalacion SAT nativo ni grabacion de audio." }, null, 2), "application/json");
      notify(result === "saved" ? "Plan de pases escrito y cerrado en el archivo elegido. Contiene tu posicion." :
        "Descarga del plan solicitada. Comprueba Descargas; el navegador no confirma que se haya guardado. Contiene tu posicion.");
    });
    attach("plan-tle-save", "Guardar elementos orbitales", async () => {
      requireOrbit();
      download(`sat-${orbital.norad}.tle`, `${orbital.name}\r\n${orbital.tle1}\r\n${orbital.tle2}\r\n`, "text/plain");
      download(`sat-${orbital.norad}.source.json`, JSON.stringify(orbital, null, 2), "application/json");
      notify("TLE y procedencia/licencia solicitados para descarga. Comprueba que el navegador haya guardado ambos archivos; no se ha instalado en la radio.");
    });
    function webMode() {
      web = true;
      for (const id of ["plan-rb-query", "plan-rb-status"]) $(id).disabled = true;
      $("plan-rb-web-notice").hidden = false;
      $("plan-orbit-source").value = "satnogs"; $("plan-orbit-source").disabled = true;
      const repository = typeof BRAND !== "undefined" ? BRAND.repository : "";
      if (repository) { $("plan-rb-release").href = `${repository}/releases/latest`; $("plan-rb-release").hidden = false; }
      // Quansheng has no DMR contacts, and its page does not load radioid-csv.js.
      if (page === "quansheng" || !R.profile) return;
      for (const id of ["plan-contacts-query", "plan-contacts-prev", "plan-contacts-next"]) $(id).hidden = true;
      $("plan-web-contacts").hidden = false;
      $("plan-contacts-help").hidden = true;
      const profile = R.profile.get();
      if (profile) { $("plan-profile-call").value = profile.callsign; $("plan-profile-id").value = profile.dmrId; }
      $("plan-contacts-csv").addEventListener("change", () => perform("Cargar user.csv de RadioID", async () => {
        const file = $("plan-contacts-csv").files[0];
        R.assert(file && file.size > 0 && file.size <= 100 * 1024 * 1024, "Archivo CSV: 1 byte a 100 MiB.");
        const text = await file.text();
        let country = $("plan-country").value;
        const mine = R.profile.get();
        if (!country.trim() && mine) {
          const at = text.indexOf(`\n${mine.dmrId},`);
          const end = at < 0 ? -1 : text.indexOf("\n", at + 1);
          const found = at < 0 ? "" : text.slice(at + 1, end < 0 ? undefined : end).trim().split(",").pop().replace(/"/g, "");
          if (found) { country = found; $("plan-country").value = found; }
        }
        const result = R.parseRadioIdCSV(text, { country, region: $("plan-region").value });
        contactResult = { ...result, csv: true };
        renderContacts();
        notify(`user.csv: ${result.total} contactos coinciden${result.truncated ? "; se muestran los primeros 5000, afina la zona" : ""}.`);
      }).catch(() => {}).finally(() => { $("plan-contacts-csv").value = ""; }));
      $("plan-profile-save").addEventListener("click", () => {
        try {
          const saved = R.profile.set({ callsign: $("plan-profile-call").value, dmrId: $("plan-profile-id").value });
          $("plan-profile-call").value = saved.callsign;
          $("plan-profile-status").textContent = "Perfil guardado solo en este navegador.";
          renderContacts();
        } catch (error) { $("plan-profile-status").textContent = `ERROR: ${error.message}`; }
      });
      $("plan-profile-clear").addEventListener("click", () => {
        R.profile.clear();
        $("plan-profile-call").value = ""; $("plan-profile-id").value = "";
        $("plan-profile-status").textContent = "Perfil borrado.";
        renderContacts();
      });
    }
    R.runtime.then(runtime => {
      if (runtime.mode === "web") {
        $("plan-rb-config").hidden = true;
        $("plan-radioid-auto").hidden = true;
        webMode();
      }
    })
      .catch(error => { $("plan-status").textContent = `ERROR: ${error.message}`; });
    model.addEventListener("change", () => {
      staged.clear(); chosenRepeaters.clear(); chosenREMER.clear(); chosenContacts.clear();
      renderStaged(); renderContacts(); refreshTemplates();
      notify("Destino cambiado: canales preparados y seleccion de contactos vaciados para no mezclar modelos.");
    });
    renderREMER();
    return {
      setBusy(value) { busy = value; uiBusy = value; $("plan-controls").disabled = value || Boolean(tracker); },
      stagedEntries: () => [...staged.values()],
      addTemplateChannels(channels) {
        const template = templates().find(channel => channel.mode === 0);
        R.assert(template, "Lee o abre primero un archivo con al menos un canal FM.");
        return importChannels(channels, template.number);
      },
      refreshTemplates
    };
  }
  R.mountPlanningUI = mountPlanningUI;
})(globalThis);
