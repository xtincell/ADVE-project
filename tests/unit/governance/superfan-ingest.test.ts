/**
 * Anti-drift — superfans depuis les interactions réelles (ADR-0134 §B4).
 *
 * Invariants :
 *   1. CAP DUR 0.60 : la preuve « commentaires seuls » ne franchit JAMAIS le
 *      seuil superfan actif (0.65) — anti-inflation du plafond d'évidence ;
 *   2. formule déterministe documentée (base PARTICIPANT + volume + étalement
 *      + récence) ;
 *   3. le chemin cron n'actualise QUE les profils existants (aucune création
 *      auto — grep structurel) et ré-émet via le spine ;
 *   4. la voie tRPC délègue au single-writer (plus d'upsert dans le router) ;
 *   5. seuils candidats conservateurs + mapping depth→rung monotone.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeInboxEngagementDepth,
  tierFromEngagementDepth,
  INBOX_DEPTH_HARD_CAP,
  CANDIDATE_MIN_INTERACTIONS,
  CANDIDATE_MIN_ACTIVE_DAYS,
} from "@/server/services/seshat/superfan-ingest";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");

const NOW = new Date("2026-07-13T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe("ADR-0134 §B4 — superfans depuis l'inbox réelle", () => {
  it("CAP DUR : le meilleur commentateur du monde reste sous le seuil actif", () => {
    const depth = computeInboxEngagementDepth(
      { interactions: 500, activeDays: 90, lastActiveAt: daysAgo(0) },
      NOW,
    );
    expect(depth).toBe(INBOX_DEPTH_HARD_CAP);
    expect(depth).toBeLessThan(0.65); // seuil superfan actif — jamais atteignable
    expect(tierFromEngagementDepth(depth)).toBe("ENGAGE"); // pas AMBASSADEUR+
  });

  it("formule : base 0.25 + volume + étalement + récence", () => {
    // 1 commentaire il y a 30 j : 0.25 + 0.02 = 0.27
    expect(
      computeInboxEngagementDepth({ interactions: 1, activeDays: 1, lastActiveAt: daysAgo(30) }, NOW),
    ).toBe(0.27);
    // 5 commentaires, 3 jours actifs, récent : 0.25 + 0.10 + 0.10 + 0.05 = 0.50
    expect(
      computeInboxEngagementDepth({ interactions: 5, activeDays: 3, lastActiveAt: daysAgo(2) }, NOW),
    ).toBe(0.5);
  });

  it("mapping depth→rung : mêmes bornes que le moteur de dévotion", () => {
    expect(tierFromEngagementDepth(0.05)).toBe("SPECTATEUR");
    expect(tierFromEngagementDepth(0.1)).toBe("INTERESSE");
    expect(tierFromEngagementDepth(0.25)).toBe("PARTICIPANT");
    expect(tierFromEngagementDepth(0.45)).toBe("ENGAGE");
    expect(tierFromEngagementDepth(0.65)).toBe("AMBASSADEUR");
    expect(tierFromEngagementDepth(0.85)).toBe("EVANGELISTE");
  });

  it("seuils candidats conservateurs (≥3 interactions, ≥2 jours actifs)", () => {
    expect(CANDIDATE_MIN_INTERACTIONS).toBeGreaterThanOrEqual(3);
    expect(CANDIDATE_MIN_ACTIVE_DAYS).toBeGreaterThanOrEqual(2);
  });

  it("le chemin cron n'a AUCUNE création — actualisation des profils nés only", () => {
    const src = read("src/server/services/seshat/superfan-ingest.ts");
    const updateFn = src.slice(
      src.indexOf("export async function updateKnownSuperfansFromInbox"),
      src.indexOf("export interface SuperfanCandidate"),
    );
    // Le chemin cron passe par le spine, jamais par un write direct.
    expect(updateFn).toContain("emitIntentTyped");
    expect(updateFn).toContain('caller: "cron:social-sync:superfans"');
    expect(updateFn.includes("upsert")).toBe(false);
    expect(updateFn.includes(".create(")).toBe(false);
    // Sémantique jamais-dégrader.
    expect(updateFn).toContain("Math.max(profile.engagementDepth, measuredDepth)");
  });

  it("la voie tRPC délègue au single-writer (plus d'upsert dans le router)", () => {
    const router = read("src/server/trpc/routers/superfan.ts");
    expect(router.includes("superfanProfile.upsert")).toBe(false);
    expect(router).toContain("registerSuperfanProfile(ctx.db");
    expect(router).toContain('"SOCIAL"');
  });

  it("le cron branche l'actualisation AVANT la chaîne community→devotion→cult", () => {
    const cron = read("src/app/api/cron/social-sync/route.ts");
    const superfansIdx = cron.indexOf("updateKnownSuperfansFromInbox");
    const communityIdx = cron.indexOf('kind: "SESHAT_CAPTURE_COMMUNITY_SNAPSHOT"');
    expect(superfansIdx).toBeGreaterThan(-1);
    expect(communityIdx).toBeGreaterThan(superfansIdx);
  });
});
