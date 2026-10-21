const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");

test("el empaquetado crea artefactos para Debian/Raspberry Pi, Arch, FreeBSD y Windows", () => {
  const build = read("scripts/build-installers.sh");
  for (const marker of [
    "build_deb amd64 x64",
    "build_deb arm64 arm64",
    "build_deb armhf armv7l",
    "arch-source.tar.gz",
    "sha256sum \"$output/bricohams-radio-workspace-${version#v}-arch-source.tar.gz\"",
    "freebsd-amd64.tar.gz",
    "windows-x64.zip",
    "SHASUMS256.txt",
    "sha256sum"
  ]) assert.ok(build.includes(marker), marker);
  assert.match(read(".github/workflows/release-installers.yml"), /tags: \["v\*"\]/);
});

test("los lanzadores locales conservan Node 22+ y el servidor solo local", () => {
  assert.match(read("installers/linux/bricohams-radio"), /process\.versions\.node/);
  assert.match(read("installers/linux/bricohams-radio"), /127\.0\.0\.1:8787/);
  assert.doesNotMatch(read("installers/linux/bricohams-radio"), /\/dev\/tcp/);
  assert.match(read("installers/freebsd/install.sh"), /pkg install -y node22/);
  assert.match(read("installers/windows/Start.ps1"), /http:\/\/127\.0\.0\.1:8787/);
  assert.match(read("installers/windows/Install.ps1"), /Programs\\Bricohams Radio Workspace/);
});

test("la documentación da instrucciones por sistema y explica la generación por release", () => {
  const readme = read("README.md");
  const deployment = read("docs/DEPLOYMENT.md");
  for (const platform of ["Debian", "Raspberry Pi", "Arch Linux", "FreeBSD", "Windows 11"]) {
    assert.ok(readme.includes(platform), platform);
    assert.ok(deployment.includes(platform), platform);
  }
  assert.match(deployment, /crea y sube una etiqueta `v\*`/);
});
