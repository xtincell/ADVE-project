"use client";

import { useState } from "react";

const TARGETS = [
  {
    id: "founder", actor: "01 · founder", name: "FONDATEUR",
    angle: -135, dist: 140, coord: "NW.41 / -42",
    pillar: "PILIER E · EXPÉRIENCE",
    score: "−42", scoreLabel: "/100 vs benchmark",
    quote: "Tu paies tier 1, tu reçois tier 3.",
    copy: "Bureaux internationaux qui te traitent en client secondaire. Localement, choix entre débrouille et boîte aux lettres premium.",
    meta: [["DOULEUR", "Sous-traitance"], ["STATUT", "DÉFAILLANT"]],
  },
  {
    id: "agency", actor: "02 · agence", name: "AGENCE",
    angle: -45, dist: 160, coord: "NE.78 / -58",
    pillar: "PILIER S · SYSTÈME",
    score: "−58", scoreLabel: "/100 vs benchmark",
    quote: "Tu réinventes la roue à chaque brief.",
    copy: "Pas de scoring, pas de gates, pas de pipeline. Chaque chef de projet improvise.",
    meta: [["DOULEUR", "Improvisation"], ["STATUT", "ABSENT"]],
  },
  {
    id: "creator", actor: "03 · créatif", name: "CRÉATIF",
    angle: 45, dist: 130, coord: "SE.22 / -51",
    pillar: "PILIER T · TRACTION",
    score: "−51", scoreLabel: "/100 vs benchmark",
    quote: "Talent oui. Distribution non.",
    copy: "Bouche-à-oreille comme seule voie. Aucun tier reconnu, aucune progression lisible.",
    meta: [["DOULEUR", "Distribution"], ["STATUT", "FRACTURÉ"]],
  },
  {
    id: "ops", actor: "04 · opérateur", name: "OPÉRATEUR",
    angle: 135, dist: 170, coord: "SW.93 / ∅",
    pillar: "PILIER ⊘ · INFRASTRUCTURE",
    score: "∅", scoreLabel: "aucune référence",
    quote: "Piloter sans poser le cockpit.",
    copy: "Méthodologies des groupes globaux fermées. SaaS US qui ignorent l'Afrique francophone.",
    meta: [["DOULEUR", "Vide infra"], ["STATUT", "INEXISTANT"]],
  },
] as const;

export function MarketingSurveillance() {
  const [active, setActive] = useState(0);
  const t = TARGETS[active]!;

  return (
    <section id="probleme" data-theme="bone" className="py-24 md:py-32 relative overflow-hidden bg-background text-foreground">
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] relative">
        <header className="max-w-[720px] mb-16">
          <div className="inline-flex items-center gap-3 mb-6 font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--color-foreground-muted)" }}>
            <span className="w-7 h-px bg-accent" />
            02 · État du marché
          </div>
          <h2 className="font-display font-semibold tracking-tight mb-5" style={{ fontSize: "clamp(48px,6vw,88px)", lineHeight: 1, color: "var(--color-foreground)" }}>
            Panneau de <span className="relative inline-block">surveillance.<span className="absolute inset-x-[-2%] bottom-1 h-[0.18em] bg-accent -z-10" style={{ transform: "skewX(-12deg)" }} /></span>
          </h2>
          <p className="max-w-[60ch] text-base md:text-lg" style={{ color: "var(--color-foreground-secondary)" }}>
            Quatre cibles, quatre douleurs, un même vide structurel. Survole une cible — le panneau s&rsquo;éclaire.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-8 lg:gap-16 items-stretch">
          <div className="relative bg-bone/2 border p-6 flex flex-col gap-4 min-h-[540px]" style={{ background: "color-mix(in oklab, var(--color-foreground) 2%, transparent)", borderColor: "color-mix(in oklab, var(--color-foreground) 10%, transparent)" }}>
            <div className="flex gap-6 flex-wrap font-mono text-[11px] uppercase tracking-widest pb-3 border-b border-dashed" style={{ color: "var(--color-foreground-muted)", borderColor: "color-mix(in oklab, var(--color-foreground) 12%, transparent)" }}>
              <span><span style={{ color: "var(--color-foreground-secondary)" }}>SCAN</span> <span className="text-accent font-semibold ml-2">VIDE STRUCTUREL</span></span>
              <span><span style={{ color: "var(--color-foreground-secondary)" }}>PING</span> <span className="font-semibold ml-2" style={{ color: "var(--color-foreground)" }}>04 / 04 cibles</span></span>
            </div>

            <svg viewBox="-220 -220 440 440" className="w-full aspect-square flex-1" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Radar 4 cibles surveillance">
              <g fill="none" stroke="color-mix(in oklab, var(--color-foreground) 12%, transparent)" strokeWidth="0.5">
                <circle r="60" />
                <circle r="120" />
                <circle r="180" />
                <circle r="200" stroke="color-mix(in oklab, var(--color-foreground) 22%, transparent)" strokeWidth="1" />
              </g>
              <g stroke="color-mix(in oklab, var(--color-foreground) 8%, transparent)" strokeWidth="0.5" strokeDasharray="3 4">
                <line x1="-200" y1="0" x2="200" y2="0" />
                <line x1="0" y1="-200" x2="0" y2="200" />
              </g>
              <g fill="var(--color-foreground-muted)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="2">
                <text x="-110" y="-180">NW · DEMAND</text>
                <text x="60" y="-180">NE · SUPPLY</text>
                <text x="60" y="195">SE · TALENT</text>
                <text x="-110" y="195">SW · INFRA</text>
              </g>
              <g>
                <circle r="14" fill="var(--color-accent)" />
                <text y="48" textAnchor="middle" fill="var(--color-accent)" fontFamily="var(--font-mono)" fontSize="10" letterSpacing="2" fontWeight="600">VIDE</text>
              </g>

              {TARGETS.map((target, i) => {
                const a = (target.angle * Math.PI) / 180;
                const x = Math.cos(a) * target.dist;
                const y = Math.sin(a) * target.dist;
                const isActive = i === active;
                return (
                  <g key={target.id} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} style={{ cursor: "pointer" }}>
                    <circle cx={x} cy={y} r="14" fill="none" stroke={isActive ? "var(--color-accent)" : "var(--color-foreground)"} strokeWidth="0.8" opacity={isActive ? 1 : 0.4} />
                    <circle cx={x} cy={y} r="4" fill={isActive ? "var(--color-accent)" : "var(--color-foreground)"} />
                    <text x={x} y={y + (target.angle > 0 ? 24 : -14)} textAnchor="middle" fill={isActive ? "var(--color-accent)" : "var(--color-foreground)"} fontFamily="var(--font-mono)" fontSize="9" fontWeight="600" letterSpacing="1.6" opacity={isActive ? 1 : 0.6}>
                      {target.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            <footer className="flex justify-between gap-4 font-mono text-[10px] uppercase tracking-widest pt-3 border-t border-dashed" style={{ color: "var(--color-foreground-muted)", borderColor: "color-mix(in oklab, var(--color-foreground) 12%, transparent)" }}>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> SWEEP ACTIF</span>
              <span>n=412 · 2024-2026</span>
            </footer>
          </div>

          <aside data-theme="dark" className="bg-foreground text-background min-h-[540px] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: "color-mix(in oklab, var(--color-background) 12%, transparent)" }}>
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-60 inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> PANNEAU D&rsquo;INSPECTION</span>
              <span className="font-mono text-[10px] uppercase tracking-widest"><span className="opacity-40">COORD</span> <span className="font-semibold ml-1">{t.coord}</span></span>
            </div>
            <div className="flex-1 px-6 py-8 flex flex-col gap-5">
              <div className="flex justify-between items-baseline pb-3 border-b border-dashed font-mono text-[11px] uppercase tracking-widest opacity-60" style={{ borderColor: "color-mix(in oklab, var(--color-background) 12%, transparent)" }}>
                <span className="text-accent font-semibold">{t.actor.split(" · ")[0]}</span>
                <span>{t.actor.split(" · ")[1]?.toUpperCase()}</span>
              </div>
              <div className="font-display font-semibold text-6xl md:text-7xl leading-none tracking-tight">{t.score}</div>
              <div className="font-display font-medium text-3xl md:text-4xl tracking-tight">{t.name}</div>
              <blockquote className="font-serif italic text-lg md:text-xl py-4 border-y" style={{ borderColor: "color-mix(in oklab, var(--color-background) 12%, transparent)" }}>
                &laquo;&nbsp;{t.quote}&nbsp;&raquo;
              </blockquote>
              <p className="text-sm leading-relaxed opacity-70">{t.copy}</p>
              <div className="grid grid-cols-2 gap-3 font-mono text-[10px] uppercase tracking-widest mt-auto pt-4 border-t border-dashed" style={{ borderColor: "color-mix(in oklab, var(--color-background) 12%, transparent)" }}>
                <div><span className="block opacity-40 mb-1">{t.pillar.split(" · ")[0]}</span><span className="font-semibold">{t.pillar.split(" · ")[1]}</span></div>
                {t.meta.map(([k, v]) => (
                  <div key={k}><span className="block opacity-40 mb-1">{k}</span><span className="font-semibold text-accent">{v}</span></div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center px-4 py-3 border-t font-mono text-[10px] uppercase tracking-widest" style={{ borderColor: "color-mix(in oklab, var(--color-background) 12%, transparent)" }}>
              <button onClick={() => setActive((i) => (i - 1 + TARGETS.length) % TARGETS.length)} className="opacity-60 hover:opacity-100 hover:text-accent transition-colors">‹ PRÉC.</button>
              <div className="flex gap-2">
                {TARGETS.map((_, i) => (
                  <button key={i} onClick={() => setActive(i)} aria-label={`Cible ${i + 1}`} className={`w-2 h-2 rounded-full border ${i === active ? "bg-accent border-accent" : "border-bone/30"}`} />
                ))}
              </div>
              <button onClick={() => setActive((i) => (i + 1) % TARGETS.length)} className="opacity-60 hover:opacity-100 hover:text-accent transition-colors">SUIV. ›</button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
