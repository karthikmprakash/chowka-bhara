"use client";
import type { CSSProperties } from "react";
import { COLORS, playerPath, type Game } from "@/lib/game";
import { Avatar, portraitOf } from "./avatar";
import { usePreferences } from "./preferences";
import { LockKeyhole, UnlockKeyhole } from "lucide-react";
export function MatchHud({ game: g }: { game: Game }) {
  const { t } = usePreferences();
  return (
    <div
      className={`match-hud players-${g.players.length}`}
      aria-label={t("The race home")}
    >
      {g.players.map((p, i) => {
        const home = p.pawns.filter(
          (v) => v === playerPath(g.size, p.color).length - 1,
        ).length;
        return (
          <div
            className={`match-player ${g.turn === i && g.phase === "playing" ? "is-current" : ""} ${p.resigned ? "is-out" : ""}`}
            key={p.id}
            style={{ "--player": COLORS[p.color] } as CSSProperties}
          >
            <Avatar value={portraitOf(p)} />
            <div>
              <strong title={p.name}>{p.name}</strong>
              <span className="home-seeds" aria-label={t(`${home}/4 home`)}>
                {Array.from({ length: 4 }, (_, j) => (
                  <i key={j} className={j < home ? "is-home" : ""} />
                ))}
                <small>{home}/4</small>
              </span>
            </div>
            <span
              className="capture-key"
              title={t(
                p.captures ? "Inner circle unlocked" : "Capture to unlock",
              )}
            >
              {p.captures ? (
                <UnlockKeyhole size={15} />
              ) : (
                <LockKeyhole size={15} />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
