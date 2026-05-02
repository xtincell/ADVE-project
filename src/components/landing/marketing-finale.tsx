export function MarketingFinale() {
  return (
    <section className="py-24 md:py-40 text-center bg-background relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 100%, color-mix(in oklab, var(--color-accent) 18%, transparent), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] flex flex-col items-center gap-6">
        <p className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Préparation au décollage
        </p>
        <h2 className="font-display font-semibold tracking-tight text-balance mt-2" style={{ fontSize: "var(--text-mega)", lineHeight: 0.92 }}>
          Une trajectoire <span className="font-serif italic font-medium">mesurée</span>.<br />
          Pas une <span className="font-serif italic font-medium text-accent">promesse</span>.
        </h2>
        <p className="max-w-[60ch] text-foreground-secondary text-base md:text-lg">
          15 minutes pour le rapport diagnostic. 30 jours pour les premiers livrables. 90 jours pour le premier palier mesurable. La Fusée signe ses transitions avec des chiffres — pas avec des slides.
        </p>
        <div className="flex gap-3 flex-wrap justify-center mt-3">
          <a href="#intake" className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors">
            Diagnostiquer ma marque
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </a>
          <a href="#manifesto" className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium border border-border-strong hover:bg-surface-elevated transition-colors">
            Lire la doctrine complète
          </a>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted">↳ gratuit · 15 min · sans engagement</p>
        <div className="flex gap-4 items-center mt-8 pt-6 border-t border-border font-mono text-[11px] text-foreground-muted flex-wrap justify-center">
          <span>UPgraders · Industry OS</span>
          <span aria-hidden="true" className="text-accent">●</span>
          <span>Abidjan · Douala · Dakar · Lagos</span>
        </div>
      </div>
    </section>
  );
}
