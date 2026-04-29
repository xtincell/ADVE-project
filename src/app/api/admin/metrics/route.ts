/**
 * /api/admin/metrics — Prometheus-style scrape endpoint.
 *
 * Returns plaintext metrics about the OS:
 *   - intents_total{kind, status}
 *   - intent_latency_ms_p95{kind}
 *   - intent_cost_usd_total{kind}
 *   - subscription_active_total{tier}
 *   - payment_total{status, currency}
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — meta-observability of
 * the OS, scraped by Prometheus / Grafana / Datadog for SLO dashboards.
 *
 * Auth: Bearer token via env `ADMIN_METRICS_TOKEN` (mandatory in prod).
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const SCRAPE_WINDOW_HOURS = 24;

function escape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
}

function metric(name: string, labels: Record<string, string>, value: number, help?: string): string[] {
  const lines: string[] = [];
  if (help) lines.push(`# HELP ${name} ${help}`);
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${escape(v)}"`)
    .join(",");
  lines.push(`${name}{${labelStr}} ${value}`);
  return lines;
}

export async function GET(req: Request) {
  // Bearer auth.
  const required = process.env.ADMIN_METRICS_TOKEN;
  const auth = req.headers.get("authorization") ?? "";
  if (process.env.NODE_ENV === "production" && !required) {
    return new NextResponse("ADMIN_METRICS_TOKEN not configured", { status: 500 });
  }
  if (required && auth !== `Bearer ${required}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const since = new Date(Date.now() - SCRAPE_WINDOW_HOURS * 3600 * 1000);
  const lines: string[] = [];

  // intents_total{kind, status}
  const byKindStatus = await db.intentEmission.groupBy({
    by: ["intentKind", "status"],
    where: { emittedAt: { gte: since } },
    _count: { _all: true },
  }).catch(() => []);
  lines.push(`# TYPE intents_total counter`);
  for (const row of byKindStatus) {
    lines.push(...metric("intents_total", { kind: row.intentKind, status: row.status }, row._count._all));
  }

  // intent count per kind (proxy for traffic)
  const byKindLatency = await db.intentEmission.groupBy({
    by: ["intentKind"],
    where: { emittedAt: { gte: since } },
    _count: true,
  }).catch(() => [] as Array<{ intentKind: string; _count: number }>);
  lines.push(`# TYPE intent_count_per_kind counter`);
  for (const row of byKindLatency as Array<{ intentKind: string; _count: number }>) {
    lines.push(...metric("intent_count_per_kind", { kind: row.intentKind }, row._count));
  }

  // payment_total
  const byPayment = await db.intakePayment.groupBy({
    by: ["status", "currency"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    _sum: { amount: true },
  }).catch(() => []);
  lines.push(`# TYPE payment_total counter`);
  for (const row of byPayment) {
    lines.push(...metric("payment_total", { status: row.status, currency: row.currency }, row._count._all));
    if (row._sum.amount) {
      lines.push(...metric("payment_amount_total", { status: row.status, currency: row.currency }, row._sum.amount));
    }
  }

  // subscription_active_total
  const bySub = await db.subscription.groupBy({
    by: ["status", "tierKey"],
    _count: { _all: true },
  }).catch(() => []);
  lines.push(`# TYPE subscription_total counter`);
  for (const row of bySub) {
    lines.push(...metric("subscription_total", { status: row.status, tier: row.tierKey }, row._count._all));
  }

  // Build info
  lines.push(...metric("apogee_build_info", { version: process.env.npm_package_version ?? "unknown" }, 1, "APOGEE build version"));

  return new NextResponse(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4",
      "Cache-Control": "no-cache",
    },
  });
}
