"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { Section, MiniBtn, EmptyMsg } from "./shared";
import { Megaphone, Plus, Trash2 } from "lucide-react";

export function AmplificationsTab({ campaignId }: { campaignId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newAmp, setNewAmp] = useState({ platform: "FACEBOOK", budget: "", mediaType: "DISPLAY", startDate: "", endDate: "", mediaCost: "", productionCost: "", agencyFee: "" });

  const ampsQuery = trpc.campaignManager.listAmplifications.useQuery({ campaignId });
  const metricsQuery = trpc.campaignManager.getAmplificationMetrics.useQuery({ campaignId });
  const createMut = trpc.campaignManager.createAmplification.useMutation({
    onSuccess: () => { ampsQuery.refetch(); metricsQuery.refetch(); setShowCreate(false); setNewAmp({ platform: "FACEBOOK", budget: "", mediaType: "DISPLAY", startDate: "", endDate: "", mediaCost: "", productionCost: "", agencyFee: "" }); },
  });
  const updateMut = trpc.campaignManager.updateAmplification.useMutation({
    onSuccess: () => { ampsQuery.refetch(); metricsQuery.refetch(); },
  });
  const deleteMut = trpc.campaignManager.deleteAmplification.useMutation({
    onSuccess: () => { ampsQuery.refetch(); metricsQuery.refetch(); },
  });

  const amps = (ampsQuery.data ?? []) as Array<Record<string, unknown>>;
  const metrics = metricsQuery.data as { totals: Record<string, number>; calculated: Record<string, number | null> } | null;

  const PLATFORMS = ["FACEBOOK", "INSTAGRAM", "GOOGLE_ADS", "YOUTUBE", "TIKTOK", "TWITTER", "LINKEDIN", "RADIO", "TV", "PRINT", "OOH"];
  const MEDIA_TYPES = ["DISPLAY", "VIDEO", "SEARCH", "SOCIAL", "NATIVE", "AUDIO", "PRINT", "OOH", "INFLUENCER", "EMAIL", "SMS"];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMetrics, setEditMetrics] = useState({ impressions: "", clicks: "", conversions: "", reach: "", views: "", engagements: "" });

  return (
    <div className="space-y-5">
      {/* Aggregate metrics */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Budget total", value: `${metrics.totals.budget?.toLocaleString("fr-FR") ?? 0} XAF`, color: "text-error" },
            { label: "Impressions", value: metrics.totals.impressions?.toLocaleString("fr-FR") ?? "0", color: "text-info" },
            { label: "Clicks", value: metrics.totals.clicks?.toLocaleString("fr-FR") ?? "0", color: "text-success" },
            { label: "CTR", value: metrics.calculated.ctr != null ? `${(metrics.calculated.ctr * 100).toFixed(2)}%` : "—", color: "text-warning" },
            { label: "Conversions", value: metrics.totals.conversions?.toLocaleString("fr-FR") ?? "0", color: "text-accent" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-2xs uppercase text-foreground-muted">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calculated KPIs */}
      {metrics?.calculated && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "CPM", value: metrics.calculated.cpm != null ? `${metrics.calculated.cpm.toFixed(0)} XAF` : "—" },
            { label: "CPC", value: metrics.calculated.cpc != null ? `${metrics.calculated.cpc.toFixed(0)} XAF` : "—" },
            { label: "CPV", value: metrics.calculated.cpv != null ? `${metrics.calculated.cpv.toFixed(0)} XAF` : "—" },
            { label: "Reach", value: metrics.totals.reach?.toLocaleString("fr-FR") ?? "0" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-background/50 p-2.5">
              <p className="text-2xs uppercase text-foreground-muted">{s.label}</p>
              <p className="text-sm font-semibold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Amplifications list */}
      <Section
        title={`Amplifications media (${amps.length})`}
        icon={Megaphone}
        action={<MiniBtn variant="primary" onClick={() => setShowCreate(true)}><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Ajouter</span></MiniBtn>}
      >
        {ampsQuery.isLoading ? <EmptyMsg text="Chargement..." /> : amps.length === 0 ? (
          <EmptyMsg text="Aucune amplification media. Ajoutez vos achats media." />
        ) : (
          <div className="space-y-2">
            {amps.map((amp) => {
              const isEditing = editingId === amp.id;
              return (
                <div key={amp.id as string} className="rounded-lg border border-border bg-background/50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-info/15 px-1.5 py-0.5 text-2xs font-bold text-info">{amp.platform as string}</span>
                        {!!amp.mediaType && <span className="rounded bg-surface-raised px-1.5 py-0.5 text-2xs font-bold text-foreground-secondary">{amp.mediaType as string}</span>}
                        <span className="text-sm font-medium text-white">{((amp.budget as number) ?? 0).toLocaleString("fr-FR")} XAF</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-foreground-muted">
                        {!!amp.startDate && <span>{new Date(amp.startDate as string).toLocaleDateString("fr-FR")} → {amp.endDate ? new Date(amp.endDate as string).toLocaleDateString("fr-FR") : "?"}</span>}
                        {!!amp.mediaCost && <span>Media: {(amp.mediaCost as number).toLocaleString("fr-FR")} XAF</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MiniBtn onClick={() => {
                        if (isEditing) { setEditingId(null); } else {
                          setEditingId(amp.id as string);
                          setEditMetrics({
                            impressions: String(amp.impressions ?? ""), clicks: String(amp.clicks ?? ""),
                            conversions: String(amp.conversions ?? ""), reach: String(amp.reach ?? ""),
                            views: String(amp.views ?? ""), engagements: String(amp.engagements ?? ""),
                          });
                        }
                      }}>{isEditing ? "Fermer" : "Metriques"}</MiniBtn>
                      <MiniBtn variant="danger" onClick={() => deleteMut.mutate({ id: amp.id as string })} disabled={deleteMut.isPending}>
                        <Trash2 className="h-3 w-3" />
                      </MiniBtn>
                    </div>
                  </div>

                  {/* Performance metrics row */}
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {[
                      { label: "Impressions", val: amp.impressions as number },
                      { label: "Clicks", val: amp.clicks as number },
                      { label: "Conversions", val: amp.conversions as number },
                      { label: "Reach", val: amp.reach as number },
                      { label: "Views", val: amp.views as number },
                      { label: "Engagements", val: amp.engagements as number },
                    ].map((m) => (
                      <div key={m.label} className="text-center">
                        <p className="text-2xs text-foreground-muted">{m.label}</p>
                        <p className="text-sm font-bold text-white">{m.val != null ? m.val.toLocaleString("fr-FR") : "—"}</p>
                      </div>
                    ))}
                  </div>

                  {/* Edit metrics inline */}
                  {isEditing && (
                    <div className="mt-3 border-t border-border pt-3">
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {(["impressions", "clicks", "conversions", "reach", "views", "engagements"] as const).map((field) => (
                          <div key={field}>
                            <label className="text-2xs text-foreground-muted">{field}</label>
                            <input type="number" value={(editMetrics as Record<string, string>)[field]}
                              onChange={(e) => setEditMetrics({ ...editMetrics, [field]: e.target.value })}
                              className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-white outline-none" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-end">
                        <MiniBtn variant="primary" onClick={() => {
                          const data: Record<string, number | undefined> = {};
                          for (const k of ["impressions", "clicks", "conversions", "reach", "views", "engagements"] as const) {
                            const v = (editMetrics as Record<string, string>)[k];
                            if (v) data[k] = parseFloat(v);
                          }
                          updateMut.mutate({ id: amp.id as string, ...data });
                          setEditingId(null);
                        }} disabled={updateMut.isPending}>Sauvegarder</MiniBtn>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Create amplification modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle amplification media" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Plateforme" required>
              <select value={newAmp.platform} onChange={(e) => setNewAmp({ ...newAmp, platform: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong">
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </FormField>
            <FormField label="Type de media">
              <select value={newAmp.mediaType} onChange={(e) => setNewAmp({ ...newAmp, mediaType: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong">
                {MEDIA_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
            <FormField label="Budget total (XAF)" required>
              <input type="number" value={newAmp.budget} onChange={(e) => setNewAmp({ ...newAmp, budget: e.target.value })}
                placeholder="Ex: 1000000" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong" />
            </FormField>
            <FormField label="Cout media (XAF)">
              <input type="number" value={newAmp.mediaCost} onChange={(e) => setNewAmp({ ...newAmp, mediaCost: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong" />
            </FormField>
            <FormField label="Date debut">
              <input type="date" value={newAmp.startDate} onChange={(e) => setNewAmp({ ...newAmp, startDate: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong" />
            </FormField>
            <FormField label="Date fin">
              <input type="date" value={newAmp.endDate} onChange={(e) => setNewAmp({ ...newAmp, endDate: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong" />
            </FormField>
            <FormField label="Cout production (XAF)">
              <input type="number" value={newAmp.productionCost} onChange={(e) => setNewAmp({ ...newAmp, productionCost: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong" />
            </FormField>
            <FormField label="Frais agence (XAF)">
              <input type="number" value={newAmp.agencyFee} onChange={(e) => setNewAmp({ ...newAmp, agencyFee: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong" />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowCreate(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newAmp.budget) return;
              createMut.mutate({
                campaignId,
                platform: newAmp.platform,
                budget: parseFloat(newAmp.budget),
                mediaType: newAmp.mediaType || undefined,
                startDate: newAmp.startDate ? new Date(newAmp.startDate) : undefined,
                endDate: newAmp.endDate ? new Date(newAmp.endDate) : undefined,
                mediaCost: newAmp.mediaCost ? parseFloat(newAmp.mediaCost) : undefined,
                productionCost: newAmp.productionCost ? parseFloat(newAmp.productionCost) : undefined,
                agencyFee: newAmp.agencyFee ? parseFloat(newAmp.agencyFee) : undefined,
              });
            }} disabled={createMut.isPending}>{createMut.isPending ? "Creation..." : "Creer"}</MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
