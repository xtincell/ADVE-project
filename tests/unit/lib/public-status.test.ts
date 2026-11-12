/**
 * /status — verdict public calculé seulement sur une mesure réelle (F16).
 *
 * Avant : une lecture de base échouée devenait zéro, et zéro opération donnait
 * 100 % de réussite, donc « Opérationnel » — même base injoignable.
 */
import { describe, expect, it } from "vitest";
import { derivePublicStatus } from "@/lib/public-status";

describe("derivePublicStatus", () => {
  it("base injoignable : aucun verdict, aucun taux", () => {
    expect(derivePublicStatus({ ok: null, failed: null })).toEqual({
      verdict: "UNKNOWN",
      reason: "UNREACHABLE",
      successRate: null,
    });
  });

  it("une seule lecture manquante suffit à refuser le verdict", () => {
    expect(derivePublicStatus({ ok: 120, failed: null }).verdict).toBe("UNKNOWN");
  });

  it("aucune opération sur 24 h : rien à juger, pas « Opérationnel »", () => {
    expect(derivePublicStatus({ ok: 0, failed: 0 })).toEqual({
      verdict: "UNKNOWN",
      reason: "NO_ACTIVITY",
      successRate: null,
    });
  });

  it("taux calculé sur les opérations réellement journalisées", () => {
    expect(derivePublicStatus({ ok: 99, failed: 1 })).toEqual({
      verdict: "OPERATIONAL",
      reason: "MEASURED",
      successRate: 99,
    });
    expect(derivePublicStatus({ ok: 96, failed: 4 }).verdict).toBe("DEGRADED");
    expect(derivePublicStatus({ ok: 90, failed: 10 }).verdict).toBe("INCIDENT");
  });
});
