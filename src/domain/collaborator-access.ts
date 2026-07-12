/**
 * ADR-0131 — Zones d'accès des collaborateurs délégués par marque.
 *
 * Un collaborateur (StrategyCollaborator ACTIVE, ADR-0129) voit TOUTE la
 * marque en LECTURE ; il n'ÉCRIT que dans les zones de son métier. La table
 * ci-dessous est le canon unique rôle → zones d'écriture ; le firewall
 * d'émission (server/governance/collaborator-firewall.ts) et les gardes de
 * surface la consomment tous les deux.
 *
 * Domaine pur — aucune dépendance serveur (layering cascade).
 */

/** Zones fonctionnelles du cockpit ouvertes à la délégation d'écriture. */
export const COCKPIT_ZONES = [
  "calendar", // calendrier éditorial (BrandAction : proposer, sélectionner, planifier)
  "publications", // contenus produits (GloryOutput : gérer, supprimer)
  "social", // réseaux de la marque (connexions, sync, déconnexion — ADR-0128)
  "campaigns", // campagnes (suivi opérationnel)
  "newsletter", // envois email de la marque
  "requests", // demandes à l'équipe
] as const;

export type CockpitZone = (typeof COCKPIT_ZONES)[number];

/**
 * Rôle (enum Prisma CampaignTeamRole) → zones d'ÉCRITURE déléguées.
 * Un rôle absent de la table = lecture seule intégrale (défaut sûr).
 * L'édition ADVE, la stratégie, les livrables et les réglages ne sont
 * JAMAIS délégables par cette table (founder/opérateur uniquement).
 */
export const COLLABORATOR_WRITE_ZONES: Readonly<Record<string, readonly CockpitZone[]>> = {
  SOCIAL_MANAGER: ["calendar", "publications", "social"],
  DIGITAL_DIRECTOR: ["calendar", "publications", "social", "campaigns", "newsletter", "requests"],
  COPYWRITER: ["publications"],
  MEDIA_PLANNER: ["calendar"],
};

/** Libellés métier (registre client — jamais le nom brut de l'enum). */
export const COLLABORATOR_ROLE_LABELS: Readonly<Record<string, string>> = {
  SOCIAL_MANAGER: "Social media manager",
  DIGITAL_DIRECTOR: "Direction du digital",
  COPYWRITER: "Rédaction",
  MEDIA_PLANNER: "Plan média",
  ART_DIRECTOR: "Direction artistique",
  CREATIVE_DIRECTOR: "Direction de création",
  ACCOUNT_MANAGER: "Gestion de compte",
  ACCOUNT_DIRECTOR: "Direction de compte",
  STRATEGIC_PLANNER: "Planning stratégique",
  MEDIA_BUYER: "Achat média",
  PRODUCTION_MANAGER: "Production",
  PROJECT_MANAGER: "Gestion de projet",
  DATA_ANALYST: "Analyse de données",
  CLIENT: "Client",
};

export function collaboratorWriteZones(role: string | null | undefined): readonly CockpitZone[] {
  if (!role) return [];
  return COLLABORATOR_WRITE_ZONES[role] ?? [];
}

export function collaboratorCanWrite(role: string | null | undefined, zone: CockpitZone): boolean {
  return collaboratorWriteZones(role).includes(zone);
}

/**
 * Intent kinds qu'un collaborateur peut émettre, par zone. DENY par défaut :
 * tout kind strategy-scopé absent de cette table est refusé à un
 * collaborateur (le founder/opérateur n'est pas concerné). La table grandit
 * kind par kind — jamais de wildcard.
 */
export const COLLABORATOR_KIND_ZONES: Readonly<Record<string, CockpitZone>> = {
  PROPOSE_BRAND_ACTIONS: "calendar",
  ANUBIS_SOCIAL_CONNECT_ACCOUNT: "social",
  ANUBIS_SOCIAL_DISCONNECT_ACCOUNT: "social",
  ANUBIS_SOCIAL_SYNC_FOLLOWERS: "social",
  LEGACY_PUBLICATION_DELETE: "publications",
};

/** Zone d'un kind pour un collaborateur — null = kind non délégable. */
export function collaboratorZoneForKind(kind: string): CockpitZone | null {
  return COLLABORATOR_KIND_ZONES[kind] ?? null;
}
