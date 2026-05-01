const PLANS = [
  {
    name: "RAMPE 01", title: "Diagnostic", lead: "Pour calibrer l'altitude actuelle de la marque.",
    price: "Gratuit", per: "— en self-service",
    feats: ["Score ADVE-RTIS /200", "Radar 8 piliers", "1 plan d'action priorisé"],
    cta: "Lancer le diagnostic →", href: "#intake", featured: false,
  },
  {
    name: "RAMPE 02", title: "Propulsion", lead: "L'OS complet pour aller de FORTE à CULTE.",
    price: "Sur devis", per: "— pricing par palier",
    feats: ["Tout le Diagnostic +", "Stratégie Oracle (35 sections, 4 tiers — ADR-0014)", "12 missions / trimestre · talents tier 1–3", "Cockpit founder + Cockpit ops"],
    cta: "Briefer un opérateur →", href: "#contact", featured: true,
  },
  {
    name: "RAMPE 03", title: "Apex", lead: "Pour les candidats à l'ICONE — sentinelles activées.",
    price: "Partenariat", per: "— sélectionné",
    feats: ["Tout Propulsion +", "3 sentinelles cron actives", "Couverture cross-secteur", "Compte tenu directement par UPgraders"],
    cta: "Postuler →", href: "#contact", featured: false,
  },
];

export function MarketingPricing() {
  return (
    <section id="tarifs" data-theme="bone" className="py-24 md:py-32 bg-background text-foreground">
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)]">
        <div className="flex items-baseline gap-3.5 mb-8 font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--color-foreground-secondary)" }}>
          <span className="w-8 h-px bg-accent" />
          07 · Tarifs
        </div>
        <header className="mb-16 max-w-3xl">
          <h2 className="font-display font-semibold tracking-tight" style={{ fontSize: "var(--text-display)", lineHeight: 0.96, color: "var(--color-foreground)" }}>
            Trois rampes.<br />
            Une seule promesse : <span className="relative inline-block">décollage en 48h.<span className="absolute inset-x-[-2%] bottom-1 h-[0.18em] bg-accent -z-10" style={{ transform: "skewX(-12deg)" }} /></span>
          </h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <article
              key={plan.title}
              className={`p-8 flex flex-col gap-5 relative min-h-[460px] ${
                plan.featured
                  ? "bg-ink-0 text-bone"
                  : "bg-white border"
              }`}
              style={
                plan.featured
                  ? { background: "var(--color-foreground)", color: "var(--color-background)" }
                  : { background: "white", borderColor: "color-mix(in oklab, var(--color-foreground) 18%, transparent)" }
              }
            >
              {plan.featured && (
                <span className="absolute -top-3 left-8 px-2.5 py-1 bg-accent text-accent-foreground font-mono text-[10px] uppercase tracking-widest">★ Phare</span>
              )}
              <header className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] uppercase tracking-widest text-accent">{plan.name}</span>
                <h3 className="font-display font-semibold text-3xl tracking-tight">{plan.title}</h3>
                <p className="text-sm" style={{ color: plan.featured ? "var(--color-foreground-muted)" : "var(--color-foreground-secondary)" }}>{plan.lead}</p>
              </header>
              <div className="flex items-baseline gap-3 py-4 border-y" style={{ borderColor: plan.featured ? "color-mix(in oklab, var(--color-background) 14%, transparent)" : "color-mix(in oklab, var(--color-foreground) 12%, transparent)" }}>
                <span className="font-display font-semibold text-3xl tracking-tight">{plan.price}</span>
                <span className="text-xs" style={{ color: plan.featured ? "var(--color-foreground-muted)" : "var(--color-foreground-secondary)" }}>{plan.per}</span>
              </div>
              <ul className="flex flex-col gap-2.5 flex-1">
                {plan.feats.map((f) => (
                  <li key={f} className="text-sm leading-relaxed pl-5 relative">
                    <span aria-hidden="true" className="absolute left-0 top-0 text-accent font-bold">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.href}
                className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium self-start ${
                  plan.featured ? "bg-accent text-accent-foreground hover:bg-accent-hover" : "border border-current hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
                }`}
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
