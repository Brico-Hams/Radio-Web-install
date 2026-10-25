"use strict";
// Shared by the local server and scripts/fetch-studio.cjs: the Studio copy must match studio.lock.json.
const { createHash } = require("node:crypto");
const sha256 = data => createHash("sha256").update(data).digest("hex");

// CSP hashes of the inline scripts the browser executes (data blocks such as the embedded firmware are skipped).
function scriptHashes(html) {
  const hashes = [];
  for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(attributes)) throw new Error("Studio debe ser autonomo: no admite scripts externos.");
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attributes)?.[1].toLowerCase();
    if (type && !["text/javascript", "module", "application/javascript"].includes(type)) continue;
    hashes.push(`sha256-${createHash("sha256").update(body, "utf8").digest("base64")}`);
  }
  if (hashes.length === 0) throw new Error("Studio sin scripts: archivo inesperado.");
  return hashes;
}

function verify(data, lock) {
  if (data.length !== lock.bytes || sha256(data) !== lock.sha256) {
    throw new Error(`Studio no coincide con studio.lock.json (commit ${lock.commit}).`);
  }
  return data;
}

module.exports = { sha256, scriptHashes, verify };
