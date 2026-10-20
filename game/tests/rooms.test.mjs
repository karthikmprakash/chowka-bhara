import { test } from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_URL || "http://localhost:5173";
async function call(path, body, token) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, ...(await r.json()) };
}
test("Room lifecycle: seats, authorization, concurrent actions, play, resign and rematch", async () => {
  const host = await call("/api/rooms", {
    name: "Host",
    size: 7,
    captureRequired: false,
  });
  assert.equal(host.status, 201);
  assert.equal(host.game.captureRequired, true);
  assert.match(host.code, /^[A-Z2-9]{6}$/);
  assert.ok(host.token);
  const path = "/api/rooms/" + host.code;
  const outsider = await call(path);
  assert.equal(outsider.status, 401);
  assert.equal(outsider.token, undefined);
  const guest = await call(path, { action: "join", name: "Guest" });
  assert.equal(guest.status, 200);
  assert.notEqual(guest.playerId, host.playerId);
  const third = await call(path, { action: "join", name: "Third" });
  const fourth = await call(path, { action: "join", name: "Fourth" });
  assert.equal(fourth.game.players.length, 4);
  assert.equal(
    (await call(path, { action: "join", name: "Overflow" })).status,
    409,
  );
  let state = await call(path, undefined, host.token);
  assert.equal(state.game.players.length, 4);
  assert.equal(
    (
      await call(
        path,
        { action: "start", revision: state.game.revision },
        guest.token,
      )
    ).status,
    400,
  );
  state = await call(
    path,
    { action: "start", revision: state.game.revision },
    host.token,
  );
  assert.equal(state.game.phase, "playing");
  assert.equal(
    (await call(path, { action: "join", name: "Late" })).status,
    409,
  );
  assert.equal(
    (
      await call(
        path,
        { action: "roll", revision: state.game.revision },
        guest.token,
      )
    ).status,
    400,
  );
  const old = state.game.revision;
  const simultaneous = await Promise.all([
    call(path, { action: "roll", revision: old }, host.token),
    call(path, { action: "roll", revision: old }, host.token),
  ]);
  assert.equal(simultaneous.filter((r) => r.status === 200).length, 1);
  assert.equal(simultaneous.filter((r) => r.status === 409).length, 1);
  state = await call(path, undefined, host.token);
  assert.equal(state.game.shells.length, 6);
  assert.ok(state.game.roll >= 1 && state.game.roll <= 12);
  assert.equal(
    (
      await call(
        path,
        { action: "move", pawn: 99, revision: state.game.revision },
        host.token,
      )
    ).status,
    400,
  );
  state = await call(
    path,
    { action: "move", pawn: 0, revision: state.game.revision },
    host.token,
  );
  assert.equal(state.status, 200);
  assert.ok(state.game.players[0].pawns[0] > 0);
  const refreshed = await call(path, undefined, guest.token);
  assert.deepEqual(refreshed.game, state.game);
  assert.equal(refreshed.token, undefined);
  for (const s of [guest, third, fourth]) {
    state = await call(
      path,
      { action: "resign", revision: state.game.revision },
      s.token,
    );
    assert.equal(state.status, 200);
  }
  assert.equal(state.game.phase, "finished");
  assert.equal(state.game.winner, 0);
  assert.equal(
    (
      await call(
        path,
        { action: "rematch", revision: state.game.revision },
        guest.token,
      )
    ).status,
    400,
  );
  state = await call(
    path,
    { action: "rematch", revision: state.game.revision },
    host.token,
  );
  assert.equal(state.game.phase, "lobby");
  assert.ok(
    state.game.players.every(
      (p) => !p.resigned && p.pawns.every((v) => v === 0),
    ),
  );
  state = await call(
    path,
    { action: "leave", revision: state.game.revision },
    host.token,
  );
  assert.equal(state.game.players[0].id, guest.playerId);
  assert.equal((await call(path, undefined, host.token)).status, 401);
});
test("Invalid inputs rejected and room state is private", async () => {
  assert.equal(
    (await call("/api/rooms", { name: "", size: 5, captureRequired: false }))
      .status,
    400,
  );
  assert.equal(
    (
      await call("/api/rooms", {
        name: "Name",
        size: 6,
        captureRequired: false,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("/api/rooms", {
        name: "a".repeat(21),
        size: 5,
        captureRequired: false,
      })
    ).status,
    400,
  );
  assert.equal((await call("/api/rooms/ABC234")).status, 404);
  const r = await fetch(base + "/api/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.test",
    },
    body: JSON.stringify({ name: "Host", size: 5, captureRequired: false }),
  });
  assert.ok(
    [400, 403].includes(r.status),
    "Cross-origin requests must be rejected",
  );
});

test("Portraits persist across room reads and only the authenticated seat can change its portrait", async () => {
  const host = await call("/api/rooms", {
    name: "Asha",
    size: 5,
    captureRequired: false,
    avatar: 6,
  });
  assert.equal(host.status, 201);
  assert.equal(host.game.players[0].avatar, 6);
  const path = "/api/rooms/" + host.code;
  const guest = await call(path, { action: "join", name: "Ajji", avatar: 2 });
  assert.equal(guest.game.players[1].avatar, 2);
  assert.equal(
    (
      await call(path, {
        action: "profile",
        avatar: 3,
        revision: guest.game.revision,
      })
    ).status,
    401,
  );
  const changed = await call(
    path,
    { action: "profile", avatar: 7, revision: guest.game.revision },
    guest.token,
  );
  assert.equal(changed.status, 200);
  assert.equal(changed.game.players[0].avatar, 6);
  assert.equal(changed.game.players[1].avatar, 7);
  const invalid = await call(
    path,
    { action: "profile", avatar: 8, revision: changed.game.revision },
    guest.token,
  );
  assert.equal(invalid.status, 400);
  const read = await call(path, undefined, host.token);
  assert.equal(read.game.players[1].avatar, 7);
  assert.equal(
    (
      await call("/api/rooms", {
        name: "Invalid",
        size: 5,
        captureRequired: false,
        avatar: -1,
      })
    ).status,
    400,
  );
});
