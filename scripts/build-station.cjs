"use strict";
const path = require("node:path");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const component = path.join(root, "remote-station");
const python = process.env.PYTHON || (process.platform === "win32" ? "py" : "python3");
const prefix = process.platform === "win32" && !process.env.PYTHON ? ["-3.12"] : [];
const output = path.join(component, "dist");
fs.mkdirSync(output, { recursive: true });
for (const args of [
  ["scripts/build_help.py", "--check"],
  ["scripts/build_agent.py", "--output", path.join(output, "agent")],
  ["scripts/build_release.py", "--output", path.join(output, "host")]
]) {
  const result = spawnSync(python, [...prefix, ...args], { cwd: component, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
