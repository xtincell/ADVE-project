/**
 * release-notes.ts — les NOUVEAUTÉS de patch, en vocable CLIENT (ADR-0123).
 *
 * Source canonique de l'écran « Quoi de neuf » affiché à la connexion (cockpit).
 * DISTINCT du `/changelog` public (commits git bruts, surface auditeur) et du
 * `CHANGELOG.md` interne (vocable technique NEFER) : ici, des bénéfices PRODUIT
 * rédigés pour le dirigeant — jamais de « ADR-XXXX », « pilier », « gate », « Neter ».
 *
 * **Normalisé dans NEFER** (nefer-docs §6.0 + nefer-ship Phase 7) : toute session qui
 * ship du user-visible AJOUTE une entrée EN TÊTE, `version` = `APP_VERSION` au ship.
 * Le test `release-notes-coverage` verrouille la forme + la cohérence de version.
 */

export interface ReleaseHighlight {
  /** Emoji d'illustration (pas d'icône SVG externe — self-contained). */
  emoji: string;
  title: string;
  body: string;
}

export interface ReleaseNote {
  /** = `APP_VERSION` au moment du ship (MAJEURE.PHASE.ITERATION). */
  version: string;
  /** YYYY-MM-DD. */
  date: string;
  /** Titre court de la livraison, vocable client. */
  headline: string;
  highlights: ReleaseHighlight[];
}

/**
 * Les notes de version, **la plus récente en tête**. NEFER ajoute ici à chaque ship
 * user-visible. Uniquement des bénéfices RÉELS et livrés (jamais de promesse).
 */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "6.27.392",
    date: "2026-10-06",
    headline: "Une veille créative suivie dans le temps",
    highlights: [
      { emoji: "🔎", title: "Des observations qui restent consultables", body: "Votre équipe peut collecter des publications et conserver leurs relevés successifs. Les comptes compatibles de votre veille peuvent être actualisés automatiquement, sur activation." },
      { emoji: "🛡️", title: "Des analyses vérifiées avant utilisation", body: "Les annotations assistées restent des brouillons. Votre équipe vérifie leurs observations avant de les utiliser dans vos recettes créatives." },
    ],
  },
  {
    version: "6.27.391",
    date: "2026-10-06",
    headline: "Des références créatives aux essais mesurables",
    highlights: [
      { emoji: "🔎", title: "Des recettes accompagnées de preuves", body: "Votre espace Intelligence réunit les contenus collectés, les recettes revues et leurs résultats. Les performances restent comparées à des publications similaires, avec leurs limites visibles." },
      { emoji: "🧪", title: "Des essais adaptés à votre marque", body: "Votre équipe déclare une variante, une cible et une échéance, puis enregistre le résultat. Chaque essai conserve la version de la recette utilisée." },
      { emoji: "🛡️", title: "Une veille qui respecte vos dossiers", body: "Les observations propres à votre marque restent privées. Votre équipe distingue concurrents commerciaux, concurrents d'attention et inspirations dans le suivi." },
    ],
  },
  {
    version: "6.27.390",
    date: "2026-10-02",
    headline: "Vos fichiers de marque accessibles",
    highlights: [
      { emoji: "🖼️", title: "Retrouvez les visuels existants", body: "Le portefeuille affiche les logos et visuels déjà hébergés dans La Fusée. Leurs fiches permettent aussi d’ouvrir le fichier associé." },
      { emoji: "🔎", title: "Un historique lisible", body: "Une tentative de génération échouée est signalée lorsque vous ouvrez sa fiche." },
    ],
  },
  {
    version: "6.27.389",
    date: "2026-10-02",
    headline: "Les dossiers de vos marques réunis",
    highlights: [
      { emoji: "🗂️", title: "Retrouvez le bon dossier", body: "Le portefeuille relie chaque marque à ses produits, campagnes, projets, fichiers et sources. Les projets partagés entre plusieurs marques restent regroupés." },
      { emoji: "✍️", title: "Gardez la main", body: "Organisez votre portefeuille et modifiez ses liens directement dans les formulaires. Les dossiers incomplets et les informations à confirmer restent visibles." },
      { emoji: "🔎", title: "Remontez à la source", body: "Consultez le brief et les documents associés, puis ouvrez le dossier où se poursuit le travail. Une source indisponible est signalée." },
    ],
  },
  {
    version: "6.27.330",
    date: "2026-07-26",
    headline: "Votre assistant de marque, enfin à la hauteur",
    highlights: [
      {
        emoji: "💬",
        title: "L'assistant répond vraiment",
        body: "Le chat de votre cockpit fonctionne de bout en bout et connaît désormais tout votre dossier de marque — vos quatre piliers, votre score, votre communauté. Fini les réponses vides.",
      },
      {
        emoji: "🧠",
        title: "Un conseil d'experts derrière chaque réponse",
        body: "Vos réponses s'appuient sur un coordinateur qui maîtrise toute votre stratégie et quatre experts spécialisés — Authenticité, Distinction, Valeur, Engagement — qui challengent chaque recommandation.",
      },
      {
        emoji: "🔌",
        title: "Réfléchir dans votre cockpit depuis vos outils",
        body: "Votre marque est maintenant accessible depuis un assistant IA externe : une clé sécurisée suffit pour l'interroger sur votre stratégie où que vous travailliez.",
      },
    ],
  },
  {
    version: "6.27.250",
    date: "2026-07-22",
    headline: "La Fusée compile : vos livrables prennent vie",
    highlights: [
      {
        emoji: "🎨",
        title: "Vos livrables à VOS couleurs",
        body: "Votre Bible de marque et votre Oracle sortent désormais dans votre palette, votre typographie et avec votre logo — fini le gabarit générique.",
      },
      {
        emoji: "📦",
        title: "La Fusée pense produit",
        body: "Le socle Valeur modélise votre système d'offre (gammes, archétypes, mécaniques d'engagement) — plus seulement une liste de produits.",
      },
      {
        emoji: "📥",
        title: "Importez votre brand book",
        body: "Vous avez déjà un brand book officiel ? Importez-le : La Fusée en extrait votre fondation de marque, sans jamais rien inventer (ce qui manque reste à compléter, pas comblé au hasard).",
      },
      {
        emoji: "🏅",
        title: "Votre palier ne redescend plus tout seul",
        body: "Votre niveau de maturité est désormais un record officiel : il ne régresse que sur décision explicite, jamais en silence quand un score baisse.",
      },
      {
        emoji: "✏️",
        title: "Éditez point par point",
        body: "Ajoutez, modifiez ou retirez chaque élément de vos fiches (personas, produits, valeurs…) — et plusieurs informations qui restaient invisibles s'affichent enfin.",
      },
    ],
  },
];

/** La note la plus récente (celle que l'écran de connexion présente). */
export const LATEST_RELEASE: ReleaseNote | null = RELEASE_NOTES[0] ?? null;

/**
 * La note à montrer à un utilisateur qui a vu pour la dernière fois `lastSeenVersion`,
 * ou `null` s'il est déjà à jour (pas de nag). Compare les versions numériquement.
 */
export function releaseToShow(lastSeenVersion: string | null | undefined): ReleaseNote | null {
  if (!LATEST_RELEASE) return null;
  if (!lastSeenVersion) return LATEST_RELEASE; // première connexion → on présente la dernière
  return compareVersions(LATEST_RELEASE.version, lastSeenVersion) > 0 ? LATEST_RELEASE : null;
}

/** Compare deux versions `x.y.z` : >0 si a plus récent que b, 0 si égal, <0 sinon. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}
