import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { db } from "@/lib/db";
import { PILLAR_SCHEMAS, type PillarKey } from "@/lib/types/pillar-schemas";

async function main() {
  const pillars = await db.pillar.findMany({ where: { strategyId: "spawt-strategy" } });

  for (const p of pillars.sort((a, b) => a.key.localeCompare(b.key))) {
    const key = p.key.toUpperCase() as PillarKey;
    const schema = PILLAR_SCHEMAS[key];
    if (!schema) continue;

    const schemaKeys = Object.keys((schema as any).shape) as string[];
    const contentKeys = new Set(Object.keys((p.content ?? {}) as Record<string, unknown>));

    const missing = schemaKeys.filter(k => !contentKeys.has(k));
    const isOpt = (k: string) => {
      const field = (schema as any).shape[k];
      return field?.isOptional?.() || field?._def?.typeName === "ZodOptional";
    };

    const missingRequired = missing.filter(k => !isOpt(k));
    const missingOptional = missing.filter(k => isOpt(k));

    if (missing.length === 0) {
      console.log(`✓ ${key}: ${contentKeys.size}/${schemaKeys.length} — all fields present`);
    } else {
      console.log(`${missingRequired.length > 0 ? "✕" : "◐"} ${key}: ${contentKeys.size}/${schemaKeys.length} — ${missing.length} missing (${missingRequired.length} required, ${missingOptional.length} optional)`);
      for (const m of missingRequired) console.log(`    ✕ ${m} [REQUIRED]`);
      for (const m of missingOptional) console.log(`    ○ ${m} [optional]`);
    }
  }

  await db.$disconnect();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
