import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { signalObservation } from "@/domain/signal-observation";
import { signalSourceUrl } from "@/domain/signal-provenance";
import type { SignalReading } from "@/lib/types/jehuty";
import { assertStrategyRead } from "@/server/trpc/routers/_strategy-read-guard";
import { readGazetteBrandContext } from "./article-notoria";
import { signalHeadline } from "./mappers";

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const provenanceSchema = z.object({
  schema: z.literal("weak-signal-provenance-v1"),
  producer: z.literal("seshat.tarsis.weak-signal-analyzer"),
  kind: z.literal("INFERRED"),
  inputSignals: z.array(z.object({
    id: z.string().optional(), title: z.string(), content: z.string(), sourceType: z.string(),
    sourceUrl: z.string().optional(), collectedAt: z.string(),
    kind: z.enum(["COLLECTED", "INFERRED", "UNSPECIFIED"]),
  })),
  brandContext: z.object({ sector: z.string(), market: z.string(), brandIdentity: z.string(),
    positioning: z.string(), products: z.string(), riskFactors: z.string(),
    countryContext: z.string(), brandHealthContext: z.string() }),
});

/** Legacy URLs are references, not recovered historical analysis inputs. */
function preservedReferences(data: Record<string, unknown>): SignalReading["inputSignals"] {
  if (data.provenanceKind === "INFERRED" || data.sourceType === "INFERRED") return [];
  const references: SignalReading["inputSignals"] = [];
  const seen = new Set<string>();
  const candidates = [
    data.sourceUrl, data.articleUrl, data.url,
    ...(Array.isArray(data.sourceUrls) ? data.sourceUrls : []),
    ...(Array.isArray(data.sources) ? data.sources : []),
    ...(Array.isArray(data.evidence) ? data.evidence : []),
  ];
  for (const candidate of candidates) {
    const row = record(candidate);
    if (row.kind === "INFERRED" || row.provenanceKind === "INFERRED" || row.sourceType === "INFERRED") continue;
    const sourceUrl = typeof candidate === "string" ? signalSourceUrl(candidate)
      : [row.sourceUrl, row.url, row.link].map(signalSourceUrl).find(Boolean);
    if (!sourceUrl || seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);
    references.push({ title: text(row.title) || new URL(sourceUrl).hostname,
      sourceUrl, content: "", collectedAt: "", sourceType: "REFERENCE", kind: "UNSPECIFIED" });
  }
  return references;
}

/** Read only; no generation, network fetch, or keyword-based source reconstruction. */
export async function readSignalReading(input: { userId: string; strategyId: string; signalId: string }): Promise<SignalReading> {
  await assertStrategyRead(input.userId, input.strategyId);
  const signal = await db.signal.findFirst({
    where: { id: input.signalId, strategyId: input.strategyId },
    select: { id: true, strategyId: true, type: true, data: true, createdAt: true },
  });
  if (!signal || signal.strategyId !== input.strategyId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Ce signal ne figure pas dans la Gazette de cette marque." });
  }
  const data = record(signal.data);
  const parsed = provenanceSchema.safeParse(data.provenance);
  const provenance = parsed.success ? parsed.data : null;
  const inputSignals: SignalReading["inputSignals"] = provenance ? provenance.inputSignals.map((snapshot) => {
    const { sourceUrl: candidate, ...rest } = snapshot;
    const sourceUrl = snapshot.kind !== "INFERRED" && snapshot.sourceType !== "INFERRED" ? signalSourceUrl(candidate) : undefined;
    return { ...rest, ...(sourceUrl ? { sourceUrl } : {}) };
  }) : preservedReferences(data);
  const urls = new Set(inputSignals.map((item) => item.sourceUrl).filter(Boolean));
  const [currentBrandContext, digests] = await Promise.all([
    readGazetteBrandContext(input.strategyId),
    urls.size ? db.knowledgeEntry.findMany({
      where: { entryType: "EXTERNAL_FEED_DIGEST", market: `brand:${input.strategyId}`,
        OR: [{ originStrategyId: null }, { originStrategyId: input.strategyId }] },
      orderBy: { createdAt: "desc" }, take: 30,
      select: { market: true, originStrategyId: true, data: true },
    }) : Promise.resolve([]),
  ]);
  for (const digest of digests) {
    const payload = record(digest.data);
    if (digest.market !== `brand:${input.strategyId}`
      || (digest.originStrategyId && digest.originStrategyId !== input.strategyId)
      || (payload.strategyId != null && payload.strategyId !== input.strategyId)) continue;
    for (const raw of Array.isArray(payload.items) ? payload.items : []) {
      const article = record(raw);
      const url = signalSourceUrl(article.link);
      if (!url || !urls.has(url) || !text(article.title)) continue;
      const imageUrl = signalSourceUrl(article.imageUrl);
      const publishedAt = text(article.publishedAt);
      for (const source of inputSignals) if (source.sourceUrl === url && !source.article) {
        source.article = { url, title: text(article.title), content: text(article.summary),
          source: text(article.source), ...(imageUrl ? { imageUrl } : {}),
          ...(publishedAt ? { publishedAt } : {}) };
      }
    }
  }
  const observation = signalObservation(signal);
  return { signalId: signal.id, strategyId: signal.strategyId,
    title: signalHeadline(observation.title, data, signal.type), interpretation: observation.observation,
    createdAt: signal.createdAt.toISOString(), provenanceStatus: provenance ? "TRACEABLE" : inputSignals.length ? "REFERENCED" : "UNTRACEABLE",
    inputSignals, brandContextSnapshot: provenance?.brandContext ?? null, currentBrandContext };
}
