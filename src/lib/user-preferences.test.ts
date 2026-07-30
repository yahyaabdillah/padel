import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUserPreferences } from "./user-preferences";

test("user preferences accept supported theme and palette", () => {
  assert.deepEqual(
    normalizeUserPreferences({ theme: "dark", paletteId: "ocean" }, ["padelhub", "ocean"]),
    { theme: "dark", paletteId: "ocean" },
  );
});

test("user preferences fall back when database values are invalid", () => {
  assert.deepEqual(
    normalizeUserPreferences({ theme: "sepia", paletteId: "missing" }, ["padelhub", "ocean"]),
    { theme: "light", paletteId: "padelhub" },
  );
});
