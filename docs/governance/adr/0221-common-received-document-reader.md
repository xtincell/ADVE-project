# ADR-0221 — Lecture commune des documents reçus

- **Status**: Proposed — source 499 fusionnée, image bloquée au boot ; correctif 500 à recevoir
- **Date**: 2026-10-20
- **Phase**: 7 — absorption du corpus réel / C2, C3, C4, C7
- **Depends on**: ADR-0012, ADR-0197, ADR-0219, ADR-0220
- **Supersedes**: lectures documentaires divergentes et nettoyage binaire des deux intake

## Contexte

Le corpus SPAWT contient des présentations et des exports Google Slides. Le
pipeline ne lisait pas le PPTX ; sa voie de repli pouvait traiter des octets
encodés comme du texte. Les deux intake annonçaient PPTX et anciens DOC/PPT mais
employaient des lectures différentes ; l’un nettoyait le binaire en caractères
apparemment lisibles. Un dépôt ne pouvait donc pas garantir que le contenu
présenté à l’analyse provenait effectivement du document.

Audit positif : `ingestion-pipeline/extractors`, conservation des originaux,
`seshat/market-study-ingestion`, `quick-intake` et leurs surfaces existent. Leur
lecture est factorisée dans ces modules. Le stockage, les usages documentaires,
les décisions de marque et la gestion des appels ne sont pas réinventés.

## Décision

Sustainment, tutelle MESTOR portée par le manifest `ingestion-pipeline` existant.
Les ajouts sont des primitives de lecture et de persistance sous les commandes
existantes ; aucun nouveau Glory tool, service permanent, modèle Prisma, routeur,
Intent, Neter, fournisseur ou gestionnaire d’appels n’est nécessaire. Une lecture
fidèle rend les documents utilisables par les opérations de marque ; elle ne
prouve pas leur valeur commerciale ni la validité de leurs postulats.

- `extractReceivedFile` reçoit les octets d’un fichier. Ce contrat est distinct
  du texte déjà extrait employé par les reprises existantes. Pour les formats
  textuels, un décodage UTF-8 strict et le refus des caractères de contrôle
  binaires remplacent le nettoyage qui fabriquait du contenu plausible.
- `readPptxText`, dans `ingestion-pipeline`, utilise JSZip 3.10.1 explicitement
  déclaré, déjà présent par ExcelJS, et le parseur XML de JSDOM existant. Aucun
  script ou chargement de ressource n’est activé. Le lecteur suit les relations
  de la présentation pour l’ordre des diapositives, puis leurs notes attribuées.
  Les paragraphes et sauts de ligne sont conservés ; les noms de fichiers ne
  décident pas de l’ordre de lecture.
- Les dépendances propres au format sont chargées dans la fonction de lecture,
  à la demande. JSZip ne doit pas être initialisé par la conservation d’octets
  ou la capture publique au boot lorsqu’aucun PPTX n’est lu. Le correctif 500
  déplace cet import ; aucune chaîne de copies de paquets ou exemption du boot
  ne remplace ce découplage.
- La lecture XML est bornée par pièce et au total. Les chemins invalides,
  pièces requises absentes, relations requises vers des diapositives ou notes
  externes, DTD, déclarations d’entités et XML malformé entraînent un refus.
  Un document sans texte lisible ne produit pas une interprétation de ses
  images. Les médias, graphiques, animations et dispositions ne sont pas rendus
  ni interprétés. Le résultat qualifie explicitement texte/notes et absence de
  lecture visuelle ; la page des sources montre cette limite.
- Les sources et les études acceptent PPTX. Les deux intake appellent le même
  lecteur documentaire ; les anciens DOC/PPT non pris en charge cessent d’être
  annoncés. Les fenêtres préexistantes PDF/Word des intake sont conservées.
  Extraction et éventuelle analyse restent deux étapes ; routes modèle,
  budgets, scoring et décisions d’usage restent sous les autorités existantes.
- La conservation de l’original dans le flux des sources reste distincte de
  l’extraction et utilise le reçu existant. Un texte extrait n’adopte ni une
  proposition ni une nouvelle édition. Les deux BMC successifs conservent leurs
  usages référence/proposition ; aucune mise à jour implicite des fondamentaux.

## Conséquences

Régressions ciblées : ordre déclaré plutôt que lexical, paragraphes et notes,
pièce manquante, relation distante requise, XML invalide/DTD/volume gonflé,
document sans texte, ancien PPT et octets opaques présentés comme texte. Les
tests distinguent reçu binaire et texte existant. La première passe rouge et
le préflight pur des douze présentations réelles du corpus sont consignés dans
les preuves privées ; le préflight n’a créé aucun dépôt réel PowerPoint.

Recette locale sur base synthétique reçue : source PPTX HTTP 200, extraction
texte/notes et original relu exact. Le refus binaire conserve l’original STORED
et une source FAILED sans pseudo-texte ; son HTTP 500 appartient au contrat
existant. Le dépôt natif sans IA, la consultation des notes et le téléchargement
exact sont reçus. Cinq écrans ouverts ; études, console et intake sont reçus au
rendu/sélection seulement, sans analyse automatique de bout en bout. Aucun
PowerPoint réel du corpus n’est déposé par cette recette.

Un auth/session 500 avec `SyntaxError: Unexpected end of JSON input` a été
observé pendant compilation dev ; cause non établie. La console reprise répond
200 sans erreur serveur ni exception dans la nouvelle fenêtre, sans effacer
l’incident initial ni recevoir une performance de production. Reprise au
prochain boot standalone exact : connexion/session et console avant production,
diagnostic si le refus se reproduit, logs/statuts conservés dans la dette C4/C7.

Gauntlet local définitif reçu : typage et deux lints sans erreur, tests et
gouvernance verts, zéro cycle. Les deux erreurs initiales de repère quick-intake
sont corrigées par 83→84 après l’import ; aucune nouvelle exception ni invariant
affaibli. Ces contrôles historiques restent ceux de 499. La source 499 fusionnée
a échoué au boot de l’image, avant `/login`
(build 39351802930) : `public-brand-migration.cjs` importait JSZip absent du
standalone. Aucune image 499 poussée ou déployée ; production 498 intacte.

La régression 500 bundle le vrai `freeze-public-brands` avec paquets externes,
absence de JSZip imposée et base vide simulée ; son rouge `MODULE_NOT_FOUND`
reproduit le couplage 499. Le chargement à la demande dans `readPptxText` corrige
la dépendance de démarrage, sans changer la lecture documentaire ni contourner
le contrôle. Rouge 499 puis vert 500 reçus. La CLI auxiliaire a également été
exercée sur PostgreSQL de recette détenu avec JSZip indisponible : exit 0,
zéro publication, aucune écriture production. Gauntlet local définitif 500 reçu :
4 848 tests / 454 fichiers, gouvernance 1 670 / 169, typage et deux lints sans
erreur, zéro cycle sur 1 770 fichiers, 24 avertissements historiques conservés.
La CLI auxiliaire n’est pas le boot du standalone exact ; CI, image et runtime
500 exacts restent à recevoir avant clôture de cette décision.
Les originaux acquis et les textes/notes lus ne prouvent pas la compréhension
des visuels. Toute conclusion dépendant d’une image ou d’un graphique doit être
qualifiée et reçue séparément.

La réception du transport 498 ferme le fichier individuel admissible, pas les
lots de cinq fichiers de dix Mio ni les études annoncées à 50 Mo : leur JSON
base64 peut dépasser seize Mio. Les 36 grands originaux restent aussi au contrat.
Résolution : raccorder ces chemins au transfert borné/reprenable existant à
étendre, puis recevoir interruption/rejeu, taille/empreinte exactes et
restauration. Déclencheur : prochain lot C2/C3/C7 de ces grands originaux, avant
réception de ces parcours. Aucun simple relèvement de tampon ou réduction du
périmètre annoncé ne vaut clôture.

Le contrôle de boot standalone existant appelle aussi `/api/auth/session` sans
cookie et refuse erreur HTTP ou JSON invalide avant publication de l’image.
Le refus d’une réponse HTML et l’acceptation de JSON `null` sont éprouvés au
contrôle pur ; la réponse du véritable endpoint standalone exact reste à
recevoir pendant le build. Ce contrôle n’est pas un correctif d’authentification.
