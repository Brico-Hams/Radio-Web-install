const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const A = require("../antenna-core.js");
const translations = require("../ui-translations.js");
const { ALLOWED_FILES } = require("../server.cjs");

const root = path.join(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const near = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected} +-${tolerance}`);
const row = (a, b, radius, segments) => ({ x1: a[0], y1: a[1], z1: a[2], x2: b[0], y2: b[1], z2: b[2], radius, segments });

// Reproduces hardware/antenas/disenar.py evaluate() with the VHF Yagi alone: 3 elements along Y, 30 segments, feed at node 15 of element 1.
function pythonYagi(freq, lengthsMm, positionsMm, axis) {
  const model = A.createModel(freq);
  const ids = lengthsMm.map((length, i) => {
    const a = [positionsMm[i] / 1000, 0, 0], b = [positionsMm[i] / 1000, 0, 0];
    a[axis] = -length / 2000; b[axis] = length / 2000;
    return A.addWire(model, [a, b], 30, 0.002);
  });
  const [feed] = A.solve(model, [{ w: ids[1], i: 15, v: [1, 0] }]);
  const z = A.complex.div(feed.v, feed.current);
  const pin = 0.5 * (feed.v[0] * feed.current[0] + feed.v[1] * feed.current[1]);
  return { z, swr: A.swrFromZ(z, 50), gain: A.gainDbi(model, Math.PI / 2, 0, pin) };
}

test("MoM reproduces the VHF and UHF Yagi values of resultados.json", () => {
  const results = JSON.parse(read("hardware/antenas/resultados.json"));
  const vhf = results.yagi.vhf.rendimiento.find(item => item.mhz === 145.9);
  const r = pythonYagi(145.9e6, results.yagi.vhf.longitud_mm, results.yagi.vhf.posicion_mm, 1);
  near(r.z[0], vhf.z[0], 3, "VHF R"); near(r.z[1], vhf.z[1], 4, "VHF X");
  near(r.swr, vhf.swr, 0.12, "VHF SWR"); near(r.gain, vhf.gain_dbi, 0.4, "VHF gain");
});

test("MoM reproduces the V dipole of resultados.json", () => {
  const results = JSON.parse(read("hardware/antenas/resultados.json"));
  const v = results.dipolo_v || Object.values(results).find(item => item && item.angulo_grados);
  const arm = v.brazo_mm / 1000, half = v.angulo_grados / 2 * Math.PI / 180;
  const model = A.createModel(145.9e6);
  const w = A.addWire(model, [[arm * Math.cos(half), arm * Math.sin(half), 0], [0, 0, 0], [arm * Math.cos(half), -arm * Math.sin(half), 0]], 60, 0.002);
  const [feed] = A.solve(model, [{ w, i: 30, v: [1, 0] }]);
  const z = A.complex.div(feed.v, feed.current);
  const expected = (v.rendimiento || v.resultados || Object.values(v).find(Array.isArray)).find(item => item.mhz === 145.9);
  near(z[0], expected.z[0], 3, "V R"); near(z[1], expected.z[1], 4, "V X");
  const pin = 0.5 * (feed.v[0] * feed.current[0] + feed.v[1] * feed.current[1]);
  near(A.gainDbi(model, 0, 0, pin), expected.zenith_dbi, 0.4, "V zenith gain");
});

test("free-space half-wave dipole resonates a few percent below c/(2L) with 55-85 ohm", () => {
  const length = 10;
  const design = { z0: 50, wires: [row([-5, 0, 10], [5, 0, 10], 0.001, 40)], feed: { row: 0, position: 0.5 }, loads: [] };
  const freqs = A.linspace(12e6, 16e6, 41);
  const points = A.sweep(design, freqs);
  const [res] = A.findResonances(points);
  const half = A.C0 / (2 * length);
  assert.ok(res.f > 0.9 * half && res.f < half, `resonance ${res.f} vs ${half}`);
  assert.ok(res.r > 55 && res.r < 85, `R ${res.r}`);
  assert.ok(Math.abs(A.findMinimum(points).f - res.f)   < 1e6);
});

test("perfect ground model keeps a horizontal dipole finite and has no lower hemisphere", () => {
  const design = { z0: 50, ground: true, wires: [row([-5, 0, 10], [5, 0, 10], 0.001, 40)], feed: { row: 0, position: 0.5 }, loads: [] };
  const e = A.evaluate(design, 14.5e6);
  assert.ok(e.z[0] > 20 && e.z[0] < 200 && Number.isFinite(e.z[1]));
  const g = A.gainDbi(e.model, 1.0, Math.PI / 2, e.pin);
  assert.ok(g > 6 && g < 9.5, `ground gain ${g}`);
  assert.equal(A.gainDbi(e.model, Math.PI * 0.75, 0, e.pin), -Infinity);
  assert.throws(() => A.evaluate({ ...design, wires: [row([-5, 0, 0], [5, 0, 0], 0.001, 40)] }, 14.5e6), /tierra perfecta/);
});

test("series load shifts the reactance by the load reactance", () => {
  const base = { z0: 50, wires: [row([-5, 0, 10], [5, 0, 10], 0.001, 40)], feed: { row: 0, position: 0.5 }, loads: [] };
  const loaded = { ...base, loads: [{ row: 0, position: 0.5, type: "series", R: 10, L: 0, C: 0 }] };
  const a = A.evaluate(base, 14.5e6), b = A.evaluate(loaded, 14.5e6);
  near(b.z[0] - a.z[0], 10, 0.5, "series R");
  const inductive = A.evaluate({ ...base, loads: [{ row: 0, position: 0.5, type: "series", L: 1e-6 }] }, 14.5e6);
  near(inductive.z[1] - a.z[1], 2 * Math.PI * 14.5e6 * 1e-6, 1, "series L");
});

test("SWR, reflection and Smith identities", () => {
  const g = A.reflection([100, 0], 50);
  near(g[0], 1 / 3, 1e-12, "gamma"); near(A.swrFromZ([100, 0], 50), 2, 1e-12, "swr");
  assert.equal(A.swrFromZ([50, 0], 50), 1);
  assert.equal(A.swrFromZ([0, 30], 50), Infinity);
  const back = A.impedanceFromGamma(A.reflection([30, 40], 50), 50);
  near(back[0], 30, 1e-9, "R"); near(back[1], 40, 1e-9, "X");
  const p = A.smithPoint([50, 0], 50);
  near(p.x, 0, 1e-12, "centre"); near(p.y, 0, 1e-12, "centre");
  const grid = A.smithGrid([1], [1]);
  near(grid.resistance[0].cx, 0.5, 1e-12, "r circle"); near(grid.resistance[0].radius, 0.5, 1e-12, "r circle");
  const q = A.smithPoint([50, 50], 50);
  near(Math.hypot(q.x - grid.reactance[0].cx, q.y - grid.reactance[0].cy), grid.reactance[0].radius, 1e-9, "x arc");
});

test("balun and unun ratios, best transformer", () => {
  assert.deepEqual(A.transformImpedance([200, 10], 4), [50, 2.5]);
  assert.deepEqual(A.transformImpedance([12.5, 0], 4, true), [50, 0]);
  const best = A.bestTransformer(450, 50);
  assert.equal(best.ratio, 9); assert.equal(best.resistance, 50);
  assert.equal(A.bestTransformer(12.5, 50).inverted, true);
  assert.deepEqual(A.TRANSFORMERS, [1, 2, 4, 6, 9]);
});

test("L-network matches to Z0 exactly for both topologies", () => {
  for (const load of [[10, 5], [200, -40], [30, 0], [75, 30]]) {
    const solutions = A.lNetwork(load, 50, 7.1e6);
    assert.ok(solutions.length >= 2, `solutions for ${load}`);
    for (const s of solutions) {
      const z = A.lNetworkInput(s, load, 50, 7.1e6);
      near(z[0], 50, 1e-6, "R"); near(z[1], 0, 1e-6, "X");
    }
  }
});

test("trap resonance and L/C selection", () => {
  const f = 7.1e6, C = 100e-12;
  const L = A.trapInductance(f, C);
  near(A.trapResonance(L, C), f, 1e-3, "f");
  near(A.trapCapacitance(f, L), C, 1e-18, "C");
  near(A.trapResonance(1e-6, 100e-12), 1 / (2 * Math.PI * Math.sqrt(1e-6 * 100e-12)), 1e-3, "formula");
  const z = A.loadImpedance({ type: "trap", L, C, Q: 0 }, f * 0.5);
  assert.ok(z[1] > 0, "below resonance the trap is inductive");
  assert.ok(A.loadImpedance({ type: "trap", L, C, Q: 100 }, f)[0] > 1000, "high impedance at resonance");
  const design = A.trapDipoleTemplate({ bandsHz: [14.2e6, 7.1e6], capacitanceF: C });
  assert.equal(design.traps.length, 1);
  near(A.trapResonance(design.traps[0].L, design.traps[0].C), 14.2e6, 1e3, "trap band");
  assert.equal(design.loads.length, 2);
  assert.throws(() => A.trapDipoleTemplate({ bandsHz: [14e6], capacitanceF: C }));
  assert.throws(() => A.trapDipoleTemplate({ bandsHz: [14e6, 7e6], capacitanceF: C, inductanceH: 1e-6 }));
  const five = A.trapDipoleTemplate({ bandsHz: [28e6, 21e6, 14e6, 7e6, 3.6e6], inductanceH: 10e-6 });
  assert.equal(five.traps.length, 4);
  const evaluated = A.evaluate(A.trapDipoleTemplate({ bandsHz: [14.2e6, 7.1e6], capacitanceF: C, height: 12 }), 7.1e6);
  assert.ok(Number.isFinite(evaluated.swr));
});

test("coax: lossless quarter-wave line inverts the impedance, loss adds", () => {
  const f = 14e6, vf = 0.66, length = vf * A.C0 / f / 4;
  const z = A.coaxInput([100, 0], { z0: 50, lengthM: length, velocityFactor: vf, lossDbPer100m: 0, f });
  near(z[0], 25, 1e-6, "R"); near(z[1], 0, 1e-6, "X");
  const matched = A.coaxInput([50, 0], { z0: 50, lengthM: 30, velocityFactor: vf, lossDbPer100m: 3, f });
  near(matched[0], 50, 1e-6, "matched");
  const lossy = A.coaxInput([200, 0], { z0: 50, lengthM: 100, velocityFactor: vf, lossDbPer100m: 6, f });
  assert.ok(A.swrFromZ(lossy, 50) < A.swrFromZ([200, 0], 50));
  assert.equal(A.coaxMatchedLossDb(50, 4), 2);
});

test("CSV parser: units, separators, decimal comma, R/X and bad input", () => {
  const a = A.parseMeasurementCsv("Frequency (MHz),SWR\n14.0,1.8\n14.1,1.4\n14.2,1.2\n");
  assert.equal(a.info.unit, "mhz"); assert.equal(a.points.length, 3); near(a.points[1].f, 14.1e6, 1, "MHz"); assert.equal(a.points[1].swr, 1.4);
  const b = A.parseMeasurementCsv("Freq_kHz;SWR\n7000;2,5\n7100;1,5\n");
  assert.equal(b.info.decimalComma, true); near(b.points[0].f, 7e6, 1, "kHz"); assert.equal(b.points[0].swr, 2.5);
  const c = A.parseMeasurementCsv("freq(Hz);R;X\n14000000;40;-20\n14200000;50;0\n", { z0: 50 });
  near(c.points[1].swr, 1, 1e-9, "swr from RX"); assert.equal(c.points[0].x, -20);
  assert.ok(c.points[0].swr > 1);
  const d = A.parseMeasurementCsv("# analyzer\n14100000,1.5\n14200000,1.1\n");
  near(d.points[0].f, 14.1e6, 1, "no header Hz"); assert.equal(d.info.header, false);
  const e = A.parseMeasurementCsv("alpha;beta\n1;2\n");
  assert.equal(e.points.length, 0); assert.ok(e.errors.length > 0);
  const cmp = A.compareMeasured([{ f: 14e6, swr: 3 }, { f: 14.2e6, swr: 1.1 }, { f: 14.4e6, swr: 3 }], [{ f: 14e6, swr: 3 }, { f: 14.1e6, swr: 1.2 }, { f: 14.2e6, swr: 3 }]);
  near(cmp.shiftHz, -0.1e6, 2e4, "shift");
});

test("Nelder-Mead converges on a known function", () => {
  const result = A.nelderMead(x => (x[0] - 3) ** 2 + 2 * (x[1] + 1) ** 2, [0, 0], [1, 1], 200, 1e-14);
  near(result.x[0], 3, 1e-3, "x"); near(result.x[1], -1, 1e-3, "y"); assert.ok(result.value < 1e-6);
});

test("auto-tune lowers the SWR of a too-long dipole at the target frequency", () => {
  const design = { z0: 50, wires: [row([-5.6, 0, 10], [5.6, 0, 10], 0.001, 20)], feed: { row: 0, position: 0.5 }, loads: [] };
  const tuned = A.autoTune(design, { f0: 14.2e6, iterations: 40 });
  assert.ok(tuned.swr < tuned.startSwr, `${tuned.startSwr} -> ${tuned.swr}`);
  assert.ok(tuned.factors[0] < 1);
});

test("advisor suggestions carry the number they come from", () => {
  const design = { z0: 50, wires: [row([-5.6, 0, 10], [5.6, 0, 10], 0.001, 40)], feed: { row: 0, position: 0.5 }, loads: [] };
  const points = A.sweep(design, A.linspace(11e6, 16e6, 21));
  const advice = A.advise({ points, z0: 50, band: { lowHz: 14e6, highHz: 14.35e6 }, armM: 5.6, f0: 14.2e6 });
  const shorten = advice.find(item => item.id === "shorten");
  assert.ok(shorten, JSON.stringify(advice.map(i => i.id)));
  const res = shorten.sources.find(s => s.name === "f_res");
  assert.ok(res.value < 14e6 && shorten.text.includes((res.value / 1e6).toFixed(3)));
  assert.ok(advice.every(item => item.sources.length > 0 && item.text));
  const trap = A.advise({ points, z0: 50, f0: 14.2e6, traps: [{ f: 7.1e6, L: 4e-6, C: 100e-12 }] }).find(item => item.id === "trap");
  near(trap.sources.find(s => s.name === "L_new").value, A.trapInductance(7.1e6, 100e-12), 1e-12, "new L");
  const ratio = A.advise({ points: [{ f: 14e6, r: 450, x: 0, swr: 9 }, { f: 14.2e6, r: 450, x: 10, swr: 9 }], z0: 50, f0: 14.1e6 }).find(item => item.id === "ratio");
  assert.match(ratio.text, /1:9/);
});

test("band filter returns only repository-sourced bands and pendiente de fuente otherwise", () => {
  const none = A.bandsForRadio("");
  assert.equal(none.status, "none"); assert.equal(none.bands.length, 0);
  for (const id of ["tk11"]) {
    const info = A.bandsForRadio(id);
    assert.equal(info.status, "pending"); assert.equal(info.message, "pendiente de fuente"); assert.equal(info.bands.length, 0);
  }
  const ftx = A.bandsForRadio("ftx1");
  assert.equal(ftx.status, "ok");
  assert.deepEqual(ftx.bands.find(b => b.label === "60 m").lowHz, 5351500);
  assert.deepEqual(ftx.bands.find(b => b.label === "70 cm").highHz, 450e6);
  assert.deepEqual(A.bandsForRadio("thd75").bands.map(b => [b.lowHz, b.highHz]), [[136e6, 174e6], [216e6, 260e6], [410e6, 470e6]]);
  for (const id of ["trusdx", "qmx"]) assert.match(A.bandsForRadio(id).note, /no limites de TX/);
  const ic = A.bandsForRadio("ic705-plan0");
  assert.equal(ic.status, "ok");
  const band = label => ic.bands.find(b => b.label === label);
  assert.deepEqual([band("40 m").lowHz, band("40 m").highHz], [7e6, 7.3e6]);
  assert.deepEqual([band("2 m").lowHz, band("2 m").highHz], [144e6, 146e6]);
  assert.ok(!band("4 m"));
  assert.ok(A.bandsForRadio("ic705-plan2").bands.some(b => b.label === "4 m"));
  assert.ok(!A.bandsForRadio("ic705-plan4").bands.some(b => b.label === "60 m"));
  const q = A.bandsForRadio("quansheng");
  assert.deepEqual(q.bands.map(b => [b.lowHz, b.highHz]), [[136e6, 174e6], [400e6, 470e6]]);
  for (const profile of A.RADIO_PROFILES) assert.ok(profile.bands ? profile.source : profile.source === null, profile.id);
});

test("SWR meter table only converts sourced radios and the logger records TX points only", () => {
  assert.equal(A.swrMeterInfo("ic705-plan0").status, "ok");
  assert.equal(A.swrMeterInfo("ftx1").status, "partial");
  assert.equal(A.swrMeterInfo("trusdx").status, "pending");
  assert.equal(A.swrMeterInfo("trusdx").message, "pendiente de fuente");
  assert.equal(A.swrFromMeter("qmx", 100), null);
  for (const id of ["ic7300", "ic7300mk2", "ic7610", "ic9700", "ic905", "icom-ic-7300"]) assert.equal(A.swrMeterInfo(id).status, "partial", id);
  near(A.swrFromMeter("icom-ic-9700", 80), 2, 1e-9, "ic9700 80");
  assert.equal(A.swrFromMeter("ic7300", 200), null);
  assert.equal(A.swrMeterInfo("ic705").status, "ok");
  assert.match(A.swrMeterInfo("ic705").source, /p\.5.*p\.15/);
  assert.equal(A.swrMeterInfo("kenwood-ts-590s").status, "pending");
  for (const [raw, swr] of [[0, 1], [48, 1.5], [80, 2], [120, 3], [240, 6]]) near(A.swrFromMeter("ic705-plan1", raw), swr, 1e-9, `ic705 ${raw}`);
  near(A.swrFromMeter("ic705", 64), 1.75, 1e-9, "ic705 midpoint");
  assert.equal(A.swrFromMeter("ic705", 256), null);
  near(A.swrFromMeter("ftx1", 0), 1, 1e-9, "ftx1 zero");
  near(A.swrFromMeter("ftx1", 96), 1 + 0.333 * (Math.exp(0.0151 * 96) - 1), 1e-9, "ftx1 96");
  assert.equal(A.swrFromMeter("ftx1", 255), null);
  const log = A.createSwrLogger({ maxPoints: 2 });
  assert.equal(log.add({ freqHz: 7.1e6, swr: 1.4, tx: false }), false);
  assert.equal(log.add({ freqHz: 7.1e6, swr: 0.5, tx: true }), false);
  assert.equal(log.add({ freqHz: 7.1e6, swr: 1.4, tx: true }), true);
  assert.equal(log.add({ freqHz: 7.1e6 + 100, swr: 1.5, tx: true }), true);
  assert.equal(log.size, 1);
  assert.equal(log.add({ freqHz: 7.2e6, swr: 2, tx: true }), true);
  assert.equal(log.add({ freqHz: 7.3e6, swr: 3, tx: true }), false);
  assert.deepEqual(log.points().map(p => p.swr), [1.5, 2]);
});

test("segment cap rejects oversized models", () => {
  const design = { z0: 50, wires: [row([-5, 0, 10], [5, 0, 10], 0.001, 500)], feed: { row: 0, position: 0.5 }, loads: [] };
  assert.throws(() => A.evaluate(design, 14e6), /incognitas/);
});

test("antenna.html keeps the CSP of index.html, no inline code, and ships its files", () => {
  const page = read("antenna.html"), index = read("index.html");
  const csp = html => html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.equal(csp(page), csp(index));
  assert.doesNotMatch(page, /<script(?![^>]*\ssrc=)[^>]*>|\sstyle=|\son[a-z]+=/i);
  for (const file of ["antenna.html", "antenna-core.js", "antenna-ui.js", "antenna-worker.js", "antenna.css"]) assert.ok(ALLOWED_FILES.includes(file), file);
  assert.ok(page.indexOf("styles.css") < page.indexOf("antenna.css"));
  assert.ok(page.indexOf("antenna-core.js") < page.indexOf("antenna-ui.js"));
  assert.match(read("app.js"), /navItem\("antenna\.html"/);
});

test("main controls are labelled and every static text has es/en/fr/de translations", () => {
  const ui = read("antenna-ui.js");
  const template = ui.slice(ui.indexOf("const TEMPLATE"), ui.indexOf("const $ ="));
  const ids = [...template.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"/g)].map(m => m[1]);
  assert.ok(ids.length > 25);
  for (const id of ids) {
    if (id === "ant-geo-az" || id === "ant-geo-el") continue;
    assert.ok(template.includes(`for="${id}"`), `label for ${id}`);
  }
  assert.ok(template.includes('for="ant-geo-az"') && template.includes('for="ant-geo-el"'));
  assert.match(template, /aria-live="polite"/);
  assert.match(template, /role="note"/);
  const catalog = new Map(translations.map(entry => [entry[0], entry]));
  for (const entry of translations) assert.equal(entry.length, 4);
  const texts = [...template.matchAll(/<(?:h1|h2|h3|button|label|option|th|figcaption|caption|p)\b[^>]*>([^<]+)</g)].map(m => m[1].trim())
    .concat(Object.values(A.ADVISOR_TEXT));
  for (const text of texts) {
    if (!/[A-Za-z]{4,}/.test(text) || /^[\d.:\sA-Za-z]{1,4}$/.test(text)) continue;
    const entry = catalog.get(text);
    assert.ok(entry, `missing translation: ${text}`);
    entry.slice(1).forEach(value => assert.ok(value && value.trim(), text));
    const holes = source => (source.match(/\{\d+\}/g) || []).sort().join();
    entry.slice(1).forEach(value => assert.equal(holes(value), holes(text), text));
  }
  const worker = read("antenna-worker.js");
  assert.match(worker, /importScripts\("antenna-core\.js"\)/);
});

test("help documentation is registered in every language", () => {
  assert.match(read("scripts/build-help.cjs"), /"ANTENAS-HF\.md": "ayuda-antenas-hf\.html"/);
  assert.ok(ALLOWED_FILES.includes("ayuda-antenas-hf.html"));
  for (const file of ["docs/ANTENAS-HF.md", ...["en", "fr", "de", "it"].map(l => `docs/i18n/${l}/ANTENAS-HF.md`)]) {
    const text = read(file);
    assert.ok(text.length > 1000, file);
    assert.match(text, /pendiente de fuente/, file);
  }
});
