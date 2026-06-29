import { describe, it, expect, vi } from "vitest";
import {
  canTransition,
  getTransition,
  getAvailableTransitions,
  requiresApproval,
  getGateChecks,
  validateGates,
  type CampaignState,
} from "@/server/services/campaign-manager/state-machine";

// Mock db before importing index (which imports db at top level)
vi.mock("@/lib/db", () => ({
  db: {},
}));

import {
  recommendActions,
  deriveExplodedActionIds,
  deriveActionBriefs,
  computeMissionActivityHealth,
} from "@/server/services/campaign-manager/index";

// ============================================================
// Machine d'Etat de Campagne
// ============================================================
describe("Campaign Manager — Machine d'Etat", () => {
  describe("Transitions valides", () => {
    const validTransitions: [CampaignState, CampaignState][] = [
      ["BRIEF_DRAFT", "BRIEF_VALIDATED"],
      ["BRIEF_VALIDATED", "PLANNING"],
      ["PLANNING", "CREATIVE_DEV"],
      ["CREATIVE_DEV", "PRODUCTION"],
      ["PRODUCTION", "PRE_PRODUCTION"],
      ["PRE_PRODUCTION", "APPROVAL"],
      ["APPROVAL", "READY_TO_LAUNCH"],
      ["READY_TO_LAUNCH", "LIVE"],
      ["LIVE", "POST_CAMPAIGN"],
      ["POST_CAMPAIGN", "ARCHIVED"],
    ];

    it.each(validTransitions)(
      "doit autoriser la transition %s -> %s",
      (from, to) => {
        expect(canTransition(from, to)).toBe(true);
      }
    );
  });

  describe("Transitions invalides", () => {
    const invalidTransitions: [CampaignState, CampaignState][] = [
      ["BRIEF_DRAFT", "LIVE"],
      ["ARCHIVED", "BRIEF_DRAFT"],
      ["CANCELLED", "LIVE"],
      ["LIVE", "BRIEF_DRAFT"],
      ["POST_CAMPAIGN", "LIVE"],
      ["PLANNING", "APPROVAL"],
    ];

    it.each(invalidTransitions)(
      "doit interdire la transition %s -> %s",
      (from, to) => {
        expect(canTransition(from, to)).toBe(false);
      }
    );
  });

  describe("Annulation depuis chaque etat actif", () => {
    const cancellableStates: CampaignState[] = [
      "BRIEF_DRAFT",
      "BRIEF_VALIDATED",
      "PLANNING",
      "CREATIVE_DEV",
      "PRODUCTION",
      "PRE_PRODUCTION",
      "APPROVAL",
      "READY_TO_LAUNCH",
    ];

    it.each(cancellableStates)(
      "doit autoriser l'annulation depuis %s",
      (from) => {
        expect(canTransition(from, "CANCELLED")).toBe(true);
      }
    );

    it("doit autoriser l'annulation depuis LIVE", () => {
      expect(canTransition("LIVE", "CANCELLED")).toBe(true);
    });

    it("ne doit pas autoriser l'annulation depuis ARCHIVED", () => {
      expect(canTransition("ARCHIVED", "CANCELLED")).toBe(false);
    });
  });

  describe("Rollbacks depuis APPROVAL", () => {
    it("doit autoriser le retour a CREATIVE_DEV depuis APPROVAL", () => {
      expect(canTransition("APPROVAL", "CREATIVE_DEV")).toBe(true);
    });

    it("doit autoriser le retour a PRODUCTION depuis APPROVAL", () => {
      expect(canTransition("APPROVAL", "PRODUCTION")).toBe(true);
    });
  });

  describe("Transitions disponibles", () => {
    it("doit lister les transitions possibles depuis BRIEF_DRAFT", () => {
      const available = getAvailableTransitions("BRIEF_DRAFT");
      expect(available).toContain("BRIEF_VALIDATED");
      expect(available).toContain("CANCELLED");
      expect(available).toHaveLength(2);
    });

    it("doit lister les transitions possibles depuis APPROVAL", () => {
      const available = getAvailableTransitions("APPROVAL");
      expect(available).toContain("READY_TO_LAUNCH");
      expect(available).toContain("CANCELLED");
      expect(available).toContain("CREATIVE_DEV");
      expect(available).toContain("PRODUCTION");
      expect(available).toHaveLength(4);
    });

    it("ne doit lister aucune transition depuis ARCHIVED", () => {
      const available = getAvailableTransitions("ARCHIVED");
      expect(available).toHaveLength(0);
    });

    it("ne doit lister aucune transition depuis CANCELLED", () => {
      const available = getAvailableTransitions("CANCELLED");
      expect(available).toHaveLength(0);
    });
  });

  describe("Exigence d'approbation", () => {
    it("doit exiger une approbation pour BRIEF_DRAFT -> BRIEF_VALIDATED", () => {
      expect(requiresApproval("BRIEF_DRAFT", "BRIEF_VALIDATED")).toBe(true);
    });

    it("ne doit pas exiger d'approbation pour BRIEF_VALIDATED -> PLANNING", () => {
      expect(requiresApproval("BRIEF_VALIDATED", "PLANNING")).toBe(false);
    });

    it("doit exiger une approbation pour APPROVAL -> READY_TO_LAUNCH", () => {
      expect(requiresApproval("APPROVAL", "READY_TO_LAUNCH")).toBe(true);
    });

    it("doit retourner true par defaut pour une transition inconnue", () => {
      expect(requiresApproval("ARCHIVED" as CampaignState, "LIVE" as CampaignState)).toBe(true);
    });
  });
});

// ============================================================
// Gate Checks
// ============================================================
describe("Campaign Manager — Gate Checks", () => {
  it("doit retourner les gate checks pour BRIEF_DRAFT -> BRIEF_VALIDATED", () => {
    const gates = getGateChecks("BRIEF_DRAFT", "BRIEF_VALIDATED");
    expect(gates).toEqual(["brief_complete", "budget_defined"]);
  });

  it("doit retourner les gate checks pour PLANNING -> CREATIVE_DEV", () => {
    const gates = getGateChecks("PLANNING", "CREATIVE_DEV");
    expect(gates).toEqual(["timeline_set", "team_assigned"]);
  });

  it("doit retourner un tableau vide pour une transition sans gate", () => {
    const gates = getGateChecks("BRIEF_VALIDATED", "PLANNING");
    expect(gates).toEqual([]);
  });

  it("doit valider les gates quand tout est rempli", async () => {
    const context = {
      hasBrief: true,
      hasBudget: true,
      hasTimeline: true,
      hasTeam: true,
      allAssetsReady: true,
      clientApproved: true,
      launchChecklist: true,
    };
    const result = await validateGates("test-id", "BRIEF_DRAFT", "BRIEF_VALIDATED", context);
    expect(result.valid).toBe(true);
    expect(result.failedChecks).toHaveLength(0);
  });

  it("doit echouer quand le brief est manquant", async () => {
    const context = {
      hasBrief: false,
      hasBudget: true,
      hasTimeline: true,
      hasTeam: true,
      allAssetsReady: true,
      clientApproved: true,
      launchChecklist: true,
    };
    const result = await validateGates("test-id", "BRIEF_DRAFT", "BRIEF_VALIDATED", context);
    expect(result.valid).toBe(false);
    expect(result.failedChecks).toContain("brief_complete");
  });

  it("doit echouer quand le budget est manquant", async () => {
    const context = {
      hasBrief: true,
      hasBudget: false,
      hasTimeline: true,
      hasTeam: true,
      allAssetsReady: true,
      clientApproved: true,
      launchChecklist: true,
    };
    const result = await validateGates("test-id", "BRIEF_DRAFT", "BRIEF_VALIDATED", context);
    expect(result.valid).toBe(false);
    expect(result.failedChecks).toContain("budget_defined");
  });

  it("doit retourner tous les checks echoues quand rien n'est rempli", async () => {
    const context = {
      hasBrief: false,
      hasBudget: false,
      hasTimeline: false,
      hasTeam: false,
      allAssetsReady: false,
      clientApproved: false,
      launchChecklist: false,
    };
    const result = await validateGates("test-id", "PLANNING", "CREATIVE_DEV", context);
    expect(result.valid).toBe(false);
    expect(result.failedChecks).toContain("timeline_set");
    expect(result.failedChecks).toContain("team_assigned");
  });

  it("doit valider la gate client_approved pour APPROVAL -> READY_TO_LAUNCH", async () => {
    const context = {
      hasBrief: true,
      hasBudget: true,
      hasTimeline: true,
      hasTeam: true,
      allAssetsReady: true,
      clientApproved: false,
      launchChecklist: true,
    };
    const result = await validateGates("test-id", "APPROVAL", "READY_TO_LAUNCH", context);
    expect(result.valid).toBe(false);
    expect(result.failedChecks).toContain("client_approved");
  });
});

// ============================================================
// Budget Breakdown (logique de calcul pure)
// ============================================================
describe("Campaign Manager — Recommandation d'actions", () => {
  it("doit recommander des actions ATL avec un gros budget", () => {
    const result = recommendActions(["awareness"], 10000000, ["TV", "OOH"]);
    expect(result.length).toBeLessThanOrEqual(15);
    expect(result.length).toBeGreaterThan(0);
    // Les actions avec drivers TV/OOH et gros budget doivent avoir un score eleve
    const topResult = result[0]!;
    expect(topResult!.relevance).toBeGreaterThan(0);
  });

  it("doit recommander des actions BTL avec un petit budget", () => {
    const result = recommendActions(["engagement"], 1000000, ["INSTAGRAM"]);
    expect(result.length).toBeLessThanOrEqual(15);
    const categories = result.map((r) => r.category);
    expect(categories).toContain("BTL");
  });

  it("doit retourner au maximum 15 recommandations", () => {
    const result = recommendActions([], 5000000, []);
    expect(result.length).toBeLessThanOrEqual(15);
  });

  it("doit trier les resultats par pertinence decroissante", () => {
    const result = recommendActions(["awareness"], 5000000, ["INSTAGRAM", "FACEBOOK"]);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]!.relevance).toBeGreaterThanOrEqual(result[i]!.relevance);
    }
  });
});

// ============================================================
// Détection d'éclatement — mission réelle, jamais statut calendaire
// (régression : actions canon planifiées affichées « 3/3 éclatées » sans mission)
// ============================================================
describe("Campaign Manager — deriveExplodedActionIds", () => {
  it("ne compte une action éclatée que si une mission la référence (briefData.brandActionId)", () => {
    const missions = [
      { briefData: { brandActionId: "a1", source: "BRAND_ACTION_EXPLODE" } },
      { briefData: { foo: "bar" } }, // mission sans lien action
      { briefData: null }, // pas de briefData
    ];
    expect(deriveExplodedActionIds(["a1", "a2", "a3"], missions)).toEqual(["a1"]);
  });

  it("une action planifiée au calendrier mais SANS mission n'est PAS éclatée (cœur du bug)", () => {
    // Aucune mission → aucune action éclatée, quel que soit son statut calendaire.
    expect(deriveExplodedActionIds(["a1", "a2", "a3"], [])).toEqual([]);
  });

  it("ignore un brandActionId qui n'appartient pas à la campagne", () => {
    expect(deriveExplodedActionIds(["a1"], [{ briefData: { brandActionId: "ailleurs" } }])).toEqual([]);
  });

  it("dédoublonne plusieurs missions pour la même action", () => {
    const missions = [{ briefData: { brandActionId: "a1" } }, { briefData: { brandActionId: "a1" } }];
    expect(deriveExplodedActionIds(["a1", "a2"], missions)).toEqual(["a1"]);
  });

  it("ignore un briefData.brandActionId non-string (robustesse)", () => {
    expect(deriveExplodedActionIds(["a1"], [{ briefData: { brandActionId: 42 } }])).toEqual([]);
  });
});

// ============================================================
// Pipeline staged — étage Actions → Briefs (deriveActionBriefs)
// ============================================================
describe("Campaign Manager — deriveActionBriefs", () => {
  it("mappe action → son brief via content.brandActionId (+ statut)", () => {
    const briefs = [
      { id: "b1", status: "DRAFT", content: { brandActionId: "a1" } },
      { id: "b2", status: "VALIDATED", content: { brandActionId: "a2" } },
      { id: "b3", status: "DRAFT", content: { foo: 1 } },
    ];
    expect(deriveActionBriefs(["a1", "a2", "a3"], briefs)).toEqual({
      a1: { briefId: "b1", status: "DRAFT" },
      a2: { briefId: "b2", status: "VALIDATED" },
    });
  });

  it("ignore un brandActionId hors campagne et garde le 1er brief par action", () => {
    const briefs = [
      { id: "b1", status: "DRAFT", content: { brandActionId: "a1" } },
      { id: "b2", status: "VALIDATED", content: { brandActionId: "a1" } },
      { id: "b3", status: "DRAFT", content: { brandActionId: "ailleurs" } },
    ];
    expect(deriveActionBriefs(["a1"], briefs)).toEqual({ a1: { briefId: "b1", status: "DRAFT" } });
  });
});

// ============================================================
// Fiche mission — avancement activités (computeMissionActivityHealth)
// ============================================================
describe("Campaign Manager — computeMissionActivityHealth", () => {
  it("agrège progression + budget + KPI, hors activités annulées", () => {
    const h = computeMissionActivityHealth([
      { status: "DONE", budgetAllocated: 100, kpiTarget: 10, kpiActual: 8 },
      { status: "PENDING", budgetAllocated: 50, kpiTarget: 5, kpiActual: 0 },
      { status: "CANCELLED", budgetAllocated: 999, kpiTarget: 999, kpiActual: 999 },
    ]);
    expect(h.total).toBe(2);
    expect(h.done).toBe(1);
    expect(h.progressPct).toBe(50);
    expect(h.budgetAllocated).toBe(150);
    expect(h.kpiTarget).toBe(15);
    expect(h.kpiActual).toBe(8);
    expect(h.kpiPct).toBe(53);
  });

  it("0 activité → 0% sans division par zéro", () => {
    expect(computeMissionActivityHealth([])).toEqual({
      total: 0,
      done: 0,
      progressPct: 0,
      budgetAllocated: 0,
      kpiTarget: 0,
      kpiActual: 0,
      kpiPct: 0,
    });
  });

  it("budget/KPI nuls traités comme 0", () => {
    const h = computeMissionActivityHealth([
      { status: "DONE", budgetAllocated: null, kpiTarget: null, kpiActual: null },
    ]);
    expect(h.budgetAllocated).toBe(0);
    expect(h.kpiPct).toBe(0);
  });
});
