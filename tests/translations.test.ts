import { test } from "node:test";
import assert from "node:assert/strict";
import { translate, kannada } from "../lib/translations.ts";
test("English remains unchanged; Kannada translates setup, game controls, rules and errors", () => {
  for (const key of [
    "Create a room",
    "Throw the cowries",
    "Show path",
    "The 5-house board has four safe houses at the outer midpoints. The center is the finish. Inner squares allow captures.",
    "Room not found or expired.",
  ]) {
    assert.equal(translate(key, "en"), key);
    assert.match(translate(key, "kn"), /[\u0C80-\u0CFF]/);
    assert.notEqual(translate(key, "kn"), key);
  }
});
test("Shared activity translates while preserving names and values", () => {
  assert.equal(
    translate("Meera moved pawn 2 by 3.", "kn"),
    "Meera 2ನೇ ಕಾಯಿಯನ್ನು 3 ಮನೆ ನಡೆಸಿದರು.",
  );
  assert.equal(
    translate("ಅರ್ಜುನ್ captured 2 pawns! Throw again.", "kn"),
    "ಅರ್ಜುನ್ 2 ಕಾಯಿ ಹೊಡೆದರು! ಮತ್ತೊಮ್ಮೆ ಕವಡೆ ಹಾಕಿ.",
  );
  assert.equal(
    translate("Karthik threw 4 · bonus throw.", "kn"),
    "Karthik 4 ಅಂಕ ಹಾಕಿದರು · ಹೆಚ್ಚುವರಿ ಅವಕಾಶ.",
  );
  assert.equal(translate("2/4 home", "kn"), "2/4 ಮನೆ ಸೇರಿವೆ");
  assert.match(
    translate("7 × 7 Grand · Capture to enter · Online table", "kn"),
    /^7 × 7 ಏಳು ಮನೆ/,
  );
  assert.equal(translate("Meera’s turn", "kn"), "Meera ಅವರ ಸರದಿ");
  assert.equal(translate("Move pawn 3", "kn"), "3ನೇ ಕಾಯಿ ನಡೆಸಿ");
});
test("Kannada preserves meaningful spacing and room codes", () => {
  assert.equal(translate(" Pawn ", "kn"), " ಕಾಯಿ ");
  assert.equal(translate("ABC234", "kn"), "ABC234");
  assert.equal(translate(" (you)", "kn"), " (ನೀವು)");
  assert.ok(Object.keys(kannada).length > 150);
});
test("Cowrie instructions retain board-specific shell counts", () => {
  const s = translate(
    "6 shells for this board. Each open mouth scores 1. All open scores 6; all closed scores 12. Both earn another throw after your move.",
    "kn",
  );
  assert.match(s, /6 ಕವಡೆಗಳು/);
  assert.match(s, /12 ಅಂಕ/);
});
