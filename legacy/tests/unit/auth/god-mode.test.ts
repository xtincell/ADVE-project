/**
 * God-mode founder allowlist — these emails are always elevated to ADMIN
 * (NextAuth JWT callback) and bypass tier gates. Lock the matching behaviour.
 */
import { describe, it, expect } from "vitest";
import { isGodModeEmail, GOD_MODE_EMAILS } from "@/lib/auth/god-mode";

describe("god-mode allowlist", () => {
  it("matches the founder emails (case-insensitive)", () => {
    expect(isGodModeEmail("alexandre@upgraders.com")).toBe(true);
    expect(isGodModeEmail("ALEXANDRE@UPGRADERS.COM")).toBe(true);
    expect(isGodModeEmail("x-tincell@hotmail.fr")).toBe(true);
  });

  it("rejects non-founder emails and empty input", () => {
    expect(isGodModeEmail("random@example.com")).toBe(false);
    expect(isGodModeEmail(null)).toBe(false);
    expect(isGodModeEmail(undefined)).toBe(false);
    expect(isGodModeEmail("")).toBe(false);
  });

  it("exposes a non-empty allowlist", () => {
    expect(GOD_MODE_EMAILS.length).toBeGreaterThan(0);
  });
});
