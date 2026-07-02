/**
 * Blog « Notes de cabinet » — contenu statique v7.
 *
 * Les 6 articles RÉELS du legacy, portés tels quels : ils vivaient dans
 * `legacy/src/components/upgraders/posts.ts` et étaient seedés en base par
 * `legacy/prisma/seed-blog.ts` (create-only, source unique = ce bundle).
 * Ici : pas de table, pas de CMS — contenu statique, corps en markdown-lite
 * (rendu XSS-safe par `src/lib/markdown-lite.ts`). Le HTML legacy (<p>, <h2>,
 * <ul>, <strong>, <em>) a été converti mécaniquement ; aucune copy inventée.
 */

export type BlogPost = {
  slug: string;
  title: string;
  /** Date de publication ISO (yyyy-mm-dd). */
  date: string;
  excerpt: string;
  /** Corps markdown-lite : `##`, `-`, `**gras**`, paragraphes. */
  body: string;
  category: string;
  tags: string[];
  readingMinutes: number;
  author: string;
};

const AUTHOR = "Alexandre « Xtincell » Djengue";

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "adve-rtis-pourquoi-une-methode-proprietaire",
    title: "ADVE/RTIS : pourquoi nous avons codifié une méthode propriétaire",
    date: "2026-04-22",
    excerpt:
      "Une méthode n'est pas un dogme — c'est un outil pour rendre l'intuition réexécutable. Voici pourquoi UPgraders a investi sept ans à formaliser ADVE/RTIS.",
    category: "Méthode",
    tags: ["ADVE/RTIS", "Stratégie de marque"],
    readingMinutes: 6,
    author: AUTHOR,
    body: `La plupart des cabinets créatifs vivent du génie individuel — un directeur artistique brillant, un stratège providentiel. Le problème : quand la personne change, la qualité change. La marque, elle, ne devrait pas vivre cette dépendance.

## Le socle ADVE

ADVE répond à une question simple : **qu'est-ce qui ne peut appartenir qu'à cette marque ?** Authenticité, Distinction, Valeur, Engagement — quatre lentilles qui forcent à descendre sous le maquillage et à toucher l'os.

## Le propulseur RTIS

RTIS prend le socle et le met en mouvement. Risque pour cartographier les angles morts, Tracking pour lire le marché, Innovation pour ouvrir l'éventail des actions, Stratégie pour hiérarchiser et exécuter.

## Pourquoi codifier ?

Parce qu'une méthode codifiée est versionnable. Elle peut être enseignée, automatisée (La Fusée), auditée. Elle survit aux personnes. Et c'est exactement ce qu'une marque culte demande : une cohérence qui dure plus longtemps que ses créatifs.

Si vous reconnaissez votre marque dans un projet en perte de centre de gravité, l'audit ADVE est notre porte d'entrée standard. Trois ateliers, livrable structuré, et la suite devient lisible.`,
  },
  {
    slug: "la-fusee-os-creatif-passion-propulseur",
    title: "La Fusée : pourquoi un cabinet de conseil construit son propre OS",
    date: "2026-03-08",
    excerpt:
      "L'IA ne remplace pas le stratège — elle compresse les cycles. Retour sur la genèse de La Fusée, l'OS interne qui automatise la méthode ADVE/RTIS.",
    category: "Produit",
    tags: ["La Fusée", "IA & créatif"],
    readingMinutes: 5,
    author: AUTHOR,
    body: `En 2024, nous avons commencé à coder La Fusée — pas un produit SaaS générique, pas une licence à vendre seule. Un OS taillé sur mesure pour l'industrie créative ouest et centrafricaine.

## Le constat

La même mission, dans deux agences différentes, peut prendre 4 semaines ou 4 mois. La différence n'est presque jamais la qualité du créatif — c'est la friction administrative, le temps perdu en allers-retours, la perte de mémoire entre cycles.

## La promesse

La Fusée comprime ce qui peut l'être : brief structuré, audit de risque dérivé du SWOT ADVE, cartographie d'innovations hiérarchisée, roadmap qui apprend du cycle précédent. **L'humain garde la décision. Toujours.**

## La preuve

Sur les six derniers mandats long terme, le temps de cycle moyen a baissé de façon nette — sans érosion qualité, avec un indicateur de cohérence de marque tenu au plus haut. La méthode tient parce qu'elle est outillée.`,
  },
  {
    slug: "culte-de-marque-afrique-centrale",
    title: "Construire un culte de marque en Afrique Centrale : 3 leviers sous-estimés",
    date: "2026-02-14",
    excerpt:
      "Le branding africain n'a pas besoin de copier les playbooks new-yorkais. Trois leviers que nous activons systématiquement chez UPgraders.",
    category: "Stratégie",
    tags: ["Branding Afrique", "Culte de marque"],
    readingMinutes: 7,
    author: AUTHOR,
    body: `Travailler à Douala n'est pas travailler à Lagos, qui n'est pas travailler à Paris. Pourtant, beaucoup de marques continuent de plaquer des codes importés sur des marchés qui appellent autre chose.

## 1. La proximité oblige la distinction

Sur des marchés où tout le monde se connaît, l'apparence du sérieux est gratuite — ce qui se monétise vraiment, c'est la **singularité visuelle**. Le pilier Distinction existe pour ça.

## 2. Le rituel bat la campagne

Le programme communautaire battra toujours la pub one-shot. Voir le cas Motion19 : 30 mois de rituels « Aventurier », pas une campagne — un mode de vie de marque.

## 3. Le binôme stratège-studio bat l'agence intégrée

Le couplage UPgraders × Friends Studio est notre modèle préféré : la stratégie pilote, le studio capte. La spécialisation produit toujours plus que l'horizontalité.`,
  },
  {
    slug: "la-guilde-modele-cellule-mission",
    title: "La Guilde : pourquoi une cellule sur mesure bat l'équipe figée",
    date: "2026-01-09",
    excerpt:
      "Une équipe de 30 salariés signifie 30 budgets fixes — et 30 raisons de mal caster une mission. Le modèle Guilde retourne l'équation.",
    category: "Coulisses",
    tags: ["Modèle agence"],
    readingMinutes: 4,
    author: AUTHOR,
    body: `UPgraders n'a pas d'organigramme classique. À chaque mission, on compose la cellule juste : le bon photographe, le bon motion designer, l'agence relais quand le cas l'appelle.

## Avantages

- **Casting précis** — chaque mandat reçoit l'équipe taillée pour son ADVE.
- **Coût juste** — pas de structure à amortir, le client paie ce qui produit la valeur.
- **Densité d'expertise** — la Guilde se densifie cycle après cycle.

## Conditions

Cela ne fonctionne qu'avec un noyau dur — ici, le binôme CEO + Friends Studio — qui garantit la cohérence. Sans ce noyau, on est juste un freelance qui sous-traite.`,
  },
  {
    slug: "audit-marque-trois-questions",
    title: "Trois questions qui révèlent une marque en perte de centre de gravité",
    date: "2025-12-18",
    excerpt:
      "Avant de proposer une refonte, on pose ces trois questions. Si les réponses divergent à l'interne, le travail commence là.",
    category: "Méthode",
    tags: ["Audit", "ADVE/RTIS"],
    readingMinutes: 3,
    author: AUTHOR,
    body: `Quand une marque nous appelle pour « refaire le logo », c'est rarement le logo le problème. Voici nos trois questions filtres.

## 1. Citez trois mots qui ne peuvent appartenir qu'à votre marque

Si quatre dirigeants donnent quatre listes différentes, l'ADN n'est pas posé. C'est le pilier Authenticité.

## 2. Si on retire le logo, reconnaît-on la marque ?

Si la réponse est non, la distinction visuelle n'existe pas — il y a juste un signe. C'est le pilier Distinction.

## 3. Que pleureriez-vous si la marque disparaissait demain ?

La réponse révèle le vrai engagement avec la communauté. C'est le pilier Engagement.

Trois questions, vingt minutes, et on sait si le projet est un audit ADVE complet ou juste un rafraîchissement de surface.`,
  },
  {
    slug: "roadmap-dynamique-vs-plan-marketing",
    title: "Roadmap dynamique vs plan marketing annuel : pourquoi nous avons tranché",
    date: "2025-11-04",
    excerpt:
      "Le plan marketing annuel meurt en mai. La roadmap dynamique apprend du cycle. Voici comment on bascule.",
    category: "Stratégie",
    tags: ["Roadmap"],
    readingMinutes: 5,
    author: AUTHOR,
    body: `Un plan marketing à 12 mois est un pari sur la stabilité — un pari risqué dans nos marchés. La roadmap dynamique apprend du cycle précédent et se réajuste tous les trimestres.

## Mécanique

Chaque cycle se clôt par un audit RTIS — ce qui a bougé, ce qui doit changer. La stratégie n'est jamais figée, mais elle reste cohérente parce que l'ADVE, lui, ne bouge pas.

## Conséquence

Les directions marketing qui adoptent ce modèle gagnent en agilité sans perdre en cohérence. C'est exactement ce que La Fusée orchestre côté outillage.`,
  },
];

/** Index trié du plus récent au plus ancien. */
export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

/** « 22 avril 2026 » — formatage FR déterministe (date ISO à midi UTC). */
export function formatPostDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
