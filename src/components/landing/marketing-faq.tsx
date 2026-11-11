// Recette F16 (11 novembre 2026) : chaque réponse dit ce que le code fait.
// Retirés : rapport « en 15 minutes », livrables « sous 30 jours », palier
// « à 90 jours », « chaque franc » contrôlé, matching « sans dispatch humain »,
// briefs « chiffrés au repos », « aucun cross-tenant possible ».
const QUESTIONS = [
  {
    q: "En quoi La Fusée est-elle différente d'une agence classique ?",
    a: "Une agence vend des heures. La Fusée outille une trajectoire mesurée. Le score de marque est calculé sans IA, chaque opération gouvernée est tracée dans un journal chaîné, et le coût d'un traitement assisté est contrôlé avant son lancement. On industrialise — pas on improvise.",
  },
  {
    q: "Combien de temps prend le diagnostic ?",
    a: "Le questionnaire guidé prend environ 10 minutes, l'import de documents quelques minutes de plus ou de moins : ce sont des durées indicatives, pas des garanties. La génération du rapport vient ensuite et peut prendre plusieurs minutes. Le rapport web est gratuit ; le PDF brandé exportable est en option payante. La suite — stratégie, missions, livrables — se cadre avec ton équipe ; aucun délai n'est garanti sur cette page.",
  },
  {
    q: "Qu'est-ce qui empêche l'IA de raconter n'importe quoi ?",
    a: "Plusieurs verrous : un point d'écriture unique sur chaque pilier, un format imposé et validé pour les réponses structurées, l'origine de chaque information affichée (déclarée, observée ou déduite) et un contrôle de coût avant lancement. Le socle de ta marque ne change que par une décision humaine ; une proposition de l'IA reste une proposition à valider.",
  },
  {
    q: "Et les freelances africains, comment ils s'intègrent ?",
    a: "Ils s'inscrivent sur La Guilde, consultent le mur des missions et candidatent. L'OS propose des profils selon les compétences et la disponibilité ; l'affectation et la composition de l'équipe sont confirmées par une personne. Le contrôle qualité, les paliers des talents (proposés sur leurs livraisons, validés par l'équipe) et le paiement mobile money passent par les moyens activés.",
  },
  {
    q: "ADVE/RTIS, ça veut dire quoi exactement ?",
    a: "Authenticité, Distinction, Valeur, Engagement, Risque, Track, Innovation, Stratégie. La cascade A → D → V → E → R → T → I → S est unidirectionnelle (sauf re-entry explicite). Chaque pilier alimente le suivant.",
  },
  {
    q: "Mes données, où vivent-elles ?",
    a: "Dans une base PostgreSQL auto-hébergée sur le serveur de production. Chaque requête vérifie l'accès à la marque concernée ; cette isolation est contrôlée par des tests automatisés à chaque modification du code. Les documents originaux déposés et les jetons de connexion aux réseaux sont chiffrés par l'application. Détail sur la page Confidentialité et le Trust Center.",
  },
  {
    q: "Concrètement, ça coûte combien ?",
    a: "Le diagnostic est gratuit (rapport web) : complétude de ton socle ADVE sur 100, radar des 4 piliers ADVE, force publique sur 200 quand une mesure existe et un aperçu des recommandations. Le PDF brandé exportable est en option payante. La grille par palier et par zone (FCFA / EUR / USD) est publique — voir la page tarifs. Propulsion s'indexe sur ton palier visé (FORTE, CULTE, ICONE) et le périmètre missions ; Apex est un partenariat sélectif sur devis.",
  },
  {
    q: "Quand est-ce que je vois mes premiers superfans recrutés ?",
    a: "Aucune date ne peut être promise ici : la communauté se mesure sur des données réelles — réseaux connectés, échanges, clients — et aucun délai type n'a encore été mesuré sur un cycle complet. La Fusée mesure chaque transition de palier et ne la valide que sur preuve.",
  },
];

export function MarketingFaq() {
  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)]">
        <div className="flex items-baseline gap-3.5 mb-8 font-mono text-2xs uppercase tracking-widest text-foreground-muted">
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
                <span className="font-mono text-2xs uppercase tracking-widest text-accent shrink-0">Q.{String(i + 1).padStart(2, "0")}</span>
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
