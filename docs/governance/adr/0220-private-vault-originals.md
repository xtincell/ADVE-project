# ADR-0220 — Originaux privés du coffre existant

- **Status**: Accepted — code, copie et runtime 497 reçus ; corpus en cours
- **Date**: 2026-10-19
- **Phase**: 7 — raccord du corpus réel / C2, C3, C4, C7
- **Depends on**: ADR-0012, ADR-0175, ADR-0197, ADR-0211, ADR-0212, ADR-0219
- **Supersedes**: activation implicite du premier logo et classement automatique au dépôt

## Contexte

Le corpus SPAWT comprend des documents, actifs matériels, archives et builds. Le
coffre `BrandAsset` existe ; son formulaire déposait une data URL en base,
activait le premier logo et lançait un classement sans choix. Sa recherche ne
portait que sur les cinquante premiers actifs. Le dépôt n'était donc pas une
conservation vérifiée, et pouvait être pris pour une décision d'identité.

Audit positif : CODE-MAP (`vault`, `original`, `FileUpload`), schéma Prisma,
brand-vault/engine, brand-theme, publication/public-media, ingestion/original et
collecteur de rétention. **BrandAsset, FileUpload, stockage et publication existent :
on les étend.** Aucun nouveau gestionnaire, modèle Prisma, router, Intent, Neter,
fournisseur ou compte. Le module et la route d'original complètent ces capacités.

## Décision

Sustainment, tutelle Mestor ; admission par LEGACY_BRAND_VAULT_CREATE/spine existant
(INFRASTRUCTURE). Primitive de persistance uniquement, aucun Glory tool de production
nécessaire. La continuité des actifs permet la production et la diffusion cohérentes
des marques, condition de l'accumulation d'audience ; aucun résultat marketing déduit.

- Le fichier de dix Mio au plus rejoint le FileUpload existant (BRAND_ASSET), avec
  reçu asset-original-v1. Chiffrement, empreinte, contrôle de taille, reprise PENDING
  et vérification sont partagés avec les originaux documentaires. L'admission est
  persistée avant l'IO ; un objet corrompu n'est jamais écrasé. Les clefs et objets
  ne sont pas retournés au client. Le spine existant scelle l’empreinte et la taille
  des dépôts documentaires/matériels, sans recopier le base64 dans son journal.
  L’entrée du handler reste intacte et les anciens sceaux ne sont pas réécrits. L'original n'est pas un texte ni une validation.
- CANDIDATE est le statut du dépôt. La sélection existante devient explicite dans
  Mes actifs. Ni activation ni publication automatique ; un candidat reçu ne peut
  devenir l'identité de repli. Les anciens actifs restent conservés.
- Un ID Drive distinct reste une origine distincte, même pour des octets identiques.
  Le rejeu exact conserve l'actif ; de nouveaux octets de la même origine forment
  une édition enfant CANDIDATE, sans déclasser ni adopter une autre édition.
- La suggestion de classement existante est facultative et désactivée par défaut.
  Elle utilise nom et contexte, pas une lecture visuelle. Les choix manuels et
  métadonnées de classement ne sont plus effacés par cette suggestion.
- La route authentifiée contrôle la marque actuelle et sert une pièce jointe
  exacte, non exécutable et non cachable. Seul un raster reconnu puis décodé peut
  produire un aperçu PNG. Ni SVG, police ni archive n'est exécuté par ce parcours.
- La publication existante peut choisir un original sélectionné. Elle vérifie et
  conserve une copie publique immuable avant publication ; la route privée ne
  devient jamais la ressource de l'édition publique. Les contrôles SVG/police et
  les empreintes de sélection restent appliqués.
- Filtres serveur avant pagination, ordre stable et page de cinquante. Les compteurs
  décrivent les actifs affichés. Archives accessibles et réutilisables par sélection explicite d’une édition reçue ; purge des actifs avec original
  refusée, afin de préserver le fichier et l'historique.

## Conséquences

Aucune ingestion massive, lecture sémantique, licence de publication ou adoption
stratégique n'est déduite d'un dépôt. Le classement affiné des 841 éléments distingue 831 matériaux, neuf
pièces documentaires et une métadonnée technique. Les matériaux tiennent dans la
borne actuelle ; APK/archives de plus grande taille et documents restants demeurent
au contrat global. La roadmap mêlant plusieurs IP et données personnelles conserve
son original dans son périmètre privé ; pas de partage intégral dans une marque.

Tests : recette PostgreSQL gouvernée dédiée (concurrence, édition, isolement,
corruption, reprise, archivage, recherche >50, publication explicite), régression
des originaux documentaires et suite de gouvernance. Réception native et runtime 497 reçus. Neuf pièces documentaires et un
premier matériau Drive ont ensuite été relus exactement, sans adoption. Le premier
fichier de neuf Mo a révélé une troncature du proxy avant admission ; 498 porte le
tampon existant à seize Mio et conserve la borne des fichiers à dix Mio. Clone réel
rouge puis vert et HTTP authentifié maximal/refus hors borne reçus sur copie ;
runtime 498 et reste du corpus encore ouverts. Aucun chantier entier reçu par cette unité.
