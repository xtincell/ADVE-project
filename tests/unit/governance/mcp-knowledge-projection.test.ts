/**
 * Anti-drift HARD — `KnowledgeEntry` ne sort jamais brute d'un outil MCP.
 *
 * ## L'incident, et pourquoi ce test existe plutôt qu'un simple correctif
 *
 * `KnowledgeEntry` est une table **transverse aux marques** dont le champ `data`
 * porte des payloads nominatifs : `knowledge-seeder` y écrit `strategyName`, le
 * `composite` d'une marque et ses 8 `pillarScores` ; `knowledge_graph_ingest` y
 * force désormais le `strategyId` du propriétaire. Plusieurs outils MCP la
 * rendaient **ligne entière**.
 *
 * Premier round de remédiation : j'ai corrigé les **trois outils que j'avais
 * touchés**. La relecture adversariale suivante en a trouvé **douze autres dans
 * les mêmes fichiers**, dont un (`competitor_analysis`) atteignable par une clé
 * de marque avec `competitorName: ""` → `LIKE '%%'` → toutes les entrées.
 * Réparer les instances ne fermait pas la classe.
 *
 * Ce test ferme la classe : toute nouvelle lecture non projetée est refusée en
 * CI, pas découverte au prochain audit.
 *
 * ## La règle
 *
 * Dans `src/server/mcp/**`, une lecture de `KnowledgeEntry` :
 *   - porte un `select` (idéalement `SECTOR_META_SELECT`) — la donnée
 *     propriétaire ne quitte pas la base ; **ou**
 *   - est explicitement listée ci-dessous parce que le handler a besoin de
 *     `data` en INTERNE (filtrage, classement) — auquel cas il doit projeter
 *     sa sortie via `toSectorMeta`, ce que le test vérifie aussi.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const MCP_DIR = join(ROOT, "src", "server", "mcp");

/**
 * Handlers autorisés à lire `KnowledgeEntry` en entier — parce qu'ils filtrent
 * ou classent sur `data`. Chacun DOIT projeter sa sortie (vérifié plus bas).
 * Toute addition à cette liste est un geste conscient qui se justifie en revue.
 */
const INTERNAL_READ_ALLOWLIST = [
  { file: "intelligence/index.ts", why: "knowledge_graph_query : filtre par data.strategyId + classement par mots-clés" },
  { file: "pulse/index.ts", why: "ugc_track / ritual_adoption_measure : filtrent par data.strategyId (le champ `sector` n'est pas une dimension de marque)" },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

const FILES = walk(MCP_DIR);

/** Lectures de KnowledgeEntry sans `select` dans les ~700 caractères suivants. */
function rawReads(src: string): number[] {
  const lines: number[] = [];
  const re = /db\.knowledgeEntry\.find(?:Many|First|Unique)\(\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const window = src.slice(m.index, m.index + 700);
    // On coupe à la fermeture de l'appel pour ne pas capter le `select` du voisin.
    const call = window.split("});")[0] ?? window;
    if (!/\bselect:/.test(call)) lines.push(src.slice(0, m.index).split("\n").length);
  }
  return lines;
}

describe("KnowledgeEntry ne sort jamais brute d'un outil MCP", () => {
  it("toute lecture non projetée est explicitement justifiée", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const rel = file.slice(MCP_DIR.length + 1);
      if (INTERNAL_READ_ALLOWLIST.some((a) => rel === a.file)) continue;
      const raws = rawReads(readFileSync(file, "utf8"));
      for (const line of raws) offenders.push(`${rel}:${line}`);
    }
    expect(
      offenders,
      "Ajouter `select: SECTOR_META_SELECT` (cf. `_shared/knowledge-projection.ts`) — `KnowledgeEntry.data` porte le nom et les scores des marques.",
    ).toEqual([]);
  });

  it("les fichiers autorisés à lire en entier projettent bien leur sortie", () => {
    for (const { file, why } of INTERNAL_READ_ALLOWLIST) {
      const src = readFileSync(join(MCP_DIR, file), "utf8");
      expect(src, `${file} lit \`data\` en interne (${why}) — il DOIT projeter sa sortie.`).toMatch(
        /toSectorMeta/,
      );
      // Et ne doit jamais renvoyer l'entité telle quelle.
      expect(src, `${file} ne doit pas rendre une entité KnowledgeEntry brute.`).not.toMatch(
        /entries:\s*ranked\.map\(\(r\) => r\.entry\)/,
      );
    }
  });

  it("le module de projection reste une liste BLANCHE", () => {
    const src = readFileSync(
      join(MCP_DIR, "_shared", "knowledge-projection.ts"),
      "utf8",
    );
    // Une liste blanche est sûre par défaut ; un `omit` laisserait passer tout
    // champ ajouté au modèle demain.
    expect(src).toMatch(/SECTOR_META_SELECT/);
    // `omit:` en tant que CLÉ Prisma (le mot en prose est autorisé — il sert
    // justement à expliquer pourquoi on ne l'emploie pas).
    expect(src).not.toMatch(/^\s*omit:/m);
    // `data` et `sourceHash` ne sont jamais dans la projection.
    const projection = src.slice(src.indexOf("SECTOR_META_SELECT"), src.indexOf("} as const"));
    expect(projection).not.toMatch(/\bdata\b/);
    expect(projection).not.toMatch(/sourceHash/);
  });
});

describe("la portée d'une clé MCP est fail-closed", () => {
  it("seul « SYSTEM » exact donne la portée globale", async () => {
    const { normalizeScopeKind } = await import("@/server/services/anubis/mcp-scope-kind");
    expect(normalizeScopeKind("SYSTEM")).toBe("SYSTEM");
    expect(normalizeScopeKind("BRAND")).toBe("BRAND");
    // `scopeKind` est une colonne String libre (pas un enum Prisma) : toute
    // valeur inattendue devait donner la portée la plus RESTREINTE, pas la plus
    // large. L'ancienne normalisation faisait l'inverse.
    for (const bogus of ["system", "brand", " BRAND", "", null, undefined, 0, {}]) {
      expect(normalizeScopeKind(bogus), `« ${String(bogus)} » ne doit pas ouvrir la portée globale`).toBe(
        "BRAND",
      );
    }
  });

  it("aucune normalisation de portée ne retombe sur SYSTEM par défaut", () => {
    const dir = join(ROOT, "src", "server", "services", "anubis");
    const offenders: string[] = [];
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
      const src = readFileSync(join(dir, f), "utf8");
      // Motif interdit : `<x>.scopeKind === "BRAND" ? "BRAND" : "SYSTEM"` sur une
      // valeur LUE (les créations explicites d'admin restent permises).
      const re = /(record|row|key|token)\.scopeKind\s*===\s*"BRAND"\s*\?\s*"BRAND"\s*:\s*"SYSTEM"/;
      if (re.test(src)) offenders.push(f);
    }
    expect(
      offenders,
      "Utiliser `normalizeScopeKind` — une valeur inconnue doit restreindre, pas élargir.",
    ).toEqual([]);
  });
});
