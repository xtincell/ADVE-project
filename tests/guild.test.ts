import { describe, expect, it } from "vitest";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUSES,
  APPLICATION_TRANSITIONS,
  AVAILABILITY_LABELS,
  canApplyToMission,
  canDecideApplication,
  canToggleGuild,
  canTransitionApplication,
  MAX_SKILLS,
  normalizeSkills,
  TALENT_AVAILABILITIES,
  TALENT_VISIBILITIES,
  toWallMission,
  VISIBILITY_LABELS,
  WALL_MISSION_KEYS,
  type ApplicationStatus,
  type WallMissionSource,
} from "@/domain/guild";
import { MISSION_STATUSES } from "@/domain/campaign";
import { pitchSchema, talentProfileSchema } from "@/server/guild";

/**
 * WP-011 — tests PURS de la Guilde : machine d'états des candidatures,
 * gates (publier au mur / candidater / décider), projection anti-fuite du
 * mur des missions, normalisation des compétences, schémas de frontière.
 * Zéro DB (le smoke Postgres réel vit dans guild-smoke.db.test.ts, gated
 * par SMOKE_DATABASE_URL).
 */

// ── Machine d'états des candidatures ────────────────────────────────────

describe("machine d'états d'une candidature", () => {
  it("suit APPLIED → (SHORTLISTED) → ACCEPTED/DECLINED, sans retour", () => {
    expect(canTransitionApplication("APPLIED", "SHORTLISTED")).toEqual({ ok: true });
    expect(canTransitionApplication("APPLIED", "ACCEPTED")).toEqual({ ok: true });
    expect(canTransitionApplication("APPLIED", "DECLINED")).toEqual({ ok: true });
    expect(canTransitionApplication("SHORTLISTED", "ACCEPTED")).toEqual({ ok: true });
    expect(canTransitionApplication("SHORTLISTED", "DECLINED")).toEqual({ ok: true });
  });

  it("les décisions finales sont terminales, la shortlist ne se re-shortlist pas", () => {
    for (const to of APPLICATION_STATUSES) {
      expect(canTransitionApplication("ACCEPTED", to).ok).toBe(false);
      expect(canTransitionApplication("DECLINED", to).ok).toBe(false);
    }
    expect(canTransitionApplication("SHORTLISTED", "SHORTLISTED").ok).toBe(false);
    expect(canTransitionApplication("SHORTLISTED", "APPLIED").ok).toBe(false);
    expect(canTransitionApplication("APPLIED", "APPLIED").ok).toBe(false);
  });

  it("la table de transitions et le prédicat racontent la même histoire", () => {
    for (const from of APPLICATION_STATUSES) {
      for (const to of APPLICATION_STATUSES) {
        expect(canTransitionApplication(from, to).ok).toBe(
          APPLICATION_TRANSITIONS[from].includes(to),
        );
      }
    }
  });

  it("porte une raison FR affichable à chaque refus", () => {
    const gate = canTransitionApplication("DECLINED", "ACCEPTED");
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.reason).toMatch(/sans retour/i);
  });
});

// ── Gates du mur ─────────────────────────────────────────────────────────

describe("gate « publier / retirer du mur »", () => {
  it("ne s'ouvre que sur une mission encore OPEN", () => {
    expect(canToggleGuild("OPEN")).toEqual({ ok: true });
    for (const status of MISSION_STATUSES.filter((s) => s !== "OPEN")) {
      const gate = canToggleGuild(status);
      expect(gate.ok).toBe(false);
      if (!gate.ok) expect(gate.reason).toMatch(/ouverte/i);
    }
  });
});

describe("gate « candidater »", () => {
  it("exige mission OPEN ET publiée sur le mur", () => {
    expect(canApplyToMission("OPEN", true)).toEqual({ ok: true });
    expect(canApplyToMission("OPEN", false).ok).toBe(false);
    expect(canApplyToMission("ASSIGNED", true).ok).toBe(false);
    expect(canApplyToMission("VALIDATED", false).ok).toBe(false);
  });
});

describe("gate « décider une candidature »", () => {
  it("refuse toute décision quand la mission n'est plus OPEN", () => {
    for (const status of MISSION_STATUSES.filter((s) => s !== "OPEN")) {
      const gate = canDecideApplication(status, "APPLIED", "ACCEPTED");
      expect(gate.ok).toBe(false);
      if (!gate.ok) expect(gate.reason).toMatch(/plus ouverte/i);
    }
  });

  it("sur mission OPEN, délègue à la machine d'états de candidature", () => {
    expect(canDecideApplication("OPEN", "APPLIED", "ACCEPTED")).toEqual({ ok: true });
    expect(canDecideApplication("OPEN", "SHORTLISTED", "DECLINED")).toEqual({ ok: true });
    expect(canDecideApplication("OPEN", "ACCEPTED", "DECLINED").ok).toBe(false);
  });
});

// ── Projection anti-fuite du mur (l'essence d'ADR-0098) ─────────────────

describe("projection publique du mur des missions", () => {
  const source: WallMissionSource = {
    id: "m1",
    title: "Shooting packshots",
    createdAt: new Date("2026-07-01T10:00:00Z"),
    actionKindLabel: "Séance photo (demi-journée)",
    marketName: "Cameroun",
    marketCode: "CM",
  };

  it("construit exactement les clés du contrat WALL_MISSION_KEYS — rien d'autre", () => {
    const wall = toWallMission(source);
    expect(Object.keys(wall).sort()).toEqual([...WALL_MISSION_KEYS].sort());
  });

  it("ne laisse fuiter AUCUNE donnée de marque même si la source est polluée", () => {
    const polluted = {
      ...source,
      brandName: "Marque Secrète",
      workspaceId: "ws_123",
      campaignName: "Campagne confidentielle",
      campaignObjective: "Doubler le CA",
      budget: 1_000_000,
    } as WallMissionSource;
    const wall = toWallMission(polluted) as unknown as Record<string, unknown>;
    expect(Object.keys(wall).sort()).toEqual([...WALL_MISSION_KEYS].sort());
    expect(wall.brandName).toBeUndefined();
    expect(wall.workspaceId).toBeUndefined();
    expect(wall.campaignName).toBeUndefined();
    expect(wall.budget).toBeUndefined();
    expect(JSON.stringify(wall)).not.toContain("Secrète");
  });

  it("compose le marché « Nom (CODE) » et reprend le libellé du type d'action", () => {
    const wall = toWallMission(source);
    expect(wall.market).toBe("Cameroun (CM)");
    expect(wall.kindLabel).toBe("Séance photo (demi-journée)");
    expect(wall.title).toBe("Shooting packshots");
  });
});

// ── Compétences (saisie libre normalisée) ────────────────────────────────

describe("normalizeSkills", () => {
  it("découpe par lignes et virgules, trim, effondre les espaces internes", () => {
    expect(normalizeSkills("Photo produit\n Retouche  Lightroom , DA ")).toEqual([
      "Photo produit",
      "Retouche Lightroom",
      "DA",
    ]);
  });

  it("retire vides et doublons (insensibles à la casse), ordre de saisie conservé", () => {
    expect(normalizeSkills("photo,,PHOTO\nPhoto, montage")).toEqual(["photo", "montage"]);
  });

  it(`borne à MAX_SKILLS (${MAX_SKILLS})`, () => {
    const raw = Array.from({ length: MAX_SKILLS + 5 }, (_, i) => `skill-${i}`).join(",");
    expect(normalizeSkills(raw)).toHaveLength(MAX_SKILLS);
  });
});

// ── Libellés FR complets (registre client — jamais d'enum brut) ─────────

describe("libellés FR", () => {
  it("chaque statut/disponibilité/visibilité a son libellé", () => {
    for (const s of APPLICATION_STATUSES) expect(APPLICATION_STATUS_LABELS[s]).toBeTruthy();
    for (const a of TALENT_AVAILABILITIES) expect(AVAILABILITY_LABELS[a]).toBeTruthy();
    for (const v of TALENT_VISIBILITIES) expect(VISIBILITY_LABELS[v]).toBeTruthy();
  });
});

// ── Schémas de frontière (server actions → service) ─────────────────────

describe("talentProfileSchema", () => {
  const base = {
    headline: "Photographe produit — Douala",
    skills: "Photo produit\nRetouche",
    city: "Douala",
    countryCode: "cm",
    whatsapp: "+237 690-00-00-00",
    portfolioUrl: "https://behance.net/moi",
    dailyRate: "75 000",
    availability: "AVAILABLE",
    visibility: "VISIBLE",
  };

  it("normalise : pays en MAJUSCULES, skills en liste, whatsapp compacté, tarif → entier", () => {
    const parsed = talentProfileSchema.parse(base);
    expect(parsed.countryCode).toBe("CM");
    expect(parsed.skills).toEqual(["Photo produit", "Retouche"]);
    expect(parsed.whatsapp).toBe("+237690000000");
    expect(parsed.dailyRate).toBe(75000);
  });

  it("tarif vide → null (non communiqué), jamais 0 inventé", () => {
    expect(talentProfileSchema.parse({ ...base, dailyRate: "" }).dailyRate).toBeNull();
    expect(talentProfileSchema.parse({ ...base, dailyRate: "  " }).dailyRate).toBeNull();
  });

  it("refuse un tarif non numérique, à zéro, ou démesuré", () => {
    expect(talentProfileSchema.safeParse({ ...base, dailyRate: "75k" }).success).toBe(false);
    expect(talentProfileSchema.safeParse({ ...base, dailyRate: "-5" }).success).toBe(false);
    expect(talentProfileSchema.safeParse({ ...base, dailyRate: "0" }).success).toBe(false);
    expect(talentProfileSchema.safeParse({ ...base, dailyRate: "1234567890" }).success).toBe(
      false,
    );
  });

  it("refuse accroche trop courte, skills vides, pays hors format, URL invalide", () => {
    expect(talentProfileSchema.safeParse({ ...base, headline: "ab" }).success).toBe(false);
    expect(talentProfileSchema.safeParse({ ...base, skills: " ,\n, " }).success).toBe(false);
    expect(talentProfileSchema.safeParse({ ...base, countryCode: "CMR" }).success).toBe(false);
    expect(
      talentProfileSchema.safeParse({ ...base, portfolioUrl: "behance.net/moi" }).success,
    ).toBe(false);
    expect(
      talentProfileSchema.safeParse({ ...base, whatsapp: "not-a-number" }).success,
    ).toBe(false);
  });

  it("whatsapp et portfolio optionnels (vides acceptés)", () => {
    const parsed = talentProfileSchema.parse({ ...base, whatsapp: "", portfolioUrl: "" });
    expect(parsed.whatsapp).toBe("");
    expect(parsed.portfolioUrl).toBe("");
  });
});

describe("pitchSchema", () => {
  it("exige un pitch substantiel (20 à 1 500 caractères), trimé", () => {
    expect(pitchSchema.safeParse("trop court").success).toBe(false);
    expect(pitchSchema.parse("  Voici mon approche pour cette mission produit.  ")).toBe(
      "Voici mon approche pour cette mission produit.",
    );
    expect(pitchSchema.safeParse("x".repeat(1501)).success).toBe(false);
  });
});

// ── Cohérence de type (les unions domaine couvrent les enums Prisma) ────

it("APPLICATION_STATUSES est exhaustif et stable (contrat DB)", () => {
  const expected: ApplicationStatus[] = ["APPLIED", "SHORTLISTED", "ACCEPTED", "DECLINED"];
  expect([...APPLICATION_STATUSES]).toEqual(expected);
});
