"use client";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/game";

export type MatchMoment = {
  kind: "capture" | "home" | "victory";
  name: string;
};

/**
 * Watches the game log for a capture, a pawn coming home, or the win, and
 * returns it just long enough to be celebrated.
 */
export function useMatchMoment(game: Game | null): MatchMoment | null {
  const seen = useRef(""),
    [moment, setMoment] = useState<MatchMoment | null>(null);
  const entry = game?.logs.findLast(
      (l) => l.kind === "capture" || l.kind === "home",
    ),
    key = game && entry ? `${game.players[0].id}:${entry.id}:${entry.kind}` : "";
  const identity = game?.players[0]?.id,
    previous = useRef(identity);

  useEffect(() => {
    if (previous.current !== identity) {
      previous.current = identity;
      seen.current = key;
      setMoment(null);
      return;
    }
    if (!game || !entry || key === seen.current) return;
    seen.current = key;
    setMoment({
      kind:
        game.phase === "finished"
          ? "victory"
          : entry.kind === "capture"
            ? "capture"
            : "home",
      name: game.players[entry.player]?.name || "",
    });
    const timer = setTimeout(
      () => setMoment(null),
      game.phase === "finished" ? 2600 : 1700,
    );
    return () => clearTimeout(timer);
  }, [key, identity]);

  return moment;
}
