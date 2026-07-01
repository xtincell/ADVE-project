# VENDOR-NOTICE — Argos Hunter v1 (design reference, NOT production code)

> **Lecture obligatoire avant toute interaction avec ce dossier.**

## Statut

Ce dossier contient le **code de référence Argos Hunter v1**, conçu hors-repo par Alexandre, vendorisé ici le 2026-05-15 pour servir de **source matérielle** au port Phase 22 (`Phase 22 — Argos by LaFusée`, cf. [REFONTE-PLAN.md](../../governance/REFONTE-PLAN.md)).

**Ce n'est PAS du code de production.** Ce n'est PAS importable depuis `src/`. Ce n'est PAS exécutable dans le contexte LaFusée OS.

## Origine

- Archive d'origine : `argos-hunter-v1.tar.gz` (local Alexandre, 2026-05-15)
- Conçu et testé hors-repo : mode mock (Node natif) + mode real Anthropic
- ~1640 lignes JSX + ~290 lignes mock server + harnais Vite

## Pourquoi vendorisé

Pour qu'un agent BMAD (architect/dev/pm) en session fraîche, possiblement dans un environnement cloud ou une autre machine, **puisse lire le code de référence** au moment du port Phase 22 sans dépendre d'un fichier sur la machine locale d'Alexandre.

## Trois interdits absolus sur ce dossier

### 1. NE PAS importer depuis `src/`

Aucun fichier `src/**/*.{ts,tsx}` ne doit avoir d'`import` ou de `require` qui pointe vers `docs/external-design/argos-hunter-v1/**`. Cette zone est **isolée du runtime LaFusée OS**.

Si tu vois un import depuis ce dossier dans `src/`, c'est un bug — corrige-le.

### 2. NE PAS exécuter tel quel

Le code original :
- Appelle directement `https://api.anthropic.com/v1/messages` ([argos-generator.jsx:589](argos-generator.jsx)) — **violation du LLM Gateway** (Phase 21, doctrine non-négociable).
- Utilise `window.storage` (localStorage) — **pas de persistance multi-tenant**, pas de hash-chain, pas d'audit immuable.
- Pas de `mestor.emitIntent()` — **bypass governance**.
- Pas de cost gate Thot — **violation Loi 3 APOGEE** (fuel conservation).
- Pas de NSP SSE — **pas de streaming Phase 16**.
- React 18 + Vite — stack divergente vs Next.js 16 / React 19 LaFusée OS.

Si tu veux le faire tourner pour réflexion (mode mock), exécute-le **dans un autre répertoire / VM**, jamais depuis ce checkout LaFusée.

### 3. NE PAS modifier comme si c'était du code à corriger

Ce code est **gelé**. C'est une snapshot de design intent. Les bugs/limitations sont identifiés dans [README-original.md](README-original.md) et compensés par le port Phase 22 (cf. REFONTE-PLAN.md §Phase 22 « Plan de livraison »).

Si tu vois quelque chose à améliorer : **note-le dans la planification Phase 22**, ne touche pas au code vendorisé.

## Ce qui doit être porté (et comment)

**Scope corrigé 2026-05-15** : l'UI Argos + le lecteur JSON sont **fonctionnels et réutilisés tels quels**. PAS de rebuild de l'interface React en sous-DS LaFusée. Le port = **3 swaps ciblés** dans le JSX (~50 lignes touchées) pour rediriger les calls vers LaFusée + backend Hunter system-integrated côté serveur.

Au moment du port Phase 22 (déclencheur : demande explicite Alexandre) :

### Côté backend LaFusée (à créer dans `src/`)

| Élément vendorisé | Destination port LaFusée |
|---|---|
| `runPhase()` + `SUBMIT_TOOLS` + `PHASE_PROMPTS` | `src/server/services/seshat/argos/hunter.ts` (orchestré server-side, exposé via API `/api/seshat/argos/hunt`) |
| Appel `fetch` direct Anthropic | **Remplacer par LLM Gateway** (`src/server/services/llm-gateway/`) — key Anthropic scellée serveur |
| Schémas `input_schema` | `src/server/services/seshat/argos/coerce-dossier.ts` (Zod strict pour granular types) |
| `projectRegistry()` (in-memory projection) | Service `seshat/argos/projector.ts` lisant `CampaignReferenceDossier` Prisma + projections matérialisées |
| `window.storage` localStorage | Prisma `db.campaignReferenceDossier.*` (multi-tenant scoped via `tenantScopedDb`) + API REST `/api/seshat/argos/dossiers` |
| Sidecar findings logic | Service `seshat/argos/sidecar-enricher.ts` |
| UID hierarchical helpers (`brandUid`, `campaignUid`, `assetUid`) | `src/server/services/seshat/argos/uid.ts` (pure functions, testable) |
| Intent kind | `SESHAT_HARVEST_REFERENCE` (governance via Mestor + Thot cost gate pre-flight) |
| Streaming events | NSP SSE `argos_phase_*` (pattern Phase 16 / Phase 21 F-E) |

### Côté UI Argos (modifs ciblées dans le JSX vendorisé — PAS de rebuild)

L'UI React + le lecteur JSON existent et fonctionnent. **3 swaps seulement** :

| Argos actuel | À remplacer par |
|---|---|
| `fetch('/api/anthropic/v1/messages')` direct vers Anthropic (avec clé client-side) | `fetch('/api/seshat/argos/hunt')` LaFusée — orchestration 4-phases server-side, clé scellée |
| `window.storage.set('dossier:...')` localStorage | `fetch('/api/seshat/argos/dossiers', POST)` → Postgres |
| `window.storage.list/get/del` | `fetch('/api/seshat/argos/dossiers...')` GET/DELETE |

Suppression panel "Clé Anthropic" client-side (devient un détail backend invisible à l'utilisateur). `server.mjs` mock **n'est pas porté** — remplacé par mock LLM Gateway server-side déjà présent.

### Déploiement

L'UI vendorisée est déployée telle quelle via Vercel sur `argos.lafusee.com` (ou domaine équivalent). Identité visuelle existante préservée. Au moment du go-live, ajouter au footer Argos un retour vers `https://lafusee.com` + mention "propriété éditoriale de La Fusée".

Cross-link bilatéral : l'entrée meta-row Argos est **déjà préposée** dans `src/components/landing/marketing-footer.tsx` en mode "(bientôt)" (2026-05-15) — retirer le marker au go-live.

Détails complets : [REFONTE-PLAN.md Phase 22 — Plan de livraison](../../governance/REFONTE-PLAN.md).

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| [argos-generator.jsx](argos-generator.jsx) | Composant React principal + `runPhase` + `SUBMIT_TOOLS` + `PHASE_PROMPTS` + helpers UID + storage wrapper + projection registry |
| [server.mjs](server.mjs) | Mock Anthropic + proxy optionnel (Node natif, 0 dep) |
| [main.jsx](main.jsx) | Bootstrap React + polyfill `window.storage` → localStorage |
| [index.html](index.html) | Shell Vite + Tailwind CDN |
| [vite.config.js](vite.config.js) | Proxy `/api/anthropic` → `:5174` |
| [package.json](package.json) | Vite + React + lucide-react |
| [README-original.md](README-original.md) | README d'origine d'Alexandre (debug session, 4 fixes ciblés, principes architecturaux) |
| **[VENDOR-NOTICE.md](VENDOR-NOTICE.md)** | **Ce fichier** — règles d'engagement avec le code vendorisé |

## Anti-drift CI

Aucun test bloquant n'est attaché à ce dossier (c'est figé, pas code de prod). Mais **tout import depuis `src/` vers `docs/external-design/argos-hunter-v1/**` doit faire échouer le lint** — règle à ajouter au plugin `eslint-plugin-lafusee` au moment du port :

```ts
// .eslint.config.mjs — règle proposée
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: ['**/docs/external-design/**'],
    }],
  },
}
```

## Doctrine respectée

- **Cap APOGEE 7/7 préservé** — vendoriser un code de design ≠ ajouter un Neter.
- **Pas de bypass governance** — ce code N'EXÉCUTE PAS sur le runtime, c'est de la documentation matérielle.
- **Pas de drift narratif** — la planification Phase 22 reste source canonique (cf. REFONTE-PLAN.md), ce dossier est subordonné.

---

_2026-05-15 — vendorisé sur main via commit `docs(planning): vendoriser Argos Hunter v1 dans docs/external-design/`._
