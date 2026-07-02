/**
 * Vues éditoriales par thème — mapping pur thème → champs de piliers EXISTANTS.
 *
 * Port de l'esprit des pages legacy `(cockpit)/cockpit/brand/positioning`,
 * `proposition` et `offer` : le cockpit marque ne présente pas que des piliers
 * bruts, il regroupe les champs par question business. En v7 ces pages sont
 * des VUES — zéro donnée nouvelle, zéro table : chaque carte lit un champ réel
 * de `PILLAR_FIELDS` et renvoie vers l'éditeur du pilier concerné.
 *
 * Règle : tout `ThemeFieldRef` DOIT résoudre vers un champ existant de la
 * bible (`getFieldDef`) — vérifié par tests/pillar-views.test.ts. Un champ
 * peut apparaître dans plusieurs thèmes (ce sont des vues, pas des données).
 *
 * Pur TS, zéro IO.
 */
import type { PillarKey } from "./pillars";
import { getFieldDef, type FieldDef } from "./pillar-fields";

export interface ThemeFieldRef {
  pillar: PillarKey;
  fieldId: string;
}

export interface ThemeGroupDef {
  /** Titre FR du groupe de champs. */
  titre: string;
  /** Une ligne d'intention éditoriale (FR). */
  intent: string;
  fields: ThemeFieldRef[];
}

export interface ThemeViewDef {
  id: ThemeViewId;
  /** Titre FR de la page. */
  titre: string;
  /** Sous-titre FR (la question business à laquelle la vue répond). */
  question: string;
  groups: ThemeGroupDef[];
}

export const THEME_VIEW_IDS = ["positionnement", "proposition", "offre"] as const;
export type ThemeViewId = (typeof THEME_VIEW_IDS)[number];

// ── positionnement — port de brand/positioning ────────────────────────
// « Comment votre marque se distingue sur le marché. »

const POSITIONNEMENT: ThemeViewDef = {
  id: "positionnement",
  titre: "Positionnement",
  question: "Comment votre marque se distingue-t-elle sur son marché ?",
  groups: [
    {
      titre: "Socle identitaire",
      intent: "Ce que la marque EST — le positionnement s'appuie dessus, jamais l'inverse.",
      fields: [
        { pillar: "A", fieldId: "archetype" },
        { pillar: "A", fieldId: "noyauIdentitaire" },
        { pillar: "A", fieldId: "valeurs" },
      ],
    },
    {
      titre: "Position sur le marché",
      intent: "La réponse à « pourquoi nous et pas un autre ? », face à des concurrents nommés.",
      fields: [
        { pillar: "D", fieldId: "positionnement" },
        { pillar: "D", fieldId: "promesseMaitre" },
        { pillar: "D", fieldId: "positionnementEmotionnel" },
        { pillar: "D", fieldId: "paysageConcurrentiel" },
      ],
    },
    {
      titre: "Expression",
      intent: "Comment la position s'entend : voix et vocabulaire propriétaire.",
      fields: [
        { pillar: "D", fieldId: "tonDeVoix" },
        { pillar: "D", fieldId: "assetsLinguistiques" },
      ],
    },
    {
      titre: "Cibles",
      intent: "Pour qui la distinction doit compter.",
      fields: [
        { pillar: "A", fieldId: "publicCible" },
        { pillar: "D", fieldId: "personas" },
      ],
    },
    {
      titre: "Preuves",
      intent: "Ce qui rend la position crédible — faits, jamais des adjectifs.",
      fields: [{ pillar: "D", fieldId: "proofPoints" }],
    },
  ],
};

// ── proposition — la chaîne de promesses ──────────────────────────────
// Port de l'esprit de brand/proposition : la proposition de la marque,
// de la conviction fondatrice à l'expérience vécue, preuves à l'appui.

const PROPOSITION: ThemeViewDef = {
  id: "proposition",
  titre: "Proposition",
  question: "Quelle promesse votre marque fait-elle, et qu'est-ce qui la rend crédible ?",
  groups: [
    {
      titre: "La conviction",
      intent: "D'où part la promesse — la croyance fondatrice, verbatim.",
      fields: [
        { pillar: "A", fieldId: "promesseFondamentale" },
        { pillar: "A", fieldId: "citationFondatrice" },
      ],
    },
    {
      titre: "La promesse au client",
      intent: "La même promesse déclinée : marché (D), offre (V), expérience (E).",
      fields: [
        { pillar: "D", fieldId: "promesseMaitre" },
        { pillar: "V", fieldId: "promesseDeValeur" },
        { pillar: "E", fieldId: "promesseExperience" },
      ],
    },
    {
      titre: "La valeur tangible",
      intent: "Ce que le client gagne concrètement, et pourquoi ce prix est juste.",
      fields: [
        { pillar: "V", fieldId: "valeurClientTangible" },
        { pillar: "V", fieldId: "pricingJustification" },
      ],
    },
    {
      titre: "Les preuves",
      intent: "Chiffres, témoignages, résultats réels — jamais estimés à votre place.",
      fields: [
        { pillar: "D", fieldId: "proofPoints" },
        { pillar: "V", fieldId: "roiProofs" },
      ],
    },
  ],
};

// ── offre — port de brand/offer ───────────────────────────────────────
// « Votre proposition de valeur et votre modèle économique. »

const OFFRE: ThemeViewDef = {
  id: "offre",
  titre: "Offre & pricing",
  question: "Que vend votre marque, à quel prix, et comment capture-t-elle la valeur ?",
  groups: [
    {
      titre: "Catalogue",
      intent: "L'offre réelle, du produit d'entrée au palier premium.",
      fields: [
        { pillar: "V", fieldId: "produitsCatalogue" },
        { pillar: "V", fieldId: "productLadder" },
      ],
    },
    {
      titre: "Modèle économique",
      intent: "Comment la valeur est capturée — avec les chiffres réels, jamais estimés.",
      fields: [
        { pillar: "V", fieldId: "businessModel" },
        { pillar: "V", fieldId: "unitEconomics" },
        { pillar: "V", fieldId: "pricingJustification" },
      ],
    },
    {
      titre: "Bénéfice client",
      intent: "Le gain concret pour le client, prouvé par des résultats réels.",
      fields: [
        { pillar: "V", fieldId: "promesseDeValeur" },
        { pillar: "V", fieldId: "valeurClientTangible" },
        { pillar: "V", fieldId: "roiProofs" },
      ],
    },
    {
      titre: "À qui l'offre s'adresse",
      intent: "L'offre n'existe que face à un public — le sien.",
      fields: [
        { pillar: "A", fieldId: "publicCible" },
        { pillar: "D", fieldId: "personas" },
      ],
    },
  ],
};

// ── Registre ──────────────────────────────────────────────────────────

export const THEME_VIEWS: Record<ThemeViewId, ThemeViewDef> = {
  positionnement: POSITIONNEMENT,
  proposition: PROPOSITION,
  offre: OFFRE,
};

export function getThemeView(id: string): ThemeViewDef | undefined {
  return (THEME_VIEW_IDS as readonly string[]).includes(id)
    ? THEME_VIEWS[id as ThemeViewId]
    : undefined;
}

/** Tous les refs d'un thème, aplatis (utilitaire stats/tests). */
export function themeFieldRefs(view: ThemeViewDef): ThemeFieldRef[] {
  return view.groups.flatMap((group) => group.fields);
}

/** Résolution d'un ref vers sa définition de champ. `undefined` si inconnu. */
export function resolveThemeField(ref: ThemeFieldRef): FieldDef | undefined {
  return getFieldDef(ref.pillar, ref.fieldId);
}
