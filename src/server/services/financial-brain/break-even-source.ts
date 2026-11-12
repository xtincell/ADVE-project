import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BreakEvenDocumentModelSchema, FinancialWorkingModelSchema } from "@/domain/financial-document";
import { projectFinancialWorkingModel } from "@/domain/unit-economics";
import { documentEdition, sourceIsUsable } from "@/domain/source-document";
import { resolveBrandSource, sourceFingerprint, type SourceDb } from "@/server/services/ingestion-pipeline/source-usage";
import { composeBreakEvenDocument } from "./break-even-document";

/** Load the selected, versioned financial proposal. No model or price is
 * selected from a filename, a traffic observation or a legacy B2C offer. */
export async function composeSourcedBreakEven(strategyId: string, input: Record<string, string>) {
  if (!input.sourceId || !input.expectedSourceHash) throw new Error("Choisissez une version du modèle financier avant de produire la fiche.");
  const resolved = await resolveBrandSource(input.sourceId, strategyId);
  if (resolved.contentHash !== input.expectedSourceHash) throw new Error("SOURCE_CHANGED: le modèle financier a changé. Relisez sa version.");
  if (!sourceIsUsable(resolved.source.rawData) || documentEdition(resolved.source.rawData)?.kind !== "FINANCE") {
    throw new Error("Choisissez une proposition ou référence financière actuelle. Les archives restent consultables.");
  }
  const strategy = await db.strategy.findUnique({ where: { id: strategyId }, select: { name: true,
    pillars: { where: { key: { in: ["a", "d", "v"] } }, select: { key: true, currentVersion: true, content: true } } } });
  if (!strategy) throw new Error("Dossier de marque introuvable.");
  const v = strategy.pillars.find(p => p.key === "v")?.content as Record<string, unknown> | null;
  const working = v?.financialModel !== undefined ? FinancialWorkingModelSchema.safeParse(v.financialModel) : null;
  if (working && !working.success) throw new Error(`ADVE_FINANCIAL_MODEL_INCOMPLETE: complétez les prémisses du modèle : ${working.error.issues.map(i => i.path.join(".")).join(", ")}`);
  const modelInAdve = working?.success ? working.data : null;
  if (modelInAdve && (modelInAdve.source.sourceId !== input.sourceId || modelInAdve.source.contentHash !== input.expectedSourceHash)) {
    throw new Error("ADVE_FINANCIAL_MODEL_MISMATCH: alignez cette version documentaire avec le modèle financier de votre marque avant de recalculer.");
  }
  let value: unknown = modelInAdve?.breakEven;
  if (!modelInAdve) {
    // Compatibility for existing documentary scenarios. This path explicitly
    // does not receive ADVE irrigation; current models use V above.
    try { value = JSON.parse(resolved.source.rawContent ?? ""); }
    catch { throw new Error("Ce document ne contient pas de modèle de seuil structuré. Préparez les hypothèses financières avant le calcul."); }
  }
  const parsed = BreakEvenDocumentModelSchema.safeParse(value);
  if (!parsed.success) throw new Error(`Modèle financier incomplet : ${parsed.error.issues.map(i => `${i.path.join(".")} : ${i.message}`).slice(0, 8).join(" ; ")}`);
  const model = parsed.data;
  const evidence = [{ sourceId: resolved.source.id, contentHash: resolved.contentHash,
    fileName: resolved.source.fileName ?? "Modèle financier", document: documentEdition(resolved.source.rawData), historical: false }];
  const amounts = [model.price, ...model.fixedCosts, ...model.variableCosts,
    ...(modelInAdve ? [...modelInAdve.projection.monthlyVolumes,
      modelInAdve.projection.unitsPerPayerMonth, modelInAdve.projection.annualRetentionRate, modelInAdve.projection.cashFlow.openingCash] : [])];
  const sources = new Map([[resolved.source.id, resolved]]);
  for (const amount of amounts) for (const receipt of amount.sources) {
    let source = sources.get(receipt.sourceId);
    if (!source) { source = await resolveBrandSource(receipt.sourceId, strategyId); sources.set(receipt.sourceId, source); }
    if (source.contentHash !== receipt.contentHash) throw new Error("SOURCE_CHANGED: une pièce du calcul a changé. Revoyez le modèle financier.");
    const historical = !sourceIsUsable(source.source.rawData);
    if (historical && amount.qualification === "SOURCED") throw new Error("Une pièce archivée doit être qualifiée comme donnée historique ou hypothèse, pas comme dépense actuelle.");
    if (!evidence.some(e => e.sourceId === receipt.sourceId)) evidence.push({ sourceId: receipt.sourceId, contentHash: receipt.contentHash,
      fileName: source.source.fileName ?? "Pièce financière", document: documentEdition(source.source.rawData), historical });
  }
  const d = strategy.pillars.find(p => p.key === "d")?.content as { personas?: { id?: string; actorRoles?: string[] }[] } | null;
  if (model.payerPersonaId && !d?.personas?.some(p => p.id === model.payerPersonaId && p.actorRoles?.includes("PAYER"))) {
    throw new Error("Le payeur du modèle n’est plus un client payeur dans les profils de la marque. Revoyez ce lien.");
  }
  const document = composeBreakEvenDocument(strategy.name, model);
  const projection = modelInAdve ? projectFinancialWorkingModel(modelInAdve) : null;
  const projected = projection?.status === "COMPUTED" ? {
    firstProfitableMonth: projection.firstProfitableMonth,
    delayNote: projection.firstProfitableMonth !== null
      ? `Projection conditionnelle : premier mois couvrant les charges mensuelles au mois ${projection.firstProfitableMonth}. Ne mesure ni ventes réalisées ni récupération de l’investissement.`
      : "Le seuil n’est pas atteint dans les douze mois proposés ; aucun délai extérieur à cet horizon n’est inventé.",
    state: "SCENARIO" as const,
  } : {};
  return { ...document, ...projected, evidence,
    financialProjection: projection?.status === "COMPUTED" && modelInAdve ? {
      monthlyVolumes: projection.monthlyVolumes, cashBalances: projection.cashBalances,
      cashNote: modelInAdve.projection.cashFlow.note, openingCash: modelInAdve.projection.cashFlow.openingCash.value!,
      revenueDelayMonths: modelInAdve.projection.cashFlow.revenueDelayMonths, costDelayMonths: modelInAdve.projection.cashFlow.costDelayMonths, projectionNote: modelInAdve.projection.note,
    } : null,
    calculationBasis: modelInAdve ? "ADVE_WORKING_MODEL" as const : "DOCUMENTARY_LEGACY" as const,
    basisNote: modelInAdve ? "Calcul depuis les prémisses du modèle de marque ; les pièces citées servent à leur alignement et à leur traçabilité."
      : "Scénario documentaire antérieur : ses prémisses doivent être inscrites dans le modèle de marque pour irriguer les autres outils.",
    pillarVersions: Object.fromEntries(strategy.pillars.map(p => [p.key, p.currentVersion])),
    sourceReceipt: { sourceId: resolved.source.id, contentHash: resolved.contentHash },
  };
}
export type SourcedBreakEvenDocument = Awaited<ReturnType<typeof composeSourcedBreakEven>>;

/** Fence the immutable result at its existing GloryOutput persistence boundary.
 * Historical pieces may inform a labelled scenario; they are not adopted. */
export async function assertBreakEvenDocumentCurrent(tx: SourceDb, strategyId: string, output: Record<string, unknown>) {
  const document = output as unknown as SourcedBreakEvenDocument;
  const ids = [...new Set(document.evidence.map(e => e.sourceId))].sort();
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "BrandDataSource" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
  await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id = ${strategyId} FOR UPDATE`;
  for (const e of document.evidence) {
    const current = await resolveBrandSource(e.sourceId, strategyId, tx);
    if (sourceFingerprint(current.source) !== e.contentHash) throw new Error("SOURCE_CHANGED: calcul abandonné car une source a changé.");
  }
  const pillars = await tx.pillar.findMany({ where: { strategyId, key: { in: ["a", "d", "v"] } }, select: { key: true, currentVersion: true } });
  const now = Object.fromEntries(pillars.map(p => [p.key, p.currentVersion]));
  if (JSON.stringify(Object.entries(now).sort()) !== JSON.stringify(Object.entries(document.pillarVersions).sort())) {
    throw new Error("PILLAR_CHANGED: le dossier de marque a changé pendant le calcul. Recommencez avec sa version actuelle.");
  }
}
