import 'dotenv/config';
import { getSystemPrompt } from "../src/server/services/mestor/index";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

async function run() {
  const system = getSystemPrompt("intake");
  const companyName = "TestCo";
  const sector = "RETAIL";
  const text = `TestCo est une jeune marque qui vend des sacs faits main. Notre promesse est la durabilite et le design. Nous avons une petite communaute Instagram et quelques revendeurs locaux. Pas de plan marketing structure.`.repeat(2);

  const prompt = `A partir du texte suivant, extrait les reponses structurees pour chaque pilier ADVE en JSON.\n\nMARQUE: ${companyName}\nSECTEUR: ${sector}\n\nTEXTE SOURCE:\n${text.slice(0,15000)}\n\nReponds uniquement par un objet JSON clef->objet (biz,a,d,v,e,r,t,i,s).`;

  console.log('Sending LLM request...');
  const MODEL = "claude-sonnet-4-20250514";
  const { text: out } = await generateText({ model: anthropic(MODEL), system, prompt, maxTokens: 2000 });
  console.log('LLM output:', out);
  const m = (typeof out === 'string' ? out : '').match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const parsed = JSON.parse(m[0]);
      console.log('Parsed JSON keys:', Object.keys(parsed));
    } catch (e) {
      console.error('JSON parse failed:', e);
    }
  } else {
    console.error('No JSON found in output');
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
