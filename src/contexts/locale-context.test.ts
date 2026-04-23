import { describe, it, expect } from "vitest";
import { rewriteLocaleInPath } from "./locale-context";

describe("rewriteLocaleInPath", () => {
  it("returns null for non-localized routes (dashboard/auth/judge)", () => {
    expect(rewriteLocaleInPath("/dashboard", "en")).toBeNull();
    expect(rewriteLocaleInPath("/dashboard/competitions/abc", "en")).toBeNull();
    expect(rewriteLocaleInPath("/login", "en")).toBeNull();
    expect(rewriteLocaleInPath("/judge/tok", "en")).toBeNull();
  });

  it("landing: / → /en, /en → /", () => {
    expect(rewriteLocaleInPath("/", "en")).toBe("/en");
    expect(rewriteLocaleInPath("/en", "cs")).toBe("/");
    expect(rewriteLocaleInPath("/", "cs")).toBe("/");
    expect(rewriteLocaleInPath("/en", "en")).toBe("/en");
  });

  it("competitions: adds /en prefix for English, strips for Czech", () => {
    expect(rewriteLocaleInPath("/competitions/abc", "en")).toBe("/en/competitions/abc");
    expect(rewriteLocaleInPath("/en/competitions/abc", "cs")).toBe("/competitions/abc");
    expect(rewriteLocaleInPath("/competitions", "en")).toBe("/en/competitions");
    expect(rewriteLocaleInPath("/en/competitions/abc/register", "cs")).toBe(
      "/competitions/abc/register",
    );
  });

  it("scoreboard + privacy paths", () => {
    expect(rewriteLocaleInPath("/scoreboard/xyz", "en")).toBe("/en/scoreboard/xyz");
    expect(rewriteLocaleInPath("/privacy", "en")).toBe("/en/privacy");
    expect(rewriteLocaleInPath("/en/privacy", "cs")).toBe("/privacy");
  });

  it("does not false-match paths that merely start with 'en'", () => {
    // /engagement would start with /en — must not be stripped
    expect(rewriteLocaleInPath("/engagement", "cs")).toBeNull();
    // /comps (not a localized prefix) stays untouched
    expect(rewriteLocaleInPath("/comps", "en")).toBeNull();
  });
});
