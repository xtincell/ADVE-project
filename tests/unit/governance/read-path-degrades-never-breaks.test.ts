/**
 * Anti-drift HARD — une surface de LECTURE dégrade, elle ne casse pas.
 *
 * Symptôme rapporté par l'opérateur : `/cockpit/brand/bible` « ne marche
 * toujours pas ». Deux défauts distincts, tous deux invisibles à `tsc`, au lint
 * et aux tests unitaires — et tous deux visibles à la première ouverture de la
 * page.
 *
 * **(1) La lecture indexait.** `loadBrandSourceContext` appelait
 * `ensureSourcesIndexed` inconditionnellement, « au cas où ». Le livre de marque
 * compose quatre volets → quatre passes complètes d'indexation + embedding par
 * affichage, sérialisées. L'indexation appartient à l'ingestion
 * (`INDEX_BRAND_SOURCE`, déjà branchée sur le dépôt) ; un chemin de lecture lit
 * ce qui est indexé, et le DIT quand rien ne l'est.
 *
 * **(2) Une panne de confort devenait une panne de page.** `searchByQuery`
 * promet depuis toujours « rend `[]` quand aucun fournisseur d'embedding n'est
 * disponible ». La promesse ne couvrait qu'un cas — *aucune clé configurée*. Un
 * fournisseur configuré mais qui refuse (Ollama injoignable + OpenAI
 * `billing_not_active`, l'état réel de la production le 2026-07-28) levait à
 * travers tous les appelants, qui sont des surfaces de lecture. Le Gateway
 * portait pourtant déjà la doctrine — « l'étage embeddings est skippable,
 * jamais sur le chemin critique » (ADR-0108) — appliquée à la jambe OpenRouter
 * et pas à la jambe OpenAI.
 *
 * Ce fichier verrouille les deux, plus la distinction qui garde la dégradation
 * honnête : indisponibilité d'exploitation → vecteurs vides ; défaut d'appel →
 * l'exception remonte.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const SOURCE_CONTEXT = "src/server/services/notoria/source-context.ts";
const COMPOSE = "src/server/services/brand-bible/compose.ts";
const ENGINE = "src/server/services/notoria/engine.ts";
const RANKER = "src/server/services/seshat/context-store/ranker.ts";
const GATEWAY = "src/server/services/llm-gateway/index.ts";

/**
 * Chemins de LECTURE : ils rendent une page ou répondent à une requête
 * synchrone. Aucun n'a le droit de déclencher une passe d'indexation.
 *
 * Le pendant : les chemins ASYNCHRONES (mission Notoria, enrichissement du
 * coffre) le peuvent — l'utilisateur n'attend pas devant.
 */
const READ_PATHS = [
  COMPOSE,
  "src/server/trpc/routers/brand-bible.ts",
  "src/server/services/mestor/council/context.ts",
];

describe("l'indexation n'est pas un effet de bord de la lecture", () => {
  it("`loadBrandSourceContext` n'indexe PAS par défaut", () => {
    const src = read(SOURCE_CONTEXT);
    // Le drapeau existe, et son défaut est explicitement `false`.
    expect(src).toMatch(/ensureIndexed\?:\s*boolean/);
    expect(src).toMatch(/opts\.ensureIndexed\s*\?\?\s*false/);
    // L'appel est gardé, jamais nu.
    const call = src.indexOf("await ensureSourcesIndexed(");
    expect(call).toBeGreaterThan(-1);
    const before = src.slice(Math.max(0, call - 400), call);
    expect(before).toMatch(/if\s*\(ensureIndexed\)/);
  });

  it("aucun chemin de lecture ne demande l'indexation", () => {
    for (const rel of READ_PATHS) {
      const src = read(rel);
      expect(src, `${rel} ne doit pas indexer en rendant une page`).not.toMatch(
        /ensureIndexed:\s*true/,
      );
      expect(src, `${rel} ne doit pas appeler l'indexeur directement`).not.toMatch(
        /ensureSourcesIndexed|indexBrandSource/,
      );
    }
  });

  it("la mission Notoria, elle, l'active explicitement (voie asynchrone)", () => {
    // Sans cet opt-in, une marque dont les documents n'ont jamais été indexés
    // n'aurait plus AUCUN chemin d'indexation de rattrapage.
    expect(read(ENGINE)).toMatch(/ensureIndexed:\s*true/);
  });
});

describe("une panne d'embedding dégrade, elle ne casse pas", () => {
  it("le ranker n'expose jamais l'exception d'embedding à ses appelants", () => {
    const src = read(RANKER);
    const at = src.indexOf("await embed({ input: query");
    expect(at).toBeGreaterThan(-1);
    const around = src.slice(Math.max(0, at - 300), at + 400);
    expect(around).toMatch(/try\s*\{/);
    expect(around).toMatch(/catch\s*\(/);
    // La dégradation est annoncée, pas silencieuse.
    expect(around).toMatch(/console\.warn/);
    expect(around).toMatch(/return \[\]/);
  });

  it("le Gateway applique ADR-0108 aux DEUX jambes, pas seulement à OpenRouter", () => {
    const src = read(GATEWAY);
    expect(src).toMatch(/function isEmbedProviderUnavailable/);
    // La jambe OpenAI rend des vecteurs vides quand elle est indisponible.
    const leg = src.slice(src.indexOf("const tryOpenAiThenOpenRouter"));
    const legBody = leg.slice(0, leg.indexOf("\n  };"));
    expect(legBody).toMatch(/isEmbedProviderUnavailable\(err\)/);
    expect(legBody).toMatch(/emptyEmbeddings\(/);
  });

  it("un défaut d'appel (400 / schéma) remonte quand même", () => {
    const src = read(GATEWAY);
    // La distinction est ce qui empêche la dégradation de masquer un vrai bug :
    // le prédicat ne doit pas rendre `true` pour tout.
    const fn = src.slice(
      src.indexOf("function isEmbedProviderUnavailable"),
      src.indexOf("function isEmbedProviderUnavailable") + 900,
    );
    expect(fn).not.toMatch(/return true;\s*\n\}/);
    expect(fn).toMatch(/isCreditExhaustionError\(err\)/);
    // Et les jambes gardent un `throw err` pour le reste.
    expect(src).toMatch(/throw err;/);
  });
});

describe("le mode de récupération est annoncé jusqu'à l'écran", () => {
  it("le contexte source porte SEMANTIC | DETERMINISTIC | NONE", () => {
    const src = read(SOURCE_CONTEXT);
    expect(src).toMatch(/"SEMANTIC"\s*\|\s*"DETERMINISTIC"\s*\|\s*"NONE"/);
    expect(src).toMatch(/retrieval:\s*"SEMANTIC"/);
    expect(src).toMatch(/retrieval:\s*excerpts\.length === 0 \? "NONE" : "DETERMINISTIC"/);
  });

  it("le livre de marque relaie ce mode au lieu de le jeter", () => {
    expect(read(COMPOSE)).toMatch(/ctx\.retrieval/);
  });
});
