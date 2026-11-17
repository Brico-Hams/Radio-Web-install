"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ALLOWED_FILES } = require("../server.cjs");

const root = path.join(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const VENDOR = "third_party/icom-custom-firmware/";
const index = JSON.parse(read(`${VENDOR}docs/patches/index.json`));

test("every vendored runtime file and the page files are in the server allowlist and exist", () => {
  const runtime = ["docs/js/worker.js", "docs/js/md5.js", "docs/js/codec.js", "docs/js/patch.js",
    "docs/patches/index.json", "LICENSE"].map(file => VENDOR + file);
  const patches = index.releases.map(entry => `${VENDOR}docs/patches/${entry.release.patch_file}`);
  for (const file of [...runtime, ...patches, "icom.html", "icom-ui.js", "ayuda-icom.html", "ayuda-icom.en.html"]) {
    assert.ok(ALLOWED_FILES.includes(file), `${file} missing from ALLOWED_FILES`);
    assert.ok(fs.existsSync(path.join(root, file)), `${file} does not exist`);
  }
});

test("index.json entries reference existing patches and well-formed MD5 values", () => {
  assert.ok(index.releases.length >= 3);
  for (const { input, release } of index.releases) {
    assert.match(input.md5, /^[0-9a-f]{32}$/, input.file);
    assert.match(release.output_md5, /^[0-9a-f]{32}$/, release.name);
    const patchPath = path.join(root, VENDOR, "docs/patches", release.patch_file);
    assert.ok(fs.existsSync(patchPath), release.patch_file);
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(patchPath, "utf8")), release.patch_file);
  }
});

test("icom.html carries the CSP, loads only same-origin scripts and credits upstream", () => {
  const html = read("icom.html");
  assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; [^"]*connect-src 'self'; object-src 'none'/);
  assert.doesNotMatch(html, /connect-src[^;"]*https?:/);
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
  assert.ok(scripts.includes("icom-ui.js"));
  for (const src of scripts) assert.doesNotMatch(src, /^(?:[a-z][a-z0-9+.-]*:)?\/\//i, src);
  assert.match(html, /<script type="module" src="icom-ui\.js">/);
  assert.doesNotMatch(html, /<script\b(?![^>]*\bsrc=)[^>]*>\s*\S/);
  assert.doesNotMatch(html, /translate\.google|fonts\.(?:googleapis|gstatic)/);
  assert.match(html, /Basado en icom-custom-firmware de Dawid SQ6EMM \(MIT\)/);
  for (const url of ["https://github.com/sq6emm/icom-custom-firmware", "https://sq6emm.github.io/icom-custom-firmware/",
    "https://mikrofale.cafe/showthread.php?tid=1296"]) {
    assert.match(html, new RegExp(`<a href="${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" target="_blank" rel="noopener noreferrer">`), url);
  }
  for (const id of ["icom-file", "icom-drop", "icom-status", "icom-build", "icom-download", "icom-accept", "icom-files-rows"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /id="icom-status" role="status" aria-live="polite"/);
});

test("icom-ui.js only fetches same-origin relative paths under the vendored docs folder", () => {
  const source = read("icom-ui.js");
  assert.match(source, /const DOCS = "third_party\/icom-custom-firmware\/docs\/";/);
  const calls = [...source.matchAll(/\bfetch\(\s*(`[^`]*`|[^,)]+)/g)].map(match => match[1].trim());
  assert.ok(calls.length >= 2);
  for (const target of calls) assert.match(target, /^`\$\{DOCS\}[^`]*`$/, target);
  assert.match(source, /new Worker\(new URL\(`\$\{DOCS\}js\/worker\.js`, location\.href\), \{ type: "module" \}\)/);
  assert.doesNotMatch(source, /https?:\/\//);
  assert.doesNotMatch(source, /\b(?:XMLHttpRequest|WebSocket|sendBeacon|navigator\.(?:serial|usb))\b/);
});
