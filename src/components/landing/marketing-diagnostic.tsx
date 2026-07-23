"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Ce que chaque pilier mesure — en clair. Les anciens pseudo-outils
// (« Mestor.scan », « Thot.audit »…) étaient du jargon interne inventé
// face lead (audit intention/exécution 2026-07-16, ADR-0123).
const LETTERS = [
  { l: "A", name: "Authenticité", tool: "qui vous êtes" },
  { l: "D", name: "Distinction", tool: "pourquoi vous" },
  { l: "V", name: "Valeur", tool: "votre promesse" },
  { l: "E", name: "Engagement", tool: "vos superfans" },
  { l: "R", name: "Risque", tool: "vos failles" },
  { l: "T", name: "Track", tool: "votre marché" },
  { l: "I", name: "Innovation", tool: "votre potentiel" },
  { l: "S", name: "Stratégie", tool: "votre cap" },
];

export function MarketingDiagnostic() {
  const [active, setActive] = useState(-1);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // round-14b : `interval` hissé au scope de l'effet et nettoyé dans SON cleanup.
    // Avant, le `return () => clearInterval` était rendu par le callback du setTimeout
    // (jamais appelé par React) → quitter la page pendant l'animation (~2 s) laissait
    // l'interval ticker sur un composant démonté (setActive/setDone sur un unmounted).
    let interval: ReturnType<typeof setInterval> | undefined;
    const handler = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        if (i >= LETTERS.length) {
          clearInterval(interval);
          setDone(true);
          return;
        }
        setActive(i);
        i++;
      }, 350);
    }, 600);
    return () => {
      clearTimeout(handler);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <section id="intake" className="py-24 md:py-32 bg-bone text-ink" style={{ background: "var(--color-background)", color: "var(--color-foreground)" }}>
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)]">
        <div className="flex items-baseline gap-3.5 mb-8 font-mono text-2xs uppercase tracking-widest" style={{ color: "var(--color-foreground-secondary)" }}>
          <span className="w-8 h-px bg-accent" />
          04 · Diagnostic express
        </div>
        <header className="mb-12 max-w-4xl">
          <h2 className="font-display font-semibold tracking-tight mb-5" style={{ fontSize: "var(--text-display)", lineHeight: 0.96, color: "var(--color-foreground)" }}>
            Tu colles ta marque.<br />
            <span className="relative inline-block">15 minutes plus tard, le verdict.<span className="absolute inset-x-[-2%] bottom-1 h-[0.18em] bg-accent -z-10" style={{ transform: "skewX(-12deg)" }} /></span>
          </h2>
          <p className="max-w-[60ch] text-base md:text-lg" style={{ color: "var(--color-foreground-secondary)" }}>
            Pas de questionnaire de 40 pages. Pas de réunion de cadrage. La méthode <strong style={{ color: "var(--color-foreground)" }}>ADVE/RTIS</strong> scanne 8 piliers via un combo d&rsquo;outils maison, et te rend un rapport + une recommandation.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 mb-8" style={{ background: "var(--color-foreground)", color: "var(--color-background)" }}>
          {LETTERS.map((letter, i) => {
            const isActive = i === active && !done;
            const isDone = done || i < active;
            return (
              <div
                key={letter.l}
                className={`flex flex-col gap-1 p-5 border-r border-b last:border-r-0 transition-colors ${
                  isActive ? "bg-accent/15" : isDone ? "bg-success/10" : ""
                }`}
                style={{ borderColor: "var(--color-border)" }}
              >
                <span
                  className="font-serif font-semibold text-4xl leading-none"
                  style={{ color: isActive ? "var(--color-accent)" : isDone ? "var(--color-success)" : "var(--color-background)" }}
                >
                  {letter.l}
                </span>
                <span className="font-mono text-2xs uppercase tracking-widest opacity-70">{letter.name}</span>
                <span className="font-mono text-2xs tracking-wide opacity-50">⌁ {letter.tool}</span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ background: "color-mix(in oklab, var(--color-foreground) 14%, transparent)", border: "1px solid color-mix(in oklab, var(--color-foreground) 14%, transparent)" }}>
          <div className="p-6" style={{ background: "var(--color-background)" }}>
            <div className="font-mono text-xs text-accent uppercase tracking-widest mb-4">⌖ INPUT</div>
            <div className="space-y-3 mb-4">
              <div className="p-3 border bg-bone-2" style={{ borderColor: "color-mix(in oklab, var(--color-foreground) 12%, transparent)", background: "white" }}>
                <div className="text-2xs uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-foreground-secondary)" }}>URL marque</div>
                <div className="text-sm font-mono" style={{ color: "var(--color-foreground)" }}>https://luxorhotels.ci</div>
              </div>
              <div className="p-3 border" style={{ borderColor: "color-mix(in oklab, var(--color-foreground) 12%, transparent)", background: "white" }}>
                <div className="text-2xs uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-foreground-secondary)" }}>Réseaux</div>
                <div className="text-sm font-mono" style={{ color: "var(--color-foreground)" }}>@luxorhotels · 14.2k followers</div>
              </div>
            </div>
            <Link
              href="/intake"
              className="w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors"
            >
              Diagnostiquer ma marque — gratuit
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </Link>
          </div>

          <div className="p-6" style={{ background: "var(--color-background)" }}>
            <div className="font-mono text-xs text-accent uppercase tracking-widest mb-4">⌖ SCAN · 8 piliers</div>
            <ol className="flex flex-col">
              {LETTERS.map((letter, i) => {
                const isActive = i === active && !done;
                const isDone = done || i < active;
                return (
                  <li key={letter.l} className={`grid grid-cols-[14px_1fr_auto] gap-2 items-center py-2 border-b border-dashed last:border-0 transition-opacity ${isActive || isDone ? "opacity-100" : "opacity-50"}`} style={{ borderColor: "color-mix(in oklab, var(--color-foreground) 14%, transparent)" }}>
                    <span className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-accent animate-pulse" : isDone ? "bg-success" : "bg-foreground-muted/30"}`} />
                    <span className="text-sm font-medium font-mono" style={{ color: "var(--color-foreground)" }}>{letter.tool}</span>
                    <span className="text-2xs font-mono uppercase tracking-widest" style={{ color: isActive ? "var(--color-accent)" : isDone ? "var(--color-success)" : "var(--color-foreground-secondary)" }}>
                      {isActive ? "analyse" : isDone ? "OK" : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="p-6" style={{ background: "var(--color-background)" }}>
            <div className="font-mono text-xs text-accent uppercase tracking-widest mb-4">⌖ OUTPUT · rapport + reco</div>
            <div className={`transition-opacity ${done ? "opacity-100" : "opacity-50"}`}>
              <div className="font-mono text-2xs uppercase tracking-widest mb-1" style={{ color: "var(--color-foreground-secondary)" }}>SCORE ADVE/RTIS</div>
              <div className="font-serif font-medium text-5xl mb-1" style={{ color: "var(--color-foreground)" }}>{done ? "115" : "—"}<span className="text-xl" style={{ color: "var(--color-foreground-secondary)" }}>/200</span></div>
              <div className="font-mono text-xs uppercase tracking-widest text-accent mb-4">TIER · ORDINAIRE</div>
              <div className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-foreground)" }}>
                {done
                  ? "Marque FORTE en voix et identité. Mais l'expérience client et le système opérationnel sont sous-développés. Tier ORDINAIRE → potentiel FORTE atteignable en un cycle APOGEE."
                  : "Analyse en cours…"}
              </div>
              <a href="#apogee" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors">
                Engager la trajectoire
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </a>
            </div>
          </div>
        </div>

        <p className="mt-6 font-mono text-xs text-center" style={{ color: "var(--color-foreground-secondary)" }}>
          ⌖ Diagnostic = ~15 min de questionnaire, verdict immédiat à la fin. Production (stratégie écrite, missions, livrables) = 48h. Trajectoire complète = APOGEE.
        </p>
      </div>
    </section>
  );
}
