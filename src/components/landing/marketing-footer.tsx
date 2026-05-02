export function MarketingFooter() {
  return (
    <footer className="border-t border-border pt-12 pb-6">
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-12 pb-10 border-b border-border">
        <div className="flex gap-3.5 items-center">
          <span aria-hidden="true">
            <svg viewBox="0 0 32 32" width="22" height="22" fill="none">
              <rect x="14" y="2" width="4" height="22" fill="var(--color-foreground)" />
              <path d="M16 2 L20 8 L12 8 Z" fill="var(--color-accent)" />
              <rect x="10" y="20" width="12" height="4" fill="var(--color-foreground)" />
              <path d="M10 24 L16 30 L22 24 Z" fill="var(--color-accent)" />
            </svg>
          </span>
          <div>
            <div className="font-semibold tracking-tight text-lg">La Fusée<span className="text-accent">.</span></div>
            <div className="font-mono text-[11px] text-foreground-muted">Industry OS — marché créatif africain.</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted mb-3.5">Doctrine</div>
            <a href="#manifesto" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Manifesto</a>
            <a href="#methode" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">ADVE-RTIS</a>
            <a href="#apogee" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">APOGEE</a>
            <a href="#gouverneurs" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Gouverneurs</a>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted mb-3.5">Portails</div>
            <a href="/cockpit" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Cockpit</a>
            <a href="/console" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Console</a>
            <a href="/creator" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Creator</a>
            <a href="/agency" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Agency</a>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted mb-3.5">Maison</div>
            <a href="#" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">UPgraders</a>
            <a href="/changelog" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Changelog</a>
            <a href="/status" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Status</a>
            <a href="#" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Confidentialité</a>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] mt-6 flex gap-6 font-mono text-[11px] text-foreground-muted flex-wrap">
        <span>UPgraders / La Fusée SARL — 2026</span>
        <span>v6.0.1 · 2026-05-02</span>
        <span>Tous droits réservés.</span>
      </div>
    </footer>
  );
}
