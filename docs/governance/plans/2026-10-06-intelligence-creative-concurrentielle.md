# Proposition d’implémentation — intelligence créative et concurrentielle de La Fusée

Date : 6 octobre 2026. Référence inspectée : `xtincell/ADVE-project`, commit `e184c9fba7094f57597b33b42bf5f14a026de337`.

Statut : spécification source proposée le 2026-10-06, conservée comme périmètre et séquencement. L'état réel des primitives et raccords de la livraison est décrit par [ADR-0194](../adr/0194-creative-corpus-and-competitive-intelligence.md) et les cartes, après inspection des fichiers et résultats de validation. Cette spécification ne constitue pas un reçu de production.

**Frontière existante à préserver** : l'amendement du 2026-09-14 d'ADR-0100 / SHK-0002 désigne `Argos-studio` comme bibliothèque canonique. `CampaignReferenceDossier` est le journal gouverné de La Fusée ; le corpus décrit ici porte ses observations, métriques, analyses et essais, pas une bibliothèque éditoriale concurrente. Toute projection externe exige son contrat et un reçu de traversée. Aucun accès aux données ou aux crons de production n’a été effectué pour cette spécification.

## État d'implémentation inspecté — parcours de la V1

Ce relevé décrit la V1 backend validée localement (v6.27.391) ; la migration
a été appliquée depuis une base PostgreSQL vide et le parcours tRPC réel est PASS.
Les contrôles détaillés et le timeout web-push de la suite large avec sa relance
verte sont consignés dans ADR-0194. Réception navigateur ciblée PASS : Console
import, Argos recettes et vrai FOUNDER `/cockpit/intelligence/social`, zéro erreur.
Le typecheck et les contrats/runtime dédiés finaux sont exit 0. Le stress global
a validé 31 pages avant OOM local (~10 Go) à `/cockpit/brand/potential`, suivi
de 250 erreurs fetch/trois tRPC et deux avertissements de préconditions fixture ;
ce premier reçu reste historique. La reprise FULL sous fixtures qualifiées
(v6.27.392) a validé 281 pages, zéro erreur/avertissement, et ferme cette dette.
Aucune migration ou
publication de production revendiquée. Le reste du document conserve la spécification source et sa cible plus large.

- Domaine : `src/domain/creative-intelligence.ts`, taxonomie `creative-v1` et payload
  `creative-recipe-v1`. Ratio organique à médiane antérieure avec au moins cinq
  contenus comparables ; UNKNOWN/PAID, zéro ou manque de baseline → abstention.
- Service : `seshat/creative-intelligence/` pour import, relevé, annotation manuelle,
  découverte/revue, liste surveillée et application/résolution. Tables : les cinq
  primitives de l'ADR. Recettes V1 dans `KnowledgeEntry.BRIEF_PATTERN`, sans
  nouvelle table Recipe et sans promesse de modèle multimodal automatique.
  Son manifest est réexporté depuis `services/creative-intelligence/manifest.ts`
  pour le scanner racine, sans duplication du moteur.
- API : `argos.intelligence` via le sous-router `creative-intelligence.ts`.
  La déclaration d’essai est `startTrial` (nom `apply` réservé par tRPC).
  Les mutations sont des Intents SESHAT opérateur ; lectures propres à une marque
  vérifiées par le middleware canonique. Le public reçoit une projection revue.
- Surfaces : atelier opérateur `/console/seshat/argos`, lecture de marque
  `/cockpit/intelligence/social` et projection de recettes publiques `/argos`.
  `/cockpit/intelligence/track` garde son `OperatorSurface` : lecture opérateur
  complémentaire, pas accès founder. L’atelier comprend aussi la saisie/lecture
  des faits concurrentiels sourcés via analytics.
  Aucune publication de données BRAND ni création de portail séparé.
- Concurrence : `CompetitorSnapshot` porte visibilité/pays/propriétaire/source ;
  T et analytics partagent `competitorScope`. L'adaptateur des formes D reste
  en lecture. La watchlist distingue commercial/attention/inspiration via BrandRef
  et alimente `loadWatchSubjects`. Les snapshots restent filtrés par secteur, pays
  et propriété ; ils ne sont pas filtrés par l’identité des acteurs de la watchlist.
- Native Insights : Facebook/Instagram accroché au service Anubis existant,
  snapshots BRAND de reach seulement ; impressions non assimilées à views et
  paid UNKNOWN, donc pas de ratio organique fabriqué. La migration additive a
  été exécutée sur PostgreSQL local réel, sans déploiement de production.
- Raccord créatif : `recipeContext` nourrit `buildReferenceContextText` et
  Notoria engine (`SESHAT_OBSERVATION`, `I_GENERATION`). `opportunities` compare
  les recettes revues aux contenus propres et aux comptes publics surveillés :
  hypothèses qualifiées par la couverture, pas preuve de marché libre. Le lecteur
  générique de connaissances exclut le nouveau payload pour conserver la revue
  explicite des recettes avant projection. ADVE reste sous décision opérateur.

Parcours de recette opérationnelle :

1. Créer un corpus PUBLIC contrôlé, puis un corpus BRAND distinct de deux marques.
2. Importer une publication avec identité plateforme/compte/contenu ; réimporter
   la même identité et vérifier absence de duplication ou de réécriture.
3. Ajouter ses mesures datées et une annotation manuelle avec observations de
   chaque axe ; conserver le hash du média et les incertitudes.
4. Ajouter des contenus ordinaires et contrôles à âges comparables. Découvrir
   une signature ; vérifier baseline antérieure et refus des métriques inconnues.
5. Revoir une recette ; publier uniquement une recette PUBLIC étayée. La règle
   historique PASS des dossiers `CampaignReferenceDossier` reste conservée. Refuser
   preuves BRAND et vérifier l'absence d'annotations/essais privés dans le public.
6. Appliquer une recette revue à une stratégie : déclarer hypothèse, variation,
   métrique, baseline, cible et échéance ; rattacher action/asset de cette marque.
7. Publier puis ajouter un specimen BRAND et une mesure à échéance ; résoudre
   l'essai, en conservant `OBSERVED_NOT_CAUSAL` et la recette gelée.
8. Couper/reprendre les accès aux sources disponibles ; l'absence de source
   reste explicite. Les nouveaux fournisseurs et la traversée Argos-studio ont
   leurs déclencheurs dans RESIDUAL-DEBT, pas un engagement implicite.

## 1. Responsabilités et résultat attendu

Sous-système principal : Telemetry, gouverneur SESHAT. Hunter recueille des observations et références ; Tarsis/Shaï détecte leur évolution ; la bibliothèque interne Per-Ankh en conserve les preuves et enseignements ; Argos publie leur projection éditoriale. Mestor/Sia contrôle les admissions et mutations. Thot contrôle les coûts. Artemis/Neith conçoit les adaptations, Ptah et les talents produisent, Anubis diffuse. Le retour mesuré revient à Seshat.

Ne pas faire du renommage canonique un prérequis : le code utilise encore `seshat/argos`, `tarsis`, `artemis`, `mestor`. Étendre ces points existants, conserver leurs contrats ; effectuer tout renommage dans un chantier distinct.

Une observation doit permettre de remonter à son contenu, sa source, sa date, son périmètre, sa méthode et son émission. Une recommandation doit également expliquer sa pertinence pour ADVE, ses contre-indications et le résultat à mesurer.

## 2. Raccords existants à corriger avant extension

- `src/server/services/rtis-protocols/track.ts`, `loadCompetitorData(strategyId)` : le paramètre de stratégie n’est pas exploité ; la requête prend dix snapshots récents sans filtre. Résoudre le secteur, pays, périmètre de l’étude et liste de rivaux de la marque, puis appliquer un filtre explicite. Aucun repli sur les derniers concurrents de toute la base.
- `src/server/trpc/routers/analytics.ts` : les lectures de snapshots peuvent être filtrées seulement par des paramètres facultatifs ; distinguer les observations publiques des études privées et imposer la portée de l’étude. Une provenance inconnue n’est pas une permission de partage.
- Les sujets de veille utilisent `D.concurrents`, tandis que d’autres lecteurs exploitent `D.paysageConcurrentiel`. Résoudre les deux formes par un adaptateur validé, dédupliqué, avec provenance ; traiter les divergences par revue, sans réécrire automatiquement D.
- Le verdict Argos PASS atteste des règles éditoriales et de la complétude du DNA ; créer une indication de qualité de preuve distincte. PASS n’est pas un certificat de performance ni de fiabilité des sources.
- Conserver `SocialPost` comme état courant, mais ne pas l’utiliser comme historique de performance : ses compteurs sont mis à jour en place.

## 3. La concurrence : trois usages et un référentiel commun

1. Concurrents commerciaux : même demande, offre ou territoire de marché.
2. Concurrents d’attention : créateurs, médias ou communautés qui sollicitent la même audience.
3. Références transférables : acteurs d’autres marchés ou catégories, utiles pour apprendre une mécanique sans les traiter comme rivaux commerciaux.

Conserver `BrandRef` pour l’identité du rival, `BrandFootprintSnapshot` pour ses observations publiques, `CompetitorSnapshot` pour les résultats d’étude, `SectorPolityAxis` pour le contexte culturel et `Epreuve`/`ScoreVerdict` pour la force révélée. Ne pas créer un quatrième score de marque.

La liste surveillée est propre à la stratégie : extension validée de `Strategy.businessContext` contenant les références d’acteurs, catégorie de relation, comptes publics corroborés, motif, statut de validation et cadence. La relation concurrentielle privée ne devient pas une information publique du registre. Hunter propose les acteurs et comptes découverts ; l’opérateur ratifie les identités et relations ambiguës.

Les identités sont résolues par identifiants de plateforme, domaine et comptes corroborés, jamais par nom seul. Le pays de la marque, la langue du contenu et la géographie de l’audience sont trois données distinctes. Une audience géographique non mesurée reste inconnue.

## 4. Modèle de données proposé

Étendre d’abord les contrats existants. Les nouvelles tables suivantes sont justifiées par des besoins non couverts : unité externe de contenu, historique temporel, annotation multimodale versionnée, lien de preuve et application d’une recette.

| Proposition | Fonction | Champs essentiels |
|---|---|---|
| `ContentSpecimen` | Un contenu observé, externe ou projection d’un post propre | plateforme, identifiant natif, compte natif, URL canonique, date de publication, durée, langue, source, visibilité, propriétaire de portée, `socialPostId` ou référence acteur, éventuel dossier parent |
| `ContentMetricSnapshot` | Observation append-only | specimen, date de mesure, âge du contenu, métrique et valeur nullable, périmètre de mesure, fournisseur, audience du compte à la collecte si connue, statut paid/organic/unknown, source et émission |
| `CreativeAnalysis` | Annotation descriptive versionnée | specimen, hash du média, version de taxonomie, modèle/prompt, méthode MANUAL/MULTIMODAL, scènes horodatées, tags, preuves locales, incertitudes, validation |
| `PatternEvidence` | Relie un pattern à ses exemples et contre-exemples | entrée de connaissance et révision, analyse, snapshots utilisés, groupe comparatif, statut d’admission et exclusions |
| `RecipeApplication` | Trace un essai de recette dans la machine | stratégie, campagne/action, brief/asset, révision de recette gelée, variante, objectif primaire, fenêtre d’observation, comparateur, résultat et limites |

Patterns et recettes réutilisent `KnowledgeEntry` : payload typé/versionné, familles `BRIEF_PATTERN` et `CAMPAIGN_TEMPLATE`, validées sans casser leurs consommateurs historiques. La recipe inclut signature créative, contexte, exclusions, preuves, nombre de contenus ET de comptes, distributions, intervalle, méthode, statut, fraîcheur. Chaque révision est conservée ; une application gèle sa révision et son contenu, pas seulement un pointeur mutable.

`CampaignReferenceDossier` demeure le dossier éditorial de campagne/marque : lui rattacher les spécimens et références de connaissances. Il ne devient pas un conteneur géant de vidéos et snapshots JSON.

Invariants : identifiants natifs dédupliqués ; reprises de collecte idempotentes ; pas de mise à jour destructive des snapshots ; données privées scopées ; inconnue ≠ zéro ; sources et périodes explicites. Les observations et analyses suivent la suppression/rétention de leurs médias et des droits d’usage.

## 5. Acquisition : une interface de fournisseur, plusieurs sources

Contrat proposé sous Seshat : découvrir des contenus, importer un contenu, relever ses métriques et obtenir le média lorsque disponible. Chaque résultat utilise `ConnectorResult<T>` et indique capacités, périmètre, fraîcheur, provenance, accès aux médias et métriques réellement disponibles.

Premières sources : comptes propres via Anubis/SocialPost, imports opérateur URL/fichier/CSV, recherche web existante de Hunter. Puis connecteurs autorisés vers sources sociales et ad libraries, selon accès réel. Une recherche web trouve une piste ; elle ne remplace pas une lecture de vidéo ou un relevé de performance.

Les outils cités dans la discussion sont aussi un benchmark fonctionnel : archive/recherche de publicités pour Foreplay, performance relative pour vidIQ/Outliers, contenus et tendances pour TikTok Creative Center, contenus éditoriaux pour BuzzSumo, conversations pour Brandwatch, trajectoires pour Exploding Topics. Leur connexion effective dépend de contrats, exports et API vérifiés. Aucun MCP, quota, endpoint ou droit d’archivage n’est supposé acquis.

Paid et organique restent des cohortes différentes. Les contenus concurrents n’exposent généralement pas conversions, dépenses, rétention ou audience géographique privée : ne pas les remplir depuis les métriques de nos comptes.

## 6. Hunter devient un collecteur de preuves

Étendre `seshat/argos` avec deux modes distincts : dossier éditorial historique, et récolte de spécimens mesurables. Réutiliser recherche, schémas, curation, provenance et gouvernance existants.

Pipeline : découverte → résolution identité/URL → admission de la source → acquisition autorisée → persistance brute → snapshot → analyse descriptive → comparaison. Les échecs sont localisés par étape ; la présence d’un dossier texte n’implique pas qu’une vidéo a été analysée.

La taxonomie initiale couvre hook, narrative, format visuel, preuve, reveal, CTA, durée et moteur social. Les éléments directement visibles citent leurs timecodes ; émotion et intention sont des inférences étiquetées. Commencer par quelques formats clairement annotables et permettre le manuel avec exactement les mêmes validateurs.

## 7. Performance relative : méthode progressive et explicable

V1 : comparer une métrique native à la médiane de contenus antérieurs du même compte, même plateforme, format et âge comparable. Le contenu évalué et les publications futures sont exclus du référentiel. Utiliser les valeurs réellement observées à cet âge ; sans historique comparable, produire INSUFFICIENT_DATA.

`ratio = observed(metric, age) / median(prior comparable observations(metric, age))`

Définir le traitement des dénominateurs nuls, petits référentiels, sujets exceptionnels et distributions instables. Conserver la version et les identifiants du référentiel, sa taille et l’incertitude. Les seuils d’admission sont configurables et validés sur des données historiques, pas présentés comme universels.

V2 : modèle attendu conditionnel avec validation temporelle sur comptes tenus hors entraînement, ajustement par sujet, format, audience et saison seulement si ces variables existent. Ne pas promettre de neutraliser un budget paid inconnu.

Séparer métrique relative de contenu, score structurel ADVE et force révélée des marques. Un outlier peut proposer une candidate Hunter ; il n’entre pas automatiquement comme victoire dans le Scoreur. Une épreuve exige son propre comparateur, une source et la revue existante.

## 8. Patterns et recettes

V1 : signatures explicites de tags et règles de rapprochement ; regrouper doublons/reposts et contrôler les contributions par compte. Les voisins sémantiques/embeddings viennent ensuite et ne fusionnent pas des mécaniques différentes sur la seule similarité de sujet.

Comparer gagnants, ordinaires et échecs dans des cohortes comparables. Publier médiane, dispersion, nombre de comptes indépendants, contextes, échantillon de comparaison et résultats sur période tenue hors découverte. Contrôler la multiplicité des recherches de combinaisons ; un cluster fréquent n’est pas une preuve d’efficacité.

États proposés : candidat, observé, reproduit, éprouvé dans des essais. Définir les critères de passage dans l’ADR ; aucune formule ne permet de déclarer une causalité à partir de vues seules.

Recette utile : « preuve visuelle immédiate + transformation + reveal retardé », avec conditions, exemples, contre-exemples et niveau de preuve. Prescription propre à une marque : objectif, variation distinctive, moyens et protocole de mesure.

## 9. Trends, concurrence et opportunités

Construire les séries d’adoption par pattern × plateforme × contexte observé. Suivre part dans le corpus observé, nouveaux adoptants, performance relative et dispersion. Les états emerging/peaking/declining découlent de règles documentées, avec historique suffisant.

Ne pas nommer « saturation du marché » la fréquence d’un pattern dans un échantillon sélectionné. Afficher « diffusion dans le corpus observé », couverture et composition. Une première observation n’est pas une origine ; une succession temporelle entre pays ne prouve pas une migration causale.

Pour chaque marque, croiser recettes et rivaux surveillés : mécaniques adoptées, promesses répétées, preuves montrées, formats sous-observés. Une faible présence est une hypothèse d’opportunité, pas la preuve d’un marché libre. Les parts de voix indiquent corpus, fenêtre et dénominateur ; les prix précisent produits, unités, dates et devises comparables.

Notoria reçoit une observation structurée avec preuves, contexte, limites et horizon. L’opérateur choisit d’adapter, tester, différencier, différer ou ignorer. Toute modification ADVE passe par `OPERATOR_AMEND_PILLAR`; RTIS et la création de campagnes respectent leurs Intents/gates existants.

## 10. Activation et vérité terrain

Étendre `reference-context.ts` et le Knowledge Gateway : retourner des recettes pertinentes avec preuves et incompatibilités, et expliciter tout repli de marché/secteur. Le consommateur continue sans LLM ni corpus pertinent.

Artemis construit la direction et le brief à partir d’ADVE et de la recette ; la proposition créative suit sa validation existante. `RecipeApplication` rattache la prescription à `CampaignAction`, `BrandAsset`, `AssetVersion` et, dès publication, au specimen correspondant.

Déclarer l’objectif avant diffusion : attention/rétention quand mesurable, activation, conversion, récurrence ou propagation superfan. Le retour renseigne les KPIs disponibles, les coûts et les facteurs de confusion. Un delta Cult Index autour d’un asset est une observation de marque ; sans comparaison, il n’attribue pas causalement le delta à cet asset.

Réutiliser les apprentissages de campagne et le registre PredictionRecord pour les paris compatibles ; ne pas remplacer leurs méthodes par une note de succès universelle. Absence d’observation à échéance = non résolu.

## 11. Exécution technique et produit

Modules proposés sous `src/server/services/seshat/` : acquisition/observations, annotation créative, comparaison, patterns et trajectoires. Algorithmes purs sous `src/domain/`. Étendre `argos`, `knowledge-aggregator`, `reference-context`, Notoria et les apprentissages de campagne.

Réutiliser Intents, émission-spine, NSP, Vault, cost gates et circuit breakers. Les nouveaux Intents d’observation sont SESHAT ; leur payload et mode global/scopé sont spécifiés avant mutation. `IntentQueue` impose actuellement un `strategyId` : qualifier ce contrat avant d’y mettre des jobs de corpus global, sans inventer une marque système.

Collecte/annotation en tâches durables bornées : prise atomique, lease avec expiration, reprise idempotente, backoff, budgets par source/marque, code d’échec observable et file de revue. Les crons déclenchent les lots ; ils ne font pas l’analyse d’un corpus entier dans une requête UI. PostgreSQL et le stockage d’objets suffisent au premier périmètre ; ajouter des infrastructures après mesure des besoins.

Console Seshat : sources/couverture, identité des rivaux, corpus, revue des annotations, preuves et recettes. Cockpit : rivaux suivis, changements observés, opportunités adaptées, statut des essais. Argos : dossiers et recettes éditorialisés dont les preuves et droits autorisent la publication. Étendre les surfaces existantes avant de multiplier les portails.

## 12. Livraison par lots vérifiables

| Lot | Livrable | Critère de sortie |
|---|---|---|
| 0 | Périmètre concurrentiel et provenance corrigés | T et lectures servent seulement les acteurs/études autorisés ; test de séparation de deux marques/deux marchés |
| 1 | Corpus + snapshots + import manuel + source propre | Le même import ne duplique rien ; un nouveau relevé conserve le précédent ; fraîcheur et manques affichés |
| 2 | Annotation versionnée + comparaison relative V1 | Pas d’analyse d’un média absent ; pas de données futures dans le référentiel ; comparaison explicable ou insuffisante |
| 3 | Patterns/recettes + rivaux + trajectoires | Contre-exemples et comptes indépendants comptés ; diffusion qualifiée par la couverture ; pas d’auto-épreuve |
| 4 | Notoria → brief → essai → mesure | Une recette remonte au brief, contenu publié et résultat ; ADVE n’a pas muté sans opérateur |
| 5 | Projection Argos + connecteurs supplémentaires | Aucune donnée privée publiée ; provenance et niveau de preuve visibles ; quotas/failures maîtrisés |

Vérifications de code : schéma/migrations, typecheck, lint, layering, gouvernance, tests ciblés d’idempotence/ownership/absence de données/fuite temporelle ; puis une traversée complète avec sources contrôlées. Tests de concurrence : deux workers ne revendiquent pas le même lot, crash/reprise ne crée pas de doublons.

Lancement initial proposé : un secteur, un pays, une plateforme bénéficiant d’un accès réel, comptes propres + rivaux corroborés + références externes manuelles. Le corpus inclut contenus ordinaires et contre-exemples. Aucun seuil de volume ne garantit seul une confiance statistique. Étendre le périmètre après validation de la première boucle.

## 13. Sources principales inspectées

- `src/server/services/seshat/argos/index.ts`, `schemas.ts`, `safety.ts`, `victory-hunt.ts`
- `src/app/api/cron/argos-hunt/route.ts`, `.github/workflows/scheduled-ops.yml`
- `src/server/services/seshat/reference-context.ts`, `knowledge-gateway/index.ts`
- `src/server/services/seshat/external-feeds/watch-subjects.ts`
- `src/server/services/rtis-protocols/track.ts`, `src/server/trpc/routers/analytics.ts`
- `src/server/services/seshat/scoreur/`, `src/server/services/sector-intelligence/index.ts`
- `src/server/services/seshat/brand-registry/benchmark-aggregator.ts`
- `src/server/services/knowledge-aggregator/index.ts`, `src/server/services/seshat/references.ts`
- `src/server/services/campaign-tracker/learnings.ts`, `src/server/services/seshat/asset-impact-tracker.ts`
- `src/server/services/seshat/prediction/index.ts`, `src/server/services/anubis/social-insights.ts`
- `prisma/schema.prisma`, `docs/governance/STATE_FINAL_BLUEPRINT.md`, `docs/governance/CODE-MAP.md`


## Extension acquisition et analyse assistée — cadrage ADR-0195

Statut : **Accepted**, parcours PostgreSQL/réseau, navigateur et gauntlet locaux
PASS ; version de livraison
`v6.27.392`. Cette section décrit l’extension codée « Ratisse large », sans remplacer
le reçu de la V1 `v6.27.391` ni déclarer une connexion déployée. Le code final et
les vérifications sont décrits dans [ADR-0195](../adr/0195-creative-acquisition-and-reviewed-assisted-analysis.md).

Étendre le moteur Seshat, `argos.intelligence`, le Gateway, les outils Glory et
les objets existants, sans nouveau modèle/Neter/router/page. Les chemins codés sont YouTube Data API, Bluesky public, Foreplay Discovery,
bridge métadonnées propres Facebook/Instagram et import d’export fournisseur borné. Les formats
collectés conservent provenance, identités, pays/langue/audience distincts et
périmètre PUBLIC ou BRAND. La disponibilité documentaire d'un fournisseur ne
vaut ni accès authentifié ni reçu de collecte.

### Matrice de capacités codée — sources primaires

`CREATIVE_SOURCE_CAPABILITIES` porte 16 sources (recompte 2026-10-06 dans
`src/domain/creative-sources.ts`). DIRECT et EXISTING_CONNECTION décrivent le
chemin de code, pas la configuration effective ni un reçu live. Les lignes
QUALIFY_OR_EXPORT, SIGNALS_ONLY et EXISTING_SIGNALS ne sont pas des connecteurs
sociaux directs supplémentaires. Tous les liens du registre ont répondu HTTP 200
au contrôle documentaire, avec redirections : cela ne prouve aucun accès de données.

| Source / identifiant | État de capacité codé | Source primaire et limite |
|---|---|---|
| Bluesky / `BLUESKY` | DIRECT, public | [Lexicon getAuthorFeed](https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/feed/getAuthorFeed.json). Likes/réponses/republications, aucune vue ; deux lectures via l'adaptateur reçues avec snapshots append-only sur PostgreSQL local. |
| YouTube / `YOUTUBE` | DIRECT, API_KEY | [videos.list](https://developers.google.com/youtube/v3/docs/videos/list), [channels.list](https://developers.google.com/youtube/v3/docs/channels/list). Chaîne native UC…, compteurs actuels ; ni média vidéo ni historique rétroactif. VIDEO_UNCLASSIFIED par défaut ; SHORT/LONG explicite, jamais inféré de la durée. Accès réel différé sans clé. |
| Foreplay / `FOREPLAY` | DIRECT, API_KEY | [OpenAPI](https://public.api.foreplay.co/openapi.json), [documentation](https://docs.foreplay.co/). Discovery Ads sous BearerAuth, archives publicitaires ; aucun relevé de ROAS/vues fabriqué. Vidéos VIDEO_UNCLASSIFIED, pas de normalisation supposant Shorts. |
| Réseaux propres / `CONNECTED_SOCIAL` | EXISTING_CONNECTION, OAuth | [Page Insights](https://developers.facebook.com/docs/graph-api/reference/insights), [Instagram Insights](https://developers.facebook.com/docs/instagram-platform/insights). Bridge FB/IG de métadonnées déjà synchronisées, pas les compteurs par défaut ; mesures natives réelles via le chemin séparé ADR-0194. |
| Meta Ad Library / `META_AD_LIBRARY` | QUALIFY_OR_EXPORT, app approval | [ads_archive](https://developers.facebook.com/docs/graph-api/reference/ads_archive/). Périmètre autorisé et couverture pays à qualifier. |
| TikTok Commercial / `TIKTOK_COMMERCIAL` | QUALIFY_OR_EXPORT, app approval | [Commercial Content API](https://developers.tiktok.com/docs/en/commercial-content-api-query-commercial-content). Contenu commercial et pays pris en charge, pas corpus organique mondial présumé. |
| TikTok Research / `TIKTOK_RESEARCH` | QUALIFY_OR_EXPORT, eligibility | [Research API FAQ](https://developers.tiktok.com/docs/en/research-api-faq). Projet/éligibilité requis ; accès commercial non présumé. |
| Instagram Discovery / `INSTAGRAM_DISCOVERY` | QUALIFY_OR_EXPORT, OAuth | [Business Discovery](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/business-discovery). Comptes professionnels selon permissions, pas les Insights privés des concurrents. |
| BuzzSumo / `BUZZSUMO` | QUALIFY_OR_EXPORT, subscription | [API officielle](https://help.buzzsumo.com/en/articles/1633314-does-buzzsumo-have-an-api). Vérifier contrat et unités ; backlinks ne deviennent pas des vues. |
| Exploding Topics / `EXPLODING_TOPICS` | SIGNALS_ONLY, subscription | [API docs](https://api.explodingtopics.com/docs/). Trajectoires de sujets ; volume de recherche distinct de performance d’un contenu. L’ancien lien `explodingtopics.com/api` renvoyait 404, ce host officiel est distinct. |
| Brandwatch / `BRANDWATCH` | QUALIFY_OR_EXPORT, subscription | [Developer portal](https://developers.brandwatch.com/). Conversations et contexte suivant contrat, pas specimen vidéo sans source native. |
| Apify / `APIFY` | QUALIFY_OR_EXPORT, actor contract | [API reference](https://docs.apify.com/api/v2). Acteur/version/sortie et droits à qualifier ; un token seul n’assure pas couverture ni métrique. |
| RSS / `RSS` | EXISTING_SIGNALS, public | [RSS specification](https://www.rssboard.org/rss-specification). Radar Tarsis existant, articles/signaux sans compteurs inventés. |
| Reddit / `REDDIT` | QUALIFY_OR_EXPORT, OAuth contract | [Data API terms](https://redditinc.com/policies/data-api-terms). Discussions/votes selon accès ; votes et vues distincts. |
| X / `X` | QUALIFY_OR_EXPORT, API plan | [Posts lookup](https://docs.x.com/x-api/posts/lookup/introduction). Publications/métriques selon contrat ; concurrence générale non présumée. |
| LinkedIn / `LINKEDIN` | QUALIFY_OR_EXPORT, OAuth approval | [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api). Comptes/pages autorisés ; aucun accès général aux concurrents. |

vidIQ et TikTok Creative Center restent des benchmarks produit de la discussion
initiale ; ils ne sont pas déclarés adaptateurs dans ce registre. Un export réel
sourcé peut rejoindre le format commun après validation, sans simuler leur API.

### Analyse assistée : observation bornée puis revue

Le parcours codé utilise `creative-observation-draft` dans le moteur Glory HYBRID,
pour un specimen BRAND et une stratégie réelle. Mode TEXT avec texte fourni,
ou MEDIA avec `LLM_VISION_PROVIDER` (anthropic/ollama/openrouter) et
`LLM_VISION_MODEL` explicites. Sans configuration vision, état différé ; aucun
fallback texte qui abandonne les images. Le Gateway accepte au plus huit images,
1 Mo chacune et 4 Mo cumulés. Média HTTPS JPEG/PNG ou MP4, 25 Mo maximum ; vidéo
jusqu'à cinq minutes, ffmpeg/ffprobe requis, frames échantillonnées sans audio.
Les repères conservés sont les timestamps émis par le décodeur. Les annotations
acceptent uniquement ces `frameTimes`, jamais des timecodes de texte/image
statique ; durée exactement celle du média et caveat audio non observé imposés.
Une lecture opérateur scopée reprend le draft après reload sans altérer son original.

Le résultat suit le schéma strict et reste `MODEL_DRAFT`. Les observations des
recettes filtrent SQL `method: MANUAL`. La revue `reviewCreativeDraft` ajoute
une nouvelle annotation MANUAL attribuée à l'opérateur, en laissant le brouillon
intact. L'exclusion/admission a son reçu PostgreSQL local PASS ; la réponse d'un
modèle vision reste différée sans clé/configuration.
L’annotation manuelle ADR-0194 continue sans provider. L'outil de collecte
`creative-source-fetcher` partage le delegate enregistré ; les mutations sont
les Intents SESHAT existants étendus, pas des écritures derrière une lecture.

Collecte/import : format `creative-source-export-v1`, 50 éléments maximum,
validation du périmètre/dates puis transaction atomique. Les métriques externes
observées gardent paid UNKNOWN ; archives ads Foreplay sans mesure de performance.
La clé révoquée d'un opérateur ne se masque pas par une clé système de repli.

Veille : `creativeWatchAutomation` est un opt-in désactivé par défaut, préservé
dans businessContext. Cron `argos-hunt?mode=corpus` avant le contrôle LLM ; cadence
planifiée six heures dans les schedulers existants, pas reçue en production.
Fenêtre 500 marques, deux marques/deux comptes par passage, rotation par dernières
tentatives, y compris les états différés/échoués. Refresh automatique de comptes natifs YouTube UC…/Bluesky did:… ; reports,
comptes non pris en charge et états par source apparaissent dans les résultats.

### Argos-studio : contrat documentaire, pas copie implicite

La projection distante conserve SHK-0002 et le contrat `research-dossier-v1`.
Un dossier local PASS et revu est accompagné d'un payload opérateur validé :
licences, classifications, sources et preuves ne sont pas inventées depuis le
DNA local. Le schéma source refuse notamment une licence inconnue. Le reçu
externe est audité séparément du verdict et de la publication locale historique.
Configuration/clé dans les mécanismes Vault existants ; échec/réponse distante
bornés, reprise idempotente et aucune donnée privée transformée en référence
publique par défaut. Le client de projection est codé : minimums locaux validés, schéma distant
autoritaire sur les enums complets, dossier PASS/reviewedBy et safety recalculée,
marque/campagne/secteur/marché exactement ceux du journal, sources URL autorisées
par le journal. `payloadHash` et reçu dans le spine distinct, pas d’auto-projection.
Les templates Vault youtube-data/foreplay/argos-studio et tests GET read-only sont
codés ; ils ne prouvent pas un POST authentifié. La projection distante reste
DEFERRED_NO_ENDPOINT_OR_CREDENTIAL, sans publication externe testée.

### Reçu local intermédiaire — 2026-10-06

`/workspace/scratch/acquisition-live.log` : PASS. Bluesky reçu deux fois par le
parcours réel avec snapshots append-only ; isolation founder/opérateur ; rollback
atomique d'export ; MODEL_DRAFT exclu puis annotation MANUAL ajoutée après revue ;
cron HTTP 200 avec une émission close OK ; vidéo MP4 synthétique donnant cinq
images effectivement émises. YouTube/LLM restent DEFERRED_NO_KEY, Argos-studio
DEFERRED_NO_ENDPOINT_OR_CREDENTIAL. Extraction locale de frames ne prouve aucune
réponse vision. Foreplay authentifié et cadence du scheduler cible sans reçu.
Suite gouvernance : 157 fichiers / 1547 tests PASS (159 / 1566 avec sources/média).
Émission de `setVerdict` vérifiée ; baseline Q3 argos 2→1. Comptes des registres
2026-10-06 : 629 Intents, 56 CORE / 152 registry tools, 94 séquences / 91 DRAFT,
28 frameworks.
### Livraison vérifiée localement — 2026-10-06

ADR-0195 Accepted : 368 fichiers / 3909 tests PASS, typecheck sans erreur,
lint/gouvernance sans erreur (25 warnings existants), cycles zéro, Prisma valid,
deux builds production locaux PASS. Vision bytes/provider/aucun repli, autorité
du delegate et contrat Argos sur fixtures reçus ; aucune projection distante
réelle. Réinjection du défaut d'exclusion MODEL_DRAFT : RED puis restauration
GREEN (5 tests).

Navigateur HTTPS : Console Argos et Credentials ADMIN, Argos public et rapport
Social FOUNDER HTTP 200, zéro pageerror/réponse >=500. Formulaires réellement
soumis : collecte Bluesky LIVE, annotation texte DEFERRED, projection Argos
DEFERRED. Liste de veille du propriétaire lue. Cron HTTPS HTTP 200/LIVE et
anonymous 401, émission persistée close OK. Corpus six heures opt-in ; timeout
ciblé 240 s contre batch maximum ~200 s, modes antérieurs conservés à 120 s.

Stress FULL : fixtures opérateur/stratégie qualifiées, 281 pages sans erreur ni
avertissement, trois queries tRPC, sept kinds Ptah et state machine asset
traversés. Les providers sans clés exercent des voies différées. Ce reçu ferme
la dette de validation OOM initiale. Reçus acquisition-browser, cron-http,
all-tests-final, stress-full dans `/workspace/scratch` ; rapport ignoré
`logs/stress-test-2026-10-06T09-36-29.json`. Reproduction avec
`scripts/verify-creative-acquisition.ts` et `scripts/stress-test.ts`, serveur
HTTPS vivant, PostgreSQL et fixtures qualifiées.

Complément ciblé : ffmpeg/ffprobe embarqués au runner Docker. Helper réel
sur même base `node:22-bookworm-slim`, UID 1000 : cinq frames [0, 1, 2, 3, 3.8],
sans audio, PASS (`acquisition-container-media.log`). Ce reçu n'est pas un build
Docker complet ni un déploiement. Formulaire manuel secteur/marché/sources soumis
par ADMIN réel : `createManual` HTTP 200, contexte conservé et zéro erreur/500
(`acquisition-manual-browser.log`). Gauntlet après diffs : typecheck/lint/
gouvernance/cycles sans erreur, gouvernance 157 fichiers / 1547 tests PASS.

Contrôles CI suivis dans la PR #965. Restes explicites : accès authentifiés YouTube/Foreplay,
réponse vision et runtime vidéo cible, activation/cadence scheduler de production,
POST Argos réel, droits/rétention média durable. Ces limites ont leur plan et
déclencheur dans RESIDUAL-DEBT ; aucun déploiement ou succès distant revendiqué.

### Parcours de validation et reprises externes

1. Inspecter les adaptateurs et la matrice de capacités après leur écriture.
2. Vérifier les sorties fournisseur avec fixtures, puis conserver séparément
   les reçus réseau autorisés. Toute clé manquante doit donner un état explicite.
3. Traverser collecte → specimen/snapshot sans réécriture et sans fuite BRAND.
4. Traverser analyse assistée → MODEL_DRAFT → revue → recette, avec refus avant
   revue et un parcours MANUAL identique sur les contraintes descriptives.
5. Traverser payload validé → projection Argos-studio → reçu/panne/reprise,
   sans faux droits d'usage ni clé dans le spine.
6. Vérifier les surfaces et outils réellement raccordés, les coûts/SLO/gates et
   les limites, puis seulement actualiser le statut de livraison ADR-0195.


### Reprise image complète et production — observations initiales, 2026-10-06

Main `84fa59c` / v6.27.392 ; production sondée HTTP 200 reste v6.27.390 sur les
deux domaines. Workflow canonique `build-image.yml` dispatché sur main,
`notify_coolify=true`, run 37509162119 en cours. Recevoir séparément image
complète/UID 1001/extraction réelle, conclusion du workflow, puis version et
santé des domaines après bascule. Aucun succès de production n'est inféré du
dispatch. Credentials provider/vision et endpoint Argos indisponibles : garder
les états différés et ne pas prétendre un POST ou une réponse vision.

Maintenance ultérieure : retirer/remplacer le workflow legacy avec script
absent et trier les 50 alertes npm préexistantes selon exposition, conformément
aux plans/déclencheurs de RESIDUAL-DEBT. Pas de refactor CI ni mise à jour forcée
des dépendances dans cette reprise de reçus.


### Addendum — activation applicative reçue, 2026-10-06

Run officiel 37509162119 SUCCESS depuis `84fa59c`, image complète buildée,
boot/migrations/login 200, push GHCR et demande Coolify acceptée. Les deux
domaines servent `/api/version` HTTP 200 v6.27.392. Image et digest exacts dans
ADR-0195 ; helper bundlé UID 1001, réseau coupé/root readonly : cinq frames
[0, 1, 2, 3, 3.8] sans audio PASS. La vérification d'image complète et l'activation
applicative sont reçues, sans traversée vidéo du processus VPS déployé inférée.

RPC publicRecipes 200/vide, HTML Argos 200/titre présent, cron corpus et
sourceCapabilities anonymes 401. Navigateur production bloqué par CA proxy :
aucune hydratation/DOM/pageerror production vérifiée ; aucun test protégé/admin
ni provider authentifié. `PROD_URL` absent et écriture GitHub refusée 403,
sondes manuelles distinctes reçues. Reprises : CA navigateur valide puis traversée
protégée autorisée ; configuration workflow lorsque droits disponibles ; vision,
POST Argos et scheduler réellement activé dès configuration qualifiée. Les dettes
legacy/dépendances et rétention demeurent ouvertes, sans succès métier inféré.


## Continuation — audit initial des écarts du plan (ADR-0196)

État courant final : **Accepted localement**, réception du 2026-10-06 en fin de
section. Les statuts Proposed intermédiaires conservent l’histoire du chantier.
Fusion PR #968 et CI 15/15 reçues ; livraison officielle run 37521228164,
réception applicative datée dans PR #968 (voir addendum de livraison).

État inspecté : main `c7123ca`, v6.27.394, 2026-10-06 ; branche
`codex/creative-intelligence-completion`. [ADR-0196](../adr/0196-creative-intelligence-evidence-retention-and-live-loop.md)
**Proposed** cadre les manques. Aucun nouveau code ni validation externe n'est
revendiqué par cette section. Les réceptions d'ADR-0194/0195 restent acquises et
distinctes ; credentials vision/providers et endpoint Argos toujours absents.

| Axe du plan initial | Présent dans le code inspecté | Écart et critère de clôture proposés |
|---|---|---|
| Conservation (§4–6) | `mediaUrl`, hash et extraction temporaire bornée ; fichiers supprimés après traitement | Archive durable chiffrée avec droits/scope/rétention, lecture autorisée, purge physique et qualification des dérivés. Tester bytes absents après purge et refus croisés. |
| Sources directes (§5–6) | Bluesky/YouTube/Foreplay, bridge métadonnées FB/IG, export atomique ; autres sources qualifiées | Adaptateurs officiels compatibles avec permissions/identifiants ; contrat fixture distinct de réseau authentifié. Media et métriques manquants explicites, aucun « tous réseaux accessibles » présumé. |
| Audiovisuel (§6) | Frames échantillonnées, vision explicite, audio non observé ; annotations manuelles et MODEL_DRAFT revus | Audio extrait borné puis transcription sourcée/horodatée, couverture visuelle/temporelle explicite. Observer réellement montage/mouvement avant d'en tirer des tags ; provider absent = différé. |
| Performance V2 (§7) | Médiane antérieure même compte/format/âge ; abstention paid/inconnu et formats non classés | Modèle conditionnel versionné, variables disponibles seulement ; évaluation hors comptes et hors temps, diagnostics/calibration/incertitude ou abstention. |
| Recettes (§8) | Tags hook/narrative/visual exacts, exemples/contre-exemples, comptes indépendants et split temporel descriptif | Voisinage sémantique explicable distinct du sujet, dispersion/intervalle et contrôle des recherches multiples ; proximité seule n'admet pas une recette. |
| Diffusion (§9) | Deux fenêtres hebdomadaires, part dans corpus annoté et couverture observed/annotated/normalized | Composition, sélection, fraîcheur, dénominateurs, nouveaux adoptants et fenêtres historiques ; relations de propagation observationnelles. Aucune « saturation marché » inférée. |
| Concurrence (§3, §9) | Watchlist marque à relations ratifiées ; lecteur snapshots secteur/pays/provenance | Analyse créative par acteurs de la watchlist et part de voix sur corpus explicitement observé ; cross-marques privés refusés, aucun rival résolu au nom seul. |
| Boucle live (§10) | Recette gelée, action/asset facultatifs, résolution manuelle specimen+snapshot, contexte Artemis/Notoria | Identité action/asset/version→publication→specimen vérifiée, collecte native ultérieure et clôture mesurée ; défaut d'observation = non résolu. Aucun succès fabriqué à deadline. |
| Travaux durables (§11) | Crons bornés/rotation/Intents, import transactionnel | Qualifier prise/lease/reprise/backoff et budgets nécessaires aux nouvelles opérations ; prouver reprise concurrente sans doublon ni mutation silencieuse. |

### Réserves ciblées relevées pendant l'audit

`captureNativeInsights` (`creative-intelligence/index.ts`) classe toute vidéo
comme SHORT_VIDEO sur `mediaType` seul : la collecte native doit conserver
VIDEO_UNCLASSIFIED quand le format ne peut pas être corroboré. Les observations
historiques ne se reclassent pas sans provenance. `resolveApplication` valide
marque, dates et snapshot, mais ne lie pas encore ce specimen à l'action/asset
ayant motivé l'essai ; compléter la correspondance d'identité avant de qualifier
une boucle automatique d'essai. Ces constats sont des écarts de code, pas des
réparations livrées.

### Ordre proposé de clôture, avant décisions techniques

1. Étendre contrats de preuve/scope/rétention, corriger format inconnu et identité
   de résultat ; archive chiffrée et purge vérifiables avant promesse d'archive.
2. Qualifier/admettre les adaptateurs officiels et le parcours audiovisuel borné,
   en conservant les voies manuelles et tous les états différés sans credentials.
3. Ajouter comparaison conditionnelle et voisinage avec diagnostics temporels,
   séparation des comptes, couverture et repli explicitement nommé.
4. Servir diffusion et comparaison des acteurs ratifiés, puis raccorder publication
   et collecte à l'essai déjà gouverné. Déclarer les objectifs avant diffusion.
5. Traverser chaque invariant par fixtures puis PostgreSQL/réseau autorisé ;
   valider UI/image/runtime séparément. Ne faire Accepted et propagation du
   statut qu'après réception du code final, tests et limites externes exactes.

Les choix stockage/schéma/algorithmes/providers et seuils restent à décider par
l'implémentation ; le présent cadrage n'invente ni clé, licence, quota, résultat
statistique ni publication externe. Chaque écart non fermé aura un plan et un
déclencheur au registre RESIDUAL-DEBT lors de la livraison.


### ADR-0196 — implémentation en cours, décisions inspectées

État du 2026-10-06 : code en cours, premiers tests locaux reçus ; ADR demeure **Proposed**.
L'audit initial ci-dessus est conservé comme comparaison avant/après, pas comme
état courant des nouveaux fichiers. Aucun credential externe n'est présumé.

| Axe | Décision et code inspectés | Réception encore requise |
|---|---|---|
| Archive | Deux champs specimen, AES-256-GCM/AAD objectKey, volume privé ou BLOB PUT/GET/DELETE, droits attestés et rétention 366 jours maximum ; PENDING→relecture/hash→STORED puis purge/cron/orphelins volume ; backendId figé, DELETE HTTP puis GET 404/410 | Scopes, crash/reprise, backend figé, bytes absents après purge ; pas de stockage distant actif revendiqué. |
| Audiovisuel | AUDIOVISUAL MP4 natif OpenRouter google/gemini explicitement configuré, 20 Mo/cinq minutes ; scènes/transcript stricts, MODEL_DRAFT puis revue MANUAL | Contrat vidéo/audio/schema, limites/coût/erreurs, provider réel distinct des fixtures ; piste audio détectée ≠ transcription reçue. |
| Sources | Adaptateurs Meta/IG/TikTok Research et Commercial/Reddit/X/LinkedIn/Brandwatch/RSS, dataset Apify acquiredContent ; BuzzSumo/Exploding Topics restent non directs | Fixtures des enveloppes/identités/unités, limites/permissions, puis réseau authentifié autorisé ; docs HTTP 200 sauf Reddit 403 ne prouvent pas accès API. |
| Modèle | conditional-log-ridge-v1 : médiane antérieure, âge/calendrier/topic revu ; cible exclue, temps ET comptes disjoints, minimums 60 lignes/huit comptes, intervalle empirique | Gate codé MAE modèle < baseline ×0,98 ; approfondir fuite temporelle/annotation, partitions, fit instable et échantillon insuffisant ; pas d'efficacité générale inférée. |
| Voisinage | Recettes KnowledgeEntry, embeddings BrandContextNode/MarketContextNode existants, Glory DELEGATE index, provider/model/dim identiques, mécanismes compatibles et cosine ≥0,75 | Refus privés, embeddings absents/corrompus, méthode et provenance visibles ; aucune fusion de preuves. |
| Diffusion | Huit semaines, comptes communs stables et états observés, chronologie non causale | Observed/annotated et couverture séparés, seuil couverture ≥60 % avant état ; recevoir validation de composition/source, pas de saturation marché. |
| Essai | Binding publication confirmé immuable, identité/action/asset/version, résolution refuse autre contenu ; vidéo native non classée par défaut | Traversée PostgreSQL/action/asset/publication/snapshot, replay et refus croisés, puis collecte externe réelle avec accès autorisé. |

Les quatre réserves ont été corrigées et relues : backendId dans receipt,
GET 404/410 après DELETE HTTP, gain strict >2 % sur MAE log, dénominateurs
observed/annotated et annotationCoverage. Les dates restent des observations/imports,
jamais origine culturelle. Typecheck PASS ; neuf fichiers/71 tests créatifs PASS ;
`verify-creative-intelligence.ts` réel PostgreSQL/tRPC gouverné PASS avec binding.
Ce reçu partiel ne signifie ni suite globale complète ni validation externe.
Watch multi-provider et verrou de concurrence codés ; ALREADY_RUNNING
reçu localement, voir état étendu ci-dessous. Credentials absents ; providers live, production authentifiée et
Argos distant restent non validés.
Les décisions exactes et limites figurent dans ADR-0196 ; CHANGELOG final et
propagation du statut attendent le code stabilisé et les preuves.


### Réception runtime étendue — v6.27.396 en préparation

Main v6.27.395 `fb970d0` intégré. ADR-0196 reste Proposed, tests complets/UI en
cours. `completion-full-runtime.log` PASS sur PostgreSQL/tRPC gouverné : archive
réelle NASA chiffrée AES/relecture/hash, expiration refusée puis cron retention
HTTP 200 supprimant le fichier ; binding et résultat immuables, scopes, snapshots,
lease watch concurrente ALREADY_RUNNING. Voisins sur vecteurs **synthétiques** ;
index sans clé DEFERRED ; conditionnel/trajectoire en abstention. Aucun provider
AV/embedding nouveau réellement reçu, aucune production authentifiée inférée.

Watch par `accounts.collection{provider,account}`, fallback UC/did et lock PG
transaction commun manuel/cron. Registre recompté 2026-10-06 : 14 chemins de
collecte (13 DIRECT plus bridge existant), BuzzSumo export qualifié, Exploding
Topics signaux. Cron retention séparé toutes les quinze minutes GitHub/ops-daemon,
budget nominal 60 s et rotation de 50 orphelins volume ; HTTP requiert lifecycle
ou inventaire externe après suppression du propriétaire. Réserve index SLO
0,05 $ marquée estimée, AV coût provider déclaré ou provision estimée.

La dette d'absence d'archive est remplacée par réception de stockage/runtime
cible, exploitation des droits et lifecycle HTTP ; les validations live,
embeddings/provider AV, comparaison sur corpus qualifié, cadence réelle et
projection Argos ont leur reprise dans RESIDUAL-DEBT. Ne pas confondre un test
qui démontre l'abstention avec une calibration performante sur marché réel.


### Réception locale supplémentaire — suite et surfaces

370 fichiers/3938 tests PASS (`completion-full-suite-final.log`), gouvernance
158/1551 PASS, typecheck zéro, lint/gouvernance zéro erreur/25 warnings existants,
audit zéro erreur/42 warnings, cycles zéro, Prisma valid et LLM stricts 78/78 +
28/28. Verrou HARD vocabulaire élargi : défaut réinjecté RED puis restauré GREEN
(cinq tests). Les warnings préexistants ont leur plan dans RESIDUAL-DEBT.

Navigateur local (`completion-browser-verified.log`) : Console ADMIN, Credentials
ADMIN, Argos public et rapport Social FOUNDER HTTP 200 ; zéro pageerror/réponse
>=500. DOM/titre respectifs : 651/1184, 8047/8396 (dev compile), 1009/1110,
738/2132 ms. Bluesky LIVE, texte/audiovisuel/Argos DEFERRED, archive affichée et
conditionnel propriétaire en abstention. Ce reçu ne valide pas production/auth.

Acquisition RSS (`completion-acquisition-rss-live.log`, script associé) PASS :
Bluesky et RSS NASA réels, watch provider RSS explicite puis cron LIVE ; MP4 natif
synthétique avec/sans audio préparé et testé, sans provider/transcript externe.
Build production et stress encore attendus ; ADR-0196 reste Proposed. Aucune
projection Argos, vision/AV réelle ou nouvelle production authentifiée inférée.


### Clôture locale ADR-0196 — Accepted, CI/déploiement à venir

Build production `npm run build` PASS (`completion-production-build.log`).
Stress FULL **authentifié** PASS (`completion-stress-authenticated.log`, rapport
`logs/stress-test-2026-10-06T19-30-40.json`) : 281 pages, trois queries tRPC,
sept kinds de forge et state machine, zéro erreur/avertissement/finding. Fixture
ADMIN vérifiée via session et Console HTTP 200 sans redirection avant crawl.
Le premier stress 19-28-38 est exclu : redirections login possibles.

La session Secure de fixture a été préparée et transmise localement pour le
serveur de build ; les claims/salt respectent le contrat, aucun jeton exposé.
Navigateur du build local HTTP redirige login, donc aucun PASS navigateur de ce
build n'est revendiqué. Les quatre surfaces dev reçues demeurent la preuve UI.
Il s'agit d'une contrainte du dispositif local d'authentification, pas d'une
nouvelle dette du produit.

ADR-0196 Accepted localement avec suite/guards et limites ci-dessus. Aucun
provider AV/embedding nouveau, POST Argos ou cadence distante ne sont inférés ;
CI et déploiement encore à venir. La réception des accès et du runtime cible
suit le [runbook](../../deploy/CREATIVE-INTELLIGENCE.md), avec plans ouverts dans
RESIDUAL-DEBT. Les résidus de droits/lifecycle, providers/corpus et warnings
préexistants sont conservés ; pas de promesse de complétude externe sans reçu.


### Livraison managée — fusion, CI et suivi de réception

PR #968 fusionnée à `1c1a0dd65eccf44a08e307f0c1dce6479a50888c`, 15/15 contrôles
SUCCESS sur `c35d189`. Build officiel dispatché :
[run 37521228164](https://github.com/xtincell/ADVE-project/actions/runs/37521228164).
Le reçu applicatif daté de [PR #968](https://github.com/xtincell/ADVE-project/pull/968)
rapporte image/migration/version/domaines, séparément des preuves métier externes.
Les bilans locaux et étapes Proposed restent historiques. AV/embedding payant,
POST Argos et stockage cible live non reçus ; leurs plans de reprise demeurent.
