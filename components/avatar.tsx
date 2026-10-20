"use client";
import type { CSSProperties } from "react";
import { usePreferences } from "./preferences";
import type { Player } from "@/lib/game";
export function portraitOf(p: Pick<Player, "avatar" | "name" | "color">) {
  if (Number.isInteger(p.avatar) && p.avatar! >= 0 && p.avatar! < 8)
    return p.avatar!;
  if (p.name === "Meera") return 0;
  return (
    (p.color * 3 + [...p.name].reduce((n, c) => n + c.codePointAt(0)!, 0)) % 8
  );
}
export function Avatar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`portrait ${className}`}
      style={
        {
          backgroundPosition: `${((value % 4) * 100) / 3}% ${Math.floor(value / 4) * 100}%`,
        } as CSSProperties
      }
    />
  );
}
export function AvatarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const { t } = usePreferences();
  return (
    <fieldset className="avatar-picker">
      <legend>{t("Your face at the table")}</legend>
      <div>
        {Array.from({ length: 8 }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={t(`Portrait ${i + 1}`)}
            aria-pressed={i === value}
            onClick={() => onChange(i)}
          >
            <Avatar value={i} />
            {i === value && (
              <span className="portrait-check" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
      <small>{t("Choose someone who feels like you.")}</small>
    </fieldset>
  );
}
