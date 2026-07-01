# ADR-0032 — Niveau de certitude des sources + persistence des artefacts intake

**Date** : 2026-05-03
**Status** : Accepted
**Auteurs** : NEFER (PR-A)
**Supersede** : —
**Lié** : [ADR-0012](0012-brand-vault-superassets.md) (BrandVault unifié), [ADR-0015](0015-brand-asset-kind-extension.md) (extension BrandAsset.kind), [ADR-0027](0027-rag-brand-sources-and-classifier.md) (sources RAG + classifier), [ADR-0030](0030-intake-closure-adve-100pct.md) (closure intake ADVE)

---

## 1. Contexte

Audit post-test live (NEFER) sur le flow intake → marque a confirmé **trois drifts** dans la persistence des sources :

1. **Asymétrie `activateBrand` vs `convert`** — Le router `quick-intake.ts` a deux chemins de promotion intake → strategy : `convert` (admin) crée un `BrandDataSource` MANUAL_INPUT mirroring les responses du formulaire ; `activateBrand` (public self-serve, le chemin réel utilisé via la landing) **ne crée rien** dans `BrandDataSource`. Conséquence : 90% des marques activées par les fondateurs n'ont **aucune source** dans leur vault, alors que les 10% activées par admin en ont une.

2. **PDF rapport intake jamais persisté** — Le service `renderIntakePdf` (puppeteer) génère le PDF à chaque clic sur le bouton "Télécharger". Aucun `BrandAsset` n'est créé. Si le fondateur ferme l'onglet sans télécharger, l'asset n'apparait nulle part dans le vault, alors qu'il s'agit du **livrable synthétique le plus précieux** du diagnostic (composition complète ADVE + RTIS + recommandation Mestor + classification + verbatim).

3. **Absence de hiérarchie de confiance** — Toutes les sources étaient traitées comme égales. Un upload de KBIS officiel et un texte libre extrait par IA depuis l'intake avaient le même poids dans Notoria/Artemis/Ptah. Conséquence : hallucinations IA (cf. ADR-0030 PR-Fix-2 "française" sur strategy WK) remontaient au même niveau que des faits déclarés ou vérifiés. Pas de levier opérateur pour down-weighter ou exclure les sources peu fiables.

## 2. Décision

### Couche 1 — Symétrie complète `activateBrand` ⇔ `convert`

`activateBrand` crée désormais à activation :
- un `BrandDataSource` MANUAL_INPUT identique à celui produit par `convert`, avec `responses` brutes + `rawText` + business context aplati
- un `BrandAsset` kind=`INTAKE_REPORT` family=INTELLECTUAL state=ACTIVE pointant vers `/api/intake/[token]/pdf` (le PDF reste régénéré à la volée — on stocke le **pointeur**, pas le blob)

Les deux créations sont **idempotentes** (guarded par `findFirst` sur `(strategyId, origin)` pour la source et `(strategyId, kind=INTAKE_REPORT)` pour l'asset). Re-runner `activateBrand` ne duplique pas. Wrapped en try/catch non-fatal — l'activation prime sur la trace.

### Couche 2 — Nouveau kind `INTAKE_REPORT`

Ajouté à `BRAND_ASSET_KINDS` (`src/domain/brand-asset-kinds.ts`) suivant le pattern non-cassant ADR-0015 (extension du tableau, pas de migration enum Prisma — `BrandAsset.kind` reste `String @default`). Mappé à pillar `A` dans `KIND_TO_PILLAR` (le rapport intake est un portrait du pilier Authenticité initial : ADN, légitimité, fondations).

Pourquoi un nouveau kind plutôt que réutiliser `GENERIC` ou `SEO_REPORT` : un opérateur qui scanne le vault doit distinguer en un coup d'œil les artefacts venus de l'intake (snapshot d'entrée) des autres rapports synthétiques. Le filtrage `kind=INTAKE_REPORT` permet aussi à PR-B (`INTAKE_SOURCE_PURGE_AND_REINGEST`) de cibler précisément ces assets sans heuristique.

### Couche 3 — Champ `BrandDataSource.certainty` + taxonomie 4 niveaux

Nouveau champ `String @default("DECLARED")` sur `BrandDataSource`. Taxonomie ordonnée du plus fiable au moins fiable (cf. `src/domain/source-certainty.ts`) :

| Niveau | Sémantique | Exemple |
|---|---|---|
| `OFFICIAL` | Pièce vérifiée | KBIS, contrat signé, deck investor, audit |
| `DECLARED` | Déclaré fondateur/opérateur | Intake, saisie manuelle, brief |
| `INFERRED` | Extrait IA | OCR, chunking texte libre, autoresponse |
| `ARBITRARY` | Décrété sans source | Placeholder, hypothèse de travail |

**Default `DECLARED`** — bascule l'assomption précédente "tout est vrai" vers "tout est déclaré sauf preuve du contraire". Override via `ingestion.updateSource` (PATCH côté cockpit). Backfill des rows pré-migration : DECLARED par défaut SQL.

L'ordre du tableau reflète la confiance décroissante — exploitable en aval par Notoria (down-weighting INFERRED), Seshat (filtrage scoring), Artemis (gate sur `certainty >= DECLARED` pour briefs sensibles).

### Couche 4 — Champ `BrandDataSource.origin` (anti-doublon ADR-0032)

Nouveau champ `String?` indexé. Format : `intake:<intakeId>` / `manual:<userId>` / `upload:<sha256>`. Permet à PR-B de retrouver la source intake à purger sans heuristique sur `fileName`. Dédup naturel pour `activateBrand` réentrant (findFirst guard).

### Couche 5 — UI cockpit `/cockpit/brand/sources`

Badge cliquable `CertaintyBadge` à côté de chaque source : icône (Shield/ShieldCheck/ShieldAlert/ShieldQuestion) + label FR + couleur sémantique (emerald=OFFICIAL, blue=DECLARED, amber=INFERRED, zinc=ARBITRARY). Click ouvre un `<select>` natif overlay qui PATCH la certainty via `ingestion.updateSource`. Mobile-friendly (clavier natif), pas de focus-trap à maintenir.

## 3. Migration

`prisma/migrations/20260503030000_brand_data_source_certainty_origin/migration.sql` :

```sql
ALTER TABLE "BrandDataSource"
  ADD COLUMN "certainty" TEXT NOT NULL DEFAULT 'DECLARED';
ALTER TABLE "BrandDataSource"
  ADD COLUMN "origin" TEXT;
CREATE INDEX "BrandDataSource_certainty_idx" ON "BrandDataSource"("certainty");
CREATE INDEX "BrandDataSource_origin_idx" ON "BrandDataSource"("origin");
```

Migration safe (NOT NULL avec default, idempotente, indexes additifs). Tous les rows existants héritent `certainty=DECLARED`, `origin=NULL`.

## 4. Conséquences

**Positives** :
- Toutes les marques activées (admin + self-serve) ont désormais le même audit trail dans le vault sources.
- Le rapport ADVE est référencé comme un asset officiel de la marque dès l'activation.
- L'opérateur peut hiérarchiser ses sources et l'exploit downstream (Notoria gate, Seshat scoring).
- PR-B peut s'appuyer sur `origin` pour cibler la source intake atomiquement.

**Négatives** :
- Une migration Prisma supplémentaire (mais minimaliste, idempotente).
- Un nouveau kind `INTAKE_REPORT` à maintenir dans `KIND_TO_PILLAR` (couvert par test anti-drift exhaustivity).
- Couplage léger entre `quick-intake.ts` et la génération PDF (le pointer `downloadUrl` dans BrandAsset.content suppose la route `/api/intake/[token]/pdf`).

**Neutres** :
- Le PDF lui-même reste éphémère — on tracé l'asset dans le vault mais le blob est régénéré à chaque download. Si on veut un blob durable plus tard, c'est un add-on (BrandAsset.fileUrl + storage backend), pas un breaking change.

## 5. Anti-drift

- `tests/unit/services/source-classifier.test.ts` couvre déjà l'exhaustivity `BRAND_ASSET_KINDS ⊂ KIND_TO_PILLAR` — INTAKE_REPORT="A" satisfait.
- Pre-commit hook husky régénère `docs/governance/CODE-MAP.md` avec les nouvelles entrées.
- `convert` (admin) et `activateBrand` (self-serve) partagent désormais la même logique de création BrandDataSource — un futur drift sur l'un sera visible par diff side-by-side.

## 6. Suite

PR-B (`INTAKE_SOURCE_PURGE_AND_REINGEST`) s'appuie directement sur `origin="intake:<id>"` pour cibler la source à purger atomiquement via Mestor Intent. Sans ADR-0032, PR-B aurait dû heurister sur `fileName` (fragile).
