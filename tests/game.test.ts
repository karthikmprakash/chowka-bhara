import { test } from "node:test";
import assert from "node:assert/strict";
import {
  basePath,
  playerPath,
  scoreShells,
  shellCount,
  newGame,
  rollGame,
  moveGame,
  legalMoves,
  isSafe,
  resignGame,
  chooseBotMove,
  type Game,
} from "../lib/game.ts";
for (const size of [5, 7] as const) {
  test(`${size}×${size}: connected spiral, complete coverage and rotated homes`, () => {
    const path = basePath(size);
    assert.equal(new Set(path.map((p) => p.join(","))).size, size * size);
    for (let i = 1; i < path.length; i++)
      assert.equal(
        Math.abs(path[i][0] - path[i - 1][0]) +
          Math.abs(path[i][1] - path[i - 1][1]),
        1,
        `Step ${i}`,
      );
    assert.deepEqual(path.at(-1), [Math.floor(size / 2), Math.floor(size / 2)]);
    assert.deepEqual(playerPath(size, 2)[0], [0, Math.floor(size / 2)]);
    assert.equal(path.length, size === 5 ? 25 : 50);
  });
  test(`${size}×${size}: shell scores and bonus turns`, () => {
    const count = shellCount(size),
      g = newGame(size);
    assert.equal(scoreShells(Array(count).fill(false)), count * 2);
    const r = rollGame(g, Array(count).fill(true));
    assert.equal(r.roll, count);
    assert.equal(r.bonus, true);
    const m = moveGame(r, 0);
    assert.equal(m.turn, 0);
    assert.equal(m.roll, null);
    const r2 = rollGame(
      g,
      Array.from({ length: count }, (_, i) => i === 0),
    );
    const m2 = moveGame(r2, 0);
    assert.equal(m2.turn, 1);
  });
  test(`${size}×${size}: exact home, bonus and victory`, () => {
    const g = newGame(size),
      end = basePath(size).length - 1;
    g.players[0].pawns = [end, end, end, end - 1];
    g.roll = 2;
    assert.equal(legalMoves(g).length, 0);
    g.roll = 1;
    const result = moveGame(g, 3);
    assert.equal(result.phase, "finished");
    assert.equal(result.winner, 0);
    g.players[0].pawns = [0, 0, 0, end - 1];
    const home = moveGame(g, 3);
    assert.equal(home.turn, 0);
    assert.equal(home.bonus, true);
  });
  test(`${size}×${size}: capture resets rival and opens inner ring`, () => {
    const g = newGame(size, "local", 2, true),
      path = playerPath(size, 0),
      rival = playerPath(size, 2);
    const target = path.findIndex(
      (p, i) =>
        i > 0 &&
        !isSafe(size, p) &&
        rival.some((q) => q[0] === p[0] && q[1] === p[1]),
    );
    const coord = path[target],
      ri = rival.findIndex((p) => p[0] === coord[0] && p[1] === coord[1]);
    g.players[0].pawns[0] = target - 1;
    g.players[1].pawns[0] = ri;
    g.roll = 1;
    const captured = moveGame(g, 0);
    assert.equal(captured.players[1].pawns[0], 0);
    assert.equal(captured.players[0].captures, 1);
    assert.equal(captured.turn, 0);
    g.players[0].pawns[0] = 4 * (size - 1) - 1;
    g.roll = 1;
    assert.ok(!legalMoves(g).includes(0));
    g.players[0].captures = 1;
    assert.ok(legalMoves(g).includes(0));
  });
  test(`${size}×${size}: safe houses protect rivals`, () => {
    const g = newGame(size, "local", 2),
      path = playerPath(size, 0),
      rival = playerPath(size, 2);
    const target = path.findIndex(
      (p, i) =>
        i > 0 &&
        i < path.length - 1 &&
        isSafe(size, p) &&
        rival.some((q) => q[0] === p[0] && q[1] === p[1]),
    );
    const coord = path[target],
      ri = rival.findIndex((p) => p[0] === coord[0] && p[1] === coord[1]);
    g.players[0].pawns[0] = target - 1;
    g.players[1].pawns[0] = ri;
    g.roll = 1;
    const m = moveGame(g, 0);
    assert.equal(m.players[1].pawns[0], ri);
    assert.equal(m.players[0].captures, 0);
  });
  for (const count of [2, 3, 4])
    test(`${size}×${size}: ${count}-player full game simulation finishes`, () => {
      let g = newGame(size, "local", count);
      let actions = 0,
        seed = 15321;
      while (g.phase === "playing" && actions < 15000) {
        if (g.roll === null) {
          const shells = Array.from({ length: shellCount(size) }, () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return !!(seed & 0x10000);
          });
          g = rollGame(g, shells);
        } else g = moveGame(g, chooseBotMove(g));
        actions++;
      }
      assert.equal(
        g.phase,
        "finished",
        `Did not finish after ${actions} actions`,
      );
      assert.ok(g.winner !== null);
      assert.equal(
        g.players[g.winner!].pawns.filter(
          (p) => p === basePath(size).length - 1,
        ).length,
        4,
      );
    });
}
test("Reject illegal commands; inputs remain immutable", () => {
  const g = newGame();
  assert.throws(() => moveGame(g, 0));
  assert.throws(() => rollGame(g, [true]));
  const r = rollGame(g, [true, false, false, false]);
  assert.equal(g.roll, null);
  assert.throws(() => rollGame(r, [true, false, false, false]));
  assert.throws(() => moveGame(r, 5));
});
test("Resign skips players and declares last remaining winner", () => {
  const g = newGame(5, "local", 3);
  const r = resignGame(g, 0);
  assert.equal(r.turn, 1);
  const last = resignGame(r, 1);
  assert.equal(last.phase, "finished");
  assert.equal(last.winner, 2);
});
test("A blocked normal roll passes; a blocked bonus keeps its turn", () => {
  const g = newGame();
  const end = basePath(5).length - 1;
  g.players[0].pawns = [end, end, end, end - 1];
  const pass = rollGame(g, [true, true, false, false]);
  assert.equal(pass.roll, null);
  assert.equal(pass.turn, 1);
  const bonus = rollGame(g, [true, true, true, true]);
  assert.equal(bonus.roll, null);
  assert.equal(bonus.turn, 0);
});
for (const size of [5, 7] as const)
  for (const count of [2, 4])
    test(`${size}×${size}: capture-to-enter ${count}-player game completes`, () => {
      let g = newGame(size, "local", count, true),
        seed = 79765,
        actions = 0;
      while (g.phase === "playing" && actions < 20000) {
        if (g.roll === null) {
          const shells = Array.from({ length: shellCount(size) }, () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return !!(seed & 0x10000);
          });
          g = rollGame(g, shells);
        } else g = moveGame(g, chooseBotMove(g));
        actions++;
      }
      assert.equal(g.phase, "finished");
      assert.ok(g.players[g.winner!].captures > 0);
    });
