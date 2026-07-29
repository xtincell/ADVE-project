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

import { readFileSync, globSync } from "node:fs";
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

  it("un appel d'embedding a un plafond de patience", () => {
    const src = read(GATEWAY);
    expect(src).toMatch(/const EMBED_TIMEOUT_MS = /);
    // Les QUATRE appels réseau d'embedding le portent — un seul site oublié
    // suffit à rendre la saturation invisible, puisque c'est celui-là qui
    // pendra. Constaté en production : un service saturé ne renvoie pas
    // d'erreur, il ne renvoie RIEN.
    const sites = src.match(/signal:\s*AbortSignal\.timeout\(EMBED_TIMEOUT_MS\)/g) ?? [];
    expect(sites.length).toBe(4);
  });

  it("un service saturé est traité comme indisponible, pas comme un bug", () => {
    // Sans ça, le plafond transformerait la pendaison en exception — la panne
    // de page qu'on vient de fermer, par une autre porte.
    const src = read(GATEWAY);
    const fn = src.slice(
      src.indexOf("function isEmbedProviderUnavailable"),
      src.indexOf("function isEmbedProviderUnavailable") + 1200,
    );
    expect(fn).toMatch(/TimeoutError/);
    expect(fn).toMatch(/"timeout"/);
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

describe("« découpé » n'est pas « vectorisé »", () => {
  /**
   * L'écriture des fragments et le calcul de leurs vecteurs sont deux étapes,
   * et la seconde est best-effort. Quand le fournisseur d'embeddings est
   * indisponible, les fragments s'écrivent avec `embeddedAt: null`.
   *
   * L'indexation étant idempotente par CONTENU, une ré-indexation ultérieure
   * ressortait « déjà à jour » et **ne comblait jamais** les vecteurs : le
   * document restait introuvable en recherche sémantique **définitivement**.
   * Constaté en production le 2026-07-29 sur les cinq documents SPAWT déposés
   * pendant la panne du service d'embeddings.
   */
  const INDEXER = "src/server/services/seshat/context-store/indexer.ts";
  const SWEEP = "src/app/api/cron/ops-sweep/route.ts";

  it("le retour anticipé « déjà à jour » relance le remplissage des vecteurs", () => {
    const src = read(INDEXER);
    const at = src.indexOf("alreadyFresh: true");
    expect(at).toBeGreaterThan(-1);
    // Le rattrapage est déclenché AVANT de sortir, pas après (code mort).
    const before = src.slice(Math.max(0, at - 1500), at);
    expect(before).toMatch(/embedBrandContext\(source\.strategyId\)/);
  });

  it("le balayage nocturne rattrape l'arriéré déjà en base", () => {
    // Le correctif à la source ne vaut que pour les ré-indexations futures ;
    // les fragments déjà écrits sans vecteur ont besoin d'un filet.
    const src = read(SWEEP);
    expect(src).toMatch(/embedBrandContext/);
    expect(src).toMatch(/embedBackfill/);
  });
});

describe("retirer un document retire son index", () => {
  /**
   * `BrandContextNode.sourceId` est un `String?` **nu** — index, pas clé
   * étrangère, donc aucune cascade. Un `brandDataSource.delete` seul laisse des
   * fragments récupérables par le RAG et citables avec une ancre morte. Depuis
   * ADR-0184 une citation se vérifie PAR cette ancre : un orphelin est une
   * citation qui paraît vérifiée et ne l'est pas.
   */
  const DELETERS = [
    "src/server/trpc/routers/ingestion.ts",
    "src/server/services/quick-intake/purge-and-reingest.ts",
  ];

  it("tout suppresseur de source purge aussi ses fragments", () => {
    for (const rel of DELETERS) {
      const src = read(rel);
      expect(src, `${rel} supprime une source`).toMatch(/brandDataSource\.delete\(/);
      expect(src, `${rel} doit purger les fragments de la même source`).toMatch(
        /brandContextNode\.deleteMany\(\{\s*where:\s*\{\s*sourceId/,
      );
    }
  });

  it("aucun autre suppresseur de source n'existe hors scripts", () => {
    // Un nouveau site de suppression doit passer par cette revue.
    const srcFiles = globSync("src/**/*.ts", { cwd: ROOT }) as unknown as string[];
    const deleters = srcFiles.filter((rel) =>
      /brandDataSource\.delete(Many)?\(/.test(readFileSync(join(ROOT, rel), "utf8")),
    );
    expect(deleters.sort()).toEqual([...DELETERS].sort());
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
