/**
 * Anti-drift HARD — une ligne `KnowledgeEntry` dérivée d'UNE marque porte son
 * attribution canonique.
 *
 * `KnowledgeEntry` est une table TRANSVERSE aux marques, servie à des outils
 * MCP de portée GLOBAL. Le seul rempart qui empêche une ligne appartenant à une
 * marque d'être servie à une autre est le prédicat `CROSS_BRAND_WHERE`
 * (`seshat/references.ts`), et ce prédicat reconnaît **une** clé
 * d'attribution : `data.strategyId`.
 *
 * Cette classe a fui DEUX FOIS :
 *
 *  1. `knowledge_graph_ingest` exigeait un `strategyId` et ne l'écrivait
 *     jamais — les entrées naissaient orphelines de leur marque ;
 *  2. les écrivains Tarsis écrivaient l'attribution sous `generatedFor`, un nom
 *     maison que le prédicat ignore — alors que la ligne contient le pilier T
 *     COMPLET d'une marque, plus son score de fit marché en `successScore`.
 *
 * Le deuxième cas a survécu au correctif du premier parce que le correctif
 * visait les instances connues. Ce test vise la classe : toute création de
 * `KnowledgeEntry` doit soit porter `strategyId` dans son `data`, soit être
 * inscrite comme AGRÉGAT avec sa raison.
 *
 * `sampleSize` ne peut pas jouer ce rôle : selon l'écrivain il compte des
 * marques (le sens attendu) ou des signaux (qui dépasse tout seuil pour une
 * seule marque). L'attribution est la seule garde fiable.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

/**
 * Écrivains dont la ligne est un VRAI agrégat multi-marques — pas d'attribution
 * à porter, c'est leur nature. Chaque entrée doit dire pourquoi.
 */
const AGGREGATE_WRITERS: Record<string, string> = {
  "server/services/knowledge-seeder/index.ts":
    "agrège les composites d'un SECTEUR (sampleSize = nombre de marques) ; les lignes par-marque du même fichier (DIAGNOSTIC_RESULT/MISSION_OUTCOME) portent bien data.strategyId",
  "server/services/knowledge-aggregator/index.ts":
    "VRAIS agrégats multi-marques : `agg-benchmark-<secteur>-<marché>` (avgComposite sur data.composites.length marques) et `agg-brief-<canal>` — aucune marque n'y est identifiable",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

/** Corps équilibré de chaque `knowledgeEntry.create|upsert({ … })`. */
function writeCalls(source: string): { body: string; line: number }[] {
  const out: { body: string; line: number }[] = [];
  const opener = /\.knowledgeEntry\.(create|upsert)\s*\(\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = opener.exec(source)) !== null) {
    const start = source.indexOf("{", m.index + m[0].length - 1);
    let depth = 0;
    let end = start;
    for (let i = start; i < source.length; i++) {
      const ch = source[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    out.push({ body: source.slice(start, end + 1), line: source.slice(0, m.index).split("\n").length });
  }
  return out;
}

describe("HARD — attribution canonique des entrées du graphe de connaissances", () => {
  const files = walk(SRC);

  it("trouve bien les sources à scanner (garde anti-scan-vide)", () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it("toute écriture d'un type SERVI hors marque porte `strategyId`", () => {
    // Portée exacte du risque : seuls les types que `CROSS_BRAND_WHERE` sert
    // au-delà de la marque peuvent fuiter. `MISSION_OUTCOME`,
    // `DIAGNOSTIC_RESULT`, `EXTERNAL_FEED_DIGEST`… sont déjà exclus par le
    // prédicat — exiger leur attribution serait du bruit qui ferait ignorer
    // le signal. Un `entryType` DYNAMIQUE (variable) est traité comme à risque :
    // impossible de le trancher statiquement.
    const CROSS_BRAND_TYPES = /SECTOR_BENCHMARK|BRIEF_PATTERN|CAMPAIGN_TEMPLATE/;
    const DYNAMIC_TYPE = /entryType:\s*(?!")[A-Za-z_$]/;
    const offenders: string[] = [];
    for (const file of files) {
      const rel = file.replace(`${SRC}/`, "");
      if (AGGREGATE_WRITERS[rel]) continue;
      const src = readFileSync(file, "utf8");
      for (const call of writeCalls(src)) {
        const atRisk = CROSS_BRAND_TYPES.test(call.body) || DYNAMIC_TYPE.test(call.body);
        if (!atRisk) continue;
        // `strategyId` seul (clé canon) — `generatedFor`, `subjectId`… ne comptent pas.
        if (!/\bstrategyId\b/.test(call.body)) {
          offenders.push(`${rel}:${call.line} — knowledgeEntry sans attribution \`strategyId\``);
        }
      }
    }
    expect(
      offenders,
      `${offenders.length} écriture(s) KnowledgeEntry sans attribution canonique.\n` +
        `Ajoute \`strategyId\` dans \`data\`, ou inscris l'écrivain à AGGREGATE_WRITERS avec sa raison.\n` +
        offenders.join("\n"),
    ).toEqual([]);
  });

  it("l'allowlist des agrégats ne contient que des fichiers réels", () => {
    for (const rel of Object.keys(AGGREGATE_WRITERS)) {
      expect(() => readFileSync(join(SRC, rel), "utf8"), `${rel} n'existe plus`).not.toThrow();
    }
  });

  it("le prédicat de portée transverse filtre bien sur `data.strategyId`", () => {
    const refs = readFileSync(join(SRC, "server", "services", "seshat", "references.ts"), "utf8");
    expect(refs).toMatch(/CROSS_BRAND_WHERE/);
    expect(refs).toMatch(/path:\s*\["strategyId"\]/);
  });

  it("le détecteur reconnaît la forme fautive", () => {
    expect(writeCalls('db.knowledgeEntry.create({ data: { sector: "x" } })')).toHaveLength(1);
    expect(writeCalls('db.knowledgeEntry.create({ data: {} })')).toHaveLength(1);
    expect(
      writeCalls('db.knowledgeEntry.create({ data: { strategyId } })')[0]!.body,
    ).toMatch(/strategyId/);
  });
});
