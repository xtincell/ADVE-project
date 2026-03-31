import { describe, it, expect } from "vitest";
import {
  canAccessPortal,
  canAccessCockpit,
  canAccessCreator,
  canAccessConsole,
  canManageStrategy,
  getAvailablePortals,
  hasStrategyPermission,
  getStrategyPermissions,
  canAccessOperator,
  getTierVisibility,
  type UserRole,
  type GuildTier,
} from "@/lib/utils/permissions";

describe("Portal Permissions", () => {
  it("ADMIN can access all portals", () => {
    const portals = getAvailablePortals("ADMIN");
    expect(portals).toContain("cockpit");
    expect(portals).toContain("creator");
    expect(portals).toContain("console");
    expect(portals).toContain("intake");
  });

  it("CLIENT_RETAINER can access cockpit and intake", () => {
    expect(canAccessPortal("CLIENT_RETAINER", "cockpit")).toBe(true);
    expect(canAccessPortal("CLIENT_RETAINER", "intake")).toBe(true);
    expect(canAccessPortal("CLIENT_RETAINER", "creator")).toBe(false);
    expect(canAccessPortal("CLIENT_RETAINER", "console")).toBe(false);
  });

  it("FREELANCE can access creator and intake", () => {
    expect(canAccessPortal("FREELANCE", "creator")).toBe(true);
    expect(canAccessPortal("FREELANCE", "intake")).toBe(true);
    expect(canAccessPortal("FREELANCE", "cockpit")).toBe(false);
  });

  it("USER can only access intake", () => {
    const portals = getAvailablePortals("USER");
    expect(portals).toEqual(["intake"]);
  });
});

describe("canAccessCockpit", () => {
  it("ADMIN can access cockpit", () => {
    expect(canAccessCockpit("ADMIN")).toBe(true);
  });

  it("FIXER can access cockpit", () => {
    expect(canAccessCockpit("FIXER")).toBe(true);
  });

  it("CLIENT_RETAINER can access cockpit", () => {
    expect(canAccessCockpit("CLIENT_RETAINER")).toBe(true);
  });

  it("CLIENT_STATIC can access cockpit", () => {
    expect(canAccessCockpit("CLIENT_STATIC")).toBe(true);
  });

  it("FREELANCE cannot access cockpit", () => {
    expect(canAccessCockpit("FREELANCE")).toBe(false);
  });

  it("USER cannot access cockpit", () => {
    expect(canAccessCockpit("USER")).toBe(false);
  });
});

describe("canAccessCreator", () => {
  it("ADMIN can access creator", () => {
    expect(canAccessCreator("ADMIN")).toBe(true);
  });

  it("FIXER can access creator", () => {
    expect(canAccessCreator("FIXER")).toBe(true);
  });

  it("FREELANCE can access creator", () => {
    expect(canAccessCreator("FREELANCE")).toBe(true);
  });

  it("CLIENT_RETAINER cannot access creator", () => {
    expect(canAccessCreator("CLIENT_RETAINER")).toBe(false);
  });

  it("CLIENT_STATIC cannot access creator", () => {
    expect(canAccessCreator("CLIENT_STATIC")).toBe(false);
  });

  it("USER cannot access creator", () => {
    expect(canAccessCreator("USER")).toBe(false);
  });
});

describe("canAccessConsole", () => {
  it("only ADMIN can access console", () => {
    expect(canAccessConsole("ADMIN")).toBe(true);
  });

  it("FIXER cannot access console", () => {
    expect(canAccessConsole("FIXER")).toBe(false);
  });

  it("CLIENT_RETAINER cannot access console", () => {
    expect(canAccessConsole("CLIENT_RETAINER")).toBe(false);
  });

  it("CLIENT_STATIC cannot access console", () => {
    expect(canAccessConsole("CLIENT_STATIC")).toBe(false);
  });

  it("FREELANCE cannot access console", () => {
    expect(canAccessConsole("FREELANCE")).toBe(false);
  });

  it("USER cannot access console", () => {
    expect(canAccessConsole("USER")).toBe(false);
  });
});

describe("canManageStrategy", () => {
  it("ADMIN can manage any strategy", () => {
    expect(canManageStrategy("ADMIN", "user-1", "other-user")).toBe(true);
  });

  it("FIXER can manage any strategy", () => {
    expect(canManageStrategy("FIXER", "user-1", "other-user")).toBe(true);
  });

  it("owner can manage their own strategy", () => {
    expect(canManageStrategy("CLIENT_RETAINER", "user-1", "user-1")).toBe(true);
  });

  it("non-owner CLIENT_RETAINER cannot manage another's strategy", () => {
    expect(canManageStrategy("CLIENT_RETAINER", "user-1", "user-2")).toBe(false);
  });

  it("FREELANCE can manage their own strategy only", () => {
    expect(canManageStrategy("FREELANCE", "user-1", "user-1")).toBe(true);
    expect(canManageStrategy("FREELANCE", "user-1", "user-2")).toBe(false);
  });

  it("USER cannot manage strategies unless they own them", () => {
    expect(canManageStrategy("USER", "user-1", "user-1")).toBe(true);
    expect(canManageStrategy("USER", "user-1", "user-2")).toBe(false);
  });
});

describe("Strategy Permissions by Role", () => {
  it("ADMIN has all strategy permissions", () => {
    const perms = getStrategyPermissions("ADMIN");
    expect(perms).toContain("strategy.view");
    expect(perms).toContain("strategy.edit");
    expect(perms).toContain("strategy.delete");
    expect(perms).toContain("strategy.score");
    expect(perms).toContain("strategy.guidelines.export");
  });

  it("FIXER has most permissions but not delete", () => {
    expect(hasStrategyPermission("FIXER", "strategy.view")).toBe(true);
    expect(hasStrategyPermission("FIXER", "strategy.edit")).toBe(true);
    expect(hasStrategyPermission("FIXER", "strategy.delete")).toBe(false);
  });

  it("CLIENT_RETAINER can view and export guidelines", () => {
    expect(hasStrategyPermission("CLIENT_RETAINER", "strategy.view")).toBe(true);
    expect(hasStrategyPermission("CLIENT_RETAINER", "strategy.guidelines.export")).toBe(true);
    expect(hasStrategyPermission("CLIENT_RETAINER", "strategy.edit")).toBe(false);
  });

  it("CLIENT_STATIC can only view", () => {
    expect(hasStrategyPermission("CLIENT_STATIC", "strategy.view")).toBe(true);
    expect(hasStrategyPermission("CLIENT_STATIC", "strategy.guidelines.export")).toBe(false);
    expect(hasStrategyPermission("CLIENT_STATIC", "strategy.edit")).toBe(false);
  });

  it("FREELANCE can only view missions", () => {
    expect(hasStrategyPermission("FREELANCE", "strategy.missions.view")).toBe(true);
    expect(hasStrategyPermission("FREELANCE", "strategy.view")).toBe(false);
  });

  it("USER has no strategy permissions", () => {
    const perms = getStrategyPermissions("USER");
    expect(perms).toHaveLength(0);
  });
});

describe("Operator Isolation", () => {
  it("user with operator can access same operator data", () => {
    expect(canAccessOperator("op-1", "op-1")).toBe(true);
  });

  it("user with operator cannot access different operator data", () => {
    expect(canAccessOperator("op-1", "op-2")).toBe(false);
  });

  it("user without operator cannot access any operator data", () => {
    expect(canAccessOperator(null, "op-1")).toBe(false);
  });

  it("user with operator can access unrestricted data (null target)", () => {
    expect(canAccessOperator("op-1", null)).toBe(true);
  });
});

describe("Guild Tier Visibility", () => {
  it("APPRENTI has limited visibility", () => {
    const vis = getTierVisibility("APPRENTI");
    expect(vis.canViewStrategyContext).toBe(false);
    expect(vis.canViewPillarDetails).toBe(false);
    expect(vis.canViewCompetitorData).toBe(false);
    expect(vis.canAccessPeerReview).toBe(false);
    expect(vis.canAccessCollabMissions).toBe(false);
    expect(vis.canViewEarningsBreakdown).toBe(true);
    expect(vis.canExportPortfolio).toBe(false);
  });

  it("COMPAGNON gains strategy context and peer review", () => {
    const vis = getTierVisibility("COMPAGNON");
    expect(vis.canViewStrategyContext).toBe(true);
    expect(vis.canAccessPeerReview).toBe(true);
    expect(vis.canAccessCollabMissions).toBe(true);
    expect(vis.canExportPortfolio).toBe(true);
    expect(vis.canViewPillarDetails).toBe(false);
  });

  it("MAITRE has full visibility", () => {
    const vis = getTierVisibility("MAITRE");
    expect(vis.canViewStrategyContext).toBe(true);
    expect(vis.canViewPillarDetails).toBe(true);
    expect(vis.canViewCompetitorData).toBe(true);
    expect(vis.canAccessPeerReview).toBe(true);
  });

  it("ASSOCIE has full visibility like MAITRE", () => {
    const vis = getTierVisibility("ASSOCIE");
    expect(vis.canViewStrategyContext).toBe(true);
    expect(vis.canViewPillarDetails).toBe(true);
    expect(vis.canViewCompetitorData).toBe(true);
    expect(vis.canAccessPeerReview).toBe(true);
    expect(vis.canAccessCollabMissions).toBe(true);
    expect(vis.canViewEarningsBreakdown).toBe(true);
    expect(vis.canExportPortfolio).toBe(true);
  });
});
