import {
  BarreCampaignReviewRequestSchema, BARRE_REVIEW_REFUSALS, locateBarreCampaignReview, type BarreCampaignReviewRequest,
} from "@/domain/barre-campaign-review";
import type { canAccessStrategy } from "@/server/services/operator-isolation";
import { BARRE_REVIEW_INTAKE_REFUSALS, type BarreReviewIntakeRefusal, type BarreReviewOutcome } from "@/server/services/ingestion-pipeline/barre-review";
import { barreBinding } from "./barre-connection";
import { resolveBarreBrands } from "./barre-context";
import { readBarreSnapshot } from "./workspace";

export const barreReviewInput = BarreCampaignReviewRequestSchema;
type Actor = Parameters<typeof canAccessStrategy>[1];
export type BarreReviewResponse = { status: number; body: Record<string, unknown> };

const BRAND_ID = /^[a-zA-Z0-9_-]{1,200}$/;
const refusal = (status: number, code: string, quoi: string): BarreReviewResponse => ({ status, body: { code, quoi } });

/**
 * La Barre a enregistré sa base, puis désigne une version arrêtée. La Fusée la
 * relit dans cette base (jamais dans le corps de la requête), recalcule son
 * empreinte, résout ses marques par le raccord existant sous la personne
 * connectée, puis émet l'Intent gouverné qui la range dans les sources.
 */
export async function receiveBarreCampaignReview(input: BarreCampaignReviewRequest, actor: Actor): Promise<BarreReviewResponse> {
  const binding = barreBinding();
  const snapshot = await readBarreSnapshot({ fresh: true });
  const located = locateBarreCampaignReview(snapshot.data, input);
  if (!located.ok) {
    const r = BARRE_REVIEW_REFUSALS[located.code];
    return refusal(r.status, located.code, r.message);
  }
  const review = located.review;
  const ids = [...new Set(review.marques.map((m) => m.id))];
  const resolvable = ids.filter((id) => BRAND_ID.test(id));
  const { brands, ambiguous } = resolvable.length ? await resolveBarreBrands(actor, resolvable) : { brands: [], ambiguous: [] };
  const strategies = [...new Set(brands.map((b) => b.strategyId))];
  if (ambiguous.length || strategies.length > 1) {
    return refusal(409, "BRANDS_AMBIGUOUS", "Les marques de ce bilan désignent plusieurs dossiers de marque. Rattachez la campagne à une seule marque, ou qualifiez leur raccord.");
  }
  if (!strategies.length) {
    return refusal(409, "BRAND_NOT_LINKED", "Aucune marque de ce bilan n’est reliée à un dossier de marque que vous pouvez ouvrir.");
  }
  const strategyId = strategies[0]!;
  const linked = new Set(brands.map((b) => b.id));
  const { emitIntent } = await import("@/server/services/mestor/intents");
  const result = await emitIntent({
    kind: "INGEST_BARRE_CAMPAIGN_REVIEW", strategyId, operatorId: actor.userId, instance: binding.instance,
    sourceRevision: snapshot.etag ?? null, review, unlinkedBrands: ids.filter((id) => !linked.has(id)),
  }, { caller: "la-barre:bilan", operatorId: actor.userId });
  if (result.status === "OK") {
    const out = result.output as BarreReviewOutcome;
    return { status: 200, body: { ...out, strategyId, url: `/cockpit/brand/sources?strategy=${encodeURIComponent(strategyId)}` } };
  }
  const code = result.reason as BarreReviewIntakeRefusal | undefined;
  if (result.status === "VETOED" && code && code in BARRE_REVIEW_INTAKE_REFUSALS) {
    const r = BARRE_REVIEW_INTAKE_REFUSALS[code];
    return refusal(r.status, code, r.message);
  }
  if (result.status === "VETOED") return refusal(409, result.reason ?? "VETOED", "La réception de ce bilan est refusée par la gouvernance de ce dossier.");
  return refusal(503, "RECEPTION_FAILED", "Le bilan n’a pas été reçu. Il reste dans La Barre ; transmettez-le de nouveau.");
}
