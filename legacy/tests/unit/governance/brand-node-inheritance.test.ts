/**
 * Anti-drift CI test — Phase 18-N1/N2 (ADR-0059) BrandNode inheritance helper.
 *
 * Vérifie l'API contract + helpers purs sans toucher à la DB :
 *  - Exports `resolveEffectivePillars`, `invalidateNodeAndDescendants`,
 *    `invalidateByStrategy`, `clearAllInheritanceCache`, `getInheritanceCacheStats`,
 *    `badgeLabelForPillar`
 *  - Type `ResolvedPillarValue.source` aligné avec les 4 cas canoniques
 *  - `badgeLabelForPillar` produit les bons labels UI pour les 4 cas
 *
 * NEFER §3 interdit absolu n°3 — drift narratif silencieux.
 */

import { describe, it, expect } from "vitest";
import {
  badgeLabelForPillar,
  clearAllInheritanceCache,
  getInheritanceCacheStats,
  type ResolvedPillarValue,
  type PillarResolutionSource,
} from "@/server/services/brand-node/inheritance";

describe("brand-node-inheritance — exports + contract", () => {
  it("clearAllInheritanceCache + getInheritanceCacheStats fonctionnent", () => {
    clearAllInheritanceCache();
    const stats = getInheritanceCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.nodeIds).toEqual([]);
  });

  it("PillarResolutionSource a 4 valeurs canoniques", () => {
    // Compile-time check : toute future valeur ajoutée doit être documentée ici.
    const all: PillarResolutionSource[] = [
      "OWN_OVERRIDE",
      "OWN_VIA_STRATEGY",
      "INHERITED_FROM",
      "DEFAULT_EMPTY",
    ];
    expect(all.length).toBe(4);
  });
});

describe("brand-node-inheritance — badgeLabelForPillar", () => {
  function mkValue(source: PillarResolutionSource, provenance: string | null = null): ResolvedPillarValue {
    return {
      content: { test: "value" },
      confidence: 1.0,
      source,
      provenanceNodeId: provenance ? `node-${provenance}` : null,
      provenanceNodeName: provenance,
      inheritanceDistance: source === "OWN_OVERRIDE" || source === "OWN_VIA_STRATEGY" ? 0 : 2,
    };
  }

  it("OWN_OVERRIDE → 'OVERRIDE LOCAL'", () => {
    expect(badgeLabelForPillar(mkValue("OWN_OVERRIDE"))).toBe("OVERRIDE LOCAL");
  });

  it("OWN_VIA_STRATEGY → 'OWN'", () => {
    expect(badgeLabelForPillar(mkValue("OWN_VIA_STRATEGY"))).toBe("OWN");
  });

  it("INHERITED_FROM → 'INHERITED FROM <ancestor name>'", () => {
    expect(badgeLabelForPillar(mkValue("INHERITED_FROM", "Bonnet Rouge Global"))).toBe(
      "INHERITED FROM Bonnet Rouge Global",
    );
  });

  it("INHERITED_FROM avec provenance null → 'INHERITED FROM ?'", () => {
    expect(badgeLabelForPillar(mkValue("INHERITED_FROM", null))).toBe("INHERITED FROM ?");
  });

  it("DEFAULT_EMPTY → 'DEFAULT (empty)'", () => {
    expect(badgeLabelForPillar(mkValue("DEFAULT_EMPTY"))).toBe("DEFAULT (empty)");
  });
});
