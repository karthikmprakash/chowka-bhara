import { scoreShells, shellCount, type Game } from "./game.ts";
export interface ThrowSnapshot {
  key: string;
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
    name: player.name,
    color: player.color,
    shells: [...game.shells],
    score,
    bonus: score === count || score === count * 2,
  };
}
