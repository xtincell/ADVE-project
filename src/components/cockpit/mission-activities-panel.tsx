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

const T0_SOURCE_LABEL: Record<string, string> = {
  CAMPAIGN_LAUNCH: "lancement campagne",
  SLA_DEADLINE: "échéance SLA",
  TODAY_FALLBACK: "aujourd'hui (défaut)",
  OVERRIDE: "date choisie",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

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
    utils.mission.retroplan.invalidate({ missionId });
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
  const regenerateMut = trpc.mission.regenerateActivities.useMutation({ onSuccess: refresh });
  const assignActMut = trpc.mission.assignActivity.useMutation({ onSuccess: refresh });
  const updateBriefMut = trpc.mission.updateActivityBrief.useMutation({
    onSuccess: () => { refresh(); setOpenBrief(null); },
  });
  const setDurationMut = trpc.mission.setActivityDuration.useMutation({ onSuccess: refresh });

  const terminalEarly = missionStatus === "COMPLETED" || missionStatus === "CANCELLED";
  const talentQuery = trpc.mission.suggestTalent.useQuery({ missionId }, { enabled: !terminalEarly });
  const candidates = (talentQuery.data ?? []) as Array<{ userId: string; displayName?: string | null; tier?: string | null }>;
  const candidateName = (uid: string | null | undefined): string =>
    (uid && candidates.find((c) => c.userId === uid)?.displayName) || (uid ? "Prestataire assigné" : "");
  const retroQuery = trpc.mission.retroplan.useQuery({ missionId }, { enabled: !terminalEarly });
  const retro = retroQuery.data;

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [kpiInputs, setKpiInputs] = useState<Record<string, string>>({});
  const [openBrief, setOpenBrief] = useState<string | null>(null);
  const [briefDraft, setBriefDraft] = useState<Record<string, string>>({});
  const [durInputs, setDurInputs] = useState<Record<string, string>>({});

  const terminal = terminalEarly;
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
                      {!!a.briefContent && (
                        <button
                          type="button"
                          className="text-success underline-offset-2 hover:underline"
                          onClick={() => {
                            setOpenBrief((cur) => (cur === id ? null : id));
                            setBriefDraft((s) => ({ ...s, [id]: s[id] ?? JSON.stringify(a.briefContent, null, 2) }));
                          }}
                        >
                          brief généré · voir / éditer
                        </button>
                      )}
                      {!!a.assigneeId && <span className="text-foreground-secondary">⚡ {candidateName(a.assigneeId as string)}</span>}
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

                {/* Attribution prestataire (miroir de mission.assign, suggestTalent réutilisé) */}
                {open && !terminal && (
                  <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
                    <span className="text-2xs uppercase text-foreground-muted">Prestataire</span>
                    <select
                      className="rounded border border-border bg-background px-2 py-0.5 text-2xs text-foreground"
                      value={(a.assigneeId as string) ?? ""}
                      disabled={assignActMut.isPending}
                      onChange={(e) => assignActMut.mutate({ activityId: id, assigneeId: e.target.value || null })}
                    >
                      <option value="">— non attribué —</option>
                      {candidates.map((c) => (
                        <option key={c.userId} value={c.userId}>
                          {(c.displayName ?? c.userId) + (c.tier ? ` · ${c.tier}` : "")}
                        </option>
                      ))}
                    </select>
                    {talentQuery.isLoading ? <span className="text-2xs text-foreground-muted">…</span> : null}
                    <span className="ml-auto text-2xs uppercase text-foreground-muted">Durée (j)</span>
                    <input
                      className="w-14 rounded border border-border bg-background px-1 py-0.5 text-2xs text-foreground"
                      placeholder="auto"
                      inputMode="numeric"
                      title="Durée fixée (jours). Vide ⇒ dérivée par type d'activité."
                      value={durInputs[id] ?? (a.durationDays != null ? String(a.durationDays) : "")}
                      onChange={(e) => setDurInputs((s) => ({ ...s, [id]: e.target.value }))}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const n = v ? Number(v) : null;
                        setDurationMut.mutate({ activityId: id, durationDays: n && n > 0 ? Math.round(n) : null });
                      }}
                    />
                  </div>
                )}

                {/* Brief de l'activité — visible + éditable */}
                {openBrief === id && (
                  <div className="mt-2 space-y-2 border-t border-border pt-2">
                    <textarea
                      className="h-40 w-full rounded border border-border bg-background px-2 py-1 font-mono text-2xs text-foreground"
                      value={briefDraft[id] ?? ""}
                      onChange={(e) => setBriefDraft((s) => ({ ...s, [id]: e.target.value }))}
                    />
                    {!terminal && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={updateBriefMut.isPending}
                          onClick={() => {
                            try {
                              const parsed = JSON.parse(briefDraft[id] ?? "{}") as Record<string, unknown>;
                              updateBriefMut.mutate({ activityId: id, briefContent: parsed });
                            } catch {
                              window.alert("Brief invalide : JSON mal formé.");
                            }
                          }}
                        >
                          Enregistrer le brief
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setOpenBrief(null)}>Fermer</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Rétroplanning ancré sur T0 (déterministe) */}
      {retro && retro.slots.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-raised p-3">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <p className="text-2xs font-bold uppercase text-foreground-muted">Rétroplanning</p>
            <p className="text-2xs text-foreground-muted">
              T0 = {fmtDate(retro.t0)} ({T0_SOURCE_LABEL[retro.t0Source] ?? retro.t0Source}) · fenêtre {retro.totalDurationDays} j dès le {fmtDate(retro.startDate)}
            </p>
          </div>
          <ul className="mt-2 space-y-1">
            {retro.slots.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-2xs">
                <span className="min-w-0 flex-1 truncate text-foreground-secondary">{s.title ?? s.id}</span>
                <span className="shrink-0 tabular-nums text-foreground-muted">J{s.startOffsetDays} → J{s.endOffsetDays}</span>
                <span className="shrink-0 tabular-nums text-foreground-muted">{fmtDate(s.startDate)}–{fmtDate(s.endDate)}</span>
                <span className={`shrink-0 tabular-nums ${s.durationDerived ? "text-foreground-muted" : "text-foreground"}`}>
                  {s.durationDays} j{s.durationDerived ? " · auto" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(true)}>
              + Ajouter une activité
            </Button>
            {activities.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                disabled={regenerateMut.isPending}
                onClick={() => {
                  if (window.confirm("Régénérer les activités ? Les activités actuelles seront remplacées par le jeu par défaut (déterministe, dérivé du brief).")) regenerateMut.mutate({ missionId });
                }}
              >
                ↻ Régénérer les activités
              </Button>
            )}
          </div>
        ))}
    </div>
  );
}
