"use strict";
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const root = path.join(__dirname, "..");
  const source = path.join(root, "branding", "bricohams_mark.svg");
  const consoleRoot = path.join(root, "remote-station", "apps", "web-console");
  const destinations = [
    path.join(consoleRoot, "android", "app", "src", "main", "res", "drawable-nodpi", "bricohams_mark.png"),
    path.join(consoleRoot, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset", "AppIcon-512@2x.png")
  ];
  const icon = await sharp(source).resize(1024, 1024, {
    fit: "contain", background: "#FFFFFF"
  }).flatten({ background: "#FFFFFF" }).removeAlpha().png().toBuffer();
  for (const destination of destinations) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, icon);
  }
  console.log("Official BricoHams mark rendered without recoloring/cropping; opaque 1024px mobile icons.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
