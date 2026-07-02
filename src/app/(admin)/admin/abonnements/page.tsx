import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Search } from "lucide-react";
import {
  listAllSubscriptions,
  parsePage,
  parseSubscriptionFilter,
  SUBSCRIPTION_FILTER_LABELS,
  SUBSCRIPTION_FILTERS,
} from "@/server/admin";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/cn";
import { Pager } from "../../pager";
import { SUBSCRIPTION_STATUS_BADGES } from "./status-badges";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Abonnements" };

const DAY_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type PageProps = {
  searchParams: Promise<{ statut?: string; q?: string; page?: string }>;
};

/**
 * /admin/abonnements — vue Subscription cross-workspace (esprit legacy
 * console/socle/manual-subscriptions élargi à TOUT le cycle de vie). Le
 * statut affiché est DÉRIVÉ des règles finance.ts : une ligne `active` à
 * échéance passée est Échue, `expiresAt` null n'accorde rien. La décision
 * Valider/Rejeter reste dans /admin/paiements (file dédiée).
 */
export default async function AdminAbonnementsPage({ searchParams }: PageProps) {
  const { statut, q, page: rawPage } = await searchParams;
  const filter = parseSubscriptionFilter(statut);
  const page = parsePage(rawPage);
  const query = q?.trim() || undefined;
  const { rows, total, counts } = await listAllSubscriptions({ filter, query, page });

  const filterHref = (f: (typeof SUBSCRIPTION_FILTERS)[number]) => {
    const search = new URLSearchParams();
    if (f !== "tous") search.set("statut", f);
    if (query) search.set("q", query);
    const qs = search.toString();
    return qs ? `/admin/abonnements?${qs}` : "/admin/abonnements";
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Console</p>
        <h1 className="font-display text-3xl font-semibold">Abonnements</h1>
        <p className="text-sm text-smoke">
          Toutes les souscriptions, tous workspaces — {counts.pending} en attente,{" "}
          {counts.active} actives, {counts.expiring7d} expirant sous 7 jours. Les demandes
          en attente se traitent dans{" "}
          <Link href="/admin/paiements" className="font-semibold text-coral hover:underline">
            Paiements
          </Link>
          .
        </p>
      </header>

      {/* ── Filtres statut + recherche workspace ─────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Filtrer par statut" className="flex flex-wrap gap-1.5">
          {SUBSCRIPTION_FILTERS.map((f) => (
            <Link
              key={f}
              role="tab"
              aria-selected={filter === f}
              href={filterHref(f)}
              className={cn(
                "rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f
                  ? "border-coral bg-coral/10 text-coral-deep"
                  : "border-ink/15 bg-white text-graphite hover:text-ink",
              )}
            >
              {SUBSCRIPTION_FILTER_LABELS[f]}
            </Link>
          ))}
        </div>
        <form method="GET" action="/admin/abonnements" className="ml-auto flex items-center gap-2">
          {filter !== "tous" ? <input type="hidden" name="statut" value={filter} /> : null}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-smoke-2"
              aria-hidden
            />
            <Input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Workspace…"
              className="h-9 w-52 pl-9 text-sm"
              aria-label="Filtrer par nom de workspace"
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-sm bg-ink px-3 text-xs font-semibold text-bone transition-colors hover:bg-ink-3"
          >
            Filtrer
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          tone="light"
          icon={<CreditCard />}
          title="Aucune souscription pour ces filtres"
          description="Les demandes naissent côté client sur /app/facturation (« Payer via WhatsApp ») — elles apparaissent ici sur tout leur cycle de vie."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Référence</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Workspace</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Plan</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Canal</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Statut</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Début</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Échéance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((sub) => {
                  const status = SUBSCRIPTION_STATUS_BADGES[sub.displayStatus];
                  return (
                    <tr key={sub.id} className="border-b border-ink/5 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-ink">
                        {sub.reference}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/workspaces/${sub.workspaceId}`}
                          className="font-semibold text-ink hover:text-coral hover:underline"
                        >
                          {sub.workspaceName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-graphite">{sub.planLabel}</td>
                      <td className="px-4 py-3 font-mono text-xs text-graphite">{sub.provider}</td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                        {DAY_FORMAT.format(sub.startedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                        {sub.expiresAt ? DAY_FORMAT.format(sub.expiresAt) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager
            pathname="/admin/abonnements"
            params={{ statut: filter === "tous" ? undefined : filter, q: query }}
            page={page}
            total={total}
          />
        </>
      )}
    </div>
  );
}
