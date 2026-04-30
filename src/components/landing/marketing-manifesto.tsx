export function MarketingManifesto() {
  return (
    <section id="manifesto" className="py-24 md:py-40">
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)]">
        <div className="flex items-baseline gap-3.5 mb-8 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          <span className="w-8 h-px bg-accent" />
          01 · Doctrine
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-12 lg:gap-24 items-start">
          <h2 className="font-display font-semibold tracking-tight text-balance" style={{ fontSize: "var(--text-display)", lineHeight: 0.96 }}>
            Une marque ne meurt pas oubliée.<br />
            Elle meurt de n&rsquo;avoir <span className="relative inline-block">jamais bougé l&rsquo;axe<span className="absolute inset-x-[-2%] bottom-1 h-[0.18em] bg-accent -z-10" style={{ transform: "skewX(-12deg)" }} /></span>.
          </h2>

          <div className="flex flex-col gap-8">
            <p className="text-foreground-secondary text-pretty max-w-[60ch]" style={{ fontSize: "var(--text-lg)" }}>
              La Fusée ne court pas après les vues. On industrialise <strong className="text-foreground">deux mécaniques</strong> — et seulement deux — qui font qu&rsquo;un secteur se redéfinit autour d&rsquo;une marque.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-stretch mt-4">
              <article className="flex flex-col gap-3.5 p-6 border border-border bg-surface-raised/40">
                <header className="flex items-baseline gap-3.5">
                  <span className="font-mono text-xs text-accent">I.</span>
                  <h3 className="font-display font-semibold text-2xl tracking-tight">Superfans</h3>
                </header>
                <p className="text-sm leading-relaxed text-foreground-secondary">Pas des followers. Pas une communauté tiède. Des évangélistes qui produisent du travail organique pour la marque sans qu&rsquo;on leur demande.</p>
                <p className="text-sm leading-relaxed text-foreground-secondary">Quand cette masse passe le <strong className="text-foreground">seuil critique</strong> de ton secteur, le marché t&rsquo;entend même quand tu te tais.</p>
              </article>

              <div aria-hidden="true" className="hidden md:flex items-center justify-center text-foreground-muted text-2xl font-mono">×</div>

              <article className="flex flex-col gap-3.5 p-6 border border-border bg-surface-raised/40">
                <header className="flex items-baseline gap-3.5">
                  <span className="font-mono text-xs text-accent">II.</span>
                  <h3 className="font-display font-semibold text-2xl tracking-tight">Overton</h3>
                </header>
                <p className="text-sm leading-relaxed text-foreground-secondary">Chaque secteur a une fenêtre d&rsquo;opinions et de codes acceptables. Une marque ICONE ne joue pas dans la fenêtre — elle la <strong className="text-foreground">déplace</strong>.</p>
                <p className="text-sm leading-relaxed text-foreground-secondary">Quand l&rsquo;axe bouge, les concurrents s&rsquo;orientent autour de ta direction. C&rsquo;est ça, le verrouillage culturel.</p>
              </article>
            </div>

            <p className="font-mono text-xs text-foreground-muted pt-4 border-t border-dashed border-border">
              ↳ tout l&rsquo;OS sert ces deux mécaniques. tout le reste est subordonné.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
