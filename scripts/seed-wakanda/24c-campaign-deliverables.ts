/**
 * WAKANDA SEED — Batch 5b: Campaign deliverables 6D + change requests.
 *
 * Irrigue « deliverables campagne (6D) » (ADR-0050/0059) : `CampaignDeliverable`
 * (livrables physiques/digitaux ciblant un SKU exact du brand-tree) +
 * `CampaignChangeRequest` (tickets de modif). Cible des nœuds SKU BLISS posés
 * par le batch 5a (18-brand-tree) → doit tourner APRÈS lui + après 22-campaigns.
 *
 * Déterministe. Idempotent.
 */

import type { PrismaClient } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter } from "./helpers";

export async function seedCampaignDeliverables(prisma: PrismaClient) {
  // ── Deliverables — Heritage (SKU sérum) + Glow (SKU crème) ───────────
  const deliverables: Array<{
    id: string;
    campaignId: string;
    targetNodeId: string;
    type: string;
    taskCode: string;
    status: string;
    rag: string;
    promoTag?: string;
    language?: string;
    daysToDue: number;
  }> = [
    // Heritage Collection
    { id: "wk-del-her-ooh", campaignId: IDS.campaignHeritage, targetNodeId: "wk-node-bliss-sku-serum", type: "OOH_12M2", taskCode: "WK-HER-001.01", status: "VALIDATED", rag: "GREEN", promoTag: "NON_PROMO", daysToDue: -20 },
    { id: "wk-del-her-poster", campaignId: IDS.campaignHeritage, targetNodeId: "wk-node-bliss-sku-serum", type: "POSTER_60x80", taskCode: "WK-HER-001.02", status: "VALIDATED", rag: "GREEN", daysToDue: -18 },
    { id: "wk-del-her-tv", campaignId: IDS.campaignHeritage, targetNodeId: "wk-node-bliss-sku-serum", type: "TV_SPOT", taskCode: "WK-HER-001.03", status: "DELIVERED", rag: "GREEN", daysToDue: -15 },
    { id: "wk-del-her-posm", campaignId: IDS.campaignHeritage, targetNodeId: "wk-node-bliss-sku-serum", type: "POSM", taskCode: "WK-HER-001.04", status: "DELIVERED", rag: "AMBER", daysToDue: -10 },
    { id: "wk-del-her-digital", campaignId: IDS.campaignHeritage, targetNodeId: "wk-node-bliss-sku-serum", type: "DIGITAL_AD", taskCode: "WK-HER-001.05", status: "VALIDATED", rag: "GREEN", daysToDue: -12 },
    // Vibranium Glow (en cours)
    { id: "wk-del-glow-ooh", campaignId: IDS.campaignGlow, targetNodeId: "wk-node-bliss-sku-cream", type: "OOH_18M2", taskCode: "WK-GLW-001.01", status: "IN_PROGRESS", rag: "AMBER", promoTag: "NON_PROMO", daysToDue: 5 },
    { id: "wk-del-glow-digital", campaignId: IDS.campaignGlow, targetNodeId: "wk-node-bliss-sku-cream", type: "DIGITAL_POSTER", taskCode: "WK-GLW-001.02", status: "IN_PROGRESS", rag: "GREEN", daysToDue: 3 },
    { id: "wk-del-glow-tshirt", campaignId: IDS.campaignGlow, targetNodeId: "wk-node-bliss-sku-cream", type: "T_SHIRT", taskCode: "WK-GLW-001.03", status: "TODO", rag: "RED", daysToDue: 1 },
    { id: "wk-del-glow-sampling", campaignId: IDS.campaignGlow, targetNodeId: "wk-node-bliss-sku-cream", type: "TABLE_SAMPLING", taskCode: "WK-GLW-001.04", status: "TODO", rag: "AMBER", daysToDue: 8 },
  ];

  for (const d of deliverables) {
    const delivered = d.status === "DELIVERED" || d.status === "VALIDATED";
    await prisma.campaignDeliverable.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        campaignId: d.campaignId,
        targetNodeId: d.targetNodeId,
        countryCode: "WK",
        deliverableType: d.type,
        language: d.language ?? "FR",
        promoTag: d.promoTag ?? null,
        status: d.status,
        rag: d.rag,
        taskCode: d.taskCode,
        dueDate: daysAfter(T.now, d.daysToDue),
        deliveredAt: delivered ? daysAfter(T.now, d.daysToDue) : null,
        validatedAt: d.status === "VALIDATED" ? daysAfter(T.now, d.daysToDue + 1) : null,
        notes: d.rag === "RED" ? "Bloqué : attente validation BAT client." : null,
        createdAt: T.campaignPlanning,
      },
    });
    track("CampaignDeliverable");
  }

  // ── Change requests — tickets de modif sur livrables ─────────────────
  const changeRequests: Array<{
    id: string;
    ticketCode: string;
    deliverableId: string;
    requestedByName: string;
    description: string;
    impact: "COSMETIC" | "MINOR" | "MAJOR" | "OUT_OF_SCOPE";
    status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED" | "ESCALATED";
    assignee?: string;
  }> = [
    { id: "wk-cr-01", ticketCode: "WK-HER-001.04-R01", deliverableId: "wk-del-her-posm", requestedByName: "Amara Udaku", description: "Augmenter la taille du logo sur le présentoir POSM.", impact: "COSMETIC", status: "RESOLVED", assignee: IDS.userNakia },
    { id: "wk-cr-02", ticketCode: "WK-GLW-001.01-R01", deliverableId: "wk-del-glow-ooh", requestedByName: "Amara Udaku", description: "Changer le claim de l'OOH : 'Glow comme jamais'.", impact: "MINOR", status: "IN_PROGRESS", assignee: IDS.userOkoye },
    { id: "wk-cr-03", ticketCode: "WK-GLW-001.03-R01", deliverableId: "wk-del-glow-tshirt", requestedByName: "Service Marketing BLISS", description: "Ajouter une déclinaison taille enfant — hors scope initial.", impact: "OUT_OF_SCOPE", status: "ESCALATED" },
  ];
  for (const cr of changeRequests) {
    await prisma.campaignChangeRequest.upsert({
      where: { id: cr.id },
      update: {},
      create: {
        id: cr.id,
        ticketCode: cr.ticketCode,
        campaignDeliverableId: cr.deliverableId,
        requestedByName: cr.requestedByName,
        requestedAt: daysAfter(T.now, -4),
        description: cr.description,
        impact: cr.impact,
        status: cr.status,
        assignedToUserId: cr.assignee ?? null,
        resolvedAt: cr.status === "RESOLVED" ? daysAfter(T.now, -2) : null,
        resolutionNotes: cr.status === "RESOLVED" ? "Appliqué et revalidé." : null,
      },
    });
    track("CampaignChangeRequest");
  }

  console.log(`[OK] Deliverables: ${deliverables.length} livrables 6D + ${changeRequests.length} change requests`);
}
