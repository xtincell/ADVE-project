const PORTAILS = [
  {
    num: "06 / 1", name: "Cockpit", forWhom: "→ Founder, marque",
    bullets: ["Score ADVE-RTIS /200 et radar 8 piliers en temps réel", "Brandbook, plan media, KV générés par l'OS", "Stratégie Oracle qui se met à jour seule quand le marché bouge"],
    cta: "Accéder au Cockpit ↗",
  },
  {
    num: "06 / 2", name: "Console", forWhom: "→ Opérateur UPgraders",
    bullets: ["Vue écosystème complète — clients, talents, missions, revenus", "Pilote les 7 cerveaux et supervise chaque recommandation IA", "Audit trail immuable sur chaque décision · zéro mutation hors gouvernance"],
    cta: "Accéder à la Console ↗",
    accent: true,
  },
  {
    num: "06 / 3", name: "Creator", forWhom: "→ Freelance, talent",
    bullets: ["Missions matchées automatiquement à ton profil — pas de prospection", "Progression de tier validée par tes livraisons réelles", "Académie + certifications portables · paiement mobile money à la livraison"],
    cta: "Accéder au Creator ↗",
  },
  {
    num: "06 / 4", name: "Agency", forWhom: "→ Agence partenaire",
    bullets: ["Tous tes clients depuis un seul dashboard", "Broadcast multi-canal (Meta / Google / X / TikTok / email / SMS) pour tous tes clients", "API keys sécurisées dans un Credentials Vault · commissions tracées automatiquement"],
    cta: "Accéder à l'Agency ↗",
  },
];

export function MarketingPortails() {
  return (
    <section id="portails" className="py-24 md:py-32">
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)]">
        <div className="flex items-baseline gap-3.5 mb-8 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          <span className="w-8 h-px bg-accent" />
          06 · Portails
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-12 mb-16 items-end">
          <h2 className="font-display font-semibold tracking-tight" style={{ fontSize: "var(--text-display)", lineHeight: 0.96 }}>
            Un OS. <span className="font-serif italic font-medium">Quatre</span> entrées.
          </h2>
          <p className="text-foreground-secondary text-pretty text-base md:text-lg max-w-[60ch]">
            Chaque acteur de l&rsquo;écosystème accède à son espace dédié. Vue, droits et missions calibrés.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
          {PORTAILS.map((p) => (
            <article
              key={p.name}
              className={`p-7 flex flex-col gap-5 min-h-[320px] transition-colors ${
                p.accent ? "bg-accent text-accent-foreground hover:bg-accent-hover" : "bg-background hover:bg-surface-raised"
              }`}
            >
              <header className="flex flex-col gap-1.5">
                <span className={`font-mono text-[11px] uppercase tracking-widest ${p.accent ? "opacity-70" : "text-foreground-muted"}`}>{p.num}</span>
                <h3 className="font-display font-semibold text-2xl tracking-tight">{p.name}</h3>
                <span className={`font-mono text-[11px] mt-1 ${p.accent ? "opacity-70" : "text-foreground-muted"}`}>{p.forWhom}</span>
              </header>
              <ul className="flex flex-col gap-2.5 flex-1">
                {p.bullets.map((b) => (
                  <li key={b} className={`text-sm leading-relaxed pl-5 relative ${p.accent ? "" : "text-foreground-secondary"}`}>
                    <span aria-hidden="true" className={`absolute left-0 top-0 font-mono ${p.accent ? "" : "text-accent"}`}>→</span>
                    {b}
                  </li>
                ))}
              </ul>
              <a href="#" className={`text-sm font-mono pt-4 border-t ${p.accent ? "border-accent-foreground/20" : "border-border text-foreground"}`}>{p.cta}</a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
