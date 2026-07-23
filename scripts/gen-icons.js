/**
 * Rasterize public/app-icon.svg into PWA / favicon PNGs.
 * Usage: node scripts/gen-icons.js
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const svg = fs.readFileSync(path.join(root, "public", "app-icon.svg"));

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

(async () => {
  for (const t of targets) {
    const out = path.join(root, "public", t.file);
    await sharp(svg).resize(t.size, t.size).png().toFile(out);
    console.log("wrote", t.file, fs.statSync(out).size);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
