import { describe, it, expect } from "vitest";
import { evaluateHypothesis, type EvidenceLike } from "@/server/services/consulting/evidence";
import { buildFrameworkRows } from "../../../prisma/seed-framework-references";

/** Chaîne de preuve déterministe (ADR-0113) — PUR, zéro mock. */

describe("consulting/evidence — evaluateHypothesis", () => {
  it("poids net ≥ seuil → SUPPORTED", () => {
    const ev: EvidenceLike[] = [
      { stance: "SUPPORTS", weight: 0.8 },
      { stance: "SUPPORTS", weight: 0.5 },
      { stance: "REFUTES", weight: 0.3 },
    ];
    const v = evaluateHypothesis(ev);
    expect(v.netSupport).toBe(1.0);
    expect(v.status).toBe("SUPPORTED");
  });

  it("poids net ≤ -seuil → REFUTED", () => {
    const v = evaluateHypothesis([
      { stance: "REFUTES", weight: 0.9 },
      { stance: "SUPPORTS", weight: 0.2 },
    ]);
    expect(v.status).toBe("REFUTED");
    expect(v.netSupport).toBe(-0.7);
  });

  it("équilibre sous seuil → OPEN", () => {
    const v = evaluateHypothesis([
      { stance: "SUPPORTS", weight: 0.4 },
      { stance: "REFUTES", weight: 0.3 },
    ]);
    expect(v.status).toBe("OPEN");
  });

  it("aucune évidence → OPEN, net 0", () => {
    const v = evaluateHypothesis([]);
    expect(v).toMatchObject({ status: "OPEN", netSupport: 0, supportWeight: 0, refuteWeight: 0 });
  });

  it("poids hors [0,1] borné, stance inconnue ignorée", () => {
    const v = evaluateHypothesis([
      { stance: "SUPPORTS", weight: 5 }, // borné à 1
      { stance: "MEH", weight: 0.9 }, // ignoré
    ]);
    expect(v.supportWeight).toBe(1);
    expect(v.status).toBe("SUPPORTED");
  });
});

describe("consulting — buildFrameworkRows (seed pur)", () => {
  it("clés uniques, familles valides, RICE/Overton présents", () => {
    const rows = buildFrameworkRows();
    const keys = rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("RICE");
    expect(keys).toContain("OVERTON_WINDOW");
    expect(keys).toContain("MCKINSEY_7S");
  });
});
