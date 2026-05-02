# ADR-0024 — Console : namespace `/oracle/*` réservé à la compilation, workflow opérateur déplacé sous `/strategy-operations/*`

**Date** : 2026-05-02
**Statut** : accepted
**Phase de refonte** : phase/2-intents (co-shippé avec ADR-0023 OPERATOR_AMEND_PILLAR)

## Contexte

Le namespace `/console/oracle/*` mélangeait historiquement deux concepts incompatibles :

1. **Compilation Oracle** — la génération du livrable BrandAsset 35-section consolidé via `SECTION_REGISTRY` (cf. ADR-0014). Page concernée : `/console/oracle/proposition` ("operator-side index of every strategy the console can drive an Oracle for").
2. **Workflow opérateur en amont** — ingestion de briefs PDF, intake quick form, boot sequence post-onboarding. Pages concernées : `/console/oracle/{intake, brief-ingest, boot, ingestion}`. Ces pages n'ont **rien à voir avec le livrable Oracle** ; elles préparent les données piliers ADVERTIS qui seront consommées par N livrables (Oracle inclus, mais aussi briefs Artemis, claims, KV, manifestos, big ideas, etc.).

Drift narratif réel détecté en session NEFER : l'agent (et par extension les nouveaux contributeurs) sur-pondéraient Oracle comme "le" livrable canonique au prix de la cascade Glory→Brief→Forge dans laquelle Oracle n'est qu'un kind de `BrandAsset` parmi N. Le fait que le namespace Console privilégie "Oracle" pour des pages qui n'ont rien à voir avec le livrable amplifie ce drift à chaque parcours navigationnel.

Pages restantes sous `/console/oracle/*` qui restent sémantiquement valides (mais ambiguës) : `/clients`, `/brands`, `/diagnostics` — elles concernent bien le tour de garde Oracle (pilotage opérateur des stratégies dont l'Oracle est compilé). Elles restent en place.

## Décision

On déplace les pages workflow opérateur sous un nouveau namespace `/console/strategy-operations/*`, et on renomme `/console/oracle/proposition` en `/console/oracle/compilation` pour expliciter que c'est bien la compilation du livrable.

### Renommages effectués

| Avant | Après | Justification |
|-------|-------|---------------|
| `src/app/(console)/console/oracle/intake/` | `src/app/(console)/console/strategy-operations/intake/` | Quick intake form ≠ compilation Oracle |
| `src/app/(console)/console/oracle/brief-ingest/` | `src/app/(console)/console/strategy-operations/brief-ingest/` | Upload PDF brief → preview → execution hyperviseur ; alimente piliers ADVE, pas livrable Oracle |
| `src/app/(console)/console/oracle/boot/` | `src/app/(console)/console/strategy-operations/boot/` | Séquence de démarrage post-intake (Mestor decisions → Artemis briefs → Ptah assets) ; pipeline d'activation, pas Oracle |
| `src/app/(console)/console/oracle/ingestion/` | `src/app/(console)/console/strategy-operations/ingestion/` | Orchestrateur ingestion sources (uploads PDF, DOCX, XLSX, IMG) avec extraction LLM ; alimente piliers, pas Oracle |
| `src/app/(console)/console/oracle/proposition/` | `src/app/(console)/console/oracle/compilation/` | C'est **la** vraie page Oracle — explicite "compilation" plutôt que "proposition" qui était ambigu |
| `src/app/(console)/console/oracle/{clients, brands, diagnostics}/` | inchangés | Sémantiquement valides : tour de garde Oracle (pilotage opérateur) |

### Propagation

17 références internes mises à jour en synchronisation (sed + Edit) :
- `src/components/navigation/portal-configs.ts` (2 entrées + label "L'Oracle" → "Compilation Oracle")
- `src/components/navigation/command-palette.tsx` (3 entrées + sections "Console > L'Oracle" → "Console > Strategy Ops" pour les 2 pages déplacées, "Console > Oracle" pour clients qui reste)
- `src/app/(console)/console/page.tsx` (2 quick actions + 1 alert link)
- `src/app/(console)/console/oracle/brands/page.tsx` (1 lien intake)
- Pages renommées elles-mêmes (commentaires `ROUTE:` + JSDoc + nom export)
- `tests/e2e/cascade-full.spec.ts:21`
- `tests/e2e/console.spec.ts:31, 37`

Sources de vérité gouvernance régénérées en post-merge : `PAGE-MAP.md`, `CODE-MAP.md`.

### Hors scope

- Le repointage des outils Glory tools internes qui appellent ces pages (aucun trouvé en grep — toutes les pages sont des entry points navigationnels).
- L'éventuelle **redirection HTTP 301** des anciens paths : pas implémentée (Next App Router ne le fait pas nativement, et aucun bookmark public connu pour des routes `/console/*` qui sont internes UPgraders).
- La migration de `/console/oracle/clients` vers un autre namespace : laissée en place car sémantiquement c'est bien le tour de garde Oracle.

## Conséquences

### Positives

- **Clarté narrative** : le namespace `/console/oracle/*` ne contient plus que la compilation et son tour de garde. Plus de confusion entre "le workflow opérateur préparatoire" et "le livrable final".
- **Anti-drift NEFER** : indice physique via le routing que **Oracle n'est qu'un livrable parmi N**. Quand un nouvel opérateur cherche "où se passe l'ingestion de brief", il ne tombe plus sur `/oracle/*` (qui aurait suggéré que tout passe par Oracle).
- **Cohérence avec ADR-0023** : `OPERATOR_AMEND_PILLAR` (édition piliers ADVE) ne se trouve **pas** dans `/console/oracle/*` non plus — elle vit dans `/console/config/variables` (Annuaire Variables) + boutons crayon dans `/cockpit/brand/{adve}`. Cohérent avec "Oracle = consommateur de piliers, pas pivot d'édition".

### Négatives / risques

- **17 refs internes à propager** en un sweep : mitigation par `sed` atomique + grep de validation post-rename (0 ref restante vérifiée).
- **5 lignes de tests E2E** à updater : faites en même PR.
- **Confusion temporaire pour les opérateurs habitués** aux anciens paths : faible, audience interne (UPgraders), notification via CHANGELOG suffit.

### Surveillance

- Le test bloquant `pillar-schema-coherence.test.ts` (ADR-0023) ne couvre pas ce drift — le drift est physique (paths). La surveillance se fait via :
  - PAGE-MAP.md régénéré pre-commit qui exposera tout retour en arrière.
  - Convention NEFER §0.3 LEXICON mappings : "Oracle" → uniquement le namespace `/console/oracle/{clients, brands, diagnostics, compilation}` + le BrandAsset.kind=ORACLE_DOCUMENT. Toute nouvelle page `/console/oracle/<workflow>` doit passer par revue ADR.

## Liens

- ADR-0014 — Oracle 35-section framework canonical (qu'est-ce qu'un Oracle compilé)
- ADR-0023 — OPERATOR_AMEND_PILLAR (édition piliers ADVE, livré dans la même PR)
- NEFER.md §0.3 LEXICON mappings (mise à jour synchronisée)
- CLAUDE.md (Oracle = un livrable parmi N, mention 4 portails)
- PAGE-MAP.md (régénération post-merge)
