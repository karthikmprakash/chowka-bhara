"use client";
import { Cowries } from "./cowries";
import { usePreferences } from "./preferences";
export function ThrowButton({
  disabled,
  rolling,
  label,
  onClick,
  className = "",
}: {
  disabled: boolean;
  rolling: boolean;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  const { t } = usePreferences();
  return (
    <button
      className={`primary-button throw-button ${className}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={t(label)}
      aria-busy={rolling}
    >
      <span className="throw-shells" aria-hidden="true">
        <Cowries count={3} shells={[]} rolling={rolling} />
      </span>
      <span className="throw-copy">
        <strong>{t(label)}</strong>
        <small aria-hidden="true">
          {t(
            rolling ? "A little luck in the air" : "A handful of possibilities",
          )}
        </small>
      </span>
    </button>
  );
}
