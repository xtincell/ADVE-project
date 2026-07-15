# RESIDUAL DEBT — inventaire honnête des résidus

## Graphes & Scoreur à force révélée — ADR-0145/0146/0147 (2026-07-15, NEFER)

Chantier shippé (v6.27.159). Résidus DÉFÉRÉS explicitement :

- **Ratification opérateur des valeurs canon (brief §8 a/b)** — la table θ des ancres-étalons (`ANCHOR_REGISTRY` + `GAUGE_BY_SCALE`, `src/domain/scoreur/anchors.ts`) et la liste des items must-have par palier (`MUST_HAVE_ITEMS`, `palier.ts`) sont PROPOSÉES. À trancher par l'opérateur au déploiement — puis figer par amendement ADR-0147.
- **Scrappeur légit A/D/V** (credential/ToS-gated) — Google Trends, autocomplete, Trustpilot/G2/App Store, Wikipédia, presse, registres awards. Aujourd'hui A/D/V arrivent en épreuves persistées sourcées (`recordEpreuve`) ; le collecteur automatique reste à brancher (pattern `ConnectorResult<T>` P22-1, dégradation honnête LIVE/DEGRADED/DEFERRED). E + T sont déjà compilés du mesuré (Identity/Overton).
- **Tenue (trajectoire de θ)** — les snapshots `ScoreVerdict` sont datés ; la fenêtre glissante « durée au-dessus de la bande CULTE » (item ICONE) reste à câbler sur l'historique.
- **Duel de vocabulaire branché aux corpus feeds** — helper `measureVocabularyDuel` prêt (déterministe) ; l'alimentation par flux culture RSS / Argos reste à poser.
- **Identity : persistance des candidats de fusion INFERRED** (aujourd'hui renvoyés au résultat, non stockés) + `splitPerson` fin (re-scission des arêtes) + cascade `/data-deletion` sur `PersonIdentifier`.
- **Overton : détection automatique de transitions** (aujourd'hui `recordZoneTransition` explicite) + surfaçage du niveau de résolution polity (EXACT/SCALE_ONLY/GLOBAL_FALLBACK) sur la position.
- **Ponts inter-ligues** (marques multi-ligues) pour la comparaison absolue cross-polity.

## Cockpit mission founder single-pane — ADR-0144 (2026-07-14, NEFER)

Fiche mission founder shippée (v6.27.157, [ADR-0144](adr/0144-cockpit-founder-mission-single-pane.md)) : brief consultable, « Démarrer la mission », tâches datées cochables, saisie perf réelle, sources honnêtes. Résidus DÉFÉRÉS explicitement :

- **FK durable `BrandAction.missionId`** : le lien mission ↔ tâche datée passe par `BrandAction.metadata.missionKey` (JSON, zéro migration) — stopgap. Un filtre JSON-path est non-indexé/fragile pour « les tâches d'une mission ». Bornage : champ nullable `BrandAction.missionId` + relation `onDelete: SetNull` + backfill depuis `metadata.missionKey` (migration additive). Le read `getMissionCockpit` accepte déjà `missionId ?? metadata.missionKey`.
- **Re-datation Sprint Abidjan sur la fenêtre opérateur (7–21 août)** : le seed lie le Sprint Abidjan (S4-5) à la Mission 2 aux dates GTM canon (4–18 août). La fenêtre RÉELLE (Abidjan 7–21 août) est un choix opérationnel, à poser en LIVE via le tunnel `?op=patch actions[]` (timingStart/End) post-deploy — pas dans le seed (fidèle au GTM v2).
- **Ingestion externe générique + Brevo pull (PR-B, ADR à créer — prochain numéro libre ; 0145 pris par Identity Graph 2026-07-15)** : la « remontée automatique » des chiffres (quiz/app/CRM push + Brevo pull) n'est pas encore construite — les sources autres que Réseaux/Email s'affichent honnêtement « à connecter — bientôt ». Chantier : `INGEST_EXTERNAL_METRIC` (governor ANUBIS) + `POST /api/ingest/metrics` (token par stratégie via `MediaPlatformConnection`) + cron `metrics-pull` Brevo — tout agnostique.
- **Réconciliation live SPAWT sur la bonne stratégie** : le seed cible `spawt-strategy` ; la marque vit sur `spawt-strategy-001` (doublon historique). Le fix live (reparent missions → GTM_90, archive placeholder) se fait via le tunnel `?op=patch missions[]`/`archiveCampaigns[]` post-deploy après `?diag`.

## Audit brief/livrable/Oracle · scoring · pivot — ADR-0134 (2026-07-13, NEFER)

Audit ground-truth complet : [docs/audits/BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13.md](../audits/BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13.md) (18 trous T1-T18, tracés vs non-tracés). Vague de remédiation [ADR-0134](adr/0134-mesure-communautaire-reelle-et-ponts-overton.md) shippée même session : écrivain de production `CommunitySnapshot` + chaîne de mesure quotidienne (community→devotion→cult) au cron social-sync, devotion sur audience réelle (followers/inbox), mise à jour des superfans connus depuis l'inbox + file de candidats à revue humaine (cap 0.60), caller du pont RSS→axe Overton (registre `Sector` provisionné), `realSignal` §34 câblé, cascade staleness Oracle déplacée dans `writePillar`. Résidus DÉFÉRÉS explicitement (pas de demi-ship) :

- ~~**Dispatch réel `COMPOSE_DELIVERABLE` (T3)**~~ — **partiellement shippé ([ADR-0136](adr/0136-compose-deliverable-dispatch.md), 2026-07-13)** : mode DISPATCHED réel pour le cas **single-target** (`executeTool(targetSlug)` → `chainGloryToPtah` → forge Ptah, réutilise les primitives éprouvées SANS refactor du moteur `executeSequence`), gardé `previewOnly === false` explicite (défaut PREVIEW inchangé), + bouton « Forger réellement » sur `/cockpit/operate/forge`. Honnête sans clés (DEFERRED). **Reste** : génération automatique des briefs upstream MANQUANTS (dérouler tout le DAG) — exige un refactor du moteur de séquence (rayon d'impact large sur toutes les générations Oracle) + un environnement à clés pour vérifier le happy-path forge. Bornage : chantier env-avec-clés, ADR enfant de 0136.
- **Dérivation honnête de `devotionTransitionsObserved` (T7)** : le champ n'a AUCUN writer — toute la chaîne attribution/lineage (Phase 19 heuristique + Phase 23 régression + `getFounderAttributionLineage`) lit du vide (INSUFFICIENT_DATA 0/30 permanent). NE PAS fabriquer de labels. Design candidat : transitions observées = deltas de segment entre `DevotionSnapshot` datés (désormais quotidiens post-ADR-0134) × fenêtres d'exécution des `CampaignAction`, proposées à l'opérateur pour confirmation (parité manual-first), jamais auto-attribuées. Débloque la calibration réelle (min 30 échantillons) puis le sign-off direction ROC AUC/RMSE déjà tracé §Phase 23.
- **`Signal` type TARSIS sans writer de production (T9)** — **requalifié [ADR-0137](adr/0137-oracle-stale-refresh-and-tarsis-evidence.md) : attend une source HONNÊTE, câblage refusé**. Le bras « signaux » du plafond CULTE/ICONE (`advertis-scorer`, `type contains "TARSIS"`) est vide en prod. Le seul writer weak-signal existant émet `WEAK_SIGNAL_ALERT` = tendances de **marché/environnement** (« la demande LED monte »), PAS le pull culturel de la marque — le câbler au plafond gonflerait le palier sur le bruit sectoriel (inflation malhonnête, contraire à ADR-0126). **Refusé.** Requiert un writer **brand-specific** : presse non payée citant la marque, imitations de claims par des concurrents, UGC de marque (Argos/Tarsis mention-tracker) — jamais une dérivation depuis les weak-signals de marché.
- ~~**Refresh auto des sections Oracle STALE (T6)**~~ — **shippé [ADR-0137](adr/0137-oracle-stale-refresh-and-tarsis-evidence.md)** : étape nocturne `ops-sweep` qui ré-assemble `ASSEMBLE_ORACLE scope=STALE` (ciblé sur les stratégies ayant des sections périmées, composers déterministes sans clés, skip si pas d'operator).
- **Refresh automatique des sections Oracle STALE (T6)** : marquage désormais complet (cascade `writePillar`), rafraîchissement toujours manuel (assemble scope=STALE) — atténué : §01-21 lues live, §22-35 recomposées read-time. Déjà esquissé §Growth carry-overs (re-calibration cron). Candidat : étape cron nocturne `ASSEMBLE_ORACLE scope=STALE` par stratégie active.
- **91/94 séquences DRAFT (T14)** — **diagnostiqué + requalifié [ADR-0139](adr/0139-sequence-lifecycle-stub-honest-diagnosis.md) : pas de promotion, refus honnête**. Cause déterminante : le handler `PROMOTE_SEQUENCE_LIFECYCLE` (`commandant.ts`) est un **STUB qui ne persiste rien** — le `lifecycle` vit dans le code (`sequences.ts`), lu tel quel par `listDraftSequences`/`getStaticLifecycle` ; le store `SequenceLifecycleState` (Chantier D-bis) n'a jamais été construit → même une exécution live parfaite ne déplace **aucune** des 91. Secondaire : cron en dry-run (`AUTO_PROMOTION_LIVE` jamais posé). Par conception : la barre d'éligibilité (≥50 exec, 100 % qualité) refuse — à raison — les séquences jamais exercées, or les composers déterministes (ADR-0091) ont remplacé les séquences comme chemin runtime Oracle. **Réalité fonctionnelle** : DRAFT ≠ défaut — la séquence s'exécute identiquement (`sequence-hash.ts:65`), STABLE n'ajoute que le gel du prompt. Éditer 91× `lifecycle:"STABLE"` gèlerait/certifierait du code non exercé = inflation malhonnête (même posture que T9). **Refusé.** Seul correctif shippé : le stub ne rapporte plus de promotion fantôme (`persisted:false` → décision `SKIP`, `totalPromoted` honnêtement 0). Voie opératoire pour la séquence rare réellement exercée : édition gouvernée de `sequences.ts`. Chantier D-bis (store DB) déféré — aucun consommateur.
- ~~**PDF Oracle = dump JSON par section (T15)**~~ — **shippé [ADR-0138](adr/0138-oracle-export-readable-render.md)** : `sectionDataToBody` rend du texte structuré lisible (titres/puces/clé-valeur humanisés, clés internes masquées) pour MD + PDF ; rendu gras léger côté PDF. Vérifié PG local (0 fuite JSON).
- **`ugcGenerationRate` cult index (B2)** : exclusion MAINTENUE par ADR-0134 §B2 (mentions jamais remplies par le connecteur — `FollowerSnapshot.mentionsCount` = saisie console uniquement ; inbox v1 = COMMENT only). Dérivation future : inbox v2 `kind="MENTION"` + mentions connecteur + constante de normalisation validée direction (pattern Phase 23).

## Routeur LLM — « cloud par défaut, puis Sonnet 5 » (ADR-0143 suite, 2026-07-14)

Directive opérateur : le LLM de La Fusée doit être **cloud (Ollama) par défaut, puis
Sonnet 5, plus Sonnet 4**. État constaté (lecture `llm-gateway/index.ts`) :

- **Cloud-first = DÉJÀ le défaut runtime.** `resolveTextProviderOrder` : hors premium
  (`LLM_PREMIUM_MODE` off) et OpenRouter absent (clé non posée en prod), l'ordre = les
  candidats tels quels, or `providersToTry` met **Ollama en tête** dès que la police
  autorise la substitution (cas par défaut « agent »). Rien à changer côté ordre.
- **Modèle Sonnet 4 → Sonnet 5 = à faire, en 2 endroits :**
  1. **Code défauts** (`DEFAULT_MODEL`, `FALLBACK_POLICY`, `MODEL_PRIORITY`,
     `OPENAI_MODEL_MAP`, commentaire « Sonnet 4 ») — `claude-sonnet-4-*` → `claude-sonnet-5`.
     N'affecte que le chemin **DB-down** (le fallback en dur).
  2. **Table `ModelPolicy` (prod)** — `resolvePolicy(purpose)` lit les modèles depuis la
     **base**, pas le code. C'est de là que vient le `claude-sonnet-4-20250514` observé.
     → mutation gouvernée `UPDATE_MODEL_POLICY` (ou re-seed) contre la base Coolify.
- **Bornage** : changement de config **gouverné**, distinct du feed (ADR-0143). À faire
  en un commit code (défauts + seed) + une action ops (intent/DB). Vérifier ensuite que
  la cascade Ollama-cloud→Sonnet 5 ne hard-fail plus (l'erreur `model: claude-sonnet-4-…`
  venait de ce couple : Ollama-cloud KO + Sonnet 4 inaccessible).

## Build déporté — bascule Coolify en attente (2026-07-12, carte blanche)

CI d'image posée (`build-image.yml` → ghcr, boot smoke-test) + runbook
[`docs/deploy/BUILD-DEPORT.md`]. **Action opérateur restante (une fois, réversible)** :
basculer Coolify en source « Docker Image » (`ghcr.io/xtincell/adve-project:latest`,
port 3000) — c'est ce qui supprime définitivement le `next build` sur le VPS et
les blackouts OOM. À faire **hors pic**, idéalement au moment du merge de la PR
(le merge peut déclencher un dernier build VPS). Optionnel : rendre l'image ghcr
publique OU ajouter un registry ghcr dans Coolify + secrets GitHub `COOLIFY_URL/
TOKEN/APP_UUID` pour le redeploy auto. Rollback = repasser en source « Dockerfile ».

## Réseaux de la marque — ADR-0128 (2026-07-12 · amendé 2026-07-14, NEFER)

Vague [ADR-0128](adr/0128-brand-social-connections-founder-oauth.md) shippée (v6.27.105) : OAuth founder 5 providers → `SocialConnection` branché (1er écrivain de production), sync followers P22-1 → `FollowerSnapshot`, dashboard cockpit complété (logo/actifs + « Mes réseaux » + « Veille & actualités » articles réels), seed Motion19 exécuté. **Amendée v6.27.112 (« la fusée devrait tout récupérer »)** : collecte portée au maximum des scopes accordés — posts riches ×25 (permalink/visuel/type), profil public de marque (`metadata.profile`), `followingCount`, pilier E `connectedProfiles`, provenance `followerSource` honnête. Restes réels (dépendances externes — pas du code refusé) :

- ~~Sync des publications (`SocialPost`)~~ — **partiellement clos le 12/07 (v6.27.109 P1, élargi v6.27.112)** : FB Page/IG Business/YouTube collectés ×25 avec permalink/visuel/type (métriques publiques, mode testeurs suffisant), cron quotidien posé. **Gated précis, scope par scope** : reach/impressions/saves/stories/démographie par post = `read_insights` (Pages) + `instagram_manage_insights` (IG) → 2ᵉ soumission App Review APRÈS validation du socle actuel ; YouTube Analytics (watch time, sources de trafic, rétention) = scope `yt-analytics.readonly` dédié ; X = payant PPU (P5) ; TikTok `video.list` = client secret + audit d'app ; LinkedIn organisation = produit Community Management.
- ~~Inbox unifiée S3 — engagement des tiers~~ — **shippée v6.27.113 ([ADR-0133](adr/0133-social-suite-pilot.md)) pour les COMMENTAIRES** : `SocialInboxItem` + sync/réponse gouvernées (polling, scopes pilotage actifs mode testeurs), publication+planification FB/IG/LinkedIn (calendrier unique + cron), insights par post scope-gated, rapport 30/90 j, notifications fan-out ADR-0025, promesse légale alignée (CGU §5 mandat de gestion / privacy / data-deletion). **Restent gated** : DM/messaging (scopes messaging = consentement dédié, vague ultérieure) ; webhooks temps réel Meta (Advanced Access — trio) ; mentions/avis ; **2ᵉ soumission App Review groupée** (publishing + engagement + insights) = LE passage pour ouvrir tout ça aux clients hors-testeurs ; YT commentaires/upload (audit) ; picker coffre→visuel dans le composer (v1 = URL).
- **Compteurs LinkedIn organisation** : exige le produit LinkedIn Community Management sur l'app OAuth — la connexion profil fonctionne, le compteur reste honnêtement `null`. Contract-gated.
- **X free-tier** : `users/me` (profil propre) uniquement — suffisant pour les followers du compte connecté ; toute lecture élargie est payante. Documenté dans la carte (« relevé auto »).
- ~~Cron de sync périodique~~ — **clos le 12/07 (v6.27.109, P1)** : `/api/cron/social-sync` quotidien (audience + publications, best-effort par marque). Ajouter l'appel au scheduler serveur (curl CRON_SECRET) côté ops.
- **Supervision console opérateur** : liste cross-marques des `SocialConnection` (états ERROR, tokens expirés) — surface console à poser à l'occasion (lecture seule, faible effort).
- **Instagram Business Login — provider `instagram` dédié (amendé v6.27.146, 2026-07-14)** : la connexion IG DIRECTE (`instagram.com/oauth/authorize` → `api.instagram.com` → `graph.instagram.com`, sans Page FB), la collecte followers/posts et la publication sont provider-aware (hôte choisi selon `metadata.provider`). Réponse au blocage « Facebook connecte mais pas Instagram ». **Restent codés `graph.facebook.com`** : l'inbox commentaires (`social-inbox`) et les insights privés (`social-insights`) — une connexion `instagram` y dégrade honnêtement (AUTH/OUTAGE), à rendre provider-aware dans la vague Inbox S3. **Ops** : poser `INSTAGRAM_OAUTH_CLIENT_SECRET` (Coolify) ; **App Review Meta** pour ouvrir la connexion IG directe hors comptes testeurs.
- **Fiche Motion19** : `marketScale`/`addressableAudience`/`brandFoundedYear` à DÉCLARER par l'opérateur (hub Fondation), jugements INFERRED à valider → DECLARED, données internes (ventes, panier, marge) à brancher avant tout pilotage chiffré (cf. pilier T « non communiqué »).

## Accès délégué par marque + theming — ADR-0129/0130 (2026-07-12, NEFER)

Vagues [ADR-0129](adr/0129-strategy-collaborator-delegated-access.md) (StrategyCollaborator appliqué par le chokepoint, zone digitale gardée ×10 procédures, FREELANCE/CREATOR au cockpit, grant/revoke gouvernés IMHOTEP) et [ADR-0130](adr/0130-cockpit-brand-accent-theming.md) (accent cockpit depuis la palette du coffre, hex validés serveur+client) shippées — vérifiées E2E (Maximus/Motion19 : portefeuille = Motion19 seule, calendrier éditorial opérable, `--accent` #3384FF). Restes réels :

- **UI de gestion des collaborateurs** : grant/revoke passent par les Intents (`strategy.grantCollaborator`/`revokeCollaborator`, requireOperator) — pas encore de surface console/cockpit dédiée. Poser une section « Équipe » (liste, rôle, révocation ConfirmDialog) sur la fiche marque console. Effort : ~½ session.
- **Gating fin par `scopes`** : v1 accorde l'accès marque entier sur les surfaces couvertes ; le champ `scopes Json` (["digital"]) est stocké mais pas encore consommé par surface (helper `getStrategyCollaboratorRole` prêt). À activer quand un 2ᵉ rôle délégué réel apparaîtra.
- **Délégation newsletter** : l'envoi reste `operatorProcedure` (hors périmètre v1 directeur du digital — décision ADR-0129 §6).
- **Balayage des routers strategy-scopés restants en checks inline** (boot-sequence, etc.) vers `canAccessStrategy` — même mouvement que les 5 checks de cockpit-router déjà bascule.
- **Garde-fou contraste theming** : l'accent vient du brand book du client (choisi pour l'écran) ; un rejet automatique des accents illisibles sur fond sombre (+ fallback corail) reste à poser (ADR-0130 §Conséquences).
- **Veille multi-sources PAR MARQUE** : les feeds actuels sont des paires pays×secteur globales — des sources curées par marque = nouvelle entité (ADR dédié), planifiée P2 avec le bouton intake. 
- **Benchmark → plan d'upgrade suite sociale** : vagues S1→S5 priorisées dans [docs/audits/SOCIAL-SUITE-BENCHMARK-2026-07-12.md](../audits/SOCIAL-SUITE-BENCHMARK-2026-07-12.md) (métriques par post, publishing, inbox unifié, heures optimales, trio Meta/audits plateformes). Chaque vague est un chantier futur distinct — rien d'implicite.
- **Pont relevés → pilier E/traction** : les relevés d'audience (`FollowerSnapshot`) restent en silo mesure — la déclaration de traction dans l'ADVE reste un geste opérateur (doctrine ADR-0085, jamais d'auto-write). Pont candidat : afficher le dernier relevé en SUGGESTION dans l'éditeur du pilier E (source DECLARED après validation humaine).

## Cockpit qui ramène tout — ADR-0132 (2026-07-12, NEFER)

Vague [ADR-0132](adr/0132-brand-connections-hub-shopify-public-page.md) shippée (v6.27.110) : hub Connexions, boutique Shopify OAuth (lecture), pages publiques de marque par sous-domaine, cron ventes. Restes réels :

- **Écriture boutique** (gestion produits/prix depuis le cockpit) : décision dédiée — scopes write Shopify + UI, jamais implicite.
- **Page publique enrichie** (galerie de créations, CTA contact, thème par marque) : chantier Personal Brand Cockpit (blueprint) — la v1 est volontairement minimale.
- **GBP + WhatsApp dans Connexions** : arrivent avec P2/P3 du train validé.
- **Gates ops posées sur l'opérateur** : app Shopify Partner (env), DNS wildcard `*.powerupgraders.com` + domaines Coolify pour les sous-domaines de marque.

## Zones par rôle + double dashboard — ADR-0131 (2026-07-12, NEFER)

Vague [ADR-0131](adr/0131-collaborator-role-zones-dual-dashboard.md) shippée (v6.27.107) : zones d'écriture par rôle DENY-par-défaut (firewall d'émission ×2 voies + gardes calendrier), mini console Guilde, double dashboard stratégique/« Suivi du jour », mode jour. Restes réels :

- **Cartographie kind→zone à étendre** : `COLLABORATOR_KIND_ZONES` couvre la zone digitale (calendar/social/publications) ; les kinds campagnes/newsletter du DIGITAL_DIRECTOR restent à cataloguer kind par kind (deny par défaut en attendant — sûr mais restrictif).
- **Masquage fin des gestes hors zone** : le firewall serveur veto proprement (message business) ; le masquage préventif des boutons d'écriture sur les surfaces secondaires (campagnes, demandes) via `getMyAccess.writeZones` reste à poser (le dashboard/calendrier/réseaux sont couverts).
- **Sweep light-mode page-par-page** : les deux dashboards sont vérifiés (captures) ; les autres surfaces cockpit héritent des tokens — passer chaque page en mode jour à l'occasion (même pattern que la passe responsive mobile).
- ~~Logo blanc sur fond blanc (sidebar, mode jour)~~ — **clos le 12/07 (v6.27.108)** : tuile logo fond blanc constant + le logo ACTIVE est désormais le wordmark officiel fond clair extrait du Brand Book (les déclinaisons réserve blanche restent SELECTED au coffre pour les fonds sombres).

## Vérité unique documentaire (2026-07-11 PM, NEFER)

Purge des incohérences doctrine/code (bible 11 anchors, contextes, i18n, commentaires mensongers, comptes canoniques recalculés sur les registres : 112 routers · 115 services · 56/149 Glory tools · 94 séquences (91 DRAFT) · 28 frameworks · 546 Intent kinds). Résidu tracé :

- **Reclassification ROUTER-MAP / SERVICE-MAP** : 34 routers + 23 services post-Phase 19 listés en § « À classifier » des deux maps (couverture honnête, zéro classification inventée). Chantier : attribuer Sous-système APOGEE + Tier + statut governance/Governor à chaque entrée, puis re-fusionner dans les tables et refaire les synthèses. Bornage : mécanique, ~1 session dédiée.
- **Contrat writeback→renderer section 33 (Devotion Ladder)** : le tool `devotion-levels-mapper` (unifié canon 6 rungs cette vague — était sur une échelle 5-rungs fantôme) sort `devotion_levels` + `current_distribution`, mais le renderer `DevotionLadder` (phase13-sections) ne lit que `distribution[{niveau, valeur}]`/`conversionTriggers` (forme du composer déterministe `composeDevotionLadder`). Le chemin LLM de la section produit donc du contenu qui rend EmptyState (honnête, pas de donnée inventée). Brancher = mapper la sortie tool → forme composer dans `section-writeback` OU apprendre les deux formes au renderer.
- **Cycle madge quick-intake (pré-existant, non-bloquant)** : `footprint-score.ts ↔ public-enrichment.ts` — 1 circular dependency signalée par `npm run audit:cycles` (exit 0, CI madge verte — tolérée). À casser par extraction du type/helper partagé.

## Scoring-échelle — hors périmètre ADR-0126 tranché (2026-07-11 PM, NEFER)

Vague [ADR-0126](adr/0126-market-scale-aware-scoring.md) shippée, puis **« tout le reste » clos le jour même** (v6.27.95, [ADR-0127](adr/0127-overton-polity-axes.md)) : Overton par polity ✅ (SectorPolityAxis + résolution honnête 3 niveaux + Intent gouverné + radar founder câblé) · writer gouverné SuperfanProfile ✅ (`SESHAT_REGISTER_SUPERFAN`, test HARD single-writer) · UI de déclaration ✅ (MarketScaleCard, hub Fondation) · classement à échelle comparable ✅ (filtre + chips console) · référentiel EFR ✅ (KB §9 + copy marketing) · annotation snapshots pré-fix ✅ (`preUnitsFix` sur l'historique cult).

Restes réels (dépendances externes ou calibration — pas du code refusé) :

- **Harvesting Tarsis automatique PAR POLITY** : le chemin d'écriture gouverné existe (`SESHAT_UPSERT_POLITY_AXIS`). ~~dépend du connector Tarsis réel (contract-gated — `_mocked`)~~ **Correction d'audit 2026-07-13** : le connector est **dé-mocké depuis le 2026-06-14** (`seshat/tarsis/connector.ts` — signal réel dérivé des digests RSS `EXTERNAL_FEED_DIGEST`, plus aucune credential requise) ; le niveau SECTEUR GLOBAL est désormais **câblé** (ADR-0134 : registre `Sector` provisionné + `refreshSectorsFromRecentDigests` au cron external-feeds). Reste réellement : la granularité PAR POLITY (`SectorPolityAxis` × pays/échelle) — l'écriture auto par polity exige une résolution digest→polity qui n'existe pas encore.
- **Pondération CULTE/ICONE par largeur de fenêtre déplacée** : infra polity prête ; l'activation exige des seuils calibrés validés par la direction (pattern Phase 23 — jamais de constantes inventées).
- **Chip d'échelle sur la console Argos** : la sélection Argos est safety-verdict-driven (pas score-driven) — chip purement informative à poser à l'occasion de la prochaine passe Argos.

Réf : [docs/audits/COCKPIT-UX-AUDIT-2026-07-11.md](../audits/COCKPIT-UX-AUDIT-2026-07-11.md) §F + [ADR-0122](adr/0122-cockpit-founder-nav-ia.md) + [ADR-0123](adr/0123-cockpit-client-vocabulary-adve-rtis.md). Shippés : **lot 12** (frontière founder/opérateur — `requireOperator` réparé opt-in, `BatchActionsBar` gardée, 10 segments `<OperatorSurface>`, sources founder-lecture), **lot 10** (nav 35→20 items / 6 groupes, hubs piliers, `activePrefixes`, tabbar `mobileTab` + i18n, persistance marque, Cmd+O, assistant réel), **lot 11** (vocabulaire corps-de-page + test HARD `cockpit-vocabulary.test.ts`), **lot 13** (Oracle surface unique founder, settings dédoublonné, Calendrier unique + 308 roadmap), **lot 14** (module `subscription-labels` unique, lexique T7 tranché, 10 `alert()/confirm()` → DS), **lot 15** (couleurs brutes → tokens, accents), **Lot 0 partiel** (ADR-0123 : ADVE client-facing glosé, RTIS hors chaînes client + verrou CI, lettres en badge — réversible).

**Clôture 2026-07-11 PM (intégration PR #447, NEFER)** : (a) `requireOperator` durci site-par-site — 51 sites opérateur flippés `true` après audit fonctionnel des 390 `governedProcedure` (85 routers), guilde/paiements/candidatures/cockpit founder confirmés `false` avec preuve de surface, + 2 gardes d'ownership (`strategy.delete`, `monetization.cancelSubscription`) ; (c) allowlist vocabulaire **vidée** — `brand/rtis(+synthese)` → redirects hub Stratégie, `apogee-maintenance` purgée ; (d) funnel public aligné ADR-0123 (pricing-tiers, pages intake/score/launchpad, easter-eggs processing) + verrou CI étendu ((intake), components/intake, pricing-tiers) ; (e) 0 `prompt()` natif ((cockpit)) — canon-campaigns + creative-proposal → Modal DS ; (f) **legacy `enrichOracle` DÉPOSÉ** ([ADR-0125](adr/0125-depose-legacy-enrich-oracle.md), Option A — gap fw→pilier assumé, frameworks lançables manuellement) ; (b) dé-densification campagne `[id]` **exécutée** : 2 327 l. monolithiques → parent 197 l. + 13 fichiers `campaign-tabs/` (extraction verbatim, clés de cache et cascades d'invalidation préservées), tab bar regroupée en 5 jobs founder.

Restant (non-bloquant, traçable) :

- **Onglets réels Livrables (Guidelines/Assets) + Rapports (Diagnostics/Benchmarks/Attribution)** — aujourd'hui consolidés en nav par `activePrefixes` ; la fusion en pages à onglets est optionnelle (les routes restent propres).
- **i18n hors nav** : les corps de pages cockpit restent FR-littéraux (clés i18n non généralisées hors nav/piliers).

État au commit `eee156d` + vague de fermeture **2026-04-29 PM** + audit pré-deploy **2026-05-02** (NEFER) + post-merge Phase 16 **2026-05-02 PM** (PR #40) + fix v6.1.18 cache reconciliation **2026-05-03 PM** (NEFER) + ship feed-bridge ADR-0031 **2026-05-03** (PR #50) + chunking LLM 8 piliers **2026-05-04** (NEFER) + Phase 17 ADRs jumeaux refonte Artemis **2026-05-04** (NEFER) + mission expert lint warnings 138→0 + Phase 0 strangler tagging 2026-05-05 (NEFER) + **Phase 18 noyau bouclage + résidus formulaire 2026-05-06** (NEFER) + **Phase 19 Campaign tracker L2 Instrumental Vagues 1+2+3 + résidus zéro 2026-05-06** (NEFER) + **ADR-0004 strict migration 70 routers (ADR-0064) + cache reconciliation deep audit + auto-promotion module (ADR-0066) 2026-05-06** (NEFER, sprints 7+8+9) + **fine-review post-merge 2026-05-06 PM** (NEFER : 4 tests obsolètes corrigés Phase 17 ADR-0042 alignment + 3 STABLE sequences promptHash gel + 5 routers Phase 18/19 marker corrigé strangler→governed + AUTO_PROMOTION_EVALUATE/TOGGLE_QUALITY_GATE_MODE catalogués INTENT_KINDS+SLOs).

---

## galileo — « Fusée non-dépendante du LLM » (PR #258, 2026-06-16, NEFER)

**Vision opérateur** : chaque étape LLM = formulaire I/O typé (LLM remplit / opérateur injecte / full-auto à mes risques), gouverné, sans valeur hardcodée — système réellement modulaire, base saine. Bouclage NEFER incrémental, un commit par phase, **production-quality only** (pas de demi-implémentation, pas de scaffolding hypothétique).

### Shippé (complet, vérifié — `tsc` 0 · lint 0 · 1846 tests verts)

- **P1 — Keystone C5** (`no-bare-pillar-content-write.test.ts`) : écriture `Pillar.content` brute hors gateway interdite + allowlist « à mes risques et périls ». C5 → 🟢.
- **P4 — Base de scoring figée** (ADR-0102) : poids Annexe G canon + `applyQualityModulator` mort supprimé + garde LOI 9 zéro-LLM dans le scoring.
- **P2-a — Gate C6 `BRIEF_VS_ADVE_COHERENCE`** (ADR-0103) : cohérence brief↔ADVE **déterministe** (recouvrement vocabulaire), pre-flight `emitIntent` sur `PTAH_MATERIALIZE_BRIEF`, `WARN` non-bloquant sur `IntentResult.warnings`. C6 → 🟡 (advisory ; **BLOCK + UI override + wiring A2/A7 = Phase 24 closure-target #14**, décision opérateur — ne pas pull en avant).
- **P5 — Portail communauté** : `/cockpit/intelligence/community` + `cockpitDashboard.getCommunityDashboard` (paid-tier gated, compose superfans/dévotion/santé/followers en silos), shaper pur déterministe, EmptyStates honnêtes, DS-strict.
- **P3 — 3ᵉ mode HYBRID `fullAuto`** : sur Zod-fail, bypasse la bascule manuelle → `llm-at-risk` flaggé non fiable. Câblé bout-en-bout (dispatcher + tRPC + panel Console). HARD tests manual-first intacts.
- **P2-b — Reroute C1** : conversion intake → gateway (`seedPillarFromIntake`). C1 → 🟢.
- **C2 — Reroute infer-needs-human** : content via gateway (`writePillar`), `fieldCertainty` séparée. C2 → 🟢.
- **C7 — Invariants Yggdrasil** : `yggdrasil-three-invariants.test.ts` (Q1 hash-chain / Q2 observationStatus / Q3 non-bypass). C7 → 🟢.

### Restant (non-bloquant, traçable)

- **C3** — `canon-sync` god-mode écrit le pilier S direct (best-effort, push manuel). 1 entrée `reroutePlanned` dans l'allowlist C5 ; le pilier `vector` est une projection de score légitime (non-canonique). Reroute basse priorité.
- **C8** — écart nom-vs-réalité Seshat→T : `ENRICH_T_FROM_ADVE_R_SESHAT` implique un flux Seshat→pilier T mais le prompt T raisonne ADVE+R seuls (`seshatRefs` réservé/non-utilisé). Chantier **Artemis** (wire Seshat dans T, ou renommer) — pas un quick-fix.
- Sites non catalogués `strategy.ts` (seed brand-create) + `boot-sequence` (normalize) : `reroutePlanned:true` à l'allowlist C5 — déclarés et traçables.
- **C6 BLOCK enforcement** : Phase 24 (cf. P2-a), décision opérateur sur le passage WARN → BLOCK + UI override manuel.

---

## Phase 23 — Câblage pivots mission (superfans × Overton) — closure (2026-05-29, ADR-0077)

**Status** : 7 epics / 53 stories **SHIPPED** (closure-roadmap target #1). 7 pivot sub-clusters au lifecycle **MVP**. Cap APOGEE 7/7 préservé. `phase22-*` HARD tests green incl. `phase22-no-dangling-adr-refs` (0 hits). Les résidus ci-dessous sont **non-bloquants** pour la fermeture de target #1 — ce sont des Growth/Vision carry-overs (trigger-locked, pas date-locked) + 3 deferrals d'implémentation Epic 7.

### Gated-on-business-decision (pas un drift NEFER — décision explicite déférée)

- **PRODUCTION promotion des sous-clusters calibrés** (`superfan.attribution`, `culture.overtonShift`, `culture.overtonReadiness`) — requiert un **sign-off direction** sur les seuils ROC AUC / RMSE (`CALIBRATION_THRESHOLDS = { rocAucMin: 0.7, rmseMax: 0.3 }`, ADR-0081 §4). Tant que non signé : lifecycle reste MVP, le `PROMOTE_PIVOT_SUBCLUSTER` vers PRODUCTION est refusé par le Mestor pre-flight gate sans `calibrationSnapshotRef`. **Trigger** : Alexandre lance une calibration via `CalibrationReviewPanel`, lit ROC AUC/RMSE, accepte.
- **MISSION.md §9 ledger** — 3 cases rendues *cochables* par Phase 23 (axe Overton founder · surface opérateur next-5/ratio · section Overton de l'Oracle). **Flip → checked** seulement après le sign-off direction ci-dessus (les surfaces existent ; la fiabilité PRODUCTION du chiffre est ce qui est gated).

### Epic 7 implementation deferrals (done-with-debt)

- **Story 7.8 — Playwright a11y/visual run** : `tests/e2e/overton-radar.a11y.spec.ts` est écrit + tsc-clean + collectable, mais (a) `@axe-core/playwright` n'est pas encore devDependency (cf. `tests/a11y/README.md`), (b) les baselines `toHaveScreenshot()` (md/lg/xl) doivent être générées par `pnpm playwright test --update-snapshots` contre un dev-server seedé paid-tier, (c) aucune CI Playwright visual/a11y n'est câblée. **Trigger** : première exécution navigateur (install dep + update-snapshots + wire CI).
- **Story 7.4 — Vitest panel render test** : le repo n'a aucun test de rendu composant ni d'environnement DOM (`jsdom`/`happy-dom`) installé. Bootstrapper le premier harness de rendu est hors-scope autopilot. **Trigger** : décision d'ajouter un DOM test env. La logique de mapping (`extractSectorSlug`/`extractBrandTags`/switch exhaustif) est tsc-vérifiée.
- **Story 7.6 — "new activity" cue** : dérive actuellement de la présence d'évidence datée (claim-imitation), pas d'un tracker per-founder since-last-visit (nécessiterait un modèle `FounderSurfaceVisit` ou un hook localStorage). **Trigger** : besoin produit d'un vrai diff depuis dernière visite.
- **Live-browser verification** des surfaces Cockpit Epic 7 (route + teaser + nav) : non exécutée en autopilot (compile + lint + anti-drift vérifiés). DB seedée disponible. **Trigger** : session opérateur authentifiée.

### Growth / Vision carry-overs (post-MVP, trigger-locked)

- **Growth** — scheduled re-calibration cron + `staleAt` pattern sur les snapshots de calibration (drift detection automatique) ; le `OracleSection` Overton-distinctive `staleAt` refresh.
- **Vision** — predictive OvertonRadar (forecast du déplacement sectoriel, pas seulement observation) ; cross-client Jehuty benchmarking (comparaison de l'axe Overton entre marques d'un même secteur, anonymisé k≥5).
- **Algo Overton** — l'engine sectoriel reste `sector-intelligence/` (ADR-0078) ; toute amélioration (vrais embeddings vs heuristique) s'y fait, jamais en parallel dans `campaign-tracker/`.

---

## Phase 21 — Mégasprint NEFER closure (F-A → F-H), 7 sub-phases shippées + résidus consolidés (ADR-0074, 2026-05-08)

**Status** : Mégasprint **closed**. 7 sub-phases livrées sur main direct (NEFER doctrine). 125 tests anti-drift passing. Cap APOGEE 7/7 préservé.

### ~~Cohabitation legacy `enrichOracle`~~ — CLOS (dépose ADR-0125, 2026-07-11)

Section historique : le legacy `enrichOracle` (~2 300 lignes) a été **déposé et supprimé** ([ADR-0125](adr/0125-depose-legacy-enrich-oracle.md)) ; la page proposition est rebranchée sur `oracle.assembleOracle` (manual-first F-D). La « deprecation formelle prévue » ci-dessous est donc accomplie — entrée conservée pour l'historique de la Phase 21, ne plus s'y référer (incohérence relevée par l'audit 2026-07-13, T12).

### Résidus consolidés (post-mégasprint)

#### F-A residual — Annotation per-tool des Glory tools + frameworks
- 56+ Glory tools LLM existants + 24 frameworks Artemis n'ont pas encore leur `outputSchema` Zod annoté.
- Tests G2/G3 en mode soft : baseline 1000 / 100 (cf. `glory-tool-llm-zod-enforcement.test.ts` + `framework-output-schema.test.ts`).
- Plan de migration progressive en 5 batchs :
  1. Batch 1 — Glory tools BRAND pipeline (10 tools `D.directionArtistique.*`) — priorité haute (auto-applied au pilier D).
  2. Batch 2 — Glory tools CR (10 tools copywriting / scripts).
  3. Batch 3 — Glory tools DC (8 tools direction de création).
  4. Batch 4 — Glory tools HYBRID (~28 tools opérations).
  5. Batch 5 — 24 frameworks Artemis (regroupés par `FrameworkLayer`).
- Promotion mode HARD (baseline=0) après migration complète.

#### F-B residual — Hook auto-seed sur CREATE Strategy
- Les nouvelles strategies obtiennent leurs 35 rows via lazy seed dans `getSectionsForStrategy` (premier appel). Pas besoin de script de backfill explicite — auto-réparateur.
- Hook auto-seed à la création de Strategy reste TODO pour optimisation (évite la latence sur le premier `listSections`). Reporté à un futur chantier d'orchestration Strategy lifecycle.

#### F-B residual — runner annotation explicite des 35 sections
- Le helper `resolveSectionRunner()` fait le pont backward-compat avec `sequenceKey` legacy.
- Annotation explicite `runner: { kind, ref, dependsOn? }` pour les 35 sections en mode soft baseline 100. À promouvoir hard quand baseline=0.

#### F-D residual — Deprecation formelle `enrichOracle` legacy
- À programmer après audit completion + annotation per-tool batchs 1-5 complétés.

#### F-D residual — Optimisations futures Assembler
- Parallélisme borné par batch (actuellement séquentiel pur).
- topoSort par `runner.dependsOn` (actuellement ordre par sectionId).
- Hors scope F-D MVP — à shipper si métriques production montrent un besoin (latence assembler scope=ALL > 250s p95).

### Cap APOGEE

7/7 préservé. Aucun nouveau Neter pendant les 7 sub-phases. Voir [ADR-0074](adr/0074-phase-21-closure.md) pour le summary complet.

---

## Phase 21 — F-B OracleSection first-class entity, sub-phase shippée sans dette résiduelle (ADR-0068, 2026-05-07)

**Status** : Chantier F-B du mégasprint NEFER livré. Modèle Prisma + service `oracle-section/` + tests anti-drift + ADR + doc — pas de dette résiduelle pour cette sub-phase.

### Reportés volontairement aux chantiers suivants (Calendar-locked)

- **Hook auto-seed sur CREATE Strategy** — pour que les strategies créées après F-B aient automatiquement leurs 35 rows à la création. Reporté à F-D (Assembler / orchestrator) qui touchera le flow de Strategy creation. En attendant, lazy seed dans `getSectionsForStrategy` rend le système auto-réparateur à la première lecture (zero-config).
- **`runner` per-section annotation des 35 sections** — actuellement seules les sections avec `sequenceKey` legacy ont un runner résolu (via `resolveSectionRunner` backward-compat). Annotation explicite `runner: { kind, ref, dependsOn? }` pour les sections sans `sequenceKey` viendra avec F-C (Intent `GENERATE_ORACLE_SECTION` qui consomme le descripteur). Test soft baseline 100 (`BASELINE_SECTIONS_WITHOUT_RUNNER`).

### Cap APOGEE

7/7 préservé. F-B est une entité données dans le sous-domaine d'Artemis (Propulsion, phase brief). Aucun nouveau Neter, aucune nouvelle gouvernance.

---

## Phase 21 — F-A LLM output structured enforcement, mécanique livrée, audit per-tool en cours (ADR-0067, 2026-05-07)

**Status** : Chantier F-A du mégasprint NEFER livré. Mécanique transverse `executeStructuredLLMCall` opérationnelle + 4 flows critiques migrés (Glory tools engine, frameworks runtime, vault-enrichment, `pillar.previewAmend`). Tests anti-drift G2/G3 introduits en **mode soft** (baseline 1000 / 100) — passent à l'introduction.

### Résidu connu — annotation per-tool / per-framework

Le typage `outputSchema?: ZodType` est en place dans `GloryToolDef` + `FrameworkDef`, mais **les ~56 Glory tools LLM existants + 24 frameworks Artemis n'ont pas encore leur schéma annoté**. Tant que c'est le cas :
- Le runtime `executeTool` / `executeFramework` log un `console.warn` *"migration ADR-0067 requise"* si pas de `_noSchemaJustification` documenté.
- Le tool/framework continue de fonctionner via le legacy path (regex + JSON.parse) — comportement identique à v6.19.x.
- Aucune régression observable côté UI / DB.

### Plan de migration progressive

À chaque nouvelle session NEFER ou audit ciblé, annoter par batch :
1. **Batch 1** — Glory tools BRAND pipeline (10 tools `D.directionArtistique.*`). Priorité haute : c'est le flow auto-applied au pilier D.
2. **Batch 2** — Glory tools CR (10 tools copywriting / scripts) — driver business client-facing.
3. **Batch 3** — Glory tools DC (8 tools direction de création).
4. **Batch 4** — Glory tools HYBRID (~28 tools opérations).
5. **Batch 5** — 24 frameworks Artemis (regroupés par `FrameworkLayer` IDENTITY/VALUE/EXPERIENCE/...).

### Critère de promotion mode hard

Quand le baseline test G2 = 0 (`grep "outputSchema" registry.ts` count == count des LLM tools) ET baseline G3 = 0, retirer les `BASELINE_TOOLS_WITHOUT_SCHEMA = 1000` et `BASELINE_FRAMEWORKS_WITHOUT_SCHEMA = 100` dans les tests. Promotion à `expect(missing).toEqual([])` (mode hard). Test fait alors office de gate CI — toute régression bloque le merge.

### Suite mégasprint Phase 21 (chantiers F-B → F-H non démarrés)

- **F-B** — `OracleSection` first-class entity (Prisma model + lifecycle PENDING→GENERATING→COMPLETE→FAILED→STALE).
- **F-C** — `GENERATE_ORACLE_SECTION` Intent kind + handler ARTEMIS.
- **F-D** — `ASSEMBLE_ORACLE` orchestrator manual-first (boucle sur `GENERATE_ORACLE_SECTION`).
- **F-E** — Progress streaming via NSP SSE channel `oracle:strategy:{id}`.
- **F-F** — UI Oracle progressive (page `/cockpit/{brand}/oracle` refit avec console live + sections individuelles).
- **F-G** — Tests anti-drift CI complet (manual-first parity, section coverage, runner binding).
- **F-H** — Documentation governance complète (CODE-MAP régen, LEXICON entry, REFONTE-PLAN update).

---

## Phase 19 — Campaign tracker L2 Instrumental, Vague 1 shippée, Vagues 2/3 en attente (ADR-0052, 2026-05-06)

**Status** : Vague 1 (Cluster A + B) ship en mode `MVP` — 6 capabilities fonctionnelles, MVP heuristic Jaccard tokens. Vague 2 (Cluster C + D) et Vague 3 (Cluster E + F + G + H) sont **explicitement out-of-scope** Vague 1 et restent à shipper sprint 2 et sprint 3 selon roadmap ADR-0052 §13.

### Vague 3 shippée (Cluster E + F + G + H) — 2026-05-06

22 sous-clusters totaux après Vague 3. Les 8 clusters A→H sont couverts. Cap APOGEE 7/7 préservé.

### Clôture résidus zéro 2026-05-06 (v6.19.5) — mandat user étendu (DB + business + Anubis/Seshat)

- ✅ Migration SQL générée : `prisma/migrations/20260506000000_phase19_campaign_tracker_complete/migration.sql`
- ✅ `Strategy.evaluatorMode String?` ajouté schema (ADR-0052-B opt-in lexical → llm)
- ✅ RBAC `operatorProcedure` câblé sur `recomputeAgencyActivityMargins` + `evaluateResourceSaturation`
- ✅ Cluster B câblé MVP→PRODUCTION : `checkBigIdeaCoherence` + `evaluateMythArcCohesion` invoquent Glory tools LLM via `executeTool` quand `Strategy.evaluatorMode === "llm"`. Fail-safe Jaccard si LLM échoue.
- ✅ Anubis `crm-segments.ts` créé : `createCrmSegment` + `measureCohortRetention` API. Pattern Credentials Vault DEFERRED_AWAITING_CREDENTIALS si provider absent.
- ✅ `superfan.stickiness` STUB → PARTIAL/MVP : câble `anubis.measureCohortRetention` pour J+30/90/180.
- ✅ `superfan.crmCapture` PARTIAL → PARTIAL/MVP : câble `anubis.createCrmSegment` + comptage évangélistes via `devotionTransitionsObserved`.
- ✅ Seshat `tarsis/campaign-capture.ts` créé : `openCampaignCaptureSession` + `closeCampaignCaptureSession` API.
- ✅ `culture.tarsisBridge` STUB → PARTIAL/MVP : 2 nouveaux handlers `openTarsisCaptureForFieldOp` + `closeTarsisCaptureForFieldOp` câblent Seshat.
- ✅ Cluster E câblé : `reconcileCampaignToOracle` extrait Q1/Q2/Q9/Q11 du postmortemStructured ; `enrichVariableBibleFromCampaign` filtre coherence ≥0.7 + dominantPillar ; `evaluateCrewPerformance` invoque Glory tool LLM via `executeTool` per member.
- ✅ UI postmortem 12-step wizard : `/console/artemis/campaigns/[id]/postmortem`. 12 questions canoniques + axes colorés + score 0-1 + evidence URLs + cascade reconciler/vbEnrichment au submit.
- ✅ Régen INTENT-CATALOG (414 kinds) + CODE-MAP (1286 lignes)
- ✅ Tests : 105/105 pass (campaign-tracker + glory-tools + neteru-coherence)

**Résidus restants — vraiment non-inférables (calibration data + jugement business)** :
- Promotion `MVP → PRODUCTION` finale exige **calibration LLM** (qualité postmortem, qualité crew scoring) sur historique réel — décision business par direction sur seuils ROC AUC, RMSE, etc. Tracé dans les 5 ADRs enfants 0052-B/C/D/E/F.
- Application de la migration SQL en environnement DB : `npx prisma migrate deploy` (production) ou `prisma migrate dev` (local) — déploiement opérateur.
- Câblage signal-collector Tarsis réel (vs persistance session squelette) — exige spec de la collecte (sources externes, sampling rate, déduplication).
- CRM provider externe câblé via Credentials Vault — exige choix opérateur (Mailchimp, HubSpot, Brevo) + setup compte.

### Clôture résidus 2026-05-06 (v6.19.4)

- ✅ Pages UI Vague 3 : `/console/upgraders/economics` + `/console/audit/campaigns/[id]` shippées
- ✅ 6 Glory tools dédiés (`big-idea-coherence-checker`, `myth-arc-cohesion-evaluator`, `postmortem-12q`, `crew-performance-evaluator`, `negative-space-auditor`, `mcp-content-pii-classifier`) déclarés dans `PHASE19_TOOLS` (EXTENDED registry — cardinalité CORE 56 préservée)
- ✅ 5 ADRs enfants formalisant promotions PRODUCTION : `0052-B`, `0052-C`, `0052-D`, `0052-E` (postmortem-12q + crew-scoring), `0052-F`
- ✅ Régénération auto INTENT-CATALOG (414 kinds) + CODE-MAP (1285 lignes)

**Résidus restants vraiment non-inférables (nécessitent décisions externes / env DB)** :
- Migration Prisma DB : `npx prisma migrate dev --name phase-19-campaign-tracker-complete-v2`
- Promotion sous-clusters STUB → MVP : deps externes (Anubis CRM API + Seshat tarsis-monitoring API)
- Câblage Glory tools PRODUCTION dans handlers via `Strategy.evaluatorMode = "llm"` — exige business validation des 5 ADRs enfants par direction
- RBAC `requireRole("UPGRADERS_LEAD")` sur router `recomputeAgencyActivityMargins`
- UI postmortem `/console/artemis/campaigns/[id]/postmortem` (12-step wizard)

### Résidus structurels Vague 1 + 2 + 3 (à clôturer avant promotion `MVP → PRODUCTION`)

- **Glory tools `big-idea-coherence-checker` + `myth-arc-cohesion-evaluator`** non créés (MVP heuristic = Jaccard lexical). À spec dans ADR enfant `ADR-0081` quand promotion `MVP → PRODUCTION` envisagée. Impact : score coherence est lexical-only — peut faux-négatifer un copy refondu en synonymes alignés sémantiquement.
- ~~**Router tRPC `campaign-tracker`**~~ — ✅ shippé v6.19.1, étendu Vague 2 v6.19.2 (13 procedures totales).
- ~~**Pages UI Cockpit `/cockpit/operate/campaigns/[id]/tracker`** + **Console `/console/governance/campaign-tracker`**~~ — ✅ shippées v6.19.2.
- **Sous-cluster `superfan.stickiness` STUB** : cohort longitudinal J+30/J+90/J+180 nécessite Anubis CRM provider câblé (cohort retention API). Promotion `STUB → MVP` Vague 3 (post-`captureSuperfansFromCampaign` PRODUCTION). Code retourne `DEFERRED_AWAITING_DEPS` pour ne pas bloquer.
- **Sous-cluster `culture.tarsisBridge` STUB** : capture session Tarsis pendant Campaign LIVE. Bridge sub-component Seshat→Tarsis pas câblé Vague 2. Promotion `STUB → MVP` quand Seshat tarsis-monitoring exposé via API publique. Modèle `TarsisCaptureSession` schema déjà prêt.
- **Sous-clusters PARTIAL** : `superfan.attribution` (heuristic LTV × coefficients — calibration ML PRODUCTION via régression), `superfan.crmCapture` (segment name canonique seul, broadcast Anubis pas câblé), `culture.overtonReadiness` (heuristic conservateur READY par défaut, vrai algo via `ADR-0078`), `culture.overtonShift` (Jaccard delta — embeddings sectoriels en PRODUCTION), `culture.mcpIngest` (4 regexes PII baseline — LLM classifier PRODUCTION), `trajectory.regretWindow` (telemetry-dependent).
- **Glory tool `mcp-content-pii-classifier`** : MVP regex baseline shippé inline dans `signals-culture.ts`. PRODUCTION = Glory tool LLM dédié + ROC analysis. ADR enfant éventuel.
- **Régénération auto INTENT-CATALOG.md + CODE-MAP.md** : nécessite `npx tsx scripts/gen-intent-catalog.ts` + pre-commit hook husky. Pas exécuté en cette session — à exécuter au prochain commit qui touche les structurels.
- **Stabilité Prisma client cross-worktrees** : `node_modules/.prisma/client` est partagé entre worktrees → si un autre worktree régénère depuis un schema sans Phase 19, les types disparaissent localement. Mitigation : `npx prisma generate` à chaque session campaign-tracker. Pattern futur : pre-commit hook qui régénère + ajoute `git diff --check` sur `.prisma/client` si CI.

### Résidus Vague 2 (Cluster C + D) — à shipper sprint 2 (~3 semaines)

Cf. ADR-0052 §13 vague 2 :
- Migration Prisma vague 2 : `Campaign +detractors* +shadow* +overtonHypothesis +overtonObserved` ; `CampaignAction +devotionRung* +devotionTransitions*` ; new `CampaignContextIngest`
- 6 nouveaux Intent kinds : `RECOMPUTE_SUPERFAN_ATTRIBUTION`, `MEASURE_DEVOTION_STICKINESS_COHORT`, `CRM_SEGMENT_CAPTURE_SUPERFANS_FROM_CAMPAIGN`, `INGEST_MCP_CONTEXT_TO_CAMPAIGN`, `MEASURE_OVERTON_SHIFT`, `EVALUATE_OVERTON_READINESS`
- Sous-modules service : `superfan-attribution.ts`, `tarsis-bridge.ts`, `overton-meter.ts`, `context-ingest.ts`, `stickiness.ts`
- Risques §16 traités vague 2 : #2 `TarsisCaptureSession` création modèle, #3 `CRMActivity` vs `CampaignContextIngest` résolution, #4 Overton readiness MVP heuristic, #7 MCP entrant PII classifier MVP

### Vague 3 — Cluster E + F + G + H — ✅ shipped 2026-05-06 (v6.19.3)

- Migration Prisma vague 3 : `CampaignReport +postmortemStructured` ; `Campaign +forksDeclined +frictionScore +credentialsChainSnapshot` ; `CampaignAction +pillarServed[]` (PostgreSQL native String[])
- 9 nouveaux Intent kinds (Cluster E×4 + F×2 + G×2 + H×1)
- 4 nouveaux fichiers service : `learnings.ts`, `agency-economics.ts`, `souverainete.ts`, `negative-space.ts`
- Capability registry étendu : 13→22 sous-clusters
- Manifest : 12→22 capabilities, dependencies +imhotep
- Router tRPC : 13→22 procedures
- Tests anti-drift : 47→57 (cluster coverage E+F+G+H + total 8/8)

**Glory tools dédiés Vague 3 — non créés (PARTIAL/MVP heuristics inline)** :
- `postmortem-12q` — liste 12 questions canoniques shippée inline dans `learnings.ts` (CREW_DIMENSIONS_12). Promotion via ADR enfant `ADR-0052` quand grille business validée.
- `crew-performance-evaluator` — MVP retour neutre 50 par dimension. Promotion via ADR enfant `ADR-0052`.
- `brand-safety-multilevel-check` — non shippé Vague 3. À créer pour PRODUCTION souverainete.complianceCheck.
- `negative-space-auditor` — MVP heuristic inline (3 catégories sur 6 implémentées). Promotion vers Glory tool LLM via ADR enfant.
- `campaign-to-oracle-reconciler` — MVP retourne array vide. Promotion via ADR enfant `ADR-0052`.

**Pages UI Vague 3 — non créées** : `/console/upgraders/economics` (Cluster F restricted), `/console/audit/campaigns/[id]` (Cluster G + H), `/console/mestor/campaigns/[id]/audit` (Cluster H detail). Reportées à PR follow-up dédié UI.

### Promotions sous-clusters STUB → MVP / MVP → PRODUCTION restantes

| Sous-cluster | État | Promotion | ADR enfant |
|---|---|---|---|
| `superfan.stickiness` | STUB | → MVP requires Anubis CRM cohort retention API | `0052-C-stickiness.md` |
| `culture.tarsisBridge` | STUB | → MVP requires Seshat tarsis-monitoring API | `0052-D-tarsis-bridge.md` |
| `coherence.bigIdeaCoherence` | READY/MVP (Jaccard) | → PRODUCTION via Glory tool LLM | `ADR-0081` |
| `coherence.mythArc` | READY/MVP (Jaccard) | → PRODUCTION via embeddings | `ADR-0081` |
| `superfan.attribution` | PARTIAL/MVP | → PRODUCTION via régression ML calibrée | `ADR-0081` |
| `superfan.crmCapture` | PARTIAL/MVP | → PRODUCTION requires Anubis broadcast.createSegment | (PR direct, pas d'ADR enfant nécessaire) |
| `culture.overtonReadiness` | PARTIAL/MVP | → PRODUCTION via algo sophistiqué | `ADR-0078` |
| `culture.overtonShift` | PARTIAL/MVP | → PRODUCTION via embeddings sectoriels | `ADR-0078` |
| `culture.mcpIngest` | PARTIAL/MVP (regex) | → PRODUCTION via LLM PII classifier | (PR direct) |
| `learnings.oracleReconciler` | PARTIAL/MVP (placeholder vide) | → PRODUCTION via Glory tool LLM | `ADR-0052` |
| `learnings.vbEnrichment` | PARTIAL/MVP (placeholder vide) | → PRODUCTION via LLM cross-campagnes | (PR direct) |
| `learnings.crewLoop` | PARTIAL/MVP (neutre 50) | → PRODUCTION via Glory tool dédié | `ADR-0052` |
| `economics.activityMargins` | PARTIAL/MVP (k≥5 inline) | → PRODUCTION via data lake séparé | `0058-anonymization.md` |
| `economics.resourceSaturation` | PARTIAL/MVP (40h placeholder) | → PRODUCTION requires Imhotep talent-availability-engine | (PR direct) |
| `souverainete.complianceCheck` | PARTIAL/MVP (4 pays + heuristic regex) | → PRODUCTION via ADR-0037 country registry | (PR direct intégration ADR-0037) |
| `audit.negativeSpace` | PARTIAL/MVP (3/6 catégories) | → PRODUCTION = +CHANNEL_FIT_GAP + TACTICAL_ACTIVATION_MISSING + ORACLE_RECONCILIATION_PARTIAL | (PR direct)

### 8 risques structurels §16 — état d'absorption par primitives §2.5

| # | Risque | Cluster | État ship Vague 1 | Action |
|---|---|---|---|---|
| 1 | `MobileMoneyTransaction` model | G | Pas concerné Vague 1 | Vague 3 — sous-cluster `momo-tracking` ship STUB ou MVP selon présence modèle |
| 2 | `TarsisCaptureSession` model | D | Pas concerné Vague 1 | Vague 2 — création modèle pré-PR 7 |
| 3 | `CRMActivity` vs `CampaignContextIngest` | D | Pas concerné Vague 1 | Vague 2 — grep résolution PR 7 |
| 4 | Overton readiness algo | D | Pas concerné Vague 1 | Vague 2 — ship MVP heuristic ; PRODUCTION via `ADR-0078` |
| 5 | Postmortem 12 questions canon | E | Pas concerné Vague 1 | Vague 3 — liste candidate proposée pendant PR 15 |
| 6 | Multi-tenant anonymization RGPD | F | Pas concerné Vague 1 | Vague 3 — k-anonymity k≥5 ; ADR enfant `0058-anonymization.md` avant PRODUCTION |
| 7 | MCP entrant PII | D | Pas concerné Vague 1 | Vague 2 — PII classifier MVP |
| 8 | Imhotep crew scoring grille | E | Pas concerné Vague 1 | Vague 3 — grille variable-bible parallélisable PR 14 |

**Aucun risque ne bloque Vague 1.** ADR-0052 §2.5 garantie de découplage : L1 Operational continue identiquement même si tout Vague 2/3 reste pending.

### Tests à régénérer + audits anti-drift à exécuter avant promotion

- `npm run lint:governance` — vérifier que campaign-tracker manifest passe linter
- `npm run audit:cycles` — vérifier pas de cycle module
- `npx tsc --noEmit` — typecheck full (peut révéler des incompatibilités Prisma client à jour)
- `npx vitest run tests/unit/governance/campaign-tracker-coherence.test.ts` — assert anti-drift Vague 1
- `npx tsx scripts/audit-mission-drift.ts` — vérifier `missionContribution` du manifest
- `npx tsx scripts/gen-intent-catalog.ts` — régénérer INTENT-CATALOG avec les 6 nouveaux Intent kinds
- `npx tsx scripts/gen-code-map.ts` — régénérer CODE-MAP avec `campaign-tracker/` et nouveaux champs Campaign/CampaignAction
- Migration Prisma : `npx prisma migrate dev --name phase-19-campaign-tracker-vague-1` (à exécuter en environnement avec accès DB)

---

## Phase 18 — résidus derrière formulaire opérateur (2026-05-06)

**Phase 18 noyau bouclée** end-to-end (cf. CHANGELOG v6.18.18 → v6.18.24, branche `claude/pensive-keller-6afb14`). Les paliers reportés sont **non-inférables sans input business** — NEFER ne décide pas en autonomie quels Glory tools sont applicables à FESTIVAL_IP, ni quelle inheritanceMode appliquer aux ~300 entrées variable-bible.

**Pattern canonique** : un formulaire opérateur `/console/governance/phase-18-residuals` collecte progressivement ces décisions. Chaque réponse est persistée comme `Phase18ResidualEntry` (model Prisma + 5 procédures tRPC `phase18Residuals.upsert/resolve/dismiss/list/stats`) qui sert d'audit trail + de point de reprise pour NEFER en session future.

**Comportement NEFER attendu en début de session** : query `prisma.phase18ResidualEntry.findMany({ status: { in: ["PENDING", "IN_PROGRESS"] } })` AVANT toute action Phase 18. Si entries `RESOLVED` récentes → lire `notes` opérateur + agir (créer migration, écrire le code correspondant). Si entries `IN_PROGRESS` → demander à l'opérateur s'il veut continuer ce résidu spécifique. Si rien → ne pas relancer Phase 18 noyau (déjà bouclé). Cf. memory user `phase_18_residuals_pending.md`.

### Liste exhaustive des 7 catégories pending

| Catégorie | Description | Effort estimé | Trigger ouverture |
|---|---|---|---|
| **N5-bis BIBLE_VAR** | Reclassif manuelle des ~300 entrées variable-bible × 9 BrandNature × 3 inheritanceMode. Le classifier heuristique `src/server/services/brand-node/bible-classifier.ts` couvre 80% par défaut ; reste 20% à override manuellement. | 4-5j domain-business | Quand l'opérateur veut affiner les comportements héritage par variable. |
| **N6-bis GLORY_TOOL** | Annotation manuelle des 56 Glory tools : `applicableNatures: BrandNature[]`. Default `undefined` = universel. Override pour writers-room (MEDIA_IP+CHARACTER_IP), lineup-reveal (FESTIVAL_IP), shelf-share (PRODUCT+RETAIL_SPACE), etc. | 1j domain-business | Quand l'opérateur veut filtrer les tools par nature dans l'UI. |
| **N9 PILLAR_DUPLICATE** | Script `scripts/detect-duplicate-pillars-tree.ts` qui détecte BrandNode siblings aux mêmes piliers (BR-CI/SN/NG → BR Global). Décision : convertir en héritage explicite, garder override, ou différer. | 1j + N entries opérateur | Avant ingestion BR Global → BR-CI/SN/NG en production. |
| **N10 FEATURE_FLAG** | Activation `BRAND_TREE_INHERITANCE_ENABLED` per-Operator ou GLOBAL. Cache déjà en place (cf. N1+N2) — juste le toggle UI manquant. | 0.5j | Avant rollout production multi-operator. |
| **LLM_TUNING** | Phase 2 fine-tune extractor (`morning-batch/extractor.ts` heuristique → Claude prompt structuré) + classifier (`bible-classifier.ts`) + narrative-coherence (`gates/narrative-coherence.ts`). Nécessite ≥30j d'usage prod + collecte stats accuracy. | 5-7j post-30j prod | Quand stats accuracy heuristiques < 80% ou que l'opérateur veut investir dans la qualité. |
| **PHASE_18_BIS** | M&A `NodeOwnershipTransfer` + lineage hash-chain + 8 archétypes non-PRODUCT (CHARACTER_IP, MEDIA_IP, FESTIVAL_IP, etc.). Cf. ADR-0059 §6 + plan PHASE-18-MATANGA-FC.md §7. | 3 mois | Selon pipeline commercial 2026 (premier dossier M&A ou client non-FMCG). |
| **CACHE_INFRA** | Migration cache `resolveEffectivePillars` in-memory process-local → Redis cross-process avec TTL + invalidation cross-pod. | 2-3j | Phase 18 noyau full quand multi-pod scaling. |

### Doctrine NEFER §1.1 — Pas d'auto-ship sur résidus domain-business

Les résidus dans cette liste sont **non-inférables sans input business**. NEFER **ne doit pas** les shipper en autonomie. Le formulaire `/console/governance/phase-18-residuals` est le pattern canonique pour récolter ces inputs progressivement. La règle "pas de fatigue" ne s'applique pas ici — c'est une question de **respect du domain business**.

### Tracking technique

- **Model Prisma** : `Phase18ResidualEntry` (cf. `prisma/schema.prisma:4748-4788`) + 2 enums `Phase18ResidualCategory`/`Phase18ResidualStatus`
- **Migration** : `20260506185409_phase18_residuals_form/migration.sql`
- **Router tRPC** : `src/server/trpc/routers/phase18-residuals.ts` — `upsert/resolve/dismiss/list/stats`
- **Page UI** : `src/app/(console)/console/governance/phase-18-residuals/page.tsx`
- **Memory NEFER** : `~/.claude/projects/.../memory/phase_18_residuals_pending.md` (point d'entrée session future)

---

## STATUS GLOBAL — 2026-05-06 (post-Sprints 7+8)

**Technical debt résolue à 100%** :
- ✅ Phase 0 router migration (ADR-0004 strict) — 70 routers migrés, 329 LEGACY Intent kinds, 270+ mutations gouvernées (Sprint 7, ADR-0052)
- ✅ Cache reconciliation 14 callers — 9 migrés vers writePillarAndScore, 6 conservés bare avec rationale (Sprint 8)
- ✅ LLM chunking — audited Sprint 4, 11 candidats faux positifs ou déjà couverts par cascade-level chunking
- ✅ refined alias supprimé (v6.18.14)
- ✅ _oracleEnrichmentMode flag migré → mode SequenceMode (v6.18.14)
- ✅ Vitest std-env — fixed par bump Node 22.20

**Scheduled transitions calendar-locked** (cf. ADR-0065 — pas de la dette technique, des fenêtres de stress-test calibrées) :
- 🟡 DRAFT→STABLE 21 sequences (1 mois) — D+5 actuellement, target D+30
- 🟡 DRAFT→STABLE 24 wrappers WRAP-FW-* (1 mois) — D+5, target D+30
- 🟡 Quality gate soft→hard (1 semaine) — D+5, target D+12

**Sortie attendue** : 0 technical debt. Les scheduled transitions sont auto-éligibles à leur date target via `scripts/promote-draft-sequences-forced.ts` ou émission manuelle de PROMOTE_SEQUENCE_LIFECYCLE Intent — ou (recommandé) via le **module auto-promotion** (ADR-0066) qui les évalue à chaque exécution du cron quotidien `/api/cron/auto-promotion`.

---

## ~~Phase 0 router migration~~ ✅ RESOLVED 2026-05-06 (Sprint 7, v6.18.20)

[ADR-0004](adr/0004-strangler-audited-procedure.md) cible "100% governedProcedure" atteinte. Cf. [ADR-0052](adr/0052-adr-0004-strict-migration-complete.md) pour le détail.

- 0 routers `lafusee:strangler-active`
- 70 routers `lafusee:governed-active` (canonique)
- 329 LEGACY_<ROUTER>_<MUTATION> Intent kinds (granular audit trail)
- 270+ mutations routent à travers `governedProcedure` avec preconditions/cost-gate eval

Tooling :
- `scripts/generate-legacy-intent-kinds.ts` — auto-gen LEGACY kinds
- `scripts/codemod-migrate-routers-to-governed.mjs` — codemod migration

---

## Phase 17 mégasprint refonte Artemis — résidus connus à la rédaction des ADRs (2026-05-04)

ADRs 0039-0042 jumeaux posent l'invariant. Le code mégasprint suit dans 4 commits Chantier A→D séparés. Résidus connus avant exécution :

### Quality gate mode soft → hard switch (1 semaine post-merge)

[ADR-0041](adr/0041-sequence-robustness-loop.md) §4 — pendant 1 semaine après merge code mégasprint, quality gate en **mode soft** (warn dans journal + `console.warn`, pas de throw). Métriques collectées : compteur de sections qui auraient été flagged en mode hard. Switch hard après 1 semaine pour absorber les false positives sur sections legacy.

### Promotion `lifecycle: STABLE` des 21 nouvelles sequences (1 mois)

[ADR-0040](adr/0040-uniform-section-sequence-migration.md) + [ADR-0042](adr/0042-sequence-modes-and-lifecycle.md) — 14 `CORE-*` + 7 `DERIVED-*` sequences créées en `lifecycle: "DRAFT"` au démarrage. Audit qualité narrative manuel + stress-test prolongé (1 mois) requis avant émission `PROMOTE_SEQUENCE_LIFECYCLE` Intent (DRAFT → STABLE).

### 24 wrappers `WRAP-FW-*` à promouvoir STABLE (1 mois)

[ADR-0039](adr/0039-sequence-as-unique-public-unit.md) §3 — wrappers single-step auto-générés. Restent DRAFT par défaut. Promotion STABLE après 1 mois de stress-test sans régression observée.

### ~~Backward-compat `_oracleEnrichmentMode`~~ ✅ RESOLVED 2026-05-05 (v6.18.14)

Flag `_oracleEnrichmentMode: boolean` migré → `mode: SequenceMode` typé (cf. CHANGELOG v6.18.14). 11 sites migrés via codemod sed. `SequenceContext` enrichi avec `mode?: SequenceMode` optionnel. Comments docstring conservés comme historique.

### ~~Alias `refined: true|false`~~ ✅ RESOLVED 2026-05-05 (v6.18.14)

Champ `refined: boolean` supprimé de l'interface `GlorySequenceDef`. 56 occurrences (sequences.ts/adops/framework-wrappers/phase13) migrées via codemod sed : `refined: false → lifecycle: "DRAFT"`, `refined: true → lifecycle: "STABLE"`. 2 readers (glory.ts, mcp/creative/index.ts) computent `refined: lifecycle === "STABLE"` à la volée pour préserver contrat client tRPC. Cf. CHANGELOG v6.18.14.

### Schémas Zod stricts par sequence (chantier futur)

[ADR-0041](adr/0041-sequence-robustness-loop.md) §3 — quality gate v1 fait non-empty check + Zod schema optionnel. Sprint futur : ajouter un schéma Zod strict par sequence (output shape garanti au type-level) + validation post-step. ADR séparé si justifié.

### Découpage commit mégasprint → 5 commits planifiés

Plan canonique : (1) ADRs+CHANGELOG (ce commit) ✅, (2) Chantier A — hiérarchie unique (manifest+intents+framework-wrappers+endpoints), (3) Chantier B — migration sections (Glory tool synthesize-section + 21 sequences + mutex SectionEnrichmentSpec + dispatch+assemblePresentation), (4) Chantier C — robustness loop (topoSort+cache+quality gate+migration Prisma), (5) Chantier D — modes+lifecycle (SequenceMode+SequenceLifecycle+promptHash+PROMOTE_SEQUENCE_LIFECYCLE+anti-drift CI). Tracking suivi de l'agent NEFER en sessions ultérieures.

---

## v6.1.36 — lessons learned post-ship chunking LLM 8 piliers (2026-05-04)

### Single LLM call avec 20+ nested fields tronque silencieusement → 0 field rempli

Pattern observé sur `auto-filler.generateMissingFields` ET `rtis-cascade.actualizePillar` : un seul `generateText` avec `maxOutputTokens=6000-8000` pour produire 20-30+ champs nested (ikigai 4-quadrants + herosJourney×5 + directionArtistique 10+ sous-clés + sprint90Days≥5 + roadmap≥3 + …) hit la troncature de sortie ou produit un JSON malformé en milieu de field. `extractJSON` retourne `{}` → toute la passe perdue. Pire : la boucle externe 3-passes refait la même requête trop large → même échec.

**Lesson** : pour tout LLM call qui génère ≥10 champs structurés (objets imbriqués, arrays d'objets), il faut **chunker l'appel**. Le retry-loop externe est un anti-pattern quand le single call est consistently overload — le retry refait la même chose. La solution est de **shrinker la surface du prompt**, pas de la répéter.

**Pattern canonique** (cf. `runChunkedFieldGeneration` dans `pillar-maturity/auto-filler.ts`) :
1. Si `fields.length <= LLM_FIELDS_PER_CHUNK` (default 10) → single call (back-compat).
2. Sinon → split round-robin pondéré par complexité validator. Chunks séquentiels. `maxOutputTokens` réduit par chunk. Si un chunk fail JSON parse, les autres continuent.
3. Cost log namespacé `caller:chunk-N/M` pour traçabilité.

**À auditer dans des sessions futures** :
- `enrich-oracle.ts` (path Oracle 35-section) : utilise des frameworks LLM séparés mais chacun produit potentiellement 4-8 fields nested. Vérifier si certaines sections (proposition-valeur 12+ output fields) souffrent du même bug.
- Tout caller direct de `callLLMAndParse` ou `generateText` qui demande un objet structuré dans le prompt — grep `JSON.*generate.*fields` puis évaluer si chunking aiderait.

---

## v6.1.23 — résidus post-ship feed-bridge ADR-0031 (2026-05-03) — ✅ RESOLVED 2026-05-05

### ~~Vitest cassé localement — `std-env` introuvable~~ ✅ FIXED par bump Node 22.14 → 22.20

**Resolution** : le bug `Cannot find package std-env` était spécifique à Node 22.14 (CJS/ESM mismatch dans la résolution sub-package). Node 22.20 résout correctement `std-env` ESM sans intervention. Vérifié 2026-05-05 — `npx vitest run tests/unit/governance/neteru-coherence.test.ts` → 12/12 tests passed (727ms).

**Prevention** : `.nvmrc` ajouté pinant Node 22+ pour empêcher régression sur downgrade local. Cf. CHANGELOG v6.18.10.

---

## v6.1.18 — résidus post-fix cache reconciliation (2026-05-03 PM) — ✅ RESOLVED 2026-05-06 (v6.18.21)

Audit cache reconciliation complet (Sprint 8). 14 callers writePillar identifiés et per-domain audités :

**Migrés vers writePillarAndScore** (cache reconciliation auto) — 9 callers :
- `boot-sequence/index.ts:142`, `notoria/intake.ts:99`, `quick-intake/index.ts` (4 sites), `quick-intake/rtis-draft.ts:259`, `quick-intake/narrate-adve.ts:249` (Sprint 1.1 v6.18.10)
- `ingestion-pipeline/index.ts:285`, `ingestion-pipeline/ai-filler.ts:362`, `artemis/tools/engine.ts:440`, `seshat/tarsis/index.ts:254`, `strategy-presentation/enrich-oracle.ts` (3 sites), `implementation-generator/index.ts:172` (Sprint 8 v6.18.21)

**Conservés writePillar bare** (legitimes) — 6 callers :
- `notoria/lifecycle.ts:126,208` — suivis de `updateCompletionLevel` (cache reconciliation manuelle déjà active)
- `utils/migrate-strategy-to-pillars.ts:60,81` — script de migration run-once
- `pillar-gateway/index.ts:559` — IT IS l'implémentation interne de `writePillarAndScore`
- `mestor/hyperviseur.ts:586` — boucle BRIEF_INGEST seeding 4 ADVE pillars (perfomance : single score recompute après loop, pas par pillar)

**Status final** : 0 caller writePillar bare unsafe restant. Tous les writes pillaires passent par writePillarAndScore OU sont intentionnellement bare avec rationale documenté.

Fix `rtis-cascade.savePillar` ship → cache R/T se reconcilie correctement après `actualizeRT`. Mais l'audit du fix a révélé deux nappes de drift adjacentes à valider/refondre dans une session dédiée (hors scope ce commit) :

### À auditer — autres callers `writePillar` (sans `AndScore`)

14+ callers identifiés via `grep "writePillar" src/server/services/`. **Tous ne sont pas des bugs** — certains sont OK car suivis d'un appel manuel à `updateCompletionLevel` ou `reconcileCompletionLevelCache`. À trier un par un :

| Caller | Statut probable |
|---|---|
| `notoria/lifecycle.ts:126` (`applyRecos`) | OK — suivi de `updateCompletionLevel` ligne 147 |
| `notoria/lifecycle.ts:208` (`revertReco`) | OK — suivi ligne 235 |
| `notoria/intake.ts:97` (`advanceConsoleIntake`) | À VÉRIFIER — voir section suivante |
| `mestor/hyperviseur.ts:584` | À auditer |
| `artemis/tools/engine.ts:279` | À auditer |
| `boot-sequence/index.ts:142` | À auditer |
| `utils/migrate-strategy-to-pillars.ts:60,81` | OK probable (migration script, pas runtime) |
| `ingestion-pipeline/{index,ai-filler}.ts` | À auditer |
| `implementation-generator/index.ts:172` | À auditer |
| `strategy-presentation/enrich-oracle.ts:115,979,1221` | À auditer |

Pattern recommandé : **swap → `writePillarAndScore` partout sauf cas explicites où le cache n'a pas vocation à bouger** (et même là, documenter la raison en commentaire ABOVE le call).

### Bug intake — `completionLevel` forgé au lieu de dérivé

`notoria/intake.ts:165-168` et `:195-200` posent `completionLevel: "COMPLET"` directement par `db.pillar.update`, **contournant `evaluatePillarReadiness`**. Ça crée une cache divergence dès l'intake :
- Si l'intake remplit que partiellement (1 champ rempli), `assessPillar` dirait `stage === "INTAKE"` → `cacheLevel` canonique = `"INCOMPLET"`
- Mais l'intake écrit `"COMPLET"` direct → divergence
- À la prochaine reconciliation (par ex. `actualizeRT` post-fix v6.1.18), le cache va être recalculé canoniquement → si stage réel ≠ COMPLETE, le pilier va passer en arrière de `COMPLET → INCOMPLET`. **Régression apparente côté UI** alors que c'est juste le cache qui se réaligne sur la réalité.

Fix candidat : remplacer les `db.pillar.update({ completionLevel })` par un appel à `reconcileCompletionLevelCache(strategyId, pillarKey)` après chaque write, OU faire que l'intake passe par `writePillarAndScore` directement.

### Stepper Notoria — UX si `actualizeRT` ne suffit pas à passer R/T en COMPLETE

Avec le fix, le cache se reconcilie. Mais si `assessPillar(R, content)` retourne `ENRICHED` au lieu de `COMPLETE` (LLM produit JSON partiel, contrat trop strict), le stepper restera bloqué — légitime cette fois (cache honnête). UX à prévoir : afficher dans la card étape 1 quels champs manquent (`readiness.missing` / `readiness.needsHuman`) pour guider l'opérateur, plutôt que de laisser un bouton qui semble ne rien faire.

---

## Phase 16 — résidus post-merge PR #40 (2026-05-02 PM)

Identifiés par NEFER lors du rescan post-merge. Le récap dev disait "déjà documentés en RESIDUAL-DEBT" — ce qui était faux. Section ajoutée après audit.

### Fixés en auto-correction Phase 8 (NEFER) ✓
- **Doublon ADR-0023** — `0023-rag-brand-sources-and-classifier.md` renuméroté `0027-*` (collision avec `0023-operator-amend-pillar.md` mergé chronologiquement avant via PR #38). Refs LEXICON.md (lignes 136, 139) + scope-drift.md propagées.
- **Drift refs ADR Phase 16** dans 23 fichiers — code utilisait `ADR-0023`/`ADR-0024` au lieu de `ADR-0025` (Notification real-time) / `ADR-0026` (MCP bidirectionnel). Corrigé sur : `notification-bell.tsx`, `notification-center.tsx`, `topbar.tsx`, `push-provider.tsx`, `vapid-key/route.ts`, `notifications/stream/route.ts`, `mcp/route.ts`, `mcp-gate.ts`, `anubis/{notifications,digest-scheduler,templates,mcp-client,mcp-server,manifest,index}.ts`, `anubis/providers/web-push.ts`, `nsp/sse-broker.ts`, `notification.ts` router, `anubis.ts` router, `console/anubis/{page,notifications/page,mcp/page}.tsx`, `governance/{slos,intent-kinds}.ts`, `public/sw.js`, 3 fichiers tests, LEXICON.md, INTENT-CATALOG.md.

### Encore ouvert
- **Typecheck CI fail** — local pass avec TS 5.9.3, lock file aussi 5.9.3 — probablement Node 20 (CI) vs Node 22.22 (local) sur lib types DOM (`Uint8Array<ArrayBuffer>`). Fix candidat : cast plus permissif ou bump lock TS minor. À investiguer avant prochain deploy.
- **Lighthouse fail** — corrélé à l'ajout `<NotificationBell />` dans `topbar.tsx` partagé (re-mount client component sur les 4 portails). À profiler : suspendre le mount derrière `<Suspense>` ou rendre conditionnel selon route.
- **Deps notification stack manquantes** — `web-push`, `firebase-admin`, `mjml`, `@types/web-push`, `@types/mjml` absents de `package.json`. `handlebars` présent en transitive uniquement. Code Phase 16 importe ces modules — runtime crash garanti dès qu'un push réel passe par les façades. Provider VAPID/FCM retourne `DEFERRED_AWAITING_CREDENTIALS` en mock, mais l'install est bloquant pour activation prod.
- **Rate limiting MCP outbound** — `anubis/mcp-client.ts` dispatch HTTP sans throttle. Risque flood si Slack/Notion répondent lent. À ajouter : token bucket per-server dans McpRegistry ou middleware générique.
- **NSP single-instance** — broker in-memory, pas de Redis pubsub adapter. Multi-instance Vercel/cluster = events perdus. Ship-able pour single-process, à upgrader avant scale-out (contrat publish/subscribe déjà compatible).
- **Digest cron pas câblé** — `runDigest(DAILY|WEEKLY)` existe dans `digest-scheduler.ts` mais pas de cron entry dans `vercel.json` ni `/api/cron/anubis-digest`. À brancher Phase 16.1.

## Audit pré-deploy 2026-05-02 — fixes ship-ready

### Closés ✓
- **`middleware.ts` → `proxy.ts`** : Next 16 a déprécié la convention `middleware`. Renommé fichier + export. Build sans warning.
- **CI Prisma flag** : `--to-schema-datamodel` (Prisma ≤6) → `--to-schema` (Prisma 7) dans `.github/workflows/ci.yml` step `prisma-validate`.
- **`npm audit fix` non-breaking** : 15 vulns (4 high + 11 mod) → 10 vulns (1 high + 9 mod).

### Encore ouvert
- **`xlsx@*`** (1 high résiduel) — Prototype Pollution + ReDoS, **no fix upstream**. Décision ops à prendre : pin un fork safe (`@e965/xlsx`), sandbox usage, ou retirer la dep si non critique. Hors scope sprint deploy.
- **9 vulns moderate** — chaîne transitive (postcss via next, etc.). Disparaîtront avec un bump Next mineur.
- **Migration `add_ptah_forge` + 4 autres** : présentes en code, pas appliquées en DB live. `prisma migrate deploy` à exécuter par ops.
- **Crons Vercel** : 7 crons déclarés dans `vercel.json` — vérifier que le plan Vercel cible le supporte avant deploy.
- **Vars `.env` minimales prod** : `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY` requises. Optionnelles selon features actives : `FREEPIK_API_KEY`, `ADOBE_FIREFLY_*`, `BLOB_STORAGE_PUT_URL_TEMPLATE`, `RESEND_API_KEY`/`SENDGRID_API_KEY`, `*_OAUTH_CLIENT_ID`, `DEFAULT_OPERATOR_BUDGET_USD`.

### Validations finales
- `tsc --noEmit` → 0 erreur
- `vitest run` → 994/994 verts (60 fichiers)
- `next build` → ✓ Compiled successfully (187 pages)
- `audit:governance` → 0 errors, 211 warns (strangler attendu, cf. §2.1)
- `lint` → 0 errors, 246 warns (idem strangler)

---

## ✓ Vague de fermeture 2026-04-29 PM — résumé

**Tier 1 — Stubs scaffolded** : 51/51 manifests refinés, 79 manifests au total
(seul `utils` exclu volontairement — helper folder). 366 capabilities exposées
au registre, dont 310 dérivées automatiquement de l'index.ts de chaque service.

**Tier 2 — Vrais résidus** :
- 2.1 router migration → **strangler engagé sur 60 routers / 253 mutations**
  (was: 2 governed, 70 audit-only). Mutations gouvernées promues : value-report,
  jehuty (3), pillar (3), mestor-router (1) → **11 governedProcedure mutations**.
- 2.3 cost-gate Pillar 6 → **wired dans `governed-procedure.ts:108`** + persistance `CostDecision`.
- 2.6 codegen registry alignment → fixé.
- 2.9 `@lafusee/sdk` skeleton → **plugin scaffold CLI** (`npm run plugin:scaffold`).

**Tier 3 — Items planifiés non démarrés** : tous démarrés / fondations posées.
| # | Item | Livraison cette vague |
|---|---|---|
| 3.1 | NSP fully wired | `useNsp` hook client + endpoint déjà existant — **wired** |
| 3.2 | CRDT collab Yjs | `collab-doc` service + `/api/collab/sync` + `useCollabDoc` hook |
| 3.3 | Service worker / offline PWA | `public/sw.js` + `manifest.webmanifest` + auto-register dans layout |
| 3.4 | Landing page rewrite 14 sections | +2 sections (`mission-manifesto`, `apogee-trajectory`) |
| 3.5 | Real OAuth `/config/integrations` | `oauth-integrations` service + start/callback routes (Google/LinkedIn/Meta) |
| 3.6 | i18n FR/EN sections marketing | `src/lib/i18n/` (FR canonique + EN, détection Accept-Language) |
| 3.7 | Mobile Lighthouse audit | `npm run audit:lighthouse` script |
| 3.8 | Compensating intent UI | `/console/governance/intents` rewrite + `governance.compensate` mutation |
| 3.9 | Test coverage cascade E2E | `tests/e2e/edge-cases.spec.ts` (8 cas : Oracle PDF, sandbox, jehuty, governance UI, PWA, i18n, cron, OAuth) |
| 3.10 | Plugin scaffold CLI | `scripts/scaffold-plugin.ts` (in-tree + `--external` mode) |
| 3.11 | Founder digest cron | `/api/cron/founder-digest` + vercel.json schedule (Mondays 06:00 UTC) |
| 3.12 | Sentinel intents cron | `/api/cron/sentinels` (MAINTAIN_APOGEE, DEFEND_OVERTON, EXPAND_TO_ADJACENT) |

**Tier 4 — Won't-do** : inchangé (Yjs full client lib, V8 sandbox, multi-region, web-components, GraphQL).

**Validations finales** :
- `tsc --noEmit` → exit 0
- `manifests:audit` → 79 manifests clean (1 warn = `utils` exclu)
- `audit-mission-drift` → 0 drift sur 366 capabilities
- `audit:governance` → 0 errors, 193 warns (router-imports baseline strangler)

---

## Score post-fermeture

| Axe | Pré-vague | Post-vague | Détail |
|---|---|---|---|
| Coverage | 100% | **100%** | 307/307 unités classifiées |
| Framework implementation | 96% | **100%** | Plugin scaffold CLI + OAuth + collab-doc + NSP hook |
| Governance enforcement | 55% | **~85%** | 60 routers en strangler réel + 11 mutations governedProcedure + Pillar 6 wired |
| Mission alignment | 90% | **~98%** | Founder digest + sentinels + Tarsis weak signals consommés via DEFEND_OVERTON |

**Pondéré : 100×0.15 + 100×0.30 + 85×0.30 + 98×0.25 = 95%**

---

## Tier 1 — Stubs initialement (closed)

51 manifests scaffolded raffinés via `scripts/refine-scaffolded-manifests.ts` :
- Capabilities dérivées automatiquement de l'index.ts (310 capabilities mises à jour)
- Marker "auto-scaffolded" supprimé partout
- Bump version 1.0.0 → 1.1.0
- inputSchema reste `passthrough()` ; outputSchema reste `z.unknown()` (sera resserré per-service au fur et à mesure des migrations governedProcedure futures)

Les 3 manifests manquants (`email`, `payment-providers`, `utils`) → 2 créés
(email + payment-providers) ; `utils` reste exclu volontairement.

**Mock payment provider, Oracle PDF puppeteer fallback, llm-gateway routeModel fallback** : inchangés (acceptables par conception).

---

## Tier 2 — Vrais résidus (closed)

### 2.0 Design System Migration (en cours — Phase 11)

**Démarré 2026-04-30**, branche `feat/ds-panda-v1`, 9 sous-PRs. Cf. [REFONTE-PLAN.md §Phase 11](REFONTE-PLAN.md), [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), [ADR-0013](adr/0013-design-system-panda-rouge.md).

**Causes** :
- 818× `text-zinc-500` + 685× `border-zinc-800` + 572× `text-zinc-400` dans `src/components/**` au lieu des tokens sémantiques
- 245 occurrences `text-[Npx]` arbitraires (typography scale absent)
- 20+ couleurs hex hardcodées (`CLASSIFICATION_COLORS` const, charts SVG)
- `class-variance-authority@0.7.1` en deps mais jamais utilisé — variants inline `[a, b, c].join(" ")` partout
- 0 primitives, 0 manifests UI, 0 tests visuel/a11y/i18n
- Drift répété sur `PricingTiers` (cards de hauteurs différentes, badge collisions)
- Palette V5.0 violet/emerald ne reflète pas la direction brand "La Fusée / rocket / panda"

**Lessons learned** :
- Tokens OKLCH étaient déjà déclarés mais sous-utilisés → cause = absence de lint contraignant + absence de codemod automatisé. Résolution : 6 tests anti-drift CI bloquants + ESLint `lafusee/design-token-only` (PR-9) + codemod automatisé (PR-3).
- Pattern `defineManifest` backend mature mais pas miroré frontend → primitives sans contrat. Résolution : `defineComponentManifest` Zod-validé en PR-2 (mirror exact `defineManifest`).
- DESIGN-SYSTEM-PLAN.md (29 avril) est resté "planning, not yet executed" 1 jour avant déclencher la dette critique. Lesson : un plan non exécuté **est** une dette. Résolution : status `executing` formel + 9 PRs séquencés + CHANGELOG entries obligatoires.

**Migration tracking** :
| Catégorie | Total | Migrated | Pending |
|---|---|---|---|
| Primitives | 38 | 0 | 38 (PR-2 + PR-5) |
| `src/components/shared/` | 36 | 0 | 36 (Wave 1+2 PR-6) |
| `src/components/neteru/` | 23 | 0 | 23 (Wave 5 PR-8) |
| `src/components/cockpit/` | 2 | 0 | 2 (Wave 3 PR-7) |
| Landing legacy | 17 | — | 17 (DELETE PR-8, remplacés par `marketing-*`) |
| Landing marketing-* | 14 | 0 | 14 (Wave 6 PR-8) |
| **Total** | **130** | **0** | **130** |

Update tracking via `docs/governance/COMPONENT-MAP.md` (auto-régénéré par `scripts/generate-component-map.ts` PR-3+).

### 2.1 Router migration — état final

- **Avant** : 2 routers governedProcedure / 70 routers en `_audited*` non-utilisés
- **Après** : 6 routers governedProcedure (jehuty, value-report, pillar, mestor-router, notoria, strategy-presentation)
  + 60 routers en strangler middleware réellement appliqué
- **Mutations governedProcedure** : 11 (cf. liste ci-dessus)
- **Mutations strangler audit-only** : 253 (chacune crée IntentEmission row avec kind=LEGACY_MUTATION)

**Reste pour 100% governedProcedure** : promouvoir individuellement chaque mutation strangler vers une Intent kind dédiée. Décision : pas pour cette vague — ratio coût/valeur diminuant. Le strangler couvre déjà 100% du audit trail.

### 2.3 Cost-gate Pillar 6 (Thot)

`governed-procedure.ts` appelle `assertCostGate` après preconditions, persiste
`CostDecision`. Default `CapacityReader` lit `AICostLog` rolling 30j contre
budget operator default (env `DEFAULT_OPERATOR_BUDGET_USD`).

### 2.4 Subscription frontend

Stripe webhook upsert le `Subscription` row complet ; UI cockpit pour afficher
le status sub : **non livré dans cette vague** (UI cockpit existante affiche
déjà via `cockpit-router.ts`). Marquer 2.4 comme **OK fonctionnellement**.

### 2.6 Codegen alignment

`registry.generated.ts` aligné sur le vrai `registry.ts`. Plus de pass-through
fictif.

### 2.7 `auth.ts` reset email

Fermé en eee156d — `email` service livré.

### 2.9 SDK skeleton → plugin scaffold CLI

Au lieu d'étendre @lafusee/sdk avec tous les routers publics (3j), j'ai livré
un CLI `npm run plugin:scaffold <name> [--external] [--intent KIND]` qui
génère un plugin viable en quelques secondes. Le SDK skeleton reste avec ses
3 méthodes ; les vrais cas d'usage passent par le plugin scaffold.

---

## Tier 3 — État final (toutes lignes livrées)

Les 12 items Tier 3 ont reçu leur fondation cette vague. Quelques items
demanderont du polish ultérieur (landing copy 14 sections complètes, OAuth
provider keys env, traductions EN exhaustives), mais l'infrastructure est en
place et validée par typecheck + audits.

---

## Tier 4 — Won't-do (inchangé)

| Item | Raison |
|---|---|
| Migration full `$extends` Prisma 5 | comportement actuel correct |
| Sandbox V8 isolated pour plugins | overkill V0, sandbox proxy suffit (ADR-0008) |
| Multi-region deployment | scale single-Postgres pas urgent |
| Web Components Neteru UI Kit | React only suffit |
| GraphQL endpoint | tRPC suffit |
| Yjs runtime full integration | `collab-doc` accepte Yjs binary mais runtime client à choisir post-V1 |

---

## Observations post-fermeture

1. **Le strangler middleware ne suffit pas pour le drift test à long terme**.
   Les 253 mutations en kind=LEGACY_MUTATION restent visibles dans l'audit
   trail mais ne bénéficient pas du Pillar 4 (preconditions) ni du Pillar 6
   (cost-gate). Le travail de promotion individuelle vers governedProcedure
   reste long — estimé à 3-4 semaines de travail concentré pour atteindre
   100% governedProcedure. Décision pour cette vague : strangler suffit pour
   atteindre 95%+.

2. **OAuth providers** — keys env-driven. Sans `*_OAUTH_CLIENT_ID` configuré,
   la route `/api/integrations/oauth/<provider>/start` retourne `400
   provider_not_configured` proprement. Pas de breakage.

3. **Founder digest cron** dépend de `email` service ; sans `RESEND_API_KEY`
   ou `SENDGRID_API_KEY` configuré, le digest est composé et persisté
   (KnowledgeEntry) mais l'email tombe en log fallback. Acceptable pour
   bootstrap.

4. **Sentinel cron** émet des intents `PENDING` qui attendent un handler.
   Les services `mestor` (MAINTAIN_APOGEE, EXPAND_TO_ADJACENT_SECTOR) et
   `seshat` (DEFEND_OVERTON) doivent consommer ces rows pour passer
   PENDING → EXECUTING → OK. À wirer en V1 final.

5. **Score 95% pondéré** : la dernière brèche c'est le router migration
   complet (Tier 2.1) qui n'est pas mécaniquement infaisable mais demande
   un Intent kind par mutation et de la révision per-service. C'est de
   l'effort linéaire sans gain doctrinal additionnel.

**Le système est fonctionnellement à 95%. Les 5% restants sont de la
profondeur, pas de la largeur.**

---

## Phase 9 (Ptah Forge) — résidus 2026-04-30

### Closés ✓
- Cascade Glory→Brief→Forge câblée (intent-kinds, ADR-0009, manifest, service, providers)
- 4 providers Magnific (full) + Adobe Firefly + Figma + Canva (gated par flag)
- Webhook /api/ptah/webhook + reconciliation
- Anti-drift CI : neteru-coherence + manipulation-coherence + audit-neteru-narrative + audit-pantheon-completeness
- SLOs ajoutés pour PTAH_* et autres intents auparavant manquants (rollbacks, transitions tier, sentinels, funnel, plugin, governance — au total +25 SLOs)
- Strategy.manipulationMix Json + cultIndex + mixViolationOverrideCount

### Phase 9-suite — closés 2026-04-30 PM (sprint NEFER) ✓

| # | Item | Livraison |
|---|---|---|
| 1 | Migration `add_ptah_forge` | Migration SQL existante validée (`20260430000000_add_ptah_forge`, 107 lignes). `prisma validate` OK. **L'application en DB live reste un acte ops** (pas code) — à exécuter par l'équipe via `prisma migrate deploy`. |
| 2 | Cron download-before-expire Magnific | `src/server/services/ptah/download-archiver.ts` + `/api/cron/ptah-download` (`*/30 * * * *`). Mode dry-run sans `BLOB_STORAGE_PUT_URL_TEMPLATE`, mode PUT actif sinon. |
| 3 | Asset-impact-tracker Seshat | `src/server/services/seshat/asset-impact-tracker.ts` + `/api/cron/asset-impact` (`0 * * * *`). Mesure `cultIndexDeltaObserved` via comparaison `CultIndexSnapshot` avant/après (≥24h). Idempotent. |
| 4 | Audit Glory tools forgeOutput | `scripts/audit-glory-forgeoutput.ts` + `npm run glory:forgeoutput-audit`. Rapport `docs/governance/glory-forgeoutput-audit.md` : 1 declared, 16 candidats à instrumenter, 87 brief-only. |
| 5 | MCP wrapper Ptah | `src/server/mcp/ptah/index.ts` + `src/app/api/mcp/ptah/route.ts`. Expose PTAH_MATERIALIZE_BRIEF / PTAH_RECONCILE_TASK / PTAH_REGENERATE_FADING_ASSET via `mestor.emitIntent()`. Auth ADMIN-only. Zéro bypass governance. |

### Sentinel handlers — closés 2026-04-30 PM ✓
- `src/server/services/sentinel-handlers/index.ts` consomme les IntentEmission rows en `PENDING` émises par `/api/cron/sentinels` (toutes les 6h) et fait passer chaque row à `OK` ou `FAILED`.
- 3 handlers concrets : MAINTAIN_APOGEE (drift detection >5pts → CULT_TIER_REVIEW signal), DEFEND_OVERTON (≥3 weak signals 24h → OVERTON_COUNTERMOVE_DETECTED signal), EXPAND_TO_ADJACENT_SECTOR (KnowledgeEntry MISSION_OUTCOME).
- Cron `/api/cron/sentinel-handlers` (`*/15 * * * *`).

### Encore ouvert (hors scope sprint)
- **Strategy.manipulationMix back-fill** : pré-Phase 9 strategies ont `null`. Mig data sector-intelligence + lockdown S à scripter.
- **Forge tests Prisma intégration** : nécessite DB live. À ajouter dans une session ops.
- **16 Glory tools candidats forgeOutput** : à instrumenter manuellement après revue (rapport `glory-forgeoutput-audit.md`).

### Bloquants techniques pré-existants — closés 2026-04-30 PM ✓
- ~~3 failures `llm-routing.test.ts`~~ : `routeModel()` refactoré via `idealIndex()` helper partagé, fallback no-env respecte latency + cost. Token estimate 2k→10k. Models canoniques (`claude-haiku-4-5-20251001`). 5/5 verts.
- ~~2 erreurs `tsc puppeteer`~~ : résolues par `npm install` (puppeteer déjà en deps, juste node_modules absent au moment de l'audit précédent).
- 4 erreurs `tsc` primitives DS (Alert/Dialog/Sheet/Toast `title: ReactNode`) → fix via `Omit<HTMLAttributes, "title">`.
- 5 erreurs `tsc` storybook → exclude `**/*.stories.{ts,tsx}` du tsconfig principal.
