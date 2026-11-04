"use client";

import { useState } from "react";
import type { z } from "zod";
import { conversationTreeSchema } from "@/server/services/crm-engine/commercial";

type Tree = z.infer<typeof conversationTreeSchema>;
type Decision = NonNullable<Tree["nodes"][number]["choices"][number]["decision"]>;
const field = "w-full rounded border border-border bg-background px-3 py-2 text-sm";
const seed: Tree = { version: "1", start: "discovery", nodes: [
  { id: "discovery", prompt: "Comprendre le besoin et le rôle de l’interlocuteur.", choices: [
    { id: "buyer", label: "Il achète pour son entreprise", next: "offer", decision: { type: "QUALIFY", role: "BUYER" } },
    { id: "partner", label: "Il propose un partenariat", next: "partner", decision: { type: "QUALIFY", role: "PARTNER" } },
    { id: "audience", label: "Il est le public à informer", next: "audience", decision: { type: "QUALIFY", role: "AUDIENCE" } },
  ] },
  { id: "offer", prompt: "Présenter l’offre, le prix et les conditions approuvés pour ce besoin.", choices: [{ id: "presented", label: "Les conditions ont été présentées", next: "decision", decision: { type: "PROPOSE" } }] },
  { id: "decision", prompt: "Demander une décision explicite sur la proposition.", choices: [
    { id: "accepted", label: "Le client accepte ces conditions", next: "accepted", decision: { type: "ACCEPT" } },
    { id: "objection", label: "Le client exprime une objection", next: "objection", decision: { type: "OBJECTION" } },
    { id: "stop", label: "Le client refuse ou ne veut plus être contacté", next: "stopped", decision: { type: "STOP" } },
  ] },
  { id: "objection", prompt: "Répondre selon les conditions de vente autorisées ou demander l’aide de l’équipe.", choices: [{ id: "revised", label: "Présenter à nouveau l’offre autorisée", next: "decision", decision: { type: "PROPOSE" } }, { id: "stop", label: "Arrêter le contact", next: "stopped", decision: { type: "STOP" } }] },
  { id: "accepted", prompt: "Expliquer comment payer ; attendre la vérification du paiement, puis suivre la livraison.", choices: [] },
  { id: "partner", prompt: "Examiner le partenariat. Cette relation ne constitue pas une vente.", choices: [] },
  { id: "audience", prompt: "Orienter vers l’expérience de la marque, sans en faire un client professionnel.", choices: [] },
  { id: "stopped", prompt: "Respecter le refus de contact.", choices: [] },
] };
const effects = [
  ["NONE", "Poursuivre sans engagement"], ["BUYER", "Qualifier un acheteur"], ["PARTNER", "Orienter un partenaire"], ["AUDIENCE", "Orienter le public"], ["PROPOSE", "Présenter l’offre"], ["OBJECTION", "Noter une objection"], ["ACCEPT", "Noter l’accord"], ["STOP", "Arrêter le contact"],
] as const;
function effectValue(decision?: Decision) { return decision?.type === "QUALIFY" ? decision.role : decision?.type ?? "NONE"; }
function fromEffect(value: string): Decision | undefined {
  if (value === "NONE") return undefined;
  if (value === "BUYER" || value === "PARTNER" || value === "AUDIENCE") return { type: "QUALIFY", role: value };
  return { type: value as "PROPOSE" | "OBJECTION" | "ACCEPT" | "STOP" };
}

/** Author the existing STI contract using questions and choices, without exposing JSON. */
export function CrmSalesTreeEditor({ name = "tree", initialTree = null }: { name?: string; initialTree?: Tree | null } = {}) {
  const [tree, setTree] = useState<Tree | null>(initialTree);
  const [step, setStep] = useState(initialTree?.start ?? "discovery");
  const node = tree?.nodes.find(item => item.id === step);
  function updateNode(change: Partial<Tree["nodes"][number]>) {
    setTree(current => current ? { ...current, nodes: current.nodes.map(item => item.id === step ? { ...item, ...change } : item) } : null);
  }
  return <div className="space-y-3">
    <input type="hidden" name={name} value={tree ? JSON.stringify(tree) : ""} />
    <p className="text-sm text-foreground-muted">Les questions guident le vendeur à partir des réponses du client. Son accord, le paiement et la livraison sont vérifiés séparément.</p>
    {!tree ? <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={() => setTree(structuredClone(seed))}>Adapter les questions de vente</button> : <>
      <div className="grid gap-3 sm:grid-cols-2"><label>Version des questions<input className={field} value={tree.version} required onChange={event => setTree({ ...tree, version: event.target.value })} /></label>
        <label>Étape de départ<select className={field} value={tree.start} onChange={event => setTree({ ...tree, start: event.target.value })}>{tree.nodes.map((item, index) => <option key={item.id} value={item.id}>Étape {index + 1} · {item.prompt}</option>)}</select></label></div>
      <label className="block">Étape à préparer<select className={field} value={step} onChange={event => setStep(event.target.value)}>{tree.nodes.map((item, index) => <option key={item.id} value={item.id}>Étape {index + 1} · {item.prompt}</option>)}</select></label>
      {node && <div className="space-y-3 rounded border border-border p-3">
        <label className="block">Question ou action du vendeur<textarea className={field} rows={3} value={node.prompt} required maxLength={4000} onChange={event => updateNode({ prompt: event.target.value })} /></label>
        {!node.choices.length && <p className="text-sm text-foreground-muted">Ces questions sont terminées. Continuez dans le suivi des ventes.</p>}
        {node.choices.map((choice, index) => <fieldset key={choice.id} className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2"><legend className="text-sm">Réponse {index + 1}</legend>
          <label className="sm:col-span-2">Réponse observée<input className={field} required maxLength={4000} value={choice.label} onChange={event => updateNode({ choices: node.choices.map(item => item.id === choice.id ? { ...item, label: event.target.value } : item) })} /></label>
          <label>Ce que le vendeur fait ensuite<select className={field} value={effectValue(choice.decision)} onChange={event => updateNode({ choices: node.choices.map(item => item.id === choice.id ? { ...item, decision: fromEffect(event.target.value) } : item) })}>{effects.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Étape suivante<select className={field} value={choice.next} onChange={event => updateNode({ choices: node.choices.map(item => item.id === choice.id ? { ...item, next: event.target.value } : item) })}>{tree.nodes.map((item, i) => <option key={item.id} value={item.id}>Étape {i + 1} · {item.prompt}</option>)}</select></label>
          <button type="button" className="justify-self-start text-sm underline" onClick={() => updateNode({ choices: node.choices.filter(item => item.id !== choice.id) })}>Retirer cette réponse</button>
        </fieldset>)}
        {node.choices.length < 20 && <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={() => updateNode({ choices: [...node.choices, { id: crypto.randomUUID(), label: "Nouvelle réponse", next: node.id }] })}>Ajouter une réponse</button>}
      </div>}
      <div className="flex flex-wrap gap-3">
        {tree.nodes.length < 100 && <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={() => { const id = crypto.randomUUID(); setTree({ ...tree, nodes: [...tree.nodes, { id, prompt: "Nouvelle étape", choices: [] }] }); setStep(id); }}>Ajouter une étape</button>}
        <button type="button" className="text-sm underline" onClick={() => setTree(null)}>Utiliser les questions habituelles</button>
      </div>
    </>}
  </div>;
}
