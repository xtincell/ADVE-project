"use client";

/**
 * /console/socle/feedback — ADR-0155. Inbox des remontées feedback / bug des
 * testeurs. L'opérateur trie (NEW → TRIAGED → RESOLVED). Jamais exposée au client.
 *
 * missionContribution: GROUND_INFRASTRUCTURE
 * groundJustification: surface opérateur interne de support — lecture et tri des
 *   remontées testeurs. Face interne, jamais côté client.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Badge } from "@/components/primitives";
import { Bug, Lightbulb, Mail, CheckCircle2, Inbox } from "lucide-react";

type Filter = "NEW" | "TRIAGED" | "RESOLVED" | "ALL";
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "NEW", label: "Nouveaux" },
  { key: "TRIAGED", label: "En cours" },
  { key: "RESOLVED", label: "Résolus" },
  { key: "ALL", label: "Tous" },
];

const KIND_ICON = { BUG: Bug, IDEA: Lightbulb, OTHER: Mail } as const;

export default function FeedbackInboxPage() {
  const [filter, setFilter] = useState<Filter>("NEW");
  const utils = trpc.useUtils();
  const { data: rows, isLoading } = trpc.feedback.list.useQuery({ status: filter === "ALL" ? undefined : filter });

  const invalidate = () => {
    void utils.feedback.list.invalidate();
    void utils.feedback.unresolvedCount.invalidate();
  };
  const triage = trpc.feedback.triage.useMutation({ onSuccess: invalidate });

  if (isLoading) return <SkeletonPage />;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Remontées testeurs"
        description="Bugs, idées et retours envoyés depuis l'app. Prenez en compte puis résolvez."
      />

      <div role="tablist" aria-label="Filtre statut" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-background text-foreground-secondary hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!rows || rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/40 px-6 py-16 text-center">
          <Inbox className="h-8 w-8 text-foreground-muted" aria-hidden />
          <p className="mt-3 text-sm text-foreground-secondary">Aucune remontée {filter === "NEW" ? "nouvelle" : ""}.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => {
            const Icon = KIND_ICON[r.kind as keyof typeof KIND_ICON] ?? Mail;
            return (
              <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="h-4 w-4 text-[color:var(--color-accent)]" aria-hidden />
                    <Badge tone={r.kind === "BUG" ? "error" : r.kind === "IDEA" ? "info" : "neutral"}>{r.kind}</Badge>
                    <Badge tone={r.status === "NEW" ? "warning" : r.status === "RESOLVED" ? "success" : "neutral"}>{r.status}</Badge>
                    <span className="text-xs text-foreground-muted">{new Date(r.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{r.message}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-foreground-muted">
                    {r.email ? <span>{r.email}</span> : null}
                    {r.pageUrl ? <span className="font-mono">{r.pageUrl}</span> : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  {r.status === "NEW" && (
                    <button
                      onClick={() => triage.mutate({ id: r.id, status: "TRIAGED" })}
                      disabled={triage.isPending}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:text-foreground disabled:opacity-50"
                    >
                      Pris en compte
                    </button>
                  )}
                  {r.status !== "RESOLVED" && (
                    <button
                      onClick={() => triage.mutate({ id: r.id, status: "RESOLVED" })}
                      disabled={triage.isPending}
                      className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Résolu
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
