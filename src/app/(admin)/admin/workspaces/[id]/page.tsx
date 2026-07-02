import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getWorkspaceDetail, planLabel, subscriptionDisplayStatus } from "@/server/admin";
import { LEVEL_DEFINITIONS } from "@/domain/scoring";
import type { BrandLevel } from "@/domain/pillars";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { KIND_LABELS, KIND_VARIANTS, ROLE_LABELS, ROLE_VARIANTS } from "../../../roles";
import { SUBSCRIPTION_STATUS_BADGES } from "../../abonnements/status-badges";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fiche workspace" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const DAY_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const NUMBER_FORMAT = new Intl.NumberFormat("fr-FR");

function formatAmount(amount: number, currency: string): string {
  const unit = currency === "XOF" || currency === "XAF" ? "FCFA" : currency;
  return `${NUMBER_FORMAT.format(amount)} ${unit}`;
}

type PageProps = { params: Promise<{ id: string }> };

/** Fiche workspace : membres, marques, abonnements, paiements, audit récent. */
export default async function AdminWorkspaceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const workspace = await getWorkspaceDetail(id);
  if (!workspace) notFound();
  const now = new Date();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/workspaces"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-smoke transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Workspaces
        </Link>
      </div>

      <header className="space-y-2">
        <p className="eyebrow text-coral">Fiche workspace</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold">{workspace.name}</h1>
          <Badge variant={KIND_VARIANTS[workspace.kind] ?? "neutral"}>
            {KIND_LABELS[workspace.kind] ?? workspace.kind}
          </Badge>
        </div>
        <p className="font-mono text-sm text-smoke">
          {workspace.slug} · créé le {DAY_FORMAT.format(workspace.createdAt)}
        </p>
      </header>

      <div className="grid gap-bento lg:grid-cols-2">
        {/* ── Membres ────────────────────────────────────────────── */}
        <Card padding="md">
          <h2 className="font-display text-lg font-semibold">
            Membres ({workspace.members.length})
          </h2>
          {workspace.members.length === 0 ? (
            <p className="mt-3 text-sm text-smoke">Aucun membre.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/5">
              {workspace.members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{m.name ?? "—"}</p>
                    <p className="truncate font-mono text-xs text-smoke">{m.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={ROLE_VARIANTS[m.role] ?? "neutral"}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </Badge>
                    <Link
                      href={`/admin/utilisateurs/${m.userId}`}
                      className="text-xs font-semibold text-coral hover:underline"
                    >
                      Fiche
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ── Marques ────────────────────────────────────────────── */}
        <Card padding="md">
          <h2 className="font-display text-lg font-semibold">
            Marques ({workspace.brands.length})
          </h2>
          {workspace.brands.length === 0 ? (
            <p className="mt-3 text-sm text-smoke">Aucune marque dans cet espace.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/5">
              {workspace.brands.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{b.name}</p>
                    <p className="truncate font-mono text-xs text-smoke">
                      {b.sector ?? "secteur —"} · {b.countryCode ?? "pays —"}
                    </p>
                  </div>
                  <Badge variant="neutral">
                    {LEVEL_DEFINITIONS[b.level as BrandLevel]?.label ?? b.level}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Abonnements ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">
          Abonnements ({workspace.subscriptions.length})
        </h2>
        {workspace.subscriptions.length === 0 ? (
          <p className="text-sm text-smoke">
            Aucune souscription — cet espace n&apos;a jamais demandé de plan.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Référence</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Plan</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Canal</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Statut</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Début</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Échéance</th>
                </tr>
              </thead>
              <tbody>
                {workspace.subscriptions.map((sub) => {
                  const status = SUBSCRIPTION_STATUS_BADGES[subscriptionDisplayStatus(sub, now)];
                  return (
                    <tr key={sub.id} className="border-b border-ink/5 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-ink">
                        {sub.reference}
                      </td>
                      <td className="px-4 py-3 text-graphite">{planLabel(sub.plan)}</td>
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
        )}
      </section>

      {/* ── Paiements ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Derniers paiements</h2>
        {workspace.payments.length === 0 ? (
          <p className="text-sm text-smoke">Aucun paiement enregistré.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Date</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Montant</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Méthode</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Statut</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Référence</th>
                </tr>
              </thead>
              <tbody>
                {workspace.payments.map((p) => (
                  <tr key={p.id} className="border-b border-ink/5 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                      {DATE_FORMAT.format(p.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-ink">
                      {formatAmount(p.amount, p.currency)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite">{p.method}</td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite">{p.status}</td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite">
                      {p.reference ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Audit ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Audit récent</h2>
        {workspace.recentAudit.length === 0 ? (
          <p className="text-sm text-smoke">Aucune ligne d&apos;audit pour cet espace.</p>
        ) : (
          <ul className="divide-y divide-ink/5 rounded-lg bg-white shadow-card">
            {workspace.recentAudit.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="font-mono text-xs font-semibold text-ink">{line.action}</span>
                <span className="font-mono text-xs text-smoke">
                  {line.entity ?? ""} · {DATE_FORMAT.format(line.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-smoke-2">
          Chaîne complète de cet espace :{" "}
          <Link
            href={`/admin/audit?chaine=${workspace.id}`}
            className="font-semibold text-coral hover:underline"
          >
            journal filtré + vérification d&apos;intégrité
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
