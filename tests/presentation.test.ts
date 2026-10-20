import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, rollGame, moveGame, basePath } from "../lib/game.ts";
import { latestThrow } from "../lib/presentation.ts";
test("No throw is shown for an empty or newly opened game", () => {
  assert.equal(latestThrow(null), null);
  assert.equal(latestThrow(newGame()), null);
});
test("A throw result keeps its player and score after the turn advances", () => {
  const g = newGame(5, "local", 2);
  const r = rollGame(g, [true, true, false, false]);
  const shot = latestThrow(r)!;
  const moved = moveGame(r, 0);
  assert.equal(moved.turn, 1);
  assert.equal(moved.roll, null);
  assert.equal(latestThrow(moved)?.name, g.players[0].name);
  assert.equal(latestThrow(moved)?.score, 2);
  assert.equal(latestThrow(moved)?.key, shot.key);
});
test("A skipped move still presents the actual throw and correct player", () => {
  const g = newGame();
  const end = basePath(5).length - 1;
  g.players[0].pawns = [end, end, end, end - 1];
  const r = rollGame(g, [true, true, false, false]);
  assert.equal(r.turn, 1);
  assert.equal(latestThrow(r)?.score, 2);
  assert.equal(latestThrow(r)?.name, g.players[0].name);
});
test("Four and six shell bonus results retain their proper values", () => {
  for (const size of [5, 7] as const) {
    const count = size === 5 ? 4 : 6;
    const r = rollGame(newGame(size), Array(count).fill(false));
    const shot = latestThrow(r)!;
    assert.equal(shot.score, count * 2);
    assert.equal(shot.bonus, true);
    assert.equal(shot.shells.length, count);
    shot.shells[0] = true;
    assert.equal(r.shells[0], false);
  }
});
test("Different games cannot reuse an old result even at the same move number", () => {
  const a = rollGame(newGame(), [true, false, false, false]),
    b = rollGame(newGame(), [true, false, false, false]);
  assert.notEqual(latestThrow(a)?.key, latestThrow(b)?.key);
});
