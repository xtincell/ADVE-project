"use client";

/**
 * Fiche mission founder (ADR-0144) — ouverte au clic depuis la vue d'ensemble
 * de la campagne. Une seule vue, dans le cockpit :
 *  1. le BRIEF complet (consultable AVANT toute validation) ;
 *  2. « Démarrer la mission » (founder-safe, DRAFT → en cours) ;
 *  3. le RÉTROPLANNING : les tâches datées (à faire / faites) avec cocher ;
 *  4. la PERFORMANCE réelle (KPI saisis) + l'état HONNÊTE des sources
 *     (connecté / à connecter — jamais un zéro fabriqué).
 *
 * Réutilise les procédures gouvernées founder-safe : mission.start,
 * campaignManager.setBrandActionStatus, campaignManager.recordAARRMetric,
 * campaignManager.getMissionCockpit. Vocabulaire client uniquement.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/shared/notification-toast";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyMsg } from "./shared";
import { Rocket, CheckCircle2, Circle, ClipboardList, BarChart3, PlugZap, Plus } from "lucide-react";

const AARR_STAGES = [
  { key: "ACQUISITION", label: "Acquisition" },
  { key: "ACTIVATION", label: "Activation" },
  { key: "RETENTION", label: "Rétention" },
  { key: "REFERRAL", label: "Recommandation" },
  { key: "REVENUE", label: "Revenu" },
] as const;

const BRIEF_LABELS: Record<string, string> = {
  objective: "Objectif",
  targetPersona: "Cible",
  keyMessage: "Message clé",
  deliverablesExpected: "Livrables attendus",
  pillarPriority: "Priorité",
  tone: "Ton",
  budget: "Budget",
  currency: "Devise",
  deadline: "Échéance",
  prerequis: "Prérequis",
  metriques: "Objectifs chiffrés",
  risques: "Risques",
  expansionCibles: "Cibles d'expansion",
  decisionsRequises: "Décisions requises",
  ambassadeurBudget: "Budget ambassadeurs",
};

function fmtDate(v: unknown): string {
  if (!v) return "—";
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
function fmtRange(start: unknown, end: unknown): string {
  const s = fmtDate(start);
  if (!end) return s;
  const e = fmtDate(end);
  return e === s ? s : `${s} → ${e}`;
}

/** Rendu lisible d'une valeur de brief (string / nombre / liste / objet). */
function BriefValue({ value }: { value: unknown }) {
  if (value == null || value === "") return <span className="text-foreground-muted">—</span>;
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-0.5 pl-4">
        {value.map((v, i) => (
          <li key={i} className="text-sm text-white">{typeof v === "object" ? JSON.stringify(v) : String(v)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <div className="space-y-1.5">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <p className="text-2xs font-medium uppercase tracking-wide text-foreground-muted">{BRIEF_LABELS[k] ?? k}</p>
            <BriefValue value={v} />
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-sm text-white">{String(value)}</p>;
}

function BriefView({ brief }: { brief: Record<string, unknown> }) {
  const entries = Object.entries(brief).filter(([k]) => k !== "status" && k !== "validatedAt" && k !== "validatedBy");
  if (entries.length === 0) return <EmptyMsg text="Aucun brief renseigné pour cette mission." />;
  return (
    <div className="space-y-3">
      {entries.map(([k, v]) => (
        <div key={k}>
          <p className="text-2xs font-semibold uppercase tracking-wide text-foreground-muted">{BRIEF_LABELS[k] ?? k}</p>
          <div className="mt-0.5"><BriefValue value={v} /></div>
        </div>
      ))}
    </div>
  );
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  touchpoint: string | null;
  timingStart: string | null;
  timingEnd: string | null;
  metadata: Record<string, unknown> | null;
}
interface MetricRow { id: string; stage: string; metric: string; value: number; target: number | null; period: string }

export function MissionDetailModal({
  campaignId,
  mission,
  open,
  onClose,
  onRefresh,
}: {
  campaignId: string;
  mission: Record<string, unknown> | null;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}) {
  const utils = trpc.useUtils();
  const toast = useToast();
  const missionId = (mission?.id as string) ?? "";
  const status = (mission?.status as string) ?? "DRAFT";

  const [confirmStart, setConfirmStart] = useState(false);
  const [metricStage, setMetricStage] = useState<string>("ACQUISITION");
  const [metricLabel, setMetricLabel] = useState("");
  const [metricValue, setMetricValue] = useState("");
  const [metricTarget, setMetricTarget] = useState("");

  const cockpit = trpc.campaignManager.getMissionCockpit.useQuery(
    { campaignId, missionId },
    { enabled: open && !!missionId },
  );

  const refreshCockpit = () => utils.campaignManager.getMissionCockpit.invalidate({ campaignId, missionId });

  const startMut = trpc.mission.start.useMutation({
    onSuccess: () => { toast.success("Mission lancée."); onRefresh?.(); },
    onError: (e) => toast.error(e.message),
  });
  const taskMut = trpc.campaignManager.setBrandActionStatus.useMutation({
    onSuccess: refreshCockpit,
    onError: (e) => toast.error(e.message),
  });
  const metricMut = trpc.campaignManager.recordAARRMetric.useMutation({
    onSuccess: () => { refreshCockpit(); setMetricLabel(""); setMetricValue(""); setMetricTarget(""); toast.success("Chiffre enregistré."); },
    onError: (e) => toast.error(e.message),
  });

  if (!mission) return null;

  const data = cockpit.data;
  const tasks = (data?.tasks ?? []) as unknown as TaskRow[];
  const metrics = (data?.metrics ?? []) as unknown as MetricRow[];
  const sources = data?.sources ?? [];
  const done = data?.execution?.done ?? 0;
  const total = data?.execution?.total ?? 0;

  // Tâches groupées par phase (metadata.phase), triées par date.
  const byPhase = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    const phase = (t.metadata?.phase as string) ?? "Tâches";
    if (!byPhase.has(phase)) byPhase.set(phase, []);
    byPhase.get(phase)!.push(t);
  }

  const metricsByStage = new Map<string, MetricRow[]>();
  for (const m of metrics) {
    if (!metricsByStage.has(m.stage)) metricsByStage.set(m.stage, []);
    metricsByStage.get(m.stage)!.push(m);
  }

  const brief = (mission.briefData as Record<string, unknown> | null) ?? {};

  const submitMetric = () => {
    const value = Number(metricValue);
    if (!metricLabel.trim() || Number.isNaN(value)) { toast.error("Renseigne un intitulé et une valeur."); return; }
    metricMut.mutate({
      campaignId,
      stage: metricStage as "ACQUISITION" | "ACTIVATION" | "RETENTION" | "REFERRAL" | "REVENUE",
      metric: metricLabel.trim(),
      value,
      target: metricTarget ? Number(metricTarget) : undefined,
      period: new Date().toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={(mission.title as string) ?? "Mission"} size="xl">
      <div className="space-y-6">
        {/* Header — statut + lancement */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {total > 0 && (
              <span className="text-xs text-foreground-secondary">{done}/{total} tâche{total > 1 ? "s" : ""} faite{done > 1 ? "s" : ""}</span>
            )}
          </div>
          {status === "DRAFT" && (
            <button
              onClick={() => setConfirmStart(true)}
              disabled={startMut.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent/85 disabled:opacity-50"
            >
              <Rocket className="h-3.5 w-3.5" />
              {startMut.isPending ? "Lancement…" : "Démarrer la mission"}
            </button>
          )}
        </div>

        {/* Brief — consultable avant validation */}
        <section className="rounded-xl border border-border bg-background/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <ClipboardList className="h-4 w-4 text-foreground-secondary" /> Brief de la mission
          </h3>
          <BriefView brief={brief} />
        </section>

        {/* Rétroplanning — tâches datées + cocher */}
        <section className="rounded-xl border border-border bg-background/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <CheckCircle2 className="h-4 w-4 text-foreground-secondary" /> Rétroplanning — les tâches et quand
          </h3>
          {cockpit.isLoading ? (
            <p className="text-xs text-foreground-muted">Chargement…</p>
          ) : tasks.length === 0 ? (
            <EmptyMsg text="Aucune tâche datée rattachée à cette mission pour l'instant." />
          ) : (
            <div className="space-y-4">
              {[...byPhase.entries()].map(([phase, rows]) => (
                <div key={phase}>
                  <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-foreground-muted">{phase}</p>
                  <div className="space-y-1.5">
                    {rows.map((t) => {
                      const doneTask = t.status === "EXECUTED";
                      return (
                        <div key={t.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-background/50 p-2.5">
                          <button
                            onClick={() => taskMut.mutate({ brandActionId: t.id, status: doneTask ? "SCHEDULED" : "EXECUTED" })}
                            disabled={taskMut.isPending}
                            className="mt-0.5 shrink-0 transition-colors disabled:opacity-50"
                            aria-label={doneTask ? "Marquer à faire" : "Marquer fait"}
                          >
                            {doneTask
                              ? <CheckCircle2 className="h-5 w-5 text-success" />
                              : <Circle className="h-5 w-5 text-foreground-muted hover:text-foreground-secondary" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium ${doneTask ? "text-foreground-muted line-through" : "text-white"}`}>{t.title}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-2xs text-foreground-muted">
                              <span>{fmtRange(t.timingStart, t.timingEnd)}</span>
                              {t.touchpoint && <span className="rounded bg-surface-raised px-1.5 py-0.5">{t.touchpoint}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Performance — KPI réels saisis + sources honnêtes */}
        <section className="rounded-xl border border-border bg-background/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <BarChart3 className="h-4 w-4 text-foreground-secondary" /> Performance réelle
          </h3>

          {metrics.length === 0 ? (
            <EmptyMsg text="Aucun chiffre encore. Saisis tes vrais résultats ci-dessous — ils s'affichent ici, au même endroit que le reste." />
          ) : (
            <div className="space-y-3">
              {AARR_STAGES.filter((s) => metricsByStage.has(s.key)).map((s) => (
                <div key={s.key}>
                  <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-foreground-muted">{s.label}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {metricsByStage.get(s.key)!.map((m) => (
                      <div key={m.id} className="rounded-lg border border-border bg-background/50 p-2">
                        <p className="truncate text-2xs text-foreground-muted" title={m.metric}>{m.metric}</p>
                        <p className="text-sm font-bold text-white">
                          {m.value.toLocaleString("fr-FR")}
                          {m.target != null && <span className="text-2xs font-normal text-foreground-muted"> / {m.target.toLocaleString("fr-FR")}</span>}
                        </p>
                        <p className="text-2xs text-foreground-muted">{m.period}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Saisie founder d'un chiffre réel */}
          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border/50 pt-3">
            <label className="flex flex-col gap-0.5">
              <span className="text-2xs uppercase text-foreground-muted">Étape</span>
              <select
                value={metricStage}
                onChange={(e) => setMetricStage(e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-white"
              >
                {AARR_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-0.5">
              <span className="text-2xs uppercase text-foreground-muted">Intitulé</span>
              <input
                value={metricLabel}
                onChange={(e) => setMetricLabel(e.target.value)}
                placeholder="ex. Spawters actifs, leads quiz, conversion premium…"
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-white placeholder:text-foreground-muted"
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-2xs uppercase text-foreground-muted">Valeur</span>
              <input
                value={metricValue}
                onChange={(e) => setMetricValue(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-white placeholder:text-foreground-muted"
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-2xs uppercase text-foreground-muted">Cible</span>
              <input
                value={metricTarget}
                onChange={(e) => setMetricTarget(e.target.value)}
                inputMode="numeric"
                placeholder="—"
                className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-white placeholder:text-foreground-muted"
              />
            </label>
            <button
              onClick={submitMetric}
              disabled={metricMut.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-surface-raised disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Enregistrer
            </button>
          </div>

          {/* Sources de données — état honnête */}
          <div className="mt-4 border-t border-border/50 pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-foreground-muted">
              <PlugZap className="h-3.5 w-3.5" /> Sources de données
            </p>
            <div className="flex flex-wrap gap-2">
              {sources.map((s) => (
                <span
                  key={s.key}
                  title={s.note ?? undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium ring-1 ring-inset ${
                    s.connected ? "bg-success/10 text-success ring-success/30" : "bg-warning/10 text-warning ring-warning/30"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${s.connected ? "bg-success" : "bg-warning"}`} />
                  {s.label} · {s.connected ? "connecté" : "à connecter"}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmStart}
        onClose={() => setConfirmStart(false)}
        onConfirm={() => { setConfirmStart(false); startMut.mutate({ missionId }); }}
        variant="info"
        title="Démarrer la mission ?"
        message="La mission passe « en cours ». Tu pourras cocher tes tâches au fur et à mesure et suivre la performance ici."
        confirmLabel="Démarrer"
      />
    </Modal>
  );
}
