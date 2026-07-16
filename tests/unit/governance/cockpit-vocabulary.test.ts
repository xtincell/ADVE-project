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
  // Dette (d) audit UX 2026-07-11 — le FUNNEL PUBLIC parle au prospect le
  // même langage que le Cockpit au founder (ADR-0123) : intake + composants
  // du funnel sous verrou.
  join(ROOT, "src/app/(intake)"),
  join(ROOT, "src/components/intake"),
  // Audit 2026-07-16 `oracle-jargon-neteru-client` — le LIVRABLE PHARE
  // (grille cockpit, page partagée publique, PDF) échappait au verrou qui
  // interdit exactement ces mots.
  join(ROOT, "src/components/strategy-presentation"),
  join(ROOT, "src/app/(shared)"),
];
// Composants hors components/cockpit mais rendus dans le portail founder,
// + sources de chaînes rendues au prospect (grille /pricing).
const EXTRA_FILES = [
  join(ROOT, "src/components/neteru/overton-radar.tsx"),
  join(ROOT, "src/components/neteru/apogee-maintenance-dashboard.tsx"),
  join(ROOT, "src/server/services/monetization/pricing-tiers.ts"),
];

/**
 * Surfaces gardées `<OperatorSurface>` — le founder ne les voit pas, la purge
 * de leur vocabulaire est tolérée le temps d'être faite. Dette (c) audit UX
 * 2026-07-11 : allowlist VIDÉE — `brand/rtis(+synthese)` sont devenues des
 * redirects vers le hub Stratégie, `apogee-maintenance` a été purgée. Toute
 * nouvelle entrée doit porter une justification.
 */
const OPERATOR_GATED_ALLOWLIST: ReadonlyArray<string> = [];

const FORBIDDEN: Array<{ name: string; re: RegExp }> = [
  { name: "mythologie/mécanisme", re: /\b(ADVERTIS|APOGEE|Jehuty|Notoria|Mestor|Artemis|Seshat|Ptah|Anubis|Imhotep|Thot|Tarsis|NETERU)\b/ },
  { name: "plomberie IntentEmission", re: /\bIntentEmission\b/ },
  { name: "réf ADR", re: /\bADR-\d{4}\b/ },
  { name: "function-calling", re: /function-calling/ },
  { name: "RTIS (Lot 0 — ADR-0123)", re: /\bADVE-RTIS\b|\bRTIS\b/ },
];

/**
 * Chunks « identifiants » à ignorer : littéraux qui détectent des codes
 * backend (`readiness/RTIS_CASCADE`, kinds `*_RTIS*`, kinds SCREAMING_SNAKE
 * comme `MAINTAIN_APOGEE`) — jamais rendus tels quels, ce sont des
 * comparaisons de kinds ou de messages d'erreur.
 */
const IDENTIFIER_CHUNK = /RTIS_|_RTIS|readiness\/|^["'`][A-Z][A-Z0-9_]{2,}["'`]$/;

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(entry) && !/\.(test|stories)\.tsx?$/.test(entry)) acc.push(p);
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

/**
 * Extension audit 2026-07-16 (`lafusee-jargon-hors-verrou-adr0123`) — la plus
 * grosse surface LEAD (marketing/landing/upgraders) était sans verrou. Sous-
 * ensemble interdit dédié : les 7 noms Neteru en ACCENT typographique et
 * « APOGEE » (registre aéronautique) sont des décisions DA documentées
 * (marketing-gouverneurs.tsx header) et restent permis ; les sous-marques
 * internes (Notoria/Tarsis/Jehuty), « ADVERTIS », les pseudo-outils
 * (« Mestor.scan ») et la plomberie restent interdits.
 */
const MARKETING_SCAN_DIRS = [
  join(ROOT, "src/app/(marketing)"),
  join(ROOT, "src/components/landing"),
  join(ROOT, "src/components/upgraders"),
  join(ROOT, "src/components/marketing"),
];
const MARKETING_FORBIDDEN: Array<{ name: string; re: RegExp }> = [
  { name: "sous-marque/mécanisme interne", re: /\b(ADVERTIS|Jehuty|Notoria|Tarsis|NETERU)\b/ },
  { name: "pseudo-outil interne", re: /\b(?:Mestor|Artemis|Seshat|Ptah|Thot|Anubis|Imhotep)\.\w+/ },
  { name: "plomberie IntentEmission", re: /\bIntentEmission\b/ },
  { name: "réf ADR", re: /\bADR-\d{4}\b/ },
  { name: "function-calling", re: /function-calling/ },
];

describe("Marketing — vocabulaire lead (audit 2026-07-16)", () => {
  const files = MARKETING_SCAN_DIRS.flatMap((d) => walk(d));

  it("scanne un périmètre non vide", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("aucune sous-marque/plomberie interne dans les chaînes rendues au lead", () => {
    const violations: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file);
      const src = stripComments(readFileSync(file, "utf-8"));
      for (const { chunk, line } of renderableChunks(src)) {
        if (IDENTIFIER_CHUNK.test(chunk)) continue;
        for (const { name, re } of MARKETING_FORBIDDEN) {
          const m = chunk.match(re);
          if (m) violations.push(`${rel}:${line} [${name}] → ${m[0]} dans ${chunk.slice(0, 80)}`);
        }
      }
    }
    expect(
      violations,
      `Vocabulaire interne rendu au lead (funnel marketing) :\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});

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
