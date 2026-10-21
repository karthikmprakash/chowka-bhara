import { env } from "cloudflare:workers";

/**
 * Room API.
 *
 * Every live table is a Durable Object keyed by its six-character code; this
 * module only validates the request and forwards it. There is no database to
 * keep in sync.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE = /^[A-Z2-9]{6}$/;
const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers });
}

function rooms() {
  if (!env.ROOMS)
    throw new Error(
      "Online play is temporarily unavailable. Solo and local play are ready.",
    );
  return env.ROOMS;
}

function roomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((v) => ALPHABET[v % ALPHABET.length]).join("");
}

function call(path: string, code: string, body: unknown) {
  const namespace = rooms();
  return namespace
    .get(namespace.idFromName(code))
    .fetch(`https://room${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
}

function nameOf(v: unknown) {
  if (
    typeof v !== "string" ||
    !v.trim() ||
    v.trim().length > 20 ||
    /[\x00-\x1f]/.test(v)
  )
    throw new Error("Use a name between 1 and 20 characters.");
  return v.trim();
}

function avatarOf(v: unknown) {
  if (v === undefined) return 0;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 7)
    throw new Error("Choose a valid portrait.");
  return v;
}

function settings(b: Record<string, unknown>) {
  if (b.size !== 5 && b.size !== 7)
    throw new Error("Choose a 5×5 or 7×7 board.");
  if (typeof b.captureRequired !== "boolean")
    throw new Error("Choose a ruleset.");
}

async function body(req: Request) {
  const raw = await req.text();
  if (raw.length > 2048) throw new Error("Request is too large.");
  const b = JSON.parse(raw);
  if (!b || typeof b !== "object" || Array.isArray(b))
    throw new Error("Invalid request.");
  return b;
}

function originCheck(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    throw new Error("Please open this game directly to play.");
}

export async function createRoom(req: Request) {
  try {
    originCheck(req);
    const b = await body(req);
    settings(b);
    const name = nameOf(b.name);
    const avatar = avatarOf(b.avatar);
    for (let tries = 0; tries < 5; tries++) {
      const code = roomCode();
      const res = await call("/create", code, {
        code,
        name,
        avatar,
        size: b.size,
        captureRequired: b.captureRequired,
      });
      if (res.status === 201) return json(await res.json(), 201);
      if (res.status !== 409) break;
    }
    return json({ error: "Could not open a table. Please try again." }, 503);
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Could not create the room." },
      400,
    );
  }
}

export async function joinRoom(req: Request, code: string) {
  try {
    originCheck(req);
    if (!CODE.test(code))
      return json({ error: "That room code is not valid." }, 400);
    const b = await body(req);
    const name = nameOf(b.name);
    const avatar = avatarOf(b.avatar);
    const res = await call("/join", code, { name, avatar });
    return json(await res.json(), res.status);
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Could not join the room." },
      400,
    );
  }
}
