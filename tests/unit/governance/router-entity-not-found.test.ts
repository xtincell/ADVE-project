/**
 * Cliquet — lectures `findUniqueOrThrow` / `findFirstOrThrow` dans les routeurs
 * tRPC (IN1, recette d'installation isolée du 19 octobre ; 557 pour les sources,
 * 570 pour les autres routeurs).
 *
 * Une lecture `OrThrow` keyée par un identifiant d'entrée répond HTTP 500 à un
 * identifiant inconnu, avec un message Prisma qui expose le chemin et un extrait
 * d'un fichier serveur. Placée avant une garde de marque, elle distingue aussi
 * l'identifiant inconnu (500) de l'identifiant d'un autre locataire (403).
 * Le patron commun est `src/server/trpc/entity-access.ts` : lecture `findUnique`,
 * puis le même 404 pour « inconnu » et « refusé », avant toute écriture.
 *
 * Deux bases décroissantes : elles ne montent jamais ; quand une lecture est
 * convertie, la base est abaissée dans le même commit.
 *  - `INPUT_KEYED_BASELINE` : lectures `OrThrow` dont l'argument contient `input.` ;
 *  - `TOTAL_BASELINE` : toutes les lectures `OrThrow` des routeurs. Les restantes
 *    relisent une ligne déjà lue ou écrite dans la même procédure (invariant
 *    interne), listées ci-dessous.
 *
 * Analyse textuelle, comme les autres verrous du dépôt : la revue reste
 * responsable de la sémantique d'un identifiant passé par une variable.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { accessible, found, refusalAsNotFound } from "@/server/trpc/entity-access";

const ROUTERS = join(process.cwd(), "src/server/trpc/routers");

/** Base 570 : zéro lecture `OrThrow` keyée par un identifiant d'entrée (166 sites dont 70+ avant). */
const INPUT_KEYED_BASELINE = 0;
/** Base 570 : trois relectures internes, aucune keyée par l'entrée. */
const TOTAL_BASELINE = 3;
const INTERNAL_REREADS = [
  "crm.ts — propriétaire de la marque vendeuse d'une affaire déjà lue et gardée",
  "intervention.ts — relecture du signal après son écriture conditionnelle (transaction)",
  "mission-applications.ts — relecture de la candidature acceptée (transaction)",
];

/** Retire commentaires de bloc et de ligne (pas `://` d'une URL). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, (m, lead: string) => lead + " ".repeat(m.length - lead.length));
}

/** Argument entre parenthèses équilibrées à partir de `open` (position de « ( »). */
function argumentAt(source: string, open: number): string {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "(") depth++;
    else if (source[i] === ")" && --depth === 0) return source.slice(open + 1, i);
  }
  return source.slice(open + 1);
}

function orThrowReads(): Array<{ file: string; line: number; inputKeyed: boolean }> {
  const reads: Array<{ file: string; line: number; inputKeyed: boolean }> = [];
  for (const file of readdirSync(ROUTERS).filter((f) => f.endsWith(".ts")).sort()) {
    const source = stripComments(readFileSync(join(ROUTERS, file), "utf8"));
    const re = /\.find(?:Unique|First)OrThrow\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) {
      const arg = argumentAt(source, m.index + m[0].length - 1);
      reads.push({ file, line: source.slice(0, m.index).split("\n").length, inputKeyed: /\binput\s*(?:\.|\[)/.test(arg) });
    }
  }
  return reads;
}

describe("cliquet IN1 : lectures OrThrow des routeurs", () => {
  it(`lectures keyées par un identifiant d'entrée ≤ ${INPUT_KEYED_BASELINE}`, () => {
    const keyed = orThrowReads().filter((r) => r.inputKeyed);
    expect(keyed.length, `Lire par findUnique/findFirst et répondre le même 404 pour inconnu et refusé `
      + `(src/server/trpc/entity-access.ts). Sites : ${keyed.map((r) => `${r.file}:${r.line}`).join(", ")}`)
      .toBeLessThanOrEqual(INPUT_KEYED_BASELINE);
  });

  it(`toutes lectures OrThrow ≤ ${TOTAL_BASELINE} (relectures internes listées)`, () => {
    const all = orThrowReads();
    expect(all.length, `Relectures internes admises :\n${INTERNAL_REREADS.join("\n")}\nTrouvées : ${all.map((r) => `${r.file}:${r.line}`).join(", ")}`)
      .toBeLessThanOrEqual(TOTAL_BASELINE);
  });

  it("le détecteur reconnaît une lecture keyée, ignore un commentaire et une relecture interne", () => {
    const sample = stripComments([
      "// await db.x.findUniqueOrThrow({ where: { id: input.id } })",
      "const a = await db.x.findUniqueOrThrow({",
      "  where: { id: input.id },",
      "});",
      "const b = await tx.y.findUniqueOrThrow({ where: { id: row.id } });",
      "const c = 'https://example.invalid'; // findFirstOrThrow(input.z)",
    ].join("\n"));
    const hits = [...sample.matchAll(/\.find(?:Unique|First)OrThrow\s*\(/g)]
      .map((m) => /\binput\s*(?:\.|\[)/.test(argumentAt(sample, m.index! + m[0].length - 1)));
    expect(hits).toEqual([true, false]);
  });
});

describe("patron entity-access : un seul refus pour inconnu et refusé", () => {
  const MESSAGE = "Élément introuvable.";
  async function refusal(call: Promise<unknown>) {
    const error = await call.then(() => null, (e: unknown) => e);
    expect(error).toBeInstanceOf(TRPCError);
    const e = error as TRPCError;
    return { code: e.code, httpStatus: getHTTPStatusCodeFromError(e), message: e.message };
  }

  it("absent, FORBIDDEN, NOT_FOUND du parent et false donnent exactement la même réponse 404", async () => {
    const unknown = await refusal(accessible(Promise.resolve(null), MESSAGE));
    expect(unknown).toEqual({ code: "NOT_FOUND", httpStatus: 404, message: MESSAGE });
    expect(await refusal(accessible(Promise.resolve({ id: "a" }), MESSAGE, () => { throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette marque" }); }))).toEqual(unknown);
    expect(await refusal(accessible(Promise.resolve({ id: "a" }), MESSAGE, async () => { throw new TRPCError({ code: "NOT_FOUND", message: "Parent introuvable" }); }))).toEqual(unknown);
    expect(await refusal(accessible(Promise.resolve({ id: "a" }), MESSAGE, async () => false))).toEqual(unknown);
  });

  it("une autre erreur garde son code ; l'entité autorisée est rendue telle quelle", async () => {
    expect((await refusal(refusalAsNotFound(() => { throw new TRPCError({ code: "UNAUTHORIZED" }); }, MESSAGE))).code).toBe("UNAUTHORIZED");
    await expect(refusalAsNotFound(() => { throw new Error("Can't reach database server"); }, MESSAGE)).rejects.toThrow("Can't reach database server");
    const row = { id: "own", strategyId: "brand-b" };
    await expect(accessible(Promise.resolve(row), MESSAGE, async () => true)).resolves.toBe(row);
    await expect(accessible(Promise.resolve(row), MESSAGE, async () => undefined)).resolves.toBe(row);
    expect(found(row, MESSAGE)).toBe(row);
    expect(() => found(undefined, MESSAGE)).toThrow(MESSAGE);
  });
});
