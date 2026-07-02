import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { readSession } from "@/lib/session";
import { averageRoundedScore, getAgencyFleet } from "@/server/agency";
import { COMPOSITE_MAX_SCORE } from "@/domain/scoring";
import { EmptyState } from "@/components/ui/empty-state";
import { LevelBadge } from "@/components/pillars/level-badge";
import { AgencyNav } from "../nav";
import { NoAgencyState } from "../no-agency";
import { SubscriptionBadge } from "../subscription-badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Clients — Espace agence" };

/**
 * /espace-agence/clients — port de l'esprit de `(agency)/agency/clients`
 * legacy (portefeuille clients : marques, score moyen, statut) sur les tables
 * v7 : un client = un workspace BRAND de la flotte. Santé lue, jamais
 * estimée : dernier BrandScore, palier, état d'abonnement dérivé finance.ts,
 * dernière activité = dernière ligne AuditLog du workspace.
 */

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function AgencyClientsPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/espace-agence/clients");

  const fleet = await getAgencyFleet(session);
  if (!fleet) return <NoAgencyState title="Clients" />;

  const { agency, workspaces, totals } = fleet;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Espace agence — {agency.name}</p>
        <h1 className="font-display text-3xl font-semibold">Clients</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-sand">
          {totals.workspaces} client{totals.workspaces > 1 ? "s" : ""} dans la flotte —{" "}
          {totals.brands} marque{totals.brands > 1 ? "s" : ""} suivie
          {totals.brands > 1 ? "s" : ""}. La santé affichée est lue en base (score, palier,
          abonnement, dernière activité auditée), jamais estimée.
        </p>
      </header>

      <AgencyNav />

      {workspaces.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="Aucun client dans la flotte"
          description="Un client entre dans la flotte quand un membre de l'agence est invité dans son workspace marque. Rien n'est inventé entre-temps."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-ink-2">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-4 py-3 font-semibold text-sand">Client</th>
                <th className="px-4 py-3 font-semibold text-sand">Marques</th>
                <th className="px-4 py-3 font-semibold text-sand">Score moyen</th>
                <th className="px-4 py-3 font-semibold text-sand">Abonnement</th>
                <th className="px-4 py-3 font-semibold text-sand">Membres</th>
                <th className="px-4 py-3 font-semibold text-sand">Dernière activité</th>
                <th className="px-4 py-3" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {workspaces.map((ws) => {
                const score = averageRoundedScore(ws.brands.map((b) => b.score));
                return (
                  <tr key={ws.id} className="group border-b border-line-soft last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/espace-agence/clients/${ws.id}`}
                        className="font-semibold text-bone transition-colors hover:text-coral"
                      >
                        {ws.name}
                      </Link>
                      <p className="font-mono text-xs text-smoke-2">{ws.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      {ws.brands.length === 0 ? (
                        <span className="text-xs text-smoke-2">Aucune marque</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {ws.brands.map((brand) => (
                            <span key={brand.id} className="flex items-center gap-2">
                              <span className="text-sand">{brand.name}</span>
                              <LevelBadge level={brand.level} />
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-sand">
                      {score !== null ? `${score} / ${COMPOSITE_MAX_SCORE}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <SubscriptionBadge subscription={ws.subscription} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sand">{ws.memberCount}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-sand">
                      {ws.lastActivityAt ? DATE_FORMAT.format(ws.lastActivityAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/espace-agence/clients/${ws.id}`}
                        className="inline-flex text-smoke-2 transition-colors hover:text-coral"
                        aria-label={`Ouvrir la fiche de ${ws.name}`}
                      >
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {workspaces.length > 0 ? (
        <p className="text-xs text-smoke-2">
          « — » = rien en base (aucun score calculé, aucune mutation auditée) : le trou
          s&apos;affiche, il ne se remplit pas.
        </p>
      ) : null}
    </div>
  );
}
