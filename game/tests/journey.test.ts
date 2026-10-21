import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, moveGame, playerPath, resignGame } from "../lib/game.ts";
import {
  freshJourney,
  readJourney,
  awardJourney,
  journeyPoints,
  journeyRank,
} from "../lib/journey.ts";
function finished(mode: "local" | "online" = "local") {
  const g = newGame(5, mode);
  g.phase = "playing";
  g.players[0].captures = 1;
  const end = playerPath(5, 0).length - 1;
  g.players[0].pawns = [end, end, end, end - 1];
  g.roll = 1;
  return moveGame(g, 3);
}
test("Progress starts honestly empty and repairs damaged device data", () => {
  assert.deepEqual(readJourney("bad"), freshJourney());
  assert.deepEqual(readJourney('{"version":2}'), freshJourney());
  const j = readJourney(
    JSON.stringify({
      version: 1,
      badges: ["champion", "champion", "fake"],
      games: -5,
      wins: "x",
      completed: [],
    }),
  );
  assert.deepEqual(j.badges, ["champion"]);
  assert.equal(j.games, 0);
  assert.equal(j.wins, 0);
  assert.equal(journeyPoints(freshJourney()), 0);
});
test("Achievements use the selected player and only real captures, homecomings and finishes", () => {
  let j = freshJourney();
  const g = newGame();
  assert.deepEqual(awardJourney(j, g, g.players[0].id).earned, []);
  g.players[1].captures = 2;
  assert.deepEqual(awardJourney(j, g, g.players[0].id).earned, []);
  g.players[0].captures = 1;
  const a = awardJourney(j, g, g.players[0].id);
  assert.deepEqual(a.earned, ["gate-opener"]);
  assert.equal(a.journey.games, 0);
  assert.deepEqual(awardJourney(a.journey, g, g.players[0].id).earned, []);
});
test("A completed round awards points once across renders and reloads", () => {
  const g = finished(),
    first = awardJourney(freshJourney(), g, g.players[0].id);
  assert.equal(first.journey.games, 1);
  assert.equal(first.journey.wins, 1);
  assert.equal(journeyPoints(first.journey), 230);
  assert.equal(journeyRank(first.journey), "Mane master");
  const again = awardJourney(
    readJourney(JSON.stringify(first.journey)),
    structuredClone(g),
    g.players[0].id,
  );
  assert.deepEqual(again.earned, []);
  assert.deepEqual(again.journey, first.journey);
});
test("Online finish unlocks the friends badge; a resigned seat receives no finish reward", () => {
  const g = finished("online");
  assert.ok(
    awardJourney(freshJourney(), g, g.players[0].id).earned.includes(
      "together",
    ),
  );
  g.players[1].resigned = true;
  const a = awardJourney(freshJourney(), g, g.players[1].id);
  assert.equal(a.journey.games, 0);
  assert.ok(!a.earned.includes("first-game"));
});

test("A resignation win is counted honestly; profile edits do not recount it and rematches remain distinct", () => {
  const g = newGame(5, "online");
  g.phase = "playing";
  const first = resignGame(g, 1),
    id = g.players[0].id;
  const a = awardJourney(freshJourney(), first, id);
  assert.equal(a.journey.wins, 1);
  assert.ok(!a.journey.badges.includes("champion"));
  const profile = { ...first, revision: first.revision + 1 };
  assert.deepEqual(awardJourney(a.journey, profile, id).journey, a.journey);
  const next = newGame(5, "online");
  next.phase = "playing";
  next.players = g.players;
  next.revision = first.revision + 2;
  const b = awardJourney(a.journey, resignGame(next, 1), id);
  assert.equal(b.journey.games, 2);
  assert.equal(b.journey.wins, 2);
});
