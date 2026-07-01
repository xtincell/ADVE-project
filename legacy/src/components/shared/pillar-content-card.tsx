"use client";

import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";

interface PillarContentCardProps {
  pillarKey: PillarKey;
  content: Record<string, unknown>;
  score?: number;
  variant?: "full" | "compact" | "inline";
  className?: string;
}

const PILLAR_COLORS: Record<PillarKey, string> = {
  a: "border-accent/50 bg-accent/20",
  d: "border-blue-800/50 bg-blue-950/20",
  v: "border-emerald-800/50 bg-emerald-950/20",
  e: "border-amber-800/50 bg-amber-950/20",
  r: "border-red-800/50 bg-error/20",
  t: "border-sky-800/50 bg-sky-950/20",
  i: "border-orange-800/50 bg-orange-950/20",
  s: "border-pink-800/50 bg-pink-950/20",
};

const PILLAR_ACCENT: Record<PillarKey, string> = {
  a: "text-accent",
  d: "text-blue-400",
  v: "text-emerald-400",
  e: "text-amber-400",
  r: "text-error",
  t: "text-sky-400",
  i: "text-orange-400",
  s: "text-pink-400",
};

export const PILLAR_TAG_BG: Record<PillarKey, string> = {
  a: "bg-accent/10 text-accent",
  d: "bg-blue-500/10 text-blue-300",
  v: "bg-emerald-500/10 text-emerald-300",
  e: "bg-amber-500/10 text-amber-300",
  r: "bg-error/10 text-error",
  t: "bg-sky-500/10 text-sky-300",
  i: "bg-orange-500/10 text-orange-300",
  s: "bg-pink-500/10 text-pink-300",
};

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function summarizeItem(item: unknown): string {
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (typeof item === "object" && item !== null) {
    const obj = item as Record<string, unknown>;
    // Try common label fields
    for (const key of ["name", "nom", "title", "titre", "label", "customName", "handle", "platform", "channel", "description"]) {
      if (typeof obj[key] === "string" && obj[key]) return obj[key] as string;
    }
    // Fallback: first short string value
    for (const v of Object.values(obj)) {
      if (typeof v === "string" && v.length > 0 && v.length < 80) return v;
    }
    return Object.keys(obj).join(", ");
  }
  return String(item ?? "");
}

function renderValue(value: unknown, pillarKey: PillarKey): React.ReactNode {
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-xs text-foreground-muted italic">Non defini</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, i) => (
          <span key={i} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PILLAR_TAG_BG[pillarKey]}`}>
            {summarizeItem(item)}
          </span>
        ))}
      </div>
    );
  }
  if (typeof value === "boolean") {
    return (
      <span className={`text-sm font-medium ${value ? "text-emerald-400" : "text-error"}`}>
        {value ? "Oui" : "Non"}
      </span>
    );
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj);
    if (entries.length === 0) return <span className="text-xs text-foreground-muted italic">Non defini</span>;
    return (
      <div className="space-y-1">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-start gap-2">
            <span className="text-[10px] font-medium uppercase text-foreground-muted w-24 shrink-0">{formatLabel(k)}</span>
            <span className="text-xs text-foreground-secondary">{summarizeItem(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  const str = String(value ?? "");
  if (!str) return <span className="text-xs text-foreground-muted italic">Non defini</span>;
  return <p className="text-sm leading-relaxed text-foreground">{str}</p>;
}

/** Full card: shows all pillar content fields in a grid */
function FullCard({ pillarKey, content, score, className }: PillarContentCardProps) {
  const entries = Object.entries(content);
  if (entries.length === 0) return null;

  return (
    <div className={`rounded-xl border p-5 ${PILLAR_COLORS[pillarKey]} ${className ?? ""}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-background text-sm font-bold text-white`}>
            {pillarKey.toUpperCase()}
          </span>
          <div>
            <h4 className={`text-sm font-semibold ${PILLAR_ACCENT[pillarKey]}`}>
              {PILLAR_NAMES[pillarKey]}
            </h4>
            {score !== undefined && (
              <p className="text-xs text-foreground-muted">{score.toFixed(1)} / 25</p>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-lg bg-background/40 p-3">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
              {formatLabel(key)}
            </p>
            {renderValue(value, pillarKey)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact card: shows pillar name + first 2 content fields */
function CompactCard({ pillarKey, content, className }: PillarContentCardProps) {
  const entries = Object.entries(content).slice(0, 2);
  if (entries.length === 0) return null;

  return (
    <div className={`rounded-lg border border-border bg-background/60 p-3 ${className ?? ""}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`text-xs font-bold ${PILLAR_ACCENT[pillarKey]}`}>
          {pillarKey.toUpperCase()}
        </span>
        <span className="text-xs text-foreground-muted">{PILLAR_NAMES[pillarKey]}</span>
      </div>
      <div className="space-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-2">
            <span className="mt-0.5 w-20 shrink-0 text-[10px] font-medium uppercase text-foreground-muted">
              {formatLabel(key)}
            </span>
            <span className="text-xs text-foreground-secondary truncate">
              {Array.isArray(value) ? value.map(summarizeItem).join(", ") : summarizeItem(value).slice(0, 80)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Inline: just the key value as a single line */
function InlineCard({ pillarKey, content, className }: PillarContentCardProps) {
  const firstEntry = Object.entries(content)[0];
  if (!firstEntry) return null;
  const [, value] = firstEntry;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${className ?? ""}`}>
      <span className={`font-bold ${PILLAR_ACCENT[pillarKey]}`}>{pillarKey.toUpperCase()}</span>
      <span className="text-foreground-secondary truncate max-w-[200px]">
        {Array.isArray(value) ? value.map(summarizeItem).join(", ") : summarizeItem(value).slice(0, 60)}
      </span>
    </span>
  );
}

export function PillarContentCard(props: PillarContentCardProps) {
  const variant = props.variant ?? "full";
  if (variant === "compact") return <CompactCard {...props} />;
  if (variant === "inline") return <InlineCard {...props} />;
  return <FullCard {...props} />;
}

/** Helper to build pillarContentMap from strategy.pillars */
export function buildPillarContentMap(
  pillars: Array<{ key: string; content: unknown }> | undefined | null,
): Record<string, Record<string, unknown>> {
  const map: Record<string, Record<string, unknown>> = {};
  for (const p of pillars ?? []) {
    map[p.key] = (p.content as Record<string, unknown>) ?? {};
  }
  return map;
}
