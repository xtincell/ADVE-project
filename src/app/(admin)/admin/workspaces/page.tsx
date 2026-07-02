import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import {
  listWorkspaces,
  parsePage,
  parseWorkspaceKindFilter,
} from "@/server/admin";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Pager } from "../../pager";
import { KIND_LABELS, KIND_VARIANTS } from "../../roles";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Workspaces" };

const DAY_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type PageProps = {
  searchParams: Promise<{ q?: string; kind?: string; page?: string }>;
};

/**
 * /admin/workspaces — la flotte des espaces (esprit console/ecosystem legacy,
 * réduit aux tables v7) : type, membres, marques, abonnement courant dérivé
 * des règles finance (statut actif = échéance strictement future).
 */
export default async function AdminWorkspacesPage({ searchParams }: PageProps) {
  const { q, kind: rawKind, page: rawPage } = await searchParams;
  const page = parsePage(rawPage);
  const kind = parseWorkspaceKindFilter(rawKind);
  const query = q?.trim() || undefined;
  const { rows, total } = await listWorkspaces({ query, kind, page });

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Console</p>
        <h1 className="font-display text-3xl font-semibold">Workspaces</h1>
        <p className="text-sm text-smoke">
          Les espaces clients et agence — membres, marques et abonnement courant. Un
          abonnement n&apos;est « actif » que si son échéance est future (règle finance).
        </p>
      </header>

      <form
        method="GET"
        action="/admin/workspaces"
        className="flex max-w-xl flex-wrap items-center gap-2"
      >
        <div className="relative min-w-52 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-smoke-2"
            aria-hidden
          />
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Nom ou slug…"
            className="h-10 pl-9 text-sm"
            aria-label="Rechercher un workspace"
          />
        </div>
        <Select
          name="kind"
          defaultValue={kind}
          className="h-10 w-40 text-sm"
          aria-label="Filtrer par type"
        >
          <option value="tous">Tous les types</option>
          <option value="AGENCY">Agences</option>
          <option value="BRAND">Marques</option>
        </Select>
        <button
          type="submit"
          className="h-10 rounded-sm bg-ink px-4 text-sm font-semibold text-bone transition-colors hover:bg-ink-3"
        >
          Filtrer
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          tone="light"
          icon={<Building2 />}
          title={query || kind !== "tous" ? "Aucun workspace ne correspond" : "Aucun workspace"}
          description={
            query || kind !== "tous"
              ? "Aucun espace ne correspond à ces filtres — élargissez la recherche."
              : "Les workspaces naissent à l'inscription d'un fondateur ou au bootstrap opérateur."
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Workspace</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Type</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Membres</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Marques</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Abonnement courant</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Créé le</th>
                  <th className="px-4 py-3 font-semibold text-graphite" />
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-ink">{w.name}</span>{" "}
                      <span className="font-mono text-xs text-smoke-2">({w.slug})</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={KIND_VARIANTS[w.kind] ?? "neutral"}>
                        {KIND_LABELS[w.kind] ?? w.kind}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite">{w.memberCount}</td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite">{w.brandCount}</td>
                    <td className="px-4 py-3">
                      {w.currentPlan ? (
                        <span className="text-graphite">
                          <Badge variant="gold">{w.currentPlan.planLabel}</Badge>{" "}
                          <span className="ml-1 font-mono text-xs text-smoke">
                            jusqu&apos;au{" "}
                            {w.currentPlan.expiresAt
                              ? DAY_FORMAT.format(w.currentPlan.expiresAt)
                              : "—"}
                          </span>
                        </span>
                      ) : w.pendingCount > 0 ? (
                        <Badge variant="coral">
                          {w.pendingCount} demande{w.pendingCount > 1 ? "s" : ""} en attente
                        </Badge>
                      ) : (
                        <span className="text-xs text-smoke-2">aucun</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                      {DAY_FORMAT.format(w.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/admin/workspaces/${w.id}`}
                        className="text-xs font-semibold text-coral hover:underline"
                      >
                        Fiche
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            pathname="/admin/workspaces"
            params={{ q: query, kind: kind === "tous" ? undefined : kind }}
            page={page}
            total={total}
          />
        </>
      )}
    </div>
  );
}
