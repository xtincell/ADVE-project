/**
 * Anti-drift — devotion ladder sur audience RÉELLE (ADR-0134 §B3).
 *
 * Invariants :
 *   1. le helper pur `applyMeasuredAudienceBase` dilue honnêtement (followers
 *      = spectateurs, commentateurs = plancher participants) sans JAMAIS
 *      gonfler les rungs hauts (anti-inflation ADR-0126) ;
 *   2. sans base mesurée, les comptes sont STRICTEMENT inchangés (garde
 *      plancher — parité legacy) ;
 *   3. annotation Loi 1 : `DEVOTION_AUDIENCE_BASE_DATE` exportée + trend
 *      annoté `preAudienceBase` ;
 *   4. le bug d'unités T16 est purgé (plus de lecture CommunitySnapshot
 *      dans le moteur devotion — remplacée par la base followers/inbox) ;
 *   5. `reconcileAmbassadors` est aligné pourcentages (plus de fallback
 *      fraction ni de clamp Math.min(1, …)).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyMeasuredAudienceBase,
  DEVOTION_AUDIENCE_BASE_DATE,
} from "@/server/services/devotion-engine";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");

const counts = {
  spectateur: 0,
  interesse: 0,
  participant: 2,
  engage: 1,
  ambassadeur: 1,
  evangeliste: 1,
};

describe("ADR-0134 §B3 — devotion sur audience réelle", () => {
  it("dilution honnête : 45 000 followers / 90 commentateurs / 5 superfans", () => {
    const out = applyMeasuredAudienceBase(counts, {
      totalFollowers: 45_000,
      inboxParticipants30d: 90,
    });
    expect(out.participant).toBe(90); // plancher = commentateurs réels
    expect(out.engage).toBe(1); // rungs hauts INTOUCHÉS (anti-inflation)
    expect(out.ambassadeur).toBe(1);
    expect(out.evangeliste).toBe(1);
    // spectateurs = followers − rungs supérieurs (93) = 44 907
    expect(out.spectateur).toBe(45_000 - (0 + 90 + 1 + 1 + 1));
    // La pyramide reflète la masse réelle : ~99,8 % de spectateurs.
    const total = Object.values(out).reduce((s, v) => s + v, 0);
    expect(out.spectateur / total).toBeGreaterThan(0.99);
  });

  it("jamais négatif : plus de superfans classés que de followers", () => {
    const out = applyMeasuredAudienceBase(
      { ...counts, participant: 50, engage: 30 },
      { totalFollowers: 20, inboxParticipants30d: 3 },
    );
    expect(out.spectateur).toBe(0);
    expect(out.participant).toBe(50); // max(classés, commentateurs)
  });

  it("les classements existants ne régressent pas (max, jamais overwrite)", () => {
    const out = applyMeasuredAudienceBase(
      { ...counts, participant: 200, spectateur: 99_000 },
      { totalFollowers: 45_000, inboxParticipants30d: 90 },
    );
    expect(out.participant).toBe(200);
    expect(out.spectateur).toBe(99_000);
  });

  it("annotation Loi 1 : date exportée + trend annoté preAudienceBase", () => {
    expect(DEVOTION_AUDIENCE_BASE_DATE.toISOString()).toBe("2026-07-13T00:00:00.000Z");
    const src = read("src/server/services/devotion-engine/index.ts");
    expect(src).toContain("preAudienceBase: s.measuredAt < DEVOTION_AUDIENCE_BASE_DATE");
  });

  it("garde plancher : sans base mesurée, le moteur reste legacy strict", () => {
    const src = read("src/server/services/devotion-engine/index.ts");
    expect(src).toContain("if (followerRows.length === 0) return null;");
    expect(src).toMatch(/audienceBase\s*\?\s*applyMeasuredAudienceBase\(tierCounts, audienceBase\)\s*:\s*tierCounts/);
    // Arrondi entier historique préservé en mode legacy.
    expect(src).toContain("audienceBase ? Math.round(n * 100) / 100 : Math.round(n)");
  });

  it("T16 purgé : plus aucune lecture CommunitySnapshot dans le moteur devotion", () => {
    const src = read("src/server/services/devotion-engine/index.ts");
    expect(src.includes("communitySnapshot")).toBe(false);
    expect(src.includes("activeRate")).toBe(false);
  });

  it("reconcileAmbassadors aligné pourcentages (résidu ADR-0126)", () => {
    const cult = read("src/server/services/cult-index-engine/index.ts");
    const fn = cult.slice(
      cult.indexOf("export async function reconcileAmbassadors"),
      cult.indexOf("export async function getCultDashboardData"),
    );
    expect(fn.includes("Math.min(1,")).toBe(false);
    expect(fn).toContain("Math.min(100,");
    expect(fn).toContain("?? 50");
    expect(fn.includes("?? 0.5")).toBe(false);
  });
});
