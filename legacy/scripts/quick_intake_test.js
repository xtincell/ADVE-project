(async () => {
  const base = 'http://localhost:3001/api/trpc';
  const headers = { 'Content-Type': 'application/json' };

  function rpcPayload(id, path, input) {
    return { id, jsonrpc: '2.0', method: 'call', params: { input, path, type: 'mutation' } };
  }

  try {
    console.log('Calling quickIntake.start...');
    let res = await fetch(base, { method: 'POST', headers, body: JSON.stringify(rpcPayload(1, 'quickIntake.start', { contactName: 'Alice Tester', contactEmail: 'alice@test.local', companyName: 'TestCo' })) });
    let body = await res.text();
    try { body = JSON.parse(body); } catch (e) { console.error('Non-JSON response:', body); process.exit(1); }
    const startData = body.result?.data;
    console.log('start result:', JSON.stringify(startData, null, 2));
    const token = startData?.token;
    if (!token) { console.error('No token returned'); process.exit(1); }

    console.log('Calling quickIntake.processShort with token', token);
    const sampleText = `TestCo est une jeune marque qui est nee d'une passion pour l'artisanat local. Nous vendons des sacs faits main, notre promesse client est la durabilite et l'esthetique. Nous avons une petite communaute sur Instagram et quelques revendeurs locaux. Nous n'avons pas de plan marketing structure mais nous postons 2 fois par semaine.`.repeat(2);

    res = await fetch(base, { method: 'POST', headers, body: JSON.stringify(rpcPayload(2, 'quickIntake.processShort', { token, text: sampleText })) });
    body = await res.text();
    try { body = JSON.parse(body); } catch (e) { console.error('Non-JSON response:', body); process.exit(1); }
    const processResult = body.result?.data;
    console.log('processShort result:', JSON.stringify(processResult, null, 2));
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
