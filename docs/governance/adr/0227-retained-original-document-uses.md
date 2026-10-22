# ADR-0227 — Usage documentaire d’un original déjà conservé au coffre

**Status** : Proposed — recette locale522 reçue, livraison et pièces réelles ouvertes
**Date** : 2026-10-22
**Phase** : 7 — C2, exploitation des originaux et classement documentaire
**Depends on** : ADR-0197, ADR-0198, ADR-0219, ADR-0220, ADR-0222, ADR-0223, ADR-0226
**Supersedes** : aucun ; reprend la proposition historique du candidat505, pas ADR0224 courant

## Contexte

Quatre grands PDF/PPTX SPAWT sont déjà conservés au coffre avec leurs originaux,
mais ne sont pas reçus comme sources documentaires lisibles et classées. Les
renvoyer par l’admission monolithique de dix Mio ne répond pas à ce besoin.
Conserver les octets ne prouve ni lecture du texte, ni version métier, ni usage
stratégique. Le candidat505 avait préparé ce raccord dans un checkout distinct ;
il est conservé et porté sur la base521, sans revendiquer sa production.

Son ADR local0224 ne doit pas remplacer ADR0224 courant, consacré aux originaux
d’intake. Cette reprise reçoit le prochain numéro libre0227. Les preuves505
restent historiques et locales ; elles ne qualifient pas automatiquement le code
porté, son intégration avec520/521 ou la réception des quatre pièces réelles.

`BrandAsset`, `FileUpload`, reçus privés v1/v2, objets et manifestes de fragments,
`BrandDataSource`, extracteurs et dossier documentaire existent. Étendre leurs
usages suffit : aucun modèle Prisma, service, routeur, page, Intent, fournisseur,
manager ou Neter supplémentaire. Rôles, gouverneurs et rétention sont conservés.

## Décision

`ingestion-pipeline` reste sous Mestor/Sustainment et `ingestion.uploadFile` reste
le writer gouverné existant, kind `LEGACY_INGESTION_UPLOAD_FILE`. La chaîne reste
original fidèle → source qualifiée → conseil et décision explicite → livrable,
sans adoption stratégique ou publication implicite par ce raccord.

- L’entrée explicite `retainedAsset` désigne actif et empreinte attendue. Droits
  courants, pare-feu collaborateur, marque active, reçu STORED non ambigu et
  métadonnées sont contrôlés avant lecture, puis revérifiés sous les verrous
  existants avant admission. Un original étranger, périmé, incomplet ou corrompu
  refuse l’usage documentaire.
- Le lecteur privé existant vérifie objet ou manifeste/fragments, puis utilise
  l’extracteur de format. Le FileUpload d’actif et son cycle de vie sont conservés.
  Un FileUpload d’usage documentaire peut référencer le même objet/manifeste :
  nouveau lien d’usage, aucun nouvel octet écrit ou second original physique.
- Source canonique par marque et empreinte, rejeu sans duplication et décisions
  antérieures conservées. Un texte corrigé n’est pas écrasé par une extraction.
  Lecture exploitable et classement demandé, édition ou représentation, sont
  reçus ensemble selon les gardes existantes de lignée, hash et décision. Un
  rejeu ne permet pas une reclassification déguisée.
- Un PDF image sans texte extractible conserve l’original et rend FAILED visible.
  Aucun classement n’est annoncé ou appliqué sur une lecture vide. L’utilisateur
  corrige manuellement le texte dans Sources, puis classe la source par le chemin
  existant. Aucun OCR, appel IA ou analyse visuelle implicite ; assistance
  facultative, parcours manuel complet.
- Mes actifs et Sources réutilisent le même dialogue documentaire. Un actif peut
  rejoindre directement sa source déjà admise ou sa correction FAILED ; le rôle
  attendu vient du verdict d’accès existant, sans capacité supplémentaire.
- Le téléchargement documentaire réutilise le flux privé vérifié pour objets et
  fragments, avec droits et en-têtes privés. L’intégrité complète exige de lire
  le flux jusqu’à son terme. Ce port ne promet ni mémoire globale bornée, SLO,
  restauration ou capacité universelle de lecture d’archives.
- Quatre fichiers d’icônes legacy OTHER révèlent une limite de la réparation
  descriptive. Le correctif522 est limité à OTHER→TECHNICAL pour suffixes de
  code/prompt explicitement autorisés, sans décision documentaire antérieure et
  sans changement de statut. Hash courant, historique et garde des documents
  métier/BMC restent requis. La garde est reçue localement ; son application aux quatre fichiers réels reste
  à recevoir. Ce n’est ni une adoption ni une nouvelle décision d’usage.

## Conséquences

Une pièce peut devenir consultable comme source sans dupliquer son stockage ou
sa preuve. Actif, édition et format alternatif gardent leurs rôles ; sélection,
droits de publication et choix stratégiques ne sont pas déduits du dépôt.

Le candidat505 historique a reçu tests unitaires/gouvernance/PostgreSQL, typage,
lints, build local et une recette USER fictive du manuel, du rejeu et du lien vers
une source existante. La relecture locale des quatre pièces couvrait104 pages/
diapositives ; elle ne recevait pas leur admission de production. Son stress FULL
reste qualifié non reçu, CI/image/runtime505 non reçus. Ces faits restent dans
P10 candidat505 et les preuves `preuves-documents505-20261020`, notamment
`candidate-local-final-checkpoint.json`, `native-reception-received.json`,
`native-existing-source-link-received.json` et `real-documents/manual-reading.json`.
Aucun vieux total de tests ou état transitoire de build n’est repris comme état522.

Tests anti-drift reçus sur la base522 : droits/isolement, intégrité simple et
fragmentée, empreinte périmée, FileUpload/objet/manifeste conservés, rejeu et texte
corrigé, classement atomique, PDF FAILED puis correction manuelle et lignée/format.
La régression OTHER→TECHNICAL a réellement échoué quatre fois avant correction,
puis33 tests ciblés passent, avec refus métier/décision/statut. Le conflit d’import
est résolu en conservant les deux capacités, pas en retirant une garde.

Réception522 locale : typage/deux lints/cycles/code-map et build webpack exit0,
1717tests/172fichiers gouvernance/UI, PostgreSQL25/3 et consommateurs d’originaux
17/2. Premier refus Turbopack sur symlink externe conservé, aucun symlink modifié.
FULL sous ADMIN dédié séparé du USER : zéro finding,276probes HTTP reçus, cinq
routes de démonstration404 non reçues, zéro authredirect ; ce n’est pas une preuve
UI. USER natif sur compilation522 : page200, DOM150ms/titre observé549ms, fenêtre
complète sans≥500/exception. Deux éditions dont historique déposé tard, PDF image
FAILED puis texte manuel et format lié, retour vers source existante et originaux
téléchargés exacts. DB : trois actifs/trois sources/deux éditions/un format, mêmes
reçus/originaux/états/versions d’actifs, zéro IA/pilier/contexte créé. Preuves P23
`documents522-{final-gauntlet-results,stress-full-received,native-received,native-db-received}.json`
et logs PostgreSQL ciblés. Recette fictive locale, pas un SLO ou une production.

Commit/CI/image/runtime522 et admission des quatre pièces SPAWT réelles restent
à recevoir : requalifier leurs versions/statuts/formats depuis le Drive courant,
puis recevoir texte utile et original exact sans copier les octets ni adopter
une proposition. Le candidat505 et ses reçus historiques restent conservés.
Déclencheur immédiat sur les pièces bloquées ; responsable/effort et plan de
fermeture dans [RESIDUAL-DEBT](../RESIDUAL-DEBT.md).

Population documentaire425 incluant ressources techniques/créatives, ingestion
active ; matériels1920/1920 et classements reçus, cinq anciens diagnostics
rapprochés sans rejeu aveugle, alias résolu. E14/V47 conservés, nouveaux BMC
proposés non adoptés. Aucun corpus intégral, conseil complet, Core/Oracle/MVP ou
chantier macro reçu par cet ADR. CODB et lenteur restent des dettes distinctes ;
aucun ratio comparable ou chiffre de rentabilité n’est fabriqué par ce raccord.
