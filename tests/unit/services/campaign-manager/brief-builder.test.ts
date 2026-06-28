/**
 * brief-builder.test.ts — Génération de brief de campagne **déterministe**.
 *
 * Doctrine « Fusée non-dépendante du LLM » + LOI 9 : le brief de campagne est
 * construit mécaniquement depuis le noyau ADVE. Ce test verrouille :
 *   1. Sortie non-vide + forme canonique (briefClient + section typée) pour les
 *      4 types (CREATIVE / MEDIA / VENDOR / PRODUCTION).
 *   2. Déterminisme strict : même entrée → même brief (variance = 0).
 *   3. Zéro LLM : le module source ne référence aucune primitive LLM / SDK.
 *   4. Cohérence brief ↔ ADVE : le brief dérivé du noyau est COHERENT (gate C6),
 *      jamais DIVERGENT.
 *   5. Propagation des données d'action (persona / localité / touchpoint).
 *
 * Contenu fictif = l'advertis de BLISS (vocabulaire représentatif du seed Wakanda).
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

import {
  buildCampaignBrief,
  briefTitle,
  type BriefBuilderContext,
  type CampaignBriefType,
} from "@/server/services/campaign-manager/brief-builder";
import {
  computeBriefAdveCoherence,
  flattenPillarText,
} from "@/server/services/mestor/gates/brief-adve-coherence-score";

// ── Fixture : advertis de BLISS (dummy content, vocabulaire réel du seed) ────

const blissPillars = [
  {
    key: "a",
    content: {
      archetype: "MAGICIEN",
      citationFondatrice:
        "La beaute africaine n'a jamais eu besoin d'etre decouverte — elle a besoin d'etre liberee.",
      noyauIdentitaire:
        "BLISS est ne d'un refus : celui d'accepter que la beaute africaine doive se conformer a des standards importes. Chaque formule fusionne la science vibranium avec les recettes botaniques panafricaines pour creer une skincare souveraine.",
    },
  },
  {
    key: "d",
    content: {
      secteur: "Beaute / Skincare Premium",
      publicCible:
        "Femmes panafricaines exigeantes, 28-45 ans, fieres de leur heritage et en quete d'une skincare de luxe nee en Afrique.",
      promesseMaitre:
        "Reveler la beaute intrinseque de chaque peau africaine, sans la corriger ni la conformer.",
      accroche: "Le secret etait la depuis toujours.",
      positionnement:
        "Skincare de luxe vibranium, souverainete esthetique panafricaine face aux standards importes.",
      tonDeVoix: {
        registre: "Affirme, fier, sensoriel, jamais defensif.",
        interdits: "Eviter le vocabulaire d'eclaircissement ou de correction.",
      },
      sousPromesses: [
        "Formules vibranium stabilisees compatibles peaux melaniques.",
        "Heritage cosmetique de 14 generations transmis et preserve.",
      ],
      directionArtistique: {
        palette: "Noir profond, or vibranium, terracotta.",
        univers: "Luxe royal wakandais, texture botanique.",
      },
    },
  },
  { key: "v", content: { offre: "Serum Vibranium Glow, Coffret Decouverte, rituels de soin." } },
  { key: "e", content: { engagement: "Communaute des 100 premieres ambassadrices, bouche-a-oreille royal." } },
];

const blissContext: BriefBuilderContext = {
  strategy: { name: "BLISS by Wakanda", pillars: blissPillars },
  campaign: {
    name: "Lancement Serum Vibranium Glow",
    objectives: { description: "Activer la communaute des superfans autour du Serum Vibranium Glow." },
    advertis_vector: { A: 24, D: 25, V: 23, E: 24 },
    budget: 5_000_000,
    budgetCurrency: "XAF",
    startDate: "2026-09-01",
    endDate: "2026-11-30",
  },
  action: {
    title: "Activation flagship Birnin Zana",
    description: "Evenement d'activation au concept store pour la communaute fondatrice.",
    persona: "Ambassadrices fondatrices panafricaines",
    locality: "Birnin Zana",
    touchpoint: "EVENEMENTIEL",
    channel: "EVENEMENTIEL",
    sku: "SERUM-VIB-50ML",
    budgetMin: 2_000_000,
    budgetMax: 4_000_000,
    budgetCurrency: "XAF",
    timingStart: "2026-09-15",
    timingEnd: "2026-10-15",
  },
};

const ALL_TYPES: CampaignBriefType[] = ["CREATIVE", "MEDIA", "VENDOR", "PRODUCTION"];
const SECTION_KEY: Record<CampaignBriefType, string> = {
  CREATIVE: "briefCreatif",
  MEDIA: "briefMedia",
  VENDOR: "briefVendor",
  PRODUCTION: "briefProduction",
};

describe("brief-builder — déterministe, zéro LLM", () => {
  it("produit une forme canonique non-vide pour les 4 types", () => {
    for (const type of ALL_TYPES) {
      const brief = buildCampaignBrief(type, blissContext) as Record<string, unknown>;
      const client = brief.briefClient as Record<string, string>;
      expect(client.client).toBe("BLISS by Wakanda");
      expect((client.contexte_marque ?? "").length).toBeGreaterThan(20);
      expect((client.big_idea ?? "").length).toBeGreaterThan(5);

      const section = brief[SECTION_KEY[type]] as Record<string, string>;
      expect(section, `section ${SECTION_KEY[type]} présente`).toBeDefined();
      // Aucun champ de la section n'est vide.
      for (const [k, v] of Object.entries(section)) {
        if (k === "deadline_prod") continue; // peut être "" si pas de date
        expect(typeof v === "string" && v.length > 0, `${type}.${k} non-vide`).toBe(true);
      }

      const meta = brief.meta as Record<string, unknown>;
      expect(meta.generatedBy).toBe("deterministic-builder");
      expect(meta.briefType).toBe(type);
    }
  });

  it("est strictement déterministe — variance = 0 sur 50 constructions", () => {
    for (const type of ALL_TYPES) {
      const outputs = new Set<string>();
      for (let i = 0; i < 50; i++) {
        outputs.add(JSON.stringify(buildCampaignBrief(type, blissContext)));
      }
      expect(outputs.size, `${type} déterministe`).toBe(1);
    }
  });

  it("propage les données de l'action (persona, localité, touchpoint, budget)", () => {
    const prod = buildCampaignBrief("PRODUCTION", blissContext) as Record<string, unknown>;
    const flat = flattenPillarText(prod);
    expect(flat).toContain("Birnin Zana");
    expect(flat).toContain("EVENEMENTIEL");

    const client = (prod.briefClient as Record<string, string>);
    expect(client.cible_principale).toContain("Ambassadrices");

    const media = buildCampaignBrief("MEDIA", blissContext) as Record<string, unknown>;
    const mediaSection = media.briefMedia as Record<string, string>;
    expect(mediaSection.budget_repartition).toContain("XAF");
    expect(mediaSection.canaux).toContain("EVENEMENTIEL");
  });

  it("synthétise une action depuis la campagne quand aucune action n'est fournie", () => {
    const noAction: BriefBuilderContext = { ...blissContext, action: null };
    const brief = buildCampaignBrief("CREATIVE", noAction) as Record<string, unknown>;
    const creative = brief.briefCreatif as Record<string, string>;
    expect(creative.message_claim).toBe("Lancement Serum Vibranium Glow");
  });

  it("le brief dérivé du noyau ADVE est COHERENT avec l'ADVE (gate C6), jamais DIVERGENT", () => {
    const adveText = blissPillars
      .filter((p) => ["a", "d", "v", "e"].includes(p.key))
      .map((p) => flattenPillarText(p.content))
      .join(" ");
    for (const type of ALL_TYPES) {
      const brief = buildCampaignBrief(type, blissContext);
      const briefText = flattenPillarText(brief);
      const coherence = computeBriefAdveCoherence(briefText, adveText);
      expect(coherence.band, `${type} non-divergent`).not.toBe("DIVERGENT");
    }
  });

  it("le module source ne référence AUCUNE primitive LLM / SDK (zéro LLM structurel)", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/server/services/campaign-manager/brief-builder.ts"),
      "utf-8",
    );
    for (const forbidden of [
      "@anthropic-ai/sdk",
      "anthropic",
      "llm-gateway",
      "callLLM",
      "callLLMAndParse",
      "executeStructuredLLMCall",
      "executeTool",
      "executeFramework",
      "executeSequence",
      "messages.create",
    ]) {
      expect(src.includes(forbidden), `interdit: ${forbidden}`).toBe(false);
    }
  });

  it("briefTitle est lisible et typé", () => {
    expect(briefTitle("CREATIVE", "BLISS")).toBe("Brief Créatif — BLISS");
    expect(briefTitle("PRODUCTION", "BLISS")).toBe("Brief Production — BLISS");
  });
});
