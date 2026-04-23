import { describe, it, expect } from "vitest";
import cs from "./cs.json";
import en from "./en.json";

// REGRESSION: Namespace trap — admin keys placed under dancer.* (or vice versa)
// show as raw keys in the UI. This test catches every missing-in-other-locale key
// across the whole tree so IDE/grep failures aren't the only line of defense.

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

function collectLeafPaths(obj: JsonValue, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return [prefix];
  }
  return Object.entries(obj).flatMap(([k, v]) =>
    collectLeafPaths(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("i18n parity: cs.json vs en.json", () => {
  const csKeys = new Set(collectLeafPaths(cs as JsonValue));
  const enKeys = new Set(collectLeafPaths(en as JsonValue));

  it("collects a non-trivial number of keys (sanity)", () => {
    // Guards against collectLeafPaths regressions that would make the parity
    // assertions trivially pass.
    expect(csKeys.size).toBeGreaterThan(100);
    expect(enKeys.size).toBeGreaterThan(100);
  });

  it("every cs key exists in en", () => {
    const missing = [...csKeys].filter((k) => !enKeys.has(k));
    expect(missing, `Missing in en.json: ${missing.slice(0, 20).join(", ")}`).toEqual([]);
  });

  it("every en key exists in cs", () => {
    const missing = [...enKeys].filter((k) => !csKeys.has(k));
    expect(missing, `Missing in cs.json: ${missing.slice(0, 20).join(", ")}`).toEqual([]);
  });
});
