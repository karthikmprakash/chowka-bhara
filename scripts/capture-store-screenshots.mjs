/**
 * Captures Play Store phone screenshots from the live game.
 *
 * Drives headless Chrome over the DevTools protocol at 1080 x 1920 (a 9:16
 * frame, which is inside Play's 2:1 aspect limit). The game is a real phone
 * layout at that width, so these are the same screens a tester sees.
 *
 *   node scripts/capture-store-screenshots.mjs [baseUrl]
 *
 * Writes store/play/screenshots/*.png and leaves the browser closed.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const outDir = path.join(root, "store/play/screenshots");
const baseUrl = process.argv[2] || "https://chowka-bara.mkarthikprakash-work.workers.dev";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;

const WIDTH = 432;
const HEIGHT = 768;
const SCALE = 2.5; // 1080 x 1920

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const profile = path.join(process.env.TMPDIR || "/tmp", `chowka-store-${Date.now()}`);
  const child = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--disable-gpu",
    "--force-device-scale-factor=1",
    "about:blank",
  ], { stdio: "ignore" });
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return child;
    } catch {}
    await sleep(100);
  }
  throw new Error("Chrome did not start");
}

class Session {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (!msg.id) return;
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails)
      throw new Error(r.exceptionDetails.exception?.description || "evaluate failed");
    return r.result.value;
  }
  async shot(name, clip) {
    await sleep(700);
    const r = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
      ...(clip ? { clip: { ...clip, scale: 1 } } : {}),
    });
    const target = clip ? path.join(outDir, "..", "source", name) : path.join(outDir, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(r.data, "base64"));
    console.log(`  wrote ${path.relative(root, target)}`);
  }
}

async function connect() {
  const version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const s = new Session(ws);
  const { targetId } = await s.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await s.send("Target.attachToTarget", { targetId, flatten: true });
  // Re-wrap the flattened session so calls go to the page target.
  const page = new Session(ws);
  const raw = page.send.bind(page);
  page.send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++page.id;
      page.pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  page.close = () => raw("Target.closeTarget", { targetId });
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: SCALE,
    mobile: true,
  });
  await page.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  return page;
}

async function clickText(page, text) {
  const ok = await page.evaluate(`(() => {
    const wanted = ${JSON.stringify(text)}.toLowerCase();
    const nodes = [...document.querySelectorAll("button, a, [role=tab]")];
    const el = nodes.find((n) => (n.innerText || "").toLowerCase().includes(wanted) && n.offsetParent !== null);
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  })()`);
  if (!ok) {
    const seen = await page.evaluate(`[...document.querySelectorAll("button, a, [role=tab]")]
      .filter((n) => n.offsetParent !== null)
      .map((n) => (n.innerText || n.getAttribute("aria-label") || "").trim().replace(/\\s+/g, " "))
      .filter(Boolean)
      .join(" | ")`);
    throw new Error(`No visible control matching "${text}". Visible: ${seen}`);
  }
  await sleep(500);
}

async function type(page, selector, value) {
  const ok = await page.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
  if (!ok) throw new Error(`No input ${selector}`);
  await sleep(300);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const chrome = await launch();
  try {
    const page = await connect();
    console.log("capturing", baseUrl);

    await page.send("Page.navigate", { url: baseUrl });
    for (let i = 0; i < 60; i++) {
      const ready = await page.evaluate(
        `document.readyState === "complete" && !!document.querySelector("main")`,
      );
      if (ready) break;
      await sleep(250);
    }
    await sleep(1200);
    await page.shot("01-home.png");

    // How to play
    const step = async (name, fn) => {
      try {
        await fn();
      } catch (error) {
        console.warn(`  skipped ${name}: ${error.message}`);
      }
    };

    const closeModal = () =>
      page.evaluate(`document.querySelector('[aria-label="Close dialog"], .modal-close, .modal button[aria-label]')?.click()`);

    await step("how to play", async () => {
      await clickText(page, "How to play");
      await page.shot("02-how-to-play.png");
      await closeModal();
      await sleep(500);
    });

    // Practice starts a table against the computer, already seated.
    await step("board", async () => {
      await clickText(page, "Practice now");
      await sleep(900);
      await page.shot("03-board.png");
      const board = await page.evaluate(`(() => {
        const r = document.querySelector(".board-frame").getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      })()`);
      await page.shot("board.png", board);
    });

    await step("throw", async () => {
      await clickText(page, "Throw cowries");
      await sleep(1100);
      await page.shot("04-throw.png");
    });

    await step("settings", async () => {
      await page.evaluate(`document.querySelector('[aria-label="Player settings"]')?.click()`);
      await sleep(700);
      await page.shot("05-settings.png");
      await closeModal();
      await sleep(500);
    });

    await page.close();
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
