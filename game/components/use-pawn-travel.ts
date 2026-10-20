"use client";
import { useLayoutEffect, useRef, useState } from "react";
import type { Game } from "@/lib/game";
import { pawnTravel, travelFrame, type PawnTravel } from "@/lib/presentation";
export function usePawnTravel(game: Game | null) {
  const [visual, setVisual] = useState<Game | null>(game),
    [travel, setTravel] = useState<PawnTravel | null>(null);
  const rendered = useRef<Game | null>(game);
  useLayoutEffect(() => {
    const before = rendered.current,
      plan = pawnTravel(before, game),
      motion = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      rendered.current = game;
      setVisual(game);
      setTravel(null);
    };
    if (!before || !game || !plan || motion.matches || document.hidden) {
      sync();
      return;
    }
    let timer: ReturnType<typeof setTimeout>,
      cancelled = false;
    setTravel(plan);
    const frame = (index: number) => {
      if (cancelled) return;
      if (index === plan.steps.length) {
        sync();
        return;
      }
      const next = travelFrame(before, plan, plan.steps[index]);
      rendered.current = next;
      setVisual(next);
      timer = setTimeout(() => frame(index + 1), plan.stepMs);
    };
    // Retain the already-painted departure position before the first transform transition.
    timer = setTimeout(() => frame(0), 16);
    const finish = () => {
      if (document.hidden || motion.matches) {
        cancelled = true;
        clearTimeout(timer);
        sync();
      }
    };
    document.addEventListener("visibilitychange", finish);
    motion.addEventListener("change", finish);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", finish);
      motion.removeEventListener("change", finish);
    };
  }, [game]);
  return { visualGame: visual, moving: travel !== null, travel };
}
