(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const doc = root.document;
  if (!doc || !R || typeof R.predictPasses !== "function") return;

  const MAX_PASSES = 150;
  const FILTER_KEY = "bricohams.sat.filters";
  const STATION_KEY = "bricohams.station";
  const SOURCES = [
    ["data/satellites.json", "Lista diaria de satelites"],
    ["data/channel-templates/satellites.json", "Copia incluida con la aplicacion"]
  ];
  const LAND_URL = "data/world-land-110m.txt";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const RADIUS = 160, CENTRE = 200;
  const STATUS_TEXT = { next: "Proximo", live: "En curso", done: "Terminado" };
  const STATUS_LABEL = { next: "AOS en", live: "En curso, LOS en", done: "Terminado" };

  const TEMPLATE = `
<div class="sat-page">
  <header class="sat-head">
    <h1>Satelites</h1>
    <p class="sat-lead">Busca un pase, siguelo y prepara tu radio. Los calculos se hacen en este navegador.</p>
  </header>
  <details id="sat-setup" class="sat-card sat-setup" open>
  <summary><span class="sat-setup-title">Estacion y datos orbitales</span> <span id="sat-setup-sum" class="sat-hint"></span></summary>
  <section id="ubicacion" aria-labelledby="sat-loc-title" tabindex="-1">
    <h2 id="sat-loc-title">Ubicacion de la estacion</h2>
    <form id="sat-station-form" novalidate>
      <div class="sat-fields">
        <div class="sat-field"><label for="sat-lat">Latitud (-90 a 90)</label><input id="sat-lat" type="number" step="any" min="-90" max="90" inputmode="decimal" autocomplete="off"></div>
        <div class="sat-field"><label for="sat-lon">Longitud (-180 a 180)</label><input id="sat-lon" type="number" step="any" min="-180" max="180" inputmode="decimal" autocomplete="off"></div>
        <div class="sat-field"><label for="sat-alt">Altura (m)</label><input id="sat-alt" type="number" step="any" min="-500" max="9000" value="0" inputmode="decimal" autocomplete="off"></div>
        <div class="sat-field"><label for="sat-loc">Locator Maidenhead</label><input id="sat-loc" maxlength="8" autocomplete="off" spellcheck="false" placeholder="IM98ql"></div>
      </div>
      <div class="sat-row">
        <button type="button" id="sat-geo" class="sat-btn">Usar mi ubicacion</button>
        <button type="submit" class="sat-btn sat-btn-primary">Calcular pases</button>
        <label class="sat-check"><input id="sat-remember" type="checkbox"><span>Recordar en este navegador</span></label>
      </div>
      <p id="sat-station-msg" class="sat-msg" role="status"></p>
      <p class="sat-hint">La posicion se usa solo en este navegador para calcular los pases y no se envia a ningun servidor.</p>
    </form>
  </section>
  <section id="sat-source" aria-labelledby="sat-src-title">
    <h2 id="sat-src-title">Datos orbitales</h2>
    <p class="sat-src-line"><span class="sat-lbl">Fuente</span> <span id="sat-src-name"></span> <span id="sat-src-date"></span> <span id="sat-src-age"></span></p>
    <p id="sat-src-msg" class="sat-msg" role="status"></p>
    <p id="sat-src-attr" class="sat-hint"></p>
    <ul id="sat-expired" class="sat-expired"></ul>
  </section>
  </details>
  <div class="sat-layout">
    <section class="sat-zone sat-zone-list" aria-labelledby="sat-list-title">
      <h2 id="sat-list-title">Pases</h2>
      <div class="sat-filters">
        <div class="sat-field"><label for="sat-q">Buscar por nombre o NORAD</label><input id="sat-q" type="search" autocomplete="off" maxlength="60"></div>
        <div class="sat-field"><label for="sat-min">Elevacion minima (grados)</label><input id="sat-min" type="number" min="0" max="60" step="1" inputmode="numeric"></div>
        <div class="sat-field"><label for="sat-hours">Proximas horas</label><select id="sat-hours"><option value="24">24</option><option value="48">48</option></select></div>
        <details class="sat-sats"><summary>Satelites</summary><div id="sat-checks" class="sat-checks"></div></details>
      </div>
      <p id="sat-list-note" class="sat-msg" role="status"></p>
      <div id="sat-scroller" class="sat-scroller"><ol id="sat-list" class="sat-list" aria-labelledby="sat-list-title"></ol></div>
    </section>
    <section class="sat-zone sat-zone-centre" aria-labelledby="sat-centre-title">
      <h2 id="sat-centre-title" class="sat-sr">Vista del pase</h2>
      <div class="sat-toggle" role="group" aria-label="Vista">
        <button type="button" id="sat-view-radar" class="sat-btn" aria-pressed="true">Radar</button>
        <button type="button" id="sat-view-map" class="sat-btn" aria-pressed="false">Mapa</button>
      </div>
      <div id="sat-panel-radar" class="sat-panel">
        <svg id="sat-radar" class="sat-svg" viewBox="0 0 400 400" role="img" aria-label="Radar del pase">
          <circle class="sat-ring" cx="200" cy="200" r="160"></circle>
          <circle class="sat-ring" cx="200" cy="200" r="106.7"></circle>
          <circle class="sat-ring" cx="200" cy="200" r="53.3"></circle>
          <line class="sat-axis" x1="40" y1="200" x2="360" y2="200"></line>
          <line class="sat-axis" x1="200" y1="40" x2="200" y2="360"></line>
          <text class="sat-ring-label" x="204" y="37">0°</text>
          <text class="sat-ring-label" x="204" y="91">30°</text>
          <text class="sat-ring-label" x="204" y="144">60°</text>
          <text class="sat-cardinal" x="200" y="18" text-anchor="middle">N</text>
          <text class="sat-cardinal" x="384" y="205" text-anchor="middle">E</text>
          <text class="sat-cardinal" x="200" y="392" text-anchor="middle">S</text>
          <text class="sat-cardinal" x="16" y="205" text-anchor="middle">O</text>
          <g id="sat-radar-dyn"></g>
        </svg>
      </div>
      <div id="sat-panel-map" class="sat-panel" hidden>
        <svg id="sat-map" class="sat-svg" viewBox="0 0 720 360" role="img" aria-label="Mapa del pase">
          <rect class="sat-ocean" x="0" y="0" width="720" height="360"></rect>
          <path id="sat-land" class="sat-land" d=""></path>
          <g id="sat-graticule"></g>
          <g id="sat-map-dyn"></g>
        </svg>
        <p id="sat-map-note" class="sat-msg" hidden>Mapa base no disponible: se muestran solo la cuadricula y la trayectoria.</p>
      </div>
    </section>
    <section class="sat-zone sat-zone-data" aria-labelledby="sat-data-title">
      <h2 id="sat-data-title">Datos del pase</h2>
      <p id="sat-d-empty">Selecciona un pase de la lista.</p>
      <div id="sat-d-body" hidden>
        <p class="sat-d-name"><strong id="sat-d-name"></strong> <span id="sat-d-norad"></span></p>
        <p><span id="sat-d-badge" class="sat-badge"></span></p>
        <p class="sat-d-count"><span id="sat-d-label"></span> <span id="sat-d-value" class="sat-big"></span></p>
        <div id="sat-d-events" class="sat-events"></div>
        <div id="sat-live" class="sat-live-box" hidden>
          <h3>Posicion actual</h3>
          <p><span class="sat-lbl">Azimut</span> <span id="sat-live-az" class="sat-num"></span></p>
          <p><span class="sat-lbl">Elevacion</span> <span id="sat-live-el" class="sat-num"></span></p>
          <p><span class="sat-lbl">Distancia</span> <span id="sat-live-range" class="sat-num"></span></p>
        </div>
        <h3>Frecuencias</h3>
        <ul id="sat-tx" class="sat-tx"></ul>
        <p id="sat-tx-empty" hidden>Frecuencias no disponibles en la lista</p>
        <h3>Acciones</h3>
        <div class="sat-actions">
          <a id="sat-act-cat" class="sat-btn" href="quansheng.html#plan-sat">Seguir con CAT en Quansheng</a>
          <a id="sat-act-gd77" class="sat-btn" href="opengd77.html#planning-panel">Preparar memorias en OpenGD77</a>
          <button id="sat-act-ics" type="button" class="sat-btn">Exportar estos pases (.ics)</button>
          <button id="sat-act-rotor" type="button" class="sat-btn">Exportar pase para el rotor (.json)</button>
        </div>
        <p id="sat-act-msg" class="sat-msg" role="status"></p>
        <p class="sat-hint">Estas acciones solo abren herramientas o descargan un archivo: no transmiten ni escriben en la radio.</p>
      </div>
    </section>
  </div>
</div>`;

  function area(name) { try { return root[name] || null; } catch { return null; } }
  function readJSON(name, key) {
    try { const raw = area(name)?.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function writeJSON(name, key, value) {
    try { area(name)?.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable or full */ }
  }
  function removeKey(name, key) {
    try { area(name)?.removeItem(key); } catch { /* storage unavailable */ }
  }

  function el(tag, props = {}, ...children) {
    const node = doc.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (name === "text") node.textContent = value;
      else if (name === "class") node.className = value;
      else node.setAttribute(name, value === true ? "" : String(value));
    }
    node.append(...children);
    return node;
  }
  function svg(tag, props = {}, text) {
    const node = doc.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(props)) if (value != null) node.setAttribute(name, String(value));
    if (text != null) node.textContent = text;
    return node;
  }

  function localFormatter() {
    const options = { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZoneName: "short" };
    try { return new Intl.DateTimeFormat(doc.documentElement.lang || "es", options); } catch { return new Intl.DateTimeFormat("es", options); }
  }
  const localTime = ms => localFormatter().format(ms);
  const utcTime = ms => {
    const iso = new Date(ms).toISOString();
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)} ${iso.slice(11, 19)} UTC`;
  };
  function countdown(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(total / 3600), minutes = Math.floor(total % 3600 / 60), seconds = total % 60;
    const pad = value => String(value).padStart(2, "0");
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  }
  const statusOf = (pass, now) => now < pass.aos.time ? "next" : now < pass.los.time ? "live" : "done";
  const mhz = hz => `${(hz / 1e6).toFixed(5)} MHz`;
  const degrees = (value, digits = 0) => `${value.toFixed(digits)}°`;
  const clamp = (value, min, max, fallback) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  const keyOf = (norad, aos) => `${norad}-${Math.round(aos)}`;

  function ageText(fetchedAt, now) {
    const hours = Math.max(0, Math.floor((now - Date.parse(fetchedAt)) / 3600000));
    return hours < 48 ? `${hours} h` : `${Math.floor(hours / 24)} d`;
  }

  async function loadSatellites() {
    for (const [url, label] of SOURCES) {
      try {
        const response = await fetch(url, { cache: "no-cache" });
        if (!response.ok) continue;
        const file = R.validateSatellitesFile(await response.json());
        return { file, label };
      } catch { /* try the next source */ }
    }
    return null;
  }

  function landPath(text) {
    const parts = [];
    for (const line of text.split("\n")) {
      const row = line.trim();
      if (!row || row.startsWith("#")) continue;
      const coords = row.split(" ").map(pair => pair.split(",").map(Number));
      if (coords.length < 3 || coords.some(c => c.length !== 2 || !c.every(Number.isFinite) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90)) continue;
      parts.push(`M${coords.map(([lon, lat]) => `${((lon + 180) * 2).toFixed(1)} ${((90 - lat) * 2).toFixed(1)}`).join("L")}Z`);
    }
    return parts.join("");
  }

  function polar(azimuth, elevation) {
    const radius = RADIUS * (90 - clamp(elevation, 0, 90, 0)) / 90;
    const angle = azimuth * Math.PI / 180;
    return [CENTRE + radius * Math.sin(angle), CENTRE - radius * Math.cos(angle)];
  }
  const mapXY = (longitude, latitude) => [(longitude + 180) * 2, (90 - latitude) * 2];
  function mapPath(points) {
    const segments = [];
    let current = [], previous = null;
    for (const point of points) {
      if (previous && Math.abs(point.longitude - previous.longitude) > 180) { segments.push(current); current = []; }
      current.push(point);
      previous = point;
    }
    if (current.length) segments.push(current);
    return segments.map(segment => segment.map((point, index) => {
      const [x, y] = mapXY(point.longitude, point.latitude);
      return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join("")).join("");
  }

  function mount(main) {
    main.innerHTML = TEMPLATE;
    const $ = id => doc.getElementById(id);
    const ui = Object.fromEntries(["sat-station-form", "sat-lat", "sat-lon", "sat-alt", "sat-loc", "sat-geo", "sat-remember", "sat-station-msg",
      "sat-src-name", "sat-src-date", "sat-src-age", "sat-src-msg", "sat-src-attr", "sat-expired", "sat-q", "sat-min", "sat-hours", "sat-checks",
      "sat-list-note", "sat-scroller", "sat-list", "sat-view-radar", "sat-view-map", "sat-panel-radar", "sat-panel-map", "sat-radar", "sat-radar-dyn",
      "sat-map", "sat-land", "sat-graticule", "sat-map-dyn", "sat-map-note", "sat-d-empty", "sat-d-body", "sat-d-name", "sat-d-norad", "sat-d-badge",
      "sat-d-label", "sat-d-value", "sat-d-events", "sat-live", "sat-live-az", "sat-live-el", "sat-live-range", "sat-tx", "sat-tx-empty",
      "sat-act-cat", "sat-act-gd77", "sat-act-ics", "sat-act-rotor", "sat-act-msg"].map(id => [id.slice(4), $(id)]));

    const saved = readJSON("sessionStorage", FILTER_KEY) || {};
    const filters = {
      unchecked: new Set(Array.isArray(saved.unchecked) ? saved.unchecked.filter(Number.isInteger) : []),
      minimum: clamp(Number(saved.minimum), 0, 60, 10),
      hours: saved.hours === 48 ? 48 : 24,
      query: typeof saved.query === "string" ? saved.query.slice(0, 60) : ""
    };
    const state = {
      sats: [], file: null, station: null, passes: [], items: [], byKey: new Map(), selected: null,
      view: saved.view === "map" ? "map" : "radar", computedAt: 0, radarLive: null, mapLive: null
    };
    let savedScroll = Number.isFinite(saved.scroll) ? saved.scroll : 0;
    let savedPass = typeof saved.pass === "string" ? saved.pass : null;
    let restoredScroll = false;

    function saveState() {
      writeJSON("sessionStorage", FILTER_KEY, { unchecked: [...filters.unchecked], minimum: filters.minimum, hours: filters.hours,
        query: filters.query, view: state.view, scroll: Math.round(restoredScroll ? ui.scroller.scrollTop : savedScroll), pass: state.selected?.key ?? savedPass });
    }

    ui.min.value = String(filters.minimum);
    ui.hours.value = String(filters.hours);
    ui.q.value = filters.query;

    function setView(view) {
      state.view = view;
      ui["view-radar"].setAttribute("aria-pressed", String(view === "radar"));
      ui["view-map"].setAttribute("aria-pressed", String(view === "map"));
      ui["panel-radar"].hidden = view !== "radar";
      ui["panel-map"].hidden = view !== "map";
      saveState();
    }
    ui["view-radar"].addEventListener("click", () => setView("radar"));
    ui["view-map"].addEventListener("click", () => setView("map"));
    setView(state.view);

    for (let longitude = -150; longitude <= 150; longitude += 30) {
      const x = (longitude + 180) * 2;
      ui.graticule.append(svg("line", { class: longitude === 0 ? "sat-grat sat-grat-main" : "sat-grat", x1: x, y1: 0, x2: x, y2: 360 }));
    }
    for (let latitude = -60; latitude <= 60; latitude += 30) {
      const y = (90 - latitude) * 2;
      ui.graticule.append(svg("line", { class: latitude === 0 ? "sat-grat sat-grat-main" : "sat-grat", x1: 0, y1: y, x2: 720, y2: y }));
    }
    fetch(LAND_URL).then(response => { if (!response.ok) throw new Error("land"); return response.text(); })
      .then(text => {
        const path = landPath(text);
        if (!path) throw new Error("land");
        ui.land.setAttribute("d", path);
      })
      .catch(() => { ui["map-note"].hidden = false; });

    function observer() {
      return { latitude: state.station.latitude, longitude: state.station.longitude, height: state.station.heightM / 1000 };
    }
    const lookFn = (sat, cache = new Map()) => time => {
      if (!cache.has(time)) cache.set(time, R.lookAt(sat, observer(), time));
      return cache.get(time);
    };

    function stationMessage(text, error = false) {
      ui["station-msg"].textContent = text;
      ui["station-msg"].classList.toggle("sat-error", error);
    }
    function readStationForm() {
      const number = (input, fallback = NaN) => input.value.trim() === "" ? fallback : Number(input.value);
      const latitude = number(ui.lat), longitude = number(ui.lon), heightM = number(ui.alt, 0);
      if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
        !Number.isFinite(heightM) || heightM < -500 || heightM > 9000) return null;
      return { latitude, longitude, heightM };
    }
    function applyStation() {
      const station = readStationForm();
      if (!station) {
        state.station = null;
        stationMessage("Ubicacion no valida: latitud de -90 a 90, longitud de -180 a 180 y altura de -500 a 9000 m.", true);
        removeKey("localStorage", STATION_KEY);
        recompute();
        return;
      }
      state.station = station;
      stationMessage("Ubicacion aplicada.");
      if (ui.remember.checked) writeJSON("localStorage", STATION_KEY, station);
      setupSummary();
      recompute();
    }
    // Collapsed once a station exists so the three zones start at the top; the summary keeps it identifiable.
    function setupSummary() {
      const setup = doc.getElementById("sat-setup");
      const sum = doc.getElementById("sat-setup-sum");
      if (!setup || !sum) return;
      sum.textContent = state.station
        ? `${state.station.latitude.toFixed(3)}, ${state.station.longitude.toFixed(3)} · ${ui["src-age"].textContent || ""}`.trim()
        : "Falta la ubicacion";
    }
    ui.remember.addEventListener("change", () => {
      if (!ui.remember.checked) removeKey("localStorage", STATION_KEY);
      else if (state.station) writeJSON("localStorage", STATION_KEY, state.station);
    });
    ui["station-form"].addEventListener("submit", event => { event.preventDefault(); applyStation(); });
    for (const input of [ui.lat, ui.lon, ui.alt]) input.addEventListener("change", () => { if (input !== ui.alt) ui.loc.value = ""; applyStation(); });
    ui.loc.addEventListener("change", () => {
      if (!ui.loc.value.trim()) return;
      try {
        const point = R.maidenheadToLatLon(ui.loc.value);
        ui.lat.value = point.latitude.toFixed(5);
        ui.lon.value = point.longitude.toFixed(5);
        applyStation();
      } catch (error) { stationMessage(error.message, true); }
    });
    ui.remember.addEventListener("change", () => {
      if (ui.remember.checked) { if (state.station) writeJSON("localStorage", STATION_KEY, state.station); }
      else removeKey("localStorage", STATION_KEY);
    });
    ui.geo.addEventListener("click", () => {
      if (!root.navigator?.geolocation) { stationMessage("Este navegador no ofrece geolocalizacion. Introduce latitud y longitud o tu locator.", true); return; }
      stationMessage("Obteniendo ubicacion...");
      root.navigator.geolocation.getCurrentPosition(position => {
        ui.lat.value = position.coords.latitude.toFixed(5);
        ui.lon.value = position.coords.longitude.toFixed(5);
        ui.alt.value = Number.isFinite(position.coords.altitude) ? String(Math.round(position.coords.altitude)) : "0";
        ui.loc.value = "";
        applyStation();
      }, error => {
        stationMessage(error.code === 1 ? "Permiso de ubicacion denegado. Introduce latitud y longitud o tu locator."
          : error.code === 3 ? "Se agoto el tiempo al obtener la ubicacion. Vuelve a intentarlo o introducela a mano."
            : "Ubicacion no disponible en este dispositivo. Introduce latitud y longitud o tu locator.", true);
      }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
    });

    function findByKey(key) {
      const match = /^(\d{1,5})-(\d{10,14})$/.exec(key || "");
      if (!match) return null;
      const norad = Number(match[1]), aos = Number(match[2]);
      let best = null;
      for (const pass of state.passes) {
        const delta = Math.abs(pass.aos.time - aos);
        if (pass.norad === norad && delta <= 90000 && (!best || delta < best.delta)) best = { pass, delta };
      }
      return best?.pass ?? null;
    }

    function buildItem(pass) {
      const label = el("span", { class: "sat-count-label" });
      const value = el("span", { class: "sat-num sat-count-value" });
      const badge = el("span", { class: "sat-badge" });
      const button = el("button", { type: "button", class: "sat-pass", "aria-pressed": "false", "data-key": pass.key },
        el("span", { class: "sat-pass-head" }, el("span", { class: "sat-pass-name", text: pass.name }), el("span", { class: "sat-pass-norad", text: `NORAD ${pass.norad}` })),
        el("span", { class: "sat-pass-time sat-num", text: localTime(pass.aos.time) }),
        el("small", { class: "sat-pass-utc sat-num", text: utcTime(pass.aos.time) }),
        el("span", { class: "sat-pass-count" }, label, " ", value),
        el("span", { class: "sat-pass-foot" }, badge, el("span", { class: "sat-pass-max" }, el("span", { text: "Elev. max." }), " ", el("span", { class: "sat-num", text: degrees(pass.max.elevation) }))));
      return { pass, li: el("li", {}, button), button, label, value, badge, status: null, text: null };
    }
    function updateItem(item, now) {
      const status = statusOf(item.pass, now);
      if (status !== item.status) {
        item.status = status;
        item.label.textContent = STATUS_LABEL[status];
        item.badge.textContent = STATUS_TEXT[status];
        item.badge.className = `sat-badge sat-${status}`;
      }
      const text = status === "next" ? countdown(item.pass.aos.time - now) : status === "live" ? countdown(item.pass.los.time - now) : "";
      if (text !== item.text) { item.text = text; item.value.textContent = text; }
    }

    function renderList() {
      const previousScroll = restoredScroll ? ui.scroller.scrollTop : savedScroll;
      ui.list.replaceChildren();
      state.items = state.passes.map(buildItem);
      state.byKey = new Map(state.items.map(item => [item.pass.key, item]));
      const now = Date.now();
      for (const item of state.items) { updateItem(item, now); ui.list.append(item.li); }
      ui.scroller.scrollTop = previousScroll;
      restoredScroll = restoredScroll || state.items.length > 0;
    }

    function pressItem(key, pressed) {
      const item = state.byKey.get(key);
      if (!item) return;
      item.button.setAttribute("aria-pressed", String(pressed));
      item.li.classList.toggle("sat-selected", pressed);
    }
    function revealItem(item) {
      const box = ui.scroller;
      if (item.li.offsetTop < box.scrollTop || item.li.offsetTop + item.li.offsetHeight > box.scrollTop + box.clientHeight) {
        box.scrollTop = Math.max(0, item.li.offsetTop - box.clientHeight / 3);
      }
    }

    function drawRadar(pass) {
      const group = ui["radar-dyn"];
      group.replaceChildren();
      state.radarLive = null;
      try {
        const track = R.passTrack(pass.sat, observer(), pass.raw, 90);
        group.append(svg("polyline", { class: "sat-path", points: track.map(point => polar(point.azimuth, point.elevation).map(n => n.toFixed(1)).join(",")).join(" ") }));
      } catch { /* the markers below still describe the pass */ }
      for (const [kind, point, text] of [["aos", pass.aos, "AOS"], ["max", pass.max, `MAX ${degrees(pass.max.elevation)}`], ["los", pass.los, "LOS"]]) {
        const [x, y] = polar(point.azimuth, point.elevation);
        const left = x < CENTRE;
        group.append(svg("circle", { class: `sat-mark sat-mark-${kind}`, cx: x.toFixed(1), cy: y.toFixed(1), r: 5 }),
          svg("text", { class: "sat-mark-text", x: (left ? x - 9 : x + 9).toFixed(1), y: (y - 7).toFixed(1), "text-anchor": left ? "end" : "start" }, text));
      }
      const dot = svg("circle", { class: "sat-live-dot sat-off", cx: CENTRE, cy: CENTRE, r: 7 });
      group.append(dot);
      state.radarLive = dot;
      ui.radar.setAttribute("aria-label", `Radar del pase de ${pass.name}: AOS azimut ${degrees(pass.aos.azimuth)}, elevacion maxima ${degrees(pass.max.elevation)}, LOS azimut ${degrees(pass.los.azimuth)}`);
    }

    function drawMap(pass) {
      const group = ui["map-dyn"];
      group.replaceChildren();
      state.mapLive = null;
      const from = pass.aos.time - 600000, to = pass.los.time + 600000;
      const all = [], inside = [];
      try {
        for (let time = from; time <= to; time += 30000) {
          const point = R.subPoint(pass.sat, time);
          all.push(point);
          if (time >= pass.aos.time && time <= pass.los.time) inside.push(point);
        }
      } catch { /* draw what could be propagated */ }
      group.append(svg("path", { class: "sat-track-ext", d: mapPath(all) }), svg("path", { class: "sat-track", d: mapPath(inside) }));
      const [sx, sy] = mapXY(state.station.longitude, state.station.latitude);
      const far = sx > 600;
      group.append(svg("circle", { class: "sat-station", cx: sx.toFixed(1), cy: sy.toFixed(1), r: 4 }),
        svg("text", { class: "sat-mark-text", x: (far ? sx - 8 : sx + 8).toFixed(1), y: (sy - 6).toFixed(1), "text-anchor": far ? "end" : "start" }, "Estacion"));
      const dot = svg("circle", { class: "sat-live-dot", cx: 0, cy: 0, r: 6 });
      const text = svg("text", { class: "sat-mark-text", x: 0, y: 0 }, pass.name);
      group.append(dot, text);
      state.mapLive = { dot, text };
      ui.map.setAttribute("aria-label", `Mapa del pase de ${pass.name}: trayectoria desde AOS hasta LOS, elevacion maxima ${degrees(pass.max.elevation)}, observador en ${state.station.latitude.toFixed(2)}, ${state.station.longitude.toFixed(2)}`);
    }

    function eventBox(label, point, kind) {
      const box = el("div", { class: "sat-event" }, el("span", { class: "sat-event-label", text: label }));
      if (kind === "max") box.append(el("span", { class: "sat-num sat-event-main", text: degrees(point.elevation, 1) }));
      box.append(el("span", { class: "sat-num sat-event-main", text: localTime(point.time) }), el("small", { class: "sat-num", text: utcTime(point.time) }),
        el("span", { class: "sat-event-az" }, el("span", { text: "Azimut" }), " ", el("span", { class: "sat-num", text: degrees(point.azimuth) })));
      return box;
    }

    let dopplerNodes = [];
    function drawData(pass) {
      ui["d-empty"].hidden = true;
      ui["d-body"].hidden = false;
      ui["d-name"].textContent = pass.name;
      ui["d-norad"].textContent = `NORAD ${pass.norad}`;
      ui["d-events"].replaceChildren(eventBox("AOS", pass.aos, "aos"), eventBox("Elevacion maxima", pass.max, "max"), eventBox("LOS", pass.los, "los"));
      ui.tx.replaceChildren();
      dopplerNodes = [];
      const transmitters = Array.isArray(pass.sat.transmitters) ? pass.sat.transmitters : [];
      ui["tx-empty"].hidden = transmitters.length > 0;
      for (const tx of transmitters) {
        const item = el("li", { class: "sat-tx-item" }, el("strong", { text: String(tx.name || tx.id || "") }),
          el("p", {}, el("span", { class: "sat-lbl", text: "RX / bajada" }), " ", Number.isFinite(tx.downlink) ? el("span", { class: "sat-num", text: mhz(tx.downlink) }) : el("span", { text: "Sin bajada" })),
          el("p", {}, el("span", { class: "sat-lbl", text: "TX / subida" }), " ", Number.isFinite(tx.uplink) ? el("span", { class: "sat-num", text: mhz(tx.uplink) }) : el("span", { text: "Sin subida" })),
          el("p", {}, el("span", { class: "sat-lbl", text: "Modo" }), " ", el("span", { text: String(tx.mode || "") })));
        if (Number.isFinite(tx.downlink)) {
          const doppler = el("p", { class: "sat-num sat-doppler", hidden: true });
          item.append(doppler);
          dopplerNodes.push({ tx, node: doppler, text: null });
        }
        ui.tx.append(item);
      }
      ui["act-cat"].href = `quansheng.html?sat=${pass.norad}#plan-sat`;
      ui["act-gd77"].href = `opengd77.html?sat=${pass.norad}#planning-panel`;
      ui["act-msg"].textContent = "";
    }

    function clearSelection() {
      state.selected = null;
      state.radarLive = state.mapLive = null;
      ui["d-body"].hidden = true;
      ui["d-empty"].hidden = false;
      ui["radar-dyn"].replaceChildren();
      ui["map-dyn"].replaceChildren();
      ui.radar.setAttribute("aria-label", "Radar del pase");
      ui.map.setAttribute("aria-label", "Mapa del pase");
    }

    function select(pass, { focus = false, reveal = false, user = false } = {}) {
      if (state.selected) pressItem(state.selected.key, false);
      state.selected = pass;
      pressItem(pass.key, true);
      const item = state.byKey.get(pass.key);
      if (reveal && item) revealItem(item);
      if (focus && item) item.button.focus();
      if (user) { try { root.history.replaceState(null, "", `#pase=${pass.key}`); } catch { /* history unavailable */ } }
      drawRadar(pass);
      drawMap(pass);
      drawData(pass);
      updateLive(Date.now());
      savedPass = pass.key;
      saveState();
    }

    function recompute() {
      const keepKey = state.selected?.key ?? (/^#pase=/.test(root.location.hash) ? root.location.hash.slice(6) : savedPass);
      state.passes = [];
      const notices = [];
      let truncated = false;
      const now = Date.now();
      if (state.station) {
        const start = Math.floor(now / 60000) * 60000 - 15 * 60000;
        const query = R.norm(filters.query);
        const found = [];
        for (const sat of state.sats) {
          if (filters.unchecked.has(sat.norad)) continue;
          if (query && !R.norm(sat.name).includes(query) && !String(sat.norad).includes(query)) continue;
          try {
            for (const raw of R.predictPasses(sat, observer(), { start, hours: filters.hours, minimum: filters.minimum }).passes) {
              found.push({ key: keyOf(sat.norad, raw.aos.time), sat, norad: sat.norad, name: sat.name, aos: raw.aos, los: raw.los, max: raw.maximum, raw });
            }
          } catch (error) { notices.push(`${sat.name}: ${error.message}`); }
        }
        found.sort((a, b) => a.aos.time - b.aos.time);
        truncated = found.length > MAX_PASSES;
        state.passes = found.slice(0, MAX_PASSES);
      }
      state.computedAt = now;
      state.selected = null;
      renderList();
      const messages = [];
      if (!state.station) messages.push("Indica tu ubicacion para calcular los pases.");
      else if (!state.sats.length) messages.push("No hay satelites con datos orbitales vigentes.");
      else if (!state.passes.length) messages.push("No hay pases con estos filtros.");
      if (truncated) messages.push("Se muestran los primeros 150 pases.");
      ui["list-note"].replaceChildren(...[...messages.map(text => el("span", { text })), ...notices.map(text => el("span", { text }))]
        .flatMap((node, index) => index ? [el("br"), node] : [node]));
      if (!state.passes.length) { clearSelection(); saveState(); return; }
      const target = findByKey(keepKey) || state.passes.find(pass => pass.aos.time > now) || state.passes.find(pass => pass.los.time > now) || state.passes[state.passes.length - 1];
      select(target, { reveal: !findByKey(keepKey) || savedScroll === 0 });
    }

    ui.list.addEventListener("click", event => {
      const button = event.target.closest("button[data-key]");
      const item = button && state.byKey.get(button.dataset.key);
      if (item) select(item.pass, { user: true });
    });
    ui.list.addEventListener("keydown", event => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      const index = state.items.findIndex(item => item.button === doc.activeElement);
      const next = index < 0 ? null : state.items[index + (event.key === "ArrowDown" ? 1 : -1)];
      if (!next) return;
      event.preventDefault();
      select(next.pass, { focus: true, user: true });
    });
    let scrollTimer = 0;
    ui.scroller.addEventListener("scroll", () => { root.clearTimeout(scrollTimer); scrollTimer = root.setTimeout(() => { savedScroll = ui.scroller.scrollTop; saveState(); }, 150); });
    root.addEventListener("hashchange", () => {
      const pass = /^#pase=/.test(root.location.hash) ? findByKey(root.location.hash.slice(6)) : null;
      if (pass) select(pass, { reveal: true });
    });

    let queryTimer = 0;
    ui.q.addEventListener("input", () => {
      root.clearTimeout(queryTimer);
      queryTimer = root.setTimeout(() => { filters.query = ui.q.value.trim().slice(0, 60); saveState(); recompute(); }, 250);
    });
    ui.min.addEventListener("change", () => {
      filters.minimum = clamp(Math.round(Number(ui.min.value)), 0, 60, 10);
      ui.min.value = String(filters.minimum);
      saveState(); recompute();
    });
    ui.hours.addEventListener("change", () => { filters.hours = ui.hours.value === "48" ? 48 : 24; saveState(); recompute(); });

    function updateLive(now) {
      const pass = state.selected;
      if (!pass) return;
      const status = statusOf(pass, now);
      const live = status === "live";
      ui["d-badge"].textContent = STATUS_TEXT[status];
      ui["d-badge"].className = `sat-badge sat-${status}`;
      const label = STATUS_LABEL[status];
      if (ui["d-label"].textContent !== label) ui["d-label"].textContent = label;
      ui["d-value"].textContent = status === "next" ? countdown(pass.aos.time - now) : live ? countdown(pass.los.time - now) : "";
      ui.live.hidden = !live;
      state.radarLive?.classList.toggle("sat-off", !live);
      try {
        const look = lookFn(pass.sat);
        if (live) {
          const position = look(now);
          ui["live-az"].textContent = degrees(position.azimuth, 1);
          ui["live-el"].textContent = degrees(position.elevation, 1);
          ui["live-range"].textContent = `${position.rangeKm.toFixed(0)} km`;
          if (state.radarLive) {
            const [x, y] = polar(position.azimuth, position.elevation);
            state.radarLive.setAttribute("cx", x.toFixed(1));
            state.radarLive.setAttribute("cy", y.toFixed(1));
          }
        }
        for (const entry of dopplerNodes) {
          entry.node.hidden = !live;
          if (!live) continue;
          entry.node.textContent = `Doppler calculado: ${(R.dopplerHz(look, entry.tx.downlink, now) / 1e6).toFixed(5)} MHz (sin control de radio)`;
        }
        if (state.mapLive) {
          const point = R.subPoint(pass.sat, now);
          const [x, y] = mapXY(point.longitude, point.latitude);
          const far = x > 600;
          state.mapLive.dot.setAttribute("cx", x.toFixed(1));
          state.mapLive.dot.setAttribute("cy", y.toFixed(1));
          state.mapLive.text.setAttribute("x", (far ? x - 9 : x + 9).toFixed(1));
          state.mapLive.text.setAttribute("y", (y - 8).toFixed(1));
          state.mapLive.text.setAttribute("text-anchor", far ? "end" : "start");
        }
      } catch { /* orbital data expired while the page stayed open */ }
    }

    root.setInterval(() => {
      const now = Date.now();
      for (const item of state.items) updateItem(item, now);
      updateLive(now);
      if (state.station && now - state.computedAt > 600000) recompute();
    }, 1000);

    ui["act-ics"].addEventListener("click", () => {
      const pass = state.selected;
      if (!pass) return;
      const passes = state.passes.filter(item => item.norad === pass.norad && item.los.time > Date.now()).map(item => item.raw);
      if (!passes.length) { ui["act-msg"].textContent = "No hay pases que exportar."; return; }
      try {
        const url = root.URL.createObjectURL(new Blob([R.passesToIcs(pass.sat, { passes })], { type: "text/calendar;charset=utf-8" }));
        const link = el("a", { href: url, download: `pases-${pass.norad}.ics` });
        doc.body.append(link);
        link.click();
        link.remove();
        root.setTimeout(() => root.URL.revokeObjectURL(url), 1000);
        ui["act-msg"].textContent = "Archivo .ics generado.";
      } catch (error) { ui["act-msg"].textContent = error.message; }
    });

    ui["act-rotor"].addEventListener("click", () => {
      const pass = state.selected;
      if (!pass) { ui["act-msg"].textContent = "No hay ningun pase seleccionado."; return; }
      try {
        const file = R.passTrackFile(pass.sat, observer(), pass.raw, pass.name);
        const url = root.URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
        const link = el("a", { href: url, download: `pase-rotor-${pass.norad}.json` });
        doc.body.append(link);
        link.click();
        link.remove();
        root.setTimeout(() => root.URL.revokeObjectURL(url), 1000);
        ui["act-msg"].textContent = "Archivo de pase para el rotor generado.";
      } catch (error) { ui["act-msg"].textContent = error.message; }
    });

    function renderChecks() {
      ui.checks.replaceChildren(...state.sats.map(sat => {
        const input = el("input", { type: "checkbox", "data-norad": sat.norad });
        input.checked = !filters.unchecked.has(sat.norad);
        input.addEventListener("change", () => {
          if (input.checked) filters.unchecked.delete(sat.norad); else filters.unchecked.add(sat.norad);
          saveState(); recompute();
        });
        return el("label", { class: "sat-check" }, input, el("span", { text: `${sat.name} (${sat.norad})` }));
      }));
    }

    const stored = readJSON("localStorage", STATION_KEY);
    if (stored && Number.isFinite(stored.latitude) && Number.isFinite(stored.longitude) && Number.isFinite(stored.heightM)) {
      ui.lat.value = String(stored.latitude);
      ui.lon.value = String(stored.longitude);
      ui.alt.value = String(stored.heightM);
      ui.remember.checked = true;
      state.station = readStationForm();
      if (!state.station) { ui.lat.value = ui.lon.value = ""; ui.alt.value = "0"; ui.remember.checked = false; }
    }

    loadSatellites().then(result => {
      if (!result) {
        ui["src-msg"].textContent = "No se pudo cargar la lista de satelites ni la copia incluida. Comprueba la conexion y recarga la pagina.";
        ui["src-msg"].classList.add("sat-error");
        recompute();
        return;
      }
      const { file, label } = result;
      state.file = file;
      const now = Date.now();
      for (const entry of file.satellites) {
        try { R.validateSatelliteEntry(entry, now); state.sats.push(entry); }
        catch (error) {
          // Only an expired/future epoch is "caducado"; any other failure is reported as it is.
          const reason = /caducado|futura/i.test(error.message) ? "Datos orbitales caducados: actualiza la lista"
            : `Datos orbitales no validos: ${error.message}`;
          const item = el("li", {}, el("span", { class: "sat-expired-name", text: `${entry?.name ?? "?"} (NORAD ${entry?.norad ?? "?"})` }), " ",
            el("span", { text: reason }));
          ui.expired.append(item);
        }
      }
      ui["src-name"].textContent = label;
      ui["src-date"].textContent = `Lista de satelites del ${new Date(file.fetchedAt).toLocaleString(doc.documentElement.lang || "es")}`;
      ui["src-age"].textContent = `Antiguedad: ${ageText(file.fetchedAt, now)}`;
      ui["src-attr"].replaceChildren(file.attribution, " ", el("a", { href: file.license, rel: "noopener noreferrer", text: "Licencia" }));
      const warning = R.satelliteAgeWarning(file, now);
      if (warning) ui["src-msg"].textContent = warning;
      setupSummary();
      renderChecks();
      recompute();
    });

    if (!state.station) recompute();
    doc.getElementById("sat-setup").open = !state.station || root.location.hash === "#ubicacion";
    setupSummary();
    if (root.location.hash === "#ubicacion") ui["station-form"].closest("section").scrollIntoView();
  }

  function start() {
    const main = doc.getElementById("main");
    if (main) { mount(main); return true; }
    return false;
  }
  function boot() {
    if (start()) return;
    const observer = new root.MutationObserver(() => { if (start()) observer.disconnect(); });
    observer.observe(doc.documentElement, { childList: true, subtree: true });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
})(globalThis);
