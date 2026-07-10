/**
 * Empreinte digitale — narratif du diagnostic (ADR-0121 vague A).
 *
 * Produit 2-4 phrases en français qui racontent l'empreinte mesurée pour le
 * rapport discovery. Deux chemins :
 *   1. LLM (gateway, purpose `intermediate`, time-boxé court) — reformulation
 *      uniquement à partir des FAITS mesurés fournis, jamais d'invention ;
 *   2. Template déterministe (fallback systématique : pas de clé, erreur,
 *      sortie trop courte ou hors-sujet).
 *
 * Honnêteté ADR-0046 : les dimensions non mesurées sont dites « non mesurées »,
 * jamais comptées comme faiblesses. Le narratif est purement descriptif —
 * l'ADVE reste founder-owned, rien n'est écrit dans les piliers ici.
 */

import type { EnrichedFootprint } from "./public-enrichment";
import type { FootprintScore } from "./footprint-score";

export interface FootprintNarrative {
  text: string;
  source: "LLM" | "TEMPLATE";
}

export interface NarrateFootprintContext {
  companyName: string;
  sector?: string | null;
}

const nf = new Intl.NumberFormat("fr-FR");

/** Faits mesurés → lignes factuelles (pur). Base du template ET du prompt LLM. */
export function collectFootprintFacts(f: EnrichedFootprint, companyName: string): string[] {
  const facts: string[] = [];

  if (f.site) {
    facts.push(
      f.site.reachable
        ? `Site web en ligne (${f.site.url})${f.site.tech?.https ? ", en HTTPS" : ""}${f.site.tech?.cms ? `, propulsé par ${f.site.tech.cms}` : ""}.`
        : `Un site est déclaré (${f.site.url}) mais il était injoignable lors de la collecte.`,
    );
  }

  const realCounts = f.followerCounts ?? [];
  const ytSubs = f.youtube?.status === "LIVE" && f.youtube.subscriberCount ? f.youtube.subscriberCount : 0;
  const totalAudience = realCounts.reduce((s, c) => s + c.followerCount, 0) + ytSubs;
  if (f.socials.length > 0) {
    facts.push(
      `${f.socials.length} canal(aux) social(aux) détecté(s) (${[...new Set(f.socials.map((s) => s.platform))].join(", ")})${
        totalAudience > 0 ? ` totalisant ${nf.format(totalAudience)} abonnés mesurés` : ""
      }.`,
    );
  }

  if (f.maps?.status === "LIVE" && f.maps.rating !== null) {
    facts.push(`Fiche Google Business : ${f.maps.rating}/5 sur ${nf.format(f.maps.reviewCount ?? 0)} avis.`);
  } else if (f.maps?.status === "NOT_FOUND") {
    facts.push(`Aucune fiche Google Business trouvée pour ${companyName}.`);
  }

  if (f.press.length > 0) {
    facts.push(`${f.press.length} mention(s) presse récente(s).`);
  } else if (f.enrichment.press === "EMPTY") {
    facts.push("Aucune mention presse récente trouvée.");
  }

  if (f.emailInfra?.status === "LIVE") {
    facts.push(
      f.emailInfra.hasMx
        ? `Email professionnel en place (${f.emailInfra.mxProvider ?? "MX"}${f.emailInfra.hasSpf ? ", SPF" : ""}${f.emailInfra.hasDmarc ? ", DMARC" : ""}).`
        : "Pas d'infrastructure email professionnelle sur le domaine.",
    );
  }

  if (f.domain?.status === "LIVE" && f.domain.ageYears !== null) {
    facts.push(`Domaine enregistré depuis ${f.domain.ageYears} an(s).`);
  }

  if (f.performance?.status === "LIVE" && f.performance.performanceScore !== null) {
    facts.push(`Performance mobile du site : ${f.performance.performanceScore}/100 (PageSpeed).`);
  }

  if (f.ads?.status === "LIVE" && f.ads.activeAdsCount) {
    facts.push(`${f.ads.activeAdsCount} publicité(s) Meta active(s).`);
  } else if (f.ads?.status === "NOT_FOUND") {
    facts.push("Aucune publicité Meta active détectée.");
  }

  return facts;
}

/** Narratif template 100 % déterministe (pur — testé sans IO). */
export function buildFootprintNarrativeTemplate(
  f: EnrichedFootprint,
  ctx: NarrateFootprintContext,
): string {
  const score: FootprintScore | undefined = f.score;
  const facts = collectFootprintFacts(f, ctx.companyName);

  const opening =
    score?.total !== null && score?.total !== undefined
      ? `L'empreinte digitale publique de ${ctx.companyName} ressort à ${score.total}/100 (calculé sur les dimensions réellement mesurées).`
      : `L'empreinte digitale publique de ${ctx.companyName} n'a pas pu être mesurée automatiquement.`;

  const unmeasured = (score?.dimensions ?? []).filter((d) => !d.measured);
  const closing =
    unmeasured.length > 0
      ? `Dimensions non mesurées lors de cette collecte : ${unmeasured.map((d) => d.label.toLowerCase()).join(", ")}.`
      : "";

  return [opening, facts.join(" "), closing].filter(Boolean).join(" ").trim();
}

/**
 * Narratif LLM avec fallback template. Jamais de throw. Le LLM reformule les
 * faits mesurés — toute sortie trop courte, trop longue ou qui ne cite pas la
 * marque est rejetée au profit du template (anti-hallucination déterministe).
 */
export async function narrateFootprint(
  f: EnrichedFootprint,
  ctx: NarrateFootprintContext,
  opts?: { timeoutMs?: number },
): Promise<FootprintNarrative> {
  const template = buildFootprintNarrativeTemplate(f, ctx);
  const facts = collectFootprintFacts(f, ctx.companyName);

  // Rien de mesuré → le template honnête suffit, pas d'appel LLM.
  if (facts.length === 0 || !f.score || f.score.total === null) {
    return { text: template, source: "TEMPLATE" };
  }

  const timeoutMs = opts?.timeoutMs ?? 8_000;
  try {
    const { callLLM } = await import("@/server/services/llm-gateway");
    // Entrée non fiable neutralisée (LOT 1e) : le nom/secteur sont déclarés
    // par le dirigeant (saisie libre) et les faits contiennent du contenu
    // scrapé du web public (titres de pages, avis, presse) — surface
    // d'injection. sanitizeInline + wrapUntrusted + UNTRUSTED_NOTICE.
    const { sanitizeInline, wrapUntrusted, UNTRUSTED_NOTICE } = await import(
      "@/server/services/utils/untrusted-content"
    );
    const brand = sanitizeInline(ctx.companyName, { max: 120 });
    const sector = ctx.sector ? sanitizeInline(ctx.sector, { max: 80 }) : null;
    const call = callLLM({
      caller: "quick-intake:footprint-narrative",
      purpose: "intermediate",
      system: `${UNTRUSTED_NOTICE}\n\nTu es l'analyste discovery de La Fusée. Tu rédiges en français, ton professionnel et direct. Tu t'appuies EXCLUSIVEMENT sur les faits fournis — aucune invention, aucun chiffre qui n'y figure pas, aucune recommandation commerciale.`,
      prompt: `Marque : ${brand}${sector ? ` (secteur : ${sector})` : ""}.
Score d'empreinte digitale publique : ${f.score.total}/100 (sur les dimensions mesurées uniquement).

${wrapUntrusted("FAITS MESURÉS (collecte publique)", facts.map((fact) => `- ${fact}`).join("\n"), { max: 4000 })}

Rédige 2 à 4 phrases qui synthétisent cette empreinte pour un rapport de diagnostic de marque. Cite le score. Reste strictement factuel. Réponds avec le paragraphe seul, sans titre ni liste.`,
      maxOutputTokens: 400,
    });
    const { text } = await Promise.race([
      call,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);

    const cleaned = text.trim().replace(/^["«\s]+|["»\s]+$/g, "");
    const citesBrand = cleaned.toLowerCase().includes(ctx.companyName.toLowerCase().slice(0, 12));
    const citesScore = cleaned.includes(String(f.score.total));
    if (cleaned.length >= 120 && cleaned.length <= 1_200 && citesBrand && citesScore) {
      return { text: cleaned, source: "LLM" };
    }
    return { text: template, source: "TEMPLATE" };
  } catch {
    return { text: template, source: "TEMPLATE" };
  }
}
