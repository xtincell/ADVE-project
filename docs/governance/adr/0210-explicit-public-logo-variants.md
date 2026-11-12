# ADR-0210 — Choisir et rendre une variante de logo dans l’édition publique existante

- **Status** : Accepted
- **Date** : 2026-10-09
- **Phase** : Réception Shinkiro C2/C3
- **Depends on** : ADR-0208, ADR-0209
- **Supersedes** : — (étend ADR-0209, sans réécrire sa réception historique)

Décision d’architecture acceptée avec recette locale bornée et gauntlet final
vert. Consommateur vitrine déployé, logo natif en production non reçu ; CI/image/
livraison du backend 429 restent à recevoir. Production ADVE reçue : 6.27.428.

## Contexte

L’édition publique porte déjà logoUrl, mais la vitrine conserve deux images
statiques. Le publisher choisit le premier logo ACTIVE par id, alors que le
résolveur de marque existe. Plusieurs variantes finales peuvent servir des
usages différents ; leur ordre technique n’est pas une décision de destination.
La CSP images/fonts self empêche aussi un raccord externe naïf. Ce lot relie
sélection, reçu et rendu, sans remplacer la direction artistique du site.

## Décision

- Étendre resolveBrandIdentity par son pool de logos, en conservant les lecteurs
  historiques. La publication utilise ce pool partagé puis limite l’éligibilité
  aux LOGO_FINAL de la marque, hors campagne, SELECTED/ACTIVE, non périmés et à
  adresse publique admissible. Une source documentaire liée doit être disponible
  et courante ; sa correction ne peut pas être ignorée lors de publication.
- La proposition est nulle lorsque plusieurs ACTIVE admissibles existent. La
  carte Connexions utilise Select DS, aperçu et choix de variante ou sans logo.
  Publier reste un geste explicite dans strategy.update existant ; ce choix ne
  promeut aucun logo, ne valide aucun pilier et ne choisit aucune marque voisine.
- Ajouter logoAssetId au seul input privé. Le contenu public public-brand-v1 reste
  inchangé. La compatibilité du reçu URL unique est conservée ; plusieurs
  correspondances sans choix explicite sont refusées. L’URL seule n’est pas un
  identifiant fiable de variante lorsqu’elle désigne plusieurs actifs.
- Absolutiser les chemins publics /brand/ via la base HTTPS de déploiement
  existante ; ne pas les résoudre sur le domaine du consommateur. Exclure les
  pièces privées/signées reconnues et les chemins hors contrat.
- Conserver en métadonnées privées id/version/fileUrl/fingerprint du logo choisi.
  Révision attendue, édition attendue, droits, firewall et transaction d’édition
  existants restent applicables. Un ancien logo indisponible, corrigé ou dont
  l’enregistrement/version a changé empêche une restauration aveugle ; revenir
  reste une nouvelle édition sous les contrôles courants.
- La vitrine rend le logo aux deux emplacements existants. Son lecteur accepte
  seulement HTTPS powerupgraders.com/brand/ avec chemins de fichiers admissibles,
  sans credentials, paramètres ni fragment. Les autres URL gardent le repli canon
  local ; ce filtre est plus étroit que le schéma public HTTPS général.
- Étendre img-src uniquement à https://powerupgraders.com/brand/, sans wildcard.
  font-src reste self. Erreur de chargement : repli sur le logo local, aucune
  disparition de la marque ; changement d’URL réinitialise ce repli. Moka,
  palette, polices, structure, quiz et déduction restent dans leur CANON existant.
- Aucun nouveau modèle/table, service, router, page, Intent, outil, agent ou
  permission. La persistance et la résolution sont étendues à leur place.

## Conséquences

Les pins prouvent l’état de l’enregistrement choisi, pas l’immutabilité des
**octets** servis derrière /brand/. Ni le fingerprint privé ni le digest de
l’édition JSON ne prouvent le hash du fichier rendu. Cette limite doit rester
ouverte jusqu’à conservation/version d’octets et relecture reçues sur le stockage
existant. Aucun univers complet, quiz/application, retour de valeur, fournisseur
ou cycle métier n’est reçu par ce lot. Sept chantiers : accepted=false.

### Réception locale au 2026-10-09

| Preuve | État reçu et limite |
|---|---|
| PostgreSQL ciblé | public-brand 21/21 et guidelines-identity 6/6, soit 27 ; cinquième contre-exemple source liée périmée rouge puis vert |
| PostgreSQL final | 235/13 fichiers puis source-uses 8/1, soit 243/14 ; aucun appel fournisseur |
| HTTP authentifié | Huit appels 200/403/200/409/200/200/200/200 ; publication/restauration v4, export privé 401, CORS/ETag 304 |
| Connexions native FOUNDER locale | Choix contour v3 → édition 1 ; après recette HTTP, choix wordmark v2 → édition 5 ; retour édition 4 → nouveau successeur édition 6 |
| Page publique native locale | Wordmark chargé 2687×904 puis contour restauré 4123×1714 ; aucune publication de marque réelle déduite de la fixture |
| Fenêtre native | Zéro réponse >=500/exception ; H1 observé <=2482 ms, DOM 563 ms, mesure chaude sans preuve de premier paint ni SLO |
| Statut document natif | Non capturé par CDP ; HTTP 200 du serveur et script HTTP reçus séparément |
| Vitrine | Trois rouges/14 verts avant patch, puis 33/33 ; types/vocab/build exit0 ; tests de deux rendus/repli/retard/périmètre image/CSP |
| Nettoyage | Six éditions synthétiques reçues puis fixture nettoyée : zéro actif/stratégie restant ; aucune identité réelle publiée déduite de cette recette |
| Gouvernance ADVE | 1617/166 verts ; types/lints sans erreur, 24 warnings préexistants et zéro cycle |
| Suite globale ADVE | Premier passage 4166/4167 : timing withRetry observé 93 ms pour une borne de 50 ms pendant compilation locale ; isolé 36/36 puis relance après arrêt du serveur 4167/397 fichiers verts, sans changement de test |
| Livraison vitrine | PR #6 fusionnée, source 3e1f9b8d96876d2403c6576b4b64a73a3be8727d, CI 37867539939 verte ; déploiement nk9xw7xtnvhfuo0oikoeuo1l terminé le 9 octobre à 01:01:57 UTC ; logo natif en production non reçu |
| CI/image/production backend 429 | Non reçues ; native Connexions/page publique locale ne reçoit pas la vitrine de production |

Le timing n’a pas de cause racine démontrée ; la relance requise est verte, un
diagnostic reste à déclencher si récidive au prochain passage stabilité. Les tests
anti-drift restent dans public-brand.postgres.test.ts,
guidelines-identity.postgres.test.ts et les tests public-brand/security-headers
de la vitrine. Aucun test n’est ignoré ni borne affaiblie pour ce lot.
Preuves privées : release/preuves-identite-publique-429, captures et reçus sans
identifiants ou contenu de fixture propagés dans cette prose. Inventaire réel lu
sans mutation, aucune identité inférée du nombre d’actifs. Sept chantiers ouverts.
