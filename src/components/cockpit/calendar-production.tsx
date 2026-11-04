"use client";

import { Fragment, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import type { ContentPost } from "@/lib/types/launch-calendar";

type OptionCount = 1 | 2 | 3 | 4;
type BriefRef = { assetId: string; version: number; variant: number; name: string };
type Receipt = {
  message: string; previewIntentId?: string | null; generativeTaskId?: string | null; materialStatus?: string | null;
  materialVersions?: {id: string; url: string; status: string; kind: string}[];
};
const action = "rounded-md border border-border px-3 py-2 text-xs font-medium hover:border-accent disabled:opacity-50";

function OptionSelect({ value, onChange, label }: { value: OptionCount; onChange: (value: OptionCount) => void; label: string }) {
  return <label className="flex items-center gap-2 text-xs">{label}
    <select className="rounded border border-border bg-background p-2" value={value}
      onChange={event => onChange(Number(event.target.value) as OptionCount)}>
      {([1, 2, 3, 4] as const).map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  </label>;
}

/** Each brief version is durably saved before dispatch. The browser shows the backend receipt for each option. */
export function CalendarProduction({ strategyId, startDate, weeks, projectDates, renderPost, fallback }: {
  strategyId: string; startDate: string; weeks: number; projectDates: boolean; fallback: ReactNode;
  renderPost: (post: ContentPost, actions: ReactNode) => ReactNode;
}) {
  const scope = { strategyId, startDate, weeks, projectDates };
  const calendar = trpc.deliverableOrchestrator.calendarProductionRows.useQuery(scope);
  const prepare = trpc.deliverableOrchestrator.prepareCalendarBriefs.useMutation();
  const produce = trpc.deliverableOrchestrator.produceCalendarBrief.useMutation();
  const [defaults, setDefaults] = useState<OptionCount>(2);
  const [counts, setCounts] = useState<Record<string, OptionCount>>({});
  const [receipts, setReceipts] = useState<Record<string, Receipt>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState("");
  const [showBoard, setShowBoard] = useState(false);
  const running = useRef(false);
  const version = calendar.data?.calendarVersion;
  const rows = calendar.data?.rows ?? [];
  const countFor = (key: string) => counts[key] ?? defaults;

  async function send(brief: BriefRef) {
    const key = brief.assetId + "/" + brief.version;
    try {
      const result = await produce.mutateAsync({ strategyId, assetId: brief.assetId, version: brief.version });
      setReceipts(prev => ({ ...prev, [key]: result }));
    } catch (error) {
      setReceipts(prev => ({ ...prev, [key]: { message: error instanceof Error ? error.message : "La génération a été interrompue. Vous pouvez reprendre cette option." } }));
    }
  }
  async function run(keys: string[], generate: boolean, correction?: { assetId: string; version: number; instruction: string; photoPolicy?: "LOCKED_MASTER" | "GENERATED_CANDIDATE" }) {
    if (!version || running.current || !keys.length) return;
    running.current = true;
    try {
      for (const [index, key] of keys.entries()) {
        setProgress(`Publication ${index + 1}/${keys.length} · préparation du brief`);
        try {
          const result = await prepare.mutateAsync({ ...scope, calendarVersion: version, postKeys: [key], optionsPerPost: countFor(key), correction });
          const row = result.rows.find(r => r.key === key);
          if (!row || row.error) throw new Error(row?.error || "Le brief de cette publication n’a pas été enregistré.");
          setErrors(prev => ({ ...prev, [key]: "" }));
          if (generate) for (const brief of row.briefs) {
            setProgress(`Publication ${index + 1}/${keys.length} · option ${brief.variant}`);
            await send(brief);
          }
        } catch (error) {
          setErrors(prev => ({ ...prev, [key]: error instanceof Error ? error.message : "Préparation interrompue." }));
        }
      }
    } finally {
      await calendar.refetch();
      running.current = false;
      setProgress("");
    }
  }
  async function resume(brief: BriefRef) {
    if (running.current) return;
    running.current = true;
    setProgress(`Reprise de l’option ${brief.variant}`);
    try { await send(brief); }
    finally { await calendar.refetch(); running.current = false; setProgress(""); }
  }
  if (calendar.isPending || calendar.isError) return <>
    {calendar.isError && <p role="alert">La production est indisponible. {calendar.error.message} <button onClick={() => calendar.refetch()} className={action}>Réessayer</button></p>}
    {fallback}
  </>;
  if (!version || !rows.length) return <>{fallback}</>;
  const total = rows.reduce((sum, row) => sum + countFor(row.key), 0);
  return <section aria-label="Production visuelle du calendrier">
    <div className="mb-4 rounded-lg border border-border p-4">
      <h3 className="font-semibold">Produire les visuels du calendrier</h3>
      <p className="my-2 text-xs text-foreground-secondary">Chaque post garde son texte, ses sources et la version de ses briefs. Produire transmet les options au moteur de génération pour relecture. La publication se décide séparément.</p>
      <fieldset disabled={!!progress} className="flex flex-wrap items-center gap-3">
        <OptionSelect value={defaults} onChange={setDefaults} label="Options par défaut" />
        <button className={action} onClick={() => run(rows.map(row => row.key), false)}>Préparer les briefs du calendrier</button>
        <button className={action} onClick={() => run(rows.map(row => row.key), true)}>Produire les {total} options</button>
      </fieldset>
      {progress && <p role="status" className="mt-2 text-xs text-accent">{progress}</p>}
    </div>
    <button className={action+" mb-3"} aria-expanded={showBoard} onClick={() => setShowBoard(!showBoard)}>{showBoard ? "Fermer la planche" : "Voir la planche visuelle du calendrier"}</button>
    {showBoard && <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Planche visuelle">
      {rows.map(row => <article className="rounded border border-border p-3" key={row.key}>
        <small>{row.post.date} · {row.post.platform}</small><h4>{row.post.theme || row.post.angle || row.post.format}</h4>
        {row.briefs.length === 0 && <p className="text-xs">Brief à préparer</p>}
        {row.briefs.map(brief => <div key={brief.assetId} className="mt-2">
          <p className="text-xs">Option {brief.variant} · v{brief.version}</p>
          <Renders receipt={brief.generation} />
        </div>)}
      </article>)}
    </div>}
    <ol className="space-y-2">
      {rows.map((row, idx) => <Fragment key={row.key}>
        {idx === 0 || rows[idx - 1]?.post.week !== row.post.week ? <li className="pt-2 font-mono text-xs text-accent">{row.post.week}</li> : null}
        {renderPost(row.post, <fieldset disabled={!!progress} className="border-t border-border-subtle px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <OptionSelect value={countFor(row.key)} label="Options pour ce post" onChange={n => setCounts(prev => ({ ...prev, [row.key]: n }))} />
            <button className={action} onClick={() => run([row.key], false)}>Préparer le brief</button>
            <button className={action} onClick={() => run([row.key], true)}>Produire {countFor(row.key)} option{countFor(row.key) > 1 ? "s" : ""}</button>
            <small className="text-foreground-muted">{row.origin === "PROJECTED" ? "Post proposé par la cadence" : "Post du calendrier enregistré"}</small>
          </div>
          {errors[row.key] && <p role="alert" className="mt-2 text-sm">{errors[row.key]}</p>}
          {row.briefs.map(brief => <CalendarOption key={brief.assetId + brief.version} brief={brief}
            receipt={brief.generation ?? receipts[brief.assetId + "/" + brief.version]} strategyId={strategyId} onResume={() => resume(brief)}
            onCorrect={(instruction,photoPolicy) => run([row.key], true, { assetId: brief.assetId, version: brief.version, instruction, photoPolicy })} />)}
        </fieldset>)}
      </Fragment>)}
    </ol>
  </section>;
}

function CalendarOption({ brief, receipt, strategyId, onResume, onCorrect }: {
  brief: BriefRef; receipt?: Receipt; strategyId: string; onResume: () => void; onCorrect: (text: string, photoPolicy?: "LOCKED_MASTER" | "GENERATED_CANDIDATE") => void;
}) {
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<"" | "LOCKED_MASTER" | "GENERATED_CANDIDATE">("");
  const [opened, setOpened] = useState(false);
  const utils = trpc.useUtils();
  const dossier = trpc.deliverableOrchestrator.getCalendarBrief.useQuery({ strategyId, assetId: brief.assetId, version: brief.version }, { enabled: opened });
  const material = trpc.ptah.materializeBrief.useMutation({onSuccess: () => {void utils.deliverableOrchestrator.calendarProductionRows.invalidate({strategyId});}});
  const content = dossier.data ? JSON.parse(dossier.data.text) as {treatment:string; correction?:string; post:ContentPost; productionArtwork?: unknown; direction?:{family?:{name:string};rules?:{guidance:string}[]}} : null;
  return <details onToggle={e => setOpened(e.currentTarget.open)} className="mt-2 rounded border border-border-subtle p-2 text-xs">
    <summary className="cursor-pointer">Option {brief.variant} · v{brief.version} · {brief.name}</summary>
    {dossier.isError && <p role="alert">{dossier.error.message}</p>}
    {content && <div className="my-2 space-y-1 text-sm">
      <strong>{content.treatment}</strong><p>{content.direction?.family?.name}</p>
      <p className="whitespace-pre-wrap">{content.post.caption}</p><p>{content.post.illustration}</p>
      {content.correction && <p>Correction demandée · {content.correction}</p>}
      {content.direction?.rules && <details><summary>Règles de DA appliquées</summary><ul>{content.direction.rules.map((r,i)=><li key={i}>{r.guidance}</li>)}</ul></details>}
    </div>}
    <Renders receipt={receipt} />
    {receipt && <p role="status" className="my-2">{receipt.message}</p>}
    {receipt?.previewIntentId && <Link className="underline" href={'/cockpit/brand/deliverables?strategy=' + encodeURIComponent(strategyId) + '&productionPreview=' + encodeURIComponent(receipt.previewIntentId)}>Ouvrir la fiche de production</Link>}
    {!receipt?.generativeTaskId && <button className={action} onClick={onResume}>Demander la génération de cette option</button>}
    {receipt?.materialStatus==="DEFERRED" && receipt.generativeTaskId && <button className={action} disabled={material.isPending}
      onClick={() => material.mutate({strategyId,resumeTaskId:receipt.generativeTaskId!})}>Reprendre la forge différée</button>}
    {material.error && <p role="alert">{material.error.message}</p>}
    {material.data && <p role="status">Forge · {material.data.status}</p>}
    <label className="my-2 block">Correction de cette option
      <textarea className="mt-1 block w-full rounded border border-border bg-background p-2" value={note} onChange={e => setNote(e.target.value)} maxLength={1500} />
    </label>
    {content?.productionArtwork ? <label className="mb-2 block">Photographie de cette révision
      <select className="ml-2 rounded border border-border bg-background p-2" value={photo} onChange={e=>setPhoto(e.target.value as typeof photo)}>
        <option value="">Conserver le traitement de la piste</option>
        <option value="LOCKED_MASTER">Restituer la photo du master</option>
        <option value="GENERATED_CANDIDATE">Proposer une autre photographie</option>
      </select>
    </label> : null}
    <button className={action} disabled={!note.trim()} onClick={() => onCorrect(note.trim(),photo || undefined)}>Produire la version corrigée</button>
  </details>;
}


function Renders({receipt}: {receipt?: Receipt | null}) {
  const files = receipt?.materialVersions?.filter(v => v.status !== "PROVIDER_ONLY" && ["image","icon","design"].includes(v.kind)) ?? [];
  if (!files.length) return <p className="text-xs text-foreground-secondary">{receipt?.message || "Visuel à produire"}</p>;
  return <div className="grid gap-2">{files.map(file =>
    <a href={file.url} key={file.id} target="_blank" rel="noreferrer" className="text-xs underline">
      <img loading="lazy" src={file.url} alt="Proposition visuelle à relire" className="max-h-72 w-full object-contain" />
      Agrandir le rendu
    </a>)}</div>;
}
