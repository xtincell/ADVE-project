"use client";

import { useState } from "react";

function NewsletterBox() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "ok" | "error">("idle");

  const subscribe = async () => {
    if (!email.includes("@")) return;
    setState("pending");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "ok" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="mt-6">
      <div className="font-mono text-2xs uppercase tracking-widest text-foreground-muted mb-2">The Upgrade — newsletter</div>
      {state === "ok" ? (
        <p className="text-sm text-foreground-secondary">Inscription confirmée — bienvenue à bord. ✦</p>
      ) : (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && subscribe()}
            placeholder="votre@email.com"
            className="w-full max-w-[240px] border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={subscribe}
            disabled={state === "pending" || !email.includes("@")}
            className="bg-accent px-4 py-2 font-mono text-2xs uppercase tracking-widest text-accent-foreground hover:opacity-90 disabled:opacity-40"
          >
            {state === "pending" ? "…" : "S'abonner"}
          </button>
        </div>
      )}
      {state === "error" && <p className="mt-1 text-xs text-error">Échec — réessayez.</p>}
      <p className="mt-1.5 text-2xs text-foreground-muted">Stratégie de marque, hebdo. Désinscription en un clic, à chaque envoi.</p>
    </div>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border pt-12 pb-6">
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-12 pb-10 border-b border-border">
        <div className="flex gap-3.5 items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logos/lafusee-logo.png" alt="" aria-hidden="true" className="h-8 w-auto shrink-0" />
          <div>
            <div className="font-semibold tracking-tight text-lg">La Fusée<span className="text-accent">.</span></div>
            <div className="font-mono text-2xs text-foreground-muted">Industry OS — marché créatif africain.</div>
            <NewsletterBox />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <div className="font-mono text-2xs uppercase tracking-widest text-foreground-muted mb-3.5">Doctrine</div>
            <a href="#manifesto" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Manifesto</a>
            <a href="#methode" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">ADVE-RTIS</a>
            <a href="#apogee" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">APOGEE</a>
            <a href="#gouverneurs" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Gouverneurs</a>
          </div>
          <div>
            <div className="font-mono text-2xs uppercase tracking-widest text-foreground-muted mb-3.5">Portails</div>
            <a href="/cockpit" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Cockpit</a>
            <a href="/console" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Console</a>
            <a href="/creator" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Creator</a>
            <a href="/agency" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Agency</a>
            <a href="/LaGuilde" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">La Guilde</a>
          </div>
          <div>
            <div className="font-mono text-2xs uppercase tracking-widest text-foreground-muted mb-3.5">Maison</div>
            <a href="/agency" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">UPgraders</a>
            <a href="/pricing" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Tarifs</a>
            <a href="/changelog" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Changelog</a>
            <a href="/status" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Status</a>
          </div>
          <div>
            <div className="font-mono text-2xs uppercase tracking-widest text-foreground-muted mb-3.5">Conformité</div>
            <a href="/mentions-legales" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Mentions légales</a>
            <a href="/cgu" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">CGU</a>
            <a href="/cgv" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">CGV</a>
            <a href="/sla" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">SLA</a>
            <a href="/privacy" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Confidentialité</a>
            <a href="/dpa" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">DPA</a>
            <a href="/trust-center" className="block py-1 text-sm text-foreground-secondary hover:text-accent transition-colors">Trust Center</a>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] mt-6 flex gap-6 font-mono text-2xs text-foreground-muted flex-wrap">
        <span>UPgraders / La Fusée SARL — 2026</span>
        <span>v6.27.108 · 2026-07-12</span>
        <span>Tous droits réservés.</span>
        <span aria-label="Propriété éditoriale sœur de La Fusée">
          <a href="/argos" className="hover:text-accent transition-colors">
            Argos by La Fusée — éditorial
          </a>
        </span>
      </div>
    </footer>
  );
}
