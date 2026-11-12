"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { projectArgosInput } from "@/domain/argos-projection";
import { Card, CardBody } from "@/components/primitives/card";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { Label } from "@/components/primitives/label";

export function ArgosStudioProjection() {
  const [id, setId] = useState(""); const [json, setJson] = useState(""); const [message, setMessage] = useState("");
  const project = trpc.argos.projectToStudio.useMutation({ onSuccess: data => setMessage(JSON.stringify(data, null, 2)), onError: e => setMessage(e.message) });
  return <Card><CardBody className="space-y-3">
    <h2 className="font-semibold">Projeter un dossier revu dans Argos-studio</h2>
    <p className="text-sm text-muted-foreground">La bibliothèque canonique reçoit un contrat research-dossier-v1 complet. Le dossier local doit être PASS et revu ; marque, campagne, secteur, marché et sources doivent correspondre. Licence, actifs et classification sont renseignés par l'opérateur. Le verdict local ne vaut pas reçu de publication distante.</p>
    <Label>Identifiant du dossier gouverné<Input value={id} onChange={e => setId(e.target.value)} /></Label>
    <Label>Dossier research-dossier-v1 JSON<Textarea aria-label="Dossier Argos-studio JSON" value={json} onChange={e => setJson(e.target.value)} /></Label>
    <a className="text-sm text-accent underline" href="/console/anubis/credentials">Configurer le connecteur Argos-studio</a>
    <Button loading={project.isPending} disabled={!id || !json.trim()} onClick={() => { try { project.mutate(projectArgosInput.parse({ dossierId: id, dossier: JSON.parse(json) })); } catch (e) { setMessage(e instanceof Error ? e.message : "Contrat invalide."); } }}>Valider le contrat et projeter</Button>
    {message && <pre role="status" className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{message}</pre>}
  </CardBody></Card>;
}
