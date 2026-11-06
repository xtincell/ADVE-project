/**
 * Reconcile an explicit portfolio plan through the SAME governed procedures as
 * the manual forms. Dry-run by default. No ADVE writes, inference or AI calls.
 *
 * npx tsx scripts/onboard-portfolio.ts plan.json [--apply]
 * Plan files contain private client identities and stay outside the repository.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { db } from "@/lib/db";
import { brandNodeRouter } from "@/server/trpc/routers/brand-node";
import { PortfolioLifecycleSchema, PortfolioReferencesSchema, readPortfolioReferences, inspectPortfolioReferences, portfolioReferenceKey } from "@/domain/portfolio-reference";
import { validateNodeTransition } from "@/domain/brand-nature-archetypes";
import type { Context } from "@/server/trpc/context";

const nodeSchema = z.object({
  key: z.string().min(1), parentKey: z.string().nullable(), name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(80),
  nodeKind: z.string(), nodeNature: z.enum(["PRODUCT", "SERVICE", "CHARACTER_IP", "FESTIVAL_IP", "MEDIA_IP", "RETAIL_SPACE", "PLATFORM", "INSTITUTION", "PERSONAL"]),
  strategyId: z.string().optional(), sourceRefs: PortfolioReferencesSchema,
  countryCode: z.string().regex(/^[A-Z]{2}$/).nullable().optional(),
  clientId: z.string().min(1).nullable().optional(), clusterTag: z.string().nullable().optional(),
  lifecycle: PortfolioLifecycleSchema.optional(),
}).strict();
export const planSchema = z.object({ operatorSlug: z.string(), source: z.string(), observedAt: z.string(), nodes: z.array(nodeSchema).min(1).max(1000) });
export async function reconcilePortfolioPlan(input: unknown, apply = false) {
  const plan = planSchema.parse(input);
  const keys = new Set<string>(), slugs = new Set<string>();
  for (const node of plan.nodes) {
    if (keys.has(node.key) || slugs.has(node.slug)) throw new Error(`Identité répétée : ${node.key}`);
    if (node.parentKey && !keys.has(node.parentKey)) throw new Error(`Parent absent ou hors ordre : ${node.parentKey}`);
    const parent = plan.nodes.find((n) => n.key === node.parentKey);
    const transition = validateNodeTransition({ parentNodeKind: parent?.nodeKind ?? null, parentNodeNature: parent?.nodeNature ?? null, childNodeKind: node.nodeKind, childNodeNature: node.nodeNature });
    if (!transition.valid) throw new Error(`${node.name} : ${transition.reason}`);
    keys.add(node.key); slugs.add(node.slug);
  }
  const operator = await db.operator.findUniqueOrThrow({ where: { slug: plan.operatorSlug } });
  const admin = await db.user.findFirst({ where: { role: "ADMIN", operatorId: operator.id }, orderBy: { createdAt: "asc" } });
  if (!admin) throw new Error("Aucun administrateur existant dans l’équipe cible.");
  const caller = brandNodeRouter.createCaller({ db, session: { expires: new Date(Date.now() + 3600000).toISOString(), user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role, operatorId: operator.id } } } as Context);
  const existing = await db.brandNode.findMany({ where: { operatorId: operator.id } });
  const bySlug = new Map(existing.map((n) => [n.slug, n]));
  // Preflight every identity before the first mutation. Fail closed on a
  // pre-existing hierarchy/ownership conflict, never silently move a node.
  for (const spec of plan.nodes) {
    const current = bySlug.get(spec.slug);
    if (current && inspectPortfolioReferences(current.sourceRefs).issues.length) {
      throw new Error(`Raccordements historiques invalides sur ${spec.slug} : les réparer avant tout import.`);
    }
    if (current) PortfolioReferencesSchema.parse([...new Map([...readPortfolioReferences(current.sourceRefs), ...spec.sourceRefs]
      .map((r) => [portfolioReferenceKey(r), r])).values()]);
    const parent = plan.nodes.find((n) => n.key === spec.parentKey);
    if (current && (current.nodeKind !== spec.nodeKind || current.nodeNature !== spec.nodeNature ||
      current.parentNodeId !== (parent ? bySlug.get(parent.slug)?.id ?? "NEW_PARENT" : null) ||
      (spec.countryCode !== undefined && current.countryCode !== spec.countryCode) ||
      (spec.clientId !== undefined && current.clientId !== spec.clientId) ||
      (spec.clusterTag !== undefined && current.clusterTag !== spec.clusterTag) ||
      (spec.strategyId && current.strategyId && current.strategyId !== spec.strategyId))) {
      throw new Error(`Conflit structurel sur ${spec.slug} : aucune mutation automatique.`);
    }
    const parentRow = parent ? bySlug.get(parent.slug) : undefined;
    if ((parent?.lifecycle === "ARCHIVED" || parentRow?.archivedAt) && !current?.archivedAt) {
      throw new Error(`Parent archivé pour ${spec.slug} : aucune mutation automatique.`);
    }
    if (spec.lifecycle === "ARCHIVED" && current && existing.some(n => n.parentNodeId === current.id && !n.archivedAt)) {
      throw new Error(`Le dossier ${spec.slug} comporte des descendants non archivés.`);
    }
    if (current?.archivedAt) {
      const unchangedRefs = readPortfolioReferences(current.sourceRefs);
      const historicRefs = new Map(unchangedRefs.map(r => [portfolioReferenceKey(r), r]));
      if (current.lifecycle !== "ARCHIVED" || (spec.lifecycle && spec.lifecycle !== current.lifecycle) ||
          (spec.strategyId && spec.strategyId !== current.strategyId) ||
          spec.sourceRefs.some(r => JSON.stringify(historicRefs.get(portfolioReferenceKey(r))) !== JSON.stringify(r))) {
        throw new Error(`Dossier archivé ${spec.slug} : restauration explicite requise avant modification.`);
      }
      // Merely acknowledging an archived snapshot does not reuse its former client or platform.
      continue;
    }
    const clientId = spec.clientId ?? current?.clientId;
    const countryCode = spec.countryCode ?? current?.countryCode ?? null;
    if (clientId && !await db.client.findFirst({ where: { id: clientId, operatorId: operator.id, status: "ACTIVE" }, select: { id: true } })) {
      throw new Error(`Client hors équipe ou indisponible : ${clientId}`);
    }
    if (spec.strategyId) {
      const strategy = await db.strategy.findUniqueOrThrow({ where: { id: spec.strategyId } });
      if (strategy.operatorId !== operator.id || strategy.archivedAt) throw new Error(`Dossier hors équipe ou archivé : ${spec.strategyId}`);
      if ((strategy.countryCode ?? null) !== countryCode) throw new Error(`Pays du dossier incompatible : ${spec.slug}`);
      if (clientId && strategy.clientId && strategy.clientId !== clientId) throw new Error(`Client du dossier incompatible : ${spec.slug}`);
      const incompatible = existing.some(n => n.id !== current?.id && !n.archivedAt && n.strategyId === spec.strategyId && n.countryCode !== countryCode)
        || plan.nodes.some(n => n.key !== spec.key && n.strategyId === spec.strategyId && (n.countryCode ?? bySlug.get(n.slug)?.countryCode ?? null) !== countryCode);
      if (incompatible) throw new Error(`Plateforme partagée entre périmètres différents : ${spec.strategyId}`);
    }
  }
  const ids = new Map<string, string>();
  const report: Array<{ slug: string; action: string; id?: string }> = [];
  for (const spec of plan.nodes) {
    let current = bySlug.get(spec.slug);
    const pivot = spec.strategyId ?? `audit:${operator.id}`;
    if (!current) {
      if (apply) {
        const result = await caller.create({ strategyId: pivot, operatorId: operator.id,
          parentNodeId: spec.parentKey ? ids.get(spec.parentKey)! : null,
          name: spec.name, slug: spec.slug, nodeKind: spec.nodeKind, nodeNature: spec.nodeNature,
          attachStrategyId: spec.strategyId, sourceRefs: spec.sourceRefs, nodeRole: [],
          lifecycle: spec.lifecycle, countryCode: spec.countryCode, clientId: spec.clientId, clusterTag: spec.clusterTag,
        });
        current = result.node;
        bySlug.set(spec.slug, current);
      }
      report.push({ slug: spec.slug, action: apply ? "CREATED" : "WOULD_CREATE", id: current?.id });
    }
    if (current) {
      ids.set(spec.key, current.id);
      const refs = [...new Map([...readPortfolioReferences(current.sourceRefs), ...spec.sourceRefs].map((r) => [portfolioReferenceKey(r), r])).values()];
      const lifecycle = spec.lifecycle ?? current.lifecycle;
      const changed = JSON.stringify(refs) !== JSON.stringify(readPortfolioReferences(current.sourceRefs)) || current.lifecycle !== lifecycle;
      const attach = Boolean(spec.strategyId && !current.strategyId);
      if (changed && apply) {
        const result = await caller.update({ strategyId: pivot, operatorId: operator.id, nodeId: current.id,
          expectedUpdatedAt: current.updatedAt.toISOString(), patches: { sourceRefs: refs, ...(spec.lifecycle ? { lifecycle: spec.lifecycle } : {}) } });
        current = result.node;
        bySlug.set(spec.slug, current);
      }
      if (spec.strategyId && !current.strategyId && apply) {
        const result = await caller.attachStrategy({ strategyId: spec.strategyId, nodeId: current.id, operatorId: operator.id,
          expectedStrategyId: current.strategyId, expectedUpdatedAt: current.updatedAt.toISOString() });
        current = result.node;
        bySlug.set(spec.slug, current);
      }
      if (!report.some((r) => r.slug === spec.slug)) report.push({ slug: spec.slug, action: changed || attach ? apply ? "LINKED" : "WOULD_LINK" : "UNCHANGED", id: current.id });
    }
  }
  return { dryRun: !apply, source: plan.source, observedAt: plan.observedAt, operator: operator.slug,
    counts: Object.fromEntries([...new Set(report.map((r) => r.action))].map((k) => [k, report.filter((r) => r.action === k).length])), nodes: report };
}
async function main() {
  const path = process.argv[2];
  if (!path || path.startsWith("--")) throw new Error("Usage : onboard-portfolio.ts plan.json [--apply]");
  console.log(JSON.stringify(await reconcilePortfolioPlan(JSON.parse(readFileSync(path, "utf8")), process.argv.includes("--apply")), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : "Import failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
}
