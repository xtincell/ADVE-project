"use client";

import { trpc } from "@/lib/trpc/client";
import { DiagnosticCta } from "./diagnostic-modal";

export function MarketingHero() {
  // Compteur RÉEL de diagnostics complétés (publicProcedure, même source que la
  // page intake). L'ancien panneau « TELEMETRY · LIVE » affichait des chiffres
  // inventés (127 marques, 142 388 superfans, « updated: now ») — purgé (audit
  // intention/exécution 2026-07-16 : un chiffre fabriqué face lead viole le
  // canon d'honnêteté « des chiffres, pas des slides »).
  const { data: diagnosedCount } = trpc.quickIntake.getCompletedCount.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });
  return (
    <header className="relative min-h-screen pt-24 pb-16 overflow-hidden flex flex-col">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, var(--color-foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--color-foreground) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 80% 110%, color-mix(in oklab, var(--color-accent) 18%, transparent), transparent 55%), radial-gradient(ellipse at 10% 80%, color-mix(in oklab, var(--color-accent-secondary) 8%, transparent), transparent 50%)",
        }}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/illustrations/rocket-3d.png"
        alt=""
        aria-hidden="true"
        className="up-float pointer-events-none absolute right-[5%] top-[26%] z-[1] hidden w-36 opacity-95 drop-shadow-2xl xl:w-44 lg:block"
      />

      <div className="relative z-10 flex items-center gap-4 px-[var(--pad-page)] py-3.5 text-2xs font-mono text-foreground-muted border-b border-border-subtle flex-wrap">
        <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse mr-1.5"></span>SYSTEM · NOMINAL</span>
        {typeof diagnosedCount === "number" && diagnosedCount > 0 ? (
          <>
            <span className="text-[color-mix(in_oklab,var(--color-foreground-muted)_60%,transparent)]">·</span>
            <span>{diagnosedCount} MARQUE{diagnosedCount > 1 ? "S" : ""} DIAGNOSTIQUÉE{diagnosedCount > 1 ? "S" : ""}</span>
          </>
        ) : null}
        <span className="text-[color-mix(in_oklab,var(--color-foreground-muted)_60%,transparent)]">·</span>
        <span>ABIDJAN · DOUALA · DAKAR · LAGOS</span>
        <span className="text-[color-mix(in_oklab,var(--color-foreground-muted)_60%,transparent)]">·</span>
        <span>DIAGNOSTIC GRATUIT · 15 MIN</span>
      </div>

      <div className="relative z-10 mx-auto max-w-[var(--maxw-content)] w-full px-[var(--pad-page)] flex-1 flex flex-col pt-12 md:pt-20">
        <div className="inline-flex items-center gap-2.5 mb-7 text-2xs font-mono uppercase tracking-widest text-foreground-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Industry OS — marché créatif africain
        </div>

        <h1 className="font-display font-semibold tracking-tighter mb-12" style={{ fontSize: "var(--text-mega)", lineHeight: 0.92 }}>
          De la <span className="font-serif italic font-medium">poussière</span><br />
          à <span className="relative inline-block">l&rsquo;étoile<span className="absolute inset-x-[-2%] bottom-1 h-[0.18em] bg-accent -z-10" style={{ transform: "skewX(-12deg)" }} /></span>.
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)] gap-12 lg:gap-24 items-end mt-auto pb-12">
          <div className="flex flex-col gap-7">
            <p className="text-foreground-secondary text-pretty max-w-[60ch]" style={{ fontSize: "var(--text-lg)", lineHeight: 1.45 }}>
              Tu colles ton site, tes réseaux, ton brief.{" "}
              <strong className="text-foreground">Le rapport diagnostic tombe en 15 minutes</strong>
              {" — score sur 200, radar 8 piliers, plan d’action priorisé. Puis l’OS prend le relais : stratégie écrite, missions en production, freelances qui livrent."}
            </p>
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-3 flex-wrap">
                {/* Façade unique V2 — le mini-funnel porté de /landingintake :
                    3 champs + méthode → /intake pré-rempli (capture CRM best-effort). */}
                <DiagnosticCta className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors motion-safe:[animation:glow-pulse-cta_3s_ease-in-out_infinite]">
                  Diagnostiquer ma marque
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </DiagnosticCta>
                <a href="/scorer" className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium border border-accent text-accent hover:bg-accent/10 transition-colors">
                  Scorer ma marque — 1 min
                </a>
                <a href="#manifesto" className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium border border-border-strong text-foreground hover:bg-surface-elevated transition-colors">
                  Lire le manifeste
                </a>
                <a href="#tarifs" className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium border border-border-subtle text-foreground-secondary hover:text-foreground hover:border-border-strong transition-colors">
                  Voir les offres
                </a>
              </div>
              <p className="font-mono text-2xs uppercase tracking-widest text-foreground-muted">↳ gratuit · 15 min · sans engagement · PDF brandé en option payante</p>
              <p className="font-mono text-2xs uppercase tracking-widest text-foreground-muted pt-3 mt-1 border-t border-dashed border-border-subtle">
                Pas founder ?
                <a href="#portails" className="ml-2 text-foreground-secondary hover:text-accent transition-colors">→ Agence</a>
                <a href="#portails" className="ml-2 text-foreground-secondary hover:text-accent transition-colors">→ Créatif</a>
                <a href="#portails" className="ml-2 text-foreground-secondary hover:text-accent transition-colors">→ Opérateur UPgraders</a>
              </p>
            </div>
          </div>

          <aside className="border border-border bg-surface-raised/70 backdrop-blur-sm">
            <header className="flex items-center gap-2 px-3.5 py-2.5 text-2xs font-mono uppercase tracking-widest text-foreground-secondary border-b border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              SYSTÈME · MESURABLE
            </header>
            {/* Chiffre réel (compteur live) + constantes produit vérifiables — jamais
                de métriques inventées présentées comme de la télémétrie. */}
            <ul className="font-mono text-xs">
              {[
                ["marques.diagnostiquées", typeof diagnosedCount === "number" ? String(diagnosedCount) : "—"],
                ["piliers.scannés", "8"],
                ["sections.stratégie", "35"],
                ["paliers.trajectoire", "6"],
                ["score.échelle", "/200"],
              ].map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3 px-3.5 py-2 border-b border-border-subtle last:border-0">
                  <span className="text-foreground-muted">{k}</span>
                  <span className={k === "score.échelle" ? "text-accent" : "text-foreground"}>{v}</span>
                </li>
              ))}
            </ul>
            <footer className="flex justify-between px-3.5 py-2.5 text-2xs font-mono text-foreground-muted border-t border-border">
              <span>↳ vos métriques réelles</span>
              <span>dès le diagnostic</span>
            </footer>
          </aside>
        </div>
      </div>
    </header>
  );
}
