import { describe, it, expect } from "vitest";
import {
  deriveSpecFromChannel,
  computeGrantExpiry,
  isDiffusionAllowed,
  isUsageGrantActive,
  type ChannelSpecRow,
} from "@/server/services/production/specs";
import { buildChannelSpecRows } from "../../../prisma/seed-channel-specs";

/**
 * Production : fan-out specs + gate d'usage (ADR-0111) — PUR, zéro mock.
 * Le « maintenant » est toujours injecté (asOf) → tests reproductibles.
 */

const NOW = new Date("2026-06-28T00:00:00Z");

describe("production/specs — deriveSpecFromChannel", () => {
  it("mappe une ligne catalogue → spec de livrable", () => {
    const row: ChannelSpecRow = {
      key: "META_REELS_9x16", channel: "META", aspectRatio: "9:16", resolution: "1080x1920",
      durationSec: 30, codec: "H.264", frameRate: 30, loudnessTarget: "-16 LUFS",
      captionRequired: true, fileFormat: "MP4", maxFileMb: 4096,
    };
    const spec = deriveSpecFromChannel(row);
    expect(spec.channelSpecKey).toBe("META_REELS_9x16");
    expect(spec.aspectRatio).toBe("9:16");
    expect(spec.captionRequired).toBe(true);
  });
});

describe("production/specs — computeGrantExpiry", () => {
  it("termStart + termMonths", () => {
    expect(computeGrantExpiry(new Date("2026-01-15T00:00:00Z"), 12).toISOString()).toBe("2027-01-15T00:00:00.000Z");
    expect(computeGrantExpiry(new Date("2026-01-15T00:00:00Z"), 6).toISOString()).toBe("2026-07-15T00:00:00.000Z");
  });
});

describe("production/specs — gate d'usage (expiration)", () => {
  it("aucun droit → diffusion refusée (NO_GRANT)", () => {
    expect(isDiffusionAllowed([], NOW)).toEqual({ allowed: false, reason: "NO_GRANT" });
  });

  it("un droit ACTIVE non expiré → diffusion autorisée", () => {
    const g = { status: "ACTIVE", expiresAt: new Date("2026-12-31T00:00:00Z") };
    expect(isDiffusionAllowed([g], NOW).allowed).toBe(true);
    expect(isUsageGrantActive(g, NOW)).toBe(true);
  });

  it("droit expiré → diffusion refusée (ALL_EXPIRED_OR_REVOKED)", () => {
    const g = { status: "ACTIVE", expiresAt: new Date("2026-01-01T00:00:00Z") };
    expect(isDiffusionAllowed([g], NOW)).toEqual({ allowed: false, reason: "ALL_EXPIRED_OR_REVOKED" });
    expect(isUsageGrantActive(g, NOW)).toBe(false);
  });

  it("droit révoqué bien que futur → inactif", () => {
    const g = { status: "REVOKED", expiresAt: new Date("2027-01-01T00:00:00Z") };
    expect(isUsageGrantActive(g, NOW)).toBe(false);
    expect(isDiffusionAllowed([g], NOW).allowed).toBe(false);
  });

  it("au moins un droit vivant parmi des expirés → autorisé", () => {
    const grants = [
      { status: "ACTIVE", expiresAt: new Date("2026-01-01T00:00:00Z") },
      { status: "ACTIVE", expiresAt: new Date("2027-01-01T00:00:00Z") },
    ];
    expect(isDiffusionAllowed(grants, NOW).allowed).toBe(true);
  });
});

describe("production — buildChannelSpecRows (seed pur)", () => {
  it("clés uniques + canaux broadcast/social/OOH/print présents", () => {
    const rows = buildChannelSpecRows();
    const keys = rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    const channels = new Set(rows.map((r) => r.channel));
    expect(channels.has("TV")).toBe(true);
    expect(channels.has("META")).toBe(true);
    expect(channels.has("OOH")).toBe(true);
    expect(channels.has("PRINT")).toBe(true);
  });
});
