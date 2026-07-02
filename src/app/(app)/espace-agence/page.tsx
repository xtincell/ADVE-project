import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, FileText, Megaphone, Wallet } from "lucide-react";
import { readSession } from "@/lib/session";
import { getAgencyFleet, type FleetSubscriptionSnapshot } from "@/server/agency";
import { COMPOSITE_MAX_SCORE, LEVEL_DEFINITIONS } from "@/domain/scoring";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LevelBadge } from "@/components/pillars/level-badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Espace agence" };

/**
 * Espace agence (/espace-agence) — port de l'esprit du dashboard agence legacy
 * (legacy/src/app/(agency)/agency/page.tsx : clients / marques / score moyen)
 * ramené à ce que les tables v7 savent servir : la flotte réelle (workspaces
 * BRAND où l'équipe de l'agence a une membership), paliers, derniers
 * BrandScore, état d'abonnement. Missions, revenus et contrats n'existent pas
 * encore en v7 → cartes « à venir » honnêtes (WP-008), zéro donnée inventée.
 *
 * Garde : la route n'est pas couverte par le middleware (matcher /app + /admin
 * uniquement) — session vérifiée ici, appartenance agence vérifiée en DB.
 */

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const SUB_BADGE: Record<FleetSubscriptionSnapshot["status"], BadgeProps["variant"]> = {
  active: "coral",
  pending: "inverse",
  expired: "outline",
  none: "outline",
};

const SUB_LABEL: Record<FleetSubscriptionSnapshot["status"], string> = {
  active: "Actif",
  pending: "En validation",
  expired: "Échu",
  none: "Aucun",
};

function subscriptionDetail(sub: FleetSubscriptionSnapshot): string | null {
  if (sub.status === "active" && sub.expiresAt) {
    return `jusqu'au ${DATE_FORMAT.format(sub.expiresAt)}`;
  }
  if (sub.status === "expired" && sub.expiresAt) {
    return `le ${DATE_FORMAT.format(sub.expiresAt)}`;
  }
  return null;
}

/** Ce que le legacy servait et que v7 ne sait pas encore servir — affiché tel quel. */
const UPCOMING = [
  {
    icon: Megaphone,
    title: "Missions & campagnes",
    description:
      "Le pilotage Campagne → Action → Brief → Mission arrive avec le chantier campagnes — rien à afficher tant qu'il n'existe pas.",
  },
  {
    icon: Wallet,
    title: "Revenus & commissions",
    description:
      "Le suivi des revenus d'agence suivra les missions : aucun chiffre ne sera montré avant d'être calculé sur des données réelles.",
  },
  {
    icon: FileText,
    title: "Contrats & mandats",
    description:
      "La contractualisation des mandats clients n'est pas encore portée en v7.",
  },
] as const;

export default async function AgencePage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/espace-agence");

  const fleet = await getAgencyFleet(session);

  if (!fleet) {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="eyebrow text-coral">Espace agence</p>
          <h1 className="font-display text-3xl font-semibold">Agence</h1>
        </header>
        <EmptyState
          icon={<Building2 />}
          title="Espace réservé aux agences partenaires"
          description="Votre compte n'appartient à aucun workspace agence. Cet espace montre la flotte des marques qu'une agence accompagne — parlez-en à l'opérateur UPgraders si vous représentez une agence."
        >
          <Link href="/portails" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Voir mes espaces
          </Link>
        </EmptyState>
      </div>
    );
  }

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
                {brandRows.map(({ workspace, brand }) => {
                  const detail = subscriptionDetail(workspace.subscription);
                  return (
                    <tr key={brand.id} className="border-b border-line-soft last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-bone">{brand.name}</p>
                        {brand.sector ? (
                          <p className="text-xs text-smoke-2">{brand.sector}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sand">
                        {workspace.name}{" "}
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
                        <Badge variant={SUB_BADGE[workspace.subscription.status]}>
                          {SUB_LABEL[workspace.subscription.status]}
                        </Badge>
                        {detail ? (
                          <span className="ml-2 text-xs text-smoke-2">{detail}</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
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
            Ces vues existaient dans l&apos;ancien portail agence — elles reviendront branchées
            sur de vraies tables, pas sur des chiffres décoratifs.
          </p>
        </div>
        <div className="grid gap-bento sm:grid-cols-3">
          {UPCOMING.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-3 rounded-lg border border-dashed border-line bg-ink-2/50 p-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-smoke-2 [&_svg]:size-5" aria-hidden>
                  <item.icon />
                </span>
                <Badge variant="outline">À venir</Badge>
              </div>
              <h3 className="font-display text-base font-semibold text-bone">{item.title}</h3>
              <p className="text-sm leading-relaxed text-sand">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
