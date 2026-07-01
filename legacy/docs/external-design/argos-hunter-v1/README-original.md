# Argos Hunter — test harness

Generator `research-dossier-v1` corrigé + harnais de test local (mock ou proxy Anthropic).
Issu de la session de debug du fichier `argos-generator.jsx` original (2026-05-15).

## Quoi de différent vs l'artifact original

4 fixes ciblés dans `runPhase()`, lignes 588-705 du JSX :

| # | Avant | Après | Pourquoi |
|---|---|---|---|
| 1 | `model: 'claude-sonnet-4-20250514'` | `model: 'claude-sonnet-4-5'` | snapshot ancien potentiellement déprécié |
| 2 | `max_tokens: 1000` | `max_tokens: 8192` | **cause #1 des échecs** — un dossier complet dépasse 1k tokens |
| 3 | `max_uses: 5` | `max_uses: 10` | budget search réaliste pour 6+ assets |
| 4 | Parse texte → `tryRepairJson` → `escapeInnerQuotes` → `rescueTruncated` | **`tool_use` avec `submit_phase_output`** | output structuré natif, plus de JSON repair |

**Code mort à supprimer une fois le fix #4 confirmé** (~300 lignes) :
- `JSON_DISCIPLINE` (lignes 61-80)
- `escapeInnerQuotes` (lignes 149-196)
- `tryRepairJson` (lignes 198-230)
- `rescueTruncated` (lignes 234-266)
- `extractJsonText` (lignes 268-275)
- Les `${JSON_DISCIPLINE}` dans chaque `PHASE_PROMPTS`

## Run

```bash
npm install
# Mode mock (par défaut, pas de clé API requise) :
npm run dev               # Vite sur :5173
# Dans un autre terminal :
node server.mjs           # mock API sur :5174

# Mode réel (clé Anthropic requise) :
ANTHROPIC_API_KEY=sk-ant-... node server.mjs
# Le server proxy vers api.anthropic.com au lieu de mocker.
```

Puis ouvre `http://localhost:5173`.

## Structure

```
argos-test/
├── argos-generator.jsx     # le JSX corrigé (≈1640 lignes) — peut être copié tel quel dans claude.ai
├── main.jsx                # bootstrap React + polyfill window.storage → localStorage
├── index.html              # shell Vite + Tailwind CDN
├── vite.config.js          # proxy /api/anthropic → :5174
├── server.mjs              # mock Anthropic + proxy optionnel (Node natif, 0 dep)
├── package.json            # vite, react, lucide-react
└── README.md
```

## Modes de run

**Mode MOCK** (par défaut quand `ANTHROPIC_API_KEY` est absent) :
- `server.mjs` retourne des réponses pré-fabriquées (Apple Think Different 1997)
- Routage par parsing du system prompt (`/Phase ([1-4])/`) pour matcher la phase demandée
- Latence simulée : 800ms par phase
- Aucun call à api.anthropic.com — gratuit, offline, reproductible

**Mode RÉEL** (`ANTHROPIC_API_KEY=...` en env) :
- `server.mjs` forward la request vers `https://api.anthropic.com/v1/messages` avec la clé
- Permet de tester avec de vraies recherches web et un vrai LLM
- Coût : ~3-5 USD par hunt complet

## Le pattern tool_use (le vrai fix)

Au lieu de :
```js
// Avant — parse text, repair JSON, prier
const phase1Out = await runPhase(...);
const jsonStr = extractJsonText(allText);
const parsed = JSON.parse(jsonStr); // ou tryRepairJson si fail
```

C'est maintenant :
```js
// Après — output structuré natif
const SUBMIT_TOOLS = {
  1: { name: 'submit_phase_output', input_schema: { /* zod-like schema */ } },
  // ...
};

// Dans la boucle :
} else if (block.type === 'tool_use' && block.name === 'submit_phase_output') {
  submittedOutput = block.input;  // ← objet JS validé par Anthropic, zero parsing
}
```

Conséquences :
- Plus aucun JSON malformé possible (Anthropic valide le shape côté serveur)
- Plus de boucle "resume mid-stream" sur `max_tokens` (anti-pattern qui produisait du JSON Frankenstein)
- Plus besoin du `JSON_DISCIPLINE` qui interdisait les `"` dans les excerpts

**MAIS** : `input_schema` valide le shape global, pas les types granulaires. Anthropic accepte `year: "1997"` au lieu de `1997` parfois. D'où le **principe #2** : une zone de coercion défensive (Zod) entre `submit_phase_output.input` et le code downstream.

## Importer dans l'OS Argos

Pour porter ce module dans l'app Next.js `/Users/imacmatanga1/ARGOS-FINDER/app/` :

1. **Côté serveur** (sécurise la clé API) :
   - Copier `runPhase`, `SUBMIT_TOOLS`, `PHASE_PROMPTS`, helpers UID → `app/src/server/services/hunt.ts`
   - Créer `POST /api/v1/hunt` qui orchestre les 4 phases server-side
   - Streaming SSE optionnel pour pousser les events live au browser

2. **Côté client** :
   - Page `/admin/hunt/page.tsx` — réutilise les composants `PhaseRow`, `JsonView`, `RegistryStrip`
   - Remplace `window.storage` (localStorage) par des queries Prisma sur la table `Reference`
   - Le registry projection devient un service server : `app/src/server/services/registry-projection.ts`

3. **Zone de coercion** (principe défensif) :
   - `app/src/server/services/coerce-dossier.ts` avec un Zod schema strict
   - Normalise : `String(year) → Number`, `confidence.toLowerCase()`, enum-fuzzy-match
   - Entre `submit_phase_output.input` (Anthropic) et `ingestDossier()` (Prisma)

4. **Bridge ingest** :
   - À la fin du hunt, si `safety.verdict === 'PASS'` → appel direct à `ingestDossier()` existant dans `app/src/server/ingest.ts`
   - Le dossier apparaît automatiquement sur `/brand/[slug]` côté public

## Principes architecturaux à respecter (rappel)

1. **Le dossier est le contrat, tout le reste est une projection.** Pas de nouveau model DB pour stocker des sidecar findings ou des projections — uniquement le dossier immuable + une projection in-memory ou SQL régénérable.

2. **Coercion défensive aux frontières LLM↔code typé.** Le `tool_use input_schema` valide le shape, pas les types granulaires. Toujours passer par une couche Zod de normalisation avant d'utiliser l'output downstream.
