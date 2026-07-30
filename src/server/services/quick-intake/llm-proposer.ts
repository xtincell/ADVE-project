/**
 * Empreinte publique — étage LLM PROPOSEUR (propose-then-verify).
 *
 * Mandat opérateur 2026-07-30 : « c'est censé être plus intelligent que les
 * scrapeurs sans LLM ». Le constat mesuré était l'inverse — « Chococam » entré
 * nom-seul ne trouvait ni site ni réseau. Ce module ajoute l'intelligence qui
 * manquait, SANS céder sur l'honnêteté du rapport.
 *
 * DOCTRINE (ADR-0046 no-magic-fallback, ADR-0162 entity-gate) : le LLM PROPOSE,
 * il ne DÉCIDE jamais. Il lit ce que la recherche web a déjà ramené et nomme le
 * domaine officiel et les comptes probables — c'est là qu'il bat un parseur,
 * parce qu'il comprend qu'une page qui parle de « Chococam, filiale de Tiger
 * Brands » désigne bien la même entreprise. Mais AUCUNE de ses propositions
 * n'entre dans les faits sans une preuve déterministe récoltée après coup
 * (fetch + gate d'entité). Une proposition non vérifiée est jetée en silence.
 *
 * Complément — et non remplacement — du juge adversarial de l'entity-gate :
 * celui-ci ne peut que RETIRER du bruit (demote-only), celui-là ne peut que
 * proposer des pistes à vérifier. Aucun des deux ne peut inventer un fait.
 *
 * Dégradations : sans clé LLM → `SKIPPED_NO_KEY` (aucun coût, rapport
 * honnête) ; timeout/erreur → `ERROR`. Dans les deux cas la collecte
 * déterministe amont reste le plancher : cet étage n'enlève jamais rien.
 */

import { z } from "zod";

/** Statut de l'étage, exposé dans le rapport (jamais silencieux). */
export type ProposerStatus = "LIVE" | "EMPTY" | "SKIPPED_NO_KEY" | "SKIPPED_NO_INPUT" | "ERROR";

export interface ProposerHit {
  title: string;
  description: string;
  url: string;
}

export interface ProposedIdentity {
  status: ProposerStatus;
  /** Host du site officiel proposé (jamais adopté tel quel — à vérifier). */
  siteHost: string | null;
  /** URLs de profils sociaux proposées (jamais adoptées telles quelles). */
  socialUrls: string[];
}

const proposalSchema = z.object({
  officialSiteHost: z
    .string()
    .nullable()
    .describe("Nom d'hôte du site officiel de CETTE marque (ex: 'chococam.com'), sans https:// ni chemin. null si aucun ne ressort clairement des extraits."),
  socialProfileUrls: z
    .array(z.string())
    .max(8)
    .describe("URLs complètes des profils sociaux OFFICIELS de cette marque, telles qu'elles apparaissent dans les extraits."),
});

const PLATFORM_HOST =
  /^(www\.)?(instagram|facebook|tiktok|linkedin|twitter|x|youtube)\.com$/i;

/**
 * Nettoie un host proposé par le LLM. Rejette tout ce qui n'est pas un
 * nom d'hôte plausible — le modèle peut renvoyer une phrase, une URL, du
 * markdown. Pur.
 */
export function sanitizeProposedHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  s = s.split("/")[0]!.split("?")[0]!.split("#")[0]!.trim();
  // Un host : labels alphanumériques séparés par des points, TLD ≥ 2 lettres.
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(s)) return null;
  // Une plateforme sociale n'est jamais le site officiel d'une marque.
  if (PLATFORM_HOST.test(s)) return null;
  return s;
}

/**
 * Demande au LLM de nommer le site officiel et les comptes de la marque à
 * partir des extraits web DÉJÀ collectés. Ne lève jamais.
 *
 * Rappel : la sortie est une liste de PISTES. L'appelant DOIT les vérifier
 * (fetch + entity-gate) avant de les faire entrer dans les faits.
 */
export async function proposeBrandIdentity(input: {
  brandName: string;
  country?: string | null;
  sector?: string | null;
  hits: readonly ProposerHit[];
  timeoutMs?: number;
}): Promise<ProposedIdentity> {
  const empty = (status: ProposerStatus): ProposedIdentity => ({ status, siteHost: null, socialUrls: [] });
  if (input.hits.length === 0) return empty("SKIPPED_NO_INPUT");

  try {
    const { isTextLLMAvailable } = await import("@/server/services/llm-gateway");
    if (!isTextLLMAvailable()) return empty("SKIPPED_NO_KEY");

    const { executeStructuredLLMCall } = await import("@/server/services/utils/llm-structured");
    const { wrapUntrusted, sanitizeInline } = await import("@/server/services/utils/untrusted-content");

    const system = [
      "Tu es un analyste d'identité de marque sur le web.",
      "On te donne une marque précise (nom, secteur, pays) et des extraits de résultats de recherche.",
      "Ta mission : identifier le SITE OFFICIEL et les COMPTES SOCIAUX OFFICIELS de cette marque.",
      "",
      "RÈGLES ABSOLUES :",
      "- N'utilise QUE ce qui apparaît dans les extraits. N'invente aucune URL, ne complète aucun domaine de mémoire.",
      "- Un site de presse, un annuaire, un agrégateur, une page Wikipédia ne sont PAS le site officiel.",
      "- Un compte d'un AUTRE pays ou d'un homonyme n'est PAS le compte de cette marque : au doute, omets-le.",
      "- Mieux vaut ne rien proposer qu'une piste incertaine : tes propositions seront vérifiées, une piste fausse est du gaspillage.",
    ].join("\n");

    const list = input.hits
      .slice(0, 10)
      .map((h, i) => `[${i}] ${h.url}\n    ${h.title} — ${h.description}`.slice(0, 500))
      .join("\n");

    const prompt = [
      `MARQUE : ${sanitizeInline(input.brandName, { max: 120 })}`,
      input.sector ? `SECTEUR : ${sanitizeInline(input.sector, { max: 80 })}` : "",
      input.country ? `PAYS : ${sanitizeInline(input.country, { max: 60 })}` : "",
      "",
      wrapUntrusted("EXTRAITS DE RECHERCHE WEB", list, { max: 8000 }),
      "",
      "Donne le host du site officiel (ou null) et les URLs des profils sociaux officiels.",
    ]
      .filter((l) => l !== "")
      .join("\n");

    const { data } = await executeStructuredLLMCall<z.infer<typeof proposalSchema>>({
      system,
      prompt,
      schema: proposalSchema,
      caller: "quick-intake:llm-proposer",
      schemaTitle: "BrandIdentityProposal",
      maxOutputTokens: 600,
      retries: 1,
    });

    const siteHost = sanitizeProposedHost(data.officialSiteHost);
    const socialUrls = (data.socialProfileUrls ?? [])
      .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
      .slice(0, 8);

    return {
      status: siteHost || socialUrls.length > 0 ? "LIVE" : "EMPTY",
      siteHost,
      socialUrls,
    };
  } catch {
    return empty("ERROR");
  }
}
