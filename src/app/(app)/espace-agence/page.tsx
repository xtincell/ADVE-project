import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, FileText } from "lucide-react";
import { readSession } from "@/lib/session";
import { getAgencyFleet, getFleetPulse } from "@/server/agency";
import { COMPOSITE_MAX_SCORE, LEVEL_DEFINITIONS } from "@/domain/scoring";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LevelBadge } from "@/components/pillars/level-badge";
import { AgencyNav } from "./nav";
import { NoAgencyState } from "./no-agency";
import { SubscriptionBadge } from "./subscription-badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Espace agence" };

/**
 * Espace agence (/espace-agence) — port de l'esprit du dashboard agence legacy
 * (legacy/src/app/(agency)/agency/page.tsx : clients / marques / score moyen)
 * ramené à ce que les tables v7 savent servir : la flotte réelle (workspaces
 * BRAND où l'équipe de l'agence a une membership), paliers, derniers
 * BrandScore, état d'abonnement. WP-018 ajoute la profondeur : onglets
 * clients / campagnes / missions / revenus + compteurs de production vivants
 * (tables tranche 2). Les contrats n'ont toujours pas de table → carte
 * « à venir » honnête, zéro donnée inventée.
 *
 * Garde : la route n'est pas couverte par le middleware (matcher /app + /admin
 * uniquement) — session vérifiée ici, appartenance agence vérifiée en DB.
 */
export default async function AgencePage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/espace-agence");

  const [fleet, pulse] = await Promise.all([getAgencyFleet(session), getFleetPulse(session)]);

  if (!fleet || !pulse) return <NoAgencyState title="Agence" />;

  const { agency, totals, workspaces, teamSize } = fleet;
  const brandRows = workspaces.flatMap((ws) =>
    ws.brands.map((brand) => ({ workspace: ws, brand })),
  );

  const tiles = [
    { label: "Marques suivies", value: String(totals.brands), hint: "dans la flotte de l'agence" },
    { label: "Workspaces clients", value: String(totals.workspaces), hint: "où l'équipe a une membership" },
    {
      label: "Score moyen",
      value: totals.averageScore !== null ? String(totals.averageScore) : "—",
      hint:
        totals.averageScore !== null
          ? `sur ${COMPOSITE_MAX_SCORE} — derniers scores calculés`
          : "aucun score calculé pour l'instant",
    },
    {
      label: "Abonnements actifs",
      value: String(totals.activeSubscriptions),
      hint:
        totals.pendingSubscriptions > 0
          ? `+ ${totals.pendingSubscriptions} en validation opérateur`
          : "aucune demande en attente",
    },
  ];

  /** Compteurs de production — chaque carte mène à son onglet. */
  const productionCards = [
    {
      href: "/espace-agence/campagnes",
      label: "Campagnes",
      value: String(pulse.campaigns.total),
      hint: `dont ${pulse.campaigns.active} en production`,
    },
    {
      href: "/espace-agence/missions",
      label: "Missions",
      value: String(pulse.missions.total),
      hint: `dont ${pulse.missions.inProgress} en cours`,
    },
    {
      href: "/espace-agence/missions",
      label: "Candidatures guilde",
      value: String(pulse.pendingApplications),
      hint: "en attente de décision",
    },
    {
      href: "/espace-agence/revenus",
      label: "Paiements confirmés",
      value: String(pulse.confirmedPayments),
      hint: "encaissés sur la flotte",
    },
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Espace agence</p>
        <h1 className="font-display text-3xl font-semibold">{agency.name}</h1>
        <p className="text-sm text-sand">
          La flotte — les marques que votre agence accompagne, avec palier, dernier score et
          état d&apos;abonnement. Équipe : {teamSize} {teamSize > 1 ? "membres" : "membre"}.
        </p>
      </header>

      <AgencyNav />

      {/* ── Compteurs ──────────────────────────────────────────────────── */}
      <section className="grid gap-bento sm:grid-cols-2 lg:grid-cols-4" aria-label="Compteurs de la flotte">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-line bg-ink-2 p-6">
            <p className="text-sm font-medium text-sand">{tile.label}</p>
            <p className="font-display mt-2 text-4xl font-semibold text-bone">{tile.value}</p>
            <p className="mt-1 text-xs text-smoke-2">{tile.hint}</p>
          </div>
        ))}
      </section>

      {/* ── Production & revenus (compteurs vivants → onglets) ────────── */}
      <section className="space-y-4" aria-label="Production et revenus">
        <div>
          <h2 className="font-display text-xl font-semibold">Production &amp; revenus</h2>
          <p className="text-sm text-sand">
            Comptés sur les tables réelles de la flotte — chaque carte ouvre sa vue détaillée.
          </p>
        </div>
        <div className="grid gap-bento sm:grid-cols-2 lg:grid-cols-4">
          {productionCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-lg border border-line bg-ink-2 p-6 transition-colors hover:border-coral/50"
            >
              <p className="flex items-center justify-between text-sm font-medium text-sand">
                {card.label}
                <ArrowRight
                  className="size-3.5 text-coral opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </p>
              <p className="font-display mt-2 text-4xl font-semibold text-bone">{card.value}</p>
              <p className="mt-1 text-xs text-smoke-2">{card.hint}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── La flotte ──────────────────────────────────────────────────── */}
      <section className="space-y-4" aria-label="Marques de la flotte">
        <div>
          <h2 className="font-display text-xl font-semibold">La flotte</h2>
          <p className="text-sm text-sand">
            Une marque entre dans la flotte quand un membre de l&apos;agence est invité dans son
            workspace.
          </p>
        </div>

        {brandRows.length === 0 ? (
          <EmptyState
            icon={<Building2 />}
            title="Aucune marque rattachée à l'agence"
            description="L'équipe n'a de membership dans aucun workspace marque pour l'instant. Dès qu'un membre est invité chez un client, sa marque apparaît ici — rien n'est inventé entre-temps."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-ink-2">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-3 font-semibold text-sand">Marque</th>
                  <th className="px-4 py-3 font-semibold text-sand">Client</th>
                  <th className="px-4 py-3 font-semibold text-sand">Palier</th>
                  <th className="px-4 py-3 font-semibold text-sand">Score</th>
                  <th className="px-4 py-3 font-semibold text-sand">Abonnement</th>
                </tr>
              </thead>
              <tbody>
                {brandRows.map(({ workspace, brand }) => (
                  <tr key={brand.id} className="border-b border-line-soft last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-bone">{brand.name}</p>
                      {brand.sector ? (
                        <p className="text-xs text-smoke-2">{brand.sector}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sand">
                      <Link
                        href={`/espace-agence/clients/${workspace.id}`}
                        className="transition-colors hover:text-coral"
                      >
                        {workspace.name}
                      </Link>{" "}
                      <span className="font-mono text-xs text-smoke-2">({workspace.slug})</span>
                    </td>
                    <td className="px-4 py-3">
                      <LevelBadge level={brand.level} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-sand">
                      {brand.score !== null
                        ? `${Math.round(brand.score)} / ${COMPOSITE_MAX_SCORE}`
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <SubscriptionBadge subscription={workspace.subscription} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {brandRows.length > 0 ? (
          <p className="text-xs text-smoke-2">
            Paliers : {Object.values(LEVEL_DEFINITIONS).map((def) => def.label).join(" → ")} —
            calculés par le moteur déterministe, jamais estimés.
          </p>
        ) : null}
      </section>

      {/* ── À venir (honnête — le legacy le servait, v7 pas encore) ───── */}
      <section className="space-y-4" aria-label="Fonctions à venir">
        <div>
          <h2 className="font-display text-xl font-semibold">À venir</h2>
          <p className="text-sm text-sand">
            Ce que l&apos;ancien portail agence servait et que v7 ne sait pas encore servir —
            ça reviendra branché sur de vraies tables, pas sur des chiffres décoratifs.
          </p>
        </div>
        <div className="grid gap-bento sm:grid-cols-3">
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-line bg-ink-2/50 p-6">
            <div className="flex items-center justify-between">
              <span className="text-smoke-2 [&_svg]:size-5" aria-hidden>
                <FileText />
              </span>
              <Badge variant="outline">À venir</Badge>
            </div>
            <h3 className="font-display text-base font-semibold text-bone">Contrats &amp; mandats</h3>
            <p className="text-sm leading-relaxed text-sand">
              La contractualisation des mandats clients n&apos;est pas encore portée en v7 — pas
              de table, pas d&apos;écran.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
