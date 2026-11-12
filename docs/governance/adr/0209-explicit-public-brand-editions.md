# ADR-0209 — Publier une édition de marque sans exposer son dossier privé

- **Status** : Accepted
- **Date** : 2026-10-08
- **Phase** : Réception Shinkiro C2/C3/C5
- **Depends on** : ADR-0012, ADR-0124, ADR-0198, ADR-0208
- **Supersedes** : — (remplace la lecture publique directe, conserve ses routes)

## Contexte

La page `/b/[slug]` relit directement les contenus A/D et un logo ACTIVE. Un
changement privé devient ainsi visible sans nouvelle décision de publication.
Le slug et l’état ACTIVE ne prouvent ni la relecture des textes ni une validation
humaine de la stratégie. L’export JSON/CSV existant contient au contraire le
dossier privé : il ne peut pas devenir le contrat public de SPAWT.

Le coffre, la page Connexions, `strategy.update` et l’export existent déjà.
Guidance/Mestor garde l’autorité de la sélection de marque. BrandAsset possède
contenu, format, états, version, parent et filiation d’émission : les étendre
suffit. Cette primitive persiste une copie choisie ; un Glory tool générateur
n’ajouterait aucune autorité de publication. Aucun nouveau service, modèle,
table, router, page, agent, Glory tool ou Intent kind n’est créé.

## Décision

- Réserver `BrandAsset(kind=BRAND_GUIDELINES, format=public-brand-v1,
  campaignId=null)` à l’édition publique. L’état ACTIVE désigne l’édition servie
  dans ce seul format ; ailleurs il conserve le sens d’actif en usage. Les
  mutations génériques du coffre refusent ce format, y compris création,
  sélection/promotion/remplacement/archivage, modification de tags et purge.
- Le schéma public strict autorise uniquement nom, titre, promesse,
  présentation, logo nullable et liens nommés. Aucun contact privé, coût,
  prospect, résultat individuel, dossier ADVE complet, source brute ou métadonnée
  de décision ne sort par ce contrat. Les liens sont https, sans identifiants,
  paramètres ou fragment. Le logo choisi doit être celui actuellement proposé
  par la marque, non périmé et sans URL privée/signée reconnue par les gardes.
  La validité syntaxique d’une URL ne constitue pas une preuve de ses droits.
- `strategy.publicPage` fournit l’aperçu autorisé et la capacité de publier.
  Les champs de l’édition déjà publiée et la proposition courante restent
  distincts. La carte Connexions permet de relire/modifier la copie, inclure ou
  retirer le logo proposé et choisir les liens ; rien n’est publié à la lecture.
  Le brouillon local fige ensemble contenu, révision et id publié attendus.
- La proposition porte une empreinte des données lues : marque/équipe/statut,
  contenus et versions A/D, métadonnées disponibles, reçus de sources, logos et
  liens proposés. L’émission `LEGACY_STRATEGY_UPDATE` existante porte son
  strategyId résolu depuis id avant gouvernance ; aucun champ utilisateur ajouté.
  Le test de filiation a révélé zéro émission scoped avant cette correction.
- Publier passe par `strategy.update(publicPage=...)`, séparément des autres
  modifications de marque. Le serveur relit acteur, accès canonique et firewall,
  puis contrôle marque non archivée, reçus documentaires et versions sous verrou.
  L’ordre documentaire puis Strategy/mutex de coffre/piliers préserve la frontière
  avec les corrections et les éditions. Révision ou édition publique remplacée
  depuis l’aperçu : CONFLICT, aucune nouvelle version et précédente conservée.
- La transaction supersède l’ancienne édition, crée la nouvelle ACTIVE avec
  auteur réel, parent, numéro incrémenté et sourceIntentId, puis lie le successeur.
  Sources et versions A/D consommées restent dans ses métadonnées privées.
  Réexécuter le même identifiant d’émission retrouve l’effet existant. Ce choix
  ne valide aucun pilier et ne transforme pas une inférence en approbation humaine.
- Revenir à une ancienne édition crée un nouveau successeur, avec restoredFromId.
  L’historique reste intact. Une ancienne source corrigée/retirée, une édition
  périmée ou un logo qui n’est plus admissible empêchent sa réutilisation ; le
  retour ne contourne ni les droits ni la relecture courante.
- `/b/[slug]` lit seulement l’édition ACTIVE persistée. L’export existant reçoit
  `format=public-brand`, résolu par slug public, sans authentification ni clé
  permanente. Il expose schéma/slug/édition/version/date/origine observed ou
  chosen/digest/contenu ; les pins et identités privées restent exclus. ETag lie
  édition et digest, avec réponse 304 et cache court. CORS navigateur autorise
  exactement `https://spawt.online`, `https://www.spawt.online` et
  `https://portail.spawt.online`. HTTP et domaines ressemblants ne reçoivent pas
  d’en-tête Access-Control-Allow-Origin ; la ressource reste publique, HTTP 200.
  L’alias portail est ajouté avant le premier déploiement 423 ; l’édition reste
  une ressource publique.
  L’export intégral JSON/CSV conserve son authentification et son contrôle d’accès.
- La migration de démarrage capture une seule fois les champs publics bornés des
  marques possédant déjà un slug admissible, sans édition. Elle utilise le spine
  existant et l’origine OBSERVED_PUBLICATION, sans selectedBy ni revue humaine
  fabriquée ; le reçu indique humanReview=false. Une lecture anonyme ne déclenche
  jamais cette capture. Le bundle est exécuté après les migrations de schéma ;
  un échec bloque le démarrage et expose l’instruction de reprise, sans l’ignorer.
  En production 423, zéro page historique est admissible : aucune capture ni
  émission historique n’est inventée. Les deux anciens slugs hors LFA- étaient
  déjà refusés par 422 ; ils ne sont ni renommés ni publiés automatiquement.
- Le consommateur SPAWT dans son dépôt applique uniquement la copie du
  hero et les liens issus de ce contrat. Il conserve les valeurs existantes si
  l’édition ne peut pas être reçue. Direction artistique, quiz à six questions,
  déductions, application et disponibilités produit gardent leurs contrats propres.
  Leur irrigation complète n’est pas déduite de ce premier raccord.

## Conséquences

Une édition publiée reste stable pendant les modifications privées ; la prochaine
publication constitue une décision explicite, versionnée et réversible. Aucun
appel IA ni écriture de pilier n’est nécessaire à cette primitive. La capture
historique conserve une observation, pas un arbitrage humain rétroactif ; son
activation et les variations de rendu doivent être rapprochées avant livraison.

Le contrat v1 ne porte pas les tokens de design, la voix structurée, les variantes
de logo ni les règles de composition. Le consommateur SPAWT, sa copie réellement
choisie et ses images déployées sont reçus séparément dans la réception de
production ci-dessous, limitée aux textes/liens. Les autres écrivains,
Ptah et la fermeture durable best-effort du spine restent au registre de dette.
La publication ne signifie ni univers de marque entièrement raccordé, ni cycle
Noël reçu, ni achèvement d’un des sept chantiers Shinkiro.

Tests anti-drift : `public-brand.postgres.test.ts` exerce moteur, wrappers, spine
et route d’export réels sur fixtures PostgreSQL isolées. Contrats : absence de
publication à la lecture, capture observée unique, décision explicite et émission
scoped, brouillon privé stable, version périmée, opérateur étranger, champs/URL
refusés, logo périmé/signé, publication concurrente, retour en nouvelle version,
format réservé, retry, projection minimale, export privé 401, CORS et ETag.
La suite couvre aussi le nom public distinct du dossier interne, la correction
documentaire avant publication, un retour étranger/archivé et la panne d’insertion
du successeur. Réception locale avant ajout de l’alias portail : 195/195 PostgreSQL dont 16 pour ce contrat,
4 144/4 144 unitaires sur 395 fichiers, 1 610/1 610 de gouvernance sur 165 fichiers ;
types/linters sans erreur (24 avertissements préexistants), aucun cycle. Une
contre-épreuve significative du lecteur est reçue en rouge, puis la source
courante restaurée ; les autres tests ne sont pas déclarés rouges par déduction.

Build de production La Fusée avant alias réussi. Le manifeste des sources avant/après est
identique, SHA-256 `9b731f1bb83b6cd1b7e0404e95c5804d1f85b90cc8e242d712fcec531ed173d8`.
Huit appels authentifiés locaux reçoivent [200, 403, 200, 409, 200, 200, 200, 200] :
la correction privée laisse l’ancienne copie publique stable, le retour crée v3.
Export anonyme 200, CORS borné, ETag 304 et export privé 401 sont également reçus.

Recette native locale sous compte FOUNDER isolé, operatorId null : publication v4
depuis Connexions, titre/lien sur la page publique relus ; le retour à la copie v3
crée v5 et son titre est retrouvé après reload. Le lien « Gérer cette publication »
depuis Assets rejoint Connexions. Rechargement HTTP 200, DOM à 174 ms et premier
titre à 361 ms ; navigation cliente, premier titre à 289 ms. Ces bornes observées
ne sont pas des mesures de first paint. Aucune réponse >=500 ni erreur de page
observée. `stress:full` : zéro finding, sept forges DEFERRED faute de clés provider ;
aucun prestataire n’est reçu par ce stress.

Vitrine SPAWT : PR #4 fusionnée en 346e466, CI 37838306953 verte ; déploiement
`j6kd6n7k28apge6fukzq71m4` terminé le 8 octobre à 20:20:09 UTC. CSP et bundle
de trois domaines rapprochés du conteneur. 30/30 tests, types, vocabulaire et build
verts. Sur localhost:3318, titre/Moka/six questions/sans
compteur reçus, aucune erreur JavaScript observée.

Rectification documentaire : l’alerte d’absence de fonts venait du sparse-checkout
de `/spawt-vitrine-reception`, qui excluait `/public`. L’arbre Git contient dix
fichiers dans public/fonts. Les cinq WOFF2 Klinsman-Regular/Bold et
Gotham-Book/Medium/Bold sont reçus en production : HTTP 200, type font/woff2,
signature wOF2, SHA-256 consignés dans `preuves-publication-spawt-423/font-runtime.json`.
Il n’existe donc pas de dette d’absence/packaging démontrée par cette alerte ;
aucune police n’a été substituée. Cette réception des fichiers n’équivaut pas à
une réception de tout l’univers de marque.

La Fusée avant alias : source 8cc1209a et CI 37839043556 verte ; la construction
37839472712 est annulée avant déploiement. L’ajout CORS du portail est reçu :
`alias-red.log` compte 16 cas, 15 verts et un rouge avant patch (portail refusé) ;
`postgres-final-alias.log` reçoit 195/195 PostgreSQL après patch, dont les mêmes
16 public-brand, avec en-tête CORS pour WWW/portail et absence d’en-tête pour
HTTP/domaines ressemblants, sans refus HTTP de la ressource publique.
Les cinq gardes finaux et 1 610 tests de gouvernance sont reçus. La source après
alias `59ef5fda9640f265a7d995da40041d83d4389d46` a sa CI 37840436060 verte, son
build local exit 0 et 2 529 fichiers source identiques au commit avant/après.
HTTP authentifié final : [200, 403, 200, 409, 200, 200, 200, 200], publication
et restauration v3 reçues ; CORS spawt/WWW/portail exact, domaine ressemblant
HTTP 200 sans en-tête CORS, export privé 401 et ETag 304. Les fixtures sont nettoyées à zéro.
L’interface native est inchangée par le correctif d’alias ; ses reçus ci-dessus
restent bornés à la source avant alias, distincts de ces HTTP finaux.

L’image 37841025811 échoue au smoke boot avant push ghcr et déploiement, avec
l’erreur exacte `Error: Cannot find module '/app/node_modules/postgres-array/index.js'`.
Prisma adapter-pg exige postgres-array 3.0.4 ; le standalone n’en contient que
package.json. Le loader Prisma seul ne couvre pas toutes les dépendances externes
du bundle : @prisma/client, @prisma/adapter-pg, zod et les modules natifs.
Les scopes @prisma sont déjà copiés ; l’adapter exige aussi postgres-array.
Réception locale du loader, dans une copie du standalone hors dépôt avec les
scopes @prisma/.prisma reproduits : require('@prisma/adapter-pg') échoue avec
MODULE_NOT_FOUND sur postgres-array/index.js (exit 1), puis la copie du paquet
complet charge PrismaPg (exit 0). Preuves : packaging-loader.json et
packaging-red.log/green.log dans preuves-publication-spawt-423.

L’exécution du bundle complet dans ce runtime révèle ensuite `Cannot find module 'zod'`,
absent du standalone (`packaging-migration-zod-red.log`). Docker copie désormais
les paquets complets postgres-array et zod au runner. Après ces deux copies,
le bundle exact freeze-public-brands exécuté sur DB isolée reçoit exit 0,
captured=0, humanReview=false (`packaging-migration.json` et `packaging-migration.log`).
La capture et les gardes restent bloquants ; aucun boot d’image Docker ni runtime
de production n’était déduit de cette exécution isolée. La candidate 59ef n’a été
ni publiée ni déployée ; la production est restée en 422 jusqu’à la réception
de la source corrigée ci-dessous. L’historique de cet échec est conservé ; la dette
de packaging est fermée et retirée du registre transitoire.

### Réception de production — 2026-10-08

Source `5abee4ff56a98dcde2f0621b6216926975356700`, CI 37843378476 verte : 4 144
unitaires et 195 PostgreSQL. Image 37843924558 verte : boot, 101 migrations,
login HTTP 200 et PDF deux pages. Index image
`f3df52afdc98c91d1422807201e23f42286fdf45961b2d5d334cc0860f020068`, manifest
`21b02ab9fbda10cbc5c7f6ca7d9600bc8bccef182d3a36c78fd33b382b9635c7`.
Déploiement FABLE `fmfssee6f9fhadz1zqdqrqj2` terminé à 21:10:56 UTC, runtime
6.27.423 rapproché. Le runner contient postgres-array 3.0.4 et zod complets,
sans contournement de capture ou de garde.

Erratum de migration : l’attente de deux pages historiques était fausse. Zéro
page admissible est constatée ; motion19/xtincell ne respectent pas la règle
`/^LFA-/`, déjà appliquée en 422 et conservée en 423. Pages et API 404 sont
reçues. Aucun slug renommé, aucune page legacy publiée et aucune émission
historique ou validation humaine fabriquée.

SPAWT canonique : publication depuis Connexions réelle, édition
`cmv01feev000001pjqvuxpxbg`, v1 `LFA-spawt`, EXPLICIT_SELECTION, acteur réel et
selfHash du spine reçus. La copie publique existante est conservée exactement ;
aucune modification marketing de test ni écriture des fondations de marque.
HTTP : CORS des trois origines exactes 200, ETag 304, export privé 401 et /b 200.
Hors origines, l’export public répond 200 sans en-tête Access-Control-Allow-Origin ;
la ressource est volontairement publique. Navigateur principal et portail :
feed 200, même édition et digest, titre/promesse concordants, six questions et
aucun compteur expiré ; aucune exception, réponse 500 ou chargement échoué observé.
WWW redirige au principal ; aucune lecture native sous Origin WWW n’est déduite.
Ce reçu prouve le flux/digest et son rendu sans déduire une modification
visuelle de la copie. Le retour à une édition antérieure reste reçu sur fixtures,
sans mutation de test de la communication réelle en production.

Le corpus privé reste inchangé : 12 sources, 40 piliers, deux usages, 2 431 coûts,
19 processes, 108 fragments et digest des actifs ordinaires conservés. BrandAsset
passe de 255 à 256 uniquement pour l’édition publique ; zéro appel IA.
Preuves privées : `preuves-publication-spawt-423/reception.json`,
`production-http.json`, `public-slug-admission.json` et reçus natifs voisins ;
aucun contenu privé n’est recopié dans cet ADR.

Le reçu porte uniquement les textes/liens v1. Tokens, voix, variantes/règles de
composition, version consommée par quiz/app et retour des résultats, brouillon
après interruption, autres écrivains, Ptah et journal durable restent ouverts.
Sept chantiers EN_COURS/accepted=false ; 116 examens bornés et 80 donneurs ouverts
au registre programme. Aucun univers complet ni parcours large accepté.
