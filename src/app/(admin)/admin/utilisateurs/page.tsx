import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { listUsers, parsePage } from "@/server/admin";
import { listResetRequests } from "@/server/identity";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pager } from "../../pager";
import { ROLE_LABELS, ROLE_VARIANTS } from "../../roles";
import { ResetRequestsSection, type ResetRequestView } from "./reset-requests";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Utilisateurs" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATETIME_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type PageProps = { searchParams: Promise<{ q?: string; page?: string }> };

/**
 * /admin/utilisateurs — l'esprit du panneau legacy console/governance/accounts
 * ramené au schéma v7 : comptes + memberships/rôles, recherche nom/email.
 * (La promotion de rôle legacy visait le champ User.role global — le modèle v7
 * porte le rôle PAR workspace ; l'édition viendra avec sa mécanique propre.)
 */
export default async function AdminUtilisateursPage({ searchParams }: PageProps) {
  const { q, page: rawPage } = await searchParams;
  const page = parsePage(rawPage);
  const query = q?.trim() || undefined;
  const [{ rows, total }, resetRequests] = await Promise.all([
    listUsers({ query, page }),
    listResetRequests(),
  ]);
  // File WP-022 : demandes de /mot-de-passe-oublie non consommées — le lien
  // est ÉMIS ici par l'opérateur (pas de provider email en v7), puis transmis
  // par WhatsApp. Section rendue uniquement quand il y a du travail.
  const resetRequestViews: ResetRequestView[] = resetRequests.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    requestedAt: DATETIME_FORMAT.format(r.createdAt),
    expiresAt: DATETIME_FORMAT.format(r.expiresAt),
    expired: r.state === "EXPIRED",
  }));

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Console</p>
        <h1 className="font-display text-3xl font-semibold">Utilisateurs</h1>
        <p className="text-sm text-smoke">
          Tous les comptes, leurs espaces et leurs rôles. La fiche détaille les workspaces
          et la dernière activité réelle (journal d&apos;audit).
        </p>
      </header>

      {resetRequestViews.length > 0 ? (
        <ResetRequestsSection requests={resetRequestViews} />
      ) : null}

      <form method="GET" action="/admin/utilisateurs" className="flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-smoke-2"
            aria-hidden
          />
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher par nom ou email…"
            className="h-10 pl-9 text-sm"
            aria-label="Rechercher un utilisateur"
          />
        </div>
        <button
          type="submit"
          className="h-10 rounded-sm bg-ink px-4 text-sm font-semibold text-bone transition-colors hover:bg-ink-3"
        >
          Chercher
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          tone="light"
          icon={<Users />}
          title={query ? "Aucun compte ne correspond" : "Aucun compte en base"}
          description={
            query
              ? `Aucun utilisateur ne correspond à « ${query} » — essayez un fragment d'email.`
              : "Les comptes naissent à l'inscription d'un fondateur ou au bootstrap opérateur — ils apparaîtront ici."
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Compte</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Espaces &amp; rôles</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Créé le</th>
                  <th className="px-4 py-3 font-semibold text-graphite" />
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id} className="border-b border-ink/5 align-top last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{user.name ?? "—"}</p>
                      <p className="font-mono text-xs text-smoke">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {user.memberships.length === 0 ? (
                        <span className="text-xs text-smoke-2">aucune membership</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {user.memberships.map((m) => (
                            <span
                              key={m.workspaceId}
                              className="inline-flex items-center gap-1.5 rounded-xs bg-ink/4 px-2 py-1 text-xs text-graphite"
                            >
                              {m.workspaceName}
                              <Badge variant={ROLE_VARIANTS[m.role] ?? "neutral"}>
                                {ROLE_LABELS[m.role] ?? m.role}
                              </Badge>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                      {DATE_FORMAT.format(user.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/admin/utilisateurs/${user.id}`}
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
          <Pager pathname="/admin/utilisateurs" params={{ q: query }} page={page} total={total} />
        </>
      )}
    </div>
  );
}
