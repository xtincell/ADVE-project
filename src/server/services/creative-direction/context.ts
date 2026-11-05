import { readCreativeDirectionEdition, type DirectionEdition } from "./document";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { creativeDirectionDoctrine, rulesForProduction, type CreativeTarget } from "@/domain/creative-direction";
import { wrapUntrusted } from "@/server/services/utils/untrusted-content";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function populatedFields(object: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.filter(key => {
    const value = object[key];
    return value != null && (typeof value === "string" ? !!value.trim() : typeof value === "object" && Object.keys(value).length > 0);
  }).map(key => [key, object[key]]));
}

/** Use D directly, even for older brands that have not imported a source-indexed doctrine. */
export function compileCreativeDirection(content: unknown, version: number, target: CreativeTarget = {}, supplement?: DirectionEdition | null) {
  const d = record(content);
  const art = record(d.directionArtistique);
  const identity = populatedFields(art, ["univers", "principes", "chromaticStrategy", "typographySystem", "logoTypeRecommendation", "moodboard"]);
  const voice = populatedFields(d, ["tonDeVoix", "assetsLinguistiques"]);
  const doc = art.doctrine ? creativeDirectionDoctrine.parse(art.doctrine) : supplement?.doctrine;
  if (!doc && !Object.keys(identity).length) return null;

  const choice = doc ? rulesForProduction(doc, target) : null;
  const family = choice?.family;
  const context = {
    source: supplement ? "D.directionArtistique · complément documentaire" : doc ? "D.directionArtistique.doctrine" : "D.directionArtistique",
    ...(supplement ? { documentEdition: supplement.receipt } : {}),
    version, platform: target.platform, format: choice?.format ?? target.format, mode: target.mode ?? "NEW",
    identity, voice,
    familyDecision: choice?.decision ?? "TO_CHOOSE",
    family: family ? { id: family.id, name: family.name, purpose: family.purpose, requirements: family.requirements, sources: family.sources } : null,
    alternatives: family ? undefined : doc?.families.map(f => ({ id: f.id, purpose: f.purpose })),
    graphicAssetSuggestions: choice?.graphicAssetSuggestions ?? [],
    excludedGraphicAssetMentions: choice?.excludedGraphicAssetMentions ?? [],
    rules: choice?.rules.map(r => ({ id: r.id, usage: r.usage, domain: r.domain, guidance: r.guidance, sources: r.sources })) ?? [],
    sourceRegister: choice?.sources.map(s => ({ id: s.id, label: s.label, locator: s.locator })) ?? [],
  };
  const rendered = JSON.stringify(context);
  if (rendered.length > 24000) throw new Error("La doctrine applicable dépasse le budget du brief. Précisez la famille et le format avant la génération.");
  return { context, text: wrapUntrusted("DIRECTION ARTISTIQUE DE MARQUE", rendered, { max: 30000 }) };
}

export async function buildCreativeDirectionContext(input: { strategyId: string; target?: CreativeTarget }, client: Prisma.TransactionClient = db) {
  const pillar = await client.pillar.findUnique({
    where: { strategyId_key: { strategyId: input.strategyId, key: "d" } },
    select: { content: true, currentVersion: true },
  });
  return pillar ? directionForPillar(input.strategyId, pillar, input.target, client) : null;
}

export async function directionForPillar(strategyId: string, pillar: {content: unknown; currentVersion: number}, target?: CreativeTarget, client: Prisma.TransactionClient = db) {
  const supplement = await readCreativeDirectionEdition(strategyId, pillar.content, client);
  return compileCreativeDirection(pillar.content, pillar.currentVersion, target, supplement);
}

export const CREATIVE_DIRECTION_RULE = "Applique les invariants de la doctrine de marque dans leur périmètre. Justifie la famille par la tâche du public et les preuves disponibles. Une proposition est à vérifier. Distingue une référence culturelle, un élément autorisé à être incorporé et une interdiction. Les choix explicites du pilier D priment sur son complément documentaire. Une édition PROPOSED est une piste. Si elle contredit le pilier, signale le point à relire avant tout rendu. Conserve les décisions figées lors d’une correction. Un rendu reste à relire.";
