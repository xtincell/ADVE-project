import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { parsePage, PAGE_SIZE } from "@/server/admin";
import {
  APPLICATION_STATUS_LABELS,
  AVAILABILITY_LABELS,
  VISIBILITY_LABELS,
  type ApplicationStatus,
  type TalentAvailability,
  type TalentVisibility,
} from "@/domain/guild";
import { formatDailyRate } from "@/components/guild/status";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/components/ui/cn";
import { Pager } from "../../pager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Talents" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Variants lisibles sur fond CLAIR (les badges guild/status sont calés sombre). */
const AVAILABILITY_VARIANTS: Record<TalentAvailability, BadgeProps["variant"]> = {
  AVAILABLE: "gold",
  BUSY: "coral",
  UNAVAILABLE: "neutral",
};

const VISIBILITY_VARIANTS: Record<TalentVisibility, BadgeProps["variant"]> = {
  VISIBLE: "neutral",
  HIDDEN: "outline",
};

const APPLICATION_VARIANTS: Record<ApplicationStatus, BadgeProps["variant"]> = {
  APPLIED: "neutral",
  SHORTLISTED: "coral",
  ACCEPTED: "gold",
  DECLINED: "outline",
};

/** Filtres de la file de candidatures (dérivés des statuts réels, rien d'autre). */
const APPLICATION_FILTERS = ["toutes", "a_decider", "acceptees", "declinees"] as const;
type ApplicationFilter = (typeof APPLICATION_FILTERS)[number];

const APPLICATION_FILTER_LABELS: Record<ApplicationFilter, string> = {
  toutes: "Toutes",
  a_decider: "À décider",
  acceptees: "Acceptées",
  declinees: "Déclinées",
};

function parseApplicationFilter(raw: string | undefined): ApplicationFilter {
  return (APPLICATION_FILTERS as readonly string[]).includes(raw ?? "")
    ? (raw as ApplicationFilter)
    : "toutes";
}

function applicationWhere(filter: ApplicationFilter): Prisma.MissionApplicationWhereInput {
  switch (filter) {
    case "a_decider":
      return { status: { in: ["APPLIED", "SHORTLISTED"] } };
    case "acceptees":
      return { status: "ACCEPTED" };
    case "declinees":
      return { status: "DECLINED" };
    case "toutes":
      return {};
  }
}

type PageProps = { searchParams: Promise<{ candidatures?: string; page?: string }> };

/**
 * /admin/talents — la Guilde côté console (WP-020, esprit legacy
 * console/arene/guild + missions-guilde) : registre RÉEL des profils
 * TalentProfile cross-flotte + file des candidatures MissionApplication.
 * Lecture seule : les décisions (shortlister/accepter/décliner) restent une
 * action de la MARQUE sur sa page mission — l'opérateur surveille ici que
 * rien ne dort. Le tier/vecteur legacy n'a pas de colonnes v7 : non montré.
 */
export default async function AdminTalentsPage({ searchParams }: PageProps) {
  const { candidatures, page: rawPage } = await searchParams;
  const filter = parseApplicationFilter(candidatures);
  const page = parsePage(rawPage);
  const db = getDb();

  const [
    talentTotal,
    availableCount,
    hiddenCount,
    applicationCounts,
    talents,
    applications,
    applicationsShown,
  ] = await Promise.all([
    db.talentProfile.count(),
    db.talentProfile.count({ where: { availability: "AVAILABLE", visibility: "VISIBLE" } }),
    db.talentProfile.count({ where: { visibility: "HIDDEN" } }),
    db.missionApplication.groupBy({ by: ["status"], _count: { _all: true } }),
    db.talentProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        user: { select: { email: true } },
        country: { select: { name: true, currency: true } },
        _count: { select: { applications: true, missions: true } },
      },
    }),
    db.missionApplication.findMany({
      where: applicationWhere(filter),
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        talent: { select: { headline: true, user: { select: { email: true } } } },
        mission: {
          select: {
            title: true,
            status: true,
            brief: {
              select: {
                action: {
                  select: {
                    campaign: {
                      select: { name: true, brand: { select: { name: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.missionApplication.count({ where: applicationWhere(filter) }),
  ]);

  const countByStatus = (status: ApplicationStatus) =>
    applicationCounts.find((row) => row.status === status)?._count._all ?? 0;
  const pendingCount = countByStatus("APPLIED") + countByStatus("SHORTLISTED");

  const filterHref = (f: ApplicationFilter) =>
    f === "toutes" ? "/admin/talents" : `/admin/talents?candidatures=${f}`;

  const tiles = [
    { label: "Profils talents", value: talentTotal, hint: "comptes avec profil Guilde" },
    { label: "Disponibles", value: availableCount, hint: "visibles et disponibles" },
    {
      label: "Candidatures à décider",
      value: pendingCount,
      hint: "envoyées ou shortlistées — décision côté marque",
    },
    { label: "Acceptées", value: countByStatus("ACCEPTED"), hint: "missions gagnées via la Guilde" },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Console</p>
        <h1 className="font-display text-3xl font-semibold">Talents &amp; candidatures</h1>
        <p className="text-sm text-smoke">
          La Guilde cross-flotte : profils réels des créateurs et circuit des candidatures.
          Les décisions se prennent côté marque, sur la page de la mission — ici, on
          surveille que rien ne dort.
        </p>
      </header>

      <div className="grid gap-bento sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg bg-white p-6 shadow-card">
            <p className="text-sm font-medium text-smoke">{tile.label}</p>
            <p className="font-display mt-2 text-4xl font-semibold text-ink">{tile.value}</p>
            <p className="mt-1 text-xs text-smoke-2">{tile.hint}</p>
          </div>
        ))}
      </div>

      {/* ── Profils talents ────────────────────────────────────────────── */}
      <section className="space-y-4" aria-label="Profils talents">
        <h2 className="font-display text-xl font-semibold">
          Profils <span className="text-sm font-normal text-smoke">({talentTotal})</span>
        </h2>
        {talents.length === 0 ? (
          <EmptyState
            tone="light"
            icon={<Users />}
            title="Aucun profil talent"
            description="Les créateurs créent leur profil dans le Studio (/studio) — compétences, marché, tarif indicatif. Ils apparaîtront ici dès la première inscription."
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg bg-white shadow-card">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left">
                    <th className="px-4 py-3 font-semibold text-graphite">Talent</th>
                    <th className="px-4 py-3 font-semibold text-graphite">Marché</th>
                    <th className="px-4 py-3 font-semibold text-graphite">Compétences</th>
                    <th className="px-4 py-3 font-semibold text-graphite">Tarif indicatif</th>
                    <th className="px-4 py-3 font-semibold text-graphite">Disponibilité</th>
                    <th className="px-4 py-3 font-semibold text-graphite">Visibilité</th>
                    <th className="px-4 py-3 text-right font-semibold text-graphite">Candid.</th>
                    <th className="px-4 py-3 text-right font-semibold text-graphite">Missions</th>
                    <th className="px-4 py-3 font-semibold text-graphite">Inscrit le</th>
                  </tr>
                </thead>
                <tbody>
                  {talents.map((talent) => (
                    <tr key={talent.id} className="border-b border-ink/5 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{talent.headline}</p>
                        <p className="font-mono text-xs text-smoke-2">{talent.user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-graphite">
                        {talent.city}, {talent.country.name}
                      </td>
                      <td className="max-w-56 px-4 py-3 text-xs text-graphite">
                        {talent.skills.length > 0
                          ? talent.skills.slice(0, 3).join(" · ") +
                            (talent.skills.length > 3 ? ` (+${talent.skills.length - 3})` : "")
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-graphite">
                        {talent.dailyRate !== null
                          ? formatDailyRate(talent.dailyRate, talent.country.currency)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={AVAILABILITY_VARIANTS[talent.availability]}>
                          {AVAILABILITY_LABELS[talent.availability]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={VISIBILITY_VARIANTS[talent.visibility]}>
                          {VISIBILITY_LABELS[talent.visibility]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-graphite">
                        {talent._count.applications}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-graphite">
                        {talent._count.missions}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                        {DATE_FORMAT.format(talent.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager pathname="/admin/talents" params={{ candidatures }} page={page} total={talentTotal} />
          </>
        )}
      </section>

      {/* ── Candidatures ───────────────────────────────────────────────── */}
      <section className="space-y-4" aria-label="Candidatures">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-semibold">
            Candidatures{" "}
            <span className="text-sm font-normal text-smoke">({applicationsShown})</span>
          </h2>
          <div role="tablist" aria-label="Filtrer les candidatures" className="flex flex-wrap gap-1.5">
            {APPLICATION_FILTERS.map((f) => (
              <Link
                key={f}
                role="tab"
                aria-selected={filter === f}
                href={filterHref(f)}
                className={cn(
                  "rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors",
                  filter === f
                    ? "border-ink bg-ink text-bone"
                    : "border-ink/15 text-graphite hover:border-ink/40",
                )}
              >
                {APPLICATION_FILTER_LABELS[f]}
              </Link>
            ))}
          </div>
        </div>
        {applications.length === 0 ? (
          <EmptyState
            tone="light"
            icon={<Users />}
            title="Aucune candidature"
            description="Les candidatures naissent sur le mur des missions du Studio : un talent, un pitch, une mission ouverte à la Guilde. Rien d'inventé — la file se remplit avec l'activité réelle."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Talent</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Mission</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Marque · campagne</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Statut</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Envoyée le</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Décidée le</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => {
                  const campaign = application.mission.brief.action.campaign;
                  return (
                    <tr key={application.id} className="border-b border-ink/5 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{application.talent.headline}</p>
                        <p className="font-mono text-xs text-smoke-2">
                          {application.talent.user.email}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-graphite">{application.mission.title}</td>
                      <td className="px-4 py-3 text-graphite">
                        {campaign.brand.name}{" "}
                        <span className="text-xs text-smoke-2">· {campaign.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={APPLICATION_VARIANTS[application.status]}>
                          {APPLICATION_STATUS_LABELS[application.status]}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                        {DATE_FORMAT.format(application.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                        {application.decidedAt ? DATE_FORMAT.format(application.decidedAt) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-smoke-2">
          Les 100 plus récentes du filtre courant. Décision = action de la marque sur sa page
          mission (accepter y assigne la mission et décline les candidatures sœurs).
        </p>
      </section>
    </div>
  );
}
