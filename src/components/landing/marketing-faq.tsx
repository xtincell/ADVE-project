const QUESTIONS = [
  {
    q: "En quoi La Fusée est-elle différente d'une agence classique ?",
    a: "Une agence vend des heures. La Fusée vend une trajectoire mesurée. Chaque livrable est scoré, chaque décision est tracée à vie et auditable, chaque franc passe par un verrou budgétaire avant d'être engagé. On industrialise — pas on improvise.",
  },
  {
    q: "48h pour diagnostiquer une marque, c'est crédible ?",
    a: "Le diagnostic des 8 piliers tourne en moins de 4h. Les 44h restantes servent à écrire la stratégie, dispatcher les missions, et obtenir les premiers livrables QC. Si on rate l'altitude, on le dit — c'est le rôle des sentinelles.",
  },
  {
    q: "Qu'est-ce qui empêche l'IA de raconter n'importe quoi ?",
    a: "Cinq verrous : Pillar Gateway (point d'écriture unique), Bible des Variables (verrou format), Zod (verrou type), confidence gates, Thot (verrou financier). Confiance < 0.5 → revue obligatoire. Aucune mutation ne sort du décideur sans signature auditable.",
  },
  {
    q: "Et les freelances africains, comment ils s'intègrent ?",
    a: "Tier system + matching automatique sur skills + QC + paiement mobile money. Un créatif à Douala peut livrer un KV pour une marque à Abidjan sans dispatch humain — l'OS apparie talent et mission, compose l'équipe, et route le QC. La progression de tier est validée par les livraisons réelles, pas par une lettre de recommandation. Formation Académie intégrée pour combler les gaps.",
  },
  {
    q: "ADVE-RTIS, ça veut dire quoi exactement ?",
    a: "Authenticité, Distinction, Valeur, Engagement, Risque, Track, Innovation, Stratégie. La cascade A → D → V → E → R → T → I → S est unidirectionnelle (sauf re-entry explicite). Chaque pilier alimente le suivant.",
  },
  {
    q: "Mes données, où vivent-elles ?",
    a: "Postgres multi-tenant avec RLS strict. Chaque opérateur voit ses propres données via tenantScopedDb. Les briefs sont chiffrés au repos. Aucun cross-tenant possible — c'est un invariant CI.",
  },
];

export function MarketingFaq() {
  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)]">
        <div className="flex items-baseline gap-3.5 mb-8 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          <span className="w-8 h-px bg-accent" />
          08 · Questions rétives
        </div>
        <h2 className="font-display font-semibold tracking-tight mb-12" style={{ fontSize: "var(--text-display)", lineHeight: 0.96 }}>
          On répond <span className="font-serif italic font-medium">par écrit</span>.<br />
          Sans détour.
        </h2>
        <div className="flex flex-col">
          {QUESTIONS.map((item, i) => (
            <details key={item.q} open={i === 0} className="group border-t border-border last:border-b">
              <summary className="flex items-baseline gap-5 cursor-pointer py-6 list-none [&::-webkit-details-marker]:hidden">
                <span className="font-mono text-[11px] uppercase tracking-widest text-accent shrink-0">Q.{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-lg md:text-xl font-medium tracking-tight">{item.q}</span>
                <span aria-hidden="true" className="font-mono text-2xl text-accent group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="pl-16 pb-6 max-w-prose text-foreground-secondary text-sm leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
