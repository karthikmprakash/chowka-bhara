"use client";
import { usePreferences } from "./preferences";
export function ExperiencePicker({ compact = false }: { compact?: boolean }) {
  const { t, advanced, setAdvanced } = usePreferences();
  if (compact)
    return (
      <label className="experience-compact">
        <span className="sr-only">{t("Play assistance")}</span>
        <select
          value={advanced ? "advanced" : "beginner"}
          onChange={(e) => setAdvanced(e.target.value === "advanced")}
        >
          <option value="beginner">{t("Beginner")}</option>
          <option value="advanced">{t("Advanced")}</option>
        </select>
      </label>
    );
  return (
    <fieldset className="experience-picker">
      <legend>{t("Play assistance")}</legend>
      <div>
        {[false, true].map((v) => (
          <button
            type="button"
            key={String(v)}
            aria-pressed={advanced === v}
            onClick={() => setAdvanced(v)}
          >
            <strong>{t(v ? "Advanced" : "Beginner")}</strong>
            <small>
              {t(
                v
                  ? "Your judgement. No move hints."
                  : "Learn with move hints and previews.",
              )}
            </small>
          </button>
        ))}
      </div>
      <p>{t("Same traditional rules. Your choice of guidance.")}</p>
    </fieldset>
  );
}
