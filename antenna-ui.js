(function (root) {
  "use strict";
  const core = root.AntennaCore;
  const doc = root.document;
  if (!doc || !core || !root.RadioWorkspace) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const STORE_KEY = "bricohams.antenna.design";
  const ROW_FIELDS = ["x1", "y1", "z1", "x2", "y2", "z2", "radius", "segments"];
  const ROW_LABELS = ["x1 (m)", "y1 (m)", "z1 (m)", "x2 (m)", "y2 (m)", "z2 (m)", "Radio (m)", "Segmentos"];
  const state = { design: null, sweep: [], measured: null, pattern: null, view: { az: 35, el: 25 }, traps: [] };

  const TEMPLATE = `
<div class="ant-page">
  <header class="ant-head">
    <h1>Antenas</h1>
    <p class="ant-lead">Disenador y analizador de antenas de hilo para HF y VHF. Los calculos se hacen en este navegador.</p>
    <p class="ant-warning" role="note">Solo simulacion: conductores perfectos, sin suelo con perdidas. Comprueba la antena con un analizador antes de transmitir y no transmitas nunca sin una antena o carga adaptada.</p>
  </header>
  <div id="ant-status" class="ant-status" role="status" aria-live="polite"></div>

  <section class="ant-card" aria-labelledby="ant-radio-title">
    <h2 id="ant-radio-title">Radio y bandas</h2>
    <div class="ant-fields">
      <div class="ant-field"><label for="ant-radio">Radio</label><select id="ant-radio"></select></div>
      <div class="ant-field"><label for="ant-band">Banda</label><select id="ant-band"></select></div>
    </div>
    <p id="ant-band-note" class="ant-hint" aria-live="polite"></p>
  </section>

  <section class="ant-card" aria-labelledby="ant-tpl-title">
    <h2 id="ant-tpl-title">Plantilla</h2>
    <div class="ant-fields">
      <div class="ant-field"><label for="ant-template">Tipo de antena</label>
        <select id="ant-template"><option value="dipole">Dipolo de media onda</option><option value="invertedv">V invertida</option><option value="trap">Dipolo multibanda con trampas</option></select></div>
      <div class="ant-field"><label for="ant-f">Frecuencia (MHz)</label><input id="ant-f" type="number" step="any" min="0.1" value="14.2"></div>
      <div class="ant-field"><label for="ant-height">Altura sobre el suelo (m)</label><input id="ant-height" type="number" step="any" min="0.1" value="10"></div>
      <div class="ant-field"><label for="ant-z0">Impedancia de referencia (ohm)</label><input id="ant-z0" type="number" step="any" min="1" value="50"></div>
      <div class="ant-field"><label for="ant-radius">Radio del hilo (mm)</label><input id="ant-radius" type="number" step="any" min="0.01" value="1"></div>
      <div class="ant-field ant-check"><input id="ant-ground" type="checkbox"><label for="ant-ground">Tierra perfecta (sin perdidas del suelo)</label></div>
    </div>
    <div class="ant-fields" id="ant-trap-fields" hidden>
      <div class="ant-field"><label for="ant-trap-bands">Bandas (MHz, de 2 a 5, separadas por comas)</label><input id="ant-trap-bands" value="14.2, 7.1"></div>
      <div class="ant-field"><label for="ant-trap-mode">Fijar en las trampas</label>
        <select id="ant-trap-mode"><option value="C">Condensador C (calcula L)</option><option value="L">Bobina L (calcula C)</option></select></div>
      <div class="ant-field"><label for="ant-trap-value">Valor fijado (pF o uH)</label><input id="ant-trap-value" type="number" step="any" min="0.001" value="100"></div>
      <div class="ant-field"><label for="ant-trap-q">Q de la bobina (0 = sin perdidas)</label><input id="ant-trap-q" type="number" step="any" min="0" value="0"></div>
    </div>
    <div class="ant-row"><button type="button" id="ant-make" class="ant-btn ant-btn-primary">Crear plantilla</button></div>
    <p id="ant-trap-summary" class="ant-hint" aria-live="polite"></p>
  </section>

  <section class="ant-card" aria-labelledby="ant-wires-title">
    <h2 id="ant-wires-title">Hilos y cargas</h2>
    <div class="ant-scroll"><table class="ant-table" id="ant-wire-table"><caption>Tabla de hilos</caption><thead><tr><th scope="col">N.</th><th scope="col">x1 (m)</th><th scope="col">y1 (m)</th><th scope="col">z1 (m)</th><th scope="col">x2 (m)</th><th scope="col">y2 (m)</th><th scope="col">z2 (m)</th><th scope="col">Radio (m)</th><th scope="col">Segmentos</th><th scope="col">Accion</th></tr></thead><tbody></tbody></table></div>
    <div class="ant-row"><button type="button" id="ant-add-wire" class="ant-btn">Anadir hilo</button></div>
    <div class="ant-fields">
      <div class="ant-field"><label for="ant-feed-row">Hilo de alimentacion</label><input id="ant-feed-row" type="number" min="1" step="1" value="1"></div>
      <div class="ant-field"><label for="ant-feed-pos">Posicion de la alimentacion (0 a 1)</label><input id="ant-feed-pos" type="number" min="0" max="1" step="any" value="0.5"></div>
    </div>
    <div class="ant-scroll"><table class="ant-table" id="ant-load-table"><caption>Tabla de cargas</caption><thead><tr><th scope="col">Hilo</th><th scope="col">Posicion</th><th scope="col">Tipo</th><th scope="col">R (ohm)</th><th scope="col">L (uH)</th><th scope="col">C (pF)</th><th scope="col">Accion</th></tr></thead><tbody></tbody></table></div>
    <div class="ant-row"><button type="button" id="ant-add-load" class="ant-btn">Anadir carga</button></div>
    <p id="ant-dims" class="ant-hint" aria-live="polite"></p>
  </section>

  <section class="ant-card" aria-labelledby="ant-geo-title">
    <h2 id="ant-geo-title">Geometria</h2>
    <div class="ant-fields">
      <div class="ant-field"><label for="ant-geo-mode">Vista</label><select id="ant-geo-mode"><option value="3d">3D</option><option value="top">2D planta (XY)</option><option value="side">2D alzado (XZ)</option></select></div>
      <div class="ant-field"><label for="ant-geo-az">Giro (grados)</label><input id="ant-geo-az" type="range" min="0" max="360" value="35"></div>
      <div class="ant-field"><label for="ant-geo-el">Elevacion de la vista (grados)</label><input id="ant-geo-el" type="range" min="0" max="90" value="25"></div>
    </div>
    <div id="ant-geo" class="ant-chart"></div>
    <p id="ant-geo-text" class="ant-hint"></p>
  </section>

  <section class="ant-card" aria-labelledby="ant-analysis-title">
    <h2 id="ant-analysis-title">Analisis</h2>
    <div class="ant-fields">
      <div class="ant-field"><label for="ant-fmin">Frecuencia inicial (MHz)</label><input id="ant-fmin" type="number" step="any" min="0.1" value="13.5"></div>
      <div class="ant-field"><label for="ant-fmax">Frecuencia final (MHz)</label><input id="ant-fmax" type="number" step="any" min="0.1" value="15"></div>
      <div class="ant-field"><label for="ant-fn">Puntos</label><input id="ant-fn" type="number" step="1" min="3" max="201" value="31"></div>
      <div class="ant-field"><label for="ant-tune-mode">Ajuste automatico</label><select id="ant-tune-mode"><option value="global">Escala global</option><option value="perRow">Escala por hilo</option></select></div>
    </div>
    <div class="ant-row">
      <button type="button" id="ant-run-sweep" class="ant-btn ant-btn-primary">Calcular barrido</button>
      <button type="button" id="ant-run-tune" class="ant-btn">Ajustar a SWR minimo</button>
      <button type="button" id="ant-run-pattern" class="ant-btn">Calcular radiacion</button>
    </div>
    <progress id="ant-progress" max="1" value="0" aria-label="Progreso del calculo" hidden></progress>
    <div id="ant-results" class="ant-results" aria-live="polite"></div>
    <div class="ant-grid">
      <figure><div id="ant-swr" class="ant-chart"></div><figcaption id="ant-swr-text">Curva de SWR: sin datos.</figcaption></figure>
      <figure><div id="ant-rx" class="ant-chart"></div><figcaption id="ant-rx-text">Resistencia y reactancia: sin datos.</figcaption></figure>
      <figure><div id="ant-smith" class="ant-chart"></div><figcaption id="ant-smith-text">Carta de Smith: sin datos.</figcaption></figure>
    </div>
  </section>

  <section class="ant-card" aria-labelledby="ant-rad-title">
    <h2 id="ant-rad-title">Radiacion</h2>
    <div id="ant-gain" class="ant-results" aria-live="polite">Sin calcular.</div>
    <div class="ant-grid">
      <figure><div id="ant-az" class="ant-chart"></div><figcaption id="ant-az-text">Corte en azimut: sin datos.</figcaption></figure>
      <figure><div id="ant-el" class="ant-chart"></div><figcaption id="ant-el-text">Corte en elevacion: sin datos.</figcaption></figure>
      <figure><div id="ant-3d" class="ant-chart"></div><figcaption id="ant-3d-text">Diagrama 3D: sin datos.</figcaption></figure>
    </div>
  </section>

  <section class="ant-card" aria-labelledby="ant-match-title">
    <h2 id="ant-match-title">Adaptacion y coaxial</h2>
    <div class="ant-fields">
      <div class="ant-field"><label for="ant-xfmr">Balun o unun</label><select id="ant-xfmr"><option value="1">1:1</option><option value="2">1:2</option><option value="4">1:4</option><option value="6">1:6</option><option value="9">1:9</option></select></div>
      <div class="ant-field"><label for="ant-vf">Factor de velocidad</label><input id="ant-vf" type="number" step="any" min="0.1" max="1" value="0.66"></div>
      <div class="ant-field"><label for="ant-loss">Perdida (dB por 100 m)</label><input id="ant-loss" type="number" step="any" min="0" value="0"></div>
      <div class="ant-field"><label for="ant-len">Longitud del coaxial (m)</label><input id="ant-len" type="number" step="any" min="0" value="10"></div>
      <div class="ant-field"><label for="ant-zc">Impedancia del coaxial (ohm)</label><input id="ant-zc" type="number" step="any" min="1" value="50"></div>
    </div>
    <div class="ant-row"><button type="button" id="ant-run-match" class="ant-btn">Calcular adaptacion</button></div>
    <div id="ant-match" class="ant-results" aria-live="polite"></div>
  </section>

  <section class="ant-card" aria-labelledby="ant-meas-title">
    <h2 id="ant-meas-title">Medida</h2>
    <div class="ant-fields">
      <div class="ant-field"><label for="ant-csv">Importar medida (CSV)</label><input id="ant-csv" type="file" accept=".csv,.txt,text/csv,text/plain"></div>
    </div>
    <div id="ant-meas" class="ant-results" aria-live="polite">Sin medida importada.</div>
    <h3>Medir SWR desde la radio</h3>
    <p class="ant-hint" role="note">La aplicacion nunca pone la radio en transmision: transmite tu y la aplicacion solo lee el medidor mientras la radio indique TX. Nunca transmitas sin una carga adaptada o una antena.</p>
    <div class="ant-row">
      <button type="button" id="ant-swr-serial" class="ant-btn">Conectar FTX-1 por Web Serial</button>
      <button type="button" id="ant-swr-start" class="ant-btn">Iniciar medida de SWR</button>
      <button type="button" id="ant-swr-stop" class="ant-btn ant-btn-danger" disabled>Parar medida de SWR</button>
      <button type="button" id="ant-swr-clear" class="ant-btn ant-btn-danger">Borrar puntos de SWR</button>
    </div>
    <div id="ant-swr-live" class="ant-results" aria-live="polite">Medida de SWR parada.</div>
  </section>

  <section class="ant-card" aria-labelledby="ant-adv-title">
    <h2 id="ant-adv-title">Asesor de antena</h2>
    <p class="ant-hint">Cada sugerencia indica el numero calculado del que parte.</p>
    <div class="ant-row"><button type="button" id="ant-run-adv" class="ant-btn">Revisar el diseno</button></div>
    <ul id="ant-advice" class="ant-advice" aria-live="polite"></ul>
  </section>
</div>`;

  const $ = id => doc.getElementById(id);
  const num = id => Number($(id).value);
  const el = (tag, attrs = {}, text) => {
    const node = doc.createElementNS(SVG_NS, tag);
    for (const key of Object.keys(attrs)) node.setAttribute(key, attrs[key]);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const fmt = (v, d = 2) => Number.isFinite(v) ? v.toFixed(d) : (v === Infinity ? "∞" : "inf");
  const status = text => { $("ant-status").textContent = text; };
  const mhz = hz => fmt(hz / 1e6, 4);

  // ----------------------------------------------------------- generic SVG helpers
  function svgRoot(w, h, label) {
    return el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": label, class: "ant-svg" });
  }
  function put(id, svg) { const host = $(id); host.replaceChildren(svg); }
  function plot(id, label, series, opts) {
    const W = 420, H = 260, m = { l: 46, r: 12, t: 12, b: 34 };
    const svg = svgRoot(W, H, label);
    const all = series.flatMap(s => s.points).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (!all.length) { svg.appendChild(el("text", { x: 20, y: 40, class: "ant-axis" }, "-")); put(id, svg); return; }
    let x0 = Math.min(...all.map(p => p[0])), x1 = Math.max(...all.map(p => p[0]));
    let y0 = opts.y0 ?? Math.min(...all.map(p => p[1])), y1 = opts.y1 ?? Math.max(...all.map(p => p[1]));
    if (x1 === x0) x1 = x0 + 1;
    if (y1 === y0) y1 = y0 + 1;
    const X = v => m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r);
    const Y = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
    svg.appendChild(el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, class: "ant-frame" }));
    for (let i = 0; i <= 4; i++) {
      const yv = y0 + (y1 - y0) * i / 4, xv = x0 + (x1 - x0) * i / 4;
      svg.appendChild(el("text", { x: m.l - 4, y: Y(yv) + 3, "text-anchor": "end", class: "ant-axis" }, fmt(yv, y1 - y0 < 10 ? 1 : 0)));
      svg.appendChild(el("text", { x: X(xv), y: H - m.b + 14, "text-anchor": "middle", class: "ant-axis" }, fmt(xv, 2)));
    }
    svg.appendChild(el("text", { x: W / 2, y: H - 4, "text-anchor": "middle", class: "ant-axis" }, opts.xLabel));
    series.forEach((s, i) => {
      const d = s.points.filter(p => Number.isFinite(p[1])).map((p, k) => `${k ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(Math.min(Math.max(p[1], y0), y1)).toFixed(1)}`).join("");
      svg.appendChild(el("path", { d, class: `ant-line ant-line-${s.cls || i}`, fill: "none" }));
    });
    (opts.marks || []).forEach(mark => svg.appendChild(el("circle", { cx: X(mark[0]), cy: Y(mark[1]), r: 4, class: "ant-mark" })));
    put(id, svg);
  }

  function polar(id, label, points, floor, peak) {
    const S = 260, c = S / 2, r0 = 108;
    const svg = svgRoot(S, S, label);
    [0.25, 0.5, 0.75, 1].forEach(f => svg.appendChild(el("circle", { cx: c, cy: c, r: r0 * f, class: "ant-grid-line", fill: "none" })));
    svg.appendChild(el("text", { x: c + 3, y: c - r0 - 2, class: "ant-axis" }, `${fmt(peak, 1)} dBi`));
    const radius = g => r0 * Math.max(0, (g - floor) / (peak - floor || 1));
    const d = points.map((p, i) => {
      const a = p.angle * Math.PI / 180;
      return `${i ? "L" : "M"}${(c + radius(p.gain) * Math.sin(a)).toFixed(1)},${(c - radius(p.gain) * Math.cos(a)).toFixed(1)}`;
    }).join("") + "Z";
    svg.appendChild(el("path", { d, class: "ant-line ant-line-0", fill: "none" }));
    put(id, svg);
  }

  function project(p, az, el0) {
    const a = az * Math.PI / 180, e = el0 * Math.PI / 180;
    const x = p[0] * Math.cos(a) - p[1] * Math.sin(a), y = p[0] * Math.sin(a) + p[1] * Math.cos(a);
    return [x, p[2] * Math.cos(e) - y * Math.sin(e), y * Math.cos(e) + p[2] * Math.sin(e)];
  }

  // ----------------------------------------------------------- geometry
  function drawGeometry() {
    const design = state.design;
    const mode = $("ant-geo-mode").value;
    const az = num("ant-geo-az"), elv = num("ant-geo-el");
    const pts = design.wires.flatMap(r => [[r.x1, r.y1, r.z1], [r.x2, r.y2, r.z2]]);
    const proj = p => mode === "top" ? [p[0], p[1]] : mode === "side" ? [p[0], p[2]] : (() => { const q = project(p, az, elv); return [q[0], q[1]]; })();
    const flat = pts.map(proj);
    const W = 420, H = 300, pad = 24;
    let minX = Math.min(...flat.map(p => p[0])), maxX = Math.max(...flat.map(p => p[0]));
    let minY = Math.min(...flat.map(p => p[1])), maxY = Math.max(...flat.map(p => p[1]));
    if (design.ground && mode !== "top") minY = Math.min(minY, 0);
    const span = Math.max(maxX - minX, maxY - minY, 1e-6);
    const scale = (Math.min(W, H) - 2 * pad) / span;
    const X = v => W / 2 + (v - (minX + maxX) / 2) * scale, Y = v => H / 2 - (v - (minY + maxY) / 2) * scale;
    const svg = svgRoot(W, H, "Vista de los hilos de la antena");
    if (design.ground && mode === "side") svg.appendChild(el("line", { x1: 0, x2: W, y1: Y(0), y2: Y(0), class: "ant-ground" }));
    const currents = state.pattern ? state.pattern.currents : null;
    const peak = currents ? Math.max(...currents.flat().map(n => n.magnitude), 1e-12) : 0;
    design.wires.forEach(r => {
      const a = proj([r.x1, r.y1, r.z1]), b = proj([r.x2, r.y2, r.z2]);
      svg.appendChild(el("line", { x1: X(a[0]), y1: Y(a[1]), x2: X(b[0]), y2: Y(b[1]), class: "ant-wire" }));
    });
    if (currents) {
      // Current magnitude as a coloured stroke on top of each wire node pair (red = maximum).
      currents.forEach(nodes => {
        for (let i = 1; i < nodes.length; i++) {
          const a = proj(nodes[i - 1].p), b = proj(nodes[i].p), t = (nodes[i - 1].magnitude + nodes[i].magnitude) / 2 / peak;
          svg.appendChild(el("line", { x1: X(a[0]), y1: Y(a[1]), x2: X(b[0]), y2: Y(b[1]), class: "ant-current", stroke: `hsl(${Math.round(240 - 240 * t)},80%,45%)`, "stroke-width": 2 + 4 * t }));
        }
      });
    }
    const fp = proj(core.feedPoint(design));
    svg.appendChild(el("circle", { cx: X(fp[0]), cy: Y(fp[1]), r: 5, class: "ant-feed" }));
    put("ant-geo", svg);
    const total = design.wires.reduce((s, r) => s + core.rowLength(r), 0);
    $("ant-geo-text").textContent = `${design.wires.length} hilos, longitud total ${fmt(total, 3)} m. El punto marca la alimentacion.${currents ? " El color y el grosor indican la corriente (rojo = maxima)." : ""}`;
  }

  // ----------------------------------------------------------- tables
  function renderWires() {
    const body = $("ant-wire-table").tBodies[0];
    body.replaceChildren();
    state.design.wires.forEach((r, i) => {
      const tr = doc.createElement("tr");
      const th = doc.createElement("th"); th.scope = "row"; th.textContent = String(i + 1); tr.appendChild(th);
      ROW_FIELDS.forEach((key, k) => {
        const td = doc.createElement("td"), input = doc.createElement("input");
        input.type = "number"; input.step = "any"; input.value = r[key];
        input.setAttribute("aria-label", `${ROW_LABELS[k]}, hilo ${i + 1}`);
        input.addEventListener("change", () => { r[key] = key === "segments" ? Math.round(Number(input.value)) : Number(input.value); designChanged(); });
        td.appendChild(input); tr.appendChild(td);
      });
      const td = doc.createElement("td"), btn = doc.createElement("button");
      btn.type = "button"; btn.className = "ant-btn"; btn.textContent = "Quitar";
      btn.setAttribute("aria-label", `Quitar hilo ${i + 1}`);
      btn.addEventListener("click", () => {
        if (state.design.wires.length > 1) { state.design.wires.splice(i, 1); state.design.loads = (state.design.loads || []).filter(l => l.row !== i).map(l => ({ ...l, row: l.row > i ? l.row - 1 : l.row })); designChanged(true); }
      });
      td.appendChild(btn); tr.appendChild(td); body.appendChild(tr);
    });
    $("ant-feed-row").max = String(state.design.wires.length);
    $("ant-feed-row").value = state.design.feed.row + 1;
    $("ant-feed-pos").value = state.design.feed.position ?? 0.5;
    renderLoads();
  }
  function renderLoads() {
    const body = $("ant-load-table").tBodies[0];
    body.replaceChildren();
    (state.design.loads || []).forEach((l, i) => {
      const tr = doc.createElement("tr");
      const cell = (key, scaleBy, label) => {
        const td = doc.createElement("td"), input = doc.createElement("input");
        input.type = "number"; input.step = "any"; input.min = "0"; input.value = l[key] === undefined ? "" : l[key] * scaleBy;
        input.setAttribute("aria-label", `${label}, carga ${i + 1}`);
        input.addEventListener("change", () => { l[key] = Number(input.value) / scaleBy; designChanged(); });
        td.appendChild(input); return td;
      };
      const rowTd = doc.createElement("td"), rowIn = doc.createElement("input");
      rowIn.type = "number"; rowIn.min = "1"; rowIn.step = "1"; rowIn.value = l.row + 1; rowIn.setAttribute("aria-label", `Hilo, carga ${i + 1}`);
      rowIn.addEventListener("change", () => { l.row = Math.max(0, Math.min(state.design.wires.length - 1, Math.round(Number(rowIn.value)) - 1)); designChanged(); });
      rowTd.appendChild(rowIn); tr.appendChild(rowTd);
      const posTd = doc.createElement("td"), posIn = doc.createElement("input");
      posIn.type = "number"; posIn.min = "0"; posIn.max = "1"; posIn.step = "any"; posIn.value = l.position ?? 0.5; posIn.setAttribute("aria-label", `Posicion, carga ${i + 1}`);
      posIn.addEventListener("change", () => { l.position = Number(posIn.value); designChanged(); });
      posTd.appendChild(posIn); tr.appendChild(posTd);
      const typeTd = doc.createElement("td"), sel = doc.createElement("select");
      sel.setAttribute("aria-label", `Tipo, carga ${i + 1}`);
      [["series", "Serie"], ["parallel", "Paralelo"], ["trap", "Trampa LC"]].forEach(([v, t]) => { const o = doc.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); });
      sel.value = l.type || "series";
      sel.addEventListener("change", () => { l.type = sel.value; designChanged(); });
      typeTd.appendChild(sel); tr.appendChild(typeTd);
      tr.appendChild(cell("R", 1, "R")); tr.appendChild(cell("L", 1e6, "L")); tr.appendChild(cell("C", 1e12, "C"));
      const td = doc.createElement("td"), btn = doc.createElement("button");
      btn.type = "button"; btn.className = "ant-btn"; btn.textContent = "Quitar"; btn.setAttribute("aria-label", `Quitar carga ${i + 1}`);
      btn.addEventListener("click", () => { state.design.loads.splice(i, 1); designChanged(true); });
      td.appendChild(btn); tr.appendChild(td); body.appendChild(tr);
    });
  }

  function designChanged(rerender) {
    state.sweep = []; state.pattern = null;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.design)); } catch (error) { /* storage unavailable */ }
    if (rerender) renderWires();
    refreshDims();
    drawGeometry();
  }
  function refreshDims() {
    const d = state.design;
    try {
      const warnings = core.validateDesign(d);
      const built = core.buildFromDesign(d, num("ant-f") * 1e6);
      const lambda = core.C0 / (num("ant-f") * 1e6);
      const total = d.wires.reduce((s, r) => s + core.rowLength(r), 0);
      $("ant-dims").textContent = `Longitud total ${fmt(total, 3)} m (${fmt(total / lambda, 3)} longitudes de onda a ${fmt(num("ant-f"), 3)} MHz). Incognitas del modelo: ${built.unknowns} de ${core.MAX_UNKNOWNS}. ${warnings.join(" ")}`;
    } catch (error) {
      $("ant-dims").textContent = error.message;
    }
  }

  // ----------------------------------------------------------- radio and bands
  function fillRadios() {
    const sel = $("ant-radio");
    const none = doc.createElement("option"); none.value = ""; none.textContent = "Elige una radio"; sel.appendChild(none);
    core.RADIO_PROFILES.forEach(p => { const o = doc.createElement("option"); o.value = p.id; o.textContent = p.label; sel.appendChild(o); });
    sel.addEventListener("change", fillBands);
    $("ant-band").addEventListener("change", () => {
      const band = currentBand();
      if (band) {
        $("ant-f").value = (band.centerHz / 1e6).toFixed(4);
        $("ant-fmin").value = (band.lowHz / 1e6).toFixed(4);
        $("ant-fmax").value = (band.highHz / 1e6).toFixed(4);
      }
    });
    fillBands();
  }
  let bandList = [];
  function currentBand() { return bandList.find(b => b.id === $("ant-band").value) || null; }
  function fillBands() {
    const info = core.bandsForRadio($("ant-radio").value);
    const sel = $("ant-band");
    sel.replaceChildren();
    bandList = info.bands;
    const first = doc.createElement("option"); first.value = ""; first.textContent = "Sin banda"; sel.appendChild(first);
    info.bands.forEach(b => { const o = doc.createElement("option"); o.value = b.id; o.textContent = `${b.label} (${mhz(b.lowHz)}-${mhz(b.highHz)} MHz)`; sel.appendChild(o); });
    const note = $("ant-band-note");
    if (info.status === "none") note.textContent = "Elige una radio para limitar las bandas a las que puede transmitir.";
    else if (info.status === "pending") note.textContent = "Bandas de TX: pendiente de fuente.";
    else note.textContent = `Bandas de TX segun ${info.source}. Comprueba siempre tu licencia y el plan de bandas de tu pais.`;
  }

  // ----------------------------------------------------------- templates
  function makeTemplate() {
    const type = $("ant-template").value;
    const common = { f: num("ant-f") * 1e6, height: num("ant-height"), radius: num("ant-radius") / 1000, ground: $("ant-ground").checked, z0: num("ant-z0") };
    try {
      let design;
      state.traps = [];
      $("ant-trap-summary").textContent = "";
      if (type === "dipole") design = core.dipoleTemplate(common);
      else if (type === "invertedv") design = core.invertedVTemplate(common);
      else {
        const bands = $("ant-trap-bands").value.split(/[;,\s]+/).filter(Boolean).map(v => Number(v.replace(",", ".")) * 1e6);
        const value = num("ant-trap-value"), byC = $("ant-trap-mode").value === "C";
        design = core.trapDipoleTemplate({ ...common, bandsHz: bands, capacitanceF: byC ? value * 1e-12 : undefined, inductanceH: byC ? undefined : value * 1e-6, Q: num("ant-trap-q") });
        state.traps = design.traps;
        $("ant-trap-summary").textContent = design.traps.map(t => `${mhz(t.f)} MHz: L = ${fmt(t.L * 1e6, 3)} uH, C = ${fmt(t.C * 1e12, 1)} pF`).join("; ");
      }
      state.design = design;
      $("ant-z0").value = design.z0;
      renderWires(); designChanged();
      status("Plantilla creada. Calcula el barrido para ver el SWR.");
    } catch (error) { status(error.message); }
  }

  // ----------------------------------------------------------- compute (worker with synchronous fallback)
  let worker = null, workerBroken = false, jobId = 0;
  function runJob(type, payload, onProgress) {
    return new Promise((resolve, reject) => {
      const local = () => { try { resolve(localJob(type, payload, onProgress)); } catch (error) { reject(error); } };
      if (workerBroken || typeof root.Worker !== "function") { root.setTimeout(local, 0); return; }
      try { worker = worker || new root.Worker("antenna-worker.js"); } catch (error) { workerBroken = true; root.setTimeout(local, 0); return; }
      const id = ++jobId;
      const onMessage = event => {
        if (event.data.id !== id) return;
        if (event.data.progress !== undefined) { if (onProgress) onProgress(event.data.progress); return; }
        worker.removeEventListener("message", onMessage);
        if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data.result);
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", () => { workerBroken = true; worker.removeEventListener("message", onMessage); root.setTimeout(local, 0); }, { once: true });
      worker.postMessage({ id, type, payload });
    });
  }
  function localJob(type, payload, onProgress) {
    if (type === "sweep") return core.sweep(payload.design, payload.frequencies, { z0: payload.z0, onProgress: (d, t) => onProgress && onProgress(d / t) });
    if (type === "tune") return core.autoTune(payload.design, payload.options);
    return core.computePattern(payload.design, payload.f, payload.options);
  }
  function busy(on) {
    $("ant-progress").hidden = !on;
    if (!on) $("ant-progress").value = 0;
    for (const id of ["ant-run-sweep", "ant-run-tune", "ant-run-pattern", "ant-make"]) $(id).disabled = on;
  }
  async function withBusy(message, job) {
    status(message); busy(true);
    try { await job(); } catch (error) { status(error.message); } finally { busy(false); }
  }

  function readFeedFields() {
    state.design.feed.row = Math.max(0, Math.min(state.design.wires.length - 1, Math.round(num("ant-feed-row")) - 1));
    state.design.feed.position = Math.max(0, Math.min(1, num("ant-feed-pos")));
    state.design.z0 = num("ant-z0");
  }

  function runSweep() {
    readFeedFields();
    return withBusy("Calculando el barrido...", async () => {
      const n = Math.max(3, Math.min(201, Math.round(num("ant-fn"))));
      const freqs = core.linspace(num("ant-fmin") * 1e6, num("ant-fmax") * 1e6, n);
      state.sweep = await runJob("sweep", { design: state.design, frequencies: freqs, z0: state.design.z0 }, p => { $("ant-progress").value = p; });
      showSweep();
      status("Barrido terminado.");
    });
  }
  function showSweep() {
    const pts = state.sweep, z0 = state.design.z0;
    if (!pts.length) return;
    const min = core.findMinimum(pts);
    const res = core.findResonances(pts);
    const cap = Math.max(...pts.map(p => Math.min(p.swr, 10)));
    plot("ant-swr", "Curva de SWR del modelo", [{ points: pts.map(p => [p.f / 1e6, Math.min(p.swr, 10)]) }].concat(state.measured ? [{ points: state.measured.points.map(p => [p.f / 1e6, Math.min(p.swr, 10)]), cls: 1 }] : []),
      { xLabel: "MHz", y0: 1, y1: Math.max(cap, 2), marks: [[min.f / 1e6, Math.min(min.swr, 10)]] });
    $("ant-swr-text").textContent = `SWR minimo ${fmt(min.swr)} en ${mhz(min.f)} MHz (referencia ${fmt(z0, 0)} ohm).${state.measured ? " Linea 2: medida." : ""}`;
    plot("ant-rx", "Resistencia y reactancia del modelo", [{ points: pts.map(p => [p.f / 1e6, p.r]) }, { points: pts.map(p => [p.f / 1e6, p.x]), cls: 1 }], { xLabel: "MHz" });
    $("ant-rx-text").textContent = `R en el minimo ${fmt(core.interpolate(pts, min.f, "r"), 1)} ohm, X ${fmt(core.interpolate(pts, min.f, "x"), 1)} ohm. ${res.length ? `Resonancia (X = 0) en ${mhz(res[0].f)} MHz.` : "X no cruza cero en el barrido."} Linea 1: R. Linea 2: X.`;
    drawSmith(pts, z0);
    $("ant-results").textContent = `SWR minimo ${fmt(min.swr)} en ${mhz(min.f)} MHz. Z = ${fmt(core.interpolate(pts, min.f, "r"), 1)} ${core.interpolate(pts, min.f, "x") < 0 ? "-" : "+"} j${fmt(Math.abs(core.interpolate(pts, min.f, "x")), 1)} ohm.`;
    if (state.measured) showMeasured();
  }
  function drawSmith(pts, z0) {
    const S = 260, c = S / 2, r0 = 112;
    const svg = svgRoot(S, S, "Carta de Smith con la impedancia del modelo");
    svg.appendChild(el("circle", { cx: c, cy: c, r: r0, class: "ant-frame", fill: "none" }));
    const grid = core.smithGrid();
    grid.resistance.forEach(g => svg.appendChild(el("circle", { cx: c + g.cx * r0, cy: c, r: g.radius * r0, class: "ant-grid-line", fill: "none" })));
    // Reactance arcs are circles centred at (1, 1/x); clip them to the unit disk.
    const clip = el("clipPath", { id: "ant-smith-clip" }); clip.appendChild(el("circle", { cx: c, cy: c, r: r0 }));
    svg.appendChild(clip);
    grid.reactance.forEach(g => svg.appendChild(el("circle", { cx: c + g.cx * r0, cy: c - g.cy * r0, r: g.radius * r0, class: "ant-grid-line", fill: "none", "clip-path": "url(#ant-smith-clip)" })));
    svg.appendChild(el("line", { x1: c - r0, x2: c + r0, y1: c, y2: c, class: "ant-grid-line" }));
    const d = pts.map((p, i) => { const s = core.smithPoint([p.r, p.x], z0); return `${i ? "L" : "M"}${(c + s.x * r0).toFixed(1)},${(c - s.y * r0).toFixed(1)}`; }).join("");
    svg.appendChild(el("path", { d, class: "ant-line ant-line-0", fill: "none" }));
    const first = core.smithPoint([pts[0].r, pts[0].x], z0);
    svg.appendChild(el("circle", { cx: c + first.x * r0, cy: c - first.y * r0, r: 3, class: "ant-mark" }));
    put("ant-smith", svg);
    const a = pts[0], b = pts[pts.length - 1];
    $("ant-smith-text").textContent = `Carta de Smith normalizada a ${fmt(z0, 0)} ohm: de ${fmt(a.f / 1e6, 3)} MHz (punto marcado, ${fmt(a.r, 1)} ${a.x < 0 ? "-" : "+"} j${fmt(Math.abs(a.x), 1)} ohm) a ${fmt(b.f / 1e6, 3)} MHz (${fmt(b.r, 1)} ${b.x < 0 ? "-" : "+"} j${fmt(Math.abs(b.x), 1)} ohm).`;
  }

  function runTune() {
    readFeedFields();
    return withBusy("Ajustando las dimensiones...", async () => {
      const f0 = num("ant-f") * 1e6;
      const result = await runJob("tune", { design: state.design, options: { f0, z0: state.design.z0, mode: $("ant-tune-mode").value, iterations: 60 } });
      state.design = result.design;
      renderWires(); designChanged();
      $("ant-results").textContent = `Ajuste terminado: SWR ${fmt(result.startSwr)} -> ${fmt(result.swr)} a ${fmt(f0 / 1e6, 4)} MHz con ${result.evaluations} evaluaciones. Factores de escala: ${result.factors.map(v => fmt(v, 4)).join(", ")}.`;
      status("Ajuste terminado.");
    });
  }

  function runPattern() {
    readFeedFields();
    return withBusy("Calculando la radiacion...", async () => {
      const f0 = num("ant-f") * 1e6;
      const p = await runJob("pattern", { design: state.design, f: f0, options: { z0: state.design.z0 } });
      state.pattern = p;
      $("ant-gain").textContent = `Ganancia maxima ${fmt(p.peak.gainDbi)} dBi (theta ${fmt(p.peak.thetaDeg, 0)} grados desde el cenit, azimut ${fmt(p.peak.phiDeg, 0)} grados), referida a la potencia de entrada. Z = ${fmt(p.z[0], 1)} ${p.z[1] < 0 ? "-" : "+"} j${fmt(Math.abs(p.z[1]), 1)} ohm.`;
      polar("ant-az", "Corte del diagrama en azimut", p.azimuth, p.floor, p.peak.gainDbi);
      $("ant-az-text").textContent = `Corte en azimut a ${fmt(90 - p.cutThetaDeg, 0)} grados de elevacion. Maximo ${fmt(Math.max(...p.azimuth.map(v => v.gain)), 1)} dBi.`;
      polar("ant-el", "Corte del diagrama en elevacion", p.elevation, p.floor, p.peak.gainDbi);
      $("ant-el-text").textContent = `Corte en elevacion en el azimut del maximo (${fmt(p.peak.phiDeg, 0)} grados). El angulo se mide desde el cenit.`;
      drawPattern3d();
      drawGeometry();
      status("Radiacion calculada.");
    });
  }
  function drawPattern3d() {
    const p = state.pattern; if (!p) return;
    const S = 260, c = S / 2, r0 = 100, az = num("ant-geo-az"), elv = num("ant-geo-el");
    const svg = svgRoot(S, S, "Diagrama de radiacion 3D");
    const radius = g => Math.max(0, (g - p.floor) / (p.peak.gainDbi - p.floor || 1));
    const point = (i, j) => {
      const th = Math.PI * i / (p.thetaCount - 1), ph = 2 * Math.PI * (j % p.phiCount) / p.phiCount, r = radius(p.grid[i][j % p.phiCount]);
      const q = project([r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph), r * Math.cos(th)], az, elv);
      return [c + q[0] * r0, c - q[1] * r0];
    };
    for (let i = 0; i < p.thetaCount; i += 2) svg.appendChild(el("path", { d: Array.from({ length: p.phiCount + 1 }, (_, j) => { const q = point(i, j); return `${j ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`; }).join(""), class: "ant-line ant-line-0", fill: "none" }));
    for (let j = 0; j < p.phiCount; j += 2) svg.appendChild(el("path", { d: Array.from({ length: p.thetaCount }, (_, i) => { const q = point(i, j); return `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`; }).join(""), class: "ant-line ant-line-1", fill: "none" }));
    put("ant-3d", svg);
    $("ant-3d-text").textContent = `Diagrama 3D normalizado: radio proporcional a la ganancia desde ${fmt(p.floor, 0)} dBi hasta ${fmt(p.peak.gainDbi, 1)} dBi. Usa los controles de giro y elevacion.`;
  }

  // ----------------------------------------------------------- matching and coax
  function runMatch() {
    const out = $("ant-match");
    if (!state.sweep.length) { out.textContent = "Calcula primero el barrido."; return; }
    const f0 = num("ant-f") * 1e6;
    const r = core.interpolate(state.sweep, f0, "r"), x = core.interpolate(state.sweep, f0, "x");
    if (r === null) { out.textContent = "La frecuencia de la plantilla esta fuera del barrido."; return; }
    const z0 = state.design.z0, ratio = Number(num("ant-xfmr"));
    const lines = [];
    const zt = core.transformImpedance([r, x], ratio);
    lines.push(`Antena a ${mhz(f0)} MHz: ${fmt(r, 1)} ${x < 0 ? "-" : "+"} j${fmt(Math.abs(x), 1)} ohm (SWR ${fmt(core.swrFromZ([r, x], z0))}).`);
    lines.push(`Con el transformador 1:${ratio}: ${fmt(zt[0], 1)} ${zt[1] < 0 ? "-" : "+"} j${fmt(Math.abs(zt[1]), 1)} ohm (SWR ${fmt(core.swrFromZ(zt, z0))}).`);
    const best = core.bestTransformer(r, z0);
    lines.push(`Mejor relacion para R = ${fmt(r, 1)} ohm: 1:${best.ratio}${best.inverted ? " (invertido)" : ""}, R resultante ${fmt(best.resistance, 1)} ohm.`);
    const nets = core.lNetwork([r, x], z0, f0);
    if (!nets.length) lines.push("No hay red L con esta topologia para esta carga.");
    nets.forEach((n, i) => {
      const check = core.lNetworkInput(n, [r, x], z0, f0);
      lines.push(`Red L ${i + 1} (${n.topology === "shuntLoad" ? "paralelo en la carga y serie hacia la fuente" : "serie en la carga y paralelo hacia la fuente"}): serie ${n.series.kind} = ${fmt(n.series.kind === "L" ? n.series.value * 1e6 : n.series.value * 1e12, 3)} ${n.series.kind === "L" ? "uH" : "pF"}, paralelo ${n.shunt.kind} = ${fmt(n.shunt.kind === "L" ? n.shunt.value * 1e6 : n.shunt.value * 1e12, 3)} ${n.shunt.kind === "L" ? "uH" : "pF"}; comprobacion: ${fmt(check[0], 2)} ohm.`);
    });
    const coax = { z0: num("ant-zc"), lengthM: num("ant-len"), velocityFactor: num("ant-vf"), lossDbPer100m: num("ant-loss"), f: f0 };
    const zin = core.coaxInput(zt, coax);
    lines.push(`Impedancia en el extremo de la radio (${fmt(coax.lengthM, 1)} m, FV ${fmt(coax.velocityFactor, 2)}): ${fmt(zin[0], 1)} ${zin[1] < 0 ? "-" : "+"} j${fmt(Math.abs(zin[1]), 1)} ohm; perdida adaptada ${fmt(core.coaxMatchedLossDb(coax.lengthM, coax.lossDbPer100m), 2)} dB.`);
    out.replaceChildren(...lines.map(t => { const p = doc.createElement("p"); p.textContent = t; return p; }));
  }

  // ----------------------------------------------------------- measurement
  function importCsv(file) {
    const reader = new root.FileReader();
    reader.onload = () => importCsvText(String(reader.result));
    reader.readAsText(file);
  }
  function importCsvText(text) {
    const parsed = core.parseMeasurementCsv(text, { z0: state.design.z0 });
    const out = $("ant-meas");
    if (!parsed.points.length) { out.textContent = parsed.errors.join(" ") || "No se pudo leer la medida."; return; }
    state.measured = parsed;
    out.textContent = `${parsed.points.length} puntos leidos (unidad ${parsed.info.unit}, separador "${parsed.info.separator}"${parsed.info.decimalComma ? ", coma decimal" : ""}).${parsed.errors.length ? ` ${parsed.errors.length} lineas ignoradas.` : ""}`;
    if (state.sweep.length) showSweep(); else showMeasured();
  }

  // ----------------------------------------------------------- SWR measured via CAT (read-only; the operator keys the radio)
  const live = { logger: core.createSwrLogger(), timer: null, busy: false, serial: null };
  function setLiveText(text) { $("ant-swr-live").textContent = text; }
  // sample: { running, connected, ptt, radioId, freqHz, swr, source } as served by GET /api/remote/swr or pushed by the Android app.
  function handleSwrSample(sample) {
    if (!sample || !sample.running || !sample.connected) { setLiveText("Radio no conectada."); return; }
    const meter = core.swrMeterInfo(sample.radioId);
    if (meter.status === "pending") { setLiveText("Medidor de SWR por CAT de esta radio: pendiente de fuente."); return; }
    if (!sample.ptt) { setLiveText(`Esperando a que transmitas. Puntos: ${live.logger.size}.`); return; }
    const swr = sample.source === "hamlib" ? sample.swr : core.swrFromMeter(sample.radioId, sample.swr);
    if (!Number.isFinite(swr)) { setLiveText("Sin lectura de SWR valida."); return; }
    if (!live.logger.add({ freqHz: sample.freqHz, swr, tx: true })) { setLiveText("Lectura ignorada."); return; }
    state.measured = { points: live.logger.points(), info: { unit: "SWR (CAT)", separator: ",", decimalComma: false }, errors: [] };
    $("ant-meas").textContent = `${live.logger.size} puntos de SWR medidos por CAT${meter.status === "partial" ? " (calibracion aproximada)" : ""}.`;
    setLiveText(`SWR ${fmt(swr)} en ${mhz(sample.freqHz)} MHz. Puntos: ${live.logger.size}.`);
    if (state.sweep.length) showSweep(); else showMeasured();
  }
  async function pollSwr() {
    if (live.busy) return;
    live.busy = true;
    try {
      if (live.serial) {
        const reading = await live.serial.session.readSwrSample();
        handleSwrSample({ running: true, connected: true, ptt: reading.tx, radioId: "ftx1", freqHz: reading.freqHz, swr: reading.meter, source: "raw" });
      } else {
        const response = await root.fetch("api/remote/swr", { cache: "no-store" });
        handleSwrSample(response.ok ? await response.json() : null);
      }
    } catch (error) { setLiveText(live.serial ? "No se pudo leer el FTX-1 por Web Serial." : "No se pudo leer la estacion remota."); } finally { live.busy = false; }
  }
  // Desktop Web Serial path: the FTX-1 page transport (transports.js + ftx1-core.js); reads only (TX; FA; RM6;), never PTT.
  async function disconnectSerial() {
    const serial = live.serial;
    live.serial = null;
    $("ant-swr-serial").textContent = "Conectar FTX-1 por Web Serial";
    if (serial) { try { await serial.port.close(); } catch (error) { /* already closed */ } }
  }
  async function toggleSerial() {
    if (live.serial) { stopSwr(); await disconnectSerial(); setLiveText("Conexion Web Serial cerrada."); return; }
    const R = root.RadioWorkspace;
    if (!root.navigator || !root.navigator.serial || !R.SerialTransport || !R.Ftx1Cat) { setLiveText("Web Serial no disponible en este navegador."); return; }
    const port = new R.SerialTransport();
    try {
      await port.open(38400, [{ usbVendorId: 0x10c4 }], { lowControlLines: true });
      const session = new R.Ftx1Cat(port);
      await session.connect();
      port.onDisconnect = () => { if (live.serial && live.serial.port === port) { stopSwr(); live.serial = null; $("ant-swr-serial").textContent = "Conectar FTX-1 por Web Serial"; setLiveText("Conexion Web Serial cerrada."); } };
      live.serial = { port, session };
      $("ant-swr-serial").textContent = "Desconectar Web Serial";
      setLiveText("Conectado por Web Serial al FTX-1 (solo lectura).");
    } catch (error) {
      try { await port.close(); } catch (cleanup) { /* the original error is the useful one */ }
      setLiveText(error && error.message ? error.message : "No se pudo leer el FTX-1 por Web Serial.");
    }
  }
  function startSwr() {
    if (live.timer) return;
    live.timer = root.setInterval(pollSwr, 1000);
    $("ant-swr-start").disabled = true; $("ant-swr-stop").disabled = false;
    pollSwr();
  }
  function stopSwr() {
    if (live.timer) root.clearInterval(live.timer);
    live.timer = null;
    $("ant-swr-start").disabled = false; $("ant-swr-stop").disabled = true;
    setLiveText("Medida de SWR parada.");
  }
  function clearSwr() {
    live.logger.clear();
    setLiveText("Puntos de SWR borrados.");
  }
  // Hooks for the Android WebView: the native side polls the rig and pushes samples; the page never calls the radio itself.
  root.AntennaMeasure = { addSample: handleSwrSample, importCsvText, setStatus: setLiveText };
  function showMeasured() {
    const m = state.measured; if (!m) return;
    const out = $("ant-meas");
    const base = out.textContent.split(" Minimo")[0];
    if (!state.sweep.length) {
      plot("ant-swr", "Curva de SWR medida", [{ points: m.points.map(p => [p.f / 1e6, Math.min(p.swr, 10)]) }], { xLabel: "MHz", y0: 1 });
      $("ant-swr-text").textContent = "SWR medido.";
      return;
    }
    const cmp = core.compareMeasured(state.sweep, m.points);
    out.textContent = `${base} Minimo del modelo ${fmt(cmp.modelSwr)} en ${mhz(cmp.modelF)} MHz; minimo medido ${fmt(cmp.measuredSwr)} en ${mhz(cmp.measuredF)} MHz; desplazamiento ${fmt(cmp.shiftHz / 1e3, 1)} kHz.`;
  }

  // ----------------------------------------------------------- advisor
  function runAdvisor() {
    const list = $("ant-advice");
    if (!state.sweep.length) { list.replaceChildren(); const li = doc.createElement("li"); li.textContent = "Calcula primero el barrido."; list.appendChild(li); return; }
    const band = currentBand();
    const longest = Math.max(...state.design.wires.map(r => core.rowLength(r)));
    const items = core.advise({ points: state.sweep, z0: state.design.z0, band, f0: num("ant-f") * 1e6, armM: state.design.name === "dipole" ? longest / 2 : longest, traps: state.design.traps || state.traps });
    list.replaceChildren(...items.map(item => {
      const li = doc.createElement("li"); li.className = `ant-advice-${item.severity}`;
      const p = doc.createElement("p"); p.textContent = item.text;
      const src = doc.createElement("p"); src.className = "ant-hint";
      src.textContent = `Origen: ${item.sources.map(s => `${s.name} = ${Number(s.value).toPrecision(5)}${s.unit ? ` ${s.unit}` : ""}`).join("; ")}`;
      li.append(p, src); return li;
    }));
  }

  // ----------------------------------------------------------- mount
  function mount(main) {
    main.innerHTML = TEMPLATE;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (error) { saved = null; }
    state.design = saved && saved.wires && saved.feed ? saved : core.dipoleTemplate({ f: 14.2e6 });
    try { core.validateDesign(state.design); } catch (error) { state.design = core.dipoleTemplate({ f: 14.2e6 }); }
    fillRadios();
    renderWires(); refreshDims(); drawGeometry();
    $("ant-template").addEventListener("change", () => { $("ant-trap-fields").hidden = $("ant-template").value !== "trap"; });
    $("ant-make").addEventListener("click", makeTemplate);
    $("ant-add-wire").addEventListener("click", () => {
      const last = state.design.wires[state.design.wires.length - 1];
      state.design.wires.push({ ...last, y1: last.y2, y2: last.y2 + 1, x1: last.x2, x2: last.x2, z1: last.z2, z2: last.z2 });
      designChanged(true);
    });
    $("ant-add-load").addEventListener("click", () => { state.design.loads = state.design.loads || []; state.design.loads.push({ row: 0, position: 0.5, type: "series", R: 0, L: 0, C: 0 }); designChanged(true); });
    for (const id of ["ant-feed-row", "ant-feed-pos", "ant-z0", "ant-f"]) $(id).addEventListener("change", () => { readFeedFields(); designChanged(); });
    $("ant-ground").addEventListener("change", () => { state.design.ground = $("ant-ground").checked; designChanged(); });
    for (const id of ["ant-geo-mode", "ant-geo-az", "ant-geo-el"]) $(id).addEventListener("input", () => { drawGeometry(); drawPattern3d(); });
    $("ant-run-sweep").addEventListener("click", runSweep);
    $("ant-run-tune").addEventListener("click", runTune);
    $("ant-run-pattern").addEventListener("click", runPattern);
    $("ant-run-match").addEventListener("click", runMatch);
    $("ant-run-adv").addEventListener("click", runAdvisor);
    $("ant-csv").addEventListener("change", event => { if (event.target.files[0]) importCsv(event.target.files[0]); });
    $("ant-swr-start").addEventListener("click", startSwr);
    $("ant-swr-stop").addEventListener("click", stopSwr);
    $("ant-swr-clear").addEventListener("click", clearSwr);
    $("ant-swr-serial").addEventListener("click", toggleSerial);
    // Android WebView: file picking and the radio link are native (SAF + Rig), the page only gets the active radio id.
    const bridge = root.AndroidAntenna;
    if (bridge) {
      $("ant-csv").addEventListener("click", event => { event.preventDefault(); bridge.importCsv(); });
      for (const id of ["ant-swr-start", "ant-swr-stop", "ant-swr-serial"]) $(id).hidden = true;
      const radioId = String(bridge.activeRadioId() || "");
      if (radioId && [...$("ant-radio").options].some(o => o.value === radioId)) { $("ant-radio").value = radioId; fillBands(); }
    }
    $("ant-ground").checked = Boolean(state.design.ground);
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
