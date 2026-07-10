/**
 * Fix fuite P1 (vague E) — le router commission ne doit plus exposer les
 * montants/talentIds de TOUTE la plateforme à n'importe quel compte connecté.
 * Contrat verrouillé par analyse source (le router réel importe next-auth,
 * intestable en node pur — même approche que router.test.ts) :
 *   1. list/getByMission passent par commissionScope (ADMIN → tout ;
 *      operator → son périmètre ; sinon → talentId self) ;
 *   2. getByCreator REFUSE (FORBIDDEN) un userId tiers pour un non-admin —
 *      jamais de remplacement silencieux ;
 *   3. tierAtTime (historique tier/commissions d'autrui) est operatorProcedure ;
 *   4. getAdjustedRate garde le même périmètre self/operator/admin.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const source = fs.readFileSync(
  path.resolve(__dirname, "../../../src/server/trpc/routers/commission.ts"),
  "utf-8",
);

const PROCEDURE_START = /\n  \w+: (protectedProcedure|adminProcedure|operatorProcedure|governedProcedure)/;

function procedureBlock(name: string): string {
  // Ancre sur la DÉFINITION de procédure top-level (indentation 2 + builder),
  // pas sur un champ de données homonyme (ex. `tierAtTime: result.tierAtTime`).
  const def = source.match(new RegExp(`\\n  ${name}: (?:protectedProcedure|adminProcedure|operatorProcedure|governedProcedure)`));
  expect(def, `${name} présent dans le router comme procédure`).not.toBeNull();
  const start = def!.index!;
  const rest = source.slice(start + 1);
  const next = rest.slice(name.length).search(PROCEDURE_START);
  return next === -1 ? rest : rest.slice(0, name.length + next);
}

describe("commission router — scoping sécurité (fuite P1)", () => {
  it("définit le helper commissionScope (ADMIN / operator / self)", () => {
    expect(source).toContain("async function commissionScope");
    expect(source).toContain('ctx.session.user.role === "ADMIN"');
  });

  it("list est scopé — plus jamais de findMany commission sans where", () => {
    const block = procedureBlock("list");
    expect(block).toContain("commissionScope(ctx)");
    expect(block).toContain("operatorId: scope.operatorId");
    expect(block).toContain("talentId: scope.userId");
  });

  it("getByMission est scopé par le même périmètre", () => {
    const block = procedureBlock("getByMission");
    expect(block).toContain("commissionScope(ctx)");
    expect(block).toContain("talentId: scope.userId");
  });

  it("getByCreator refuse un userId tiers pour un non-admin (FORBIDDEN explicite)", () => {
    const block = procedureBlock("getByCreator");
    expect(block).toContain("commissionScope(ctx)");
    expect(block).toContain('code: "FORBIDDEN"');
    expect(block).toContain("target !== scope.userId");
  });

  it("tierAtTime est réservé opérateur/console (operatorProcedure)", () => {
    const block = procedureBlock("tierAtTime");
    expect(block).toContain("operatorProcedure");
    expect(block).not.toContain("tierAtTime: protectedProcedure");
  });

  it("getAdjustedRate garde le périmètre self/operator/admin", () => {
    const block = procedureBlock("getAdjustedRate");
    expect(block).toContain("commissionScope(ctx)");
    expect(block).toContain('code: "FORBIDDEN"');
  });

  it("les mutations restent gouvernées (governedProcedure) — pas de régression", () => {
    for (const kind of ["LEGACY_COMMISSION_CALCULATE", "LEGACY_COMMISSION_MARK_PAID", "LEGACY_COMMISSION_GENERATE_PAYMENT_ORDER"]) {
      expect(source).toContain(kind);
    }
  });
});
