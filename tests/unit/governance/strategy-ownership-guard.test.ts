/**
 * Verrou HARD — gardes d'ownership par marque sur les routeurs tRPC (ADR-0166).
 *
 * Classe de fuite prouvée exploitable (gazette Jehuty, v6.27.230 ; recensement
 * RESIDUAL-DEBT 2026-07-20) : une procédure `protectedProcedure` qui accepte un
 * `strategyId` sans vérifier l'accès laisse tout compte authentifié lire/muter
 * les données d'une autre marque.
 *
 * Règle : toute procédure `protectedProcedure` (ou base `audited…` non
 * enveloppée) dont le corps référence `strategyId` DOIT contenir un motif de
 * garde — middleware `strategyScopedProcedure`, helper `assert…` ou `enforce…`
 * suffixé (Access|Read|Write|Scope), chokepoint `canAccessStrategy`/`scope…`,
 * `accessibleStrategyIds`, `resolveOperatorId` ou `getOperatorContext` —
 * OU figurer dans l'allowlist justifiée ci-dessous, qui ne peut que DÉCROÎTRE.
 *
 * Lanes exemptes par conception : `operatorProcedure`/`adminProcedure`
 * (opérateurs cross-marques), `governedProcedure` (spine ADR-0124, audit
 * requireOperator PR #447), `publicProcedure` (capacité par token — vérifiée
 * au cas par cas), bases `audited*` enveloppées par `assertRawStrategyScope`.
 *
 * NOTE STATIQUE : l'analyse est textuelle (spans entre déclarations de
 * procédures). Un helper de garde no-op tromperait ce test — la revue de code
 * reste responsable de la sémantique des helpers `assert…` et `enforce…`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROUTERS_DIR = join(process.cwd(), "src/server/trpc/routers");

const BOUNDARY = /^\s{2,6}([A-Za-z0-9_]+):\s*([A-Za-z0-9_]+)/;
const GUARD =
  /\b(?:assert|enforce)[A-Za-z0-9_]*(?:Access|Read|Write|Scope)[A-Za-z0-9_]*\s*\(|canAccessStrategy\(|scopeStrategies\(|scopeSignals\(|scopeCampaigns\(|scopeMissions\(|scopeGloryOutputs\(|scopeDeals\(|scopeDrivers\(|scopeProcesses\(|accessibleStrategyIds\(|resolveOperatorId\(|getOperatorContext\(/;

/**
 * Allowlist « à mes risques et périls » — chaque entrée est justifiée et ne
 * peut être qu'RETIRÉE (jamais ajoutée sans amendement ADR-0166 documenté).
 */
const ALLOWLIST: Record<string, string> = {
  "deliverable-orchestrator.ts|listSupportedKinds":
    "Catalogue statique de BrandAsset.kind sans input — les mentions strategyId sont documentaires (table target-mapping).",
  "strategy.ts|myDelegatedBrands":
    "Requête par userId du caller uniquement (StrategyCollaborator ACTIVE) — aucun id étranger en input.",
  "strategy.ts|getMyAccess":
    "Retourne uniquement le rôle/zones du caller sur la marque demandée — aucune donnée de marque exposée.",
};

interface Violation {
  key: string;
}

function scanViolations(): Violation[] {
  const violations: Violation[] = [];
  for (const f of readdirSync(ROUTERS_DIR).filter((n) => n.endsWith(".ts"))) {
    const src = readFileSync(join(ROUTERS_DIR, f), "utf8");

    // Bases composées enveloppées par la garde (ex. auditedProtected) → exemptes.
    const wrapped = new Set<string>();
    const wrapRe = /const (\w+) = auditedProcedure\([\s\S]{0,200}?\)\.use\([\s\S]{0,500}?assertRawStrategyScope/g;
    let wm: RegExpExecArray | null;
    while ((wm = wrapRe.exec(src))) wrapped.add(wm[1] ?? "");

    const lines = src.split("\n");
    let cur: { name: string; builder: string; buf: string[] } | null = null;
    const spans: Array<{ name: string; builder: string; buf: string[] }> = [];
    for (const line of lines) {
      const m = line.match(BOUNDARY);
      const name = m?.[1] ?? "";
      const builder = m?.[2] ?? "";
      if (
        m &&
        (builder.includes("rocedure") || builder.includes("Protected") || wrapped.has(builder) || builder === "auditedProtected")
      ) {
        if (cur) spans.push(cur);
        cur = { name, builder, buf: [] };
      }
      if (cur) cur.buf.push(line);
    }
    if (cur) spans.push(cur);

    for (const s of spans) {
      const enforced =
        s.builder === "protectedProcedure" ||
        (s.builder === "auditedProtected" && !wrapped.has("auditedProtected"));
      if (!enforced) continue;
      const text = s.buf.join("\n");
      if (/\bstrategyId\b/.test(text) && !GUARD.test(text)) {
        violations.push({ key: `${f}|${s.name}` });
      }
    }
  }
  return violations;
}

describe("strategy-ownership-guard (HARD — ADR-0166)", () => {
  const violations = scanViolations();
  const keys = violations.map((v) => v.key).sort();
  const allow = Object.keys(ALLOWLIST).sort();

  it("toute procédure protected+strategyId est gardée ou allowlistée", () => {
    const unlisted = keys.filter((k) => !ALLOWLIST[k]);
    expect(
      unlisted,
      `Procédures protected+strategyId SANS garde d'ownership (poser strategyScopedProcedure, un assert*/enforce* d'accès, ou un scope — cf. ADR-0166) :\n${unlisted.join("\n")}`,
    ).toEqual([]);
  });

  it("l'allowlist ne dérive pas (exactement les entrées justifiées, qui ne peuvent que décroître)", () => {
    // Une entrée allowlist qui ne matche plus = garde posée → la RETIRER ici.
    expect(keys).toEqual(allow);
    expect(allow.length).toBeLessThanOrEqual(3);
  });

  it("le middleware canonique existe et applique canAccessStrategy", () => {
    const mw = readFileSync(
      join(process.cwd(), "src/server/trpc/middleware/strategy-scope.ts"),
      "utf8",
    );
    expect(mw).toContain("canAccessStrategy");
    expect(mw).toContain("strategyScopedProcedure");
    expect(mw).toContain("assertRawStrategyScope");
  });
});
