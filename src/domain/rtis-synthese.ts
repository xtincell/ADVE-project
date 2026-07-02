/**
 * Synthèse RTIS — composition déterministe et LISIBLE des 4 piliers dérivés.
 *
 * Port de l'esprit de `legacy/(cockpit)/cockpit/brand/rtis/synthese` (vision,
 * axes stratégiques, sprint 90 jours, risques, réalité marché, potentiel),
 * réduit à ce que la dérivation v7 (`deriveRtisDraft`) produit réellement.
 *
 * Doctrine d'honnêteté : ce module ne fait que METTRE EN FORME des données
 * présentes dans les piliers R/T/I/S — coercitions sûres, jamais d'invention.
 * Une donnée absente produit un tableau vide ou un null que l'UI affiche
 * comme un manque explicite.
 *
 * Pur TS, zéro IO. Même entrée → même sortie.
 */
import type { RtisPillarKey } from "./pillars";

export type RtisPillarsContent = Partial<
  Record<RtisPillarKey, Record<string, unknown> | null>
>;

// ── Coercitions sûres (tolérantes aux shapes hérités) ─────────────────

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? str(item) : null))
    .filter((s): s is string => s !== null);
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function recordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item !== null && typeof item === "object" && !Array.isArray(item))
    .map((item) => item as Record<string, unknown>);
}

// ── Structure de la synthèse ──────────────────────────────────────────

export interface SyntheseAxe {
  axe: string;
  pillarsLinked: string[];
  kpis: string[];
}

export interface SyntheseSprintItem {
  action: string;
  owner: string | null;
  kpi: string | null;
}

export interface SyntheseCoherenceRisk {
  pillars: string;
  risk: string;
  detail: string;
}

export interface SyntheseMitigation {
  action: string;
  owner: string | null;
  source: string | null;
}

export interface SyntheseMarche {
  /** Perception cible (dérivée du positionnement D) — null si non dérivable. */
  targetPerception: string | null;
  /** Perception actuelle — null tant qu'aucune mesure terrain n'existe. */
  currentPerception: string | null;
  gapDescription: string | null;
  /** Note de dérivation du pilier T (mesures à collecter). */
  note: string | null;
}

export interface SynthesePotentielAction {
  action: string;
  source: string | null;
}

export interface SynthesePotentielCanal {
  canal: string;
  actions: SynthesePotentielAction[];
}

export interface RtisSynthese {
  /** true si au moins un des 4 piliers dérivés a été écrit (dérivation passée). */
  derived: boolean;
  /** S.visionStrategique (draft à réécrire par l'opérateur) — null si absent. */
  vision: string | null;
  /** S.axesStrategiques. */
  axes: SyntheseAxe[];
  /** S.sprint90Days. */
  sprint: SyntheseSprintItem[];
  /** Note de dérivation du pilier S (roadmap = choix d'ambition). */
  strategieNote: string | null;
  risques: {
    /** R.globalSwot.strengths. */
    forces: string[];
    /** R.globalSwot.weaknesses. */
    faiblesses: string[];
    /** R.globalSwot.note (quadrants non dérivables). */
    swotNote: string | null;
    /** R.coherenceRisks — contradictions cross-pilier détectées. */
    coherence: SyntheseCoherenceRisk[];
    /** R.mitigationPriorities. */
    mitigations: SyntheseMitigation[];
  };
  marche: SyntheseMarche;
  /** I.catalogueParCanal, aplati en liste canal → actions. */
  potentiel: SynthesePotentielCanal[];
  /** Note de dérivation du pilier I (Big Idea = création pure). */
  potentielNote: string | null;
}

// ── Lecture des piliers (chaque bloc cite sa source) ──────────────────

/** Le pilier a-t-il été écrit au moins une fois (dérivation passée) ? */
function pillarExists(content: Record<string, unknown> | null | undefined): boolean {
  return content !== null && content !== undefined && Object.keys(content).length > 0;
}

function readAxes(s: Record<string, unknown>): SyntheseAxe[] {
  return recordArray(s["axesStrategiques"])
    .map((raw) => ({
      axe: str(raw["axe"]) ?? "",
      pillarsLinked: strArray(raw["pillarsLinked"]),
      kpis: strArray(raw["kpis"]),
    }))
    .filter((axe) => axe.axe.length > 0);
}

function readSprint(s: Record<string, unknown>): SyntheseSprintItem[] {
  return recordArray(s["sprint90Days"])
    .map((raw) => ({
      action: str(raw["action"]) ?? "",
      owner: str(raw["owner"]),
      kpi: str(raw["kpi"]),
    }))
    .filter((item) => item.action.length > 0);
}

function readCoherence(r: Record<string, unknown>): SyntheseCoherenceRisk[] {
  return recordArray(r["coherenceRisks"])
    .map((raw) => ({
      pillars: str(raw["pillars"]) ?? "",
      risk: str(raw["risk"]) ?? "",
      detail: str(raw["detail"]) ?? "",
    }))
    .filter((risk) => risk.risk.length > 0);
}

function readMitigations(r: Record<string, unknown>): SyntheseMitigation[] {
  return recordArray(r["mitigationPriorities"])
    .map((raw) => ({
      action: str(raw["action"]) ?? "",
      owner: str(raw["owner"]),
      source: str(raw["source"]),
    }))
    .filter((item) => item.action.length > 0);
}

function readMarche(t: Record<string, unknown>): SyntheseMarche {
  const gap = record(t["perceptionGap"]);
  return {
    targetPerception: str(gap["targetPerception"]),
    currentPerception: str(gap["currentPerception"]),
    gapDescription: str(gap["gapDescription"]),
    note: str(t["note"]),
  };
}

function readPotentiel(i: Record<string, unknown>): SynthesePotentielCanal[] {
  const parCanal = record(i["catalogueParCanal"]);
  const out: SynthesePotentielCanal[] = [];
  for (const [canal, value] of Object.entries(parCanal)) {
    const actions = recordArray(value)
      .map((raw) => ({
        action: str(raw["action"]) ?? "",
        source: str(raw["source"]),
      }))
      .filter((action) => action.action.length > 0);
    if (actions.length > 0) out.push({ canal, actions });
  }
  // Ordre stable (clé de canal) — déterminisme d'affichage.
  return out.sort((a, b) => a.canal.localeCompare(b.canal, "fr"));
}

// ── Point d'entrée ────────────────────────────────────────────────────

/**
 * Compose la synthèse lisible des 4 piliers dérivés. Chaque bloc provient
 * d'un champ RTIS réel ; les piliers absents produisent des blocs vides.
 */
export function composeRtisSynthese(pillars: RtisPillarsContent): RtisSynthese {
  const r = record(pillars.R);
  const t = record(pillars.T);
  const i = record(pillars.I);
  const s = record(pillars.S);
  const swot = record(r["globalSwot"]);

  return {
    derived:
      pillarExists(pillars.R) ||
      pillarExists(pillars.T) ||
      pillarExists(pillars.I) ||
      pillarExists(pillars.S),
    vision: str(s["visionStrategique"]),
    axes: readAxes(s),
    sprint: readSprint(s),
    strategieNote: str(s["note"]),
    risques: {
      forces: strArray(swot["strengths"]),
      faiblesses: strArray(swot["weaknesses"]),
      swotNote: str(swot["note"]),
      coherence: readCoherence(r),
      mitigations: readMitigations(r),
    },
    marche: readMarche(t),
    potentiel: readPotentiel(i),
    potentielNote: str(i["note"]),
  };
}
