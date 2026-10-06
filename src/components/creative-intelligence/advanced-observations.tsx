"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { Select } from "@/components/primitives/select";
import { Textarea } from "@/components/primitives/textarea";

export function CreativeMediaRetention({ strategyId, specimenId, receipt }: { strategyId?: string; specimenId: string; receipt: unknown }) {
  const utils = trpc.useUtils();
  const [rights, setRights] = useState<"OWNED" | "LICENSED" | "PUBLIC_DOMAIN">("OWNED");
  const [url, setUrl] = useState(""), [note, setNote] = useState(""), [until, setUntil] = useState(""), [message, setMessage] = useState("");
  const onSuccess = (data: unknown) => { setMessage(JSON.stringify(data)); void utils.argos.intelligence.invalidate(); };
  const onError = (e: { message: string }) => setMessage(e.message);
  const archive = trpc.argos.intelligence.archiveMedia.useMutation({ onSuccess, onError });
  const remove = trpc.argos.intelligence.removeMedia.useMutation({ onSuccess, onError });
  return <details className="border-t border-border pt-3"><summary className="cursor-pointer font-medium">Conserver le média et gérer ses droits</summary><div className="space-y-2 pt-2">
    <p className="text-xs text-muted-foreground">Copie privée chiffrée, relue après stockage. À l'échéance, la lecture est bloquée et le passage de maintenance retire le fichier. Une conservation peut être renouvelée après revue des droits.</p>
    {!!receipt && <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(receipt, null, 2)}</pre>}
    <Label>Droit de conservation<Select value={rights} onChange={e => setRights(e.target.value as typeof rights)}><option value="OWNED">Nous détenons les droits</option><option value="LICENSED">Licence autorisant cette conservation</option><option value="PUBLIC_DOMAIN">Domaine public vérifié</option></Select></Label>
    <Label>Preuve des droits — lien HTTPS<Input value={url} onChange={e => setUrl(e.target.value)} /></Label>
    <Label>Conditions et motif<Textarea value={note} onChange={e => setNote(e.target.value)} /></Label>
    <Label>Conserver jusqu'au — un an maximum<Input type="datetime-local" value={until} onChange={e => setUntil(e.target.value)} /></Label>
    <div className="flex flex-wrap gap-2"><Button loading={archive.isPending} disabled={!specimenId || !until || note.trim().length < 10 || !url.startsWith("https:")} onClick={() => archive.mutate({ strategyId, specimenId, rights, rightsEvidenceUrl: url, rightsNote: note, retainUntil: new Date(until) })}>Conserver la copie autorisée</Button><Button variant="outline" loading={remove.isPending} disabled={!receipt || note.trim().length < 5} onClick={() => remove.mutate({ strategyId, specimenId, reason: note })}>Retirer la copie conservée</Button></div>
    {message && <p role="status" className="text-xs">{message}</p>}
  </div></details>;
}

export function CreativeModelDetails({ strategyId, specimenId, recipeId }: { strategyId: string; specimenId: string; recipeId: string }) {
  const performance = trpc.argos.intelligence.conditionalPerformance.useQuery({ strategyId, specimenId }, { enabled: !!strategyId && !!specimenId, retry: false });
  const trajectory = trpc.argos.intelligence.patternTrajectory.useQuery({ strategyId, recipeId }, { enabled: !!strategyId && !!recipeId, retry: false });
  const neighbours = trpc.argos.intelligence.similarRecipes.useQuery({ strategyId, recipeId }, { enabled: !!strategyId && !!recipeId, retry: false });
  if (!strategyId) return null;
  return <div className="space-y-3 rounded-lg border border-border p-3">
    <h3 className="font-semibold">Performance attendue et diffusion observée</h3>
    {performance.data && <p className="text-sm">{performance.data.expected == null ? "Historique insuffisant ou aucun gain prédictif validé : comparaison conditionnelle indisponible." : `Performance attendue : ${Math.round(performance.data.expected)} vues · résultat observé : ${performance.data.ratio?.toFixed(2)}× cette référence.`} {performance.data.interval && `Intervalle empirique : ${Math.round(performance.data.interval.low)}–${Math.round(performance.data.interval.high)} vues.`}</p>}
    {!recipeId && <p className="text-xs text-muted-foreground">Choisir une recette revue pour consulter sa diffusion et les mécaniques voisines.</p>}
    {trajectory.data?.series.map(s => <div key={`${s.platform}:${s.countryCode}`} className="text-sm"><p>{s.platform} · {s.countryCode} · {{ INSUFFICIENT_DATA: "Couverture insuffisante", RISING: "En progression", DECLINING: "En recul", PEAK_OBSERVED: "Pic observé", STABLE: "Stable" }[s.state]}</p><p className="text-xs text-muted-foreground">{s.periods.map(p => p.share == null ? "Sans observation" : `${p.matching}/${p.annotated} annotés (${p.observed} collectés)`).join(" → ")} · {s.stableAccounts} comptes suivis sur les trois dernières périodes.</p></div>)}
    {trajectory.data && <p className="text-xs text-muted-foreground">{trajectory.data.limitation}</p>}
    {neighbours.data && <p className="text-sm">{neighbours.data.state === "LIVE" ? `${neighbours.data.neighbours.length} recettes voisines parmi les mécaniques compatibles et revues.` : "Rapprochement sémantique disponible après indexation des recettes revues."}</p>}
    {neighbours.data?.neighbours.map(n => <p className="text-xs" key={n.recipeId}>Recette {n.recipeId} · proximité descriptive {Math.round(n.similarity * 100)} %</p>)}
    {(performance.error || trajectory.error || neighbours.error) && <p className="text-sm" role="alert">Une analyse est indisponible dans ce périmètre. Vérifier que la recette est revue et que le contenu appartient à la marque.</p>}
  </div>;
}
