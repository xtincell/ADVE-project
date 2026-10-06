# ADR-0194 — Corpus créatif et intelligence concurrentielle sous Seshat

- **Status** : Accepted — V1 backend et réception navigateur ciblée validés localement
- **Date** : 2026-10-06
- **Phase** : extension Telemetry — boucle Hunter / mémoire Seshat / Argos
- **Depends on** : ADR-0060, ADR-0083, ADR-0100, ADR-0124, ADR-0149, ADR-0166, ADR-0186
- **Supersedes** : aucune — publication des dossiers ADR-0100 conservée

## Contexte

Hunter collecte déjà des dossiers de campagnes et des candidates à des épreuves.
La Fusée conserve le journal gouverné des dossiers ; Artemis consomme les
références. L’amendement du 2026-09-14 d’ADR-0100 et SHK-0002 désignent
`Argos-studio` comme bibliothèque canonique. Ce chantier ne duplique ni ne
remplace ce fonds documentaire.
Les comptes propres disposent de `SocialPost` et de métriques, mais leurs compteurs
courants ne constituent pas un historique de performance. Le Knowledge Graph
conserve les patterns et templates ; il ne représente pas encore une publication
externe, ses relevés successifs ni une annotation de média versionnée.

La demande est de relier ces capacités à la concurrence et aux résultats des
adaptations produites. Une nouvelle bibliothèque éditoriale isolée, un Neter supplémentaire
ou un autre score de marque dupliqueraient des responsabilités existantes.

L'audit anti-doublon porte sur `CODE-MAP`, `SocialPost`,
`CampaignReferenceDossier`, `KnowledgeEntry`, `BrandRef`, `CompetitorSnapshot`
et les services Seshat/Argos. Ces objets sont étendus ; les cinq primitives
ci-dessous répondent à des cardinalités ou des histories distinctes.

## Décision

### Responsabilités et périmètre

Le corpus appartient à **SESHAT / Telemetry**. Hunter fournit les pistes ; la
mémoire conserve observations et preuves ; Notoria et Artemis utilisent les
enseignements ; Argos en publie une projection éditoriale revue. Mestor reste
le contrôle des mutations et des admissions. Aucun Neter ni score de marque
nouveau. Une performance relative de contenu n'est ni le score ADVE ni une
épreuve admise dans le Scoreur.

**Frontière SHK-0002** : les observations, métriques et essais du corpus sont
la télémétrie de La Fusée. Les références éditoriales appartiennent à la bibliothèque
Argos-studio ; `CampaignReferenceDossier` reste le journal de gouvernance local.
La projection vers son API conserve les gates de revue et n’est pas déclarée
opérationnelle sans reçu de traversée.

Les observations portent un périmètre **PUBLIC** ou **BRAND**. BRAND exige
une stratégie propriétaire et les permissions canoniques d'ADR-0166. PUBLIC
désigne une observation admise au corpus partagé ; l'existence d'une URL publique
ne rend pas publiques les notes, relations concurrentielles, résultats et
prescriptions d'une marque. Une origine inconnue ne vaut pas permission.

### Cinq primitives, extension des objets existants

| Primitive | Pourquoi pas une extension de l'existant |
|---|---|
| `ContentSpecimen` | Une publication identifiable externe ou propre ; `SocialPost` reste le post connecté et `CampaignReferenceDossier` le dossier éditorial. |
| `ContentMetricSnapshot` | Relevés temporels append-only ; les compteurs actuels d'un post ne préservent pas les observations à âge comparable. |
| `CreativeAnalysis` | Annotation descriptive versionnée d'un média ou annotation manuelle ; distincte d'un dossier mutable de campagne. |
| `PatternEvidence` | Association explicite d'une révision de connaissance à ses observations, exemples et contre-exemples. |
| `RecipeApplication` | Essai propre à une marque, objectif déclaré et révision gelée ; distinct d'une recette partagée et d'un asset de production. |

Les **patterns** et **recettes** utilisent `KnowledgeEntry` avec un payload
typé/versionné. La V1 persiste `BRIEF_PATTERN` / `creative-recipe-v1` ;
`CAMPAIGN_TEMPLATE` demeure sa famille historique, sans table de recette nouvelle.
Les lecteurs historiques restent compatibles. Une application gèle la recette
utilisée ; une édition ultérieure ne réécrit pas l'hypothèse de l'essai.
Inconnue reste `null`, jamais zéro inventé. Import relançable et relevés
idempotents ; aucune collecte ne remplace destructivement un relevé précédent.

### Concurrence et méthode

`BrandRef` reste l'identité d'un acteur et `CompetitorSnapshot` l'observation
d'étude. Les relations surveillées distinguent concurrent commercial,
concurrent d'attention et référence transférable. Elles sont propres à la
stratégie ; un nom seul ne prouve pas une identité. Les lectures concurrentielles
de T et d'analytics respectent secteur, pays et propriété des observations,
sans repli sur les derniers snapshots de toute la base. La watchlist fournit
des sujets de veille via `loadWatchSubjects` (l'édition manuelle des sujets
garde sa priorité) ; elle ne constitue pas un filtre d’identité sur ces
snapshots d’étude.

`opportunities` compare les recettes revues au corpus propre et aux comptes
publics de la watchlist, à plateforme/format/secteur/pays comparables. Une absence
observée produit au plus une hypothèse `TEST_CANDIDATE`, avec couverture et
limites ; elle ne prouve pas un marché libre. `recipeContext` transmet ces
hypothèses à Artemis et à Notoria (`SESHAT_OBSERVATION`, `I_GENERATION`) sans
mutation automatique d'ADVE.

La première méthode d'outlier compare la métrique observée à une médiane
de contenus **antérieurs**, du même compte, plateforme, format, métrique et
âge comparable. Le contenu évalué et les publications futures sont exclus.
Paid, organique et statut inconnu sont distingués. Une cohorte insuffisante
ou un dénominateur inexploitable produit une abstention explicite. Le résultat
conserve méthode, dates et identifiants des observations utilisées.

Une mécanique fréquente chez les outliers est une **association**, pas une
cause démontrée. Exemples ordinaires, contre-exemples, comptes indépendants
et limites accompagnent les recettes. La fréquence est une diffusion dans
le corpus observé, pas une saturation mesurée de tout le marché. L'effet
commercial et communautaire d'une adaptation exige ses mesures propres.

La V1 compare une signature explicite hook × narration × visuel aux contenus
annotés sans cette signature ; ces contrôles ne sont pas nécessairement des
échecs de la même mécanique. Sa partition temporelle 70/30 est descriptive,
sans test de significativité ni correction des comparaisons multiples.
`OBSERVED` exige cinq exemples normalisés, cinq contrôles et trois comptes
indépendants ; ce seuil d'admission ne certifie ni généralisation ni causalité.

### Manual-first et Argos

Import, relevé, annotation descriptive, recette et suivi d'essai ont une voie
manuelle gouvernée. Une source web trouvée par Hunter reste une piste ; elle
n'atteste pas la lecture du média ni une métrique mesurée. Une annotation
manuelle ne prétend pas être une analyse multimodale exécutée.

La publication des **recettes** exige une revue opérateur explicite et des preuves
PUBLIC uniquement. Une découverte ne publie pas sa recette ; les preuves BRAND
ne deviennent pas publiables par changement de statut. La projection indique
la provenance et les limites disponibles.

Le comportement existant des `CampaignReferenceDossier` est conservé : `PASS`
entraîne leur publication selon ADR-0100. Ce verdict reste éditorial et ne
certifie pas la performance. Cette ADR ne remplace pas leur règle de publication.

## Conséquences

- Migration additive et raccords aux services, routeurs et surfaces existants.
  Les données de marques restent isolées ; aucune mutation automatique d'ADVE.
- Premier parcours utilisable sans fournisseur externe : imports contrôlés et
  données des comptes propres disponibles. TikTok/Instagram et fournisseurs
  tiers exigent un accès, des capacités et des droits vérifiés, non supposés.
- L'adaptation traverse recette → prescription/brief → contenu publié →
  observations de résultat. Le lien explicite facilite l'apprentissage sans
  attribuer causalement chaque variation de vues ou de Cult Index au contenu.
- Les tâches durables, l'acquisition multimodale externe et la généralisation
  des connecteurs restent bornées par le plan opérationnel ; une commande
  manuelle codée ne doit pas être présentée comme un chantier futur.

### Vérification locale — v6.27.391, 2026-10-06

- Migration finale `20261006120000_creative_intelligence` appliquée depuis une
  base PostgreSQL locale vide, avec backfill des origines d'étude et checks SQL.
- `scripts/verify-creative-intelligence.ts` : PASS sur le parcours tRPC réel :
  import/snapshot relançables, annotations/recettes, revue, refus de publication
  privée, essai résolu, isolement marques/concurrents, watchlist sans écrasement
  de businessContext et refus de mutation sur marché FROZEN.
- Typecheck, lint et lint de gouvernance : aucune erreur (25 avertissements
  existants). Cycles : zéro. Audits de gouvernance, manifests, routage LLM strict
  et validation Prisma : PASS.
- Suite large : 3 834 assertions passent ; un timeout du test existant web-push
  sous charge. Relance ciblée : quatre fichiers, 21 assertions, toutes PASS.
  La suite large n'est donc pas présentée comme un premier passage entièrement vert.
- Vérification du verrou HARD par réinjection du défaut de pays : une assertion
  échoue / trois passent ; restauration : quatre passent. Le verrou détecte
  effectivement le défaut qu'il protège.

Ces preuves valident la V1 locale. Réception navigateur ciblée PASS
(`intelligence-browser-final.log`) : import manuel Console, recettes publiques
Argos et lecture de `/cockpit/intelligence/social` avec un vrai compte FOUNDER ;
zéro erreur navigateur. `/cockpit/intelligence/track` conserve sa garde
`OperatorSurface` et constitue une lecture opérateur complémentaire.
L'atelier conserve les commandes d'analytics pour saisir/lire les faits
concurrentiels sourcés, selon le même périmètre que T.

Les derniers contrôles dédiés (`intelligence-typecheck-delivery.log`,
`intelligence-contracts-delivery.log`, `intelligence-runtime-delivery.log`)
se terminent avec exit 0 : typecheck, quatre fichiers/21 assertions et
parcours tRPC PostgreSQL réel PASS. Les logs sont des reçus locaux, pas des
artefacts de production.

### Limite de validation globale

Le stress de tout le site n'est **pas vert** : 31 pages OK puis Next a été tué
par l'OOM du cgroup local (environ 10 Go), à `/cockpit/brand/potential`.
Le serveur indisponible a ensuite produit 250 erreurs fetch et trois erreurs
tRPC ; deux avertissements concernent les préconditions de fixture. Ce parcours
interrompu ne permet pas de conclure sur les pages restantes. Reprise de la
campagne globale avec ressources adaptées et fixtures qualifiées : RESIDUAL-DEBT.
Les vérifications dédiées à cette V1 ont été relancées après cette interruption.

Aucun déploiement ni reçu de production. Les collecteurs externes, la vision
multimodale automatique et la projection vers Argos-studio restent bornés par
les accès réels et RESIDUAL-DEBT ; ils ne sont pas validés par la recette manuelle.

Plan et specification source :
[`2026-10-06-intelligence-creative-concurrentielle.md`](../plans/2026-10-06-intelligence-creative-concurrentielle.md).
