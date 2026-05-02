"use client";

/**
 * <RapportPdfPreview /> — paywall FOMO for the Rapport ADVE+RTIS PDF.
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — funnel conversion lever (PDF tier).
 *
 * Shown to UNPAID users above the unlock CTA. Reproduces the structure of the
 * actual PDF (cover, diagnostic ADVE per pilier, RTIS, recommendation, annexe
 * verbatim) as small "page-thumbnail" cards. The first thumbnails surface
 * actual extracted content (founder voice from `Pillar.content`) so the user
 * sees their own brand reflected back; downstream sections are redacted to
 * preserve scarcity.
 */

import { FileText, Lock, ArrowRight, FileDown } from "lucide-react";

interface RapportPdfPreviewProps {
  brandName: string;
  classification: string;
  /** Sample of the founder's own ADVE values to surface on page 1 (auth hook). */
  authVerbatimSample?: string;
  centralTension?: string;
  /** Pre-computed price display for the unlock CTA. */
  unlockPriceLabel?: string;
  onUnlock?: () => void;
  unlockDisabled?: boolean;
}

const REDACT = "████████████████";
const REDACT_LONG = "████████████████████████████";

interface PageThumbProps {
  pageNum: string;
  label: string;
  children: React.ReactNode;
  redacted?: boolean;
}

function PageThumb({ pageNum, label, children, redacted }: PageThumbProps) {
  return (
    <article className="relative flex h-56 flex-col overflow-hidden rounded-md border border-border/60 bg-foreground p-3 text-[10px] leading-snug text-foreground-muted shadow-[0_1px_0_rgba(0,0,0,0.4),0_8px_24px_-6px_rgba(0,0,0,0.6)]">
      <div className="mb-2 flex items-center justify-between border-b border-border-subtle pb-1">
        <span className="font-mono text-[9px] uppercase tracking-wider text-foreground-muted">{label}</span>
        <span className="font-mono text-[9px] text-foreground-secondary">p. {pageNum}</span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-hidden">{children}</div>
      {redacted && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-zinc-50 via-zinc-50/70 to-transparent" />
          <div className="pointer-events-none absolute right-2 top-2">
            <Lock className="h-3 w-3 text-foreground-muted" />
          </div>
        </>
      )}
    </article>
  );
}

export function RapportPdfPreview({
  brandName,
  classification,
  authVerbatimSample,
  centralTension,
  unlockPriceLabel,
  onUnlock,
  unlockDisabled,
}: RapportPdfPreviewProps) {
  return (
    <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-subtle/20 via-card to-card p-6 sm:p-8 print:hidden">
      <header className="mb-5 flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <FileDown className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
            Rapport ADVE+RTIS — PDF intégral
          </p>
          <h2 className="mt-0.5 text-lg font-bold text-foreground">
            Le diagnostic complet de {brandName}, partageable, brandé.
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Voici à quoi ressemble votre PDF — 8 pages, votre voix verbatim, votre tension centrale,
            vos 4 piliers ADVE et 4 piliers RTIS. Cliquez pour le générer.
          </p>
        </div>
      </header>

      {/* Page-thumbnails grid */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {/* Page 1 — Cover (visible) */}
        <PageThumb pageNum="1" label="Couverture">
          <div className="flex h-full flex-col items-center justify-center text-center">
            <FileText className="mb-2 h-6 w-6 text-foreground-secondary" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">Rapport ADVE+RTIS</p>
            <p className="mt-1 line-clamp-2 text-[10px] font-semibold text-foreground-muted">{brandName}</p>
            <span className="mt-2 rounded-full border border-border-subtle px-2 py-0.5 text-[9px] uppercase tracking-wider text-foreground-muted">
              Niveau {classification}
            </span>
          </div>
        </PageThumb>

        {/* Page 2 — Tension + ADVE preview (visible, hooks the founder) */}
        <PageThumb pageNum="3" label="Diagnostic ADVE">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-foreground-muted">Tension centrale</p>
          <p className="line-clamp-2 italic text-foreground-muted">
            {centralTension ? `« ${centralTension.slice(0, 110)}${centralTension.length > 110 ? "…" : ""} »` : `« ${REDACT_LONG} »`}
          </p>
          {authVerbatimSample && (
            <>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-foreground-muted">Votre voix (verbatim)</p>
              <p className="line-clamp-3 text-foreground-muted">«&nbsp;{authVerbatimSample.slice(0, 130)}{authVerbatimSample.length > 130 ? "…" : ""}&nbsp;»</p>
            </>
          )}
        </PageThumb>

        {/* Page 3 — RTIS preview (redacted, drives the FOMO) */}
        <PageThumb pageNum="5" label="Proposition stratégique RTIS" redacted>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-foreground-muted">R · Risque (P0)</p>
          <p className="text-foreground-muted">{REDACT_LONG}</p>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-foreground-muted">T · Track (P1)</p>
          <p className="text-foreground-muted">{REDACT_LONG}</p>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-foreground-muted">I · Innovation (P1)</p>
          <p className="text-foreground-muted">{REDACT}</p>
        </PageThumb>

        {/* Page 4 — Recommandation actions (redacted) */}
        <PageThumb pageNum="6" label="Actions priorisées" redacted>
          <p className="text-[9px] font-bold uppercase tracking-wider text-foreground-muted">Mouvement stratégique</p>
          <p className="text-foreground-muted">{REDACT_LONG}</p>
          <ul className="mt-2 space-y-1 text-foreground-muted">
            <li>#1 [0-30j] {REDACT}</li>
            <li>#2 [0-30j] {REDACT}</li>
            <li>#3 [30-90j] {REDACT}</li>
            <li>#4 [30-90j] {REDACT}</li>
          </ul>
        </PageThumb>

        {/* Page 5 — Roadmap 90j (redacted) */}
        <PageThumb pageNum="7" label="Feuille de route 90j" redacted>
          <table className="w-full text-[9px]">
            <thead>
              <tr className="border-b border-border-subtle text-foreground-muted">
                <th className="text-left font-semibold uppercase">Phase</th>
                <th className="text-left font-semibold uppercase">À prouver</th>
              </tr>
            </thead>
            <tbody className="text-foreground-muted">
              <tr className="border-b border-border-subtle"><td className="py-1 font-mono">0-30j</td><td>{REDACT}</td></tr>
              <tr className="border-b border-border-subtle"><td className="py-1 font-mono">30-60j</td><td>{REDACT}</td></tr>
              <tr><td className="py-1 font-mono">60-90j</td><td>{REDACT}</td></tr>
            </tbody>
          </table>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-foreground-muted">Risques à surveiller</p>
          <p className="text-foreground-muted">{REDACT_LONG}</p>
        </PageThumb>

        {/* Page 6 — Annexe verbatim (redacted, hints at completeness) */}
        <PageThumb pageNum="8" label="Annexe verbatim" redacted>
          <p className="text-[9px] font-bold uppercase tracking-wider text-foreground-muted">Toutes vos réponses, par pilier</p>
          {["A · Authenticité", "D · Distinction", "V · Valeur", "E · Engagement"].map((h) => (
            <div key={h} className="mt-1.5">
              <p className="text-[9px] font-semibold text-foreground-muted">{h}</p>
              <p className="text-foreground-muted">{REDACT}</p>
            </div>
          ))}
        </PageThumb>
      </div>

      {/* Inclusions */}
      <ul className="mb-5 grid gap-1.5 text-xs text-foreground-secondary sm:grid-cols-2">
        {[
          "Synthèse exécutive ancrée sur la tension centrale",
          "ADVE complet — 4 paragraphes verbatim de votre voix",
          "RTIS complet — Risque/Track/Innovation/Stratégie",
          "5 actions priorisées avec 2 exemples concrets chacune",
          "Roadmap 90 jours par sprint",
          "Annexe verbatim — toutes vos réponses",
        ].map((line) => (
          <li key={line} className="flex items-start gap-2">
            <span className="mt-0.5 text-primary">✓</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {onUnlock && (
        <button
          type="button"
          onClick={onUnlock}
          disabled={unlockDisabled}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Débloquer le PDF — {unlockPriceLabel ?? "—"}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
