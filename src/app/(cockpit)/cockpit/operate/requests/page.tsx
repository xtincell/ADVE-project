"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { readInterventionRequest } from "@/domain/intervention-request";
import { INTERVENTION_STATE_CONFIG, INTERVENTION_TYPE, INTERVENTION_URGENCY } from "@/lib/operate-config";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { InterventionRequestReceipt } from "@/components/cockpit/intervention-request-receipt";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/primitives/button";
import { Inbox, Send, FileCheck, XCircle } from "lucide-react";

const EMPTY_FORM = { title: "", description: "", urgency: "medium" as "low" | "medium" | "high" | "critical", type: "one_off" as "one_off" | "recurring" | "emergency" };
const INPUT_CLASS = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline focus-visible:outline-accent";

function TypeDistribution({ requests }: { requests: Array<{ data: unknown }> }) {
  const counts = new Map<string, number>();
  for (const request of requests) {
    const type = readInterventionRequest(request.data).requestType;
    const label = INTERVENTION_TYPE[type as keyof typeof INTERVENTION_TYPE] ?? "Type à qualifier";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return <div className="space-y-2 border-b border-border pb-4"><h3 className="text-sm font-medium">Répartition par type</h3>{Array.from(counts, ([label, count]) =>
    <div key={label} className="space-y-1"><div className="flex justify-between text-xs text-foreground-secondary"><span>{label}</span><span>{count}</span></div>
      <div className="h-1.5 rounded-full bg-background"><div className="h-full rounded-full bg-info"
        // lafusee:allow-adhoc-completion: request type distribution, not pillar completion
        style={{ width: `${requests.length ? count / requests.length * 100 : 0}%` }} /></div>
    </div>)}</div>;
}

export default function RequestsPage() {
  const strategyId = useCurrentStrategyId();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const query = trpc.intervention.list.useQuery({ strategyId: strategyId ?? undefined }, { enabled: !!strategyId });
  const create = trpc.intervention.create.useMutation({ onSuccess: async (request) => {
    setForm(EMPTY_FORM);
    await query.refetch();
    setSelectedRequest(request.id);
  } });
  if (!strategyId || query.isLoading) return <SkeletonPage />;
  const requests = query.data ?? [];
  const selected = requests.find((request) => request.id === selectedRequest);
  return (
    <div className="space-y-6">
      <PageHeader title="Demandes d’intervention" description="Décrivez votre besoin. Retrouvez la décision de votre équipe et la mission qui en découle." />
      {query.error ? <div role="alert" className="space-y-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-warning">
        <p>Votre historique n’a pas pu être lu. Aucun total n’est déduit de cet échec.</p>
        <Button variant="outline" onClick={() => void query.refetch()}>Relire l’historique</Button>
      </div> : <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="À examiner" value={requests.filter((r) => readInterventionRequest(r.data).status === "PENDING").length} icon={Inbox} />
        <StatCard title="Missions préparées" value={requests.filter((r) => readInterventionRequest(r.data).status === "CONVERTED").length} icon={FileCheck} />
        <StatCard title="Demandes écartées" value={requests.filter((r) => readInterventionRequest(r.data).status === "DISMISSED").length} icon={XCircle} />
      </div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-border bg-card p-6" aria-labelledby="request-form-title">
          <h2 id="request-form-title" className="font-semibold">Nouvelle demande</h2>
          <p className="text-sm text-foreground-muted">L’urgence décrit votre besoin. Votre équipe confirme ensuite le responsable et le délai dans la mission.</p>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!create.isPending && form.title.trim() && form.description.trim()) create.mutate({ strategyId, ...form }); }}>
            <label className="block space-y-1 text-sm">Titre
              <input className={INPUT_CLASS} aria-label="Titre de la demande" required maxLength={500} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="block space-y-1 text-sm">Description
              <textarea className={INPUT_CLASS} aria-label="Description du besoin" required maxLength={20000} rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">Type
                <select aria-label="Type de demande" className={INPUT_CLASS} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
                  {Object.entries(INTERVENTION_TYPE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block space-y-1 text-sm">Urgence
                <select aria-label="Urgence de la demande" className={INPUT_CLASS} value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as typeof form.urgency })}>
                  {Object.entries(INTERVENTION_URGENCY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            {create.error && <p role="alert" className="text-sm text-error">{create.error.message}</p>}
            {create.isSuccess && <p role="status" className="text-sm text-success">Votre demande est enregistrée.</p>}
            <Button type="submit" loading={create.isPending} disabled={!form.title.trim() || !form.description.trim()}><Send className="h-4 w-4" /> Envoyer la demande</Button>
          </form>
        </section>
        <section className="space-y-4 rounded-xl border border-border bg-card p-6" aria-labelledby="request-history-title">
          <h2 id="request-history-title" className="font-semibold">Historique · {query.error ? "lecture à reprendre" : requests.length}</h2>
          {!query.error && requests.length > 0 && <TypeDistribution requests={requests} />}
          {!query.error && (requests.length === 0 ? <EmptyState icon={Inbox} title="Aucune demande" description="Vos demandes et leurs suites apparaîtront ici." /> : requests.map((request) => {
            const data = readInterventionRequest(request.data), state = INTERVENTION_STATE_CONFIG[data.status];
            return <button key={request.id} onClick={() => setSelectedRequest(request.id)} className="block w-full space-y-2 rounded-lg border border-border p-4 text-left transition-colors hover:bg-card-hover focus-visible:outline focus-visible:outline-accent">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{data.title ?? "Demande à qualifier"}</span><Badge tone={state.tone}>{state.label}</Badge></div>
              <p className="line-clamp-2 text-sm text-foreground-secondary">{data.description ?? "Besoin non renseigné."}</p>
              <p className="text-xs text-foreground-muted">Reçue le {new Date(request.createdAt).toLocaleString("fr-FR")}</p>
            </button>;
          }))}
        </section>
      </div>
      <Modal open={!!selected} onClose={() => setSelectedRequest(null)} title={selected ? readInterventionRequest(selected.data).title ?? "Demande à qualifier" : "Demande"}>
        {selected && <InterventionRequestReceipt request={selected} portal="cockpit" />}
      </Modal>
    </div>
  );
}
