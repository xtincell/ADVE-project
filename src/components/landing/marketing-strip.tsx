"use client";

/**
 * Capacités réelles de l'OS — PAS un flux d'événements simulé. L'ancienne
 * version affichait de faux événements horodatés (« Brief PDF entré · 14h02 »,
 * « 47 USD validés ») présentés comme du live : purgé (audit intention/exécution
 * 2026-07-16 — un chiffre inventé face lead viole le canon d'honnêteté).
 */
const ITEMS = [
  "★ Brief entré → diagnostic en 15 min",
  "8 piliers scorés · /25 chacun",
  "Missions dispatchées aux talents · Douala · Abidjan",
  "Recommandations générées à chaque cycle",
  "Chaque dépense validée par un verrou budgétaire",
  "Signaux faibles sectoriels détectés",
  "Équipes appariées par mission",
  "Diffusion multi-canaux orchestrée",
  "Axe culturel suivi par secteur",
];

export function MarketingStrip() {
  return (
    <section aria-label="Ce que l'OS orchestre" className="border-y border-border bg-background overflow-hidden py-5">
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
