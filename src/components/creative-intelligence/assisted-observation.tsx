"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { annotationSchema } from "@/domain/creative-intelligence";
import { Button } from "@/components/primitives/button";
import { Textarea } from "@/components/primitives/textarea";
import { Label } from "@/components/primitives/label";

export function AssistedCreativeObservation({ strategyId, specimenId, observedText }: { strategyId: string; specimenId: string; observedText: string }) {
  const utils = trpc.useUtils();
  const saved = trpc.argos.intelligence.savedDraft.useQuery({ strategyId, specimenId }, { enabled: !!strategyId && !!specimenId });
  const [analysisId, setAnalysisId] = useState("");
  const [json, setJson] = useState("");
  const [message, setMessage] = useState("");
  const draft = trpc.argos.intelligence.draftAnalysis.useMutation({ onSuccess: data => {
    if (data.state === "LIVE") { setAnalysisId(data.analysisId); setJson(JSON.stringify(data.annotation, null, 2)); setMessage(`Brouillon à revoir. Couverture : ${JSON.stringify(data.coverage)}. Aucune utilisation dans les recettes avant validation.`); }
    else setMessage(JSON.stringify(data));
  }, onError: e => setMessage(e.message) });
  const review = trpc.argos.intelligence.reviewDraft.useMutation({ onSuccess: () => { setMessage("Observation revue enregistrée ; le brouillon d'origine est conservé."); setAnalysisId(""); void utils.argos.intelligence.invalidate(); }, onError: e => setMessage(e.message) });
  if (!strategyId || !specimenId) return <p className="text-xs text-muted-foreground">L'analyse assistée est disponible pour un contenu privé de marque sélectionné. L'annotation manuelle reste disponible pour le corpus public.</p>;
  return <div className="space-y-2 border-t border-border pt-3">
    <h4 className="font-medium">Préparer une annotation assistée</h4>
    <p className="text-xs text-muted-foreground">Texte effectivement observé ou média autorisé renseigné lors de l'import. Vidéo MP4 ≤ cinq minutes / 25 Mo : images échantillonnées, sans analyse sonore ni lecture de tous les plans. JPEG / PNG ≤ 1 Mo. Le mode audiovisuel transmet la vidéo complète et sa piste sonore (MP4 ≤ vingt Mo) à un modèle compatible configuré ; les plans et transcriptions restent à revoir.</p>
    <div className="flex flex-wrap gap-2"><Button variant="outline" loading={draft.isPending} disabled={!observedText.trim()} onClick={() => draft.mutate({ strategyId, specimenId, mode: "TEXT", observedText })}>Analyser le texte fourni</Button><Button variant="outline" loading={draft.isPending} onClick={() => draft.mutate({ strategyId, specimenId, mode: "MEDIA" })}>Analyser les images du média</Button><Button variant="outline" loading={draft.isPending} onClick={() => draft.mutate({ strategyId, specimenId, mode: "AUDIOVISUAL" })}>Analyser la vidéo et son audio</Button></div>
    {!analysisId && saved.data && <Button variant="outline" onClick={() => { setAnalysisId(saved.data!.analysisId); setJson(JSON.stringify(saved.data!.annotation, null, 2)); setMessage("Brouillon conservé chargé pour revue. Vérifier les preuves et les limites de couverture."); }}>Reprendre le brouillon conservé</Button>}
    {analysisId && <><Label>Annotation à vérifier et corriger<Textarea aria-label="Annotation assistée à revoir" value={json} onChange={e => setJson(e.target.value)} /></Label><Button loading={review.isPending} onClick={() => { try { review.mutate({ strategyId, analysisId, annotation: annotationSchema.parse(JSON.parse(json)) }); } catch (e) { setMessage(e instanceof Error ? e.message : "Annotation invalide."); } }}>Enregistrer ma revue de l'annotation</Button></>}
    {message && <p role="status" className="text-xs">{message}</p>}
  </div>;
}
