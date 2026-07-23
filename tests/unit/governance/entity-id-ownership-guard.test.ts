/**
 * Verrou HARD — gardes des procédures keyées sur un id d'ENTITÉ (round-4/5).
 *
 * Classe prouvée exploitable (audit adversarial « TOUT » round-4, sweep 2026-07-22) :
 * une procédure `governedProcedure`/`protectedProcedure` keyée sur un id d'ENTITÉ
 * (`{ id }`, `{ commissionId }`, `{ deliverableId }`, `{ missionId }`, `{ signalId }`…)
 * — PAS un `strategyId`/`campaignId` de tête — n'est PAS auto-gardée : la garde
 * ADR-0175 de `governedProcedure` ne lit que le `strategyId` de tête, et le
 * scanner `strategy-ownership-guard.test.ts` ne couvre que ce cas. C'est
 * précisément pourquoi une CLASSE entière a survécu, dont un cluster FINANCIER
 * (mobile-money, commission, contract/escrow) où tout compte authentifié
 * DÉPLAÇAIT DE L'ARGENT.
 *
 * Ce test verrouille les deux remèdes appliqués :
 *  1. les primitives financières + actes de gouvernance/privilège portent
 *     `requireOperator: true` (base operatorProcedure = staff) ;
 *  2. les mutations/lectures founder-atteignables résolvent l'entité → sa
 *     marque/mission et appellent un chokepoint `canAccess*`/`assert*`/`enforce*`.
 *
 * Analyse TEXTUELLE (comme les autres verrous d'ownership) : un helper no-op
 * tromperait le scan — la revue reste responsable de la sémantique.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROUTERS = join(process.cwd(), "src/server/trpc/routers");
function router(name: string): string {
  return readFileSync(join(ROUTERS, name), "utf8");
}

/** Le kind est suivi (fenêtre 400 c.) de `requireOperator: true`. */
const REQUIRE_OPERATOR: Array<[string, string]> = [
  // ── Cluster financier (CRITICAL — déplacement d'argent) ──
  ["mobile-money.ts", "LEGACY_MOBILE_MONEY_INITIATE_PAYMENT"],
  ["mobile-money.ts", "LEGACY_MOBILE_MONEY_PAY_COMMISSION"],
  ["commission.ts", "LEGACY_COMMISSION_CALCULATE"],
  ["commission.ts", "LEGACY_COMMISSION_MARK_PAID"],
  ["commission.ts", "LEGACY_COMMISSION_GENERATE_PAYMENT_ORDER"],
  ["commission.ts", "LEGACY_COMMISSION_CALCULATE_ON_COMPLETE"],
  ["contract.ts", "LEGACY_CONTRACT_CREATE_ESCROW"],
  ["contract.ts", "LEGACY_CONTRACT_RELEASE_ESCROW"],
  ["contract.ts", "LEGACY_CONTRACT_MEET_ESCROW_CONDITION"],
  // ── Gouvernance guilde / privilège (self-escalation, remise) ──
  ["guild-tier.ts", "LEGACY_GUILD_TIER_PROMOTE"],
  ["guild-tier.ts", "LEGACY_GUILD_TIER_DEMOTE"],
  ["membership.ts", "LEGACY_MEMBERSHIP_CREATE"],
  ["membership.ts", "LEGACY_MEMBERSHIP_RENEW"],
  ["membership.ts", "LEGACY_MEMBERSHIP_CANCEL"],
  ["guild-org.ts", "LEGACY_GUILD_ORG_ADD_MEMBER"],
  ["guild-org.ts", "LEGACY_GUILD_ORG_REMOVE_MEMBER"],
  ["guilde.ts", "LEGACY_GUILDE_ASSIGN_MENTOR"],
  // ── Orchestration QC + notification (phishing) + tâches opérateur ──
  ["quality-review.ts", "LEGACY_QUALITY_REVIEW_ASSIGN_REVIEWER"],
  ["quality-review.ts", "LEGACY_QUALITY_REVIEW_ESCALATE"],
  ["notification.ts", "LEGACY_NOTIFICATION_CREATE"],
  ["operator-action.ts", "OPERATOR_CREATE_ACTION"],
  ["operator-action.ts", "OPERATOR_UPDATE_ACTION"],
  ["operator-action.ts", "OPERATOR_TOGGLE_ACTION_DONE"],
  ["operator-action.ts", "OPERATOR_DELETE_ACTION"],
  // ── Écritures de contenu GLOBAL (round-6 : certifs/commandes/éditorial/cours) ──
  ["boutique.ts", "LEGACY_BOUTIQUE_CREATE_ITEM"],
  ["boutique.ts", "LEGACY_BOUTIQUE_UPDATE_ITEM"],
  ["boutique.ts", "LEGACY_BOUTIQUE_UPDATE_ORDER_STATUS"],
  ["editorial.ts", "LEGACY_EDITORIAL_CREATE"],
  ["editorial.ts", "LEGACY_EDITORIAL_PUBLISH"],
  ["learning.ts", "LEGACY_LEARNING_CREATE_COURSE"],
  ["learning.ts", "LEGACY_LEARNING_PUBLISH_COURSE"],
  ["learning.ts", "LEGACY_LEARNING_ISSUE_CERTIFICATION"],
  ["event.ts", "LEGACY_EVENT_CREATE"],
  ["event.ts", "LEGACY_EVENT_MARK_ATTENDED"],
];

describe("entity-id financial + privilege procedures are staff-gated (round-4)", () => {
  it.each(REQUIRE_OPERATOR)("%s / %s → requireOperator: true", (file, kind) => {
    const src = router(file);
    const idx = src.indexOf(`"${kind}"`);
    expect(idx, `kind ${kind} introuvable dans ${file}`).toBeGreaterThan(-1);
    const span = src.slice(idx, idx + 400);
    expect(span, `${kind} doit porter requireOperator: true`).toMatch(/requireOperator:\s*true/);
  });
});

/** Le fichier référence un chokepoint de résolution entité→marque/mission. */
const RESOLUTION_GUARD: Array<[string, RegExp]> = [
  ["mission.ts", /enforceMissionAccess\(/],
  ["mission.ts", /enforceDeliverableAccess\(/],
  ["campaign.ts", /canAccessCampaign\(/],
  ["contract.ts", /assertContractAccess\(/],
  ["intervention.ts", /assertSignalStrategyAccess\(/],
  ["quality-review.ts", /assertQcParticipant\(/],
  ["campaign-deliverable.ts", /canAccessCampaign\(/],
  ["campaign-change-request.ts", /canAccessMission\(/],
  ["deliverable-tracking.ts", /canAccessMission\(/],
  ["signal.ts", /assertStrategyAccess\(/],
];

describe("entity-id founder-reachable procedures resolve ownership (round-4)", () => {
  it.each(RESOLUTION_GUARD)("%s references its ownership chokepoint", (file, re) => {
    expect(router(file)).toMatch(re);
  });

  it("notification.markRead is self-scoped", () => {
    expect(router("notification.ts")).toMatch(/notif\.userId !== ctx\.session\.user\.id/);
  });

  it("guilde.removePortfolioItem is self-scoped", () => {
    expect(router("guilde.ts")).toMatch(/item\.talentProfile\.userId !== ctx\.session\.user\.id/);
  });

  it("system-config: global audit log is ADMIN", () => {
    // `recentAudit` = journal d'audit GLOBAL (emails de tous les users) → ADMIN.
    // `get` reste `protectedProcedure` VOLONTAIREMENT (réglages système non-secrets
    // lus par le portail créateur QC — cf. commentaire du router).
    const s = router("system-config.ts");
    expect(s).toMatch(/recentAudit:\s*adminProcedure/);
  });

  it("morning-batch ingested-comms reads are staff-gated", () => {
    const s = router("morning-batch.ts");
    expect(s).toMatch(/getBatch:\s*operatorProcedure/);
    expect(s).toMatch(/listBatches:\s*operatorProcedure/);
    expect(s).toMatch(/listSources:\s*operatorProcedure/);
  });
});

/**
 * Round-6 : chaque route MCP enforce la portée du token AVANT dispatch
 * (`scopeMcpParams`) — une clé BRAND ne peut plus lire une autre marque via un
 * `strategyId` injecté dans les params.
 *
 * Round-8 (CRITICAL) : `scopeMcpParams` ne vérifie QUE `params.strategyId` — un
 * outil keyé sur un id d'ENTITÉ (`campaignId`/`missionId`/`driverId`/`userId`…)
 * échappait à la portée BRAND sur les routes PAR-SERVEUR (elles appelaient
 * `handler()` en direct, sans `enforceBrandScope`). Fermé en unifiant les 2
 * chemins de dispatch : les 10 routes par-serveur délèguent désormais à
 * `dispatchTool` (comme l'agrégat) — `dispatchTool` applique `enforceBrandScope`
 * FAIL-CLOSED (une clé BRAND est refusée sur tout outil dont le schéma n'a pas de
 * champ `strategyId`). Plus de « deux chemins à enforcement inégal ».
 */
describe("MCP routes enforce token brand-scope (round-6 + round-8)", () => {
  const MCP_DIR = join(process.cwd(), "src/app/api/mcp");
  const MCP_ROUTES = [
    "route.ts", // agrégat /api/mcp
    "advertis/route.ts",
    "advertis-inbound/route.ts",
    "artemis/route.ts",
    "creative/route.ts",
    "guild/route.ts",
    "intelligence/route.ts",
    "operations/route.ts",
    "ptah/route.ts",
    "pulse/route.ts",
    "seshat/route.ts",
  ];
  it.each(MCP_ROUTES)("mcp/%s appelle scopeMcpParams avant dispatch", (rel) => {
    const src = readFileSync(join(MCP_DIR, rel), "utf8");
    expect(src, `${rel} doit enforcer la portée du token via scopeMcpParams`).toMatch(/scopeMcpParams\(/);
    // Le résultat denied court-circuite AVANT tout appel au handler.
    expect(src).toMatch(/\.denied\)?\s*return/);
  });

  it.each(MCP_ROUTES)("mcp/%s délègue à dispatchTool (enforceBrandScope fail-closed)", (rel) => {
    const src = readFileSync(join(MCP_DIR, rel), "utf8");
    // Chemin unifié : le dispatch passe par dispatchTool (qui applique
    // enforceBrandScope). Aucune route ne doit appeler `handler(...)` en direct.
    expect(src, `${rel} doit dispatcher via dispatchTool (fail-closed brand-scope)`).toMatch(/dispatchTool\(/);
    expect(src, `${rel} ne doit plus appeler handler(...) en direct`).not.toMatch(/=>\s*handler\(/);
  });
});
