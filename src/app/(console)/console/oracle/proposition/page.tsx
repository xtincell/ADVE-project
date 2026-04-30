"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FileBarChart, ArrowRight, Loader2 } from "lucide-react";

/**
 * /console/oracle/proposition — operator-side index of every strategy
 * the console can drive an Oracle for. Replaces the previous dummy
 * placeholder. Each entry links to the cockpit Proposition page
 * (/cockpit/brand/[id]/proposition) which already implements the full
 * 21-section enrichment + share/export flow.
 *
 * The phase column reads the canonical lifecycle phase so the operator
 * sees at a glance which Oracle is INTAKE-stage vs OPERATING etc.
 */

export default function ConsoleOraclePropositionPage() {
  const list = trpc.strategy.list.useQuery({});

  return (
    <div className="space-y-6">
      <PageHeader
        title="L'Oracle — Propositions"
        description="Toutes les marques pilotables. Chaque Oracle s'enrichit via le panthéon NETERU (Mestor décide, Artemis produit les briefs Glory, Ptah forge les assets, Seshat observe, Thot gouverne)."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "L'Oracle", href: "/console/oracle/clients" },
          { label: "Proposition" },
        ]}
      />

      {list.isLoading && (
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement des stratégies…
        </div>
      )}

      {!list.isLoading && (list.data?.length ?? 0) === 0 && (
        <EmptyState
          icon={FileBarChart}
          title="Aucune stratégie"
          description="Créez ou importez une stratégie depuis l'intake pour générer son Oracle."
        />
      )}

      {!list.isLoading && list.data && list.data.length > 0 && (
        <ul className="divide-y divide-zinc-800 rounded-lg border border-border bg-background">
          {list.data.map((s) => (
            <PropositionRow key={s.id} strategyId={s.id} name={s.name} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PropositionRow({ strategyId, name }: { strategyId: string; name: string }) {
  const readiness = trpc.pillar.readiness.useQuery({ strategyId });
  const phase = readiness.data?.phase ?? null;
  const enrichOk = readiness.data?.gates.ORACLE_ENRICH.ok ?? false;
  const exportOk = readiness.data?.gates.ORACLE_EXPORT.ok ?? false;

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-background/50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-white">{name}</span>
          {phase && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-foreground-secondary">
              {phase}
            </span>
          )}
        </div>
        <div className="mt-1 flex gap-3 text-[11px] text-foreground-muted">
          <span>Enrich: {enrichOk ? "✓" : "—"}</span>
          <span>Export: {exportOk ? "✓" : "—"}</span>
        </div>
      </div>
      <Link
        href={`/cockpit/brand/${strategyId}/proposition`}
        className="inline-flex items-center gap-1 rounded border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-background"
      >
        Ouvrir
        <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
  );
}
