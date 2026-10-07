/**
 * Reconcile an explicit portfolio plan through the SAME governed procedures as
 * the manual forms. Dry-run by default. No ADVE writes, inference or AI calls.
 *
 * npx tsx scripts/onboard-portfolio.ts plan.json [--apply]
 * Plan files contain private client identities and stay outside the repository.
 */
import { readFileSync } from "node:fs";
import { z } from "zod";
import { db } from "@/lib/db";
import { brandNodeRouter } from "@/server/trpc/routers/brand-node";
import { PortfolioReferencesSchema, readPortfolioReferences, inspectPortfolioReferences, portfolioReferenceKey } from "@/domain/portfolio-reference";
import { validateNodeTransition } from "@/domain/brand-nature-archetypes";
import type { Context } from "@/server/trpc/context";

const nodeSchema = z.object({
  key: z.string().min(1), parentKey: z.string().nullable(), name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(80),
  nodeKind: z.string(), nodeNature: z.enum(["PRODUCT", "SERVICE", "CHARACTER_IP", "FESTIVAL_IP", "MEDIA_IP", "RETAIL_SPACE", "PLATFORM", "INSTITUTION", "PERSONAL"]),
  strategyId: z.string().optional(), sourceRefs: PortfolioReferencesSchema,
  lifecycle: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("ACTIVE"),
});
const planSchema = z.object({ operatorSlug: z.string(), source: z.string(), observedAt: z.string(), nodes: z.array(nodeSchema).min(1).max(1000) });
async function main() {
  const path = process.argv[2];
  if (!path || path.startsWith("--")) throw new Error("Usage : onboard-portfolio.ts plan.json [--apply]");
  const apply = process.argv.includes("--apply");
  const plan = planSchema.parse(JSON.parse(readFileSync(path, "utf8")));
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
    if (current && (current.archivedAt || current.nodeKind !== spec.nodeKind || current.nodeNature !== spec.nodeNature ||
      current.parentNodeId !== (parent ? bySlug.get(parent.slug)?.id ?? "NEW_PARENT" : null) ||
      (spec.strategyId && current.strategyId && current.strategyId !== spec.strategyId))) {
      throw new Error(`Conflit structurel sur ${spec.slug} : aucune mutation automatique.`);
    }
    if (spec.strategyId) {
      const strategy = await db.strategy.findUniqueOrThrow({ where: { id: spec.strategyId } });
      if (strategy.operatorId && strategy.operatorId !== operator.id) throw new Error(`Dossier hors équipe : ${spec.strategyId}`);
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
        });
        current = result.node;
        bySlug.set(spec.slug, current);
      }
      report.push({ slug: spec.slug, action: apply ? "CREATED" : "WOULD_CREATE", id: current?.id });
    }
    if (current) {
      ids.set(spec.key, current.id);
      const refs = [...new Map([...readPortfolioReferences(current.sourceRefs), ...spec.sourceRefs].map((r) => [portfolioReferenceKey(r), r])).values()];
      const changed = JSON.stringify(refs) !== JSON.stringify(readPortfolioReferences(current.sourceRefs)) || current.lifecycle !== spec.lifecycle;
      const attach = Boolean(spec.strategyId && !current.strategyId);
      if (changed && apply) await caller.update({ strategyId: pivot, operatorId: operator.id, nodeId: current.id, expectedUpdatedAt: current.updatedAt.toISOString(), patches: { sourceRefs: refs, lifecycle: spec.lifecycle } });
      if (spec.strategyId && !current.strategyId && apply) await caller.attachStrategy({ strategyId: spec.strategyId, nodeId: current.id, operatorId: operator.id });
      if (!report.some((r) => r.slug === spec.slug)) report.push({ slug: spec.slug, action: changed || attach ? apply ? "LINKED" : "WOULD_LINK" : "UNCHANGED", id: current.id });
    }
  }
  console.log(JSON.stringify({ dryRun: !apply, source: plan.source, observedAt: plan.observedAt, operator: operator.slug,
    counts: Object.fromEntries([...new Set(report.map((r) => r.action))].map((k) => [k, report.filter((r) => r.action === k).length])), nodes: report }, null, 2));
}
main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : "Import failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
