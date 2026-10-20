"use client";
import { usePreferences } from "./preferences";
export function ExperiencePicker() {
  const { t, advanced, setAdvanced } = usePreferences();
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
