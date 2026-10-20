# ADR-0224 — Originaux reçus et repris dans l’intake existant

- **Status**: Accepted — implémentation 6.27.508 testée et reprise compilée locale reçues ; CI/image/runtime et réception commerciale distincts, non reçus
- **Date**: 2026-10-20
- **Phase**: 7 — MVP-FUSEE-02, conservation et reprise de l’import
- **Depends on**: ADR-0197, ADR-0198, ADR-0219, ADR-0221
- **Supersedes**: aucun ; étend intake, FileUpload et conservation privée existants

## Contexte

La recette 507 reçoit un refus modèle explicite, mais texte/nom en base ne
réapparaissent pas après reload et aucun original n’est conservé pour le TXT.
Le dépôt doit rester utilisable après fermeture ou fournisseur indisponible.
QuickIntake, FileUpload, BrandDataSource, source-original-v1 et stockage chiffré
existent : aucun second magasin ni gestionnaire requis. Original reçu, texte
extrait et position stratégique demeurent distincts, sans adoption implicite.

Registre exécuté le 20 octobre 2026 : **633 kinds**, dont
LEGACY_QUICK_INTAKE_PROCESS_INGEST et LEGACY_QUICK_INTAKE_COMPLETE, tous deux
INFRASTRUCTURE/handler quick-intake.
Aucun kind ajouté ou gouverneur changé. Le numéro suit la séquence du dépôt
courant et la priorité à la date de commit ; une proposition non committée
dans un autre clone ne réserve pas ce numéro. Aucune fonctionnalité du
candidat 505 n’est transposée ici.

## Décision

- Primitive dans quick-intake/document-input, FileUpload et fonctions privées
  de conservation/vérification existantes. Dépôt avant préflight modèle, une
  requête par fichier dans la limite existante de dix Mio, cinq au maximum pour
  le diagnostic. Texte/liens conservés même si une étape ultérieure échoue.
- Plan FileUpload et reçu PENDING avant IO ; STORED seulement après relecture
  physique des octets, taille et empreinte. Rejeu exact vers le même reçu/objet,
  corruption ou divergence refusée. Un STORED se reprend depuis le serveur
  sans redéposer ; un PENDING n’est pas présenté comme reçu complet.
- Lecture par bearer du même QuickIntake et FileUpload ; identifiant de fichier
  seul ou token étranger ne donne aucun accès. GET privé/no-store, pièce jointe,
  sans referrer. Aucune nouvelle autorité inter-intake ou inter-marque.
- Persistance sans modèle, tracée par openEmission/closeEmission, kind existant
  LEGACY_QUICK_INTAKE_PROCESS_INGEST, caller quick-intake:retain-sources, selon
  le pattern media-archive. Le spine reçoit identité, tailles/empreintes et
  résultat ; ni token bearer ni base64. Échec journalisé explicitement.
- `persistCompletedIntake`, dans le même module, utilise le kind existant
  LEGACY_QUICK_INTAKE_COMPLETE/caller quick-intake:bind-sources. À complete,
  mêmes FileUpload.sourceId/objectKey rattachés aux BrandDataSource de la
  stratégie atomiquement avec COMPLETED, statut EXTRACTED ou FAILED honnête. Pas de nouvelle copie physique ; un
  reçu incomplet ne devient pas reçu complet par la seule complétion. Ce lien
  ne certifie ni extraction, ni assertion, ni décision de marque.

## Conséquences

Aucun nouveau modèle Prisma, service enregistré, routeur tRPC, Intent,
fournisseur ou gestionnaire ; pas de migration. Persistance et téléchargement
restent distincts de l’analyse facultative. Refus fournisseur explicite sans
perte de source ni audit faussement déclaré réussi.

Treize tests PostgreSQL reçus : garde ownership retirée volontairement, rouge
réel puis restauration exacte et treize verts. Recette locale partielle :
enregistrement puis refus modèle, reprise sans file input et téléchargement
de l’original de 665 octets avec SHA exact
`d53dbf6320cb0ed2b88f66e846aa33a6845858c1a79d15b263aaa5895b14f523` ;
trois réponses 200/fenêtre complète
sans erreur. Vrai GET propriétaire 200/exact, mauvais intake/inconnu 404.
Premier header global écrasant no-referrer conservé ; vrai GET local final
200/no-referrer reçu. Fermeture/réouverture import reçue : texte saisi de 104
caractères et original distinct de 665 octets exact conservés. Ingest-plus : site/liens sociaux repris,
dépôts 200 puis 412 modèle indisponible attendu ; fallback questionnaire du même
intake reçu. Natif compilé local : import HTTP 200, DOM 133,3 ms/titre observé ≤308 ms pilote compris, 28 réponses sans ≥500/exception/échec ; ingest-plus HTTP 200, DOM 77,5 ms/titre ≤248 ms, 29 réponses sans erreur. Fenêtres complètes ; dépôts reçus puis refus modèle explicites (trois réponses 200 pour import ; 200/200/412 pour ingest-plus), aucune analyse reçue. Original HTTP 200/665 octets exact/no-referrer. Deadlines et échecs dev conservés, pas de SLO global.

Build webpack et neuf contrôles finaux reçus : 4 883 unitaires/456 fichiers, gouvernance 1 671/169, PostgreSQL 414/23 dont les treize nouveaux, tsc/deux lints sans erreur, 24 avertissements historiques par lint, zéro cycle.
Premier refus de séquence 223→225 conservé ; renumérotation réelle 0224,
sans placeholder, allowlist ou test affaibli, puis relance finale verte.
ADR Accepted pour l’implémentation testée ; CI/image/runtime508 restent des
réceptions séparées, 508 non livré. Échec import507 conservé, dette de production
ouverte. Rapport, export, choix agentique, coût/qualité modèle, propriétaire/offre
et conversion restent dans les étapes existantes du MVP, sans nouveau chantier.
Admission et conservation globales sont à vérifier via les mécanismes existants
au MVP-FUSEE-05/C7 avant réception commerciale, sans politique arbitraire déduite.

Preuves privées complémentaires : `release/preuves-intake-reprise-20261020/`
(`import508-native-received.json`, `import508-plus-native-received.json`,
`import508-http-original-header-final.json`, `import508-same-intake-fallback.json`,
`compiled508-ingest-received.json`, `compiled508-plus-received.json`,
`compiled508-http-received.json`) et
`release/preuves-mvp-commercial-20261020/gauntlet508-final2-results.json`.
