/** Existing-task resumption; original emission is the only brief authority. */
import { isDeepStrictEqual } from "node:util";
import { db } from "@/lib/db";
import { verifyEmissionSeal } from "@/server/governance/hash-chain";
import type { GenerativeTask } from "@prisma/client";
import { ForgeBriefSchema } from "./manifest";
import type { MaterializeBriefPayload } from "./types";

export async function resolveResumptionPayload(taskId: string, strategyId: string, operatorId: string) {
  const task = await db.generativeTask.findUnique({ where: { id: taskId } });
  if (!task || task.strategyId !== strategyId || task.operatorId !== operatorId) {
    throw new Error("Cette production n’est pas accessible dans ce dossier.");
  }
  const original = await db.intentEmission.findUnique({ where: { id: task.intentId } });
  if (!original || original.intentKind !== "PTAH_MATERIALIZE_BRIEF" || original.strategyId !== strategyId
    || !original.payload || typeof original.payload !== "object" || Array.isArray(original.payload)) {
    throw new Error("Le reçu du brief original est absent. La production ne sera pas recréée automatiquement.");
  }
  if (!verifyEmissionSeal(original).ok) {
    throw new Error("Le reçu original ne peut pas être vérifié. Relisez cette décision avant de lancer une nouvelle production.");
  }
  const raw = original.payload as Record<string, unknown>;
  const parsed = ForgeBriefSchema.safeParse(raw.brief);
  if (!parsed.success || raw.kind !== "PTAH_MATERIALIZE_BRIEF" || raw.strategyId !== strategyId
    || raw.operatorId !== operatorId || typeof raw.sourceIntentId !== "string"
    || raw.sourceIntentId !== task.sourceIntentId || parsed.data.forgeSpec.kind !== task.forgeKind
    || parsed.data.pillarSource !== task.pillarSource || parsed.data.manipulationMode !== task.manipulationMode
    || ["campaignId", "briefId", "sourceBrandAssetId"].some(key =>
      (raw[key] ?? null) !== task[key as "campaignId" | "briefId" | "sourceBrandAssetId"])) {
    throw new Error("Le reçu du brief ne correspond plus à cette production. Aucun nouvel appel ne sera envoyé.");
  }
  const payload: MaterializeBriefPayload = {
    strategyId, sourceIntentId: raw.sourceIntentId,
    campaignId: task.campaignId, briefId: task.briefId, sourceBrandAssetId: task.sourceBrandAssetId,
    brief: parsed.data as MaterializeBriefPayload["brief"], resumeTaskId: task.id,
  };
  if (!isDeepStrictEqual(providerParameters(task), payload.brief.forgeSpec.parameters)) {
    throw new Error("Les paramètres enregistrés ne correspondent plus au brief original. Aucun envoi ne sera effectué.");
  }
  return { payload, task };
}

export function assertUnchangedResumption(input: MaterializeBriefPayload, original: MaterializeBriefPayload) {
  if (input.strategyId !== original.strategyId || input.sourceIntentId !== original.sourceIntentId
    || ["campaignId", "briefId", "sourceBrandAssetId"].some(key =>
      (input[key as "campaignId"] ?? null) !== (original[key as "campaignId"] ?? null))
    || !isDeepStrictEqual(input.brief, original.brief) || input.overrideMixViolation) {
    throw new Error("Une reprise conserve le brief original. Une modification nécessite une nouvelle décision de production.");
  }
}

/** STARTED is committed before the network call. Never infer 'not submitted' after an interruption. */
export function submissionParameters(task: GenerativeTask) {
  return { ...providerParameters(task), _ptahSubmission: { state: "STARTED", startedAt: new Date().toISOString() } };
}

/** Internal reservation metadata never becomes an input to a provider or regeneration. */
export function providerParameters(task: GenerativeTask) {
  if (!task.parameters || typeof task.parameters !== "object" || Array.isArray(task.parameters)) return {};
  const parameters = { ...task.parameters };
  delete parameters._ptahSubmission;
  return parameters;
}

export function hasSubmissionClaim(task: GenerativeTask): boolean {
  if (!task.parameters || typeof task.parameters !== "object" || Array.isArray(task.parameters)) return false;
  const claim = task.parameters._ptahSubmission;
  return Boolean(claim && typeof claim === "object" && !Array.isArray(claim) && claim.state === "STARTED");
}
