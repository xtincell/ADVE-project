import { createHash } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { annotationSchema, TAXONOMY_VERSION } from "@/domain/creative-intelligence";
import { executeHybridTool } from "@/server/services/artemis/tools/engine";
import { visionConfiguration } from "@/server/services/llm-gateway/vision";
import { isTextLLMAvailable, isProviderHealthy } from "@/server/services/llm-gateway";
import { assertActiveMarket, annotateSpecimen } from ".";
import { readArchivedMedia } from "./media-archive";
import { videoConfiguration } from "@/server/services/llm-gateway/audiovisual";
import { fetchMediaObservations, extractMediaObservations, annotationFitsCoverage } from "./media-observations";

export const assistedAnalysisInput = z.object({ strategyId: z.string().min(1), specimenId: z.string().min(1), mode: z.enum(["TEXT", "MEDIA", "AUDIOVISUAL"]), observedText: z.string().trim().max(10000).optional() });
export async function draftCreativeAnalysis(input: z.infer<typeof assistedAnalysisInput>, userId: string) {
  input = assistedAnalysisInput.parse(input);
  const specimen = await db.contentSpecimen.findFirst({ where: { id: input.specimenId, strategyId: input.strategyId, visibility: "BRAND" } });
  if (!specimen) throw new TRPCError({ code: "NOT_FOUND", message: "Contenu de marque indisponible." });
  await assertActiveMarket(db, specimen.countryCode);
  const vision = input.mode === "AUDIOVISUAL" ? videoConfiguration() : visionConfiguration();
  if (input.mode !== "TEXT" && (!vision || !isProviderHealthy(vision.provider))) return { state: "DEFERRED_AWAITING_CREDENTIALS" as const, connectorId: "llm-vision" };
  if (input.mode === "TEXT" && !isTextLLMAvailable()) return { state: "DEFERRED_AWAITING_CREDENTIALS" as const, connectorId: "llm-text" };
  if (input.mode !== "TEXT" && !specimen.mediaUrl && !specimen.mediaArchive || input.mode === "TEXT" && !input.observedText) return { state: "DEGRADED" as const, reason: "MISSING_PREREQUISITE" as const };
  const archived = input.mode !== "TEXT" ? await readArchivedMedia(specimen.id, input.strategyId) : null;
  const media = input.mode !== "TEXT" ? archived ? await extractMediaObservations(archived.bytes, archived.mediaType, input.mode === "AUDIOVISUAL") : await fetchMediaObservations(specimen.mediaUrl!, input.mode === "AUDIOVISUAL") : null;
  const contentHash = media?.contentHash ?? createHash("sha256").update(input.observedText!).digest("hex");
  const coverage = media?.coverage ?? { method: "SUPPLIED_TEXT", audioObserved: false };
  const observedContent = JSON.stringify({ caption: specimen.caption, suppliedText: input.observedText, coverage });
  const output = await executeHybridTool("creative-observation-draft", input.strategyId, { observed_content: observedContent }, { images: media?.images, video: media && "video" in media ? media.video : undefined, signal: AbortSignal.timeout(input.mode === "AUDIOVISUAL" ? 90000 : 45000) });
  const annotation = annotationSchema.safeParse(output.output);
  if (!annotation.success || output.path !== "llm" || !annotationFitsCoverage(annotation.data, coverage)) return { state: "DEGRADED" as const, reason: "INSUFFICIENT_DATA" as const };
  annotation.data.caveats = [...annotation.data.caveats.slice(0, 9), input.mode === "AUDIOVISUAL" ? "Vidéo complète transmise au modèle ; scènes et transcription sont des observations assistées à vérifier, sans preuve de causalité." : media ? "Observation visuelle partielle ; audio, mouvements et transitions non établis." : "Texte fourni uniquement ; chronologie et mise en scène non observées."];
  const analysisKey = createHash("sha256").update(JSON.stringify([specimen.id, TAXONOMY_VERSION, "MODEL_DRAFT", contentHash, annotation.data, coverage])).digest("hex");
  const analysis = await db.creativeAnalysis.upsert({ where: { analysisKey }, update: {}, create: { specimenId: specimen.id, analysisKey, taxonomyVersion: TAXONOMY_VERSION, method: "MODEL_DRAFT", contentHash, createdBy: userId, annotation: JSON.parse(JSON.stringify({ ...annotation.data, coverage, gloryOutputId: output.outputId, reviewRequired: true })) } });
  return { state: "LIVE" as const, analysisId: analysis.id, annotation: annotation.data, coverage, contentHash, reviewRequired: true as const };
}
export const reviewDraftInput = z.object({ strategyId: z.string().min(1), analysisId: z.string().min(1), annotation: annotationSchema });
export async function reviewCreativeDraft(input: z.infer<typeof reviewDraftInput>, userId: string) {
  const draft = await db.creativeAnalysis.findFirst({ where: { id: input.analysisId, method: "MODEL_DRAFT", specimen: { strategyId: input.strategyId, visibility: "BRAND" } } });
  if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Brouillon indisponible dans ce périmètre." });
  // Append a separately attributed manual observation; never mutate the model draft into evidence.
  return annotateSpecimen({ strategyId: input.strategyId, specimenId: draft.specimenId, contentHash: draft.contentHash, annotation: input.annotation }, userId);
}
