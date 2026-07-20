/**
 * Quick Intake — scrub déterministe des PREUVES non fondées (ADR-0163).
 *
 * Constat (test qualité 5 marques, 2026-07-20) : malgré la règle prompt
 * « NE FABRIQUE JAMAIS de chiffres », l'extracteur LLM produit des preuves
 * chiffrées inventées (`roiProofs` : « +300 % — Client PME Cameroun —
 * Attestation "Grâce à Orange…" ») qui gonflent le score V (24/25 pour un
 * intake de 5 phrases) et s'affichent au client comme « valeurs extraites ».
 *
 * Doctrine : un prompt n'est pas une garde — le déterministe tranche.
 * Règle : un champ de PREUVE (nom de champ ~ roi/proof/traction/attestation/
 * metric/lift/esov/kpi/témoignage) ne survit que si CHAQUE nombre « dur »
 * qu'il contient apparaît dans le texte SOURCE (réponses brutes du fondateur
 * + faits déclarés). Pas de nombre fondé → champ droppé, compté, jamais
 * remplacé. Les champs de JUGEMENT (archetype, personas, positionnement…)
 * ne passent pas par ce scrub — le draft INFERRED y est légitime (ADR-0035).
 * Pur, zéro IO, zéro LLM.
 */

const EVIDENCE_KEY_RE =
  /roi|proof|preuve|traction|attestation|testimonial|temoignage|metric|lift|esov|kpi|revenue|chiffreaffaire|growthrate/i;

/** Nombres « durs » d'une valeur sérialisée : 300 dans « +300% », 90 dans « 90j », 1948… */
function hardNumbers(serialized: string): string[] {
  return serialized.match(/\d[\d\s.,]{0,12}\d|\d/g)?.map((n) => n.replace(/[\s.,]/g, "")) ?? [];
}

function normalizeDigits(text: string): string {
  // Source aplatie : « 12 500 » et « 12.500 » doivent fonder « 12500 ».
  return text.replace(/(\d)[\s.,](?=\d)/g, "$1");
}

export interface EvidenceScrubResult {
  content: Record<string, unknown>;
  /** Champs droppés (chemin), pour trace honnête. */
  dropped: string[];
}

/**
 * Scrub un contenu pilier extrait. `sourceText` = concat des réponses brutes
 * + faits déclarés (tout nombre déclaré n'importe où par le fondateur est
 * fondé). Ne touche que les champs dont le NOM matche EVIDENCE_KEY_RE.
 */
export function scrubUnfoundedEvidence(
  content: Record<string, unknown>,
  sourceText: string,
): EvidenceScrubResult {
  const source = normalizeDigits(sourceText);
  const dropped: string[] = [];

  const isFounded = (value: unknown): boolean => {
    const nums = hardNumbers(JSON.stringify(value ?? ""));
    if (nums.length === 0) return true; // pas de chiffre = pas une preuve chiffrée
    return nums.every((n) => source.includes(n));
  };

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(content)) {
    if (value == null || !EVIDENCE_KEY_RE.test(key)) {
      out[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      // Tableau de preuves (roiProofs[]) : chaque entrée se fonde seule.
      const kept = value.filter((entry) => {
        const ok = isFounded(entry);
        if (!ok) dropped.push(`${key}[]`);
        return ok;
      });
      if (kept.length > 0) out[key] = kept;
      else if (value.length > 0) dropped.push(key);
      else out[key] = value;
    } else if (isFounded(value)) {
      out[key] = value;
    } else {
      dropped.push(key);
    }
  }
  return { content: out, dropped };
}
