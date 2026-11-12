/**
 * Plan 4.11.d — chiffres non sourcés dans la restitution intake (verrou HARD).
 *
 * Constat (recette guidée B, 507) : l'écran d'attente du diagnostic affichait
 * « 98 % des marques échouent sur la Distinction », et d'autres « vérités »
 * chiffrées (« 3 % du public », « dix fois plus ») qu'aucun document du dépôt
 * ne source. Présentées au prospect pendant qu'on analyse SA marque, elles se
 * lisent comme des mesures — c'est de la fabrication, même en guise d'accroche.
 *
 * Règle : une statistique de population (« N % des marques »), un multiplicateur
 * (« dix fois plus ») ou un ratio (« 8 sur 10 ») ne se dit au prospect que si une
 * source citable l'accompagne. Ces fichiers n'en ont aucune → aucun motif admis.
 *
 * Volontairement ÉTROIT : les montants d'offre (« −20 % sur votre premier
 * cycle »), les tranches de réponse (« 10-30% »), les durées (« ~15 min ») et
 * les exemples fictifs explicites (« SARL XYZ … 40% ») ne sont pas visés ; les
 * valeurs calculées passent par des interpolations (`{count}`), jamais par des
 * chiffres littéraux, et ne sont donc pas visées non plus.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, relative } from "path";

const ROOT = join(__dirname, "../../..");

/** Fichiers dont les chaînes sont rendues au prospect pendant/après le diagnostic. */
const SCANNED = [
  "src/lib/i18n/pages/intake-result.ts",
  "src/lib/i18n/pages/intake-entry.ts",
  // Questions et infobulles du questionnaire guidé, rendues telles quelles.
  "src/server/services/quick-intake/question-bank.ts",
];

const PATTERNS: Array<{ name: string; re: RegExp }> = [
  {
    name: "pourcentage d'une population (FR/EN)",
    re: /\b\d{1,3}(?:[.,]\d+)?[\s  ]?%[\s  ]+(?:des|de la|de l['’]|du|d['’]|of|of the)\b/gi,
  },
  { name: "pourcentage d'une population (ZH)", re: /\d{1,3}[\s  ]?%[\s  ]?的/g },
  {
    name: "multiplicateur (FR)",
    re: /\b(?:\d+|deux|trois|quatre|cinq|dix|cent)\s+fois\s+(?:plus|moins|mieux)\b/gi,
  },
  {
    name: "multiplicateur (EN)",
    re: /\b(?:\d+|two|three|four|five|ten|hundred)\s+times\s+(?:more|less|better|as)\b/gi,
  },
  { name: "multiplicateur (ZH)", re: /[高多少快][\d十百千两二三四五六七八九]+倍/g },
  {
    name: "ratio d'une population (« 8 sur 10 »)",
    re: /\b\d{1,3}\s+(?:sur|out of|in)\s+(?:10|dix|ten|100|cent)\b/gi,
  },
];

/** Retire les commentaires : la doctrine peut CITER un chiffre retiré. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

function findClaims(src: string): Array<{ line: number; pattern: string; text: string }> {
  const text = stripComments(src);
  const hits: Array<{ line: number; pattern: string; text: string }> = [];
  for (const { name, re } of PATTERNS) {
    for (const match of text.matchAll(re)) {
      const line = text.slice(0, match.index).split("\n").length;
      hits.push({ line, pattern: name, text: match[0] });
    }
  }
  return hits;
}

describe("restitution intake — aucun chiffre non sourcé présenté comme un fait (4.11.d)", () => {
  it("chaque motif attrape bien la forme qu'il vise (le verrou n'est pas mort)", () => {
    const samples = [
      "98 % des marques échouent sur la Distinction",
      "98% of brands fail on Distinction",
      "98% 的品牌败在辨识度上",
      "La fenêtre bouge quand 3 % du public bascule",
      "Et convertit dix fois plus.",
      "And converts ten times more.",
      "转化却高十倍",
      "8 sur 10 jugent sur la première impression",
      "8 out of 10 consumers",
    ];
    for (const sample of samples) {
      expect(findClaims(`"k": "${sample}",`), sample).not.toHaveLength(0);
    }
  });

  it("les chiffres légitimes restent admis (offre, tranches, durées, exemple fictif)", () => {
    const legit = [
      "Avec un code valide : −20 % sur votre premier cycle",
      "With a valid code: −20% off your first cycle",
      "使用有效推荐码：首个周期立减 20%",
      'options: ["< 10%", "10-30%", "> 70%"]',
      "~15 min (indicatif)",
      "un taux de fidélisation de 40%. Nos principaux concurrents",
      "votre socle de marque sur 100",
      "{count} page(s) publique(s) parlent de vous",
    ];
    for (const sample of legit) {
      expect(findClaims(`"k": "${sample}",`), sample).toHaveLength(0);
    }
  });

  for (const file of SCANNED) {
    it(`${file} ne présente aucune statistique sans source`, () => {
      const hits = findClaims(readFileSync(join(ROOT, file), "utf-8"));
      expect(
        hits.map((h) => `${relative(ROOT, join(ROOT, file))}:${h.line} [${h.pattern}] « ${h.text} »`),
      ).toEqual([]);
    });
  }
});
