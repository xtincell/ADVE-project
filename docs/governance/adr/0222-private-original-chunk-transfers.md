# ADR-0222 — Transfert fragmenté des originaux privés existants

- **Status**: Proposed — recette locale bornée reçue ; CI/image/runtime et corpus réel à recevoir
- **Date**: 2026-10-20
- **Phase**: 7 — corpus intégral / C2, C3, C4, C7
- **Depends on**: ADR-0012, ADR-0197, ADR-0220, ADR-0221
- **Supersedes**: aucun ; complète la conservation des originaux existante

## Contexte

Le corpus SPAWT conserve au périmètre 36 grands originaux, dont un fichier de
162 437 099 octets. L’admission monolithique des sources et actifs est bornée à
dix Mio ; le stockage d’un objet physique est lui aussi borné. Les intake
permettent cinq fichiers de dix Mio et les études annoncent 50 Mo : leur requête
JSON/base64 peut dépasser le tampon proxy de seize Mio. Recevoir le petit
fichier individuel dans 498 ne reçoit donc ni ces lots ni les grands originaux.

Audit positif : `BrandAsset`, `BrandDataSource`, `FileUpload`, conservation des
originaux, stockage chiffré VOLUME/HTTP_BLOB et collecteur de rétention existent.
Les primitives `source-original`, `encrypted-media-store` et
`chunked-original-store` sont étendues ; aucun second coffre, registre métier ou
gestionnaire de transfert n’est nécessaire. Le transfert physique reste séparé
de la lecture d’un format, de son analyse et de toute décision d’équipe.

Le travail sur les fragments a également reproduit un défaut du stockage
VOLUME : un lecteur concurrent pouvait voir le préfixe d’un objet chiffré avant
la fin de son écriture. Une reprise fiable exige de ne rendre visible l’objet
canonique qu’après écriture complète, sans écraser un objet déjà reçu.

## Décision

Sustainment, tutelle Mestor, sous les admissions INFRASTRUCTURE existantes comme
ADR-0220. Il s’agit de primitives de persistance ; aucun nouveau modèle Prisma,
routeur, Intent, Neter, fournisseur, gestionnaire ou Glory tool de production.
La réception fidèle de toutes les pièces permet la continuité des opérations
de marque ; elle ne prouve ni leur compréhension ni un résultat commercial.

### Primitives présentes au checkpoint

- `original-chunks-v1` décrit l’original complet par empreinte, taille et liste
  ordonnée de fragments. Le contrat physique candidat accepte au plus 200 Mio,
  en fragments de quatre Mio au plus, cinquante au plus. Les fragments autres
  que le dernier ont la taille pleine ; tailles cumulées, identifiants uniques
  et bornes sont contrôlés. Cette borne couvre le maximum du corpus mesuré ;
  elle ne relève pas la limite du reçu monolithique v1 ni celle d’un objet du
  stockage existant.
- Chaque fragment utilise le chiffrement et le backend existants. La rétention
  relit un objet déjà présent et exige les mêmes octets ; un rejeu exact ne
  réécrit pas l’objet. Un objet corrompu ou divergent est refusé, jamais réparé
  silencieusement par écrasement. La reprise peut conserver les fragments déjà
  reçus et poursuivre ceux qui manquent.
- Le manifeste chiffré n’est conservé qu’après relecture de tous les fragments,
  vérification de leurs tailles/empreintes et de l’empreinte globale de
  l’original. Un fragment manquant ou un hash global divergent refuse ce sceau.
  Le manifeste ne peut pas être son propre fragment. Ce sceau de stockage ne
  remplace pas un reçu métier dans `FileUpload` ou le journal gouverné.
- Le lecteur compare d’abord le manifeste chiffré au manifeste attendu. Il
  restitue ensuite un fragment déchiffré à la fois, contrôle chaque fragment et
  vérifie l’empreinte globale en fin d’itérateur. Les fragments émis restent
  bornés à quatre Mio ; ce contrat ne promet pas que toute la mémoire du
  processus est plafonnée à cette taille. Le consommateur doit parcourir le
  flux jusqu’à son terme avant de qualifier le reçu comme complet.
- Sur VOLUME, l’objet chiffré est écrit dans un nom temporaire privé, synchronisé
  et fermé avant liaison atomique au nom canonique. La liaison refuse une
  destination existante ; le temporaire est ensuite retiré. Un arrêt peut
  laisser un objet temporaire orphelin, pas un objet canonique partiellement
  écrit. Ce nom reste compatible avec l’inventaire d’orphelins existant ; la
  protection des fragments référencés est raccordée au collecteur et reçue sur
  copie de recette ; restauration et rétention de production restent distinctes.

### Raccords codés et reçus localement au périmètre exercé

`brandVault.transfer` étend le routeur existant par la procédure gouvernée
`LEGACY_BRAND_VAULT_CREATE`. BEGIN admet le plan, PART conserve un fragment et
FINISH vérifie/scelle l’original. Chaque requête relit l’acteur, la stratégie,
les droits et le pare-feu collaborateur ; verrouillage et recherche par marque
empêchent de basculer vers un dépôt étranger. Les clés de manifeste/fragments
sont créées côté serveur, jamais fournies comme autorisation par le client.
Backend et clé doivent correspondre au reçu. Ces contrôles présents dans le
code sont exercés sur copie locale ; leur réception ne vaut pas livraison 501
ou qualification de tous les rôles/installations.

Le contrat `asset-original-v2` rejoint `FileUpload` et `BrandAsset` existants,
compatible à la lecture des originaux v1 sur le chemin de téléchargement. Le
plan PENDING est enregistré avant l’envoi ; ses fragments portent une empreinte
nulle tant qu’ils ne sont pas reçus. STORED n’est admis qu’après vérification du
manifeste et de l’original complet. Un même identifiant Drive conserve son
origine ; nouveaux octets créent une édition enfant CANDIDATE, tandis qu’un
rejeu exact retrouve le dépôt. Aucun transfert ne sélectionne ou publie l’actif.
Le spine existant scelle une projection empreinte/taille des octets de PART,
sans recopier leur base64 dans la trace ; l’entrée effective du handler reste
inchangée.

Le collecteur existant recherche désormais les propriétaires `FileUpload` par
clé de manifeste ou clé présente dans `chunks`, y compris les plans PENDING.
Ce raccord protège les références des actifs dans la recette d’intégration ;
rétention de production et restauration restent à recevoir. Le GET d’original existant relit l’accès
à la marque et restitue v1 ou v2 en flux privé, taille et empreinte attendues
dans les en-têtes. Manifeste et premier fragment sont lus avant la réponse ;
la vérification complète exige de consommer le flux jusqu’au terme. L’aperçu
reste borné au petit raster décodé ; les grands fichiers sont téléchargés.

Le formulaire Mes actifs existant accepte jusqu’à 200 Mio, calcule l’empreinte
complète dans le navigateur par tranches de quatre Mio, puis envoie les parties
manquantes et demande le scellement. `@noble/hashes` 2.4.0 assure ce calcul
incrémental ; ce n’est ni un fournisseur ni un gestionnaire supplémentaire.
Progression et erreur de reprise avec le même fichier sont présentes au code.
La suggestion de classement demeure facultative, désactivée par défaut ;
aucune analyse de contenu n’est déclenchée par le transfert seul. Le formulaire
USER et le téléchargement depuis la fiche sont reçus sur données synthétiques
au périmètre décrit ci-dessous, distinct du déploiement et des grands originaux
réels.

### Reste du contrat

Le raccord `BrandDataSource`, les études annoncées à 50 Mo et les intake de
cinq fichiers de dix Mio restent ouverts, distincts du raccord candidat des
actifs. Ils doivent reprendre le transfert borné ; leurs grandes enveloppes
JSON/base64 ne sont pas résolues par le seul formulaire Mes actifs. Le périmètre
annoncé demeure ; réduire les tailles ou relever simplement le tampon mémoire
ne ferme pas le contrat. L’extraction reste soumise aux bornes du format : un
grand original conservé n’est pas automatiquement lu ou analysé.

Annulation, expiration, orphelins, interruption, reprise et concurrence doivent
avoir une politique de rétention reçue. Sauvegarde/restauration C7 doivent
reprendre reçus, manifestes, fragments et clés de l’installation avec relecture
exacte. La protection des références est reçue sur copie synthétique, pas une
purge de fragments de production ou la restauration de toute l’installation.

HTTP_BLOB réutilise le contrat chiffré, mais n’est reçu ici que par une simulation
GET/PUT. La visibilité atomique, le rejeu et les garanties de concurrence sans
écrasement sur le backend distant restent à recevoir ; l’atomicité prouvée du
chemin VOLUME ne les démontre pas.

## Conséquences

Preuves locales reçues : le contrôle d’écriture atomique a échoué avant le fix
sur le vrai système de fichiers, avec lecture du préfixe chiffré. Après
correction, vingt-quatre tests dans quatre fichiers sont verts, dont un
original synthétique de 162 437 099 octets, taille du maximum mesuré du corpus.
Reprise/rejeu sans réécriture, fragment absent/refus du sceau, empreinte globale,
corruption refusée, flux borné et backend HTTP_BLOB simulé sont exercés.
Ces résultats ne sont ni un grand fichier réel reçu ni un parcours produit.

Après les quarante tests ciblés / cinq fichiers, la recette PostgreSQL locale
reçoit dix scénarios sur dix, dont reprise gouvernée, protection des fragments
et téléchargement exact. Le premier échec d’attente de transaction (`P2028`) est
conservé ; le parcours a ensuite été reçu sur l’environnement local détenu.
Suite complète : 4 857 tests / 456 fichiers avec deux workers, mêmes assertions
et borne de trente secondes ; gouvernance 1 671 / 169, typage/deux lints sans
erreur, vingt-quatre avertissements historiques, zéro cycle. Le harnais
n’impose plus `GOD_MODE_EMAILS` vide ; le test crypto de 162 Mo passe seul puis
dans la suite à concurrence bornée, sans augmenter son délai.

Recette native USER sur copie synthétique : 12 582 941 octets, quatre fragments,
six émissions gouvernées OK et six POST 200 dans une fenêtre complète, sans
exception. Un seul actif CANDIDATE, original STORED, téléchargement depuis sa
fiche reçu avec empreinte exacte ; aucun modèle ni adoption. La recharge de
page a une trace tronquée, DOM non mesuré et attente de titre SDK échouée avant
écran visible : aucun SLO ou zéro incident global déduit.

Ces réceptions locales ne reçoivent ni CI/image/runtime 501, ni restauration,
ni grand original réel. La production 500 et son premier pitch réel reçus
appartiennent au lecteur documentaire précédent, pas au transfert candidat.

La décision reste Proposed avant réception des éléments suivants :

1. Livraison des admissions et du reçu `FileUpload` v2 reçus localement, puis
   confirmation des droits/isolement/reprises dans les installations visées.
2. Rétention de production, nettoyage explicite puis sauvegarde/restauration
   des objets et reçus exacts ; protection des fragments reçue sur copie seulement.
3. Livraison du formulaire d’actifs reçu localement ; raccord des sources,
   études et intake puis leurs parcours natifs : progression/reprise, lots et
   tailles annoncées, originaux téléchargés avec taille/empreinte exactes.
4. Qualification des backends effectivement utilisés, tests de l’intégration,
   CI, image et runtime 501 exacts ; le boot du lecteur 500 est une réception
   distincte, sans preuve de ces raccords ou de leur déploiement.
5. Dépôt puis relecture des grands originaux réels du corpus, conservation des
   éditions/provenances et qualification séparée de leur contenu. Aucun appel
   modèle, adoption, publication ou chantier entier reçu par le seul transfert.

Responsables C2/C3/C4/C7 ; effort : un lot de raccord aux admissions/stockages
existants, un lot UX/rétention et leur recette. Déclencheur : poursuite immédiate
du lot des grands originaux et des entrées dépassant l’enveloppe actuelle, avant
acceptation de leur réception dans le contrat global du Shinkiro.
