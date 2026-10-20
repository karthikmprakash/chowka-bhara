import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, rollGame, moveGame, basePath } from "../lib/game.ts";
import { latestThrow, pawnTravel, travelFrame } from "../lib/presentation.ts";
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

for (const size of [5, 7] as const) {
  test(`${size}: motion visits every square of a move through an outer corner`, () => {
    const before = newGame(size, "local");
    before.players[0].pawns[0] = 2;
    before.roll = size === 5 ? 8 : 6;
    const after = moveGame(before, 0),
      plan = pawnTravel(before, after)!;
    assert.deepEqual(
      plan.steps,
      Array.from({ length: before.roll }, (_, i) => i + 3),
    );
    const route = basePath(size);
    const positions = [plan.from, ...plan.steps].map((v) => route[v]);
    for (let i = 1; i < positions.length; i++)
      assert.equal(
        Math.abs(positions[i][0] - positions[i - 1][0]) +
          Math.abs(positions[i][1] - positions[i - 1][1]),
        1,
      );
    assert.ok(plan.steps.length * plan.stepMs <= 840);
  });
  test(`${size}: inward travel and captures wait for arrival without mutating either state`, () => {
    const before = newGame(size, "local");
    before.players[0].captures = 1;
    const edge = 4 * (size - 1);
    before.players[0].pawns[0] = edge - 2;
    before.roll = 4;
    const after = moveGame(before, 0),
      plan = pawnTravel(before, after)!;
    assert.deepEqual(plan.steps, [edge - 1, edge, edge + 1, edge + 2]);
    const frame = travelFrame(before, plan, edge);
    assert.equal(frame.turn, before.turn);
    assert.equal(frame.roll, null);
    assert.equal(frame.players[0].pawns[0], edge);
    assert.equal(before.players[0].pawns[0], edge - 2);
    assert.equal(after.players[0].pawns[0], edge + 2);
  });
}
test("Capture stays on the board while the moving pawn travels", () => {
  const before = newGame(5, "local");
  before.players[1].pawns[0] = 9;
  before.roll = 1;
  const after = moveGame(before, 0),
    plan = pawnTravel(before, after)!;
  assert.equal(after.players[1].pawns[0], 0);
  const frame = travelFrame(before, plan, 1);
  assert.equal(frame.players[1].pawns[0], 9);
  assert.equal(frame.players[0].captures, 0);
  assert.equal(after.players[0].captures, 1);
});
test("Opening, rematches, metadata, rolls and multiple missed moves never invent travel", () => {
  const g = newGame(),
    r = rollGame(g, [true, false, false, false]);
  assert.equal(pawnTravel(null, g), null);
  assert.equal(pawnTravel(g, r), null);
  assert.equal(pawnTravel(g, { ...g, revision: 1 }), null);
  assert.equal(pawnTravel(g, newGame()), null);
  const multiple = structuredClone(g);
  multiple.revision++;
  multiple.players[0].pawns = [1, 2, 0, 0];
  assert.equal(pawnTravel(g, multiple), null);
  const back = structuredClone(g);
  back.revision = 2;
  g.players[0].pawns[0] = 3;
  assert.equal(pawnTravel(g, back), null);
});
