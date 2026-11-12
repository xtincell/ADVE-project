"use client";

/**
 * /console/socle/feedback — ADR-0155. Inbox des remontées feedback / bug des
 * testeurs. L'opérateur trie (NEW → TRIAGED → RESOLVED). Jamais exposée au client.
 *
 * missionContribution: GROUND_INFRASTRUCTURE
 * groundJustification: surface opérateur interne de support — lecture et tri des
 *   remontées testeurs. Face interne, jamais côté client.
 */

import { useDeferredValue, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Badge } from "@/components/primitives";
import { Bug, Lightbulb, Mail, CheckCircle2, Inbox } from "lucide-react";

type Filter = "NEW" | "TRIAGED" | "RESOLVED" | "ALL";
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "NEW", label: "À traiter" },
  { key: "TRIAGED", label: "En cours" },
  { key: "RESOLVED", label: "Traités" },
  { key: "ALL", label: "Tous" },
];

const KIND_ICON = { BUG: Bug, IDEA: Lightbulb, OTHER: Mail } as const;

export default function FeedbackInboxPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search);
  const utils = trpc.useUtils();
  const listing = trpc.feedback.list.useInfiniteQuery({ status: filter === "ALL" ? undefined : filter, search: query }, { getNextPageParam: page => page.length === 50 ? page.at(-1)?.id : undefined });
  const rows = listing.data?.pages.flat() ?? [];
  const isLoading = listing.isLoading;

  const invalidate = () => {
    void utils.feedback.list.invalidate();
    void utils.feedback.unresolvedCount.invalidate();
  };
  const triage = trpc.feedback.triage.useMutation({ onSuccess: invalidate });

  return (
    <section className="space-y-6">
      <PageHeader
        title="Banque de demandes"
        description="Retrouvez les bugs, idées et demandes reçus. Classez-les à traiter, en cours ou traités ; une demande traitée peut être rouverte."
      />

      <label className="flex flex-col gap-2 text-sm text-foreground-secondary">Rechercher une demande<input className="rounded-lg border border-border bg-background p-3 text-foreground" value={search} onChange={e => setSearch(e.target.value)} placeholder="Message, expéditeur, page ou référence" /></label>
      {listing.error ? <p role="alert" className="text-error">{listing.error.message}</p> : null}
      {triage.error ? <p role="alert" className="text-error">{triage.error.message}</p> : null}
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

      {isLoading ? <SkeletonPage /> : !rows || rows.length === 0 ? (
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
                    <Badge tone={r.status === "NEW" ? "warning" : r.status === "RESOLVED" ? "success" : "neutral"}>{{ NEW: "À traiter", TRIAGED: "En cours", RESOLVED: "Traité" }[r.status as "NEW" | "TRIAGED" | "RESOLVED"]}</Badge>
                    <span className="text-xs text-foreground-muted">{new Date(r.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{r.message}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-foreground-muted">
                    <span className="font-mono">Réf. {r.id}</span>
                    {r.email ? <span>{r.email}</span> : null}
                    {r.pageUrl ? <span className="font-mono">{r.pageUrl}</span> : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  {r.status === "RESOLVED" && <button onClick={() => triage.mutate({ id: r.id, status: "NEW" })} disabled={triage.isPending} className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground">Rouvrir</button>}
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
    {listing.hasNextPage ? <button onClick={() => void listing.fetchNextPage()} disabled={listing.isFetchingNextPage} className="rounded-lg border border-border px-4 py-2 text-foreground">{listing.isFetchingNextPage ? "Chargement…" : "Voir les demandes suivantes"}</button> : null}
    </section>
  );
}
