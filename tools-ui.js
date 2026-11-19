(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const doc = root.document;
  if (!doc || !R || typeof R.latLonToLocator !== "function") return;

  const STATION_KEY = "bricohams.station";
  const GEO_UNSUPPORTED = "Este navegador no ofrece geolocalizacion. Introduce latitud y longitud o tu locator.";

  function el(tag, attrs, ...children) {
    const node = doc.createElement(tag);
    for (const [name, value] of Object.entries(attrs || {})) {
      if (name === "text") node.textContent = value;
      else if (value !== false && value !== undefined) node.setAttribute(name, value === true ? "" : value);
    }
    node.append(...children);
    return node;
  }
  function readStation() {
    try {
      const station = JSON.parse(root.localStorage.getItem(STATION_KEY));
      if (station && Number.isFinite(station.latitude) && Number.isFinite(station.longitude)) return station;
    } catch { /* storage unavailable or corrupt: start empty */ }
    return null;
  }
  const num = input => {
    const text = input.value.trim().replace(",", ".");
    return text === "" ? NaN : Number(text);
  };
  const fmt = (value, digits) => Number.isFinite(value) ? value.toFixed(digits) : "∞";
  const bearingText = degrees => `${Math.round(degrees) % 360}°`;

  function show(out, rows) {
    out.replaceChildren(el("dl", { class: "tl-rows" }, ...rows.map(([label, value]) =>
      el("div", { class: "tl-stat" }, el("dt", { text: label }), el("dd", { text: value })))));
  }
  function fail(out, message) {
    out.replaceChildren(el("p", { class: "tl-error", text: message }));
  }

  // Builds one labelled form with a polite live result area; run(inputs) returns result rows or throws a Spanish message.
  function form(card, spec) {
    const inputs = {};
    const form = el("form", { novalidate: true });
    const fields = el("div", { class: "tl-fields" });
    for (const [key, label, opts = {}] of spec.fields) {
      const id = `tl-${spec.id}-${key}`;
      const input = opts.options
        ? el("select", { id }, ...opts.options.map(([value, text]) => el("option", { value, text, translate: opts.untranslated ? "no" : false })))
        : el("input", { id, type: opts.type || "number", step: opts.type ? false : "any", inputmode: opts.inputmode || (opts.type ? false : "decimal"),
          autocomplete: "off", spellcheck: opts.type === "text" ? "false" : false, maxlength: opts.maxlength || false, placeholder: opts.placeholder || false });
      if (opts.value !== undefined) input.value = String(opts.value);
      inputs[key] = input;
      fields.append(el("div", { class: "tl-field", "data-field": key }, el("label", { for: id, text: label }), input));
    }
    const out = el("div", { id: `tl-${spec.id}-out`, class: "tl-result", "aria-live": "polite" });
    const buttons = el("div", { class: "tl-row" }, ...(spec.extra || []).map(button => button(inputs, out, run)),
      el("button", { type: "submit", class: "tl-btn tl-btn-primary", text: spec.button || "Calcular" }));
    function run() {
      try { show(out, spec.run(inputs)); } catch (error) { fail(out, error.message); }
    }
    form.addEventListener("submit", event => { event.preventDefault(); run(); });
    form.append(fields, buttons, out);
    card.append(spec.heading ? el("h3", { text: spec.heading }) : "", form);
    return { form, inputs, out, run };
  }
  function section(id, title, ...intro) {
    const card = el("section", { class: "tl-card", "aria-labelledby": `tl-${id}-title` }, el("h2", { id: `tl-${id}-title`, text: title }));
    for (const text of intro) card.append(el("p", { class: "tl-hint", text }));
    return card;
  }

  // ---- Charts: inline SVG built with createElementNS; colours come from classes in tools.css (CSS custom properties). ----
  const SVG_NS = "http://www.w3.org/2000/svg";
  const LAND_URL = "data/world-land-110m.txt";
  function svg(tag, attrs, ...children) {
    const node = doc.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs || {})) if (value !== false && value !== undefined) node.setAttribute(name, String(value));
    node.append(...children);
    return node;
  }
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const p1 = value => value.toFixed(1);
  const trim = (value, digits = 2) => String(+value.toFixed(digits));
  const text = (cls, x, y, content, anchor) => svg("text", { class: cls ? `tl-txt ${cls}` : "tl-txt", x: p1(x), y: p1(y), "text-anchor": anchor }, content);
  const line = (cls, x1, y1, x2, y2) => svg("line", { class: cls, x1: p1(x1), y1: p1(y1), x2: p1(x2), y2: p1(y2) });
  function chart(box, viewBox, label, ...children) {
    box.replaceChildren(svg("svg", { class: "tl-svg", viewBox, role: "img", "aria-label": label }, ...children));
  }
  const zoneOf = swr => swr <= 1.5 ? "ok" : swr <= 2 ? "warn" : "bad";

  function landPath(data) {
    const parts = [];
    for (const row of data.split("\n").map(entry => entry.trim())) {
      if (!row || row.startsWith("#")) continue;
      const coords = row.split(" ").map(pair => pair.split(",").map(Number));
      if (coords.length < 3 || coords.some(c => c.length !== 2 || !c.every(Number.isFinite) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90)) continue;
      parts.push(`M${coords.map(([lon, lat]) => `${((lon + 180) * 2).toFixed(1)} ${((90 - lat) * 2).toFixed(1)}`).join("L")}Z`);
    }
    return parts.join("");
  }
  let landRequest;
  function loadLand() {
    landRequest = landRequest || root.fetch(LAND_URL).then(response => { if (!response.ok) throw new Error("land"); return response.text(); })
      .then(landPath).catch(() => "");
    return landRequest;
  }
  const mapXY = point => [(point.longitude + 180) * 2, (90 - point.latitude) * 2];

  // Spherical linear interpolation along the great circle; returns {latitude, longitude} points.
  function arcPoints(a, b, count = 64) {
    const rad = Math.PI / 180;
    const vector = point => [Math.cos(point.latitude * rad) * Math.cos(point.longitude * rad),
      Math.cos(point.latitude * rad) * Math.sin(point.longitude * rad), Math.sin(point.latitude * rad)];
    const va = vector(a), vb = vector(b);
    const omega = Math.acos(clamp(va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2], -1, 1));
    const sine = Math.sin(omega);
    if (sine < 1e-9) return [a, b];
    return Array.from({ length: count }, (_, index) => {
      const t = index / (count - 1);
      const wa = Math.sin((1 - t) * omega) / sine, wb = Math.sin(t * omega) / sine;
      const v = va.map((component, k) => wa * component + wb * vb[k]);
      return { latitude: Math.atan2(v[2], Math.hypot(v[0], v[1])) / rad, longitude: Math.atan2(v[1], v[0]) / rad };
    });
  }
  // One sub-path per run of points, split where the line crosses the antimeridian.
  function routePath(points) {
    const segments = [];
    let current = [];
    points.forEach((point, index) => {
      if (index && Math.abs(point.longitude - points[index - 1].longitude) > 180) { segments.push(current); current = []; }
      current.push(point);
    });
    segments.push(current);
    return segments.map(segment => segment.map((point, index) => {
      const [x, y] = mapXY(point);
      return `${index ? "L" : "M"}${p1(x)} ${p1(y)}`;
    }).join("")).join("");
  }

  const MAP_EMPTY = "Mapa del mundo: introduce dos locators para ver el camino";
  function mapChart(box) {
    const grat = svg("g", { class: "tl-grat" });
    for (let lon = -150; lon <= 150; lon += 30) grat.append(line(lon === 0 ? "tl-grat-main" : "", (lon + 180) * 2, 0, (lon + 180) * 2, 360));
    for (let lat = -60; lat <= 60; lat += 30) grat.append(line(lat === 0 ? "tl-grat-main" : "", 0, (90 - lat) * 2, 720, (90 - lat) * 2));
    const land = svg("path", { class: "tl-land", d: "" });
    const dynamic = svg("g");
    const frame = svg("svg", { class: "tl-svg", viewBox: "0 0 720 360", role: "img", "aria-label": MAP_EMPTY },
      svg("rect", { class: "tl-sea", width: 720, height: 360 }), grat, land, dynamic);
    box.replaceChildren(frame);
    loadLand().then(path => { if (path) land.setAttribute("d", path); });
    const marker = (cls, point, label) => {
      const [x, y] = mapXY(point);
      const far = x > 600;
      return [svg("circle", { class: cls, cx: p1(x), cy: p1(y), r: 5 }), text("", far ? x - 9 : x + 9, y < 16 ? y + 16 : y - 8, label, far ? "end" : "start")];
    };
    return {
      draw(data) {
        dynamic.replaceChildren();
        if (!data) { frame.setAttribute("aria-label", MAP_EMPTY); return; }
        dynamic.append(svg("path", { class: "tl-route", d: routePath(arcPoints(data.a, data.b)) }),
          ...marker("tl-pt-a", data.a, "Estacion"), ...marker("tl-pt-b", data.b, "Otra estacion"));
        frame.setAttribute("aria-label", `Mapa del camino entre ${data.mine} y ${data.other}: ${fmt(data.result.distanceKm, 0)} km, rumbo ${bearingText(data.result.bearing)}`);
      }
    };
  }

  function drawCompass(box, data) {
    const cx = 100, cy = 100, ring = 72;
    const spot = (bearing, length) => [cx + length * Math.sin(bearing * Math.PI / 180), cy - length * Math.cos(bearing * Math.PI / 180)];
    const arrow = (cls, bearing) => {
      const [tx, ty] = spot(bearing, 66), [bx, by] = spot(bearing, 55);
      const [dx, dy] = [(ty - cy) / 66, -(tx - cx) / 66];
      return [line(cls, cx, cy, bx, by), svg("polygon", { class: `${cls}-head`, points: `${p1(tx)},${p1(ty)} ${p1(bx + 5 * dx)},${p1(by + 5 * dy)} ${p1(bx - 5 * dx)},${p1(by - 5 * dy)}` })];
    };
    const children = [svg("circle", { class: "tl-ring", cx, cy, r: ring })];
    for (let angle = 0; angle < 360; angle += 30) {
      const [x1, y1] = spot(angle, ring), [x2, y2] = spot(angle, ring + (angle % 90 ? 4 : 7));
      children.push(line("tl-tick", x1, y1, x2, y2));
    }
    const lang = (document.documentElement.lang || "es").slice(0, 2);
    const cardinals = { es: "NESO", fr: "NESO", de: "NOSW" }[lang] || "NESW";
    for (const [index, angle] of [0, 90, 180, 270].entries()) {
      const [x, y] = spot(angle, ring + 17);
      const node = text("tl-cardinal", x, y, cardinals[index], "middle");
      node.setAttribute("translate", "no");
      children.push(node);
    }
    let label = "Rosa de los vientos: sin datos";
    if (data) {
      const short = data.result.bearing, long = (short + 180) % 360;
      children.push(...arrow("tl-arrow-long", long), ...arrow("tl-arrow", short));
      label = `Rosa de los vientos: rumbo corto ${bearingText(short)}, rumbo largo ${bearingText(long)}`;
      children.push(text("", 190, 211, bearingText(short), "end"), text("", 190, 227, bearingText(long), "end"));
    }
    children.push(line("tl-arrow", 10, 207, 38, 207), text("", 44, 211, "Camino corto", "start"),
      line("tl-arrow-long", 10, 223, 38, 223), text("", 44, 227, "Camino largo", "start"),
      svg("circle", { class: "tl-hub", cx, cy, r: 3.5 }));
    chart(box, "0 0 200 236", label, ...children);
  }

  function drawGauge(box, result) {
    const cx = 150, cy = 140, radius = 105;
    const fraction = swr => clamp((swr - 1) / 2, 0, 1);
    const spot = (swr, length) => [cx - length * Math.cos(Math.PI * fraction(swr)), cy - length * Math.sin(Math.PI * fraction(swr))];
    const band = (from, to, cls) => {
      const [x0, y0] = spot(from, radius), [x1, y1] = spot(to, radius);
      return svg("path", { class: `tl-band ${cls}`, d: `M${p1(x0)} ${p1(y0)}A${radius} ${radius} 0 0 1 ${p1(x1)} ${p1(y1)}` });
    };
    const children = [band(1, 1.5, "tl-ok"), band(1.5, 2, "tl-warn"), band(2, 3, "tl-bad")];
    for (const swr of [1, 1.5, 2, 3]) {
      const [x, y] = spot(swr, radius + 17);
      children.push(text("tl-tick-text", x, swr === 1 || swr === 3 ? y + 4 : y, swr === 3 ? "3+" : String(swr), "middle"));
    }
    let label = "Indicador de ROE: sin datos";
    if (result) {
      const [x, y] = spot(result.swr, radius - 18);
      children.push(line("tl-needle", cx, cy, x, y), svg("circle", { class: "tl-hub", cx, cy, r: 7 }),
        text("tl-gauge-value", cx, cy + 38, fmt(result.swr, 2), "middle"));
      label = `Indicador de ROE: ${fmt(result.swr, 2)}, zona ${{ ok: "verde (buena)", warn: "ambar (aceptable)", bad: "roja (mala)" }[zoneOf(result.swr)]}`;
    }
    chart(box, "0 0 300 192", label, ...children);
  }
  function drawReflected(box, result) {
    const percent = result ? clamp(result.reflectedPercent, 0, 100) : 0;
    chart(box, "0 0 300 44", result ? `Potencia reflejada: ${fmt(result.reflectedPercent, 2)} %` : "Potencia reflejada: sin datos",
      text("", 0, 12, "Potencia reflejada", "start"),
      ...(result ? [text("tl-value", 300, 12, `${fmt(result.reflectedPercent, 2)} %`, "end")] : []),
      svg("rect", { class: "tl-track", x: 0, y: 22, width: 300, height: 14, rx: 7 }),
      ...(result ? [svg("rect", { class: `tl-fill tl-${zoneOf(result.swr)}`, x: 0, y: 22, width: p1(Math.max(percent * 3, 4)), height: 14, rx: 7 })] : []));
  }

  function drawCoaxCurve(box, { cable, freq }) {
    const table = R.COAX_TABLE[cable];
    if (!table) {
      chart(box, "0 0 360 210", "Curva de atenuacion: elige un cable de la tabla", text("tl-muted", 180, 105, "dB/100 m", "middle"));
      return;
    }
    const freqs = Object.keys(table).map(Number).sort((a, b) => a - b);
    const [fMin, fMax] = [freqs[0], freqs[freqs.length - 1]];
    const at = frequency => R.coaxLoss({ cable, frequencyMHz: frequency, lengthM: 100, powerW: 1 }).dbPer100m;
    const top = 22, bottom = 170, left = 44, right = 344;
    const dbMax = Math.ceil(at(fMax) / 10) * 10;
    const x = frequency => left + (Math.log(frequency / fMin) / Math.log(fMax / fMin)) * (right - left);
    const y = db => bottom - (db / dbMax) * (bottom - top);
    const children = [];
    for (let step = 0; step <= 4; step++) {
      const db = dbMax * step / 4;
      children.push(line("tl-gridline", left, y(db), right, y(db)), text("tl-muted", left - 6, y(db) + 4, trim(db, 1), "end"));
    }
    for (const frequency of freqs) {
      children.push(line("tl-tick", x(frequency), bottom, x(frequency), bottom + 4), text("tl-muted", x(frequency), bottom + 17, String(frequency), "middle"));
    }
    children.push(text("tl-muted", left - 40, 12, "dB/100 m", "start"), text("tl-muted", right, bottom + 34, "MHz", "end"));
    const samples = 48;
    const curve = Array.from({ length: samples }, (_, index) => {
      const frequency = index === samples - 1 ? fMax : fMin * Math.pow(fMax / fMin, index / (samples - 1));
      return `${index ? "L" : "M"}${p1(x(frequency))} ${p1(y(at(frequency)))}`;
    }).join("");
    children.push(svg("path", { class: "tl-curve", d: curve }));
    let label = `Atenuacion de ${cable} segun la frecuencia: de ${fmt(at(fMin), 2)} a ${fmt(at(fMax), 2)} dB/100 m`;
    if (Number.isFinite(freq) && freq >= fMin && freq <= fMax) {
      const db = at(freq), mx = x(freq), my = y(db);
      children.push(line("tl-marker-line", mx, top, mx, bottom), svg("circle", { class: "tl-pt-b", cx: p1(mx), cy: p1(my), r: 5 }),
        text("tl-value", mx > 250 ? mx - 9 : mx + 9, my - 9, `${fmt(db, 2)} dB/100 m`, mx > 250 ? "end" : "start"));
      label = `Atenuacion de ${cable} segun la frecuencia: ${fmt(db, 2)} dB/100 m a ${trim(freq, 3)} MHz`;
    }
    chart(box, "0 0 360 210", label, ...children);
  }
  function drawLossBar(box, result, powerW) {
    if (!result) {
      chart(box, "0 0 360 76", "Reparto de potencia: introduce frecuencia, longitud y potencia");
      return;
    }
    const lost = powerW - result.powerOutW;
    const legend = (cls, y, name, value) => [svg("rect", { class: cls, x: 0, y: y - 9, width: 10, height: 10, rx: 2 }),
      text("", 16, y, name, "start"), text("tl-value", 360, y, `${fmt(value, 1)} W`, "end")];
    chart(box, "0 0 360 76", `Reparto de potencia: ${fmt(result.powerOutW, 1)} W en la antena y ${fmt(lost, 1)} W perdidos en el cable`,
      svg("rect", { class: "tl-fill tl-ok", x: 0, y: 4, width: p1(360 * result.efficiencyPercent / 100), height: 22, rx: 4 }),
      svg("rect", { class: "tl-fill tl-bad", x: p1(360 * result.efficiencyPercent / 100), y: 4, width: p1(360 * (1 - result.efficiencyPercent / 100)), height: 22 }),
      ...legend("tl-ok", 48, "Potencia en la antena", result.powerOutW), ...legend("tl-bad", 68, "Perdida en el cable", lost));
  }

  function drawLadder(box, dBm) {
    const left = 20, right = 340;
    const x = value => left + clamp(value, 0, 60) / 60 * (right - left);
    const children = [svg("rect", { class: "tl-track", x: left, y: 46, width: right - left, height: 16, rx: 8 })];
    let label = "Escala de potencia: sin datos";
    if (dBm !== null) {
      children.push(svg("rect", { class: "tl-fill tl-ok", x: left, y: 46, width: p1(Math.max(x(dBm) - left, 4)), height: 16, rx: 8 }),
        text("tl-value", clamp(x(dBm), 40, 320), 30, `${fmt(dBm, 1)} dBm`, "middle"));
      label = `Escala de potencia: ${fmt(dBm, 1)} dBm`;
    }
    ["1 mW", "10 mW", "100 mW", "1 W", "10 W", "100 W", "1 kW"].forEach((name, index) => {
      children.push(line("tl-tick", x(index * 10), 42, x(index * 10), 66), text("", x(index * 10), 82, name, "middle"), text("tl-muted", x(index * 10), 96, String(index * 10), "middle"));
    });
    children.push(text("tl-muted", right + 18, 96, "dBm", "start"));
    chart(box, "0 0 380 102", label, ...children);
  }

  function drawAntennas(box, lengths) {
    const arm = (x1, x2) => line("tl-element", x1, 70, x2, 70);
    const children = [
      arm(20, 96), arm(104, 180), svg("circle", { class: "tl-hub", cx: 100, cy: 70, r: 4 }),
      line("tl-feed", 100, 74, 100, 118), text("tl-muted", 100, 134, "Alimentacion", "middle"),
      line("tl-dim", 20, 40, 180, 40), line("tl-dim", 20, 34, 20, 46), line("tl-dim", 180, 34, 180, 46),
      text("", 100, 224, "Dipolo de media onda", "middle"),
      line("tl-element", 300, 160, 300, 40), line("tl-dim", 330, 40, 330, 160), line("tl-dim", 324, 40, 336, 40), line("tl-dim", 324, 160, 336, 160),
      text("", 300, 224, "Vertical de cuarto de onda", "middle"), text("tl-muted", 300, 206, "Radiales", "middle")
    ];
    for (const [dx, dy] of [[-50, 16], [-30, 30], [30, 30], [50, 16]]) children.push(line("tl-radial", 300, 160, 300 + dx, 160 + dy));
    let label = "Dibujo de antenas: introduce una frecuencia";
    if (lengths) {
      const half = lengths.halfWaveM, quarter = lengths.quarterWaveM;
      children.push(text("tl-value", 100, 30, `${fmt(half, 2)} m`, "middle"), text("tl-muted", 58, 90, `${fmt(half / 2, 2)} m`, "middle"),
        text("tl-muted", 142, 90, `${fmt(half / 2, 2)} m`, "middle"), text("tl-value", 336, 104, `${fmt(quarter, 2)} m`, "start"),
        text("tl-muted", 356, 190, `${fmt(quarter, 2)} m`, "start"));
      label = `Dipolo de media onda de ${fmt(half, 2)} m y vertical de cuarto de onda de ${fmt(quarter, 2)} m con radiales`;
    }
    chart(box, "0 0 400 232", label, ...children);
  }

  function drawBands(box, region, frequency) {
    const bands = R.REGION_BANDS[region];
    const [fMin, fMax] = [1.5, 1500];
    const left = 52, right = 420, top = 22, rowHeight = 24;
    const x = value => left + (Math.log(clamp(value, fMin, fMax) / fMin) / Math.log(fMax / fMin)) * (right - left);
    const found = Number.isFinite(frequency) ? R.bandOf(frequency, Number(region)) : null;
    const children = [];
    bands.forEach((entry, index) => {
      const y = top + index * rowHeight, active = entry.band === found;
      if (active) children.push(svg("rect", { class: "tl-row-on", x: 0, y: y - 2, width: 540, height: rowHeight - 2, rx: 4 }));
      const width = Math.max(x(entry.maxMHz) - x(entry.minMHz), 3);
      children.push(text(active ? "tl-strong" : "", 4, y + 13, entry.band, "start"),
        line("tl-gridline", left, y + 9, right, y + 9),
        svg("rect", { class: active ? "tl-band-on" : "tl-band-off", x: p1(x(entry.minMHz)), y: y + 2, width: p1(width), height: 14, rx: 3 }),
        text(active ? "tl-strong" : "tl-muted", right + 8, y + 13, `${entry.minMHz}\u2013${entry.maxMHz} MHz`, "start"));
    });
    let label = `Plan de bandas de la region ${region}: ${bands.length} bandas, ninguna resaltada`;
    if (Number.isFinite(frequency) && frequency >= fMin && frequency <= fMax) {
      children.push(line("tl-marker-line", x(frequency), top - 8, x(frequency), top + bands.length * rowHeight - 4),
        text("tl-value", clamp(x(frequency), 40, 500), 10, `${trim(frequency, 4)} MHz`, "middle"));
    }
    if (Number.isFinite(frequency)) {
      label = found ? `Plan de bandas de la region ${region}: ${trim(frequency, 4)} MHz esta en la banda ${found}`
        : `Plan de bandas de la region ${region}: ${trim(frequency, 4)} MHz esta fuera de las bandas`;
    }
    chart(box, `0 0 540 ${top + bands.length * rowHeight + 6}`, label, ...children);
  }

  // Redraws a chart whenever any input of the form changes, and once at start.
  function live(f, draw) {
    const update = () => draw(f.inputs);
    f.form.addEventListener("input", update);
    f.form.addEventListener("change", update);
    update();
  }
  const chartBox = (...classes) => el("div", { class: ["tl-chart", ...classes].join(" ") });

  function mountDesktopOnly(main) {
    main.replaceChildren(el("div", { class: "tl-page tl-page-single" },
      el("section", { class: "tl-card", "aria-labelledby": "tl-desktop-title" },
        el("h1", { id: "tl-desktop-title", text: "Herramientas de radio" }),
        el("p", { text: "Esta herramienta esta en la app de escritorio RadiCodex y en la app Android." }),
        el("a", { class: "tl-btn tl-btn-primary", href: "ayuda.html#inicio", text: "Instalar en local" }))));
  }

  function mount(main) {
    const station = readStation();
    const page = el("div", { class: "tl-page" },
      el("header", { class: "tl-head" }, el("h1", { text: "Herramientas de radio" }),
        el("p", { class: "tl-lead", text: "Calculadoras de radioaficionado. Los calculos se hacen en este navegador." })));
    const cards = [];
    const add = card => { cards.push(card); page.append(card); return card; };

    // a. Locator
    const myLocator = station ? R.latLonToLocator(station.latitude, station.longitude, 6) : "";
    const locatorCard = add(section("locator", "Locator Maidenhead", "Convierte coordenadas en locator Maidenhead y al reves."));
    let distanceMine;
    const geoButton = (inputs, out, run) => {
      const button = el("button", { type: "button", class: "tl-btn", text: "Usar mi ubicacion" });
      button.addEventListener("click", () => {
        if (!root.navigator?.geolocation) { fail(out, GEO_UNSUPPORTED); return; }
        out.replaceChildren(el("p", { text: "Obteniendo ubicacion..." }));
        root.navigator.geolocation.getCurrentPosition(position => {
          inputs.lat.value = position.coords.latitude.toFixed(5);
          inputs.lon.value = position.coords.longitude.toFixed(5);
          run();
          if (distanceMine) {
            distanceMine.value = R.latLonToLocator(position.coords.latitude, position.coords.longitude, 6);
            distanceMine.dispatchEvent(new root.Event("input", { bubbles: true }));
          }
        }, error => {
          fail(out, error.code === 1 ? "Permiso de ubicacion denegado. Introduce latitud y longitud o tu locator."
            : error.code === 3 ? "Se agoto el tiempo al obtener la ubicacion. Vuelve a intentarlo o introducela a mano."
              : "Ubicacion no disponible en este dispositivo. Introduce latitud y longitud o tu locator.");
        }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
      });
      return button;
    };
    form(locatorCard, {
      id: "latlon", heading: "De coordenadas a locator", button: "Calcular locator", extra: [geoButton],
      fields: [["lat", "Latitud (-90 a 90)", { value: station ? station.latitude : "" }], ["lon", "Longitud (-180 a 180)", { value: station ? station.longitude : "" }]],
      run: ({ lat, lon }) => [["Locator de 6 caracteres", R.latLonToLocator(num(lat), num(lon), 6)],
        ["Locator de 8 caracteres", R.latLonToLocator(num(lat), num(lon), 8)]]
    });
    form(locatorCard, {
      id: "loc", heading: "De locator a coordenadas", button: "Calcular coordenadas",
      fields: [["loc", "Locator Maidenhead", { type: "text", maxlength: 8, placeholder: "IN80dk" }]],
      run: ({ loc }) => {
        const point = R.maidenheadToLatLon(loc.value);
        return [["Latitud", fmt(point.latitude, 5)], ["Longitud", fmt(point.longitude, 5)]];
      }
    });

    // b. Distance and bearing
    const distanceCard = add(section("dist", "Distancia y rumbo", "Distancia por el camino corto y el largo, y el rumbo para orientar la antena."));
    distanceCard.classList.add("tl-card-wide");
    const distance = form(distanceCard, {
      id: "dist", button: "Calcular distancia",
      fields: [["mine", "Mi locator", { type: "text", maxlength: 8, value: myLocator, placeholder: "IN80dk" }],
        ["other", "Locator de la otra estacion", { type: "text", maxlength: 8, placeholder: "FN31pr" }]],
      run: ({ mine, other }) => {
        const result = R.greatCircle(R.maidenheadToLatLon(mine.value), R.maidenheadToLatLon(other.value));
        return [["Camino corto", `${fmt(result.distanceKm, 1)} km`], ["Camino largo", `${fmt(result.longPathKm, 1)} km`],
          ["Rumbo", bearingText(result.bearing)], ["Rumbo inverso", bearingText(result.reverseBearing)]];
      }
    });
    distanceMine = distance.inputs.mine;
    const mapBox = chartBox("tl-chart-map"), compassBox = chartBox("tl-chart-compass");
    distanceCard.append(el("div", { class: "tl-charts tl-charts-map" }, mapBox, compassBox));
    const map = mapChart(mapBox);
    live(distance, ({ mine, other }) => {
      let data = null;
      try {
        const a = R.maidenheadToLatLon(mine.value), b = R.maidenheadToLatLon(other.value);
        data = { a, b, mine: mine.value.trim(), other: other.value.trim(), result: R.greatCircle(a, b) };
      } catch { /* incomplete locator while typing: show the empty chart */ }
      map.draw(data);
      drawCompass(compassBox, data);
    });

    // c. SWR
    const swrCard = add(section("swr", "ROE (relacion de ondas estacionarias)", "Cuanto menor es la ROE, menos potencia vuelve al equipo; hasta 1,5 se considera buena."));
    const swrRows = result => [["ROE", fmt(result.swr, 2)], ["Perdida de retorno", `${fmt(result.returnLossDb, 2)} dB`],
      ["Perdida por desadaptacion", `${fmt(result.mismatchLossDb, 3)} dB`], ["Potencia reflejada", `${fmt(result.reflectedPercent, 2)} %`]];
    const swrPower = form(swrCard, {
      id: "swrp", heading: "Desde potencia directa y reflejada", button: "Calcular ROE",
      fields: [["fwd", "Potencia directa (W)"], ["ref", "Potencia reflejada (W)"]],
      run: ({ fwd, ref }) => swrRows(R.swrFromPower(num(fwd), num(ref)))
    });
    const swrRatio = form(swrCard, {
      id: "swrr", heading: "Desde el valor de ROE", button: "Calcular desde ROE",
      fields: [["swr", "ROE (1 o mas)"]],
      run: ({ swr }) => swrRows(R.swrFromRatio(num(swr)))
    });
    const gaugeBox = chartBox("tl-chart-gauge"), reflectedBox = chartBox("tl-chart-bar");
    swrCard.append(el("div", { class: "tl-charts tl-charts-stack" }, gaugeBox, reflectedBox));
    const showSwr = result => { drawGauge(gaugeBox, result); drawReflected(reflectedBox, result); };
    live(swrPower, ({ fwd, ref }) => { try { showSwr(R.swrFromPower(num(fwd), num(ref))); } catch { showSwr(null); } });
    live(swrRatio, ({ swr }) => { try { showSwr(R.swrFromRatio(num(swr))); } catch { showSwr(null); } });

    // d. Cable loss
    const cableCard = add(section("coax", "Perdida en el cable", "Estima la potencia que llega a la antena segun el cable, la frecuencia y la longitud."));
    const cable = form(cableCard, {
      id: "coax", button: "Calcular perdida",
      fields: [["cable", "Cable", { options: [...Object.keys(R.COAX_TABLE).map(name => [name, name]), ["custom", "Otro (dB/100 m)"]] }],
        ["custom", "Atenuacion (dB/100 m)"], ["freq", "Frecuencia (MHz)"], ["len", "Longitud (m)"], ["pw", "Potencia (W)"]],
      run: ({ cable: type, custom, freq, len, pw }) => {
        const isCustom = type.value === "custom";
        const result = R.coaxLoss({ cable: type.value, frequencyMHz: num(freq), lengthM: num(len), powerW: num(pw),
          customDbPer100m: isCustom ? num(custom) : undefined });
        return [["Atenuacion", `${fmt(result.dbPer100m, 2)} dB/100 m`], ["Perdida en el cable", `${fmt(result.lossDb, 2)} dB`],
          ["Potencia en la antena", `${fmt(result.powerOutW, 1)} W`], ["Eficiencia", `${fmt(result.efficiencyPercent, 1)} %`]];
      }
    });
    const customField = cable.inputs.custom.closest(".tl-field");
    const syncCustom = () => { customField.hidden = cable.inputs.cable.value !== "custom"; };
    cable.inputs.cable.addEventListener("change", syncCustom);
    syncCustom();
    const curveBox = chartBox("tl-chart-curve"), lossBox = chartBox("tl-chart-bar");
    cableCard.append(el("div", { class: "tl-charts" }, curveBox, lossBox));
    live(cable, ({ cable: type, custom, freq, len, pw }) => {
      drawCoaxCurve(curveBox, { cable: type.value, freq: num(freq) });
      let result = null;
      try {
        result = R.coaxLoss({ cable: type.value, frequencyMHz: num(freq), lengthM: num(len), powerW: num(pw),
          customDbPer100m: type.value === "custom" ? num(custom) : undefined });
      } catch { /* incomplete input while typing: show the empty chart */ }
      drawLossBar(lossBox, result, num(pw));
    });
    cableCard.append(el("p", { class: "tl-hint", text: "Valores tipicos de catalogo; consulta el fabricante." }));

    // e. Power and ERP
    const powerCard = add(section("power", "Potencia", "Convierte entre vatios, dBm y dBW y calcula la PRA y la PIRE."));
    const unitForm = form(powerCard, {
      id: "pw", heading: "Conversion de unidades", button: "Convertir",
      fields: [["value", "Valor"], ["unit", "Unidad", { options: [["W", "W"], ["dBm", "dBm"], ["dBW", "dBW"]], untranslated: true }]],
      run: ({ value, unit }) => {
        const result = R.power(num(value), unit.value);
        return [["Vatios", `${fmt(result.watts, result.watts < 1 ? 4 : 2)} W`], ["dBm", `${fmt(result.dBm, 2)} dBm`], ["dBW", `${fmt(result.dBW, 2)} dBW`]];
      }
    });
    const ladderBox = chartBox("tl-chart-ladder");
    powerCard.append(ladderBox);
    live(unitForm, ({ value, unit }) => {
      try { drawLadder(ladderBox, R.power(num(value), unit.value).dBm); } catch { drawLadder(ladderBox, null); }
    });
    form(powerCard, {
      id: "erp", heading: "PRA (ERP) y PIRE (EIRP)", button: "Calcular PRA",
      fields: [["p", "Potencia del equipo (W)"], ["loss", "Perdida del cable (dB)", { value: 0 }], ["gain", "Ganancia de antena (dBd)"]],
      run: ({ p, loss, gain }) => {
        const result = R.erp({ powerW: num(p), lossDb: num(loss), gainDbd: num(gain) });
        return [["PRA (ERP)", `${fmt(result.erpW, 2)} W`], ["PIRE (EIRP)", `${fmt(result.eirpW, 2)} W`]];
      }
    });

    // f. Antenna lengths
    const antennaCard = add(section("ant", "Antena", "Longitud de un dipolo de media onda y de una vertical de cuarto de onda con su factor de velocidad."));
    const antenna = form(antennaCard, {
      id: "ant", button: "Calcular longitudes",
      fields: [["freq", "Frecuencia (MHz)"], ["vf", "Factor de velocidad (0,5 a 1)", { value: 0.95 }]],
      run: ({ freq, vf }) => {
        const result = R.antennaLengths(num(freq), num(vf));
        return [["Longitud de onda", `${fmt(result.wavelengthM, 2)} m`], ["Dipolo de media onda", `${fmt(result.halfWaveM, 2)} m`],
          ["Vertical de cuarto de onda", `${fmt(result.quarterWaveM, 2)} m`]];
      }
    });
    const antennaBox = chartBox("tl-chart-antenna");
    antennaCard.append(antennaBox);
    live(antenna, ({ freq, vf }) => {
      try { drawAntennas(antennaBox, R.antennaLengths(num(freq), num(vf))); } catch { drawAntennas(antennaBox, null); }
    });

    // g. Band plan
    const bandCard = add(section("band", "Plan de bandas",
      "Limites segun el Reglamento de Radiocomunicaciones de la UIT; las normas nacionales pueden ser mas estrictas."));
    bandCard.classList.add("tl-card-wide");
    const band = form(bandCard, {
      id: "band", button: "Buscar banda",
      fields: [["region", "Region IARU", { options: [["1", "Region 1: Europa, Africa y Oriente Medio"], ["2", "Region 2: America"], ["3", "Region 3: Asia y Pacifico"]] }],
        ["freq", "Frecuencia (MHz)"]],
      run: ({ region, freq }) => {
        const found = R.bandOf(num(freq), Number(region.value));
        return [["Banda", found || "Fuera de banda de aficionado"]];
      }
    });
    const bandBox = chartBox("tl-chart-bands");
    bandCard.append(bandBox);
    live(band, ({ region, freq }) => drawBands(bandBox, region.value, num(freq)));
    const table = el("table", { class: "tl-table" });
    const renderBands = () => {
      table.replaceChildren(
        el("thead", {}, el("tr", {}, ...["Banda", "Desde (MHz)", "Hasta (MHz)"].map(text => el("th", { scope: "col", text })))),
        el("tbody", {}, ...R.REGION_BANDS[band.inputs.region.value].map(entry =>
          el("tr", {}, el("th", { scope: "row", text: entry.band }), el("td", { text: String(entry.minMHz) }), el("td", { text: String(entry.maxMHz) })))));
    };
    band.inputs.region.addEventListener("change", () => { renderBands(); band.out.replaceChildren(); });
    renderBands();
    bandCard.append(el("div", { class: "tl-scroll" }, table));

    // h. RST
    const rstCard = add(section("rst", "Codigo RST"));
    const rstTable = el("table", { class: "tl-table" },
      el("thead", {}, el("tr", {}, el("th", { scope: "col", text: "Cifra" }), el("th", { scope: "col", text: "Significado" }))));
    const rstBody = el("tbody");
    for (const [letter, title] of [["R", "Legibilidad (R)"], ["S", "Intensidad de la senal (S)"], ["T", "Tono (T, solo CW)"]]) {
      rstBody.append(el("tr", {}, el("th", { scope: "colgroup", colspan: "2", class: "tl-group", text: title })));
      for (const [digit, meaning] of Object.entries(R.RST[letter])) {
        rstBody.append(el("tr", {}, el("th", { scope: "row", text: digit }), el("td", { text: meaning })));
      }
    }
    rstTable.append(rstBody);
    rstCard.append(el("div", { class: "tl-scroll" }, rstTable));

    main.replaceChildren(page);
  }

  function start() {
    const main = doc.getElementById("main");
    if (!main) return false;
    Promise.resolve(R.runtime).then(runtime => runtime && runtime.mode === "local" ? mount(main) : mountDesktopOnly(main));
    return true;
  }
  function boot() {
    if (start()) return;
    const observer = new root.MutationObserver(() => { if (start()) observer.disconnect(); });
    observer.observe(doc.documentElement, { childList: true, subtree: true });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
})(globalThis);
