#!/usr/bin/env tsx
/**
 * Inventaire en LECTURE SEULE des formes ADVE refusées par le schéma strict
 * (RESIDUAL-DEBT « Formats ADVE legacy », étape 1). Aucune écriture en base, aucune
 * normalisation, aucun appel de modèle : la lecture tient dans une transaction
 * PostgreSQL READ ONLY en REPEATABLE READ (src/server/services/pillar-maturity/
 * strict-shape-inventory.ts).
 *
 * Usage :
 *   npm run audit:adve-shapes                         # base désignée par DATABASE_URL
 *   npm run audit:adve-shapes -- --canons             # canons du dépôt, en mémoire, sans base
 *   npm run audit:adve-shapes -- --strategie <id> --strategie <id2>
 *   npm run audit:adve-shapes -- --piliers a,v --sans-extraits
 *   npm run audit:adve-shapes -- --json inventaire.json   # JSON stable dans un fichier local
 *   npm run audit:adve-shapes -- --json -                 # JSON sur la sortie standard, résumé sur l'erreur
 *
 * Le JSON peut contenir des extraits courts des données de marque (masqués et
 * tronqués) : le garder hors du dépôt, avec les autres preuves privées.
 */
import { writeFileSync } from "node:fs";
import {
  ADVE_INVENTORY_PILLARS,
  inventoryCanons,
  readAdveStrictShapeInventory,
  summarizeInventory,
  type AdveInventoryPillar,
  type StrictShapeInventory,
} from "../src/server/services/pillar-maturity/strict-shape-inventory";

function parseArgs(argv: string[]) {
  const strategyIds: string[] = [];
  let pillars: AdveInventoryPillar[] = [...ADVE_INVENTORY_PILLARS];
  let canons = false, includeExcerpts = true;
  let json: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = () => {
      const value = argv[++i];
      if (!value) throw new Error(`Valeur manquante après ${arg}`);
      return value;
    };
    if (arg === "--canons") canons = true;
    else if (arg === "--sans-extraits") includeExcerpts = false;
    else if (arg === "--strategie") strategyIds.push(next());
    else if (arg === "--json") json = next();
    else if (arg === "--piliers") {
      const asked = next().toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
      const unknown = asked.filter(k => !(ADVE_INVENTORY_PILLARS as readonly string[]).includes(k));
      if (unknown.length) throw new Error(`Piliers hors ADVE refusés : ${unknown.join(", ")} (attendus : a, d, v, e)`);
      pillars = asked as AdveInventoryPillar[];
    } else if (arg === "--aide" || arg === "--help") {
      console.log("Options : --canons · --strategie <id> (répétable) · --piliers a,d,v,e · --sans-extraits · --json <fichier|->");
      process.exit(0);
    } else throw new Error(`Option inconnue : ${arg}`);
  }
  if (canons && strategyIds.length) throw new Error("--strategie ne s'applique pas aux canons du dépôt.");
  return { strategyIds, pillars, canons, includeExcerpts, json };
}

async function loadCanons(pillars: AdveInventoryPillar[], includeExcerpts: boolean): Promise<StrictShapeInventory> {
  const [{ SPAWT_CANON_PILLARS }, { MOTION19_CANON_PILLARS, MOTION19_FIELD_CERTAINTY }, { UPGRADERS_CANON_PILLARS }, { LAFUSEE_CANON_PILLARS }] =
    await Promise.all([
      import("../src/server/services/canon/spawt-canon"),
      import("../src/server/services/canon/motion19-canon"),
      import("../src/server/services/canon/upgraders-canon"),
      import("../src/server/services/canon/lafusee-canon"),
    ]);
  return inventoryCanons([
    { name: "spawt", pillars: SPAWT_CANON_PILLARS },
    // Motion19 : le seed pose ces certitudes avec le contenu (prisma/seed-motion19.ts).
    { name: "motion19", pillars: MOTION19_CANON_PILLARS, fieldCertainty: MOTION19_FIELD_CERTAINTY },
    { name: "upgraders", pillars: UPGRADERS_CANON_PILLARS },
    { name: "lafusee", pillars: LAFUSEE_CANON_PILLARS },
  ], { pillars, includeExcerpts });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let inventory: StrictShapeInventory;
  if (args.canons) {
    inventory = await loadCanons(args.pillars, args.includeExcerpts);
  } else {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL absent : désigner la base à lire, ou utiliser --canons.");
    inventory = await readAdveStrictShapeInventory({ strategyIds: args.strategyIds, pillars: args.pillars, includeExcerpts: args.includeExcerpts });
    const { db } = await import("../src/lib/db");
    await db.$disconnect();
  }
  const json = `${JSON.stringify(inventory, null, 2)}\n`;
  const summary = summarizeInventory(inventory);
  if (args.json === "-") {
    process.stdout.write(json);
    process.stderr.write(`${summary}\n`);
  } else {
    if (args.json) writeFileSync(args.json, json);
    console.log(summary);
    if (args.json) console.log(`\nJSON écrit : ${args.json}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
