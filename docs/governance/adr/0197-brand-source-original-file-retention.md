# ADR-0197 — conserver l’original d’une source déposée

- **Status**: Accepted
- **Date**: 2026-10-06
- **Phase**: 27 — continuité documentaire
- **Depends on**: ADR-0184, ADR-0196

## Contexte

Le dépôt `ingestion.uploadFile` extrait du texte puis abandonne le binaire. Une source
PDF paraît conservée mais aucun téléchargement ne permet de retrouver le fichier reçu.
Le redépôt crée une nouvelle source. Une correction du texte ne doit jamais réécrire
l’original. Ces trous empêchent la reprise des dossiers et la réception de leur corpus.

L’audit anti-doublon de CODE-MAP et des quatre surfaces retrouve `BrandDataSource`,
`FileUpload`, `encrypted-media-store`, le pipeline d’ingestion et la page Sources.
`FileUpload` ne possède aucun écrivain applicatif ; le stockage privé existe déjà pour
les preuves créatives. Les `KnowledgeEntry` d’études conservent un texte RAW, pas le
binaire. `BrandAsset` représente un actif métier, pas toute pièce documentaire reçue.
Verdict : étendre ces primitives, sans nouveau service, table, score ou agent.

## Décision

- Sous-système Console/Admin, tutelle INFRASTRUCTURE par le geste existant
  `LEGACY_INGESTION_UPLOAD_FILE`. Persistance pure, sans génération : pas de Glory tool.
- Relier facultativement un `FileUpload` unique à une `BrandDataSource`. Son reçu
  contient empreinte, taille, objet chiffré et état de conservation. Les anciennes
  sources restent consultables et signalent explicitement l’absence d’original.
- Réutiliser le magasin privé AES-GCM et ses limites. Sa maintenance consulte aussi
  les reçus `FileUpload` pour ne pas purger les originaux encore rattachés.
- Borner à 10 Mio et vérifier strictement l’encodage avant écriture. Sérialiser
  l’admission par marque et empreinte, puis le reçu par ligne source. Un nouvel essai
  reprend un dépôt incomplet. Un dépôt déjà reçu ne remplace pas un texte corrigé.
- Le rattachement explicite d’un fichier à une ancienne source compare l’extraction
  déterministe exacte ; un nom similaire ne constitue pas une preuve suffisante.
- L’original est téléchargé par une route authentifiée avec le garde de marque
  existant et sans cache public. Aucune URL du stockage privé ne sort du serveur.
- Les décisions ADVE et la préparation assistée restent explicites. Le binaire reçu
  ne rend aucune assertion officielle ni validée. Entrée fichier → texte extrait
  → source consultable → exploitation volontaire par les capacités existantes.

## Conséquences

L’activation exige un stockage privé persistant et sa clé, inclus dans le plan de
sauvegarde. Un stockage absent refuse honnêtement un nouveau dépôt ; il ne prétend
pas conserver un fichier. La recette inclut concurrence, redépôt après correction,
lecture des octets, panne/récupération, refus hors marque et retrait d’orphelins.
Le partage d’une source entre marques reste un raccord distinct : ce reçu n’accorde
aucun accès supplémentaire à une autre marque ou entreprise.
