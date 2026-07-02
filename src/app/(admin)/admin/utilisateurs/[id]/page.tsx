import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ScrollText } from "lucide-react";
import { getUserDetail } from "@/server/admin";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KIND_LABELS, KIND_VARIANTS, ROLE_LABELS, ROLE_VARIANTS } from "../../../roles";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fiche utilisateur" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type PageProps = { params: Promise<{ id: string }> };

/**
 * Fiche compte : identité, memberships (workspaces + rôles) et activité
 * réelle — la dernière activité est la dernière ligne AuditLog où ce compte
 * est acteur (aucune télémétrie inventée).
 */
export default async function AdminUtilisateurDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getUserDetail(id);
  if (!user) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/utilisateurs"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-smoke transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Utilisateurs
        </Link>
      </div>

      <header className="space-y-1">
        <p className="eyebrow text-coral">Fiche compte</p>
        <h1 className="font-display text-3xl font-semibold">{user.name ?? user.email}</h1>
        <p className="font-mono text-sm text-smoke">{user.email}</p>
      </header>

      <div className="grid gap-bento sm:grid-cols-3">
        <Card padding="sm">
          <p className="text-xs font-medium text-smoke">Créé le</p>
          <p className="mt-1 font-mono text-sm text-ink">{DATE_FORMAT.format(user.createdAt)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium text-smoke">Dernière activité (audit)</p>
          <p className="mt-1 font-mono text-sm text-ink">
            {user.lastActivityAt ? DATE_FORMAT.format(user.lastActivityAt) : "aucune trace"}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium text-smoke">Connexion</p>
          <p className="mt-1 text-sm text-ink">
            {user.hasPassword ? "Mot de passe défini" : "Sans mot de passe (compte importé)"}
          </p>
        </Card>
      </div>

      {/* ── Workspaces ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">
          Workspaces ({user.memberships.length})
        </h2>
        {user.memberships.length === 0 ? (
          <p className="text-sm text-smoke">
            Aucune membership — ce compte n&apos;appartient à aucun espace.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Workspace</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Type</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Rôle</th>
                  <th className="px-4 py-3 font-semibold text-graphite" />
                </tr>
              </thead>
              <tbody>
                {user.memberships.map((m) => (
                  <tr key={m.workspaceId} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-ink">{m.workspaceName}</span>{" "}
                      <span className="font-mono text-xs text-smoke-2">({m.workspaceSlug})</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={KIND_VARIANTS[m.workspaceKind] ?? "neutral"}>
                        {KIND_LABELS[m.workspaceKind] ?? m.workspaceKind}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_VARIANTS[m.role] ?? "neutral"}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/admin/workspaces/${m.workspaceId}`}
                        className="text-xs font-semibold text-coral hover:underline"
                      >
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Activité récente ───────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Activité récente</h2>
        {user.recentAudit.length === 0 ? (
          <EmptyState
            tone="light"
            icon={<ScrollText />}
            title="Aucune action tracée"
            description="Ce compte n'apparaît comme acteur d'aucune ligne du journal d'audit pour le moment."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Date</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Action</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Entité</th>
                </tr>
              </thead>
              <tbody>
                {user.recentAudit.map((line) => (
                  <tr key={line.id} className="border-b border-ink/5 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                      {DATE_FORMAT.format(line.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">
                      {line.action}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite">
                      {line.entity ? `${line.entity} · ${line.entityId ?? "—"}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-smoke-2">
          Journal complet filtrable dans{" "}
          <Link href="/admin/audit" className="font-semibold text-coral hover:underline">
            Audit
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
