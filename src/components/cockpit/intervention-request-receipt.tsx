"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { readInterventionRequest } from "@/domain/intervention-request";
import { INTERVENTION_STATE_CONFIG, INTERVENTION_TYPE, INTERVENTION_URGENCY, MISSION_STAGES, type MissionStage } from "@/lib/operate-config";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/primitives/button";

/** The same received state in both portals, independent of any agent. */
export function InterventionRequestReceipt({ request, portal }: {
  request: { strategyId: string; data: unknown; createdAt: Date | string; updatedAt: Date | string };
  portal: "console" | "cockpit";
}) {
  const data = readInterventionRequest(request.data);
  const state = INTERVENTION_STATE_CONFIG[data.status];
  const mission = trpc.mission.get.useQuery({ id: data.missionId ?? "" }, {
    enabled: data.status === "CONVERTED" && !!data.missionId,
  });
  const linked = mission.data?.strategyId === request.strategyId ? mission.data : null;
  return (
    <div className="space-y-4">
      <Badge tone={state.tone}>{state.label}</Badge>
      <p className="whitespace-pre-wrap text-sm text-foreground-secondary">{data.description ?? "Besoin non renseigné."}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-foreground-muted">Type</dt><dd>{INTERVENTION_TYPE[data.requestType as keyof typeof INTERVENTION_TYPE] ?? "À qualifier"}</dd></div>
        <div><dt className="text-foreground-muted">Urgence demandée</dt><dd>{INTERVENTION_URGENCY[data.urgency as keyof typeof INTERVENTION_URGENCY] ?? "À qualifier"}</dd></div>
        <div><dt className="text-foreground-muted">Reçue le</dt><dd>{new Date(request.createdAt).toLocaleString("fr-FR")}</dd></div>
        <div><dt className="text-foreground-muted">Dernière modification</dt><dd>{new Date(request.updatedAt).toLocaleString("fr-FR")}</dd></div>
      </dl>
      {data.status === "PENDING" && <p className="text-sm text-foreground-muted">À examiner par votre équipe. Aucun délai ni responsable n’est encore confirmé.</p>}
      {data.status === "DISMISSED" && <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-medium">Motif enregistré</p>
        <p className="whitespace-pre-wrap text-sm text-foreground-secondary">{data.dismissReason ?? "Motif non renseigné dans cet historique."}</p>
        {data.dismissedAt && <p className="mt-2 text-xs text-foreground-muted">Écartée le {new Date(data.dismissedAt).toLocaleString("fr-FR")}</p>}
      </div>}
      {data.status === "CONVERTED" && <div className="space-y-2 rounded-lg border border-border p-4">
        <p className="text-sm">La demande a préparé une mission. Sa conversion ne vaut pas livraison.</p>
        {mission.isLoading ? <p role="status">Lecture de la mission…</p> : linked ? <>
          <p className="font-medium">{linked.title}</p>
          <p className="text-sm text-foreground-secondary">État actuel : {MISSION_STAGES[linked.status as MissionStage]?.label ?? "État à qualifier"}</p>
          <Link className="inline-block text-sm text-accent underline" href={`${portal === "console" ? "/console/artemis" : "/cockpit/operate"}/missions?missionId=${encodeURIComponent(linked.id)}&strategy=${encodeURIComponent(request.strategyId)}`}>Ouvrir la mission</Link>
        </> : <div role="alert" className="space-y-2 text-sm text-warning">
          <p>La mission liée ne peut pas être confirmée dans cette marque.</p>
          {data.missionId && <Button variant="outline" size="sm" onClick={() => void mission.refetch()}>Relire la mission</Button>}
        </div>}
      </div>}
      {!["PENDING", "CONVERTED", "DISMISSED"].includes(data.status) && <p className="text-sm text-warning">État historique à qualifier. Aucune conversion ni résolution n’est déduite.</p>}
    </div>
  );
}
