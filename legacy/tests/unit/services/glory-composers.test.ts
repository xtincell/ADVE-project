/**
 * glory-composers.test.ts — pipeline canonique déterministe launch/social.
 *
 * Vérifie que les 4 composers ADVERTIS (0 LLM) produisent, depuis les piliers,
 * la shape exacte garantie par `outputSchema` + les invariants attendus par les
 * surfaces cockpit (handles cross-plateforme, bios, calendrier daté, timeline).
 * Pur — aucun accès DB (les composers prennent un contexte injecté).
 */

import { describe, it, expect } from "vitest";
import {
  composeNaming,
  composeSocialCopy,
  composeContentCalendar,
  composeLaunchTimeline,
  hasGloryComposer,
  type GloryComposerContext,
} from "@/server/services/artemis/tools/glory-composers";
import {
  namingOutputSchema,
  socialCopyOutputSchema,
  contentCalendarOutputSchema,
  launchTimelineOutputSchema,
  LAUNCH_SOCIAL_SCHEMAS,
} from "@/server/services/artemis/tools/launch-social-schemas";

// Fixture fidèle aux shapes réelles du canon SPAWT (champs piliers réels).
const SPAWT: GloryComposerContext = {
  strategy: {
    id: "spawt-strategy-001",
    name: "SPAWT — La carte du bon goût",
    countryCode: "CI",
    businessContext: { sector: "FoodTech", country: "Côte d'Ivoire", launchDate: "2026-06-15" },
  },
  pillars: {
    a: {
      noyauIdentitaire: "Le compagnon culinaire d'Abidjan",
      originMythElevator: "Né d'un ras-le-bol des 47 messages WhatsApp pour choisir où manger.",
      valeurs: [{ valeur: "Instinct" }, { valeur: "Communauté" }],
    },
    d: {
      positionnement: "Le compagnon de découverte culinaire communautaire d'Abidjan.",
      promesseMaitre: "Plus jamais le goumin d'un mauvais restau.",
      tonDeVoix: {
        personnalite: ["Complice", "Curieux", "Indépendant"],
        onDit: ["spawter", "trouvaille", "la Meute"],
        onNeDitPas: ["classement", "top 10", "le meilleur resto"],
      },
      assetsLinguistiques: {
        slogan: "La carte du bon goût",
        tagline: "On ne te dit pas quoi manger.",
        lexique: ["spawter", "la Meute", "le Chat", "Palais"],
      },
    },
    e: {
      rituels: [
        { nom: "Le Weekly Digest", frequence: "hebdomadaire", description: "3 trouvailles de la Meute" },
        { nom: "Le quiz Palais", frequence: "onboarding", description: "5 questions → archétype" },
        { nom: "La première trouvaille", frequence: "une fois", description: "premier spawt < 3 min" },
      ],
    },
    i: {
      formatsDisponibles: ["quiz interactif", "carte archétype", "UGC créateurs"],
      assetsProduisibles: [
        { asset: "Carte archétype partageable", type: "SOCIAL" },
        { asset: "Manifeste vidéo", type: "VIDEO" },
        { asset: "Weekly Digest", type: "ÉDITORIAL" },
      ],
      catalogueParCanal: {
        DIGITAL: [{ id: "A1", action: "Landing + Quiz Palais" }],
        SOCIAL: [{ id: "A3", action: "Micro-créateurs food" }],
      },
    },
    s: {
      globalBudget: "1 000 000 FCFA",
      roadmap: [
        { phase: "Phase 1 — Construire (J1-J30)", objectif: "1 500 leads, 20 lieux", objectifDevotion: "1 500 SPECTATEURS", actions: ["A1 landing", "A4 terrain B2B"], budget: 405000, duree: "1 mois" },
        { phase: "Phase 2 — Lancer (J31-J60)", objectif: "CPA ≤ 200 F, J7 ≥ 25 %", objectifDevotion: "Gate Scale", actions: ["A7 paid UGC", "A8 referral"], budget: 300000, duree: "1 mois" },
      ],
    },
  },
};

const EMPTY: GloryComposerContext = {
  strategy: { id: "x", name: "Acme", countryCode: null, businessContext: null },
  pillars: {},
};

describe("glory-composers — registry", () => {
  it("couvre exactement les 4 outils launch/social", () => {
    for (const slug of ["naming-generator", "social-copy-engine", "content-calendar-strategist", "launch-timeline-planner"]) {
      expect(hasGloryComposer(slug), `composer manquant: ${slug}`).toBe(true);
      expect(LAUNCH_SOCIAL_SCHEMAS[slug as keyof typeof LAUNCH_SOCIAL_SCHEMAS]).toBeDefined();
    }
    expect(hasGloryComposer("concept-generator")).toBe(false);
  });
});

describe("composeNaming", () => {
  const out = composeNaming(SPAWT);
  it("valide le schéma", () => expect(namingOutputSchema.safeParse(out).success).toBe(true));
  it("ancre les handles sur la marque × marché (capture-then-grow)", () => {
    const h = out.handles as Record<string, string>;
    expect(h.instagram).toBe("@spawt.ci");
    expect(h.tiktok).toBe("@spawt.ci");
    expect(h.x).toBe("@spawt_ci"); // point interdit sur X
    expect(h.domain).toBe("spawt.ci");
    expect(out.brandName).toBe("SPAWT");
    expect(out.tagline).toBe("La carte du bon goût");
  });
  it("est honnête sur pilier vide (pas de throw, slug fallback)", () => {
    const e = composeNaming(EMPTY);
    expect(namingOutputSchema.safeParse(e).success).toBe(true);
    expect((e.handles as Record<string, string>).instagram).toBe("@acme");
  });
});

describe("composeSocialCopy", () => {
  const out = composeSocialCopy(SPAWT);
  it("valide le schéma", () => expect(socialCopyOutputSchema.safeParse(out).success).toBe(true));
  it("produit un profil par plateforme avec handle + bio", () => {
    const profiles = out.profiles as Array<Record<string, unknown>>;
    expect(profiles.length).toBe(5);
    const ig = profiles.find((p) => p.platform === "Instagram")!;
    expect(ig.handle).toBe("@spawt.ci");
    expect(typeof ig.bio).toBe("string");
    expect(out.voice).toContain("Complice");
  });
});

describe("composeContentCalendar", () => {
  const out = composeContentCalendar(SPAWT);
  it("valide le schéma", () => expect(contentCalendarOutputSchema.safeParse(out).success).toBe(true));
  it("dérive des hashtags depuis le slogan + la marque", () => {
    const sig = (out.hashtags as { signature: string[] }).signature;
    expect(sig).toContain("#SPAWT");
    expect(sig.some((h) => h.startsWith("#LaCarte"))).toBe(true);
  });
  it("génère un calendrier de publication daté (posts un-par-un)", () => {
    const posts = out.posts as Array<Record<string, unknown>>;
    expect(posts.length).toBeGreaterThan(0);
    for (const p of posts) expect(p.date as string).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // J1 = lundi 2026-06-15 → premier post le 15 (Instagram avant TikTok, tri stable).
    expect(posts[0]!.date).toBe("2026-06-15");
    expect(posts.some((p) => p.platform === "Instagram")).toBe(true);
    expect(posts.every((p) => p.status === "PLANIFIE")).toBe(true);
  });
});

describe("composeLaunchTimeline", () => {
  const out = composeLaunchTimeline(SPAWT);
  it("valide le schéma", () => expect(launchTimelineOutputSchema.safeParse(out).success).toBe(true));
  it("mappe la roadmap S en semaines + ancre le budget GTM", () => {
    const weeks = out.weeks as Array<Record<string, unknown>>;
    expect(weeks.length).toBe(2);
    expect(weeks[0]!.phase).toContain("Phase 1");
    expect((out.anchor as Record<string, unknown>).budgetGtm).toBe("1 000 000 FCFA");
    expect((out.checkpoints as unknown[]).length).toBe(2);
  });
});

describe("déterminisme (variance 0)", () => {
  it("même contexte → sortie identique", () => {
    expect(JSON.stringify(composeNaming(SPAWT))).toBe(JSON.stringify(composeNaming(SPAWT)));
    expect(JSON.stringify(composeContentCalendar(SPAWT))).toBe(JSON.stringify(composeContentCalendar(SPAWT)));
    expect(JSON.stringify(composeLaunchTimeline(SPAWT))).toBe(JSON.stringify(composeLaunchTimeline(SPAWT)));
  });
});
