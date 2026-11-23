"use strict";
// Console side of the ATAS tune: live status, temporary-mode label and the persistent result card.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { tuneStatus, tuneResultView, createTuneTracker, REASON_LABEL, OUTCOME_LABEL } = require("../remote-tune-ui.js");
const translations = require("../ui-translations.js");

const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const atas = { kind: "atas", seconds: 12, maxSeconds: 45 };
const done = { id: 1, at: 1000, outcome: "success", reason: null, kind: "atas", swr: 1.6, swrRaw: 70, txOff: true };

test("tuneStatus shows ATAS progress as N s / max and bounds the counter", () => {
  assert.equal(tuneStatus(null), null);
  assert.equal(tuneStatus(atas).text, "Ajustando ATAS... 12 s / 45 s máx.");
  assert.equal(tuneStatus({ ...atas, seconds: 99 }).seconds, 45);
  assert.equal(tuneStatus({ kind: "internal", seconds: 3, maxSeconds: 20 }).text, "Ajustando el acoplador... 3 s / 20 s máx.");
  assert.equal(tuneStatus({ kind: "atas", seconds: 3 }).text, "Ajustando ATAS... 3 s");
  assert.match(tuneStatus(atas).note, /temporal/);
});

test("tuneResultView: SWR from the raw FTX-1 curve is approximate, Hamlib ratios are not", () => {
  assert.equal(tuneResultView(done).swr, "Lectura final de ROE 1.6:1 (aproximada)");
  assert.equal(tuneResultView(done).approximate, true);
  assert.equal(tuneResultView({ ...done, swrRaw: null }).swr, "Lectura final de ROE 1.6:1");
  assert.equal(tuneResultView({ ...done, swr: 99 }).swr, "Lectura final de ROE ∞:1 (aproximada)");
  assert.equal(tuneResultView({ ...done, swr: null, swrRaw: null }).swr, "Lectura final de ROE: sin lectura");
});

test("tuneResultView reports outcome, reason and whether TX off was verified", () => {
  const timeout = tuneResultView({ ...done, outcome: "timeout", reason: "time-cap", swr: 99 });
  assert.deepEqual([timeout.outcome, timeout.label, timeout.reason], ["timeout", "Sintonía cortada por tiempo", "Tiempo máximo de ajuste alcanzado"]);
  assert.equal(tuneResultView(done).txText, "TX apagado verificado");
  const stuck = tuneResultView({ ...done, outcome: "fail", reason: "tx-stuck", txOff: false });
  assert.equal(stuck.txOff, false);
  assert.match(stuck.txText, /TX sin verificar/);
  assert.equal(tuneResultView({ ...done, outcome: "weird", reason: "unknown-code" }).label, "Sintonía fallida");
  assert.equal(tuneResultView({ ...done, outcome: "weird", reason: "unknown-code" }).reason, REASON_LABEL.other);
  assert.equal(tuneResultView(null), null);
});

test("tracker: first state is a baseline, a changed result becomes a card that survives until closed", () => {
  const tracker = createTuneTracker();
  assert.equal(tracker.update({ tuneResult: done }).card, null);
  assert.equal(tracker.update({ tune: atas, tuneResult: done }).card, null);
  assert.equal(tracker.update({ tune: atas, tuneResult: done }).status.seconds, 12);
  const next = { ...done, id: 2, at: 2000, outcome: "fail", reason: "swr-trip", txOff: true };
  assert.equal(tracker.update({ tuneResult: next }).card.outcome, "fail");
  // the same result keeps showing on later states, whichever tab is open
  assert.equal(tracker.update({ tuneResult: next }).card.reason, REASON_LABEL["swr-trip"]);
  tracker.dismiss();
  assert.equal(tracker.update({ tuneResult: next }).card, null);
});

test("tracker: starting another tune hides the previous card and a result with the same id after a restart still shows", () => {
  const tracker = createTuneTracker();
  tracker.update({});
  assert.ok(tracker.update({ tuneResult: done }).card);
  assert.equal(tracker.update({ tune: atas, tuneResult: done }).card, null);
  assert.ok(tracker.update({ tuneResult: { ...done, at: 5000 } }).card);
});

test("every outcome and reason text has es/en/fr/de translations with unique keys", () => {
  const sources = translations.map(entry => entry[0]);
  assert.equal(new Set(sources).size, sources.length);
  const byKey = new Map(translations.map(entry => [entry[0], entry]));
  const needed = [
    ...Object.values(OUTCOME_LABEL), ...Object.values(REASON_LABEL),
    tuneStatus(atas).note, "Modo de ajuste (temporal)", "Cerrar", "Cerrar el resultado de la sintonía",
    "TX apagado verificado", "TX sin verificar: la radio puede seguir transmitiendo",
    "Lectura final de ROE {0}:1 (aproximada)", "Lectura final de ROE {0}:1", "Lectura final de ROE: sin lectura",
    "Ajustando ATAS... {0} s / {1} s máx.", "Ajustando el acoplador... {0} s / {1} s máx.", "Ajustando ATAS... {0} s", "Ajustando el acoplador... {0} s"
  ];
  for (const source of needed) {
    const entry = byKey.get(source);
    assert.ok(entry, `missing translation: ${source}`);
    assert.equal(entry.length, 4, source);
    assert.ok(entry.slice(1).every(value => value && value.trim()), source);
  }
});

test("remote.html wires the status banner, the result card and the module; the agent serves it", () => {
  const html = read("remote.html");
  for (const id of ["tune-live", "tune-status", "tune-status-text", "tune-result", "tune-result-label", "tune-result-reason", "tune-result-swr", "tune-result-tx", "tune-result-close", "rig-tune"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.ok(html.indexOf('src="remote-tune-ui.js"') < html.indexOf('src="remote-ui.js"'));
  assert.match(read("remote-agent.cjs"), /"\/remote-tune-ui\.js"/);
  assert.match(read("package.json"), /remote-tune-ui\.test\.cjs/);
});

test("the result card is not inside the rig card (hidden on phones) and sits above the dock", () => {
  const html = read("remote.html");
  assert.ok(html.indexOf('id="tune-live"') > html.indexOf("</main>"));
  assert.match(read("remote.css"), /\.tune-live\{position:fixed;[^}]*bottom:var\(--dock-h\)/);
});

test("the console does not log the temporary tune mode as an operator change", () => {
  const ui = read("remote-ui.js");
  assert.match(ui, /if \(state\.mode && !state\.tune\)/);
  assert.match(ui, /rig-tune"\)\.hidden = !tuning/);
});
