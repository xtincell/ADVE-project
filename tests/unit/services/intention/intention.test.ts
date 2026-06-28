/**
 * intention.test.ts — Porte d'entrée du cycle de vie (ADR-0106).
 *
 * PRODUCTION-LEVEL, ZÉRO MOCK : on teste la logique **déterministe réelle**
 * (schéma du brief, gate de cohérence C6 sur de vraies fonctions pures, décision
 * de validation) sans simuler aucune infrastructure. Les fonctions DB sont de
 * minces orchestrateurs Prisma vérifiés par le chemin de production réel.
 */

import { describe, expect, it } from "vitest";

import {
  IntentionBriefSchema,
  evaluateBriefValidation,
  type IntentionBrief,
} from "@/server/services/intention";
import {
  computeBriefAdveCoherence,
  flattenPillarText,
} from "@/server/services/mestor/gates/brief-adve-coherence-score";

// Noyau ADVE réel (extrait du seed BLISS) — vraie donnée, pas un stub.
const ADVE_FLAT = [
  "BLISS révèle la beauté africaine souveraine, science vibranium et botanique panafricaine, sans la corriger.",
  "Souveraineté esthétique panafricaine vibranium. Femmes panafricaines fières de leur héritage. Ton affirmé fier sensoriel.",
].join(" ");

const COHERENT_BRIEF: IntentionBrief = {
  bigIdea: "Révéler la beauté vibranium panafricaine souveraine",
  briefClient: {
    contexte_business: "Lancer une gamme skincare vibranium pour la communauté fondatrice",
    contexte_marque: "BLISS révèle la beauté africaine sans la corriger, science vibranium et botanique panafricaine",
    cible_principale: "Femmes panafricaines exigeantes fières de leur héritage",
    obj_business: "Activer les ambassadrices autour du sérum vibranium",
  },
  briefCreatif: {
    message_claim: "Le secret était là depuis toujours",
    challenge_creatif: "Traduire la souveraineté esthétique vibranium en exécution distinctive",
    tone_of_voice: "Affirmé, fier, sensoriel",
    messages_cles: ["Formules vibranium stabilisées", "Héritage cosmétique panafricain"],
  },
  rationale_adve: "Décline le noyau identitaire vibranium et la promesse de souveraineté esthétique panafricaine",
};

// Brief d'un univers totalement disjoint de l'ADVE → DIVERGENT attendu.
const DIVERGENT_BRIEF: IntentionBrief = {
  bigIdea: "Tournoi e-sport hivernal crypto",
  briefClient: {
    contexte_business: "Sponsoring blockchain gaming tournament",
    contexte_marque: "Crypto wallet airdrop staking yield farming",
    cible_principale: "Traders NFT degens",
    obj_business: "Mint tokens during esports finals",
  },
  briefCreatif: {
    message_claim: "Stake to win",
    challenge_creatif: "Onboard degens to web3 wallet",
    tone_of_voice: "Hype degen meme",
    messages_cles: ["Airdrop", "Staking rewards"],
  },
  rationale_adve: "Blockchain gaming crypto airdrop staking",
};

describe("IntentionBriefSchema — contrat de sortie LLM + forme manuelle", () => {
  it("valide un brief complet, rejette un brief incomplet", () => {
    expect(IntentionBriefSchema.safeParse(COHERENT_BRIEF).success).toBe(true);
    expect(IntentionBriefSchema.safeParse({ bigIdea: "x" }).success).toBe(false);
  });

  it("messages_cles a un défaut déterministe (tableau vide)", () => {
    const parsed = IntentionBriefSchema.parse({
      ...COHERENT_BRIEF,
      briefCreatif: { ...COHERENT_BRIEF.briefCreatif, messages_cles: undefined } as never,
    });
    expect(parsed.briefCreatif.messages_cles).toEqual([]);
  });
});

describe("gate cohérence C6 réel — intention×ADVE (déterministe, zéro LLM)", () => {
  it("un brief qui décline le noyau ADVE est COHERENT", () => {
    const c = computeBriefAdveCoherence(flattenPillarText(COHERENT_BRIEF), ADVE_FLAT);
    expect(c.band).toBe("COHERENT");
    // déterminisme : variance nulle
    const c2 = computeBriefAdveCoherence(flattenPillarText(COHERENT_BRIEF), ADVE_FLAT);
    expect(c2.score).toBe(c.score);
  });

  it("un brief d'univers disjoint est DIVERGENT", () => {
    const c = computeBriefAdveCoherence(flattenPillarText(DIVERGENT_BRIEF), ADVE_FLAT);
    expect(c.band).toBe("DIVERGENT");
  });
});

describe("evaluateBriefValidation — gate pur", () => {
  it("valide un brief COHERENT", () => {
    expect(evaluateBriefValidation("COHERENT", false)).toEqual({ validated: true });
  });
  it("bloque un brief DIVERGENT sans override", () => {
    expect(evaluateBriefValidation("DIVERGENT", false)).toEqual({ validated: false, blocked: "BRIEF_DIVERGENT_FROM_ADVE" });
  });
  it("accepte un brief DIVERGENT avec override explicite", () => {
    expect(evaluateBriefValidation("DIVERGENT", true)).toEqual({ validated: true });
  });
  it("valide un brief NOT_APPLICABLE (ADVE trop maigre) sans blocage", () => {
    expect(evaluateBriefValidation("NOT_APPLICABLE", false)).toEqual({ validated: true });
  });
});
