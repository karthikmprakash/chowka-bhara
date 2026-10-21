"use client";
import type { CSSProperties } from "react";
import { playerPath, gateOpen, COLORS, type Game, type Point } from "@/lib/game";
import { usePreferences } from "./preferences";
const points = (path: Point[]) =>
  path.map(([r, c]) => `${c * 100 + 50},${r * 100 + 50}`).join(" ");
const motionPath = (path: Point[]) =>
  path
    .map(([r, c], i) => `${i ? "L" : "M"} ${c * 100 + 50} ${r * 100 + 50}`)
    .join(" ");
export function RouteGuide({
  game: g,
  rotate = 0,
}: {
  game: Game;
  /** Degrees to turn the whole route with the board. */
  rotate?: number;
}) {
  const p = g.players[g.turn],
    path = playerPath(g.size, p.color),
    boundary = 4 * (g.size - 1),
    unlocked = gateOpen(g, g.turn);
  const outer = path.slice(0, boundary),
    inner = path.slice(boundary - 1),
    // The marker follows the road all the way to the centre; the gate is a
    // rule, shown by the lock on the square, not a gap in the route.
    active = path;
  const marker = `guide-arrow-${p.color}`;
  return (
    <svg
      className={`route-map ${unlocked ? "is-unlocked" : "is-locked"}`}
      viewBox={`0 0 ${g.size * 100} ${g.size * 100}`}
      aria-hidden="true"
      style={
        {
          "--route-color": COLORS[p.color],
          transform: rotate ? `rotate(${rotate}deg)` : undefined,
        } as CSSProperties
      }
    >
      <defs>
        <marker
          id={marker}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path
            d="M 1 1 L 9 5 L 1 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </marker>
      </defs>
      <polyline className="route-outer" points={points(outer)} fill="none" />
      <polyline className="route-inner" points={points(inner)} fill="none" />
      {active.slice(1).map(([r, c], i) => {
        if (i % Math.max(3, Math.floor(g.size / 2)) !== 1) return null;
        const [pr, pc] = active[i],
          x = (pc + c) * 50 + 50,
          y = (pr + r) * 50 + 50;
        return (
          <line
            key={i}
            x1={x - (c - pc) * 8}
            y1={y - (r - pr) * 8}
            x2={x + (c - pc) * 8}
            y2={y + (r - pr) * 8}
            markerEnd={`url(#${marker})`}
          />
        );
      })}
      <g className="route-runner">
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          keyTimes="0;0.04;0.94;1"
          dur={`${active.length * 0.18}s`}
          repeatCount="indefinite"
        />
        <circle r="10" />
        <path d="M -3 -4 L 3 0 L -3 4" />
        <animateMotion
          dur={`${active.length * 0.18}s`}
          repeatCount="indefinite"
          rotate="auto"
          path={motionPath(active)}
        />
      </g>
    </svg>
  );
}
export function RouteExplanation({ game: g }: { game: Game }) {
  const { t } = usePreferences(),
    p = g.players[g.turn];
  return (
    <div className="route-explanation" role="status">
      <span className="route-key-dot" style={{ background: COLORS[p.color] }} />
      <strong>{p.name}</strong>
      <span>
        {t(
          p.captures
            ? "Outer circle → Inner circle → Home"
            : "Follow the outer circle. Capture to unlock the inner circle.",
        )}
      </span>
    </div>
  );
}
