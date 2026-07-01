"use client";

const ITEMS = [
  "★ Brief PDF entré · 14h02",
  "Pillar A · authenticité scorée 18/25",
  "Mission KV dispatchée · talent #214 Douala",
  "Notoria · 12 recommandations générées",
  "Cost-gate vert · 47 USD validés",
  "Signal faible détecté · secteur cosmétique",
  "Crew apparié · 4 rôles, budget OK",
  "Broadcast queué · 6 canaux, 12K segment",
  "Overton · axe déplacé +0.4σ",
];

export function MarketingStrip() {
  return (
    <section aria-label="Signaux" className="border-y border-border bg-background overflow-hidden py-5">
      <div className="flex gap-16 whitespace-nowrap font-mono text-xs uppercase tracking-wide text-foreground-secondary animate-[ticker-x_50s_linear_infinite] w-max">
        {[...ITEMS, ...ITEMS, ...ITEMS].map((s, i) => (
          <span key={i} className="flex items-center gap-16">
            {s}
            <span className="text-accent">●</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker-x { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }`}</style>
    </section>
  );
}
