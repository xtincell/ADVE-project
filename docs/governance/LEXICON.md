# LEXICON — Glossaire normatif — absorbé dans la bible

> Ce canon a été **absorbé** dans la bible du projet (consolidation 2026-05).
> Source de vérité unique : [STATE_FINAL_BLUEPRINT.md → ANNEXE CANON L](STATE_FINAL_BLUEPRINT.md#annexe-canon-l--lexique-normatif).
>
> Ne plus éditer ici. Toute mise à jour se fait dans la bible.

### Original d’une source — ADR-0197 (2026-10-06)

`BrandDataSource.originalUpload` relie le `FileUpload` reçu et chiffré. Son empreinte
identifie les octets déposés, indépendamment du texte de travail corrigible. Un
reçu de stockage ne vaut ni confirmation d’une assertion ni accord du client.

### Usage documentaire — ADR-0198 (2026-10-07)

Voir la définition dans [la bible, annexe L](STATE_FINAL_BLUEPRINT.md#usage-documentaire).
`BrandSourceUse` relie une pièce canonique à une marque consommatrice ; les reçus
enregistrent la version lue, sans copier le document ni confirmer son contenu.

### Édition documentaire — ADR-0219 (2026-10-19)

`BrandDataSource.rawData._document` relie les éditions d’un même document. `PROPOSED` désigne une piste non validée, `REFERENCE` une référence de travail, sans certification des assertions. Les éditions antérieures et archives restent consultables. Les décisions datées et attribuées changent l’usage documentaire ; seules les commandes d’amendement existantes modifient le socle stratégique.

### Original d’un actif — ADR-0220 (2026-10-19)

Le coffre `BrandAsset` conserve son original dans `FileUpload` (BRAND_ASSET), reçu
asset-original-v1, distinct du contenu interprété. Un dépôt CANDIDATE attend un
choix ; il ne vaut ni sélection, ni activation, ni publication. Les éditions par
origine conservent leurs octets et leur filiation.
