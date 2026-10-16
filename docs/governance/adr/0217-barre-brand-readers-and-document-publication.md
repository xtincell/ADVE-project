# ADR-0217 — Références de marque et partage d’une pièce La Barre

Status: Proposed — candidat 487, contrôles et réception en cours
Date: 2026-10-16
Phase: Shinkiro C3/C4/C6 — Ground / Console-Admin
Depends on: ADR-0216, contrats BrandNode/Pillar et compilateur natif La Barre
Supersedes: None — étend le raccord ADR-0216

## Contexte

486 reçoit l’ouverture des deux dossiers dans la session existante et la fermeture du corpus public. Le VAULT et les documents natifs lisent encore des valeurs locales de plateforme ; les différences de représentation ne prouvent pas un conflit de fond. Une gamme garde ses spécialisations locales. Les anciens jetons Noël exposés avec le dépôt ne peuvent pas être promus en secrets ; les anciens liens demandent maintenant une session autorisée.

BrandNode/sourceRefs/strategyId, canAccessStrategy, pillarPreciseFields, VAULT.CHAMPS/herite/pourDossier, COMPILATEUR et PARTAGE existent. Les étendre évite une seconde plateforme, un outil de production parallèle ou un nouveau formulaire de marque.

## Décision

Le lecteur authentifié relit les BrandNode courants et les stratégies autorisées, puis projette les champs exacts avec source, version et provenance. Les codes du VAULT portent la correspondance ; un rattachement ambigu reste signalé, jamais résolu par premier résultat. Une présentation structurée conserve un lien vers la valeur complète et l’édition ouvre l’éditeur de marque existant. Aucun pilier écrit ou socle copié dans le dépôt. Les gammes gardent leur priorité ; les valeurs locales de marque absentes du noyau courant restent conservées et identifiées.

Le partage est une publication explicite dans La Barre. Le geste natif renouvelle un ancien jeton exposé, reçoit sa sauvegarde puis demande la compilation du seul document. Les 109 scripts natifs, application.js exclu (recompte du 17 octobre), sont exécutés dans JSDOM déjà présent, promu runtime : pas de coque, réseau de compilation ou code fourni par le document. Une empreinte runtime unique est exigée ; un mélange de versions est refusé. Les styles et le compilateur restent ceux de La Barre.

L’édition datée contient HTML assaini, médias autorisés et versions des références, dans le volume de revue natif `/assets/review/partage/<token>.json`. Écriture conditionnelle et rejeu de la même édition si sources identiques ; pas de seconde vérité de marque. Le lecteur public relit le grant courant à chaque requête, y compris média/HEAD, et sert uniquement l’édition, ses médias autorisés et styles admis. Il ne lit aucun pilier privé et n’envoie ni corpus ni code natif. Ancien jeton, autre document et chemins hors périmètre sont refusés ; le cadrage n’accorde pas le PDF de présentation. Renouvellement/révocation restent explicites et dans l’autorité du dépôt. Aucun lien envoyé à un tiers par cette livraison.

## Conséquences

Ground / Console-Admin porte transport/confidentialité ; Seshat/Pillar garde l’autorité des références et La Barre celle de la publication. Aucune nouvelle identité, migration, Intent, IA, embedding, provider, gestionnaire d’appels ou service permanent. Le paquet publié est un export demandé, pas une validation client.

Contrôles locaux reçus : cible 33/2, DEFAULT 4 780/447, gouvernance 1 663/167, tsc/lint/cycles verts (24 avertissements existants), 94 tests natifs dans six suites. Sur copie uniquement : quatre pièces/rejeu identique, 113 requêtes de ressources (90 médias/neuf styles/huit polices), vidéo 206/PDF refusé aux trois autres pièces, vrai clic natif de partage/source et publication 200, présentation 30 pages et bouton d’impression visibles. Révocation par PUT conditionnel reçue avec huit GET/HEAD 404 ; geste UI Révoquer non reçu, dialogue IAB bloquant. Reprise du publisher de copie reçue (même édition/date/rejeu/document 200) ; runtime natif production e06af7e sain/mêmes volumes/source de 171 projets aux octets identiques/index privé 200 reçu, publisher encore 486. Source applicative 3401123c/trois CI source vertes ; image refusée deux fois avant compilation sur ECR Node 429, correction de registre au même digest candidate. Aucune image publisher 487 publiée ni production 487 reçue ; geste UI Révoquer encore ouvert. Reçus copy-recovery-received.json/native-runtime-received.json, bornage CI dans REFONTE-PLAN.

La sauvegarde native du geste modifie 232 chemins de copie : présentation recalculée 3→30 pages, lectures/blocages dérivés et quatre grants synthétiques. Ne pas annoncer la source identique après ce geste ; zéro écriture production. Reçus privés `release/preuves-noyau-partage-20261016/`, bornage détaillé dans REFONTE-PLAN.

La délégation fine campagne/client, les PDF locaux antérieurs datés, les autres éditions/médias/masters/droits et les véritables accords restent ouverts dans la dette existante. Aucun onboarding entier, sept chantiers ou compteur d’acceptation reçu par ces contrôles.
