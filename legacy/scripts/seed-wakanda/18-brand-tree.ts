/**
 * WAKANDA SEED — Batch 5a: Brand-tree hiérarchique + agency ops (Phase 18).
 *
 * Irrigue la voie « brand-tree hiérarchique » (ADR-0059) : 1 BrandNode standalone
 * par Strategy (backfill Phase 18-A0) + une vraie arborescence multi-niveaux pour
 * BLISS (CORPORATE → MASTER_BRAND → PRODUCT_LINE → SKU) qui sert de cible aux
 * CampaignDeliverable (batch 5b). Pose aussi `BrandContextNode` (RAG arborescent),
 * `OperatorAction` (cockpit agence) et l'ingestion Morning Brief
 * (`IngestedSource` → `MorningBriefBatch` → `BriefIngestionDraft`).
 *
 * Déterministe. Idempotent. Parents avant enfants (FK self-relation BrandNode).
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter } from "./helpers";

export async function seedBrandTree(prisma: PrismaClient) {
  // ── BLISS — arborescence réelle (parents avant enfants) ──────────────
  const blissTree: Array<{
    id: string;
    name: string;
    slug: string;
    nodeKind: string;
    parentNodeId?: string;
    strategyId?: string;
    clientId?: string;
    countryCode?: string;
  }> = [
    { id: "wk-node-bliss-corp", name: "Wakanda Beauty Group", slug: "wakanda-beauty-group", nodeKind: "CORPORATE", clientId: IDS.clientBliss, countryCode: "WK" },
    { id: "wk-node-bliss-master", name: "BLISS by Wakanda", slug: "bliss", nodeKind: "MASTER_BRAND", parentNodeId: "wk-node-bliss-corp", strategyId: IDS.stratBliss, clientId: IDS.clientBliss, countryCode: "WK" },
    { id: "wk-node-bliss-line-heritage", name: "Heritage Collection", slug: "bliss-heritage", nodeKind: "PRODUCT_LINE", parentNodeId: "wk-node-bliss-master", countryCode: "WK" },
    { id: "wk-node-bliss-line-glow", name: "Vibranium Glow", slug: "bliss-glow", nodeKind: "PRODUCT_LINE", parentNodeId: "wk-node-bliss-master", countryCode: "WK" },
    { id: "wk-node-bliss-sku-serum", name: "Sérum Heritage 30ml", slug: "bliss-heritage-serum", nodeKind: "SKU", parentNodeId: "wk-node-bliss-line-heritage", countryCode: "WK" },
    { id: "wk-node-bliss-sku-cream", name: "Crème Glow 50ml", slug: "bliss-glow-cream", nodeKind: "SKU", parentNodeId: "wk-node-bliss-line-glow", countryCode: "WK" },
  ];
  for (const n of blissTree) {
    await prisma.brandNode.upsert({
      where: { id: n.id },
      update: {},
      create: {
        id: n.id,
        name: n.name,
        slug: n.slug,
        operatorId: IDS.operator,
        clientId: n.clientId ?? null,
        parentNodeId: n.parentNodeId ?? null,
        nodeKind: n.nodeKind,
        nodeNature: "PRODUCT",
        countryCode: n.countryCode ?? null,
        lifecycle: "ACTIVE",
        strategyId: n.strategyId ?? null,
        createdAt: T.bootStart,
      },
    });
    track("BrandNode");
  }

  // ── Backfill standalone (1 node par Strategy restante) ───────────────
  const standalones: Array<{ id: string; name: string; slug: string; strategyId: string; nature: string; country: string }> = [
    { id: "wk-node-vibranium", name: "Vibranium Tech", slug: "vibranium-tech", strategyId: IDS.stratVibranium, nature: "PLATFORM", country: "WK" },
    { id: "wk-node-brew", name: "Wakanda Brew Co.", slug: "wakanda-brew", strategyId: IDS.stratBrew, nature: "PRODUCT", country: "WK" },
    { id: "wk-node-panther", name: "Panther Athletics", slug: "panther-athletics", strategyId: IDS.stratPanther, nature: "PRODUCT", country: "WK" },
    { id: "wk-node-shuri", name: "Shuri Academy", slug: "shuri-academy", strategyId: IDS.stratShuri, nature: "PLATFORM", country: "WK" },
    { id: "wk-node-jabari", name: "Jabari Heritage", slug: "jabari-heritage", strategyId: IDS.stratJabari, nature: "SERVICE", country: "CM" },
  ];
  for (const n of standalones) {
    await prisma.brandNode.upsert({
      where: { id: n.id },
      update: {},
      create: {
        id: n.id,
        name: n.name,
        slug: n.slug,
        operatorId: IDS.operator,
        nodeKind: "STANDALONE_BRAND",
        nodeNature: n.nature as Prisma.BrandNodeCreateInput["nodeNature"],
        countryCode: n.country,
        lifecycle: "ACTIVE",
        strategyId: n.strategyId,
        createdAt: T.bootStart,
      },
    });
    track("BrandNode");
  }

  // ── BrandContextNode — RAG arborescent (tone-of-voice master descend) ─
  const contextNodes: Array<{ id: string; kind: string; nodeId: string; pillarKey?: string; field?: string; payload: Prisma.InputJsonValue; scope: string[] }> = [
    {
      id: "wk-ctx-bliss-tov",
      kind: "NARRATIVE",
      nodeId: "wk-node-bliss-master",
      payload: { title: "Tone of voice master", body: "Premium, fier, afro-futuriste. Jamais condescendant. 'Révélée. Pas inventée.'" } as Prisma.InputJsonValue,
      scope: ["SELF", "DESCENDANTS"],
    },
    {
      id: "wk-ctx-bliss-v",
      kind: "PILLAR_FIELD",
      nodeId: "wk-node-bliss-master",
      pillarKey: "v",
      field: "valueProposition",
      payload: { title: "Proposition de valeur", body: "Cosmétiques premium infusés au vibranium, fabriqués au Wakanda." } as Prisma.InputJsonValue,
      scope: ["SELF", "DESCENDANTS"],
    },
    {
      id: "wk-ctx-bliss-heritage-signal",
      kind: "SEQUENCE_OUTPUT",
      nodeId: "wk-node-bliss-line-heritage",
      payload: { title: "Signal terrain Heritage", body: "Forte demande sur le segment 30+ premium, remonte au master." } as Prisma.InputJsonValue,
      scope: ["SELF", "ANCESTORS"],
    },
  ];
  for (const c of contextNodes) {
    await prisma.brandContextNode.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        strategyId: IDS.stratBliss,
        kind: c.kind,
        pillarKey: c.pillarKey ?? null,
        field: c.field ?? null,
        payload: c.payload,
        nodeId: c.nodeId,
        retrievalScope: c.scope,
        metadata: { country: "WK", sector: "Cosmetiques" } as Prisma.InputJsonValue,
      },
    });
    track("BrandContextNode");
  }

  // ── OperatorAction — cockpit agence (to-do opérateur) ────────────────
  const opActions: Array<{ id: string; label: string; priority: string; category: string; source: string; campaignId?: string; assignee?: string; done: boolean }> = [
    { id: "wk-op-action-01", label: "Valider les KV Heritage avant impression OOH", priority: "HAUTE", category: "PRODUCTION", source: "BRIEF", campaignId: IDS.campaignHeritage, assignee: IDS.userNakia, done: true },
    { id: "wk-op-action-02", label: "Relancer Vibranium Tech sur le brief film de marque", priority: "MOYENNE", category: "FOLLOWUPS", source: "GMAIL", assignee: IDS.userOkoye, done: false },
    { id: "wk-op-action-03", label: "Préparer le point hebdo avant départ vendredi", priority: "MOYENNE", category: "BEFORE_DEPARTURE", source: "VERBAL", done: false },
    { id: "wk-op-action-04", label: "Configurer le connecteur Meta Ads pour Glow", priority: "CRITIQUE", category: "SYSTEM", source: "SLACK", campaignId: IDS.campaignGlow, assignee: IDS.userNakia, done: false },
    { id: "wk-op-action-05", label: "Archiver les livrables de la campagne Harvest", priority: "BASSE", category: "FOLLOWUPS", source: "WHATSAPP", done: true },
  ];
  for (const a of opActions) {
    await prisma.operatorAction.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        operatorId: IDS.operator,
        label: a.label,
        priority: a.priority as Prisma.OperatorActionCreateInput["priority"],
        category: a.category as Prisma.OperatorActionCreateInput["category"],
        source: a.source as Prisma.OperatorActionCreateInput["source"],
        campaignId: a.campaignId ?? null,
        assigneeUserId: a.assignee ?? null,
        done: a.done,
        doneAt: a.done ? daysAfter(T.now, -2) : null,
        dueDate: a.done ? null : daysAfter(T.now, 5),
      },
    });
    track("OperatorAction");
  }

  // ── Morning Brief ingestion (IngestedSource → Batch → Draft) ─────────
  const sources: Array<{ id: string; kind: string; sender: string; subject: string; snippet: string }> = [
    { id: "wk-src-amara-mail", kind: "EMAIL", sender: "amara@bliss.wk", subject: "Nouvelle vague influenceuses", snippet: "Bonjour, on aimerait lancer une vague d'influenceuses beauté pour Glow le mois prochain. Budget ~800k." },
    { id: "wk-src-tchalla-wa", kind: "WHATSAPP", sender: "T'Challa", subject: "Film de marque", snippet: "Salut, où en est le brief du film de marque Vibranium Pay ? On vise un tournage début mai." },
    { id: "wk-src-okoye-slack", kind: "SLACK", sender: "okoye", subject: "#prod-heritage", snippet: "Les packshots Heritage sont validés côté client, on peut lancer l'impression." },
  ];
  for (const s of sources) {
    await prisma.ingestedSource.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        operatorId: IDS.operator,
        kind: s.kind as Prisma.IngestedSourceCreateInput["kind"],
        sender: s.sender,
        subject: s.subject,
        rawSnippet: s.snippet,
        language: "FR",
        ingestedAt: daysAfter(T.now, -1),
      },
    });
    track("IngestedSource");
  }

  const batch = await prisma.morningBriefBatch.upsert({
    where: { id: "wk-brief-batch-01" },
    update: {},
    create: {
      id: "wk-brief-batch-01",
      operatorId: IDS.operator,
      rawInput: sources.map((s) => `[${s.kind}] ${s.sender}: ${s.snippet}`).join("\n\n"),
      sourceCount: sources.length,
      briefCount: 2,
      state: "FULLY_VALIDATED",
      startedAt: daysAfter(T.now, -1),
      completedAt: T.now,
    },
  });
  track("MorningBriefBatch");

  const drafts: Array<{ id: string; sourceId: string; classification: string; state: string; campaign?: string; campaignName?: string; payload: Prisma.InputJsonValue; confidence: number }> = [
    {
      id: "wk-draft-01",
      sourceId: "wk-src-amara-mail",
      classification: "NEW_BRIEF",
      state: "MATERIALIZED",
      campaign: IDS.campaignGlow,
      campaignName: "Vibranium Glow",
      payload: { title: "Vague influenceuses Glow", summary: "Vague d'influenceuses beauté", briefType: "INFLUENCE", urgency: "MEDIUM", deliverables: ["INFLUENCER_POST"] } as Prisma.InputJsonValue,
      confidence: 0.88,
    },
    {
      id: "wk-draft-02",
      sourceId: "wk-src-tchalla-wa",
      classification: "UPDATE_OF_BRIEF",
      state: "ACCEPTED",
      campaignName: "Vibranium Brand Film",
      payload: { title: "Relance film de marque", summary: "Statut du brief film", briefType: "VIDEO", urgency: "HIGH" } as Prisma.InputJsonValue,
      confidence: 0.71,
    },
    {
      id: "wk-draft-03",
      sourceId: "wk-src-okoye-slack",
      classification: "OPS_ACTION",
      state: "REJECTED",
      payload: { title: "Validation packshots", summary: "Pas un brief — action ops", briefType: "NONE", urgency: "LOW" } as Prisma.InputJsonValue,
      confidence: 0.64,
    },
  ];
  for (const d of drafts) {
    await prisma.briefIngestionDraft.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        batchId: batch.id,
        sourceId: d.sourceId,
        classification: d.classification as Prisma.BriefIngestionDraftCreateInput["classification"],
        resolvedCampaignId: d.campaign ?? null,
        resolvedCampaignName: d.campaignName ?? null,
        payload: d.payload,
        confidence: d.confidence,
        state: d.state as Prisma.BriefIngestionDraftCreateInput["state"],
        reviewedBy: IDS.userNakia,
        reviewedAt: T.now,
        materializedAt: d.state === "MATERIALIZED" ? T.now : null,
      },
    });
    track("BriefIngestionDraft");
  }

  console.log(
    `[OK] Brand-tree: ${blissTree.length + standalones.length} nodes + ${contextNodes.length} context + ${opActions.length} ops actions + ${sources.length} sources + 1 brief batch + ${drafts.length} drafts`,
  );
}
