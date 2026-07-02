import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Rocket } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DATE_FORMAT,
  MissionStatusBadge,
} from "@/components/campaigns/status";
import {
  MISSION_STATUS_LABELS,
  MISSION_STATUSES,
  type MissionStatus,
} from "@/domain/campaign";
import { listMissions } from "@/server/campaigns";
import { requireSessionAndBrand } from "../campagnes/session-brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Missions" };

/**
 * /missions — vue transverse des missions de la marque (WP-008), groupées par
 * étape du circuit OPEN → ASSIGNED → DELIVERED → VALIDATED. Chaque mission
 * remonte sa provenance (campagne → action → brief) ; le détail et les gates
 * vivent sur la page mission.
 */
export default async function MissionsPage() {
  const { brand } = await requireSessionAndBrand("/missions");

  if (!brand) {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="eyebrow text-coral">Production</p>
          <h1 className="font-display text-3xl font-semibold">Missions</h1>
        </header>
        <EmptyState
          icon={<Rocket />}
          title="Aucune marque dans cet espace"
          description="Les missions naissent des campagnes d'une marque. Commencez par le diagnostic gratuit — il crée votre marque et ses piliers ADVE."
        >
          <Link href="/intake" className={buttonVariants({ variant: "primary", size: "md" })}>
            Commencer le diagnostic
          </Link>
        </EmptyState>
      </div>
    );
  }

  const missions = await listMissions(brand.id);
  const byStatus = new Map<MissionStatus, typeof missions>(
    MISSION_STATUSES.map((status) => [status, []]),
  );
  for (const mission of missions) {
    byStatus.get(mission.status as MissionStatus)?.push(mission);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Production</p>
        <h1 className="font-display text-3xl font-semibold">Missions</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-sand">
          Toutes les missions de {brand.name}, de l&apos;ouverture à la validation. Une mission
          naît toujours d&apos;un brief validé — jamais de nulle part.
        </p>
      </header>

      {/* ── Compteurs du circuit ─────────────────────────────────────── */}
      <section aria-label="Circuit" className="grid gap-bento sm:grid-cols-2 lg:grid-cols-4">
        {MISSION_STATUSES.map((status) => (
          <div key={status} className="rounded-lg border border-line bg-ink-2 p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-smoke-2">
              {MISSION_STATUS_LABELS[status]}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-bone">
              {byStatus.get(status)?.length ?? 0}
            </p>
          </div>
        ))}
      </section>

      {missions.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="Aucune mission"
          description="Le circuit : créez une campagne, ajoutez ses actions, transformez une action en brief, validez le brief puis éclatez-le en missions."
        >
          <Link href="/campagnes" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ouvrir les campagnes
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {MISSION_STATUSES.map((status) => {
            const rows = byStatus.get(status) ?? [];
            if (rows.length === 0) return null;
            return (
              <section key={status} className="space-y-3" aria-label={MISSION_STATUS_LABELS[status]}>
                <h2 className="font-display text-xl font-semibold">
                  {MISSION_STATUS_LABELS[status]}
                  <span className="ml-2 text-sm font-normal text-smoke-2">({rows.length})</span>
                </h2>
                <div className="space-y-2.5">
                  {rows.map((mission) => (
                    <Link
                      key={mission.id}
                      href={`/campagnes/${mission.brief.action.campaign.id}/mission/${mission.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-ink-2 px-5 py-4 transition-colors hover:border-coral/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-display text-base font-semibold text-bone">
                          {mission.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-smoke-2">
                          {mission.brief.action.campaign.name} · {mission.brief.action.name}
                          {mission.assignee ? ` · ${mission.assignee}` : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-smoke-2">
                          {DATE_FORMAT.format(mission.createdAt)}
                        </span>
                        <MissionStatusBadge status={mission.status} />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
