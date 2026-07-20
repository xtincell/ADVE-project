/**
 * Seshat — Entity Gate, cran 3 : réfutation adversariale (ADR-0162).
 *
 * Pattern hunter-like (deep-research « verify ») : un juge LLM tente de
 * RÉFUTER chaque candidat déjà accepté par le gate déterministe. Contrat
 * strict, aligné sur la doctrine « le LLM propose, le déterministe dispose » :
 *
 *   - DEMOTE-ONLY : le LLM ne peut qu'écarter un candidat accepté. Il ne
 *     repêche jamais un rejeté, n'ajoute jamais un item, ne réécrit rien.
 *   - PLANCHER DÉTERMINISTE : sans provider texte (isTextLLMAvailable false),
 *     timeout, ou sortie invalide → les verdicts déterministes restent tels
 *     quels et le rapport dit honnêtement DETERMINISTIC_ONLY.
 *   - EN DOUTE = REFUSÉ : le prompt impose aboutBrand=false au moindre doute
 *     (supprimer du bruit coûte moins qu'en laisser passer) ; un verdict
 *     MANQUANT dans la réponse = candidat CONSERVÉ (le LLM n'a pas réfuté).
 *   - Entrées non fiables neutralisées (wrapUntrusted, OWASP LLM01).
 */

import { z } from "zod";

export interface AdversarialCandidate {
  /** Id stable côté appelant (index stringifié suffit). */
  id: string;
  /** Texte du candidat (titre + description + nom de source…). */
  text: string;
  /** Source pour le contexte du juge (press / discovery / maps). */
  kind: "press" | "discovery" | "maps";
}

export interface AdversarialResult {
  status: "LIVE" | "UNAVAILABLE" | "ERROR";
  /** Ids réfutés (à écarter). Vide si status ≠ LIVE. */
  refutedIds: Set<string>;
}

const verdictSchema = z.object({
  verdicts: z.array(
    z.object({
      id: z.string(),
      aboutBrand: z.boolean(),
      reason: z.string().max(200),
    }),
  ),
});

/**
 * Juge adversarial en UN appel batché (jamais un appel par item). Best-effort
 * absolu : toute défaillance retourne UNAVAILABLE/ERROR sans throw — le
 * verdict déterministe est le plancher.
 */
export async function adversarialRefute(input: {
  brandName: string;
  sector?: string | null;
  country?: string | null;
  candidates: AdversarialCandidate[];
  maxOutputTokens?: number;
}): Promise<AdversarialResult> {
  if (input.candidates.length === 0) return { status: "LIVE", refutedIds: new Set() };

  try {
    const { isTextLLMAvailable } = await import("@/server/services/llm-gateway");
    if (!isTextLLMAvailable()) return { status: "UNAVAILABLE", refutedIds: new Set() };

    const { executeStructuredLLMCall } = await import("@/server/services/utils/llm-structured");
    const { wrapUntrusted, sanitizeInline } = await import("@/server/services/utils/untrusted-content");

    const system = [
      "Tu es un vérificateur ADVERSARIAL de collecte de données de marque.",
      "On te donne une marque précise (nom, secteur, pays) et des extraits collectés sur le web.",
      "Ta mission est de RÉFUTER : pour chaque extrait, décider s'il parle bien de CETTE marque",
      "précise — et non d'un homonyme, d'un usage ordinaire du mot, d'un classement (« top 10 »),",
      "ou d'une autre entité du même nom ailleurs.",
      "RÈGLE ABSOLUE : au moindre doute, aboutBrand=false. Écarter un vrai signal coûte moins",
      "cher que laisser entrer du bruit dans un rapport client.",
      "Tu ne peux PAS ajouter d'extraits ni en réécrire. Réponds pour chaque id fourni.",
    ].join("\n");

    const list = input.candidates
      .map((c) => `[${c.id}] (${c.kind}) ${c.text.slice(0, 300)}`)
      .join("\n");

    const prompt = [
      `MARQUE : ${sanitizeInline(input.brandName, { max: 120 })}`,
      input.sector ? `SECTEUR : ${sanitizeInline(input.sector, { max: 80 })}` : "",
      input.country ? `PAYS : ${sanitizeInline(input.country, { max: 60 })}` : "",
      "",
      wrapUntrusted("EXTRAITS COLLECTÉS À JUGER", list, { max: 8000 }),
      "",
      `Produis un verdict pour CHAQUE id (${input.candidates.length} au total).`,
    ]
      .filter((l) => l !== "")
      .join("\n");

    const { data } = await executeStructuredLLMCall<z.infer<typeof verdictSchema>>({
      system,
      prompt,
      schema: verdictSchema,
      caller: "seshat:entity-gate:adversarial",
      schemaTitle: "EntityGateAdversarialVerdicts",
      maxOutputTokens: input.maxOutputTokens ?? 1500,
      retries: 1,
    });

    const known = new Set(input.candidates.map((c) => c.id));
    const refutedIds = new Set<string>();
    for (const v of data.verdicts) {
      // Un id inconnu est ignoré (le LLM ne peut pas écarter ce qu'on ne lui a pas donné).
      if (!v.aboutBrand && known.has(v.id)) refutedIds.add(v.id);
    }
    return { status: "LIVE", refutedIds };
  } catch {
    return { status: "ERROR", refutedIds: new Set() };
  }
}
