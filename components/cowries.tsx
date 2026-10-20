"use client";
import type { CSSProperties } from "react";
import { usePreferences } from "./preferences";
export function Cowries({
  count,
  shells,
  rolling,
}: {
  count: number;
  shells: boolean[];
  rolling: boolean;
}) {
  const { t } = usePreferences();
  return (
    <div
      className={`cowries ${rolling ? "throwing" : ""}`}
      aria-label={t(
        shells.length
          ? `${shells.filter(Boolean).length} shells face up`
          : `${count} cowrie shells`,
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`cowrie ${shells[i] === false ? "shell-down" : ""}`}
          style={
            {
              "--shell-i": i,
              "--angle": `${[-17, 12, -8, 19, -12, 8][i]}deg`,
            } as CSSProperties
          }
        >
          <i />
        </span>
      ))}
    </div>
  );
}
