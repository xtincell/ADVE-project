import type { PillarKey } from "@/domain/pillars";

/**
 * Académie — contenu pédagogique RÉEL porté du legacy (WP-020).
 *
 * Sources (lecture seule, orthographe normalisée — le legacy était saisi sans
 * accents) :
 *   - `legacy/src/app/(creator)/creator/learn/adve/page.tsx`    → piliers + score
 *   - `legacy/src/app/(creator)/creator/learn/drivers/page.tsx` → 13 canaux
 *   - `legacy/src/app/(creator)/creator/learn/cases/page.tsx`   → 3 études de cas
 *   - `legacy/prisma/seed.ts` §16 COURSES                       → catalogue des
 *     4 cours seedés (titres, niveaux, durées, plans de leçons)
 *
 * Doctrine « jamais de donnée inventée » appliquée au contenu :
 *   - une leçon n'a un corps (`blocks`) QUE si ce corps existait réellement en
 *     code ou en seed legacy. Les leçons dont seul le titre était seedé
 *     (quiz, vidéos, exercices) restent sans corps → l'UI affiche « contenu en
 *     cours de migration », rien n'est rédigé à leur place ;
 *   - les barèmes (score /200, poids, paliers) ne sont PAS recopiés ici : le
 *     bloc `bareme` est rendu depuis `domain/scoring` (constantes canon v7) —
 *     l'échelle legacy à 5 paliers de la page learn/adve est caduque (le canon
 *     v7 en compte 6, bornes différentes).
 *
 * La progression n'a pas de table cette vague : voir `progress.tsx`
 * (localStorage, résidu documenté au board WP-020).
 */

// ── Niveaux (port de CourseLevel legacy : BEGINNER/INTERMEDIATE/ADVANCED) ──

export const ACADEMY_LEVELS = ["DEBUTANT", "INTERMEDIAIRE", "AVANCE"] as const;
export type AcademyLevel = (typeof ACADEMY_LEVELS)[number];

export const ACADEMY_LEVEL_LABELS: Record<AcademyLevel, string> = {
  DEBUTANT: "Débutant",
  INTERMEDIAIRE: "Intermédiaire",
  AVANCE: "Avancé",
};

// ── Types de leçons (port des `type` du seed + pages learn) ────────────

export const LESSON_KINDS = [
  "lecon",
  "quiz",
  "exercice",
  "video",
  "checklist",
  "etude-de-cas",
] as const;
export type LessonKind = (typeof LESSON_KINDS)[number];

export const LESSON_KIND_LABELS: Record<LessonKind, string> = {
  lecon: "Leçon",
  quiz: "Quiz",
  exercice: "Exercice",
  video: "Vidéo",
  checklist: "Checklist",
  "etude-de-cas": "Étude de cas",
};

// ── Blocs de contenu (rendu par la page leçon) ─────────────────────────

export type LessonBlock =
  | { type: "paragraphe"; text: string }
  | { type: "intertitre"; text: string }
  | { type: "liste"; items: readonly string[] }
  | { type: "encadre"; title: string; text: string }
  /** Grille des 8 piliers (PILLAR_TEACHINGS + labels canon `domain/pillar-fields`). */
  | { type: "piliers" }
  /** Échelle /200 + paliers — rendu DEPUIS `domain/scoring`, jamais recopié. */
  | { type: "bareme" }
  /** Grille des 13 canaux (DRIVER_CHANNELS). */
  | { type: "canaux" }
  | { type: "etude-de-cas"; caseId: string };

// ── Les 8 piliers — question + pédagogie (learn/adve legacy, verbatim) ──

export type PillarTeaching = {
  key: PillarKey;
  /** La question que le pilier pose à tout livrable / toute marque. */
  question: string;
  description: string;
};

export const PILLAR_TEACHINGS: readonly PillarTeaching[] = [
  {
    key: "A",
    question: "Ce livrable reflète-t-il fidèlement l'ADN de la marque ?",
    description:
      "Mesure la cohérence entre le contenu produit et l'identité réelle de la marque. Un score élevé signifie que le ton, le style et les valeurs transmis sont authentiquement liés à la marque, sans artifice ni mimétisme concurrentiel.",
  },
  {
    key: "D",
    question: "Ce livrable se démarque-t-il clairement de la concurrence ?",
    description:
      "Évalue la capacité du contenu à se distinguer dans un flux saturé. Analyse l'originalité visuelle, conceptuelle et narrative. Un livrable distinctif capte l'attention et renforce la mémorabilité de la marque.",
  },
  {
    key: "V",
    question: "La promesse de valeur est-elle clairement communiquée ?",
    description:
      "Mesure la clarté et la force de la proposition de valeur. Le contenu doit permettre à l'audience de comprendre immédiatement ce que la marque offre de concret et pourquoi c'est pertinent pour eux.",
  },
  {
    key: "E",
    question: "Ce contenu génère-t-il une réaction et construit-il une relation ?",
    description:
      "Évalue le potentiel d'engagement du livrable : likes, partages, commentaires, mais aussi la construction d'une relation durable. L'engagement transforme une audience passive en communauté dévouée.",
  },
  {
    key: "R",
    question: "Les risques réputationnels et légaux ont-ils été anticipés ?",
    description:
      "Analyse les vulnérabilités potentielles du contenu : conformité légale, sensibilités culturelles, risques de bad buzz. Un score élevé indique une gestion proactive des angles morts avant publication.",
  },
  {
    key: "T",
    question: "L'impact de ce livrable est-il mesurable et traçable ?",
    description:
      "Mesure si le contenu intègre des mécanismes de suivi : UTM, QR codes, codes promo, pixels. Un livrable bien tracké permet d'attribuer les résultats et d'optimiser les prochaines itérations.",
  },
  {
    key: "I",
    question: "L'exécution technique est-elle irréprochable ?",
    description:
      "Évalue la qualité d'exécution : respect des specs techniques, résolution, formats, accessibilité, nommage des fichiers. Un concept brillant mal exécuté perd tout son impact.",
  },
  {
    key: "S",
    question: "Ce livrable s'inscrit-il dans une vision stratégique cohérente ?",
    description:
      "Mesure l'alignement avec la stratégie globale de la marque. Le contenu doit contribuer aux objectifs stratégiques, maintenir la cohérence cross-canal, et s'inscrire dans un arc narratif d'ensemble.",
  },
];

// ── Les drivers — 13 canaux réels (learn/drivers legacy, verbatim) ─────

export const DRIVER_TYPES = ["DIGITAL", "PHYSICAL", "EXPERIENTIAL", "MEDIA"] as const;
export type DriverType = (typeof DRIVER_TYPES)[number];

export const DRIVER_TYPE_LABELS: Record<DriverType, string> = {
  DIGITAL: "Digital",
  PHYSICAL: "Physique",
  EXPERIENTIAL: "Expérientiel",
  MEDIA: "Média",
};

export type DriverChannel = {
  channel: string;
  label: string;
  driverType: DriverType;
  description: string;
};

export const DRIVER_CHANNELS: readonly DriverChannel[] = [
  {
    channel: "INSTAGRAM",
    label: "Instagram",
    driverType: "DIGITAL",
    description:
      "Création de contenus visuels pour le feed, les Stories et les Reels. Le driver Instagram traduit la stratégie ADVE en posts engageants, carrousels éducatifs et formats courts vidéo adaptés à l'esthétique de la marque sur la plateforme.",
  },
  {
    channel: "FACEBOOK",
    label: "Facebook",
    driverType: "DIGITAL",
    description:
      "Production de contenus pour pages et groupes Facebook. Ce driver couvre les publications organiques, la modération communautaire, les événements Facebook et les formats publicitaires natifs pour toucher les audiences locales et régionales.",
  },
  {
    channel: "TIKTOK",
    label: "TikTok",
    driverType: "DIGITAL",
    description:
      "Contenus vidéo courts natifs pour TikTok. Ce driver se concentre sur les tendances audio, les challenges, le storytelling rapide et les formats authentiques qui résonnent avec les audiences Gen Z et millennials.",
  },
  {
    channel: "LINKEDIN",
    label: "LinkedIn",
    driverType: "DIGITAL",
    description:
      "Contenus professionnels pour LinkedIn. Articles de thought leadership, posts corporate, présentations de cas clients et contenus employer branding adaptés au ton professionnel de la plateforme.",
  },
  {
    channel: "WEBSITE",
    label: "Site web",
    driverType: "DIGITAL",
    description:
      "Contenus web : landing pages, pages produit, articles de blog, UX writing. Ce driver assure la cohérence du message de marque sur le site tout en optimisant pour le SEO et la conversion.",
  },
  {
    channel: "PACKAGING",
    label: "Packaging",
    driverType: "PHYSICAL",
    description:
      "Design et contenus pour emballages produit. Du texte réglementaire au storytelling visuel, ce driver traduit l'identité de marque sur les supports physiques que le consommateur touche et conserve.",
  },
  {
    channel: "EVENT",
    label: "Événement",
    driverType: "EXPERIENTIAL",
    description:
      "Supports créatifs pour événements : invitations, signalétique, présentations, animations visuelles. Ce driver matérialise la marque dans l'espace physique pour créer des expériences mémorables.",
  },
  {
    channel: "PR",
    label: "Relations presse",
    driverType: "MEDIA",
    description:
      "Communiqués de presse, dossiers de presse, media kits. Ce driver transforme les messages de marque en angles journalistiques percutants pour générer des retombées média positives.",
  },
  {
    channel: "PRINT",
    label: "Print",
    driverType: "PHYSICAL",
    description:
      "Supports imprimés : brochures, flyers, affiches, catalogues. Ce driver adapte l'identité visuelle et le message de marque aux contraintes et opportunités du médium imprimé (CMJN, finitions, formats).",
  },
  {
    channel: "VIDEO",
    label: "Vidéo",
    driverType: "MEDIA",
    description:
      "Production vidéo longue et courte : spots publicitaires, vidéos corporate, témoignages, tutoriels. De la pré-production à la post-production, ce driver couvre tout le pipeline de création vidéo.",
  },
  {
    channel: "RADIO",
    label: "Radio",
    driverType: "MEDIA",
    description:
      "Spots radio, jingles, sponsoring audio. Ce driver traduit le message de marque en format 100 % sonore, avec une attention particulière au scripting, à la voix et au sound design.",
  },
  {
    channel: "TV",
    label: "Télévision",
    driverType: "MEDIA",
    description:
      "Spots TV, habillage antenne, product placement. Ce driver gère la création de contenus pour le médium télévisuel avec ses contraintes spécifiques de durée, format et réglementation.",
  },
  {
    channel: "OOH",
    label: "Out-of-Home",
    driverType: "PHYSICAL",
    description:
      "Affichage extérieur : panneaux, abribus, affichage digital urbain. Ce driver adapte les visuels de marque aux grands formats et aux contraintes de lisibilité à distance et en mouvement.",
  },
];

// ── Études de cas — 3 cas d'école complets (learn/cases legacy) ────────
// Cas pédagogiques du portail créateur legacy : les chiffres y illustrent la
// méthode (« missions exemplaires »), ce ne sont pas des références client de
// l'agence — le rendu le rappelle.

export type CaseStudy = {
  id: string;
  title: string;
  driverType: string;
  difficulty: AcademyLevel;
  pillars: readonly PillarKey[];
  summary: string;
  context: string;
  challenge: string;
  approach: string;
  adveApplication: string;
  results: readonly string[];
  lessons: readonly string[];
};

export const CASE_STUDIES: readonly CaseStudy[] = [
  {
    id: "campagne-instagram-lancement",
    title: "Campagne Instagram — Lancement produit",
    driverType: "Instagram / Digital",
    difficulty: "INTERMEDIAIRE",
    pillars: ["A", "D", "V", "E"],
    summary:
      "Comment les piliers ADVE ont guidé le brief créatif pour le lancement d'un nouveau produit cosmétique sur Instagram, de la stratégie à l'exécution.",
    context:
      "Une marque de cosmétiques camerounaise lance une nouvelle gamme de soins capillaires naturels. L'objectif est de générer de la notoriété et des pré-commandes auprès des femmes 25-35 ans via Instagram. Budget créatif modéré, délai de 3 semaines.",
    challenge:
      "Le marché des soins capillaires est saturé sur Instagram avec de nombreux acteurs locaux et internationaux. La marque doit se démarquer sans budget publicitaire massif et créer de la confiance autour d'une nouvelle gamme non testée par le marché.",
    approach:
      "Application systématique des 4 piliers ADVE au brief créatif : Authenticité via des témoignages réels de testeuses locales (pas de modèles studio), Distinction par un univers visuel terre et naturel à contre-courant des codes cliniques du secteur, Valeur par la mise en avant des ingrédients locaux et de la formulation, Engagement via un challenge Instagram #MonRituelNaturel invitant les utilisatrices à partager leurs routines.",
    adveApplication:
      "Le brief créatif a été structuré autour des 4 piliers prioritaires identifiés. Chaque livrable (9 posts, 15 Stories, 3 Reels) a été évalué sur une grille ADVE simplifiée avant soumission au contrôle qualité. Les scores moyens par pilier ont été utilisés pour identifier les axes d'amélioration en temps réel pendant la campagne.",
    results: [
      "Taux d'engagement moyen de 8,2 % (vs 2,1 % de benchmark sectoriel)",
      "847 contenus UGC générés via le challenge en 2 semaines",
      "Score ADVE moyen des livrables : 156/200",
      "152 pré-commandes directes tracées depuis Instagram",
    ],
    lessons: [
      "Structurer le brief autour des piliers ADVE clarifie les attentes pour le créateur",
      "L'authenticité (témoignages réels) génère 3× plus d'engagement que le contenu studio",
      "Un challenge bien conçu (pilier E) peut compenser un budget publicitaire limité",
      "Le scoring ADVE en cours de campagne permet des ajustements rapides",
    ],
  },
  {
    id: "identite-visuelle-rebrand-pme",
    title: "Identité visuelle — Rebrand PME",
    driverType: "Multi-canal / Physique + Digital",
    difficulty: "AVANCE",
    pillars: ["A", "D", "I", "S"],
    summary:
      "Comment un pipeline de marque outillé a guidé le rebrand complet d'une PME agro-alimentaire, de l'audit à la livraison multi-supports.",
    context:
      "Une PME agro-alimentaire de 15 ans souhaite moderniser son identité visuelle pour passer du marché local au marché régional (CEMAC). Le rebrand doit couvrir le logo, la charte graphique, le packaging (12 produits), le site web et les supports institutionnels. Équipe de 3 créateurs mobilisée.",
    challenge:
      "Moderniser l'identité sans perdre la reconnaissance existante auprès des clients fidèles. Le défi technique est la déclinaison cohérente sur des supports très différents (packaging alimentaire, site web, présentations corporate) avec des contraintes de production variées.",
    approach:
      "Projet structuré en pipeline de marque en quatre phases. Phase 1 : audit de la marque existante et benchmark concurrentiel. Phase 2 : définition du territoire de marque avec validation client à chaque étape clé. Phase 3 : création du système visuel (logo, typographie, couleurs, iconographie). Phase 4 : déclinaison sur tous les supports avec contrôle qualité systématique.",
    adveApplication:
      "Les piliers A (cohérence avec l'héritage), D (différenciation sectorielle), I (qualité d'exécution technique) et S (alignement stratégique avec les objectifs d'expansion) ont été les critères directeurs. Chaque livrable a été évalué sur ces 4 piliers prioritaires, avec des gabarits et des checklists pour chaque étape du pipeline.",
    results: [
      "Score ADVE moyen final : 172/200",
      "100 % des livrables acceptés au premier jet",
      "Cohérence visuelle cross-support validée par le client sans révision majeure",
      "Projet livré en avance de 4 jours sur le planning initial",
    ],
    lessons: [
      "Un pipeline de marque structuré réduit les allers-retours client",
      "Des gabarits par étape accélèrent la production tout en maintenant la qualité",
      "La validation intermédiaire par pilier évite les surprises en fin de projet",
      "Impliquer 3 créateurs sur un projet nécessite un système de cohérence rigoureux (pilier S)",
    ],
  },
  {
    id: "campagne-360-event-digital",
    title: "Campagne 360 — Event + Digital",
    driverType: "Event + Instagram + Vidéo + RP",
    difficulty: "AVANCE",
    pillars: ["A", "D", "V", "E", "R", "T", "I", "S"],
    summary:
      "Exécution d'une campagne multi-driver combinant événementiel, digital et relations presse pour le lancement d'un nouveau service bancaire mobile.",
    context:
      "Une banque régionale lance un service de mobile money visant les 18-30 ans non bancarisés. La campagne doit combiner un événement de lancement, une couverture média, une campagne Instagram/TikTok et des vidéos explicatives. Budget significatif, 6 créateurs impliqués sur 5 semaines.",
    challenge:
      "Coordonner 4 drivers différents avec des contraintes techniques, éditoriales et temporelles distinctes tout en maintenant une cohérence de message parfaite. Le secteur bancaire impose des contraintes réglementaires fortes (pilier R). L'audience cible est sceptique envers les banques traditionnelles.",
    approach:
      "Approche hub-and-spoke : un message central fort décliné sur chaque driver. Le brief stratégique unifié a été produit en amont avec scoring ADVE cible par driver. Chaque équipe driver a reçu son brief enrichi avec les specs techniques et les guidelines de cohérence. Un contrôle qualité transversal a été mis en place pour valider la cohérence cross-driver.",
    adveApplication:
      "Les 8 piliers ont été mobilisés. Les piliers prioritaires variaient selon le driver : A+E pour Instagram, D+V pour l'événement, R+I pour les contenus réglementaires, T+S pour le suivi global. Un tableau de bord ADVE a permis de suivre les scores en temps réel et de détecter les écarts de cohérence entre drivers.",
    results: [
      "Score ADVE moyen global : 164/200",
      "Événement : 2 400 participants, couverture TV nationale",
      "Digital : 4,2 M d'impressions cumulées, 6,8 % de taux d'engagement",
      "RP : 22 retombées média, 0 incident réputationnel (pilier R maîtrisé)",
      "12 000 inscriptions au service en 30 jours post-lancement",
    ],
    lessons: [
      "Une campagne 360 nécessite un brief unifié avec déclinaison par driver",
      "Le scoring ADVE cross-driver est essentiel pour maintenir la cohérence",
      "Le pilier R est critique dans les secteurs réglementés — investir en amont",
      "Le tracking unifié (pilier T) permet l'attribution des résultats par driver",
      "6 créateurs nécessitent un contrôle qualité transversal, pas seulement individuel",
    ],
  },
];

// ── Modules & leçons ────────────────────────────────────────────────────

export type AcademyLesson = {
  slug: string;
  title: string;
  kind: LessonKind;
  /**
   * Corps réel porté du legacy. Absent = le corps n'a jamais existé en
   * code/seed (seul le titre était seedé) → « contenu en cours de migration ».
   */
  blocks?: readonly LessonBlock[];
};

export type AcademyModule = {
  slug: string;
  title: string;
  description: string;
  /** Registre client (thème), pas une taxonomie technique. */
  category: string;
  /** Niveau du catalogue seedé — absent quand chaque leçon porte sa difficulté. */
  level?: AcademyLevel;
  /** Pilier dominant déclaré au catalogue seedé. */
  pillarFocus?: PillarKey;
  /** Durée indicative du catalogue seedé (minutes). */
  durationMin?: number;
  /** Provenance legacy exacte (traçabilité du port). */
  source: string;
  lessons: readonly AcademyLesson[];
};

export const ACADEMY_MODULES: readonly AcademyModule[] = [
  {
    slug: "adve-fondamentaux",
    title: "Fondamentaux ADVE-RTIS",
    description:
      "Comprendre les 8 piliers du protocole ADVE-RTIS et comment ils s'appliquent à votre marque.",
    category: "Méthode",
    level: "DEBUTANT",
    pillarFocus: "S",
    durationMin: 120,
    source: "legacy creator/learn/adve + seed.ts cours « adve-fondamentaux »",
    lessons: [
      {
        slug: "la-methode",
        title: "La méthode ADVE→RTIS",
        kind: "lecon",
        blocks: [
          {
            type: "paragraphe",
            text: "ADVE-RTIS est le cadre d'évaluation de marque de La Fusée, en 8 piliers. Chaque marque — et chaque livrable créatif qui la sert — est évaluée sur ces 8 dimensions pour produire un score composite sur 200. Ce score détermine le palier de la marque et guide les décisions stratégiques.",
          },
          {
            type: "paragraphe",
            text: "En tant que créateur de la Guilde, comprendre chaque pilier vous permet de produire du contenu qui renforce systématiquement la marque sur tous les axes : un brief bien lu commence par savoir quel pilier il sert.",
          },
          {
            type: "encadre",
            title: "ADVE déclaré, RTIS dérivé",
            text: "La cascade suit un ordre : A→D→V→E forment le socle, déclaré et amendé par la marque elle-même (avec l'opérateur). R→T→I→S en sont dérivés par le moteur — jamais édités à la main. Quand le socle bouge, les dérivés se recalculent : c'est ce qui garantit qu'une stratégie reste cohérente de bout en bout.",
          },
          {
            type: "liste",
            items: [
              "A — Authenticité : l'ADN réel de la marque, sans artifice.",
              "D — Distinction : ce qui la démarque dans un flux saturé.",
              "V — Valeur : la promesse concrète, comprise immédiatement.",
              "E — Engagement : la réaction, puis la relation durable.",
              "R — Risque : les angles morts réputationnels et légaux, anticipés.",
              "T — Tracking : la mesure, l'attribution, l'itération.",
              "I — Innovation : l'exécution irréprochable, au niveau technique attendu.",
              "S — Stratégie : l'alignement de chaque geste avec la vision d'ensemble.",
            ],
          },
        ],
      },
      {
        slug: "les-8-piliers",
        title: "Les 8 piliers expliqués",
        kind: "lecon",
        blocks: [
          {
            type: "paragraphe",
            text: "Chaque pilier pose une question simple à tout ce que la marque produit. Apprenez ces huit questions : elles forment la grille de lecture de chaque brief et de chaque livraison.",
          },
          { type: "piliers" },
        ],
      },
      {
        slug: "score-et-paliers",
        title: "Le score /200 et les paliers",
        kind: "lecon",
        blocks: [
          {
            type: "paragraphe",
            text: "Le score d'une marque est structurel et déterministe : il mesure ce qui est réellement renseigné et approfondi dans chaque pilier — jamais une opinion, jamais une note d'IA. Même entrée, même score, toujours.",
          },
          { type: "bareme" },
          {
            type: "paragraphe",
            text: "Chaque palier ouvre la suite du travail : on ne « saute » pas un palier, on le construit. Le diagnostic du cockpit montre à tout moment les champs manquants qui coûtent des points — c'est là que se gagnent les progressions.",
          },
        ],
      },
      {
        slug: "quiz-identifier-vos-forces",
        title: "Quiz : identifier vos forces",
        kind: "quiz",
        // Corps jamais versionné en legacy (titre seedé seul) — à migrer.
      },
    ],
  },
  {
    slug: "maitriser-drivers",
    title: "Maîtriser les Drivers",
    description:
      "Comment choisir et optimiser vos canaux de communication (Instagram, Facebook, événements, RP, etc.).",
    category: "Drivers",
    level: "INTERMEDIAIRE",
    pillarFocus: "I",
    durationMin: 90,
    source: "legacy creator/learn/drivers + seed.ts cours « maitriser-drivers »",
    lessons: [
      {
        slug: "quest-ce-quun-driver",
        title: "Qu'est-ce qu'un driver ?",
        kind: "lecon",
        blocks: [
          {
            type: "paragraphe",
            text: "Un driver est le pont entre la stratégie de marque ADVE-RTIS et l'exécution créative concrète. Il traduit les orientations stratégiques en spécifications adaptées à un canal de communication spécifique.",
          },
          {
            type: "paragraphe",
            text: "Chaque driver définit les formats, les contraintes techniques, le ton et les bonnes pratiques propres à son canal. Lorsqu'une mission est créée, elle est associée à un type d'action qui guide le créateur tout au long de la production.",
          },
        ],
      },
      {
        slug: "cartographie-des-canaux",
        title: "Cartographie des canaux",
        kind: "lecon",
        blocks: [
          {
            type: "paragraphe",
            text: "Le guide legacy documente 13 canaux, répartis en quatre familles : digital, physique, expérientiel et média. Pour chaque canal, retenez ce que le driver couvre — c'est le vocabulaire commun entre la marque, l'opérateur et vous.",
          },
          { type: "canaux" },
        ],
      },
      {
        slug: "adapter-le-brief-au-driver",
        title: "Adapter le brief au driver",
        kind: "video",
        // Corps jamais versionné en legacy (titre seedé seul) — à migrer.
      },
      {
        slug: "exercice-creer-un-brief",
        title: "Exercice : créer un brief",
        kind: "exercice",
        // Corps jamais versionné en legacy (titre seedé seul) — à migrer.
      },
    ],
  },
  {
    slug: "etudes-de-cas",
    title: "Études de cas",
    description:
      "Missions exemplaires illustrant l'application concrète du framework ADVE-RTIS, du brief à la livraison.",
    category: "Pratique",
    source: "legacy creator/learn/cases (3 cas d'école complets, en dur)",
    lessons: [
      {
        slug: "campagne-instagram-lancement",
        title: "Campagne Instagram — Lancement produit",
        kind: "etude-de-cas",
        blocks: [{ type: "etude-de-cas", caseId: "campagne-instagram-lancement" }],
      },
      {
        slug: "identite-visuelle-rebrand-pme",
        title: "Identité visuelle — Rebrand PME",
        kind: "etude-de-cas",
        blocks: [{ type: "etude-de-cas", caseId: "identite-visuelle-rebrand-pme" }],
      },
      {
        slug: "campagne-360-event-digital",
        title: "Campagne 360 — Event + Digital",
        kind: "etude-de-cas",
        blocks: [{ type: "etude-de-cas", caseId: "campagne-360-event-digital" }],
      },
    ],
  },
  {
    slug: "cult-marketing",
    title: "Le Cult Marketing",
    description:
      "Transformer vos clients en communauté dévouée. Rituels, échelle de dévotion, indice de culte.",
    category: "Engagement",
    level: "AVANCE",
    pillarFocus: "E",
    durationMin: 180,
    source: "legacy seed.ts cours « cult-marketing » (plan de leçons seul)",
    lessons: [
      { slug: "de-laudience-a-la-communaute", title: "De l'audience à la communauté", kind: "video" },
      { slug: "designer-un-rituel-de-marque", title: "Designer un rituel de marque", kind: "exercice" },
      { slug: "mesurer-lindice-de-culte", title: "Mesurer l'indice de culte", kind: "lecon" },
      { slug: "etude-de-cas-apple-nike-harley", title: "Étude de cas : Apple, Nike, Harley", kind: "etude-de-cas" },
    ],
  },
  {
    slug: "production-creative",
    title: "Production créative",
    description: "Les bases de la production créative pour les freelances de la Guilde.",
    category: "Production",
    level: "DEBUTANT",
    pillarFocus: "D",
    durationMin: 60,
    source: "legacy seed.ts cours « production-creative » (plan de leçons seul)",
    lessons: [
      { slug: "lire-un-brief-adve", title: "Lire un brief ADVE", kind: "lecon" },
      { slug: "les-standards-qualite", title: "Les standards qualité", kind: "video" },
      { slug: "checklist-livrable", title: "Checklist livrable", kind: "checklist" },
    ],
  },
];

// ── Helpers purs (testés) ───────────────────────────────────────────────

export function lessonAvailable(lesson: AcademyLesson): boolean {
  return (lesson.blocks?.length ?? 0) > 0;
}

export function getModule(slug: string): AcademyModule | null {
  return ACADEMY_MODULES.find((m) => m.slug === slug) ?? null;
}

export function getLesson(
  moduleSlug: string,
  lessonSlug: string,
): { module: AcademyModule; lesson: AcademyLesson } | null {
  const courseModule = getModule(moduleSlug);
  if (!courseModule) return null;
  const lesson = courseModule.lessons.find((l) => l.slug === lessonSlug);
  return lesson ? { module: courseModule, lesson } : null;
}

export function getCaseStudy(caseId: string): CaseStudy | null {
  return CASE_STUDIES.find((c) => c.id === caseId) ?? null;
}

export type ModuleLessonStats = { total: number; available: number };

export function moduleLessonStats(courseModule: AcademyModule): ModuleLessonStats {
  return {
    total: courseModule.lessons.length,
    available: courseModule.lessons.filter(lessonAvailable).length,
  };
}

/** Leçons ouvrables d'un module, dans l'ordre (navigation précédent/suivant). */
export function availableLessons(courseModule: AcademyModule): AcademyLesson[] {
  return courseModule.lessons.filter(lessonAvailable);
}
