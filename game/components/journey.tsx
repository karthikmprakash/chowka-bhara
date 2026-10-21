"use client";
import { useEffect, useRef, useState } from "react";
import {
  BADGES,
  awardJourney,
  freshJourney,
  readJourney,
  journeyPoints,
  journeyRank,
  type BadgeId,
  type Journey,
} from "@/lib/journey";
import type { Game } from "@/lib/game";
import { usePreferences } from "./preferences";
import { Kolam } from "./heritage";
import { Award, LockKeyhole, Check, ChevronRight } from "lucide-react";
const KEY = "chowka-bara:journey:v1";
export function useJourney(game: Game | null, playerId: string | null) {
  const [journey, setJourney] = useState<Journey>(freshJourney),
    [ready, setReady] = useState(false),
    [earned, setEarned] = useState<BadgeId[]>([]);
  const current = useRef(journey);
  useEffect(() => {
    try {
      current.current = readJourney(localStorage.getItem(KEY));
      setJourney(current.current);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !game || !playerId) return;
    const next = awardJourney(current.current, game, playerId);
    current.current = next.journey;
    setJourney(next.journey);
    try {
      localStorage.setItem(KEY, JSON.stringify(next.journey));
    } catch {}
    if (next.earned.length) setEarned(next.earned);
  }, [game, playerId, ready]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      current.current = readJourney(e.newValue);
      setJourney(current.current);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (!earned.length) return;
    const timer = setTimeout(() => setEarned([]), 3200);
    return () => clearTimeout(timer);
  }, [earned]);
  return { journey, earned };
}
export function JourneySummary({
  journey,
  onOpen,
}: {
  journey: Journey;
  onOpen: () => void;
}) {
  const { t } = usePreferences();
  return (
    <button className="journey-summary" onClick={onOpen}>
      <span className="journey-emblem">
        <Kolam />
      </span>
      <span>
        <small>{t("Your courtyard journey")}</small>
        <strong>{t(journeyRank(journey))}</strong>
      </span>
      <span className="journey-points">
        <b>{journeyPoints(journey)}</b> {t("points")}
        <span>
          {journey.badges.length} / {BADGES.length} {t("badges")}
        </span>
      </span>
      <ChevronRight size={20} />
    </button>
  );
}
export function JourneyPanel({ journey }: { journey: Journey }) {
  const { t } = usePreferences();
  return (
    <div className="journey-panel">
      <div className="journey-rank">
        <Kolam />
        <div>
          <small>{t("Your courtyard journey")}</small>
          <h3>{t(journeyRank(journey))}</h3>
          <p>
            {journeyPoints(journey)} {t("points")} · {journey.games}{" "}
            {t("games finished")} · {journey.wins} {t("wins")}
          </p>
        </div>
      </div>
      <p className="journey-device">
        {t("Earned through play. Saved on this device.")}
      </p>
      <div className="badge-collection">
        {BADGES.map((b) => {
          const unlocked = journey.badges.includes(b.id);
          return (
            <div
              key={b.id}
              className={`journey-badge ${unlocked ? "is-earned" : ""}`}
            >
              <span>{unlocked ? <Award /> : <LockKeyhole />}</span>
              <div>
                <strong>{t(b.name)}</strong>
                <p>{t(b.description)}</p>
                <small>
                  {b.points} {t("points")}
                  {unlocked && (
                    <>
                      {" "}
                      · <Check size={13} /> {t("Earned")}
                    </>
                  )}
                </small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export function BadgeToast({ earned }: { earned: BadgeId[] }) {
  const { t } = usePreferences();
  if (!earned.length) return null;
  const badge = BADGES.find((b) => b.id === earned[0])!;
  const points = BADGES.filter((b) => earned.includes(b.id)).reduce(
    (sum, b) => sum + b.points,
    0,
  );
  return (
    <div className="badge-toast" role="status">
      <Award size={26} />
      <span>
        <small>
          {earned.length > 1
            ? `${earned.length} ${t("badges earned")}`
            : t("New badge earned")}
        </small>
        <strong>
          {t(earned.length > 1 ? "A winning collection" : badge.name)}
        </strong>
      </span>
      <b>+{points}</b>
    </div>
  );
}
