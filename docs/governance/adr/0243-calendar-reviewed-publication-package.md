# ADR0243 — Du rendu du calendrier à la publication relue

5 novembre 2026. Candidat local ; suite ADR0241. Aucun déploiement ni envoi public effectué pour cette réception.

## Problème

La production conserve les briefs et les images, mais le composeur social peut transmettre un texte et une URL sans lien avec la variante retenue. `SET_BRAND_ACTION_STATUS` ne scelle pas le contenu. `SELECT_BRAND_ASSET` choisit un candidat de brief et non le fichier AssetVersion produit. Aucun des deux ne prouve la relecture du couple image/légende.

## Décision

Anubis prépare la transmission dans les modèles existants. L’intention `ANUBIS_PREPARE_SOCIAL_POST` sélectionne une AssetVersion reçue depuis un brief de calendrier valide, ou enregistre sa relecture humaine. Le paquet est une BrandAsset versionnée ; une BrandAction unique par ligne conserve sa version courante. Aucune nouvelle table.

La version scelle calendrier, brief, auteur génératif, fichier source, export JPEG et texte exact. La sélection ne vaut pas relecture. La relecture conserve la personne, la date et le hash du paquet. Retenir un autre rendu crée une nouvelle version ; le contenu et la relecture antérieurs sont conservés, la nouvelle version doit être relue. Une modification du calendrier, de la direction artistique ou des octets invalide le chemin d’envoi.

L’envoi reprend `ANUBIS_PUBLISH_SOCIAL_POST` et le transport existant. Le client désigne un compte connecté à la même marque ; le serveur déduit texte, format et image du paquet relu. Les sources sont revérifiées sous transaction sérialisable avant le claim. La réservation existante empêche le double envoi ; les réponses incertaines restent à rapprocher.

L’image transmise est le JPEG exact présenté à la relecture : orientation appliquée, transparence sur blanc, sans recadrage. L’accès privé nécessite la session ; l’accès fournisseur est signé pour dix minutes, lié au paquet/hash, à sa relecture et à sa réservation d’envoi. Aucun secret ou URL signée durable en base. Une planification conserve les références et signe au moment du départ.

Posts image Facebook et Instagram et stories image Instagram sont couverts. La story transmet uniquement son image ; l’interface le précise. Carrousels et vidéos restent refusés avec un motif explicite, plutôt que transformés silencieusement en post image.

## Réception et limites

Dix tests PostgreSQL isolés couvrent sélection, relecture exacte, filiation, idempotence, changement d’option, mutation générique refusée, isolation inter-marques, accès signé, planification, compte destinataire, transport feed/story et changement de source. Les fournisseurs sont simulés ; aucun appel social réel. Le build intégré, la CI, le runtime et une publication décidée par le propriétaire restent des réceptions distinctes. Les permissions et l’éligibilité du compte Instagram réel ne sont pas déduites de cette recette.
