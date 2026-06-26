/**
 * operate-config.ts — Source de vérité unique pour toute la section opérationnelle.
 *
 * ─── RÈGLE ABSOLUE ──────────────────────────────────────────────────────────
 * Ce fichier est l'UNIQUE endroit où sont définis :
 *   - Les labels FR des états (campagne, mission, AARRR, production, priorité)
 *   - Les couleurs CSS associées
 *   - Les icônes sémantiques
 *   - Les transitions d'affichage (côté client — validation réelle = serveur)
 *
 * Toute page ou composant qui a besoin d'afficher un état DOIT importer d'ici.
 * INTERDICTION de définir STATE_BADGE_COLORS, STAGE_LABELS, STATUS_LABELS,
 * VALID_TRANSITIONS ou toute variante en local dans les pages.
 *
 * Les transitions client sont dérivées de :
 * /src/server/services/campaign-manager/state-machine.ts
 * Elles sont à usage d'affichage UNIQUEMENT. La validation finale est côté serveur.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types — dérivés des enums Prisma (schema.prisma)
// ─────────────────────────────────────────────────────────────────────────────

export type CampaignState =
  | "BRIEF_DRAFT"
  | "BRIEF_VALIDATED"
  | "PLANNING"
  | "CREATIVE_DEV"
  | "PRODUCTION"
  | "PRE_PRODUCTION"
  | "APPROVAL"
  | "READY_TO_LAUNCH"
  | "LIVE"
  | "POST_CAMPAIGN"
  | "ARCHIVED"
  | "CANCELLED";

export type AARRStage =
  | "ACQUISITION"
  | "ACTIVATION"
  | "RETENTION"
  | "REVENUE"
  | "REFERRAL";

export type MissionStage =
  | "DRAFT"
  | "IN_PROGRESS"
  | "REVIEW"
  | "COMPLETED"
  | "CANCELLED";

export type FieldOpStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type ProductionState =
  | "DEVIS"
  | "BAT"
  | "EN_PRODUCTION"
  | "LIVRAISON"
  | "INSTALLE"
  | "TERMINE"
  | "ANNULE";

export type OperationalPriority =
  | "CRITIQUE"
  | "HAUTE"
  | "MOYENNE"
  | "BASSE";

export type CreativeProductionStatus =
  | "BRIEF_RECU"
  | "BRIEF_QUALIFIE"
  | "EN_PRODUCTION"
  | "BLOQUE"
  | "LIVRE";

export type ClientReviewStatus =
  | "PENDING"
  | "BRAINSTORMING"
  | "EN_ATTENTE_FEEDBACK"
  | "RETOUR_RECU"
  | "TOOL_KIT_A_EXECUTER"
  | "EN_ATTENTE_PACKAGING"
  | "VALIDE"
  | "REJETE";

export type HealthSignal = "GREEN" | "AMBER" | "RED";

export type BriefStatus = "DRAFT" | "SUBMITTED" | "VALIDATED" | "ASSIGNED";

export type RequestStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

// ─────────────────────────────────────────────────────────────────────────────
// Config des 12 états de campagne
// ─────────────────────────────────────────────────────────────────────────────

export interface StateConfig {
  /** Label FR complet affiché à l'utilisateur */
  label: string;
  /** Label FR court (stepper compact, badges) */
  labelShort: string;
  /** Explication contextuelle (tooltip / description) */
  description: string;
  /** Classes CSS Tailwind pour badge ring-inset */
  color: string;
  /** Icône sémantique */
  icon: string;
  /** Groupe logique pour les onglets de filtrage */
  phase: "brief" | "planning" | "production" | "approval" | "live" | "done";
  /** L'état nécessite-t-il une action humaine explicite pour avancer ? */
  requiresAction: boolean;
  /** État terminal — aucune transition forward possible */
  isTerminal: boolean;
  /** Position dans le stepper (0-based, LIVE = 8, ARCHIVED = 10, CANCELLED = 11) */
  stepIndex: number;
  /** Gates de la transition FORWARD depuis cet état (dérivé de state-machine.ts) */
  forwardGates: string[];
  /** La transition forward requiert-elle une approbation ? */
  forwardRequiresApproval: boolean;
}

export const CAMPAIGN_STATES: Record<CampaignState, StateConfig> = {
  BRIEF_DRAFT: {
    label: "Brouillon Brief",
    labelShort: "Brouillon",
    description: "Le brief est en cours de rédaction. Qualifiez-le pour démarrer la production.",
    color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30",
    icon: "📝",
    phase: "brief",
    requiresAction: true,
    isTerminal: false,
    stepIndex: 0,
    forwardGates: ["brief_complete", "budget_defined"],
    forwardRequiresApproval: true,
  },
  BRIEF_VALIDATED: {
    label: "Brief Validé",
    labelShort: "Validé",
    description: "Le brief est qualifié et approuvé. La planification peut commencer.",
    color: "bg-info/15 text-info ring-info/30",
    icon: "✅",
    phase: "brief",
    requiresAction: false,
    isTerminal: false,
    stepIndex: 1,
    forwardGates: [],
    forwardRequiresApproval: false,
  },
  PLANNING: {
    label: "Planification",
    labelShort: "Planning",
    description: "L'équipe et le calendrier sont en cours de définition.",
    color: "bg-accent/15 text-accent ring-accent/30",
    icon: "🗓️",
    phase: "planning",
    requiresAction: true,
    isTerminal: false,
    stepIndex: 2,
    forwardGates: ["timeline_set", "team_assigned"],
    forwardRequiresApproval: true,
  },
  CREATIVE_DEV: {
    label: "Dév. Créatif",
    labelShort: "Créatif",
    description: "La direction artistique et les concepts créatifs sont en développement.",
    color: "bg-warning/15 text-warning ring-warning/30",
    icon: "🎨",
    phase: "planning",
    requiresAction: false,
    isTerminal: false,
    stepIndex: 3,
    forwardGates: [],
    forwardRequiresApproval: false,
  },
  PRODUCTION: {
    label: "Production",
    labelShort: "Prod",
    description: "Les livrables (visuels, vidéos, textes) sont en cours de production.",
    color: "bg-warning/15 text-warning ring-warning/30",
    icon: "🏭",
    phase: "production",
    requiresAction: false,
    isTerminal: false,
    stepIndex: 4,
    forwardGates: [],
    forwardRequiresApproval: false,
  },
  PRE_PRODUCTION: {
    label: "Pré-Production",
    labelShort: "Pré-Prod",
    description: "Finalisation avant soumission pour approbation. Tous les assets doivent être prêts.",
    color: "bg-warning/15 text-warning ring-warning/30",
    icon: "🔧",
    phase: "production",
    requiresAction: true,
    isTerminal: false,
    stepIndex: 5,
    forwardGates: ["all_assets_ready"],
    forwardRequiresApproval: false,
  },
  APPROVAL: {
    label: "Approbation",
    labelShort: "Appro",
    description: "Les livrables sont soumis pour validation client ou direction.",
    color: "bg-info/15 text-info ring-info/30",
    icon: "👁️",
    phase: "approval",
    requiresAction: true,
    isTerminal: false,
    stepIndex: 6,
    forwardGates: ["client_approved"],
    forwardRequiresApproval: true,
  },
  READY_TO_LAUNCH: {
    label: "Prêt au Lancement",
    labelShort: "À lancer",
    description: "Tout est approuvé. La campagne est prête à passer en ligne.",
    color: "bg-info/15 text-info ring-info/30",
    icon: "🚀",
    phase: "approval",
    requiresAction: true,
    isTerminal: false,
    stepIndex: 7,
    forwardGates: ["launch_checklist_complete"],
    forwardRequiresApproval: true,
  },
  LIVE: {
    label: "En Cours (LIVE)",
    labelShort: "LIVE",
    description: "La campagne est active sur le terrain ou en ligne. Suivez les métriques en temps réel.",
    color: "bg-success/15 text-success ring-success/30",
    icon: "🔴",
    phase: "live",
    requiresAction: false,
    isTerminal: false,
    stepIndex: 8,
    forwardGates: [],
    forwardRequiresApproval: false,
  },
  POST_CAMPAIGN: {
    label: "Post-Campagne",
    labelShort: "Post",
    description: "La campagne est terminée. Collectez les résultats et rédigez le bilan final.",
    color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30",
    icon: "📊",
    phase: "done",
    requiresAction: true,
    isTerminal: false,
    stepIndex: 9,
    forwardGates: [],
    forwardRequiresApproval: false,
  },
  ARCHIVED: {
    label: "Archivée",
    labelShort: "Archive",
    description: "La campagne est archivée définitivement.",
    color: "bg-foreground-muted/10 text-foreground-muted ring-border/20",
    icon: "📦",
    phase: "done",
    requiresAction: false,
    isTerminal: true,
    stepIndex: 10,
    forwardGates: [],
    forwardRequiresApproval: false,
  },
  CANCELLED: {
    label: "Annulée",
    labelShort: "Annulée",
    description: "La campagne a été annulée.",
    color: "bg-error/15 text-error ring-error/30",
    icon: "❌",
    phase: "done",
    requiresAction: false,
    isTerminal: true,
    stepIndex: 11,
    forwardGates: [],
    forwardRequiresApproval: false,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Groupes d'états pour filtres / onglets (dérivés de CAMPAIGN_STATES)
// ─────────────────────────────────────────────────────────────────────────────

export const STATE_PHASE_GROUPS = {
  /** Brief en cours ou validé, planification, développement créatif */
  active: (Object.keys(CAMPAIGN_STATES) as CampaignState[]).filter(
    (s) => CAMPAIGN_STATES[s].phase === "brief" || CAMPAIGN_STATES[s].phase === "planning"
  ),
  /** Production, pré-production, approbation, prêt au lancement */
  production: (Object.keys(CAMPAIGN_STATES) as CampaignState[]).filter(
    (s) => CAMPAIGN_STATES[s].phase === "production" || CAMPAIGN_STATES[s].phase === "approval"
  ),
  /** En ligne */
  live: (Object.keys(CAMPAIGN_STATES) as CampaignState[]).filter(
    (s) => CAMPAIGN_STATES[s].phase === "live"
  ),
  /** Post-campagne, archivée, annulée */
  done: (Object.keys(CAMPAIGN_STATES) as CampaignState[]).filter(
    (s) => CAMPAIGN_STATES[s].phase === "done"
  ),
} as const;

/** Tous les états "en vie" (non terminaux, non archivés) */
export const ACTIVE_CAMPAIGN_STATES: CampaignState[] = (
  Object.keys(CAMPAIGN_STATES) as CampaignState[]
).filter((s) => !CAMPAIGN_STATES[s].isTerminal && s !== "POST_CAMPAIGN");

// ─────────────────────────────────────────────────────────────────────────────
// Transitions d'affichage — DÉRIVÉES de state-machine.ts (serveur)
// Usage : affichage côté client UNIQUEMENT. Validation = toujours côté serveur.
// ─────────────────────────────────────────────────────────────────────────────

/** Map état → transitions disponibles (forward + rollback + cancel).
 * Dérivé littéralement de TRANSITIONS[] dans state-machine.ts */
export const DISPLAY_TRANSITIONS: Partial<Record<CampaignState, CampaignState[]>> = {
  BRIEF_DRAFT:     ["BRIEF_VALIDATED", "CANCELLED"],
  BRIEF_VALIDATED: ["PLANNING", "CANCELLED"],
  PLANNING:        ["CREATIVE_DEV", "CANCELLED"],
  CREATIVE_DEV:    ["PRODUCTION", "CANCELLED"],
  PRODUCTION:      ["PRE_PRODUCTION", "CANCELLED"],
  PRE_PRODUCTION:  ["APPROVAL", "CANCELLED"],
  APPROVAL:        ["READY_TO_LAUNCH", "PRODUCTION", "CREATIVE_DEV", "CANCELLED"],
  READY_TO_LAUNCH: ["LIVE", "CANCELLED"],
  LIVE:            ["POST_CAMPAIGN", "CANCELLED"],
  POST_CAMPAIGN:   ["ARCHIVED"],
  // ARCHIVED et CANCELLED = états terminaux — aucune transition
};

/** Retourne la prochaine transition principale (forward, non-cancel) depuis un état */
export function getNextState(from: CampaignState): CampaignState | null {
  const transitions = DISPLAY_TRANSITIONS[from] ?? [];
  const forward = transitions.find((t) => t !== "CANCELLED");
  return forward ?? null;
}

/** Retourne toutes les transitions disponibles depuis un état */
export function getDisplayTransitions(from: CampaignState): CampaignState[] {
  return DISPLAY_TRANSITIONS[from] ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Labels des gates (pour affichage humain dans les tooltips)
// ─────────────────────────────────────────────────────────────────────────────

export const GATE_LABELS: Record<string, string> = {
  brief_complete:          "Brief complet requis",
  budget_defined:          "Budget défini requis",
  timeline_set:            "Calendrier défini requis",
  team_assigned:           "Équipe assignée requise",
  all_assets_ready:        "Tous les assets doivent être prêts",
  client_approved:         "Approbation client requise",
  launch_checklist_complete: "Checklist de lancement complète requise",
};

// ─────────────────────────────────────────────────────────────────────────────
// Config AARRR — dérivée de l'enum AARRStage (schema.prisma)
// ─────────────────────────────────────────────────────────────────────────────

export interface AARRStageConfig {
  label: string;
  labelShort: string;
  color: string;
  colorSolid: string;
  icon: string;
  description: string;
  /** Métriques typiques à tracker pour cette phase */
  defaultMetrics: string[];
}

export const AARRR_STAGES: Record<AARRStage, AARRStageConfig> = {
  ACQUISITION: {
    label: "Acquisition",
    labelShort: "A",
    color: "bg-accent/15 text-accent ring-accent/30",
    colorSolid: "bg-accent text-accent-foreground",
    icon: "🎯",
    description: "Nouveaux utilisateurs et contacts touchés par la campagne",
    defaultMetrics: ["Reach", "Impressions", "Nouveaux contacts", "Trafic web", "CPM"],
  },
  ACTIVATION: {
    label: "Activation",
    labelShort: "A",
    color: "bg-info/15 text-info ring-info/30",
    colorSolid: "bg-info text-info-foreground",
    icon: "⚡",
    description: "Premiers engagements significatifs avec la marque",
    defaultMetrics: ["Taux d'engagement", "Essais produit", "Inscriptions", "CTA cliqués"],
  },
  RETENTION: {
    label: "Rétention",
    labelShort: "R",
    color: "bg-warning/15 text-warning ring-warning/30",
    colorSolid: "bg-warning text-warning-foreground",
    icon: "🔄",
    description: "Utilisateurs fidèles qui reviennent et restent actifs",
    defaultMetrics: ["Taux de rétention J7", "Taux de rétention J30", "Récurrence d'achat"],
  },
  REVENUE: {
    label: "Revenus",
    labelShort: "R",
    color: "bg-success/15 text-success ring-success/30",
    colorSolid: "bg-success text-success-foreground",
    icon: "💰",
    description: "Conversions commerciales et revenus générés par la campagne",
    defaultMetrics: ["CA généré", "Taux de conversion", "Panier moyen", "ROAS"],
  },
  REFERRAL: {
    label: "Recommandation",
    labelShort: "R",
    color: "bg-error/15 text-error ring-error/30",
    colorSolid: "bg-error text-error-foreground",
    icon: "🌟",
    description: "Ambassadeurs et recommandations organiques générées",
    defaultMetrics: ["NPS", "Partages organiques", "Mentions", "Nouveaux contacts apportés"],
  },
};

/** Liste ordonnée des stages AARRR pour les affichages */
export const AARRR_ORDER: AARRStage[] = [
  "ACQUISITION",
  "ACTIVATION",
  "RETENTION",
  "REVENUE",
  "REFERRAL",
];

// ─────────────────────────────────────────────────────────────────────────────
// Config états mission — dérivée du statut Mission.status (String DB)
// ─────────────────────────────────────────────────────────────────────────────

export interface MissionStageConfig {
  label: string;
  color: string;
  icon: string;
  /** Position dans le workflow (pour stepper) */
  stepIndex: number;
}

export const MISSION_STAGES: Record<MissionStage, MissionStageConfig> = {
  DRAFT:       { label: "Brouillon",  color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30", icon: "📝", stepIndex: 0 },
  IN_PROGRESS: { label: "En cours",  color: "bg-accent/15 text-accent ring-accent/30",                         icon: "⚙️", stepIndex: 1 },
  REVIEW:      { label: "En revue",  color: "bg-warning/15 text-warning ring-warning/30",                      icon: "👁️", stepIndex: 2 },
  COMPLETED:   { label: "Terminée",  color: "bg-success/15 text-success ring-success/30",                      icon: "✅", stepIndex: 3 },
  CANCELLED:   { label: "Annulée",   color: "bg-error/15 text-error ring-error/30",                            icon: "❌", stepIndex: 4 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Config priorités opérationnelles — enum OperationalPriority (schema.prisma)
// ─────────────────────────────────────────────────────────────────────────────

export interface PriorityConfig {
  label: string;
  color: string;
  icon: string;
  /** Poids pour tri (plus élevé = plus prioritaire) */
  weight: number;
}

export const OPERATIONAL_PRIORITY: Record<OperationalPriority, PriorityConfig> = {
  CRITIQUE: { label: "Critique", color: "bg-error/15 text-error ring-error/30",                             icon: "🔴", weight: 4 },
  HAUTE:    { label: "Haute",    color: "bg-warning/15 text-warning ring-warning/30",                       icon: "🟠", weight: 3 },
  MOYENNE:  { label: "Moyenne",  color: "bg-info/15 text-info ring-info/30",                                icon: "🟡", weight: 2 },
  BASSE:    { label: "Basse",    color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30", icon: "⚪", weight: 1 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Config état production Guilde — enum ProductionState (schema.prisma)
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCTION_STATE_CONFIG: Record<ProductionState, { label: string; color: string; icon: string; stepIndex: number }> = {
  DEVIS:        { label: "Devis",           color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30", icon: "📋", stepIndex: 0 },
  BAT:          { label: "BAT",             color: "bg-warning/15 text-warning ring-warning/30",                      icon: "🖨️", stepIndex: 1 },
  EN_PRODUCTION: { label: "En production", color: "bg-accent/15 text-accent ring-accent/30",                          icon: "🏭", stepIndex: 2 },
  LIVRAISON:    { label: "Livraison",       color: "bg-info/15 text-info ring-info/30",                               icon: "🚚", stepIndex: 3 },
  INSTALLE:     { label: "Installé",        color: "bg-success/20 text-success ring-success/30",                      icon: "📍", stepIndex: 4 },
  TERMINE:      { label: "Terminé",         color: "bg-success/15 text-success ring-success/30",                      icon: "✅", stepIndex: 5 },
  ANNULE:       { label: "Annulé",          color: "bg-error/15 text-error ring-error/30",                            icon: "❌", stepIndex: 6 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Config créative et client — enums CreativeProductionStatus et ClientReviewStatus
// ─────────────────────────────────────────────────────────────────────────────

export const CREATIVE_STATUS_CONFIG: Record<CreativeProductionStatus, { label: string; color: string; icon: string }> = {
  BRIEF_RECU:     { label: "Brief reçu",        color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30", icon: "📥" },
  BRIEF_QUALIFIE: { label: "Brief qualifié",    color: "bg-info/15 text-info ring-info/30",                               icon: "📋" },
  EN_PRODUCTION:  { label: "En production",     color: "bg-accent/15 text-accent ring-accent/30",                        icon: "🎨" },
  BLOQUE:         { label: "Bloqué",            color: "bg-error/15 text-error ring-error/30",                           icon: "⏸️" },
  LIVRE:          { label: "Livré",             color: "bg-success/15 text-success ring-success/30",                     icon: "✅" },
};

export const CLIENT_STATUS_CONFIG: Record<ClientReviewStatus, { label: string; color: string; icon: string }> = {
  PENDING:               { label: "En attente",           color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30", icon: "⏳" },
  BRAINSTORMING:         { label: "Brainstorming",        color: "bg-accent/15 text-accent ring-accent/30",                        icon: "💡" },
  EN_ATTENTE_FEEDBACK:   { label: "Attente feedback",     color: "bg-warning/15 text-warning ring-warning/30",                     icon: "⏰" },
  RETOUR_RECU:           { label: "Retour reçu",          color: "bg-info/15 text-info ring-info/30",                              icon: "📩" },
  TOOL_KIT_A_EXECUTER:   { label: "Tool kit à exécuter",  color: "bg-accent/15 text-accent ring-accent/30",                       icon: "🛠️" },
  EN_ATTENTE_PACKAGING:  { label: "Attente packaging",    color: "bg-warning/15 text-warning ring-warning/30",                    icon: "📦" },
  VALIDE:                { label: "Validé",               color: "bg-success/15 text-success ring-success/30",                    icon: "✅" },
  REJETE:                { label: "Rejeté",               color: "bg-error/15 text-error ring-error/30",                          icon: "❌" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Config health signal — Campaign.healthSignal (String "GREEN"|"AMBER"|"RED")
// ─────────────────────────────────────────────────────────────────────────────

export const HEALTH_SIGNAL_CONFIG: Record<HealthSignal, { label: string; color: string; icon: string; dotClass: string }> = {
  GREEN: { label: "Bonne santé",   color: "bg-success/15 text-success ring-success/30",  icon: "🟢", dotClass: "bg-success" },
  AMBER: { label: "Attention",     color: "bg-warning/15 text-warning ring-warning/30",  icon: "🟡", dotClass: "bg-warning" },
  RED:   { label: "Critique",      color: "bg-error/15 text-error ring-error/30",        icon: "🔴", dotClass: "bg-error animate-pulse" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Config statuts brief — CampaignBrief.status (String "DRAFT"|"SUBMITTED"...)
// ─────────────────────────────────────────────────────────────────────────────

export const BRIEF_STATUS_CONFIG: Record<BriefStatus, { label: string; color: string; icon: string }> = {
  DRAFT:     { label: "Brouillon",  color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30", icon: "📝" },
  SUBMITTED: { label: "Soumis",    color: "bg-warning/15 text-warning ring-warning/30",                      icon: "📤" },
  VALIDATED: { label: "Validé",    color: "bg-success/15 text-success ring-success/30",                      icon: "✅" },
  ASSIGNED:  { label: "Assigné",   color: "bg-accent/15 text-accent ring-accent/30",                         icon: "👤" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Config statuts demande (OperatorRequest / requests) — String DB
// ─────────────────────────────────────────────────────────────────────────────

export const REQUEST_STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: string }> = {
  OPEN:        { label: "Ouvert",      color: "bg-accent/15 text-accent ring-accent/30",                         icon: "📬" },
  ASSIGNED:    { label: "Assigné",     color: "bg-info/15 text-info ring-info/30",                               icon: "👤" },
  IN_PROGRESS: { label: "En cours",   color: "bg-warning/15 text-warning ring-warning/30",                      icon: "⚙️" },
  RESOLVED:    { label: "Résolu",     color: "bg-success/15 text-success ring-success/30",                      icon: "✅" },
  CLOSED:      { label: "Fermé",      color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30", icon: "🔒" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — Fonctions utilitaires
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne la config complète d'un état campagne.
 * Jamais undefined — retourne BRIEF_DRAFT si état inconnu.
 */
export function getCampaignStateConfig(state: string): StateConfig {
  return CAMPAIGN_STATES[state as CampaignState] ?? CAMPAIGN_STATES.BRIEF_DRAFT;
}

/**
 * Retourne le label FR d'un état campagne.
 * @param short — true = label court (stepper), false = label complet
 */
export function getCampaignStateLabel(state: string, short = false): string {
  const cfg = getCampaignStateConfig(state);
  return short ? cfg.labelShort : cfg.label;
}

/**
 * Retourne les classes CSS de couleur pour un état campagne.
 */
export function getCampaignStateColor(state: string): string {
  return getCampaignStateConfig(state).color;
}

/**
 * Retourne la config d'un stage AARRR.
 * Jamais undefined — retourne ACQUISITION si stage inconnu.
 */
export function getAARRStageConfig(stage: string): AARRStageConfig {
  return AARRR_STAGES[stage as AARRStage] ?? AARRR_STAGES.ACQUISITION;
}

/**
 * Retourne la config d'un statut mission.
 * Jamais undefined — retourne DRAFT si statut inconnu.
 */
export function getMissionStageConfig(stage: string): MissionStageConfig {
  return MISSION_STAGES[stage as MissionStage] ?? MISSION_STAGES.DRAFT;
}

/**
 * Retourne la config de priorité opérationnelle.
 * Jamais undefined — retourne MOYENNE si priorité inconnue.
 */
export function getPriorityConfig(priority: string): PriorityConfig {
  return OPERATIONAL_PRIORITY[priority as OperationalPriority] ?? OPERATIONAL_PRIORITY.MOYENNE;
}

/**
 * Retourne la config du health signal.
 */
export function getHealthSignalConfig(signal: string): typeof HEALTH_SIGNAL_CONFIG[HealthSignal] {
  return HEALTH_SIGNAL_CONFIG[signal as HealthSignal] ?? HEALTH_SIGNAL_CONFIG.AMBER;
}

/**
 * Formate la confiance pilier (0-1) en pourcentage avec couleur.
 */
export function formatConfidence(confidence: number | null | undefined): {
  pct: string;
  color: string;
  level: "low" | "medium" | "high";
} {
  const val = confidence ?? 0;
  const pct = `${Math.round(val * 100)}%`;
  if (val < 0.30) return { pct, color: "text-error", level: "low" };
  if (val < 0.70) return { pct, color: "text-warning", level: "medium" };
  return { pct, color: "text-success", level: "high" };
}

/**
 * Formate un montant en XAF (ou autre devise) de manière lisible.
 */
export function formatCurrency(value: number | null | undefined, currency = "XAF"): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M ${currency}`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)} k ${currency}`;
  }
  return `${value.toLocaleString("fr-FR")} ${currency}`;
}

/**
 * Détermine le verdict global d'une campagne en POST_CAMPAIGN.
 * Basé sur le ratio de métriques AARRR ayant atteint leur target.
 */
export function computeClosureVerdict(metrics: Array<{ value: number; target: number | null }>): {
  verdict: "success" | "partial" | "failure";
  label: string;
  color: string;
  icon: string;
  ratio: number;
} {
  const withTargets = metrics.filter((m) => m.target != null && m.target > 0);
  if (withTargets.length === 0) {
    return { verdict: "partial", label: "Données insuffisantes", color: "text-foreground-muted", icon: "❓", ratio: 0 };
  }
  const achieved = withTargets.filter((m) => m.value >= (m.target ?? 0)).length;
  const ratio = achieved / withTargets.length;
  if (ratio >= 0.8) return { verdict: "success", label: "Réussite totale",   color: "text-success", icon: "✅", ratio };
  if (ratio >= 0.5) return { verdict: "partial", label: "Réussite partielle", color: "text-warning", icon: "⚠️", ratio };
  return              { verdict: "failure", label: "Échec",               color: "text-error",   icon: "❌", ratio };
}
