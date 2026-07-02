/**
 * Domaine campagnes & production — pur TS, zéro IO (WP-008).
 *
 * L'essence d'ADR-0119/0120 legacy, simplifiée en un pipeline à gates
 * explicites :
 *
 *   Campagne (cadre : nom, objectif, marché)
 *     → gate « lancer la production » (au moins une action)
 *   Action (frame de production découplé, coût estimé par marché)
 *     → gate « transformer en brief » (campagne ACTIVE, action PLANNED)
 *   Brief (contenu structuré, éditable en DRAFT)
 *     → gate « valider le brief » (objectif + livrable renseignés)
 *     → gate « éclater en missions » (brief VALIDATED uniquement)
 *   Mission (OPEN → ASSIGNED → DELIVERED → VALIDATED, sans saut ni retour)
 *
 * Tout ici est une fonction PURE et déterministe : les transitions se testent
 * sans base. Les statuts miroir des enums Prisma sont des unions littérales —
 * le domaine ne dépend jamais du client Prisma.
 */

// ── Statuts (miroirs des enums Prisma tranche 2) ───────────────────────

export const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const ACTION_STATUSES = ["PLANNED", "BRIEFED", "CANCELLED"] as const;
export type CampaignActionStatus = (typeof ACTION_STATUSES)[number];

export const BRIEF_STATUSES = ["DRAFT", "VALIDATED"] as const;
export type BriefStatus = (typeof BRIEF_STATUSES)[number];

export const MISSION_STATUSES = ["OPEN", "ASSIGNED", "DELIVERED", "VALIDATED"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

/** Libellés FR (registre client — jamais d'enum brut à l'écran). */
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Cadrage",
  ACTIVE: "En production",
  ARCHIVED: "Archivée",
};

export const ACTION_STATUS_LABELS: Record<CampaignActionStatus, string> = {
  PLANNED: "Planifiée",
  BRIEFED: "Briefée",
  CANCELLED: "Annulée",
};

export const BRIEF_STATUS_LABELS: Record<BriefStatus, string> = {
  DRAFT: "Brouillon",
  VALIDATED: "Validé",
};

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  OPEN: "Ouverte",
  ASSIGNED: "Assignée",
  DELIVERED: "Livrée",
  VALIDATED: "Validée",
};

// ── Gates (chaque prédicat porte sa raison de refus, prête à afficher) ──

export type GateCheck = { ok: true } | { ok: false; reason: string };

/**
 * Gate « lancer la production » : une campagne ne passe DRAFT → ACTIVE que si
 * elle contient au moins une action non annulée (un cadre vide ne produit rien).
 */
export function canLaunchCampaign(status: CampaignStatus, activeActionCount: number): GateCheck {
  if (status !== "DRAFT") {
    return {
      ok: false,
      reason:
        status === "ACTIVE"
          ? "La production de cette campagne est déjà lancée."
          : "Cette campagne est archivée — elle ne se relance pas.",
    };
  }
  if (activeActionCount < 1) {
    return {
      ok: false,
      reason: "Ajoutez au moins une action avant de lancer la production — un cadre vide ne produit rien.",
    };
  }
  return { ok: true };
}

/** Une campagne archivée n'accepte plus aucune écriture (actions comprises). */
export function canAddAction(status: CampaignStatus): GateCheck {
  if (status === "ARCHIVED") {
    return { ok: false, reason: "Cette campagne est archivée — elle n'accepte plus de nouvelles actions." };
  }
  return { ok: true };
}

/**
 * Gate « transformer en brief » (ADR-0120 : le brief de production n'existe
 * qu'après validation du cadre) : campagne ACTIVE et action encore PLANNED.
 */
export function canBriefAction(
  campaignStatus: CampaignStatus,
  actionStatus: CampaignActionStatus,
): GateCheck {
  if (campaignStatus !== "ACTIVE") {
    return {
      ok: false,
      reason:
        campaignStatus === "DRAFT"
          ? "Lancez d'abord la production de la campagne — le brief de production n'existe qu'après validation du cadre."
          : "Cette campagne est archivée — plus aucun brief ne s'y crée.",
    };
  }
  if (actionStatus !== "PLANNED") {
    return {
      ok: false,
      reason:
        actionStatus === "BRIEFED"
          ? "Cette action a déjà son brief — ouvrez-le plutôt que d'en créer un doublon."
          : "Cette action est annulée — elle ne se transforme plus en brief.",
    };
  }
  return { ok: true };
}

// ── Brief structuré ────────────────────────────────────────────────────

/** Champ du brief structuré (l'ordre est celui du rendu et de l'éditeur). */
export type BriefFieldDef = {
  id: string;
  label: string;
  required: boolean;
  hint: string;
};

export const BRIEF_FIELDS: readonly BriefFieldDef[] = [
  {
    id: "objectif",
    label: "Objectif",
    required: true,
    hint: "Ce que cette production doit obtenir, rattaché à l'objectif de la campagne.",
  },
  {
    id: "livrable",
    label: "Livrable attendu",
    required: true,
    hint: "Le matériel concret à produire (formats, quantités).",
  },
  {
    id: "specs",
    label: "Spécifications",
    required: false,
    hint: "Contraintes techniques : dimensions, durées, canaux, langues…",
  },
  {
    id: "ton",
    label: "Ton & direction",
    required: false,
    hint: "Registre de la marque à respecter (à tirer des piliers ADVE).",
  },
  {
    id: "echeance",
    label: "Échéance",
    required: false,
    hint: "Date ou fenêtre de livraison attendue.",
  },
  {
    id: "contexte",
    label: "Contexte",
    required: false,
    hint: "Campagne, marché, éléments fournis au talent.",
  },
] as const;

export type BriefContent = Record<string, unknown>;

/** Valeur de champ de brief non vide ? (les blancs ne comptent pas) */
function briefFieldFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Champs requis manquants d'un brief (vide = brief complet). */
export function missingBriefFields(content: BriefContent): BriefFieldDef[] {
  return BRIEF_FIELDS.filter((field) => field.required && !briefFieldFilled(content[field.id]));
}

/**
 * Gate « valider le brief » : brouillon uniquement, et tous les champs requis
 * (objectif, livrable) renseignés — on ne valide pas une intention vide.
 */
export function canValidateBrief(status: BriefStatus, content: BriefContent): GateCheck {
  if (status !== "DRAFT") {
    return { ok: false, reason: "Ce brief est déjà validé — il ne se revalide pas." };
  }
  const missing = missingBriefFields(content);
  if (missing.length > 0) {
    return {
      ok: false,
      reason: `Complétez ${missing.map((f) => `« ${f.label} »`).join(" et ")} avant de valider le brief.`,
    };
  }
  return { ok: true };
}

/** Un brief ne s'édite qu'en brouillon (le contenu validé est figé). */
export function canEditBrief(status: BriefStatus): GateCheck {
  if (status !== "DRAFT") {
    return { ok: false, reason: "Ce brief est validé — son contenu est figé. Les suites se jouent en missions." };
  }
  return { ok: true };
}

/** Gate « éclater en missions » : réservé aux briefs validés (ADR-0120). */
export function canSplitBrief(status: BriefStatus): GateCheck {
  if (status !== "VALIDATED") {
    return {
      ok: false,
      reason: "Validez d'abord le brief — les missions naissent d'une direction validée, jamais d'un brouillon.",
    };
  }
  return { ok: true };
}

/**
 * Pré-remplissage déterministe du brief depuis les données DÉCLARÉES du cadre
 * (campagne + action) — composition, pas invention : chaque valeur vient d'un
 * champ saisi par l'opérateur ou du référentiel pays. Les champs sans matière
 * restent vides (l'éditeur les complète).
 */
export function buildBriefDraft(input: {
  campaignName: string;
  campaignObjective: string;
  actionName: string;
  actionKindLabel: string;
  marketLabel: string;
}): { title: string; content: BriefContent } {
  return {
    title: `Brief — ${input.actionName}`,
    content: {
      objectif: input.campaignObjective,
      livrable: `${input.actionName} (${input.actionKindLabel})`,
      specs: "",
      ton: "",
      echeance: "",
      contexte: `Campagne « ${input.campaignName} » — marché ${input.marketLabel}.`,
    },
  };
}

// ── Transitions de mission (sans saut, sans retour) ────────────────────

/** Machine d'états mission : chaque étape est une gate explicite. */
export const MISSION_TRANSITIONS: Record<MissionStatus, readonly MissionStatus[]> = {
  OPEN: ["ASSIGNED"],
  ASSIGNED: ["DELIVERED"],
  DELIVERED: ["VALIDATED"],
  VALIDATED: [],
};

export function canTransitionMission(from: MissionStatus, to: MissionStatus): GateCheck {
  if (MISSION_TRANSITIONS[from].includes(to)) return { ok: true };
  return {
    ok: false,
    reason:
      `Passage « ${MISSION_STATUS_LABELS[from]} » → « ${MISSION_STATUS_LABELS[to]} » impossible — ` +
      "le circuit d'une mission est : ouverte → assignée → livrée → validée, sans saut ni retour.",
  };
}

// ── Coûts d'action : mise à l'échelle par indice (pur) ─────────────────

/**
 * Met un coût de base à l'échelle d'un marché par ratio d'indices coût de la
 * vie (mécanique portée de l'estimateur legacy ADR-0093 :
 * `zoneMultiplier = col(marché) / col(base)`). Null si un indice est
 * inutilisable — l'appelant retombe alors sur « à estimer », jamais sur un
 * montant inventé.
 */
export function scaleCostByCostOfLiving(
  baseAmount: number,
  colTarget: number,
  colBase: number,
): number | null {
  if (!Number.isFinite(baseAmount) || baseAmount < 0) return null;
  if (!Number.isFinite(colTarget) || colTarget <= 0) return null;
  if (!Number.isFinite(colBase) || colBase <= 0) return null;
  return Math.round(baseAmount * (colTarget / colBase));
}
