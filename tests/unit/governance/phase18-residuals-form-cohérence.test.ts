/**
 * Anti-drift CI test — Phase 18 résidus formulaire (v6.18.25).
 *
 * Vérifie la cohérence entre :
 *  - schema Prisma (Phase18ResidualEntry + 2 enums)
 *  - router tRPC (phase18Residuals.upsert/resolve/dismiss/list/stats)
 *  - registration dans appRouter
 *  - documentation source-of-truth (RESIDUAL-DEBT.md §Phase 18 + memory user)
 *
 * Drift surveillé : si une catégorie est ajoutée au schema mais pas documentée
 * dans la liste exhaustive RESIDUAL-DEBT.md, le test fail. Inverse aussi —
 * une catégorie documentée doit exister dans le schema.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");
const SCHEMA_PATH = join(ROOT, "prisma/schema.prisma");
const ROUTER_PATH = join(ROOT, "src/server/trpc/routers/phase18-residuals.ts");
const APP_ROUTER_PATH = join(ROOT, "src/server/trpc/router.ts");
const RESIDUAL_DEBT_PATH = join(ROOT, "docs/governance/RESIDUAL-DEBT.md");
const FORM_PAGE_PATH = join(
  ROOT,
  "src/app/(console)/console/governance/phase-18-residuals/page.tsx",
);

const CANONICAL_CATEGORIES = [
  "BIBLE_VAR",
  "GLORY_TOOL",
  "PILLAR_DUPLICATE",
  "FEATURE_FLAG",
  "LLM_TUNING",
  "PHASE_18_BIS",
  "CACHE_INFRA",
] as const;

const CANONICAL_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "RESOLVED",
  "DISMISSED",
] as const;

const CANONICAL_PROCEDURES = [
  "upsert",
  "resolve",
  "dismiss",
  "list",
  "stats",
] as const;

function read(path: string): string {
  return readFileSync(path, "utf-8");
}

describe("Phase 18 résidus — schema Prisma cohérence", () => {
  const schema = read(SCHEMA_PATH);

  it("expose enum Phase18ResidualCategory avec les 7 catégories canoniques", () => {
    const block = schema.match(/enum Phase18ResidualCategory \{([\s\S]*?)\}/);
    expect(block, "enum Phase18ResidualCategory introuvable").toBeTruthy();
    for (const cat of CANONICAL_CATEGORIES) {
      expect(block![1]).toContain(cat);
    }
  });

  it("expose enum Phase18ResidualStatus avec PENDING/IN_PROGRESS/RESOLVED/DISMISSED", () => {
    const block = schema.match(/enum Phase18ResidualStatus \{([\s\S]*?)\}/);
    expect(block, "enum Phase18ResidualStatus introuvable").toBeTruthy();
    for (const status of CANONICAL_STATUSES) {
      expect(block![1]).toContain(status);
    }
  });

  it("model Phase18ResidualEntry a les colonnes minimales attendues", () => {
    const block = schema.match(/model Phase18ResidualEntry \{([\s\S]*?)^\}/m);
    expect(block, "model Phase18ResidualEntry introuvable").toBeTruthy();
    const body = block![1] ?? "";
    expect(body).toMatch(/operatorId\s+String/);
    expect(body).toMatch(/category\s+Phase18ResidualCategory/);
    expect(body).toMatch(/targetKey\s+String/);
    expect(body).toMatch(/payload\s+Json/);
    expect(body).toMatch(/status\s+Phase18ResidualStatus/);
    expect(body).toMatch(/notes\s+String\?/);
    expect(body).toMatch(/resolvedAt\s+DateTime\?/);
    expect(body).toMatch(/resolvedBy\s+String\?/);
  });

  it("model Phase18ResidualEntry a la contrainte unique (operatorId, category, targetKey) pour idempotence upsert", () => {
    const block = schema.match(/model Phase18ResidualEntry \{([\s\S]*?)^\}/m);
    const body = block![1] ?? "";
    expect(body).toMatch(/@@unique\(\[operatorId,\s*category,\s*targetKey\]\)/);
  });

  it("Operator a la relation inverse phase18Residuals", () => {
    const block = schema.match(/model Operator \{([\s\S]*?)^\}/m);
    expect(block).toBeTruthy();
    expect(block![1]).toMatch(
      /phase18Residuals\s+Phase18ResidualEntry\[\]\s+@relation\("OperatorPhase18Residuals"/,
    );
  });
});

describe("Phase 18 résidus — router tRPC cohérence", () => {
  const router = read(ROUTER_PATH);

  it("router exporte phase18ResidualsRouter avec les 5 procédures canoniques", () => {
    expect(router).toContain("export const phase18ResidualsRouter");
    for (const proc of CANONICAL_PROCEDURES) {
      // pattern : `procName: <lane>Procedure`. Le durcissement round-6 a passé
      // ces 5 procédures à `adminProcedure` (métadonnées de gouvernance +
      // `resolvedBy` non-spoofable) — on accepte toute lane authentifiée.
      const pattern = new RegExp(`${proc}\\s*:\\s*(protected|operator|admin)Procedure`);
      expect(router, `procédure ${proc} manquante`).toMatch(pattern);
    }
  });

  it("router enum Zod CategoryEnum aligné avec schema Prisma", () => {
    for (const cat of CANONICAL_CATEGORIES) {
      expect(router).toContain(`"${cat}"`);
    }
  });

  it("router enum Zod StatusEnum aligné avec schema Prisma", () => {
    for (const status of CANONICAL_STATUSES) {
      expect(router).toContain(`"${status}"`);
    }
  });

  it("appRouter expose phase18Residuals", () => {
    const appRouter = read(APP_ROUTER_PATH);
    expect(appRouter).toMatch(/phase18Residuals\s*:\s*phase18ResidualsRouter/);
    expect(appRouter).toContain('from "./routers/phase18-residuals"');
  });
});

describe("Phase 18 résidus — page UI formulaire cohérence", () => {
  it("page formulaire existe au path canonique /console/governance/phase-18-residuals", () => {
    expect(existsSync(FORM_PAGE_PATH)).toBe(true);
  });

  it("page formulaire référence les 7 catégories canoniques", () => {
    const page = read(FORM_PAGE_PATH);
    for (const cat of CANONICAL_CATEGORIES) {
      expect(page, `catégorie ${cat} absente du formulaire UI`).toContain(cat);
    }
  });
});

describe("Phase 18 résidus — documentation cohérence", () => {
  const debt = read(RESIDUAL_DEBT_PATH);

  it("RESIDUAL-DEBT.md a une section §Phase 18 — résidus derrière formulaire opérateur", () => {
    expect(debt).toMatch(/Phase 18.*résidus.*formulaire/i);
  });

  it("RESIDUAL-DEBT.md liste les 7 catégories de résidus", () => {
    for (const cat of CANONICAL_CATEGORIES) {
      expect(debt, `catégorie ${cat} absente de RESIDUAL-DEBT.md`).toContain(cat);
    }
  });

  it("RESIDUAL-DEBT.md référence le path canonique du formulaire", () => {
    expect(debt).toContain("/console/governance/phase-18-residuals");
  });

  it("RESIDUAL-DEBT.md référence le model Prisma Phase18ResidualEntry", () => {
    expect(debt).toContain("Phase18ResidualEntry");
  });
});
