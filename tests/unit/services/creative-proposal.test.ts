import { describe, it, expect, vi } from "vitest";

// La gate importe @/lib/db au top — on le neutralise (on ne teste que le pur).
vi.mock("@/lib/db", () => ({ db: {} }));

import {
  creativeProposalContractSchema,
  creativeDirectionDraftSchema,
  parseCreativeDirection,
  parseCreativeProposalVisuals,
} from "@/lib/types/creative-proposal";
import { toRouteInitiative, summarizeExecutionLevels } from "@/server/services/creative-proposal";
import { routeInitiativeSet } from "@/lib/strategy/roadmap-routes";

describe("creative-proposal — Data Contract (ADR-0120)", () => {
  it("valide une proposition minimale + applique les défauts", () => {
    const r = creativeProposalContractSchema.parse({
      strategyId: "s1",
      routeKey: "TARGET",
      direction: { bigIdea: "Devenir le rituel du matin" },
    });
    expect(r.source).toBe("LAFUSEE_AI"); // défaut
    expect(r.direction.insight).toBe(""); // défaut
    expect(r.direction.pistes).toEqual([]); // défaut
  });

  it("rejette un routeKey hors ADR-0089 et une Big Idea trop courte", () => {
    expect(creativeProposalContractSchema.safeParse({ strategyId: "s1", routeKey: "WRONG", direction: { bigIdea: "ok idea" } }).success).toBe(false);
    expect(creativeProposalContractSchema.safeParse({ strategyId: "s1", routeKey: "TARGET", direction: { bigIdea: "x" } }).success).toBe(false);
  });

  it("parseurs tolérants — legacy/absent → défauts sans throw", () => {
    expect(parseCreativeDirection(null)).toEqual({ bigIdea: "", insight: "", axe: "", pistes: [] });
    expect(parseCreativeProposalVisuals(undefined)).toEqual({ mockups: [], socialSim: [], keyVisual: null });
  });
});

describe("creative-proposal — creativeDirectionDraftSchema (Voie A IA, lenient)", () => {
  it("applique des défauts vides — le LLM peut omettre des champs", () => {
    expect(creativeDirectionDraftSchema.parse({})).toEqual({ bigIdea: "", insight: "", axe: "", pistes: [] });
  });
  it("accepte un brouillon partiel", () => {
    const d = creativeDirectionDraftSchema.parse({ bigIdea: "Le rituel du matin", pistes: ["spot radio", "activation marché"] });
    expect(d.bigIdea).toBe("Le rituel du matin");
    expect(d.pistes).toHaveLength(2);
    expect(d.insight).toBe("");
  });
});

describe("creative-proposal — toRouteInitiative + jeu de route (ADR-0089)", () => {
  const ba = (id: string, selected: boolean, status: string, timeframe: string | null) =>
    ({ id, selected, status, metadata: timeframe ? { timeframe } : {} });

  it("mappe selected→SELECTED_FOR_ROADMAP, PROPOSED→RECOMMENDED, extrait le timeframe", () => {
    expect(toRouteInitiative(ba("a", true, "ACCEPTED", "SPRINT_90"))).toEqual({ id: "a", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90" });
    expect(toRouteInitiative(ba("b", false, "PROPOSED", "PHASE_1"))).toEqual({ id: "b", status: "RECOMMENDED", timeframe: "PHASE_1" });
    expect(toRouteInitiative(ba("c", false, "CANCELLED", null))).toEqual({ id: "c", status: "CANCELLED", timeframe: null });
  });

  it("les 3 niveaux d'exécution sélectionnent des jeux distincts", () => {
    const actions = [
      ba("short", true, "ACCEPTED", "SPRINT_90"),  // selected court-terme
      ba("mid", true, "ACCEPTED", "PHASE_2"),       // selected long-terme
      ba("reco", false, "PROPOSED", "PHASE_1"),     // recommended
    ].map(toRouteInitiative);

    const conservative = routeInitiativeSet("CONSERVATIVE", actions).map((a) => a.id);
    const target = routeInitiativeSet("TARGET", actions).map((a) => a.id);
    const ambitious = routeInitiativeSet("AMBITIOUS", actions).map((a) => a.id);

    expect(conservative).toEqual(["short"]);              // selected + court-terme uniquement
    expect(target.sort()).toEqual(["mid", "short"]);      // toutes les selected
    expect(ambitious.sort()).toEqual(["mid", "reco", "short"]); // selected + recommended
  });
});

describe("creative-proposal — summarizeExecutionLevels (preview Voie A déterministe)", () => {
  it("compte + budgète les actions par niveau + passe le growth stocké", () => {
    const initiatives = [
      { id: "short", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90" },
      { id: "mid", status: "SELECTED_FOR_ROADMAP", timeframe: "PHASE_2" },
      { id: "reco", status: "RECOMMENDED", timeframe: "PHASE_1" },
    ];
    const budgetById = new Map([["short", 100], ["mid", 200], ["reco", 50]]);
    const storedByKey = new Map<string, Record<string, unknown>>([["TARGET", { projectedGrowthPct: 30, selected: true }]]);

    const levels = summarizeExecutionLevels(initiatives, budgetById, storedByKey);
    expect(levels).toHaveLength(3);
    const cons = levels.find((l) => l.key === "CONSERVATIVE")!;
    const tgt = levels.find((l) => l.key === "TARGET")!;
    const amb = levels.find((l) => l.key === "AMBITIOUS")!;

    expect([cons.actionCount, cons.totalBudget, cons.projectedGrowthPct]).toEqual([1, 100, null]); // short ; pas de stored
    expect([tgt.actionCount, tgt.totalBudget, tgt.projectedGrowthPct, tgt.selected]).toEqual([2, 300, 30, true]);
    expect([amb.actionCount, amb.totalBudget]).toEqual([3, 350]);
  });
});
