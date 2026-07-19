import { z } from "zod";
import { callLLM } from "@/server/services/llm-gateway";
import { wrapUntrusted, sanitizeInline, UNTRUSTED_NOTICE } from "@/server/services/utils/untrusted-content";
import { BUSINESS_MODELS, ECONOMIC_MODELS, POSITIONING_ARCHETYPES, BRAND_NATURES } from "@/lib/types/business-context";

export interface IntakeQuestion {
  id: string;
  pillar: string;
  question: string;
  type: "text" | "select" | "multiselect" | "scale";
  options?: string[];
  required: boolean;
  tooltip?: string; // Hover help for non-professionals
}

const PILLAR_NAMES: Record<string, string> = {
  a: "Authenticité",
  d: "Distinction",
  v: "Valeur",
  e: "Engagement",
  r: "Risk — SWOT Interne",
  t: "Track — SWOT Externe",
  i: "Implémentation — Potentiel d'action",
  s: "Strategy — Fenêtre d'Overton",
};

const QUESTION_BANK: Record<string, IntakeQuestion[]> = {
  // ========================================================================
  // Business context questions — captured before ADVE pillars
  // ========================================================================
  biz: [
    {
      id: "biz_model", pillar: "biz",
      question: "Quel est votre modèle d'affaires principal ?",
      tooltip: "Le modèle d'affaires décrit comment vous créez et délivrez de la valeur. B2C = vous vendez aux particuliers, B2B = aux entreprises, D2C = directement sans intermédiaire.",
      type: "select",
      options: Object.entries(BUSINESS_MODELS).map(([key, m]) => `${key}::${m.label}`),
      required: true,
    },
    {
      id: "biz_nature", pillar: "biz",
      question: "Quelle est la nature de votre marque ?",
      tooltip: "Un festival est un produit-événement dont l'expérience EST l'offre. Un produit est un bien physique ou numérique. Un service est une prestation. Un lieu est un espace d'expérience (restaurant, concept store).",
      type: "select",
      options: Object.entries(BRAND_NATURES).map(([key, n]) => `${key}::${n.label}`),
      required: true,
    },
    {
      id: "biz_revenue", pillar: "biz",
      question: "Comment générez-vous principalement vos revenus ? (plusieurs choix possibles)",
      tooltip: "Choisissez tous les moyens par lesquels l'argent entre dans votre entreprise. La plupart des entreprises ont 2-3 sources de revenus différentes.",
      type: "multiselect",
      options: Object.entries(ECONOMIC_MODELS).map(([key, m]) => `${key}::${m.label}`),
      required: true,
    },
    {
      id: "biz_positioning", pillar: "biz",
      question: "Comment positionnez-vous vos prix par rapport au marché ?",
      tooltip: "Comparez vos prix à ceux de vos concurrents directs. Êtes-vous moins cher, au même niveau, ou plus cher qu'eux ?",
      type: "select",
      options: Object.entries(POSITIONING_ARCHETYPES).map(([key, m]) => `${key}::${m.label}`),
      required: true,
    },
    {
      id: "biz_sales_channel", pillar: "biz",
      question: "Comment vendez-vous ?",
      tooltip: "Direct = vous vendez vous-même au client final (boutique, site web). Intermédiaire = vous passez par des distributeurs, grossistes ou revendeurs.",
      type: "select",
      options: [
        "DIRECT::Directement au client final (D2C)",
        "INTERMEDIATED::Via des distributeurs / revendeurs",
        "HYBRID::Les deux (vente directe + distributeurs)",
      ],
      required: true,
    },
    {
      id: "biz_free_element", pillar: "biz",
      question: "Y a-t-il une partie gratuite dans votre offre ?",
      tooltip: "Freemium = une version gratuite limitée pour attirer, puis une version payante complète. Beaucoup de marques offrent du contenu gratuit (blog, vidéos) pour attirer des clients.",
      type: "select",
      options: [
        "NONE::Non, tout est payant",
        "FREEMIUM::Oui, une version gratuite limitée",
        "CONTENT::Oui, du contenu ou des outils gratuits",
        "AD_SUPPORTED::Oui, un modèle financé par la publicité",
      ],
      required: false,
    },
    {
      id: "biz_free_detail", pillar: "biz",
      question: "Si oui, décrivez ce qui est gratuit vs. ce qui est payant.",
      tooltip: "Expliquez simplement : qu'est-ce que les gens peuvent obtenir gratuitement, et à partir de quand doivent-ils payer ?",
      type: "text",
      required: false,
    },
    {
      id: "biz_premium_scope", pillar: "biz",
      question: "Votre positionnement premium/luxe concerne-t-il toute votre gamme ou seulement certains produits ?",
      tooltip: "Premium = plus cher que la moyenne du marché, avec une qualité ou un service supérieur. Si vos prix sont dans la moyenne, choisissez 'pas positionné premium'.",
      type: "select",
      options: [
        "FULL::Toute la marque est positionnée premium/luxe",
        "PARTIAL::Seulement certains produits ou lignes",
        "NONE::Nous ne sommes pas positionnés premium/luxe",
      ],
      required: false,
    },
    // ── Financial capacity questions (Thot anchors) ───────────────
    // All optional — direct anchor preferred, indirect benchmarks fallback.
    {
      id: "biz_revenue_range", pillar: "biz",
      question: "Quelle est la tranche de chiffre d'affaires annuel de votre marque ?",
      tooltip: "Une fourchette suffit, c'est confidentiel. Si vous êtes en pré-revenu (pas encore de CA), choisissez la première option. Le CA aide à calibrer un budget marketing réaliste pour vous.",
      type: "select",
      options: [
        "PRE_REVENUE::Pas encore de revenus / pré-lancement",
        "LT_50M_FCFA::Moins de 50M FCFA (ou < 75K EUR)",
        "50M_500M_FCFA::50M à 500M FCFA (75K à 750K EUR)",
        "500M_5G_FCFA::500M à 5 milliards FCFA (750K à 7.5M EUR)",
        "GT_5G_FCFA::Plus de 5 milliards FCFA (> 7.5M EUR)",
        "PREFER_NOT_SAY::Je préfère ne pas le dire",
      ],
      required: false,
    },
    {
      id: "biz_marketing_budget_last", pillar: "biz",
      question: "Quel a été votre budget marketing l'an dernier (toutes dépenses confondues) ?",
      tooltip: "Inclut publicité, influenceurs, agences, design, events, community manager. Une estimation suffit. Si zéro ou inexistant, choisissez la première option — c'est honnête et utile pour calibrer.",
      type: "select",
      options: [
        "ZERO::Zéro / aucun budget formalisé",
        "LT_1M_FCFA::Moins de 1M FCFA / an",
        "1M_10M_FCFA::1 à 10M FCFA / an",
        "10M_50M_FCFA::10 à 50M FCFA / an",
        "50M_250M_FCFA::50 à 250M FCFA / an",
        "GT_250M_FCFA::Plus de 250M FCFA / an",
        "PREFER_NOT_SAY::Je préfère ne pas le dire",
      ],
      required: false,
    },
    {
      id: "biz_marketing_budget_intent", pillar: "biz",
      question: "Quelle enveloppe marketing envisagez-vous pour les 12 prochains mois ?",
      tooltip: "L'objectif que vous vous fixez, même s'il n'est pas encore validé. Si vous n'en avez pas, choisissez 'À définir'. Cette réponse aide la plateforme à vous proposer des actions à votre échelle.",
      type: "select",
      options: [
        "TBD::À définir / pas encore fixé",
        "ZERO::Zéro — bootstrap pur, organique seulement",
        "LT_1M_FCFA::Moins de 1M FCFA",
        "1M_10M_FCFA::1 à 10M FCFA",
        "10M_50M_FCFA::10 à 50M FCFA",
        "50M_250M_FCFA::50 à 250M FCFA",
        "GT_250M_FCFA::Plus de 250M FCFA",
      ],
      required: false,
    },
    {
      id: "biz_team_size", pillar: "biz",
      question: "Combien de personnes travaillent dans votre marque (effectif total) ?",
      tooltip: "Inclut fondateurs, employés à temps plein et partiel. Donne une idée de votre capacité d'exécution interne.",
      type: "select",
      options: [
        "SOLO::1 (solo)",
        "2_5::2 à 5 personnes",
        "6_20::6 à 20 personnes",
        "21_100::21 à 100 personnes",
        "GT_100::Plus de 100 personnes",
      ],
      required: false,
    },
  ],

  // ========================================================================
  // ADVE Pillar questions
  // ========================================================================
  a: [
    { id: "a_vision", pillar: "a", question: "Quelle est la vision de votre marque ? Où voulez-vous être dans 10 ans ?", type: "text", required: true, tooltip: "La vision, c'est le rêve à long terme. Exemple : 'Devenir la référence africaine du café de spécialité.' Pensez grand, c'est une boussole, pas un objectif chiffré." },
    { id: "a_mission", pillar: "a", question: "Quelle est votre mission ? Pourquoi votre marque existe-t-elle ?", type: "text", required: true, tooltip: "La mission explique POURQUOI vous faites ce que vous faites, pas CE QUE vous faites. Exemple : 'Rendre le savoir-faire artisanal accessible à tous.'" },
    { id: "a_origin", pillar: "a", question: "Racontez l'histoire de la création de votre marque.", type: "text", required: false, tooltip: "Chaque marque a un moment déclencheur. Qu'est-ce qui vous a poussé à vous lancer ? Un problème vécu, une passion, une rencontre ? Les clients adorent les histoires vraies." },
    { id: "a_values", pillar: "a", question: "Quelles sont les 3-5 valeurs fondamentales de votre marque ?", type: "text", required: true, tooltip: "Les valeurs sont les principes non-négociables qui guident vos décisions. Évitez les mots creux ('qualité', 'innovation'). Soyez spécifique : 'transparence radicale', 'artisanat local'." },
    { id: "a_archetype", pillar: "a", question: "Si votre marque était une personne, comment la décririez-vous ?", type: "text", required: false, tooltip: "Imaginez votre marque à une soirée : quel genre de personne serait-elle ? Sérieuse et experte ? Rebelle et audacieuse ? Chaleureuse et rassurante ? Ça aide à définir votre personnalité." },
    // ADR-0030 Axe 2 — couvre A.noyauIdentitaire (contrat INTAKE, derivable: false)
    { id: "a_noyau", pillar: "a", question: "Si vous deviez résumer votre marque en UNE phrase identitaire de moins de 20 mots, ce serait quoi ?", type: "text", required: true, tooltip: "Le noyau identitaire = votre essence en une phrase. C'est ce qui resterait si on retirait tout le reste. Pas un slogan publicitaire, mais l'ADN. Exemple : 'L'artisanat camerounais qui voyage du village au monde.'" },
    // ADR-0030 Axe 2 — couvre A.citationFondatrice (contrat INTAKE, derivable: false)
    { id: "a_citation", pillar: "a", question: "Une citation, maxime ou phrase manifeste qui résume l'esprit fondateur ?", type: "text", required: false, tooltip: "Pas obligatoire mais puissant. Exemples : 'Think different' (Apple), 'Just do it' (Nike), ou une phrase de votre fondateur. Si vous n'en avez pas encore, laissez vide — l'IA peut en proposer une depuis votre vision/mission." },
  ],
  d: [
    { id: "d_positioning", pillar: "d", question: "Qu'est-ce qui vous rend unique par rapport à vos concurrents ?", type: "text", required: true, tooltip: "Votre 'USP' (Unique Selling Proposition). Complétez cette phrase : 'Nous sommes les seuls à ___.' Si vos clients vous quittaient, que ne trouveraient-ils nulle part ailleurs ?" },
    // ADR-0030 Axe 2 — couvre D.promesseMaitre (contrat INTAKE, derivable: false)
    // Sémantiquement distincte de v_promise : promesseMaitre = engagement central de marque (D),
    // v_promise = bénéfice promis par produit/service (V).
    { id: "d_promise", pillar: "d", question: "Quelle est votre promesse maître — ce que tout client peut attendre de vous, sans condition ?", type: "text", required: true, tooltip: "Votre engagement central. Une seule phrase, garantie à 100% des clients. Exemple : 'Vous repartirez avec une histoire à raconter.' Pas le bénéfice d'un produit, mais ce que VOUS incarnez quoi qu'il arrive." },
    // ADR-0030 Axe 2 — couvre D.personas (contrat INTAKE, derivable: false, min_items: 1)
    { id: "d_persona_principal", pillar: "d", question: "Décrivez votre client idéal en 3 traits comportementaux concrets (pas démographiques).", type: "text", required: true, tooltip: "Pas 'femme 25-34 urbaine'. Plutôt : 'achète par identification, pas par besoin', 'préférence esthétique > prix', 'partage ses achats sur Instagram'. Comportement > démographie." },
    { id: "d_persona_secondary", pillar: "d", question: "Avez-vous un second persona important ? Décrivez-le pareil.", type: "text", required: false, tooltip: "Optionnel. Beaucoup de marques ont 1-2 personas principaux. Si vous en avez plus, gardez les 2 plus volumiques en CA." },
    { id: "d_visual", pillar: "d", question: "Comment décririez-vous votre identité visuelle ?", type: "select", options: ["Inexistante", "Basique", "Définie mais incohérente", "Professionnelle et cohérente", "Distinctive et mémorable"], required: true, tooltip: "L'identité visuelle = logo, couleurs, typographie, style photo. 'Basique' = juste un logo. 'Cohérente' = même style partout. 'Mémorable' = on vous reconnaît sans voir le logo." },
    { id: "d_voice", pillar: "d", question: "Quel ton utilisez-vous pour communiquer ?", type: "select", options: ["Pas défini", "Formel", "Décontracté", "Inspirant", "Provocateur", "Expert"], required: true, tooltip: "Le ton de voix, c'est COMMENT vous parlez à vos clients. Formel = 'Nous vous proposons...', Décontracté = 'Hey, on a un truc cool pour toi', Expert = 'Selon nos analyses...'" },
    { id: "d_competitors", pillar: "d", question: "Nommez vos 3 principaux concurrents.", type: "text", required: false, tooltip: "Les entreprises que vos clients considèrent quand ils ne vous choisissent pas. Même si vous pensez ne pas en avoir, vos clients ont toujours des alternatives (y compris ne rien acheter)." },
  ],
  v: [
    { id: "v_promise", pillar: "v", question: "Quelle promesse faites-vous à vos clients ?", type: "text", required: true, tooltip: "La promesse client = le résultat que vous garantissez. Pas votre produit, mais le BÉNÉFICE. Exemple : pas 'on vend des matelas' mais 'vous dormirez mieux dès la première nuit'." },
    { id: "v_products", pillar: "v", question: "Quels sont vos produits/services principaux ?", type: "text", required: true, tooltip: "Listez vos 3-5 offres principales avec une phrase pour chacune. Commencez par celle qui génère le plus de revenus." },
    // Vague D — profondeur V alignee sur le schema pilier (produitsCatalogue /
    // productLadder / unitEconomics / salesChannel) : matiere DECLAREE au lieu
    // de laisser l'extraction deviner (ADR-0046). Toutes optionnelles.
    { id: "v_bestseller", pillar: "v", question: "Quel est votre produit/service le plus vendu ? Pourquoi celui-là, selon vous ?", type: "text", required: false, tooltip: "Votre best-seller révèle ce que le marché valorise VRAIMENT chez vous — parfois différent de ce que vous pensez vendre. Précisez son prix si possible." },
    { id: "v_price_range", pillar: "v", question: "Quelle est votre fourchette de prix, de l'offre la moins chère à la plus chère ?", type: "text", required: false, tooltip: "Exemple : 'de 2 500 FCFA (accessoire) à 85 000 FCFA (pièce sur-mesure)'. Ça dessine votre échelle de gammes — l'escalier que vos clients peuvent monter." },
    { id: "v_price_positioning", pillar: "v", question: "Comment se situent vos prix par rapport au marché ?", type: "select", options: ["Entrée de gamme", "Milieu de gamme", "Premium", "Luxe", "Ça dépend des gammes"], required: false, tooltip: "Par rapport à vos concurrents directs : moins cher, pareil, plus cher ? Il n'y a pas de mauvaise réponse — il y a des positionnements assumés et des positionnements subis." },
    { id: "v_sales_channel", pillar: "v", question: "Où se font principalement vos ventes ?", type: "select", options: ["Point de vente physique", "Site e-commerce", "Réseaux sociaux (WhatsApp, Instagram...)", "Distributeurs / revendeurs", "Mixte"], required: false, tooltip: "Le canal qui génère le PLUS de chiffre. 'Réseaux sociaux' compte si vos clients commandent via WhatsApp/Instagram même sans site." },
    { id: "v_experience", pillar: "v", question: "Comment évaluez-vous l'expérience client que vous offrez ?", type: "scale", required: true, tooltip: "1 = chaotique, le client se débrouille seul. 5 = correct, ça fonctionne. 10 = expérience mémorable, le client en parle à ses amis. Soyez honnête, c'est un diagnostic !" },
  ],
  e: [
    { id: "e_community", pillar: "e", question: "Avez-vous une communauté autour de votre marque ?", type: "select", options: ["Aucune", "Réseaux sociaux basiques", "Communauté active", "Communauté engagée et fidèle"], required: true, tooltip: "Une page Facebook avec des likes n'est pas une communauté. Une communauté ACTIVE = des gens qui commentent, partagent, interagissent entre eux. FIDÈLE = ils reviennent sans que vous les relanciiez." },
    { id: "e_loyalty", pillar: "e", question: "Quel % de vos clients reviennent régulièrement ?", type: "select", options: ["< 10%", "10-30%", "30-50%", "50-70%", "> 70%"], required: true, tooltip: "Sur 100 clients, combien font un deuxième achat dans les 12 mois ? Si vous ne savez pas exactement, estimez. Moins de 30% = la plupart ne reviennent pas." },
    { id: "e_advocates", pillar: "e", question: "Vos clients recommandent-ils activement votre marque ?", type: "select", options: ["Jamais", "Rarement", "Parfois", "Souvent", "Systématiquement"], required: true, tooltip: "Le bouche-à-oreille : vos clients parlent-ils de vous à leur entourage sans que vous le demandiez ? 'Souvent' = vous recevez régulièrement des clients qui disent 'un ami m'a parlé de vous'." },
    // Vague D — profondeur E alignee sur le schema pilier (touchpoints /
    // primaryChannel / superfanPortrait). Toutes optionnelles.
    { id: "e_channels", pillar: "e", question: "Sur quels canaux êtes-vous actif (réseaux, WhatsApp, email, points de vente...) ? Lequel génère le plus d'interactions ?", type: "text", required: false, tooltip: "Listez tout : Instagram, TikTok, WhatsApp Business, newsletter, marchés/salons... Et dites lequel est VOTRE canal — celui où votre communauté vit vraiment." },
    { id: "e_frequency", pillar: "e", question: "À quelle fréquence communiquez-vous avec votre audience ?", type: "select", options: ["Jamais / très rarement", "Quelques fois par mois", "Chaque semaine", "Plusieurs fois par semaine", "Chaque jour"], required: false, tooltip: "Publications, stories, messages, emails... tout compte. La régularité pèse plus que le volume : mieux vaut 2 posts/semaine constants que 10 puis silence." },
    { id: "e_superfan", pillar: "e", question: "Décrivez votre client le plus fan : qui est-il, que fait-il pour la marque ?", type: "text", required: false, tooltip: "La personne qui achète tout, défend la marque, amène ses amis. Qu'est-ce qui l'a rendue fan ? C'est le portrait-robot de vos futurs superfans — le carburant de la Fusée." },
    { id: "e_rituals", pillar: "e", question: "Avez-vous des rituels ou traditions de marque ?", type: "text", required: false, tooltip: "Un rituel de marque = quelque chose de récurrent qui vous est propre. Exemples : un live hebdomadaire, un événement annuel, un packaging signature, une phrase culte que vos clients connaissent." },
  ],
  r: [
    { id: "r_threats", pillar: "r", question: "Quels sont les 3 plus grands risques pour votre marque ?", type: "text", required: true, tooltip: "Pensez large : un concurrent qui baisse ses prix, un changement de réglementation, la perte d'un fournisseur clé, un bad buzz sur les réseaux, la dépendance à un seul client..." },
    { id: "r_crisis", pillar: "r", question: "Avez-vous un plan de gestion de crise ?", type: "select", options: ["Non", "En cours de création", "Basique", "Complet et testé"], required: true, tooltip: "Un plan de crise = savoir qui fait quoi quand ça tourne mal. Même un simple document d'une page avec les contacts d'urgence et les étapes à suivre compte comme 'basique'." },
    { id: "r_reputation", pillar: "r", question: "Comment surveillez-vous votre réputation en ligne ?", type: "select", options: ["Pas du tout", "Manuellement parfois", "Outils basiques", "Monitoring avancé"], required: true, tooltip: "Tapez-vous régulièrement le nom de votre marque sur Google ? Lisez-vous les avis ? 'Manuellement' = vous vérifiez de temps en temps. 'Outils' = Google Alerts, Mention, etc." },
  ],
  t: [
    { id: "t_kpis", pillar: "t", question: "Quels KPIs suivez-vous pour votre marque ?", type: "text", required: true, tooltip: "KPI = indicateur chiffré que vous surveillez. Exemples : nombre de ventes par mois, trafic du site web, nombre d'abonnés, taux de satisfaction. Si vous n'en suivez aucun, écrivez 'aucun'." },
    { id: "t_measurement", pillar: "t", question: "À quelle fréquence mesurez-vous la performance de votre marque ?", type: "select", options: ["Jamais", "Annuellement", "Trimestriellement", "Mensuellement", "En continu"], required: true, tooltip: "À quelle fréquence regardez-vous vos chiffres ? 'En continu' = un tableau de bord que vous consultez chaque semaine. 'Jamais' = vous naviguez au feeling." },
    { id: "t_nps", pillar: "t", question: "Connaissez-vous votre Net Promoter Score (NPS) ?", type: "select", options: ["Non", "Approximativement", "Oui, mesuré régulièrement"], required: false, tooltip: "Le NPS mesure la fidélité client avec une seule question : 'Recommanderiez-vous cette marque ?' Note de 0 à 10. Si vous n'avez jamais posé cette question à vos clients, répondez 'Non'." },
  ],
  i: [
    { id: "i_roadmap", pillar: "i", question: "Avez-vous un plan marketing structuré ?", type: "select", options: ["Non", "Informel", "Plan annuel", "Plan 3 ans"], required: true, tooltip: "Un plan marketing = un document qui dit : quoi faire, quand, pour qui, avec quel budget. 'Informel' = vous avez des idées mais rien d'écrit. 'Plan annuel' = un document avec des actions mensuelles." },
    { id: "i_budget", pillar: "i", question: "Quel % de votre CA investissez-vous en marketing/branding ?", type: "select", options: ["< 2%", "2-5%", "5-10%", "10-15%", "> 15%"], required: true, tooltip: "CA = Chiffre d'Affaires (vos revenus totaux). Si vous gagnez 100M FCFA/an et dépensez 5M en marketing (pub, design, events, community manager), c'est 5%. La moyenne est 5-10%." },
    { id: "i_team", pillar: "i", question: "Qui gère votre marque au quotidien ?", type: "select", options: ["Personne de dédié", "Le fondateur/DG", "Un responsable marketing", "Une équipe dédiée"], required: true, tooltip: "Qui décide du contenu publié, des visuels utilisés, des messages envoyés ? Si c'est vous-même en plus de tout le reste, choisissez 'Le fondateur/DG'." },
  ],
  s: [
    { id: "s_guidelines", pillar: "s", question: "Avez-vous des guidelines de marque documentées ?", type: "select", options: ["Non", "Basiques (logo, couleurs)", "Complètes (voix, ton, visuels)", "Bible de marque exhaustive"], required: true, tooltip: "Les guidelines = un document qui explique comment utiliser votre marque : couleurs exactes, taille du logo, ton de voix... 'Bible de marque' = tout est documenté en détail pour que n'importe qui puisse communiquer à votre place." },
    { id: "s_coherence", pillar: "s", question: "Sur une échelle de 1-10, à quel point votre communication est-elle cohérente sur tous les canaux ?", type: "scale", required: true, tooltip: "Canaux = site web, réseaux sociaux, email, packaging, boutique... 1 = chaque canal dit quelque chose de différent. 10 = le même message, le même visuel, la même expérience partout." },
    { id: "s_ambition", pillar: "s", question: "Où voulez-vous que votre marque soit dans 3 ans ?", type: "text", required: true, tooltip: "Soyez concret : nouveau marché géographique ? Doubler le CA ? Devenir leader du secteur ? Lancer une nouvelle gamme ? C'est votre objectif stratégique à moyen terme." },
  ],
};

// ========================================================================
// Festival-specific E questions (injected when brandNature === FESTIVAL_IP)
// ========================================================================
const FESTIVAL_E_QUESTIONS: IntakeQuestion[] = [
  { id: "e_festival_concept", pillar: "e", question: "Quel est le concept fondateur de votre festival ? Qu'est-ce qui le rend unique ?", type: "text", required: true, tooltip: "Le concept fondateur, c'est la raison d'être de votre festival au-delà du divertissement. Exemple : 'Célébrer la musique africaine contemporaine dans des lieux patrimoniaux'. C'est ce qui vous rend irremplaçable." },
  { id: "e_festival_frequency", pillar: "e", question: "Quelle est la fréquence de votre festival ?", type: "select", options: ["ANNUEL::Annuel (une fois par an)", "SEMESTRIEL::Semestriel (deux fois par an)", "TRIMESTRIEL::Trimestriel", "MENSUEL::Mensuel", "PONCTUEL::Ponctuel / Première édition"], required: true, tooltip: "La fréquence détermine le rythme de la relation avec votre audience. Annuel crée de l'attente, mensuel crée de l'habitude." },
  { id: "e_festival_editions", pillar: "e", question: "Combien d'éditions avez-vous déjà réalisées ?", type: "select", options: ["0::Première édition (pas encore lancé)", "1-3::1 à 3 éditions", "4-10::4 à 10 éditions", "10+::Plus de 10 éditions"], required: true, tooltip: "Le nombre d'éditions indique la maturité de votre festival. Première édition = tout à construire. 10+ éditions = patrimoine à capitaliser." },
  { id: "e_festival_rituals", pillar: "e", question: "Quels rituels signature voulez-vous créer pour votre festival ? (moments récurrents que les festivaliers attendent)", type: "text", required: true, tooltip: "Les rituels sont les moments que les festivaliers racontent. Exemples : un cri de guerre collectif, une cérémonie d'ouverture unique, un objet collector par édition, un moment secret réservé aux VIP..." },
  { id: "e_festival_parcours", pillar: "e", question: "Décrivez le parcours visiteur idéal de votre festival de A à Z — de l'arrivée au départ.", type: "text", required: true, tooltip: "Pensez expérience totale : comment arrivent-ils ? Que voient-ils en premier ? Quels espaces traversent-ils ? Quels temps forts ponctuent la journée ? Comment repartent-ils ? Le diable est dans le détail." },
];

export function getBusinessContextQuestions(): IntakeQuestion[] {
  return QUESTION_BANK.biz ?? [];
}

export async function getAdaptiveQuestions(
  pillar: string,
  existingResponses: Record<string, unknown>,
  businessContext?: { sector?: string; positioning?: string; brandNature?: string }
): Promise<IntakeQuestion[]> {
  const questions = QUESTION_BANK[pillar];
  if (!questions) return [];

  // Inject festival-specific E questions when brandNature is FESTIVAL_IP
  const conditionalQuestions = (pillar === "e" && businessContext?.brandNature === "FESTIVAL_IP")
    ? [...questions, ...FESTIVAL_E_QUESTIONS]
    : questions;

  // Try to generate AI follow-up questions
  try {
    const aiQuestions = await generateAiFollowUps(
      pillar,
      existingResponses,
      businessContext
    );
    return [...conditionalQuestions, ...aiQuestions];
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn("[AI fallback] question-bank:", reason);
    return conditionalQuestions;
  }
}

/**
 * Ask Claude to generate 1-2 targeted follow-up questions in French
 * based on the user's existing responses and business context.
 * Wrapped with an 8-second timeout.
 */
async function generateAiFollowUps(
  pillar: string,
  existingResponses: Record<string, unknown>,
  businessContext?: { sector?: string; positioning?: string }
): Promise<IntakeQuestion[]> {
  // Short-circuit when no LLM provider is configured (CI smoke runs, fresh
  // dev clones without env). Avoids 24s of retry timeouts before falling
  // back to the static bank — which is the desired outcome anyway.
  if (
    !process.env.ANTHROPIC_API_KEY &&
    !process.env.OPENAI_API_KEY &&
    !process.env.OLLAMA_BASE_URL
  ) {
    return [];
  }

  // Routes through the LLM Gateway at tier "C" — adaptive intake follow-ups
  // are throwaway questions and should never burn Sonnet/Opus tokens. The
  // Gateway prefers Ollama (free local) for tier C, falling back to Haiku.
  // The previous direct Anthropic SDK call bypassed cost tracking, the
  // multi-vendor fallback, AND the budget governance — three regressions
  // hidden behind a single `new Anthropic()` line.
  try {
    const pillarName = PILLAR_NAMES[pillar] ?? pillar;
    const responseSummary = Object.entries(existingResponses)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("\n");

    // LOT 1e — entrées non fiables neutralisées (anti-injection) : secteur +
    // positionnement déclarés par le dirigeant, placés inline dans une phrase.
    const contextInfo = businessContext
      ? `Secteur d'activité: ${sanitizeInline(businessContext.sector ?? "non spécifié", { max: 80 })}\nPositionnement: ${sanitizeInline(businessContext.positioning ?? "non spécifié", { max: 80 })}`
      : "Contexte business non disponible.";

    const { text: rawText } = await callLLM({
      caller: "quick-intake:question-bank",
      purpose: "intake-followup",
      maxOutputTokens: 512,
      system: `${UNTRUSTED_NOTICE}\n\nTu es Mestor, le guide stratégique de La Fusée. Réponses brèves, conversationnelles, jamais académiques.`,
      prompt: `Tu accompagnes un dirigeant dans un diagnostic de marque en mode interview conversationnelle.

Ton style:
- Tutoiement chaleureux mais professionnel (comme un mentor bienveillant)
- Questions courtes et directes, pas académiques
- Ton qui pousse à la réflexion ("Et si je te demandais...", "Imaginons que...")
- Toujours lié au business concret, pas à la théorie

On évalue le pilier "${pillarName}" (clé: "${pillar}").

Contexte business:
${contextInfo}

Réponses déjà données:
${responseSummary ? wrapUntrusted("Réponses déjà données", responseSummary, { max: 6000 }) : "Aucune réponse encore."}

Génère exactement 1 ou 2 questions de suivi en français qui:
1. Creusent les lacunes ou zones vagues dans les réponses existantes
2. Utilisent un ton conversationnel de mentor (pas de questionnaire administratif)
3. Poussent à donner des exemples concrets ou des chiffres

Réponds UNIQUEMENT avec un tableau JSON valide. Format:
[{"id":"${pillar}_ai_1","question":"...","type":"text","pillar":"${pillar}","required":false}]`,
    });

    // Extract + valide via Zod (remplace le parsing manuel typeof). Bloc sous
    // try/catch : tout échec retombe sur la banque statique (best-effort).
    const jsonMatch = rawText.trim().match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error(`No JSON array found in AI response: "${rawText.slice(0, 100)}"`);
    }
    const AiQuestionSchema = z.object({ id: z.string().min(1), question: z.string().min(1) });
    const parsed = z.array(AiQuestionSchema).safeParse(JSON.parse(jsonMatch[0]));
    if (!parsed.success) {
      throw new Error(`AI questions failed validation: ${parsed.error.issues[0]?.message ?? "shape"}`);
    }

    // pillar/type/required viennent de nous (pas du LLM) → on ne valide que id+question.
    return parsed.data.slice(0, 2).map((q) => ({
      id: q.id,
      question: q.question,
      type: "text" as const,
      pillar,
      required: false,
    }));
  } catch (err) {
    // Tier C is best-effort — if the embedded model is unreachable, we
    // simply skip the AI follow-ups and return the static bank.
    console.warn(
      "[question-bank] tier-C follow-up generation failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

export function getAllQuestions(): Record<string, IntakeQuestion[]> {
  return QUESTION_BANK;
}
