/**
 * Anti-drift HARD — la documentation d'une marque : UN index, UNE récupération.
 *
 * Le repo portait DEUX index du même texte :
 *
 *   - `BRAND_SOURCE`  — écrit par `indexBrandSource` (voie gouvernée
 *     `INDEX_BRAND_SOURCE`, branchée sur l'ingestion), lu par `oracle-augment`,
 *     donc par le conseil de marque et par le MCP ;
 *   - `SOURCE_CHUNK`  — écrit par `vault-enrichment/source-rag.ts` pour son
 *     usage propre, lu par lui seul.
 *
 * Deux écrivains, deux pools disjoints, coût d'embedding doublé — et surtout :
 * un extrait récupéré dans l'un restait **invisible** de l'autre. C'est ce qui
 * rendait la vérification adversariale impossible : le producteur et le critique
 * ne lisaient pas les mêmes documents.
 *
 * Ce fichier verrouille quatre choses :
 *
 *  1. un seul écrivain d'index documentaire (`SOURCE_CHUNK` n'est plus écrit) ;
 *  2. Notoria récupère via le RAG partagé, pas via une sélection maison ;
 *  3. l'ancre de citation (`sourceId`) traverse le ranker — sans elle, rien
 *     n'est vérifiable en aval ;
 *  4. la voie de repli déterministe se DIT au lieu de se faire passer pour la
 *     recherche sémantique.
 *
 * S'y ajoute le verrou de non-régression de la lecture des sources (PR #653) :
 * ni plafond à 500 caractères, ni lecture réservée à une seule mission.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { renderSourceContext, type BrandSourceContext } from "@/server/services/notoria/source-context";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const SOURCE_RAG = "src/server/services/vault-enrichment/source-rag.ts";
const SOURCE_CONTEXT = "src/server/services/notoria/source-context.ts";
const RANKER = "src/server/services/seshat/context-store/ranker.ts";
const INDEXER = "src/server/services/seshat/context-store/indexer.ts";
const ENGINE = "src/server/services/notoria/engine.ts";

describe("index documentaire unique", () => {
  it("plus personne n'écrit de nœud SOURCE_CHUNK", () => {
    const rag = read(SOURCE_RAG);
    // Le kind survit en LECTURE (les nœuds déjà en base restent lisibles),
    // mais aucune création ne doit plus le viser.
    expect(rag).toMatch(/RETRIEVAL_KINDS\s*=\s*\[[^\]]*SOURCE_CHUNK_KIND/);
    const creates = rag.match(/brandContextNode\.create/g) ?? [];
    expect(creates).toHaveLength(0);
  });

  it("l'indexation délègue à l'indexeur canonique", () => {
    const rag = read(SOURCE_RAG);
    expect(rag).toMatch(/import\s*\{\s*indexBrandSource\s*\}/);
    expect(rag).toMatch(/indexBrandSource\(/);
  });

  it("la récupération couvre le pool canonique lu par le conseil", () => {
    const rag = read(SOURCE_RAG);
    expect(rag).toMatch(/BRAND_SOURCE_KIND\s*=\s*"BRAND_SOURCE"/);
    expect(rag).toMatch(/RETRIEVAL_KINDS\s*=\s*\[\s*BRAND_SOURCE_KIND/);
  });

  it("ré-indexer une source inchangée ne réécrit rien", () => {
    // Sans ce court-circuit, tout appelant qui veut simplement s'ASSURER qu'une
    // source est indexée repayait l'embedding complet — c'est ce qui avait
    // justifié le second index.
    expect(read(INDEXER)).toMatch(/alreadyFresh/);
  });
});

describe("ancre de citation", () => {
  it("le ranker porte sourceId jusqu'au consommateur", () => {
    const ranker = read(RANKER);
    expect(ranker).toMatch(/interface RankedNode[\s\S]*?sourceId:\s*string \| null/);
    // Déclaré ne suffit pas : il doit être réellement sélectionné en base.
    const selects = ranker.match(/sourceId:\s*true/g) ?? [];
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it("chaque extrait rendu porte l'identifiant de son document", () => {
    const ctx: BrandSourceContext = {
      excerpts: [
        {
          sourceId: "src_42",
          fileName: "PRD.pdf",
          certainty: "OFFICIAL",
          offset: 1200,
          text: "Le Palais compte cinq axes.",
        },
      ],
      documentsUsed: 1,
      documentsSkipped: 0,
      charsUsed: 27,
      empty: false,
      retrieval: "SEMANTIC",
    };
    const rendered = renderSourceContext(ctx);
    expect(rendered).toContain("source:src_42");
    expect(rendered).toContain("certitude:OFFICIAL");
    expect(rendered).toContain("offset:1200");
  });
});

describe("dégradation dite, pas subie", () => {
  const base: Omit<BrandSourceContext, "retrieval"> = {
    excerpts: [
      { sourceId: "s1", fileName: "note.md", certainty: "DECLARED", offset: 0, text: "abc" },
    ],
    documentsUsed: 1,
    documentsSkipped: 0,
    charsUsed: 3,
    empty: false,
  };

  it("le repli déterministe est annoncé", () => {
    expect(renderSourceContext({ ...base, retrieval: "DETERMINISTIC" })).toContain(
      "recherche sémantique indisponible",
    );
  });

  it("la voie nominale ne s'excuse pas", () => {
    expect(renderSourceContext({ ...base, retrieval: "SEMANTIC" })).not.toContain(
      "recherche sémantique indisponible",
    );
  });

  it("aucune source exploitable → rien rendu", () => {
    expect(
      renderSourceContext({
        excerpts: [],
        documentsUsed: 0,
        documentsSkipped: 0,
        charsUsed: 0,
        empty: true,
        retrieval: "NONE",
      }),
    ).toBe("");
  });
});

describe("non-régression de la lecture des sources (PR #653)", () => {
  it("Notoria passe par le RAG partagé", () => {
    const ctx = read(SOURCE_CONTEXT);
    expect(ctx).toMatch(/retrieveSourceChunksForField/);
    expect(ctx).toMatch(/ensureSourcesIndexed/);
  });

  it("aucun plafond aveugle sur le contenu d'un document", () => {
    expect(read(ENGINE)).not.toMatch(/rawContent[\s\S]{0,80}slice\(0,\s*500\)/);
  });

  it("les documents ne sont pas réservés à une seule mission", () => {
    const engine = read(ENGINE);
    const call = engine.indexOf("loadBrandSourceContext(");
    expect(call).toBeGreaterThan(0);
    // Les 400 caractères qui précèdent l'appel ne doivent porter aucune garde
    // de type mission : six missions sur sept ne voyaient AUCUN document, dont
    // celles qui bâtissent le noyau A/D/V/E à la naissance de la marque.
    expect(engine.slice(Math.max(0, call - 400), call)).not.toMatch(
      /if\s*\(missionType\s*===/,
    );
  });
});
