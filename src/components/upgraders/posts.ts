/**
 * UPgraders blog — "Notes de cabinet".
 *
 * Bundled posts, used directly (no external CMS dependency). Same UI-shaped type a
 * future WordPress/headless backend would normalise to, so the React layer never
 * touches a CMS payload shape.
 */

export type BlogTerm = { name: string; slug: string };
export type BlogAuthor = { name: string; slug: string; avatar?: string };
export type BlogCover = { src: string; alt: string };

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  publishedAt: string;
  readingMinutes: number;
  cover?: BlogCover;
  author?: BlogAuthor;
  categories: BlogTerm[];
  tags: BlogTerm[];
};

const ALEX: BlogAuthor = {
  name: "Alexandre « Xtincell » Djengue",
  slug: "xtincell",
  avatar: "/brand/logos/upgraders-icon.png",
};

export const POSTS: BlogPost[] = [
  {
    id: "fb-1",
    slug: "adve-rtis-pourquoi-une-methode-proprietaire",
    title: "ADVE/RTIS : pourquoi nous avons codifié une méthode propriétaire",
    excerpt:
      "Une méthode n'est pas un dogme — c'est un outil pour rendre l'intuition réexécutable. Voici pourquoi UPgraders a investi sept ans à formaliser ADVE/RTIS.",
    contentHtml: `
      <p>La plupart des cabinets créatifs vivent du génie individuel — un directeur artistique brillant, un stratège providentiel. Le problème : quand la personne change, la qualité change. La marque, elle, ne devrait pas vivre cette dépendance.</p>
      <h2>Le socle ADVE</h2>
      <p>ADVE répond à une question simple : <em>qu'est-ce qui ne peut appartenir qu'à cette marque ?</em> Authenticité, Distinction, Valeur, Engagement — quatre lentilles qui forcent à descendre sous le maquillage et à toucher l'os.</p>
      <h2>Le propulseur RTIS</h2>
      <p>RTIS prend le socle et le met en mouvement. Risk pour cartographier les angles morts, Track pour lire le marché, Innovation pour ouvrir l'éventail des actions, Stratégie pour hiérarchiser et exécuter.</p>
      <h2>Pourquoi codifier ?</h2>
      <p>Parce qu'une méthode codifiée est versionnable. Elle peut être enseignée, automatisée (La Fusée), auditée. Elle survit aux personnes. Et c'est exactement ce qu'une marque culte demande : une cohérence qui dure plus longtemps que ses créatifs.</p>
      <p>Si vous reconnaissez votre marque dans un projet en perte de centre de gravité, l'audit ADVE est notre porte d'entrée standard. Trois ateliers, livrable structuré, et la suite devient lisible.</p>
    `,
    publishedAt: "2026-04-22T09:00:00Z",
    readingMinutes: 6,
    cover: {
      src: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&w=1600&q=80",
      alt: "Étude stratégique sur table — méthodologie ADVE/RTIS",
    },
    author: ALEX,
    categories: [{ name: "Méthode", slug: "methode" }],
    tags: [
      { name: "ADVE/RTIS", slug: "adve-rtis" },
      { name: "Stratégie de marque", slug: "strategie" },
    ],
  },
  {
    id: "fb-2",
    slug: "la-fusee-os-creatif-passion-propulseur",
    title: "La Fusée : pourquoi un cabinet de conseil construit son propre OS",
    excerpt:
      "L'IA ne remplace pas le stratège — elle compresse les cycles. Retour sur la genèse de La Fusée, l'OS interne qui automatise la méthode ADVE/RTIS.",
    contentHtml: `
      <p>En 2024, nous avons commencé à coder La Fusée — pas un produit SaaS générique, pas une licence à vendre seule. Un OS taillé sur mesure pour l'industrie créative ouest et centrafricaine.</p>
      <h2>Le constat</h2>
      <p>La même mission, dans deux agences différentes, peut prendre 4 semaines ou 4 mois. La différence n'est presque jamais la qualité du créatif — c'est la friction administrative, le temps perdu en allers-retours, la perte de mémoire entre cycles.</p>
      <h2>La promesse</h2>
      <p>La Fusée comprime ce qui peut l'être : brief structuré, audit de risque dérivé du SWOT ADVE, cartographie d'innovations hiérarchisée, roadmap qui apprend du cycle précédent. <strong>L'humain garde la décision. Toujours.</strong></p>
      <h2>La preuve</h2>
      <p>Sur les six derniers mandats long terme, le temps de cycle moyen a baissé de façon nette — sans érosion qualité, avec un indicateur de cohérence de marque tenu au plus haut. La méthode tient parce qu'elle est outillée.</p>
    `,
    publishedAt: "2026-03-08T09:00:00Z",
    readingMinutes: 5,
    cover: {
      src: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80",
      alt: "Console software La Fusée — capture interface",
    },
    author: ALEX,
    categories: [{ name: "Produit", slug: "produit" }],
    tags: [
      { name: "La Fusée", slug: "la-fusee" },
      { name: "IA & créatif", slug: "ia-creatif" },
    ],
  },
  {
    id: "fb-3",
    slug: "culte-de-marque-afrique-centrale",
    title: "Construire un culte de marque en Afrique Centrale : 3 leviers sous-estimés",
    excerpt:
      "Le branding africain n'a pas besoin de copier les playbooks new-yorkais. Trois leviers que nous activons systématiquement chez UPgraders.",
    contentHtml: `
      <p>Travailler à Douala n'est pas travailler à Lagos, qui n'est pas travailler à Paris. Pourtant, beaucoup de marques continuent de plaquer des codes importés sur des marchés qui appellent autre chose.</p>
      <h2>1. La proximité oblige la distinction</h2>
      <p>Sur des marchés où tout le monde se connaît, l'apparence du sérieux est gratuite — ce qui se monétise vraiment, c'est la <em>singularité visuelle</em>. Le pilier Distinction existe pour ça.</p>
      <h2>2. Le rituel bat la campagne</h2>
      <p>Le programme communautaire battra toujours la pub one-shot. Voir le cas Motion19 : 30 mois de rituels « Aventurier », pas une campagne — un mode de vie de marque.</p>
      <h2>3. Le binôme stratège-studio bat l'agence intégrée</h2>
      <p>Le couplage UPgraders × Friends Studio est notre modèle préféré : la stratégie pilote, le studio capte. La spécialisation produit toujours plus que l'horizontalité.</p>
    `,
    publishedAt: "2026-02-14T09:00:00Z",
    readingMinutes: 7,
    cover: {
      src: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1600&q=80",
      alt: "Atelier de marque — workshop UPgraders",
    },
    author: ALEX,
    categories: [{ name: "Stratégie", slug: "strategie" }],
    tags: [
      { name: "Branding Afrique", slug: "branding-afrique" },
      { name: "Culte de marque", slug: "culte-de-marque" },
    ],
  },
  {
    id: "fb-4",
    slug: "la-guilde-modele-cellule-mission",
    title: "La Guilde : pourquoi une cellule sur mesure bat l'équipe figée",
    excerpt:
      "Une équipe de 30 salariés signifie 30 budgets fixes — et 30 raisons de mal caster une mission. Le modèle Guilde retourne l'équation.",
    contentHtml: `
      <p>UPgraders n'a pas d'organigramme classique. À chaque mission, on compose la cellule juste : le bon photographe, le bon motion designer, l'agence relais quand le cas l'appelle.</p>
      <h2>Avantages</h2>
      <ul>
        <li><strong>Casting précis</strong> — chaque mandat reçoit l'équipe taillée pour son ADVE.</li>
        <li><strong>Coût juste</strong> — pas de structure à amortir, le client paie ce qui produit la valeur.</li>
        <li><strong>Densité d'expertise</strong> — la Guilde se densifie cycle après cycle.</li>
      </ul>
      <h2>Conditions</h2>
      <p>Cela ne fonctionne qu'avec un noyau dur — ici, le binôme CEO + Friends Studio — qui garantit la cohérence. Sans ce noyau, on est juste un freelance qui sous-traite.</p>
    `,
    publishedAt: "2026-01-09T09:00:00Z",
    readingMinutes: 4,
    cover: {
      src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
      alt: "Réunion équipe créative — Guilde UPgraders",
    },
    author: ALEX,
    categories: [{ name: "Coulisses", slug: "coulisses" }],
    tags: [{ name: "Modèle agence", slug: "modele-agence" }],
  },
  {
    id: "fb-5",
    slug: "audit-marque-trois-questions",
    title: "Trois questions qui révèlent une marque en perte de centre de gravité",
    excerpt:
      "Avant de proposer une refonte, on pose ces trois questions. Si les réponses divergent à l'interne, le travail commence là.",
    contentHtml: `
      <p>Quand une marque nous appelle pour « refaire le logo », c'est rarement le logo le problème. Voici nos trois questions filtres.</p>
      <h2>1. Citez trois mots qui ne peuvent appartenir qu'à votre marque</h2>
      <p>Si quatre dirigeants donnent quatre listes différentes, l'ADN n'est pas posé. C'est le pilier Authenticité.</p>
      <h2>2. Si on retire le logo, reconnaît-on la marque ?</h2>
      <p>Si la réponse est non, la distinction visuelle n'existe pas — il y a juste un signe. C'est le pilier Distinction.</p>
      <h2>3. Que pleureriez-vous si la marque disparaissait demain ?</h2>
      <p>La réponse révèle le vrai engagement avec la communauté. C'est le pilier Engagement.</p>
      <p>Trois questions, vingt minutes, et on sait si le projet est un audit ADVE complet ou juste un rafraîchissement de surface.</p>
    `,
    publishedAt: "2025-12-18T09:00:00Z",
    readingMinutes: 3,
    cover: {
      src: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
      alt: "Notes d'audit de marque sur carnet",
    },
    author: ALEX,
    categories: [{ name: "Méthode", slug: "methode" }],
    tags: [
      { name: "Audit", slug: "audit" },
      { name: "ADVE/RTIS", slug: "adve-rtis" },
    ],
  },
  {
    id: "fb-6",
    slug: "roadmap-dynamique-vs-plan-marketing",
    title: "Roadmap dynamique vs plan marketing annuel : pourquoi nous avons tranché",
    excerpt:
      "Le plan marketing annuel meurt en mai. La roadmap dynamique apprend du cycle. Voici comment on bascule.",
    contentHtml: `
      <p>Un plan marketing à 12 mois est un pari sur la stabilité — un pari risqué dans nos marchés. La roadmap dynamique apprend du cycle précédent et se réajuste tous les trimestres.</p>
      <h2>Mécanique</h2>
      <p>Chaque cycle se clôt par un audit RTIS — ce qui a bougé, ce qui doit changer. La stratégie n'est jamais figée, mais elle reste cohérente parce que l'ADVE, lui, ne bouge pas.</p>
      <h2>Conséquence</h2>
      <p>Les directions marketing qui adoptent ce modèle gagnent en agilité sans perdre en cohérence. C'est exactement ce que La Fusée orchestre côté outillage.</p>
    `,
    publishedAt: "2025-11-04T09:00:00Z",
    readingMinutes: 5,
    cover: {
      src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
      alt: "Tableau de bord stratégique — roadmap dynamique",
    },
    author: ALEX,
    categories: [{ name: "Stratégie", slug: "strategie" }],
    tags: [{ name: "Roadmap", slug: "roadmap" }],
  },
];

export function getAllPosts(): BlogPost[] {
  return [...POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
}
