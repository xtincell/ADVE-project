const TIERS = [
  { i: 6, num: "06", name: "ICONE", alt: "APEX · plafond cassé", proofs: ["Référence culturelle", "Marché redéfini", "Influence transversale"], metric: "Cult Index > 0.85 · Overton déflecté", cron: "DEFEND_LEGACY" },
  { i: 5, num: "05", name: "CULTE", alt: "plafond haut · communauté", proofs: ["NPS > 70", "UGC organique soutenu", "Tribu identifiable"], metric: "Cult Index > 0.7 · NPS > 70", cron: "MAINTAIN_APOGEE" },
  { i: 4, num: "04", name: "FORTE", alt: "plafond moyen · traction", proofs: ["Top of mind sectoriel", "Distribution maîtrisée", "Pricing power +20%"], metric: "Score > 120/200 · pricing +20%", cron: "DEFEND_OVERTON" },
  { i: 3, num: "03", name: "ORDINAIRE", alt: "bas plafond · interchangeable", proofs: ["Identité reconnue", "Promesse claire", "Mais pas différenciante"], metric: "Score 100–120/200", cron: "EXPAND_SECTOR" },
  { i: 2, num: "02", name: "FRAGILE", alt: "décollage · instable", proofs: ["Présence existe", "Pas de système", "Tout repose sur 1 personne"], metric: "Score 80–100/200", cron: "STABILIZE_BASE" },
  { i: 1, num: "01", name: "ZOMBIE", alt: "SOL · invisible", proofs: ["Notoriété quasi nulle", "Aucune trace mesurable", "Existe sans exister"], metric: "Score < 80/200", cron: "DETECT_PULSE" },
];

export function MarketingApogee() {
  return (
    <section id="apogee" className="py-24 md:py-32 bg-background relative">
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)]">
        <div className="flex items-baseline gap-3.5 mb-6 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          <span className="w-8 h-px bg-accent" />
          APOGEE · Trajectoire
        </div>
        <header className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-8 lg:gap-20 items-end mb-16">
          <div>
            <div className="inline-flex items-center gap-3 mb-5 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              ↳ DE ZOMBIE À ICÔNE · 6 PALIERS · UNE SEULE DIRECTION
            </div>
            <h2 className="font-display font-semibold tracking-tight text-balance" style={{ fontSize: "clamp(56px,7vw,104px)", lineHeight: 0.98 }}>
              La marque <span className="font-serif italic font-medium">décolle.</span><br />
              Ou elle <span className="font-serif italic font-medium text-accent">retombe.</span>
            </h2>
          </div>
          <p className="text-foreground-secondary text-pretty max-w-[50ch] text-base md:text-lg leading-relaxed">
            Aucune marque ne saute de palier. Aucune ne reste indéfiniment au sol — si elle accepte la doctrine. Chaque palier a ses <strong className="text-foreground">preuves</strong>, ses <strong className="text-foreground">gates</strong>, et ses <strong className="text-foreground">sentinelles cron</strong> qui défendent l&rsquo;altitude.
          </p>
        </header>

        <ol className="flex flex-col">
          {TIERS.map((t) => (
            <li
              key={t.i}
              data-i={t.i}
              className={`grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_auto] gap-6 items-center py-6 md:py-8 border-t border-border last:border-b transition-colors ${
                t.i === 6 ? "bg-gradient-to-r from-accent/5 to-transparent" : ""
              } ${t.i === 1 ? "opacity-55" : ""}`}
            >
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">{t.num}</span>
                <span className={`font-display font-semibold text-3xl md:text-4xl tracking-tight ${t.i === 6 ? "text-accent" : t.i === 1 ? "text-foreground-muted" : "text-foreground"}`}>
                  {t.name}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">{t.alt}</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">PREUVES</span>
                <ul className="flex flex-col gap-1 text-sm leading-relaxed text-foreground-secondary">
                  {t.proofs.map((p) => (
                    <li key={p} className="relative pl-3.5 before:content-[''] before:absolute before:left-0 before:top-[0.5em] before:w-1.5 before:h-px before:bg-foreground-muted">{p}</li>
                  ))}
                </ul>
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent pt-1.5 mt-1 border-t border-dashed border-border-subtle">↳ {t.metric}</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted inline-flex items-center gap-2 whitespace-nowrap">
                <span className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                CRON · {t.cron}
              </span>
            </li>
          ))}
        </ol>

        <footer className="mt-12 pt-6 border-t border-dashed border-border-subtle flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <p className="font-mono text-xs text-foreground-muted max-w-[60ch]">
            ↳ La trajectoire APOGEE n&rsquo;est pas une promesse. C&rsquo;est un protocole. Et il est mesurable.
          </p>
          <a href="/intake" className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline whitespace-nowrap">
            Trouver ton palier en 15 min
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </a>
        </footer>
      </div>
    </section>
  );
}
