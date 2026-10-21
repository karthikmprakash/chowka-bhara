import { playerPath, type Game } from "./game.ts";
export type BadgeId =
  "first-game" | "gate-opener" | "homecoming" | "champion" | "together";
export const BADGES: {
  id: BadgeId;
  name: string;
  description: string;
  points: number;
}[] = [
  {
    id: "first-game",
    name: "First gathering",
    description: "Finish your first game.",
    points: 50,
  },
  {
    id: "gate-opener",
    name: "Gate opener",
    description: "Capture an opponent and open the inner circle.",
    points: 40,
  },
  {
    id: "homecoming",
    name: "Homecoming",
    description: "Bring a pawn to the centre.",
    points: 40,
  },
  {
    id: "champion",
    name: "Courtyard champion",
    description: "Win a game with all four pawns home.",
    points: 100,
  },
  {
    id: "together",
    name: "Across the courtyard",
    description: "Finish an online game with friends.",
    points: 75,
  },
];
export interface Journey {
  version: 1;
  badges: BadgeId[];
  games: number;
  wins: number;
  completed: string[];
}
export const freshJourney = (): Journey => ({
  version: 1,
  badges: [],
  games: 0,
  wins: 0,
  completed: [],
});
export function readJourney(raw: string | null): Journey {
  try {
    const v = JSON.parse(raw || "null");
    if (
      v?.version !== 1 ||
      !Array.isArray(v.badges) ||
      !Array.isArray(v.completed)
    )
      return freshJourney();
    return {
      version: 1,
      badges: [
        ...new Set(
          v.badges.filter((id: BadgeId) => BADGES.some((b) => b.id === id)),
        ),
      ] as BadgeId[],
      games: Number.isSafeInteger(v.games) && v.games >= 0 ? v.games : 0,
      wins: Number.isSafeInteger(v.wins) && v.wins >= 0 ? v.wins : 0,
      completed: v.completed
        .filter((id: unknown) => typeof id === "string")
        .slice(-100),
    };
  } catch {
    return freshJourney();
  }
}
export function journeyPoints(j: Journey) {
  return BADGES.filter((b) => j.badges.includes(b.id)).reduce(
    (sum, b) => sum + b.points,
    0,
  );
}
export function journeyRank(j: Journey) {
  const points = journeyPoints(j);
  return points >= 200
    ? "Mane master"
    : points >= 100
      ? "Shell keeper"
      : "Courtyard newcomer";
}
export function awardJourney(
  j: Journey,
  g: Game,
  playerId: string,
): { journey: Journey; earned: BadgeId[] } {
  const player = g.players.find((p) => p.id === playerId);
  if (!player) return { journey: j, earned: [] };
  const earned: BadgeId[] = [];
  const award = (id: BadgeId) => {
    if (!j.badges.includes(id) && !earned.includes(id)) earned.push(id);
  };
  if (player.captures > 0) award("gate-opener");
  const home = playerPath(g.size, player.color).length - 1;
  if (player.pawns.includes(home)) award("homecoming");
  // Terminal log ids survive profile edits and distinguish rematches that retain seats.
  const terminal = g.logs.findLast(
    (l) =>
      (l.kind === "home" && l.text.includes("won the game")) ||
      (l.kind === "system" && l.text.endsWith("left the table.")),
  );
  const key = `${g.players[0].id}:${terminal?.id ?? g.revision}`;
  const complete =
    g.phase === "finished" && !player.resigned && !j.completed.includes(key);
  const won = complete && g.players[g.winner!]?.id === playerId;
  if (complete) {
    award("first-game");
    if (g.mode === "online") award("together");
  }
  if (won && player.pawns.every((v) => v === home)) award("champion");
  if (!complete && !earned.length) return { journey: j, earned };
  return {
    journey: {
      ...j,
      badges: [...j.badges, ...earned],
      games: j.games + (complete ? 1 : 0),
      wins: j.wins + (won ? 1 : 0),
      completed: complete ? [...j.completed, key].slice(-100) : j.completed,
    },
    earned,
  };
}
