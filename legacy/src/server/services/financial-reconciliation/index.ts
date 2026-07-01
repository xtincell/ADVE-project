/**
 * FINANCIAL RECONCILIATION — Chantier 8
 *
 * P&L par client : réconcilie les 3 flux financiers
 *   - Revenue : Contract.value + Invoice.amount
 *   - Costs : Commission.netAmount + CampaignAmplification.budget + BudgetLine + AICostLog
 *   - Margin : Revenue - Costs
 */

import { db } from "@/lib/db";

// ── Types ──────────────────────────────────────────────────────────────

export interface ClientPnL {
  clientId: string;
  clientName: string;
  period: { from: Date; to: Date };

  revenue: {
    contractValue: number;
    invoicedAmount: number;
    total: number;
  };

  costs: {
    talentCommissions: number;
    mediaSpend: number;
    productionCosts: number;
    aiCosts: number;
    total: number;
  };

  margin: {
    gross: number;
    grossPct: number;
  };

  breakdown: {
    byCampaign: Array<{ campaignId: string; name: string; budget: number; spent: number }>;
  };
}

// ── Main API ──────────────────────────────────────────────────────────

export async function getClientPnL(
  clientId: string,
  from: Date,
  to: Date,
): Promise<ClientPnL> {
  const client = await db.client.findUniqueOrThrow({
    where: { id: clientId },
    select: { id: true, name: true },
  });

  // Get all strategies for this client
  const strategies = await db.strategy.findMany({
    where: { clientId },
    select: { id: true },
  });
  const strategyIds = strategies.map(s => s.id);

  // Revenue — contracts + invoices
  const contracts = await db.contract.findMany({
    where: { strategyId: { in: strategyIds }, status: "ACTIVE", startDate: { gte: from }, endDate: { lte: to } },
    select: { value: true },
  });
  const contractValue = contracts.reduce((s, c) => s + (c.value ?? 0), 0);

  // Link invoices to strategies via commissions → missions → strategyId
  const commissionInvoiceIds = await db.commission.findMany({
    where: { mission: { strategyId: { in: strategyIds } }, invoiceId: { not: null } },
    select: { invoiceId: true },
  });
  const linkedInvoiceIds = commissionInvoiceIds.map(c => c.invoiceId).filter(Boolean) as string[];

  const invoices = linkedInvoiceIds.length > 0
    ? await db.invoice.findMany({
        where: { id: { in: linkedInvoiceIds }, status: "PAID", paidAt: { gte: from, lte: to } },
        select: { amount: true },
      })
    : [];
  const invoicedAmount = invoices.reduce((s, i) => s + (i.amount ?? 0), 0);

  // Costs — commissions
  const commissions = await db.commission.findMany({
    where: {
      mission: { strategyId: { in: strategyIds } },
      status: "COMPLETED",
      paidAt: { gte: from, lte: to },
    },
    select: { netAmount: true },
  });
  const talentCommissions = commissions.reduce((s, c) => s + (c.netAmount ?? 0), 0);

  // Costs — media spend
  const campaigns = await db.campaign.findMany({
    where: { strategyId: { in: strategyIds } },
    select: { id: true, name: true, budget: true },
    orderBy: { createdAt: "desc" },
  });
  const campaignIds = campaigns.map(c => c.id);

  const amplifications = await db.campaignAmplification.findMany({
    where: { campaignId: { in: campaignIds } },
    select: { budget: true },
  });
  const mediaSpend = amplifications.reduce((s, a) => s + (a.budget ?? 0), 0);

  // Costs — production (budget lines)
  const budgetLines = await db.budgetLine.findMany({
    where: { campaignId: { in: campaignIds }, category: "PRODUCTION" },
    select: { actual: true },
  });
  const productionCosts = budgetLines.reduce((s, b) => s + (b.actual ?? 0), 0);

  // Costs — AI
  const aiLogs = await db.aICostLog.findMany({
    where: { strategyId: { in: strategyIds }, createdAt: { gte: from, lte: to } },
    select: { cost: true },
  });
  const aiCosts = aiLogs.reduce((s, l) => s + (l.cost ?? 0), 0);

  // Totals
  const totalRevenue = contractValue + invoicedAmount;
  const totalCosts = talentCommissions + mediaSpend + productionCosts + aiCosts;
  const gross = totalRevenue - totalCosts;

  return {
    clientId: client.id,
    clientName: client.name,
    period: { from, to },
    revenue: { contractValue, invoicedAmount, total: totalRevenue },
    costs: { talentCommissions, mediaSpend, productionCosts, aiCosts, total: totalCosts },
    margin: {
      gross,
      grossPct: totalRevenue > 0 ? Math.round((gross / totalRevenue) * 10000) / 100 : 0,
    },
    breakdown: {
      byCampaign: await Promise.all(campaigns.map(async c => {
        const lines = await db.budgetLine.findMany({
          where: { campaignId: c.id },
          select: { actual: true },
        });
        const spent = lines.reduce((s, l) => s + (l.actual ?? 0), 0);
        return { campaignId: c.id, name: c.name, budget: c.budget ?? 0, spent };
      })),
    },
  };
}
