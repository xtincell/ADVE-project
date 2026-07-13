#!/usr/bin/env node
/**
 * Bump atomique de la VERSION UNIQUE de l'app (NEFER §9.2 version-unique).
 *
 * La version vit à 4 endroits qui doivent rester synchrones — les tenir à la
 * main est répétitif et source de drift (oubli du `package-lock`, de la
 * constante runtime…). Le footer marketing + `/api/version` DÉRIVENT désormais
 * de `src/lib/version.ts` (source unique), donc ne sont plus édités ici.
 * Ce script les met à jour d'un coup et échoue si un emplacement n'est pas au
 * numéro attendu (garde-fou anti-désync).
 *
 * Usage : node scripts/bump-version.mjs <x.y.z>
 * Il NE touche PAS au CHANGELOG (l'entrée est de la prose — à écrire à la main,
 * cf. nefer-docs) ; il RAPPELLE juste de l'ajouter.
 */
import { readFileSync, writeFileSync } from "node:fs";

const next = process.argv[2];
if (!next || !/^\d+\.\d+\.\d+$/.test(next)) {
  console.error("Usage : node scripts/bump-version.mjs <x.y.z>  (ex : 6.27.99)");
  process.exit(1);
}

const VERSION_TS = "src/lib/version.ts";

// Version courante = celle de package.json (source de référence).
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const cur = pkg.version;
if (cur === next) {
  console.error(`package.json est déjà en ${next} — rien à faire.`);
  process.exit(1);
}
console.log(`bump ${cur} → ${next}`);

let changed = 0;

// 1) package.json
writeFileSync("package.json", readFileSync("package.json", "utf8").replace(`"version": "${cur}"`, `"version": "${next}"`));
changed++;

// 2) package-lock.json — 2 occurrences (racine + packages[""]).
{
  const before = readFileSync("package-lock.json", "utf8");
  const after = before.replaceAll(`"version": "${cur}"`, `"version": "${next}"`);
  const n = before.split(`"version": "${cur}"`).length - 1;
  if (n < 2) {
    console.error(`⚠ package-lock.json : ${n} occurrence(s) de ${cur} (attendu ≥ 2). Désync — corrige à la main.`);
    process.exit(1);
  }
  writeFileSync("package-lock.json", after);
  changed += n;
}

// 3) src/lib/version.ts — constante APP_VERSION (source runtime unique ; le
//    footer marketing et /api/version la consomment, plus de numéro en dur).
{
  const before = readFileSync(VERSION_TS, "utf8");
  if (!before.includes(`"${cur}"`)) {
    console.error(`⚠ ${VERSION_TS} ne contient pas "${cur}" — désync. Corrige à la main.`);
    process.exit(1);
  }
  writeFileSync(VERSION_TS, before.replace(`"${cur}"`, `"${next}"`));
  changed++;
}

console.log(`✅ ${changed} emplacement(s) mis à jour.`);
console.log(`⚠ RAPPEL : ajoute l'entrée « ## v${next} — … » en tête de CHANGELOG.md (prose, à la main).`);
