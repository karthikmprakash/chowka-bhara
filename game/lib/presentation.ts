import { scoreShells, shellCount, type Game } from "./game.ts";
export interface ThrowSnapshot {
  key: string;
  playerId: string;
  name: string;
  color: number;
  shells: boolean[];
  score: number;
  bonus: boolean;
}
export function latestThrow(game: Game | null): ThrowSnapshot | null {
  if (!game) return null;
  const entry = game.logs.findLast((log) => log.kind === "roll");
  if (!entry || !game.shells.length) return null;
  const player = game.players[entry.player];
  if (!player) return null;
  const score = scoreShells(game.shells),
    count = shellCount(game.size);
  return {
    key: `${game.players[0].id}:${entry.id}`,
    playerId: player.id,
    name: player.name,
    color: player.color,
    shells: [...game.shells],
    score,
    bonus: score === count || score === count * 2,
  };
}

export interface ThrowingPlayer {
  id: string;
  name: string;
  color: number;
}

/** A throw is live from the roll until the pawn it moved has been placed. */
export interface LiveThrow {
  playerId: string;
  name: string;
  color: number;
  shells: boolean[];
  score: number;
  bonus: boolean;
}

export function currentThrow(game: Game): LiveThrow | null {
  if (game.phase !== "playing" || game.roll === null) return null;
  const player = game.players[game.turn];
  if (!player) return null;
  const count = shellCount(game.size);
  return {
    playerId: player.id,
    name: player.name,
    color: player.color,
    shells: [...game.shells],
    score: game.roll,
    bonus: game.roll === count || game.roll === count * 2,
  };
}

export interface PawnTravel {
  player: number;
  pawn: number;
  from: number;
  to: number;
  steps: number[];
  stepMs: number;
}
// Only animate an observed move. Opening, rematching, captures and missed histories snap safely.
export function pawnTravel(
  before: Game | null,
  after: Game | null,
): PawnTravel | null {
  if (
    !before ||
    !after ||
    before.size !== after.size ||
    before.phase !== "playing" ||
    after.revision <= before.revision ||
    before.players.length !== after.players.length ||
    before.players.some((p, i) => p.id !== after.players[i].id)
  )
    return null;
  const forward: { player: number; pawn: number; from: number; to: number }[] =
    [];
  before.players.forEach((p, player) =>
    p.pawns.forEach((from, pawn) => {
      const to = after.players[player].pawns[pawn];
      if (to > from) forward.push({ player, pawn, from, to });
    }),
  );
  if (forward.length !== 1) return null;
  const move = forward[0],
    distance = move.to - move.from;
  if (distance > before.size * 2 - 2 || move.player !== before.turn)
    return null;
  return {
    ...move,
    steps: Array.from({ length: distance }, (_, i) => move.from + i + 1),
    stepMs: Math.min(150, 840 / distance),
  };
}
export function travelFrame(
  before: Game,
  travel: PawnTravel,
  position: number,
): Game {
  return {
    ...before,
    roll: null,
    players: before.players.map((p, i) =>
      i === travel.player
        ? {
            ...p,
            pawns: p.pawns.map((v, j) => (j === travel.pawn ? position : v)),
          }
        : p,
    ),
  };
}
