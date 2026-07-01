import 'dotenv/config';
import * as quickService from '@/server/services/quick-intake';
import { db } from '@/lib/db';

async function main() {
  console.log('Starting local quick intake flow test...');

  const startInput = {
    contactName: 'Local Tester',
    contactEmail: 'local@test.local',
    companyName: 'LocalCo SARL',
    sector: 'FMCG',
    country: 'CM',
    method: 'SHORT' as any,
  };

  // Create intake
  const started = await quickService.start(startInput as any);
  console.log('Started intake token:', started.token);

  const phases = ['biz', 'a', 'd', 'v', 'e', 'r', 't', 'i', 's'];

  for (const p of phases) {
    const sample = {
      [`${p}_q1`]: `Exemple de reponse pour le pilier ${p} concernant LocalCo.`,
      [`${p}_q2`]: `Detail supplementaire pour ${p}.`,
    };
    console.log(`Advancing phase ${p}...`);
    await quickService.advance({ token: started.token, responses: { [p]: sample } } as any);
  }

  console.log('Calling complete()...');
  const result = await quickService.complete(started.token);
  console.log('Complete result:', JSON.stringify(result, null, 2));

  const intake = await db.quickIntake.findUnique({ where: { shareToken: started.token } });
  console.log('Intake from DB advertis_vector:', intake?.advertis_vector);
  console.log('Intake diagnostic:', JSON.stringify(intake?.diagnostic, null, 2));
}

main().catch((err) => {
  console.error('Error in local intake test:', err);
  process.exit(1);
});
