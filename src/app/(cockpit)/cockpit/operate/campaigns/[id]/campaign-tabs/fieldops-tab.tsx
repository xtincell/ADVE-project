"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { Section, MiniBtn, KV, EmptyMsg } from "./shared";
import { Calendar, CheckCircle, DollarSign, FileText, MapPin, Plus, Sparkles, Trash2, Users } from "lucide-react";

export function FieldOpsTab({ campaignId }: { campaignId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState<string | null>(null); // fieldOpId for report submission
  const [newOp, setNewOp] = useState({
    name: "", location: "", date: "", type: "ACTIVATION",
    budget: "", teamSize: "",
    chefOps: "", zone: "", duree: "",
    primaryAARR: "ACQUISITION", secondaryAARR: "ACTIVATION",
    resources: [] as Array<{ role: string; count: string }>,
    team: [] as Array<{ name: string; role: string }>,
    ambassadors: [] as Array<{ name: string; phone: string }>,
  });
  const [newReport, setNewReport] = useState({
    reporterName: "",
    acquisitionCount: "", acquisitionLabel: "Contacts", acquisitionUnit: "personnes",
    activationCount: "", activationLabel: "Activations", activationUnit: "demos",
    retentionCount: "", retentionLabel: "Retours", retentionUnit: "personnes",
    revenueCount: "", revenueLabel: "Ventes", revenueUnit: "XAF",
    referralCount: "", referralLabel: "Referrals", referralUnit: "personnes",
    notes: "",
  });

  const opsQuery = trpc.campaignManager.listFieldOps.useQuery({ campaignId });
  const statsQuery = trpc.campaignManager.getFieldReportStats.useQuery({ campaignId });
  const reportsQuery = trpc.campaignManager.listFieldReports.useQuery({ campaignId });
  const createMut = trpc.campaignManager.createFieldOp.useMutation({
    onSuccess: () => { opsQuery.refetch(); setShowCreate(false); resetNewOp(); },
  });
  const updateMut = trpc.campaignManager.updateFieldOp.useMutation({
    onSuccess: () => opsQuery.refetch(),
  });
  const deleteMut = trpc.campaignManager.deleteFieldOp.useMutation({
    onSuccess: () => { opsQuery.refetch(); setSelectedOpId(null); },
  });
  const submitReportMut = trpc.campaignManager.submitFieldReport.useMutation({
    onSuccess: () => { reportsQuery.refetch(); statsQuery.refetch(); setShowReport(null); resetNewReport(); },
  });
  const validateReportMut = trpc.campaignManager.validateFieldReport.useMutation({
    onSuccess: () => { reportsQuery.refetch(); statsQuery.refetch(); },
  });

  const ops = (opsQuery.data ?? []) as Array<Record<string, unknown>>;
  const stats = statsQuery.data as Record<string, unknown> | null;
  const reports = (reportsQuery.data ?? []) as Array<Record<string, unknown>>;
  const selectedOp = ops.find((o) => o.id === selectedOpId);

  function resetNewOp() {
    setNewOp({ name: "", location: "", date: "", type: "ACTIVATION", budget: "", teamSize: "", chefOps: "", zone: "", duree: "", primaryAARR: "ACQUISITION", secondaryAARR: "ACTIVATION", resources: [], team: [], ambassadors: [] });
  }
  function resetNewReport() {
    setNewReport({ reporterName: "", acquisitionCount: "", acquisitionLabel: "Contacts", acquisitionUnit: "personnes", activationCount: "", activationLabel: "Activations", activationUnit: "demos", retentionCount: "", retentionLabel: "Retours", retentionUnit: "personnes", revenueCount: "", revenueLabel: "Ventes", revenueUnit: "XAF", referralCount: "", referralLabel: "Referrals", referralUnit: "personnes", notes: "" });
  }

  const OP_TYPES = ["ACTIVATION", "SAMPLING", "ROADSHOW", "POS_DISPLAY", "EVENT", "SURVEY", "AUDIT"];
  const AARR_STAGES = ["ACQUISITION", "ACTIVATION", "RETENTION", "REVENUE", "REFERRAL"];

  return (
    <div className="space-y-5">
      {/* Stats overview */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Operations", value: stats.totalOps ?? 0, color: "text-info" },
            { label: "Rapports", value: stats.totalReports ?? 0, color: "text-foreground-secondary" },
            { label: "Valides", value: stats.validatedReports ?? 0, color: "text-success" },
            { label: "En attente", value: stats.pendingReports ?? 0, color: "text-warning" },
            { label: "Budget total", value: ops.reduce((s, o) => s + ((o.budget as number) ?? 0), 0).toLocaleString("fr-FR") + " XAF", color: "text-error" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-2xs uppercase text-foreground-muted">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{String(s.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Operations list */}
      <Section
        title={`Operations terrain (${ops.length})`}
        icon={MapPin}
        action={<MiniBtn variant="primary" onClick={() => setShowCreate(true)}><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Nouvelle operation</span></MiniBtn>}
      >
        {opsQuery.isLoading ? <EmptyMsg text="Chargement..." /> : ops.length === 0 ? (
          <EmptyMsg text="Aucune operation terrain. Creez votre premiere operation." />
        ) : (
          <div className="space-y-2">
            {ops.map((op) => {
              const team = (op.team as Array<Record<string, unknown>>) ?? [];
              const ambassadors = (op.ambassadors as Array<Record<string, unknown>>) ?? [];
              const aarrConfig = (op.aarrConfig as Record<string, unknown>) ?? {};
              const isSelected = selectedOpId === op.id;
              const opReports = reports.filter((r) => r.fieldOpId === op.id);

              return (
                <div key={op.id as string} className={`rounded-lg border p-4 transition-colors cursor-pointer ${isSelected ? "border-info bg-info/10" : "border-border bg-background/50 hover:border-border"}`}
                  onClick={() => setSelectedOpId(isSelected ? null : (op.id as string))}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded px-1.5 py-0.5 text-2xs font-bold ${
                          op.status === "COMPLETED" ? "bg-success/15 text-success" :
                          op.status === "IN_PROGRESS" ? "bg-info/15 text-info" :
                          op.status === "CANCELLED" ? "bg-error/15 text-error" :
                          "bg-foreground-muted/15 text-foreground-secondary"
                        }`}>{(op.status as string) ?? "PLANNED"}</span>
                        <h4 className="text-sm font-medium text-foreground">{(op.name as string) ?? (op.title as string)}</h4>
                        {!!aarrConfig.primaryStage && (
                          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-2xs font-bold text-accent">{aarrConfig.primaryStage as string}</span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-foreground-muted">
                        {!!op.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{op.location as string}</span>}
                        {!!op.date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(op.date as string).toLocaleDateString("fr-FR")}</span>}
                        {!!op.budget && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{(op.budget as number).toLocaleString("fr-FR")} XAF</span>}
                        {team.length > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{team.length} membre(s)</span>}
                        {ambassadors.length > 0 && <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />{ambassadors.length} ambassadeur(s)</span>}
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{opReports.length} rapport(s)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <MiniBtn onClick={() => setShowReport(op.id as string)}>
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Rapport</span>
                      </MiniBtn>
                      {(op.status === "PLANNED" || !op.status) && (
                        <MiniBtn onClick={() => updateMut.mutate({ id: op.id as string, status: "IN_PROGRESS" })} disabled={updateMut.isPending}>
                          Demarrer
                        </MiniBtn>
                      )}
                      {op.status === "IN_PROGRESS" && (
                        <MiniBtn onClick={() => updateMut.mutate({ id: op.id as string, status: "COMPLETED" })} disabled={updateMut.isPending}>
                          <CheckCircle className="h-3 w-3" />
                        </MiniBtn>
                      )}
                      <MiniBtn variant="danger" onClick={() => deleteMut.mutate({ id: op.id as string })} disabled={deleteMut.isPending}>
                        <Trash2 className="h-3 w-3" />
                      </MiniBtn>
                    </div>
                  </div>

                  {/* Detail panel when selected */}
                  {isSelected && (
                    <div className="mt-4 space-y-4 border-t border-border pt-4" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <KV label="Chef des operations" value={((aarrConfig.chefOps as string) ?? "—")} />
                        <KV label="Zone d'execution" value={((aarrConfig.zone as string) ?? (op.location as string) ?? "—")} />
                        <KV label="Duree" value={((aarrConfig.duree as string) ?? "—")} />
                        <KV label="Taille equipe" value={(op.teamSize as number) ?? team.length ?? "—"} />
                        <KV label="Budget" value={op.budget ? `${(op.budget as number).toLocaleString("fr-FR")} XAF` : "—"} />
                        <KV label="Objectif primaire" value={(aarrConfig.primaryStage as string) ?? "—"} />
                        <KV label="Objectif secondaire" value={(aarrConfig.secondaryStage as string) ?? "—"} />
                        <KV label="Type" value={((op.type as string) ?? (op.status as string) ?? "—")} />
                      </div>

                      {/* Team */}
                      {team.length > 0 && (
                        <div>
                          <h5 className="mb-2 text-xs font-semibold text-foreground-secondary">Equipe terrain</h5>
                          <div className="flex flex-wrap gap-2">
                            {team.map((t, i) => (
                              <span key={i} className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground">
                                {(t.name as string) ?? "Membre"} <span className="text-foreground-muted">({(t.role as string) ?? "agent"})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ambassadors */}
                      {ambassadors.length > 0 && (
                        <div>
                          <h5 className="mb-2 text-xs font-semibold text-foreground-secondary">Ambassadeurs</h5>
                          <div className="flex flex-wrap gap-2">
                            {ambassadors.map((a, i) => (
                              <span key={i} className="rounded-lg border border-accent bg-accent/20 px-2.5 py-1 text-xs text-accent">
                                {(a.name as string) ?? "Ambassadeur"} {!!a.phone && <span className="text-foreground-muted">({a.phone as string})</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resources / KPIs */}
                      {!!aarrConfig.resources && Array.isArray(aarrConfig.resources) && (
                        <div>
                          <h5 className="mb-2 text-xs font-semibold text-foreground-secondary">Ressources</h5>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {(aarrConfig.resources as Array<Record<string, unknown>>).map((r, i) => (
                              <div key={i} className="rounded-lg border border-border bg-background/50 p-2">
                                <p className="text-xs font-medium text-foreground">{(r.role as string) ?? "Role"}</p>
                                <p className="text-2xs text-foreground-muted">Qty: {(r.count as number) ?? 1}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Field reports for this op */}
                      {opReports.length > 0 && (
                        <div>
                          <h5 className="mb-2 text-xs font-semibold text-foreground-secondary">Rapports terrain ({opReports.length})</h5>
                          <div className="space-y-2">
                            {opReports.map((r) => (
                              <div key={r.id as string} className="rounded-lg border border-border bg-background/60 p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`rounded px-1.5 py-0.5 text-2xs font-bold ${
                                      r.status === "VALIDATED" ? "bg-success/15 text-success" :
                                      r.status === "SUBMITTED" ? "bg-warning/15 text-warning" :
                                      "bg-foreground-muted/15 text-foreground-secondary"
                                    }`}>{(r.status as string) ?? "DRAFT"}</span>
                                    <span className="text-xs text-foreground">{(r.reporterName as string) ?? "Anonyme"}</span>
                                    {!!r.createdAt && <span className="text-2xs text-foreground-muted">{new Date(r.createdAt as string).toLocaleDateString("fr-FR")}</span>}
                                  </div>
                                  {(r.status === "SUBMITTED" || r.status === "DRAFT") && (
                                    <MiniBtn onClick={() => validateReportMut.mutate({ id: r.id as string, validatorId: "current-user" })} disabled={validateReportMut.isPending}>
                                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Valider</span>
                                    </MiniBtn>
                                  )}
                                </div>
                                <div className="mt-2 grid grid-cols-5 gap-2">
                                  {[
                                    { label: (r.acquisitionLabel as string) ?? "Acquisition", val: r.acquisitionCount as number, unit: (r.acquisitionUnit as string) ?? "" },
                                    { label: (r.activationLabel as string) ?? "Activation", val: r.activationCount as number, unit: (r.activationUnit as string) ?? "" },
                                    { label: (r.retentionLabel as string) ?? "Retention", val: r.retentionCount as number, unit: (r.retentionUnit as string) ?? "" },
                                    { label: (r.revenueLabel as string) ?? "Revenue", val: r.revenueCount as number, unit: (r.revenueUnit as string) ?? "" },
                                    { label: (r.referralLabel as string) ?? "Referral", val: r.referralCount as number, unit: (r.referralUnit as string) ?? "" },
                                  ].map((m) => (
                                    <div key={m.label} className="text-center">
                                      <p className="text-2xs text-foreground-muted">{m.label}</p>
                                      <p className="text-sm font-bold text-foreground">{m.val != null ? m.val.toLocaleString("fr-FR") : "—"}</p>
                                      {!!m.unit && <p className="text-[9px] text-foreground-muted">{m.unit}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Create operation modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle operation terrain" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nom de l'operation" required>
              <input type="text" value={newOp.name} onChange={(e) => setNewOp({ ...newOp, name: e.target.value })}
                placeholder="Ex: Activation marche central Douala"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
            </FormField>
            <FormField label="Type d'operation">
              <select value={newOp.type} onChange={(e) => setNewOp({ ...newOp, type: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong">
                {OP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Lieu / Zone d'execution" required>
              <input type="text" value={newOp.location} onChange={(e) => setNewOp({ ...newOp, location: e.target.value })}
                placeholder="Ex: Douala, Marche Mboppi"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
            </FormField>
            <FormField label="Date" required>
              <input type="date" value={newOp.date} onChange={(e) => setNewOp({ ...newOp, date: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong" />
            </FormField>
            <FormField label="Chef des operations">
              <input type="text" value={newOp.chefOps} onChange={(e) => setNewOp({ ...newOp, chefOps: e.target.value })}
                placeholder="Nom du responsable terrain"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
            </FormField>
            <FormField label="Duree">
              <input type="text" value={newOp.duree} onChange={(e) => setNewOp({ ...newOp, duree: e.target.value })}
                placeholder="Ex: 3 jours, 1 semaine"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
            </FormField>
            <FormField label="Budget (XAF)">
              <input type="number" value={newOp.budget} onChange={(e) => setNewOp({ ...newOp, budget: e.target.value })}
                placeholder="Ex: 500000"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
            </FormField>
            <FormField label="Taille de l'equipe">
              <input type="number" value={newOp.teamSize} onChange={(e) => setNewOp({ ...newOp, teamSize: e.target.value })}
                placeholder="Ex: 5"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Objectif primaire AARRR">
              <select value={newOp.primaryAARR} onChange={(e) => setNewOp({ ...newOp, primaryAARR: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong">
                {AARR_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Objectif secondaire AARRR">
              <select value={newOp.secondaryAARR} onChange={(e) => setNewOp({ ...newOp, secondaryAARR: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong">
                {AARR_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>

          {/* Team members */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h5 className="text-xs font-semibold text-foreground-secondary">Equipe terrain</h5>
              <MiniBtn onClick={() => setNewOp({ ...newOp, team: [...newOp.team, { name: "", role: "agent" }] })}>
                <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Membre</span>
              </MiniBtn>
            </div>
            {newOp.team.map((t, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input type="text" value={t.name} onChange={(e) => { const tm = [...newOp.team]; tm[i] = { ...tm[i]!, name: e.target.value }; setNewOp({ ...newOp, team: tm }); }}
                  placeholder="Nom" className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
                <select value={t.role} onChange={(e) => { const tm = [...newOp.team]; tm[i] = { ...tm[i]!, role: e.target.value }; setNewOp({ ...newOp, team: tm }); }}
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-border-strong">
                  {["agent", "superviseur", "vendeur", "hotesse", "animateur", "chauffeur"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <MiniBtn variant="danger" onClick={() => setNewOp({ ...newOp, team: newOp.team.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-3 w-3" />
                </MiniBtn>
              </div>
            ))}
          </div>

          {/* Ambassadors */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h5 className="text-xs font-semibold text-foreground-secondary">Ambassadeurs</h5>
              <MiniBtn onClick={() => setNewOp({ ...newOp, ambassadors: [...newOp.ambassadors, { name: "", phone: "" }] })}>
                <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Ambassadeur</span>
              </MiniBtn>
            </div>
            {newOp.ambassadors.map((a, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input type="text" value={a.name} onChange={(e) => { const am = [...newOp.ambassadors]; am[i] = { ...am[i]!, name: e.target.value }; setNewOp({ ...newOp, ambassadors: am }); }}
                  placeholder="Nom" className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
                <input type="text" value={a.phone} onChange={(e) => { const am = [...newOp.ambassadors]; am[i] = { ...am[i]!, phone: e.target.value }; setNewOp({ ...newOp, ambassadors: am }); }}
                  placeholder="Telephone" className="w-32 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
                <MiniBtn variant="danger" onClick={() => setNewOp({ ...newOp, ambassadors: newOp.ambassadors.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-3 w-3" />
                </MiniBtn>
              </div>
            ))}
          </div>

          {/* Resources */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h5 className="text-xs font-semibold text-foreground-secondary">Ressources</h5>
              <MiniBtn onClick={() => setNewOp({ ...newOp, resources: [...newOp.resources, { role: "", count: "1" }] })}>
                <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Ressource</span>
              </MiniBtn>
            </div>
            {newOp.resources.map((r, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input type="text" value={r.role} onChange={(e) => { const rs = [...newOp.resources]; rs[i] = { ...rs[i]!, role: e.target.value }; setNewOp({ ...newOp, resources: rs }); }}
                  placeholder="Ex: vendeurs, hotesses, flyers" className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
                <input type="number" value={r.count} onChange={(e) => { const rs = [...newOp.resources]; rs[i] = { ...rs[i]!, count: e.target.value }; setNewOp({ ...newOp, resources: rs }); }}
                  placeholder="Qty" className="w-20 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
                <MiniBtn variant="danger" onClick={() => setNewOp({ ...newOp, resources: newOp.resources.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-3 w-3" />
                </MiniBtn>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowCreate(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newOp.name.trim() || !newOp.location.trim() || !newOp.date) return;
              createMut.mutate({
                campaignId,
                name: newOp.name,
                location: newOp.location,
                date: new Date(newOp.date),
                budget: newOp.budget ? parseFloat(newOp.budget) : undefined,
                teamSize: newOp.teamSize ? parseInt(newOp.teamSize) : undefined,
                team: newOp.team.filter((t) => t.name.trim()),
                ambassadors: newOp.ambassadors.filter((a) => a.name.trim()),
                aarrConfig: {
                  primaryStage: newOp.primaryAARR,
                  secondaryStage: newOp.secondaryAARR,
                  chefOps: newOp.chefOps || undefined,
                  zone: newOp.location,
                  duree: newOp.duree || undefined,
                  resources: newOp.resources.filter((r) => r.role.trim()).map((r) => ({ role: r.role, count: parseInt(r.count) || 1 })),
                },
              });
            }} disabled={createMut.isPending}>{createMut.isPending ? "Creation..." : "Creer l'operation"}</MiniBtn>
          </div>
        </div>
      </Modal>

      {/* Submit field report modal */}
      <Modal open={!!showReport} onClose={() => setShowReport(null)} title="Soumettre un rapport terrain" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <FormField label="Nom du rapporteur" required>
            <input type="text" value={newReport.reporterName} onChange={(e) => setNewReport({ ...newReport, reporterName: e.target.value })}
              placeholder="Ex: Jean Mballa"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
          </FormField>

          <h5 className="text-xs font-semibold text-foreground-secondary">Metriques AARRR</h5>
          {[
            { stage: "Acquisition", prefix: "acquisition" as const, color: "border-info bg-info/20" },
            { stage: "Activation", prefix: "activation" as const, color: "border-success bg-success/20" },
            { stage: "Retention", prefix: "retention" as const, color: "border-warning bg-warning/20" },
            { stage: "Revenue", prefix: "revenue" as const, color: "border-error bg-error/20" },
            { stage: "Referral", prefix: "referral" as const, color: "border-accent bg-accent/20" },
          ].map(({ stage, prefix, color }) => (
            <div key={prefix} className={`rounded-lg border p-3 ${color}`}>
              <h6 className="mb-2 text-xs font-bold text-foreground">{stage}</h6>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" value={(newReport as Record<string, string>)[`${prefix}Count`]}
                  onChange={(e) => setNewReport({ ...newReport, [`${prefix}Count`]: e.target.value })}
                  placeholder="Quantite" className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder-foreground-muted outline-none" />
                <input type="text" value={(newReport as Record<string, string>)[`${prefix}Label`]}
                  onChange={(e) => setNewReport({ ...newReport, [`${prefix}Label`]: e.target.value })}
                  placeholder="Label" className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder-foreground-muted outline-none" />
                <input type="text" value={(newReport as Record<string, string>)[`${prefix}Unit`]}
                  onChange={(e) => setNewReport({ ...newReport, [`${prefix}Unit`]: e.target.value })}
                  placeholder="Unite" className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder-foreground-muted outline-none" />
              </div>
            </div>
          ))}

          <FormField label="Notes">
            <textarea value={newReport.notes} onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })}
              rows={3} placeholder="Observations, incidents, remarques..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowReport(null)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!showReport || !newReport.reporterName.trim()) return;
              submitReportMut.mutate({
                fieldOpId: showReport,
                campaignId,
                reporterName: newReport.reporterName,
                data: { notes: newReport.notes },
                acquisitionCount: newReport.acquisitionCount ? parseFloat(newReport.acquisitionCount) : undefined,
                acquisitionLabel: newReport.acquisitionLabel || undefined,
                acquisitionUnit: newReport.acquisitionUnit || undefined,
                activationCount: newReport.activationCount ? parseFloat(newReport.activationCount) : undefined,
                activationLabel: newReport.activationLabel || undefined,
                activationUnit: newReport.activationUnit || undefined,
                retentionCount: newReport.retentionCount ? parseFloat(newReport.retentionCount) : undefined,
                retentionLabel: newReport.retentionLabel || undefined,
                retentionUnit: newReport.retentionUnit || undefined,
                revenueCount: newReport.revenueCount ? parseFloat(newReport.revenueCount) : undefined,
                revenueLabel: newReport.revenueLabel || undefined,
                revenueUnit: newReport.revenueUnit || undefined,
                referralCount: newReport.referralCount ? parseFloat(newReport.referralCount) : undefined,
                referralLabel: newReport.referralLabel || undefined,
                referralUnit: newReport.referralUnit || undefined,
              });
            }} disabled={submitReportMut.isPending}>{submitReportMut.isPending ? "Envoi..." : "Soumettre le rapport"}</MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
