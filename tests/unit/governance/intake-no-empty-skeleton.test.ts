/**
 * Anti-drift — Intake funnel : jamais de squelette vide, jamais d'écrasement null.
 *
 * # Les deux classes de bug que ce test verrouille (incident funnel 2026-07-11)
 *
 * 1. **Squelette tout-vide persisté.** `extractFromText` (router quick-intake)
 *    renvoyait `{ biz: {}, a: {}, d: {}, v: {}, e: {}, r: {}, t: {}, i: {}, s: {} }`
 *    sur TOUTE erreur LLM (provider down, crédits épuisés, JSON tronqué par
 *    maxOutputTokens trop bas). Ce squelette était persisté dans
 *    `QuickIntake.responses`, `complete()` jetait `IncompleteIntakeError`, et le
 *    front basculait EN SILENCE du chemin court (import) vers le questionnaire
 *    long — l'utilisateur voyait « Terminé 100 % » puis atterrissait sur un
 *    formulaire de 10 minutes sans explication. C'est la classe de row
 *    qu'interdisent les gardes `hasSubstantiveAnswer` de advance()/complete()
 *    (cf. services/quick-intake/index.ts). Contrat désormais : extraction
 *    impossible → `null` + raison explicite (`llm_unavailable` / `extraction`)
 *    remontée au front, qui explique la bascule (bandeau `?fallback=`).
 *
 * 2. **Écrasement par null d'une déclaration antérieure.** `processIngest`
 *    persistait `websiteUrl: input.websiteUrl ?? null` : le site déclaré à
 *    l'étape contact (landing) était DÉTRUIT si le champ (redemandé) de la page
 *    ingest restait vide — l'empreinte publique (`enrichPublicFootprint`)
 *    perdait alors sa source principale. Contrat désormais : `?? undefined`
 *    (champ non touché) + coalesce `input.websiteUrl ?? intake.websiteUrl`.
 *
 * Mode HARD (baseline = 0) — toute réintroduction bloque le merge.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hasSubstantiveAnswer } from "@/server/services/quick-intake";

const ROOT = join(__dirname, "..", "..", "..");
const ROUTER = readFileSync(
  join(ROOT, "src", "server", "trpc", "routers", "quick-intake.ts"),
  "utf-8",
);

describe("Intake funnel — no empty skeleton, no null-erase (HARD)", () => {
  it("le router ne fabrique plus le squelette tout-vide { biz: {}, a: {}, … }", () => {
    // L'ancien fallback exact — toute variante avec les 9 clés vides est un drift.
    expect(ROUTER).not.toMatch(/biz:\s*\{\s*\},\s*a:\s*\{\s*\},\s*d:\s*\{\s*\}/);
  });

  it("extractFromText a le pré-flight isTextLLMAvailable (skip propre quand providers down)", () => {
    expect(ROUTER).toContain("isTextLLMAvailable");
  });

  it("aucune persistance `websiteUrl`/`rawText`/`documentUrl` ne null-érase une déclaration antérieure", () => {
    // Pattern interdit : `<champ>: input.<x> ?? null` (ou urls?.[0] ?? null) —
    // undefined = champ non touché, null = destruction de la valeur déclarée.
    expect(ROUTER).not.toMatch(
      /(?:websiteUrl|rawText|documentUrl):\s*input\.[\w?.[\]]+\s*\?\?\s*null/,
    );
  });

  it("processIngest coalesce le site déclaré au start (input ?? intake.websiteUrl)", () => {
    expect(ROUTER).toMatch(/input\.websiteUrl\s*\?\?\s*intake\.websiteUrl/);
  });

  it("la bascule chemin court → questionnaire porte une raison explicite", () => {
    expect(ROUTER).toContain('reason: "llm_unavailable"');
    expect(ROUTER).toContain('reason: "extraction"');
  });

  it("getQuestions auto-détecte avec hasSubstantiveAnswer (parité advance/complete)", () => {
    // Le comptage par simple présence de clé (Object.keys) marquait comme
    // répondues des slices vides persistées par des rows legacy.
    expect(ROUTER).toContain(
      "filter(([, v]) => quickIntakeService.hasSubstantiveAnswer(v))",
    );
  });
});

describe("hasSubstantiveAnswer — prédicat exporté (source unique)", () => {
  it("rejette les slices creuses sous toutes leurs formes", () => {
    expect(hasSubstantiveAnswer({})).toBe(false);
    expect(hasSubstantiveAnswer({ a_vision: "" })).toBe(false);
    expect(hasSubstantiveAnswer({ a_vision: "   " })).toBe(false);
    expect(hasSubstantiveAnswer({ list: [] })).toBe(false);
    expect(hasSubstantiveAnswer({ nested: { deep: null } })).toBe(false);
    expect(hasSubstantiveAnswer(null)).toBe(false);
    expect(hasSubstantiveAnswer(undefined)).toBe(false);
  });

  it("accepte dès qu'une valeur substantielle existe", () => {
    expect(hasSubstantiveAnswer({ a_vision: "Devenir la référence" })).toBe(true);
    expect(hasSubstantiveAnswer({ scale: 7 })).toBe(true);
    expect(hasSubstantiveAnswer({ multi: ["choix"] })).toBe(true);
    expect(hasSubstantiveAnswer({ nested: { deep: "oui" } })).toBe(true);
    expect(hasSubstantiveAnswer({ flag: false })).toBe(true);
  });
});
