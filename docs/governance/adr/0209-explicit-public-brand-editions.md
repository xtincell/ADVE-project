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
  édition et digest, avec réponse 304 et cache court. CORS navigateur est limité
  à spawt.online et www.spawt.online ; l’édition reste une ressource publique.
  L’export intégral JSON/CSV conserve son authentification et son contrôle d’accès.
- La migration de démarrage capture une seule fois les champs publics bornés des
  marques possédant déjà un slug admissible, sans édition. Elle utilise le spine
  existant et l’origine OBSERVED_PUBLICATION, sans selectedBy ni revue humaine
  fabriquée ; le reçu indique humanReview=false. Une lecture anonyme ne déclenche
  jamais cette capture. Le bundle est exécuté après les migrations de schéma ;
  un échec bloque le démarrage et expose l’instruction de reprise, sans l’ignorer.
- Le consommateur SPAWT prévu dans son dépôt applique uniquement la copie du
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
choisie et ses images déployées doivent être reçus séparément. Les autres écrivains,
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
du successeur. Réception locale : 195/195 PostgreSQL dont 16 pour ce contrat,
4 144/4 144 unitaires sur 395 fichiers, 1 610/1 610 de gouvernance sur 165 fichiers ;
types/linters sans erreur (24 avertissements préexistants), aucun cycle. Une
contre-épreuve significative du lecteur est reçue en rouge, puis la source
courante restaurée ; les autres tests ne sont pas déclarés rouges par déduction.

Build de production La Fusée réussi. Le manifeste des sources avant/après est
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
`j6kd6n7k28apge6fukzq71m4` en cours. 30/30 tests, types, vocabulaire et build
verts. Sur localhost:3318, titre/Moka/six questions/sans
compteur reçus, aucune erreur JavaScript observée. Le build signale les fichiers
Klinsman/Gotham absents : packaging et disponibilité restent à vérifier, sans
substitution, avant réception complète de la direction artistique. CI/image/runtime
La Fusée 423, capture historique et raccord SPAWT en production ne sont pas
présumés reçus ; la recette locale ne clôt pas le raccord de production.
