# ADR-0034 — Console : namespace `/oracle/*` réservé à la SEULE compilation, pilotage opérateur déplacé sous `/strategy-portfolio/*`

**Date** : 2026-05-03
**Statut** : accepted
**Phase de refonte** : phase/2-intents (suite ADR-0024 — drift résiduel)
**Supersedes (partial)** : [ADR-0024](0024-console-oracle-namespace-cleanup.md) sur la décision de laisser `/console/oracle/{clients, brands, diagnostics}` en place

## Contexte

ADR-0024 (2026-05-02) avait déplacé les pages workflow opérateur préparatoire (`intake`, `brief-ingest`, `boot`, `ingestion`) hors de `/console/oracle/*` vers `/console/strategy-operations/*`, et renommé `/console/oracle/proposition` en `/console/oracle/compilation`. **Mais** cette ADR avait laissé `/console/oracle/{clients, brands, diagnostics}` en place au prétexte qu'elles formaient le "tour de garde Oracle (pilotage opérateur des stratégies dont l'Oracle est compilé)".

Drift résiduel détecté en session NEFER 2026-05-03 par le user (Alexandre) : **le namespace `/console/oracle/*` continue à induire en erreur même limité au "tour de garde"**. La page `/console/oracle/clients` n'est pas un Oracle — c'est un **bilan de marque** (CRM-like : liste des clients UPgraders avec leurs marques + scores ADVE moyens). De même `/console/oracle/brands` est la fiche détaillée d'une Strategy (radar ADVERTIS, sections, drivers — la fiche opérateur d'une marque pilotée), pas le livrable Oracle. Et `/console/oracle/diagnostics` est un dashboard santé pipeline, pas Oracle.

Le terme "tour de garde Oracle" lui-même perpétuait la sur-pondération du livrable Oracle comme pivot du pilotage opérateur — drift NEFER §7 explicite : *"Sur-pondérer un livrable particulier (ex : Oracle) comme 'le' produit central → STOP. Tous les `BrandAsset.kind` sont pairs dans la cascade Glory→Brief→Forge."*

Pages restantes sous `/console/oracle/*` après ADR-0024 :

| Path | Réalité métier | Catégorisation correcte |
|---|---|---|
| `/console/oracle/clients` | Liste CRM des clients UPgraders + leurs marques | Pilotage opérateur — portfolio |
| `/console/oracle/clients/[strategyId]` | Fiche client détaillée + ses marques | Pilotage opérateur — portfolio |
| `/console/oracle/brands` | Liste des Strategy (marques pilotées) | Pilotage opérateur — portfolio |
| `/console/oracle/brands/[strategyId]` | Radar ADVERTIS + sections + drivers d'une marque | Pilotage opérateur — portfolio |
| `/console/oracle/diagnostics` | Diagnostic santé pipeline opérateur | Pilotage opérateur — portfolio |
| `/console/oracle/compilation` | Compile le livrable Oracle 35-section | **VRAIE compilation Oracle** — reste |

## Décision

Déplacer les 5 pages "pilotage opérateur" sous un nouveau namespace **`/console/strategy-portfolio/*`**, symétrique de `/console/strategy-operations/*` (créé par ADR-0024). Trio cohérent qui boucle la désambiguïté :

| Namespace | Rôle | Exemples |
|---|---|---|
| `/console/strategy-operations/*` | **Préparer** la matière piliers (workflow opérateur amont) | intake, brief-ingest, boot, ingestion |
| `/console/strategy-portfolio/*` | **Surveiller / piloter** les marques actives (dashboards opérateur) | clients, brands, diagnostics |
| `/console/oracle/*` | **Compiler** le livrable Oracle (et SEULEMENT cela) | compilation |

### Renommages effectués (5 dossiers déplacés via `git mv`)

| Avant | Après |
|---|---|
| `src/app/(console)/console/oracle/clients/page.tsx` | `src/app/(console)/console/strategy-portfolio/clients/page.tsx` |
| `src/app/(console)/console/oracle/clients/[strategyId]/page.tsx` | `src/app/(console)/console/strategy-portfolio/clients/[strategyId]/page.tsx` |
| `src/app/(console)/console/oracle/brands/page.tsx` | `src/app/(console)/console/strategy-portfolio/brands/page.tsx` |
| `src/app/(console)/console/oracle/brands/[strategyId]/page.tsx` | `src/app/(console)/console/strategy-portfolio/brands/[strategyId]/page.tsx` |
| `src/app/(console)/console/oracle/diagnostics/page.tsx` | `src/app/(console)/console/strategy-portfolio/diagnostics/page.tsx` |
| `src/app/(console)/console/oracle/compilation/page.tsx` | **inchangé** (vraie compilation Oracle) |

### Propagation (sed atomique sur 12 fichiers code + 6 fichiers docs)

**Code (`src/`, `tests/`)** — patterns `/console/oracle/clients`, `/console/oracle/brands`, `/console/oracle/diagnostics` → `/console/strategy-portfolio/$1` :
- `src/proxy.ts` (3 alias `/impulsion/*`)
- `src/components/navigation/portal-configs.ts` (1 entrée Brand Instances)
- `src/components/navigation/command-palette.tsx` (1 entrée + section "Console > Oracle" → "Console > Portfolio Marques")
- `src/app/(console)/console/page.tsx` (2 entrées + DivisionCard "L'Oracle" renommée "Portfolio Marques")
- `src/app/(console)/console/oracle/compilation/page.tsx` (breadcrumb `Console > Artemis > L'Oracle`, plus de pointage cross vers clients)
- `src/app/(console)/console/socle/pipeline/page.tsx` (1 lien deal → fiche client)
- `src/app/(console)/console/mestor/recos/page.tsx` (1 lien reco → fiche client)
- 4 pages déplacées (auto via `git mv` puis sed sur leurs liens internes)
- `tests/e2e/console.spec.ts` (5 lignes goto + libellés tests)

**Breadcrumbs `{ label: "Oracle" }` dans les pages déplacées** → `{ label: "Portfolio Marques" }` (sed scoped à `src/app/(console)/console/strategy-portfolio/`).

**Docs gouvernance actives** :
- `NEFER.md` §0.3 LEXICON entry "Oracle" — liste les 2 surfaces UI canoniques (`/cockpit/brand/proposition` + `/console/oracle/compilation`) + interdit explicite de toute autre page sous `/console/oracle/*`.
- `LEXICON.md` (entry `ArchivedStrategiesModal` bouton trigger path)
- `DIMENSIONS.md` (exemple page filter)
- `REFONTE-PLAN.md` (entrée NSP harmonisation)
- `architecture_console_levels.md` (memory user — bouton "Creer une marque")
- `ADR-0024` — section "Surveillance" amendée pour pointer vers ADR-0034 (decision de "laisser en place" superseded)
- `ADR-0028` — refs `/console/oracle/brands` annotées avec note historique pointant vers ADR-0034

**Sources de vérité auto-régénérées** : `PAGE-MAP.md`, `CODE-MAP.md` régénérées post-merge via leurs scripts dédiés.

### Hors scope

- **Redirection HTTP 301** des anciens paths : pas implémentée (cohérent avec ADR-0024 — audience interne UPgraders, pas de bookmark public connu).
- **Renommage de la `division-color` token** `--color-division-oracle` qui colore désormais la division "Portfolio Marques" : laissé tel quel pour ne pas imploser la cascade design tokens — un sweep séparé pourra renommer en `--color-division-portfolio` si nécessaire.
- **Le label "L'Oracle" de la sidebar** sous Artemis (commit `9147b3c`) : reste correct — c'est bien le livrable Oracle qui figure là, sous le Neter qui le produit.

## Conséquences

### Positives

- **Drift narratif fermé pour de bon** : le namespace `/console/oracle/*` ne contient désormais **qu'une seule page** (`compilation`), qui est **vraiment** la compilation Oracle. Plus aucune ambiguïté physique via routing.
- **NEFER §7 satisfait** : le drift "sur-pondérer un livrable particulier" n'a plus de support physique côté Console. Un nouvel opérateur cherchant "où voir mes clients" tombe sur `/console/strategy-portfolio/clients`, pas sur `/console/oracle/clients` (qui aurait suggéré un workflow Oracle-centric).
- **Symétrie sémantique** : `strategy-operations` (préparer) ↔ `strategy-portfolio` (surveiller) ↔ `oracle/compilation` (compiler) forme un trio explicite qui boucle l'arc complet du pilotage marque côté Console.
- **Cohérence avec ADR-0023** : `OPERATOR_AMEND_PILLAR` (édition piliers ADVE) ne se trouve toujours pas dans `/console/oracle/*` (déjà acté ADR-0024) — la cohérence est désormais totale.
- **Cohérence avec PANTHEON / 4 portails** : le livrable Oracle vit côté founder dans `/cockpit/brand/proposition` (consommation), et côté opérateur dans `/console/oracle/compilation` (production). Rien d'autre n'est Oracle.

### Négatives / risques

- **5 dossiers déplacés + 12 fichiers code patchés + 6 fichiers docs** en un sweep : mitigation par `git mv` (préserve l'historique git blame), `sed` atomique avec validation grep négatif post-rename, typecheck + audit governance + preview browser screenshot pour vérification visuelle.
- **L'ADR-0024 est partiellement superseded** : pour préserver l'archéologie, ADR-0024 reste accepted (son spirit demeure : Oracle namespace ≠ workflow), mais sa section "Hors scope" qui justifiait de "laisser en place" `/clients,brands,diagnostics` est maintenant obsolète. Annotation `Superseded-By: ADR-0034` ajoutée.

### Surveillance

- Test bloquant à ajouter dans une PR ultérieure : `tests/unit/governance/console-namespace-purity.test.ts` qui vérifie que **seul `compilation` existe sous `src/app/(console)/console/oracle/`** — toute nouvelle page `/console/oracle/<x>` (où x ≠ compilation) sera rejetée par CI. À l'image du test `pillar-schema-coherence.test.ts` (ADR-0023).
- `PAGE-MAP.md` régénéré pre-commit exposera tout retour en arrière.
- Convention NEFER §0.3 LEXICON mappings mise à jour (cf. patch concomitant).

## Liens

- ADR-0014 — Oracle 35-section framework canonical (qu'est-ce qu'un Oracle compilé)
- ADR-0023 — OPERATOR_AMEND_PILLAR (édition piliers ADVE)
- ADR-0024 — Console oracle namespace cleanup (premier sweep — supersedé partiellement par celui-ci)
- NEFER.md §0.3 LEXICON mappings + §7 drift signals (mise à jour synchronisée)
- CLAUDE.md (Oracle = un livrable parmi N — déjà à jour)
- CHANGELOG.md (entry v6.1.28)
- PAGE-MAP.md (régénération post-merge)
