/**
 * Mission Templates — Pre-configured deliverable types backed by GLORY sequences
 *
 * Each template represents a concrete deliverable that a client can order:
 *   "Campagne de Lancement" → LAUNCH sequence
 *   "Collab Influenceur"    → INFLUENCE sequence
 *   "Spot Pub Vidéo"        → SPOT-VIDEO sequence
 *
 * Templates are the bridge between the business layer (missions, campaigns)
 * and the execution layer (GLORY sequences). When an operator creates a
 * mission from a template, the system:
 *   1. Creates the Mission record
 *   2. Links it to the sequence via sequenceKey
 *   3. Pre-fills required inputs from pillar data
 *   4. Can auto-execute the sequence or wait for manual trigger
 */

import type { GlorySequenceKey } from "@/server/services/glory-tools/sequences";
import { ADVE_STORAGE_KEYS } from "@/domain";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MissionTemplate {
  id: string;
  name: string;
  description: string;
  /** Which GLORY sequence(s) to execute */
  sequenceKeys: GlorySequenceKey[];
  /** Category for UI grouping */
  category: "BRANDING" | "CAMPAIGN" | "CONTENT" | "PRODUCTION" | "OPERATIONS" | "ANALYTICS";
  /** Minimum pillar data required before this template can run */
  requiredPillars: string[];
  /** Estimated duration in business days */
  estimatedDays: number;
  /** Whether the sequence can auto-execute or needs human review between steps */
  autoExecutable: boolean;
  /** Default inputs that get pre-filled from pillar data */
  defaultInputKeys: string[];
  /** Icon identifier for UI */
  icon: string;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export const MISSION_TEMPLATES: MissionTemplate[] = [
  // ═══ BRANDING ═══
  {
    id: "tpl-strategie-one-shot",
    name: "Strategie One-Shot",
    description: "Positionnement rapide — manifeste + offre commerciale sans strategie complete",
    sequenceKeys: ["MANIFESTE-A", "OFFRE-V"],
    category: "BRANDING",
    requiredPillars: ["a", "d", "v"],
    estimatedDays: 5,
    autoExecutable: false,
    defaultInputKeys: ["archetype", "positionnement", "promesseMaitre"],
    icon: "flag",
  },
  {
    id: "tpl-rebranding",
    name: "Rebranding Complet",
    description: "Refonte identite visuelle — audit existant, pipeline BRAND, migration guidelines",
    sequenceKeys: ["REBRAND"],
    category: "BRANDING",
    requiredPillars: ["a", "d"],
    estimatedDays: 21,
    autoExecutable: false,
    defaultInputKeys: ["directionArtistique", "noyauIdentitaire"],
    icon: "refresh-cw",
  },
  {
    id: "tpl-naming",
    name: "Naming Marque / Produit",
    description: "Du brainstorm au nom valide — exploration, generation, evaluation, check legal",
    sequenceKeys: ["NAMING"],
    category: "BRANDING",
    requiredPillars: ["a", "d"],
    estimatedDays: 7,
    autoExecutable: true,
    defaultInputKeys: ["noyauIdentitaire", "valeurs", "doctrine"],
    icon: "type",
  },
  {
    id: "tpl-packaging",
    name: "Direction Packaging",
    description: "Semiotique, chromatic, typo, layout packaging, brief vendor",
    sequenceKeys: ["PACKAGING"],
    category: "BRANDING",
    requiredPillars: ["d", "v"],
    estimatedDays: 10,
    autoExecutable: false,
    defaultInputKeys: ["directionArtistique", "produitsCatalogue"],
    icon: "package",
  },

  // ═══ CAMPAIGN ═══
  {
    id: "tpl-campagne-lancement",
    name: "Campagne de Lancement",
    description: "Plan de lancement complet — benchmark, brief, campagne 360, timeline J-90 a J+30",
    sequenceKeys: ["LAUNCH"],
    category: "CAMPAIGN",
    requiredPillars: ["a", "d", "v", "e", "i", "s"],
    estimatedDays: 30,
    autoExecutable: false,
    defaultInputKeys: ["roadmap", "catalogueParCanal", "globalBudget"],
    icon: "rocket",
  },
  {
    id: "tpl-campagne-360",
    name: "Campagne 360",
    description: "Architecture complete — brief, concept, media, digital, simulation, coherence",
    sequenceKeys: ["CAMPAIGN-360"],
    category: "CAMPAIGN",
    requiredPillars: ["a", "d", "i", "s"],
    estimatedDays: 14,
    autoExecutable: false,
    defaultInputKeys: ["catalogueParCanal", "sprint90Days", "globalBudget"],
    icon: "globe",
  },
  {
    id: "tpl-pitch",
    name: "Pitch Competition",
    description: "Appel d'offres — benchmark, brief, concept, pitch deck, credentials, presentation",
    sequenceKeys: ["PITCH"],
    category: "CAMPAIGN",
    requiredPillars: ["a", "d", "v"],
    estimatedDays: 10,
    autoExecutable: false,
    defaultInputKeys: ["positionnement", "promesseMaitre"],
    icon: "award",
  },

  // ═══ CONTENT ═══
  {
    id: "tpl-collab-influenceur",
    name: "Collab Influenceur",
    description: "Brief influenceur, copy, calendrier, framework UGC",
    sequenceKeys: ["INFLUENCE"],
    category: "CONTENT",
    requiredPillars: ["d", "e"],
    estimatedDays: 5,
    autoExecutable: true,
    defaultInputKeys: ["tonDeVoix", "personas", "touchpoints"],
    icon: "users",
  },
  {
    id: "tpl-pack-social",
    name: "Pack Reseaux Sociaux",
    description: "1 mois de contenu — posts + story arc + calendrier editorial",
    sequenceKeys: ["SOCIAL-POST", "STORY-ARC"],
    category: "CONTENT",
    requiredPillars: ["a", "d", "e"],
    estimatedDays: 7,
    autoExecutable: true,
    defaultInputKeys: ["tonDeVoix", "rituels", "sacredCalendar"],
    icon: "share-2",
  },
  {
    id: "tpl-planning-annuel",
    name: "Planning Annuel Editorial",
    description: "Calendrier 12 mois — themes saisonniers, mix contenus, budget",
    sequenceKeys: ["ANNUAL-PLAN"],
    category: "CONTENT",
    requiredPillars: ["e", "i"],
    estimatedDays: 5,
    autoExecutable: true,
    defaultInputKeys: ["sacredCalendar", "annualCalendar", "globalBudget"],
    icon: "calendar",
  },

  // ═══ PRODUCTION ═══
  {
    id: "tpl-spot-video",
    name: "Spot Pub Video / TV",
    description: "Script, dialogues, storyboard, casting, brief son",
    sequenceKeys: ["SPOT-VIDEO"],
    category: "PRODUCTION",
    requiredPillars: ["a", "d"],
    estimatedDays: 14,
    autoExecutable: false,
    defaultInputKeys: ["noyauIdentitaire", "tonDeVoix"],
    icon: "video",
  },
  {
    id: "tpl-spot-radio",
    name: "Spot Radio / Audio",
    description: "Script, dialogues, brief voix off, brief son",
    sequenceKeys: ["SPOT-RADIO"],
    category: "PRODUCTION",
    requiredPillars: ["a", "d"],
    estimatedDays: 7,
    autoExecutable: false,
    defaultInputKeys: ["noyauIdentitaire", "tonDeVoix"],
    icon: "radio",
  },
  {
    id: "tpl-kv-campagne",
    name: "Key Visual Campagne",
    description: "Du concept au prompt AI image — evaluation, brief DA, generation, validation",
    sequenceKeys: ["KV"],
    category: "PRODUCTION",
    requiredPillars: ["a", "d"],
    estimatedDays: 5,
    autoExecutable: true,
    defaultInputKeys: ["archetype", "directionArtistique", "promesseMaitre"],
    icon: "image",
  },

  // ═══ OPERATIONS ═══
  {
    id: "tpl-devis",
    name: "Devis Projet",
    description: "Chiffrage — budget, devis, brief vendor, workflow d'approbation",
    sequenceKeys: ["OPS"],
    category: "OPERATIONS",
    requiredPillars: ["v", "i"],
    estimatedDays: 2,
    autoExecutable: true,
    defaultInputKeys: ["produitsCatalogue", "globalBudget"],
    icon: "file-text",
  },

  // ═══ ANALYTICS ═══
  {
    id: "tpl-audit-marque",
    name: "Audit de Marque",
    description: "Diagnostic complet — audit interne (R) + etude marche (T), sans strategie",
    sequenceKeys: ["AUDIT-R", "ETUDE-T"],
    category: "ANALYTICS",
    requiredPillars: [...ADVE_STORAGE_KEYS],
    estimatedDays: 10,
    autoExecutable: false,
    defaultInputKeys: ["globalSwot", "tamSamSom"],
    icon: "search",
  },
  {
    id: "tpl-rentabilite",
    name: "Analyse Rentabilite",
    description: "P&L, rentabilite client, taux utilisation — bilan financier",
    sequenceKeys: ["PROFITABILITY"],
    category: "ANALYTICS",
    requiredPillars: [],
    estimatedDays: 1,
    autoExecutable: true,
    defaultInputKeys: [],
    icon: "trending-up",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getTemplate(id: string): MissionTemplate | undefined {
  return MISSION_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: MissionTemplate["category"]): MissionTemplate[] {
  return MISSION_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplatesForPillars(availablePillars: string[]): MissionTemplate[] {
  const set = new Set(availablePillars);
  return MISSION_TEMPLATES.filter((t) => t.requiredPillars.every((p) => set.has(p)));
}

export function getAutoExecutableTemplates(): MissionTemplate[] {
  return MISSION_TEMPLATES.filter((t) => t.autoExecutable);
}
