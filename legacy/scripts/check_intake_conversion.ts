import 'dotenv/config';
import { db } from '@/lib/db';
import * as quickService from '@/server/services/quick-intake';

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.error('Usage: pnpm tsx scripts/check_intake_conversion.ts <shareToken>');
    process.exit(1);
  }

  try {
    const intake = await db.quickIntake.findUnique({ where: { shareToken: token } });
    if (!intake) {
      console.error('QuickIntake not found for token', token);
      process.exit(1);
    }

    console.log(`Intake: ${intake.companyName} — method=${intake.method} status=${intake.status}`);
    if (intake.convertedToId) {
      console.log('Already converted to strategy:', intake.convertedToId);
      const pillars = await db.pillar.findMany({ where: { strategyId: intake.convertedToId } });
      console.log(`Found ${pillars.length} pillars for strategy ${intake.convertedToId}`);
      for (const p of pillars) {
        const content = p.content as Record<string, unknown> | null;
        const keys = content ? Object.keys(content) : [];
        console.log(`- Pillar ${p.key.toUpperCase()}: ${keys.length} fields`);
        if (keys.length > 0 && content) {
          const firstKey = keys[0];
          const firstVal = (content as any)[firstKey];
          const preview = typeof firstVal === 'string' ? firstVal.slice(0, 200) : JSON.stringify(firstVal).slice(0, 200);
          console.log(`  ${firstKey}: ${preview}...`);
        }
        // Special check for valeurs
        if (p.key.toLowerCase() === 'a') {
          const valeurs = content?.valeurs;
          console.log(`  A.valeurs type: ${Array.isArray(valeurs) ? 'array('+String((valeurs as any).length)+')' : typeof valeurs}`);
        }
      }
      process.exit(0);
    }

    console.log('Not yet converted — running quick-intake.complete(token)...');
    try {
      const result = await quickService.complete(token as string);
      console.log('Conversion result:');
      console.log(`  StrategyId: ${result.strategyId}`);
      console.log(`  Classification: ${result.classification}`);
      console.log(`  Composite score: ${result.vector?.composite ?? 'N/A'}`);

      if (result.strategyId) {
        const pillars = await db.pillar.findMany({ where: { strategyId: result.strategyId } });
        console.log(`Found ${pillars.length} pillars for strategy ${result.strategyId}`);
        for (const p of pillars) {
          const content = p.content as Record<string, unknown> | null;
          const keys = content ? Object.keys(content) : [];
          console.log(`- Pillar ${p.key.toUpperCase()}: ${keys.length} fields`);
          if (keys.length > 0 && content) {
            const firstKey = keys[0];
            const firstVal = (content as any)[firstKey];
            const preview = typeof firstVal === 'string' ? firstVal.slice(0, 200) : JSON.stringify(firstVal).slice(0, 200);
            console.log(`  ${firstKey}: ${preview}...`);
          }
          if (p.key.toLowerCase() === 'a') {
            const valeurs = content?.valeurs;
            console.log(`  A.valeurs type: ${Array.isArray(valeurs) ? 'array('+String((valeurs as any).length)+')' : typeof valeurs}`);
          }
        }
      }
    } catch (err) {
      console.error('Conversion failed:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
