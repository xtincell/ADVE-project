import { getFieldLabel } from "@/components/cockpit/field-renderers";

/** Lossless reading of structured deliverables, including nested and mixed lists. */
export function DeliverableContentValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    if (!value.length) return <p className="text-xs text-foreground-muted italic">Aucune entrée.</p>;
    return <ol className="space-y-3">{value.map((item, index) =>
      <li key={index} className="rounded-lg border border-border/50 bg-background/30 p-3">
        <DeliverableContentValue value={item} />
      </li>)}</ol>;
  }
  if (value && typeof value === "object") {
    return <dl className="space-y-3">{Object.entries(value).filter(([key]) => !key.startsWith("_")).map(([key, item]) =>
      <div key={key} className="grid min-w-0 gap-1">
        <dt className="text-xs font-semibold text-foreground-muted">{getFieldLabel(key)}</dt>
        <dd className="min-w-0"><DeliverableContentValue value={item} /></dd>
      </div>)}</dl>;
  }
  return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground-secondary">
    {typeof value === "boolean" ? value ? "Oui" : "Non" : String(value ?? "—")}
  </p>;
}
