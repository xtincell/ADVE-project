/**
 * UPgraders — agency site content backbone.
 *
 * Single source of truth for the public UPgraders marketing site. Consolidates:
 *  - the business canon (docs/governance/context/UPGRADERS-LAFUSEE-KB.md) — 5 piliers,
 *    EFR / obligation d'effet, paliers + scores, capture-then-grow, premium curated ;
 *  - the concrete agency record (équipe, trajectoire 2017→2026, clients, La Guilde, contacts).
 *
 * Client-facing vocabulary is BUSINESS only — no internal/mythological aliases (KB §3).
 * The aeronautical register (Fusée, Cockpit, orbite, palier, trajectoire) is the product
 * signature and stays.
 */

/* ─────────────────────────────────────────────────────────────────────────
   Identité
   ───────────────────────────────────────────────────────────────────────── */

export const IDENTITY = {
  name: "UPgraders",
  tagline: "La passion pour propulseur.",
  claim:
    "Le cabinet de conseil & stratégie qui industrialise la production de marques en Afrique francophone.",
  founded: "2017",
  hq: "Douala · Cameroun",
  ceo: "Alexandre Djengue",
  ip: "Méthode ADVE/RTIS",
  positioning: "Premium curated",
  hashtags: ["#ToTheNextLevel", "#UPyourBrand"],
} as const;

export const CONTACT = {
  email: "xtincell@gmail.com",
  whatsapp: [
    { display: "+237 694 17 17 99", link: "https://wa.me/237694171799", label: "Douala" },
    { display: "+225 05 46 15 64 56", link: "https://wa.me/2250546156456", label: "Abidjan" },
  ],
  linkedin: { display: "/in/dmalexandre", link: "https://linkedin.com/in/dmalexandre/" },
  socials: [
    { label: "Instagram", link: "https://instagram.com/xtincell" },
    { label: "X", link: "https://x.com/xtincell" },
    { label: "Facebook", link: "https://facebook.com/xtincell" },
    { label: "Behance", link: "https://behance.net/xtincell" },
  ],
} as const;

/* ─────────────────────────────────────────────────────────────────────────
   CTA — vocabulaire distinct AGENCE vs PRODUIT (KB §1, §12)

   UPgraders (l'agence) VEND : on démarre un projet / on parle à l'agence
   (canal commercial réel = WhatsApp, surfacé sur /contact).
   La Fusée (le produit-phare, UN parmi d'autres) a SON funnel self-serve :
   diagnostic gratuit /intake → Oracle → Cockpit. Ne jamais confondre les deux.
   ───────────────────────────────────────────────────────────────────────── */

export const CTA = {
  /* Agence — le CTA commercial d'UPgraders */
  projectPrimary: { label: "Démarrer un projet", href: "/contact" },
  talkToAgency: { label: "Parler à l'agence", href: "/contact" },
  requestQuote: { label: "Demander un devis", href: "/contact" },
  /* Produit — La Fusée, une offre parmi d'autres (funnel self-serve distinct) */
  lafuseeDiscover: { label: "Découvrir La Fusée", href: "/lafusee" },
  lafuseeDiagnostic: { label: "Diagnostic gratuit — La Fusée", href: "/intake" },
} as const;

/* ─────────────────────────────────────────────────────────────────────────
   Navigation
   ───────────────────────────────────────────────────────────────────────── */

export type NavItem = { label: string; href: string };

export const NAV_ITEMS: NavItem[] = [
  { label: "Agence", href: "/agence" },
  { label: "Méthode", href: "/methode" },
  { label: "Services", href: "/services" },
  { label: "La Guilde", href: "/la-guilde" },
  { label: "Réalisations", href: "/realisations" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

/* ─────────────────────────────────────────────────────────────────────────
   Les 5 piliers du modèle (KB §7)
   ───────────────────────────────────────────────────────────────────────── */

export type Pillar = { mark: string; name: string; line: string; desc: string };

export const PILLARS: Pillar[] = [
  {
    mark: "01",
    name: "Impulsion",
    line: "Conseil stratégique",
    desc: "Audit, workshop, retainer, direction créative déléguée. La porte d'entrée : on extrait l'ADN avant de produire quoi que ce soit.",
  },
  {
    mark: "02",
    name: "Pilotis",
    line: "Gestion de projet déléguée",
    desc: "Chef de projet, COO créatif, contrôle qualité. On porte l'exécution de bout en bout, vous gardez la décision.",
  },
  {
    mark: "03",
    name: "Source Insights",
    line: "Veille & intelligence de marché",
    desc: "Lecture des signaux faibles, étude concurrentielle, observatoire sectoriel. La piste devient lisible avant qu'on n'avance.",
  },
  {
    mark: "04",
    name: "La Guilde",
    line: "Marketplace de talents curatés",
    desc: "Freelances, agences partenaires et spécialistes convoqués à la mission. Une cellule sur mesure, pas une équipe figée.",
  },
  {
    mark: "05",
    name: "Sérénité",
    line: "Conciergerie admin & financière",
    desc: "Facturation, séquestre (escrow), contrats, mobile money. On absorbe la friction administrative qui tue les projets.",
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Méthode ADVE/RTIS (KB §10 + Folio)
   ───────────────────────────────────────────────────────────────────────── */

export type MethodStep = { code: string; name: string; sub: string; body: string };

export const ADVE: MethodStep[] = [
  {
    code: "A",
    name: "Authenticité",
    sub: "On extrait l'ADN, on n'imite pas.",
    body: "Pas de copier-coller de tendances. Une plongée dans l'archéologie de la marque pour révéler ce qui ne peut appartenir qu'à elle.",
  },
  {
    code: "D",
    name: "Distinction",
    sub: "Rupture visuelle immédiate.",
    body: "Chaque sortie doit briser le scroll. La distinction n'est pas un bonus : c'est la condition d'existence dans le bruit numérique.",
  },
  {
    code: "V",
    name: "Valeur",
    sub: "Chaque pixel sert un objectif.",
    body: "L'esthétique sans utilité est une dépense. On lie chaque décision créative à un objectif business mesurable.",
  },
  {
    code: "E",
    name: "Engagement",
    sub: "Du spectateur au prescripteur.",
    body: "Transformer l'attention volatile en communauté. Rituels, codes internes, points de bascule. La marque devient un mouvement.",
  },
];

export const RTIS: MethodStep[] = [
  {
    code: "R",
    name: "Risk",
    sub: "Le SWOT déduit de l'ADVE.",
    body: "On extrait du socle les forces, faiblesses, menaces et opportunités propres à cette marque — pas un SWOT générique, un SWOT taillé dans son ADN.",
  },
  {
    code: "T",
    name: "Track",
    sub: "Étude de marché vs ADVE + Risk.",
    body: "On confronte l'identité et son risque au paysage réel : concurrence, signaux faibles, données comportementales. La piste devient lisible.",
  },
  {
    code: "I",
    name: "Innovation",
    sub: "Toutes les actions activables.",
    body: "On cartographie l'éventail complet d'actions que la marque peut poser — produits, campagnes, formats, rituels.",
  },
  {
    code: "S",
    name: "Stratégie",
    sub: "Roadmap dynamique.",
    body: "Une feuille de route vivante, hiérarchisée, ajustée au cycle. Pas un plan figé — un système qui apprend et se réorganise.",
  },
];

/* Paliers de maturité + score cible /200 (KB §9 + §10) */
export type Palier = { name: string; score: string; note: string };

export const PALIERS: Palier[] = [
  { name: "Latent", score: "—", note: "La marque existe à peine. Tout est à poser." },
  { name: "Fragile", score: "80", note: "Un socle, mais instable. La cohérence ne tient pas seule." },
  { name: "Ordinaire", score: "100", note: "Lisible, mais interchangeable. La distinction manque." },
  { name: "Forte", score: "120", note: "Reconnue, défendable. Une vraie part d'esprit." },
  { name: "Culte", score: "160", note: "Une communauté qui s'identifie. Le mouvement est né." },
  { name: "Icône", score: "180", note: "Référence du secteur. Elle déplace le standard." },
];

/* ─────────────────────────────────────────────────────────────────────────
   Services — les 3 portes d'entrée (Folio + KB §8)
   ───────────────────────────────────────────────────────────────────────── */

export type Service = {
  mark: string;
  title: string;
  emphasis: string;
  duration: string;
  desc: string;
  tag: string;
  featured?: boolean;
};

export const SERVICES: Service[] = [
  {
    mark: "01",
    title: "Audit",
    emphasis: "ADVE",
    duration: "2 à 4 semaines",
    desc: "Trois ateliers pour extraire l'ADN. Un livrable structuré — l'Oracle — qui sert de boussole pour 18 mois minimum.",
    tag: "Porte d'entrée standard",
  },
  {
    mark: "02",
    title: "Mandat",
    emphasis: "RTIS",
    duration: "6 à 24 mois",
    desc: "Le cycle complet : ADVE en entrée, propulseur RTIS en exécution. Roadmap dynamique, cellule sur mesure, obligation d'effet.",
    tag: "Marques cultes — formule reine",
    featured: true,
  },
  {
    mark: "03",
    title: "Marque",
    emphasis: "blanche",
    duration: "Agences relais & studios",
    desc: "Vous portez la relation client, nous portons la méthode. Sous-traitance stratégique pour agences et studios partenaires.",
    tag: "B2B partenaires",
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   EFR — obligation d'effet (KB §9)
   ───────────────────────────────────────────────────────────────────────── */

export const EFR_POINTS: { title: string; desc: string }[] = [
  {
    title: "On ne vend pas des moyens",
    desc: "On vend un état final mesuré : palier visé + score cible + horizon. Gelés et tracés à la signature.",
  },
  {
    title: "Obligation d'effet tracé",
    desc: "Résultat ferme sur ce que l'agence contrôle ; effort prouvé et audité sur ce qu'elle co-détermine avec vous.",
  },
  {
    title: "L'échec est calculé, pas subi",
    desc: "Score + journal immuable. Quatre recours possibles si l'objectif n'est pas atteint — l'altitude acquise reste acquise.",
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   La Guilde — réseau + 3 catégories (KB §7 + Folio)
   ───────────────────────────────────────────────────────────────────────── */

export type GuildeCategory = { name: string; desc: string };

export const GUILDE_CATEGORIES: GuildeCategory[] = [
  { name: "Core", desc: "Les freelances curatés — photo, vidéo, design, motion, copy, son. Le cœur du réseau." },
  { name: "Extended", desc: "Les agences partenaires — comm, média, événementiel, RP. Convoquées sur les gros déploiements." },
  { name: "Réseau", desc: "Les spécialistes — devs, sound designers, illustrateurs, experts sectoriels. Le carnet d'adresses qui se densifie." },
];

export type GuildeMember = { role: string; name: string; tag: string; desc: string };

export const GUILDE_MEMBERS: GuildeMember[] = [
  {
    role: "Photographe · Vidéaste · Designer",
    name: "Alexandre « Xtincell » Djengue",
    tag: "CEO + actif sur le terrain",
    desc: "Quand le brief le demande, le CEO porte aussi l'objectif et les calques. La direction n'est jamais déconnectée du métier.",
  },
  {
    role: "Photographe",
    name: "Stéphane Nounamo",
    tag: "« Student Photographer »",
    desc: "L'œil portrait et événementiel, en binôme à Friends Studio : Orange Excellence, ANAFOOT, concerts, cinéma.",
  },
  {
    role: "Illustration",
    name: "Annick",
    tag: "Illustratrice",
    desc: "Illustration éditoriale et univers de marque. Convoquée quand l'ADVE d'une marque demande un trait, pas une photo.",
  },
  {
    role: "Photographe",
    name: "Paulhan",
    tag: "Photographe",
    desc: "Second œil, format complémentaire sur les missions à grosse couverture.",
  },
  {
    role: "Cellule de production",
    name: "Friends Studio",
    tag: "Studio audiovisuel",
    desc: "Le partenaire exécution privilégié — quand UPgraders stratégise, Friends Studio capte. Akwa Palace, Oceanis Kribi, Maison Gimane.",
  },
  {
    role: "Réseau ouvert",
    name: "+ membres de la Guilde",
    tag: "Convocation à la mission",
    desc: "Devs, motion designers, copywriters, sound designers, agences spécialisées. Une marque, une cellule sur mesure.",
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Direction & trajectoire (Folio)
   ───────────────────────────────────────────────────────────────────────── */

export type TeamMember = { role: string; name: string; tag: string; desc: string; lead?: boolean };

export const TEAM: TeamMember[] = [
  {
    role: "CEO actuel",
    name: "Alexandre « Xtincell » Djengue",
    tag: "Stratège · Photographe · Vidéaste · Designer",
    desc: "Direction générale et créative. Pilote la méthode ADVE/RTIS, l'OS La Fusée et La Guilde. Opère aussi en mission — l'image, le motion, la DA quand le brief le demande.",
    lead: true,
  },
  {
    role: "Co-fondatrice",
    name: "Ingrid Nya Ngatchou",
    tag: "Former CEO",
    desc: "Co-fondatrice (2017) et ancienne CEO. Architecte des premières années : positionnement, structuration, premières grandes missions. Éminence stratégique.",
  },
  {
    role: "Co-fondateur",
    name: "Jean-Philippe Veigne",
    tag: "Former CEO",
    desc: "Co-fondateur (2017) et ancien CEO. Pilier des opérations historiques. Reste une référence dans la gouvernance et la trajectoire long terme.",
  },
];

export type TimelineRow = { year: string; lead?: string; body: string };

export const TIMELINE: TimelineRow[] = [
  { year: "2017", lead: "Fondation d'UPgraders", body: "par Ingrid Nya Ngatchou et Jean-Philippe Veigne. Cabinet de conseil & stratégie créative à Douala." },
  { year: "2019", lead: "Lancement Motion19", body: "— projet structurant : 30 mois de brand build, e-commerce, programme communautaire « Aventurier »." },
  { year: "2020", body: "Premières prestations en marque blanche pour des agences relais (Her Media, OmenKart, Bimstr)." },
  { year: "2022", lead: "Formalisation de la méthode ADVE/RTIS", body: "comme IP UPgraders. Socle ADVE + propulseur RTIS." },
  { year: "2023", lead: "Consolidation du binôme Friends Studio", body: "avec Stéphane Nounamo. Comptes Orange, Cimencam, Chococam." },
  { year: "2024", lead: "Premières briques de La Fusée", body: "— automatisation ADVE/RTIS. KOF, Studio44, Maison Gimane, Oceanis Kribi." },
  { year: "2025", lead: "Alexandre « Xtincell » Djengue prend le relais comme CEO.", body: "Ingrid et Jean-Philippe restent en éminences. En parallèle : Directeur Créatif chez MATANGA Agency." },
  { year: "2026", lead: "Industrialisation de La Fusée.", body: "Ouverture de l'IP ADVE/RTIS aux marques en accompagnement long." },
];

/* ─────────────────────────────────────────────────────────────────────────
   Réalisations / clients (Folio agencies.ts)
   ───────────────────────────────────────────────────────────────────────── */

export type Realisation = { name: string; sector: string; desc: string };

export const REALISATIONS: Realisation[] = [
  { name: "Motion19", sector: "Distribution audiovisuelle", desc: "Marque créée de A à Z sur 30 mois (2019–22). Brand build, e-commerce, programme communautaire « Aventurier »." },
  { name: "Universal Music Africa", sector: "Musique", desc: "Catalogue Cameroun (Locko, Mimie, Charlotte Dipanda, Singuila, Cysoul). Photo principale et direction artistique via Imperial." },
  { name: "Chococam", sector: "Grande consommation", desc: "Confiserie majeure du Cameroun (Mambo, Tartina). Multi-projets photo / vidéo / reportage." },
  { name: "Orange Cameroun", sector: "Télécom", desc: "Couvertures photo de programmes : Orange Excellence, ANAFOOT, concerts, cinéma — via Publicis puis McCann." },
  { name: "Cimencam", sector: "Industrie", desc: "Cimentier de référence du Cameroun. Vidéos corporate via OmenKart × Friends Studio." },
  { name: "KOF — K-mer Otaku Festival", sector: "Festival / pop culture", desc: "Festival pop culture / mangas. Direction artistique depuis la 2ᵉ édition." },
  { name: "Akwa Palace", sector: "Hôtellerie", desc: "Hôtel à Douala. Campagne vidéo publicitaire 2025, production Friends Studio × UPgraders." },
  { name: "Maison Gimane", sector: "Joaillerie", desc: "Joaillerie sur mesure. Production photo et vidéo produit, déclinaisons social media." },
  { name: "Shakazz", sector: "Crypto / fintech", desc: "Plateforme crypto. Lancement complet — naming, identité visuelle, premiers assets." },
  { name: "Oceanis Kribi", sector: "Hôtellerie", desc: "Résidence hôtelière à Kribi. Production de contenus vidéo pour The Villa." },
  { name: "Studio44", sector: "Studio créatif", desc: "Lancement structuré d'un studio créatif (2024)." },
  { name: "MATANGA Agency", sector: "Portefeuille DC&A", desc: "Direction créative & artistique : Friesland Campina, Ecobank RCA, Cadyst Group, LaPasta, Delys&Barka." },
];

/* Logos clients pour le bandeau de preuve sociale (sous-ensemble lisible) */
export const CLIENT_STRIP: string[] = [
  "Motion19",
  "Universal Music Africa",
  "Orange",
  "Chococam",
  "Cimencam",
  "Friesland Campina",
  "Ecobank",
  "Akwa Palace",
  "KOF",
  "Maison Gimane",
];

/* Quelques repères chiffrés (preuve sociale) */
export const STATS: { value: string; label: string }[] = [
  { value: "2017", label: "Année de fondation" },
  { value: "7 ans", label: "Méthode ADVE/RTIS codifiée" },
  { value: "30+", label: "Marques accompagnées" },
  { value: "2", label: "Hubs — Douala · Abidjan" },
];
