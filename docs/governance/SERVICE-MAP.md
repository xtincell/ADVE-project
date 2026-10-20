# SERVICE-MAP — Tous les services backend mappés sur APOGEE

**123 répertoires** sous `src/server/services/` (recompte 2026-10-06) : **122 services métier/enregistrements** et **1 helper** (`utils/`). Les rôles restent classifiés par sous-système ci-dessous. Le recensement des chemins est généré dans [CODE-MAP.md](CODE-MAP.md) ; ces nombres ne mesurent pas la maturité ni l'exécution réelle.

Ajouts au relevé du 21 juillet : `brand-bible/` (composition du livre de marque), `brand-theme/` (thème des livrables), `brand-tier-transition/` (transition gouvernée de palier). Ces trois modules sont des extensions de services existants, sans nouveau Neter.

**Cap APOGEE atteint — 7/7 Neteru actifs** depuis Phase 14/15.

Source de vérité : `find src/server/services -mindepth 1 -maxdepth 1 -type d`. Mis à jour avec [APOGEE.md](APOGEE.md) §4 + [PANTHEON.md](PANTHEON.md).

**511 livrée — auth/reset et activation existants (2026-10-20)** :
auth.register refuse toute identité existante, y compris sans mot de passe ;
la pose initiale utilise forgot/reset par jeton email existant, consommé une seule
fois par updateMany conditionnel token/date valide, y compris en concurrence.
activateBrand crée le nouveau fondateur sans operatorId partagé, garde propriété
directe Strategy.userId et appartenances opérateur déjà existantes. Client homonyme
réutilisé seulement si une stratégie du même user y est attachée ; nom seul sans
autorité. Droits payés/état final/rejeu et choix d’inférence explicite conservés.
Auth publique reste sur ses rails INFRASTRUCTURE, activation sous les rails
Mestor existants ; aucune reclassification ni service/manager ajouté. Census
réservé selfserve production509 readonly :0op/0users/0stratégies/0clients associés,
pas de modification ou migration réelle. 511 livrée : PR1047, source `252fc551e7a94362271395cece74d4b109e38f04`,
build 39508092180 et digest `e822a4a7ae96db16c9ca2d3df3d7478524a71d02f3d225a73cc0cb3f0bc61e30`.
Runtime 6.27.511 reçu le 20 octobre à 22:51 UTC ; conservation à 22:52 UTC :
mêmes volumes, 67 sources/1 041 actifs, états/originaux/piliers et racine Friesland.
Lectures séquentielles, pas snapshot atomique ; version/login 200, relais/90s
conservés, OpenRouter absent. Attente technique 511 close. Remise native locale,
annulations Next _rsc et effets volontaires conservés dans les reçus P27 ; aucun
SMTP/PSP/vente/MVP entier déduit. Compte d’envoi et transport autorisé restent ouverts.
Preuves : `release/preuves-mvp-commercial-20261020/production511-{received,data-preserved,public-api-received}.json`.

**512 candidat — extensions des services existants** : trackCost du Gateway
ne saute plus l’usage sans Strategy ; AICostLog nullable et ALS intake interne,
sans bearer/PII ni identité tenant, puis rattachement au vrai Strategy. Contexte
partagé par les entrées quick-intake, budgets stream et descendants différés.
Claim PostgreSQL/advisory lock et runner terminal existants partagés, complete
inclus ; capacité issue du modèle/politique,409 même intake/429 occupé, manuel
sans modèle préservé. FILL_ADVE public prepareDeliverables:false et INDEX
prepareEmbeddings:false gardent l’index déterministe ; defaults/chemins explicites
compatibles. Aucun service/manager ajouté. Checkpoint local 512 reçu : 12 usages
Luna/12 lignes exactes, extraction pré-marque conservée/rattachée ; admission HTTP
409/429 et runner/rejeu sans génération reçus. FILL_ADVE/INDEX OK,19 nœuds sans
embeddings, 98 recommandations PENDING conservées comme enrichissements futurs,
zéro production/BrandAsset, sans déduire zéro agent. Contrôles locaux finaux verts ;
CI/image/runtime et autres parcours ouverts. [Réception M05](RESIDUAL-DEBT.md).

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

**Factorisation 511 livrée** : email/index.ts délègue au sender système
Anubis existant, double cascade retirée et catégories transactionnelles conservées.
Un petit lecteur pur systemEmailIsArmed est ajouté au module Anubis existant :
expéditeur et provider requis ; brandEmailIsArmed réutilise cette disponibilité
pour son repli système. Ce helper est neuf, aucun nouveau service/provider/manager.
forgotPassword sans transport renvoie deliveryAvailable=false pareil pour adresse
connue/inconnue, sans émettre de jeton. La page existante affiche indisponibilité
et contact humain : aucun succès d’envoi ni secret journalisé. Raccord réel et
transport autorisé restent à recevoir via email/Anubis/credentials existants.
Preuve `release/preuves-remise-commerciale-20261020/email-factorization-received.json`.

**510 reçue — fidélité dans quick-intake existant (2026-10-20)** :
intakeFieldOrigins qualifie explicitement les deux écritures existantes : reçu
exact/scellé canonique/web observé SOURCE, généré INFERRED. Original brut/HUMAN
conservés ; SOURCE importé peut être reformulé. Extraction structured gateway/
schéma partiel strict sans retry ajouté, politique modèle/budget existante.
Narrateurs V1/V2/V3, narrate-adve, évaluateur et report-composer fallback partagent
règle/libellés d’origine ; ni généré ni complétude ne prouvent la force publique.
Aucun service/Governor/compte nouveau, classification du registre conservée.
510/M03 reçue au périmètre technique et à la qualité locale bornée : nouveau cas fictif Luna COMPLETED, reportEvidenceVersion1, un original1139octets distinct/une source/huit piliers/un Deal LEAD ; huit coûts au snapshot terminal20:28:53, désormais onze coûts PARTIELS, ni coût total ni vente. Conservation historique reçue au périmètre du reçu, ancien mauvais cas/original préservés. Natif payé final compilé45réponses sans ≥500/exception/échec, réouverture sans callback/détails observés ; première transition75réponses/deux ERR_ABORTED conservée, aucun SLO. Premier PDF17pages refusé (marges sombres/page blanche), print.css existant et déduplication full/preview corrigés : candidatdev13pages, huit sections intégrales, aucune page vide/chevauchement/clipping observés sur les13pages relues. Suite DEFAULT isolée reçue :4 860tests/457fichiers unitaires plus38/2horsunit, union4 898/459 en deux passes disjointes, aucune garde assouplie (`release/preuves-rapport-fidelite-20261020/final-default-test-received.json`). Build final webpack et PDF compilé reçus :13pages/582937octets, huit sections intégrales exactes,13pages relues blanches sans page vide/chevauchement/clipping ; vrai bouton téléchargement3,4s. Qualité bornée reçue sur ce cas fictif local, pas qualité universelle. Réseau compilé45réponses/non tronqué/0≥500/exception/échec, titre observé≤257ms pilote compris, pasSLO. Original1139octets/SHA exact HTTP200, voisin404/private,no-store/no-referrer ; six HTTP droits/rejeu200, PDF impayé402/référence étrangère refusée, complete11ms relit sans modèle. Conservation finale reçue : ancien périmètre alltrue, mock exact retiré ; nouveau cas intake/piliers/upload/source/Deal identiques àprogress3 et huit coûts initiaux identiques. Première assertion coûts refusée, trois Glory différés ont écrit20:28:59–20:29:16 avant arrêt Luna20:32, pas durant lecture/PDF sans provider (wordplay-cultural-bank, concept-generator, semiotic-brand-analyzer) ; présent onze coûts partiels, pas total ni absence d’agents. Gratuit après retrait du mock reçu sans bouton PDF et avec origines ; ancien rapport reçu avec avertissement/UNKNOWN sans réécriture. 510 reçue en production au digest exact 31c3a1b87b45, conservation avant/après reçue ; attente de livraison/runtime/conservation close, aucun coût complet/PSP/vente/MVP entier reçu. Diagnostic de dossier : generateDiagnostic ne déduit plus maturité/visibilité/
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

**504 candidat — compléter les registres documentaires existants** :
`ingestion-pipeline/document-versions`, `original`, `source-usage` et les contrats
`source-document`/`source-original` sont étendus sous Mestor / Sustainment.
Antérieure explicitement placée avant une édition et initialement ARCHIVED ;
autre format relié à la même version, consultable sans preuve supplémentaire ;
mêmes octets réutilisés avec alias déclarés conservés dans le reçu original
après vérification physique. Empreintes, droits, originaux et statuts précédents
préservés. Aucun service, routeur, modèle, Intent, fournisseur ou appel IA ajouté.
31 tests ciblés reçus ; PostgreSQL/navigateur, contrôles complets et livraison
504 restent ouverts. [ADR-0223 Proposed](adr/0223-document-edition-representations.md).

**501 — originaux fragmentés, capacité héritée reçue dans le runtime 503** :
`brand-vault/original`, `FileUpload` et stockage chiffré existants portent
`asset-original-v2`, sous Mestor / Sustainment et admission INFRASTRUCTURE.
`brandVault.transfer` gouverné, identité Drive/éditions/droits relus, trace des
octets projetée, collecteur raccordé aux fragments et GET original en flux sont
présents au code. Mes actifs calcule par tranches de quatre Mio avec
`@noble/hashes` 2.4.0 et propose progression/reprise jusqu’à 200 Mio.
Aucun nouveau service, routeur, Intent, modèle ou fournisseur. Dix intégrations
locales reçues après le timeout initial conservé ; formulaire USER synthétique
12 582 941 octets/quatre fragments/six émissions OK, CANDIDATE/STORED et original
téléchargé exact, sans modèle/adoption. Fenêtre d’envoi complète six POST 200 /
zéro exception ; recharge mesurée incomplètement, pas de SLO. Suite 4 857/456,
gouvernance 1 671/169, typage/deux lints/cycles sans erreur, 24 avertissements
historiques ; concurrence bornée sans assertion ou délai affaibli. L’attente de
bascule 501 est supplantée par le runtime 503 exact, source `90b50f9ff`, mêmes
volumes et données conservées ; aucune nouvelle réception du runtime historique
501 n’en est déduite. Restauration C7, terme du corpus réel, sources/études
50 Mo et lots intake restent des réceptions distinctes ouvertes. Le dépôt réel
continue, sans compteur figé ici. [ADR-0222 Proposed](adr/0222-private-original-chunk-transfers.md).

**500 reçu — lecteur existant, réception documentaire bornée** :
Le chargement du format à la demande ferme le blocage de boot 499 ; CI/build/
boot/session JSON/image/runtime exacts et login 200 reçus sur source eb8ffd355.
61 sources, 994 actifs et huit fondamentaux conservés pendant la bascule.
Premier pitch réel PROPOSED reçu ensuite : 3 722 103 octets exacts et
4 905 caractères texte/notes, alias conservé, aucun modèle/adoption ; 62 sources,
61 antérieures/994 actifs/huit fondamentaux et BMC REFERENCE/PROPOSED préservés.
Les 831 matériaux reçus avant 500 gardent leur registre ; aucune relecture
physique fraîche de tout le lot sur 500 déduite. Lecture des visuels, autres
présentations et analyses intake/études restent ouvertes ; incident auth/session
dev de cause inconnue conservé séparément. Pas de nouvel onboarding ou chantier
entier reçu. [ADR-0221](adr/0221-common-received-document-reader.md).

**448 source/CI/image reçues — ANUBIS Comms/MCP existant** :
mcp-billing/transport partagent outcome explicite et scopeMcpParams, résultat/
provenance conservés avec ERROR/isError ou DENIED sans double journal. scopeServer
conserve droits stockés/filtre découverte ; parité d’authentification/découverte,
REST autre serveur 401/wildcard/ADMIN/OAuth conservés. Facturation OK+ERROR,
DENIED hors usage/rawrate fixture conservé, découverte non métrée/best effort.
Treize cas HTTP/SDK/PG et DEFAULT 4 318/410/ciblés 44/3/gouvernance 1 627/166/cinq
contrôles 0 reçus, aucun modèle/service/provider ajouté. Source fdc759…, CI exacte
4 318/410 + PG 357/18 et image/registre 448 reçus ; redeploy SKIPPED, livraison/
runtime/native prod non reçus. Preuve 447 conservée ; Galahad facultatif non activé
live, autres branches/cycle réel ouverts. [Réception et dette](REFONTE-PLAN.md).

**447 source/CI/image reçues — services existants, livraison en attente** :
quick-intake/rtis-draft, PROTOCOLE_S et executeRTISCascade utilisent transaction/
calcul S partagé/full S/huit versions/nulls/sources/provenance, strict conservé.
Intake sauvegarde/refus/sans confiance S artificielle, R/T/I peuvent subsister.
runPipeline FAILED bloque/non terminé, RUNNING non terminé, WAITING intervention.
CI 4 297/409/PG 357/18 et image/registre reçus ; jobs DB isolée/frontières R/T/I
simulées, aucun fournisseur live/service ajouté. Aucun déploiement/runtime 447
reçu ; dernier 446 daté du 10 octobre non reconfirmé le 12. Ops no-op/erreur DB et
accès distants expirés repris avant livraison/C7, aucun SLO/cycle global. Autres
producteurs/canaux/devises/versions/remap ouverts. [Réception et dette](REFONTE-PLAN.md).


**446 livré — services Notoria/MESTOR existants, réception bornée** : lecture
normalisée/UUID exécutables/IDs choisis canoniques/FK union brute, mutation toutes
copies via mapInitiativeEntries, calcul S/route/BrandAction dans la même transaction
gateway/huit versions/nulls/pins/sources. Refus HUMAN strict et retrait humain
respecté au générateur ; CROSS_PILLAR correspond à I/R. Aucun service/modèle/tool
ajouté. CI 4 288/407 et PG 352/18, contrôles/natif local/nettoyage reçus ; source
436975a/image/runtime 446 exacts, production ADMIN lecture seule S inchangée.
Aucune mutation réelle/cycle/SLO. Probes purs : deepMerge conserve ancien budget
face à absence ; runPipeline FAILED déclaré complet. Non corrigés ; lot 447
immédiat vers calcul S full partagé/remplacement versionné/sources/provenance/
strict et summary d’échec fiable. Writers quick-intake/rtis-draft, PROTOCOLE_S,
rtis-protocols/index restent indépendants ; autres canaux/devises/remap/cycles
ouverts. Clôture doc ce549c0/CI reçue. [Réception et dette](REFONTE-PLAN.md).


**445 livré, réception bornée — lecteurs/export existants reçus localement** :
deterministic-composers réutilise collectNormalizedInitiatives pour 7S/3H/Budget ;
inconnus/coverage conservés. aggregateCampaignBudgets/campaignBudgetLabel dans
roadmap-routes existant, partagé mapBudget/CORE/Deloitte : zéro/inconnu/devises,
scalaire null si incomplet/multidevise ; lignes séparées des enveloppes.
getFieldLabel helper pur extrait/ré-exporté, contextes mix/typo et HTML/Markdown/
PDF partagés ; source/snapshot inchangés. Aucun service du registre ajouté.
Ciblé final 73/six/cinq contrôles 0 reçus, PG 347/18 avant dernières lectures sans
schéma/persist changé ; unité DEFAULT finale 4 276/407 verte reçue. Native USER/TRIAL/HTML/PDF 19 reçus
à portée bornée, pas 35 sections/global/SLO/stress. Source 15331789 livrée/runtime 445,
CI/image/runtime 445 reçus. Autres writers/versions/remap/devise qualitative/
canaux legacy/cycles réels ouverts.

CI finale 4 276/407 unitaires+347/18 PG sur source 15331789 ; image 38027689427/
runtime 445 exacts reçus. Lecture réelle SPAWT ADMIN seule, S Périmé/mélangé
conservé sans mutation/recalcul ; warm complète 60 réponses/14 ERR_ABORTED, aucun
zéro global/SLO/cycle. Sonde pure Notoria : doublon/divergence reproduits/non
réparés 445 ; reprise 446 contrat existant, refs brutes mutables/validation
préservées ; legacy statique seulement. DocumentSha 3abd2be/reçu 445 clôturés.
[Réception et dette](REFONTE-PLAN.md).


**444 livré, réception bornée — services existants, données distinguées** :
normaliseur partagé de pillar-schemas et agrégations roadmap-routes transportent
budget absent/zéro déclaré/estimation FCFA, échéance absente et couverture du
chiffrage. rtis-protocols/strategy, artemis/action-db/materializer,
strategy-presentation et creative-proposal utilisent ces états ; aucun nouveau
service. Overrides/zéro opérationnel conservés, scénarios/formules existants et
hypothèses 30/60 rendues explicites. Ancien helper inutilisé de promotion retiré,
contrat S strict inchangé. Onze rouges puis 47/cinq ciblés verts, unité
4 253/406 en deux passages et PG 347/18 verts reçus ; native locale bornée/cinq contrôles finaux reçus,
runtime exact 444 reçu. Devise des ancres, autres writers/consommateurs S
et vraie réception restent ouverts.
Base d’actions native locale relue absent/0 XAF/Estimation · 500 k XAF après
formatter (trois rouges/quatre verts→sept verts), trois choix USER/TRIAL 200.
Origine estimée limitée à projection QUAL/budgetMin=projectedBudget ; overrides
opérationnels distincts. Premier gauntlet tsc 2/autres quatre 0, type roadmap
corrigé ; unité 4 256/406 reçue avant CSS mobiles, PG 347/18 inchangé/UI 38/quatre.
Native S total absent/sous-total 500 000/inconnus conservés et aperçu créatif
partiel/hypothèses 30/60 reçus, ouvrir/Annuler sans création/IA ; header/grille
mobiles corrigés/reçus. Desktop/Oracle HTML/PDF 18 pages reçus, données fidèles
mais finition PDF non reçue ; cinq contrôles finaux après CSS 0/gouvernance
1 624/166, fixture nettoyée. Compteurs uniquement avant créatif/PDF. Doublons/
horizons des composeurs, locale SSR/client et finition PDF en reprise 445 dans
dette S existante ; aucune réception globale déduite.
CI après toutes CSS 4 256/406 unitaires et 347/18 PG verts, image/runtime 444
exacts reçus ; SPAWT réelle lue en ADMIN sans choix/recalcul/mutation métier,
ancien plan Périmé. Réception passive bornée seulement, aucun cycle/global/SLO.
[Périmètre](REFONTE-PLAN.md).

**443 livré, réception bornée — aucun service ajouté** : le hook frontend
useBrandWriteAccess du module existant use-can-operate consomme getMyAccess,
sans déplacer les autorités serveur. PillarPage/ActionDatabasePanel utilisent
ses droits distincts ; recalcul propriétaire manuel et proposition MANUAL par
défaut/IA facultative. Compteur source via collectNormalizedInitiatives sur trois
collections, distinct de la projection synchronisée ; retour de recalcul
sauvegardé/à relire ou refus métier. Ciblé 34/quatre verts après garde ambition
LOCKED (un rouge/quinze verts).
Unité finale 4 237/404 verte ; native USER/TRIAL fictive et lecture seule/
LOCKED reçues, propriétaire non opérateur manuel/Sync absent, catalogue trois/
projection une puis trois ; plan vide sauvegardé sans budget inventé. Fixture
nettoyée, cinq contrôles finaux à zéro/gouvernance 1 624/166 reçus. Source
c2a0b0f6/CI 38016938304/image 38017164762/runtime exact 443 reçus.
Lecture réelle ADMIN seulement, source 15/projection 36/28 retenues, formulaire
manuel sans soumission/ancien S non recalculé ; aucune mutation réelle ni recette
USER en production ; normalisation budget/horizon et autres chemins S ouverts. [Bornes et reprise](REFONTE-PLAN.md).

**442 livré — mêmes services, calcul S commun** : SYNTHESIZE_S
dans artemis/commandant et mestor/rtis-cascade.actualizePillar(S) délèguent à recalculateSynthesis,
executeProtocoleStrategy avec transaction et writer du pillar-gateway existants.
Huit versions A/D/V/E/R/T/I/S, absences null comprises, contrôlées avant upsert ;
REPLACE_FULL/historique/retrait de revue, refus LOCKED/provenance humaine.
S exclu du chunk LLM, suppression du padding et des splits non sourcés ; contrat
strict inchangé, draft sparse non approuvable. Cohérence sans R.coherenceRisks
absente ; provenance de champ INFERRED « Déduit — à vérifier », autorités
inchangées. Renderer « — /100 » sans score/vrai zéro conservé, sept rouges/
treize verts puis vingt verts. Six rouges puis 24 verts, ciblé 70/trois/full PG
345/18 reçus avant derniers correctifs, cohérence rouge/vert ciblé. Native locale
synthétique S v4/trois archives/I v2 reçue après reload ; fenêtre recalcul
complète, reload tronqué. Finaux 4 210/401 unitaires, 345/18 PG/cinq contrôles
0/gouvernance 1 624/166 reçus. Source f7f39c23/CI 38012819228/image 38012838924/
runtime 442 exact reçus ; production ADMIN lue sans recalcul réel, SPAWT Périmé/
deux 100 %. Stress mock/base, HTTP SKIPPED ; aucune recette USER de production.
Pas de nouveau service/route/Intent/ADR. Budget/timeframe, roadmap et autres
chemins S dont rtis-protocols/index.persistViaGateway strict restent en dette :
aucune unification globale déduite. [Reprise](REFONTE-PLAN.md).

**439 livré, canon existant** : six descriptions de spawt-canon.ts et la copy
actuelle alignées sur le quiz livré à six questions/cinq axes. Aucune logique
de quiz, service ou import réel ajouté. Le lecteur PillarPage réutilise la
readiness existante, sans modifier writer/approbation. Six rouges puis checkpoint
57/trois et final 58/trois verts (sept UI), cinq contrôles complets relancés
exit 0/gouvernance 1 620/166 ; premier TSC stageLabel conservé/corrigé. Build
compilée et native locale USER/TRIAL fictive reçues, Périmé avec deux 100 %,
sans import canon réel ; fixture nettoyée. Source b0399f4f/CI 37997965596
(4 197/401 unitaires, 309/16 PG)/image 37998236655/runtime 439 exact reçus.
Lecture réelle SPAWT USER : PÉRIMÉ avec deux 100 %, 116 réponses toutes 200/zéro
≥500/exception, 32 ERR_ABORTED retenus ; aucun import canon, approbation ou
production réelle. [Bornes](REFONTE-PLAN.md).

**437 livré dans 438 — extension des writers existants** : pillar-gateway remplace les
collections S au MERGE_DEEP et rétracte S/Strategy après version ou dépendance
nouvelle ; PillarVersion conserve le précédent plan. Aucune auto-approbation S,
restauration à relire, LOCKED conservé sur staleness et null conservé.
ingestion-pipeline/source-usage permet aux writers de prendre directement
Strategy UPDATE après les sources, puis les piliers. canon-sync réutilise le
gateway pour son recalcul. review-invalidation.ts est un module interne du même
gateway, pas un service du registre ; réutilisé par invalidation documentaire
et les deux écrivains de staleness. Strategy UPDATE triées/sourceUse UPDATE,
lookup d’âge lowercase ; propagateFromPillar true/false reçu, Process seulement
en mode auto existant. Pas de service/worker/Neter ajouté. 21 cas S ciblés reçus ;
complet 304/seize antérieur aux cinq ajouts, final complet 309/seize reçu et HARD
collections rouge/restauration exacte/vert reçu. Unitaire complet 4 190/400 et
cinq contrôles finaux verts, premier rouge temporel conservé/recontrôlé sans
changer le test. Build isolé exit 0 ; native locale USER/TRIAL revue v1/null,
écriture v2 retire l’ancienne revue, relecture/réapprobation v2/null reçue.
Stress compilé isolé exit 0/46 reçus/235 non reçus/sept DEFERRED sans credentials,
pas fournisseur/cycle. canon-sync statique + writer PG, sans import privilégié
natif ; sept DEFERRED bornées/estimation zéro/sans providerTaskId, sept tâches/
quatre marques synthétiques nettoyées/remaining=0, serveur isolé arrêté.
CI 37992424716/image 37992697193/runtime 438 exact reçus, source 912e481e.
Lecture seule SPAWT plan/Forge reçue : S v3 AI_PROPOSED/91,2 % non approuvable ;
readiness COMPLETE/100/stale, displayLabel=Périmé mais plan Complet. Contrats,
formes historiques et affichage restent à réconcilier, sans inventer de contenu.
Autres modes/cycle complet et sept chantiers/dix gates non reçus.
Calcul S commun et Notoria facultative prévus.
[Décision Accepted et bornes](adr/0215-synthesis-writes-require-new-review.md).

**436 livré — état de validation, extension du service existant** :
`pillar-gateway/validation-status.ts` partage inspection de composition et décision
de validation entre les deux routes existantes. Contrat ENRICHED/COMPLETE + schéma
S strict, version relue, acteur/portée et sources contrôlés sous verrou ; S/Strategy
atomiques et confiance conservée. cross-validator/staleness-propagator acceptent
le lecteur transactionnel, sans second service ; assessor expose son test de
champ existant. Le contrôle initial des projets issus des initiatives réutilise
ce helper. Aucun provider dans l’approbation S, aucun nouveau service/Neter/kind.
Quatorze PostgreSQL ciblés verts et cinq cas natifs synthétiques reçus ; suites
locales complètes et gauntlet final verts, fixture nettoyée ; stress/réception globale et autres consommateurs
restent ouverts. Source 80e2122f/CI/image/runtime 436 reçus ; lecture réelle SPAWT
S existant/non approuvable reçue, conflit de contrats à réconcilier. Postmerge
documentaire et couverture globale distincts.
[ADR-0214 Proposed](adr/0214-synthesis-approval-preserves-confidence.md) ·
[réception](RECEPTION-VALIDATION-SYNTHESE.md).

Couverture physique des manifests au 2026-10-06 : **120/123 répertoires**. `creative-intelligence/manifest.ts` réexporte le manifest du moteur sous Seshat, car le registre découvre les manifests racines. Les trois extensions ci-dessus ne portent pas de manifest co-localisé ; leur rattachement aux services parents reste à vérifier dans le registre de gouvernance. Le relevé 118/118 du 2026-07-21 est historique et ne décrit plus tout le répertoire.

---

## Synthèse globale

| Sous-système | Tier | Count | Governor Neteru |
|---|---|---|---|
| Propulsion (briefs) | M | 19 (incl. `deliverable-orchestrator/` Phase 17b + acteurs Phase 24) | ARTEMIS (+ INFRASTRUCTURE acteurs) |
| Propulsion (forge) | M | 1 (`ptah/` Phase 9 ✅ shipped) | **PTAH** (ADR-0009) |
| Guidance | M | 24 | MESTOR (+ INFRASTRUCTURE) |
| Telemetry | M | 27 | SESHAT (+ INFRASTRUCTURE / THOT) |
| Sustainment | M | 13 | THOT / MESTOR / INFRASTRUCTURE |
| Operations | G | 15 | THOT (extension) / INFRASTRUCTURE |
| Crew Programs | G | 6 satellites + `imhotep/` orchestrateur (Phase 14 ✅) | **IMHOTEP** (ADR-0019, supersedes ADR-0017) |
| Comms | G | 2 satellites + `anubis/` orchestrateur (Phase 15 ✅) | **ANUBIS** (ADR-0020, supersedes ADR-0018) |
| Admin | G | 13 | INFRASTRUCTURE |
| **TOTAL** | | **122 services métier/enregistrements** + 1 helper (`utils/`) = **123 répertoires** | 7 Neteru actifs + INFRASTRUCTURE |

### Imhotep — service Phase 14 ✅ shipped (ADR-0019)

```
src/server/services/imhotep/
├── manifest.ts             # governor: IMHOTEP, 8 capabilities (draftCrewProgram, matchTalentToMission, assembleCrew, evaluateTier, enrollFormation, certifyTalent, qcDeliverable, recommendFormation)
├── index.ts                # handlers orchestrateurs (wrappent matching/talent/team/tier/qc)
├── governance.ts           # gates : missionReadyForCrew, talentProfileExists, budgetCap
└── types.ts                # payloads + back-compat ImhotepCrewProgramPlaceholder Phase 13
```

Dépendances satellites : `matching-engine`, `talent-engine`, `team-allocator`, `tier-evaluator`, `qc-router`, `founder-psychology`, `financial-brain`. **0 nouveau model Prisma** (anti-doublon NEFER §3) — réutilise TalentProfile, Course, Enrollment, TalentCertification, TalentReview, Mission, MissionDeliverable. Page hub : `/console/imhotep/page.tsx`. Router tRPC : `imhotep.ts`.

### Anubis — service Phase 15 ✅ shipped (ADR-0020 + ADR-0021)

```
src/server/services/anubis/
├── manifest.ts             # governor: ANUBIS, 11 capabilities (draftCommsPlan, broadcastMessage, buyAdInventory, segmentAudience, trackDelivery, registerCredential, revokeCredential, testChannel, scheduleBroadcast, cancelBroadcast, fetchDeliveryReport)
├── index.ts                # handlers orchestrateurs
├── governance.ts           # gates : commsPlanExists, broadcastJobExists, adBudgetCap
├── credential-vault.ts     # wraps ExternalConnector model (existant) — pattern ADR-0021
├── types.ts                # payloads + back-compat AnubisCommsPlanPlaceholder Phase 13
└── providers/              # 7 façades feature-flagged (DEFERRED_AWAITING_CREDENTIALS si pas de creds)
    ├── _factory.ts         # createProviderFaçade DRY
    ├── meta-ads.ts         # Meta Ads (Facebook + Instagram)
    ├── google-ads.ts       # Google Ads
    ├── x-ads.ts            # X (Twitter) Ads
    ├── tiktok-ads.ts       # TikTok Ads
    ├── mailgun.ts          # Email transactionnel
    ├── twilio.ts           # SMS
    └── email-fallback.ts   # Dev mode (logs only)
```

Dépendances satellites : `email`, `oauth-integrations`, `advertis-connectors`, `financial-brain`. **4 nouveaux models Prisma** : `CommsPlan`, `BroadcastJob`, `EmailTemplate`, `SmsTemplate`. Réutilise `Notification`, `NotificationPreference`, `WebhookConfig`, `ExternalConnector` existants. Pages : `/console/anubis/page.tsx` (dashboard) + `/console/anubis/credentials/page.tsx` (Credentials Center). Router tRPC : `anubis.ts`.

### Ptah — service Phase 9 existant ; code 6.27.428 livré

Code 434 reçu au runtime, ADR-0213 Proposed/métier partiel : helper resumption dans Ptah existant,
reprise de la même tâche par reçu original vérifié et réservation avant réseau.
Reprise/brief nouveau stricts au tRPC, hybride refusé avant effet ; reçu COMPLETED
contient les IDs AssetVersion existants/scopés, exigés non vides par manifest/schema.
Tracker monté dans la page existante sous son layout opérateur ; configuration
globale et fournisseur réels restent à recevoir. Sceau v2 canonique/temps sous
verrou du spine commun, sans second journal ni nouveau service. Deux rouges
émission/trois rouges reprise, 270/14 PostgreSQL puis Ptah ciblé 47 cas
verts. Prérequis auth 433 séparé : affectation courante dans la session, trois
rouges/verts, marque native retrouvée. Types finaux exit 0 ; CLI sur 1 002 lignes
avec fenêtre 1 000 bornée/--all reçu. Reprise même tâche DEFERRED HTTP 200/refus
reçu altéré HTTP 412 locaux reçus, dirigeant sans affectation sans Reprendre.
Anciens compteurs natifs invalides écartés, nouvelle pagination 20 puis 22 uniques
reçue. Tracker EN/ZH rendu/FR restauré, pas forge intégralement traduite.
Types/lints/cycles/gouvernance finaux verts après découplage, 1620/166 ; stress isolé exit 0,
46 HTTP reçus/235 non reçus/0 échec, hors native protégée/Glory phase 3/fournisseur réel,
fixtures nettoyées. Harnais général non réparé, stress antérieur aux dernières
gardes et dates ; suite canonique 4 180/399 et PG 270/14 finaux post-découplage
reçus, CI/runtime 434 reçus, parcours restants
en attente. emittedAt logique ne prouve pas l’heure métier ou la fraîcheur de
l’historique. startedAt réel distinct après verrou, horloge future 60 s : cinq
PostgreSQL verts après un rouge, closeEmission/durée/hash relus, pas SLO global.
Native tracker 434 refusée 403, compte non affecté.435 livré : seul listForges
réutilise getOperatorContext canonique et le dossier explicitement choisi pour
ADMIN effectif ; canResume selon affectation actuelle. Mutations/autres lectures
restent strictes, aucune équipe/droit/rôle nouveau. 51 PG ciblés verts après deux
rouges. Native locale par URL connue sur deux dossiers/deux équipes : chacun sa
tâche, canResume=false, lecture seule sans bouton ni secret ; Actualiser HTTP 200/
zéro exception, fenêtre complète. Copie FR finale relue, fixture nettoyée ;
sélecteur local 0/0 historique. Gauntlet 435 cinq exit 0, gouvernance 1620/166/24 warnings
préexistants et PG complet seul 274/14/Ptah 51 inclus reçus. CI 435 : 4 180/399 unitaires et
274/14 PG/image/runtime reçus. Native SPAWT listForges HTTP 200/zéro ligne, 403 disparu ;
fenêtre complète : 63 réponses/aucune ≥500/zéro exception/log. Liste du sélecteur reçue après
chargement ; passage par son lien vers le portefeuille groupe FrieslandCampina
non pilotable reçu en lecture seule, portée/ambiguïtés rendues, sans métriques
isolées. Production/reprise réelle non reçue ; reload local tronqué et bornes
tardives production, sans SLO déduit.
[Réception partielle](RECEPTION-PTAH-REPRISE.md).

ADR-0009 décrit la fondation historique. Réception antérieure au 2026-10-09 : résultat
checkpointé puis admission atomique versions/coffre/coût/COMPLETED ; webhook et
sync passent par PTAH_RECONCILE_TASK. Les références campagne/brief/actif source
traversent les entrées et producteurs jusqu’à la tâche, avec contrôle partagé
avant fournisseur/admission ; tâche historique de régénération contrôlée.
Le reçu de demande racine ou enveloppé accepte DEFERRED sans faux 500.
Suites finales : 4 167 unitaires/230 PostgreSQL/1 617 gouvernance vertes,
types/lints sans erreur, 24 warnings préexistants, zéro cycle. MCP/tRPC/Oracle
HTTP 200/DEFERRED et replay reçus sur fixtures locales synthétiques, zéro fournisseur.

Source cdd9f6c0, CI 37862693091/image 37862922982 et runtime exact 428 reçus le
9 octobre à 00:19:53 UTC ; aucune livraison 426 isolée, volume privé conservé.
Lectures/refus et corpus/édition SPAWT conservés ; zéro tâche/version de forge
avant/après, aucune forge réelle réparée. Bouton/garde opérateur reçus localement
dans le [code 428 livré](RECEPTION-PTAH-UX.md), gauntlet local vert ;
reprise DEFERRED/configuration, octets/CDN, Canva/Figma, facture, filiation au-delà des trois
références et journal restent ouverts : [reçu courant](RECEPTION-PTAH-UX.md)
et [admission historique 425](RECEPTION-PTAH-ADMISSION.md). Aucun service ajouté.

```
src/server/services/ptah/
├── manifest.ts             # governor: MESTOR, acceptsIntents: PTAH_MATERIALIZE_BRIEF, PTAH_RECONCILE_TASK, PTAH_REGENERATE_FADING_ASSET
├── index.ts                # API forge/réconciliation ; checkpoint et admission transactionnelle
├── resumption.ts           # code 434 livré : reçu initial/paramètres/réservation, métier local
├── governance.ts           # pilier source et cohérence du mode demandé
├── types.ts                # ForgeBrief, ForgeSpec, ForgeProvider interface
├── pricing.ts              # cost table par modèle × provider
├── task-store.ts           # GenerativeTask/AssetVersion/santé provider ; client transactionnel
├── download-archiver.ts    # archivage d’URL temporaire ; octets/CDN à recevoir
├── providers/
│   ├── index.ts            # registre des adaptateurs existants
│   ├── magnific.ts         # client REST ; secret de callback vérifié par la route HTTP
│   ├── adobe.ts            # OAuth 2.0 server-to-server, Firefly Services
│   ├── openai.ts           # chemin image synchrone
│   ├── figma.ts            # export PAT ; reconcile renvoie encore []
│   └── canva.ts            # Connect API gated ; reconcile renvoie encore []
└── routing/
    ├── budget-gate.ts      # plafond coût/superfan attendu avant forge
    └── provider-selector.ts # choisit provider selon coût/qualité/disponibilité
```

Entrée HTTP : `src/app/api/ptah/webhook/route.ts`. Dispatch existant :
`src/server/services/artemis/commandant.ts`, avec l’émission parent réelle pour
les futures forges. Le manifeste Ptah reste gouverné par MESTOR.

---

## 1. Propulsion (20 services — Mission Tier)

Génèrent la poussée vers l'apogée. **19 services briefs (incl. `deliverable-orchestrator/` Phase 17b + acteurs Phase 24) + 1 service forge (PTAH)**.

| Service | Rôle propulsion | Governor | Manifest |
|---|---|---|---|
| `artemis/` | Thrust controller — exécute Glory tools, séquences GLORY | ARTEMIS | ✅ existant |
| `glory-tools/` | Catalogue + métadonnées des 56 thrusters (40 legacy + 9 P13 + 4 P14 + 3 P15) | ARTEMIS | ✅ existant |
| `sequence-vault/` | Bibliothèque des séquences GLORY (94 au registre `ALL_SEQUENCES`, recompte 2026-07-11 — skill tree, post Phase 13 ORACLE_*) | ARTEMIS | ✅ existant |
| `pipeline-orchestrator/` | Orchestration topo-triée des séquences | ARTEMIS | ✅ existant |
| `notoria/` | Pipeline production des livrables | ARTEMIS | ✅ existant |
| `driver-engine/` | Drivers d'engagement (E pillar tactics) | ARTEMIS | ✅ existant |
| `campaign-manager/` | Gestion campagnes en vol | ARTEMIS | ✅ existant |
| `campaign-plan-generator/` | Génération plans de campagne | ARTEMIS | ✅ existant |
| `mission-templates/` | Templates de missions standard | ARTEMIS | ✅ existant |
| `implementation-generator/` | Génération plans d'implémentation | ARTEMIS | ✅ existant |
| `guidelines-renderer/` | Lecture identité du coffre, références et exports (ADR-0203) | ARTEMIS | ✅ existant |
| `value-report-generator/` | Rendu rapport valeur (livrable client) | ARTEMIS | ✅ existant |
| `seshat-bridge/` | **Bridge** Telemetry → Propulsion (signaux qui déclenchent missions) | ARTEMIS | ✅ existant |
| `ptah/` | **Forge orchestrator** — soumission fournisseur et admission des résultats ; réception bornée ci-dessus | **MESTOR** (manifest Ptah) | ✅ existant |
| `deliverable-orchestrator/` | **Output-first composer** (Phase 17b, ADR-0050 — anciennement ADR-0037) — résout DAG briefs depuis kind matériel cible, scan vault, mode PREVIEW | ARTEMIS | ✅ existant |
| `intention/` | Aval de l'ADVE (Phase 24, ADR-0106) : capture l'intention du dirigeant → brief candidat (intention × ADVE, manual-first) | ARTEMIS | ✅ existant |
| `oracle-section/` | OracleSection first-class (Phase 21 F-B/F-C, ADR-0068/0070) : lifecycle 35 sections, lock optimiste, runners | ARTEMIS | ✅ existant |
| `creative-proposal/` | Proposition Créative — gate de génération de production (ADR-0120) : validation → briefs de production depuis les frames canon | INFRASTRUCTURE | ✅ existant |
| `campaign-canon/` | 3 campagnes canon (30-60-90 / annuelle / always-on) depuis le Pilier I + ponctuelles insight-driven (ADR-0119) | INFRASTRUCTURE | ✅ existant |
| `media-plan/` | Plan média structuré (acteur Média, ADR-0115) | INFRASTRUCTURE | ✅ existant |

---

## 2. Guidance (24 services — Mission Tier)

Dirigent la trajectoire. Décisions, validations, plans.

| Service | Rôle guidance | Governor | Manifest |
|---|---|---|---|
| `brand-bible/` | Composition déterministe du livre de marque, lecture seule (ADR-0185) | Extension de Guidance | sans manifest propre |
| `brand-theme/` | Sélection d’identité/thème, pool de logos et origine runtime partagée publisher/export (ADR-0169/0203/[0210](adr/0210-explicit-public-logo-variants.md) ; [430 livré, choix/rendu réel reçus](RECEPTION-IDENTITE-PUBLIQUE.md)) ; pool palette/typos/fichiers/personnages/illustrations étendu dans le [432 livré](adr/0212-versioned-public-identity-projection.md), reçu sur la vitrine choisie | Extension de Guidance | sans manifest propre |
| `brand-tier-transition/` | Handler de transition de palier après gate (ADR-0167) | MESTOR | sans manifest propre |
| `mestor/` | Computer de guidage central — Intent dispatcher (`emitIntent`) | MESTOR | partiel (`intents.ts:179`) |
| `pillar-gateway/` | Écriture gouvernée des Pillars (`writePillarAndScore`) | MESTOR | ✅ existant |
| `pillar-maturity/` | Évaluation maturity N0-N6 + assessor | MESTOR | ✅ existant |
| `pillar-versioning/` | Versionning des contrats Pillar | MESTOR | ✅ existant |
| `pillar-normalizer/` | Normalisation inputs avant write | MESTOR | ✅ existant |
| `rtis-protocols/` | Protocoles cascade R-T-I-S | MESTOR | ✅ existant |
| `diagnostic-engine/` | Moteur de diagnostic substantiel | MESTOR | ✅ existant |
| `cross-validator/` | Validation cross-pillar cohérence ; règle 32/module pur `pillar-reference-edges` existants étendus en 481 livré : couverture différée distincte de liens cassés/occurrences vérifiées, contrôles/snapshot/route copie reçus sans mutation, source/CI/image/runtime exacts reçus ; réponse de la règle 32 production et C3 métier encore ouverts ([bornage](REFONTE-PLAN.md)) | MESTOR | ✅ existant |
| `vault-enrichment/` | Enrichissement strategy depuis vault | MESTOR | ✅ existant |
| `strategy-presentation/` | Assemblage Oracle 21 sections + catalogue `OracleError` (ADR-0022) | MESTOR | ✅ existant |
| `prompt-registry/` | Registre prompts LLM versionnés | MESTOR | ✅ existant |
| `staleness-propagator/` | Détecte et propage staleness | MESTOR | ✅ existant |
| `campaign-tracker/` | **L2 Instrumental** Campaign module (Phase 19, ADR-0052) — orchestrateur cross-Neteru ; Vague 1 = Cluster A (trajectory + fuelBurnRate + pauseFlameOut) + Cluster B (bigIdeaCoherence + culturalDebt + mythArc). Capability flags 4-états (READY/PARTIAL/STUB/DISABLED) + STUB→MVP→PRODUCTION par sous-cluster. | MESTOR | ✅ existant |
| `auto-promotion/` | Transitions planifiées timer-based (fenêtres de sûreté) — promotions gouvernées non-strategy-scoped | MESTOR | ✅ existant |
| `brand-node/` | Arbre de marque multi-archétype (Phase 18, ADR-0059) : BrandContextNode, resolveEffectivePillars, cascade d'invalidation | MESTOR | ✅ existant |
| `campaign-change-request/` | CampaignChangeRequest (Phase 18-A1) : demandes de changement gouvernées | MESTOR | ✅ existant |
| `campaign-deliverable/` | Matrice 6D CampaignDeliverable (ADR-0059) : CRUD gouverné + RAG override | MESTOR | ✅ existant |
| `consulting/` | Acteur Conseil (ADR-0109/0113) : priorisation RICE déterministe + chaîne de preuve (engagements → hypothèses → évidences → verdict) | INFRASTRUCTURE | ✅ existant |
| `market-lifecycle/` | Kill-switch marché gouverné (ADR-0105) : NEUTRALIZE (FROZEN/SHADOWBANNED) / REINSTATE / PURGE cascade | MESTOR | ✅ existant |
| `morning-batch/` | Morning Brief batch ingestion mail/Slack + validation middle-portal (Phase 18-A1-δ, ADR-0062) | MESTOR | ✅ existant |
| `operator-action/` | OperatorAction (Phase 18-A1) : actions opérateur tracées | MESTOR | ✅ existant |

> Helpers TS dans `strategy-presentation/` (n/a manifest, n/a count) :
> - `error-codes.ts` — catalogue typé `ORACLE-NNN` + classe `OracleError` + `toOracleError` (ADR-0022)
> - `error-capture.ts` — `captureOracleErrorPublic` → error-vault (recursion-safe)
>
> **Note** : `pillar-readiness/` vit dans `src/server/governance/` (5 gates pre-conditions) — pas un service `src/server/services/`, donc hors compte.

---

## 3. Telemetry (27 services — Mission Tier)

Observent, mesurent, archivent. **27 répertoires** (recompte 2026-10-06) ; la table contient 3 lignes supplémentaires (`seshat/tarsis/connector.ts` · `seshat/scan-rate-limit.ts` · `seshat/entity-gate/`) qui sont des **sous-modules de `seshat/`** — documentés ici pour la traçabilité, hors compte.

| Service | Rôle telemetry | Governor | Manifest |
|---|---|---|---|
| `seshat/` | Telemetry processor central + Tarsis sensors + ranker | SESHAT | partiel |
| `jehuty/` | Cross-brand intelligence feed (V5.4) | SESHAT | ✅ existant |
| `knowledge-aggregator/` | Agrégation knowledge graph | SESHAT | ✅ existant |
| `knowledge-capture/` | Capture nouveaux knowledge entries | SESHAT | ✅ existant |
| `knowledge-seeder/` | Seeding knowledge initial | SESHAT | ✅ existant |
| `market-intelligence/` | Intel sectorielle | SESHAT | ✅ existant |
| `sector-intelligence/` | Sector as first-class entity (APOGEE drift 5.2 fix) — **Phase 23 (ADR-0078) confirme canonical Overton home** : campaign-tracker/culture.* délègue ici. Epic 3 Story 3.1 étend l'index pour accepter `ConnectorResult<TarsisSignal>` (data-in / data-out, pure). | SESHAT | ✅ existant |
| `seshat/tarsis/connector.ts` | **Tarsis-monitoring API façade — Phase 23 PENDING (Epic 2 Story 2.2)**. Retourne `ConnectorResult<TarsisSignal>` per pattern P22-1. Credentials via Vault (ADR-0021 + ADR-0079). Cf. ADR-0077, architecture D4. | SESHAT | 🟡 PENDING (Phase 23) |
| `seshat/scan-rate-limit.ts` | Rate-limit PARTAGÉ entre workers des scans frais du scoreur public (table `ScanRateHit`, 6/min/IP, fail-open, purge auto) + résolution IP réelle derrière Cloudflare/Traefik (ADR-0161). Le cache ne consomme jamais. | SESHAT | ✅ shippé (2026-07-19) |
| `seshat/entity-gate/` | Gate adversarial de collecte publique (ADR-0162) : ambiguïté du nom (lexique mots communs) + discriminants du contexte déclaré + verdict déterministe avec preuves + réfutation LLM optionnelle demote-only. Consommé par `quick-intake/public-enrichment` (presse, Brave, Maps, découverte de site). | SESHAT | ✅ shippé (2026-07-20) |
| `seshat/creative-intelligence/` | Extension Telemetry ADR-0194/0195/0196 : corpus PUBLIC/BRAND, snapshots/recettes, acquisition bornée et veille verrouillée, archive chiffrée/purge, audiovisuel natif MODEL_DRAFT puis revue MANUAL, modèle conditionnel/trajectoires/voisins context nodes et publication confirmée avant résultat immuable. Contexte Artemis/Notoria et Glory DELEGATE/HYBRID ; bibliothèque canonique Argos-studio. | SESHAT | Parcours locaux et CI PR #968 reçus ; livraison image suivie par run 37521228164 et réception applicative datée dans PR #968 ; accès métier externes à recevoir |
| `creative-intelligence/` | Enregistrement du manifest ADR-0194 : réexport du moteur `seshat/creative-intelligence/`, nécessaire au scanner de manifests racines. Aucune duplication du moteur. | SESHAT | code présent (inspection 2026-10-06) |
| `source-classifier/` | Reads BrandDataSource → BrandAsset DRAFTs (taxonomie canonique) | SESHAT | ✅ existant |
| `brand-book-ingestion/` | Ingestion d'un brand book officiel → piliers A/D/V (gateway) + assets vault DRAFT. Deux extracteurs (LLM structuré + parseur déterministe, parité manual-first), preview→confirm, zéro fabrication (null sur absence). Intent `INGEST_BRAND_BOOK` (ADR-0173). | MESTOR | ✅ shippé (2026-07-22, Lot 1b) |
| `playbook-capitalization/` | Cross-brand learning loop (MISSION drift 5.10) | SESHAT | ✅ existant |
| `audit-trail/` | Trail audit transverse | INFRASTRUCTURE | ✅ existant |
| `ecosystem-engine/` | Moteur métriques cross-tenant | SESHAT | ✅ existant |
| `ai-cost-tracker/` | Tracking coûts LLM par intent | THOT | ✅ existant |
| `cult-index-engine/` | Cult index (mass measurement propellant) | SESHAT | ✅ existant |
| `devotion-engine/` | Devotion ladder calculation | SESHAT | ✅ existant |
| `tier-evaluator/` | Classification LATENT→ICONE | SESHAT | ✅ existant |
| `advertis-scorer/` | Calcul score composite ADVERTIS | SESHAT | ✅ existant |
| `advertis-connectors/` | Connecteurs sources signaux (social, presse) | SESHAT | ✅ existant |
| `feedback-loop/` | Boucle feedback Mestor ↔ Seshat | SESHAT | ✅ existant |
| `feedback-processor/` | Traitement feedbacks structurés | SESHAT | ✅ existant |
| `asset-tagger/` | Tagging automatique assets | SESHAT | ✅ existant |
| `error-vault/` | Collecteur erreurs runtime (server/client/Prisma/NSP/Ptah/cron/webhook) — Phase 11 | SESHAT | ✅ existant |
| `bureau-etudes/` | Acteur Bureau d'étude (ADR-0110/0114) : vagues d'étude time-spine, significativité vague-sur-vague, fusion pondérée par provenance | INFRASTRUCTURE | ✅ existant |
| `community-dashboard/` | Composition lecture seule du suivi communauté (superfans, paliers de dévotion, santé, followers) | SESHAT | ✅ existant |
| `media-perf/` | Ingestion perf média réelle → CampaignAmplification (acteur Média, ADR-0115) — manuel ou connecteur credential-gated (ConnectorResult honnête) | INFRASTRUCTURE | ✅ existant |
| `value-statement/` | Relevé de valeur mensuel déterministe depuis séries persistées (boucle B4 REVENU) — « non mesuré » quand la série est absente, jamais un zéro fabriqué (ADR-0046) | SESHAT | ✅ existant (2026-07-21) |

---

**474 livré — quatre surfaces existantes raccordées (2026-10-15)** : AmendPillarModal, SourceReadDialog partagé, ingestion.getSource et router pillar ; référence/version et garde opérateur, aucun endpoint/service/gestionnaire/grant nouveau. Dix-neuf fichiers d’appels identiques. Source 6e117414/CI/image/runtime reçus ; local DEFAULT 4 607 / 436, gouvernance 1 639 / 166, CI PG 375 / 19. Fixture v2 distincte ; production ADMIN lecture/référence au brouillon/annulation seulement, aucun amendement réel/modèle. C3/second éditeur legacy/parité/granularité/tonDeVoix/fondateur, C4/C7 et seize réceptions ouverts/inchangés. [Bornage](REFONTE-PLAN.md).

**473 livré — projection dans le gestionnaire existant (2026-10-15)** : nom factorisé avec la construction Gateway, `modelPolicyList`/`resolvePolicy` et page existants étendus. Cinq fichiers prolongés, quatorze audités identiques ; writer/circuit inchangés, aucun nouveau gestionnaire/service/route/provider. Source 80f5def3/CI/image/runtime reçus, DEFAULT 4 583 / 435, PG 375 / 19. Native ADMIN : cinq lignes Luna, politiques intactes, éditeur ouvert/annulé, sept réponses reprises sans génération. Cause de présentation fermée ; C7 financier/charge/transport, pont manuel C3 et seize réceptions inchangés. [Bornage](REFONTE-PLAN.md).

**472 livré — Gateway existant, choix explicite avant complétude (2026-10-15)** : seul `index.ts` prolongé par deux conditions, dix-huit autres fichiers gestionnaire identiques. Source c92abbc6/CI/image/runtime exacts reçus ; DEFAULT 4 571 / 434 et PG 375 / 19. Relais incomplet : disponibilité fausse/candidats vides, fini/streaming et gardes conservés ; quatre processus de fixture reçus sans modèle/réseau/DB. Reprise production des sept réponses sans génération ; aucun nouveau service/gestionnaire/route/politique. C7, pont manuel C3 et seize réceptions restent ouverts/inchangés. [Bornage](REFONTE-PLAN.md).

**471 livré — lecteurs Seshat/Council et chunker existants (2026-10-15)** : quatre fichiers étendus, lecture autorisée/empreinte/certitude conservées, extraits exacts sous budget 6 000 séquentiel. Source c4d4c6fa/CI/image/runtime et usage court production reçus ; dix-neuf fichiers gestionnaire inchangés, aucun nouveau service, gestionnaire, route ou Intent. Déploiement sans génération puis un appel distinct utile, pas qualité générale. Références manuelles à raccorder via `AmendPillarModal`/`ingestion.getSource` existants ; C3/C5/C4/C7/seize réceptions inchangés. Clôture documentaire distincte sans bump/image/note nouvelle. [Bornage](REFONTE-PLAN.md).

**470 livré — finalisation du ledger existant (2026-10-15)** : deux fichiers Gateway modifiés/dix-sept audités inchangés, aucun gestionnaire/service/provider/route/Intent/Neter nouveau. Source 79d03f91/CI/image/runtime et conservation du déploiement reçus sans modèle. Après dépôt descriptif Quiz Palais Déclaré, un appel production distinct HTTP 200 reçoit une sixième réponse mais usage utile refusé. Reprise C3/C5 dans `getOracleBrandContextByQuery`/`currentDocumentNodes` existants ; omission vectorielle reproduite en test, entrée production exacte non capturée. C4/C7/seize réceptions inchangés ; SHA docs distinct, sans bump/build/note client. [Bornage](REFONTE-PLAN.md).

**469 livré — lecture du Conseil existant (2026-10-15)** : contrat pur UI/tRPC factorisé, entrées entières/refus hors borne, priorités/désaccords avant détails dépliables. Dix-neuf fichiers gestionnaire/Conseil inchangés, aucun nouveau service/manager/capacité métier. Source 51019356/CI/image/runtime reçus ; lecture ADMIN production sans nouveau Conseil/modèle et conservation exacte. Qualification stratégique seulement cette question SPAWT sur copie. Analyse non persistée ; autres réceptions C4/C7 ouvertes, seize réceptions/zéro chantier sur sept conservés. SHA docs distinct du code, aucun build documentaire. [Bornage](REFONTE-PLAN.md).

**468 livré — Conseil/appelants existants (2026-10-15)** : source d29c3774/CI-image-runtime exacts, CI 4 540/433/PG 375/19 reçus. Dix-sept fichiers sur dix-neuf inchangés, Gateway/Council prolongés ; aucun nouveau gestionnaire/parser/service/route/Intent/entité/Neter, DTO public conservé. Lecture production reçue sans modèle ; qualification stratégique seulement pour le cas SPAWT sur copie. Module existant/cinq politiques legacy relus avant bascule, écart présentation-routage toujours C7. C4 réponse complète/priorités et réserve ledger restent ouverts ; SHA docs distinct/CI clôture attendue. Seize réceptions/zéro chantier sur sept inchangés. [Bornage](REFONTE-PLAN.md).

**467 livré backend — consommateurs Seshat/ARTEMIS/quick-intake existants (2026-10-14)** : formatter/ledger/circuit réutilisés, V1 actif sans nouvelle pipeline, source 18d62990/CI-image-runtime exacts reçus. Reprise native/conservation sans modèle, snapshot copie 465 avec dépendances simulées transmet valeurs bornées, pas nouvelle DB/output/ledger réel reçu. Dix-neuf fichiers audités inchangés, C4/C5/C7/coût complet ouverts et seize résultats inchangés. [Bornage](REFONTE-PLAN.md).

**466 livré UI — présentation MESTOR/Guidance existante (2026-10-14)** : conversation/états par marque et chargement reçus en production, source bee09383/CI-image-runtime exacts ; switch/reload sans modèle/sept empreintes conservés. Copies distinctes/erreurs natives/qualité C4 entière-C5 non reçues, aucun service/manager/circuit ajouté et seize inchangés. [Bornage](REFONTE-PLAN.md).

**465 livré backend — Seshat context-store existant (2026-10-14)** : source 046ed251/CI-image-runtime exacts, PreciseField partagé/réception interne 169 champs et conservation sans génération reçus ; dix-sept fichiers circuit inchangés, aucun service/manager/transport ou écriture ajouté. Consommateurs framework/rapport/citations de sortie et héritage BrandTree non reçus, seize résultats conservés. [Bornage](REFONTE-PLAN.md).

**464 livré — conseil MESTOR/Guidance existant (2026-10-14)** : projection référence/version/date et accueil borné, source e6897302/CI-image-runtime exacts reçus. Six fichiers circuit inchangés, aucun nouveau service/manager/transport ou écriture métier ; accueil ADMIN production/recharge sans modèle reçus, données before/after et après lecture native conservées sans modèle, réception finale acquise. Copie contexte/HTTP/native distincte et qualité citations/cinq→six refusée ; prochaine qualification Council/Gateway/Seshat/Notoria existants, seize résultats inchangés. [Bornage](REFONTE-PLAN.md).

**463 livré C4 — présentation MESTOR/Guidance existante (2026-10-14)** : MarkdownContent upstream partagé/page coordinateur/panneau approfondi, source/copie intactes ; aucun service/transport/fournisseur/entité ajouté, six fichiers du circuit existant inchangés. Source 7f0bb03a/CI-image-runtime exacts reçus, lecture ADMIN production/copie 2 001 exacte/reload sans modèle/sept empreintes conservés ; recette locale distincte et ses échecs gardés. Experts natifs/formules/qualité C5 restent ouverts, widgets dormants/sécurité non clos, seize résultats inchangés. [Bornage](REFONTE-PLAN.md).

**462 livré au périmètre code/runtime — projection conseil existante (2026-10-14)** : qualification optionnelle du serializer/fieldStatusFor pour conseil seul, aucune nouvelle entité/manager/service/router/Intent/Neter. Source 68911e1c/CI/image/runtime exacts et invariance sans génération reçus ; copie qualifiée mais qualité refusée, pas réponse modèle/natif production 462 reçu. C4 aucun renderer Markdown installé/AssetContent JSON plain, bibliothèque standard sécurisée réutilisable à implémenter sans parser maison ; page/chat/persistence/copie/agents facultatifs conservés. Historiques/tests/seize résultats inchangés, capacité backend/quota/facture non reçus. [Bornage](REFONTE-PLAN.md).

**461 livré — régulation existante, Sustainment/INFRASTRUCTURE (2026-10-14)** : source/API/CI finale/image e1ee22b2…/runtime exact et invariance sans génération reçus. Premiers refus CI/401/rouges et build cancelled conservés, mock réparé sans produit changé ; cause fail-open livrée au périmètre, UI visuelle/charge/multi-instance/plafond OAuth/coûts/opt-out ouverts. Aucun manager/service ajouté, qualité conseil refusée/seize résultats inchangés. [Bornage](REFONTE-PLAN.md).

**460 livré — gestion d’appels réutilisée (2026-10-14)** : chaîne existante/dan-oauth/Luna exact, Sol conservés, aucun manager/service/provider ajouté. Source ffab0f93/trois CI/image f36dfd55…/runtime exact/clé OpenRouter absente/token hors build, aucun repli texte autre provider. Relais/UFW privé bornés, santé/auth refus sans inférence reçus. Fil ADMIN réel/reprise sans génération/ledger estimé reçus, copie et premiers échecs conservés ; qualité refusée sur certitudes et cinq→six questions. Statut public ne reçoit pas santé/SLO/qualité ; régulation/opt-out/DPA/coûts réels ouverts, seize résultats inchangés. [Bornage et dette](REFONTE-PLAN.md).

## 4. Sustainment (13 services — Mission Tier)

Maintiennent la mission viable techniquement. Mémoires long terme, transports, gates de capacité, sentinels.

| Service | Rôle sustainment | Governor | Manifest |
|---|---|---|---|
| `llm-gateway/` | Engine controller existant : routage, Headroom, rate-policy et coûts ; extension Luna 460 et refus à expiration 461 reçus au périmètre source/API, réserve UI/charge restante | INFRASTRUCTURE | ✅ existant, correction livrée au périmètre |
| `model-policy/` | Résolution gouvernée `purpose → model` (cache + Prisma `ModelPolicy`) | INFRASTRUCTURE | ✅ existant |
| `financial-brain/` | **Thot** — fuel manager, capacity tracking | THOT | ✅ existant |
| `budget-allocator/` | Allocation budget par mission | THOT | ✅ existant |
| `approval-workflow/` | Workflow d'approbation pré-action | MESTOR | ✅ existant |
| `sla-tracker/` | SLO/SLA tracking par Intent kind | INFRASTRUCTURE | ✅ existant |
| `operator-isolation/` | Tenant isolation (default-deny) | INFRASTRUCTURE | ✅ existant |
| `neteru-shared/` | Governance registry central | INFRASTRUCTURE | manifests des autres |
| `brand-vault/` | BrandAsset CRUD engine — vault unifié ; originaux privés FileUpload, dépôt CANDIDATE et sélection explicite ([ADR-0220](adr/0220-private-vault-originals.md), code/copie reçus). Transfert fragmenté v2, protection des références et flux de téléchargement reçus sur copie locale, livraison ouverte ([ADR-0222 Proposed](adr/0222-private-original-chunk-transfers.md)) ; conservation d’identité publique par stockage chiffré existant/transport borné ([ADR-0211 Accepted](adr/0211-retained-public-logo-bytes.md), logo 431 reçu ; [ADR-0212 Accepted borné](adr/0212-versioned-public-identity-projection.md), identité de vitrine 432 reçue) | MESTOR | ✅ existant |
| `strategy-archive/` | 2-phase soft archive + hard purge (`Strategy.archivedAt`) | INFRASTRUCTURE | ✅ existant |
| `sentinel-handlers/` | Handlers cron `/api/cron/sentinels` — consomme IntentEmission PENDING (Loi 4 maintien orbite) | MESTOR | ✅ existant |
| `nsp/` | Neteru Streaming Protocol — transport publish/subscribe vers UI | INFRASTRUCTURE | ✅ existant (stub utilitaire) |
| `market-visibility/` | Substrat read-filter (ADR-0105) : pays SHADOWBANNED + descendants pour le default-deny tenant-scoped (cache TTL 15 s) | INFRASTRUCTURE | ✅ existant |

> `cross-validator/` est compté en Guidance (rôle dominant : validation cross-pillar). Ses invariants techniques sont consommés par Sustainment — pas de double-count.

La conservation d’identité publique relève de **Sustainment/MESTOR** dans
brand-vault existant : continuité de marque, condition de l’accumulation de
superfans visée. 431 reçoit le logo public conservé, aucun résultat business ; stockage
et transport sont des extensions, sans service ni Neteru supplémentaire.
432 livré étend ces mêmes publication/copies/transport aux choix d’identité
v2 (palette, OTF/TTF, poses, citation), avec pins privés et lecture v1 conservée.
La consommation vitrine vérifie l’ensemble, sans CSP élargie ; gauntlet et
première lecture sous harness local reçus. CI/image/runtime et publication/revue/
retour réels reçus côté producer/consumer, huit copies stables, cinq polices/
trois poses/six couleurs/citation, origines/CSP conservées. Réception partielle
C2/C3/C4 de la vitrine choisie, aucune acceptation globale ni réception du stockage
complet/autres destinations. [ADR-0212 Accepted, borné](adr/0212-versioned-public-identity-projection.md).

---

## 5. Operations (15 services — Ground Tier)

Argent, contrats, facturation, monétisation. Sans Operations, pas de business.

| Service | Rôle operations | Governor | Manifest |
|---|---|---|---|
| `commission-engine/` | Calcul commissions UPgraders/agence/creator | THOT | ✅ existant |
| `financial-engine/` | Logique business financière | THOT | ✅ existant |
| `financial-reconciliation/` | Réconciliation transactions | THOT | ✅ existant |
| `mobile-money/` | Intégration paiement mobile (Orange/MTN/Wave) | INFRASTRUCTURE | ✅ existant |
| `payment-providers/` | Registry abstrait providers paiement (`pickProvider()`) | INFRASTRUCTURE | ✅ existant |
| `monetization/` | Pricing localisé marché (FMCG / SaaS / agence — Mission contribution: GROUND_INFRASTRUCTURE) | THOT | ✅ existant |
| `crm-engine/` | Relation client structurée | INFRASTRUCTURE | ✅ existant |
| `upsell-detector/` | Signaux d'upgrade contractuel | SESHAT | ✅ existant |
| `campaign-budget-engine/` | Budgets par campagne | THOT | ✅ existant |
| `data-export/` | Export données structurées (factures, reports) | INFRASTRUCTURE | ✅ existant |
| `escrow-arbitration/` | Séquestre de mission à validation manuelle + payouts mobile money (Guilde, ADR-0116) : hold/release/refund/dispute | INFRASTRUCTURE | ✅ existant |
| `market-cost/` | Base de coûts marché historisés par (pays, secteur, métrique, période) — MarketCostSnapshot (ADR-0099) | THOT | ✅ existant |
| `mission-quote/` | Devis structuré prestataire → marque (Guilde, ADR-0118) : soumission + décision + totaux déterministes | INFRASTRUCTURE | ✅ existant |
| `production/` | Acteur Production (ADR-0111/0112) : fan-out specs de livrable, droits d'usage avec gate d'expiration, devis AICP | INFRASTRUCTURE | ✅ existant |
| `referral/` | Parrainage manual-first (ADR-0157) : codes stables par compte, récompenses arbitrées appliquées à la main par l'opérateur | THOT | ✅ existant (2026-07-21) |

---

## 6. Crew Programs (7 services — Ground Tier)

Talent, formation, matching, QC, psychologie founder, marketplace offre-side. **6 satellites + `imhotep/` orchestrateur**.

| Service | Rôle crew programs | Governor | Manifest |
|---|---|---|---|
| `imhotep/` | **Orchestrateur** — wrappe matching/talent/team/tier/qc, formation Académie (Phase 14, ADR-0019) | **IMHOTEP** | ✅ existant |
| `talent-engine/` | Évaluation, scoring, ranking creators | INFRASTRUCTURE | ✅ existant |
| `matching-engine/` | Match creator ↔ mission | INFRASTRUCTURE | ✅ existant |
| `team-allocator/` | Composition d'équipes optimales | INFRASTRUCTURE | ✅ existant |
| `qc-router/` | Routing quality control | INFRASTRUCTURE | ✅ existant |
| `founder-psychology/` | Mécanise "founder = first superfan" (MISSION drift 5.9) | INFRASTRUCTURE | ✅ existant |
| `talent-services/` | Catalogue offre-side de la Guilde (ADR-0117) : gigs à prix fixe indépendants des missions (pattern Fiverr/Malt supply) | INFRASTRUCTURE | ✅ existant |

---

## 7. Comms (3 services — Ground Tier)

Channels externes vers audience. Ad networks, email, SMS, OAuth flows. **2 satellites + `anubis/` orchestrateur**.

| Service | Rôle comms | Governor | Manifest |
|---|---|---|---|
| `anubis/` | **Orchestrateur** — broadcast multi-canal, ad networks, Credentials Vault (Phase 15, ADR-0020 + ADR-0021) | **ANUBIS** | ✅ existant |
| `email/` | Email transactionnel (Resend / SendGrid / SES + dev fallback console) | ANUBIS | ✅ existant |
| `oauth-integrations/` | OAuth 2.0 Authorization Code flow pour intégrations sortantes (Google, LinkedIn, Meta) | ANUBIS | ✅ existant |

> Provider façades (Meta Ads, Google Ads, X Ads, TikTok Ads, Mailgun, Twilio) sont co-localisées dans `anubis/providers/` — pas comptées comme services distincts (sub-modules de l'orchestrateur).
>
> **Phase 23 PENDING (Epic 2 Story 2.3)** — `anubis/providers/crm-provider.ts` : CRM façade Phase 23 retournant `ConnectorResult<CrmCohortSignal>` per P22-1, avec field-level PII redaction (NFR6) avant que toute cohort row ne quitte le façade. Credentials via Vault (ADR-0021 + ADR-0079).

---

## 8. Admin (13 services — Ground Tier)

Configuration, boot, ingestion système, support, security, collaboration interne.

| Service | Rôle admin | Governor | Manifest |
|---|---|---|---|
| `boot-sequence/` | Initialisation système au démarrage | INFRASTRUCTURE | ✅ existant |
| `process-scheduler/` | Cron + queue intents async | INFRASTRUCTURE | ✅ existant |
| `ingestion-pipeline/` | Pipeline d'ingestion data externe ; `source-usage` factorise usages documentaires, reçus de version et invalidation (ADR-0198). Lecture commune des octets reçus et du PPTX candidate (ADR-0221), réutilisée par études/intake ; aucun nouveau worker. Primitive Sustainment, tutelle du manifest existant. | MESTOR | ✅ existant |
| `quick-intake/` | Pipeline existant ; M03 origines/rapport et M04 livré : activation sans autorité opérateur pour le nouveau fondateur, Client lié au même propriétaire | INFRASTRUCTURE | ✅ existant ; 511 livré, 512 candidat ; transport réel ouvert |
| `brief-ingest/` | Ingestion PDF briefs | MESTOR | ✅ existant |
| `demo-data/` | Seeding pour staging/demo | INFRASTRUCTURE | ✅ existant |
| `country-registry/` | Référentiel pays (devises, langues) | INFRASTRUCTURE | ✅ existant |
| `translation/` | i18n service (P7) | INFRASTRUCTURE | ✅ existant |
| `board-export/` | Export données pour boards externes | INFRASTRUCTURE | ✅ existant |
| `mfa/` | TOTP-based MFA pour role ADMIN (Mission contribution: GROUND_INFRASTRUCTURE) | INFRASTRUCTURE | ✅ existant |
| `collab-doc/` | Persistence layer collaborative StrategyDoc (load/save + optimistic concurrency, futur Yjs CRDT) | INFRASTRUCTURE | ✅ existant |
| `canon/` | Namespace de données canon (ADVE UPgraders 100 %) pour seed + scoring de référence — bibliothèque de données pures | INFRASTRUCTURE | ✅ existant |
| `tester-feedback/` | Canal feedback/bug des testeurs (ADR-0155) : single-writer `Feedback`, tri inbox console | INFRASTRUCTURE | ✅ existant (2026-07-21) |

> Helper hors compte : `utils/` — helpers transverses, pas un service au sens APOGEE.

---

## 9. Verdict — orphelins révélés

Aucun service n'est resté orphelin après Phase 14/15/16, ni après la reclassification 2026-07-21 du delta post-Phase 19 :

- Tous les services financiers + marketplace argent (`financial-*`, `commission-engine`, `mobile-money`, `payment-providers`, `monetization`, `crm-engine`, `upsell-detector`, `campaign-budget-engine`, `data-export`, `escrow-arbitration`, `market-cost`, `mission-quote`, `production`, `referral`) → absorbés par **Operations** (15 services).
- Tous les services humains (`talent-engine`, `matching-engine`, `team-allocator`, `qc-router`, `founder-psychology`, `talent-services`) + `imhotep/` orchestrateur → absorbés par **Crew Programs** (7 services).
- Tous les services de communication externe (`email`, `oauth-integrations`) + `anubis/` orchestrateur → absorbés par **Comms** (3 services).
- Tous les services d'infrastructure (`boot-sequence`, `process-scheduler`, `ingestion-pipeline`, `country-registry`, `translation`, `mfa`, `collab-doc`, `canon`, `tester-feedback`, etc.) → absorbés par **Admin** (13 services).
- Tous les services de mémoire long terme + transport + sentinels + read-filters (`brand-vault`, `strategy-archive`, `nsp`, `sentinel-handlers`, `model-policy`, `market-visibility`) → absorbés par **Sustainment** (13 services).
- Les acteurs Phase 24 (`consulting`, `bureau-etudes`, `production`, `media-perf`/`media-plan`, `creative-proposal`, `intention`) → ventilés par rôle dominant : décision → Guidance, mesure → Telemetry, argent/contrats → Operations, brief → Propulsion.

**Cas particuliers** :

- `seshat-bridge/` — **service pont** entre 2 sous-systèmes (Telemetry → Propulsion). Pattern récurrent où une observation Seshat déclenche une action Artemis. Listé en Propulsion (output) avec governor SESHAT.
- `cross-validator/` — sert à la fois Guidance (validation cross-pillar) et Sustainment (invariants techniques). Listé en Guidance (rôle dominant) — pas de double-count.
- `nsp/` — utilitaire pur de transport (pas une capability métier, pas de manifest). Compté en Sustainment (transport infra transversale).
- `utils/` — helpers TS, pas un service au sens APOGEE. Compté comme répertoire (1) mais pas comme service métier (0). A désormais un `manifest.ts` déclaratif (bibliothèque pure, aucune capability) — reste hors classification.

**Vérification arithmétique (recompte 2026-07-21)** :

```
Propulsion (briefs) 19 + Propulsion (forge) 1 + Guidance 21 + Telemetry 25 + Sustainment 13 + Operations 15 + Crew 7 + Comms 3 + Admin 13
= 117 services métier classifiés
+ 1 helper (utils/)
= 118 répertoires sous src/server/services/  ✅
```

**Manifests Phase 2 — ✅ COMPLETÉ (re-fermé 2026-07-21)** : les **118 répertoires** ont leur `manifest.ts` co-localisé (les 3 manquants `referral/` · `tester-feedback/` · `value-statement/` comblés à la reclassification). Registry runtime (`__generated__/manifest-imports.ts`) recense **118 manifests** validés par `npm run manifests:audit` — clean, zéro warn. Phase 2.6 du REFONTE-PLAN refermée.

---

## 10. Services manquants (à anticiper)

La matrice 8×N est désormais complète depuis Phase 14/15/16. Aucun sous-système n'est vide.

Services restant à anticiper (extension framework) :

| Service attendu | Sous-système | Phase | Justification |
|---|---|---|---|
| `compensating-intents/` | Sustainment | P3+ | Reverse maneuvers Loi 1 (extension `sentinel-handlers`) |
| `cost-gate/` | Sustainment | P3+ | Pillar 6 (Thot active gate dédié — actuellement délégué à `financial-brain.checkCapacity` + `budget-allocator`) |
| `notification/` | Comms | P5+ | Notification center cross-channel (actuellement via `nsp/` transport + `anubis/` broadcast) |

Ces 3 services optionnels arriveront uniquement si pattern d'extraction émerge — ils ne sont pas bloquants pour la complétude APOGEE. La cap 7/7 Neteru actifs reste maintenue (pas de 8ème Neter).

---

## Historique de reclassification

- **2026-07-21** — Le delta post-recensement Phase 19 (26 services : les 23 listés « À classifier » au recompte 2026-07-11 + `referral` · `tester-feedback` · `value-statement` apparus ensuite) est intégré aux tables ci-dessus. Section « À classifier » refermée ; chantier RESIDUAL-DEBT « Reclassification ROUTER-MAP / SERVICE-MAP » clos. Tout nouveau service DOIT être classifié ici dans le même PR (protocole NEFER Phase 6 — pas de retour de la section tampon).
