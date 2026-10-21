"use client";
import { usePreferences } from "./preferences";
import { Kolam, Petals } from "./heritage";
import type { MatchMoment } from "./use-match-moment";

export function momentCopy(kind: MatchMoment["kind"]) {
  return kind === "victory"
    ? { title: "All four home.", note: "The courtyard is yours." }
    : kind === "capture"
      ? { title: "A clean capture.", note: "Another throw is yours." }
      : { title: "Welcome home.", note: "Another throw is yours." };
}

/** A two-word version for the compact phone tray. */
export function momentLabel(kind: MatchMoment["kind"]) {
  return kind === "victory" ? "Won!" : kind === "capture" ? "Capture!" : "Home!";
}

/** The celebration card that floats over the table on a wide screen. */
export function MatchMomentCard({ moment }: { moment: MatchMoment | null }) {
  const { t } = usePreferences();
  if (!moment) return null;
  const copy = momentCopy(moment.kind);
  return (
    <div className={`match-moment moment-${moment.kind}`} role="status">
      <Petals />
      <Kolam />
      <small>{moment.name}</small>
      <strong>{t(copy.title)}</strong>
      <span>{t(copy.note)}</span>
    </div>
  );
}
