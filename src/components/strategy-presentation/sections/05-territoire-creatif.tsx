"use client";

import type { TerritoireCreatifSection } from "@/server/services/strategy-presentation/types";
import { KvPromptCard } from "../shared/kv-prompt-card";

interface Props { data: TerritoireCreatifSection }

export function TerritoireCreatif({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* Concept creatif */}
      {data.conceptGenerator && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Concept creatif</h3>
          <GloryBlock data={data.conceptGenerator} />
        </div>
      )}

      {/* Direction artistique */}
      {data.directionArtistique && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Direction artistique</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.moodboard && <MiniGloryCard title="Moodboard" data={data.moodboard} />}
            {data.chromaticStrategy && <MiniGloryCard title="Strategie chromatique" data={data.chromaticStrategy} />}
            {data.typographySystem && <MiniGloryCard title="Systeme typographique" data={data.typographySystem} />}
            {data.logoAdvice && <MiniGloryCard title="Direction logo" data={data.logoAdvice} />}
          </div>
        </div>
      )}

      {/* KV Banana Prompts */}
      <KvPromptCard data={data.kvPrompts} />
    </div>
  );
}

function GloryBlock({ data }: { data: Record<string, unknown> }) {
  // Render key fields intelligently
  const entries = Object.entries(data).filter(([, v]) => v != null && v !== "");
  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      {entries.slice(0, 8).map(([key, value]) => (
        <div key={key}>
          <p className="text-xs font-semibold uppercase text-zinc-600">{key.replace(/_/g, " ")}</p>
          <p className="mt-0.5 text-sm text-zinc-300">
            {typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : JSON.stringify(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function MiniGloryCard({ title, data }: { title: string; data: Record<string, unknown> }) {
  const summary = Object.entries(data)
    .filter(([, v]) => typeof v === "string" || Array.isArray(v))
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase text-orange-400">{title}</h4>
      {summary.map(([key, value]) => (
        <div key={key} className="mt-1">
          <span className="text-xs text-zinc-600">{key.replace(/_/g, " ")}: </span>
          <span className="text-xs text-zinc-400">
            {typeof value === "string" ? value : Array.isArray(value) ? value.slice(0, 5).join(", ") : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
