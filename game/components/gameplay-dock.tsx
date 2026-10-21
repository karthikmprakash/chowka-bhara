"use client";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { COLORS, type Game } from "@/lib/game";
import type { ThrowingPlayer } from "@/lib/presentation";
import type { MatchMoment } from "./use-match-moment";
import { CowrieTray } from "./cowrie-tray";
import { momentLabel } from "./match-moments";
import { usePreferences } from "./preferences";
import "./gameplay-dock.css";

/**
 * One footer, and it is the cowries. When they are yours to throw the tray is
 * the button; once they are down the board is the only place to act.
 */
export function GameplayDock({
  game,
  myTurn,
  playable,
  throwing,
  moment,
  onThrow,
  onResults,
}: {
  game: Game;
  myTurn: boolean;
  playable: boolean;
  throwing: ThrowingPlayer | null;
  moment: MatchMoment | null;
  onThrow: () => void;
  onResults: () => void;
}) {
  const { t } = usePreferences();
  const rolling = throwing !== null;
  const finished = game.phase === "finished";
  const canThrow = !finished && myTurn && game.roll === null && playable;
  const player = game.players[game.turn];

  return (
    <div
      className={`gameplay-dock ${myTurn ? "is-my-turn" : ""} ${canThrow ? "is-ready" : ""}`}
      style={{ "--turn-color": COLORS[player.color] } as CSSProperties}
    >
      <div className="gameplay-dock-inner">
        <CowrieTray
          game={game}
          myTurn={myTurn}
          rolling={rolling}
          canThrow={canThrow}
          moment={moment ? momentLabel(moment.kind) : null}
          onThrow={onThrow}
        />
        {finished && (
          <div className="dock-action">
            <button className="primary-button dock-results" onClick={onResults}>
              {t("View results")}
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
