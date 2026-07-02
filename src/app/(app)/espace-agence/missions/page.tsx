import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { readSession } from "@/lib/session";
import { groupByMissionStatus, listFleetMissions } from "@/server/agency";
import { MISSION_STATUS_LABELS } from "@/domain/campaign";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DATE_FORMAT, MissionStatusBadge } from "@/components/campaigns/status";
import { AgencyNav } from "../nav";
import { NoAgencyState } from "../no-agency";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Missions — Espace agence" };

/**
 * /espace-agence/missions — port de l'esprit de `(agency)/agency/missions`
 * legacy (toutes les missions du portefeuille, compteurs par état) sur le
 * circuit v7 OPEN → ASSIGNED → DELIVERED → VALIDATED. Chaque mission remonte
 * sa provenance réelle (campagne → action) et son client ; les candidatures
 * guilde en attente sont COMPTÉES depuis MissionApplication, jamais estimées.
 * Le legacy affichait priorité/SLA/livrables — pas de colonnes v7 : non montré.
 */
export default async function AgencyMissionsPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/espace-agence/missions");

  const data = await listFleetMissions(session);
  if (!data) return <NoAgencyState title="Missions" />;

  const { agency, missions } = data;
  const groups = groupByMissionStatus(missions);
  const pendingApplications = missions.reduce((sum, m) => sum + m.pendingApplications, 0);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Espace agence — {agency.name}</p>
        <h1 className="font-display text-3xl font-semibold">Missions</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-sand">
          Toutes les missions des marques de la flotte, groupées par étape du circuit.
          {pendingApplications > 0
            ? ` ${pendingApplications} candidature${pendingApplications > 1 ? "s" : ""} guilde en attente de décision.`
            : " Aucune candidature guilde en attente."}
        </p>
      </header>

      <AgencyNav />

      {/* ── Compteurs du circuit ─────────────────────────────────────── */}
      <section aria-label="Circuit" className="grid gap-bento sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((group) => (
          <div key={group.status} className="rounded-lg border border-line bg-ink-2 p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-smoke-2">
              {MISSION_STATUS_LABELS[group.status]}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-bone">
              {group.rows.length}
            </p>
          </div>
        ))}
      </section>

      {missions.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="Aucune mission dans la flotte"
          description="Les missions naissent des briefs validés des campagnes de vos clients. Dès qu'une marque de la flotte éclate un brief en missions, elles apparaissent ici."
        />
      ) : (
        <div className="space-y-8">
          {groups.map(({ status, rows }) => {
            if (rows.length === 0) return null;
            return (
              <section key={status} className="space-y-3" aria-label={MISSION_STATUS_LABELS[status]}>
                <h2 className="font-display text-xl font-semibold">
                  {MISSION_STATUS_LABELS[status]}
                  <span className="ml-2 text-sm font-normal text-smoke-2">({rows.length})</span>
                </h2>
                <div className="space-y-2.5">
                  {rows.map((mission) => (
                    <div
                      key={mission.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-ink-2 px-5 py-4"
                    >
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-display text-base font-semibold text-bone">
                            {mission.title}
                          </span>
                          {mission.openToGuild ? <Badge variant="outline">Guilde</Badge> : null}
                          {mission.pendingApplications > 0 ? (
                            <Badge variant="coral">
                              {mission.pendingApplications} candidature
                              {mission.pendingApplications > 1 ? "s" : ""} en attente
                            </Badge>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-smoke-2">
                          {mission.workspaceName} · {mission.brandName} · {mission.campaignName} ·{" "}
                          {mission.actionName}
                          {mission.assignee ? ` · ${mission.assignee}` : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-smoke-2">
                          {DATE_FORMAT.format(mission.createdAt)}
                        </span>
                        <MissionStatusBadge status={mission.status} />
                      </span>
                    </div>
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
