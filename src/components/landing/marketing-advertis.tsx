"use client";

import { useState } from "react";

const PILLARS = [
  { k: "A", name: "Authenticité", q: "Qui êtes-vous vraiment ?", val: 18 },
  { k: "D", name: "Distinction", q: "Pourquoi vous et pas un autre ?", val: 14 },
  { k: "V", name: "Valeur", q: "Que promettez-vous au monde ?", val: 20 },
  { k: "E", name: "Engagement", q: "Comment créer des superfans ?", val: 11 },
  { k: "R", name: "Risque", q: "Quelles sont vos vulnérabilités ?", val: 16 },
  { k: "T", name: "Track", q: "Que dit le marché ?", val: 9 },
  { k: "I", name: "Innovation", q: "Quel potentiel inexploité ?", val: 12 },
  { k: "S", name: "Stratégie", q: "Comment aller de A à B ?", val: 15 },
];

const MAX = 25;
const R = 160;

function tierFor(total: number) {
  if (total >= 181) return "ICONE";
  if (total >= 161) return "CULTE";
  if (total >= 121) return "FORTE";
  if (total >= 81) return "ORDINAIRE";
  if (total >= 51) return "FRAGILE";
  return "ZOMBIE";
}

export function MarketingAdvertis() {
  const [vals, setVals] = useState(PILLARS.map((p) => p.val));
  const total = vals.reduce((s, v) => s + v, 0);
  const tier = tierFor(total);
  // Round to 4 decimals to avoid Node 20 vs 22 float serialization mismatch
  // in SSR/client hydration (cf. ADR runtime-fixes Phase 16).
  const round = (n: number) => Math.round(n * 10000) / 10000;
  const points = vals.map((v, i) => {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = (v / MAX) * R;
    return { x: round(Math.cos(angle) * r), y: round(Math.sin(angle) * r) };
  });

  return (
    <section id="methode" className="py-24 md:py-32">
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)]">
        <div className="flex items-baseline gap-3.5 mb-8 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          <span className="w-8 h-px bg-accent" />
          03 · Méthode ADVE-RTIS
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 items-end">
          <h2 className="font-display font-semibold tracking-tight" style={{ fontSize: "var(--text-display)", lineHeight: 0.96 }}>
            Huit dimensions.<br />
            Une note. <span className="relative inline-block">/200.<span className="absolute inset-x-[-2%] bottom-1 h-[0.18em] bg-accent -z-10" style={{ transform: "skewX(-12deg)" }} /></span>
          </h2>
          <p className="text-foreground-secondary text-pretty text-base md:text-lg max-w-[60ch]">
            Chaque marque est radiographiée sur 8 piliers. Score déterministe, transparent, actionnable. La cascade{" "}
            <span className="font-mono text-accent">A → D → V → E → R → T → I → S</span>
            {" gouverne tout l’OS — chaque pilier alimente le suivant."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          <div className="border border-border p-6 bg-surface-raised/30">
            <svg viewBox="-200 -200 400 400" className="w-full aspect-square" role="img" aria-label={`Score ADVE-RTIS ${total}/200, palier ${tier}`}>
              <g fill="none" stroke="var(--color-border)" strokeWidth="0.5">
                {[40, 80, 120, 160].map((r) => <circle key={r} r={r} />)}
              </g>
              <g stroke="var(--color-border-subtle)" strokeWidth="0.5">
                {PILLARS.map((_, i) => {
                  const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                  return <line key={i} x1="0" y1="0" x2={round(Math.cos(angle) * R)} y2={round(Math.sin(angle) * R)} />;
                })}
              </g>
              <polygon points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="color-mix(in oklab, var(--color-accent) 18%, transparent)" stroke="var(--color-accent)" strokeWidth="2" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="5" fill="var(--color-accent)" />
              ))}
              {PILLARS.map((p, i) => {
                const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                return (
                  <text key={p.k} x={round(Math.cos(angle) * (R + 24))} y={round(Math.sin(angle) * (R + 24))} textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)" fontSize="14" fontWeight="600" fill="var(--color-foreground)">
                    {p.k}
                  </text>
                );
              })}
            </svg>
            <div className="mt-6 flex items-baseline justify-between border-t border-border pt-4">
              <div>
                <div className="font-display font-semibold text-5xl tracking-tight">{total}<span className="text-2xl text-foreground-muted">/200</span></div>
                <div className="font-mono text-xs uppercase tracking-widest text-accent mt-1">{tier}</div>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted text-right">↳ glisse pour ajuster<br />score recalculé live</div>
            </div>
          </div>

          <ol className="flex flex-col gap-2">
            {PILLARS.map((p, i) => (
              <li
                key={p.k}
                onClick={() => setVals((v) => v.map((val, j) => (j === i ? Math.min(MAX, val + 5 > MAX ? 5 : val + 5) : val)))}
                className="flex items-center gap-4 p-4 border border-border bg-surface-raised/30 hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <span className="font-display font-semibold text-2xl w-8 text-center text-accent">{p.k}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{p.name}</div>
                  <div className="text-xs text-foreground-muted truncate">{p.q}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24 h-1 bg-border relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-accent transition-all" style={{ width: `${(vals[i] ?? 0) / MAX * 100}%` }} />
                  </div>
                  <span className="font-mono text-xs w-12 text-right"><span className="text-foreground">{vals[i]}</span><span className="text-foreground-muted">/{MAX}</span></span>
                </div>
              </li>
            ))}
            <li className="mt-4 p-5 border border-accent/40 bg-accent-subtle flex items-center justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-accent">↳ Tu joues avec le radar</span>
                <span className="text-sm font-medium text-foreground">Le vrai diagnostic prend 15 minutes et te rend un rapport actionnable.</span>
              </div>
              <a href="/intake" className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors whitespace-nowrap">
                Lancer le vrai →
              </a>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
