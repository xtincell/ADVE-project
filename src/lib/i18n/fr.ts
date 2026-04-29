/**
 * Canonical FR strings — La Fusée.
 *
 * Marketing/landing keys live here; product strings stay inline in
 * components for now (most of the app is FR-only by design).
 */
export const fr = {
  // Common
  "common.cta.start": "Commencer",
  "common.cta.contact": "Contacter UPgraders",
  "common.cta.signin": "Se connecter",
  "common.cta.signup": "S'inscrire",
  "common.cta.learnMore": "En savoir plus",
  "common.cta.backHome": "Retour à l'accueil",

  // Marketing — hero
  "marketing.hero.tagline": "L'OS qui transforme une marque en icône culturelle",
  "marketing.hero.subline": "Industrialisez l'accumulation de superfans, faites basculer la fenêtre d'Overton de votre secteur, devenez la référence.",
  "marketing.hero.cta_primary": "Commencer l'audit gratuit",
  "marketing.hero.cta_secondary": "Voir une démo",

  // Marketing — value props
  "marketing.value.adve.title": "ADVE-RTIS — la cascade qui propulse",
  "marketing.value.adve.body": "Une marque cohérente est la pré-condition. La cascade A→D→V→E→R→T→I→S transforme la cohérence en propulsion mesurable.",
  "marketing.value.superfan.title": "Superfans — la masse qui fait basculer",
  "marketing.value.superfan.body": "Pas des followers, des évangélistes. La Fusée mécanise leur accumulation jusqu'au seuil de masse critique.",
  "marketing.value.overton.title": "Overton — le secteur qui se redéfinit",
  "marketing.value.overton.body": "Quand votre marque déplace l'axe culturel sectoriel, le marché entier se réoriente autour de vous.",

  // Footer
  "footer.tagline": "Industry OS pour le marché créatif africain",
  "footer.copyright": "© {year} UPgraders — La Fusée",

  // Errors
  "error.404.title": "Page introuvable",
  "error.404.body": "Cette page n'existe pas — peut-être un lien obsolète ?",
  "error.500.title": "Erreur serveur",
  "error.500.body": "Quelque chose s'est mal passé. L'incident est journalisé.",
} as const;

export type FrKey = keyof typeof fr;
