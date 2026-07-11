"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { Section, MiniBtn, KV, EmptyMsg } from "./shared";
import { ArrowRight, BarChart3, MapPin, Megaphone, Plus, Sparkles } from "lucide-react";

export function AARRRTab({ campaignId, budget }: { campaignId: string; budget?: number }) {
  const [showRecord, setShowRecord] = useState(false);
  const [recoStage, setRecoStage] = useState("ACQUISITION");
  const [newMetric, setNewMetric] = useState({ stage: "ACQUISITION", metric: "", value: "", target: "", period: new Date().toISOString().slice(0, 7) });

  const aarrrQuery = trpc.campaignManager.getAARRReport.useQuery({ campaignId });
  const unifiedQuery = trpc.campaignManager.getUnifiedAARRR.useQuery({ campaignId });
  const opsQuery = trpc.campaignManager.listFieldOps.useQuery({ campaignId });
  const reportsQuery = trpc.campaignManager.listFieldReports.useQuery({ campaignId });
  const ampMetricsQuery = trpc.campaignManager.getAmplificationMetrics.useQuery({ campaignId });
  const recordMut = trpc.campaignManager.recordAARRMetric.useMutation({
    onSuccess: () => { aarrrQuery.refetch(); unifiedQuery.refetch(); setShowRecord(false); setNewMetric({ stage: "ACQUISITION", metric: "", value: "", target: "", period: new Date().toISOString().slice(0, 7) }); },
  });

  const recoQuery = trpc.campaignManager.getRecommendationsForFunnel.useQuery({ funnelStage: recoStage as "ACQUISITION", budget: budget ?? 1000000 });

  const aarrr = aarrrQuery.data as { stages?: Array<{ stage: string; metrics?: Array<{ metric: string; value: number; target?: number }> }> } | null;
  const unified = unifiedQuery.data as Record<string, unknown> | null;
  const recos = (recoQuery.data ?? []) as Array<Record<string, unknown>>;
  const ops = (opsQuery.data ?? []) as Array<Record<string, unknown>>;
  const fieldReports = (reportsQuery.data ?? []) as Array<Record<string, unknown>>;
  const ampMetrics = ampMetricsQuery.data as { totals: { budget: number; impressions: number; clicks: number; conversions: number; reach: number; views: number; engagements: number; mediaCost: number; productionCost: number; agencyFee: number }; calculated: { cpm: number | null; cpc: number | null; ctr: number | null; cpv: number | null } } | null;

  const STAGES = ["ACQUISITION", "ACTIVATION", "RETENTION", "REFERRAL", "REVENUE"];
  const STAGE_COLORS: Record<string, string> = {
    ACQUISITION: "border-info bg-info/20",
    ACTIVATION: "border-success bg-success/20",
    RETENTION: "border-warning bg-warning/20",
    REFERRAL: "border-accent bg-accent/20",
    REVENUE: "border-error bg-error/20",
  };
  const STAGE_TEXT_COLORS: Record<string, string> = {
    ACQUISITION: "text-info", ACTIVATION: "text-success", RETENTION: "text-warning",
    REFERRAL: "text-accent", REVENUE: "text-error",
  };

  // Aggregate field report data by AARRR stage
  const fieldTotals = { ACQUISITION: 0, ACTIVATION: 0, RETENTION: 0, REVENUE: 0, REFERRAL: 0 };
  for (const r of fieldReports) {
    if (r.status === "VALIDATED" || r.status === "SUBMITTED") {
      fieldTotals.ACQUISITION += (r.acquisitionCount as number) ?? 0;
      fieldTotals.ACTIVATION += (r.activationCount as number) ?? 0;
      fieldTotals.RETENTION += (r.retentionCount as number) ?? 0;
      fieldTotals.REVENUE += (r.revenueCount as number) ?? 0;
      fieldTotals.REFERRAL += (r.referralCount as number) ?? 0;
    }
  }

  // Compute conversion rates between stages
  const ft = fieldTotals as Record<string, number>;
  const conversionRates: Array<{ from: string; to: string; rate: number | null }> = [];
  for (let i = 0; i < STAGES.length - 1; i++) {
    const fromVal = ft[STAGES[i]!] ?? 0;
    const toVal = ft[STAGES[i + 1]!] ?? 0;
    conversionRates.push({
      from: STAGES[i]!,
      to: STAGES[i + 1]!,
      rate: fromVal > 0 ? toVal / fromVal : null,
    });
  }

  return (
    <div className="space-y-5">
      {/* Performance at-a-glance */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STAGES.map((stage) => (
          <div key={stage} className={`rounded-lg border p-3 ${STAGE_COLORS[stage]}`}>
            <p className="text-2xs font-bold uppercase text-foreground-muted">{stage}</p>
            <p className={`text-xl font-bold ${STAGE_TEXT_COLORS[stage]}`}>{(ft[stage] ?? 0).toLocaleString("fr-FR")}</p>
            <p className="text-2xs text-foreground-muted">terrain</p>
          </div>
        ))}
      </div>

      {/* Conversion rates */}
      {conversionRates.some((c) => c.rate != null) && (
        <Section title="Taux de conversion entre etapes" icon={ArrowRight}>
          <div className="flex items-center gap-2 overflow-x-auto py-2">
            {conversionRates.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="h-3 w-3 text-foreground-muted" />}
                <div className="flex-shrink-0 rounded-lg border border-border bg-background/50 p-2 text-center">
                  <p className="text-2xs text-foreground-muted">{c.from} → {c.to}</p>
                  <p className={`text-lg font-bold ${c.rate != null && c.rate > 0.5 ? "text-success" : c.rate != null && c.rate > 0.2 ? "text-warning" : "text-error"}`}>
                    {c.rate != null ? `${(c.rate * 100).toFixed(1)}%` : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Digital metrics (from amplifications) */}
      {ampMetrics && ampMetrics.totals.impressions > 0 && (
        <Section title="Performance digitale (amplifications)" icon={Megaphone}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KV label="Impressions" value={ampMetrics.totals.impressions.toLocaleString("fr-FR")} />
            <KV label="Clicks" value={ampMetrics.totals.clicks.toLocaleString("fr-FR")} />
            <KV label="CTR" value={ampMetrics.calculated.ctr != null ? `${(ampMetrics.calculated.ctr * 100).toFixed(2)}%` : "—"} />
            <KV label="Conversions" value={ampMetrics.totals.conversions.toLocaleString("fr-FR")} />
            <KV label="CPC" value={ampMetrics.calculated.cpc != null ? `${ampMetrics.calculated.cpc.toFixed(0)} XAF` : "—"} />
            <KV label="CPM" value={ampMetrics.calculated.cpm != null ? `${ampMetrics.calculated.cpm.toFixed(0)} XAF` : "—"} />
            <KV label="Reach" value={ampMetrics.totals.reach.toLocaleString("fr-FR")} />
            <KV label="Engagements" value={ampMetrics.totals.engagements.toLocaleString("fr-FR")} />
          </div>
        </Section>
      )}

      {/* Funnel visualization */}
      <Section
        title="Entonnoir AARRR"
        icon={BarChart3}
        action={<MiniBtn variant="primary" onClick={() => setShowRecord(true)}><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Enregistrer</span></MiniBtn>}
      >
        {aarrrQuery.isLoading ? <EmptyMsg text="Chargement..." /> : !aarrr?.stages || aarrr.stages.length === 0 ? (
          <EmptyMsg text="Aucune donnee AARRR. Enregistrez vos premieres metriques." />
        ) : (
          <div className="space-y-3">
            {STAGES.map((stage, idx) => {
              const stageData = aarrr.stages?.find((s) => s.stage === stage);
              return (
                <div key={stage} className={`rounded-lg border p-4 ${STAGE_COLORS[stage] ?? "border-border bg-background/50"}`} style={{ marginLeft: `${idx * 2}%`, marginRight: `${idx * 2}%` }}>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-bold text-white">{stage}</h5>
                    {(fieldTotals as Record<string, number>)[stage]! > 0 && <span className="text-2xs text-foreground-muted">Terrain: {(fieldTotals as Record<string, number>)[stage]!.toLocaleString("fr-FR")}</span>}
                  </div>
                  {stageData?.metrics && stageData.metrics.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {stageData.metrics.map((m) => (
                        <div key={m.metric}>
                          <p className="text-2xs text-foreground-muted">{m.metric}</p>
                          <p className="text-sm font-semibold text-white">
                            {m.value.toLocaleString("fr-FR")}
                            {m.target && (
                              <>
                                <span className="text-xs text-foreground-muted"> / {m.target.toLocaleString("fr-FR")}</span>
                                <span className={`ml-1 text-2xs ${m.value >= m.target ? "text-success" : "text-warning"}`}>
                                  ({((m.value / m.target) * 100).toFixed(0)}%)
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground-muted">Pas de donnees</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Per-operation breakdown */}
      {ops.length > 0 && (
        <Section title="Performance par operation terrain" icon={MapPin}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-foreground-muted">
                  <th className="py-2 text-left font-medium">Operation</th>
                  <th className="py-2 text-right font-medium">Acquisition</th>
                  <th className="py-2 text-right font-medium">Activation</th>
                  <th className="py-2 text-right font-medium">Retention</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                  <th className="py-2 text-right font-medium">Referral</th>
                  <th className="py-2 text-right font-medium">Rapports</th>
                </tr>
              </thead>
              <tbody>
                {ops.map((op) => {
                  const opReports = fieldReports.filter((r) => r.fieldOpId === op.id);
                  const opTotals = { acq: 0, act: 0, ret: 0, rev: 0, ref: 0 };
                  for (const r of opReports) {
                    opTotals.acq += (r.acquisitionCount as number) ?? 0;
                    opTotals.act += (r.activationCount as number) ?? 0;
                    opTotals.ret += (r.retentionCount as number) ?? 0;
                    opTotals.rev += (r.revenueCount as number) ?? 0;
                    opTotals.ref += (r.referralCount as number) ?? 0;
                  }
                  return (
                    <tr key={op.id as string} className="border-b border-border/50 hover:bg-background/20">
                      <td className="py-2 text-white">{(op.name as string) ?? (op.title as string)}</td>
                      <td className="py-2 text-right text-info">{opTotals.acq.toLocaleString("fr-FR")}</td>
                      <td className="py-2 text-right text-success">{opTotals.act.toLocaleString("fr-FR")}</td>
                      <td className="py-2 text-right text-warning">{opTotals.ret.toLocaleString("fr-FR")}</td>
                      <td className="py-2 text-right text-error">{opTotals.rev.toLocaleString("fr-FR")}</td>
                      <td className="py-2 text-right text-accent">{opTotals.ref.toLocaleString("fr-FR")}</td>
                      <td className="py-2 text-right text-foreground-secondary">{opReports.length}</td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="border-t border-border font-bold">
                  <td className="py-2 text-white">TOTAL</td>
                  <td className="py-2 text-right text-info">{fieldTotals.ACQUISITION.toLocaleString("fr-FR")}</td>
                  <td className="py-2 text-right text-success">{fieldTotals.ACTIVATION.toLocaleString("fr-FR")}</td>
                  <td className="py-2 text-right text-warning">{fieldTotals.RETENTION.toLocaleString("fr-FR")}</td>
                  <td className="py-2 text-right text-error">{fieldTotals.REVENUE.toLocaleString("fr-FR")}</td>
                  <td className="py-2 text-right text-accent">{fieldTotals.REFERRAL.toLocaleString("fr-FR")}</td>
                  <td className="py-2 text-right text-foreground-secondary">{fieldReports.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Unified terrain + digital */}
      {unified && (
        <Section title="Unifie Terrain + Digital" icon={Megaphone}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(unified).map(([k, v]) => (
              <KV key={k} label={k} value={typeof v === "number" ? v.toLocaleString("fr-FR") : String(v)} />
            ))}
          </div>
        </Section>
      )}

      {/* Operation recommendations */}
      <Section title="Recommandations d'operations" icon={Sparkles} action={
        <select value={recoStage} onChange={(e) => setRecoStage(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-white outline-none">
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      }>
        {recos.length === 0 ? <EmptyMsg text="Aucune recommandation disponible." /> : (
          <div className="space-y-2">
            {recos.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background/50 p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-2xs font-bold text-accent">{i + 1}</span>
                <div>
                  <p className="text-sm text-white">{r.action as string}</p>
                  {!!r.reason && <p className="mt-0.5 text-xs text-foreground-muted">{r.reason as string}</p>}
                  {typeof r.score === "number" && <p className="mt-1 text-xs text-foreground-secondary">Score: {r.score}/10</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Modal open={showRecord} onClose={() => setShowRecord(false)} title="Enregistrer une metrique AARRR" size="md">
        <div className="space-y-4">
          <FormField label="Etape" required>
            <select value={newMetric.stage} onChange={(e) => setNewMetric({ ...newMetric, stage: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong">
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Metrique" required>
            <input type="text" value={newMetric.metric} onChange={(e) => setNewMetric({ ...newMetric, metric: e.target.value })}
              placeholder="Ex: impressions, clicks, signups"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Valeur" required>
              <input type="number" value={newMetric.value} onChange={(e) => setNewMetric({ ...newMetric, value: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong" />
            </FormField>
            <FormField label="Cible">
              <input type="number" value={newMetric.target} onChange={(e) => setNewMetric({ ...newMetric, target: e.target.value })}
                placeholder="Optionnel"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong" />
            </FormField>
          </div>
          <FormField label="Periode" required>
            <input type="month" value={newMetric.period} onChange={(e) => setNewMetric({ ...newMetric, period: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowRecord(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newMetric.metric.trim() || !newMetric.value) return;
              recordMut.mutate({
                campaignId,
                stage: newMetric.stage as "ACQUISITION",
                metric: newMetric.metric,
                value: parseFloat(newMetric.value),
                target: newMetric.target ? parseFloat(newMetric.target) : undefined,
                period: newMetric.period,
              });
            }} disabled={recordMut.isPending}>Enregistrer</MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
