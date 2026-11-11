"use client";

/**
 * Capacités réelles de l'OS — PAS un flux d'événements simulé. L'ancienne
 * version affichait de faux événements horodatés (« Brief PDF entré · 14h02 »,
 * « 47 USD validés ») présentés comme du live : purgé (audit intention/exécution
 * 2026-07-16 — un chiffre inventé face lead viole le canon d'honnêteté).
 * Recette F16 (11 novembre 2026) : délais, affectations et contrôles décrits
 * tels que le code les fait — propositions à confirmer, pas d'automatisme promis.
 */
const ITEMS = [
  "★ Diagnostic gratuit — questionnaire ou import de documents",
  "8 piliers scorés · /25 chacun",
  "Missions proposées aux talents de La Guilde",
  "Recommandations à valider à chaque actualisation",
  "Coût des traitements assistés contrôlé avant lancement",
  "Signaux sectoriels lus dans les sources activées",
  "Équipes proposées par mission, à confirmer",
  "Diffusion préparée sur les canaux connectés",
  "Axe culturel lu par secteur quand les signaux existent",
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
