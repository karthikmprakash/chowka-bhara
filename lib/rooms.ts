import { env } from "cloudflare:workers";
import {
  makePlayer,
  newGame,
  rollGame,
  moveGame,
  randomShells,
  resignGame,
  type Game,
  type BoardSize,
} from "./game";
interface Room {
  code: string;
  state: string;
  members: string;
  revision: number;
  expires_at: number;
}
type Members = Record<string, string>;
const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers });
}
function db() {
  if (!env.DB)
    throw new Error(
      "Online play is temporarily unavailable. Solo and local play are ready.",
    );
  return env.DB;
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
function token() {
  return crypto.randomUUID() + crypto.randomUUID();
}
async function readRoom(code: string) {
  if (!/^[A-Z2-9]{6}$/.test(code)) return null;
  return await db()
    .prepare("SELECT * FROM rooms WHERE code = ? AND expires_at > ?")
    .bind(code, Date.now())
    .first<Room>();
}
function view(room: Room, playerId: string) {
  return {
    code: room.code,
    game: JSON.parse(room.state),
    playerId,
    expiresAt: room.expires_at,
  };
}
export async function createRoom(req: Request) {
  try {
    originCheck(req);
    const b = await body(req);
    settings(b);
    const name = nameOf(b.name);
    const auth = token(),
      g = newGame(
        b.size as BoardSize,
        "online",
        2,
        b.captureRequired as boolean,
        name,
      );
    g.players = [makePlayer(name, 0)];
    const members: Members = { [auth]: g.players[0].id },
      alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let tries = 0; tries < 5; tries++) {
      const bytes = crypto.getRandomValues(new Uint8Array(6)),
        code = [...bytes].map((v) => alphabet[v % alphabet.length]).join("");
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      const result = await db()
        .prepare(
          "INSERT OR IGNORE INTO rooms (code,state,members,revision,expires_at,updated_at) VALUES (?,?,?,?,?,?)",
        )
        .bind(
          code,
          JSON.stringify(g),
          JSON.stringify(members),
          0,
          expiresAt,
          Date.now(),
        )
        .run();
      if (result.meta.changes)
        return json(
          { code, game: g, token: auth, playerId: g.players[0].id, expiresAt },
          201,
        );
    }
    return json({ error: "Could not open a table. Please try again." }, 503);
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Could not create the room." },
      400,
    );
  }
}
export async function getRoom(req: Request, code: string) {
  try {
    const r = await readRoom(code);
    if (!r)
      return json(
        { error: "Room not found or expired. Rooms last 24 hours." },
        404,
      );
    const auth =
        req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "",
      id = (JSON.parse(r.members) as Members)[auth];
    if (!id) return json({ error: "Join this room to take a seat." }, 401);
    return json(view(r, id));
  } catch {
    return json({ error: "Connection interrupted. Reconnecting…" }, 503);
  }
}
export async function actRoom(req: Request, code: string) {
  try {
    originCheck(req);
    const b = await body(req),
      r = await readRoom(code);
    if (!r) return json({ error: "Room not found or expired." }, 404);
    let g = JSON.parse(r.state) as Game;
    const members = JSON.parse(r.members) as Members;
    const auth =
      req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
    let id = members[auth],
      issued: string | undefined;
    if (b.action === "join" && !id) {
      if (g.phase !== "lobby")
        return json({ error: "This game has already started." }, 409);
      if (g.players.length >= 4)
        return json({ error: "This table is full." }, 409);
      const name = nameOf(b.name),
        color = [0, 2, 1, 3].find(
          (c) => !g.players.some((p) => p.color === c),
        )!;
      const p = makePlayer(name, color);
      g.players.push(p);
      issued = token();
      members[issued] = p.id;
      id = p.id;
      g.revision++;
    } else {
      if (!id) return json({ error: "Please join the room first." }, 401);
      if (b.action === "join") return json({ ...view(r, id) });
      if (b.revision !== r.revision)
        return json(
          {
            ...view(r, id),
            error: "The table changed. Your game has been refreshed.",
          },
          409,
        );
      const idx = g.players.findIndex((p) => p.id === id);
      if (idx < 0) return json({ error: "You no longer have a seat." }, 401);
      if (b.action === "start") {
        if (idx !== 0 || g.phase !== "lobby" || g.players.length < 2)
          throw new Error(
            "The host can start once at least two players have joined.",
          );
        g.phase = "playing";
        g.revision++;
      } else if (b.action === "roll" || b.action === "move") {
        if (g.turn !== idx || g.players[idx].resigned)
          throw new Error("It is another player’s turn.");
        g =
          b.action === "roll"
            ? rollGame(g, randomShells(g.size))
            : moveGame(g, b.pawn);
      } else if (b.action === "resign") g = resignGame(g, idx);
      else if (b.action === "rematch") {
        if (idx !== 0 || g.phase !== "finished")
          throw new Error("The host can start a rematch after this game.");
        g = {
          ...newGame(g.size, "online", g.players.length, g.captureRequired),
          players: g.players.map((p) => ({
            ...p,
            pawns: [0, 0, 0, 0],
            captures: 0,
            resigned: false,
          })),
          phase: "lobby",
          revision: g.revision + 1,
        };
      } else if (b.action === "leave") {
        if (g.phase !== "lobby")
          throw new Error("Resign to leave a game in progress.");
        g.players = g.players.filter((p) => p.id !== id);
        delete members[auth];
        g.revision++;
      } else throw new Error("Unknown action.");
    }
    const res = await db()
      .prepare(
        "UPDATE rooms SET state = ?, members = ?, revision = ?, updated_at = ? WHERE code = ? AND revision = ?",
      )
      .bind(
        JSON.stringify(g),
        JSON.stringify(members),
        g.revision,
        Date.now(),
        code,
        r.revision,
      )
      .run();
    if (!res.meta.changes)
      return json({ error: "Someone just played. Please try again." }, 409);
    return json({
      code,
      game: g,
      playerId: id,
      ...(issued ? { token: issued } : {}),
    });
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error ? e.message : "Could not complete that action.",
      },
      400,
    );
  }
}
