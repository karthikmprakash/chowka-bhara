/**
 * Generates the Android launcher icons and the splash mark from the game's
 * own favicon, so the app always carries the same identity as the web build.
 *
 *   node scripts/generate-android-icons.mjs
 */
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const res = path.join(root, "android/app/src/main/res");

const CREAM = "#f7f5ee";
const TERRACOTTA = "#b74f37";

// The four cowrie-diamond mark from game/public/favicon.svg.
const PATHS = [
  "M30 9 43 22 30 35 17 22Z",
  "M44 23 57 36 44 49 31 36Z",
  "M16 23 29 36 16 49 3 36Z",
  "M30 37 43 50 30 63 17 50Z",
];

const legacySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="${CREAM}"/>
  ${PATHS.map((d) => `<path d="${d}" fill="${TERRACOTTA}"/>`).join("\n  ")}
</svg>`;

const circleMask = (size) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>
  </svg>`,
);

const legacySizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

async function main() {
  for (const [density, size] of Object.entries(legacySizes)) {
    const dir = path.join(res, `mipmap-${density}`);
    await mkdir(dir, { recursive: true });
    const square = await sharp(Buffer.from(legacySvg)).resize(size, size).png().toBuffer();
    await writeFile(path.join(dir, "ic_launcher.png"), square);
    const round = await sharp(square)
      .composite([{ input: circleMask(size), blend: "dest-in" }])
      .png()
      .toBuffer();
    await writeFile(path.join(dir, "ic_launcher_round.png"), round);
    // The adaptive foreground is a vector, so the raster copies are redundant.
    await rm(path.join(dir, "ic_launcher_foreground.png"), { force: true });
  }

  // Adaptive icon foreground: the mark centred in the 72dp safe zone of the
  // 108dp canvas, which also matches the Android 12+ splash icon framing.
  const scale = 72 / 64;
  const offset = (108 - 72) / 2;
  const vector = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <group
        android:scaleX="${scale}"
        android:scaleY="${scale}"
        android:translateX="${offset}"
        android:translateY="${offset}">
${PATHS.map((d) => `        <path\n            android:fillColor="${TERRACOTTA}"\n            android:pathData="${d}" />`).join("\n")}
    </group>
</vector>
`;
  await writeFile(path.join(res, "drawable/ic_launcher_foreground.xml"), vector);

  const colors = `<resources>
    <color name="ic_launcher_background">${CREAM}</color>
    <color name="splashBackground">${CREAM}</color>
    <color name="terracotta">${TERRACOTTA}</color>
</resources>
`;
  await writeFile(path.join(res, "values/colors.xml"), colors);

  console.log("Android icons and splash colours regenerated.");
}

await main();
