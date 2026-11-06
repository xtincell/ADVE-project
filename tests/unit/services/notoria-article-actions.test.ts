import { describe, expect, it, vi } from "vitest";
import { prepareArticleActions } from "@/server/services/notoria/article-actions";
import { parseRecommendationPayload } from "@/lib/types/recommendation-payload";
import { applyPayloadToPillars } from "@/server/services/notoria/apply-payload";

const title = "Yango Food lance Goya, une expérience de livraison premium de restaurants à Abidjan";
const observation = "Titre : " + title;
const input = { observation, excerpts: [{ field: "title" as const, text: title, start: 8, end: observation.length }] };
const anchor = { pillarKey: "D", field: "promesseMaitre", label: "Promesse de marque", source: "ADVE" as const,
  text: "Aider les foodies à décider où manger à partir de recommandations vérifiables.", stale: false };
const candidate = { field: "title", quote: "une expérience de livraison premium de restaurants à Abidjan",
  anchor: 0, brandQuote: "décider où manger", implication: "L’arrivée d’une offre de livraison pose la question des occasions où le public préfère sortir au restaurant.",
  action: "Tester auprès des lecteurs d’un foodie deux parcours pour une même adresse, sur place et en livraison.",
  format: "Entretien après une recommandation", objective: "Distinguer les occasions de sortie et de livraison",
  measure: "Demander quel parcours le lecteur choisirait et pourquoi avant d’envisager un changement de la fiche." };
const review = { index: 0, supported: true, reason: "La livraison annoncée et le choix de sortie documenté justifient de tester les deux occasions sans présumer une demande." };
const model = (first: unknown, second?: unknown) => vi.fn().mockResolvedValueOnce(JSON.stringify(first)).mockResolvedValueOnce(JSON.stringify(second));

describe("Notoria — initiatives tirées d’un article précis", () => {
  it("returns one catalogue draft with a source passage, a brand premise and a reviewable implication", async () => {
    const gateway = model({ actions: [candidate] }, { reviews: [review] });
    const result = await prepareArticleActions(input, [anchor], gateway);
    expect(gateway).toHaveBeenCalledTimes(2);
    expect(gateway.mock.calls[0]![1]).toContain(title);
    expect(result.actions).toHaveLength(1);
    const entry = result.actions[0]!;
    expect(entry.basis).toMatchObject({ quote: candidate.quote, implication: candidate.implication, measure: candidate.measure, reviewReason: review.reason });
    expect(observation.slice(entry.basis.start, entry.basis.end)).toBe(candidate.quote);
    const payload = parseRecommendationPayload(entry.recommendation.proposedValue)!;
    expect(payload).toMatchObject({ kind: "ADD_INITIATIVE", initiative: { status: "DRAFT", action: candidate.action } });
    const pillars = { i: {} };
    applyPayloadToPillars(pillars, payload);
    expect(pillars).toMatchObject({ i: { catalogueParCanal: { GENERAL: [expect.objectContaining({ id: entry.initiativeId })] } } });
  });

  it("withholds a generic price rewrite even if the model supplies exact quotations", async () => {
    const generic = { ...candidate, action: "Réécrire la grille des tarifs Gold pour les restaurants à Abidjan." };
    const result = await prepareArticleActions(input, [anchor], model({ actions: [generic] }, { reviews: [
      { ...review, supported: false, reason: "Le prix de Gold est sans rapport établi avec cette annonce de livraison." },
    ] }));
    expect(result).toEqual({ actions: [], rejected: 1 });
  });

  it.each([{ ...candidate, quote: "un partenariat commercial est signé" }, { ...candidate, brandQuote: "le distributeur de colis" }, { ...candidate, anchor: 12 }])("never forwards invented evidence for review", async value => {
    const gateway = model({ actions: [value] });
    expect(await prepareArticleActions(input, [anchor], gateway)).toEqual({ actions: [], rejected: 1 });
    expect(gateway).toHaveBeenCalledTimes(1);
  });

  it("accepts zero genuinely supported ideas and does not call the reviewer", async () => {
    const gateway = model({ actions: [] });
    expect(await prepareArticleActions(input, [anchor], gateway)).toEqual({ actions: [], rejected: 0 });
    expect(gateway).toHaveBeenCalledTimes(1);
  });
  it("avoids spending an inference on absent or obsolete brand context", async () => {
    const gateway = vi.fn();
    expect((await prepareArticleActions(input, [{ ...anchor, stale: true }], gateway)).actions).toEqual([]);
    expect(gateway).not.toHaveBeenCalled();
  });
  it.each([undefined, { reviews: [] }, { reviews: [review, review] }, { reviews: [{ ...review, index: 7 }] }])("fails closed on unreadable, missing or contradictory review", async second => {
    await expect(prepareArticleActions(input, [anchor], model({ actions: [candidate] }, second))).rejects.toHaveProperty("code", "INVALID_MODEL_OUTPUT");
  });
  it("distinguishes a provider outage from a completed zero-action analysis", async () => {
    const gateway = vi.fn().mockRejectedValue(new Error("private body"));
    await expect(prepareArticleActions(input, [anchor], gateway)).rejects.toHaveProperty("code", "MODEL_CALL_FAILED");
  });
});
