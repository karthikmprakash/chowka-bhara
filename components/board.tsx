"use client";
import { memo, useState, type CSSProperties } from "react";
import { usePreferences } from "./preferences";
import { Flower, Flag, Route } from "lucide-react";
import {
  COLORS,
  COLOR_NAMES,
  isSafe,
  legalMoves,
  playerPath,
  type Game,
  type Point,
} from "@/lib/game";
const GRAINS = ["Kidney beans", "Green gram", "Chickpeas", "Rice grains"];
interface Props {
  game: Game;
  canPlay: boolean;
  preview?: boolean;
  showPath: boolean;
  onMove: (pawn: number) => void;
  throwOverlay?: React.ReactNode;
}
export const Board = memo(function Board({
  game: g,
  canPlay,
  preview,
  showPath,
  onMove,
  throwOverlay,
}: Props) {
  const { t } = usePreferences();
  const [hover, setHover] = useState<number | null>(null);
  const n = g.size,
    current = g.players[g.turn],
    moves = legalMoves(g),
    center = Math.floor(n / 2);
  const path = playerPath(n, current.color);
  const stacks = new Map<
    string,
    { player: number; pawn: number; point: Point; home: boolean }[]
  >();
  g.players.forEach((p, player) => {
    if (p.resigned) return;
    const route = playerPath(n, p.color);
    p.pawns.forEach((position, pawn) => {
      const point = route[position],
        key = point.join(",");
      if (!stacks.has(key)) stacks.set(key, []);
      stacks
        .get(key)!
        .push({ player, pawn, point, home: position === route.length - 1 });
    });
  });
  const destinations =
    canPlay && g.roll !== null
      ? moves.map((i) => path[current.pawns[i] + g.roll!].join(","))
      : [];
  const target =
    hover !== null && moves.includes(hover) && g.roll !== null
      ? path[current.pawns[hover] + g.roll].join(",")
      : null;
  return (
    <div className={`board-stage ${preview ? "is-preview" : ""}`}>
      <div className="stage-watermark" aria-hidden="true">
        {t("चौका बारा ")}
      </div>
      <div className="board-surround">
        {g.players.map((p, i) => (
          <div
            className={`seat seat-${p.color} ${!preview && g.turn === i && g.phase === "playing" ? "seat-active" : ""} ${p.resigned ? "seat-out" : ""}`}
            key={p.id}
            style={{ "--player": COLORS[p.color] } as CSSProperties}
          >
            <span className="seat-avatar">
              {p.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{p.name}</strong>
              <span>
                {t(
                  preview
                    ? COLOR_NAMES[p.color]
                    : p.resigned
                      ? "Resigned"
                      : `${p.pawns.filter((v) => v === playerPath(n, p.color).length - 1).length}/4 home`,
                )}
                {t(p.bot ? " · Computer" : "")}
                <span className="grain-name"> · {t(GRAINS[p.color])}</span>
              </span>
            </div>
            {!preview && g.turn === i && g.phase === "playing" && (
              <span className="turn-dot" aria-label={t("Current turn")} />
            )}
          </div>
        ))}
        <div className="board-frame" style={{ "--n": n } as CSSProperties}>
          <span className="frame-corner tl" />
          <span className="frame-corner tr" />
          <span className="frame-corner bl" />
          <span className="frame-corner br" />
          <div
            className="board-grid"
            role="group"
            aria-label={t(`${n} by ${n} Chowka Bara board`)}
          >
            {Array.from({ length: n * n }, (_, i) => {
              const r = Math.floor(i / n),
                c = i % n,
                key = `${r},${c}`,
                safe = isSafe(n, [r, c]),
                home = r === center && c === center;
              const start =
                c === center && r === n - 1
                  ? 0
                  : r === center && c === 0
                    ? 1
                    : c === center && r === 0
                      ? 2
                      : r === center && c === n - 1
                        ? 3
                        : null;
              const step = path.findIndex((p) => p[0] === r && p[1] === c);
              return (
                <div
                  key={i}
                  className={`cell ${safe ? "safe" : ""} ${home ? "home-cell" : ""} ${destinations.includes(key) ? "destination" : ""} ${target === key ? "target" : ""}`}
                  style={
                    start !== null
                      ? ({ "--start": COLORS[start] } as CSSProperties)
                      : undefined
                  }
                >
                  {safe && !home && (
                    <span className="safe-cross" aria-hidden="true" />
                  )}
                  {home && (
                    <Flower
                      className="home-flower"
                      strokeWidth={1}
                      aria-label={t("Central home")}
                    />
                  )}
                  {start !== null && <span className="start-mark" />}
                  {showPath && !home && (
                    <span className="path-step">{step}</span>
                  )}
                </div>
              );
            })}
            {Array.from(stacks.entries()).flatMap(([, tokens]) =>
              tokens.map((token, stack) => {
                const p = g.players[token.player],
                  eligible =
                    token.player === g.turn &&
                    canPlay &&
                    moves.includes(token.pawn) &&
                    !preview;
                const cols =
                  tokens.length <= 1
                    ? 1
                    : tokens.length <= 4
                      ? 2
                      : tokens.length <= 9
                        ? 3
                        : 4;
                const rows = Math.ceil(tokens.length / cols);
                const dx =
                  ((stack % cols) - (cols - 1) / 2) * (n === 7 ? 17 : 20);
                const dy =
                  (Math.floor(stack / cols) - (rows - 1) / 2) *
                  (n === 7 ? 17 : 20);
                return (
                  <button
                    key={`${p.id}-${token.pawn}`}
                    className={`pawn grain-${p.color} ${eligible ? "movable" : ""} ${token.home ? "arrived" : ""}`}
                    disabled={!eligible}
                    onClick={() => onMove(token.pawn)}
                    onMouseEnter={() => setHover(token.pawn)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(token.pawn)}
                    onBlur={() => setHover(null)}
                    aria-label={t(
                      `${p.name}, pawn ${token.pawn + 1}${eligible ? ", move " + g.roll + " spaces" : ""}`,
                    )}
                    style={
                      {
                        "--player": COLORS[p.color],
                        "--col": token.point[1] + 0.5,
                        "--row": token.point[0] + 0.5,
                        left: `${((token.point[1] + 0.5) / n) * 100}%`,
                        top: `${((token.point[0] + 0.5) / n) * 100}%`,
                        "--dx": `${dx}px`,
                        "--dy": `${dy}px`,
                        "--pawn-size":
                          tokens.length > 4
                            ? "15px"
                            : n === 7
                              ? "19px"
                              : "24px",
                      } as CSSProperties
                    }
                  >
                    <i className="grain-body" aria-hidden="true" />
                    <span className="pawn-number">{token.pawn + 1}</span>
                  </button>
                );
              }),
            )}
          </div>
          {throwOverlay}
          <div className="board-letters" aria-hidden="true">
            {Array.from({ length: n }, (_, i) => (
              <span key={i}>{String.fromCharCode(65 + i)}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="board-key">
        <span>
          <span className="key-cross">×</span> {t("Safe house ")}
        </span>
        <span>
          <Flower size={13} /> {t("The finish ")}
        </span>
        <span>
          <Route size={13} /> {t("Spiral inward ")}
        </span>
      </div>
      {g.phase === "finished" && (
        <div className="board-won">
          <Flag size={19} />
          <span>{t(`${g.players[g.winner!].name} wins the courtyard`)}</span>
        </div>
      )}
    </div>
  );
});
