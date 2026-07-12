/**
 * ADR-0129 — Accès délégué par marque (StrategyCollaborator). Verrouille :
 *   (1) le modèle Prisma existe avec l'unicité (strategyId, userId) et le
 *       rôle réutilise l'enum CampaignTeamRole étendu de DIGITAL_DIRECTOR
 *       (pas de nouvel enum de rôles — anti-doublon) ;
 *   (2) le chokepoint canonique `canAccessStrategy` ET `scopeStrategies`
 *       consultent la collaboration ACTIVE (sinon le grant est décoratif,
 *       le bug CampaignTeamMember-descriptif se reproduirait) ;
 *   (3) la zone digitale est GARDÉE : chaque procédure du calendrier
 *       éditorial (actions.*) et des publications passe par la garde
 *       par-marque — ouvrir le cockpit aux freelances sans ces gardes
 *       sur-exposerait toutes les marques (trou pré-existant fermé) ;
 *   (4) FREELANCE/CREATOR entrent au cockpit au middleware (données
 *       scoppées par (2)) ;
 *   (5) grant/revoke sont des Intents gouvernés catalogués + SLO,
 *       requireOperator.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INTENT_KINDS } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("ADR-0129 — StrategyCollaborator (accès délégué par marque)", () => {
  it("(1) modèle Prisma + enum DIGITAL_DIRECTOR (extension, pas de nouvel enum)", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toContain("model StrategyCollaborator {");
    expect(schema).toContain("@@unique([strategyId, userId])");
    expect(schema).toMatch(/model StrategyCollaborator \{[\s\S]*?role\s+CampaignTeamRole/);
    expect(schema).toMatch(/enum CampaignTeamRole \{[\s\S]*?DIGITAL_DIRECTOR[\s\S]*?\}/);
  });

  it("(2) canAccessStrategy + scopeStrategies consultent la collaboration ACTIVE", () => {
    const iso = read("src/server/services/operator-isolation/index.ts");
    expect(iso).toContain("strategyCollaborator.findUnique");
    expect(iso).toMatch(/canAccessStrategy[\s\S]*?strategyCollaborator/);
    expect(iso).toMatch(/scopeStrategies[\s\S]*?collaborators: \{ some: \{ userId: ctx\.userId, status: "ACTIVE" \} \}/);
  });

  it("(3) la zone digitale est gardée par-marque (calendrier + publications)", () => {
    const actions = read("src/server/trpc/routers/actions.ts");
    // 6 procédures founder-facing (byStrategy, summary = lecture ;
    // propose, setSelected, setTiming, autoSchedule = écriture zonée
    // ADR-0131) — chacune appelle SA garde.
    const guardedReads = actions.split("assertCalendarAccess(ctx.session.user.id").length - 1;
    const guardedWrites = actions.split("assertCalendarWrite(ctx.session.user.id").length - 1;
    expect(guardedReads + guardedWrites).toBeGreaterThanOrEqual(6);
    expect(actions).toContain("canAccessStrategy");

    const publication = read("src/server/trpc/routers/publication.ts");
    expect(publication.split("assertPublicationAccess(ctx.session.user.id").length - 1).toBeGreaterThanOrEqual(3);

    const glory = read("src/server/trpc/routers/glory.ts");
    expect(glory).toMatch(/launchCalendar[\s\S]{0,600}canAccessStrategy/);
  });

  it("(4) FREELANCE et CREATOR entrent au cockpit (middleware)", () => {
    const proxy = read("src/proxy.ts");
    const cockpitRoles = proxy.match(/const COCKPIT_ROLES = \[[\s\S]*?\];/)?.[0] ?? "";
    expect(cockpitRoles).toContain('"FREELANCE"');
    expect(cockpitRoles).toContain('"CREATOR"');
  });

  it("(5) grant/revoke = Intents gouvernés catalogués + SLO + requireOperator", () => {
    const kinds = INTENT_KINDS.map((k) => k.kind);
    expect(kinds).toContain("GRANT_STRATEGY_COLLABORATOR");
    expect(kinds).toContain("REVOKE_STRATEGY_COLLABORATOR");
    const grant = INTENT_KINDS.find((k) => k.kind === "GRANT_STRATEGY_COLLABORATOR")!;
    expect(grant.governor).toBe("IMHOTEP");

    const sloKinds = INTENT_SLOS.map((s) => s.kind);
    expect(sloKinds).toContain("GRANT_STRATEGY_COLLABORATOR");
    expect(sloKinds).toContain("REVOKE_STRATEGY_COLLABORATOR");

    const strategyRouter = read("src/server/trpc/routers/strategy.ts");
    expect(strategyRouter).toMatch(/kind: "GRANT_STRATEGY_COLLABORATOR"[\s\S]{0,1200}requireOperator: true/);
    expect(strategyRouter).toMatch(/kind: "REVOKE_STRATEGY_COLLABORATOR"[\s\S]{0,400}requireOperator: true/);
  });

  it("(6) le theming cockpit ne sort JAMAIS un hex non validé (ADR-0130)", () => {
    const router = read("src/server/trpc/routers/cockpit-router.ts");
    expect(router).toMatch(/HEX = \/\^#\[0-9a-fA-F\]\{6\}\$\//);
    const theme = read("src/components/cockpit/brand-theme.tsx");
    expect(theme).toContain("HEX.test(accent)");
  });
});

describe("ADR-0131 — zones d'écriture par rôle (collaborateur = métier, pas passe-partout)", () => {
  it("(7) la table domaine est DENY par défaut et borne le SOCIAL_MANAGER à son métier", async () => {
    const { collaboratorCanWrite, collaboratorWriteZones, collaboratorZoneForKind } =
      await import("@/domain/collaborator-access");
    expect(collaboratorCanWrite("SOCIAL_MANAGER", "calendar")).toBe(true);
    expect(collaboratorCanWrite("SOCIAL_MANAGER", "publications")).toBe(true);
    expect(collaboratorCanWrite("SOCIAL_MANAGER", "social")).toBe(true);
    expect(collaboratorCanWrite("SOCIAL_MANAGER", "campaigns")).toBe(false);
    expect(collaboratorCanWrite("SOCIAL_MANAGER", "newsletter")).toBe(false);
    // Rôle inconnu / non cartographié → lecture seule intégrale.
    expect(collaboratorWriteZones("ART_DIRECTOR")).toHaveLength(0);
    expect(collaboratorWriteZones(null)).toHaveLength(0);
    // Kind non catalogué → non délégable (deny par défaut).
    expect(collaboratorZoneForKind("OPERATOR_AMEND_PILLAR")).toBeNull();
    expect(collaboratorZoneForKind("ANUBIS_SOCIAL_SYNC_FOLLOWERS")).toBe("social");
  });

  it("(8) le firewall collaborateur est branché sur LES DEUX voies gouvernées", () => {
    const gp = read("src/server/governance/governed-procedure.ts");
    // Voie explicite governedProcedure + voie strangler auditedProcedure :
    const hits = gp.split("assertCollaboratorMayEmit(").length - 1;
    expect(hits).toBeGreaterThanOrEqual(2);
    expect(gp).toContain("CollaboratorWriteVetoError");
    expect(gp).toMatch(/COLLABORATOR_ZONE_VETO[\s\S]{0,200}VETOED/);
  });

  it("(9) le calendrier distingue lecture (accès marque) et écriture (zone métier)", () => {
    const actions = read("src/server/trpc/routers/actions.ts");
    // 4 écritures founder-facing → garde de zone ; les lectures gardent l'accès simple.
    expect(actions.split("assertCalendarWrite(ctx.session.user.id").length - 1).toBeGreaterThanOrEqual(4);
    expect(actions.split("assertCalendarAccess(ctx.session.user.id").length - 1).toBeGreaterThanOrEqual(2);
    expect(actions).toContain('collaboratorCanWrite(role, "calendar")');
  });
});
