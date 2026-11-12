# Produire des images, des vidéos et du son à partir de sources de marque versionnées

**Proposition de conception locale, 4 novembre 2026.** Le premier cas de réception est un post statique. L’équipe choisit une direction artistique et un texte déjà produits, examine le visuel composé, puis remet le fichier et sa légende à la personne qui prépare la diffusion. Une autre équipe doit pouvoir rouvrir ce post, identifier les versions utilisées et remplacer une source en voyant précisément les étapes à reprendre.

## Point de départ

Le compositeur résout déjà les dépendances du livrable et cherche dans le coffre de la marque les actifs exploitables, périmés ou manquants. Au 4 novembre, `dispatchForge` appelait `executeTool(targetSlug, strategyId, {})` puis pouvait transmettre sa sortie à la forge. Depuis le lot 4.11.a du 12 novembre, il résout d’abord les entrées obligatoires de l’outil cible ou refuse le lancement avec la liste des manques ([registre](../governance/RESIDUAL-DEBT.md)). Le choix persistant des versions en amont ne fait toujours pas partie de cet appel. La prévisualisation peut donc montrer une direction artistique disponible sans pouvoir prouver que la forge l’a reçue. Le candidat sépare désormais `generativeTaskId` de `sequenceExecutionId`. Une forge directe retourne l’identifiant de tâche et laisse vide l’identifiant d’exécution de séquence. [Compositeur](../../src/server/services/deliverable-orchestrator/composer.ts) · [Résolution des dépendances](../../src/server/services/deliverable-orchestrator/resolver.ts) · [ADR du raccord actuel](../governance/adr/0136-compose-deliverable-dispatch.md)

### État de la candidate locale

| Surface | Implémentation constatée | Preuve acquise ou à obtenir |
|---|---|---|
| Livrables | Le lecteur donne accès aux versions exploitables GLORY, CALC et ARTEMIS. Leur production emprunte la modale des séquences. | Un résultat textuel réel comporte le schéma imposé, le modèle servi et le transport. Dernière version exploitable et historique reçus en navigateur local, avec zéro réponse 5xx et zéro exception de page sur ce parcours. |
| Prérequis de lancement | La préparation utilise le même contrôle du coffre que le lancement. | Le navigateur local affiche la version 3 produite par Luna et exige une séquence PLAYBOOK-E acceptée avant tout appel de génération. |
| Production | L’onglet réutilise la Forge. Elle résout les dépendances, affiche les actifs candidats et peut lancer la production cible. | Le contrat qui sépare les identifiants de tâche et d’exécution passe en test ciblé. Le choix persistant d’une variante par entrée, l’édition du graphe et l’exécution de ses étapes manquantes restent à réaliser. |
| Image | Ptah utilise le transport privé, partage la limite d’appels et distingue l’identifiant indexé du reçu matériel. | Après deux sondes de 1 017 333 puis 1 072 682 octets, le parcours API local corrigé a produit une tâche terminée, une version et un actif relié. Assets charge l’image synthétique de 1 076 193 octets et de 1 254 × 1 254. La DA et le texte de SPAWT restent à exercer. |
| Vidéo et audio | Le registre contient un adaptateur Magnific et des routes vidéo et audio. | Aucun clip ni fichier audio issu de cette candidate n’a encore été reçu. Un exemple de développement ou un nom de modèle ne constitue pas le rendu demandé. |
| Montage, sous-titres et déclinaisons | Contrats proposés ci-dessous. | À recevoir par exécution sur des sources identifiées et inspection des exports. |

La banque de demandes, Production, le lecteur et ses prérequis, Overton et Assets ont été exercés dans le navigateur local. Chaque page a répondu HTTP 200 avec zéro réponse 5xx et zéro exception observée. La banque a affiché 55 demandes avec pagination et conservé le focus pendant la frappe. Une nouvelle demande a parcouru « À traiter », « En cours », « Traité » puis « À traiter ». Overton a affiché trois parcours jusqu’à leur cible « Populaire ».

Les 5 173 tests unitaires sont passés avant la modification suivante du lecteur, ainsi que les 13 tests Python du relais et les 52 tests d’admission PostgreSQL. Une réconciliation répétée conserve une seule version, un seul actif et une seule imputation de coût. Le typage, les lints et le contrôle des cycles ont passé. Dans la passe suivante, le lecteur rend les données imbriquées sans troncature. Ses trois tests de comportement passent. Sa compilation finale et sa lecture native sont reçues : 65 valeurs textuelles sur 65 sont présentes, HTTP 200 sans réponse 5xx ni exception. [Atelier partagé](../../src/components/cockpit/production-workbench.tsx) · [Contrat de dispatch](../../tests/unit/governance/deliverable-dispatch.test.ts)

## Ce que la personne choisit

| Choix | Effet dans la recette proposée |
|---|---|
| Marque et campagne | Le brief, le public, l’objectif et les contraintes de la campagne définissent le périmètre des sources admissibles. |
| Source, version et variante | Chaque entrée affiche son contenu et son identifiant. « Texte B » ou « DA v2 » devient une sélection persistante au lancement. |
| Recette et étapes | Choisir image, clip, spot audio ou adaptation présente les étapes ordonnées. Les variantes de montage, ajouts et retraits d’étapes se sauvegardent dans une nouvelle révision de recette. |
| Capacité et moteur | Choisir un type de travail parmi les capacités réellement admises. Une suggestion de fournisseur ou de modèle passe par le sélecteur Ptah. L’historique enregistre celui qui a effectivement répondu. |
| Paramètres et rendus | Aspect, durée, dimensions, voix, fichiers de référence et rendus demandés appartiennent à l’étape concernée. Chaque nouvelle variante reçoit son propre identifiant. |
| Approbateur | Une personne habilitée est désignée pour un périmètre précis, par exemple DA, voix, montage ou livraison finale. Sa décision porte sur une version donnée avec date et motif. |

### Réglages proposés et autonomie par étape

Par défaut, le porteur ouvre une recette déjà préparée. La Fusée propose les versions compatibles de sa marque et de sa campagne. Le canal du brief propose les formats de remise. La DA retenue propose les références visuelles. La disponibilité et les limites d’appels encadrent le moteur proposé. Chaque valeur a une raison courte et consultable, liée à la source, à sa version et à la règle appliquée. La personne peut lancer le travail admissible avec ces valeurs ou modifier une seule entrée avant le lancement. Un conflit entre deux choix éditoriaux déterminants reste visible avec la décision concrète attendue.

Une proposition automatique reste distincte d’une valeur choisie par l’humain. Un remplacement explicite identifie son auteur, sa date, son périmètre et la révision de recette où il s’applique. Si une source change, le plan indique quels réglages proposés doivent être recalculés et quelles décisions explicites méritent une relecture. Une nouvelle édition du brief ne réécrit pas silencieusement un choix retenu dans une exécution antérieure.

L’autonomie est facultative et définie **pour chaque étape**. Son mandat identifie la marque, la campagne, le travail autorisé, les sources admissibles, le responsable, le nombre maximal d’appels ou d’essais, le plafond de coût, sa durée et les conditions de remise en main humaine. Le journal distingue estimation et coût effectivement reçu. Une limite atteinte, un prérequis absent, une soumission de statut incertain ou une validation humaine attendue laisse l’étape en attente avec la raison et la prochaine action. Une autorisation technique d’exécuter ou un résultat réussi ne vaut pas approbation éditoriale. En mode manuel, la personne renseigne les mêmes ports, sélectionne les mêmes versions et dispose des mêmes possibilités de reprise.

Le `ForgeBrief` associe un brief texte, une origine ADVE et un mode de manipulation au `ForgeSpec`. Cette structure porte le type de forge, les paramètres et les préférences de fournisseur ou de modèle. Le sélecteur consulte les moteurs admis pour ce type, leur disponibilité et leur circuit de santé. Le client peut annoncer une préférence. Le serveur reste responsable de l’admission. [Types de Forge](../../src/server/services/ptah/types.ts) · [Sélecteur existant](../../src/server/services/ptah/routing/provider-selector.ts)

- **Image et icône.** La politique de La Fusée réserve la génération à OpenAI. Lorsqu’un relais privé est sélectionné, son défaut de capacité doit produire une attente ou une erreur explicite.
- **Vidéo et audio.** La politique route ces travaux vers Magnific. Une recette ne peut proposer un modèle ou déclarer un film produit qu’après vérification de la capacité correspondante, de la réception du fichier et de sa provenance. La musique peut être fournie comme source autorisée ou via une étape manuelle jusqu’à qualification d’un fournisseur.
- **Adaptation.** Retouche, changement de format, montage et mixage sont des opérations différentes. Une découpe ou une conversion déterministe doit enregistrer ses paramètres et produire un fichier versionné. Un travail nécessitant un fournisseur passe par le type de forge admis. Le registre contient des adaptateurs de design et de transformation dont l’aptitude au cas précis doit être reçue.
- **Higgsfield.** Sa disponibilité comme outil MCP dans un autre environnement ne raccorde pas La Fusée à son exécution. Toute proposition d’intégration doit préciser l’adaptateur admis, le mandat, les quotas, l’identité du travail suivi et un reçu matériel réel. [Registre des fournisseurs de La Fusée](../../src/server/services/ptah/providers/index.ts)

### Interface proposée

À l’ouverture de Production, le brief et la marque restent visibles. Les entrées épinglées et les paramètres de l’étape sont à gauche, son résultat et les versions précédentes à droite. Une colonne d’étapes indique ce qui attend une source, peut être lancé, nécessite une relecture ou a déjà un fichier. Sur petit écran, ces régions deviennent trois vues successives, « Sources », « Étapes » et « Résultats », avec conservation de la même révision.

Les références inspectées apportent trois choix de disposition. Magnific garde le prompt, les références et les réglages à gauche pendant la consultation de la galerie. Leonardo associe les paramètres à l’historique. Google AI Studio garde la sortie et le prompt lisibles avec les réglages à proximité. Cette organisation est proposée pour l’extension de l’onglet Production existant. [Magnific](https://mobbin.com/screens/0cd06b4b-f009-490f-8e1a-8bf3f704d0a2) · [Leonardo](https://mobbin.com/screens/001752b6-42e1-4aa1-817f-dc39c7adddc7) · [Google AI Studio](https://mobbin.com/screens/59c1a1e9-83c2-4105-b666-ca3782c71346)

## Un post, version par version

| Étape | Entrée | Sortie attendue |
|---|---|---|
| Cadrer | Brief de campagne, public et promesse de l’ADVE | Intention, canal, format demandé et règle éditoriale, chacun relié à sa source. |
| Choisir | Direction artistique et variantes de texte dans le coffre | La personne choisit par exemple DA v2 et texte v4. L’aperçu montre le contenu, les références de version et les raisons du choix. |
| Composer | Versions retenues, indication de cadrage et éventuelles images de référence autorisées | Prompt relisible et modifiable. La légende destinée à être publiée reste une chaîne distincte du prompt. |
| Matérialiser | Version du prompt et références visuelles exactes | Une tâche Ptah avec identifiant, état et moteur enregistré, puis une version de fichier consultable. |
| Relire | Fichier et sources choisies côte à côte | Décision nominative et datée sur fidélité à la DA, lisibilité, exactitude du texte et conformité au format. Une correction ciblée conserve l’essai précédent. |
| Décliner | Visuel retenu et gabarit des sorties demandées | Fichier de chaque format attendu, dimensions constatées, légende retenue et aperçu. |
| Remettre | Fichiers relus, légende et références des versions | Dossier consultable par le destinataire prévu et reçu de remise. La publication constitue une décision distincte et ne fait pas partie du test. |

Pour SPAWT, la variante préférée d’un créateur partenaire peut ainsi rester dans l’historique même si l’équipe en choisit une autre. L’identité de ce partenaire, le public visé et le restaurateur qui finance la présence sont des rôles distincts du brief. L’attribution d’une visite ou d’une vente requiert une observation ultérieure.

## Recettes audiovisuelles proposées

Le même contrat doit permettre de viser un format final en assemblant des sorties déjà validées. Chaque étape indique ses entrées obligatoires, le type et la version du résultat qu’elle livre, ses contrôles et le périmètre d’une reprise.

| Recette / étape | Entrées obligatoires | Sortie à recevoir | Effet d’une modification |
|---|---|---|---|
| Image statique | Brief, DA choisie, texte si intégré, références visuelles autorisées, format | Prompt admis, image durable aux dimensions constatées et légende distincte | Une évolution de palette reprend le prompt et l’image. Une modification de légende extérieure à l’image reprend uniquement le dossier de remise. |
| Vidéo / découpage | Brief vidéo, script versionné, durée cible, supports et contraintes de marque | Liste de scènes avec identifiants, durées, intentions, transitions et références | Une modification de scène conserve les scènes indépendantes. La durée totale et les références aval sont recalculées. |
| Vidéo / images clés | Scène, consignes de cadrage, DA, références personnages ou produit autorisées | Images clés identifiées, ordonnées et relues par scène | Changer le cadrage de la scène 2 reprend ses images clés et son plan animé. |
| Vidéo / animation | Images clés retenues, mouvement demandé, durée et cadence | Clip durable avec durée mesurée, fréquence d’images et références des images clés | La reprise vise le seul plan modifié, puis les sorties de montage qui l’utilisent. |
| Vidéo / voix et musique | Texte de voix validé, prononciation, voix autorisée, musique sélectionnée ou brief musical, droits applicables | Pistes séparées avec durée, version, origine et droits documentés | Changer une phrase reprend la voix concernée, la synchronisation et les sous-titres. Une autre musique reprend le mixage et l’export. |
| Vidéo / montage et sous-titres | Plans retenus, pistes son, ordre et durée, texte et langue | Ligne de montage versionnée, mixage, fichier de sous-titres horodatés et master | Corriger un sous-titre reprend le fichier de texte et le rendu incrusté concerné, sans nouvelle animation. |
| Audio autonome | Script, voix autorisée, musique ou effets choisis, durée, format sonore | Pistes et master séparés avec durées et niveaux mesurés. Écoute requise pour prononciation et intelligibilité. | Corriger une voix reprend la piste et le mixage. Changer le format de remise reprend l’export du master. |
| Adaptation / diffusion | Master retenu, cible, durée autorisée, ratio, zones sûres, langue, consignes de marque | Variantes nommées par canal, dimensions/durée constatées, sous-titres et fichiers relus | Modifier le ratio ou la langue reprend les adaptations concernées. Une coupe qui change le sens repasse en relecture éditoriale. |

Le relais candidat a reçu un carré de 1 254 × 1 254 après une demande de 1 024 × 1 024. L’étape de remise devra conserver la taille demandée et les dimensions effectivement décodées du master, appliquer la règle d’adaptation retenue, puis contrôler le fichier exporté. Une taille inscrite dans le prompt ne vaut pas mesure du fichier.

Une étape peut être confiée à un opérateur, à une transformation déterministe disponible ou à un fournisseur qualifié. Pour une voix sans source autorisée, un plan absent ou une bande musicale sans droits identifiés, la recette garde l’étape ouverte et explique l’action nécessaire. Un extrait de démonstration ne vaut pas fichier produit pour ce brief.

## Contrat proposé

La recette est un **actif intellectuel versionné** dans le coffre de la marque. Sa première implémentation peut utiliser un `BrandAsset` de famille `CONCEPTUAL` avec un contenu structuré et validé. Chaque révision conserve un parent et un schéma de contenu. Elle précise le livrable demandé, les entrées nécessaires, les étapes, leurs dépendances, les interventions humaines et les formats de remise. Le choix d’une nouvelle nature d’actif reste conditionné à un manque démontré de la taxonomie existante.

Chaque entrée sélectionnée doit désigner une **version exacte** et son rôle. Elle porte le type de source, l’identifiant de la ligne, le numéro de version lorsqu’il existe, la marque, le contexte campagne, et l’empreinte des données réellement envoyées. Un lien vers « dernière version » peut servir à proposer un choix à l’écran. Au lancement, le manifeste fige la sélection. La validation des rattachements à la marque et des droits se fait côté serveur.

Le graphe proposé possède des identifiants d’étape stables et des dépendances dirigées. Ajouter, retirer ou déplacer une étape crée une révision de recette. Le résolveur actuel détecte les cycles à partir des dépendances déclarées par type d’actif. Il manque la distinction entre entrées requises et facultatives, la compatibilité des types de sortie et la preuve que l’étape a reçu les versions sélectionnées.

Le chemin générique du moteur remplace encore des champs absents par « (champ non disponible) » avant de construire le prompt. Depuis le lot 4.11.a, l’outil cible du compositeur fait exception : ses entrées obligatoires sont résolues depuis la fiche de marque, le brief du post, la proposition validée ou un brief amont, sinon le lancement est refusé sans appel. Les outils amont de la cascade gardent l’ancien comportement. Dans une recette gouvernée, une entrée obligatoire devra être résolue dans le coffre, produite ou fournie manuellement. Si elle manque, l’étape devra rester bloquée avec l’action attendue et sans appel fournisseur. Une entrée facultative pourra porter un postulat explicite avec origine, règle suivie et vérification demandée. Ce comportement appartient aux lots de conception. [Validation actuelle des entrées](../../src/server/services/artemis/tools/engine.ts)

L’exemple suivant montre un contenu proposé pour le `BrandAsset` intellectuel. Les identifiants sont fictifs. Les clés `steps` et `ports` décrivent un format à implémenter. Elles ne constituent pas un nouvel endpoint ni un type de forge existant.

```json
{
  "schema": "production-recipe/v1",
  "recipeRevision": 2,
  "strategyId": "marque-exemple",
  "campaignId": "campagne-exemple",
  "target": "post-statique",
  "ports": [
    {"id": "direction", "type": "brandAsset:KV_ART_DIRECTION_BRIEF", "required": true},
    {"id": "copy", "type": "brandAsset:SOCIAL_COPY", "required": true}
  ],
  "pins": {
    "direction": {"id": "da-v2", "version": 2, "variant": "A"},
    "copy": {"id": "texte-v4", "version": 4, "variant": "B"}
  },
  "steps": [
    {"id": "prompt", "executor": "artemis", "inputs": ["direction", "copy"], "output": "brandAsset:KV_PROMPT"},
    {"id": "image", "executor": "ptah", "inputs": ["prompt", "direction"], "forgeSpec": {"kind": "image", "providerHint": "openai", "parameters": {"size": "1024x1024"}}, "output": "assetVersion:image"},
    {"id": "review", "executor": "operator", "inputs": ["image", "direction", "copy"], "output": "reviewDecision"},
    {"id": "format", "executor": "local", "inputs": ["image", "review"], "output": "assetVersion:image"},
    {"id": "handoff", "executor": "anubis", "inputs": ["format", "copy", "review"], "output": "handoffReceipt"}
  ],
  "approval": {"stepId": "review", "scope": "visuel-et-texte", "reviewerId": "responsable-exemple"}
}
```

Au lancement, le manifeste d’exécution ajouterait les empreintes réelles, les identifiants d’Intent, les paramètres effectifs et les résultats. `ForgeBrief` reste construit avec le texte du prompt admis, `pillarSource` et `manipulationMode` effectifs. L’exemple ne présume pas que `ForgeSpec` sache valider des ports de recette ou vérifier des droits de campagne.

`SequenceExecution` garde l’exécution figée, sa recette et les résultats par étape. Les sorties intellectuelles se rattachent aux références du coffre et aux résultats de génération. `GenerativeTask` garde l’identité du travail de forge, le moteur enregistré, les paramètres et les coûts reçus. `AssetVersion` conserve le fichier, sa lignée et, lorsqu’il existe, son emplacement durable. Le manifeste doit relier **toutes** les sources prises ensemble. Le parent unique d’une version matérielle convient à sa filiation technique et ne suffit pas à représenter les deux entrées indépendantes DA et texte. [Modèles et relations](../../prisma/schema.prisma) · [Écriture des versions du coffre](../../src/server/services/brand-vault/engine.ts)

`OrchestrationPlan` et ses étapes possèdent déjà un cycle de vie pour la progression ADVE/RTIS. Leur utilisation comme stockage des recettes créatives exigerait d’abord une décision explicite sur ce contrat et ses consommateurs. Pour cette proposition, le stockage de la recette et celui du journal d’exécution restent dans les types ci-dessus.

Dans le contrat proposé, **chaque révision enregistrée de recette, chaque manifeste lancé et chaque version de sortie sont immuables**. Éditer produit une nouvelle révision avec un lien vers le parent. Une sélection courante peut évoluer, tandis qu’un lecteur historique retrouve à tout moment ses références, ses réglages et leur provenance.

La reprise compare les empreintes des entrées et de la définition de chaque étape entre les deux révisions. Elle invalide uniquement les descendants qui consomment une valeur modifiée. Un changement de prompt reprend la forge et ses descendants. Une légende de diffusion modifiée préserve le visuel si son texte n’est pas intégré à l’image. Changer un gabarit reprend sa déclinaison. Un double clic ou une reprise après perte de connexion réutilise le même travail en cours. Une variante intentionnelle ouvre un nouvel essai identifié. Un échec reste consultable avec sa cause et conserve l’ancienne sortie exploitable.

## Qui intervient

| Responsable | Décision ou travail attendu dans le cas social |
|---|---|
| Mestor | Vérifie la portée, les permissions et les conditions de lancement. Journalise la décision et adresse chaque étape au responsable existant. |
| Artemis | Transforme l’intention et les versions sélectionnées en brief, texte ou prompt relisible. Conserve les références utilisées. |
| Ptah | Matérialise le prompt admis, consigne la tâche et remet une version matérielle. |
| Seshat | Relève les signaux et les observations sourcées. Après diffusion, fournit les mesures effectivement reçues avec leur période. |
| Thot | Estime le coût avant exécution, distingue enveloppe autorisée, coût réalisé et dépense rapprochée. |
| Imhotep | Affecte la préparation ou la retouche qui exige un intervenant humain et conserve le retour de mission. |
| Anubis | Prépare le destinataire et le canal de remise. Une éventuelle diffusion publique exige sa propre autorisation. |

La personne responsable de la marque reste identifiable dans le choix éditorial et la validation du fichier. Un agent peut préparer une variante dans les limites de son mandat. En mode manuel, une personne peut fournir les mêmes entrées et obtenir le même suivi de versions. [Répartition canonique des rôles](../governance/STATE_FINAL_BLUEPRINT.md#annexe-canon-p--pantheon-neteru)

Yggdrasil assure la circulation par marque sans gouverneur propre. Mestor conserve les contrôles d’entrée et la chaîne des intentions. Pour chaque étape, le reçu proposé relie la version source, l’Intent admis, l’acteur, l’exécution ou la tâche, la version de sortie et l’événement observable. La décision humaine identifie la version réellement relue. Un événement de transport seul ne confirme ni la production ni la remise. [Doctrine de circulation de la valeur](../governance/adr/0082-yggdrasil-value-circulation-substrate.md)

## Livraisons locales et critères de réception

Ces lots sont proposés. Les exemples de versions et de nombres de sorties ci-dessous décrivent des tests à réaliser. Aucune date de mise en ligne n’est engagée.

| Lot local | Parcours à exercer | Critère mesurable |
|---|---|---|
| 1. Éditer et choisir | Ouvrir une recette, fixer DA v2 et texte v4, enregistrer et recharger. Ajouter ensuite texte v5 au coffre. | Les deux références et leurs contenus sont identiques au rechargement. Le choix reste v4. Une source d’une autre marque et un cycle sont refusés avant exécution. |
| 2. Exécuter | Résoudre les deux sources, fabriquer le prompt puis lancer une forge. Réessayer le même lancement et provoquer l’échec d’une variante sur la fixture. | Une ligne d’exécution référence une tâche identifiable et un fichier dont les octets sont relus. Le prompt reçu comporte les deux références attendues. Le doublon ne produit aucune seconde tâche. L’essai en échec conserve le fichier antérieur. |
| 3. Réviser | Remplacer une source de création, puis modifier séparément la légende seule et un gabarit. | Le journal nomme les étapes reprises et conservées. La légende seule ne relance aucune forge quand elle n’entre pas dans l’image. Les versions antérieures sont toujours consultables. |
| 4. Relire et remettre | Produire par exemple un carré et un portrait depuis une image retenue, inspecter les deux formats et remettre localement le dossier. | Deux fichiers durables avec dimensions et empreintes vérifiées, texte intégral, décision de relecture et destinataire. La trace montre zéro diffusion publique. |

Pour recevoir l’assistance automatique, refaire le lot 1 avec tous les réglages proposés, puis avec une seule valeur remplacée. Le manifeste doit conserver les raisons des propositions et l’origine de la valeur remplacée. Pour recevoir l’autonomie, imposer au lot 2 un plafond d’une tentative et une étape de relecture humaine. Une deuxième demande doit rester en attente sans nouvel appel. Refaire le parcours en mode manuel doit produire les mêmes références de provenance et le même contrôle avant remise.

Pour recevoir le premier clip, prévoir ensuite deux scènes, deux clips matérialisés, deux pistes audio séparées, un master relu et des sous-titres vérifiés à l’image. Modifier un seul sous-titre doit conserver les identifiants des clips et des pistes. Pour recevoir le premier spot audio, écouter les pistes puis le master après remplacement d’une voix et vérifier durée, codec et droits. Pour recevoir une adaptation, exporter et ouvrir les formats portrait et carré à partir du même master. Ces recettes restent locales. La mise en ligne de l’ensemble attend le feu vert explicite de l’opérateur.
