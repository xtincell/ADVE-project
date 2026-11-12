# ADR-0212 — Projeter une identité publique choisie depuis le coffre existant

- **Status** : Accepted
- **Date** : 2026-10-09
- **Phase** : Réception partielle Shinkiro C2/C3/C4, 6.27.432 livrée — vitrine choisie
- **Depends on** : ADR-0208, ADR-0209, ADR-0210, ADR-0211
- **Supersedes** : — (extension, sans réécriture des éditions ou décisions historiques)

Architecture acceptée après gauntlet, CI/image/runtime et gestes natifs de
publication/revue/retour reçus en production 432. Le périmètre est l’identité
choisie de la vitrine SPAWT, édition v6 ; aucun univers de marque intégral reçu.
Le dossier privé preuves-identite-projetee-433 ne désigne pas une version logicielle.

## Contexte

431 conserve le logo choisi et ses octets. La référence documentaire est ensuite
admise dans Sources, sans analyse ni validation implicite. Palette, typographies,
poses de mascotte et citation restent locales à la vitrine : les retrouver dans
le coffre ne suffit pas à recevoir leur choix et leur consommation ensemble.
Des rôles documentaires contradictoires exigent une décision explicite, pas une
déduction par ordre, nom ou état DRAFT.

Étendre la publication et sa conservation relève de **brand-vault,
Sustainment/MESTOR** : identité conservée → continuité de marque → accumulation
de superfans visée. Aucun résultat business n’est reçu par ce raccord.

## Décision

- Étendre les mêmes BrandAsset/strategy.update, resolver d’identité, stockage
  chiffré et transport /brand/editions. Aucun nouveau modèle Prisma, service,
  router, Intent, agent, fournisseur ou permission. PublicIdentityReview compose
  les primitives existantes dans Connexions, sans second éditeur d’identité.
- Ajouter public-brand-v2 et conserver la lecture v1 : l’export public-brand
  projette les champs v1, public-brand-v2 peut exposer l’identité choisie. Une
  ancienne édition v1 reste lisible. Choix, pins et reçus sources restent privés ;
  la réponse publique contient seulement les champs et fichiers sélectionnés.
- Choisir la référence puis les actifs et versions admissibles hors campagne,
  SELECTED/ACTIVE de la marque, sans promotion. Révision, source liée courante,
  fingerprint et pins encadrent publication, retour et revue de texte ; refuser
  une référence étrangère, périmée ou des octets absents/corrompus.
- Palette facultative : six couleurs par usage, prises dans la palette choisie.
  Contraste >=4,5 pour encre/fond clair, encre/surface douce, encre/signature et
  communauté/fond clair. Ces paires ne certifient pas toute la page accessible.
- Typographie facultative : familles titres/corps du système choisi, fichiers
  OTF/TTF référencés dans ce système, id/version/graisse explicites. Vérifier
  structure bornée, famille et graisse du fichier, conserver et relire ses
  octets ; le décodage FontFace du navigateur constitue une réception distincte,
  reçue pour les cinq fichiers choisis de cette vitrine.
  Aucun WOFF2 reconstruit ni équivalence de chaque glyphe déduite.
- Mascotte facultative : personnage de référence et illustrations choisies par
  accueil/découverte/guidage, avec description accessible. Le choix explicite
  ne prouve pas une filiation sémantique ou une dérivation entre masters.
- Voix facultative : seule une citation contenue dans la référence choisie,
  comparaison après normalisation des espaces, et son attribution sont publiques.
  Aucune charte privée complète exportée ni TONE_CHARTER DRAFT promue.
- Conserver les reçus identityArchives et pins dans l’édition. Retour/revue de
  texte réutilisent les copies vérifiées sous références toujours courantes ;
  nouveau choix produit sa copie. Le transport existant vérifie chaque lecture
  avant 304 et refuse sans repli source mutable ; CORS limité aux trois origines
  SPAWT existantes, sans élargir la CSP. Nettoyage existant protège les copies
  encore référencées par une édition.
- Le lecteur vitrine valide contrat/digest/URL d’édition, longueur/hash de tous
  les fichiers et décodage polices/images avant d’appliquer l’ensemble reçu.
  L’échec garde la dernière édition reçue dans la page ouverte, ou le repli local
  initial. Les styles et tailles restent adaptés à chaque destination ; le quiz
  et l’application ne reçoivent pas un nouveau contrat métier par ce changement.

## Conséquences

La factorisation source → choix id/version/rôle → projection bornée → copie →
consommation évite une synchronisation parallèle et une charte publique générée.
Les familles non choisies gardent leur présentation locale. La conservation ne
garantit ni reprise après perte du stockage/clé ni persistance d’un brouillon ou
du dernier reçu client après fermeture de page.

Contrôles locaux reçus : types/lints/cycles sans erreur, 24 warnings préexistants,
1617 gouvernance/166 fichiers avec scans UI/vocab étendus. PostgreSQL 253/13,
dont public-brand 38 (cinq nouveaux), et trois tests de domaine verts. Verrou
d’input rouge sur ancien code ; suppression de l’inspection de police produit
un rouge significatif, puis code restauré et 38 PostgreSQL ciblés verts.
Vitrine 38/5 fichiers, typecheck/build verts. Suite globale finale après bump et
arrêt des serveurs locaux : 4170/398 fichiers verts. Premier passage : refus
attendu de note avant bump et récidive withRetry 281 ms pour une borne de 200 ms
pendant compilation ; relance sans compilation verte, cause non démontrée et
plan de diagnostic du temps mur conservé au registre existant.

Session native FOUNDER sur fixture locale : référence consultée, publication v1,
revue texte v2, retour v3, strategy.update 200 et trois émissions OK. Huit copies
gardent les mêmes hashes/objectKeys sur les trois versions, source inchangée.
HTTP v2 et huit fichiers 200/hash exact, sans champs privés. Première lecture
vitrine via harness privé : seules deux destinations fetch proxifiées localement,
contrat/hash/décodeurs inchangés ; cinq FontFace loaded, trois PNG de mascotte
décodés et couleurs/citation appliquées ensemble. Ce reçu ne prouve pas la CSP
en production. Rechargement final après retour interrompu par arrêt de fixture :
retour reçu côté producer/PG seulement, pas côté consumer natif.

Fenêtres locales non tronquées sans exception/>=500 observé : vitrine document
200/DOM 116 ms ; nouvelle fenêtre Connexions document 200/DOM 6460 ms, premier
titre <=8887 ms. Dev/compilation chargée, aucun SLO/performance production déduit.
Ce retour local interrompu reste historique ; le retour vitrine en production
est reçu ci-dessous. Preuves privées de cette étape locale :
release/preuves-identite-projetee-433, native-http.json, native-return-state.json,
native-connections-bounded.json et native-vitrine-final-reload-unreceived.json ;
[réception et limites](../RECEPTION-IDENTITE-PUBLIQUE.md).

Livraison 432 : source 3968c0a1a7e197547a6777f1b38101a7c77e8806, CI
37885602637/37885602643/37885602628 vertes, unitaires 4170/398 et PostgreSQL
253/13 reçus en CI ; image 37886082203 et runtime exact/version 432/nextjs reçus.
Index sha256:851faeecf7c3885799d15b8b5d10287ebf1516c63a3ce09be07fed696734b73a.
Vitrine PR #7 fusionnée 308fcf2b, puis correction d’espacement PR #8 livrée
adc4738d : gap 0→16 px, mobile 390 px sans débordement horizontal.

Production native : publication SPAWT v4, republication inchangée sans resélection
v5, retour v4 créant v6. Trois émissions existantes OK, huit copies de mêmes
hashes/objectKeys et référence inchangée. Producteur et consumer reçoivent le
retour ; cinq polices loaded, trois PNG décodés, six couleurs et citation reçues
ensemble. HTTP v1 compatible, données privées exclues, textes/liens conservés ;
origines/CSP inchangées reçues. Corpus 13 sources/40 piliers, global 27/504,
coûts 2431/processus 19/fragments 108 inchangés ; seuls trois actifs d’édition
ajoutés, 258→261. Fixture locale nettoyée, zéro source/édition/émission.

Première trace producteur tronquée conservée. Rechargement complet : DOM 545,9 ms,
premier titre seulement lu de façon différée <=39853 ms, aucune latence précise
ni SLO déduits. Fenêtre consumer retour complète DOM 482 ms ; fenêtre finale
avec Log activé, sans exception/>=500/entrée Log observée. Ces fenêtres ne
reçoivent pas tous les parcours. Reçus privés : reception.json, runtime.json,
production-http-restored.json, retained-copies-return-received.json,
global-corpus-invariants-received.json, native-production-vitrine-restored-dom.json
et spacing-delivery/spawt-runtime.json du même dossier.

Legacy sans archive, récupération/disponibilité du stockage, filiation HD et
WOFF2, autres destinations/quiz/application/retour de valeur restent ouverts.
Aucun parcours de marque entier, aucun des sept chantiers ni aucune des dix
gates de release du programme n’est accepté par cette livraison.
