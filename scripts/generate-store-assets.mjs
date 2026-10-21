/**
 * Generates the Play Store listing art that is not a screenshot:
 *
 *   store/play/icon-512.png                 512 x 512, full bleed
 *   store/play/feature-graphic-1024x500.png 1024 x 500
 *
 * Both are drawn from the game's own palette, fonts and board so the listing
 * matches the app. Run `capture-store-screenshots.mjs` first: the feature
 * graphic embeds store/play/source/board.png.
 *
 *   node scripts/generate-store-assets.mjs
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const run = promisify(execFile);
const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const out = path.join(root, "store/play");
const source = path.join(out, "source");

const PAPER = "#f7f5ee";
const INK = "#273d35";
const ACCENT = "#b74f37";
const MUTED = "#70776b";

const MARK = [
  "M30 9 43 22 30 35 17 22Z",
  "M44 23 57 36 44 49 31 36Z",
  "M16 23 29 36 16 49 3 36Z",
  "M30 37 43 50 30 63 17 50Z",
];

async function icon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <rect width="512" height="512" fill="${PAPER}"/>
    <g fill="${ACCENT}" transform="translate(96 96) scale(5)">
      ${MARK.map((d) => `<path d="${d}"/>`).join("")}
    </g>
  </svg>`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(out, "icon-512.png"));
  const size = await sharp(path.join(out, "icon-512.png")).metadata();
  console.log(`  icon-512.png ${size.width}x${size.height}`);
}

async function feature() {
  const [serif, sans, board] = await Promise.all([
    readFile(path.join(root, "game/public/fonts/dm-serif.ttf")),
    readFile(path.join(root, "game/public/fonts/dm-sans.ttf")),
    readFile(path.join(source, "board.png")),
  ]);
  const data = (buf) => `data:font/ttf;base64,${buf.toString("base64")}`;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face { font-family: Serif; src: url(${data(serif)}); }
  @font-face { font-family: Sans; src: url(${data(sans)}); }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1024px; height: 500px; overflow: hidden;
    background: ${PAPER}; color: ${INK};
    font-family: Sans, Arial, sans-serif;
    position: relative;
  }
  .mandala {
    position: absolute; right: -90px; top: -110px;
    width: 620px; height: 620px; opacity: .5;
  }
  .rule {
    position: absolute; left: 64px; top: 58px;
    width: 40px; height: 3px; background: ${ACCENT}; border-radius: 2px;
  }
  .copy { position: absolute; left: 64px; top: 84px; width: 540px; }
  .overline {
    font-size: 12px; letter-spacing: 3.4px; color: #7d8577;
    text-transform: uppercase; font-weight: 600;
  }
  h1 {
    font-family: Serif, Georgia, serif; font-weight: 400;
    font-size: 78px; line-height: .98; letter-spacing: -1.5px;
    margin: 14px 0 0;
  }
  h1 .dot { color: ${ACCENT}; }
  .tagline {
    font-size: 21px; line-height: 1.4; color: ${MUTED}; margin-top: 16px;
  }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 26px; }
  .chip {
    border: 1px solid #d9dccd; border-radius: 999px;
    padding: 7px 13px; font-size: 12.5px; color: #4d584c; background: #fbfaf4;
  }
  .free {
    margin-top: 20px; font-size: 13px; color: ${ACCENT};
    letter-spacing: .4px; font-weight: 600;
  }
  .signoff {
    position: absolute; left: 64px; bottom: 32px;
    font-family: Serif, Georgia, serif; font-size: 20px; color: #6f7868;
  }
  .signoff .dot { color: ${ACCENT}; }
  .art {
    position: absolute; right: 62px; top: 52px;
    width: 378px; height: 378px;
  }
  .art img {
    width: 378px; height: 378px; display: block;
    border-radius: 30px;
    box-shadow: 0 26px 60px rgba(39,61,53,.20), 0 4px 10px rgba(39,61,53,.10);
  }
  .art .ring {
    position: absolute; inset: -18px; border: 1px solid rgba(183,79,55,.28);
    border-radius: 42px; pointer-events: none;
  }
  .corner {
    position: absolute; right: 28px; bottom: 26px;
    font-size: 11px; letter-spacing: 2.6px; color: #9aa391;
  }
</style>
</head>
<body>
  <svg class="mandala" viewBox="0 0 600 600" fill="none">
    <circle cx="300" cy="300" r="286" stroke="#e3dcc9" stroke-width="2"/>
    <circle cx="300" cy="300" r="238" stroke="#e3dcc9" stroke-width="1.5" stroke-dasharray="2 12"/>
    <circle cx="300" cy="300" r="186" stroke="#e6ddc8" stroke-width="1.5"/>
    <g stroke="#e7c9bd" stroke-width="2">
      <path d="M300 26c46 62 46 122 0 168-46-46-46-106 0-168Z"/>
      <path d="M300 574c-46-62-46-122 0-168 46 46 46 106 0 168Z"/>
      <path d="M26 300c62-46 122-46 168 0-46 46-106 46-168 0Z"/>
      <path d="M574 300c-62 46-122 46-168 0 46-46 106-46 168 0Z"/>
    </g>
  </svg>
  <div class="rule"></div>
  <div class="copy">
    <div class="overline">The Indian game table</div>
    <h1>chowka bara<span class="dot">.</span></h1>
    <p class="tagline">A handful of shells. Four little pawns.<br>Endless reasons to play again.</p>
    <div class="chips">
      <span class="chip">2–4 players</span>
      <span class="chip">Online rooms</span>
      <span class="chip">5×5 &amp; 7×7</span>
      <span class="chip">Beginner &amp; advanced</span>
    </div>
    <div class="free">Free to play · No ads · No sign-up</div>
  </div>
  <div class="art">
    <div class="ring"></div>
    <img src="data:image/png;base64,${board.toString("base64")}" alt="">
  </div>
  <div class="signoff">Come, let's play<span class="dot">.</span></div>
  <div class="corner">CHOWKA BARA</div>
</body>
</html>`;

  await mkdir(source, { recursive: true });
  const htmlPath = path.join(source, "feature-graphic.html");
  const shotPath = path.join(out, "feature-graphic-1024x500.png");
  await writeFile(htmlPath, html);

  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  await run(chrome, [
    "--headless=new",
    "--hide-scrollbars",
    "--disable-gpu",
    "--force-device-scale-factor=1",
    "--window-size=1024,500",
    `--screenshot=${shotPath}`,
    `file://${htmlPath}`,
  ]);
  const size = await sharp(shotPath).metadata();
  console.log(`  feature-graphic-1024x500.png ${size.width}x${size.height}`);
  if (size.width !== 1024 || size.height !== 500)
    throw new Error(`Feature graphic is ${size.width}x${size.height}, expected 1024x500`);
}

async function main() {
  await mkdir(out, { recursive: true });
  await icon();
  await feature();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
