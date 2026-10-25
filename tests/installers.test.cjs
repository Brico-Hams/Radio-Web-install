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
  assert.match(read("installers/unix/bricohams-radio"), /process\.versions\.node/);
  // Node 24+ rejects process.exit(boolean): the version probe must exit with a number.
  for (const name of ["installers/unix/bricohams-radio", "installers/freebsd/install.sh"]) {
    assert.doesNotMatch(read(name), /process\.exit\([^)]*< 22\)/, name);
  }
  assert.match(read("installers/unix/bricohams-radio"), /127\.0\.0\.1:8787/);
  assert.doesNotMatch(read("installers/unix/bricohams-radio"), /\/dev\/tcp/);
  assert.match(read("installers/freebsd/install.sh"), /pkg install -y node22/);
  assert.match(read("installers/windows/Start.ps1"), /http:\/\/127\.0\.0\.1:8787/);
  assert.match(read("installers/windows/Install.ps1"), /Programs\\Bricohams Radio Workspace/);
});

test("Linux y FreeBSD comparten un unico lanzador y Windows reemplaza la app al actualizar", () => {
  const build = read("scripts/build-installers.sh");
  assert.equal(build.match(/installers\/unix\/bricohams-radio"/g).length, 3);
  assert.ok(!fs.existsSync(path.join(root, "installers/freebsd/bricohams-radio")));
  const launcher = read("installers/unix/bricohams-radio");
  for (const dir of ["/opt/bricohams-radio-workspace", "/usr/local/libexec/bricohams-radio-workspace"]) {
    assert.ok(launcher.includes(dir), dir);
  }
  assert.ok(read("installers/freebsd/install.sh").includes("/usr/local/libexec/bricohams-radio-workspace"));
  assert.match(read("installers/windows/Install.ps1"), /Remove-Item -Path \$appTarget -Recurse -Force/);
  const workflow = read(".github/workflows/release-installers.yml");
  for (const run of workflow.split(/\n\s+run: /).slice(1)) {
    assert.doesNotMatch(run.split(/\n\s+- /)[0], /\$\{\{\s*inputs\./, "inputs must reach run scripts through env");
  }
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

test("las guias locales cubren integridad, arquitectura, parada y persistencia", () => {
  const deployment = read("docs/DEPLOYMENT.md");
  for (const marker of [
    "Get-FileHash", "SHA256SUMS", "dpkg --print-architecture", "ARMv6",
    "makepkg -si", "su -c './install.sh'", "ExecutionPolicy Bypass",
    "Get-NetTCPConnection", "Stop-Process -Id <PID>", "sudo apt remove",
    "sudo pacman -R", "Desinstalar no elimina las copias del navegador"
  ]) assert.ok(deployment.includes(marker), marker);
  const help = read("ayuda.html");
  for (const platform of ["Windows 11", "Debian", "Ubuntu", "Raspberry Pi", "Arch Linux", "FreeBSD"]) {
    assert.ok(help.includes(platform), platform);
  }
  assert.match(help, /releases\/latest/);
  assert.doesNotMatch(help, /próximamente en paquetes/);
});
