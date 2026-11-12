import Link from "next/link";
import { recordedEditorialCalendarSchema } from "@/domain/editorial-source";
import type { z } from "zod";

const statusLabels: Record<string,string> = {scheduled:"Programmée",sent:"Envoyée",published:"Publiée",draft:"Brouillon",failed:"En échec"};
const utcDate = new Intl.DateTimeFormat("fr-FR",{
  day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"UTC",
});

export function EditorialCalendarDocument({calendar, strategyId}: {
  calendar:z.infer<typeof recordedEditorialCalendarSchema>; strategyId:string;
}) {
  return <div className="space-y-6">
    <p className="text-sm text-foreground-secondary">{calendar.reading}</p>
    {calendar.planning.map(plan => <div key={plan.source.sourceId}>
      {plan.scope.map(line=><p key={line} className="mb-2 text-sm">{line}</p>)}
      {plan.subjects.length>0 && <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer">{plan.subjects.length} sujets du plan</summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{plan.subjects.map(title=><li key={title}>{title}</li>)}</ul>
      </details>}
    </div>)}
    {calendar.posts.length>0 && <div><h3 className="mb-3 font-semibold">{calendar.posts.length} diffusions documentées</h3>
      <ol className="space-y-3">{calendar.posts.map(p=><li key={p.platform+"/"+p.externalPostId} className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="font-semibold">{p.platform}</h4>
          <span className="text-xs text-foreground-secondary">{statusLabels[p.status] ?? p.status} · {utcDate.format(new Date(p.scheduledOrPublishedAt))} UTC</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm">{p.caption}</p>
      </li>)}</ol></div>}
    <div><h3 className="mb-2 text-sm font-semibold">Sources de cette édition</h3>
      <ul className="space-y-2">{calendar.sources.map(source=><li key={source.sourceId}>
        <Link className="break-words text-sm text-accent underline" href={{pathname:"/cockpit/brand/sources",query:{strategy:strategyId,source:source.sourceId}}}>{source.label} · édition {source.edition}</Link>
      </li>)}</ul>
    </div>
  </div>;
}
