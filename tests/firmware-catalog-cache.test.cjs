const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../radio-core.js");
require("../firmware-catalog.js");

const url = "https://api.github.com/repos/armel/uv-k1-k5v3-firmware-custom/releases?per_page=100&page=1";
const memoryStorage = () => {
  const data = new Map();
  return { getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, value) };
};
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

test("HTTP 403 con X-RateLimit-Reset usa la copia guardada y muestra la hora de renovacion", async () => {
  const storage = memoryStorage();
  const releases = [{ tag_name: "v6.1.0" }];
  await R.githubCachedJSON(url, { storage, fetchImpl: async () => json(releases, 200, { etag: '"abc"' }) });
  const reset = Math.floor(Date.now() / 1000) + 1800;
  const notices = [];
  const body = await R.githubCachedJSON(url, {
    storage, onNotice: notice => notices.push(notice),
    fetchImpl: async () => json({ message: "rate limit" }, 403, { "x-ratelimit-reset": String(reset) })
  });
  assert.deepEqual(body, releases);
  assert.equal(notices.length, 1);
  assert.equal(notices[0].resetAt, reset * 1000);
  const text = R.catalogNoticeText(notices[0]);
  assert.match(text, /Límite de GitHub alcanzado; se usa la copia guardada/);
  assert.ok(text.includes(R.formatClock(reset * 1000)));
});

test("HTTP 403 sin copia guardada usa el catalogo estatico del sitio y nunca queda sin catalogo", async () => {
  const reset = Math.floor(Date.now() / 1000) + 600;
  const releases = [{ tag_name: "v6.1.0" }];
  const notices = [];
  const body = await R.githubCachedJSON(url, {
    storage: memoryStorage(), onNotice: notice => notices.push(notice),
    fetchImpl: async target => target === url
      ? json({ message: "rate limit" }, 403, { "x-ratelimit-reset": String(reset) })
      : json({ version: 1, generatedAt: "2026-01-02T03:04:05Z", pages: { [url]: releases } })
  });
  assert.deepEqual(body, releases);
  assert.equal(notices[0].source, "static");
  assert.ok(R.catalogNoticeText(notices[0]).includes(R.formatClock(reset * 1000)));
  assert.match(R.catalogNoticeText(notices[0]), /catálogo incluido en el sitio/);
});

test("sin copia ni catalogo estatico el 403 sigue siendo un error", async () => {
  await assert.rejects(R.githubCachedJSON(url, {
    storage: memoryStorage(),
    fetchImpl: async () => json({ message: "rate limit" }, 403)
  }), /HTTP 403/);
});

test("HTTP 304 con If-None-Match reutiliza la copia sin aviso", async () => {
  const storage = memoryStorage();
  const releases = [{ tag_name: "v6.0.0" }];
  await R.githubCachedJSON(url, { storage, fetchImpl: async () => json(releases, 200, { etag: '"v1"' }) });
  const seen = [];
  const notices = [];
  const body = await R.githubCachedJSON(url, {
    storage, onNotice: notice => notices.push(notice),
    fetchImpl: async (target, init) => { seen.push(init.headers["If-None-Match"]); return new Response(null, { status: 304 }); }
  });
  assert.deepEqual(body, releases);
  assert.deepEqual(seen, ['"v1"']);
  assert.equal(notices.length, 0);
});
