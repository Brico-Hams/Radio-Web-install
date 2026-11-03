"use strict";
// Creates the fastlane image folders and copies the app icon (run once).
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const icon = path.join(root, "android", "app", "src", "main", "res", "drawable-nodpi", "bricohams_logo.png");
const readme = "Las capturas de pantalla se tomaran del telefono real antes de publicar.\n" +
  "Guardalas aqui como 1.png, 2.png, ... (PNG o JPG, sin marcos ni texto anadido).\n";

for (const locale of ["es-ES", "en-US", "fr-FR", "de-DE"]) {
  const images = path.join(root, "fastlane", "metadata", "android", locale, "images");
  const shots = path.join(images, "phoneScreenshots");
  fs.mkdirSync(shots, { recursive: true });
  fs.copyFileSync(icon, path.join(images, "icon.png"));
  fs.writeFileSync(path.join(shots, "README.md"), readme);
  console.log(`OK ${path.relative(root, images)}`);
}
