/**
 * Oracle catalog (Phase 24) — consult-before-arming.
 *
 * Answers, for every one of the 35 Oracle sections: what it IS (subtitle +
 * description), the runner that PRODUCES it (Glory sequence / tool / framework /
 * pure mapper), the ADVERTIS variables it CONSUMES, the BrandAsset it PRODUCES,
 * what it COSTS (deterministic = free vs LLM = billed), and how it feeds the
 * Oracle (number + tier). Pure resolver over the existing registries — no DB.
 *
 * `SECTION_DOCS` carries the per-section subtitle/description the section
 * registry historically lacked (the "modules sans intention claire" gap). The
 * resolver falls back to the runner's own description and flags sections that
 * still have no documentation source (`hasGap`) instead of hiding the hole.
 */

import { SECTION_REGISTRY, resolveSectionRunner } from "./types";
import type { SectionTier } from "./types";
import { getGloryTool, getSequence } from "@/server/services/glory-tools";
import { getFramework } from "@/server/services/artemis/frameworks";
import { estimateSequenceCost } from "@/server/services/artemis/tools/sequence-cost";
import { PILLAR_KEYS } from "@/domain/pillars";

const ADVE_RTIS = new Set<string>(PILLAR_KEYS as readonly string[]);

export type CatalogCostClass = "DETERMINISTIC" | "LLM" | "UNKNOWN";

export interface OracleCatalogEntry {
  number: string;
  id: string;
  title: string;
  subtitle: string | null;
  /** Effective description: section doc → runner description → null. */
  description: string | null;
  tier: SectionTier;
  personas: string[];
  /** BrandAsset.kind produced. */
  produces: string | null;
  /** The mechanism that produces this section. */
  runner: { kind: string; ref: string } | null;
  runnerName: string | null;
  /** ADVE-RTIS letters consumed (A..S). Empty for pure mappers (derived from the assembled pillars). */
  consumesPillars: string[];
  cost: { class: CatalogCostClass; llmSteps: number; estimateUsd: number };
  /** True when neither a section doc nor a runner description exists — a real gap to fill. */
  hasGap: boolean;
}

/**
 * Per-section subtitle + description. This is the canonical documentation for
 * the 23 PURE_MAPPER sections (whose mapper functions carry no description) and
 * a human-readable layer over the sequence/framework-backed ones.
 */
const SECTION_DOCS: Record<string, { subtitle: string; description: string }> = {
  "executive-summary": { subtitle: "Synthèse exécutive", description: "Résumé d'une page : vecteur ADVERTIS, classification, forces/faiblesses, highlights — la porte d'entrée du dossier." },
  "contexte-defi": { subtitle: "Contexte & défi", description: "Le décor business, l'ennemi à abattre et la prophétie de marque. Pose le problème que la marque résout." },
  "plateforme-strategique": { subtitle: "Plateforme stratégique", description: "Archétype, doctrine, ikigai, positionnement, promesse maître — le socle identitaire ADVE." },
  "proposition-valeur": { subtitle: "Proposition de valeur", description: "Pricing, preuves, garanties, pipeline d'innovation, unit economics — pourquoi on paie." },
  "territoire-creatif": { subtitle: "Territoire créatif", description: "Direction artistique : concept, moodboard, stratégie chromatique, typographie, KV — l'univers visuel." },
  "experience-engagement": { subtitle: "Expérience & engagement", description: "Touchpoints, rituels, parcours de dévotion, stratégie communautaire — comment la marque crée du lien." },
  "swot-interne": { subtitle: "SWOT interne (Risk)", description: "Forces/faiblesses internes, mitigations et score de résilience, dérivés du pilier R." },
  "swot-externe": { subtitle: "SWOT externe (Track)", description: "Marché (TAM/SAM/SOM), concurrents, tendances, brand-market fit — la lecture du dehors (pilier T)." },
  "signaux-opportunites": { subtitle: "Signaux & opportunités", description: "Signaux faibles, fenêtres de prise de parole, références Seshat — où frapper maintenant." },
  "catalogue-actions": { subtitle: "Catalogue d'actions", description: "Toutes les actions possibles du pilier I, homogénéisées par canal et par pilier (projection BrandAction)." },
  "plan-activation": { subtitle: "Plan d'activation", description: "Campagnes, boucle AARRR, touchpoints, rituels, drivers — l'orchestration opérationnelle." },
  "fenetre-overton": { subtitle: "Fenêtre d'Overton", description: "Perception actuelle → cible, stratégie de déplacement, roadmap, jalons — bouger la ligne du secteur." },
  "medias-distribution": { subtitle: "Médias & distribution", description: "Drivers média, planner digital, actions média — où et comment diffuser." },
  "production-livrables": { subtitle: "Production & livrables", description: "Missions de production et livrables Glory par couche — ce qui sort concrètement." },
  "profil-superfan": { subtitle: "Profil superfan", description: "Portrait du superfan, parcours de dévotion cible, métriques (actifs/prescripteurs/ratio)." },
  "kpis-mesure": { subtitle: "KPIs & mesure", description: "Tableau de KPIs, dévotion, Cult Index, superfans, AARRR — comment on mesure le succès." },
  "croissance-evolution": { subtitle: "Croissance & évolution", description: "Boucles de croissance, stratégie d'expansion, évolution de marque, pipeline d'innovation." },
  "budget": { subtitle: "Budget", description: "Unit economics, budgets de campagne, ventilation — le coût et l'allocation." },
  "timeline-gouvernance": { subtitle: "Timeline & gouvernance", description: "Rétroplanning des campagnes, jalons et gouvernance d'équipe." },
  "equipe": { subtitle: "Équipe", description: "Opérateur, fondateur, équipe, complémentarité, évaluation Berkus." },
  "conditions-etapes": { subtitle: "Conditions & prochaines étapes", description: "Client, contrats, prochaines étapes, statut de la stratégie — le passage à l'action." },
  "imhotep-crew-program": { subtitle: "Crew Program (Imhotep)", description: "Programme d'équipe : matching talents, formation Académie, contrôle qualité — produit par Imhotep." },
  "anubis-plan-comms": { subtitle: "Plan Comms (Anubis)", description: "Plan de communication multi-canal : broadcast, ad networks, email/SMS — produit par Anubis." },
  "mckinsey-7s": { subtitle: "McKinsey 7S", description: "Diagnostic d'alignement organisationnel sur 7 leviers (strategy, structure, systems, staff, skills, style, shared values)." },
  "bcg-portfolio": { subtitle: "BCG Growth-Share", description: "Matrice de portefeuille croissance/part de marché (stars, cash cows, dogs, question marks)." },
  "bain-nps": { subtitle: "Bain NPS", description: "Net Promoter System : promoteurs vs détracteurs et boucle de recommandation." },
  "deloitte-greenhouse": { subtitle: "Deloitte Greenhouse", description: "Programme talents/innovation type lab — montée en compétence de l'équipe." },
  "mckinsey-3-horizons": { subtitle: "McKinsey 3 Horizons", description: "Trois horizons de croissance : cœur de métier (H1), relais émergent (H2), options futures (H3)." },
  "bcg-strategy-palette": { subtitle: "BCG Strategy Palette", description: "Choix de posture stratégique selon la prévisibilité et la malléabilité de l'environnement." },
  "deloitte-budget": { subtitle: "Deloitte Budget", description: "Cadre de budgétisation stratégique — allocation par horizon et par initiative." },
  "cult-index": { subtitle: "Cult Index", description: "Score de masse culturelle : à quel point la marque génère une dévotion organique. Distinctif La Fusée." },
  "manipulation-matrix": { subtitle: "Manipulation Matrix", description: "Les 4 modes (peddler / dealer / facilitator / entertainer) qui transforment l'audience en propellant." },
  "devotion-ladder": { subtitle: "Devotion Ladder", description: "Hiérarchie des superfans, du curieux au prescripteur — l'échelle d'engagement." },
  "overton-distinctive": { subtitle: "Overton distinctif", description: "Position de la marque dans la fenêtre culturelle du secteur, alimentée par un signal réel (vs placebo)." },
  "tarsis-weak-signals": { subtitle: "Tarsis — signaux faibles", description: "Détection des signaux faibles sectoriels par Tarsis — l'alerte précoce." },
};

/** Aggregate the ADVE-RTIS pillars consumed across a sequence's steps. */
function pillarsFromSequence(seqKey: string): string[] {
  const seq = getSequence(seqKey as Parameters<typeof getSequence>[0]);
  if (!seq) return [];
  const out = new Set<string>();
  if (seq.pillar) out.add(seq.pillar.toUpperCase());
  for (const step of seq.steps) {
    if (step.status !== "ACTIVE") continue;
    if (step.type === "PILLAR") {
      if (step.ref) out.add(step.ref.toUpperCase());
    } else if (step.type === "GLORY") {
      getGloryTool(step.ref)?.pillarKeys.forEach((k) => out.add(k.toUpperCase()));
    } else if (step.type === "ARTEMIS") {
      getFramework(step.ref)?.pillarKeys.forEach((k) => out.add(k.toUpperCase()));
    }
  }
  return [...out].filter((k) => ADVE_RTIS.has(k));
}

const onlyAdveRtis = (keys: string[]): string[] => keys.map((k) => k.toUpperCase()).filter((k) => ADVE_RTIS.has(k));

/** Build the full 35-section catalog. Pure, deterministic, no DB. */
export function buildOracleCatalog(): OracleCatalogEntry[] {
  return SECTION_REGISTRY.map((meta) => {
    const runner = resolveSectionRunner(meta);
    const doc = SECTION_DOCS[meta.id] ?? null;

    let runnerName: string | null = null;
    let runnerDescription: string | null = null;
    let consumesPillars: string[] = [];
    let cost: OracleCatalogEntry["cost"] = { class: "DETERMINISTIC", llmSteps: 0, estimateUsd: 0 };

    if (runner) {
      if (runner.kind === "GLORY_SEQUENCE") {
        const seq = getSequence(runner.ref as Parameters<typeof getSequence>[0]);
        if (seq) {
          runnerName = seq.name;
          runnerDescription = seq.description;
          consumesPillars = pillarsFromSequence(runner.ref);
          const c = estimateSequenceCost(seq);
          cost = { class: c.costClass, llmSteps: c.llmSteps, estimateUsd: c.estimateUsd };
        } else {
          runnerName = runner.ref;
          cost = { class: "UNKNOWN", llmSteps: 0, estimateUsd: 0 };
        }
      } else if (runner.kind === "GLORY_TOOL") {
        const tool = getGloryTool(runner.ref);
        if (tool) {
          runnerName = tool.name;
          runnerDescription = tool.description;
          consumesPillars = onlyAdveRtis(tool.pillarKeys);
          const llm = tool.executionType === "LLM" || tool.executionType === "HYBRID" ? 1 : 0;
          cost = { class: llm ? "LLM" : "DETERMINISTIC", llmSteps: llm, estimateUsd: llm * 0.1 };
        } else {
          runnerName = runner.ref;
          cost = { class: "UNKNOWN", llmSteps: 0, estimateUsd: 0 };
        }
      } else if (runner.kind === "FRAMEWORK") {
        const fw = getFramework(runner.ref);
        if (fw) {
          runnerName = fw.name;
          runnerDescription = fw.description;
          consumesPillars = onlyAdveRtis(fw.pillarKeys);
          cost = { class: "LLM", llmSteps: 1, estimateUsd: 0.1 };
        } else {
          runnerName = runner.ref;
          cost = { class: "UNKNOWN", llmSteps: 0, estimateUsd: 0 };
        }
      } else if (runner.kind === "PURE_MAPPER") {
        // Deterministic composition over the already-assembled pillars — free.
        runnerName = runner.ref;
        cost = { class: "DETERMINISTIC", llmSteps: 0, estimateUsd: 0 };
      }
    }

    return {
      number: meta.number,
      id: meta.id,
      title: meta.title,
      subtitle: doc?.subtitle ?? null,
      description: doc?.description ?? runnerDescription ?? null,
      tier: meta.tier ?? "CORE",
      personas: meta.personas,
      produces: meta.brandAssetKind ?? null,
      runner: runner ? { kind: runner.kind, ref: runner.ref } : null,
      runnerName,
      consumesPillars,
      cost,
      hasGap: !doc?.description && !runnerDescription,
    } satisfies OracleCatalogEntry;
  });
}
