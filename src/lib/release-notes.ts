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
    version: "6.27.425", date: "2026-10-08",
    headline: "Une production reçue peut reprendre après interruption",
    highlights: [
      { emoji: "↻", title: "Une reprise sans doublon", body: "Un résultat déjà reçu peut rejoindre votre bibliothèque après une interruption, sans recréer les fichiers déjà enregistrés. Les actifs archivés gardent leur état." },
    ],
  },
  {
    version: "6.27.423", date: "2026-10-08",
    headline: "Choisissez la version publique de votre marque",
    highlights: [
      { emoji: "👓", title: "Une publication relue", body: "Dans Connexions, relisez les textes, le logo et les liens avant de les publier. Les changements privés ne modifient plus automatiquement la page en ligne." },
      { emoji: "↶", title: "Un historique conservé", body: "Publiez une nouvelle version ou revenez à une copie précédente sans effacer l’historique. Si la marque a changé depuis votre lecture, la publication est refusée et la page actuelle reste en place." },
    ],
  },
  {
    version: "6.27.422", date: "2026-10-08",
    headline: "Vos actifs gardent une version en usage cohérente",
    highlights: [
      { emoji: "↻", title: "Un remplacement complet", body: "Remplacer un actif conserve ensemble son historique et la version utilisée par la campagne. En cas d’échec, la version précédente reste en place." },
      { emoji: "🛡️", title: "Des choix dans le bon dossier", body: "Choisir un candidat laisse intacts les autres marques et campagnes. Une archive ne peut plus être réactivée par un forçage, et un document périmé demande une relecture." },
    ],
  },
  {
    version: "6.27.421", date: "2026-10-08",
    headline: "Annulez une correction sans perdre les suivantes",
    highlights: [
      { emoji: "↶", title: "Des décisions préservées", body: "L’annulation d’une correction conserve les changements indépendants effectués ensuite. Un conflit ou un historique insuffisant entraîne un refus explicite." },
      { emoji: "📄", title: "Une origine fidèle", body: "Les informations restaurées conservent leur origine et leurs documents. Une ancienne proposition ne devient pas une validation humaine." },
    ],
  },
  {
    version: "6.27.420", date: "2026-10-08",
    headline: "Le fonctionnement du produit devient plus lisible",
    highlights: [
      { emoji: "🔗", title: "Des offres reconnaissables", body: "Les produits liés aux profils, modes et objets de votre marque affichent les noms actuels du catalogue. Une relation incertaine reste à vérifier." },
      { emoji: "📄", title: "Une origine conservée", body: "Les différentes parties du fonctionnement produit conservent l’origine de leur fiche, sans présenter une proposition comme une validation humaine." },
      { emoji: "👓", title: "Des conditions faciles à lire", body: "Les tarifs et leurs réserves restent lisibles dans chaque niveau d’offre, avec un fond discret et une présentation régulière." },
    ],
  },
  {
    version: "6.27.419", date: "2026-10-08",
    headline: "Des corrections rattachées aux documents relus",
    highlights: [
      { emoji: "📄", title: "Une source toujours actuelle", body: "Une correction accompagnée de ses documents est refusée si l’un d’eux a changé ou si son accès a été retiré depuis la lecture." },
      { emoji: "✓", title: "Votre décision reste la vôtre", body: "Une proposition d’agent conserve son auteur. Elle ne se présente plus comme une validation humaine, et un refus ne s’affiche plus comme une correction appliquée." },
    ],
  },
  {
    version: "6.27.418", date: "2026-10-08",
    headline: "Vos liens produit et vos validations tiennent",
    highlights: [
      { emoji: "🔗", title: "Des références stables", body: "Une modification du catalogue conserve les identifiants acquis. Les produits ajoutés reçoivent leur référence commune pour les gammes et les autres vues." },
      { emoji: "✓", title: "Une validation explicite", body: "Retrouvez les valeurs proposées par l’IA, relisez-les puis validez tout le champ affiché. Une source contradictoire conserve votre décision et signale le conflit." },
      { emoji: "↻", title: "Une édition concurrente visible", body: "Si le contenu a changé depuis votre lecture, la validation est refusée et l’écran se recharge. Votre décision ne porte jamais silencieusement sur une autre version." },
    ],
  },
  {
    version: "6.27.417", date: "2026-10-08",
    headline: "Vos offres gardent leurs conditions",
    highlights: [
      { emoji: "🏷️", title: "Des tarifs lisibles", body: "Conservez les périodes, le HT/TTC, les options et l’état de vos offres dans le catalogue. Les accès gratuits et les anciens libellés restent visibles, y compris sur mobile." },
      { emoji: "🔗", title: "Une saisie qui se propage", body: "Les gammes relisent les conditions de leurs produits référencés. Un lien manquant est indiqué au lieu d’être masqué par un ancien prix." },
      { emoji: "📐", title: "Des calculs qui s’abstiennent", body: "Sans prix comparables, le plan ne remplace plus votre panier par un montant arbitraire. Les projections de chiffre d’affaires et de retour publicitaire restent inconnues." },
    ],
  },
  {
    version: "6.27.416", date: "2026-10-08",
    headline: "Distinguez l’origine de vos informations",
    highlights: [
      { emoji: "🔎", title: "Des indications fidèles", body: "Votre plateforme de marque distingue les valeurs saisies par une personne, issues d’une source ou inférées par l’IA. Sans trace conservée, l’origine est indiquée comme inconnue. Ces indications ne valent pas approbation du contenu." },
    ],
  },
  {
    version: "6.27.415", date: "2026-10-08",
    headline: "Vos documents partagés restent accessibles depuis la marque",
    highlights: [
      { emoji: "📄", title: "Une pièce, plusieurs dossiers", body: "Le dossier de marque retrouve aussi les documents partagés avec lui et indique leur propriétaire. Vous pouvez les consulter directement depuis Sources & liens." },
      { emoji: "🔎", title: "Une consultation à jour", body: "Chaque ouverture vérifie l’accès au document. Si son usage a été retiré, le lecteur vous le signale et n’affiche plus l’ancien texte." },
    ],
  },
  {
    version: "6.27.414", date: "2026-10-08",
    headline: "Vos modifications restent dans le bon champ",
    highlights: [
      { emoji: "✍️", title: "Un brouillon par contexte", body: "Changer de champ, de mode ou de marque ouvre une nouvelle saisie. Une réponse assistée tardive ne remplace plus votre nouvelle proposition." },
      { emoji: "🛡️", title: "Une édition concurrente reste protégée", body: "Votre brouillon garde sa version de départ. Si la fiche a changé entre-temps, relisez-la avant d’appliquer votre modification." },
    ],
  },
  {
    version: "6.27.413", date: "2026-10-08",
    headline: "Vos guidelines relisent l’identité conservée",
    highlights: [
      { emoji: "📖", title: "Le dossier reste lisible", body: "Logo, couleurs, typographies et documents de référence se consultent ensemble. Actualiser relit les données sans modifier votre marque." },
      { emoji: "🔎", title: "Propositions et sources distinctes", body: "Une proposition reste signalée comme telle. Les références modifiées ou devenues inaccessibles sont indiquées, sans validation inventée." },
    ],
  },
  {
    version: "6.27.412", date: "2026-10-08",
    headline: "Vos fichiers et leurs origines restent lisibles",
    highlights: [
      { emoji: "🖼️", title: "Aperçus contrastés", body: "Les aperçus s’ouvrent sur fond clair. Vous pouvez choisir un fond sombre pour les variantes blanches, sans modifier le fichier." },
      { emoji: "📚", title: "Versions et décisions distinctes", body: "Le dossier de marque indique la version et la dernière écriture conservée. Un état importé ne vaut pas preuve d’approbation." },
    ],
  },
  {
    version: "6.27.410", date: "2026-10-07",
    headline: "Vos campagnes sont visibles dès leur arrivée",
    highlights: [
      { emoji: "📥", title: "Avant les premières tâches", body: "Le suivi affiche aussi les campagnes qui viennent d’être reçues. Une campagne sans livrable conserve cet état explicite." },
      { emoji: "🧭", title: "Actions dans la bonne équipe", body: "Créez une action transverse ou choisissez sa campagne par nom. Les tâches et responsables liés doivent appartenir à cette équipe." },
    ],
  },
  {
    version: "6.27.409",
    date: "2026-10-07",
    headline: "Votre équipe accompagne le suivi des campagnes",
    highlights: [{
      emoji: "🧭",
      title: "Un contexte conservé",
      body: "L’équipe choisie dans le portefeuille accompagne le tableau, les livrables et leurs reprises. Une lecture refusée reste visible et peut être relancée.",
    }],
  },
  {
    version: "6.27.408",
    date: "2026-10-07",
    headline: "Des reprises qui gardent leur contexte",
    highlights: [
      { emoji: "📝", title: "Retrouvez la même demande après un nouvel essai", body: "Une reprise garde sa tâche et son numéro. Réessayer le même envoi après une erreur retrouve la demande reçue. Deux besoins distincts conservent leurs propres tickets." },
      { emoji: "📋", title: "Un compte rendu conservé", body: "Une résolution enregistrée reste consultable et ne se rouvre plus lors d’un arbitrage. Les erreurs de lecture ou de saisie restent visibles pour vous permettre de reprendre." },
    ],
  },
  {
    version: "6.27.407",
    date: "2026-10-07",
    headline: "Un fichier partagé, tous ses usages visibles",
    highlights: [
      { emoji: "🗂️", title: "Une seule carte par lien de fichier", body: "Lorsqu’un fichier est relié à plusieurs dossiers, retrouvez ses rattachements sur une même carte. Chaque dossier conserve son contenu, son nom et son état." },
      { emoji: "🔎", title: "Une recherche qui garde le contexte", body: "Rechercher un dossier conserve les autres usages visibles du fichier. Les archives restent consultables sur demande et les versions de fichier différentes restent séparées." },
    ],
  },
  {
    version: "6.27.404",
    date: "2026-10-07",
    headline: "Suivez la suite réelle de vos demandes",
    highlights: [
      { emoji: "📋", title: "Un besoin, une mission liée", body: "Votre équipe peut préparer une mission à partir de votre demande ou enregistrer le motif pour l’écarter. Retrouvez le besoin et l’état actuel de la mission depuis le détail de la demande." },
      { emoji: "🛡️", title: "Des décisions qui ne s’écrasent plus", body: "Deux examens simultanés ne créent pas deux missions. Une demande déjà traitée doit être relue. Une mission préparée reste distincte d’un travail livré ; responsable et délai restent à confirmer." },
    ],
  },
  {
    version: "6.27.403",
    date: "2026-10-07",
    headline: "Retrouvez le suivi de chaque projet",
    highlights: [
      { emoji: "🔗", title: "Des liens qui gardent leur contexte", body: "Reliez le suivi Radar au projet La Barre concerné. Deux espaces Radar peuvent porter le même numéro sans se confondre ; leurs décisions restent consultables dans leur outil d’origine." },
      { emoji: "🛡️", title: "Vos raccordements sont protégés", body: "Une édition ancienne demande une actualisation avant d’enregistrer. Un lien mal formé est signalé et ne masque plus les autres références de la marque." },
    ],
  },
  {
    version: "6.27.402",
    date: "2026-10-07",
    headline: "Une veille fidèle, une aide IA choisie",
    highlights: [
      { emoji: "🔎", title: "Vos observations restent propres à vos marques", body: "La Gazette présente les variations constatées. Une qualification absente reste signalée comme telle ; les dossiers des autres entreprises restent exclus de votre vue." },
      { emoji: "✋", title: "Choisissez quand demander des propositions", body: "Le rafraîchissement ne génère pas de propositions IA par défaut. Une demande assistée affiche son résultat ou son échec et permet de réessayer. Vous examinez les propositions avant de les appliquer." },
    ],
  },
  {
    version: "6.27.401",
    date: "2026-10-07",
    headline: "Une référence commune, des usages propres à chaque marque",
    highlights: [
      { emoji: "📄", title: "Partagez sans recopier", body: "Liez un document aux autres marques que vous gérez. Son original et ses corrections restent uniques ; chaque marque conserve ses propres analyses. Vous pouvez retirer un usage sans effacer les décisions passées." },
      { emoji: "✏️", title: "Les propositions suivent leurs références", body: "Une proposition fondée sur une ancienne version demande une nouvelle lecture avant application. La lecture d’un document reste distincte de sa validation." },
    ],
  },
  {
    version: "6.27.400",
    date: "2026-10-06",
    headline: "Vos fichiers reçus restent retrouvables",
    highlights: [{
      emoji: "📄", title: "L’original reste distinct de vos corrections",
      body: "Retrouvez le fichier reçu depuis vos sources. Redéposer le même document conserve vos corrections et reprend un dépôt interrompu. Les anciens documents indiquent quand leur original reste à ajouter.",
    }],
  },
  {
    version: "6.27.399",
    date: "2026-10-06",
    headline: "Vos références corrigées se préparent sans doublon",
    highlights: [
      { emoji: "📄", title: "Toute la référence est relue", body: "Lors de la préparation d’une source, une correction en fin de document est aussi prise en compte. Une interruption ne laisse plus une préparation partielle affichée comme réussie." },
    ],
  },
  {
    version: "6.27.398",
    date: "2026-10-06",
    headline: "Votre travail en cours reste lisible",
    highlights: [
      { emoji: "🧭", title: "Une progression fidèle", body: "Le tableau de bord distingue ce qui est commencé de ce qui est complet. Les informations déjà saisies restent reconnues." },
      { emoji: "✏️", title: "Des corrections prises en compte", body: "Après la correction du texte d’une source, ses anciens extraits et valeurs préparées sont retirés. L’analyse assistée reste une action explicite et ses erreurs sont visibles." },
    ],
  },
  {
    version: "6.27.397",
    date: "2026-10-06",
    headline: "Vos documents restent sous votre contrôle",
    highlights: [
      { emoji: "📄", title: "Déposez et consultez vos références", body: "Le texte des fichiers et des notes reste consultable depuis les sources. La lecture des PDF est rétablie et les fichiers illisibles sont signalés." },
      { emoji: "✋", title: "Choisissez l’aide de l’IA", body: "Le dépôt seul ne lance plus de préparation assistée. Une option vous permet de la demander ; vos informations de marque restent inchangées au dépôt." },
    ],
  },
  {
    version: "6.27.396",
    date: "2026-10-06",
    headline: "Des recettes créatives reliées à leurs preuves",
    highlights: [
      { emoji: "🔎", title: "Une comparaison qui montre ses limites", body: "Consultez la performance attendue, la diffusion observée et les recettes voisines. Lorsque les observations manquent, votre tableau de bord le signale sans inventer de tendance." },
      { emoji: "🎯", title: "Chaque essai retrouve sa publication", body: "Votre équipe confirme la publication correspondant à l’action ou à l’actif testé avant d’enregistrer son résultat. La mesure reste consultable et ne peut pas être remplacée par une autre." },
    ],
  },
  {
    version: "6.27.395",
    date: "2026-10-06",
    headline: "Vos modifications de marque sont visibles immédiatement",
    highlights: [
      { emoji: "✍️", title: "Continuez votre saisie sans recharger", body: "Après une modification manuelle des fondations, le champ affiche la valeur enregistrée. La modification suivante repart de cette dernière version." },
    ],
  },
  {
    version: "6.27.394",
    date: "2026-10-06",
    headline: "Vos dossiers de marque gardent leur juste rôle",
    highlights: [
      { emoji: "🗂️", title: "Une marque créée, des ventes fidèles", body: "Créer une plateforme de marque depuis votre portefeuille n’ajoute plus une vente gagnée à votre suivi commercial. Les ventes restent enregistrées par vos actions commerciales." },
    ],
  },
  {
    version: "6.27.393",
    date: "2026-10-06",
    headline: "Une nouvelle marque part de vos informations",
    highlights: [
      { emoji: "✍️", title: "Les inconnues restent visibles", body: "Créer une plateforme de marque ne renseigne plus de fidélité client, de budget ou de qualité d’expérience à votre place. Seules les informations que vous fournissez deviennent des réponses." },
      { emoji: "🧭", title: "Accédez aux fondations de la bonne marque", body: "Le bouton de plateforme dans le portefeuille ouvre les fondations de la marque choisie. Vous pouvez y poursuivre son cadrage." },
    ],
  },
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
