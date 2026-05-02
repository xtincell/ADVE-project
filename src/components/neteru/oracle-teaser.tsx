"use client";

/**
 * <OracleTeaser /> — preview redacted Oracle sections to drive Oracle conversion.
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — funnel conversion lever.
 *
 * Mirrors the actual Oracle deliverable (`/shared/strategy/[token]`) which is
 * a 21-section consulting document with structured data (perception gaps,
 * deplacement strategies, roadmap tables…). The teaser shows the SCHEMA of
 * 3 representative sections with their data redacted — this conveys the
 * structural depth of the Oracle, not just "blank text", and creates real
 * FOMO instead of just teasing a paragraph.
 */

import { Lock, Sparkles, ArrowRight } from "lucide-react";

interface OracleTeaserProps {
  brandName: string;
  /** Called when user clicks unlock CTA. */
  onUnlock?: () => void;
  /** Pre-computed price display. Falls back to "Déverrouiller" if absent. */
  unlockPriceLabel?: string;
}

const REDACT_SHORT = "██████████████";
const REDACT_LONG = "████████████████████████████";

export function OracleTeaser({ brandName, onUnlock, unlockPriceLabel }: OracleTeaserProps) {
  return (
    <section className="space-y-5 rounded-2xl border border-border bg-gradient-to-br from-zinc-950 to-zinc-900/60 p-6 print:hidden">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-warning" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warning/80">
            Aperçu — Oracle complet · 21 sections
          </span>
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Le Rapport PDF s&apos;arrête au diagnostic. L&apos;Oracle exécute.
        </h2>
        <p className="text-sm text-foreground-secondary">
          21 sections structurées de stratégie de marque. Voici 3 d&apos;entre elles, telles
          qu&apos;elles apparaîtront pour {brandName} — données masquées.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {/* §12 — Fenêtre d'Overton (mirror du format Oracle réel) */}
        <article className="relative overflow-hidden rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] text-foreground-muted">§12</span>
            <Lock className="h-3.5 w-3.5 text-foreground-muted" />
          </div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Fenêtre d&apos;Overton</h3>

          {/* perception gap — same shape as the real section */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded border border-error/30 bg-error/20 p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-error">Perception actuelle</p>
              <p className="mt-1 text-[11px] text-foreground-muted">{REDACT_SHORT}</p>
            </div>
            <div className="rounded border border-success/30 bg-success/20 p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-success">Perception cible</p>
              <p className="mt-1 text-[11px] text-foreground-muted">{REDACT_SHORT}</p>
            </div>
          </div>
          <div className="mb-3 rounded border border-warning/30 bg-warning/20 p-2">
            <p className="text-[9px] font-bold uppercase text-warning">Écart à combler</p>
            <p className="mt-1 text-[11px] text-foreground-muted">{REDACT_LONG}</p>
          </div>
          <div>
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-foreground-muted">Stratégie de déplacement</p>
            <ul className="space-y-1 text-[11px] text-foreground-muted">
              <li>1. {REDACT_SHORT}</li>
              <li>2. {REDACT_SHORT}</li>
              <li>3. {REDACT_SHORT}</li>
            </ul>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        </article>

        {/* §15 — Profil du superfan idéal */}
        <article className="relative overflow-hidden rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] text-foreground-muted">§15</span>
            <Lock className="h-3.5 w-3.5 text-foreground-muted" />
          </div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Profil du superfan idéal</h3>

          <dl className="space-y-2 text-[11px]">
            {[
              ["Archétype", REDACT_SHORT],
              ["Identité culturelle", REDACT_SHORT],
              ["Rituels d'engagement", REDACT_LONG],
              ["Vocabulaire interne", REDACT_SHORT],
              ["Ennemi commun", REDACT_SHORT],
              ["Canal d'acquisition #1", REDACT_SHORT],
            ].map(([label, val]) => (
              <div key={label} className="border-b border-border/60 pb-1.5">
                <dt className="text-[9px] font-semibold uppercase tracking-wider text-foreground-muted">{label}</dt>
                <dd className="text-foreground-muted">{val}</dd>
              </div>
            ))}
          </dl>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        </article>

        {/* §11 — Plan d'activation 90 jours (roadmap-table style) */}
        <article className="relative overflow-hidden rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] text-foreground-muted">§11</span>
            <Lock className="h-3.5 w-3.5 text-foreground-muted" />
          </div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Plan d&apos;activation 90 jours</h3>

          <div className="mb-3 overflow-hidden rounded border border-border/60">
            <table className="w-full text-[10px] text-foreground-muted">
              <thead className="bg-background/60">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold uppercase tracking-wider text-foreground-secondary">Sprint</th>
                  <th className="px-2 py-1 text-left font-semibold uppercase tracking-wider text-foreground-secondary">Objectif</th>
                  <th className="px-2 py-1 text-left font-semibold uppercase tracking-wider text-foreground-secondary">KPI</th>
                </tr>
              </thead>
              <tbody>
                {["S1 · 0-30j", "S2 · 30-60j", "S3 · 60-90j"].map((sprint) => (
                  <tr key={sprint} className="border-t border-border/60">
                    <td className="px-2 py-1.5 font-mono text-foreground-muted">{sprint}</td>
                    <td className="px-2 py-1.5 text-foreground-muted">{REDACT_SHORT}</td>
                    <td className="px-2 py-1.5 text-foreground-muted">{REDACT_SHORT}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-1 text-[11px] text-foreground-muted">
            <p><span className="font-semibold text-foreground-muted">Budget :</span> {REDACT_SHORT}</p>
            <p><span className="font-semibold text-foreground-muted">Équipe :</span> {REDACT_SHORT}</p>
            <p><span className="font-semibold text-foreground-muted">Tactiques par canal :</span> {REDACT_LONG}</p>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        </article>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-foreground-muted">
        <span>Plus 18 autres sections :</span>
        {[
          "Synthèse exécutive",
          "Audit/Diagnostic",
          "Plateforme stratégique",
          "Territoire créatif",
          "Catalogue d&apos;actions",
          "Médias",
          "KPIs",
          "Budget",
          "Timeline",
          "Équipe",
          "SWOT interne",
          "SWOT externe",
        ].map((label) => (
          <span key={label} className="rounded-full border border-border px-2 py-0.5 text-foreground-muted">
            {label}
          </span>
        ))}
        <span className="text-foreground-muted">+6 autres</span>
      </div>

      {onUnlock && (
        <button
          type="button"
          onClick={onUnlock}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-warning/60 bg-warning/30 px-4 py-3 text-sm font-medium text-warning transition hover:bg-warning/50"
        >
          <Sparkles className="h-4 w-4" />
          <span>{unlockPriceLabel ? `Déverrouiller l'Oracle complet — ${unlockPriceLabel}` : "Déverrouiller l'Oracle complet"}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
