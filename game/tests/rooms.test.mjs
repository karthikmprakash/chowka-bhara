import { test } from "node:test";
import assert from "node:assert/strict";
import { legalMoves } from "../lib/game.ts";

/**
 * Live-room integration test.
 *
 * Start the app first (`npm run dev`), then run `npm run test:rooms`.
 * The room is a Durable Object: seats join over HTTP, and the table itself is a
 * WebSocket that broadcasts every change to every seat.
 */

const base = process.env.TEST_URL || "http://localhost:5173";

async function post(path, body) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: r.status, ...(await r.json()) };
}

function socket(code) {
  const url = base.replace(/^http/, "ws") + "/api/rooms/" + code + "/socket";
  const ws = new WebSocket(url);
  const inbox = [];
  const waiters = [];

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const index = waiters.findIndex((w) => w.match(message));
    if (index >= 0) {
      const [waiter] = waiters.splice(index, 1);
      waiter.resolve(message);
      return;
    }
    inbox.push(message);
  });

  const next = (match = () => true, label = "a message", ms = 8000) => {
    const index = inbox.findIndex(match);
    if (index >= 0) return Promise.resolve(inbox.splice(index, 1)[0]);
    return new Promise((resolve, reject) => {
      const entry = { match, resolve: () => {} };
      const timer = setTimeout(() => {
        const at = waiters.indexOf(entry);
        if (at >= 0) waiters.splice(at, 1);
        reject(new Error("Timed out waiting for " + label));
      }, ms);
      entry.resolve = (message) => {
        clearTimeout(timer);
        resolve(message);
      };
      waiters.push(entry);
    });
  };

  const open = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("socket failed")), {
      once: true,
    });
  });

  return {
    open,
    next,
    send: (message) => ws.send(JSON.stringify(message)),
    close: () => ws.close(),
  };
}

const ack = (id) => (m) => m.t === "ack" && m.id === id;
const state = (match = () => true) => (m) => m.t === "state" && match(m.game);

test("Room lifecycle: seats, socket auth, host start, throw broadcast, resign, rematch", async () => {
  const host = await post("/api/rooms", {
    name: "Host",
    size: 7,
    captureRequired: false,
  });
  assert.equal(host.status, 201);
  assert.equal(host.game.captureRequired, true);
  assert.match(host.code, /^[A-Z2-9]{6}$/);
  assert.ok(host.token);

  const h = socket(host.code);
  await h.open;
  h.send({ t: "hello", token: host.token });
  const first = await h.next(state((g) => g.players.length === 1), "host table");
  assert.equal(first.playerId, host.playerId);

  // The phone client keeps the link honest with a ping; the room answers it.
  h.send({ t: "ping" });
  await h.next((m) => m.t === "pong", "pong");

  // A made-up seat token is refused instead of opening a seat.
  const stranger = socket(host.code);
  await stranger.open;
  stranger.send({ t: "hello", token: "not-a-seat" });
  const refusal = await stranger.next(
    (m) => m.t === "fatal",
    "stranger refusal",
  );
  assert.match(refusal.message, /expired|not found/i);
  stranger.close();

  // Joining is an HTTP call; the open seat is pushed the new table.
  const guest = await post("/api/rooms/" + host.code + "/join", {
    name: "Guest",
  });
  assert.equal(guest.status, 200);
  assert.ok(guest.token);
  assert.notEqual(guest.playerId, host.playerId);
  await h.next(state((g) => g.players.length === 2), "host sees guest");

  const g = socket(host.code);
  await g.open;
  g.send({ t: "hello", token: guest.token });
  await g.next(state((g) => g.players.length === 2), "guest table");

  // Only the host starts.
  g.send({ t: "start", id: "guest-start" });
  const denied = await g.next(ack("guest-start"), "guest start refusal");
  assert.equal(denied.ok, false);

  h.send({ t: "start", id: "host-start" });
  assert.equal((await h.next(ack("host-start"), "host start ack")).ok, true);
  const playing = await g.next(
    state((g) => g.phase === "playing"),
    "guest playing",
  );
  assert.equal(playing.game.turn, 0);

  // A throw reaches the other seat without asking for it.
  h.send({ t: "roll", id: "roll-1" });
  assert.equal((await h.next(ack("roll-1"), "roll ack")).ok, true);
  const rolled = await g.next(
    state((g) => Array.isArray(g.shells) && g.shells.length > 0),
    "throw broadcast",
  );
  assert.equal(rolled.game.turn, 0);

  // The move is accepted on the same socket and reaches the other seat.
  const moves = legalMoves(rolled.game);
  assert.ok(moves.length > 0, "a throw at the start has a legal move");
  h.send({ t: "move", id: "move-1", pawn: moves[0] });
  assert.equal((await h.next(ack("move-1"), "move ack")).ok, true);
  const moved = await g.next(
    state((g) => g.revision > rolled.game.revision),
    "move broadcast",
  );
  assert.equal(moved.game.roll, null);

  // An action out of turn is rejected, and the table is re-sent to the offender.
  const outOfTurn = moved.game.turn === 0 ? g : h;
  outOfTurn.send({ t: "roll", id: "wrong-turn" });
  const wrong = await outOfTurn.next(ack("wrong-turn"), "wrong turn ack");
  assert.equal(wrong.ok, false);
  assert.match(wrong.error, /turn/i);

  // With two seats, resigning finishes the table for the one who stayed.
  g.send({ t: "resign", id: "guest-resign" });
  assert.equal((await g.next(ack("guest-resign"), "resign ack")).ok, true);
  const finished = await h.next(
    state((g) => g.phase === "finished"),
    "finished state",
  );
  assert.equal(finished.game.phase, "finished");
  assert.equal(finished.game.winner, 0);

  // The host can deal a rematch; both seats return to the lobby.
  h.send({ t: "rematch", id: "host-rematch" });
  assert.equal((await h.next(ack("host-rematch"), "rematch ack")).ok, true);
  const lobby = await g.next(
    state((g) => g.phase === "lobby"),
    "rematch lobby",
  );
  assert.equal(lobby.game.players.length, 2);
  assert.equal(
    lobby.game.players.every((p) => !p.resigned),
    true,
  );

  h.close();
  g.close();
});

test("A table seats four and refuses a fifth", async () => {
  const host = await post("/api/rooms", {
    name: "Host",
    size: 5,
    captureRequired: true,
  });
  assert.equal(host.status, 201);
  for (const name of ["Second", "Third", "Fourth"]) {
    const seat = await post("/api/rooms/" + host.code + "/join", { name });
    assert.equal(seat.status, 200);
  }
  const overflow = await post("/api/rooms/" + host.code + "/join", {
    name: "Fifth",
  });
  assert.equal(overflow.status, 409);
});

test("An unknown room code is refused without creating a table", async () => {
  const missing = await post("/api/rooms/ZZZZZZ/join", { name: "Nobody" });
  assert.equal(missing.status, 404);
});
