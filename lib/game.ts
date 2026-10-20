export type BoardSize = 5 | 7;
export type Mode = "solo" | "local" | "online";
export type Phase = "lobby" | "playing" | "finished";
export type Point = [number, number];
export interface Player {
  id: string;
  name: string;
  color: number;
  avatar?: number;
  bot: boolean;
  pawns: number[];
  captures: number;
  resigned: boolean;
}
export interface GameLog {
  id: number;
  player: number;
  text: string;
  kind: "roll" | "move" | "capture" | "home" | "system";
}
export interface Game {
  size: BoardSize;
  mode: Mode;
  captureRequired: boolean;
  players: Player[];
  turn: number;
  phase: Phase;
  roll: number | null;
  shells: boolean[];
  bonus: boolean;
  winner: number | null;
  revision: number;
  logs: GameLog[];
  lastAction: string;
}
export const COLORS = ["#b74f37", "#3e756c", "#bb923e", "#606a9b"];
export const COLOR_NAMES = ["Terracotta", "Jade", "Marigold", "Indigo"];
export const shellCount = (size: BoardSize) => (size === 5 ? 4 : 6);
export const scoreShells = (shells: boolean[]) =>
  shells.filter(Boolean).length || shells.length * 2;
export function basePath(size: BoardSize): Point[] {
  const path: Point[] = [];
  let entry: Point = [size - 1, Math.floor(size / 2)];
  for (let layer = 0; layer < Math.floor(size / 2); layer++) {
    const lo = layer,
      hi = size - 1 - layer;
    let ring: Point[] = [];
    for (let c = lo; c <= hi; c++) ring.push([hi, c]);
    for (let r = hi - 1; r >= lo; r--) ring.push([r, hi]);
    for (let c = hi - 1; c >= lo; c--) ring.push([lo, c]);
    for (let r = lo + 1; r < hi; r++) ring.push([r, lo]);
    if (layer % 2) ring = ring.reverse();
    const start = ring.findIndex((p) => p[0] === entry[0] && p[1] === entry[1]);
    const ordered = [...ring.slice(start), ...ring.slice(0, start)];
    path.push(...ordered);
    let last = path[path.length - 1];
    if (
      (last[0] === lo || last[0] === hi) &&
      (last[1] === lo || last[1] === hi)
    ) {
      // A seven-house spiral returns through its entry before the final centre.
      path.push(ordered[0]);
      last = ordered[0];
    }
    entry = [
      last[0] === hi ? hi - 1 : last[0] === lo ? lo + 1 : last[0],
      last[1] === hi ? hi - 1 : last[1] === lo ? lo + 1 : last[1],
    ];
  }
  path.push([Math.floor(size / 2), Math.floor(size / 2)]);
  return path;
}
const cache = new Map<string, Point[]>();
export function playerPath(size: BoardSize, color: number): Point[] {
  const key = `${size}:${color}`;
  if (!cache.has(key))
    cache.set(
      key,
      basePath(size).map(([r, c]) => {
        for (let i = 0; i < color; i++) [r, c] = [c, size - 1 - r];
        return [r, c] as Point;
      }),
    );
  return cache.get(key)!;
}
export function isSafe(size: BoardSize, [r, c]: Point) {
  const m = Math.floor(size / 2),
    e = size - 1;
  return (
    (r === m && (c === 0 || c === m || c === e)) ||
    (c === m && (r === 0 || r === e)) ||
    (size === 7 && (r === 1 || r === e - 1) && (c === 1 || c === e - 1))
  );
}
export function makePlayer(
  name: string,
  color: number,
  bot = false,
  id = crypto.randomUUID(),
): Player {
  return {
    id,
    name,
    color,
    bot,
    pawns: [0, 0, 0, 0],
    captures: 0,
    resigned: false,
  };
}
export function newGame(
  size: BoardSize = 5,
  mode: Mode = "solo",
  count = 2,
  captureRequired = false,
  name = "You",
  avatar = 0,
): Game {
  const colors = count === 2 ? [0, 2] : count === 3 ? [0, 1, 2] : [0, 1, 2, 3];
  return {
    size,
    mode,
    captureRequired,
    players: colors.map((c, i) => ({
      ...makePlayer(
        i === 0
          ? name
          : mode === "solo"
            ? ["", "Meera", "Arjun", "Tara"][i]
            : `Player ${i + 1}`,
        c,
        mode === "solo" && i > 0,
      ),
      avatar: i === 0 ? avatar : [0, 0, 1, 4][i],
    })),
    turn: 0,
    phase: mode === "online" ? "lobby" : "playing",
    roll: null,
    shells: [],
    bonus: false,
    winner: null,
    revision: 0,
    logs: [
      {
        id: 0,
        player: 0,
        text: "The table is ready. Let the game begin.",
        kind: "system",
      },
    ],
    lastAction: "Welcome to the table",
  };
}
export function legalMoves(g: Game): number[] {
  if (g.phase !== "playing" || g.roll === null) return [];
  const p = g.players[g.turn],
    end = playerPath(g.size, p.color).length - 1;
  return p.pawns.flatMap((v, i) =>
    v < end &&
    v + g.roll! <= end &&
    (!g.captureRequired || p.captures > 0 || v + g.roll! < 4 * (g.size - 1))
      ? [i]
      : [],
  );
}
function log(g: Game, text: string, kind: GameLog["kind"], player = g.turn) {
  g.logs = [...g.logs.slice(-39), { id: g.revision + 1, player, text, kind }];
  g.lastAction = text;
}
function nextTurn(g: Game) {
  do {
    g.turn = (g.turn + 1) % g.players.length;
  } while (g.players[g.turn].resigned);
  g.bonus = false;
}
export function rollGame(input: Game, shells: boolean[]): Game {
  if (input.phase !== "playing" || input.roll !== null)
    throw new Error("Wait for your turn to throw.");
  if (
    shells.length !== shellCount(input.size) ||
    shells.some((v) => typeof v !== "boolean")
  )
    throw new Error("Invalid cowrie throw.");
  const g = structuredClone(input);
  g.shells = shells;
  g.roll = scoreShells(shells);
  g.bonus = g.roll === shells.length || g.roll === 2 * shells.length;
  log(
    g,
    `${g.players[g.turn].name} threw ${g.roll}${g.bonus ? " · bonus throw" : ""}.`,
    "roll",
  );
  if (!legalMoves(g).length) {
    log(g, `${g.players[g.turn].name} has no legal move.`, "system");
    g.roll = null;
    if (!g.bonus) nextTurn(g);
  }
  g.revision++;
  return g;
}
export function moveGame(input: Game, pawn: number): Game {
  if (!Number.isInteger(pawn) || !legalMoves(input).includes(pawn))
    throw new Error("Choose a highlighted pawn.");
  const g = structuredClone(input),
    p = g.players[g.turn],
    distance = g.roll!;
  p.pawns[pawn] += distance;
  const path = playerPath(g.size, p.color),
    destination = path[p.pawns[pawn]];
  let captured = 0;
  if (!isSafe(g.size, destination))
    for (let i = 0; i < g.players.length; i++) {
      if (i === g.turn || g.players[i].resigned) continue;
      const rival = g.players[i],
        rp = playerPath(g.size, rival.color);
      rival.pawns = rival.pawns.map((v) => {
        if (
          v < rp.length - 1 &&
          rp[v][0] === destination[0] &&
          rp[v][1] === destination[1]
        ) {
          captured++;
          return 0;
        }
        return v;
      });
    }
  p.captures += captured;
  const home = p.pawns[pawn] === path.length - 1;
  log(
    g,
    captured
      ? `${p.name} captured ${captured} pawn${captured > 1 ? "s" : ""}! Throw again.`
      : home
        ? `${p.name} brought a pawn home! Throw again.`
        : `${p.name} moved pawn ${pawn + 1} by ${distance}.`,
    captured ? "capture" : home ? "home" : "move",
  );
  g.roll = null;
  if (p.pawns.every((v) => v === path.length - 1)) {
    g.phase = "finished";
    g.winner = g.turn;
    log(g, `${p.name} won the game!`, "home");
  } else if (!g.bonus && !captured && !home) nextTurn(g);
  else g.bonus = true;
  g.revision++;
  return g;
}
export function resignGame(input: Game, player: number): Game {
  if (input.phase !== "playing" || input.players[player].resigned)
    throw new Error("This player cannot resign.");
  const g = structuredClone(input);
  g.players[player].resigned = true;
  log(g, `${g.players[player].name} left the table.`, "system", player);
  const active = g.players
    .map((p, i) => (!p.resigned ? i : -1))
    .filter((i) => i >= 0);
  if (active.length === 1) {
    g.phase = "finished";
    g.winner = active[0];
  } else if (g.turn === player) {
    g.roll = null;
    nextTurn(g);
  }
  g.revision++;
  return g;
}
export function chooseBotMove(g: Game): number {
  const moves = legalMoves(g),
    p = g.players[g.turn],
    path = playerPath(g.size, p.color);
  let best = moves[0],
    score = -Infinity;
  for (const i of moves) {
    const target = p.pawns[i] + g.roll!,
      dest = path[target];
    let s =
      target * 0.6 +
      (p.pawns[i] === 0 ? 3 : 0) +
      (isSafe(g.size, dest) ? 5 : 0);
    if (target === path.length - 1) s += 100;
    for (const rival of g.players)
      if (rival.id !== p.id && !rival.resigned) {
        const rp = playerPath(g.size, rival.color);
        for (const v of rival.pawns)
          if (
            rp[v][0] === dest[0] &&
            rp[v][1] === dest[1] &&
            !isSafe(g.size, dest)
          )
            s += 65;
      }
    if (s > score) {
      score = s;
      best = i;
    }
  }
  return best;
}
export function randomShells(size: BoardSize) {
  const bytes = new Uint8Array(shellCount(size));
  crypto.getRandomValues(bytes);
  return [...bytes].map((v) => v < 128);
}
