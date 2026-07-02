import { describe, expect, it } from "vitest";
import {
  ACTION_STATUSES,
  BRIEF_FIELDS,
  buildBriefDraft,
  canAddAction,
  canBriefAction,
  canEditBrief,
  canLaunchCampaign,
  canSplitBrief,
  canTransitionMission,
  canValidateBrief,
  MISSION_STATUSES,
  MISSION_TRANSITIONS,
  missingBriefFields,
  scaleCostByCostOfLiving,
  type MissionStatus,
} from "@/domain/campaign";
import {
  ACTION_KIND_KEYS,
  ACTION_KIND_LABELS,
  actionKindSchema,
  addActionSchema,
  assigneeSchema,
  briefContentSchema,
  costSummary,
  createCampaignSchema,
  missionTitlesSchema,
} from "@/server/campaigns";

/**
 * WP-008 — tests PURS du pipeline Campagne → Actions → Briefs → Missions :
 * gates, machine d'états mission, mise à l'échelle des coûts, registre des
 * types d'action, schémas de frontière. Zéro DB (le smoke Postgres réel vit
 * dans campaigns-smoke.db.test.ts, gated par SMOKE_DATABASE_URL).
 */

describe("gate « lancer la production »", () => {
  it("s'ouvre uniquement en DRAFT avec au moins une action", () => {
    expect(canLaunchCampaign("DRAFT", 1)).toEqual({ ok: true });
    expect(canLaunchCampaign("DRAFT", 3)).toEqual({ ok: true });
  });

  it("refuse un cadre vide, une campagne déjà lancée, une archivée", () => {
    expect(canLaunchCampaign("DRAFT", 0).ok).toBe(false);
    expect(canLaunchCampaign("ACTIVE", 5).ok).toBe(false);
    expect(canLaunchCampaign("ARCHIVED", 5).ok).toBe(false);
  });

  it("porte une raison FR affichable à chaque refus", () => {
    const gate = canLaunchCampaign("DRAFT", 0);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.reason).toMatch(/au moins une action/i);
  });
});

describe("gate « ajouter une action »", () => {
  it("accepte DRAFT et ACTIVE, refuse ARCHIVED", () => {
    expect(canAddAction("DRAFT").ok).toBe(true);
    expect(canAddAction("ACTIVE").ok).toBe(true);
    expect(canAddAction("ARCHIVED").ok).toBe(false);
  });
});

describe("gate « transformer en brief » (ADR-0120 : jamais avant le lancement)", () => {
  it("exige campagne ACTIVE et action PLANNED", () => {
    expect(canBriefAction("ACTIVE", "PLANNED")).toEqual({ ok: true });
  });

  it("refuse tant que la production n'est pas lancée", () => {
    const gate = canBriefAction("DRAFT", "PLANNED");
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.reason).toMatch(/lancez d'abord la production/i);
  });

  it("refuse une action déjà briefée ou annulée, une campagne archivée", () => {
    expect(canBriefAction("ACTIVE", "BRIEFED").ok).toBe(false);
    expect(canBriefAction("ACTIVE", "CANCELLED").ok).toBe(false);
    expect(canBriefAction("ARCHIVED", "PLANNED").ok).toBe(false);
  });
});

describe("brief structuré : complétude et gates", () => {
  const complete = { objectif: "Vendre", livrable: "12 packshots", specs: "" };

  it("les champs requis sont exactement objectif et livrable", () => {
    expect(BRIEF_FIELDS.filter((f) => f.required).map((f) => f.id)).toEqual([
      "objectif",
      "livrable",
    ]);
  });

  it("missingBriefFields repère les requis vides ou blancs", () => {
    expect(missingBriefFields(complete)).toHaveLength(0);
    expect(missingBriefFields({ objectif: "  ", livrable: "x" }).map((f) => f.id)).toEqual([
      "objectif",
    ]);
    expect(missingBriefFields({})).toHaveLength(2);
    expect(missingBriefFields({ objectif: 42, livrable: null })).toHaveLength(2);
  });

  it("canValidateBrief : DRAFT complet uniquement", () => {
    expect(canValidateBrief("DRAFT", complete)).toEqual({ ok: true });
    expect(canValidateBrief("DRAFT", { objectif: "seul" }).ok).toBe(false);
    expect(canValidateBrief("VALIDATED", complete).ok).toBe(false);
  });

  it("canEditBrief : brouillon oui, validé figé", () => {
    expect(canEditBrief("DRAFT").ok).toBe(true);
    expect(canEditBrief("VALIDATED").ok).toBe(false);
  });

  it("canSplitBrief : réservé aux briefs validés", () => {
    expect(canSplitBrief("VALIDATED").ok).toBe(true);
    const gate = canSplitBrief("DRAFT");
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.reason).toMatch(/validez d'abord/i);
  });

  it("buildBriefDraft compose UNIQUEMENT des données déclarées (déterministe)", () => {
    const input = {
      campaignName: "Rentrée 2026",
      campaignObjective: "Doubler la notoriété à Douala",
      actionName: "Shooting packshots",
      actionKindLabel: "Séance photo (demi-journée)",
      marketLabel: "Cameroun (CM)",
    };
    const draft = buildBriefDraft(input);
    expect(draft).toEqual(buildBriefDraft(input)); // même entrée, même sortie
    expect(draft.title).toBe("Brief — Shooting packshots");
    expect(draft.content.objectif).toBe("Doubler la notoriété à Douala");
    expect(draft.content.livrable).toBe("Shooting packshots (Séance photo (demi-journée))");
    expect(draft.content.contexte).toContain("Rentrée 2026");
    expect(draft.content.contexte).toContain("Cameroun (CM)");
    // Les champs sans matière déclarée restent vides — jamais inventés.
    expect(draft.content.specs).toBe("");
    expect(draft.content.ton).toBe("");
    expect(draft.content.echeance).toBe("");
    // Le draft est complet pour la gate (objectif + livrable portés par le cadre).
    expect(missingBriefFields(draft.content)).toHaveLength(0);
  });
});

describe("machine d'états mission (OPEN → ASSIGNED → DELIVERED → VALIDATED)", () => {
  it("la chaîne nominale passe, étape par étape", () => {
    expect(canTransitionMission("OPEN", "ASSIGNED").ok).toBe(true);
    expect(canTransitionMission("ASSIGNED", "DELIVERED").ok).toBe(true);
    expect(canTransitionMission("DELIVERED", "VALIDATED").ok).toBe(true);
  });

  it("aucun saut, aucun retour, aucun état terminal ré-ouvert", () => {
    const allowed = new Set(
      MISSION_STATUSES.flatMap((from) => MISSION_TRANSITIONS[from].map((to) => `${from}→${to}`)),
    );
    for (const from of MISSION_STATUSES) {
      for (const to of MISSION_STATUSES) {
        const gate = canTransitionMission(from, to);
        expect(gate.ok).toBe(allowed.has(`${from}→${to}`));
        if (!gate.ok) expect(gate.reason).toMatch(/sans saut ni retour/);
      }
    }
    // Exactement 3 transitions légales au total — la chaîne, rien d'autre.
    expect(allowed.size).toBe(3);
    expect(MISSION_TRANSITIONS.VALIDATED).toHaveLength(0);
  });

  it("chaque statut est couvert par la machine", () => {
    for (const status of MISSION_STATUSES) {
      expect(MISSION_TRANSITIONS[status as MissionStatus]).toBeDefined();
    }
  });
});

describe("mise à l'échelle des coûts par indice coût de la vie (legacy ADR-0093)", () => {
  it("applique le ratio col(marché)/col(base) et arrondit", () => {
    // Séance photo : 454 000 XAF @ CM (col 100) → CI (col 105) = 476 700.
    expect(scaleCostByCostOfLiving(454000, 105, 100)).toBe(476700);
    // Même marché que la base : identité.
    expect(scaleCostByCostOfLiving(454000, 100, 100)).toBe(454000);
    // BF (col 90) : compression du coût.
    expect(scaleCostByCostOfLiving(454000, 90, 100)).toBe(408600);
    // Arrondi à l'unité (Math.round — pas de convention inventée).
    expect(scaleCostByCostOfLiving(1001, 105, 100)).toBe(1051);
  });

  it("refuse les indices inutilisables — null, jamais un montant inventé", () => {
    expect(scaleCostByCostOfLiving(454000, 0, 100)).toBeNull();
    expect(scaleCostByCostOfLiving(454000, 105, 0)).toBeNull();
    expect(scaleCostByCostOfLiving(454000, -5, 100)).toBeNull();
    expect(scaleCostByCostOfLiving(-1, 105, 100)).toBeNull();
    expect(scaleCostByCostOfLiving(Number.NaN, 105, 100)).toBeNull();
    expect(scaleCostByCostOfLiving(454000, Number.POSITIVE_INFINITY, 100)).toBeNull();
  });
});

describe("registre des types d'action (identifiants + libellés, AUCUN montant)", () => {
  it("13 clés uniques, toutes libellées, custom inclus", () => {
    expect(new Set(ACTION_KIND_KEYS).size).toBe(ACTION_KIND_KEYS.length);
    expect(ACTION_KIND_KEYS).toContain("custom");
    expect(ACTION_KIND_KEYS).toHaveLength(13); // 12 archétypes legacy + custom
    for (const key of ACTION_KIND_KEYS) {
      expect(ACTION_KIND_LABELS[key]).toBeTruthy();
    }
  });

  it("actionKindSchema rejette une clé hors référentiel", () => {
    expect(actionKindSchema.safeParse("photo_session_half_day").success).toBe(true);
    expect(actionKindSchema.safeParse("drone_show").success).toBe(false);
  });
});

describe("schémas de frontière", () => {
  it("createCampaignSchema : trim, marché en code ISO-2 majuscule", () => {
    const parsed = createCampaignSchema.safeParse({
      name: "  Rentrée 2026 ",
      objective: "Doubler la notoriété",
      countryCode: "cm",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Rentrée 2026");
      expect(parsed.data.countryCode).toBe("CM");
    }
    expect(createCampaignSchema.safeParse({ name: "x", objective: "ok!!", countryCode: "CM" }).success).toBe(false);
    expect(createCampaignSchema.safeParse({ name: "Nom", objective: "ok!!", countryCode: "CMR" }).success).toBe(false);
  });

  it("addActionSchema : nom requis + kind du registre", () => {
    expect(addActionSchema.safeParse({ name: "Shooting", kind: "photo_session_half_day" }).success).toBe(true);
    expect(addActionSchema.safeParse({ name: "Shooting", kind: "inconnu" }).success).toBe(false);
    expect(addActionSchema.safeParse({ name: "S", kind: "custom" }).success).toBe(false);
  });

  it("briefContentSchema : champs optionnels, bornés, défaut vide", () => {
    const parsed = briefContentSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.objectif).toBe("");
    expect(briefContentSchema.safeParse({ objectif: "x".repeat(2001) }).success).toBe(false);
  });

  it("missionTitlesSchema : 1 à 20 titres nommés", () => {
    expect(missionTitlesSchema.safeParse(["Shooting studio"]).success).toBe(true);
    expect(missionTitlesSchema.safeParse([]).success).toBe(false);
    expect(missionTitlesSchema.safeParse(["a"]).success).toBe(false);
    expect(missionTitlesSchema.safeParse(Array.from({ length: 21 }, (_, i) => `Mission ${i}`)).success).toBe(false);
  });

  it("assigneeSchema : nom déclaré 2..120", () => {
    expect(assigneeSchema.safeParse("Awa N.").success).toBe(true);
    expect(assigneeSchema.safeParse(" ").success).toBe(false);
  });
});

describe("costSummary (agrégat budget d'une campagne)", () => {
  it("somme les coûts estimés, compte les « à estimer », ignore les annulées", () => {
    const summary = costSummary([
      { status: "PLANNED", estimatedCost: 454000, costCurrency: "XAF" },
      { status: "BRIEFED", estimatedCost: 224000, costCurrency: "XAF" },
      { status: "PLANNED", estimatedCost: null, costCurrency: null }, // à estimer
      { status: "CANCELLED", estimatedCost: 999999, costCurrency: "XAF" }, // ignorée
    ]);
    expect(summary).toEqual({ total: 678000, currency: "XAF", unestimated: 1 });
  });

  it("liste vide : zéro honnête, pas de devise inventée", () => {
    expect(costSummary([])).toEqual({ total: 0, currency: null, unestimated: 0 });
  });
});

describe("cohérence domaine ↔ registre", () => {
  it("les statuts d'action du domaine couvrent l'enum Prisma simplifié", () => {
    expect([...ACTION_STATUSES]).toEqual(["PLANNED", "BRIEFED", "CANCELLED"]);
  });
});
