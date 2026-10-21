/**
 * Brand Tree multi-archétype — service handlers (Phase 18, ADR-0059).
 *
 * 6 handlers Mestor pour CRUD + opérations structurelles BrandNode :
 * - createBrandNodeHandler        — OPERATOR_CREATE_BRAND_NODE
 * - updateBrandNodeHandler        — OPERATOR_UPDATE_BRAND_NODE
 * - deleteBrandNodeHandler        — OPERATOR_DELETE_BRAND_NODE (soft-delete)
 * - moveBrandNodeHandler          — OPERATOR_MOVE_BRAND_NODE (re-parent)
 * - attachStrategyToNodeHandler   — OPERATOR_ATTACH_STRATEGY_TO_NODE
 * - tagNodeRoleHandler            — OPERATOR_TAG_NODE_ROLE
 *
 * Validation runtime via `validateNodeTransition()` from
 * `src/domain/brand-nature-archetypes.ts` (cf. ADR-0061).
 *
 * Helpers de lecture (`getNode`, `listChildren`, `findRoot`, `getAncestorPath`)
 * exposés pour les routes tRPC `brandNode.read*`.
 */

import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import type { BrandNode, BrandNature, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PortfolioReferencesSchema, type PortfolioReference } from "@/domain/portfolio-reference";
import { validateNodeTransition } from "@/domain/brand-nature-archetypes";
import { invalidateNodeAndDescendants } from "./inheritance";

type HandlerResult = Pick<
  IntentResult,
  "status" | "summary" | "tool" | "output" | "reason" | "estimatedCost"
>;

type CreateIntent = Extract<Intent, { kind: "OPERATOR_CREATE_BRAND_NODE" }>;
type UpdateIntent = Extract<Intent, { kind: "OPERATOR_UPDATE_BRAND_NODE" }>;
type DeleteIntent = Extract<Intent, { kind: "OPERATOR_DELETE_BRAND_NODE" }>;
type MoveIntent = Extract<Intent, { kind: "OPERATOR_MOVE_BRAND_NODE" }>;
type AttachStrategyIntent = Extract<Intent, { kind: "OPERATOR_ATTACH_STRATEGY_TO_NODE" }>;
type TagRoleIntent = Extract<Intent, { kind: "OPERATOR_TAG_NODE_ROLE" }>;

const ZERO_COST = { amount: 0, currency: "USD" } as const;

// ──────────────────────────────────────────────────────────────────────────
// Intent handlers
// ──────────────────────────────────────────────────────────────────────────

export async function createBrandNodeHandler(intent: CreateIntent): Promise<HandlerResult> {
  try {
    const node = await createBrandNode({
      operatorId: intent.operatorId,
      clientId: intent.clientId ?? null,
      parentNodeId: intent.parentNodeId ?? null,
      name: intent.name,
      slug: intent.slug,
      nodeKind: intent.nodeKind,
      nodeNature: intent.nodeNature,
      nodeRole: intent.nodeRole ?? [],
      countryCode: intent.countryCode ?? null,
      clusterTag: intent.clusterTag ?? null,
      attachStrategyId: intent.attachStrategyId ?? null,
      sourceRefs: intent.sourceRefs,
    });
    return {
      status: "OK",
      summary: `BrandNode "${node.name}" (${node.nodeKind}) créé sous parent ${node.parentNodeId ?? "ROOT"}`,
      tool: "brand-node.create",
      output: { id: node.id, slug: node.slug, parentNodeId: node.parentNodeId },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return vetoed("brand-node.create", msg);
  }
}

export async function updateBrandNodeHandler(intent: UpdateIntent): Promise<HandlerResult> {
  try {
    const node = await updateBrandNode(intent.nodeId, intent.patches, intent.expectedUpdatedAt);
    return {
      status: "OK",
      summary: `BrandNode ${intent.nodeId} mis à jour`,
      tool: "brand-node.update",
      output: { id: node.id, updatedAt: node.updatedAt },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return vetoed("brand-node.update", msg);
  }
}

export async function deleteBrandNodeHandler(intent: DeleteIntent): Promise<HandlerResult> {
  try {
    const node = await archiveBrandNode(intent.nodeId);
    return {
      status: "OK",
      summary: `BrandNode ${intent.nodeId} archivé (soft-delete) à ${node.archivedAt!.toISOString()}`,
      tool: "brand-node.delete",
      output: { id: node.id, archivedAt: node.archivedAt },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return vetoed("brand-node.delete", msg);
  }
}

export async function moveBrandNodeHandler(intent: MoveIntent): Promise<HandlerResult> {
  try {
    const node = await moveBrandNode(intent.nodeId, intent.newParentNodeId);
    return {
      status: "OK",
      summary: `BrandNode ${intent.nodeId} re-parenté vers ${intent.newParentNodeId ?? "ROOT"}`,
      tool: "brand-node.move",
      output: { id: node.id, parentNodeId: node.parentNodeId },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return vetoed("brand-node.move", msg);
  }
}

export async function attachStrategyToNodeHandler(intent: AttachStrategyIntent): Promise<HandlerResult> {
  try {
    const node = await attachStrategyToNode(intent.nodeId, intent.strategyId);
    return {
      status: "OK",
      summary: `Strategy ${intent.strategyId} attachée au BrandNode ${intent.nodeId}`,
      tool: "brand-node.attach-strategy",
      output: { id: node.id, strategyId: node.strategyId },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return vetoed("brand-node.attach-strategy", msg);
  }
}

export async function tagNodeRoleHandler(intent: TagRoleIntent): Promise<HandlerResult> {
  try {
    const node = await tagNodeRole(intent.nodeId, intent.action, intent.role);
    return {
      status: "OK",
      summary: `Role "${intent.role}" ${intent.action === "ADD" ? "ajouté" : "retiré"} sur BrandNode ${intent.nodeId}`,
      tool: "brand-node.tag-role",
      output: { id: node.id, nodeRole: node.nodeRole },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return vetoed("brand-node.tag-role", msg);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Business helpers (réutilisés par routes tRPC + scripts + tests)
// ──────────────────────────────────────────────────────────────────────────

export interface CreateBrandNodeArgs {
  operatorId: string;
  clientId: string | null;
  parentNodeId: string | null;
  name: string;
  slug: string;
  nodeKind: string;
  nodeNature: BrandNature;
  nodeRole: string[];
  countryCode: string | null;
  clusterTag: string | null;
  attachStrategyId: string | null;
  sourceRefs?: PortfolioReference[];
}

export async function createBrandNode(args: CreateBrandNodeArgs): Promise<BrandNode> {
  // 1. Validation transition parent → child
  let parentNodeKind: string | null = null;
  let parentNodeNature: BrandNature | null = null;
  if (args.parentNodeId) {
    const parent = await db.brandNode.findUnique({
      where: { id: args.parentNodeId },
      select: { id: true, nodeKind: true, nodeNature: true, operatorId: true, archivedAt: true },
    });
    if (!parent) throw new Error(`Parent BrandNode ${args.parentNodeId} not found`);
    if (parent.archivedAt) throw new Error(`Parent BrandNode ${args.parentNodeId} is archived — cannot create child under archived node`);
    if (parent.operatorId !== args.operatorId) {
      throw new Error(`Parent BrandNode ${args.parentNodeId} belongs to operator ${parent.operatorId}, not ${args.operatorId}`);
    }
    parentNodeKind = parent.nodeKind;
    parentNodeNature = parent.nodeNature;
  }

  const transition = validateNodeTransition({
    parentNodeKind,
    parentNodeNature,
    childNodeKind: args.nodeKind,
    childNodeNature: args.nodeNature,
  });
  if (!transition.valid) {
    throw new Error(transition.reason);
  }

  // 2. Idempotency check on (operatorId, slug) unique constraint
  const existing = await db.brandNode.findUnique({
    where: { operatorId_slug: { operatorId: args.operatorId, slug: args.slug } },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`BrandNode slug "${args.slug}" already exists for operator ${args.operatorId} (id=${existing.id})`);
  }

  // 3. Strategy attach validation (if specified)
  if (args.attachStrategyId) {
    const strategy = await db.strategy.findUnique({
      where: { id: args.attachStrategyId },
      select: { id: true, operatorId: true },
    });
    if (!strategy) throw new Error(`Strategy ${args.attachStrategyId} not found`);
    // Note: strategy.operatorId can differ (some legacy strategies are orphan); on accepte si operator match OU si null
    if (strategy.operatorId && strategy.operatorId !== args.operatorId) {
      throw new Error(`Strategy ${args.attachStrategyId} belongs to operator ${strategy.operatorId}, not ${args.operatorId}`);
    }
  }

  // 4. Create
  return db.brandNode.create({
    data: {
      name: args.name,
      slug: args.slug,
      operatorId: args.operatorId,
      clientId: args.clientId,
      parentNodeId: args.parentNodeId,
      nodeKind: args.nodeKind,
      nodeNature: args.nodeNature,
      nodeRole: args.nodeRole,
      countryCode: args.countryCode,
      clusterTag: args.clusterTag,
      lifecycle: "ACTIVE",
      strategyId: args.attachStrategyId,
      sourceRefs: PortfolioReferencesSchema.parse(args.sourceRefs ?? []),
    },
  });
}

export class BrandNodeUpdateConflictError extends Error {}

export async function updateBrandNode(
  nodeId: string,
  patches: UpdateIntent["patches"],
  expectedUpdatedAt?: string,
): Promise<BrandNode> {
  if (("sourceRefs" in patches || "clientId" in patches) && (!expectedUpdatedAt || !Number.isFinite(Date.parse(expectedUpdatedAt)))) {
    throw new BrandNodeUpdateConflictError("Relisez les raccordements avant de les enregistrer : leur version est requise.");
  }
  const node = await db.brandNode.findUnique({ where: { id: nodeId }, select: { id: true, archivedAt: true, parentNodeId: true } });
  if (!node) throw new Error(`BrandNode ${nodeId} not found`);
  const restoring = Boolean(node.archivedAt && patches.lifecycle && patches.lifecycle !== "ARCHIVED");
  if (node.archivedAt && !restoring) throw new Error(`BrandNode ${nodeId} is archived — restore before update`);
  if (patches.lifecycle && !["ACTIVE", "DRAFT", "ARCHIVED", "DEPRECATED"].includes(patches.lifecycle)) {
    throw new Error("État du dossier inconnu.");
  }
  if (restoring) {
    if (!expectedUpdatedAt || !Number.isFinite(Date.parse(expectedUpdatedAt))) {
      throw new BrandNodeUpdateConflictError("Relisez le dossier archivé avant de le restaurer : sa version est requise.");
    }
    if (node.parentNodeId) {
      const parent = await db.brandNode.findUnique({ where: { id: node.parentNodeId }, select: { archivedAt: true } });
      if (parent?.archivedAt) throw new Error("Restaurez le dossier parent avant son élément.");
    }
  }
  if (patches.lifecycle === "ARCHIVED") {
    const descendants = await db.brandNode.count({ where: { parentNodeId: nodeId, archivedAt: null } });
    if (descendants) throw new Error("Archivez d’abord les descendants du dossier.");
  }

  // Whitelist : nodeKind + nodeNature sont immutables (utiliser MOVE pour position structurelle).
  const allowedKeys = [
    "name", "slug", "clusterTag", "countryCode",
    "nodeRole", "lifecycle", "inheritanceLocked", "pillarOverrides", "sourceRefs", "clientId",
  ];
  const data: Prisma.BrandNodeUpdateInput = {};
  if (restoring) data.archivedAt = null;
  else if (patches.lifecycle === "ARCHIVED") data.archivedAt = new Date();
  let pillarOverridesChanged = false;
  for (const [key, value] of Object.entries(patches)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`Field "${key}" is immutable or unknown for OPERATOR_UPDATE_BRAND_NODE. Allowed: ${allowedKeys.join(", ")}`);
    }
    if (key === "clientId") {
      if (value !== null && (typeof value !== "string" || !value.trim())) throw new Error("Client indisponible.");
      data.client = value === null ? { disconnect: true } : { connect: { id: value as string } };
    } else {
      // Type narrowing intentionnellement permissif — Prisma valide au runtime.
      (data as Record<string, unknown>)[key] = key === "sourceRefs" ? PortfolioReferencesSchema.parse(value) : value;
    }
    if (key === "pillarOverrides") pillarOverridesChanged = true;
  }

  let updated: BrandNode;
  try {
    // Even two writes in the same millisecond must consume distinct versions.
    if (expectedUpdatedAt) data.updatedAt = new Date(Math.max(Date.now(), Date.parse(expectedUpdatedAt) + 1));
    const where = { id: nodeId, archivedAt: node.archivedAt,
      ...(expectedUpdatedAt ? { updatedAt: new Date(expectedUpdatedAt) } : {}),
    };
    if ("clientId" in patches) {
      // One governed write binds the dossier and its existing platform together.
      // Serializable isolation also guards client archival and shared attachments.
      updated = await db.$transaction(async (tx) => {
        const current = await tx.brandNode.findUniqueOrThrow({ where: { id: nodeId } });
        const clientId = patches.clientId ?? null;
        if (clientId && !await tx.client.findFirst({ where: { id: clientId,
          operatorId: current.operatorId, status: "ACTIVE" }, select: { id: true } })) {
          throw new Error("Client indisponible pour cet opérateur.");
        }
        if (current.strategyId) {
          const strategy = await tx.strategy.findUniqueOrThrow({ where: { id: current.strategyId } });
          if (strategy.operatorId !== current.operatorId || strategy.archivedAt) {
            throw new Error("La plateforme liée doit être active et appartenir au même opérateur.");
          }
          if (strategy.clientId !== current.clientId && strategy.clientId !== clientId) {
            throw new BrandNodeUpdateConflictError("Le dossier et sa plateforme ont des clients différents. Vérifiez leurs raccordements.");
          }
          const shared = await tx.brandNode.findFirst({ where: { strategyId: strategy.id, id: { not: nodeId },
            ...(clientId === null ? { clientId: { not: null } } : { OR: [{ clientId: null }, { clientId: { not: clientId } }] }),
          }, select: { id: true } });
          if (shared) throw new BrandNodeUpdateConflictError("Cette plateforme est partagée avec un autre dossier. Vérifiez ses clients avant de la réaffecter.");
          const changed = await tx.strategy.updateMany({ where: { id: strategy.id,
            operatorId: current.operatorId, clientId: strategy.clientId, archivedAt: null }, data: { clientId } });
          if (changed.count !== 1) throw new BrandNodeUpdateConflictError("La plateforme a changé. Actualisez le dossier.");
        }
        return tx.brandNode.update({ where, data });
      }, { isolationLevel: "Serializable" });
    } else {
      updated = await db.brandNode.update({ where, data });
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && ["P2025", "P2034"].includes(String(error.code))) {
      throw new BrandNodeUpdateConflictError("Ce dossier a changé. Actualisez les sources puis reprenez vos raccordements.");
    }
    throw error;
  }
  // Phase 18-N2 — invalidation cascade si la résolution effective change.
  if (pillarOverridesChanged) {
    await invalidateNodeAndDescendants(nodeId);
  }
  return updated;
}

export async function archiveBrandNode(nodeId: string): Promise<BrandNode> {
  const node = await db.brandNode.findUnique({
    where: { id: nodeId },
    select: { id: true, archivedAt: true },
  });
  if (!node) throw new Error(`BrandNode ${nodeId} not found`);
  if (node.archivedAt) throw new Error(`BrandNode ${nodeId} already archived at ${node.archivedAt.toISOString()}`);

  // Refuse si descendants ACTIVE non-archivés (intégrité Loi 1 APOGEE).
  const activeDescendants = await db.brandNode.count({
    where: { parentNodeId: nodeId, archivedAt: null },
  });
  if (activeDescendants > 0) {
    throw new Error(
      `Cannot archive BrandNode ${nodeId} : ${activeDescendants} descendant(s) ACTIVE non-archivé(s). Archiver d'abord les descendants ou utiliser une cascade explicite.`,
    );
  }

  return db.brandNode.update({
    where: { id: nodeId },
    data: { archivedAt: new Date(), lifecycle: "ARCHIVED" },
  });
}

export async function moveBrandNode(nodeId: string, newParentNodeId: string | null): Promise<BrandNode> {
  const node = await db.brandNode.findUnique({
    where: { id: nodeId },
    select: { id: true, nodeKind: true, nodeNature: true, operatorId: true, parentNodeId: true, archivedAt: true },
  });
  if (!node) throw new Error(`BrandNode ${nodeId} not found`);
  if (node.archivedAt) throw new Error(`BrandNode ${nodeId} is archived — restore before move`);

  // 1. Cycle check : newParent doit pas être nodeId ou un descendant de nodeId.
  if (newParentNodeId === nodeId) {
    throw new Error(`Cycle: cannot move ${nodeId} under itself`);
  }
  if (newParentNodeId) {
    const ancestors = await getAncestorIds(newParentNodeId);
    if (ancestors.includes(nodeId)) {
      throw new Error(`Cycle: cannot move ${nodeId} under one of its descendants (${newParentNodeId})`);
    }
  }

  // 2. Validation transition contre nouveau parent
  let newParentKind: string | null = null;
  let newParentNature: BrandNature | null = null;
  if (newParentNodeId) {
    const newParent = await db.brandNode.findUnique({
      where: { id: newParentNodeId },
      select: { nodeKind: true, nodeNature: true, operatorId: true, archivedAt: true },
    });
    if (!newParent) throw new Error(`New parent BrandNode ${newParentNodeId} not found`);
    if (newParent.archivedAt) throw new Error(`New parent BrandNode ${newParentNodeId} is archived`);
    if (newParent.operatorId !== node.operatorId) {
      throw new Error(`Cross-CORPORATE moves are reserved for Phase 18-bis (TRANSFER_NODE_OWNERSHIP). Same-operator moves only Phase 18-A0.`);
    }
    newParentKind = newParent.nodeKind;
    newParentNature = newParent.nodeNature;
  }

  const transition = validateNodeTransition({
    parentNodeKind: newParentKind,
    parentNodeNature: newParentNature,
    childNodeKind: node.nodeKind,
    childNodeNature: node.nodeNature,
  });
  if (!transition.valid) throw new Error(transition.reason);

  const updated = await db.brandNode.update({ where: { id: nodeId }, data: { parentNodeId: newParentNodeId } });
  // Phase 18-N2 — re-parent change la chaîne d'ancêtres → invalidation cascade.
  await invalidateNodeAndDescendants(nodeId);
  return updated;
}

export async function attachStrategyToNode(nodeId: string, strategyId: string): Promise<BrandNode> {
  const [node, strategy] = await Promise.all([
    db.brandNode.findUnique({ where: { id: nodeId }, select: { id: true, archivedAt: true, operatorId: true } }),
    db.strategy.findUnique({ where: { id: strategyId }, select: { id: true, operatorId: true } }),
  ]);
  if (!node) throw new Error(`BrandNode ${nodeId} not found`);
  if (node.archivedAt) throw new Error(`BrandNode ${nodeId} is archived`);
  if (!strategy) throw new Error(`Strategy ${strategyId} not found`);
  if (strategy.operatorId && strategy.operatorId !== node.operatorId) {
    throw new Error(`Strategy ${strategyId} (operator ${strategy.operatorId}) cannot be attached to BrandNode of operator ${node.operatorId}`);
  }
  const updated = await db.brandNode.update({ where: { id: nodeId }, data: { strategyId } });
  // Phase 18-N2 — la Strategy nouvelle attachée peut fournir des piliers résolus différents.
  await invalidateNodeAndDescendants(nodeId);
  return updated;
}

export async function tagNodeRole(nodeId: string, action: "ADD" | "REMOVE", role: string): Promise<BrandNode> {
  const node = await db.brandNode.findUnique({ where: { id: nodeId }, select: { id: true, nodeRole: true, archivedAt: true } });
  if (!node) throw new Error(`BrandNode ${nodeId} not found`);
  if (node.archivedAt) throw new Error(`BrandNode ${nodeId} is archived`);

  const current = new Set(node.nodeRole);
  if (action === "ADD") current.add(role);
  else current.delete(role);

  return db.brandNode.update({ where: { id: nodeId }, data: { nodeRole: [...current] } });
}

// ──────────────────────────────────────────────────────────────────────────
// Read helpers
// ──────────────────────────────────────────────────────────────────────────

export async function getNode(nodeId: string): Promise<BrandNode | null> {
  return db.brandNode.findUnique({ where: { id: nodeId } });
}

export async function listChildren(parentNodeId: string | null, operatorId: string): Promise<BrandNode[]> {
  return db.brandNode.findMany({
    where: { parentNodeId, operatorId, archivedAt: null },
    orderBy: { name: "asc" },
  });
}

/** Remonte les ancêtres jusqu'à la racine. Retourne les IDs (du parent direct vers root). */
export async function getAncestorIds(nodeId: string): Promise<string[]> {
  const ancestors: string[] = [];
  let currentId: string | null = nodeId;
  // Garde-fou anti-cycle : max 32 niveaux (largement suffisant même pour Berkshire)
  let depth = 0;
  while (currentId && depth < 32) {
    const node: { parentNodeId: string | null } | null = await db.brandNode.findUnique({
      where: { id: currentId },
      select: { parentNodeId: true },
    });
    if (!node || !node.parentNodeId) break;
    ancestors.push(node.parentNodeId);
    currentId = node.parentNodeId;
    depth++;
  }
  return ancestors;
}

/** Remonte jusqu'à la racine (root = parentNodeId null). Retourne le BrandNode racine. */
export async function findRoot(nodeId: string): Promise<BrandNode | null> {
  const ancestors = await getAncestorIds(nodeId);
  const rootId = ancestors[ancestors.length - 1] ?? nodeId;
  return db.brandNode.findUnique({ where: { id: rootId } });
}

// ──────────────────────────────────────────────────────────────────────────
// Internal
// ──────────────────────────────────────────────────────────────────────────

function vetoed(tool: string, msg: string): HandlerResult {
  return {
    status: "VETOED",
    summary: msg,
    tool,
    reason: classifyError(msg),
    estimatedCost: ZERO_COST,
  };
}

function classifyError(msg: string): string {
  if (msg.includes("not found")) return "NOT_FOUND";
  if (msg.includes("already exists")) return "ALREADY_EXISTS";
  if (msg.includes("already archived")) return "ALREADY_ARCHIVED";
  if (msg.includes("Cycle")) return "CYCLE_DETECTED";
  if (msg.includes("NATURE_TRANSITION_INVALID")) return "NATURE_TRANSITION_INVALID";
  if (msg.includes("descendant")) return "HAS_ACTIVE_DESCENDANTS";
  if (msg.includes("Cross-CORPORATE")) return "CROSS_CORPORATE_MOVE_RESERVED";
  if (msg.includes("immutable")) return "IMMUTABLE_FIELD";
  if (msg.includes("archived")) return "ARCHIVED_PRECONDITION";
  return "VALIDATION_FAILED";
}
