const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { once } = require("node:events");
const http = require("node:http");
const { FirmwareService, TARGETS, fetchLimited, validateHop, directoryLinks, parseF4Release, verifyDownload } = require("../firmware-service.cjs");
const { createServer } = require("../server.cjs");
const R = require("../radio-core.js");
require("../firmware-catalog.js");
const repo = "https://github.com/armel/uv-k1-k5v3-firmware-custom";
const api = "https://api.github.com/repos/armel/uv-k1-k5v3-firmware-custom/releases?per_page=100&page=1";
const ardfRepo = "https://github.com/reald/uv-k1-k5v3-firmware-custom";
const ardfAPI = "https://api.github.com/repos/reald/uv-k1-k5v3-firmware-custom/releases?per_page=100&page=1";
const { parseQuanshengRelease, loadQuanshengEntries } = R.firmwareCore;
const official = "https://www.opengd77.com/downloads/releases/MK22/";
const sha = data => createHash("sha256").update(data).digest("hex");
function image() {
  const data = Buffer.alloc(512);
  data.writeUInt32LE(0x20003000, 0);
  data.writeUInt32LE(0x08002841, 4);
  data.write("F4HWN v6.2.0", 64);
  return data;
}
function release(data = image()) {
  return {
    tag_name: "v6.2.0", html_url: `${repo}/releases/tag/v6.2.0`, draft: false, prerelease: false,
    assets: [{ name: "f4hwn.labs.v6.2.0.bin", state: "uploaded", size: data.length,
      digest: `sha256:${sha(data)}`, browser_download_url: `${repo}/releases/download/v6.2.0/f4hwn.labs.v6.2.0.bin` }]
  };
}
function fakeF4(data = image(), metadata = release(data)) {
  return async url => new Response(url === api ? JSON.stringify([metadata]) : url === ardfAPI ? "[]" : data);
}
function ardfRelease(tag = "ARDF-K5v3_K1-v0.5", name = "f4hwn.ARDF_K5v3_K1.bin") {
  const metadata = release();
  return { ...metadata, tag_name: tag, html_url: `${ardfRepo}/releases/tag/${tag}`,
    assets: [{ ...metadata.assets[0], name, browser_download_url: `${ardfRepo}/releases/download/${tag}/${name}` }] };
}
function historicalRelease(version, name) {
  const metadata = release();
  return { ...metadata, tag_name: version, html_url: `${repo}/releases/tag/${version}`,
    assets: [{ ...metadata.assets[0], name, browser_download_url: `${repo}/releases/download/${version}/${name}` }] };
}
function row(name, size = 0) {
  return `<tr><td><a href="${name}">${name}</a></td><td data-sort="20260131">date</td><td data-sort="${size}">size</td></tr>`;
}
test("F4 catalog accepts only stable same-repository releases and known matching assets", () => {
  const entries = parseF4Release(release(), "UV-K1");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].expectedSHA256, sha(image()));
  for (const patch of [{ prerelease: true }, { draft: true }, { tag_name: "v7.0.0" },
    { tag_name: "v6.2.0-dev" }, { html_url: "https://example.com" }, { assets: [] }]) {
    assert.throws(() => parseF4Release({ ...release(), ...patch }, "UV-K1"));
  }
  const metadata = release();
  for (const patch of [{ digest: null }, { digest: "sha256:wrong" }, { size: 0x1d801 },
    { size: 255 }, { state: "new" }, { browser_download_url: "https://example.com/file.bin" }]) {
    assert.throws(() => parseF4Release({ ...metadata, assets: [{ ...metadata.assets[0], ...patch }] }, "UV-K1"));
  }
  assert.throws(() => parseF4Release({ ...metadata, assets: [{ ...metadata.assets[0], name: "f4hwn.labs.v6.1.0.bin" }] }, "UV-K1"));
});
test("ARDF stable releases are verified downloads, never slot images", () => {
  for (const metadata of [ardfRelease(), ardfRelease("ARDF-K5v3_K1-v0.5.1", "UV_K5v3_K1_ARDF.bin")]) {
    for (const target of ["UV-K1", "UV-K5-V3"]) {
      const [entry] = parseQuanshengRelease(metadata, target, "reald/uv-k1-k5v3-firmware-custom");
      assert.equal(entry.edition, "ARDF");
      assert.equal(entry.publisher, "reald / ARDF");
      assert.equal(entry.expectedSHA256, sha(image()));
      assert.equal(entry.slotCompatible, false);
    }
  }
  for (const patch of [{ prerelease: true }, { draft: true }, { html_url: release().html_url },
    { tag_name: "ARDF-v0.1a" }]) {
    assert.throws(() => parseQuanshengRelease({ ...ardfRelease(), ...patch }, "UV-K1", "reald/uv-k1-k5v3-firmware-custom"));
  }
  for (const patch of [{ digest: null }, { browser_download_url: release().assets[0].browser_download_url }]) {
    const metadata = ardfRelease();
    assert.throws(() => parseQuanshengRelease({ ...metadata, assets: [{ ...metadata.assets[0], ...patch }] },
      "UV-K1", "reald/uv-k1-k5v3-firmware-custom"));
  }
  assert.throws(() => parseQuanshengRelease(ardfRelease(), "UV-K1", "untrusted/repo"));
});
test("historical F4HWN filters exact hardware, release and specialized variants", () => {
  for (const [target, hardware] of [["UV-K1", "k1"], ["UV-K5-V3", "k5v3"]]) {
    const metadata = historicalRelease("v4.3.0", `f4hwn.${hardware}.fusion.v4.3.bin`);
    assert.equal(parseF4Release(metadata, target)[0].slotCompatible, false);
    const other = target === "UV-K1" ? "UV-K5-V3" : "UV-K1";
    assert.deepEqual(parseQuanshengRelease(metadata, other), []);
  }
  for (const [version, name] of [["v5.2.0", "f4hwn.fusion.v5.2.0.bin"],
    ["v5.9.0", "f4hwn.fusion.v5.9.0.sa818.bin"], ["v6.2.0", "f4hwn.fusion.v6.2.0.sa818.bin"]]) {
    assert.equal(parseF4Release(historicalRelease(version, name), "UV-K1")[0].slotCompatible, false);
  }
  assert.equal(parseF4Release(release(), "UV-K5-V3")[0].slotCompatible, true);
  assert.throws(() => parseF4Release(historicalRelease("v5.2.0", "f4hwn.fusion.v5.1.0.bin"), "UV-K1"));
  assert.throws(() => parseF4Release(release(), "GD-77"));
});
test("shared catalog loads both publishers, sorts versions and paginates without admitting development builds", async () => {
  const requests = [];
  const old = historicalRelease("v5.2.0", "f4hwn.fusion.v5.2.0.bin");
  const entries = await loadQuanshengEntries("UV-K5-V3", async url => {
    requests.push(url);
    if (url === api) return Array.from({ length: 100 }, () => ({ ...release(), prerelease: true }));
    if (url === api.replace("&page=1", "&page=2")) return [old, release(), { ...release(), draft: true }];
    if (url === ardfAPI) return [ardfRelease(), { ...ardfRelease(), prerelease: true }];
    assert.fail(`Unexpected URL ${url}`);
  });
  assert.equal(requests.length, 3);
  assert.deepEqual(entries.map(entry => entry.version), ["v6.2.0", "v5.2.0", "ARDF-K5v3_K1-v0.5"]);
  await assert.rejects(loadQuanshengEntries("UV-K1", async () => ({})), /Historial/);
  await assert.rejects(loadQuanshengEntries("UV-K1", async () => []), /No hay imagenes/);
  await assert.rejects(loadQuanshengEntries("UV-K1", async () => Array(100).fill({ prerelease: true })), /incompleto/);
});
test("ARDF catalog download retains publisher provenance and rejects changed bytes", async () => {
  const data = image();
  const service = new FirmwareService(async url => new Response(
    url === api ? "[]" : url === ardfAPI ? JSON.stringify([ardfRelease()]) : data));
  const [entry] = (await service.catalog("UV-K5-V3")).entries;
  const file = await service.download(entry.id);
  const payload = { manifest: file.manifest, data: file.data.toString("base64") };
  assert.equal((await R.verifyFirmwarePayload(entry, payload)).manifest.slotCompatible, false);
  assert.equal(file.manifest.publisherHashVerified, true);
  const changed = new Uint8Array(data); changed[20] = 1;
  await assert.rejects(R.verifyLocalFirmware(entry, changed, entry.name), /SHA-256/);
});
test("failure of either publisher never caches a partial catalog", async () => {
  let failARDF = true;
  const service = new FirmwareService(async url => {
    if (url === api) return new Response(JSON.stringify([release()]));
    if (url === ardfAPI) return failARDF
      ? new Response("Unavailable", { status: 503 })
      : new Response(JSON.stringify([ardfRelease()]));
    assert.fail(`Unexpected URL ${url}`);
  });
  await assert.rejects(service.catalog("UV-K1"), /HTTP 503/);
  assert.equal(service.cache.size, 0);
  assert.equal(service.entries.size, 0);
  failARDF = false;
  assert.equal((await service.catalog("UV-K1")).entries.length, 2);
});
test("redirect policy rejects host lookalikes, private hosts, credentials, downgrade, query and path changes", () => {
  const binary = release().assets[0].browser_download_url;
  assert.equal(validateHop("https://release-assets.githubusercontent.com/path?token=test", binary).hostname, "release-assets.githubusercontent.com");
  for (const bad of ["http://www.opengd77.com/a", "https://127.0.0.1/a", "https://github.com.evil.test/a",
    "https://user:password@github.com/a", "https://github.com:8443/a", "https://objects.githubusercontent.com.evil.test/a",
    "https://github.com/a#fragment"]) assert.throws(() => validateHop(bad, binary));
  for (const bad of [`${official}?x=1`, `${official}other`, "https://objects.githubusercontent.com/file"]) {
    assert.throws(() => validateHop(bad, official));
  }
  assert.throws(() => validateHop(`${api}?extra=1`, api));
  const ardfBinary = ardfRelease().assets[0].browser_download_url;
  assert.equal(validateHop("https://release-assets.githubusercontent.com/ardf", ardfBinary).hostname, "release-assets.githubusercontent.com");
  assert.throws(() => validateHop(ardfBinary.replace("/reald/", "/unknown/"), ardfBinary.replace("/reald/", "/unknown/")));
});
test("bounded fetching follows permitted redirects and rejects redirect loops and upstream failures", async () => {
  let calls = 0;
  const binary = release().assets[0].browser_download_url;
  const data = await fetchLimited(binary, 8, async url => {
    calls++;
    return url === binary ? new Response(null, { status: 302, headers: { location: "https://release-assets.githubusercontent.com/test" } }) : new Response("abc");
  });
  assert.equal(data.toString(), "abc");
  assert.equal(calls, 2);
  for (const status of [403, 404, 429, 500]) await assert.rejects(fetchLimited(api, 8, async () => new Response("", { status })), /HTTP/);
  await assert.rejects(fetchLimited(api, 8, async () => new Response(null, { status: 302 })), /sin destino/);
  await assert.rejects(fetchLimited(api, 8, async () => new Response(null, { status: 302, headers: { location: api } })), /Demasiadas/);
  calls = 0;
  await assert.rejects(fetchLimited(binary, 8, async () => {
    calls++;
    return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secret" } });
  }), /insegura/);
  assert.equal(calls, 1);
});
test("declared and streamed byte limits reject oversized and empty responses", async () => {
  for (const length of ["999", "-1", "invalid"]) {
    await assert.rejects(fetchLimited(api, 3, async () => new Response("abc", { headers: { "content-length": length } })), /limite/);
  }
  await assert.rejects(fetchLimited(api, 3, async () => new Response("abcd")), /limite/);
  await assert.rejects(fetchLimited(api, 3, async () => new Response(null)), /vacia/);
  assert.equal((await fetchLimited(api, 3, async () => new Response("abc"))).length, 3);
});
test("directory parser extracts exact bytes and excludes traversal, other hosts and nested paths", () => {
  const html = row("R20260131/") + row("OpenGD77.zip", 1234) + row("../") +
    row("https://evil.test/firmware.bin", 2) + row("nested/file.zip", 2) + row("bad%2f.zip", 2) + row("bad.zip?url=x", 2);
  assert.deepEqual(directoryLinks(html, official).map(item => [item.name, item.size]), [["R20260131/", 0], ["OpenGD77.zip", 1234]]);
});
test("every exact model filter excludes incompatible hardware and bulk archives", () => {
  for (const [id, config] of Object.entries(TARGETS)) {
    if (!config.pattern) continue;
    assert.equal(config.pattern.test("OPENGD77_20260131.zip"), false, id);
    assert.equal(config.pattern.test("OpenMD380.zip"), false, id);
  }
  assert.equal(TARGETS["GD-77"].pattern.test("OpenGD77S.zip"), false);
  assert.equal(TARGETS["DM-1801"].pattern.test("OpenDM1801A.zip"), false);
  assert.equal(TARGETS["MD-UV380"].pattern.test("OpenMDUV380_10W_PLUS.zip"), false);
  for (const version of [1, 2, 4, 5]) for (const other of [1, 2, 4, 5]) {
    assert.equal(TARGETS[`MD-9600-V${version}`].pattern.test(`MD9600_firmware_HW_V${other}.zip`), version === other);
  }
});
test("OpenGD77 catalog picks newest stable directory and only exact target files", async () => {
  const zip = Buffer.from([80, 75, 3, 4, 0, 0, 0, 0]);
  const requests = [];
  const service = new FirmwareService(async url => {
    requests.push(url);
    if (url === official) return new Response(row("R20250101/") + row("R20260131/") + row("Development/") + row("R99999999-dev/"));
    if (url.endsWith("/firmware/")) return new Response(row("OpenGD77.zip", zip.length) + row("OpenGD77S.zip", 8) + row("OPENGD77_20260131.zip", 8));
    return new Response(zip);
  });
  const catalog = await service.catalog("GD-77");
  assert.equal(catalog.entries.length, 1);
  assert.equal(catalog.entries[0].version, "R20260131");
  const file = await service.download(catalog.entries[0].id);
  assert.equal(file.manifest.publisherHashVerified, false);
  assert.equal(file.manifest.expectedSHA256, null);
  assert.equal(file.manifest.slotCompatible, false);
  assert.equal(file.sha256, sha(zip));
  assert.match(requests[1], /R20260131\/firmware\/$/);
});
test("OpenGD77 missing assets, size or stable directory fail explicitly", async () => {
  for (const listing of ["", row("OpenGD77S.zip", 8), row("OpenGD77.zip", 0), row("OpenGD77.zip", 5000000)]) {
    const service = new FirmwareService(async url => new Response(url === official ? row("R20260131/") : listing));
    await assert.rejects(service.catalog("GD-77"));
  }
  await assert.rejects(new FirmwareService(async () => new Response(row("Development/"))).catalog("GD-77"), /estable/);
});
test("binary verifier rejects bad size, hash, vectors and HTML masquerading as ZIP", () => {
  const good = image();
  const entry = parseF4Release(release(good), "UV-K1")[0];
  assert.equal(verifyDownload(entry, good), sha(good));
  assert.throws(() => verifyDownload(entry, good.subarray(1)), /Tamano/);
  const changed = Buffer.from(good); changed[50] = 1;
  assert.throws(() => verifyDownload(entry, changed), /SHA-256/);
  for (const [offset, value] of [[0, 0x10000000], [0, 0x20003001], [4, 0x08002840], [4, 0x08002800 + good.length + 1]]) {
    const invalid = Buffer.from(good); invalid.writeUInt32LE(value, offset);
    assert.throws(() => verifyDownload({ ...entry, expectedSHA256: sha(invalid) }, invalid), /Vectores/);
  }
  assert.throws(() => verifyDownload({ size: 4, expectedSHA256: null, format: "zip" }, Buffer.from("HTML")), /ZIP/);
});
test("catalog cache deduplicates requests and expires download identifiers", async () => {
  let now = 1000000;
  let calls = 0;
  const service = new FirmwareService(async (...args) => { calls++; return fakeF4()(...args); }, () => now);
  const [first, second] = await Promise.all([service.catalog("UV-K1"), service.catalog("UV-K1")]);
  assert.equal(first, second);
  assert.equal(await service.catalog("UV-K1"), first);
  assert.equal(calls, 2);
  const id = first.entries[0].id;
  assert.equal((await service.download(id)).manifest.backupSubstitute, false);
  now += 600001;
  await assert.rejects(service.download(id), /caducado/);
  assert.notEqual(await service.catalog("UV-K1"), first);
  assert.equal(calls, 5);
});
test("unknown model/ID never fetches a client-provided URL", async () => {
  let calls = 0;
  const service = new FirmwareService(async () => { calls++; throw new Error("Should not fetch"); });
  for (const target of ["__proto__", "DM-32", "UV008", "https://evil.test", ""]) await assert.rejects(service.catalog(target), /confirmada/);
  for (const id of ["https://evil.test", "", "abc"]) await assert.rejects(service.download(id), /invalido/);
  await assert.rejects(service.download("0".repeat(64)), /caducado/);
  assert.equal(calls, 0);
});
test("concurrency is bounded and failed downloads release capacity", async () => {
  let unblock;
  const blocked = new Promise(resolve => { unblock = resolve; });
  const service = new FirmwareService(async url => {
    if (url === api) return new Response(JSON.stringify([release()]));
    if (url === ardfAPI) return new Response("[]");
    await blocked;
    return new Response("upstream unavailable", { status: 503 });
  });
  const id = (await service.catalog("UV-K1")).entries[0].id;
  const first = assert.rejects(service.download(id), /HTTP 503/);
  const second = assert.rejects(service.download(id), /HTTP 503/);
  await assert.rejects(service.download(id), error => error.status === 429);
  unblock();
  await Promise.all([first, second]);
  assert.equal(service.activeDownloads, 0);
});
test("upstream JSON/network failures do not poison pending catalogs", async () => {
  let calls = 0;
  const service = new FirmwareService(async () => {
    calls++;
    if (calls === 1) return new Response("not JSON");
    if (calls === 2) throw new Error("Network unavailable");
    return new Response(calls === 3 ? JSON.stringify([release()]) : "[]");
  });
  await assert.rejects(service.catalog("UV-K1"));
  await assert.rejects(service.catalog("UV-K1"), /Network/);
  assert.equal((await service.catalog("UV-K1")).entries.length, 1);
});
test("browser independently verifies payload, model, source, size and publisher hashes", async () => {
  const service = new FirmwareService(fakeF4());
  const entry = (await service.catalog("UV-K1")).entries[0];
  const file = await service.download(entry.id);
  const payload = { manifest: file.manifest, data: file.data.toString("base64") };
  assert.equal(sha((await R.verifyFirmwarePayload(entry, payload)).data), entry.expectedSHA256);
  for (const patch of [{ id: "wrong" }, { target: "UV-K5-V3" }, { url: "https://evil.test" },
    { size: 10 }, { sha256: "0".repeat(64) }, { publisherHashVerified: false }, { backupSubstitute: true },
    { expectedSHA256: "0".repeat(64) }, { source: "https://evil.test" }, { format: "zip" },
    { manifestFormat: "backup" }, { manifestVersion: 2 }, { slotCompatible: false }]) {
    await assert.rejects(R.verifyFirmwarePayload(entry, { ...payload, manifest: { ...payload.manifest, ...patch } }));
  }
  await assert.rejects(R.verifyFirmwarePayload(entry, { ...payload, data: "AA==" }), /tamano/);
  await assert.rejects(R.verifyFirmwarePayload(entry, { ...payload, data: "!invalid-base64" }));
  const changed = Buffer.from(file.data); changed[20] = 1;
  await assert.rejects(R.verifyFirmwarePayload(entry, { ...payload, data: changed.toString("base64") }), /SHA-256/);
});
test("browser verifies ZIP local hash without falsely claiming publisher verification", async () => {
  const data = Buffer.from([80, 75, 3, 4, 0, 0, 0, 0]);
  const service = new FirmwareService(async url => {
    if (url === official) return new Response(row("R20260131/"));
    if (url.endsWith("/firmware/")) return new Response(row("OpenGD77.zip", data.length));
    return new Response(data);
  });
  const entry = (await service.catalog("GD-77")).entries[0];
  const file = await service.download(entry.id);
  const payload = { manifest: file.manifest, data: data.toString("base64") };
  assert.deepEqual((await R.verifyFirmwarePayload(entry, payload)).data, new Uint8Array(data));
  await assert.rejects(R.verifyFirmwarePayload(entry, { ...payload, manifest: { ...file.manifest, publisherHashVerified: true } }), /publicado/);
});
test("local API returns verified firmware and preserves CSP, origin controls and private-path isolation", async t => {
  const server = createServer(new FirmwareService(fakeF4()));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = path => fetch(`${base}${path}`);
  const targets = await get("/api/firmware/targets");
  assert.equal(targets.status, 200);
  assert.match(targets.headers.get("content-security-policy"), /connect-src 'self'/);
  assert.equal(targets.headers.get("cache-control"), "no-store");
  assert.ok((await targets.json()).some(target => target.id === "UV-K1"));
  const catalog = await (await get("/api/firmware/catalog?target=UV-K1")).json();
  const payload = await (await get(`/api/firmware/file?id=${catalog.entries[0].id}`)).json();
  assert.equal(sha((await R.verifyFirmwarePayload(catalog.entries[0], payload)).data), sha(image()));
  for (const path of ["/api/firmware/catalog?target=UV-K1&target=UV-K5-V3", "/api/firmware/file?url=https://evil.test",
    "/api/firmware/targets?extra=1", "/api/firmware/nope"]) assert.equal((await get(path)).status, 400);
  assert.equal((await get("/api/firmware/catalog?target=DM-32")).status, 400);
  assert.equal((await get(`/api/firmware/file?id=${"0".repeat(64)}`)).status, 409);
  for (const path of ["/firmware-service.cjs", "/.vscode/settings.json", "/tests/firmware.test.cjs", "/%2e%2e/README.md"]) {
    assert.equal((await get(path)).status, 404);
  }
  assert.equal((await get("/firmware-catalog.js")).status, 200);
  const foreignHostStatus = await new Promise((resolve, reject) => {
    http.get(`${base}/`, { headers: { Host: "evil.test" } }, response => {
      response.resume();
      resolve(response.statusCode);
    }).on("error", reject);
  });
  assert.equal(foreignHostStatus, 403);
  const localhostRedirect = await new Promise((resolve, reject) => {
    http.get(`${base}/opengd77.html`, { headers: { Host: `localhost:${server.address().port}` } }, response => {
      response.resume();
      resolve([response.statusCode, response.headers.location]);
    }).on("error", reject);
  });
  assert.deepEqual(localhostRedirect, [307, `${base}/opengd77.html`]);
  const localhostApiWithOrigin = await new Promise((resolve, reject) => {
    http.get(`${base}/api/firmware/targets`, { headers: { Host: "localhost", Origin: "http://localhost" } }, response => {
      response.resume();
      resolve(response.statusCode);
    }).on("error", reject);
  });
  assert.equal(localhostApiWithOrigin, 403);
  assert.equal((await fetch(`${base}/api/firmware/targets`, { headers: { Origin: "https://evil.test" } })).status, 403);
  assert.equal((await fetch(`${base}/api/firmware/targets`, { method: "HEAD" })).status, 405);
  assert.equal((await fetch(`${base}/api/firmware/targets`, { method: "POST" })).status, 405);
});
