"use strict";
// Structure of the console polish: one-row top bar, sticky summary, dock height, tab reveal,
// collapsed spectrum, stacked forms, CW reasons and translations. Static checks, no clocks or transports needed.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const css = read("remote.css").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\r/g, "");
const html = read("remote.html");
const ui = read("remote-ui.js");

// Top-level rules plus the rules inside each @media block, keyed by the media condition ("" = global).
function parse(source) {
  const blocks = { "": [] };
  let rest = source;
  const media = /@media\s*([^{]+)\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g;
  for (const m of source.matchAll(media)) {
    blocks[m[1].trim()] = [...m[2].matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(r => ({ selector: r[1].trim(), body: r[2] }));
    rest = rest.replace(m[0], "");
  }
  blocks[""] = [...rest.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(r => ({ selector: r[1].trim(), body: r[2] }));
  return blocks;
}
const blocks = parse(css);
const decl = (selector, prop, media = "") => {
  const values = (blocks[media] || []).filter(r => r.selector.split(",").map(s => s.trim()).includes(selector))
    .map(r => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(r.body)?.[1]?.trim()).filter(Boolean);
  return values.length ? values[values.length - 1] : null;
};
const px = value => Number(/^(\d+(?:\.\d+)?)px$/.exec(value || "")?.[1] ?? NaN);
const tokens = selector => {
  const out = {};
  for (const r of blocks[""].filter(rule => rule.selector === selector)) {
    for (const m of r.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) out[m[1]] = m[2].trim();
  }
  return out;
};
const dark = tokens(":root");
const THEMES = { dark, light: { ...dark, ...tokens(":root[data-theme=light]") } };
const luminance = hex => {
  const channel = i => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const themed = (theme, name) => THEMES[theme][name];

test("phone top bar is one row of at most 56px with a chip and a menu for relay and language", () => {
  assert.ok(px(dark["--topbar-h"]) <= 56);
  assert.equal(decl(".topbar", "height"), "var(--topbar-h)");
  assert.equal(decl(".topbar", "flex-wrap"), "nowrap");
  assert.equal(decl(".topbar", "position"), "sticky");
  assert.ok(px(decl("button", "min-height")) === 48 && 48 + 2 <= 56, "the 48px menu target fits the bar");
  const header = /<header class="topbar">[\s\S]*?<\/header>/.exec(html)[0];
  assert.match(header, /id="topbar-menu"[^>]*aria-expanded="false"[^>]*aria-controls="topbar-panel"/);
  const panel = /<div id="topbar-panel" class="topbar-right">([\s\S]*?)<\/div>/.exec(header)[1];
  assert.match(panel, /id="relay"/);
  assert.doesNotMatch(panel, /id="status"|id="latency"/);
  const chip = /<div class="conn-chip">([\s\S]*?)<\/div>/.exec(header)[1];
  assert.match(chip, /id="status"/);
  assert.match(chip, /id="latency"/);
  const phone = "(max-width:767px)";
  assert.equal(decl(".topbar-right", "display", phone), "none");
  assert.match(css, /\.topbar\[data-menu=open\] \.topbar-right\{display:flex;[^}]*position:absolute/);
  assert.equal(decl(".topbar-menu", "display", "(min-width:768px)"), "none");
  assert.match(ui, /aria-expanded/);
  assert.match(ui, /Escape/);
});

test("the placeholder dashes next to the logo are gone: callsign is hidden until known", () => {
  assert.match(html, /<span id="callsign" class="callsign" translate="no" hidden><\/span>/);
  assert.equal(decl(".callsign[hidden]", "display"), "none");
  assert.match(ui, /\$\("callsign"\)\.hidden = false/);
});

test("sticky summary shows frequency, mode, RX/TX and S-meter when the rig card is out of view", () => {
  assert.match(html, /<div id="sticky-summary" class="sticky-summary"[^>]*hidden>/);
  for (const id of ["sum-trx", "sum-freq", "sum-mode", "sum-smeter"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.equal(decl(".sticky-summary-wrap", "position"), "sticky");
  assert.equal(decl(".sticky-summary-wrap", "height"), "0");
  assert.equal(decl(".sticky-summary-wrap", "top"), "var(--topbar-h)");
  assert.equal(decl(".sticky-summary", "position"), "absolute");
  assert.match(ui, /function renderSummary\(state\)/);
  assert.match(ui, /classList\.toggle\("tx", tx\)/);
  assert.match(ui, /rig\.getBoundingClientRect\(\)\.bottom <= bar\.offsetHeight/);
  assert.match(ui, /renderSummary\(state\);/);
  for (const theme of Object.keys(THEMES)) {
    assert.equal(decl(".sticky-summary.tx", "background"), "var(--tx)");
    assert.ok(contrast(themed(theme, "--on-tx"), themed(theme, "--tx")) >= 4.5, `${theme}: TX summary text`);
    assert.ok(contrast(themed(theme, "--tx"), themed(theme, "--on-tx")) >= 4.5, `${theme}: TX chip text`);
    assert.ok(contrast(themed(theme, "--ok"), themed(theme, "--surface")) >= 4.5, `${theme}: RX chip text`);
  }
});

test("bottom block stays at or under 136px on phones and the PTT keeps at least 64px", () => {
  const phone = "(max-width:400px)";
  const ptt = px(decl(".ptt", "min-height", phone));
  const secondary = px(decl(".lock", "min-height", phone));
  assert.ok(ptt >= 64);
  assert.ok(secondary >= 48 && ptt > secondary, "PTT stays the largest control");
  const padding = /^(\d+)px \d+px calc\((\d+)px/.exec(decl(".dock", "padding", phone));
  const height = 2 + Number(padding[1]) + ptt + px(decl(".dock", "gap", phone)) + secondary + Number(padding[2]);
  assert.ok(height <= 136, `dock ${height}px`);
  assert.ok(px(decl(":root", "--dock-h", phone)) >= height && px(decl(":root", "--dock-h", phone)) <= 136);
  const wide = 2 + 8 + px(decl(".ptt", "min-height")) + 8;
  assert.ok(wide <= 136, `dock between 401 and 767px ${wide}px`);
  assert.match(html, /<footer class="dock">[\s\S]*id="audio"[\s\S]*id="ptt"[\s\S]*id="lock"[\s\S]*<\/footer>/);
});

test("selecting a tab reveals its panel under the sticky bars without moving the page when it is idle", () => {
  assert.equal(decl(".tabs", "scroll-margin-top"), "calc(var(--topbar-h) + var(--summary-h) + 8px)");
  assert.match(ui, /function revealTabs\(\)/);
  assert.match(ui, /tabs\.scrollIntoView\(\{ block: "start", inline: "nearest", behavior: calm \? "auto" : "smooth" \}\)/);
  assert.match(ui, /addEventListener\("click", \(\) => selectTab\(tab, false, true\)\)/);
  assert.match(ui, /prefers-reduced-motion: reduce/);
});

test("without audio the spectrum card collapses to one short row with its action", () => {
  assert.match(html, /<section id="spectrum" class="card spectrum collapsed"/);
  assert.match(html, /<div class="spectrum-head">[\s\S]*id="spectrum-audio"[^>]*class="primary spectrum-audio"/);
  assert.equal(decl(".spectrum.collapsed", "padding"), "8px 12px");
  assert.equal(decl(".spectrum-head", "display"), "flex");
  assert.match(ui, /classList\.toggle\("collapsed", !show\)/);
  assert.match(ui, /\$\("spectrum-audio"\)\.hidden = audio\.on/);
  assert.match(ui, /\$\("spectrum-audio"\)\.addEventListener\("click", \(\) => \{ if \(!audio\.on\) startAudio\(\); \}\)/);
});

test("forms stack label above a full-width input on phones", () => {
  const phone = "(max-width:767px)";
  assert.equal(decl(".settings-tools", "flex-direction", phone), "column");
  assert.equal(decl(".settings-tools", "align-items", phone), "stretch");
  assert.equal(decl(".settings-search", "flex", phone), "1 1 100%");
  assert.equal(decl(".settings-search input", "width"), "100%");
  assert.match(html, /<label class="settings-search">Buscar ajuste/);
  assert.doesNotMatch(html, /<label class="step-field">Buscar ajuste/);
  assert.equal(decl(".settings-search", "min-width"), "0");
  for (const selector of [".rotor-row label", ".rotor-file", ".scope-controls label"]) assert.equal(decl(selector, "flex", phone), "1 1 100%", selector);
  assert.equal(decl(".rotor-row input", "width", phone), "100%");
  assert.equal(decl(".scope-controls label", "min-width"), "0");
  // Every labelled field outside the tune row is a grid or a stacked flex column: never an inline label squeezing its input.
  assert.equal(decl("label", "display"), "grid");
});

test("disabled CW actions explain why and the idle stop button is not an urgent red control", () => {
  assert.match(html, /<p id="cw-reason" class="action-reason" role="status"[^>]*hidden><\/p>/);
  assert.match(html, /id="cw-stop" type="button" class="danger" data-idle="true"/);
  assert.match(ui, /setText\(\$\("cw-reason"\), cwReason\)/);
  assert.match(ui, /setAttr\(\$\("cw-stop"\), "data-idle", String\(!cwActive\)\)/);
  for (const state of ["", ":hover:not(:disabled)", ":active:not(:disabled)"]) {
    assert.ok(decl(`button.danger[data-idle=true]${state || ":not(:disabled)"}`, "background"), `idle rule ${state}`);
  }
  for (const theme of Object.keys(THEMES)) {
    const fill = themed(theme, "--surface-2");
    assert.ok(contrast(themed(theme, "--text"), fill) >= 4.5, `${theme}: idle stop text`);
    assert.ok(contrast(themed(theme, "--control-border"), themed(theme, "--bg")) >= 3, `${theme}: idle stop edge`);
    assert.ok(contrast(themed(theme, "--text"), themed(theme, "--bg")) >= 4.5, `${theme}: reason text`);
  }
  // The stop path itself is untouched: the button is never disabled by the console.
  assert.doesNotMatch(ui, /\$\("cw-stop"\)\.disabled/);
});

test("every new visible text has a complete es/en/fr/de entry", () => {
  const entries = require("../ui-translations.js");
  const sources = [
    "Menú", "Activar audio", "Frecuencia y estado de la radio",
    "Motivo: el CW remoto esta desactivado en el agente.", "Motivo: ya se esta enviando CW. Usa Parar CW.",
    "Motivo: el panel esta bloqueado.", "Motivo: la radio esta transmitiendo o sintonizando.",
    "Motivo: sin conexion con la radio o con el control de otro operador."
  ];
  for (const source of sources) {
    const matches = entries.filter(entry => entry[0] === source);
    assert.equal(matches.length, 1, `${source}: unique`);
    assert.equal(matches[0].length, 4, `${source}: four locales`);
    assert.ok(matches[0].every(value => value.trim()), `${source}: non-empty`);
  }
  for (const reason of sources.slice(3)) assert.ok(ui.includes(reason), `${reason} is used by remote-ui.js`);
});
