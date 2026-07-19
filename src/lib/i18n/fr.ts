import { leaderboardFr } from "./pages/leaderboard";
import { parisFr } from "./pages/paris";
/**
 * Canonical FR strings — La Fusée.
 *
 * Marketing/landing keys live here; product strings stay inline in
 * components for now (most of the app is FR-only by design).
 */
export const fr = {
  ...parisFr,
  ...leaderboardFr,
  // ── Common ───────────────────────────────────────────────────────────
  "common.cta.start": "Commencer",
  "common.cta.contact": "Contacter UPgraders",
  "common.cta.signin": "Se connecter",
  "common.cta.signup": "S'inscrire",
  "common.cta.learnMore": "En savoir plus",
  "common.cta.backHome": "Retour à l'accueil",
  "common.cta.book": "Réserver un créneau",
  "common.cta.discover": "Découvrir",

  // ── Marketing — hero ─────────────────────────────────────────────────
  "marketing.hero.tagline": "L'OS qui transforme une marque en icône culturelle",
  "marketing.hero.subline": "Industrialisez l'accumulation de superfans, faites basculer la fenêtre d'Overton de votre secteur, devenez la référence.",
  "marketing.hero.cta_primary": "Commencer l'audit gratuit",
  "marketing.hero.cta_secondary": "Voir une démo",
  "marketing.hero.telemetry.signals": "Signaux observés / 24h",
  "marketing.hero.telemetry.brands": "Marques en orbite",
  "marketing.hero.telemetry.overton": "Décalages Overton mesurés",

  // ── Marketing — strip (ticker)────────────────────────────────────────
  "marketing.strip.label": "En orbite cette semaine",

  // ── Marketing — manifesto ────────────────────────────────────────────
  "marketing.manifesto.title": "Superfans × Overton — la double équation",
  "marketing.manifesto.body": "Le marketing classique optimise des conversions. La Fusée optimise la masse critique de prescripteurs et le déplacement culturel sectoriel — deux mécaniques inséparables qui font basculer le marché.",
  "marketing.manifesto.pillar.superfan": "Superfans",
  "marketing.manifesto.pillar.superfan.body": "Masse stratégique d'ambassadeurs et de prescripteurs qui produisent du travail organique pour la marque.",
  "marketing.manifesto.pillar.overton": "Overton",
  "marketing.manifesto.pillar.overton.body": "Axe culturel sectoriel — quand la marque le déplace, le secteur se redéfinit autour d'elle.",

  // ── Marketing — value (ADVE) ─────────────────────────────────────────
  "marketing.value.adve.title": "ADVE-RTIS — la cascade qui propulse",
  "marketing.value.adve.body": "Une marque cohérente est la pré-condition. La cascade A→D→V→E→R→T→I→S transforme la cohérence en propulsion mesurable.",
  "marketing.value.superfan.title": "Superfans — la masse qui fait basculer",
  "marketing.value.superfan.body": "Pas des followers, des prescripteurs. La Fusée mécanise leur accumulation jusqu'au seuil de masse critique.",
  "marketing.value.overton.title": "Overton — le secteur qui se redéfinit",
  "marketing.value.overton.body": "Quand votre marque déplace l'axe culturel sectoriel, le marché entier se réoriente autour de vous.",

  // ── Marketing — surveillance (Tarsis radar) ──────────────────────────
  "marketing.surveillance.title": "Tarsis — la veille qui ne dort jamais",
  "marketing.surveillance.body": "Quatre cibles surveillées en continu : concurrents directs, mouvements sectoriels, signaux faibles culturels, ruptures Overton. Sync temps réel avec votre cockpit.",
  "marketing.surveillance.target.competitors": "Concurrents directs",
  "marketing.surveillance.target.sector": "Mouvements sectoriels",
  "marketing.surveillance.target.signals": "Signaux faibles culturels",
  "marketing.surveillance.target.overton": "Ruptures Overton",

  // ── Marketing — apogee (6-tier ladder) ───────────────────────────────
  "marketing.apogee.title": "Apogée — l'échelle d'altitude des marques",
  "marketing.apogee.body": "Sept paliers de Latent à Icône. Chaque marque connaît exactement où elle est, quel palier vise et quelles combustions le déclenchent.",
  "marketing.apogee.tier.latent": "Latent",
  "marketing.apogee.tier.fragile": "Fragile",
  "marketing.apogee.tier.ordinaire": "Ordinaire",
  "marketing.apogee.tier.forte": "Forte",
  "marketing.apogee.tier.culte": "Culte",
  "marketing.apogee.tier.icone": "Icône",
  "marketing.apogee.cron.label": "Cron de progression — toutes les 6h",

  // ── Marketing — advertis (8-pillar radar) ────────────────────────────
  "marketing.advertis.title": "ADVERTIS — la radioscopie en 8 piliers",
  "marketing.advertis.body": "A/D/V/E pour la cohérence interne, R/T/I/S pour la propulsion externe. Score live par pilier, prescription opérationnelle dans le même mouvement.",
  "marketing.advertis.score.label": "Score composite",

  // ── Marketing — diagnostic (auto-running tools) ──────────────────────
  "marketing.diagnostic.title": "Le diagnostic se fait pendant que vous dormez",
  "marketing.diagnostic.body": "Huit outils qui s'enchaînent automatiquement à partir d'une seule entrée. À la fin, vous avez un Oracle de 35 sections — pas un rapport mort, un document vivant qui se met à jour.",

  // ── Marketing — gouverneurs (M / A / S / T / Ptah) ───────────────────
  "marketing.governors.title": "Les Neteru gouvernent l'OS",
  "marketing.governors.body": "Sept gouverneurs actifs, chacun responsable d'un sous-système. Pas de magie : un protocole. Chaque mutation traverse Mestor, chaque brief créatif passe par Artemis, chaque télémétrie remonte à Seshat, chaque dollar est validé par Thot, chaque asset est forgé par Ptah, chaque équipe est assemblée par Imhotep, chaque diffusion passe par Anubis.",
  "marketing.governors.mestor": "Mestor — Guidance",
  "marketing.governors.artemis": "Artemis — Propulsion (briefs)",
  "marketing.governors.seshat": "Seshat — Telemetry",
  "marketing.governors.thot": "Thot — Sustainment",
  "marketing.governors.ptah": "Ptah — Forge des assets",

  // ── Marketing — portails (4 decks) ───────────────────────────────────
  "marketing.portals.title": "Cinq portails, un seul OS",
  "marketing.portals.console": "Console — UPgraders",
  "marketing.portals.console.body": "Le poste de pilotage de l'agence-fixer.",
  "marketing.portals.cockpit": "Cockpit — Founders",
  "marketing.portals.cockpit.body": "La cabine de la marque qui décolle.",
  "marketing.portals.agency": "Agency — Partenaires",
  "marketing.portals.agency.body": "Le réseau d'agences qui exécutent les missions.",
  "marketing.portals.creator": "Creator — Freelancers",
  "marketing.portals.creator.body": "Les talents qui livrent à la demande.",

  // ── Marketing — pricing (3 plans) ────────────────────────────────────
  "marketing.pricing.title": "Trois étages, un même moteur",
  "marketing.pricing.tier.boot.name": "Boot",
  "marketing.pricing.tier.boot.body": "Diagnostic + Oracle initial. Pour valider que votre marque a bien quelque chose à dire.",
  "marketing.pricing.tier.orbit.name": "Orbit",
  "marketing.pricing.tier.orbit.body": "Boot + cascade ADVE-RTIS active + sentinels. Pour les marques qui veulent décoller maintenant.",
  "marketing.pricing.tier.icon.name": "Icône",
  "marketing.pricing.tier.icon.body": "Tout ce qui précède + équipe UPgraders dédiée + maintenance d'altitude. Pour les marques en régime apogée.",

  // ── Marketing — FAQ ──────────────────────────────────────────────────
  "marketing.faq.title": "Questions qui reviennent",
  "marketing.faq.q1": "Combien de temps pour un premier Oracle ?",
  "marketing.faq.a1": "48h après le quick-intake. L'Oracle continue ensuite à se mettre à jour seul.",
  "marketing.faq.q2": "Que se passe-t-il si on n'a pas de marque cohérente ?",
  "marketing.faq.a2": "On le détecte au pilier A et on remonte la cohérence avant la propulsion. Pas de placebo.",
  "marketing.faq.q3": "Pourquoi un OS plutôt qu'une agence classique ?",
  "marketing.faq.a3": "Une agence livre un projet. Un OS apprend de chaque mission et capitalise. La trajectoire est cumulative, pas séquentielle.",

  // ── Marketing — finale ───────────────────────────────────────────────
  "marketing.finale.title": "Votre secteur attend une icône. Soyez-la.",
  "marketing.finale.cta_primary": "Lancer l'audit",
  "marketing.finale.cta_secondary": "Parler à un opérateur",

  // ── Footer ───────────────────────────────────────────────────────────
  "footer.tagline": "Industry OS pour le marché créatif africain",
  "footer.copyright": "© {year} UPgraders — La Fusée",
  "footer.legal.privacy": "Confidentialité",
  "footer.legal.terms": "CGU",
  "footer.legal.contact": "Contact",

  // ── Errors ───────────────────────────────────────────────────────────
  "error.404.title": "Page introuvable",
  "error.404.body": "Cette page n'existe pas — peut-être un lien obsolète ?",
  "error.500.title": "Erreur serveur",
  "error.500.body": "Quelque chose s'est mal passé. L'incident est journalisé.",
  "error.503.title": "Service en maintenance",
  "error.503.body": "On rétablit ça. Les sentinels sont déjà sur le coup.",

  // ── Phase 13 — Oracle 35-section UI (R6 closure) ─────────────────────
  // PtahForgeButton + sections distinctives + dormantes
  "oracle.forge.button.image": "Forger image",
  "oracle.forge.button.video": "Forger vidéo",
  "oracle.forge.button.audio": "Forger audio",
  "oracle.forge.button.icon": "Forger icône",
  "oracle.forge.button.design": "Forger deck",
  "oracle.forge.button.pending": "Forge en cours…",
  "oracle.forge.dialog.title": "Confirmer la matérialisation Ptah",
  "oracle.forge.dialog.cancel": "Annuler",
  "oracle.forge.dialog.confirm": "Confirmer la forge",
  "oracle.forge.result.heading": "Dernière forge",
  "oracle.forge.result.async_note":
    "AssetVersion sera disponible une fois le webhook provider reconcilié (PTAH_RECONCILE_TASK async). Voir BrandVault → assets matériels.",
  "oracle.section.empty": "Section non encore générée. Lancez l'assemblage de la proposition.",
  "oracle.tier.core": "Core (23)",
  "oracle.tier.big4": "Big4 baseline (7)",
  "oracle.tier.distinctive": "Distinctifs (5)",
  "oracle.tier.dormant": "Dormants (2)",
  "oracle.dormant.imhotep.title": "Crew Program — Imhotep (pré-réservé)",
  "oracle.dormant.imhotep.activation": "Activation Phase 7+ (matching talent, formation Académie).",
  "oracle.dormant.anubis.title": "Plan Comms — Anubis (pré-réservé)",
  "oracle.dormant.anubis.activation": "Activation Phase 8+ (broadcast, paid + earned media, ad-networks).",
  "oracle.dormant.cap_warning":
    "Sortie partielle Oracle-only — cap 7 BRAINS respecté. Section affiche un placeholder en attendant l'activation complète.",

  // ── Navigation cockpit — groupes + piliers (i18n) ────────────────────
  "nav.group.fondation": "Marque — Fondation",
  "nav.group.strategie": "Marque — Stratégie",
  "nav.pillar-a.name": "Authenticité (A)",
  "nav.pillar-a.role": "Identité",
  "nav.pillar-d.name": "Distinction (D)",
  "nav.pillar-d.role": "Positionnement",
  "nav.pillar-v.name": "Valeur (V)",
  "nav.pillar-v.role": "Offre & Pricing",
  "nav.pillar-e.name": "Engagement (E)",
  "nav.pillar-e.role": "Expérience",
  "nav.pillar-r.name": "Risque (R)",
  "nav.pillar-r.role": "Diagnostic",
  "nav.pillar-t.name": "Tracking (T)",
  "nav.pillar-t.role": "Réalité Marché",
  "nav.pillar-i.name": "Innovation (I)",
  "nav.pillar-i.role": "Potentiel",
  "nav.pillar-s.name": "Stratégie (S)",
  "nav.pillar-s.role": "Stratégie",
  "nav.jehuty": "La Gazette",
  "nav.jehuty.sub": "Veille & signaux",
  "nav.notoria": "Recommandations",
  "nav.notoria.sub": "Moteur de recommandation",

  // ── Nav cockpit founder — lot 10 (audit UX 2026-07-11 §B) ─────────────
  "nav.dashboard": "Tableau de bord",
  "nav.group.marque": "Ma marque",
  "nav.group.livrables": "Mes livrables",
  "nav.group.activite": "Mon activité",
  "nav.group.marche": "Mon marché",
  "nav.group.compte": "Mon compte",
  "nav.fondation": "Fondation",
  "nav.fondation.sub": "Les 4 piliers fondateurs",
  "nav.strategie": "Stratégie",
  "nav.strategie.sub": "Du diagnostic au plan",
  "nav.proposition": "L'Oracle",
  "nav.proposition.sub": "Votre stratégie complète",
  "nav.livrables": "Livrables",
  "nav.livrables.sub": "Chartes · Assets · Exports",
  "nav.sources": "Sources",
  "nav.sources.sub": "Vos documents & données",
  "nav.campagnes": "Campagnes",
  "nav.campagnes.sub": "Suivi de vos campagnes",
  "nav.calendrier": "Calendrier",
  "nav.calendrier.sub": "Lancements & actions",
  "nav.inbox": "Boîte de réception",
  "nav.inbox.sub": "Commentaires & messages reçus",
  "nav.publier": "Publier",
  "nav.publier.sub": "Publier sur vos réseaux",
  "nav.social-perf": "Performance sociale",
  "nav.social-perf.sub": "Vos réseaux en chiffres réels",
  "nav.connexions": "Connexions",
  "nav.connexions.sub": "Réseaux · Boutique · Comptes",
  "nav.operations": "Suivi du jour",
  "nav.operations.sub": "Votre activité aujourd'hui",
  "nav.resultats": "Résultats",
  "nav.resultats.sub": "Performance des campagnes",
  "nav.newsletter": "Newsletter",
  "nav.newsletter.sub": "Vos envois & abonnés",
  "nav.demandes": "Demandes",
  "nav.demandes.sub": "Demandes à votre équipe",
  "nav.overton": "Radar sectoriel",
  "nav.overton.sub": "Votre position dans le secteur",
  "nav.previsions": "Prévisions",
  "nav.previsions.sub": "Projections vérifiables de vos données",
  "nav.releve": "Relevé de valeur",
  "nav.releve.sub": "Ce qui a bougé, mois par mois",
  "nav.market-studies": "Études de marché",
  "nav.market-studies.sub": "Vos études ingérées",
  "nav.communaute": "Communauté",
  "nav.communaute.sub": "Superfans & engagement",
  "nav.rapports": "Rapports & analyses",
  "nav.rapports.sub": "Santé · Benchmarks · Attribution",
  "nav.abonnement": "Abonnement",
  "nav.reglages": "Réglages",
  "nav.messages": "Messages",

  // ── Landing — barre de navigation ────────────────────────────────────
  "landing.nav.manifesto": "Manifeste",
  "landing.nav.method": "Méthode",
  "landing.nav.apogee": "APOGEE",
  "landing.nav.governors": "Gouverneurs",
  "landing.nav.portals": "Portails",
  "landing.nav.pricing": "Tarifs",
  "landing.nav.championnat": "Le championnat",
  "landing.nav.paris": "Les paris",
  "landing.nav.login": "Connexion",
  "landing.nav.cta": "Diagnostic gratuit — 15 min",
  "landing.nav.space": "Mon espace",

  // ── Réglages — langue (toggle international) ──────────────────────────
  "settings.language.title": "Langue de l'interface",
  "settings.language.desc": "La Fusée se présente au marché international — basculez l'interface en français, anglais ou chinois.",
  "locale.fr": "Français",
  "locale.en": "English",
  "locale.zh": "中文",
  "locale.toggle.aria": "Changer de langue",
} as const;

export type FrKey = keyof typeof fr;
