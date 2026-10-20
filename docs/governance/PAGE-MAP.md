# PAGE-MAP — Toutes les pages mappées sur APOGEE

**281 fichiers page.tsx physiques** sous `src/app/` au recompte du 2026-10-09.
Les tableaux hérités ci-dessous classent un inventaire historique de 165 pages,
non exhaustif de l’état actuel ; chemins courants dans [CODE-MAP.md](CODE-MAP.md).
Classement par **Deck** et **Sous-système APOGEE** ; pour le Governor Neteru,
voir [PANTHEON.md](PANTHEON.md). Un chemin présent ne vaut pas recette de son cycle.

Statut : `active` (page substantive), `redirect` (legacy renommée — redirige), `placeholder` (UI partielle, à finir cf. REFONTE-PLAN P7).

Source de vérité : `find src/app -name 'page.tsx'`. Mis à jour avec [APOGEE.md](APOGEE.md) §4.

**511 candidat — remise via pages d’auth existantes (2026-10-20)** :
Résultat : compte avec mot de passe vers login, sinon forgot-password?setup=1
et email prérempli ; conflit register vers récupération existante. Page forgot
préremplie : indisponibilité/contact humain sans transport ; accusé « Demande prise en compte » quand armé, aucune livraison email promise.
Reset existant consomme le jeton valide atomiquement ; aucune page, route ou
promesse de transport ajoutée. 511 reste candidate à la livraison ; réception locale acquise. DEFAULT :
4 901 tests / 460 fichiers verts avant la dernière projection CONVERTED.
PostgreSQL : 433 / 25 ; gouvernance : 1 671 / 169 après projection ; typage et
deux lints sans erreur (24 avertissements historiques), zéro cycle et code-map.
Dernière note client : 9 / 9 ; build webpack final reçu
(`handover511-build-received.log`). Aucune garde affaiblie.

Natif compilé reçu : activation sans assistance, même URL après rechargement,
carte d’accès conservée et aucun bouton Activer. Forgot garde l’email prérempli
et affiche l’indisponibilité sans jeton. Reset HTTP sur preuve locale semée,
sans SMTP : inscription de l’existant 409, jeton invalide 400, valide 200,
rejeu 400. Connexion USER réelle puis cockpit de la même marque, sources et
original visibles. Stratégie propre HTTP 200/huit piliers, voisine 403 ; CRM
fondateur 403 et ADMIN 200 sur le même Deal LEAD/Strategy/valeur. Ce reçu ne
prouve ni transport externe, ni offre achetée, ni vente.

Original du coffre reçu sous vraie session USER : HTTP 200, 1 139 octets/SHA
exact, `private, no-store` et Referrer-Policy `strict-origin-when-cross-origin`.
Cette route authentifiée reste distincte de la route intake bearer `no-referrer`.

Fenêtres non tronquées, chacune sans HTTP ≥500 ni exception : activation/setup
102 réponses et 6 annulations, login/cockpit 61 et 38, sources 15 et 7, offre
48 et 5, sources finales 56 et 14. Les annulations sont des requêtes Next _rsc
net::ERR_ABORTED : aucun zéro échec de chargement annoncé. Titres observés
≤258 ms (activation) et ≤467 ms (sources finales), pilote compris ; aucun SLO.

Conservation finale reçue après retrait exact du paiement MOCK et de l’ADMIN
dédié : même intake, identité Strategy, diagnostic/réponses/rawText, huit piliers,
upload et source originale, onze coûts et même Deal conservés au périmètre comparé.
Activation volontaire : propriétaire USER sans opérateur, Client et statuts
CONVERTED/ACTIVE, ajout d’une source intake canonique et d’un pointeur INTAKE_REPORT.
Ces effets sont attendus : aucune affirmation de zéro écriture. Ancien périmètre
B/C reçu exact et distinct, pas toute base atomique.

Restent ouverts : compte d’envoi réel et transport email/Anubis autorisé,
CI/image/runtime 511, offre/CRM commercial complet et M05 coût/différés/admission.
Aucun SMTP, PSP, vente, coût complet ou MVP entier reçu. Les finitions constatées
(contacts/liens voisins, icône succès sur indisponibilité, détour USER par /portals,
jargon hérité) sont différées au prochain lot C5/C7 après gros œuvre ; parcours
fonctionnel reçu, UX polie non reçue.

Preuves privées : `release/preuves-remise-commerciale-20261020/` :
`native-activation-setup-network.json`, `native-login-cockpit-network.json`,
`native-sources-network.json`, `native-offer-network.json`,
`native-sources-final-network.json`, `conservation-final.json`,
`history-conservation511-received.json`, `native-owner-original-received.json`,
`native-technical-received.json`, `local-server-stopped.json`. Réception limitée
aux fixtures locales. Aperçu local détenu arrêté ; aucun autre service touché.

510 est reçue en production : source `5c5cc907249ef2123e2d6c7a60c95f81ab7794fe`,
déploiement `ip02ws80mllbkno6xn7skm1h` terminé le 20 octobre à 21:48:22 UTC,
runtime 6.27.510 au digest
`31c3a1b87b4577e781cc0e37b4753e8b58dc91be7932a3138e295d29fd2e2379`.
Mêmes volumes, Luna/relais et délai de 90 s conservés, OpenRouter absent ; version
et login HTTP 200. Conservation reçue de 67 sources, 1 041 actifs, états et
originaux, huit piliers SPAWT et racine Friesland ; lectures avant/après
séquentielles, pas un snapshot atomique. Aucun changement métier causé par la
bascule. Attente de livraison/runtime/conservation 510 close ; aucun PSP, vente,
coût complet ou MVP entier reçu.
Preuves : `release/preuves-mvp-commercial-20261020/production510-received.json`,
`production510-data-preserved.json`, `production510-public-api-received.json`. **Blocage de remise M04 confirmé** : lecture seule du runtime509 le20octobre
à21:39UTC : sendEmail sélectionne provider=log, aucun EMAIL_FROM configuré.
Aucun transport transactionnel actif : le titulaire ne recevrait pas son lien,
malgré les gardes de reset reçues localement. Réutiliser email/Anubis et le
raccord/credentials existants, puis recevoir configuration et recette de transport
autorisée avant remise commerciale. Aucun secret affiché, email externe envoyé
ou fournisseur ajouté ; le MVP commercial n’est pas reçu.

Preuves privées : `release/preuves-remise-commerciale-20261020/framing.json`, `handover-red-green-received.json`, `production-selfserve-census.json`. Configuration : `release/preuves-remise-commerciale-20261020/production-mail-configuration.json`.

**Factorisation511 candidate** : email/index.ts délègue au sender système
Anubis existant, double cascade retirée et catégories transactionnelles conservées.
Un petit lecteur pur systemEmailIsArmed est ajouté au module Anubis existant :
expéditeur et provider requis ; brandEmailIsArmed réutilise cette disponibilité
pour son repli système. Ce helper est neuf, aucun nouveau service/provider/manager.
forgotPassword sans transport renvoie deliveryAvailable=false pareil pour adresse
connue/inconnue, sans émettre de jeton. La page candidate affiche indisponibilité
et contact humain : aucun succès d’envoi ni secret journalisé. Raccord réel et
transport autorisé restent à recevoir via email/Anubis/credentials existants.
Preuve `release/preuves-remise-commerciale-20261020/email-factorization-received.json`.

**510 reçue — résultat/PDF existants, aucune page ajoutée (2026-10-20)** :
code du résultat réorganisé autour de deux champs clés, détails à la demande et
annexe PDF. Libellés d’origine séparent reçu/observé, confirmé, proposition et
inconnu ; SOURCE ne garantit pas une citation littérale. Score/100 présenté comme
complétude du dossier, force publique/couverture distinctes ; promesse fixe8pages
retirée. Droits et originaux reçus du parcours existant conservés ; aucune nouvelle
autorité ou page. 510/M03 reçue au périmètre technique et à la qualité locale bornée : nouveau cas fictif Luna COMPLETED, reportEvidenceVersion1, un original1139octets distinct/une source/huit piliers/un Deal LEAD ; huit coûts au snapshot terminal20:28:53, désormais onze coûts PARTIELS, ni coût total ni vente. Conservation historique reçue au périmètre du reçu, ancien mauvais cas/original préservés. Natif payé final compilé45réponses sans ≥500/exception/échec, réouverture sans callback/détails observés ; première transition75réponses/deux ERR_ABORTED conservée, aucun SLO. Premier PDF17pages refusé (marges sombres/page blanche), print.css existant et déduplication full/preview corrigés : candidatdev13pages, huit sections intégrales, aucune page vide/chevauchement/clipping observés sur les13pages relues. Suite DEFAULT isolée reçue :4 860tests/457fichiers unitaires plus38/2horsunit, union4 898/459 en deux passes disjointes, aucune garde assouplie (`release/preuves-rapport-fidelite-20261020/final-default-test-received.json`). Build final webpack et PDF compilé reçus :13pages/582937octets, huit sections intégrales exactes,13pages relues blanches sans page vide/chevauchement/clipping ; vrai bouton téléchargement3,4s. Qualité bornée reçue sur ce cas fictif local, pas qualité universelle. Réseau compilé45réponses/non tronqué/0≥500/exception/échec, titre observé≤257ms pilote compris, pasSLO. Original1139octets/SHA exact HTTP200, voisin404/private,no-store/no-referrer ; six HTTP droits/rejeu200, PDF impayé402/référence étrangère refusée, complete11ms relit sans modèle. Conservation finale reçue : ancien périmètre alltrue, mock exact retiré ; nouveau cas intake/piliers/upload/source/Deal identiques àprogress3 et huit coûts initiaux identiques. Première assertion coûts refusée, trois Glory différés ont écrit20:28:59–20:29:16 avant arrêt Luna20:32, pas durant lecture/PDF sans provider (wordplay-cultural-bank, concept-generator, semiotic-brand-analyzer) ; présent onze coûts partiels, pas total ni absence d’agents. Gratuit après retrait du mock reçu sans bouton PDF et avec origines ; ancien rapport reçu avec avertissement/UNKNOWN sans réécriture. 510 reçue en production au digest exact 31c3a1b87b45, conservation avant/après reçue ; attente de livraison/runtime/conservation close, aucun coût complet/PSP/vente/MVP entier reçu. Diagnostic de dossier : generateDiagnostic ne déduit plus maturité/visibilité/
communauté de la longueur des réponses ou de la complétude ; templates orientés
constats du dossier et pistes à valider, sans nouvelle formule. Diagnostic neuf
reportEvidenceVersion1 ; historique sans marqueur averti à l’écran et projeté
par intakeReportContent côté serveur en UNKNOWN sauf HUMAN, ancien SOURCE ayant
pu contenir du généré. Lecture seule : aucune mutation/backfill/régénération
implicite. Une régénération explicite existante garde le marqueur0 historique et
alimente évaluateur/V1/fallback avec cette projection, sans certifier l’ancien.
Projection et régénération historique réelle sans modèle reçues12/12 : décision
HUMAN et marqueur0 conservés, aucun coût nouveau. Premier afterAll refusé par FK
ScoreSnapshot corrigé uniquement dans le nettoyage des fixtures ; retrait local
reçu de13fixtures/trois snapshots, aucun nettoyage production. Conservation
historique reçue (deux diagnostics/16piliers/un upload/une source/huit coûts au
périmètre comparé), pas une identité atomique de toute la base.
Rendu candidat : ids/métadonnées masqués, e_channels/DIRECT traduits, vignettes
« Volet » sans fausse pagination. Aucun nouveau concept/ADR ou compte.

Preuve de cadrage : `release/preuves-rapport-fidelite-20261020/framing.json`. Première transition : `release/preuves-rapport-fidelite-20261020/native-model-transition-network.json` ; régénération historique reçue12/12. Preuves complémentaires : `release/preuves-rapport-fidelite-20261020/history-conservation510-received.json`, `regeneration-fixture-cleanup.json`, `native-paid-final-network.json`, `print2-visually-received.json` ; print2 conserve le checkpointdev13pages, désormais complété par `compiled-pdf-visually-received.json`, `native-compiled-print-network.json` et `original510-http-received.json` : PDF compilé/qualité bornée et conservation postnettoyage reçus, livraison encore ouverte. Reçus finaux : `history-conservation510-final-received.json`, `nori-read-conservation-received.json` ; ancien périmètre coût8 conservé, nouveau cas coût8 au snapshot puis11partiels par écritures différées avant la lecture sans provider.

**504 candidat — dossier Sources existant, aucune page ajoutée** :
`/cockpit/brand/sources` et `DocumentLibrary` distinguent nouvelle version,
antérieure reçue tardivement et autre format d’une version. L’antérieure entre
aux archives ; le format reste consultable sous sa version, sans deuxième
preuve d’analyse. Les alias de noms/emplacements déclarés restent visibles et
recherchables dans le dossier. Les gestes conservent la référence et la proposition,
sans adoption automatique ni IA obligatoire. 31 tests ciblés reçus ; rendu et
gestes navigateur, PostgreSQL, contrôles complets et livraison 504 non reçus.
[ADR-0223 Proposed](adr/0223-document-edition-representations.md).

**477 livré, A/B — pages existantes** : source c4bc1882/CI/image/runtime reçus. ADMIN `/cockpit/new` : option décochée/activable, nom vide/Suivant désactivé, lecture sans POST/modèle ; 134 événements/59 réponses complets, zéro HTTP ≥400/exception, seize annulations de cause inconnue/pas SLO. Création/reprise et activations false reçues sur copie seulement ; BootSequence séparé si choisi, seul `activateBrand` porte `inferMissingFields=false`. Causes ciblées purgées ; `/register` pour compte connecté et MarketScaleCard après 401 restent ouverts, seize réceptions inchangées. [Bornage](REFONTE-PLAN.md).

**476 livré — aucun ajout de page** : source cec5a163/CI/image/runtime exacts reçus. ADMIN lit cinq usages prévus Luna sans modèle/POST, données conservées ; 130 événements/56 réponses complets, zéro ≥500/exception mais 18 annulations, cause inconnue/pas SLO. Wrappers/cible 23 / 3 et refus sur copie reçus ; HTTP activateBrand/qualité utile/provenance/opt-out/coût complet restent ouverts, seize réceptions inchangées. [Bornage](REFONTE-PLAN.md).

**439 livré — huit pages de marque existantes** : identity, positioning,
offer, engagement, diagnostic, market, potential et roadmap réutilisent
PillarPage. Son état vient désormais de pillar.readiness dans un seul Badge ;
« Socle renseigné »/« Champs renseignés » mesurent la présence, sans prétendre
une fraîcheur ou approbation. Lecture en cours/échec inconnus, refresh commun
après gestes existants/recalcul, ligne wrap. Six rouges puis checkpoint 57/trois
et final 58/trois verts, sept UI dont fondation needsHuman ; premier TSC stageLabel
conservé/corrigé et cinq contrôles complets relancés exit 0/gouvernance 1 620/166.
Build compilée/native locale USER/TRIAL fictive reçues sur roadmap : Périmé
avec deux 100 %, desktop/mobile inspectés (390×844 demandés, largeur client et
document mesurée 384 px, badge dans les bornes). Fixture nettoyée/serveur arrêté/
onglet fermé. Source b0399f4f/CI 37997965596/image 37998236655/runtime 439 exact
reçus ; lecture réelle roadmap SPAWT USER : PÉRIMÉ avec deux 100 %, 116 réponses
toutes 200/zéro ≥500/exception, 32 ERR_ABORTED retenus. Aucune mutation réelle,
couverture globale des huit pages/mobile ou cycle déduite. Aucune
page ajoutée : [reprise et bornes](REFONTE-PLAN.md).

---

## Inventaire historique classifié — 165 pages

| Deck | Mission Tier | Ground Tier | Total |
|---|---|---|---|
| **Mission Control** (Console) | 41 | 32 | 73 |
| **Cockpit** (Founder) | 26 | 4 | 30 |
| **Crew Quarters - Agency** | 6 | 5 | 11 |
| **Crew Quarters - Creator** | 5 | 18 | 23 |
| **Launchpad** (Intake) | — | 7 | 7 |
| **Public/Auth/Misc** | — | 7 | 7 |
| **Redirects (legacy)** | — | — | 14 |
| **TOTAL** | 78 | 73 | **165** |

Note : 14 redirects (fusee→artemis, signal→seshat, academie→arene/academie) ne sont pas comptés en sous-système puisqu'ils n'ont pas de logique. Liste explicite §6.

---

## 1. Mission Control (portail Console)

### 1.1 — Pages racines

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/page.tsx` | — | — | active | Dashboard portail, home |

### 1.2 — Oracle (Mission Tier — Guidance)

L'Oracle est le **plan de vol**. Toutes ces pages éditent ou consultent le plan.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/strategy-operations/boot/page.tsx` | Guidance | M | active | Boot session list (ADR-0024) |
| `/console/strategy-operations/boot/[sessionId]/page.tsx` | Guidance | M | active | Session détail (ADR-0024) |
| `/console/strategy-portfolio/brands/page.tsx` | Guidance | M | active | Liste marques pilotées (ADR-0034 — anciennement `/console/oracle/brands`) |
| `/console/strategy-portfolio/brands/[strategyId]/page.tsx` | Guidance | M | active | Fiche marque pilotée — radar ADVERTIS, sections, drivers (ADR-0034) |
| `/console/strategy-operations/brief-ingest/page.tsx` | Guidance | M | active | Ingestion brief PDF (ADR-0024) |
| `/console/strategy-portfolio/clients/page.tsx` | Guidance | M | active | Liste clients UPgraders + leurs marques (ADR-0034) |
| `/console/strategy-portfolio/clients/[strategyId]/page.tsx` | Guidance | M | active | Fiche client détaillée (ADR-0034) |
| `/console/strategy-portfolio/diagnostics/page.tsx` | Telemetry | M | active | Diagnostic santé pipeline opérateur (ADR-0034) |
| `/console/governance/oracle-incidents/page.tsx` | Telemetry | M/A/S/T | active | Triage incidents pipeline Oracle (ADR-0022). Cluster par code `ORACLE-NNN` |
| `/console/governance/error-vault/page.tsx` | Telemetry | INFRA | active | Vue runtime errors générique (Phase 11) |
| `/console/governance/design-system/page.tsx` | Admin | INFRA | active | Preview tokens DS (Phase 11 PR-9) |
| `/console/strategy-operations/ingestion/page.tsx` | Guidance | M | active | Ingestion sources (ADR-0024) |
| `/console/strategy-operations/intake/page.tsx` | Guidance | M | active | Quick intake opérateur (ADR-0024) |
| `/console/oracle/compilation/page.tsx` | Guidance | M | active | **Compile le livrable Oracle 35-section** — seule page légitime sous `/console/oracle/*` (ADR-0024 + ADR-0034) |

### 1.3 — Artemis (Mission Tier — Propulsion)

Artemis pilote les thrusters. Ces pages opèrent les Glory tools, sequences, missions sortantes.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/artemis/page.tsx` | Propulsion | M | active | Hub Artemis |
| `/console/artemis/campaigns/page.tsx` | Propulsion | M | active | Campagnes en vol |
| `/console/artemis/drivers/page.tsx` | Propulsion | M | active | Drivers d'engagement |
| `/console/artemis/interventions/page.tsx` | Propulsion | M | active | Examen versionné, mission liée, rejet motivé (ADR-0201) |
| `/console/artemis/media/page.tsx` | Propulsion | M | active | Media buy/plan |
| `/console/artemis/missions/page.tsx` | Propulsion | M | active | Missions accessibles, colonnes métier, besoin exact ; réception native 405 reçue, clic final 406 au registre |
| `/console/artemis/pr/page.tsx` | Propulsion | M | active | RP / publications |
| `/console/artemis/scheduler/page.tsx` | Propulsion | M | active | Calendrier |
| `/console/artemis/skill-tree/page.tsx` | Propulsion | M | active | Sequences (skill tree) |
| `/console/artemis/social/page.tsx` | Propulsion | M | active | Social orchestration |
| `/console/artemis/tools/page.tsx` | Propulsion | M | active | Catalogue Glory tools |
| `/console/artemis/vault/page.tsx` | Propulsion | M | active | Vault assets |

### 1.4 — Mestor (Mission Tier — Guidance)

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/mestor/page.tsx` | Guidance | M | active | Mestor chat operator |
| `/console/mestor/insights/page.tsx` | Guidance | M | active | Insights délibération |
| `/console/mestor/plans/page.tsx` | Guidance | M | active | Plans en attente |
| `/console/mestor/recos/page.tsx` | Guidance | M | active | Recommandations |

### 1.5 — Seshat (Mission Tier — Telemetry)

Telemetry processor + Tarsis sensors.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/seshat/attribution/page.tsx` | Telemetry | M | active | Attribution canaux |
| `/console/seshat/intelligence/page.tsx` | Telemetry | M | active | Intelligence sectorielle |
| `/console/seshat/jehuty/page.tsx` | Telemetry | M | active | Jehuty cross-brand feed |
| `/console/seshat/knowledge/page.tsx` | Telemetry | M | active | Knowledge graph |
| `/console/seshat/market/page.tsx` | Telemetry | M | active | Market intel |
| `/console/seshat/search/page.tsx` | Telemetry | M | active | Recherche sémantique cross-strategy |
| `/console/seshat/signals/page.tsx` | Telemetry | M | active | Signaux faibles |
| `/console/seshat/tarsis/page.tsx` | Telemetry | M | active | Tarsis sensor array |

### 1.6 — Socle (Ground Tier — Operations)

L'argent et les contrats. Sans ces pages, UPgraders ne facture pas.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/socle/commissions/page.tsx` | Operations | G | active | Commissions UPgraders/agence/creator |
| `/console/socle/contracts/page.tsx` | Operations | G | active | Contrats |
| `/console/socle/escrow/page.tsx` | Operations | G | active | Escrow paiements |
| `/console/socle/invoices/page.tsx` | Operations | G | active | Factures |
| `/console/socle/pipeline/page.tsx` | Operations | G | active | Pipeline commercial |
| `/console/socle/prod-ops/page.tsx` | Admin | INFRA | active | Cycle prod en 3 temps (injection/déploiement/action) — skill `nefer-ops` |
| `/console/socle/release-notes/page.tsx` | Admin | INFRA | active | Récap opérateur des notes de version CLIENT (`src/lib/release-notes.ts`, même source que l'écran « Quoi de neuf » cockpit) |
| `/console/socle/revenue/page.tsx` | Operations | G | active | Revenu rolling |
| `/console/socle/value-reports/page.tsx` | Operations | G | active | Rapports valeur clients |

### 1.7 — Arène + Académie (Ground Tier — Crew Programs)

Talent + Formation.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/arene/club/page.tsx` | Crew Programs | G | active | Club ambassadeurs |
| `/console/arene/events/page.tsx` | Crew Programs | G | active | Events networking |
| `/console/arene/guild/page.tsx` | Crew Programs | G | active | Guild creators |
| `/console/arene/matching/page.tsx` | Crew Programs | G | active | Matching mission ↔ creator |
| `/console/arene/orgs/page.tsx` | Crew Programs | G | active | Organisations partenaires |
| `/console/arene/academie/page.tsx` | Crew Programs | G | active | Hub académie |
| `/console/arene/academie/boutique/page.tsx` | Crew Programs | G | active | Boutique formation |
| `/console/arene/academie/certifications/page.tsx` | Crew Programs | G | active | Certifications |
| `/console/arene/academie/content/page.tsx` | Crew Programs | G | active | Contenu pédagogique |
| `/console/arene/academie/courses/page.tsx` | Crew Programs | G | active | Cours |

### 1.8 — Ecosystem + Config (Ground Tier — Admin)

Méta : multi-operator admin + configuration système.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/ecosystem/page.tsx` | Admin | G | active | Hub ecosystem |
| `/console/ecosystem/metrics/page.tsx` | Admin | G | active | Métriques flotte |
| `/console/ecosystem/operators/page.tsx` | Admin | G | active | Multi-operator |
| `/console/ecosystem/scoring/page.tsx` | Admin | G | active | Scoring cross-tenant |
| `/console/config/page.tsx` | Admin | G | active | Hub config |
| `/console/config/integrations/page.tsx` | Admin | G | placeholder | TODO: real OAuth (cf. P7) |
| `/console/config/system/page.tsx` | Admin | G | active | System settings |
| `/console/config/templates/page.tsx` | Admin | G | active | Templates |
| `/console/config/thresholds/page.tsx` | Admin | G | active | Thresholds |
| `/console/config/variables/page.tsx` | Admin | G | active | Variables |

### 1.9 — Messages (Ground Tier — Comms)

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/messages/page.tsx` | Comms | G | active | Fil messaging operator |

---

## 2. Cockpit (portail Founder — pilote sa propre mission)

### 2.1 — Brand (Mission Tier mixte)

Le founder édite et consulte tous les aspects de sa fusée.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/cockpit/page.tsx` | — | — | active | Dashboard founder |
| `/cockpit/brand/identity/page.tsx` | Guidance | M | active | Pillar A |
| `/cockpit/brand/positioning/page.tsx` | Guidance | M | active | Pillar D |
| `/cockpit/brand/proposition/page.tsx` | Guidance | M | active | Pillar V |
| `/cockpit/brand/engagement/page.tsx` | Guidance | M | active | Pillar E |
| `/cockpit/brand/diagnostic/page.tsx` | Telemetry | M | active | Pillar R (risque) |
| `/cockpit/brand/market/page.tsx` | Telemetry | M | active | Pillar T (track) |
| `/cockpit/brand/potential/page.tsx` | Guidance | M | active | Pillar I (innovation) |
| `/cockpit/brand/roadmap/page.tsx` | Guidance | M | active | Pillar S (strategy) |
| `/cockpit/brand/edit/page.tsx` | Guidance | M | active | 475 livré, PillarPage/AmendPillarModal/huit vues/focus ; amendement fictif sur copie distinct de la production ADMIN en lecture/annulation, placeholder générique reçu, aucun POST/modèle ; autres rôles/API à recevoir, aucun droit fondateur élargi |
| `/cockpit/brand/assets/page.tsx` | Propulsion | M | active | Vault assets brand |
| `/cockpit/brand/deliverables/page.tsx` | Propulsion | M | active | Liste livrables |
| `/cockpit/brand/deliverables/[key]/page.tsx` | Propulsion | M | active | Livrable détail |
| `/cockpit/brand/guidelines/page.tsx` | Guidance | M | active | Identité enregistrée et références consultables (ADR-0203) |
| `/cockpit/brand/jehuty/page.tsx` | Telemetry | M | active | Jehuty pour ce founder |
| `/cockpit/brand/notoria/page.tsx` | Propulsion | M | active | Pipeline Notoria |
| `/cockpit/brand/offer/page.tsx` | Guidance | M | active | Offre commerciale |
| `/cockpit/brand/rtis/page.tsx` | Guidance | M | active | RTIS détail |
| `/cockpit/brand/rtis/synthese/page.tsx` | Guidance | M | active | RTIS synthèse |
| `/cockpit/brand/sources/page.tsx` | Guidance | M | active | Sources d'enrichissement |

### 2.2 — Insights (Mission Tier — Telemetry)

Vue télémétrie côté founder.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/cockpit/insights/attribution/page.tsx` | Telemetry | M | active | Attribution canaux. Phase 23 Epic 4 Story 4.7 — étendu avec `EvangelistLineageView` (campagne → N transitions Ambassador/Evangelist) |
| `/cockpit/insights/benchmarks/page.tsx` | Telemetry | M | active | Brand comparables (V5.4) |
| `/cockpit/insights/diagnostics/page.tsx` | Telemetry | M | active | Diagnostics santé |
| `/cockpit/insights/reports/page.tsx` | Telemetry | M | active | Rapports |

### 2.2-bis — Intelligence (Mission Tier — Telemetry, **Phase 23 PENDING**)

Net-new minimal Cockpit group introduit par Phase 23 pour la dérive #5 MISSION.md §5 (Overton axis founder-facing). Réservé ici en Epic 1 Story 1.9 ; la route est implémentée Epic 7 Story 7.5 + montée dans `cockpitNavGroups` Epic 7 Story 7.7. ⚠️ NE PAS confondre avec `/cockpit/intelligence/track` (Trend Tracker pilier T, concept distinct).

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/cockpit/intelligence/overton/page.tsx` | Telemetry | M | **shipped** (2026-05-29, Epic 7 Story 7.5) | OvertonRadar founder-facing surface. Monte `<OvertonPanel>` (`src/components/cockpit/intelligence/`) qui fetch `cockpitDashboard.overtonSignal` → `ConnectorResult<OvertonRadarSignal>` et le passe à `<OvertonRadar instance="full" />`. Paid-tier-gated (FR32, `checkPaidTier` → `TIER_GATE_DENIED` arm) + read-only (`.query`, aucune mutation exposée) + tenant-scoped (`protectedProcedure` + ownership guard). Découverte aussi via teaser dashboard `/cockpit` + nav "Intelligence". Cf. ADR-0077/0078, MISSION §5 dérive #5 |

### 2.3 — Operate (Mission Tier — Propulsion)

Le founder allume des thrusters.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/cockpit/operate/briefs/page.tsx` | Propulsion | M | active | Briefs sortants |
| `/cockpit/settings/connections/page.tsx` | Comms | G | active | **Connexions** — l'onglet qui ramène tout (réseaux ADR-0128 + boutique Shopify ADR-0132, l'utilisateur autorise) |
| `/b/[slug]/page.tsx` | Comms | G | active | **Page publique de marque** — `<slug>.powerupgraders.com` (ADR-0132, données publiques uniquement) |
| `/cockpit/operate/inbox/page.tsx` | Comms | G | active | **Boîte de réception** — interactions des tiers adressées à la marque (ADR-0133 : commentaires FB/IG, réponse au nom de la marque, classement ; délégable zone social) |
| `/cockpit/operate/publish/page.tsx` | Comms | G | active | **Publier** — composer multi-réseaux (ADR-0133 : FB/IG/LinkedIn, planification via calendrier unique, cibles honnêtes par état de connexion) |
| `/cockpit/intelligence/social/page.tsx` | Telemetry | M | active | **Performance sociale** — rapport déterministe 30/90 j (ADR-0133 : totaux, par-réseau, portée mesurée seulement, top posts, inbox) |
| `/cockpit/operate/center/page.tsx` | Operations | M | active | **Suivi du jour** — dashboard opérationnel founder (ADR-0131 : campagne du moment, tuiles réelles, communauté, réseaux, veille) + pilotage détaillé opérateur (`canOperate`) |
| `/cockpit/operate/forge/page.tsx` | Propulsion | M | active | **Deliverable Forge** — output-first composition (Phase 17b, ADR-0050 — anciennement ADR-0037). Pointer un `BrandAsset.kind` matériel cible → DAG briefs requis + scan vault → composition PREVIEW |
| `/cockpit/operate/campaigns/page.tsx` | Propulsion | M | active | Campagnes founder |
| `/cockpit/operate/campaigns/[id]/page.tsx` | Propulsion | M | active | Campagne détail |
| `/cockpit/operate/missions/page.tsx` | Propulsion | M | active | Missions founder |
| `/cockpit/operate/requests/page.tsx` | Propulsion | M | active | Demande manuelle, historique et reçu réel de mission (ADR-0201) |

**436 livré dans la page forge existante** : l’état absent/incomplet/composé/
obsolète provient de getSynthesisConfidence ; l’approbation requiert la version
relue et l’opérateur actuel. Confiance inconnue sans fausse barre 0 %, vrai zéro
conservé, mesure encore visible après décision, refus serveur visible et
confirmation distincte du contenu. Aucun nouvel écran ou droit ; le layout
OperatorSurface reste en place. Cinq cas natifs synthétiques reçus : absence/
partiel, confirmations sans modifier la confiance et conflit de version puis
nouvelle lecture. Source 80e2122f/CI/image/runtime 436 reçus, lecture réelle SPAWT
S existant à 91 %/AI_PROPOSED v3/bouton désactivé reçue ; aucune approbation de
marque réelle. Contrats de composition à réconcilier : [réception](RECEPTION-VALIDATION-SYNTHESE.md).

**456 livré — portefeuille SPAWT alimenté par le quiz réel** : PR31 fusionnée et image quiz sans overlay livrée. Observation publique reçue sous session existante après dépliage, Q6/source/version/référence/dates et qualification 0 vérifiable/21 historiques lisibles ; même Signal retrouvé après reprise. Gazette MARKET_SIGNAL/filtre et détail complet reçus sur copie puis en public : Q6/même référence/inconnus conservés, IA facultative décochée sans rafraîchissement ou action IA. Export des contacts et du questionnaire reçu sous connexion admin sur image isolée exacte. Aucun écran nouveau, contact transféré ou inscrit synthétique ajouté en production. Ancien portefeuille vide, modal, classement et timeouts restent historiques ; usage/révision gouvernée, autres rôles, SLO et cycle entier ouverts. Quatorze résultats bornés sans crédit supplémentaire. [Reprise](REFONTE-PLAN.md).

**455 livré au périmètre admission, écran non reçu** : image exacte/HTTP privé 401/403/409 et rejeu nouveau processus, public 455/401 et invariance neuf tables Fusée/trois quiz reçus. Formatage et mission cockpit existent au code ; sélection Gazette et lecture portefeuille restent à recevoir en 456. Aucun écran, joueur réel ou parcours complet déduit. [Réception](REFONTE-PLAN.md).

**454 livré — refus MCP interne, aucune page nouvelle** : source/CI/image/runtime public 454 reçus. Quatre appels ask/deliberate REST/RPC sur OCI privée exacte reçoivent UNAVAILABLE, quota interne 2→2 et refus 403/401. Aucun MCP/conseil public ou réponse utile reçu ; metering conservé et aucune note client ajoutée. Cause du refus purgée au périmètre reçu. Sources publique reçue en lecture : 9 boutons Consulter/129 fragments, analyse assistée décochée et aucune préparation lancée ; session réelle mais rôle complet/SLO non reçus. Retour quiz non reçu : doublon, identité/version/temps perdus et période invalide sur copie ; contrat existant à réparer/recevoir en C3-02/C3-03 avant branchement, sans correctif métriques en 454. [Reprise](REFONTE-PLAN.md).

**453 source/CI/image/OCI privée reçues — notice interne existante** : `sourcesSeen` distingue documents et `ragUsed` hybride. Lecture Galahad REST 3×4/reprise 1×4 avec mêmes ID/empreintes/certitudes, six populations inchangées ; OCI 3c4fad3/453/API 200/index ad6970…. Vraie route ask 500/stream vide et deliberate 200/UNAVAILABLE reçus sans fournisseur ; import `ai` du harnais CLI non reproduit. Aucun écran ajouté, réponse métier ou livraison publique 453 reçu.

**452 source/CI/image/lecture OCI privée reçus** : Galahad REST 3x4/reprise 1x4 et
RPC 25/3x4 gardent source/empreinte/certitude, refus/invariance sur copie reçus.
Public450 conservé, production452 absente ; null natif OCI non reçu (aucun candidat
non-doc). Label inconnu HTML local reçu, CDP tronqué donc zéros observés seulement ;
BibleCitation sans contentHash/PDF sans id/empreinte/statut restent C4. Aucun index
ou embedding documentaire préparé en lecture ; embed(query) sémantique reste possible
avec provider configuré, absent des receivers reçus. [Bornage](REFONTE-PLAN.md).

**451 source/CI reçues — contrôle infrastructure, aucune surface ajoutée** :
feedback-postgres reçoit le diff de sa vraie base PostgreSQL 16.15 après migrations,
sans différence au périmètre Prisma migrate diff et sans fallback. Négatifs 0/2/0/1 reçus sur PostgreSQL 17.9 local seulement.
Dette du faux diff/symptôme refermée ; autres trous C7/R09 et parcours IP ouverts.
Runtime public 450 conservé, aucun build/image/runtime 451 ni geste utilisateur
nouveau. Futur reçu documentaire distinct. [Bornage](REFONTE-PLAN.md).

**450 livré — Sources existant reçu au périmètre production** : préparation
explicite via INDEX_BRAND_SOURCE/prepareSourceIndex dans ingestion, opérateur et
écriture marque, literal(false).default(false) au reçu/rejeu. Aucun read n’indexe,
IDs MCP/ranker conservés ; pas nouvelle page. Neuf commandes humaines UI sans
embedding reçues sur SPAWT réel, neuf badges/129 fragments et IDs/certitudes visibles
conservés. Reload : neuf sources/129 fragments/aucun bouton et zéro prepareRequest
par lecture ; fenêtre complète de 120 événements sans ≥500/exception observés.
Attente initiale du sélecteur expirée conservée, ni stabilité répétée ni SLO reçus.
Source 6f38b4b5/CI/image 38410420071/runtime 450 exacts ; DEFAULT 4 342/413,
CI PostgreSQL 358/18/cinq finals verts. Commit de tests
684e040e80af523ed802c98a7b38b5276b78e5d0 reçu, rouge de timing conservé.
Les refus/rejeu/empreintes complètes et lecteur MCP restent reçus sur copie seulement ;
MCP production/conseil/mandat/lignées ouverts. Futur reçu documentaire distinct,
aucun build MD requis. [Bornage](REFONTE-PLAN.md).

**13 octobre — runtime publisher 449 et lecteur public reçus, aucune page ajoutée** : source
5a7f11a…/index be065e…/version 6.27.449, nextjs/private-media RW et API/version 200
reçus après accès rétabli. Quiz Node exact 557a915/PR30/health DB/cible préservée,
six sources publiques identiques ; vitrine/landing/jeu inter-domaines consomment
la v6 réelle conservée avec cinq FontFace/trois usages Moka. Six questions natives
jusqu’à inscription sans contact, mode aperçu PNG/GIF reçu, mobile 390 sans overflow.
Première réception réelle de ce reader close au périmètre ; univers/autres familles/
profils/retours/cycle inscrit restent ouverts. [Réception courante](REFONTE-PLAN.md).

**Historique du 12 octobre — 449 source/CI/image reçues, transport public partagé** :
GET /api/export/[strategyId]?format=public-brand-v2 (branche publique v1 conservée)
et GET /brand/editions/[editionId]/[file] réutilisent publicBrandCorsHeaders du
domaine public-brand existant. Quatre origines exactes : https://spawt.online,
https://www.spawt.online, https://portail.spawt.online, https://quiz.spawt.online ;
aucune credential. Origine étrangère/absente : HTTP public peut rester 200 sans
ACAO ; le privé garde son auth/isolation. Publication/stockage/ETag/CSP conservés.
Ciblés 16/2, PG isolée 39/1 et 19 vrais HTTP reçus sur édition/fichiers fictifs ;
DEFAULT 4 331/411/gouvernance 1 627/166 et cinq contrôles finaux à zéro. Aucun
consumer navigateur quiz ou runtime 449 reçu. Source 5a7f11a…/CI exacte
4 331/411 + PG 358/18 et image/registre reçus ; redeploy SKIPPED, livraison attendue.
Vary inclut Origin sur les réponses publiques reçues ; transport CORS local reçu.
Les trois origines du reçu historique 432 ci-dessous restent historiques.
[Réception et limite](REFONTE-PLAN.md).

Transport associé, **hors dénombrement des pages** :
`GET /brand/editions/[editionId]/[file]` (hash.extension), livré et reçu en 431,
Sustainment/MESTOR via brand-vault existant. Lecture anonyme bornée aux éditions
publiques admissibles ; intégrité avant 304, absence/corruption 503 sans repli
source, requête/édition privée/hash faux 404. Aucune nouvelle page ni permission.
[ADR-0211 Accepted, borné](adr/0211-retained-public-logo-bytes.md).

432 livré : ce même transport admet les copies d’identité d’une édition v2,
images et fichiers OTF/TTF vérifiés, avec CORS des trois origines SPAWT existantes.
La revue Connexions compose PublicIdentityReview ; aucune nouvelle page, droit
ou CSP élargie. Gauntlet et gestes natifs locaux producer/HTTP reçus ; runtime,
publication/revue/retour production et consumer natif reçus sur la vitrine choisie,
origines/CSP inchangées. Réception partielle C2/C3/C4, pas univers de marque entier.
[ADR-0212 Accepted, borné](adr/0212-versioned-public-identity-projection.md).

Code 434 livré au runtime, aucune page supplémentaire : PtahKilnTracker existant est monté
dans /cockpit/operate/forge, sous le layout OperatorSurface déjà présent.
Liste paginée/états et confirmation de reprise d’une tâche, montage réservé aux
opérateurs par ce layout. Faux vert ACTIVE remplacé par validationStatus
enregistrée ; fix session 433 préalable rend la marque. Reprise même tâche
DEFERRED HTTP 200/reçu altéré HTTP 412 et dirigeant sans affectation sans Reprendre
locaux reçus ; tracker/action non montés pour USER sans affectation. Anciens
compteurs par mauvais sélecteurs écartés, nouvelle pagination 20 puis 22 uniques
reçue, fixture nettoyée. Confiance S absente/validation à 1.0 restent planifiées.
Gauntlet final vert après découplage startedAt réel/emittedAt logique,
scénario local durée/clôture reçu sans SLO global. Stress isolé reçoit
46 HTTP/235 non reçus/0 échec, hors native protégée/Glory phase 3/fournisseur réel,
avant les dernières gardes et dates. Suite canonique 4 180/399 et PG 270/14
finaux post-découplage reçus ; CI/runtime 434 reçus, parcours restants en attente.
Native production 434 : tracker 403/compte non affecté, écran non reçu, trace
tronquée sans zéro exhaustif/SLO déduit. 435 livré : lecture seule du dossier
explicitement choisi pour ADMIN effectif, canResume selon affectation actuelle,
aucun bouton sans celle-ci. Mutations/autres lectures restent strictes, aucun
droit/équipe/rôle nouveau. 51 PG ciblés verts après deux rouges. Native locale :
deux dossiers de deux équipes ouverts par URL connue, chacun sa tâche en lecture
seule/canResume=false, sans bouton ni secret ; Actualiser HTTP 200/zéro exception,
fenêtre complète. Copie FR finale relue, fixture nettoyée. Sélecteur local 0/0 historique,
reload tronqué sans SLO. Gauntlet 435 cinq exit 0, gouvernance 1620/166/24 warnings
préexistants ; PG complet seul 274/14, Ptah 51 inclus reçus. CI 435 : 4 180/399 unitaires et
274/14 PG/image/runtime reçus. Native SPAWT listForges HTTP 200/zéro ligne, 403 disparu,
fenêtre complète : 63 réponses/aucune ≥500/zéro exception/log. Liste du sélecteur reçue
après chargement ; passage par son lien vers le portefeuille groupe
FrieslandCampina non pilotable reçu en lecture seule, portée/ambiguïtés rendues,
sans métriques isolées de cette navigation. Production/reprise réelle non reçue ;
aucun SLO déduit des bornes tardives production.
[ADR-0213 Proposed](adr/0213-deferred-production-resumption-and-seals.md).

### 2.4 — Mestor + New + Messages (mixte)

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/cockpit/mestor/page.tsx` | Guidance | M | active | Mestor chat founder |
| `/cockpit/new/page.tsx` | Operations | G | active | Onboarding 7 steps (acquisition) |
| `/cockpit/messages/page.tsx` | Comms | G | active | Fil messaging |

---

## 3. Crew Quarters — Agency (portail partenaires)

### 3.1 — Pages

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/agency/page.tsx` | — | — | active | Dashboard agence |
| `/agency/campaigns/page.tsx` | Propulsion | M | active | Campagnes en cours |
| `/agency/clients/page.tsx` | Operations | G | active | Clients gérés |
| `/agency/clients/[clientId]/page.tsx` | Operations | G | active | Client détail |
| `/agency/commissions/page.tsx` | Operations | G | active | Commissions agence |
| `/agency/contracts/page.tsx` | Operations | G | active | Contrats |
| `/agency/intake/page.tsx` | Operations | G | active | Intake clients agence |
| `/agency/knowledge/page.tsx` | Telemetry | M | active | Knowledge graph |
| `/agency/messages/page.tsx` | Comms | G | active | Messaging |
| `/agency/missions/page.tsx` | Propulsion | M | active | Missions de l'agence |
| `/agency/revenue/page.tsx` | Operations | G | active | Revenue agence |
| `/agency/signals/page.tsx` | Telemetry | M | active | Signaux pertinents |

---

## 4. Crew Quarters — Creator (portail freelances)

### 4.1 — Pages

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/creator/page.tsx` | — | — | active | Dashboard creator |
| `/creator/community/events/page.tsx` | Crew Programs | G | active | Events |
| `/creator/community/guild/page.tsx` | Crew Programs | G | active | Guild |
| `/creator/earnings/history/page.tsx` | Operations | G | active | Historique paiements |
| `/creator/earnings/invoices/page.tsx` | Operations | G | active | Factures |
| `/creator/earnings/missions/page.tsx` | Operations | G | active | Missions facturées |
| `/creator/earnings/qc/page.tsx` | Operations | G | active | QC pour paiement |
| `/creator/learn/adve/page.tsx` | Crew Programs | G | active | Formation ADVE |
| `/creator/learn/cases/page.tsx` | Crew Programs | G | active | Cases studies |
| `/creator/learn/drivers/page.tsx` | Crew Programs | G | active | Drivers learning |
| `/creator/learn/resources/page.tsx` | Crew Programs | G | active | Ressources |
| `/creator/messages/page.tsx` | Comms | G | active | Messaging |
| `/creator/missions/active/page.tsx` | Propulsion | M | active | Missions actives |
| `/creator/missions/available/page.tsx` | Crew Programs | G | active | Marketplace missions |
| `/creator/missions/collab/page.tsx` | Crew Programs | G | active | Collab missions |
| `/creator/profile/drivers/page.tsx` | Crew Programs | G | active | Drivers profile |
| `/creator/profile/portfolio/page.tsx` | Crew Programs | G | active | Portfolio |
| `/creator/profile/skills/page.tsx` | Crew Programs | G | active | Skills |
| `/creator/progress/metrics/page.tsx` | Telemetry | M | active | Métriques creator |
| `/creator/progress/path/page.tsx` | Crew Programs | G | active | Path APPRENTI→ASSOCIÉ |
| `/creator/progress/strengths/page.tsx` | Telemetry | M | active | Forces creator |
| `/creator/qc/peer/page.tsx` | Crew Programs | G | active | Peer QC |
| `/creator/qc/submitted/page.tsx` | Crew Programs | G | active | Submissions QC |

---

## 5. Launchpad — Intake public

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/intake/page.tsx` | Operations | G | active | Landing intake |
| `/intake/[token]/page.tsx` | Guidance | M | active | Intake principal |
| `/intake/[token]/short/page.tsx` | Guidance | M | active | Variant court |
| `/intake/[token]/ingest/page.tsx` | Guidance | M | active | Ingest brief |
| `/intake/[token]/ingest-plus/page.tsx` | Guidance | M | active | Ingest étendu |
| `/intake/[token]/result/page.tsx` | Telemetry | M | active | 510 reçue : origines et PDF local de 13 pages ; 511 carte d’accès après reload CONVERTED reçue localement ; transport réel/livraison ouverts |
| `/score/page.tsx` | Telemetry | M | active | Public score viewer |

---

## 6. Public / Auth / Misc

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/page.tsx` | — | — | active | Landing publique |
| `/unauthorized/page.tsx` | Admin | G | active | 403 page |
| `/login/page.tsx` | Admin | G | active | Auth |
| `/register/page.tsx` | Admin | G | active | Auth existante ;511 candidat refuse compte existant et lie sa récupération |
| `/forgot-password/page.tsx` | Admin | G | active | Auth existante ;511 candidat setup/email préremplis, indisponibilité explicite sans transport ; demande accusée si armé |
| `/reset-password/page.tsx` | Admin | G | active | Auth existante ;511 jeton à usage unique atomique et reset HTTP local reçus ; SMTP/livraison ouverts |
| `/shared/strategy/[token]/page.tsx` | Telemetry | M | active | Public strategy share link |

---

## 7. Redirects (legacy renames — à supprimer fin P0)

14 pages redirect uniquement, conservées pour back-compat post-renommage. Aucune logique. Candidates à `git rm` après période de grâce.

| Path | Redirect vers | Origine |
|---|---|---|
| `/console/fusee/campaigns` | `/console/artemis/campaigns` | renommage fusee → artemis |
| `/console/fusee/drivers` | `/console/artemis/drivers` | idem |
| `/console/fusee/glory` | `/console/artemis/tools` | idem (glory → tools) |
| `/console/fusee/interventions` | `/console/artemis/interventions` | idem |
| `/console/fusee/media` | `/console/artemis/media` | idem |
| `/console/fusee/missions` | `/console/artemis/missions` | idem |
| `/console/fusee/pr` | `/console/artemis/pr` | idem |
| `/console/fusee/scheduler` | `/console/artemis/scheduler` | idem |
| `/console/fusee/social` | `/console/artemis/social` | idem |
| `/console/signal/attribution` | `/console/seshat/attribution` | renommage signal → seshat |
| `/console/signal/intelligence` | `/console/seshat/intelligence` | idem |
| `/console/signal/knowledge` | `/console/seshat/knowledge` | idem |
| `/console/signal/market` | `/console/seshat/market` | idem |
| `/console/signal/signals` | `/console/seshat/signals` | idem |
| `/console/signal/tarsis` | `/console/seshat/tarsis` | idem |
| `/console/academie/boutique` | `/console/arene/academie/boutique` | renommage academie → arene/academie |
| `/console/academie/certifications` | `/console/arene/academie/certifications` | idem |
| `/console/academie/content` | `/console/arene/academie/content` | idem |
| `/console/academie/courses` | `/console/arene/academie/courses` | idem |
| `/console/academie/page.tsx` | `/console/arene/academie` | idem |

(Note : 20 redirects au total — compté dans le tableau §0 comme 14 lignes uniques. À nettoyer en P0 + lint rule `no-redirect-only-pages`.)

---

## 8. Verdict — orphelins révélés

Aucune page n'est restée orpheline grâce à l'extension du framework. Les ajouts de sous-systèmes ont été directement provoqués par le besoin d'absorber proprement :

| Pages → Révélation framework |
|---|
| `/console/socle/*` (7 pages) → **Sous-système Operations** ajouté au Ground Tier |
| `/console/arene/*`, `/console/academie/*`, `/creator/learn/*`, `/creator/community/*`, `/creator/profile/*`, `/creator/qc/*` → **Sous-système Crew Programs** ajouté |
| `/*/messages/*` (4 pages) → **Sous-système Comms** ajouté (transverse) |
| `/console/config/*`, `/console/ecosystem/*`, `/auth/*`, `/unauthorized` → **Sous-système Admin** ajouté |

C'est l'application stricte du principe : *le framework sert La Fusée, pas l'inverse*. APOGEE absorbe tout ce qui existe.


## Raccords intelligence créative et concurrence — 2026-10-06 (ADR-0194)

Extensions de pages existantes, inspectées dans le code. Aucun nouveau portail.
Parcours backend local validé dans ADR-0194. Réception navigateur ciblée PASS :
Console import, Argos recettes publiques et vrai FOUNDER sur le rapport social,
zéro erreur. Le stress global du site a été interrompu par OOM local après
31 pages OK ; aucune validation globale ou de production implicite.

| Page | Deck / sous-système | Raccord effectif |
|---|---|---|
| `/console/seshat/argos` | Mission Control / Telemetry | `CreativeWorkbench` : corpus public ou marque accessible, import/relevé/annotation manuels, évaluation/revue des recettes, déclaration/résolution d'essais, watchlist structurée et saisie/lecture de faits concurrentiels sourcés (`analytics.recordCompetitor` / `getCompetitors`). Mutations opérateur gouvernées. |
| `/cockpit/intelligence/social` | Cockpit propriétaire / Telemetry | `BrandCreativeIntelligence` intégré au rapport de performance sociale accessible au propriétaire : corpus autorisé, recettes, hypothèses d’opportunités avec couverture propre/comptes suivis et essais de la marque. Réception navigateur FOUNDER PASS. |
| `/cockpit/intelligence/track` | Cockpit opérateur / Telemetry | Lecture complémentaire du même module. La garde `<OperatorSurface>` du segment est conservée ; ce chemin ne constitue pas l’accès founder. |
| `/argos` | Public / Telemetry | `PublicCreativeRecipes` : projection des recettes PUBLIC revues et publiées, avec exemples/contrôles/couverture. Aucune preuve ou application privée ; aucun nouveau fonds documentaire à côté d'Argos-studio. |

L'atelier V1 reçoit des observations sourcées et une annotation descriptive
manuelle. Il ne simule ni ingestion TikTok/Instagram externe ni analyse multimodale
automatique. La lecture du cockpit reste distincte du formulaire opérateur.
