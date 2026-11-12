# Exploiter l'intelligence créative

État du 2026-10-06, ADR-0194/0195/0196. Les accès réels doivent être reçus
individuellement ; la présence d'un adaptateur ne prouve pas une connexion.

## Sources et première collecte

1. Dans `/console/anubis/credentials`, configurer les services autorisés pour
   l'opérateur. Les champs indiquent les versions, identifiants et permissions
   requis. Ne pas coller une clé dans un brief ou une liste de veille.
2. Dans `/console/seshat/argos`, sélectionner la marque, son secteur et son pays,
   puis la source et l'identifiant attendu ci-dessous. La première collecte doit
   retourner `LIVE` avec des identifiants de contenus ; vérifier leurs liens.
3. Refaire une collecte et vérifier les relevés successifs. Une date de collecte
   ne remplace jamais une date de publication. Les compteurs inconnus restent absents.

| Source | Identifiant de collecte | Prérequis particulier |
|---|---|---|
| Bluesky | handle ou DID | Public |
| YouTube | chaîne `UC…` ou `@handle` | YouTube Data API ; format déclaré seulement si lot homogène |
| Foreplay | recherche | Abonnement/API Discovery |
| Réseaux connectés | identifiant du compte connecté | Connexion existante de la marque |
| Meta Ad Library | identifiant numérique de page | Version Graph et type d'annonce explicites, permissions approuvées |
| Instagram Discovery | username | Compte professionnel, actorId et version Graph |
| TikTok Research | username | Projet éligible et accès approuvé |
| TikTok Commercial | username | Accès aux pays/contenus commerciaux autorisés |
| Reddit | username | OAuth et User-Agent descriptif |
| X | identifiant numérique utilisateur | Contrat API autorisant ses publications |
| LinkedIn | URN de personne/organisation | Version `YYYYMM` et droits de lecture |
| Brandwatch | queryId | projectId et abonnement |
| Apify | datasetId | Lignes déjà normalisées au contrat d'import créatif ; aucun acteur lancé |
| RSS | URL HTTPS du flux | Publications datées ; aucune mesure de performance inventée |

BuzzSumo utilise un export qualifié. Exploding Topics reste une source de signaux :
ses volumes de recherche ne sont pas des vues de contenus. Les vidéos sans format
fiable restent non classées ; une durée courte ne prouve pas le format Shorts.
Les observations `UNKNOWN` en exposition publicitaire n'entrent pas dans les ratios organiques.

La veille est désactivée par défaut. Chaque compte peut préciser
`collection: { "provider": "RSS", "account": "https://exemple.org/feed.xml" }`.
Sinon seuls YouTube UC… et Bluesky DID sont reconnus automatiquement. Activer
la veille dans l'atelier après une collecte reçue. Le passage six heures traite
deux marques et deux comptes par marque, avec report visible et verrou par marque.

## Médias privés et droits

Utiliser un volume persistant privé, accessible en écriture à l'utilisateur du
conteneur (UID 1001 dans l'image actuelle), hors répertoire public de l'application.
Définir `CREATIVE_MEDIA_ARCHIVE_DIR` et une clé AES de 32 octets représentée par
64 caractères hexadécimaux dans `CREATIVE_MEDIA_ENCRYPTION_KEY`. Sauvegarder la clé
indépendamment du volume. Ne pas la remplacer tant que des archives actives en dépendent.

L'autre backend est le contrat HTTP existant `BLOB_STORAGE_*_URL_TEMPLATE` :
trois URLs HTTPS avec `{hash}`, PUT/GET/DELETE et éventuellement un jeton dédié.
Il requiert un service de stockage compatible ; ce n'est pas un client natif
S3 SigV4. Pour S3/R2, utiliser un service autorisé qui signe ces opérations.
Le retrait n'est confirmé qu'après un GET retournant 404/410. Configurer également
un inventaire/réconciliateur ou une politique de cycle de vie côté stockage pour
les objets privés dont le propriétaire a été supprimé en cascade dans la base.
La maintenance de volume traite ces orphelins avec une rotation de fichiers.

Dans l'atelier, déclarer le droit, son lien justificatif, les conditions et une
échéance d'au plus un an. La copie est chiffrée, relue et vérifiée avant l'état
conservé. La lecture est bloquée immédiatement à l'expiration ; le passage
`/api/cron/argos-hunt?mode=retention`, protégé par `CRON_SECRET`, effectue le retrait.
Les schedulers existants le déclenchent toutes les quinze minutes, avec un budget
de passage borné. Un reçu différé ou échoué exige une intervention de stockage.

Recette de mise en service : conserver un fichier autorisé, le relire, vérifier
son hash, puis le retirer et constater son absence physique. Le reçu local NASA
ne vaut pas recette du volume ou service distant choisi.

## Observation et recettes

Le mode images utilise `LLM_VISION_PROVIDER`/`LLM_VISION_MODEL`. L'observation
audiovisuelle native utilise `LLM_VIDEO_PROVIDER=openrouter`, un modèle vidéo
`google/gemini-*` explicitement disponible et `OPENROUTER_API_KEY` au runtime.
Limites natives : MP4, vingt Mo, cinq minutes. ffmpeg/ffprobe sont dans l'image.
Le fichier complet et sa piste sonore sont transmis au modèle ; le brouillon
reste à revoir avant admission comme annotation manuelle. Une réponse de modèle
ne démontre ni la causalité, ni l'exhaustivité d'une transcription.

L'index sémantique réutilise les fournisseurs d'embedding du Gateway. Indexer des
recettes revues, puis ouvrir leur voisinage dans le cockpit. Aucun vecteur vide
ne produit un voisin. La provision d'indexation est marquée comme estimation ;
le coût audiovisuel utilise la facture rapportée, sinon une provision identifiée.

La comparaison conditionnelle exige un historique comparable, des comptes de
validation distincts et un gain validé face à la référence du compte. La diffusion
affiche son échantillon et sa couverture. Un état insuffisant est un résultat normal.

## Essai et Argos

Déclarer l'hypothèse, l'actif/action, la mesure, la cible et l'échéance avant
publication. Confirmer ensuite l'identité de la publication dans la fenêtre de
l'essai. Une mesure prise après l'échéance peut alors clore l'essai ; elle ne peut
pas être remplacée par un autre résultat. Cela documente une association observée.

La publication locale d'un dossier Argos PASS reste distincte du POST vers
Argos-studio. Configurer son endpoint et son accès existant, valider un dossier
`research-dossier-v1`, puis conserver le reçu distant. Sans ce reçu, la projection
n'est pas déclarée opérationnelle. Hunter reste dans Seshat ; aucun accès tiers
ne modifie automatiquement les fondations ADVE.
