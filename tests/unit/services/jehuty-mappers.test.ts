/**
 * Gazette Jehuty — anti-fuite + titres personnalisés (fix 2026-07-20).
 * Cas réel : la gazette de Motion19 affichait « Diagnostic NETERU » ×7 —
 * des événements funnel `quick_intake_completed` d'AUTRES marques (avec
 * email de contact prospect dans le payload), estampillés avec l'id de
 * l'appelant faute de filtre.
 */

import { describe, it, expect } from "vitest";
import {
  diagnosticBelongsToFeed,
  mapDiagnosticToFeedItem,
  mapExternalArticleToFeedItem,
  mapSignalToFeedItem,
} from "@/server/services/jehuty/mappers";

describe("qualifications declared in the actual source", () => {
  const signal = { id: "signal-a", strategyId: "s1", type: "SCORE_DECLINE", createdAt: new Date() };
  it("keeps missing qualifications unknown instead of urgent, low impact and 50% confidence", () => {
    expect(mapSignalToFeedItem({ ...signal, data: {} }, undefined)).toMatchObject({ urgency: null, impact: null, confidence: null });
  });
  it("recognizes the declared weak-signal urgency and retains a real zero confidence", () => {
    expect(mapSignalToFeedItem({ ...signal, type: "WEAK_SIGNAL_ALERT", data: { urgency: "CRITICAL", confidence: 0 } }, undefined)).toMatchObject({ urgency: "NOW", impact: null, confidence: 0 });
  });
  it("uses a valid severity and refuses a malformed confidence", () => {
    expect(mapSignalToFeedItem({ ...signal, data: { severity: "HIGH", confidence: 75 } }, undefined)).toMatchObject({ urgency: "NOW", impact: "HIGH", confidence: null });
  });
});

describe("diagnosticBelongsToFeed — anti-fuite cross-tenant", () => {
  it("mode marque : un événement funnel SANS strategyId est exclu (le cas Motion19)", () => {
    const funnelEvent = {
      type: "quick_intake_completed",
      companyName: "La Paillote",
      contactEmail: "prospect@example.com",
    };
    expect(diagnosticBelongsToFeed(funnelEvent, "strat-motion19")).toBe(false);
  });

  it("mode marque : seuls les diagnostics DE la marque passent", () => {
    expect(diagnosticBelongsToFeed({ strategyId: "strat-a" }, "strat-a")).toBe(true);
    expect(diagnosticBelongsToFeed({ strategyId: "strat-b" }, "strat-a")).toBe(false);
  });

  it("mode agence : la télémétrie funnel reste exclue (surface Console dédiée)", () => {
    expect(diagnosticBelongsToFeed({ type: "quick_intake_completed" }, undefined)).toBe(false);
    expect(diagnosticBelongsToFeed({ strategyId: "strat-a" }, undefined)).toBe(true);
  });
});

describe("mapDiagnosticToFeedItem — titre personnalisé, zéro jargon", () => {
  const base = { id: "k1", pillarFocus: "e", createdAt: new Date("2026-07-20") };

  it("payload diagnostic-engine → titre qui dit CE qui a été trouvé", () => {
    const item = mapDiagnosticToFeedItem(
      { ...base, data: { strategyId: "s1", symptoms: 3, localization: ["d", "e"], frameworksUsed: ["SWOT"] } },
      undefined,
      "s1",
    );
    expect(item.title).toContain("3 point(s) de friction");
    expect(item.title).toContain("D, E");
    expect(item.summary).toContain("SWOT");
    // Jargon mythologique interne : JAMAIS rendu au client (ADR-0123).
    expect(item.title).not.toMatch(/NETERU/i);
    expect(item.source).not.toMatch(/NETERU|Artemis/i);
  });

  it("payload inconnu → fallback SANS jargon, jamais « Diagnostic NETERU »", () => {
    const item = mapDiagnosticToFeedItem({ ...base, data: {} }, undefined, "s1");
    expect(item.title).not.toMatch(/NETERU/i);
    expect(item.title.length).toBeGreaterThan(10);
  });
});

describe("mapExternalArticleToFeedItem — « Le monde dehors »", () => {
  it("article de veille → item EXTERNAL_SIGNAL avec lien externe et source", () => {
    const item = mapExternalArticleToFeedItem(
      { title: "Canon annonce un nouveau boîtier", link: "https://ex.com/a", source: "Les Numériques", publishedAt: "2026-07-18T00:00:00Z" },
      "s1",
      new Date("2026-07-20"),
      undefined,
    );
    expect(item.category).toBe("EXTERNAL_SIGNAL");
    expect(item.externalUrl).toBe("https://ex.com/a");
    expect(item.summary).toContain("Les Numériques");
    expect(item.createdAt).toContain("2026-07-18");
  });
});
