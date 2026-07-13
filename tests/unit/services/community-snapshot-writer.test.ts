/**
 * community-snapshot-writer (ADR-0134 §B1) — formules pures de la mesure
 * communautaire. Aucune I/O : on teste `composeCommunitySnapshotRow`.
 *
 * Doctrine vérifiée : pas de base followers → pas de row (jamais fabriquée) ;
 * null = non mesuré (health sans posts, velocity sans référence, activeRate
 * hors couverture) ; 0 auteur sur plateforme SCANNÉE = mesure réelle ;
 * sentiment = null TOUJOURS v1 ; unités fractions 0-1 clampées.
 */

import { describe, expect, it } from "vitest";
import {
  composeCommunitySnapshotRow,
  INBOX_COVERED_PLATFORMS,
  type CommunityMeasureInput,
} from "@/server/services/cult-index-engine/community-snapshot-writer";

const base = (over: Partial<CommunityMeasureInput> = {}): CommunityMeasureInput => ({
  platform: "FACEBOOK",
  latestFollowers: { count: 4252, capturedAt: new Date("2026-07-12") },
  referenceFollowers: { count: 4000, capturedAt: new Date("2026-06-12") },
  postEngagementRates: [0.02, 0.04],
  inboxUniqueAuthors30d: 90,
  ...over,
});

describe("composeCommunitySnapshotRow — mesure honnête", () => {
  it("aucune base followers → null (pas de row fabriquée)", () => {
    expect(composeCommunitySnapshotRow(base({ latestFollowers: null }))).toBeNull();
    expect(
      composeCommunitySnapshotRow(
        base({ latestFollowers: { count: 0, capturedAt: new Date() } }),
      ),
    ).toBeNull();
  });

  it("mesure complète : size absolu, fractions 0-1, sentiment toujours null", () => {
    const row = composeCommunitySnapshotRow(base());
    expect(row).not.toBeNull();
    expect(row!.size).toBe(4252);
    expect(row!.velocity).toBeCloseTo((4252 - 4000) / 4000, 6);
    expect(row!.health).toBeCloseTo(0.03, 6);
    expect(row!.activeRate).toBeCloseTo(90 / 4252, 6);
    expect(row!.sentiment).toBeNull();
  });

  it("absence de mesure = null — jamais un 0 fabriqué", () => {
    const row = composeCommunitySnapshotRow(
      base({
        referenceFollowers: null,
        postEngagementRates: [],
        inboxUniqueAuthors30d: null, // plateforme hors couverture inbox v1
      }),
    );
    expect(row!.velocity).toBeNull();
    expect(row!.health).toBeNull();
    expect(row!.activeRate).toBeNull();
  });

  it("0 commentateur sur plateforme SCANNÉE = mesure réelle (0), pas un trou", () => {
    const row = composeCommunitySnapshotRow(base({ inboxUniqueAuthors30d: 0 }));
    expect(row!.activeRate).toBe(0);
  });

  it("clamps : velocity bornée, health/activeRate ≤ 1", () => {
    const crash = composeCommunitySnapshotRow(
      base({
        latestFollowers: { count: 10, capturedAt: new Date() },
        referenceFollowers: { count: 100_000, capturedAt: new Date("2026-06-12") },
        postEngagementRates: [2.5], // engagement > followers (partages viraux)
        inboxUniqueAuthors30d: 50, // plus d'auteurs que de followers
      }),
    );
    // (10 - 100 000) / 100 000 — l'effondrement le plus violent reste > -1
    // (le clamp -1 est un garde-fou, inatteignable avec size ≥ 1).
    expect(crash!.velocity).toBeCloseTo(-0.9999, 4);
    expect(crash!.velocity).toBeGreaterThanOrEqual(-1);
    expect(crash!.health).toBe(1);
    expect(crash!.activeRate).toBe(1);
  });

  it("couverture inbox v1 = FB + IG uniquement (ADR-0133)", () => {
    expect(INBOX_COVERED_PLATFORMS.has("FACEBOOK")).toBe(true);
    expect(INBOX_COVERED_PLATFORMS.has("INSTAGRAM")).toBe(true);
    expect(INBOX_COVERED_PLATFORMS.has("TIKTOK")).toBe(false);
    expect(INBOX_COVERED_PLATFORMS.has("YOUTUBE")).toBe(false);
  });
});
