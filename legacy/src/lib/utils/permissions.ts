export type UserRole = "ADMIN" | "FIXER" | "CLIENT_RETAINER" | "CLIENT_STATIC" | "FREELANCE" | "USER";

export type Portal = "cockpit" | "creator" | "console" | "intake";

const PORTAL_ACCESS: Record<Portal, UserRole[]> = {
  cockpit: ["ADMIN", "FIXER", "CLIENT_RETAINER", "CLIENT_STATIC"],
  creator: ["ADMIN", "FIXER", "FREELANCE"],
  console: ["ADMIN"],
  intake: ["ADMIN", "FIXER", "CLIENT_RETAINER", "CLIENT_STATIC", "FREELANCE", "USER"],
};

// ---------------------------------------------------------------------------
// Portal-level access helpers
// ---------------------------------------------------------------------------

export function canAccessPortal(role: UserRole, portal: Portal): boolean {
  return PORTAL_ACCESS[portal].includes(role);
}

export function canAccessCockpit(role: UserRole): boolean {
  return PORTAL_ACCESS.cockpit.includes(role);
}

export function canAccessCreator(role: UserRole): boolean {
  return PORTAL_ACCESS.creator.includes(role);
}

export function canAccessConsole(role: UserRole): boolean {
  return PORTAL_ACCESS.console.includes(role);
}

export function getAvailablePortals(role: UserRole): Portal[] {
  return (Object.keys(PORTAL_ACCESS) as Portal[]).filter((portal) => canAccessPortal(role, portal));
}

// ---------------------------------------------------------------------------
// Strategy-level permissions
// ---------------------------------------------------------------------------

export type StrategyPermission =
  | "strategy.view"
  | "strategy.edit"
  | "strategy.score"
  | "strategy.drivers.manage"
  | "strategy.missions.view"
  | "strategy.missions.create"
  | "strategy.brand.view"
  | "strategy.brand.edit"
  | "strategy.insights.view"
  | "strategy.guidelines.export"
  | "strategy.delete";

const ROLE_STRATEGY_PERMISSIONS: Record<UserRole, StrategyPermission[]> = {
  ADMIN: [
    "strategy.view", "strategy.edit", "strategy.score",
    "strategy.drivers.manage", "strategy.missions.view", "strategy.missions.create",
    "strategy.brand.view", "strategy.brand.edit", "strategy.insights.view",
    "strategy.guidelines.export", "strategy.delete",
  ],
  FIXER: [
    "strategy.view", "strategy.edit", "strategy.score",
    "strategy.drivers.manage", "strategy.missions.view", "strategy.missions.create",
    "strategy.brand.view", "strategy.brand.edit", "strategy.insights.view",
    "strategy.guidelines.export",
  ],
  CLIENT_RETAINER: [
    "strategy.view", "strategy.brand.view", "strategy.insights.view",
    "strategy.missions.view", "strategy.guidelines.export",
  ],
  CLIENT_STATIC: [
    "strategy.view", "strategy.brand.view", "strategy.insights.view",
  ],
  FREELANCE: [
    "strategy.missions.view",
  ],
  USER: [],
};

export function hasStrategyPermission(role: UserRole, permission: StrategyPermission): boolean {
  return ROLE_STRATEGY_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getStrategyPermissions(role: UserRole): StrategyPermission[] {
  return ROLE_STRATEGY_PERMISSIONS[role] ?? [];
}

/**
 * Determine whether a user can manage (edit/delete) a specific strategy.
 * ADMIN and FIXER can manage any strategy. Owners can manage their own.
 */
export function canManageStrategy(
  role: UserRole,
  userId: string,
  strategyOwnerId: string,
): boolean {
  if (role === "ADMIN" || role === "FIXER") return true;
  return userId === strategyOwnerId;
}

// ---------------------------------------------------------------------------
// Operator isolation -- ensure user can only access their operator's data
// ---------------------------------------------------------------------------

export function canAccessOperator(userOperatorId: string | null, targetOperatorId: string | null): boolean {
  if (!userOperatorId) return false; // No operator assigned
  if (!targetOperatorId) return true; // No operator restriction on target
  return userOperatorId === targetOperatorId;
}

// ---------------------------------------------------------------------------
// Guild tier-based visibility for Creator Portal
// ---------------------------------------------------------------------------

export type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

export interface TierVisibility {
  canViewStrategyContext: boolean;
  canViewPillarDetails: boolean;
  canViewCompetitorData: boolean;
  canAccessPeerReview: boolean;
  canAccessCollabMissions: boolean;
  canViewEarningsBreakdown: boolean;
  canExportPortfolio: boolean;
}

const TIER_VISIBILITY: Record<GuildTier, TierVisibility> = {
  APPRENTI: {
    canViewStrategyContext: false,
    canViewPillarDetails: false,
    canViewCompetitorData: false,
    canAccessPeerReview: false,
    canAccessCollabMissions: false,
    canViewEarningsBreakdown: true,
    canExportPortfolio: false,
  },
  COMPAGNON: {
    canViewStrategyContext: true,
    canViewPillarDetails: false,
    canViewCompetitorData: false,
    canAccessPeerReview: true,
    canAccessCollabMissions: true,
    canViewEarningsBreakdown: true,
    canExportPortfolio: true,
  },
  MAITRE: {
    canViewStrategyContext: true,
    canViewPillarDetails: true,
    canViewCompetitorData: true,
    canAccessPeerReview: true,
    canAccessCollabMissions: true,
    canViewEarningsBreakdown: true,
    canExportPortfolio: true,
  },
  ASSOCIE: {
    canViewStrategyContext: true,
    canViewPillarDetails: true,
    canViewCompetitorData: true,
    canAccessPeerReview: true,
    canAccessCollabMissions: true,
    canViewEarningsBreakdown: true,
    canExportPortfolio: true,
  },
};

export function getTierVisibility(tier: GuildTier): TierVisibility {
  return TIER_VISIBILITY[tier];
}
