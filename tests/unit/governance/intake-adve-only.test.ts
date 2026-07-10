/**
 * Vague D — intake ADVE-only. Doctrine (CLAUDE.md) : les piliers ADVE sont le
 * socle fondateur ; les RTIS sont DÉRIVÉS (rtis-draft V3 / ENRICH_*). L'intake
 * ne doit ni extraire ni écrire du r/t/i/s depuis le questionnaire déclaratif
 * (fabrication de contenu marché — ADR-0046). Contrat verrouillé par analyse
 * source (le service importe Prisma/next — même approche que router.test.ts).
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const source = fs.readFileSync(
  path.resolve(__dirname, "../../../src/server/services/quick-intake/index.ts"),
  "utf-8",
);

describe("intake ADVE-only (vague D)", () => {
  it("complete() écrit les piliers ADVE uniquement", () => {
    expect(source).toContain("const pillars = [...ADVE_STORAGE_KEYS];");
    expect(source).not.toContain("const pillars = [...PILLAR_STORAGE_KEYS];");
  });

  it("l'extraction structurée cible ADVE uniquement (complete + regenerate)", () => {
    const matches = source.match(/const targetPillars = ADVE_STORAGE_KEYS;/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain("const targetPillars = PILLAR_STORAGE_KEYS;");
  });

  it("les 8 lignes pilier restent pré-créées (gateway + rtis-draft V3 en dépendent)", () => {
    expect(source).toContain("for (const p of PILLAR_STORAGE_KEYS)");
  });

  it("la re-extraction premium post-paiement existe et passe par regenerateAnalysis", () => {
    expect(source).toContain("export function premiumReextractAfterPayment");
    expect(source).toContain("regenerateAnalysis(intakeToken, { premium: true })");
  });

  it("les 3 webhooks paiement déclenchent la re-extraction premium", () => {
    for (const provider of ["stripe", "cinetpay", "paypal"]) {
      const route = fs.readFileSync(
        path.resolve(__dirname, `../../../src/app/api/payment/webhook/${provider}/route.ts`),
        "utf-8",
      );
      expect(route, `webhook ${provider}`).toContain("premiumReextractAfterPayment");
    }
  });
});
