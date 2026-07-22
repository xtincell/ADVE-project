/**
 * brand-book-ingestion/extractor-llm.ts — extracteur LLM structuré (ADR-0173, ADR-0067).
 *
 * Utilise `executeStructuredLLMCall` (schema-driven, retry-on-Zod, JSON forcé) sur le
 * texte du brand book. **Anti-fabrication par la CONSIGNE** : la consigne ordonne `null`
 * sur absence. NB honnête : le schéma tout-nullable ne PEUT PAS enforcer « seulement ce
 * qui est dans le texte » (toute valeur bien formée passe) — le vrai garde-fou de ce
 * chemin est la consigne + la **revue opérateur** (preview→confirm), PAS le schéma. La
 * garantie STRUCTURELLE de non-fabrication vaut pour `extractor-structured` (déterministe)
 * et pour le persister (n'écrit que les champs présents).
 *
 * C'est la moitié « automatique » de la parité manual-first (ADR-0060) ; la moitié
 * « manuelle/déterministe » est `extractor-structured.ts`. Les deux produisent le même
 * contrat `BrandBookExtraction` et convergent sur le même persister (l'aval ne sait pas
 * lequel a tourné).
 */
import { executeStructuredLLMCall } from "@/server/services/utils/llm-structured";
import { wrapUntrusted } from "@/server/services/utils/untrusted-content";
import { BrandBookExtractionSchema, type BrandBookExtraction } from "./schema";

const SYSTEM = `Tu es un extracteur de brand book. Tu lis le texte d'un document de marque (brand book / charte / présentation) et tu remplis un schéma structuré A/D/V + identité visuelle.

CONTRAINTE DURE — ANTI-FABRICATION (règle absolue) :
- Tu n'extrais QUE ce qui figure EXPLICITEMENT dans le texte fourni.
- Tout champ dont l'information est absente du document DOIT être null. JAMAIS d'invention, de supposition, ni de "valeur plausible".
- Ne reformule pas au-delà du nécessaire : cite/condense fidèlement.
- Les couleurs : ne renvoie un hex que s'il est écrit dans le texte (#RRGGBB). Sinon le nom seul, hex null.
- Les archétypes / jugements stratégiques : ne les renvoie que si le document les nomme explicitement.
- Aucune traction, aucun chiffre, aucun nom de personne qui ne soit pas dans le texte.`;

/**
 * Extrait un brand book depuis son texte via le LLM (structuré, anti-fabrication).
 * @throws `LLMStructuredCallError` si le LLM échoue la validation après retries.
 */
export async function extractBrandBookLLM(
  text: string,
  opts: { strategyId: string; caller: string; sourceFilename?: string },
): Promise<BrandBookExtraction> {
  const prompt = `Extrais le brand book suivant vers le schéma. Rappel : null sur toute information absente.
${opts.sourceFilename ? `Fichier : ${opts.sourceFilename}\n` : ""}
${wrapUntrusted("TEXTE DU BRAND BOOK", text, { max: 60_000 })}`;

  const result = await executeStructuredLLMCall<BrandBookExtraction>({
    system: SYSTEM,
    prompt,
    schema: BrandBookExtractionSchema,
    caller: opts.caller,
    strategyId: opts.strategyId,
    purpose: "extraction",
  });
  return result.data;
}
