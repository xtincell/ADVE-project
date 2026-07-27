/**
 * Anti-drift HARD — un `select` Prisma ne nomme que des colonnes qui existent.
 *
 * **`tsc` ne peut PAS attraper cette classe.** Prisma type une clé `select`
 * inconnue en `never` au lieu de la rejeter ; et `never` est assignable à tout.
 * Donc ceci compile sans le moindre avertissement :
 *
 *     const rows = await db.pillar.findMany({ select: { pillarKey: true } });
 *     rows[0].pillarKey   // type `never` → assignable à `string`
 *
 * …et explose au runtime en `PrismaClientValidationError`, en 500 nu. C'est
 * exactement ce qui est arrivé à `/api/admin/brand-scan` : la colonne s'appelle
 * `key` sur `Pillar` (`pillarKey` est le nom du champ dans les payloads
 * d'Intent, pas en base). tsc vert, lint vert, tests verts, route morte.
 *
 * Le test lit `prisma/schema.prisma` comme source de vérité et vérifie que
 * chaque clé d'un `select`/`include` littéral correspond à un champ ou une
 * relation du modèle appelé. Volontairement conservateur : il n'analyse que les
 * cas qu'il peut résoudre sans ambiguïté (`db.<modèle>.<méthode>({ ... })` avec
 * un objet littéral), et ignore le reste plutôt que de produire du bruit.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

/** { modèle en camelCase → set des champs + relations } */
function parseSchema(): Map<string, Set<string>> {
  const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8");
  const models = new Map<string, Set<string>>();
  const modelRe = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let m: RegExpExecArray | null;
  while ((m = modelRe.exec(schema))) {
    const [, name, body] = m;
    if (!name || !body) continue;
    const fields = new Set<string>();
    for (const line of body.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("//") || t.startsWith("@@") || t.startsWith("///")) continue;
      const f = /^(\w+)\s+\S/.exec(t);
      if (f?.[1]) fields.add(f[1]);
    }
    // Prisma expose aussi `_count` sur tout modèle qui a des relations.
    fields.add("_count");
    models.set(name.charAt(0).toLowerCase() + name.slice(1), fields);
  }
  return models;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * Extrait les clés de PREMIER niveau d'un objet littéral, avec la position de
 * leur valeur — en sautant les objets/tableaux imbriqués.
 *
 * La position compte : sans elle, on ne peut pas distinguer le `select` de
 * premier niveau d'un `select` **imbriqué** dans un `include` (qui porte sur un
 * AUTRE modèle). C'est le faux positif qui a fait sonner ce test sur
 * `strategy.findUniqueOrThrow({ include: { client: { select: { sector } } } })`
 * — `sector` appartient à `Client`, pas à `Strategy`.
 */
function topLevelKeys(src: string, openBraceIdx: number): { keys: Array<{ key: string; valueAt: number }>; end: number } {
  const keys: Array<{ key: string; valueAt: number }> = [];
  let depth = 0;
  let i = openBraceIdx;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "{" || c === "[" || c === "(") {
      depth++;
      continue;
    }
    if (c === "}" || c === "]" || c === ")") {
      depth--;
      if (depth === 0) break;
      continue;
    }
    if (depth !== 1) continue;
    const k = /^\s*(\w+)\s*:/.exec(src.slice(i, i + 60));
    if (k?.[1]) {
      keys.push({ key: k[1], valueAt: i + k[0].length });
      i += k[0].length - 1;
    }
  }
  return { keys, end: i };
}

describe("HARD — aucun `select` Prisma ne nomme une colonne inexistante", () => {
  const models = parseSchema();
  const files = walk(SRC);

  it("le schéma est bien lu (garde anti-scan-vide)", () => {
    expect(models.size).toBeGreaterThan(50);
    expect(models.get("pillar")?.has("key")).toBe(true);
    // La preuve par le bug : `pillarKey` n'existe PAS sur Pillar.
    expect(models.get("pillar")?.has("pillarKey")).toBe(false);
    expect(files.length).toBeGreaterThan(500);
  });

  it("chaque clé de `select` correspond à un champ du modèle appelé", () => {
    const offenders: string[] = [];
    // `db.pillar.findMany({` / `tx.user.update({` / `prisma.strategy.findFirst({`
    const callRe = /\b(?:db|tx|prisma|client)\.(\w+)\.(findMany|findFirst|findUnique|findUniqueOrThrow|findFirstOrThrow|create|update|upsert|delete)\(\s*\{/g;

    for (const file of files) {
      const src = readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      callRe.lastIndex = 0;
      while ((m = callRe.exec(src))) {
        const model = m[1];
        if (!model) continue;
        const fields = models.get(model);
        if (!fields) continue; // pas un modèle connu → hors périmètre, on ne devine pas

        const argsOpen = src.indexOf("{", m.index + m[0].length - 1);
        const { keys: argKeys } = topLevelKeys(src, argsOpen);

        // UNIQUEMENT le `select` de premier niveau — un `select` imbriqué
        // porte sur le modèle de la relation, pas sur celui-ci.
        const sel = argKeys.find((k) => k.key === "select");
        if (!sel) continue;
        const selOpen = src.indexOf("{", sel.valueAt);
        if (selOpen === -1) continue;
        // `select: someVariable` (pas un littéral) → on ne devine pas.
        if (src.slice(sel.valueAt, selOpen).trim() !== "") continue;

        for (const { key } of topLevelKeys(src, selOpen).keys) {
          if (!fields.has(key)) {
            const line = src.slice(0, selOpen).split("\n").length;
            offenders.push(`${file.replace(`${SRC}/`, "")}:${line} — ${model}.select.${key} n'existe pas`);
          }
        }
      }
    }

    expect(
      offenders,
      `${offenders.length} colonne(s) inexistante(s) dans un select — tsc ne les voit PAS :\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
