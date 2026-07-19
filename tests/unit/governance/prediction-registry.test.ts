/**
 * Anti-drift CI — Registre des paris (ADR-0159, étend ADR-0156).
 *
 * Verrous :
 *   1. Kinds `SESHAT_DECLARE_PREDICTION` / `SESHAT_RESOLVE_PREDICTION`
 *      catalogués + SLOs coût LLM nul.
 *   2. SINGLE-WRITER `PredictionRecord` : toute mutation vit dans
 *      `services/seshat/prediction/index.ts` (verrou que l'ADR-0156 annonçait —
 *      posé ici).
 *   3. Append-only (Loi 1) : aucun `predictionRecord.delete` dans src.
 *   4. Règle Domino's STRUCTURELLE : le router refuse un pari public sans
 *      attestation, et plafonne son horizon.
 *   5. La page publique /paris ne projette jamais le déclarant.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { INTENT_KINDS } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";
import { PUBLIC_PLEDGE_MAX_HORIZON_DAYS, MEASURABLE_SUBJECTS } from "@/server/services/seshat/prediction";

const ROOT = join(__dirname, "../../..");
const SRC = join(ROOT, "src");
const WRITER = "src/server/services/seshat/prediction/index.ts";

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(p, acc);
    } else if (/\.tsx?$/.test(entry)) acc.push(p);
  }
  return acc;
}

describe("ADR-0159 — kinds + SLOs", () => {
  for (const kind of ["SESHAT_DECLARE_PREDICTION", "SESHAT_RESOLVE_PREDICTION"]) {
    it(`${kind} est catalogué (SESHAT, sync) avec SLO coût nul`, () => {
      const entry = INTENT_KINDS.find((k) => k.kind === kind);
      expect(entry).toBeDefined();
      expect(entry!.governor).toBe("SESHAT");
      expect(entry!.async).toBe(false);
      const slo = INTENT_SLOS.find((s) => s.kind === kind);
      expect(slo).toBeDefined();
      expect(slo!.costP95Usd).toBe(0);
    });
  }
});

describe("ADR-0159 — single-writer PredictionRecord (HARD)", () => {
  it("aucune mutation predictionRecord hors services/seshat/prediction/", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (rel === WRITER) continue;
      const src = readFileSync(file, "utf8");
      if (/predictionRecord\s*\.\s*(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/.test(src)) {
        offenders.push(rel);
      }
    }
    expect(offenders, `Mutation PredictionRecord hors single-writer : ${offenders.join(", ")}`).toEqual([]);
  });

  it("append-only (Loi 1) : aucun delete, même dans le single-writer", () => {
    const src = readFileSync(join(ROOT, WRITER), "utf8");
    expect(src).not.toMatch(/predictionRecord\s*\.\s*(delete|deleteMany)\s*\(/);
    // Une résolution ne réécrit jamais un résolu.
    expect(src).toMatch(/PREDICTION_ALREADY_RESOLVED/);
  });
});

describe("ADR-0159 — règle Domino's structurelle", () => {
  const routerSrc = readFileSync(join(ROOT, "src/server/trpc/routers/prediction.ts"), "utf8");

  it("un pari public sans attestation est refusé au parse", () => {
    expect(routerSrc).toMatch(/dominosAttestation/);
    expect(routerSrc).toMatch(/DOMINOS_ATTESTATION_REQUIRED/);
  });

  it("l'horizon d'un pari public est plafonné (fenêtre vérifiable)", () => {
    expect(PUBLIC_PLEDGE_MAX_HORIZON_DAYS).toBeLessThanOrEqual(180);
    expect(routerSrc).toMatch(/PUBLIC_PLEDGE_HORIZON_TOO_FAR/);
  });

  it("la déclaration est gouvernée requireOperator (séquençage humain)", () => {
    expect(routerSrc).toMatch(/SESHAT_DECLARE_PREDICTION/);
    expect(routerSrc).toMatch(/requireOperator:\s*true/);
  });
});

describe("ADR-0159 — page publique /paris", () => {
  const PAGE = join(ROOT, "src/app/(public)/paris/page.tsx");

  it("la page existe et lit le registre public", () => {
    expect(existsSync(PAGE)).toBe(true);
    expect(readFileSync(PAGE, "utf8")).toMatch(/listPublicPledges/);
  });

  it("ne projette jamais le déclarant ni une PII", () => {
    const src = readFileSync(PAGE, "utf8");
    expect(src).not.toMatch(/declaredBy|refereeEmail|contactEmail/);
    const writerSrc = readFileSync(join(ROOT, WRITER), "utf8");
    // La projection publique du service n'expose pas declaredBy.
    const publicSection = writerSrc.slice(writerSrc.indexOf("listPublicPledges"));
    expect(publicSection.slice(0, 2200)).not.toMatch(/declaredBy:\s*r\.declaredBy/);
  });

  it("les sujets auto-mesurables sont bornés au réellement mesuré", () => {
    expect([...MEASURABLE_SUBJECTS]).toEqual(["AUDIENCE_TOTAL", "COMMUNITY_HEALTH", "FOOTPRINT_SCORE"]);
  });
});
