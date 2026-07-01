"use client";

import type { TerritoireCreatifSection } from "@/server/services/strategy-presentation/types";
import { KvPromptCard } from "../shared/kv-prompt-card";

interface Props { data: TerritoireCreatifSection }

export function TerritoireCreatif({ data }: Props) {
  const da = (data.directionArtistique ?? {}) as Record<string, unknown>;
  const subCards = [
    data.moodboard && { title: "Moodboard", d: data.moodboard },
    data.chromaticStrategy && { title: "Strategie chromatique", d: data.chromaticStrategy },
    data.typographySystem && { title: "Systeme typographique", d: data.typographySystem },
    data.logoAdvice && { title: "Direction logo", d: data.logoAdvice },
  ].filter(Boolean) as Array<{ title: string; d: Record<string, unknown> }>;
  // Champs propres de la direction artistique (hors sous-cartes déjà extraites).
  const daOwnEntries = Object.entries(da).filter(
    ([k, v]) => !["moodboard", "chromaticStrategy", "typographySystem", "logoAdvice"].includes(k) && v != null && v !== "",
  );
  const hasAny =
    !!data.conceptGenerator || subCards.length > 0 || daOwnEntries.length > 0 || !!data.kvPrompts;

  if (!hasAny) {
    return (
      <p className="text-sm text-foreground-muted">
        Territoire créatif non encore forgé — concept, moodboard, stratégie chromatique et système
        typographique seront produits par les Glory tools créatifs (pilier D).
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Concept creatif */}
      {data.conceptGenerator && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Concept creatif</h3>
          <GloryBlock data={data.conceptGenerator} />
        </div>
      )}

      {/* Direction artistique */}
      {(subCards.length > 0 || daOwnEntries.length > 0) && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Direction artistique</h3>
          {daOwnEntries.length > 0 && <GloryBlock data={Object.fromEntries(daOwnEntries)} />}
          {subCards.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {subCards.map(({ title, d }) => (
                <MiniGloryCard key={title} title={title} data={d} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* KV Banana Prompts */}
      {data.kvPrompts && <KvPromptCard data={data.kvPrompts} />}
    </div>
  );
}

/** Rend une valeur arbitraire proprement — jamais de JSON.stringify brut. */
function renderValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : v && typeof v === "object" ? Object.values(v as object).filter((x) => typeof x === "string").join(" — ") : ""))
      .filter(Boolean)
      .join(", ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([k, v]) => !k.startsWith("_") && (typeof v === "string" || typeof v === "number"))
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
      .slice(0, 4)
      .join(" · ");
  }
  return "";
}

function GloryBlock({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data)
    .filter(([k, v]) => !k.startsWith("_") && v != null && v !== "")
    .map(([k, v]) => [k, renderValue(v)] as const)
    .filter(([, v]) => v !== "");
  if (entries.length === 0) return null;
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
      {entries.slice(0, 8).map(([key, value]) => (
        <div key={key}>
          <p className="text-xs font-semibold uppercase text-foreground-muted">{key.replace(/_/g, " ")}</p>
          <p className="mt-0.5 text-sm text-foreground-secondary">{value}</p>
        </div>
      ))}
    </div>
  );
}

function MiniGloryCard({ title, data }: { title: string; data: Record<string, unknown> }) {
  const summary = Object.entries(data)
    .filter(([k, v]) => !k.startsWith("_") && v != null && v !== "")
    .map(([k, v]) => [k, renderValue(v)] as const)
    .filter(([, v]) => v !== "")
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-border bg-background/50 p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase text-accent">{title}</h4>
      {summary.map(([key, value]) => (
        <div key={key} className="mt-1">
          <span className="text-xs text-foreground-muted">{key.replace(/_/g, " ")}: </span>
          <span className="text-xs text-foreground-secondary">{value}</span>
        </div>
      ))}
    </div>
  );
}
