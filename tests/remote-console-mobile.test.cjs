"use strict";
// Mobile containment of the remote console: the tab row scrolls on its own and nothing widens the page.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const css = read("remote.css");
const VIEWPORTS = [320, 360, 390, 412];

function rules() {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = re.exec(css))) out.push({ selector: match[1].trim(), body: match[2] });
  return out;
}
const decl = (selector, prop) => {
  const values = rules().filter(rule => rule.selector.split(",").map(s => s.trim()).includes(selector))
    .map(rule => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(rule.body)?.[1]?.trim()).filter(Boolean);
  return values.length ? values[values.length - 1] : null;
};

test("tab row scrolls inside its own container", () => {
  assert.equal(decl(".tabs", "overflow-x"), "auto");
  assert.equal(decl(".tabs", "min-width"), "0");
  assert.equal(decl(".tabs", "max-width"), "100%");
  assert.match(decl(".tabs button", "flex"), /^1 0 auto$/);
  assert.equal(decl(".tabs button", "white-space"), "nowrap");
});

test("flex and grid children involved can shrink below their content", () => {
  assert.equal(decl(".ptt", "min-width"), "0");
  assert.equal(decl(".card", "min-width"), "0");
  assert.equal(decl(".tuner", "min-width"), "0");
  assert.equal(decl(".brand", "min-width"), "0");
  // Base (mobile) rule is the first declaration; wider media queries override it later.
  assert.match(css, /main\.console\{[^}]*grid-template-columns:minmax\(0,1fr\)\}/);
  assert.equal(decl("html", "overflow-x"), "hidden");
});

test("no fixed width wider than the smallest viewport", () => {
  for (const rule of rules()) {
    for (const m of rule.body.matchAll(/(?:^|;)\s*(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)) {
      assert.ok(Number(m[1]) < Math.min(...VIEWPORTS), `${rule.selector} width ${m[1]}px`);
    }
    for (const m of rule.body.matchAll(/(?:^|;)\s*(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)(rem|em)/g)) {
      assert.ok(Number(m[1]) * 16 < Math.min(...VIEWPORTS), `${rule.selector} width ${m[1]}${m[2]}`);
    }
    assert.doesNotMatch(rule.body, /(?:^|;)\s*width\s*:\s*\d+(?:\.\d+)?vw/, rule.selector);
  }
});

test("PTT bar stays fixed, full width and inside the safe area", () => {
  assert.equal(decl(".dock", "position"), "fixed");
  assert.equal(decl(".dock", "left"), "0");
  assert.equal(decl(".dock", "right"), "0");
  assert.equal(decl(".dock", "bottom"), "0");
  assert.equal(decl(".dock", "max-width"), "100%");
  assert.match(css, /\.dock\{[^}]*env\(safe-area-inset-bottom\)/);
});

test("narrow breakpoints shrink the frequency display and dock buttons", () => {
  assert.match(css, /@media\(max-width:420px\)\{[^@]*\.freq\{font-size:clamp\(/);
  assert.match(css, /@media\(max-width:400px\)\{[^@]*\.tune-stop/);
});

test("ARIA tab markup and keyboard handling are unchanged and active tab is revealed", () => {
  const html = read("remote.html");
  assert.match(html, /<div class="tabs" role="tablist"/);
  assert.equal((html.match(/role="tab"/g) || []).length, 8);
  const ui = read("remote-ui.js");
  assert.match(ui, /ArrowRight: 1, ArrowLeft: -1/);
  assert.match(ui, /scrollIntoView\(\{ block: "nearest", inline: "nearest" \}\)/);
});
