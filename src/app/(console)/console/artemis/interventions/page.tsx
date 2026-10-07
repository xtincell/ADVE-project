"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { readInterventionRequest } from "@/domain/intervention-request";
import { INTERVENTION_STATE_CONFIG } from "@/lib/operate-config";
import { InterventionRequestReceipt } from "@/components/cockpit/intervention-request-receipt";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import { Modal } from "@/components/shared/modal";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/primitives/button";
import { HandHelping, Clock, FileCheck, XCircle } from "lucide-react";

export default function InterventionsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<"convert" | "dismiss" | null>(null);
  const [reason, setReason] = useState("");
  const query = trpc.intervention.list.useQuery({});
  const utils = trpc.useUtils();
  const received = async () => { await Promise.all([query.refetch(), utils.mission.list.invalidate()]); setAction(null); setReason(""); };
  const convert = trpc.intervention.convertToMission.useMutation({ onSuccess: received });
  const dismiss = trpc.intervention.dismiss.useMutation({ onSuccess: received });
  if (query.isLoading) return <SkeletonPage />;
  const items = query.data ?? [];
  const count = (state: string) => items.filter((item) => readInterventionRequest(item.data).status === state).length;
  const tabs = [{ key: "all", label: "Toutes", count: items.length },
    ...(["PENDING", "CONVERTED", "DISMISSED"] as const).map((key) => ({ key, label: INTERVENTION_STATE_CONFIG[key].label, count: count(key) }))];
  const filtered = activeTab === "all" ? items : items.filter((item) => readInterventionRequest(item.data).status === activeTab);
  const selected = items.find((item) => item.id === selectedId);
  const busy = convert.isPending || dismiss.isPending;
  const open = (id: string) => { setSelectedId(id); setAction(null); setReason(""); convert.reset(); dismiss.reset(); };
  return (
    <div className="space-y-6">
      <PageHeader title="Interventions" description="Examinez les besoins, préparez une mission ou enregistrez un motif pour les écarter." />
      {query.error ? <div role="alert" className="space-y-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-warning">
        <p>La liste n’a pas pu être lue. Aucun total n’est déduit de cet échec.</p>
        <Button variant="outline" onClick={() => void query.refetch()}>Relire les demandes</Button>
      </div> : <>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="À examiner" value={count("PENDING")} icon={Clock} />
          <StatCard title="Missions préparées" value={count("CONVERTED")} icon={FileCheck} />
          <StatCard title="Demandes écartées" value={count("DISMISSED")} icon={XCircle} />
        </div>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        {filtered.length === 0 ? <EmptyState icon={HandHelping} title="Aucune demande dans cette vue" description="Les demandes reçues apparaîtront ici dans leur marque." /> : <div className="space-y-3">{filtered.map((item) => {
          const data = readInterventionRequest(item.data), state = INTERVENTION_STATE_CONFIG[data.status];
          return <button key={item.id} onClick={() => open(item.id)} className="block w-full space-y-2 rounded-lg border border-border bg-card p-4 text-left hover:bg-card-hover focus-visible:outline focus-visible:outline-accent">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{data.title ?? "Demande à qualifier"}</span><Badge tone={state.tone}>{state.label}</Badge></div>
            <p className="text-sm text-foreground-secondary">{item.strategyName}</p>
            <p className="line-clamp-2 text-sm text-foreground-muted">{data.description ?? "Besoin non renseigné."}</p>
            <p className="text-xs text-foreground-muted">Reçue le {new Date(item.createdAt).toLocaleString("fr-FR")}</p>
          </button>;
        })}</div>}
      </>}
      <Modal open={!!selected} onClose={() => { if (!busy) setSelectedId(null); }} title={selected ? readInterventionRequest(selected.data).title ?? "Demande à qualifier" : "Demande"}>
        {selected && <div className="space-y-5">
          <p className="text-sm text-foreground-muted">Marque : {selected.strategyName}</p>
          <InterventionRequestReceipt request={selected} portal="console" />
          {selected.canProcess && readInterventionRequest(selected.data).status === "PENDING" && <div className="space-y-3 border-t border-border pt-4">
            {!action ? <div className="flex flex-wrap gap-3">
              <Button onClick={() => setAction("convert")}>Préparer une mission</Button>
              <Button variant="outline" onClick={() => setAction("dismiss")}>Écarter la demande</Button>
            </div> : <form className="space-y-3" onSubmit={(event) => {
              event.preventDefault(); if (busy) return;
              const input = { signalId: selected.id, strategyId: selected.strategyId, expectedUpdatedAt: new Date(selected.updatedAt).toISOString() };
              if (action === "convert") convert.mutate(input);
              else if (reason.trim()) dismiss.mutate({ ...input, reason });
            }}>
              {action === "convert" ? <p className="text-sm">Une mission en préparation conservera ce besoin et sa marque. Aucun responsable, délai, livraison ni appel IA ne sera déduit.</p> : <label className="block space-y-2 text-sm">Motif
                <textarea aria-label="Motif pour écarter la demande" required maxLength={20000} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-border bg-background p-3 text-foreground focus-visible:outline focus-visible:outline-accent" />
              </label>}
              <div className="flex flex-wrap gap-3"><Button type="submit" loading={busy} disabled={action === "dismiss" && !reason.trim()}>{action === "convert" ? "Confirmer la préparation" : "Enregistrer le motif"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setAction(null)}>Annuler</Button></div>
            </form>}
          </div>}
          {!selected.canProcess && readInterventionRequest(selected.data).status === "PENDING" && <p className="text-sm text-foreground-muted">L’examen de cette demande est pris en charge par l’équipe de la marque.</p>}
          {(convert.error || dismiss.error) && <div role="alert" className="space-y-2 text-sm text-error"><p>{convert.error?.message ?? dismiss.error?.message}</p><Button variant="outline" onClick={async () => { await query.refetch(); convert.reset(); dismiss.reset(); setAction(null); }}>Relire avant de reprendre</Button></div>}
        </div>}
      </Modal>
    </div>
  );
}
