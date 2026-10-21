import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
vi.mock("@/lib/db", () => ({ db: { scoreVerdict: { findMany: async () => state.rows } } }));
vi.mock("@/server/services/seshat/scoreur", () => ({ listLatestPublicVerdicts: async () => state.rows }));
vi.mock("@/server/services/seshat/scoreur/canon", () => ({ getPublicScoreurReferences: async () => [
  { id: "coca-cola", label: "Coca-Cola", scale: "MONDE", theta: 2150 },
] }));
vi.mock("@/server/services/seshat/argos", () => ({ listPublicDossiers: async () => [] }));
vi.mock("@/lib/i18n/server", () => ({ getServerLocale: async () => "fr" }));
vi.mock("@/components/public/newsletter-capture", () => ({ NewsletterCapture: () => null }));
import LeaderboardPage from "@/app/leaderboard/page";
beforeEach(() => { state.rows = []; vi.stubGlobal("React", React); });
afterEach(() => vi.unstubAllGlobals());
it("shows proposed calibration references without presenting them as measured contenders", async () => {
  const html = renderToStaticMarkup(await LeaderboardPage());
  expect(html).toContain("Coca-Cola");
  expect(html).toContain("Repères de calibration proposés");
  expect(html).toContain("ne sont pas des résultats mesurés");
  expect(html).not.toContain('class="lb__row-details"');
});
it("renders the canonical arena denominator and keeps references outside the measured rows", async () => {
  state.rows = [{ id: "owned", subjectStrategyId: "owned", subjectBrandRefId: null, subjectLabel: "Marque observée",
    force: 37, tier: "LATENT", coveragePct: 20, coherence: 0, cappedReason: null, sectorSlug: "food", marketScale: "VILLE",
    countryCode: "CI", computedAt: new Date("2026-10-21"), epreuveCount: 1, gates: [],
    arenas: [{ arena: "A", theta: 1342, force: 37, rd: 348, epreuveCount: 1, wins: 1, losses: 0 }] }];
  const html = renderToStaticMarkup(await LeaderboardPage());
  expect(html).toContain("37/40"); expect(html).not.toContain("37/25");
  expect(html).toContain("1342 ±348");
  expect(html).not.toContain("37/40 ±348");
  expect(html.match(/class="lb__row-details"/g)).toHaveLength(1);
  expect(html).toContain("Coca-Cola");
});
it("does not present a default theta as an observed arena or invent a missing legacy uncertainty", async () => {
  state.rows = [{ id: "owned", subjectStrategyId: "owned", subjectLabel: "Marque observée", force: 0, tier: "LATENT",
    coveragePct: 0, coherence: 1, cappedReason: null, sectorSlug: "food", marketScale: "VILLE", countryCode: "CI",
    computedAt: new Date("2026-10-21"), epreuveCount: 1, gates: [], arenas: [
      { arena: "A", theta: 1325, force: 0, rd: 350, epreuveCount: 0, wins: 0, losses: 0 },
      { arena: "D", theta: 1342, force: 21, epreuveCount: 1, wins: 1, losses: 0 },
    ] }];
  const html = renderToStaticMarkup(await LeaderboardPage());
  expect(html).toContain("Aucune épreuve observée");
  expect(html).toContain("Estimation ou incertitude indisponible");
  expect(html).not.toContain("1325 ±350"); expect(html).not.toContain("1342 ±0");
});
