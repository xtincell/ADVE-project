/**
 * Dérivation RTIS déterministe — squelette honnête, pas de fausse intelligence.
 *
 * Legacy : les piliers RTIS sont dérivés de l'ADVE via des Intents
 * (`ENRICH_R_FROM_ADVE`, `ENRICH_T_FROM_ADVE_R_SESHAT`, `GENERATE_I_ACTIONS`,
 * `SYNTHESIZE_S`), jamais édités à la main. Ici on porte la partie
 * DÉTERMINISTE de cette dérivation :
 *
 *   R (Risque)    — diagnostic structurel du socle : gaps par pilier (scoring
 *                   réel), SWOT squelette (forces = champs déclarés,
 *                   faiblesses = champs vides), règles de cohérence
 *                   cross-pilier codées en dur.
 *   T (Tracking)  — confrontation marché : seule la perception CIBLE est
 *                   dérivable (du positionnement D). La perception actuelle,
 *                   le TAM/SAM/SOM, les tendances exigent des données terrain
 *                   → null, jamais inventés.
 *   I (Innovation)— exactement 3 actions, chacune dérivée d'une donnée ADVE
 *                   réelle qu'elle cite (ou, à défaut, une action de
 *                   complétion honnête).
 *   S (Stratégie) — synthèse par assemblage de citations réelles + sprint 90j
 *                   dérivé des manques. La roadmap (choix d'ambition) n'est
 *                   pas dérivable → null.
 *
 * Tout contenu produit est marqué `_draft: true` + provenance. Les clés `_*`
 * sont des métadonnées (convention legacy : strippées de l'UI, gardées pour
 * l'audit). Une donnée absente produit un `null` ou une note explicite —
 * JAMAIS un contenu inventé.
 */
import { ADVE_PILLARS, type AdvePillarKey, type RtisPillarKey } from "./pillars";
import { PILLAR_FIELDS, PILLAR_LABELS, getFieldDef } from "./pillar-fields";
import { isFilled, listCount, scorePillarContent } from "./scoring";

export type AdvePillarsContent = Partial<Record<AdvePillarKey, Record<string, unknown> | null>>;
export type RtisDraft = Record<RtisPillarKey, Record<string, unknown>>;

// ── Helpers purs ──────────────────────────────────────────────────────

function str(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length === 0 ? null : t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Premier libellé exploitable d'un item de liste (string ou objet nommé). */
function itemLabel(item: unknown): string | null {
  if (typeof item === "string") return str(item, 80);
  if (item && typeof item === "object") {
    for (const key of ["nom", "name", "titre", "title", "label", "canal", "action", "valeur", "value"]) {
      const v = (item as Record<string, unknown>)[key];
      if (typeof v === "string" && v.trim()) return str(v, 80);
    }
  }
  return null;
}

function firstItemLabel(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    const label = itemLabel(item);
    if (label) return label;
  }
  return null;
}

function draftMeta(derivedFrom: string[]): Record<string, unknown> {
  return {
    _draft: true,
    _method: "deriveRtisDraft",
    _generatedBy: "deterministe",
    _derivedFrom: derivedFrom,
  };
}

// ── R — Risque (diagnostic du socle ADVE) ─────────────────────────────

interface CoherenceRisk {
  pillars: string;
  risk: string;
  detail: string;
}

/** Règles de cohérence cross-pilier — codées en dur, zéro jugement LLM. */
function detectCoherenceRisks(adve: AdvePillarsContent): CoherenceRisk[] {
  const a = adve.A ?? {};
  const d = adve.D ?? {};
  const v = adve.V ?? {};
  const e = adve.E ?? {};
  const risks: CoherenceRisk[] = [];

  if (isFilled(d.promesseMaitre) && !isFilled(d.proofPoints)) {
    risks.push({
      pillars: "D",
      risk: "Promesse maître sans preuve",
      detail: "Une promesse est formulée mais aucun proof point ne la soutient — crédibilité invérifiable.",
    });
  }
  if (isFilled(a.archetype) && !isFilled(d.tonDeVoix)) {
    risks.push({
      pillars: "A→D",
      risk: "Archétype sans expression verbale",
      detail: "L'archétype est déclaré mais le ton de voix est vide — l'identité ne s'entend nulle part.",
    });
  }
  if (listCount(a.valeurs) > 3) {
    risks.push({
      pillars: "A",
      risk: "Dilution des valeurs",
      detail: `${listCount(a.valeurs)} valeurs déclarées — le canon en tolère 3 maximum, une marque forte se concentre.`,
    });
  }
  if (isFilled(d.positionnement) && !isFilled(d.paysageConcurrentiel)) {
    risks.push({
      pillars: "D",
      risk: "Positionnement sans paysage concurrentiel",
      detail: "« Pourquoi nous et pas un autre » est posé sans nommer les autres — différenciation invérifiable.",
    });
  }
  if (isFilled(v.produitsCatalogue) && !isFilled(v.promesseDeValeur)) {
    risks.push({
      pillars: "V",
      risk: "Catalogue sans proposition de valeur",
      detail: "Des produits existent mais le bénéfice client global n'est pas formulé.",
    });
  }
  if (isFilled(e.rituels) && !isFilled(e.touchpoints)) {
    risks.push({
      pillars: "E",
      risk: "Rituels sans points de contact",
      detail: "Des rituels sont déclarés mais aucun point de contact ne les porte.",
    });
  }
  return risks;
}

function deriveR(adve: AdvePillarsContent): Record<string, unknown> {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const pillarGaps: Record<string, { score: number; gaps: string[] }> = {};

  for (const key of ADVE_PILLARS) {
    const fields = PILLAR_FIELDS[key];
    const result = scorePillarContent(adve[key], fields);
    pillarGaps[key.toLowerCase()] = {
      score: result.score,
      gaps: result.missing.map((id) => getFieldDef(key, id)?.label ?? id),
    };
    for (const field of fields) {
      if (!field.needsHuman) continue;
      if (result.filled.includes(field.id)) {
        strengths.push(`${PILLAR_LABELS[key]} — « ${field.label} » est déclaré.`);
      } else {
        weaknesses.push(`${PILLAR_LABELS[key]} — « ${field.label} » manquant (décision non posée).`);
      }
    }
  }

  const coherenceRisks = detectCoherenceRisks(adve);
  const mitigationPriorities = [
    ...coherenceRisks.map((r) => ({
      action: `Résoudre : ${r.risk} — ${r.detail}`,
      owner: "Opérateur",
      source: `coherence:${r.pillars}`,
    })),
    ...weaknesses.slice(0, 5).map((w) => ({
      action: `Compléter : ${w}`,
      owner: "Fondateur",
      source: "pillarGaps",
    })),
  ];

  return {
    ...draftMeta(["A", "D", "V", "E"]),
    globalSwot: {
      strengths,
      weaknesses,
      opportunities: [],
      threats: [],
      note: "Opportunités et menaces non dérivables du socle — à alimenter par l'analyse marché (pilier Tracking).",
    },
    pillarGaps,
    coherenceRisks,
    probabilityImpactMatrix: [],
    mitigationPriorities,
  };
}

// ── T — Tracking (réalité marché) ─────────────────────────────────────

function deriveT(adve: AdvePillarsContent): Record<string, unknown> {
  const positionnement = str(adve.D?.positionnement);
  const secteur = str(adve.A?.secteur, 60);

  return {
    ...draftMeta(["D.positionnement", "A.secteur"]),
    overtonPosition: null,
    perceptionGap: positionnement
      ? {
          targetPerception: positionnement,
          currentPerception: null,
          gapDescription:
            "Perception cible dérivée du positionnement (D). Perception actuelle non mesurée — l'écart n'est pas calculable sans donnée marché réelle.",
        }
      : null,
    tamSamSom: null,
    marketReality: null,
    note: secteur
      ? `Mesures marché à collecter pour le secteur « ${secteur} » : perception, taille de marché, tendances. Rien n'est estimé à votre place.`
      : "Mesures marché à collecter : perception, taille de marché, tendances. Rien n'est estimé à votre place.",
  };
}

// ── I — Innovation (3 actions dérivées de données réelles) ────────────

interface InnovationAction {
  action: string;
  canal: string;
  source: string;
}

function deriveI(adve: AdvePillarsContent): Record<string, unknown> {
  const a = adve.A ?? {};
  const d = adve.D ?? {};
  const e = adve.E ?? {};
  const actions: InnovationAction[] = [];

  const canal = firstItemLabel(e.touchpoints);
  if (canal) {
    actions.push({
      action: `Systématiser le point de contact « ${canal} » avec un rituel récurrent qui crée l'habitude.`,
      canal,
      source: "E.touchpoints",
    });
  }
  const persona = firstItemLabel(d.personas);
  if (actions.length < 3 && persona) {
    actions.push({
      action: `Concevoir une offre ou un contenu d'entrée dédié au persona « ${persona} ».`,
      canal: "GENERAL",
      source: "D.personas",
    });
  }
  const archetype = str(a.archetype, 40);
  if (actions.length < 3 && archetype) {
    actions.push({
      action: `Décliner l'archétype « ${archetype} » en une série de contenus signature reconnaissables.`,
      canal: "CONTENU",
      source: "A.archetype",
    });
  }
  const valeur = firstItemLabel(a.valeurs);
  if (actions.length < 3 && valeur) {
    actions.push({
      action: `Traduire la valeur « ${valeur} » en un engagement public vérifiable.`,
      canal: "GENERAL",
      source: "A.valeurs",
    });
  }

  // Complétion honnête : sans donnée source, l'action est de créer la donnée.
  const fallbacks: InnovationAction[] = [
    {
      action: "Compléter les points de contact (E) — aucune innovation de canal n'est dérivable sans eux.",
      canal: "GENERAL",
      source: "manque:E.touchpoints",
    },
    {
      action: "Compléter les personas (D) — aucune innovation d'offre n'est dérivable sans cible.",
      canal: "GENERAL",
      source: "manque:D.personas",
    },
    {
      action: "Déclarer l'archétype (A) — aucune innovation de contenu n'est dérivable sans identité narrative.",
      canal: "GENERAL",
      source: "manque:A.archetype",
    },
  ];
  for (const fb of fallbacks) {
    if (actions.length >= 3) break;
    if (!actions.some((x) => x.source === fb.source.replace("manque:", ""))) actions.push(fb);
  }

  const parCanal: Record<string, InnovationAction[]> = {};
  for (const action of actions.slice(0, 3)) {
    (parCanal[action.canal] ??= []).push(action);
  }

  return {
    ...draftMeta(["A", "D", "E"]),
    catalogueParCanal: parCanal,
    innovationsProduit: [],
    bigIdea: null,
    note: "La Big Idea relève de la création pure — jamais dérivée mécaniquement. Catalogue à étoffer en atelier.",
  };
}

// ── S — Stratégie (synthèse par assemblage de citations réelles) ──────

function deriveS(adve: AdvePillarsContent): Record<string, unknown> {
  const promesse = str(adve.A?.promesseFondamentale);
  const positionnement = str(adve.D?.positionnement);
  const promesseValeur = str(adve.V?.promesseDeValeur);

  const visionParts: string[] = [];
  if (promesse) visionParts.push(`Fondation : « ${promesse} »`);
  if (positionnement) visionParts.push(`Cap marché : « ${positionnement} »`);
  const visionStrategique =
    visionParts.length > 0
      ? `[DRAFT à réécrire par l'opérateur] ${visionParts.join(" · ")}`
      : null;

  const axes: Array<{ axe: string; pillarsLinked: string[]; kpis: string[] }> = [];
  if (isFilled(adve.A?.archetype) || isFilled(adve.A?.valeurs)) {
    axes.push({ axe: "Ancrer l'identité déclarée (archétype, valeurs) dans chaque prise de parole.", pillarsLinked: ["A", "D"], kpis: [] });
  }
  if (isFilled(adve.V?.produitsCatalogue) || promesseValeur) {
    axes.push({ axe: "Aligner l'offre sur la promesse — chaque produit prouve la proposition de valeur.", pillarsLinked: ["V", "D"], kpis: [] });
  }
  if (isFilled(adve.E?.touchpoints) || isFilled(adve.E?.rituels)) {
    axes.push({ axe: "Installer les rituels d'engagement sur les points de contact déclarés.", pillarsLinked: ["E", "A"], kpis: [] });
  }

  // Sprint 90 jours = combler les manques du socle, dans l'ordre de la cascade.
  const sprint: Array<{ action: string; owner: string; kpi: string }> = [];
  for (const key of ADVE_PILLARS) {
    const result = scorePillarContent(adve[key], PILLAR_FIELDS[key]);
    for (const id of result.missing) {
      if (sprint.length >= 5) break;
      const field = getFieldDef(key, id);
      if (!field) continue;
      sprint.push({
        action: `Renseigner « ${field.label} » (pilier ${PILLAR_LABELS[key]}).`,
        owner: field.needsHuman ? "Fondateur" : "Opérateur",
        kpi: "Champ déclaré et validé",
      });
    }
    if (sprint.length >= 5) break;
  }

  return {
    ...draftMeta(["A", "D", "V", "E"]),
    visionStrategique,
    axesStrategiques: axes,
    sprint90Days: sprint,
    roadmap: null,
    note: "La roadmap est un choix d'ambition de l'opérateur — elle ne se dérive pas mécaniquement.",
  };
}

// ── Point d'entrée ────────────────────────────────────────────────────

/**
 * Dérive un draft RTIS complet depuis le socle ADVE. Déterministe :
 * même socle → même draft. Chaque pilier est marqué `_draft: true` et
 * ne contient que du contenu dérivé de données réelles (ou des manques
 * explicites) — le raffinement éditorial reste un travail d'opérateur
 * (ou d'IA, en aval, hors de ce module).
 */
export function deriveRtisDraft(adve: AdvePillarsContent): RtisDraft {
  return {
    R: deriveR(adve),
    T: deriveT(adve),
    I: deriveI(adve),
    S: deriveS(adve),
  };
}
