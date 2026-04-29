/**
 * ApogeeTrajectory — landing section showing the 6-tier journey from
 * ZOMBIE to ICONE (Tier 3.4 rewrite).
 *
 * Sourced from [docs/governance/APOGEE.md](docs/governance/APOGEE.md).
 * Each tier carries a one-line "what it feels like" so the prospect
 * can self-localize without reading the doc.
 */

const TIERS: ReadonlyArray<{
  name: string;
  altitude: string;
  signal: string;
  color: string;
}> = [
  { name: "ZOMBIE", altitude: "Sol", signal: "La marque existe à peine — fantôme sectoriel.", color: "text-zinc-500" },
  { name: "FRAGILE", altitude: "Décollage", signal: "Substance de marque amorcée, propulsion intermittente.", color: "text-zinc-300" },
  { name: "ORDINAIRE", altitude: "Bas plafond", signal: "Présente, oubliable — interchangeable avec ses concurrents.", color: "text-blue-300" },
  { name: "FORTE", altitude: "Plafond moyen", signal: "Distinction lisible, premiers fans organiques.", color: "text-emerald-300" },
  { name: "CULTE", altitude: "Plafond haut", signal: "Évangélistes en orbite, l'axe sectoriel commence à frémir.", color: "text-amber-300" },
  { name: "ICONE", altitude: "Apex", signal: "Référence patrimoniale — l'Overton est déplacé, le secteur s'oriente sur toi.", color: "text-violet-300" },
];

export function ApogeeTrajectory() {
  return (
    <section id="trajectory" className="relative bg-zinc-950 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Trajectoire APOGEE
        </p>
        <h2 className="mb-4 text-center text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Six paliers. Une seule direction : <span className="text-violet-300">l'Apex</span>.
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-base text-zinc-400">
          La Fusée ne lance pas une marque, elle la <strong>propulse</strong>. Chaque palier a ses preuves,
          ses gates, ses sentinelles. Le système refuse de monter d'étage tant que l'altitude actuelle n'est pas tenue.
        </p>

        <ol className="relative space-y-4 border-l border-zinc-800 pl-6">
          {TIERS.map((t, i) => (
            <li key={t.name} className="relative">
              <span className="absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-[10px] font-mono text-zinc-400">
                {i + 1}
              </span>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700">
                <div className="mb-1 flex items-baseline justify-between">
                  <h3 className={`font-mono text-sm font-semibold ${t.color}`}>{t.name}</h3>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600">{t.altitude}</span>
                </div>
                <p className="text-sm text-zinc-400">{t.signal}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-12 text-center text-xs text-zinc-600">
          Aucune marque ne saute de palier. Mais aucune ne reste indéfiniment au sol non plus —
          si elle accepte la doctrine.
        </p>
      </div>
    </section>
  );
}
