# Recette des promesses publiques — F16 (11 novembre 2026)

**Version 6.27.560, branche `claude/promesses-publiques`.** Point F16 du
programme Shinkiro (`docs/INVENTAIRE-POINTS-OUVERTS.md`, MATURITE l. 296-301,
manifeste de flotte) : « les autres promesses publiques restent ouvertes ».

Une promesse publique est une affirmation qu'une page accessible **sans
connexion** fait sur ce que La Fusée fait, garantit ou coûte. Chacune est ici :

- **reçue** : vraie, avec sa preuve (code, test ou recette antérieure citée) ;
- **corrigée** : fausse ou invérifiable, le texte dit désormais ce qui est vrai,
  sans fonction nouvelle fabriquée pour coller à la promesse ;
- **ouverte** : ce n'est ni au code ni à cette recette d'en décider — fait
  d'entreprise, engagement de service humain, clause contractuelle sans fait
  technique faux, ou durée à mesurer. Le propriétaire tranche (liste finale).

Cette recette lit le code et les réceptions existantes. Elle ne remplace ni la
lecture native des pages en production, ni un cycle client complet (F15).

## Périmètre

Pages publiques = toute route de `src/app` hors des préfixes protégés par
`src/proxy.ts:88-101` (`/cockpit`, `/creator`, `/console`, `/agency`,
`/portals`, `/launchpad`). **53 pages** :

- `(marketing)` 13 : `/`, `/agence`, `/blog`, `/blog/[slug]`, `/contact`,
  `/la-guilde`, `/lafusee`, `/landingintake` (redirection 308 vers `/lafusee`),
  `/methode`, `/pricing`, `/realisations`, `/services`, `/tarifs`.
- `(public)` 21 : `/LaGuilde` (+ `m/[slug]`, `mes-missions`, `publier`,
  `rejoindre`, `services`), `/argos`, `/argos/[ref]`, `/certificat/[hash]`,
  `/cgu`, `/cgv`, `/changelog`, `/data-deletion`, `/dpa`, `/mentions-legales`,
  `/paris`, `/passeport/[token]`, `/privacy`, `/sla`, `/status`, `/trust-center`.
- `(intake)` 7 : `/intake`, `/intake/[token]`, `…/ingest`, `…/ingest-plus`,
  `…/short`, `…/result`, `/score`. `(public-brand)` 1 : `/b/[slug]`.
  `(shared)` 2 : `/shared/guidelines/[token]`, `/shared/strategy/[token]`.
- `(auth)` 4 : `/login`, `/register`, `/forgot-password`, `/reset-password`.
- Racine 5 : `/leaderboard`, `/scorer`, `/sales/[token]`, `/talk/[publicId]`,
  `/unauthorized`.

**Exclues** : les sept fonctions publiques déjà reçues en 403 — les sept
onglets « Gouverneurs » de `/lafusee` (`src/components/landing/marketing-gouverneurs.tsx`,
CHANGELOG 6.27.403 : rôles, aide IA facultative, résultats à recevoir).
Le contenu éditorial des articles de blog n'est pas une promesse produit.
`/unauthorized`, `/login`, `/register`, `/reset-password`, `/b/[slug]`,
`/shared/*`, `/argos/[ref]` et `/LaGuilde/m/[slug]` ne portent pas de
promesse au-delà de celles recensées sur leur page parente.

## Preuves de référence

| Réf | Fait établi | Source |
|---|---|---|
| P1 | Durée de génération mesurée à **364 358 ms** (≈ 6 min) en local, sur un import, contre « 30–60 s » affichés | réception MVP03/508 (CLAUDE.md, RESIDUAL-DEBT M05) |
| P2 | Le diagnostic gratuit trace un radar des **4** piliers ADVE et un /100 de **complétude** | `src/app/(intake)/intake/[token]/result/page.tsx:797`, i18n `intakeResult.radar.after` |
| P3 | Force publique /200 affichée seulement quand une mesure existe (`status === "OK"`) | `src/app/(intake)/intake/[token]/result/force-section.tsx:43` |
| P4 | Score /25 par pilier, /200 sur 8 piliers, sans IA | `src/lib/utils/scoring.ts:36-40`, test `scoring-base-canon` |
| P5 | Six paliers, bandes du canon | `src/domain/brand-tier.ts:25-50` |
| P6 | Paliers officiels franchis un à la fois, rétrogradation gouvernée | ADR-0167, test `brand-tier-transition-wired` |
| P7 | CULTE/ICONE plafonnés sans preuves de communauté | `src/server/services/advertis-scorer/evidence.ts:32-42` |
| P8 | Vigies existantes : MAINTAIN_APOGEE (ICONE), DEFEND_OVERTON (sur signal), EXPAND_TO_ADJACENT_SECTOR | `src/app/api/cron/sentinels/route.ts:1-14` ; aucune autre « cron » |
| P9 | Affectation talent = proposition à confirmer ; paliers talents proposés au Fixer | `src/server/services/talent-engine/index.ts:7`, 7 fonctions reçues 403 |
| P10 | Production sur VPS Coolify (Hostinger), base PostgreSQL auto-hébergée, depuis le 5 juillet 2026 ; Vercel purgé (#460) | `docs/deploy/DATABASE.md:1-20`, `scope-drift.md` #460 |
| P11 | Configurations des connecteurs stockées en JSON non chiffré | `src/server/services/anubis/credential-vault.ts:6-8,72-81` |
| P12 | Originaux, médias archivés, jetons OAuth chiffrés AES-256-GCM | `src/lib/encrypted-media-store.ts:21`, `src/server/services/oauth-integrations/index.ts:308` |
| P13 | Le journal conserve l'entrée de chaque opération (`payload` = input), ex. `displayName`, `payoutPhone` | `src/server/governance/emission-spine.ts:157-204`, `src/server/trpc/routers/laguilde.ts:359-365` |
| P14 | La purge d'une personne ne touche pas le journal | `src/server/services/seshat/identity-graph/index.ts:284-297` |
| P15 | Aucun calcul d'avoir SLA, aucune file priorisée par plan ; plans Embarquement/Starter/Pro/Group absents de la facturation | recherche négative `slaPenalt\|creditNote\|priorityByPlan` ; `src/server/services/canon/lafusee-canon.ts:316` |
| P16 | Abonnement : provider en ligne d'abord, sinon demande WhatsApp `pending_manual` sans droit avant validation | `src/components/marketing/pricing-grid.tsx:57-85`, test `manual-payment-surface` |
| P17 | CinetPay réel refusé (INVALID_CREDENTIALS) ; paiement PSP réel non reçu | réception 513 |
| P18 | Commissions = part talent par palier de talent (60–75 %, plafond 85 %) | `src/server/services/commission-engine/index.ts:9-25` |
| P19 | Inscription La Guilde ouverte, aucun statut de vérification du profil | `prisma/schema.prisma` `TalentProfile` (seul `tier`) |
| P20 | 634 Intent kinds, 634 avec SLO ; 243 ADR ; dépôt public | recompte du 11 novembre 2026 ; `gh api repos/xtincell/ADVE-project` |
| P21 | Transport email de production non reçu (`provider=log` relevé en 509) | RESIDUAL-DEBT M04 |

## Recette par page

Statut : **R** reçue · **C** corrigée · **O** ouverte (décision du propriétaire
ou mesure à recevoir, voir la liste finale).

### `/lafusee` (produit)

| # | Promesse avant | Preuve | Statut | Texte vrai / emplacement |
|---|---|---|---|---|
| 1 | Métadonnées : « diagnostic gratuit en 15 minutes, verdict immédiat, radar 8 piliers » | P1, P2 | C | `src/app/(marketing)/lafusee/page.tsx:21-25` |
| 2 | Bandeau « SYSTEM · NOMINAL » (statique) | aucune lecture d'état | C | lien « ÉTAT DU SERVICE » vers `/status`, `marketing-hero.tsx:46` |
| 3 | Bandeau « DIAGNOSTIC GRATUIT · 15 MIN » | P1 | C | « DIAGNOSTIC GRATUIT » |
| 4 | Compteur « N marques diagnostiquées » | `trpc.quickIntake.getCompletedCount` (réel) | R | — |
| 5 | « Abidjan · Douala · Dakar · Lagos » | fait d'entreprise ; le site dit ailleurs « 2 hubs — Douala · Abidjan » | O | — |
| 6 | « Le rapport tombe en 15 minutes — score /200, radar 8 piliers… puis l'OS prend le relais : stratégie écrite, missions en production, freelances qui livrent » | P1, P2, P3, P9 | C | `marketing-hero.tsx:74` |
| 7 | « gratuit · 15 min · sans engagement · PDF brandé en option payante » | gratuit et PDF payant : test `intake-report-access.postgres` (PDF impayé 402) ; 15 min : P1 | C | « questionnaire ~10 min, durée indicative », `marketing-hero.tsx:95` |
| 8 | Constantes 8 piliers / 35 sections / 6 paliers / échelle /200 | P4, P5, test `oracle-section-coherence` | R | clé « piliers.scannés » → « piliers.méthode », `:115` |
| 9 | Bandeau défilant : diagnostic en 15 min, missions dispatchées, chaque dépense validée, diffusion orchestrée, axe suivi | P1, P8, P9, P16 | C | `marketing-strip.tsx:11-21` ; « 8 piliers /25 » reçu (P4) |
| 10 | « Indice d'attachement mesuré post-déploiement. Overton deflection chiffrée par secteur » | indice calculé seulement sur communauté mesurée (ADR-0134) | C | `marketing-manifesto.tsx:40` |
| 11 | Écarts « −42 / −58 / −51 /100 vs benchmark », « secteurs suivis en continu » | aucune étude ni mesure | C | lettre du pilier en tension, « illustration · aucune mesure », `marketing-surveillance.tsx:10-28,118` |
| 12 | Colonnes « CRON · DEFEND_LEGACY / STABILIZE_BASE / DETECT_PULSE / EXPAND_SECTOR », « sentinelles cron » | P8 | C | seule « VIGIE · MAINTIEN DU PALIER » sur ICONE, `marketing-apogee.tsx:12-19` |
| 13 | Critères « NPS > 70 », « pricing +20 % », « Overton déflecté » | non appliqués par `classifyTier` (P5) ; P7 | C | bandes + « preuves de communauté mesurées » |
| 14 | « Aucune marque ne saute de palier » | P6 | R | reformulé, `marketing-apogee.tsx:41` |
| 15 | « Une seule direction » / « aucune ne reste au sol si elle accepte la doctrine » | rétrogradation possible (P6) ; résultat non mesurable | C | « aucune régression silencieuse » |
| 16 | « Trouver ton palier en 15 min » | P1 | C | « Estimer ton palier — diagnostic gratuit », `:87` |
| 17 | Score déterministe sur 8 piliers | P4 | R | — |
| 18 | « Le vrai diagnostic prend 15 minutes » | P1, P2 | C | `marketing-advertis.tsx:113` |
| 19 | « 15 minutes plus tard, le verdict » ; « scanne 8 piliers » | P1, P2 | C | `marketing-diagnostic.tsx:61-64` |
| 20 | Exemple luxorhotels.ci / 115/200 présenté sans mention fictive, « FORTE atteignable en un cycle » | exemple inventé | C | « exemple fictif », conclusion neutre |
| 21 | « Production (stratégie écrite, missions, livrables) = 48h », « verdict immédiat » | aucun cycle reçu (F15) ; P1 | C | `marketing-diagnostic.tsx:154` |
| 22 | Cockpit : « radar 8 piliers en temps réel », « KV générés par l'OS », « stratégie qui se met à jour seule » | recalcul à l'écriture (`writePillarAndScore`) ; forge réelle non reçue (F5) ; actualisation demandée (ADR-0085, 0137) | C | `marketing-portails.tsx:10` |
| 23 | Console : « zéro mutation hors gouvernance », « audit trail immuable » | allowlists et C3 existants ; journal chaîné vérifiable (ADR-0124) | C | « journal chaîné… consultable et vérifiable » |
| 24 | Creator : « missions matchées automatiquement », « paiement mobile money à la livraison » | P9 ; versements différés sans clés | C | — |
| 25 | Agency : « broadcast Meta / Google / X / TikTok / email / SMS », « Credentials Vault sécurisé », « commissions tracées automatiquement » | publication X/TikTok non supportée (ADR-0133) ; P11 ; P21 | C | — |
| 26 | La Guilde : « consultable sans compte », « modération avant mise en ligne » | `publicProcedure listOpenMissions` ; `GUILD_PUBLISH_MISSION` (ADR-0098) | R | « Façade publique d'Imhotep » remplacé |
| 27 | Tarifs RAMPE 01 : « rapport web en 15 min », « Radar 8 piliers », « 1 plan d'action priorisé » | P1, P2 ; aperçu limité à 2 recommandations (`INTAKE_FREE`) | C | `marketing-pricing.tsx:8-11` |
| 28 | RAMPE 01 : « sans appel commercial » | une fiche prospect est créée dans le CRM ; l'absence d'appel est un engagement humain | O | — |
| 29 | RAMPE 02 : « 35 sections qui se mettent à jour seules », « premiers livrables 30 jours, palier 90 jours » | ADR-0137 (balayage nocturne des sections périmées, production 538 : 0/35 à jour) ; F15 | C | `marketing-pricing.tsx:15-17` |
| 30 | RAMPE 03 : « veille sentinelle continue » | P8, cadence de production non reçue | C | « vigies sur les signaux disponibles » |
| 31 | RAMPE 03 : « Account dédié, lead direct », « orbite ICONE, cycle annuel » ; titre « un état final mesuré » | engagements de service | O | — |
| 32 | FAQ : « chaque franc passe par un verrou », « tracée à vie » | contrôle de coût des opérations gouvernées (ADR-0124) | C | `marketing-faq.tsx:9-13` |
| 33 | FAQ : rapport en 15 minutes, livrables sous 30 jours | P1, F15 | C | — |
| 34 | FAQ : « cinq verrous… confiance < 0.5 → revue obligatoire » | seuil non retrouvé ; origines des champs affichées (ADR-0231) | C | — |
| 35 | FAQ : « sans dispatch humain — l'OS apparie, compose l'équipe, route le QC » | P9 | C | — |
| 36 | FAQ : « briefs chiffrés au repos », « aucun cross-tenant possible, invariant testé » | P10, P12 ; test `strategy-ownership-guard` | C | — |
| 37 | FAQ : délais superfans 60–120 j, 90–180 j, 6–12 mois | aucun cycle mesuré | C | — |
| 38 | FAQ : définition ADVE/RTIS, cascade unidirectionnelle | gate `RTIS_CASCADE`, `src/server/governance/pillar-readiness.ts:229` | R | — |
| 39 | Finale : « 15 min, 30 jours, 90 jours » | P1, F15 | C | `marketing-finale.tsx:23,34` |
| 40 | Modal : « rien n'est envoyé sans votre accord » (affiché après envoi) | `diagnostic-modal.tsx:51-61` POST `/api/contact` | C | « transmis à l'équipe UPgraders », `:90` |
| 41 | Modal : « jamais partagées » ; « Diagnostic offert · 15 min » | traitement IA par sous-traitant (`/privacy`) ; P1 | C | `:126` |
| 42 | Newsletter : « hebdo » | cadence éditoriale ; transport non reçu (P21) | O | — |
| 43 | Newsletter : « désinscription en un clic, à chaque envoi » | `List-Unsubscribe-Post` One-Click, `src/server/trpc/routers/crm-contacts.ts:28`, `/api/newsletter/unsubscribe` | R | — |

### Site agence (`/`, `/methode`, `/services`, `/tarifs`, `/agence`, `/realisations`, `/contact`, `/la-guilde`)

| # | Promesse | Preuve | Statut | Emplacement |
|---|---|---|---|---|
| 44 | « Industry OS qui automatise la méthode ADVE/RTIS » | ADVE par décision humaine (ADR-0085) | C | `src/components/upgraders/blocks.tsx:42` |
| 45 | « la seule offre qui se pilote seule », « un produit se pilote seul » | idem | C | `src/components/upgraders/data.ts:264`, `(marketing)/tarifs/page.tsx:54` |
| 46 | « Diagnostic ADVE gratuit (score /200) » | P2, P3 | C | `data.ts:302` |
| 47 | Roadmap S « un système qui apprend » | recalcul à la demande | C | `data.ts:178` |
| 48 | « diagnostic gratuit en quinze minutes — score /200, radar, plan » | P1, P2, P3 | C | `(marketing)/services/page.tsx:108`, `tarifs/page.tsx:54` |
| 49 | « tient la roadmap à jour » | recalcul S demandé (`recalculateSynthesis`) | C | `services/page.tsx:91` |
| 50 | Oracle « qui se met à jour à chaque cycle » | ADR-0137, production 538 | C | `(marketing)/methode/page.tsx:90` |
| 51 | « Réexécutable, versionnable » ; ADVE « mutable uniquement par décision » ; cascade qui ne propulse pas sans socle | `PillarVersion`, ADR-0023/0085, `pillar-readiness.ts:229` | R | — |
| 52 | « Scorer ma marque · 1 min » | durée non mesurée | C | « ~1 min », `(marketing)/page.tsx:97` |
| 53 | EFR : palier, score, horizon « gelés et tracés à la signature », « journal immuable », « quatre recours » | aucun mécanisme de gel dans le code (recherche négative `EFR\|frozenAt`) ; engagement contractuel | O | — |
| 54 | Faits d'entreprise : fondation 2017, équipe, clients, « 30+ marques », hubs, marchés, réponse « sous 24 h », première conversation gratuite | hors code | O | — |
| 55 | Prestations : durées d'audit (2–4 semaines), mandat (6–24 mois), « boussole 18 mois », conciergerie Sérénité (escrow, mobile money), Friends Studio | engagements de service ; `escrow-arbitration` existe, versements différés sans clés | O | — |

### `/pricing` (grille La Fusée)

| # | Promesse | Preuve | Statut | Emplacement |
|---|---|---|---|---|
| 56 | Prix par zone, déterministes | `payment.getTierGrid` → `buildTierGrid`/`resolvePrice` (`src/server/trpc/routers/payment.ts:266`) | R | « calculés à chaque affichage », `pricing-grid.tsx:101` |
| 57 | « Mobile money (CinetPay) en zone FCFA, carte (Stripe/PayPal) à l'international » | P16, P17 | C | moyens activés, sinon WhatsApp validé par l'équipe, `:101-105` |
| 58 | « Chaque devis et chaque paiement sont tracés » | aucun devis sur ce parcours ; demandes et paiements enregistrés | C | — |
| 59 | Bouton « Payer via WhatsApp » alors que le parcours tente d'abord le paiement en ligne | P16 | C | « S'abonner », `:211` |
| 60 | Cycles FCFA de 30 jours sans prélèvement silencieux ; Stripe annulable à fin de période | `subscription-cycles.ts` (`CYCLE_DAYS = 30`), `stripe-subscription.ts:89` | R | — |
| 61 | « Commissions Hub-Escrow dégressives avec votre palier (20 % → 8 %) » | P18 | C | phrase retirée, `:234` |
| 62 | Inclusions gratuites (`INTAKE_FREE`) | `pricing-tiers.ts:56-62`, déjà honnêtes | R | — |
| 63 | Inclusions payantes : Oracle « mises à jour pendant 30 jours » ; Cockpit « cult index live » ; Retainer « 4 cycles/mois », « rapport mensuel livré », vigies, sessions 2/mois, supports 48 h / 24 h / 24-7, 5 marques, SLA contractuel, account manager | service humain ou mécanisme non planifié en production (cron ops non reçus, F1) | O | `src/server/services/monetization/pricing-tiers.ts:83-172` |
| 64 | Oracle 35 sections livré au paiement | `fulfillPaidIntakeReport` → `ASSEMBLE_ORACLE scope=ALL` | R | — |

### Parcours de diagnostic (`/intake`, `/score`, `/scorer`, `/leaderboard`)

| # | Promesse | Preuve | Statut | Emplacement |
|---|---|---|---|---|
| 65 | « Mesurez la force de votre marque en 15 minutes », badge « 15 min » (FR/EN/ZH) | P1 | C | « 15 minutes environ », « ~15 min (indicatif) », `intake-entry.ts:19,24` + EN/ZH |
| 66 | « Gratuit » | `INTAKE_FREE.amountSpu = 0` | R | — |
| 67 | « Vos données … ne seront jamais partagées sans votre accord explicite » | traitements IA par sous-traitant, sans case de consentement | C | `intake-entry.ts:80` + EN/ZH |
| 68 | Socle /100 puis score /200 mesuré sur épreuves | P2, P3 | R | — |
| 69 | Durées des méthodes « ~10 min », « ~3-5 min » | estimations jamais mesurées | O | mesure à recevoir |
| 70 | Parrainage : « −20 % sur le premier cycle, un mois offert au parrain » | ADR-0157, appliqué à la main par l'opérateur (`src/server/services/referral/index.ts:1-9`) | R | — |
| 71 | Collecte de l'empreinte publique avant le rapport | `quick-intake/web-footprint.ts` | R | — |
| 72 | « Analyse en cours… (30-60 sec) », « Cela prend généralement 30 à 60 secondes » | P1 | C | `intake-entry.ts:153`, `intake-result.ts:398` + EN/ZH |
| 73 | EN/ZH : « your full brand score /200 then builds up in your workspace » sous le /100 | contredit le FR et P2 | C | `intake-result.ts:495-496`, `:859-860` |
| 74 | « Voici la force qu'elle révèle — le score complet /200 » affiché même sans force | P3 | C | phrase portée par `force-section.tsx:54` |
| 75 | Limite d'import 10 Mo par fichier | `ingest/page.tsx:27` | R | — |
| 76 | `/score` : « Questionnaire ~15 min · Verdict immédiat » | P1 | C | `(intake)/score/page.tsx:188` |
| 77 | `/score` : « chaque pilier /25, total /200 », « le gratuit mesure le socle ADVE /100 » | P2, P4 | R | — |
| 78 | Scoreur : « score gratuit · sans email » | `footprint.scoreInstant` (`publicProcedure`, aucun champ email) | R | — |
| 79 | Scoreur : « en une minute » (FR/EN/ZH, classement, accueil) | durée de scan frais non mesurée | C | « une minute environ » / « ~1 min », `scorer.ts:21,24`, `leaderboard.ts:16,20,84-89,152-157` ; mesure ouverte |
| 80 | Classement : « se remplit dès qu'une marque est mesurée par une épreuve validée par un opérateur » | réceptions 515/516/517 | R | — |

### `/status`, `/changelog`

| # | Promesse | Preuve | Statut | Emplacement |
|---|---|---|---|---|
| 81 | « Opérationnel » : base injoignable comptée 0 → 100 % ; zéro activité → 100 % | `.catch(() => 0)` et `successRate = 100` avant correctif | C | `derivePublicStatus`, `src/lib/public-status.ts`, `status/page.tsx:42` ; « Non mesuré » + raison |
| 82 | Paiement « ✓ actif » dès que les clés sont posées | P17 | C | « configuré », `:130` |
| 83 | « Mise à jour : à la minute » | `revalidate = 60` | R | — |
| 84 | Changelog « mis à jour automatiquement (cron horaire) » | page `force-static`, régénérée au build | C | `changelog/page.tsx:73` |

### `/trust-center`

| # | Promesse | Preuve | Statut | Emplacement |
|---|---|---|---|---|
| 85 | Notifications SSE avec reprise, émissions best-effort | ADR-0025, `/api/notifications/stream` | R | — |
| 86 | Webhooks idempotents, re-vérification fournisseur | test `cinetpay-proof.postgres` (réception 513) | R | — |
| 87 | Verrous à TTL sur les sections d'Oracle | ADR-0068, service `oracle-section` | R | — |
| 88 | Reprises IA bornées, sans repli implicite | réception 480 | R | — |
| 89 | Oracle 35/35 sans LLM ; « un incident IA ne bloque jamais une livraison » | ADR-0091, test `deterministic-composers` ; les traitements assistés attendent le service | C | `trust-center/page.tsx:51` |
| 90 | Connecteurs sans clés : statut différé explicite | ADR-0021 | R | — |
| 91 | « ~480 types d'opérations », chacune avec SLO | P20 | C | « plus de 600 (634 au 11 novembre 2026) », `:67` |
| 92 | « plus de 1 900 tests », « 90+ ADR publics » | 5 722 tests unitaires (558), P20 | R | — |
| 93 | Isolation default-deny, agrégats k ≥ 5 | test `strategy-ownership-guard` ; `campaign-tracker/agency-economics.ts:30` | R | — |
| 94 | « TLS 1.2+ partout » | configuration d'infrastructure, hors code | O | — |
| 95 | « Chiffrement au repos AES-256 (PostgreSQL managé) » | P10, P12 | C | `:96` ; chiffrement du disque à attester |
| 96 | bcrypt 12 rounds ; TOTP exigible pour les administrateurs ; clés API en SHA-256 ; secrets en variables d'environnement | `auth.ts:36`, `src/lib/auth/config.ts:65-79`, ADR-0075 | R | — |
| 97 | « Coffre applicatif chiffré » pour les connecteurs | P11 | C | `:100` |
| 98 | « Sauvegardes automatiques (fournisseur managé) » | P10 ; restauration complète non éprouvée (F12) | C | `:108` |
| 99 | Réversibilité : export à tout moment, portabilité 90 jours | route `/api/export/[strategyId]` existe ; accès cockpit et délai non reçus | O | — |
| 100 | Journal « sans exposer de données personnelles en clair » | P13 | C | `:110` |

### Textes juridiques (`/privacy`, `/dpa`, `/sla`, `/cgv`, `/cgu`, `/mentions-legales`, `/data-deletion`)

Seuls les faits techniques faux sont corrigés ; la portée contractuelle reste
au propriétaire.

| # | Clause | Preuve | Statut | Emplacement |
|---|---|---|---|---|
| 101 | Privacy : pas de revente, pas de traceur publicitaire ni d'analytics sans accord | aucun script analytics/publicitaire dans le code | R | — |
| 102 | Privacy / CGU / data-deletion : jetons sociaux AES-256-GCM, révocables ; la déconnexion purge le jeton | P12, `anubis/social-connect.ts:679-681` | R | — |
| 103 | Privacy : « chiffrement AES-256 au repos (base et sauvegardes) », TLS 1.2+ | P10 : plus de fournisseur managé ; preuve d'hébergement absente | O | — |
| 104 | Privacy / DPA : journal d'audit conservé 5 ans | aucune purge programmée (aucune entrée n'a encore 5 ans) | O | — |
| 105 | DPA §5 : « infrastructure Supabase/PostgreSQL managée » | P10 | C | `dpa/page.tsx:94` ; engagement AES-256 conservé, attestation ouverte |
| 106 | DPA §5 : credentials « stockés chiffrés dans un coffre applicatif » | P11 | C | `:95` |
| 107 | DPA §5 : bcrypt, TOTP, cloisonnement par espace | ligne 96 ci-dessus, `strategy-ownership-guard` | R | — |
| 108 | DPA §6 : journal « ne contient jamais de données personnelles », effacement qui coexiste « sans exception » | P13, P14 | C | `:104` ; outillage d'effacement ouvert |
| 109 | DPA §7 : sous-traitants Vercel, Supabase, Mailgun | P10 ; liste contractuelle | O | — |
| 110 | DPA §8-9 : portabilité 90 jours, export depuis le Cockpit, notification 72 h | engagements de service | O | — |
| 111 | SLA : délais garantis des livrables automatiques (brief, KV, vidéo, Oracle) par plan | forge réelle non reçue (F5) ; plans absents de la facturation (P15) | O | — |
| 112 | SLA : pénalités « imputées automatiquement » | P15 | C | « imputés par UPgraders sur constat », `sla/page.tsx:57` |
| 113 | SLA : file priorisée par plan, notification du régime dégradé | P15 | O | — |
| 114 | SLA : constat « mécanique, lisible par le client » | horodatages journalisés, aucune vue SLA | C | `:73` |
| 115 | CGV : prix « en temps réel » avec fiscalité ; devis qui fige les paramètres d'indices ; plans nommés ; CinetPay ; Hub-Escrow, matching sous SLA | P15, P17 ; pas de devis figé sur l'abonnement | O | — |
| 116 | CGV §7 : relevé mensuel MCP qui fait foi | ADR-0092 (metering, relevés gelés) | R | — |
| 117 | CGU : « aucun automatisme, IA comprise, ne modifie le noyau sans amendement opérateur » | doctrine 538 : propositions INFERRED écrites puis vérifiées | O | — |
| 118 | Mentions légales : hébergement Vercel Inc. + Supabase | P10 | C | Hostinger/Coolify, `mentions-legales/page.tsx:52` ; adresse de l'hébergeur à compléter |
| 119 | Data-deletion : traitement sous 30 jours | engagement de service | O | — |

### La Guilde, passeport, paris, certificat, vente publique, authentification

| # | Promesse | Preuve | Statut | Emplacement |
|---|---|---|---|---|
| 120 | `/LaGuilde` : « La Fusée orchestre … les paiements en mobile money » | versements différés sans clés | C | `LaGuilde/page.tsx:21` |
| 121 | `/LaGuilde/publier` : candidatures de talents « vérifiés » | P19 | C | `publier/page.tsx:11` |
| 122 | `/LaGuilde/rejoindre` : « soyez payés en mobile money » | idem | C | `rejoindre/page.tsx:13` |
| 123 | Compte marque gratuit pour publier ; mission relue avant mise en ligne | `auth.register`, `GUILD_PUBLISH_MISSION` | R | — |
| 124 | Passeport : statut gagné par des actes constatés ; client parrainé = preuve qui fait monter le statut | ADR-0141, `referral/index.ts:109-155` (gate `RECOMMENDED`) | R | — |
| 125 | Passeport : « la marque vous remercie directement » | geste opérateur | O | — |
| 126 | Paris : échéance et verdict (HIT/MISS/UNRESOLVED) publics | ADR-0159, `listPublicPledges` | R | — |
| 127 | Certificat : authentique ou inconnu, sans montant ni données personnelles | `certificat/[hash]/page.tsx:19-27` (nom, date, palier) | R | — |
| 128 | Entrée publique de vente `/talk`, `/sales` : l'équipe confirme conditions et paiement | ADR-0238/0240, test `crm-sales-public-entry` | R | — |
| 129 | Mot de passe oublié : indisponibilité dite quand aucun envoi n'est possible | réception 511 | R | — |

## Décompte

**129 promesses** recensées sur 53 pages : **39 reçues**, **69 corrigées**,
**21 ouvertes** — 20 pour décision du propriétaire, 1 durée à mesurer (les
estimations « ~10 min » / « ~3-5 min » des méthodes de l'intake). La durée du
scoreur, corrigée en « une minute environ », reste aussi à mesurer
(RESIDUAL-DEBT).

## Tests

- `tests/unit/governance/public-promises.test.ts` (nouveau) : verrou des
  formules retirées sur 80 fichiers publics, et trois gardes de `/status`.
  Avant correction : 4 rouges sur 5, 72 occurrences relevées. Après : 5/5.
  Contre-épreuve : « gratuit · 15 min » réintroduit dans la finale et
  `.catch(() => 0)` dans `/status` → 2 rouges sur 5 ; restauration exacte → 5/5.
- `tests/unit/lib/public-status.test.ts` (nouveau) : module absent → rouge ;
  4/4 après `src/lib/public-status.ts`.
- `tests/unit/components/intake-force-bridge.test.ts` (nouveau, jsdom) :
  1 rouge sur 2 avant déplacement de la phrase ; 2/2 après.
- `cockpit-vocabulary` et `locale-completeness` restent verts.

## Cas laissés au propriétaire

1. **Sous-traitants et hébergement (DPA §7, privacy, trust-center)** : retirer
   Vercel, confirmer ou retirer Supabase (projet conservé en sauvegarde ?),
   ajouter l'hébergeur du VPS avec son adresse (mentions légales), et attester
   ou reformuler le chiffrement AES-256 du disque et des sauvegardes.
2. **Journal et effacement (DPA §6)** : le texte dit maintenant que le journal
   peut contenir des données personnelles et que leur effacement ciblé reste à
   outiller. Choisir : outiller l'effacement (RESIDUAL-DEBT), ou réviser la
   clause avec un conseil.
3. **Coffre des connecteurs** : configurations non chiffrées ; chantier inscrit
   à RESIDUAL-DEBT.
4. **SLA et CGV** : délais garantis de livrables automatiques jamais produits
   en production, plans Embarquement/Starter/Pro/Group absents de la grille
   `/pricing`, file priorisée par plan inexistante, devis « figé », fiscalité,
   Hub-Escrow, matching sous SLA, CinetPay non reçu.
5. **Inclusions payantes de `/pricing`** : mises à jour Oracle 30 jours,
   4 cycles de recommandations, rapport mensuel, vigies, sessions, supports,
   5 marques, SLA contractuel, account manager.
6. **Engagements de service et faits d'entreprise** : « sans appel commercial »,
   « réponse sous 24 h », newsletter hebdomadaire (transport email non actif),
   délai de suppression 30 jours, notification 72 h, portabilité 90 jours,
   remerciement du parrain, EFR « gelé à la signature », villes (Dakar, Lagos),
   historique, clients et chiffres de l'agence.
7. **CGU** : « aucun automatisme ne modifie le noyau » face aux propositions
   INFERRED écrites puis vérifiées (doctrine 538).
8. **Rétention du journal 5 ans** : aucune purge programmée.

## Limites

Lecture du code et des réceptions antérieures ; aucune page n'a été rendue en
navigateur ni lue en production pour cette recette, et aucune durée n'a été
mesurée. CI, image et production 6.27.560 restent à recevoir.
