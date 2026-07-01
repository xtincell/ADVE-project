/**
 * WAKANDA SEED — Batch 7b: Marché étendu (Seshat) + newsletter.
 *
 * Complète la voie « marché étendu » : `MarketBenchmark` (distributions p10/p50/
 * p90), `MarketCostSnapshot` × période (ADR-0099), `MarketDocument` (études),
 * `MarketContextNode` (RAG marché), et `NewsletterCampaign` (alimente Jehuty/
 * Argos newsletter). Déterministe.
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { T } from "./constants";
import { track, daysAfter } from "./helpers";

export async function seedMarketExtended(prisma: PrismaClient) {
  // ── MarketBenchmark — distributions par marché/secteur/métrique ──────
  const benchmarks: Array<{ id: string; country: string; sector: string; metric: string; unit: string; p10: number; p50: number; p90: number }> = [
    { id: "wk-bench-cm-fmcg-cpm", country: "CM", sector: "FMCG", metric: "CPM_META", unit: "FCFA", p10: 800, p50: 1500, p90: 3200 },
    { id: "wk-bench-cm-fmcg-spot", country: "CM", sector: "FMCG", metric: "PROD_SPOT_30S", unit: "FCFA", p10: 1500000, p50: 3500000, p90: 8000000 },
    { id: "wk-bench-cm-tech-salary", country: "CM", sector: "TECH", metric: "SALARY_DIRECTOR", unit: "FCFA", p10: 1200000, p50: 2500000, p90: 5000000 },
    { id: "wk-bench-wk-fmcg-retainer", country: "WK", sector: "FMCG", metric: "RETAINER_AGENCY", unit: "FCFA", p10: 500000, p50: 1500000, p90: 4000000 },
    { id: "wk-bench-wk-fintech-cpa", country: "WK", sector: "FINTECH", metric: "CPA_LEAD", unit: "FCFA", p10: 2000, p50: 6500, p90: 18000 },
  ];
  for (const b of benchmarks) {
    await prisma.marketBenchmark.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        country: b.country,
        sector: b.sector,
        metric: b.metric,
        unit: b.unit,
        p10: b.p10,
        p50: b.p50,
        p90: b.p90,
        sampleSize: 24,
        confidence: 0.6,
        sourceRef: [{ name: "WAKANDA_DEMO", year: 2026 }] as Prisma.InputJsonValue,
        lastReviewedAt: daysAfter(T.now, -30),
      },
    });
    track("MarketBenchmark");
  }

  // ── MarketCostSnapshot — même métriques × périodes (ADR-0099) ────────
  const periods: Array<{ period: string; start: string; end: string }> = [
    { period: "2026", start: "2026-01-01", end: "2026-12-31" },
    { period: "2026-Q2", start: "2026-04-01", end: "2026-06-30" },
  ];
  let snapCount = 0;
  for (const p of periods) {
    const snaps: Array<{ country: string; sector: string; metric: string; p50: number; unit: string }> = [
      { country: "WK", sector: "ALL", metric: "COST_OF_LIVING_INDEX", p50: 115, unit: "index" },
      { country: "WK", sector: "FMCG", metric: "CPM_META", p50: p.period === "2026-Q2" ? 1650 : 1500, unit: "FCFA" },
      { country: "CM", sector: "ALL", metric: "COST_OF_LIVING_INDEX", p50: 100, unit: "index" },
    ];
    for (const s of snaps) {
      const id = `wk-costsnap-${s.country}-${s.metric}-${p.period}`.toLowerCase();
      await prisma.marketCostSnapshot.upsert({
        where: { countryCode_sector_metric_period: { countryCode: s.country, sector: s.sector, metric: s.metric, period: p.period } },
        update: {},
        create: {
          id,
          countryCode: s.country,
          sector: s.sector,
          metric: s.metric,
          period: p.period,
          periodStart: new Date(`${p.start}T00:00:00.000Z`),
          periodEnd: new Date(`${p.end}T00:00:00.000Z`),
          unit: s.unit,
          p50: s.p50,
          p10: Math.round(s.p50 * 0.7),
          p90: Math.round(s.p50 * 1.6),
          sampleSize: 12,
          source: "SEED",
          confidence: 0.55,
        },
      });
      snapCount++;
    }
  }
  track("MarketCostSnapshot", snapCount);

  // ── MarketDocument — études marché (markdown) ────────────────────────
  const docs: Array<{ id: string; title: string; country: string; sector: string; topics: string[] }> = [
    { id: "wk-mktdoc-fmcg", title: "Panorama FMCG Wakanda 2026", country: "WK", sector: "FMCG", topics: ["FMCG", "Wakanda", "distribution"] },
    { id: "wk-mktdoc-fintech", title: "Mobile Money en Afrique Centrale", country: "CM", sector: "FINTECH", topics: ["fintech", "mobile money", "BEAC"] },
  ];
  for (const d of docs) {
    await prisma.marketDocument.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        title: d.title,
        country: d.country,
        sector: d.sector,
        year: 2026,
        topics: d.topics,
        frontmatter: { source: "WAKANDA_DEMO", confidence: 0.6 } as Prisma.InputJsonValue,
        body: `# ${d.title}\n\nÉtude de marché démo (Wakanda). Contenu structuré déterministe.\n\n## Taille de marché\n\n...\n\n## Acteurs clés\n\n...`,
        sourceRef: [{ name: "WAKANDA_DEMO", year: 2026 }] as Prisma.InputJsonValue,
      },
    });
    track("MarketDocument");
  }

  // ── MarketContextNode — RAG marché (benchmark + document) ────────────
  const contextNodes: Array<{ id: string; kind: string; refId: string; payload: Prisma.InputJsonValue }> = [
    { id: "wk-mktctx-bench", kind: "BENCHMARK", refId: "wk-bench-cm-fmcg-cpm", payload: { metric: "CPM_META", country: "CM", p50: 1500 } as Prisma.InputJsonValue },
    { id: "wk-mktctx-doc", kind: "DOCUMENT", refId: "wk-mktdoc-fmcg", payload: { title: "Panorama FMCG Wakanda 2026", country: "WK" } as Prisma.InputJsonValue },
  ];
  for (const c of contextNodes) {
    await prisma.marketContextNode.upsert({
      where: { kind_refId: { kind: c.kind, refId: c.refId } },
      update: {},
      create: {
        id: c.id,
        kind: c.kind,
        refId: c.refId,
        payload: c.payload,
        metadata: { country: "WK", _deterministic: true } as Prisma.InputJsonValue,
      },
    });
    track("MarketContextNode");
  }

  // ── NewsletterCampaign — alimente Jehuty / Argos newsletter ──────────
  const newsletters: Array<{ id: string; subject: string; status: string; sent?: number }> = [
    { id: "wk-newsletter-01", subject: "Wakanda Brands — l'actu culte du mois", status: "SENT", sent: 1240 },
    { id: "wk-newsletter-02", subject: "Édition spéciale : BLISS atteint ICONE", status: "DRAFT" },
  ];
  for (const n of newsletters) {
    await prisma.newsletterCampaign.upsert({
      where: { id: n.id },
      update: {},
      create: {
        id: n.id,
        subject: n.subject,
        bodyMjml: "<mjml><mj-body><mj-section><mj-column><mj-text>Actualité des marques cultes du Wakanda.</mj-text></mj-column></mj-section></mj-body></mjml>",
        status: n.status,
        sentAt: n.status === "SENT" ? daysAfter(T.now, -15) : null,
        sentBy: n.status === "SENT" ? "nefer-operator" : null,
        recipientCount: n.sent ?? 0,
        sentCount: n.sent ?? 0,
        failedCount: n.status === "SENT" ? 12 : 0,
        createdAt: daysAfter(T.now, -16),
      },
    });
    track("NewsletterCampaign");
  }

  console.log(
    `[OK] Market extended: ${benchmarks.length} benchmarks + ${snapCount} cost snapshots + ${docs.length} docs + ${contextNodes.length} context nodes + ${newsletters.length} newsletters`,
  );
}
