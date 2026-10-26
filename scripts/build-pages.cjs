const fs = require("node:fs");
const path = require("node:path");
const { ALLOWED_FILES } = require("../server.cjs");

const root = path.join(__dirname, "..");
function build(outDir = path.join(root, "dist")) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of ALLOWED_FILES) {
    const source = name === "satellite.min.js"
      ? path.join(path.dirname(require.resolve("satellite.js/package.json")), "dist", name)
      : path.join(root, name);
    fs.mkdirSync(path.dirname(path.join(outDir, name)), { recursive: true });
    fs.copyFileSync(source, path.join(outDir, name));
  }
  fs.writeFileSync(path.join(outDir, "runtime.json"), JSON.stringify({ mode: "web" }));
  fs.writeFileSync(path.join(outDir, ".nojekyll"), "");
}
if (require.main === module) build();
module.exports = { build };
