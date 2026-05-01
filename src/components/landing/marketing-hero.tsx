"use client";

export function MarketingHero() {
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

      <div className="relative z-10 flex items-center gap-4 px-[var(--pad-page)] py-3.5 text-[11px] font-mono text-foreground-muted border-b border-border-subtle flex-wrap">
        <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse mr-1.5"></span>SYSTEM · NOMINAL</span>
        <span className="text-[color-mix(in_oklab,var(--color-foreground-muted)_60%,transparent)]">·</span>
        <span>7 GOUVERNEURS · 1 OPÉRATEUR</span>
        <span className="text-[color-mix(in_oklab,var(--color-foreground-muted)_60%,transparent)]">·</span>
        <span>MISSIONS EN VOL · 47</span>
        <span className="text-[color-mix(in_oklab,var(--color-foreground-muted)_60%,transparent)]">·</span>
        <span>SCORE MOYEN /200 · 142</span>
      </div>

      <div className="relative z-10 mx-auto max-w-[var(--maxw-content)] w-full px-[var(--pad-page)] flex-1 flex flex-col pt-12 md:pt-20">
        <div className="inline-flex items-center gap-2.5 mb-7 text-[11px] font-mono uppercase tracking-widest text-foreground-muted">
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
              Tu colles ton site, tes réseaux, ton brief. <strong className="text-foreground">Le diagnostic ADVE-RTIS tombe instantanément</strong> — score /200, radar 8 piliers, rapport et recommandation. Puis l&rsquo;OS prend le relais : stratégie écrite, missions en production, freelances qui livrent.
            </p>
            <div className="flex gap-3 flex-wrap">
              <a href="#intake" className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors">
                Diagnostiquez votre marque
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </a>
              <a href="#manifesto" className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium border border-border-strong text-foreground hover:bg-surface-elevated transition-colors">
                Lire le manifeste
              </a>
            </div>
          </div>

          <aside className="border border-border bg-surface-raised/70 backdrop-blur-sm">
            <header className="flex items-center gap-2 px-3.5 py-2.5 text-[10px] font-mono uppercase tracking-widest text-foreground-secondary border-b border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              TELEMETRY · LIVE
            </header>
            <ul className="font-mono text-xs">
              {[
                ["brand.diagnosed", "127"],
                ["apogee.icone", "3"],
                ["superfans.tracked", "142,388"],
                ["overton.shifts", "7 secteurs"],
                ["talents.tier_3+", "214"],
              ].map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3 px-3.5 py-2 border-b border-border-subtle last:border-0">
                  <span className="text-foreground-muted">{k}</span>
                  <span className={k === "overton.shifts" ? "text-accent" : "text-foreground"}>{v}</span>
                </li>
              ))}
            </ul>
            <footer className="flex justify-between px-3.5 py-2.5 text-[10px] font-mono text-foreground-muted border-t border-border">
              <span>↳ updated</span>
              <span>now</span>
            </footer>
          </aside>
        </div>
      </div>
    </header>
  );
}
