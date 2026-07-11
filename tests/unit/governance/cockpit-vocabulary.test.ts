/**
 * Anti-drift CI — vocabulaire client du Cockpit (lot 11, audit UX 2026-07-11 §T1).
 *
 * Le Cockpit est le portail VENDU au client : le vocabulaire à l'écran est
 * 100 % business (KB `docs/governance/context/UPGRADERS-LAFUSEE-KB.md` §3).
 * Les noms mythologiques internes (Neteru), les noms de mécanismes (ADVERTIS,
 * APOGEE) et la plomberie (réfs ADR, IntentEmission, function-calling) ne
 * doivent JAMAIS apparaître dans une chaîne rendue.
 *
 * Méthode : on scanne les fichiers `.tsx` du portail cockpit, on retire les
 * commentaires (les identifiants de code — `trpc.jehuty.*`, `JehutyFeedItem`,
 * `nav.notoria` — ne matchent pas grâce aux frontières de mot et à la casse),
 * puis on cherche les motifs interdits dans les LITTÉRAUX DE CHAÎNE et le
 * TEXTE JSX uniquement. Toute nouvelle occurrence casse le build.
 *
 * Lot 0 (ADR-0123, résolution partielle réversible) : « ADVE » reste
 * client-facing (méthode vendue, glosée « Architecture des Expériences ») ;
 * « RTIS » / « ADVE-RTIS » sortent des chaînes client (arbre interne, KB §12)
 * — motif testé ci-dessous. Les lettres individuelles A…S restent en badge
 * (initiales des noms business affichés) et ne sont pas testées.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "../../..");
const SCAN_DIRS = [
  join(ROOT, "src/app/(cockpit)"),
  join(ROOT, "src/components/cockpit"),
  join(ROOT, "src/components/pillars"),
];
// Composants hors components/cockpit mais rendus dans le portail founder.
const EXTRA_FILES = [join(ROOT, "src/components/neteru/overton-radar.tsx")];

/**
 * Surfaces gardées `<OperatorSurface>` (lot 12) — le founder ne les voit pas,
 * la purge de leur vocabulaire est de la dette P2 (lots 13/15), pas un trou
 * client. Chaque entrée doit rester justifiée ; retirer dès purge.
 */
const OPERATOR_GATED_ALLOWLIST: ReadonlyArray<string> = [
  "src/app/(cockpit)/cockpit/insights/apogee-maintenance/page.tsx", // « Loi 4 APOGEE » — surface sentinelle opérateur
  "src/app/(cockpit)/cockpit/brand/rtis/page.tsx", // workflow RTIS legacy — surface opérateur (lot 12), purge = lot 13/15
  "src/app/(cockpit)/cockpit/brand/rtis/synthese/page.tsx", // idem
];

const FORBIDDEN: Array<{ name: string; re: RegExp }> = [
  { name: "mythologie/mécanisme", re: /\b(ADVERTIS|APOGEE|Jehuty|Notoria|Mestor|Artemis|Seshat|Ptah|Anubis|Imhotep|Thot|Tarsis|NETERU)\b/ },
  { name: "plomberie IntentEmission", re: /\bIntentEmission\b/ },
  { name: "réf ADR", re: /\bADR-\d{4}\b/ },
  { name: "function-calling", re: /function-calling/ },
  { name: "RTIS (Lot 0 — ADR-0123)", re: /\bADVE-RTIS\b|\bRTIS\b/ },
];

/**
 * Chunks « identifiants » à ignorer : littéraux qui détectent des codes
 * backend (`readiness/RTIS_CASCADE`, kinds `*_RTIS*`) — jamais rendus tels
 * quels, ce sont des comparaisons de messages d'erreur.
 */
const IDENTIFIER_CHUNK = /RTIS_|_RTIS|readiness\//;

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.tsx$/.test(entry) && !entry.endsWith(".test.tsx") && !entry.endsWith(".stories.tsx")) acc.push(p);
  }
  return acc;
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}

/** Extrait ce qui atteint potentiellement l'écran : littéraux + texte JSX. */
function renderableChunks(src: string): Array<{ chunk: string; line: number }> {
  const out: Array<{ chunk: string; line: number }> = [];
  const lineOf = (idx: number) => src.slice(0, idx).split("\n").length;
  // Littéraux de chaîne (doubles, simples, template) — multi-lignes inclus.
  const literalRe = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
  for (const m of src.matchAll(literalRe)) {
    out.push({ chunk: m[0], line: lineOf(m.index ?? 0) });
  }
  // Texte JSX entre balises : `>Texte<` (sans expressions — celles-ci passent
  // par les littéraux ci-dessus).
  const jsxTextRe = />([^<>{}]*[A-Za-zÀ-ÿ][^<>{}]*)</g;
  for (const m of src.matchAll(jsxTextRe)) {
    out.push({ chunk: m[1]!, line: lineOf(m.index ?? 0) });
  }
  return out;
}

describe("Cockpit — vocabulaire client (lot 11, T1)", () => {
  const files = [...SCAN_DIRS.flatMap((d) => walk(d)), ...EXTRA_FILES.filter((f) => existsSync(f))];

  it("scanne un périmètre non vide", () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it("aucun vocabulaire interne dans les chaînes rendues du portail founder", () => {
    const violations: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file);
      if (OPERATOR_GATED_ALLOWLIST.includes(rel)) continue;
      const src = stripComments(readFileSync(file, "utf-8"));
      for (const { chunk, line } of renderableChunks(src)) {
        if (IDENTIFIER_CHUNK.test(chunk)) continue;
        for (const { name, re } of FORBIDDEN) {
          const m = chunk.match(re);
          if (m) violations.push(`${rel}:${line} [${name}] → ${m[0]} dans ${chunk.slice(0, 80)}`);
        }
      }
    }
    expect(
      violations,
      `Vocabulaire interne rendu au client (KB §3) :\n${violations.join("\n")}\n` +
        "→ Traduire en vocabulaire business, ou si la surface est gardée <OperatorSurface>, " +
        "l'ajouter à OPERATOR_GATED_ALLOWLIST avec justification.",
    ).toEqual([]);
  });
});
