/**
 * BLISS by Wakanda — Pillar Content Data (V, E, R, T, I, S)
 * Score: 25/25 per pillar = ICONE 200/200
 */

import type {
  PillarVContent,
  PillarEContent,
  PillarRContent,
  PillarTContent,
  PillarIContent,
  PillarSContent,
} from "@/lib/types/pillar-schemas";

// ============================================================================
// PILIER V — VALEUR (Offre & Pricing)
// ============================================================================

export const blissPillarV: PillarVContent = {
  // --- Fondamentaux economiques ---
  businessModel: "DIRECT_TO_CONSUMER",
  economicModels: ["VENTE_DIRECTE", "ABONNEMENT_APP", "RETAIL_SELECTIVE"],
  positioningArchetype: "PREMIUM",
  salesChannel: "HYBRID",
  freeLayer: {
    whatIsFree: "Diagnostic de peau via BLISS App (analyse IA des besoins cutanes, recommandation de routine personnalisee)",
    whatIsPaid: "Produits physiques + abonnement App Premium (suivi UV, rappels routine, coaching beaute)",
    conversionLever: "Le diagnostic gratuit revele les besoins exacts et oriente vers les produits adaptes avec 15% de remise premiere commande",
  },

  // --- Transition D->V ---
  pricingJustification:
    "Les prix BLISS se situent 30-40% au-dessus du marche cosmetique local mais restent accessibles pour la cible CSP+ urbaine (15 000-28 000 XAF par produit). " +
    "Ce positionnement se justifie par : (1) l'extraction vibranium micro-particules, procede brevete exclusif, (2) la formulation en laboratoire wakandais certifie ISO 22716, " +
    "(3) l'heritage ancestral des recettes royales Udaku transmises sur 7 generations, (4) le packaging eco-luxe en aluminium recycle grave au laser. " +
    "Le Coffret Decouverte a 12 000 XAF constitue le point d'entree strategique — il represente 45% des premieres commandes et convertit 68% des acheteuses en clientes recurrentes.",

  personaSegmentMap: [
    {
      personaName: "Amina la Radieuse",
      productNames: ["Serum Vibranium Glow", "Creme Eternelle", "BLISS App Premium"],
      devotionLevel: "AMBASSADEUR",
      revenueContributionPct: 35,
    },
    {
      personaName: "Fatou l'Exploratrice",
      productNames: ["Coffret Decouverte", "Masque Ancestral", "BLISS App"],
      devotionLevel: "PARTICIPANT",
      revenueContributionPct: 25,
    },
    {
      personaName: "Nana la Traditionnelle",
      productNames: ["Huile Royale", "Creme Eternelle", "Masque Ancestral"],
      devotionLevel: "ENGAGE",
      revenueContributionPct: 20,
    },
    {
      personaName: "Zara la Connectee",
      productNames: ["Serum Vibranium Glow", "BLISS App Premium", "Coffret Decouverte"],
      devotionLevel: "INTERESSE",
      revenueContributionPct: 15,
    },
    {
      personaName: "Mama Elegance",
      productNames: ["Huile Royale", "Creme Eternelle"],
      devotionLevel: "EVANGELISTE",
      revenueContributionPct: 5,
    },
  ],

  // --- Catalogue produits (6 produits) ---
  produitsCatalogue: [
    {
      id: "BLISS-SVG-001",
      nom: "Serum Vibranium Glow",
      categorie: "PRODUIT_PHYSIQUE",
      prix: 15000,
      cout: 4200,
      margeUnitaire: 10800,
      gainClientConcret: "Eclat visible en 14 jours — teint unifie, pores resseres, texture lissee. Reduction de 40% des taches pigmentaires mesuree par dermatoscope.",
      gainClientAbstrait: "Confiance en soi retrouvee : se regarder dans le miroir avec fierte, sentir que sa peau raconte une histoire de noblesse et de soin ancestral.",
      gainMarqueConcret: "Produit hero (38% du CA) avec marge unitaire de 72%. Genere le plus de contenu UGC (420 posts/mois).",
      gainMarqueAbstrait: "Incarne la promesse technologique vibranium — chaque flacon est une preuve vivante que tradition et innovation coexistent.",
      coutClientConcret: "15 000 XAF par flacon de 30ml (duree 6-8 semaines). Necessite application bi-quotidienne rigoureuse.",
      coutClientAbstrait: "Engagement dans une routine — quitter le confort des produits basiques pour adopter un rituel exigeant.",
      coutMarqueConcret: 4200,
      coutMarqueAbstrait: "Risque de surpromesse si les resultats ne sont pas visibles en 14 jours sur certains types de peau.",
      lienPromesse: "Incarne directement la promesse maitre : la beaute vibranium accessible. Le serum est la preuve tangible que la technologie wakandaise sublime la peau africaine.",
      segmentCible: "Amina la Radieuse",
      phaseLifecycle: "GROWTH",
      leviersPsychologiques: ["Preuve sociale (4.8/5 sur 1200 avis)", "Rarete percue (edition limitee trimestrielle)", "Autorite scientifique (etude clinique 120 femmes)"],
      lf8Trigger: ["APPROBATION_SOCIALE", "SUPERIORITE_STATUT"],
      maslowMapping: "ESTEEM",
      scoreEmotionnelADVE: 92,
      canalDistribution: ["APP", "INSTAGRAM", "EVENT"],
      disponibilite: "ALWAYS",
      skuRef: "BLISS-SVG-30ML",
    },
    {
      id: "BLISS-CE-002",
      nom: "Creme Eternelle",
      categorie: "PRODUIT_PHYSIQUE",
      prix: 22000,
      cout: 6800,
      margeUnitaire: 15200,
      gainClientConcret: "Hydratation profonde 48h cliniquement prouvee. Reduction de 55% des rides fines en 30 jours. Protection UV naturelle SPF 15 integree.",
      gainClientAbstrait: "Sentiment d'eternite — chaque application est un acte de preservation de sa jeunesse, un defi lance au temps qui passe.",
      gainMarqueConcret: "Deuxieme contributeur CA (28%) avec la marge la plus elevee (69%). Taux de reachat de 78% a 90 jours.",
      gainMarqueAbstrait: "Ancre la dimension ancestrale et intemporelle de la marque — le nom 'Eternelle' est devenu synonyme de BLISS dans le langage courant.",
      coutClientConcret: "22 000 XAF pour 50ml (duree 2-3 mois). Conservation au frais recommandee.",
      coutClientAbstrait: "Prix premium qui impose un choix : renoncer a d'autres soins pour investir dans la qualite.",
      coutMarqueConcret: 6800,
      coutMarqueAbstrait: "Attente elevee de qualite constante — tout lot inferieur detruirait la confiance accumulee.",
      lienPromesse: "Materialise la dimension 'eternelle' de la beaute wakandaise — le soin qui traverse les generations, formule par la lignee Udaku.",
      segmentCible: "Nana la Traditionnelle",
      phaseLifecycle: "MATURITY",
      leviersPsychologiques: ["Heritage et tradition (recette de 7 generations)", "Peur de la perte (anti-age)", "Engagement consistance (routine quotidienne)"],
      lf8Trigger: ["SURVIE_SANTE", "APPROBATION_SOCIALE"],
      maslowMapping: "SAFETY",
      scoreEmotionnelADVE: 88,
      canalDistribution: ["APP", "PACKAGING", "EVENT"],
      disponibilite: "ALWAYS",
      skuRef: "BLISS-CE-50ML",
    },
    {
      id: "BLISS-MA-003",
      nom: "Masque Ancestral",
      categorie: "PRODUIT_PHYSIQUE",
      prix: 18000,
      cout: 5500,
      margeUnitaire: 12500,
      gainClientConcret: "Detoxification profonde en 20 minutes. Elimination de 80% des impuretes mesuree par analyse sebometrique. Eclat immediat post-application.",
      gainClientAbstrait: "Rituel sacre hebdomadaire — un moment de connexion avec les ancetres, une pause dans le chaos du quotidien pour se retrouver.",
      gainMarqueConcret: "Troisieme produit en volume (18% du CA). Taux de partage social le plus eleve (82% des utilisatrices postent leur 'masque selfie').",
      gainMarqueAbstrait: "Renforce la dimension rituelle et sacree de BLISS — transforme un soin en ceremonie.",
      coutClientConcret: "18 000 XAF pour 6 applications (3 000 XAF/application). Temps d'application 20-25 minutes.",
      coutClientAbstrait: "Exige du temps et de la discipline — incompatible avec un mode de vie presse si non ritualise.",
      coutMarqueConcret: 5500,
      coutMarqueAbstrait: "Fragilite de l'experience rituelle — si banalisee par la concurrence, perd son aura sacree.",
      lienPromesse: "Pont entre heritage ancestral et soin moderne — le masque est litteralement compose d'argile wakandaise et de vibranium purife.",
      segmentCible: "Fatou l'Exploratrice",
      phaseLifecycle: "GROWTH",
      leviersPsychologiques: ["Rituel et appartenance", "Curiosite et decouverte", "FOMO (editions saisonnieres)"],
      lf8Trigger: ["CONDITIONS_CONFORT", "APPROBATION_SOCIALE"],
      maslowMapping: "BELONGING",
      scoreEmotionnelADVE: 90,
      canalDistribution: ["APP", "INSTAGRAM", "TIKTOK"],
      disponibilite: "ALWAYS",
      skuRef: "BLISS-MA-6APP",
    },
    {
      id: "BLISS-HR-004",
      nom: "Huile Royale",
      categorie: "PRODUIT_PHYSIQUE",
      prix: 28000,
      cout: 9200,
      margeUnitaire: 18800,
      gainClientConcret: "Nutrition intense corps et cheveux. Absorption en 90 secondes sans film gras. Parfum signature aux notes de bois de santal wakandais et jasmin de nuit.",
      gainClientAbstrait: "Se sentir reine — l'huile est le geste ultime de luxe quotidien, un couronnement personnel chaque matin.",
      gainMarqueConcret: "Produit a la marge la plus haute (67%). Represente 12% du CA mais 19% de la marge brute. Forte elasticite-prix (demande stable malgre prix eleve).",
      gainMarqueAbstrait: "Ancre le territoire 'royaute' — le nom, le parfum et le rituel d'application creent un univers aspirationnel inegalable.",
      coutClientConcret: "28 000 XAF pour 100ml (duree 2-4 mois selon usage). Le produit le plus cher du catalogue.",
      coutClientAbstrait: "Franchir le seuil psychologique du 'luxe pour soi' — se sentir legitime a s'offrir un produit a ce prix.",
      coutMarqueConcret: 9200,
      coutMarqueAbstrait: "Elitisme potentiel — risque d'alienation de la base si le produit est percu comme inaccessible.",
      lienPromesse: "Le sommet de la pyramide BLISS — pour celles qui ont integre la philosophie et veulent l'experience complete. Incarne la royaute wakandaise au quotidien.",
      segmentCible: "Mama Elegance",
      phaseLifecycle: "GROWTH",
      leviersPsychologiques: ["Statut et exclusivite", "Recompense personnelle (\"je le merite\")", "Parfum signature comme identifiant social"],
      lf8Trigger: ["SUPERIORITE_STATUT", "CONDITIONS_CONFORT"],
      maslowMapping: "SELF_ACTUALIZATION",
      scoreEmotionnelADVE: 95,
      canalDistribution: ["APP", "EVENT", "PACKAGING"],
      disponibilite: "ALWAYS",
      skuRef: "BLISS-HR-100ML",
    },
    {
      id: "BLISS-CD-005",
      nom: "Coffret Decouverte",
      categorie: "PRODUIT_PHYSIQUE",
      prix: 12000,
      cout: 4800,
      margeUnitaire: 7200,
      gainClientConcret: "4 mini-formats (Serum 10ml + Creme 15ml + Masque 2 applications + Huile 15ml) pour tester toute la gamme. Valeur equivalente 22 000 XAF — economie de 45%.",
      gainClientAbstrait: "Decouvrir sans risque — lever toutes les barrieres a l'entree pour une premiere experience BLISS complete et seduisante.",
      gainMarqueConcret: "Premier produit en volume d'acquisition (45% des premières commandes). Cout d'acquisition client effectif de 3 500 XAF grace au coffret. Taux de conversion vers produit plein format : 68%.",
      gainMarqueAbstrait: "Porte d'entree du mouvement BLISS — chaque coffret est une invitation a rejoindre la communaute, pas juste un echantillon.",
      coutClientConcret: "12 000 XAF. Quantites limitees (10ml serum = ~2 semaines seulement).",
      coutClientAbstrait: "Frustration possible si les minis s'epuisent vite — risque de deception si l'experience est trop courte pour juger.",
      coutMarqueConcret: 4800,
      coutMarqueAbstrait: "Cannibalisation potentielle des formats pleins si les clientes se contentent de racheter des coffrets.",
      lienPromesse: "Le coffret est l'initiation — la premiere etape du voyage BLISS, concu pour que chaque femme puisse experimenter la promesse sans engagement financier lourd.",
      segmentCible: "Zara la Connectee",
      phaseLifecycle: "GROWTH",
      leviersPsychologiques: ["Prix d'entree bas (effet leurre)", "Curiosite et exploration", "Valeur percue superieure (45% d'economie affichee)"],
      lf8Trigger: ["NOURRITURE_PLAISIR", "CONDITIONS_CONFORT"],
      maslowMapping: "PHYSIOLOGICAL",
      scoreEmotionnelADVE: 82,
      canalDistribution: ["APP", "INSTAGRAM", "OOH"],
      disponibilite: "ALWAYS",
      skuRef: "BLISS-CD-MINI4",
    },
    {
      id: "BLISS-APP-006",
      nom: "BLISS App",
      categorie: "ABONNEMENT",
      prix: 2500,
      cout: 800,
      margeUnitaire: 1700,
      gainClientConcret: "Diagnostic peau IA gratuit, suivi UV temps reel, rappels routine personnalises, coaching beaute hebdomadaire, programme fidelite avec points convertibles en produits.",
      gainClientAbstrait: "Avoir une conseillere beaute personnelle dans sa poche — se sentir accompagnee et guidee dans son parcours beaute au quotidien.",
      gainMarqueConcret: "Canal de retention principal (NPS 72). 8 200 utilisatrices actives mensuelles dont 1 850 abonnees premium (22.5% conversion). Revenue recurrente de 4 625 000 XAF/mois.",
      gainMarqueAbstrait: "Cree un lien quotidien avec la marque — chaque notification est un micro-touchpoint qui renforce la devotion sans effort commercial.",
      coutClientConcret: "Gratuit (diagnostic + fonctions de base) ou 2 500 XAF/mois pour le premium. Necessite un smartphone avec camera.",
      coutClientAbstrait: "Partager ses donnees biometriques (photo peau) — confiance requise dans la marque pour franchir cette etape.",
      coutMarqueConcret: 800,
      coutMarqueAbstrait: "Dependance technologique — tout bug ou indisponibilite de l'app fragilise la relation de confiance construite.",
      lienPromesse: "L'app est le compagnon quotidien de la beaute vibranium — elle ne vend pas, elle guide. Chaque interaction renforce le lien entre la femme et sa routine BLISS.",
      segmentCible: "Zara la Connectee",
      phaseLifecycle: "LAUNCH",
      leviersPsychologiques: ["Gratuite percue (freemium)", "Gamification (points, niveaux)", "Personnalisation IA (effet miroir)"],
      lf8Trigger: ["APPROBATION_SOCIALE", "SURVIE_SANTE"],
      maslowMapping: "BELONGING",
      scoreEmotionnelADVE: 85,
      canalDistribution: ["APP"],
      disponibilite: "ALWAYS",
      skuRef: "BLISS-APP-PREM",
    },
  ],

  // --- Product Ladder (3 tiers) ---
  productLadder: [
    {
      tier: "Decouverte",
      prix: 12000,
      produitIds: ["BLISS-CD-005", "BLISS-APP-006"],
      cible: "Zara la Connectee",
      description: "Point d'entree a faible risque : coffret mini-formats + app gratuite. Objectif : faire vivre la premiere experience BLISS complete pour convertir en cliente reguliere sous 30 jours.",
      position: 1,
    },
    {
      tier: "Rituel",
      prix: 18000,
      produitIds: ["BLISS-SVG-001", "BLISS-CE-002", "BLISS-MA-003"],
      cible: "Amina la Radieuse",
      description: "Coeur de gamme : les 3 produits de la routine quotidienne/hebdomadaire. La cliente construit son rituel personnalise selon son type de peau et ses objectifs.",
      position: 2,
    },
    {
      tier: "Prestige",
      prix: 28000,
      produitIds: ["BLISS-HR-004"],
      cible: "Mama Elegance",
      description: "Luxe ultime : l'Huile Royale est reservee aux initiees qui ont integre la philosophie BLISS. Packaging premium, parfum signature, experience sensorielle complete.",
      position: 3,
    },
  ],

  // --- Unit Economics ---
  unitEconomics: {
    cac: 3500,
    ltv: 95000,
    ltvCacRatio: 27.1,
    pointMort: "Atteint au 3eme mois d'activite (seuil de 850 clientes actives)",
    margeNette: 62,
    roiEstime: 85,
    paybackPeriod: 2,
    budgetCom: 2000000,
    caVise: 48000000,
  },

  // --- Promesse de valeur ---
  promesseDeValeur:
    "BLISS promet a chaque femme africaine un acces a la beaute premium vibranium — des soins dont l'efficacite est prouvee cliniquement, " +
    "ancres dans 7 generations de savoir ancestral wakandais, a un prix qui respecte son pouvoir d'achat. " +
    "Pas de promesses vides : chaque produit est teste sur 120 femmes, chaque ingredient est tracable, chaque resultat est mesurable.",

  // --- Quadrants valeur/cout brand-level ---
  valeurMarqueTangible: [
    "Marge brute moyenne de 68% sur le catalogue",
    "Revenue recurrente app premium : 4.6M XAF/mois",
    "Taux de reachat 72% a 6 mois",
  ],
  valeurMarqueIntangible: [
    "Capital marque estime a 180M XAF (notoriete spontanee 34% Douala/Yaounde)",
    "Communaute engagee de 12 400 membres actifs",
    "Perception d'heritage royal et de legitimite scientifique",
  ],
  valeurClientTangible: [
    "Resultats visibles en 14 jours (mesures par dermatoscope)",
    "Economies de 45% via le Coffret Decouverte",
    "Diagnostic peau gratuit via l'app (valeur equivalente 5 000 XAF en institut)",
  ],
  valeurClientIntangible: [
    "Fierte identitaire : utiliser un produit africain premium",
    "Appartenance a une communaute de femmes qui s'assument",
    "Confiance en soi et rayonnement social",
  ],
  coutMarqueTangible: [
    "Cout de production moyen de 5 200 XAF par unite",
    "Investissement R&D annuel de 8M XAF (extraction vibranium)",
    "Infrastructure app : 2.4M XAF/an (serveurs + maintenance)",
  ],
  coutMarqueIntangible: [
    "Risque reputationnel en cas de lot defectueux",
    "Dependance a la chaine d'approvisionnement vibranium",
    "Pression de maintenir l'innovation constante",
  ],
  coutClientTangible: [
    "Budget mensuel moyen de 18 500 XAF pour une routine complete",
    "Temps d'application quotidien de 8-12 minutes",
    "Deplacement en boutique ou frais de livraison (1 500 XAF)",
  ],
  coutClientIntangible: [
    "Abandon des habitudes de soin existantes",
    "Patience requise (14 jours minimum pour voir les resultats)",
    "Pression sociale potentielle ('tu depenses trop en cosmetiques')",
  ],

  // --- MVP ---
  mvp: {
    exists: true,
    stage: "PRODUCT",
    description: "Gamme complete de 5 produits physiques + application mobile en production depuis janvier 2026. Le Serum Vibranium Glow a ete le premier MVP (mars 2025), suivi du deploiement progressif de la gamme.",
    features: [
      "5 SKUs physiques en production",
      "App mobile iOS/Android avec diagnostic IA",
      "Plateforme e-commerce integree a l'app",
      "Programme fidelite a points",
      "3 points de vente partenaires a Douala",
    ],
    launchDate: "2025-03-15",
    userCount: 8200,
    feedbackSummary: "NPS de 72. Points forts : efficacite produit, packaging premium, experience app. Points d'amelioration : delais livraison hors Douala, gamme encore limitee (pas de maquillage).",
  },

  // --- Propriete intellectuelle ---
  proprieteIntellectuelle: {
    brevets: [
      {
        titre: "Procede d'extraction de micro-particules de vibranium pour usage cosmetique",
        statut: "ACCORDE",
        numero: "WK-PAT-2024-0892",
      },
      {
        titre: "Formulation stabilisante vibranium-acide hyaluronique pour serums dermatologiques",
        statut: "EN_COURS",
        numero: "WK-PAT-2025-0156",
      },
    ],
    secretsCommerciaux: [
      "Concentration optimale vibranium par formule (ratio proprietary)",
      "Procede de purification argile wakandaise pour le Masque Ancestral",
      "Algorithme IA de diagnostic cutane (entrainee sur 45 000 photos de peaux africaines)",
    ],
    technologieProprietary: "Technologie VibraniumSkin : micro-encapsulation de particules de vibranium dans des liposomes bio-compatibles permettant une penetration epidermique controlee. Exclusive BLISS.",
    barrieresEntree: [
      "Acces exclusif aux gisements vibranium wakandais (concession miniere familiale Udaku)",
      "Brevet d'extraction accorde — 18 ans de protection",
      "Base de donnees IA de 45 000 photos dermatologiques africaines (3 ans de collecte)",
      "Reseau de 3 dermatologues consultants sous contrat d'exclusivite",
    ],
    licences: [
      { nom: "ISO 22716 Bonnes Pratiques de Fabrication Cosmetique", type: "Certification" },
      { nom: "Licence d'exploitation miniere vibranium (Prefecture de Birnin Zana)", type: "Exclusive" },
    ],
    protectionScore: 8,
  },
};

// ============================================================================
// PILIER E — ENGAGEMENT
// ============================================================================

export const blissPillarE: PillarEContent = {
  // --- Fondamentaux engagement ---
  promesseExperience:
    "Chaque interaction avec BLISS doit procurer un sentiment de royaute bienveillante : " +
    "la cliente se sent vue, respectee, guidee — jamais pressee, jamais jugee. " +
    "Qu'elle ouvre l'app, entre en boutique ou decouvre un contenu, elle doit ressentir qu'elle appartient a quelque chose de plus grand qu'un simple achat cosmetique.",
  primaryChannel: "APP",

  // --- Superfan portrait ---
  superfanPortrait: {
    personaRef: "Amina la Radieuse",
    motivations: [
      "Fierte identitaire — promouvoir activement la beaute africaine premium",
      "Resultats tangibles — sa peau a reellement change et elle veut partager",
      "Appartenance — fait partie du cercle des 'Reines BLISS' (top 2% des clientes)",
      "Mission — croit sincerement que chaque femme africaine merite un soin de qualite",
    ],
    barriers: [
      "Fatigue de la repetition si le contenu stagne (besoin de nouveaute constante)",
      "Deception si un lot ne tient pas la promesse de qualite habituelle",
      "Sentiment d'instrumentalisation si on la sollicite trop pour promouvoir la marque",
    ],
    profile:
      "Femme de 28-38 ans, CSP+, urbaine (Douala/Yaounde), active sur Instagram et TikTok. " +
      "Elle poste spontanement ses routines BLISS (2-3 fois/mois), repond aux questions des curieuses en DM, " +
      "et participe a chaque evenement physique. Elle depense 35 000-50 000 XAF/mois en produits BLISS " +
      "et a converti au moins 8 amies. Son NPS individuel est de 10/10. " +
      "Elle considere BLISS comme une extension de son identite, pas comme une simple marque.",
  },

  // --- Transitions V->E ---
  productExperienceMap: [
    {
      productRef: "Serum Vibranium Glow",
      experienceDescription: "Ritual matinal de 3 minutes : 3 gouttes, massage ascendant, moment de pleine conscience. L'app envoie un rappel chaque matin avec un message inspirant different.",
      touchpointRefs: ["App notification matinale", "Tutorial video Instagram"],
      emotionalOutcome: "Energie et determination pour la journee — 'ma peau brille, je brille'",
    },
    {
      productRef: "Masque Ancestral",
      experienceDescription: "Rituel hebdomadaire du dimanche soir : 20 minutes de pause, musique BLISS Playlist sur Spotify, photo avant/apres partagee dans le groupe WhatsApp communautaire.",
      touchpointRefs: ["WhatsApp Community", "Spotify Playlist"],
      emotionalOutcome: "Regeneration et connexion avec soi — 'je me suis accordee ce moment sacre'",
    },
    {
      productRef: "Coffret Decouverte",
      experienceDescription: "Unboxing experience : packaging dore avec message personnalise, guide de routine imprime, QR code vers tutorial video d'initiation.",
      touchpointRefs: ["Packaging premium", "QR code tutorial"],
      emotionalOutcome: "Excitation et curiosite — 'je decouvre un monde nouveau'",
    },
  ],
  ladderProductAlignment: [
    {
      devotionLevel: "SPECTATEUR",
      productTierRef: "Decouverte",
      entryAction: "Diagnostic gratuit via BLISS App (2 minutes, 0 XAF)",
      upgradeAction: "Recevoir une offre personnalisee -15% sur le Coffret Decouverte apres le diagnostic",
    },
    {
      devotionLevel: "INTERESSE",
      productTierRef: "Decouverte",
      entryAction: "Achat du Coffret Decouverte (12 000 XAF)",
      upgradeAction: "Terminer le coffret et constater les premiers resultats — recevoir une recommandation de routine complete",
    },
    {
      devotionLevel: "PARTICIPANT",
      productTierRef: "Rituel",
      entryAction: "Premier achat d'un produit plein format (Serum ou Creme)",
      upgradeAction: "Completer sa routine avec 2+ produits et s'abonner a l'app premium",
    },
    {
      devotionLevel: "ENGAGE",
      productTierRef: "Rituel",
      entryAction: "Routine complete 3 produits + app premium active",
      upgradeAction: "Participer a un evenement physique BLISS et rejoindre le groupe WhatsApp VIP",
    },
    {
      devotionLevel: "AMBASSADEUR",
      productTierRef: "Prestige",
      entryAction: "Partager activement son experience (3+ posts/mois) + parrainer 3 amies",
      upgradeAction: "Etre invitee au programme 'Reines BLISS' avec acces anticipe aux nouveautes",
    },
    {
      devotionLevel: "EVANGELISTE",
      productTierRef: "Prestige",
      entryAction: "Co-creer du contenu avec la marque + 10+ parrainages actifs",
      upgradeAction: "Devenir ambassadrice officielle avec contrat et remuneration",
    },
  ],
  channelTouchpointMap: [
    { salesChannel: "DIRECT", touchpointRefs: ["App BLISS", "Site e-commerce", "WhatsApp Business"] },
    { salesChannel: "INTERMEDIATED", touchpointRefs: ["Boutiques partenaires Douala", "Pharmacies selectionnees"] },
    { salesChannel: "HYBRID", touchpointRefs: ["Events physiques", "Pop-up stores", "Instagram Shop"] },
  ],

  // --- Conversion mechanics ---
  conversionTriggers: [
    { fromLevel: "SPECTATEUR", toLevel: "INTERESSE", trigger: "Resultat du diagnostic IA revelant un besoin cutane precis (ex: 'votre peau perd 23% d'hydratation la nuit')", channel: "APP" },
    { fromLevel: "INTERESSE", toLevel: "PARTICIPANT", trigger: "Premiere experience produit positive — resultats visibles en 14 jours confirmes par photo avant/apres dans l'app", channel: "APP" },
    { fromLevel: "PARTICIPANT", toLevel: "ENGAGE", trigger: "Participation a un evenement physique BLISS (atelier beaute, masterclass) qui cree un lien humain avec la communaute", channel: "EVENT" },
    { fromLevel: "ENGAGE", toLevel: "AMBASSADEUR", trigger: "Recevoir un compliment spontane sur sa peau d'une personne exterieure a la communaute — validation sociale externe", channel: "INSTAGRAM" },
    { fromLevel: "AMBASSADEUR", toLevel: "EVANGELISTE", trigger: "Etre reconnue publiquement par la marque (repost, invitation VIP, co-creation) — passage du statut de cliente a celui de partenaire", channel: "EVENT" },
  ],
  barriersEngagement: [
    { level: "SPECTATEUR", barrier: "Mefiance envers les marques cosmetiques africaines ('c'est pas aussi bien que L'Oreal')", mitigation: "Preuves cliniques + temoignages video de dermatologues locaux" },
    { level: "INTERESSE", barrier: "Prix percu comme eleve pour un premier achat (15 000 XAF = risque)", mitigation: "Coffret Decouverte a 12 000 XAF + garantie satisfait ou rembourse 30 jours" },
    { level: "PARTICIPANT", barrier: "Manque de temps pour maintenir une routine quotidienne", mitigation: "App avec rappels intelligents + routines express 3 minutes" },
    { level: "ENGAGE", barrier: "Isolement — pas d'amies dans la communaute BLISS", mitigation: "Evenements de quartier mensuels + systeme de parrainage avec binome" },
    { level: "AMBASSADEUR", barrier: "Fatigue du contenu repete + sentiment d'etre 'utilisee' par la marque", mitigation: "Programme de co-creation avec vraie remuneration + acces exclusif a la R&D" },
  ],

  // --- Touchpoints (8) ---
  touchpoints: [
    { canal: "BLISS App — Notification matinale", type: "DIGITAL", channelRef: "APP", role: "Rappel routine + message inspirant quotidien", aarrStage: "RETENTION", devotionLevel: ["PARTICIPANT", "ENGAGE", "AMBASSADEUR"], priority: 1, frequency: "DAILY" },
    { canal: "Instagram — Contenu beaute", type: "DIGITAL", channelRef: "INSTAGRAM", role: "Inspiration visuelle, tutoriels, UGC communautaire", aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR", "INTERESSE"], priority: 2, frequency: "DAILY" },
    { canal: "TikTok — Viralite", type: "DIGITAL", channelRef: "TIKTOK", role: "Reach massif via challenges beaute et transformations avant/apres", aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR"], priority: 3, frequency: "WEEKLY" },
    { canal: "WhatsApp Community — Groupe VIP", type: "DIGITAL", channelRef: "SMS", role: "Echanges entre membres, conseils peer-to-peer, avant-premieres", aarrStage: "RETENTION", devotionLevel: ["ENGAGE", "AMBASSADEUR", "EVANGELISTE"], priority: 4, frequency: "DAILY" },
    { canal: "Evenements physiques — Ateliers beaute", type: "PHYSIQUE", channelRef: "EVENT", role: "Creation de lien humain, experience sensorielle produit, conversion engagement", aarrStage: "ACTIVATION", devotionLevel: ["INTERESSE", "PARTICIPANT", "ENGAGE"], priority: 5, frequency: "MONTHLY" },
    { canal: "Packaging premium — Experience unboxing", type: "PHYSIQUE", channelRef: "PACKAGING", role: "Premier contact physique avec la marque, moment partage sur reseaux", aarrStage: "ACTIVATION", devotionLevel: ["INTERESSE", "PARTICIPANT"], priority: 6, frequency: "AD_HOC" },
    { canal: "Email — Newsletter beaute", type: "DIGITAL", channelRef: "EMAIL", role: "Contenu approfondi, conseils saisonniers, offres exclusives", aarrStage: "RETENTION", devotionLevel: ["PARTICIPANT", "ENGAGE"], priority: 7, frequency: "WEEKLY" },
    { canal: "Boutiques partenaires — Conseil en point de vente", type: "HUMAIN", channelRef: "PLV", role: "Decouverte sensorielle produit, conseil personnalise, essai gratuit", aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR", "INTERESSE"], priority: 8, frequency: "AD_HOC" },
  ],

  // --- Rituels (4) ---
  rituels: [
    {
      nom: "Le Reveil de la Reine",
      type: "ALWAYS_ON",
      frequency: "DAILY",
      description: "Rituel matinal : notification app a 6h30 avec message inspirant, application du Serum Vibranium Glow en 3 etapes guidees par l'app, photo 'glow check' optionnelle partageable.",
      devotionLevels: ["PARTICIPANT", "ENGAGE", "AMBASSADEUR", "EVANGELISTE"],
      touchpoints: ["BLISS App"],
      aarrPrimary: "RETENTION",
      kpiMeasure: "Taux d'ouverture notification matinale (cible: 45%)",
    },
    {
      nom: "Le Dimanche Sacre",
      type: "CYCLIQUE",
      frequency: "WEEKLY",
      description: "Rituel hebdomadaire dominical : application du Masque Ancestral pendant 20 min, playlist BLISS dediee, photo avant/apres postee dans le groupe WhatsApp. La communaute partage ses 'dimanche masque' ensemble.",
      devotionLevels: ["ENGAGE", "AMBASSADEUR", "EVANGELISTE"],
      touchpoints: ["WhatsApp Community", "Instagram"],
      aarrPrimary: "REFERRAL",
      kpiMeasure: "Nombre de photos 'dimanche masque' postees/semaine (cible: 180)",
    },
    {
      nom: "La Ceremonie d'Initiation",
      type: "CYCLIQUE",
      frequency: "MONTHLY",
      description: "Evenement mensuel en boutique ou pop-up : les nouvelles clientes recoivent leur Coffret Decouverte des mains d'une 'Reine BLISS', avec diagnostic peau en live et premier soin assiste. Moment solennel et festif.",
      devotionLevels: ["SPECTATEUR", "INTERESSE"],
      touchpoints: ["Evenements physiques"],
      aarrPrimary: "ACTIVATION",
      kpiMeasure: "Nombre d'initiees/mois (cible: 35) + taux de conversion vers achat 30j (cible: 65%)",
    },
    {
      nom: "Le Couronnement Trimestriel",
      type: "CYCLIQUE",
      frequency: "SEASONAL",
      description: "Grande soiree trimestrielle reservee aux top 50 clientes : avant-premiere nouveautes, rencontre avec Amara Udaku (fondatrice), remise des titres 'Reine BLISS' aux nouvelles ambassadrices. Lieu prestige, dress code dore.",
      devotionLevels: ["AMBASSADEUR", "EVANGELISTE"],
      touchpoints: ["Evenements physiques", "Instagram"],
      aarrPrimary: "REFERRAL",
      kpiMeasure: "Taux de presence invitees (cible: 85%) + posts generes dans les 48h (cible: 120)",
    },
  ],

  // --- Principes communautaires ---
  principesCommunautaires: [
    { principle: "Bienveillance absolue — aucune critique physique, aucun jugement sur le niveau d'achat", enforcement: "Moderation active du groupe WhatsApp + charte signee a l'inscription" },
    { principle: "Authenticite radicale — seules les vraies photos sans filtre sont celebrees", enforcement: "Badge 'Vraie Peau' pour les membres qui postent sans retouche" },
    { principle: "Sororite active — aider une soeur BLISS est une obligation morale", enforcement: "Systeme de parrainage binome — chaque nouvelle est jumelee a une ancienne" },
  ],

  // --- Gamification ---
  gamification: {
    niveaux: [
      { niveau: "Graine de Beaute", condition: "Creer un compte + diagnostic gratuit", reward: "Badge profil + 100 points BLISS", duration: "Immediat" },
      { niveau: "Fleur d'Eclat", condition: "Premier achat + 1 avis laisse", reward: "-10% prochaine commande + acces groupe WhatsApp", duration: "1-2 semaines" },
      { niveau: "Etoile Radieuse", condition: "3 achats + routine complete + 1 parrainage", reward: "Coffret cadeau surprise + acces avant-premieres", duration: "2-3 mois" },
      { niveau: "Reine BLISS", condition: "12 achats + 5 parrainages + participation evenement", reward: "Titre officiel + invitation Couronnement + co-creation produit", duration: "6-12 mois" },
    ],
    recompenses: [
      "Points convertibles en produits (1000 pts = 5000 XAF de remise)",
      "Acces anticipe aux nouvelles formules (beta-testeuse)",
      "Invitation aux masterclass privees avec des dermatologues",
      "Mention speciale sur les posts Instagram de la marque",
    ],
  },

  // --- AARRR Funnel ---
  aarrr: {
    acquisition: "Instagram Reels (42% du trafic), TikTok challenges beaute (28%), bouche-a-oreille communautaire (18%), OOH Douala/Yaounde (12%). Budget acquisition : 650 000 XAF/mois. CPA cible : 3 500 XAF.",
    activation: "Diagnostic peau IA gratuit via l'app (conversion diagnostic->inscription : 72%). Coffret Decouverte a 12 000 XAF comme premier achat (conversion visite->achat : 18%). Temps median premiere commande : 4.2 jours apres diagnostic.",
    retention: "App BLISS avec notifications rituels quotidiens (retention J30 : 58%, J90 : 41%). Programme fidelite a points. Newsletter hebdomadaire beaute (taux d'ouverture : 34%). WhatsApp Community pour les engagees (retention J90 : 82%).",
    revenue: "Panier moyen : 19 200 XAF. Frequence d'achat : 1.8 commandes/mois pour les actives. LTV 12 mois : 95 000 XAF. Upgrade rate decouverte->rituel : 68%. App premium : 2 500 XAF/mois (1 850 abonnees).",
    referral: "Programme parrainage : -15% pour les 2 parties (taux activation parrainage : 23%). UGC organique : 420 posts/mois. Challenge mensuel #BLISSGlow avec lots. Chaque ambassadrice genere en moyenne 4.2 filleules.",
  },

  // --- KPIs (8) ---
  kpis: [
    { name: "NPS (Net Promoter Score)", metricType: "SATISFACTION", target: 75, frequency: "MONTHLY" },
    { name: "Taux de retention J90", metricType: "BEHAVIORAL", target: 45, frequency: "MONTHLY" },
    { name: "Panier moyen", metricType: "FINANCIAL", target: 22000, frequency: "WEEKLY" },
    { name: "Taux UGC actif (posts/mois)", metricType: "ENGAGEMENT", target: 500, frequency: "MONTHLY" },
    { name: "Taux conversion diagnostic->achat", metricType: "BEHAVIORAL", target: 20, frequency: "WEEKLY" },
    { name: "Taux de parrainage actif", metricType: "ENGAGEMENT", target: 25, frequency: "MONTHLY" },
    { name: "Revenue recurrente app premium (XAF)", metricType: "FINANCIAL", target: 5000000, frequency: "MONTHLY" },
    { name: "Nombre d'ambassadrices actives", metricType: "ENGAGEMENT", target: 150, frequency: "MONTHLY" },
  ],

  // --- Calendrier sacre ---
  sacredCalendar: [
    { date: "8 mars", name: "Journee de la Femme BLISS", significance: "Plus grand evenement annuel : soiree gala, lancement produit, hommage aux Reines BLISS de l'annee" },
    { date: "1er janvier", name: "Le Renouveau", significance: "Nouvelle routine annuelle : diagnostic peau de debut d'annee, nouveaux objectifs beaute, coffret 'Resolution'" },
    { date: "Premier dimanche de chaque trimestre", name: "Le Grand Dimanche Sacre", significance: "Mega rituel communautaire synchronise : toutes les BLISS appliquent le masque en meme temps, live Instagram collectif" },
    { date: "15 novembre", name: "Fete des Ancetres Beaute", significance: "Hommage aux traditions cosmetiques africaines : recettes ancestrales partagees, masterclass ingredients locaux" },
  ],

  // --- Commandements ---
  commandments: [
    { commandment: "Tu honoreras ta peau chaque matin", justification: "La routine quotidienne est non-negociable — c'est le fondement de la transformation" },
    { commandment: "Tu partageras ta verite sans filtre", justification: "L'authenticite est le liant de la communaute — les vraies photos creent la vraie confiance" },
    { commandment: "Tu accueilleras chaque soeur sans jugement", justification: "La bienveillance active est la regle — chaque femme est a un stade different de son voyage" },
    { commandment: "Tu ne copieras point les standards etrangers", justification: "La beaute africaine se definit par elle-meme — BLISS refuse le colorisme et les standards importes" },
    { commandment: "Tu celebreras tes imperfections", justification: "Les cicatrices, les taches, les textures sont des histoires — BLISS les sublime, ne les cache pas" },
  ],

  // --- Rites de passage ---
  ritesDePassage: [
    { fromStage: "SPECTATEUR", toStage: "INTERESSE", rituelEntree: "Diagnostic IA gratuit + reception du resultat personnalise par email", symboles: ["Badge 'Graine de Beaute'"] },
    { fromStage: "INTERESSE", toStage: "PARTICIPANT", rituelEntree: "Premier achat + photo 'jour 1' postee dans le groupe communautaire", symboles: ["Badge 'Fleur d'Eclat'", "Acces groupe WhatsApp"] },
    { fromStage: "PARTICIPANT", toStage: "ENGAGE", rituelEntree: "Participation a un evenement physique + completion de la routine 3 produits", symboles: ["Badge 'Etoile Radieuse'", "Coffret surprise"] },
    { fromStage: "ENGAGE", toStage: "AMBASSADEUR", rituelEntree: "5 parrainages actifs + 12 achats cumules + nomination par la communaute", symboles: ["Titre 'Reine BLISS'", "Invitation Couronnement"] },
    { fromStage: "AMBASSADEUR", toStage: "EVANGELISTE", rituelEntree: "Co-creation d'un produit ou d'une campagne + 10 filleules actives", symboles: ["Titre 'Matriache BLISS'", "Contrat ambassadrice", "Produits a vie"] },
  ],

  // --- Sacrements ---
  sacraments: [
    { nomSacre: "L'Onction", trigger: "Premiere application du Serum Vibranium Glow", action: "3 gouttes massees en cercles ascendants, yeux fermes, intention posee", reward: "Photo 'Premiere Onction' badge sur le profil app", kpi: "Taux de completion onction (cible: 80%)", aarrStage: "ACTIVATION" },
    { nomSacre: "La Revelation", trigger: "14 jours de routine complete", action: "Photo avant/apres comparee dans l'app, partage optionnel", reward: "Deblocage du niveau 'Fleur d'Eclat' + 200 points", kpi: "Taux de completion J14 (cible: 55%)", aarrStage: "RETENTION" },
    { nomSacre: "Le Partage Sacre", trigger: "Premier parrainage qui aboutit a un achat", action: "Envoyer un code parrainage personnalise a une amie", reward: "-15% pour les 2 + 500 points bonus", kpi: "Taux de parrainage actif (cible: 23%)", aarrStage: "REFERRAL" },
    { nomSacre: "L'Ascension", trigger: "Participation au premier evenement physique BLISS", action: "Se presenter, recevoir un mini-soin, echanger avec 3 membres minimum", reward: "Badge evenement + photo officielle sur le feed BLISS", kpi: "Taux de presence evenements (cible: 75%)", aarrStage: "RETENTION" },
    { nomSacre: "Le Couronnement", trigger: "Atteinte du statut Reine BLISS (top 2%)", action: "Ceremonie trimestrielle : reception du titre des mains de la fondatrice", reward: "Titre a vie + produits offerts + invitation permanente aux evenements VIP", kpi: "Nombre de couronnes/trimestre (cible: 12)", aarrStage: "REFERRAL" },
  ],

  // --- Tabous ---
  taboos: [
    { taboo: "Promouvoir des produits eclaircissants ou du colorisme", consequence: "Exclusion immediate et definitive de la communaute" },
    { taboo: "Utiliser des filtres beaute pour promouvoir les resultats BLISS", consequence: "Perte du badge 'Vraie Peau' et avertissement public" },
    { taboo: "Denigrer une marque concurrente africaine", consequence: "Rappel a l'ordre par les moderatrices — BLISS eleve, ne rabaisse pas" },
  ],
};

// ============================================================================
// PILIER R — RISK (Diagnostic)
// ============================================================================

export const blissPillarR: PillarRContent = {
  // --- Diagnostic ADVE (transition E->R) ---
  pillarGaps: {
    a: { score: 24, gaps: ["Timeline narrative de la fondatrice incomplete (partie 'futur' manquante)"] },
    d: { score: 25, gaps: [] },
    v: { score: 24, gaps: ["Donnees de churn par produit non encore collectees (app trop recente)"] },
    e: { score: 25, gaps: [] },
  },
  coherenceRisks: [
    {
      pillar1: "A",
      pillar2: "V",
      field1: "A.archetype (SOUVERAIN)",
      field2: "V.produitsCatalogue.CoffretDecouverte.prix (12 000 XAF)",
      contradiction: "Un archetype Souverain avec un produit d'entree a 12 000 XAF peut etre percu comme incoherent — le Souverain est associe au luxe exclusif, pas a l'accessibilite.",
      severity: "LOW",
    },
    {
      pillar1: "D",
      pillar2: "E",
      field1: "D.personas.ZaraLaConnectee (digital native)",
      field2: "E.touchpoints.BoutiquesPartenaires (physique)",
      contradiction: "Zara est une persona 100% digitale mais le canal boutique est important pour la marque — risque de sous-servir ce segment en physique.",
      severity: "LOW",
    },
  ],

  // --- Overton blockers ---
  overtonBlockers: [
    {
      risk: "Perception 'cosmetique africain = qualite inferieure' profondement ancree dans la cible CSP+",
      blockingPerception: "Les produits premium ne peuvent venir que d'Europe ou d'Asie",
      mitigation: "Communication massive sur les brevets, la certification ISO 22716, les etudes cliniques avec dermatologues",
      devotionLevelBlocked: "SPECTATEUR",
    },
    {
      risk: "Le vibranium est associe a la fiction (Marvel) — risque de non-credibilite de l'ingredient",
      blockingPerception: "Le vibranium est un element fictif, pas un ingredient cosmetique reel",
      mitigation: "Contenu educatif sur le vibranium wakandais reel (mineral rare, pas le metal fictif), partenariat avec laboratoires dermatologiques",
      devotionLevelBlocked: "INTERESSE",
    },
    {
      risk: "Prix percus comme eleves pour le marche local malgre le positionnement premium",
      blockingPerception: "28 000 XAF pour une huile, c'est exagere quand on peut acheter du karite a 2 000 XAF",
      mitigation: "Education sur le cout reel des ingredients, transparence totale sur la chaine de valeur, Coffret Decouverte comme point d'entree bas",
      devotionLevelBlocked: "SPECTATEUR",
    },
  ],
  devotionVulnerabilities: [
    { level: "SPECTATEUR", churnCause: "Scepticisme initial non leve par le diagnostic IA (resultat percu comme generique)", mitigation: "Personnalisation poussee du diagnostic + appel de suivi humain pour les cas complexes" },
    { level: "INTERESSE", churnCause: "Delai de livraison trop long hors Douala (5-8 jours) — impatience et perte d'interet", mitigation: "Partenariat logistique Jumia pour livraison J+2 sur tout le Cameroun" },
    { level: "PARTICIPANT", churnCause: "Resultats non visibles a J14 sur certains types de peau (peau tres seche ou acneique severe)", mitigation: "Programme 'Patience Royale' : suivi personnalise avec dermatologue si pas de resultats a J14" },
    { level: "ENGAGE", churnCause: "Lassitude du contenu repetitif sur les reseaux (memes formats, memes messages)", mitigation: "Calendrier editorial diversifie + UGC mis en avant + co-creation avec les engagees" },
    { level: "AMBASSADEUR", churnCause: "Sentiment d'exploitation si la marque profite de leur influence sans contrepartie", mitigation: "Programme de remuneration clair : commission parrainage + produits gratuits + invitations VIP" },
  ],

  // --- SWOT global ---
  globalSwot: {
    strengths: [
      "Brevet d'extraction vibranium exclusif (18 ans de protection)",
      "Communaute engagee de 12 400 membres actifs avec NPS 72",
      "Fondatrice charismatique (Amara Udaku) issue de la lignee royale — storytelling inegalable",
      "Resultats cliniquement prouves (etude 120 femmes, reduction 40% taches en 30j)",
      "App proprietary avec diagnostic IA entraine sur 45 000 photos de peaux africaines",
    ],
    weaknesses: [
      "Dependance a un seul fournisseur vibranium (gisement familial Udaku)",
      "Distribution limitee geographiquement (90% du CA a Douala/Yaounde)",
      "Equipe tech reduite (2 developpeurs) pour une app en forte croissance",
      "Pas de gamme maquillage — les clientes demandent mais l'offre n'existe pas encore",
      "Budget marketing contraint (2M XAF/mois) face a des concurrents internationaux",
    ],
    opportunities: [
      "Marche cosmetique premium africain en croissance de 23% par an (source : Euromonitor 2025)",
      "Mouvement 'Buy African' en forte acceleration chez les 25-40 ans urbaines CSP+",
      "Expansion regionale naturelle : Gabon, Congo, Guinee Equatoriale (memes codes culturels)",
      "Partenariats avec influenceuses panafricaines (reach potentiel : 2M+ abonnees)",
      "Lancement gamme maquillage vibranium (etude client : 78% des clientes actuelles interessees)",
    ],
    threats: [
      "Entree des geants (L'Oreal, Unilever) sur le segment 'beaute africaine premium' avec budgets 100x",
      "Contrefacon : copies du Serum deja detectees sur les marches de Douala",
      "Instabilite reglementaire sur les produits cosmetiques au Cameroun (nouvelles normes CEMAC 2026)",
      "Volatilite du cours du vibranium brut (+35% en 6 mois)",
      "Risque reputationnel viral si un lot defectueux cause des reactions allergiques",
    ],
  },

  // --- Matrice probabilite x impact (5 risques) ---
  probabilityImpactMatrix: [
    {
      risk: "Contrefacon du Serum Vibranium Glow sur les marches informels — erosion de confiance et risques sanitaires",
      probability: "HIGH",
      impact: "HIGH",
      mitigation: "QR code d'authenticite sur chaque produit + campagne 'Scannez avant d'acheter' + action juridique contre les contrefacteurs identifies",
    },
    {
      risk: "Rupture d'approvisionnement vibranium (gisement unique, extraction artisanale)",
      probability: "MEDIUM",
      impact: "HIGH",
      mitigation: "Stock de securite 6 mois + exploration d'un second gisement dans la region de Jabari + formulations alternatives sans vibranium en reserve",
    },
    {
      risk: "Bug majeur de l'app BLISS pendant un pic d'activite (lancement produit, evenement)",
      probability: "MEDIUM",
      impact: "MEDIUM",
      mitigation: "Infrastructure cloud auto-scalable + equipe support 24/7 les jours de lancement + mode offline pour les fonctionnalites essentielles",
    },
    {
      risk: "Reaction allergique grave chez une cliente mediatisee — crise reputationnelle virale",
      probability: "LOW",
      impact: "HIGH",
      mitigation: "Tests dermatologiques stricts sur chaque lot + assurance responsabilite civile produit + protocole de communication de crise pre-redige",
    },
    {
      risk: "Nouvelle reglementation CEMAC imposant des tests supplementaires — delai de mise sur le marche de 6+ mois",
      probability: "MEDIUM",
      impact: "MEDIUM",
      mitigation: "Veille reglementaire active + pre-conformite aux normes EU (plus strictes) + lobby via l'Association des Cosmetiques d'Afrique Centrale",
    },
  ],

  // --- Priorites de mitigation ---
  mitigationPriorities: [
    { action: "Deployer le systeme QR code anti-contrefacon sur 100% des produits", owner: "Amara Udaku (fondatrice)", timeline: "T2 2026", investment: "1 200 000 XAF" },
    { action: "Constituer un stock de securite vibranium de 6 mois", owner: "Responsable supply chain", timeline: "T2 2026", investment: "4 500 000 XAF" },
    { action: "Recruter un 3eme developpeur senior pour la stabilite app", owner: "CTO", timeline: "T2 2026", investment: "450 000 XAF/mois" },
    { action: "Souscrire une assurance responsabilite civile produit aupres d'un assureur international", owner: "Wkabi Kante (finances)", timeline: "T1 2026", investment: "800 000 XAF/an" },
    { action: "Lancer le programme de pre-conformite aux normes cosmetiques EU pour anticiper la reglementation CEMAC", owner: "Responsable qualite", timeline: "T2-T3 2026", investment: "2 000 000 XAF" },
  ],

  // --- Score de risque ---
  riskScore: 28,

  // --- Micro-SWOTs par pilier ---
  microSWOTs: {
    a: {
      strengths: ["Heritage royal Udaku authentique et verifiable", "Archetype Souverain parfaitement incarne", "Storytelling fondatrice puissant"],
      weaknesses: ["Timeline narrative incomplete (partie futur)", "Doctrine encore en cours de formalisation", "Mythologie vivante pas encore codifiee"],
      opportunities: ["Documentaire sur la lignee Udaku (Netflix-style)", "Livre 'Les Secrets Beaute des Reines Udaku'", "Partenariat musees ethnographiques"],
      threats: ["Appropriation culturelle par des marques occidentales", "Contestation de la legitimite royale par des concurrents locaux", "Saturation du storytelling 'heritage africain'"],
    },
    d: {
      strengths: ["5 personas ultra-detailles et valides par interviews", "Positionnement unique 'beaute vibranium'", "Ton de voix distinctif et coherent"],
      weaknesses: ["Direction artistique encore en phase de finalisation", "Manque de lexique propre formalise", "Personas 4 et 5 moins documentes"],
      opportunities: ["Expansion persona vers les hommes (25-40 ans, skincare)", "Ajout d'un persona 'diaspora africaine en Europe'", "Co-branding avec designers africains"],
      threats: ["Dilution du positionnement si gamme trop elargie", "Concurrents copiant le ton 'royal bienveillant'", "Changement rapide des tendances beaute chez les 18-25"],
    },
    v: {
      strengths: ["Marge brute de 68% moyenne", "Coffret Decouverte comme porte d'entree geniale (68% conversion)", "LTV/CAC ratio de 27.1x"],
      weaknesses: ["Gamme limitee a 5 produits + app", "Absence de gamme maquillage reclamee par les clientes", "Dependance au Serum (38% du CA)"],
      opportunities: ["Lancement maquillage vibranium (78% d'interet)", "Abonnement box mensuelle", "Licensing du brevet vibranium a d'autres marques"],
      threats: ["Guerre des prix si un geant lance un 'serum africain' a moitie prix", "Inflation des matieres premieres (vibranium +35% en 6 mois)", "Contrefacon erosant la valeur percue"],
    },
    e: {
      strengths: ["Communaute WhatsApp ultra-engagee (82% retention J90)", "Rituels installes (Dimanche Sacre, Reveil de la Reine)", "Taux UGC exceptionnel (420 posts/mois)"],
      weaknesses: ["Evenements physiques limites a Douala/Yaounde", "App encore jeune (6 mois) avec UX perfectible", "Manque de content diversifie (trop de photos produit)"],
      opportunities: ["Expansion evenements en Afrique Centrale", "Programme ambassadrices monetise", "Podcast 'Beaute Ancestrale' avec la fondatrice"],
      threats: ["Burnout communautaire si sur-sollicitation", "Plateforme WhatsApp (pas proprie — risque de suppression du groupe)", "Concurrence attention avec Netflix, TikTok etc."],
    },
  },
};

// ============================================================================
// PILIER T — TRACK (Realite Marche)
// ============================================================================

export const blissPillarT: PillarTContent = {
  // --- Transition R->T ---
  riskValidation: [
    {
      riskRef: "Contrefacon du Serum Vibranium Glow",
      marketEvidence: "3 cas de contrefacon identifies au marche de Sandaga (Douala) en janvier 2026 — produits sans QR code, packaging approximatif mais trompeur pour les non-initiees",
      status: "CONFIRMED",
      source: "verified",
    },
    {
      riskRef: "Rupture d'approvisionnement vibranium",
      marketEvidence: "Le cours du vibranium brut a augmente de 35% en 6 mois mais les reserves actuelles couvrent 4 mois de production au rythme actuel",
      status: "CONFIRMED",
      source: "verified",
    },
    {
      riskRef: "Reaction allergique grave",
      marketEvidence: "0 cas de reaction allergique grave signale sur 8 200 utilisatrices en 12 mois. 4 cas de legere irritation resolus en 48h avec adaptation de routine.",
      status: "DENIED",
      source: "verified",
    },
    {
      riskRef: "Nouvelle reglementation CEMAC",
      marketEvidence: "Le projet de directive CEMAC est en phase de consultation — adoption prevue T4 2026 au plus tot. Les normes discutees sont moins strictes que l'ISO 22716 deja detenue par BLISS.",
      status: "UNKNOWN",
      source: "ai_estimate",
    },
  ],

  // --- Fenetre d'Overton mesuree ---
  overtonPosition: {
    currentPerception: "BLISS est percue comme une marque cosmetique locale premium emergente — credible mais pas encore incontournable. Les early adopters CSP+ la considerent comme 'la marque africaine qui pourrait rivaliser avec les internationales'. Le grand public la connait peu.",
    marketSegments: [
      { segment: "CSP+ urbaines 25-40 (coeur de cible)", perception: "Marque aspirationnelle, fiere d'etre africaine, resultats prouves — 'ma marque de peau'" },
      { segment: "CSP+ urbaines 40-55 (cible secondaire)", perception: "Curieuse mais sceptique — 'c'est bien mais je reste fidele a ma Nivea/L'Oreal'" },
      { segment: "Grand public populaire", perception: "Inconnue ou percue comme trop chere — 'c'est pour les femmes riches'" },
      { segment: "Diaspora camerounaise Europe", perception: "Tres enthousiaste mais frustree par l'indisponibilite hors Cameroun — 'quand est-ce que vous livrez en France?'" },
    ],
    measurementMethod: "Enquete quali 45 femmes (15 par segment) + analyse sentiment Instagram/TikTok (4 200 mentions) + NPS communaute",
    measuredAt: "2026-03-28T10:00:00Z",
    confidence: 0.78,
  },
  perceptionGap: {
    currentPerception: "Marque premium locale emergente, credible chez les early adopters mais inconnue du grand public",
    targetPerception: "Reference incontestee de la beaute premium africaine — le standard que toutes les femmes ambitieuses aspirent a utiliser, symbole de fierte et d'excellence continentale",
    gapDescription: "L'ecart principal est la notoriete : BLISS est excellente la ou elle est connue (NPS 72) mais sa couverture est limitee (34% notoriete spontanee Douala/Yaounde, <5% ailleurs). Le gap est quantitatif (reach) plus que qualitatif (perception).",
    gapScore: 42,
  },
  competitorOvertonPositions: [
    { competitorName: "L'Oreal Paris", overtonPosition: "Reference internationale de confiance, accessible et scientifique — 'la valeur sure'", relativeToUs: "AHEAD" },
    { competitorName: "Shea Moisture", overtonPosition: "Pionniere beaute naturelle afro aux USA — 'authentique mais americanisee'", relativeToUs: "PARALLEL" },
    { competitorName: "Mama Africa Cosmetics", overtonPosition: "Cosmetique local basique et abordable — 'pour le quotidien, pas pour le premium'", relativeToUs: "BEHIND" },
    { competitorName: "SkinGourmet", overtonPosition: "Cosmetique bio africain emergent — 'concurrent direct mais moins de tech et de storytelling'", relativeToUs: "PARALLEL" },
  ],

  // --- Triangulation marche ---
  triangulation: {
    customerInterviews: "45 interviews qualitatives menees en mars 2026 (15 clientes actives, 15 anciennes clientes, 15 non-clientes cibles). Insights cles : (1) le vibranium est un facteur de curiosite majeur mais genere du scepticisme initial, (2) le prix n'est PAS la barriere principale — c'est la confiance, (3) les resultats visibles en 14 jours sont le declencheur de conversion numero 1, (4) le bouche-a-oreille est 3x plus efficace que la pub payante.",
    competitiveAnalysis: "Benchmark de 12 marques cosmetiques presentes au Cameroun (5 internationales, 4 regionales, 3 locales). BLISS se differencie par : (1) seule marque avec ingredient brevete (vibranium), (2) seule marque avec app diagnostic IA, (3) prix 30-40% au-dessus des locales mais 50-60% en-dessous des internationales premium (La Mer, Estee Lauder).",
    trendAnalysis: "3 macro-tendances favorables identifiees : (1) croissance du segment 'clean beauty' africaine +23%/an, (2) montee du mouvement 'Buy African' chez les millennials CSP+ (+45% en 2 ans), (3) penetration smartphone 78% chez les 25-40 ans urbaines (favorable a l'app). 1 tendance defavorable : inflation qui comprime les budgets discretionnaires (-8% pouvoir d'achat reel en 2025).",
    financialBenchmarks: "Benchmark financier sur 6 marques cosmetiques comparables en Afrique subsaharienne. BLISS surperforme : marge brute 68% (vs. moyenne 52%), LTV/CAC 27.1x (vs. moyenne 8.5x), NPS 72 (vs. moyenne 45). Sous-performe : CA absolu (48M XAF vs. moyenne 120M XAF — normal pour une marque de 12 mois).",
  },

  // --- Validation d'hypotheses (5) ---
  hypothesisValidation: [
    {
      hypothesis: "Les femmes CSP+ camerounaises sont pretes a payer 15 000-28 000 XAF pour un soin visage si les resultats sont prouves",
      validationMethod: "Analyse des ventes + interviews + test de prix A/B sur l'app",
      status: "VALIDATED",
      evidence: "8 200 clientes actives avec panier moyen de 19 200 XAF. Le prix n'est cite comme frein principal que par 12% des non-acheteuses (vs. 45% pour la confiance).",
    },
    {
      hypothesis: "Le vibranium est un facteur de differenciation suffisant pour justifier le premium",
      validationMethod: "Etude de perception (n=200) + analyse des mentions sociales",
      status: "VALIDATED",
      evidence: "Le vibranium est cite comme raison d'achat n.1 par 38% des clientes et facteur de curiosite par 62% des non-clientes. Taux de reachat 72% confirme la satisfaction post-achat.",
    },
    {
      hypothesis: "L'app gratuite est un canal d'acquisition plus efficace que les reseaux sociaux seuls",
      validationMethod: "Attribution multi-touch sur 3 mois (janvier-mars 2026)",
      status: "VALIDATED",
      evidence: "Le diagnostic app gratuit convertit a 18% (diagnostic->premier achat en 30j) vs. 2.3% pour Instagram et 1.8% pour TikTok. Cout par acquisition via app : 3 500 XAF vs. 8 200 XAF via social ads.",
    },
    {
      hypothesis: "Le marche gabonais et congolais est pret a adopter BLISS sans adaptation produit",
      validationMethod: "Enquete en ligne (n=150 femmes CSP+ Libreville/Brazzaville) + pop-up test",
      status: "TESTING",
      evidence: "85% d'interet declare au Gabon, 72% au Congo. Mais les habitudes beaute different legerement (preference textures plus legeres au Congo). Adaptation mineure necessaire pour le Masque Ancestral.",
    },
    {
      hypothesis: "Un programme ambassadrices remunerees genere plus de conversions que les influenceuses payees",
      validationMethod: "Test A/B : 20 ambassadrices organiques vs. 5 influenceuses payees sur 3 mois",
      status: "VALIDATED",
      evidence: "Les ambassadrices organiques ont genere 4.2 conversions/personne vs. 1.1 pour les influenceuses payees. Cout par conversion ambassadrice : 2 800 XAF vs. 12 000 XAF pour influenceuse. Le lien de confiance pre-existant est determinant.",
    },
  ],

  // --- TAM / SAM / SOM ---
  tamSamSom: {
    tam: {
      value: 285000000000,
      description: "Marche total cosmetique et soin de la peau en Afrique Centrale (Cameroun, Gabon, Congo, Guinee Eq., Tchad, RCA) — 285 milliards XAF en 2025",
      source: "ai_estimate",
      sourceRef: "Euromonitor Beauty & Personal Care Sub-Saharan Africa 2025 + extrapolation regionale",
    },
    sam: {
      value: 18500000000,
      description: "Segment cosmetique premium (>10 000 XAF/produit) pour femmes urbaines CSP+ au Cameroun + Gabon — 18.5 milliards XAF",
      source: "ai_estimate",
      sourceRef: "Analyse INS Cameroun + Enquete consommation urbaine Douala/Yaounde 2025",
    },
    som: {
      value: 720000000,
      description: "Part atteignable a 18 mois : 3.9% du SAM soit 720 millions XAF — base sur la trajectoire actuelle (48M XAF CA annualise) avec expansion geographique + lancement maquillage",
      source: "calculated",
      sourceRef: "Projection interne basee sur growth rate actuel de 18%/mois et pipeline produit",
    },
  },

  // --- Brand Market Fit Score ---
  brandMarketFitScore: 88,

  // --- Traction ---
  traction: {
    utilisateursInscrits: 14600,
    utilisateursActifs: 8200,
    croissanceHebdo: 4.2,
    revenusRecurrents: 4625000,
    metriqueCle: {
      nom: "Clientes actives mensuelles (MAU)",
      valeur: 8200,
      tendance: "UP",
    },
    preuvesTraction: [
      "Croissance organique de 18%/mois depuis septembre 2025",
      "NPS de 72 — superieur a la moyenne industrie cosmetique (45)",
      "Taux de reachat de 72% a 6 mois — preuve de product-market fit",
      "4 625 000 XAF de revenue recurrente mensuelle via abonnements app premium",
      "420 posts UGC organiques par mois sans incentive financiere",
    ],
    tractionScore: 8,
  },
};

// ============================================================================
// PILIER I — INNOVATION (Potentiel)
// ============================================================================

export const blissPillarI: PillarIContent = {
  // --- Transitions T->I ---
  actionsByDevotionLevel: {
    SPECTATEUR: [
      { action: "Challenge TikTok #GlowVibranium — transformation avant/apres en 15 secondes", format: "Short video", objectif: "Reach et notoriete aupres des 18-30 ans non-clientes", pilierImpact: "D", devotionImpact: "SPECTATEUR", overtonShift: "De 'je ne connais pas' a 'j'ai vu passer, c'est quoi?'" },
      { action: "Campagne OOH Douala/Yaounde — panneaux 4x3 dans les quartiers business", format: "Affichage", objectif: "Installer la notoriete visuelle de la marque dans le quotidien urbain", pilierImpact: "D", devotionImpact: "SPECTATEUR", overtonShift: "De 'invisible' a 'je la vois partout'" },
      { action: "Partenariat micro-influenceuses locales (5K-50K abonnees) — contenu authentique", format: "Publication Instagram", objectif: "Credibilite par la preuve sociale de femmes 'comme moi'", pilierImpact: "E", devotionImpact: "SPECTATEUR", overtonShift: "De 'une marque parmi d'autres' a 'recommandee par quelqu'un que je respecte'" },
    ],
    INTERESSE: [
      { action: "Diagnostic IA gratuit pousse via Instagram Stories ads — 'Decouvre ton type de peau en 2 min'", format: "Story interactive", objectif: "Conversion Instagram -> app -> diagnostic -> premier contact data", pilierImpact: "V", devotionImpact: "INTERESSE", overtonShift: "De 'curieuse' a 'elle me connait deja'" },
      { action: "Offre Coffret Decouverte -15% premiere commande via retargeting app", format: "Push notification + email", objectif: "Conversion diagnostic -> premier achat dans les 7 jours", pilierImpact: "V", devotionImpact: "INTERESSE", overtonShift: "De 'j'hesite' a 'je teste'" },
    ],
    PARTICIPANT: [
      { action: "Programme 'Mon Journal Peau' — 30 jours de suivi photo dans l'app avec coaching IA", format: "Feature app", objectif: "Habituer a la routine quotidienne et demontrer les resultats de facon irrefutable", pilierImpact: "E", devotionImpact: "PARTICIPANT", overtonShift: "De 'je teste' a 'ca marche vraiment'" },
      { action: "Invitations personnalisees aux ateliers beaute mensuels a Douala et Yaounde", format: "Email + notification app", objectif: "Creer le premier contact humain avec la communaute BLISS", pilierImpact: "E", devotionImpact: "PARTICIPANT", overtonShift: "De 'cliente' a 'membre'" },
    ],
    ENGAGE: [
      { action: "Programme de co-creation : voter pour la prochaine fragrance de l'Huile Royale", format: "Sondage in-app + Instagram", objectif: "Donner un sentiment de propriete et d'influence sur la marque", pilierImpact: "A", devotionImpact: "ENGAGE", overtonShift: "De 'j'achete' a 'je contribue'" },
      { action: "Acces beta-testeur pour les nouvelles formules avant lancement public", format: "Invitation exclusive in-app", objectif: "Valoriser les engagees et collecter du feedback premium", pilierImpact: "V", devotionImpact: "ENGAGE", overtonShift: "De 'membre' a 'partenaire'" },
    ],
    AMBASSADEUR: [
      { action: "Kit ambassadrice officiel : bio personnalisee, code promo unique, produits offerts mensuels", format: "Package physique + digital", objectif: "Professionnaliser le bouche-a-oreille et maximiser les conversions", pilierImpact: "E", devotionImpact: "AMBASSADEUR", overtonShift: "De 'fan' a 'representante'" },
      { action: "Masterclass privee avec Amara Udaku (fondatrice) — 1 par trimestre, 20 places", format: "Evenement physique intime", objectif: "Renforcer le lien personnel avec la fondatrice et la mission de la marque", pilierImpact: "A", devotionImpact: "AMBASSADEUR", overtonShift: "De 'representante' a 'disciple'" },
    ],
    EVANGELISTE: [
      { action: "Co-developpement d'un produit signe 'BLISS x [Nom de l'Evangeliste]' en edition limitee", format: "Collaboration produit", objectif: "Consacrer l'evangeliste comme co-creatrice et amplifier son impact", pilierImpact: "V", devotionImpact: "EVANGELISTE", overtonShift: "De 'disciple' a 'co-fondatrice symbolique'" },
    ],
  },
  riskMitigationActions: [
    { riskRef: "Contrefacon Serum", action: "Campagne 'Scannez avant d'acheter' — education consommateur sur QR code d'authenticite", canal: "INSTAGRAM", expectedImpact: "Reduction de 60% des achats contrefaits en 6 mois" },
    { riskRef: "Rupture approvisionnement vibranium", action: "Exploration et securisation d'un second gisement dans la region de Jabari", canal: "OOH", expectedImpact: "Diversification source approvisionnement a horizon 12 mois" },
    { riskRef: "Bug majeur app", action: "Recrutement developpeur senior + migration infrastructure cloud auto-scalable", canal: "APP", expectedImpact: "Uptime 99.5% garanti et temps de reponse <2s" },
    { riskRef: "Reglementation CEMAC", action: "Pre-conformite normes EU + adhesion a l'Association des Cosmetiques d'Afrique Centrale", canal: "PR", expectedImpact: "Etre en avance sur toute nouvelle reglementation" },
  ],
  hypothesisTestActions: [
    { hypothesisRef: "Marche gabonais et congolais", testAction: "Pop-up BLISS de 2 semaines a Libreville avec gamme complete + adaptation Masque", expectedOutcome: "50 ventes minimum et NPS >60 pour valider l'expansion", cost: "MEDIUM" },
    { hypothesisRef: "Gamme maquillage vibranium", testAction: "Pre-lancement 3 teintes de fond de teint vibranium en edition limitee via l'app (1000 unites)", expectedOutcome: "Sell-out en moins de 14 jours pour confirmer la demande", cost: "HIGH" },
    { hypothesisRef: "Abonnement box mensuelle", testAction: "Offre 'BLISS Box' 15 000 XAF/mois pendant 3 mois pour 200 clientes selectionnees", expectedOutcome: "Taux de renouvellement >65% au mois 3", cost: "MEDIUM" },
  ],

  // --- Innovations produit ---
  innovationsProduit: [
    {
      name: "Fond de Teint Vibranium (gamme maquillage)",
      type: "EXTENSION_GAMME",
      description: "3 teintes initiales adaptees aux peaux africaines (miel, acajou, ebene) avec micro-particules vibranium pour un eclat naturel. Prix cible : 16 000 XAF.",
      feasibility: "HIGH",
      horizon: "COURT",
      devotionImpact: "PARTICIPANT",
    },
    {
      name: "BLISS Box — Abonnement mensuel surprise",
      type: "EXTENSION_MARQUE",
      description: "Box mensuelle a 15 000 XAF contenant 2 minis + 1 plein format + 1 accessoire exclusif + 1 fiche recette ancestrale. Edition thematique chaque mois.",
      feasibility: "HIGH",
      horizon: "COURT",
      devotionImpact: "ENGAGE",
    },
    {
      name: "BLISS x Jabari Heritage — Collection capsule pierres chaudes",
      type: "CO_BRANDING",
      description: "Collaboration avec Jabari Heritage pour une gamme de soins aux pierres chaudes wakandaises. Associe cosmetique et bien-etre traditionnel Jabari.",
      feasibility: "MEDIUM",
      horizon: "MOYEN",
      devotionImpact: "AMBASSADEUR",
    },
    {
      name: "Gamme Homme — BLISS Kingdom",
      type: "EXTENSION_MARQUE",
      description: "Ligne masculine avec 3 produits (serum anti-fatigue, creme hydratante, huile barbe) sous la marque BLISS Kingdom. Cible : hommes CSP+ 25-40 ans.",
      feasibility: "MEDIUM",
      horizon: "MOYEN",
      devotionImpact: "SPECTATEUR",
    },
    {
      name: "Licensing vibranium — ingredient fourni a d'autres marques (non-concurrentes)",
      type: "DIVERSIFICATION",
      description: "Vente de vibranium purifie cosmetique a des marques de shampoing, dentifrice ou parfum sous licence BLISS. Revenue B2B complementaire.",
      feasibility: "LOW",
      horizon: "LONG",
      devotionImpact: "EVANGELISTE",
    },
  ],

  // --- Catalogue d'actions par canal ---
  catalogueParCanal: {
    INSTAGRAM: [
      { action: "Serie Reels 'Transformations Vraies' — 1 cliente par semaine, son histoire et sa routine", format: "Reel 60s", objectif: "Preuve sociale authentique et conversion par identification" },
      { action: "Carousel educatif 'Les 7 Mythes Beaute Africaine' — 1 mythe debunk par post", format: "Carousel 10 slides", objectif: "Positionnement expert et engagement commentaires" },
      { action: "Lives mensuels 'Ask Amara' — la fondatrice repond aux questions beaute en direct", format: "Live 45 min", objectif: "Humanisation de la marque et conversion en direct (promo live exclusive)" },
    ],
    TIKTOK: [
      { action: "Challenge #MasqueDimanche — transformation avant/apres synchronisee chaque dimanche", format: "Short video 15-30s", objectif: "Viralite organique et adoption du rituel hebdomadaire" },
      { action: "Serie 'Comment c'est fabrique' — behind the scenes du labo BLISS", format: "Video 60s", objectif: "Transparence et education sur la qualite de fabrication" },
    ],
    OOH: [
      { action: "Panneaux 4x3 axes Douala-Yaounde — visuel Serum Vibranium Glow sur fond dore", format: "Affichage grand format", objectif: "Notoriete de masse dans les 2 plus grandes villes du Cameroun" },
      { action: "Affichage digital centres commerciaux Akwa et Bastos", format: "Ecran digital 10s loop", objectif: "Toucher les CSP+ dans leurs lieux de vie" },
    ],
    EVENT: [
      { action: "Atelier beaute mensuel 'Ceremonie d'Initiation' — 35 places, inscription app", format: "Evenement physique 2h", objectif: "Conversion interesse->participant via experience sensorielle" },
      { action: "Soiree 'Couronnement Trimestriel' — gala des top 50 clientes", format: "Evenement prestige 4h", objectif: "Fidelisation ambassadrices + contenu aspirationnel pour les reseaux" },
      { action: "Pop-up store ephemere dans les hotels 5* de Douala pendant les fetes", format: "Stand premium 2 semaines", objectif: "Toucher les voyageuses business et la diaspora de passage" },
    ],
    APP: [
      { action: "Feature 'Mon Journal Peau' — suivi photo quotidien avec analyse IA de progression", format: "Feature in-app", objectif: "Retention et preuve des resultats pour renforcer la conviction" },
      { action: "Gamification avancee : defis hebdomadaires, classement communautaire, badges collectionnables", format: "Feature in-app", objectif: "Engagement quotidien et competition bienveillante" },
      { action: "Marketplace communautaire : les Reines BLISS peuvent vendre leurs routines personnalisees", format: "Feature in-app", objectif: "Monetisation de la communaute et creation d'un ecosystem auto-entretenu" },
    ],
    PARTNERSHIP: [
      { action: "Partenariat Shuri Academy — modules beaute dans le cursus entrepreneuriat feminin", format: "Integration cours", objectif: "Acquisition qualifiee via reseau educatif + credibilite institutionnelle" },
      { action: "Partenariat cliniques dermatologiques Douala — recommandation BLISS post-consultation", format: "Prescription medicale", objectif: "Caution medicale + acquisition haute conversion (confiance medecin)" },
    ],
  },

  // --- Assets produisibles ---
  assetsProduisibles: [
    { asset: "Lookbook saisonnier 'Les Visages de BLISS' — 12 photos studio, 6 modeles", type: "PHOTO", usage: "Instagram feed, site web, presse, OOH" },
    { asset: "Video manifeste 'Pourquoi BLISS Existe' — 3 min, voix off Amara Udaku", type: "VIDEO", usage: "YouTube, Instagram Reels, ecrans boutique, events" },
    { asset: "Kit packaging edition speciale Fete des Ancetres — boitage grave or et motifs Adinkra", type: "PACKAGING", usage: "Edition limitee novembre, cadeau premium" },
    { asset: "Podcast mensuel 'Beaute Ancestrale' — interview experts + histoires clientes (8 episodes)", type: "AUDIO", usage: "Spotify, Apple Podcasts, newsletter embed" },
    { asset: "Guide imprime 'Ma Routine BLISS' — 16 pages, papier recycle, inclus dans chaque Coffret Decouverte", type: "PRINT", usage: "In-box insert, evenements, boutiques" },
    { asset: "Serie de 6 filtres AR Instagram 'Glow Check' — overlay qui simule l'eclat BLISS", type: "DIGITAL", usage: "Instagram Stories, TikTok, campagnes acquisition" },
    { asset: "Experience immersive VR 'Le Laboratoire Vibranium' — visite virtuelle du labo BLISS", type: "EXPERIENCE", usage: "Events physiques, stand salons professionnels" },
  ],

  // --- Activations possibles ---
  activationsPossibles: [
    { activation: "Tournee 'BLISS Tour' dans 5 villes camerounaises — pop-up + ateliers + diagnostics gratuits", canal: "Evenementiel itinerant", cible: "Femmes CSP+ hors Douala/Yaounde (Bafoussam, Bamenda, Kribi, Limbé, Bertoua)", budgetEstime: "HIGH" },
    { activation: "Collaboration influenceuse panafricaine — serie de 5 contenus co-crees avec une star beaute nigeriane", canal: "Instagram + TikTok", cible: "Audience panafricaine anglophone (expansion future Nigeria/Ghana)", budgetEstime: "HIGH" },
    { activation: "Partenariat mariage prestige — coffret mariee BLISS offert aux 20 plus beaux mariages du mois (media trade)", canal: "Event + Instagram", cible: "Futures mariees CSP+ et leur cercle d'amies", budgetEstime: "MEDIUM" },
    { activation: "Pop-up aeroport de Douala — stand duty-free pendant 1 mois", canal: "Retail ephemere", cible: "Diaspora + voyageuses business internationales", budgetEstime: "MEDIUM" },
    { activation: "Campagne '1000 Diagnostics Gratuits' dans les universites de Douala et Yaounde", canal: "Campus + app", cible: "Etudiantes 18-25 ans (pipeline future CSP+)", budgetEstime: "LOW" },
  ],

  // --- Formats disponibles ---
  formatsDisponibles: [
    "Reel Instagram 15-60s",
    "TikTok 15-30s",
    "Carousel Instagram 5-10 slides",
    "Story Instagram/WhatsApp ephemere 24h",
    "Video YouTube longue (3-10 min)",
    "Podcast audio 20-45 min",
    "Article blog 800-1200 mots",
    "Email newsletter richement illustree",
    "Affichage OOH 4x3 / digital",
    "Packaging insert imprime",
    "Experience physique (atelier, pop-up, gala)",
    "Feature in-app interactive",
    "Filtre AR Instagram/TikTok",
    "Communique de presse",
    "Live Instagram/TikTok",
  ],

  // --- Brand platform ---
  brandPlatform: {
    name: "BLISS by Wakanda",
    benefit: "La premiere gamme cosmetique premium au vibranium — des soins ancestraux amplifies par la technologie pour sublimer la beaute africaine",
    target: "Femmes africaines urbaines CSP+, 25-45 ans, qui veulent des soins premium refletant leur identite culturelle",
    competitiveAdvantage: "Seule marque a posseder le brevet d'extraction vibranium cosmetique + 45 000 photos de peaux africaines pour l'IA diagnostic",
    emotionalBenefit: "Se sentir reine dans sa propre peau — fierte, confiance, appartenance a une lignee de beaute ancestrale",
    functionalBenefit: "Resultats cliniquement prouves en 14 jours — eclat, hydratation, anti-taches, anti-age",
    supportedBy: "Brevet vibranium + certification ISO 22716 + etude clinique 120 femmes + heritage Udaku 7 generations",
  },

  // --- Copy strategy ---
  copyStrategy: {
    promise: "BLISS revele la reine qui sommeille en chaque femme africaine — grace a la science du vibranium et la sagesse des ancetres",
    rtb: "Brevet vibranium exclusif, resultats visibles en 14 jours, formules certifiees ISO 22716, heritage royal de 7 generations",
    tonOfVoice: "Royal mais accessible, scientifique mais sensoriel, fier mais bienveillant — jamais hautain, toujours inspirant",
    keyMessages: [
      "Ta peau merite la royaute — BLISS te la donne",
      "Le vibranium ne protege pas que le Wakanda — il sublime ta beaute",
      "7 generations de savoir. 1 serum. 14 jours pour voir la difference.",
      "Africaine, premium, prouvee — BLISS est ce que la beaute africaine a toujours merite d'etre",
    ],
    doNot: [
      "Jamais de comparaison depreciative avec d'autres marques africaines",
      "Jamais de promesse de blanchiment ou d'eclaircissement",
      "Jamais de ton condescendant ou paternaliste",
      "Jamais de photos retouchees pour cacher des imperfections naturelles",
    ],
  },

  // --- Big Idea ---
  bigIdea: {
    concept: "La Beaute Vibranium — quand l'Afrique invente le futur de la cosmetique",
    mechanism: "Chaque produit BLISS est un pont entre heritage ancestral et innovation scientifique — le vibranium est la preuve physique que la beaute premium peut naitre en Afrique",
    insight: "Les femmes africaines CSP+ sont fatiguees de choisir entre 'produits locaux basiques' et 'produits importes chers'. Elles veulent un premium qui leur ressemble.",
    adaptations: [
      "DIGITAL : 'Ton diagnostic vibranium gratuit — decouvre ce que ta peau merite'",
      "OOH : 'La Beaute Vibranium. Made in Wakanda. Pour toute l'Afrique.'",
      "EVENT : 'Ceremonie d'Initiation — ta premiere Onction BLISS'",
      "APP : 'Ta Reine Interieure. Reveillee par la Science.'",
    ],
  },

  // --- Budget potentiel ---
  potentielBudget: {
    production: 4500000,
    media: 8000000,
    talent: 3000000,
    logistics: 2000000,
    technology: 3500000,
    total: 21000000,
  },

  // --- Generation metadata ---
  generationMeta: {
    gloryToolsUsed: ["mestor-rtis-cascade", "notoria-action-generator", "seshat-market-intelligence"],
    qualityScore: 87,
    generatedAt: "2026-02-05T10:00:00Z",
  },
};

// ============================================================================
// PILIER S — STRATEGIE (Roadmap)
// ============================================================================

export const blissPillarS: PillarSContent = {
  // --- Fenetre d'Overton (coeur de S) ---
  fenetreOverton: {
    perceptionActuelle: "Marque cosmetique locale premium emergente — credible chez les early adopters CSP+ urbaines (NPS 72, 34% notoriete spontanee Douala/Yaounde) mais quasi-inconnue du grand public et de la diaspora.",
    perceptionCible: "Reference incontestee de la beaute premium africaine — le standard que toute femme ambitieuse aspire a utiliser, symbole continental de fierte et d'excellence, reconnue au-dela du Cameroun.",
    ecart: "L'ecart est principalement quantitatif (reach) : BLISS excelle en qualite de perception (NPS 72, taux reachat 72%) mais sa couverture est limitee a ~15 000 personnes. Objectif : multiplier par 10 l'audience touchee en 12 mois tout en maintenant la qualite de relation.",
    strategieDeplacement: [
      {
        etape: "Phase 1 : Solidifier la base (T1 2026)",
        action: "Renforcer la retention et l'engagement de la communaute existante — de 8 200 a 12 000 actives. Installer les rituels, stabiliser l'app, professionnaliser les ambassadrices.",
        canal: "APP",
        horizon: "0-3 mois",
        devotionTarget: "ENGAGE",
        riskRef: "Bug majeur app",
      },
      {
        etape: "Phase 2 : Amplifier le reach (T2 2026)",
        action: "Campagne d'acquisition massive multi-canal (OOH + TikTok + Instagram + events). Objectif : tripler la notoriete spontanee a Douala/Yaounde (de 34% a 50%). Lancement Coffret Decouverte offensif.",
        canal: "OOH",
        horizon: "3-6 mois",
        devotionTarget: "SPECTATEUR",
        hypothesisRef: "Femmes CSP+ pretes a payer 15K-28K XAF",
      },
      {
        etape: "Phase 3 : Expansion geographique (T3 2026)",
        action: "Pop-up Libreville + Brazzaville. Test grandeur nature des hypotheses d'expansion regionale. Partenariat logistique pour livraison rapide hors Cameroun.",
        canal: "EVENT",
        horizon: "6-9 mois",
        devotionTarget: "INTERESSE",
        hypothesisRef: "Marche gabonais et congolais",
      },
      {
        etape: "Phase 4 : Diversification produit (T4 2026)",
        action: "Lancement gamme maquillage vibranium (fond de teint 3 teintes) + BLISS Box abonnement mensuel. Consolidation position premium pan-Afrique Centrale.",
        canal: "APP",
        horizon: "9-12 mois",
        devotionTarget: "PARTICIPANT",
        riskRef: "Dilution du positionnement si gamme trop elargie",
      },
    ],
  },

  // --- Vision & Axes ---
  visionStrategique:
    "En 12 mois, BLISS passera de marque emergente camerounaise a reference regionale de la beaute premium africaine. " +
    "La strategie repose sur 3 leviers simultanes : approfondir l'engagement communautaire (devotion), " +
    "elargir la couverture geographique (reach), et diversifier l'offre (gamme). " +
    "Le Nord Star est la progression sur la Devotion Ladder : transformer les spectatrices en evangalistes " +
    "tout en alimentant continuellement le haut du funnel.",

  syntheseExecutive:
    "BLISS a demontre un product-market fit exceptionnel (NPS 72, LTV/CAC 27.1x) sur un noyau de 8 200 clientes actives a Douala/Yaounde. " +
    "Le defi strategique est de passer a l'echelle sans diluer la qualite de relation qui fait la force de la marque. " +
    "Budget annuel : 21M XAF. CA vise : 720M XAF a 18 mois. Croissance organique ciblee de 15%/mois. " +
    "3 risques critiques a gerer : contrefacon, approvisionnement vibranium, scalabilite tech.",

  axesStrategiques: [
    {
      axe: "Axe 1 — Deepening : Approfondir la devotion communautaire",
      pillarsLinked: ["A", "E"],
      kpis: ["NPS >75", "Retention J90 >50%", "Nombre ambassadrices actives >200", "Taux UGC >600 posts/mois"],
    },
    {
      axe: "Axe 2 — Broadening : Elargir le reach et la couverture geographique",
      pillarsLinked: ["D", "T"],
      kpis: ["Notoriete spontanee Douala/Yaounde >50%", "MAU >25 000", "Presence physique 3 pays", "CAC <4 000 XAF"],
    },
    {
      axe: "Axe 3 — Diversifying : Enrichir l'offre et les sources de revenus",
      pillarsLinked: ["V", "I"],
      kpis: ["Lancement maquillage T4 2026", "Revenue abonnement >8M XAF/mois", "Gamme 10+ SKUs", "Marge brute >65%"],
    },
  ],

  facteursClesSucces: [
    "Maintenir la qualite produit irreprochable — un seul lot defectueux peut detruire 12 mois de confiance",
    "Recruter un CTO senior pour stabiliser et scaler l'infrastructure app avant l'explosion de la base",
    "Securiser la chaine d'approvisionnement vibranium (stock 6 mois + second gisement en exploration)",
    "Ne pas sacrifier la profondeur d'engagement pour la croissance du reach — chaque nouvelle cliente doit vivre l'experience complete",
    "Conserver Amara Udaku comme visage et voix de la marque — son authenticite est inreplicable et constitue un avantage competitif durable",
  ],

  // --- Sprint 90 jours (8 actions) ---
  sprint90Days: [
    { action: "Deployer QR code anti-contrefacon sur 100% des SKUs en production", owner: "Supply chain", kpi: "100% des produits expedies avec QR verifiable", priority: 1, isRiskMitigation: true, devotionImpact: "SPECTATEUR", sourceRef: "riskMitigationActions[0]" },
    { action: "Recruter developpeur senior fullstack et migrer app vers infra auto-scalable", owner: "CTO", kpi: "Uptime 99.5% + temps reponse <2s", priority: 2, isRiskMitigation: true, devotionImpact: "PARTICIPANT", sourceRef: "riskMitigationActions[2]" },
    { action: "Lancer la campagne OOH Douala/Yaounde (20 panneaux 4x3 pendant 3 mois)", owner: "Brand manager", kpi: "Notoriete spontanee +10 points (de 34% a 44%)", priority: 3, isRiskMitigation: false, devotionImpact: "SPECTATEUR", sourceRef: "catalogueParCanal.OOH[0]" },
    { action: "Activer le challenge TikTok #GlowVibranium avec 10 micro-influenceuses", owner: "Community manager", kpi: "5M vues cumulees en 30 jours + 500 participations", priority: 4, isRiskMitigation: false, devotionImpact: "SPECTATEUR", sourceRef: "catalogueParCanal.TIKTOK[0]" },
    { action: "Lancer la feature 'Mon Journal Peau' dans l'app (suivi photo 30 jours)", owner: "CTO + UX", kpi: "2 000 journaux actifs en 60 jours", priority: 5, isRiskMitigation: false, devotionImpact: "PARTICIPANT", sourceRef: "catalogueParCanal.APP[0]" },
    { action: "Organiser les 3 premieres 'Ceremonies d'Initiation' mensuelles (Douala x2, Yaounde x1)", owner: "Event manager", kpi: "100 initiees sur 3 mois + taux conversion 65% en 30j", priority: 6, isRiskMitigation: false, devotionImpact: "INTERESSE", sourceRef: "catalogueParCanal.EVENT[0]" },
    { action: "Constituer stock de securite vibranium 6 mois", owner: "Supply chain", kpi: "Stock suffisant pour 6 mois de production au rythme projete", priority: 7, isRiskMitigation: true, devotionImpact: "ENGAGE", sourceRef: "riskMitigationActions[1]" },
    { action: "Preparer le pre-lancement fond de teint vibranium (3 teintes, 1000 unites test)", owner: "R&D + Brand manager", kpi: "Formules finalisees et approuvees + packaging designe", priority: 8, isRiskMitigation: false, devotionImpact: "PARTICIPANT", sourceRef: "innovationsProduit[0]" },
  ],

  // --- Roadmap orientee superfan ---
  roadmap: [
    {
      phase: "T1 2026 — Solidification",
      objectif: "Stabiliser la base existante, installer les rituels, deployer les protections anti-contrefacon",
      objectifDevotion: "INTERESSE -> PARTICIPANT (objectif : 60% des interessees deviennent participantes)",
      actions: ["QR code anti-contrefacon", "Feature Journal Peau", "Recrutement CTO senior", "3 Ceremonies d'Initiation"],
      budget: 5000000,
      duree: "3 mois",
    },
    {
      phase: "T2 2026 — Amplification",
      objectif: "Tripler le reach via campagne multi-canal, atteindre 20 000 MAU, installer la notoriete",
      objectifDevotion: "SPECTATEUR -> INTERESSE (objectif : 25% de conversion via diagnostic IA)",
      actions: ["Campagne OOH 20 panneaux", "Challenge TikTok #GlowVibranium", "Partenariat cliniques dermato", "Lives mensuels Ask Amara"],
      budget: 8000000,
      duree: "3 mois",
    },
    {
      phase: "T3 2026 — Expansion",
      objectif: "Tester l'expansion regionale (Gabon + Congo), lancer la BLISS Box, atteindre 30 000 MAU",
      objectifDevotion: "PARTICIPANT -> ENGAGE (objectif : 40% de conversion via programme Journal Peau + events)",
      actions: ["Pop-up Libreville 2 semaines", "Pop-up Brazzaville 2 semaines", "Lancement BLISS Box 200 abonnees", "Programme ambassadrices structure"],
      budget: 6000000,
      duree: "3 mois",
    },
    {
      phase: "T4 2026 — Diversification",
      objectif: "Lancer la gamme maquillage, consolider la presence regionale, atteindre 45 000 MAU et 720M XAF de CA annualise",
      objectifDevotion: "ENGAGE -> AMBASSADEUR (objectif : 15% de conversion via Couronnement Trimestriel + co-creation)",
      actions: ["Lancement fond de teint 3 teintes", "Expansion gamme soins (2 nouveaux SKUs)", "BLISS Tour 5 villes camerounaises", "Premiere Fete des Ancetres Beaute"],
      budget: 7000000,
      duree: "3 mois",
    },
  ],

  // --- Budget alloue ---
  globalBudget: 21000000,
  budgetBreakdown: {
    production: 4500000,
    media: 8000000,
    talent: 3000000,
    logistics: 2000000,
    technology: 3500000,
  },

  // --- Equipe mobilisee ---
  teamStructure: [
    { name: "Amara Udaku", title: "Fondatrice & Directrice de Marque", responsibility: "Vision strategique, storytelling, visage public de la marque, relations VIP" },
    { name: "Okoye Dora", title: "Brand Manager", responsibility: "Execution operationnelle, coordination campagnes, suivi KPIs, gestion equipe creative" },
    { name: "Nakia Okoye", title: "Account Director", responsibility: "Relation client, reporting strategique, coordination avec l'operateur Wakanda Digital" },
    { name: "Wkabi Kante", title: "Controleur Financier", responsibility: "Budget, marges, previsions, compliance, relations fournisseurs" },
  ],

  // --- KPI Dashboard ---
  kpiDashboard: [
    { name: "MAU (Clientes Actives Mensuelles)", pillar: "E", target: "45 000 a fin T4 2026", frequency: "MONTHLY" },
    { name: "NPS", pillar: "E", target: ">75", frequency: "QUARTERLY" },
    { name: "Notoriete spontanee Douala/Yaounde", pillar: "D", target: ">50%", frequency: "QUARTERLY" },
    { name: "CA annualise", pillar: "V", target: "720 000 000 XAF", frequency: "MONTHLY" },
    { name: "Taux de retention J90", pillar: "E", target: ">50%", frequency: "MONTHLY" },
    { name: "Marge brute moyenne", pillar: "V", target: ">65%", frequency: "MONTHLY" },
    { name: "Nombre ambassadrices actives", pillar: "E", target: ">200", frequency: "MONTHLY" },
    { name: "Score risque global", pillar: "R", target: "<25", frequency: "QUARTERLY" },
  ],

  // --- Score de coherence ---
  coherenceScore: 94,

  // --- Transitions I->S ---
  selectedFromI: [
    { sourceRef: "catalogueParCanal.OOH[0]", action: "Campagne OOH 20 panneaux Douala/Yaounde", phase: "T2 2026", priority: 1 },
    { sourceRef: "catalogueParCanal.TIKTOK[0]", action: "Challenge #GlowVibranium", phase: "T2 2026", priority: 2 },
    { sourceRef: "catalogueParCanal.APP[0]", action: "Feature Mon Journal Peau", phase: "T1 2026", priority: 3 },
    { sourceRef: "catalogueParCanal.EVENT[0]", action: "Ceremonies d'Initiation mensuelles", phase: "T1-T4 2026", priority: 4 },
    { sourceRef: "innovationsProduit[0]", action: "Fond de Teint Vibranium 3 teintes", phase: "T4 2026", priority: 5 },
    { sourceRef: "innovationsProduit[1]", action: "BLISS Box abonnement mensuel", phase: "T3 2026", priority: 6 },
    { sourceRef: "catalogueParCanal.PARTNERSHIP[1]", action: "Partenariat cliniques dermatologiques", phase: "T2 2026", priority: 7 },
    { sourceRef: "catalogueParCanal.INSTAGRAM[2]", action: "Lives mensuels Ask Amara", phase: "T2-T4 2026", priority: 8 },
  ],
  rejectedFromI: [
    { sourceRef: "innovationsProduit[2]", reason: "Co-branding Jabari Heritage reporte a 2027 — priorite a la gamme maquillage et a l'expansion regionale d'abord" },
    { sourceRef: "innovationsProduit[3]", reason: "Gamme Homme BLISS Kingdom reporte — risque de dilution identitaire si lance trop tot. Attendre 2027 quand la marque feminine sera consolidee." },
    { sourceRef: "innovationsProduit[4]", reason: "Licensing vibranium B2B trop complexe juridiquement et risque de banaliser l'ingredient hero. A réévaluer en 2028." },
    { sourceRef: "activationsPossibles[1]", reason: "Collaboration influenceuse panafricaine reporte — budget insuffisant en 2026, priorite a la croissance organique locale" },
  ],

  // --- Devotion Funnel ---
  devotionFunnel: [
    { phase: "T1 2026", spectateurs: 25000, interesses: 8500, participants: 4200, engages: 1800, ambassadeurs: 120, evangelistes: 12 },
    { phase: "T2 2026", spectateurs: 55000, interesses: 16000, participants: 7500, engages: 3200, ambassadeurs: 180, evangelistes: 20 },
    { phase: "T3 2026", spectateurs: 80000, interesses: 24000, participants: 12000, engages: 5500, ambassadeurs: 250, evangelistes: 35 },
    { phase: "T4 2026", spectateurs: 120000, interesses: 35000, participants: 18000, engages: 8500, ambassadeurs: 350, evangelistes: 55 },
  ],

  // --- Overton milestones ---
  overtonMilestones: [
    { phase: "T1 2026", currentPerception: "Marque locale emergente connue des early adopters", targetPerception: "Marque locale reconnue comme premium credible par les CSP+ Douala/Yaounde", measurementMethod: "Enquete notoriete assistee (n=200)" },
    { phase: "T2 2026", currentPerception: "Premium credible localement", targetPerception: "Reference beaute premium africaine au Cameroun — citee spontanement par 50%+ des CSP+", measurementMethod: "Enquete notoriete spontanee + social listening" },
    { phase: "T3 2026", currentPerception: "Reference camerounaise", targetPerception: "Marque desirable en Afrique Centrale — testee au Gabon et Congo avec succes", measurementMethod: "Ventes pop-up + NPS regional" },
    { phase: "T4 2026", currentPerception: "Marque regionale testee", targetPerception: "Reference regionale Afrique Centrale — gamme complete, couverture multi-pays, communaute pan-regionale", measurementMethod: "CA regional + MAU + notoriete 3 pays" },
  ],

  // --- Budget par devotion ---
  budgetByDevotion: {
    acquisition: 8500000,
    conversion: 5000000,
    retention: 4500000,
    evangelisation: 3000000,
  },

  // --- North Star KPI ---
  northStarKPI: {
    name: "Progression Devotion Ladder — % de la base qui monte d'un niveau par trimestre",
    target: "25% de la base active progresse d'au moins 1 niveau de devotion chaque trimestre",
    frequency: "QUARTERLY",
    currentValue: "22% (T1 2026 mesure)",
  },

  // --- Recommandations prioritaires ---
  recommandationsPrioritaires: [
    { recommendation: "Securiser la chaine vibranium avant toute acceleration commerciale — le stock 6 mois est non-negociable", source: "R", priority: 1 },
    { recommendation: "Investir massivement dans l'app (CTO + dev senior) — c'est le canal de retention n.1 et il doit supporter 5x la charge actuelle", source: "V", priority: 2 },
    { recommendation: "Lancer l'OOH T2 pour installer la notoriete de masse avant l'expansion regionale T3", source: "D", priority: 3 },
    { recommendation: "Ne pas lancer plus de 2 nouveaux SKUs par trimestre pour maintenir la coherence qualite", source: "I", priority: 4 },
    { recommendation: "Formaliser le programme ambassadrices avec remuneration claire avant T2 — risque de churn des top clientes sinon", source: "E", priority: 5 },
  ],
};
