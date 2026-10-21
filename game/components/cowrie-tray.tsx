"use client";
import { COLORS, shellCount, type Game } from "@/lib/game";
import { currentThrow } from "@/lib/presentation";
import { Cowries } from "./cowries";
import { usePreferences } from "./preferences";

/**
 * The one footer of the game, and the throw control itself.
 *
 * It is a cup of cowries: tap it to toss. While they are yours the bar is a
 * raised terracotta key with the shells sitting in a dark well; once they are
 * down it settles into a quiet record of the throw.
 */
export function CowrieTray({
  game,
  myTurn,
  rolling,
  canThrow,
  moment,
  onThrow,
}: {
  game: Game;
  myTurn: boolean;
  rolling: boolean;
  canThrow: boolean;
  /** A short celebration to borrow the label slot while it lasts. */
  moment?: string | null;
  onThrow: () => void;
}) {
  const { t } = usePreferences();
  const live = currentThrow(game);
  const player = game.players[game.turn];
  const label = moment ?? (live?.bonus ? "Bonus" : "Score");
  const shells = (
    <span className="tray-shells">
      <Cowries
        count={shellCount(game.size)}
        shells={live?.shells ?? []}
        rolling={rolling}
      />
    </span>
  );

  if (canThrow)
    return (
      <button
        type="button"
        className="cowrie-tray is-ready"
        onClick={onThrow}
        aria-label={t("Throw cowries")}
      >
        {shells}
        <span className="tray-cta">{t("Throw cowries")}</span>
      </button>
    );

  return (
    <>
      <div
        className={`cowrie-tray ${rolling ? "is-tossing" : live ? "is-live" : "is-waiting"} ${myTurn ? "is-mine" : ""}`}
        aria-label={t("Cowrie tray")}
      >
        <span
          className="tray-dot"
          style={{ background: COLORS[player.color] }}
          aria-hidden="true"
        />
        <span
          className={`tray-owner ${myTurn ? "is-you" : ""}`}
          title={player.name}
        >
          {t(player.name)}
        </span>
        {shells}
        {(live || rolling || moment) && (
          <span className="tray-state" aria-hidden="true">
            {live ? (
              <>
                <strong>{live.score}</strong>
                <span className={moment ? "is-moment" : undefined}>
                  {t(label)}
                </span>
              </>
            ) : (
              <span className="tray-cta is-quiet">
                {t(rolling ? "Tossing…" : (moment ?? ""))}
              </span>
            )}
          </span>
        )}
      </div>
      {/* One stable sentence per live throw, outside the button. */}
      <span className="sr-only" role="status" aria-atomic="true">
        {live
          ? t(
              `${player.name} threw ${live.score}${live.bonus ? " · bonus throw" : ""}.`,
            )
          : ""}
      </span>
    </>
  );
}
