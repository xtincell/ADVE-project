#!/usr/bin/env tsx
/**
 * audit-intake-coverage.ts (ADR-0030 Axe 2)
 *
 * Vérifie que chaque champ `derivable: false` du contrat INTAKE des piliers
 * ADVE est couvert par au moins l'une de ces 3 sources :
 *
 *   1. Une question dédiée dans `src/server/services/quick-intake/question-bank.ts`
 *      (id préfixé `<pillar>_*` qui mappe au path explicitement OU couvre
 *      sémantiquement le champ — heuristique par grep mot-clé).
 *   2. Un seal canonique dans `src/server/services/quick-intake/index.ts`
 *      (`sealCanonicalPillarFields` qui force le champ depuis BusinessContext).
 *   3. Un fallback `derivable: true` ailleurs dans le contrat (par ex.
 *      `derivationSource: "cross_pillar"` avec mapping dans auto-filler).
 *
 * Le but : empêcher la régression où on ajouterait un champ `derivable: false`
 * dans un contrat INTAKE sans le couvrir côté intake — ce qui condamnerait
 * tout nouvel intake à `currentStage === EMPTY` perpétuel.
 *
 * Usage :
 *   tsx scripts/audit-intake-coverage.ts                    # report
 *   tsx scripts/audit-intake-coverage.ts --fail-on-violation  # exit 1 si gap
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CONTRACTS_PATH = join(ROOT, "src/lib/types/pillar-maturity-contracts.ts");
const QBANK_PATH = join(ROOT, "src/server/services/quick-intake/question-bank.ts");
const INTAKE_PATH = join(ROOT, "src/server/services/quick-intake/index.ts");

const FAIL_ON_VIOLATION = process.argv.includes("--fail-on-violation");

interface Gap {
  pillar: string;
  path: string;
  reason: string;
}

const gaps: Gap[] = [];
const ok: string[] = [];

// ── Step 1 — extraire les champs `derivable: false` du contrat INTAKE ──
const contractsSource = readFileSync(CONTRACTS_PATH, "utf-8");

// Pour chaque pilier ADVE (A, D, V, E), parser la const INTAKE_X = [ ... ]
// et collecter les paths dont la ligne contient `derivable: false`.
type IntakeField = { pillar: string; path: string };
const intakeFields: IntakeField[] = [];

for (const pillar of ["A", "D", "V", "E"] as const) {
  const intakeBlockRe = new RegExp(`const INTAKE_${pillar}: FieldRequirement\\[\\] = \\[([\\s\\S]*?)\\];`);
  const block = contractsSource.match(intakeBlockRe)?.[1];
  if (!block) continue;
  const lineRe = /\{[^}]*\}/g;
  for (const lineMatch of block.match(lineRe) ?? []) {
    if (!lineMatch.includes("derivable: false")) continue;
    const pathMatch = lineMatch.match(/path:\s*"([^"]+)"/);
    if (pathMatch) {
      intakeFields.push({ pillar: pillar.toLowerCase(), path: pathMatch[1]! });
    }
  }
}

console.log(`\n📋 ${intakeFields.length} champ(s) "derivable: false" dans contrats INTAKE A/D/V/E\n`);

// ── Step 2 — pour chaque champ, vérifier les 3 sources de couverture ──
const qbankSource = readFileSync(QBANK_PATH, "utf-8");
const intakeSource = readFileSync(INTAKE_PATH, "utf-8");

// Mapping path → mots-clés qui doivent apparaître dans une Q ou seal pour
// considérer le champ "couvert sémantiquement". Conservatif : préfère
// faux-négatif (alerter à tort) que faux-positif (laisser passer).
const SEMANTIC_KEYWORDS: Record<string, string[]> = {
  "archetype": ["archetype", "personnalite", "personne", "decririez"],
  "noyauIdentitaire": ["noyau", "noyauIdentitaire", "identitaire", "essence", "ADN", "phrase identitaire", "resumer votre marque"],
  "citationFondatrice": ["citation", "maxime", "manifeste", "phrase fondateur", "esprit fondateur"],
  "positionnement": ["positionnement", "positioning", "concurrents", "USP", "unique", "rend unique"],
  "promesseMaitre": ["promesse maitre", "promesse maître", "promesseMaitre", "engagement central"],
  "personas": ["persona", "client ideal", "client idéal", "cible comportemental"],
  "produitsCatalogue": ["produit", "service", "catalogue", "offres", "produits/services"],
  "businessModel": ["modele d'affaires", "modèle d'affaires", "business model", "businessModel", "biz_model"],
};

for (const field of intakeFields) {
  const path = field.path;
  const pillar = field.pillar;
  const keywords = SEMANTIC_KEYWORDS[path] ?? [path];

  // Source 1 — question-bank
  const inQbank = keywords.some((kw) => {
    // Cherche dans le bloc des questions du pilier concerné
    const pillarBlockRe = new RegExp(`${pillar}: \\[([\\s\\S]*?)\\],\\s*\\n  [a-z]:`, "i");
    const block = qbankSource.match(pillarBlockRe)?.[1] ?? qbankSource;
    return block.toLowerCase().includes(kw.toLowerCase());
  });

  // Source 2 — seal canonique dans intake/index.ts
  const inSeal = keywords.some((kw) =>
    intakeSource.toLowerCase().includes(kw.toLowerCase()),
  );

  // Source 3 — déjà testé en lisant le contrat (si on est ici, c'est que
  // derivable: false). On considère donc qu'il faut Q ou Seal.
  if (inQbank || inSeal) {
    ok.push(`✓ ${pillar.toUpperCase()}.${path} — ${inQbank ? "Q intake" : "seal canonique"}`);
  } else {
    gaps.push({
      pillar,
      path,
      reason: `Aucune Q intake ni seal canonique ne couvre ce champ. Mots-clés cherchés : ${keywords.join(", ")}`,
    });
  }
}

// ── Step 3 — rapport ──
for (const line of ok) console.log(line);

if (gaps.length === 0) {
  console.log(`\n✅ Couverture intake complète — ${intakeFields.length}/${intakeFields.length} champs derivable:false adressés.`);
  process.exit(0);
}

console.log(`\n❌ ${gaps.length} gap(s) intake détecté(s) :\n`);
for (const g of gaps) {
  console.log(`  • ${g.pillar.toUpperCase()}.${g.path}`);
  console.log(`    ${g.reason}`);
  console.log(`    → Ajoute une Q dans question-bank.ts (id "${g.pillar}_${g.path}") ou un seal dans intake/index.ts.\n`);
}

if (FAIL_ON_VIOLATION) {
  process.exit(1);
}
process.exit(0);
