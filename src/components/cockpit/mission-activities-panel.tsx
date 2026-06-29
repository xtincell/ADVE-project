"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives";
import { StatusBadge } from "@/components/shared/status-badge";

/**
 * Fiche mission — couche d'exécution pilotable (pipeline staged).
 * Boutons de clôture (Terminer / Annuler) + dispatch pipe (Soumettre à La Guilde)
 * + activités par mission (asset/terrain, budget alloué, KPI cible/réel, brief
 * propre). La complétion d'une activité fait progresser la mission ; une activité
 * « conclut la mission » la termine. Tout est gouverné (trpc.mission.*).
 */

const TYPE_LABEL: Record<string, string> = {
  ASSET_CREATION: "Création d'asset",
  FIELD_ACTION: "Action terrain",
};

const BLANK = {
  type: "ASSET_CREATION",
  title: "",
  budgetAllocated: "",
  kpiLabel: "",
  kpiTarget: "",
  concludesMission: false,
};

export function MissionActivitiesPanel({
  missionId,
  missionStatus,
  onChanged,
}: {
  missionId: string;
  missionStatus: string;
  onChanged?: () => void;
}) {
  const utils = trpc.useUtils();
  const activitiesQuery = trpc.mission.listActivities.useQuery({ missionId });
  const healthQuery = trpc.mission.activityHealth.useQuery({ missionId });
  const activities = (activitiesQuery.data ?? []) as Array<Record<string, unknown>>;
  const health = healthQuery.data as
    | {
        total: number;
        done: number;
        progressPct: number;
        budgetAllocated: number;
        kpiTarget: number;
        kpiActual: number;
        kpiPct: number;
      }
    | undefined;

  const refresh = () => {
    utils.mission.listActivities.invalidate({ missionId });
    utils.mission.activityHealth.invalidate({ missionId });
    utils.mission.list.invalidate();
    onChanged?.();
  };

  const createMut = trpc.mission.createActivity.useMutation({
    onSuccess: () => {
      refresh();
      setShowAdd(false);
      setForm(BLANK);
    },
  });
  const completeMut = trpc.mission.completeActivity.useMutation({ onSuccess: refresh });
  const cancelActMut = trpc.mission.cancelActivity.useMutation({ onSuccess: refresh });
  const genBriefMut = trpc.mission.generateActivityBrief.useMutation({ onSuccess: refresh });
  const completeMissionMut = trpc.mission.complete.useMutation({ onSuccess: refresh });
  const cancelMissionMut = trpc.mission.cancel.useMutation({ onSuccess: refresh });
  const guildMut = trpc.mission.submitToGuild.useMutation({ onSuccess: refresh });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [kpiInputs, setKpiInputs] = useState<Record<string, string>>({});

  const terminal = missionStatus === "COMPLETED" || missionStatus === "CANCELLED";
  const busyMission = completeMissionMut.isPending || cancelMissionMut.isPending || guildMut.isPending;

  return (
    <div className="space-y-3">
      {/* Clôture + dispatch pipe */}
      {!terminal && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" disabled={busyMission} onClick={() => completeMissionMut.mutate({ id: missionId })}>
            Terminer la mission
          </Button>
          <Button size="sm" variant="destructive" disabled={busyMission} onClick={() => cancelMissionMut.mutate({ id: missionId })}>
            Annuler
          </Button>
          <Button size="sm" variant="subtle" disabled={busyMission} onClick={() => guildMut.mutate({ id: missionId })}>
            Soumettre à La Guilde
          </Button>
        </div>
      )}
      {guildMut.isSuccess && (
        <p className="text-2xs text-success">Mission soumise à La Guilde — en attente de modération opérateur.</p>
      )}

      {/* Avancement agrégé via activités */}
      {health && health.total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-surface-raised p-2">
            <p className="text-2xs uppercase text-foreground-muted">Avancement</p>
            <p className="text-sm font-bold text-foreground">
              {health.done}/{health.total} · {health.progressPct}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-raised p-2">
            <p className="text-2xs uppercase text-foreground-muted">Budget alloué</p>
            <p className="text-sm font-bold text-foreground">{health.budgetAllocated.toLocaleString("fr-FR")} XAF</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-raised p-2">
            <p className="text-2xs uppercase text-foreground-muted">KPI</p>
            <p className="text-sm font-bold text-foreground">
              {health.kpiActual.toLocaleString("fr-FR")}/{health.kpiTarget.toLocaleString("fr-FR")} · {health.kpiPct}%
            </p>
          </div>
        </div>
      )}

      {/* Activités */}
      <div className="space-y-2">
        {activitiesQuery.isLoading ? (
          <p className="text-xs text-foreground-muted">Chargement…</p>
        ) : activities.length === 0 ? (
          <p className="text-xs text-foreground-muted">
            Aucune activité. Découpe la mission en activités (création d&apos;asset / action terrain) avec budget alloué + KPI.
          </p>
        ) : (
          activities.map((a) => {
            const id = a.id as string;
            const status = (a.status as string) ?? "PENDING";
            const open = status !== "DONE" && status !== "CANCELLED";
            return (
              <div key={id} className="rounded-lg border border-border bg-background/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-surface-raised px-1.5 py-0.5 text-2xs text-foreground-secondary">
                        {TYPE_LABEL[a.type as string] ?? (a.type as string)}
                      </span>
                      <span className="text-sm font-medium text-foreground">{a.title as string}</span>
                      {!!a.concludesMission && (
                        <span className="rounded bg-accent/15 px-1.5 py-0.5 text-2xs text-accent">conclut la mission</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-2xs text-foreground-muted">
                      {a.budgetAllocated != null && (
                        <span>
                          {(a.budgetAllocated as number).toLocaleString("fr-FR")} {(a.budgetCurrency as string) ?? "XAF"}
                        </span>
                      )}
                      {!!a.kpiLabel && (
                        <span>
                          {a.kpiLabel as string}: {((a.kpiActual as number) ?? 0).toLocaleString("fr-FR")}/
                          {a.kpiTarget != null ? (a.kpiTarget as number).toLocaleString("fr-FR") : "—"}
                        </span>
                      )}
                      {!!a.briefContent && <span className="text-success">brief généré</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge status={status} />
                    {open && !terminal && (
                      <div className="flex items-center gap-1">
                        {!a.briefContent && (
                          <Button size="sm" variant="ghost" disabled={genBriefMut.isPending} onClick={() => genBriefMut.mutate({ activityId: id })}>
                            Brief
                          </Button>
                        )}
                        <input
                          className="w-14 rounded border border-border bg-background px-1 py-0.5 text-2xs text-foreground"
                          placeholder="KPI"
                          inputMode="numeric"
                          value={kpiInputs[id] ?? ""}
                          onChange={(e) => setKpiInputs((s) => ({ ...s, [id]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={completeMut.isPending}
                          onClick={() =>
                            completeMut.mutate({
                              activityId: id,
                              kpiActual: kpiInputs[id] ? Number(kpiInputs[id]) : undefined,
                            })
                          }
                        >
                          Terminer
                        </Button>
                        <Button size="sm" variant="ghost" disabled={cancelActMut.isPending} onClick={() => cancelActMut.mutate({ activityId: id })}>
                          ✕
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ajouter une activité */}
      {!terminal &&
        (showAdd ? (
          <div className="space-y-2 rounded-lg border border-border bg-surface-raised p-3">
            <input
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
              placeholder="Titre de l'activité"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="ASSET_CREATION">Création d&apos;asset</option>
                <option value="FIELD_ACTION">Action terrain</option>
              </select>
              <input
                className="w-28 rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                placeholder="Budget"
                inputMode="numeric"
                value={form.budgetAllocated}
                onChange={(e) => setForm({ ...form, budgetAllocated: e.target.value })}
              />
              <input
                className="w-28 rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                placeholder="KPI (label)"
                value={form.kpiLabel}
                onChange={(e) => setForm({ ...form, kpiLabel: e.target.value })}
              />
              <input
                className="w-24 rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                placeholder="Cible KPI"
                inputMode="numeric"
                value={form.kpiTarget}
                onChange={(e) => setForm({ ...form, kpiTarget: e.target.value })}
              />
              <label className="flex items-center gap-1 text-xs text-foreground-muted">
                <input
                  type="checkbox"
                  checked={form.concludesMission}
                  onChange={(e) => setForm({ ...form, concludesMission: e.target.checked })}
                />
                conclut la mission
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={!form.title || createMut.isPending}
                onClick={() =>
                  createMut.mutate({
                    missionId,
                    type: form.type as "ASSET_CREATION" | "FIELD_ACTION",
                    title: form.title,
                    budgetAllocated: form.budgetAllocated ? Number(form.budgetAllocated) : undefined,
                    kpiLabel: form.kpiLabel || undefined,
                    kpiTarget: form.kpiTarget ? Number(form.kpiTarget) : undefined,
                    concludesMission: form.concludesMission,
                  })
                }
              >
                Ajouter
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setShowAdd(true)}>
            + Ajouter une activité
          </Button>
        ))}
    </div>
  );
}
