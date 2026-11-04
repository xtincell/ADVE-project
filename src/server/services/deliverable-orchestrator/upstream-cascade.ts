import type { BrandAsset, Prisma } from "@prisma/client";
import type { BrandAssetKind } from "@/domain/brand-asset-kinds";
import type { CalendarBriefSource } from "@/domain/calendar-brief-source";
import { FORMAT_TO_KIND } from "@/domain/brand-asset-formats";
import { isUsableGeneration } from "@/domain/generation-result";
import {
  canAccessStrategy,
  getOperatorContext,
} from "@/server/services/operator-isolation";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import { readCreativeDirectionEdition } from "@/server/services/creative-direction/document";
import { z } from "zod";
import { db } from "@/lib/db";
import { getGloryTool } from "@/server/services/artemis/tools/registry";
import { PillarResolver } from "@/server/services/artemis/tools/pillar-resolver";
import { executeTool } from "@/server/services/artemis/tools/engine";
import { depositInBrandVault } from "@/server/services/artemis/tools/sequence-executor";
import { wrapUntrusted } from "@/server/services/utils/untrusted-content";
import { assertUsablePin, readPinSourceText } from "./production-sources";
import { briefAssetFingerprint } from "./vault-matcher";
import type {
  BriefRequirement,
  DeliverableComposition,
  VaultMatchResult,
} from "./types";

interface PrepareInput {
  composition: DeliverableComposition;
  strategyId: string;
  operatorId: string;
  dispatchIntentId: string;
  previewIntentId: string;
  campaignId?: string;
  sourceText: string;
  calendarBrief?: CalendarBriefSource;
}

interface UpstreamStep {
  kind: BrandAssetKind;
  status: "REUSED" | "GENERATED" | "RESUMED";
  assetIds: string[];
  outputId?: string;
}

interface Material {
  step: UpstreamStep;
  text: string;
  receipts: { id: string; version: number; fingerprint: string }[];
}

// Reject oversized context before the next call rather than silently cutting a brief or copy.
const MAX_BRIEF_CONTEXT = 96_000;
function joinContext(parts: string[]) {
  const text = parts.filter(Boolean).join("\n\n");
  if (text.length > MAX_BRIEF_CONTEXT)
    throw new Error(
      "Les briefs et sources dépassent la capacité de cette production. Sélectionnez des passages plus précis et préparez un nouvel aperçu.",
    );
  return text;
}

function material(
  step: UpstreamStep,
  assets: BrandAsset[],
  exactContent: string,
  origin: Record<string, unknown>,
): Material {
  if (!exactContent.trim())
    throw new Error(`Le contenu du prérequis ${step.kind} est vide.`);
  const receipts = assets.map((asset) => ({
    id: asset.id,
    version: asset.version,
    fingerprint: briefAssetFingerprint(asset),
  }));
  const payload = JSON.stringify({
    ...origin,
    kind: step.kind,
    status: step.status === "RESUMED" ? "GENERATED" : step.status,
    versions: receipts,
    content: exactContent,
  });
  if (payload.length > MAX_BRIEF_CONTEXT)
    throw new Error(`Le prérequis ${step.kind} dépasse la capacité du brief.`);
  return {
    step,
    receipts,
    text: wrapUntrusted("PRÉREQUIS DE PRODUCTION", payload, {
      max: MAX_BRIEF_CONTEXT,
    }),
  };
}

async function reuse(
  input: PrepareInput,
  node: BriefRequirement,
  match: VaultMatchResult,
) {
  if (!match.assetId)
    throw new Error(`La référence active ${node.kind} n’a plus d’identité.`);
  const asset = await db.brandAsset.findFirst({
    where: {
      id: match.assetId,
      strategyId: input.strategyId,
      kind: node.kind,
      state: "ACTIVE",
    },
  });
  if (
    !asset ||
    asset.version !== match.assetVersion ||
    briefAssetFingerprint(asset) !== match.assetFingerprint
  )
    throw new Error(
      `La version active de ${node.kind} a changé depuis l’aperçu. Préparez un nouvel aperçu.`,
    );
  assertUsablePin(
    asset,
    { assetId: asset.id, version: asset.version, role: "REFERENCE" },
    input.campaignId,
  );
  const original = await readPinSourceText(
    input.strategyId,
    asset,
    "REFERENCE",
  );
  return material(
    { kind: node.kind, status: "REUSED", assetIds: [asset.id] },
    [asset],
    original.fullText,
    {
      name: asset.name,
      campaignId: asset.campaignId,
      sourceIntentId: asset.sourceIntentId,
      gloryOutputId: asset.sourceGloryOutputId,
      documentId: original.documentId,
      documentHash: original.documentHash,
      originalHash: original.originalHash,
    },
  );
}

async function generate(
  input: PrepareInput,
  node: BriefRequirement,
  sources: Material[],
  resolver: PillarResolver,
) {
  const tool = node.producerSlug ? getGloryTool(node.producerSlug) : undefined;
  if (!tool || FORMAT_TO_KIND[tool.outputFormat] !== node.kind)
    throw new Error(
      `Aucune pièce active ni aucun producteur de brief pour ${node.kind}.`,
    );
  const context = joinContext([
    input.sourceText,
    ...sources.map((s) => s.text),
  ]);
  const calendar = input.calendarBrief;
  const bindings = resolver.resolveBindingsAsStrings(tool.pillarBindings ?? {});
  const fields = {
    ...bindings,
    ...(calendar
      ? {
          theme: calendar.theme ?? "",
          angle: calendar.angle ?? "",
          format: calendar.format ?? "",
          platform: calendar.platform,
          creativeFamily: calendar.family ?? "",
          creativeMode: calendar.mode,
        }
      : {}),
    production_sources: context,
  };
  const run = await executeTool(tool.slug, input.strategyId, fields, {
    production: {
      previewIntentId: input.previewIntentId,
      dispatchIntentId: input.dispatchIntentId,
      sourceText: context,
    },
  });
  if (!run.outputId || !run.intentId || !isUsableGeneration(run.output))
    throw new Error(
      `Le producteur ${tool.name} n’a pas livré un brief exploitable et traçable.`,
    );
  const ids = await depositInBrandVault({
    tool,
    toolOutput: run.output,
    gloryOutputId: run.outputId,
    gloryIntentId: run.intentId,
    strategyId: input.strategyId,
    context: { _campaignId: input.campaignId },
  });
  if (!ids.length)
    throw new Error(
      `Le brief ${tool.name} n’a pas été conservé dans le coffre.`,
    );
  const assets = await db.brandAsset.findMany({
    where: {
      id: { in: ids },
      strategyId: input.strategyId,
      kind: node.kind,
      campaignId: input.campaignId ?? null,
      sourceGloryOutputId: run.outputId,
      sourceIntentId: run.intentId,
      state: { in: ["DRAFT", "CANDIDATE"] },
    },
  });
  if (assets.length !== ids.length)
    throw new Error(`Le dépôt des versions de ${node.kind} est incomplet.`);
  return material(
    {
      kind: node.kind,
      status: "GENERATED",
      assetIds: ids,
      outputId: run.outputId,
    },
    assets,
    JSON.stringify(run.output),
    {
      producteur: tool.slug,
      gloryOutputId: run.outputId,
      sourceIntentId: run.intentId,
      usage: "Propositions de travail, sans sélection de marque.",
      parents: sources.flatMap((s) => s.receipts),
    },
  );
}

const completedReceipt = z.object({
  outputId: z.string().min(1),
  versions: z
    .array(
      z.object({
        id: z.string(),
        version: z.number().int(),
        fingerprint: z.string().length(64),
      }),
    )
    .min(1),
  originDispatchId: z.string().optional(),
});

/** Two reviewed previews can request the same expensive brief concurrently. Save the
 * claim before the provider call, without holding a database lock while it runs. */
async function claimStep(
  input: PrepareInput,
  node: BriefRequirement,
  inputFingerprint: string,
) {
  const stepName = `upstream:${node.kind}`;
  return db.$transaction(async (tx) => {
    const key = `upstream:${input.strategyId}:${inputFingerprint}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
    const last = await tx.intentEmissionEvent.findFirst({
      where: {
        stepName,
        intent: {
          strategyId: input.strategyId,
          intentKind: "COMPOSE_DELIVERABLE",
        },
        partial: { path: ["inputFingerprint"], equals: inputFingerprint },
      },
      orderBy: [{ emittedAt: "desc" }, { id: "desc" }],
      select: { phase: true, intent: { select: { status: true } } },
    });
    if (
      last?.phase === "EXECUTING" &&
      ["PENDING", "QUEUED"].includes(last.intent.status)
    ) {
      throw new Error(
        `Le prérequis ${node.kind} est déjà en cours pour cette version du brief.`,
      );
    }
    await tx.intentEmissionEvent.create({
      data: {
        intentId: input.dispatchIntentId,
        stepName,
        phase: "EXECUTING",
        partial: {
          kind: node.kind,
          mode: "GENERATE",
          producer: node.producerSlug,
          inputFingerprint,
          previewIntentId: input.previewIntentId,
        },
      },
    });
  });
}

async function resume(
  input: PrepareInput,
  node: BriefRequirement,
  parents: Material[],
  fingerprint: string,
) {
  const last = await db.intentEmissionEvent.findFirst({
    where: {
      stepName: `upstream:${node.kind}`,
      phase: "COMPLETED",
      intent: {
        strategyId: input.strategyId,
        intentKind: "COMPOSE_DELIVERABLE",
      },
      partial: { path: ["inputFingerprint"], equals: fingerprint },
    },
    orderBy: { emittedAt: "desc" },
    select: { intentId: true, partial: true },
  });
  if (!last) return null;
  const checked = completedReceipt.safeParse(last.partial);
  if (!checked.success || !node.producerSlug) return null;
  const { outputId, versions } = checked.data;
  const [output, assets] = await Promise.all([
    db.gloryOutput.findFirst({
      where: {
        id: outputId,
        strategyId: input.strategyId,
        toolSlug: node.producerSlug,
      },
      select: { output: true },
    }),
    db.brandAsset.findMany({
      where: {
        id: { in: versions.map((v) => v.id) },
        strategyId: input.strategyId,
        campaignId: input.campaignId ?? null,
        kind: node.kind,
        sourceGloryOutputId: outputId,
        state: { in: ["DRAFT", "CANDIDATE"] },
      },
    }),
  ]);
  if (
    !output ||
    !isUsableGeneration(output.output) ||
    assets.length !== versions.length
  )
    return null;
  const ordered = versions.map((v) => assets.find((a) => a.id === v.id));
  if (
    ordered.some(
      (a, i) =>
        !a ||
        !a.sourceIntentId ||
        a.version !== versions[i]!.version ||
        briefAssetFingerprint(a) !== versions[i]!.fingerprint ||
        (a.staleAt && a.staleAt <= new Date()),
    )
  )
    return null;
  const recovered = ordered as BrandAsset[];
  return material(
    {
      kind: node.kind,
      status: "RESUMED",
      assetIds: versions.map((v) => v.id),
      outputId,
    },
    recovered,
    JSON.stringify(output.output),
    {
      producteur: node.producerSlug,
      gloryOutputId: outputId,
      sourceIntentId: recovered[0]!.sourceIntentId,
      usage: "Propositions de travail, sans sélection de marque.",
      parents: parents.flatMap((s) => s.receipts),
    },
  );
}

/** One dispatch is claimed by the reviewed preview before reaching this function.
 * Each prerequisite declared by the target is prepared once, even when shared in the DAG.
 * An active document is a terminal input. Its historical prerequisites are not regenerated. */
export async function prepareUpstreamBriefs(
  input: PrepareInput,
): Promise<{ text: string; steps: UpstreamStep[] }> {
  const target = input.composition.briefDag.find((n) => n.depth === 0);
  if (!target || target.kind !== input.composition.targetKind)
    throw new Error("Le plan ne contient pas le livrable cible.");
  if (!input.dispatchIntentId || !input.previewIntentId)
    throw new Error("L’aperçu et la production doivent être identifiés.");
  if (!target.requires.length) return { text: "", steps: [] };
  // The legacy Intent calls this operatorId but sends the authenticated user's ID.
  const actor = await getOperatorContext(input.operatorId);
  if (!(await canAccessStrategy(input.strategyId, actor)))
    throw new Error("Ce plan n’est pas accessible à cet opérateur.");
  const [brand, pillars] = await Promise.all([
    db.strategy.findUniqueOrThrow({
      where: { id: input.strategyId },
      select: {
        name: true,
        description: true,
        businessContext: true,
        advertis_vector: true,
      },
    }),
    db.pillar.findMany({
      where: { strategyId: input.strategyId },
      orderBy: { key: "asc" },
      select: {
        key: true,
        currentVersion: true,
        content: true,
        confidence: true,
        validationStatus: true,
      },
    }),
  ]);
  const d=pillars.find(row=>row.key.toLowerCase()==="d");
  const documentaryDirection=d ? await readCreativeDirectionEdition(input.strategyId,d.content) : null;
  const contextFingerprint = sourceFingerprint({ rawData: { brand, pillars, documentaryDirection:documentaryDirection?.receipt } });
  const resolver = PillarResolver.fromData(
    pillars.map((p) => ({
      key: p.key,
      content: (p.content ?? {}) as Record<string, unknown>,
      confidence: p.confidence ?? 0,
    })),
  );
  const prepared = new Map<BrandAssetKind, Material>();
  const active = new Set<BrandAssetKind>();
  async function record(
    kind: BrandAssetKind,
    phase: string,
    partial: Record<string, unknown>,
  ) {
    await db.intentEmissionEvent.create({
      data: {
        intentId: input.dispatchIntentId,
        stepName: `upstream:${kind}`,
        phase,
        partial: {
          kind,
          previewIntentId: input.previewIntentId,
          ...partial,
        } as Prisma.InputJsonValue,
      },
    });
  }
  async function visit(kind: BrandAssetKind): Promise<Material> {
    const existing = prepared.get(kind);
    if (existing) return existing;
    const node = input.composition.briefDag.find((n) => n.kind === kind);
    const match = input.composition.vaultMatches.find((m) => m.kind === kind);
    if (!node || !match || active.has(kind))
      throw new Error(`Le plan des prérequis est incohérent pour ${kind}.`);
    active.add(kind);
    let inputFingerprint: string | undefined;
    let claimed = false;
    try {
      let current: Material;
      if (match.status === "ACTIVE_REUSE") {
        await record(kind, "EXECUTING", { mode: "REUSE" });
        current = await reuse(input, node, match);
      } else {
        const parents: Material[] = [];
        for (const required of node.requires)
          parents.push(await visit(required));
        const tool = node.producerSlug
          ? getGloryTool(node.producerSlug)
          : undefined;
        inputFingerprint = sourceFingerprint({
          rawData: {
            key: "upstream-brief/v1",
            kind,
            producer: node.producerSlug,
            template: tool?.promptTemplate,
            required: node.requires,
            bindings: tool?.pillarBindings,
            format: tool?.outputFormat,
            contextFingerprint,
            campaignId: input.campaignId,
            scope:
              input.calendarBrief ??
              (input.sourceText
                ? input.composition.targetKind
                : input.previewIntentId),
            sourceText: input.sourceText,
            parents: parents.map((parent) => ({
              kind: parent.step.kind,
              versions: parent.receipts,
            })),
          },
        });
        const recovered = await resume(input, node, parents, inputFingerprint);
        if (recovered) current = recovered;
        else {
          await claimStep(input, node, inputFingerprint);
          claimed = true;
          // A different dispatch may have completed between the first read and our claim.
          current =
            (await resume(input, node, parents, inputFingerprint)) ??
            (await generate(input, node, parents, resolver));
        }
      }
      await record(kind, "COMPLETED", {
        ...current.step,
        versions: current.receipts,
        ...(inputFingerprint ? { inputFingerprint } : {}),
      });
      prepared.set(kind, current);
      return current;
    } catch (error) {
      await record(kind, "FAILED", {
        ...(claimed && inputFingerprint ? { inputFingerprint } : {}),
        message:
          error instanceof Error
            ? error.message
            : "Production du prérequis interrompue.",
      });
      throw error;
    } finally {
      active.delete(kind);
    }
  }
  for (const required of target.requires) await visit(required);
  // A long generation cannot silently hand off an older version of a reused active brief.
  for (const entry of prepared.values())
    if (entry.step.status === "REUSED") {
      const node = input.composition.briefDag.find(
        (n) => n.kind === entry.step.kind,
      )!;
      const match = input.composition.vaultMatches.find(
        (m) => m.kind === node.kind,
      )!;
      const current = await reuse(input, node, match);
      if (current.text !== entry.text)
        throw new Error(
          `Le prérequis ${node.kind} a changé pendant la production.`,
        );
    }
  const text = joinContext([...prepared.values()].map((p) => p.text));
  joinContext([input.sourceText, text]);
  return { text, steps: [...prepared.values()].map((p) => p.step) };
}
