# ADVE-project — Plan d'actions restantes

**Date** : 2026-04-27 (revision 2)
**Repo canonique** : `https://github.com/xtincell/ADVE-project` — branche `main`
**Version** : 4.0.0-alpha (consolidation v3 + v4 + paywall + Notoria wiring)
**Tests** : 672 unit pass, 22 LLM smoke (requiert ANTHROPIC_API_KEY)
**Build** : 164 pages compilees, 0 erreur TS

---

## CHANGELOG DEPUIS REVISION 1

### Ajouts (commit en cours)
- **P0.1 Paywall** : router `payment.ts` (CinetPay + Stripe + mock dev), gating sur recos Notoria + PDF
- **P0.2 Notoria wiring** : `complete()` declenche `generateBatch({ missionType: "ADVE_UPDATE", targetPillars: ["a","d","v","e"] })` en best-effort
- **P0.3 CTAs fonctionnels** : `mailto:` remplaces par `/onboarding?intake=:token`, PDF gated par paywall
- **getRecosByToken** : nouveau endpoint tRPC qui retourne 2 recos en preview gratuit / toutes en mode paye
- **.gitignore** : runtime logs (`*.log`, `logs/`) + Finder/iCloud duplicates (`* 2.{ts,tsx,js,jsx,json}`) ignores

### Verifie
- `npx tsc --noEmit` : **0 erreur** (le HANDOFF v1 mentionnait 1402 erreurs, c'etait avant le merge v3+v4 en main)
- `npx vitest run` (unit) : **672/672 pass**
- `npx next build` : **OK, 164 pages**

---

## 1. ETAT DES PLAINTES ORIGINALES

### Plainte 1 — "Le scoring ne marche pas"
**Statut : CORRIGE**

L'ancien formulaire intake stockait les reponses avec des cles `q0/q1/q2` alors que le backend attendait `a_vision/a_mission/d_positioning`. Score = 0 systematiquement.

v4 a resolu le probleme :
- Le formulaire utilise `trpc.quickIntake.getQuestions` (server-driven)
- Les reponses sont keyed par `question.id` (semantique)
- `complete()` appelle `extractStructuredPillarContent()` qui fait 4 appels LLM paralleles (1 par pilier ADVE) pour extraire les atoms structures
- Score ADVE /100 (4 piliers) avec cap a 25/pilier

**Risque residuel** : si `ANTHROPIC_API_KEY` manque, fallback sur les reponses brutes (score peut etre 0). Verifier la configuration env en prod.

---

### Plainte 2 — "Page de resultat = creature de Frankenstein"
**Statut : CORRIGE**

- [x] Export PDF (gated par paywall maintenant)
- [x] Radar 4 piliers ADVE (composant `AdvertisRadar` avec prop `pillarKeys`)
- [x] CTA vers IMPULSION (`/onboarding?intake=:token`)
- [x] **Paywall** : CinetPay (Afrique, FCFA) + Stripe (international, EUR) — mock auto-paye en dev
- [x] **Audit ADVE detaille** : recos Notoria affichees apres deblocage
- [x] **Reco RTIS legere** : 2 recos en apercu gratuit, toutes en mode paye
- [x] **CTAs fonctionnels** : tous les mailto remplaces par des routes internes

---

### Plainte 3 — "ARTEMIS sequences ne demarrent pas"
**Statut : CORRIGE**

Service `artemis/` complet (11 fichiers).

---

### Plainte 4 — "ARTEMIS orchestration"
**Statut : CORRIGE**

Feedback-loop, knowledge-capture, mestor governance OK.

---

## 2. PROCHAINES ACTIONS

### P1 — Important (production-ready)

#### 2.1 Configurer les vraies cles API en prod
```env
CINETPAY_API_KEY=...
CINETPAY_SITE_ID=...
STRIPE_SECRET_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
```
En dev sans cles, le paywall passe en mode `MOCK` qui auto-confirme le paiement (utile pour les tests UI).

#### 2.2 Webhooks de paiement (separe du flow synchrone)
Routes API a creer :
- `/api/payment/webhook/cinetpay` — confirme/rejette le paiement
- `/api/payment/webhook/stripe` — meme chose

Actuellement le router `payment.ts` redirige vers le provider, et la confirmation se fait au retour via `?ref=xxx&status=paid` + `verifyPayment` query. Pour la production, ajouter les webhooks pour la double-verification.

#### 2.3 Persister les paiements en DB
Le router `payment.ts` utilise un store en memoire (`pendingPayments` Map). En production :
- Ajouter un modele Prisma `Payment` (reference, intakeId, amount, currency, provider, status, createdAt, paidAt)
- Migrer le store en memoire vers la DB
- Ajouter un endpoint admin pour lister les paiements

#### 2.4 Notoria/Jehuty UI — verifier le flow complet
- `notoria-page.tsx` (523 lignes) et `jehuty-feed-page.tsx` (310 lignes) existent
- Routes cockpit : `/cockpit/brand/notoria`, `/cockpit/brand/jehuty`
- Tester le flow : pendingRecos → accept/reject → apply → pillar update

---

### P2 — Amelioration

#### 2.5 Connectors externes
- Monday.com et Zoho adapters existent
- MCP advertis-inbound endpoint existe
- Aucun n'est teste — ajouter des tests unitaires

#### 2.6 Landing page
- Composants existent (hero, navbar, pricing, FAQ, footer, social-proof, etc.)
- `src/app/page.tsx` assemble bien les composants

#### 2.7 LLM fallback robuste
- `llm-gateway/index.ts` supporte multi-vendor (Anthropic + OpenAI + Ollama)
- Circuit breaker actif (3 echecs → 30s open)
- Verifier la cascade quand pas de cle API

---

## 3. ARCHITECTURE A CONNAITRE

```
src/
├── app/
│   ├── (intake)/     → Funnel public (landing → questionnaire → resultat avec paywall)
│   ├── (cockpit)/    → Brand OS client (20 pages, Notoria, Jehuty)
│   ├── (console)/    → Industry OS operateur (50+ pages, 8 divisions)
│   ├── (agency)/     → Portail agence (clients, campagnes, revenue)
│   ├── (creator)/    → Portail createur (missions, QC, earnings)
│   └── (auth)/       → Login / Register
├── server/
│   ├── services/     → 40+ services metier
│   │   ├── notoria/      → 7 fichiers, recommendation engine (cable dans intake.complete)
│   │   ├── jehuty/       → 2 fichiers, intelligence feed
│   │   ├── artemis/      → 11 fichiers, campaign orchestration
│   │   ├── mestor/       → 8 fichiers, decision support + LLM
│   │   ├── seshat/       → intelligence, signals, knowledge
│   │   ├── financial-brain/ → 29 fichiers, budget deterministe
│   │   └── llm-gateway/  → Multi-vendor (Anthropic, OpenAI, Ollama) + circuit breaker
│   ├── mcp/          → 9 MCP servers
│   └── trpc/
│       ├── router.ts → 71 routers (ajout: payment)
│       └── routers/  → un fichier par domaine
└── lib/
    └── types/        → advertis-vector, business-context, pillar-schemas, variable-bible
```

---

## 4. COMMANDES DE VERIFICATION

```bash
# Cloner
git clone https://github.com/xtincell/ADVE-project.git
cd ADVE-project

# Installer
npm install

# Prisma
npx prisma generate
npx prisma db push

# Tests unit (672 attendus)
npx vitest run --exclude "tests/integration/**"

# Tests LLM (22 — necessite ANTHROPIC_API_KEY dans .env)
npm run test:llm

# Tests intake e2e (cree des intakes en DB, real LLM calls)
npx tsx scripts/test-intake-e2e.ts

# TypeScript (0 erreur attendu)
npx tsc --noEmit | grep "error TS" | wc -l

# Build production (164 pages)
npx next build

# Dev server
npm run dev
```

---

## 5. VARIABLES D'ENVIRONNEMENT REQUISES

```env
# Database
DATABASE_URL=postgresql://...

# LLM (requis)
ANTHROPIC_API_KEY=sk-ant-...

# LLM (optionnel — fallback)
OPENAI_API_KEY=sk-...
OLLAMA_BASE_URL=http://localhost:11434

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Paiements (optionnel — mock mode en dev)
CINETPAY_API_KEY=...
CINETPAY_SITE_ID=...
STRIPE_SECRET_KEY=...
```

---

## 6. NOTES POUR LE PROCHAIN AGENT

- **Une seule branche** : `main` (v3, v4, merge-local-enrichments supprimees)
- **Force-push interdit** : tout merge se fait via PR ou merge commit
- **Nouvelle convention** : utiliser le `llm-gateway` central (jamais d'appel direct a `generateText` ou `anthropic()`)
- **Fichier Finder duplicates** (`* 2.ts`) sont automatiquement ignores (gitignore) — c'est un artefact de sync iCloud
- **Le store de paiements est en memoire** — perdu au redemarrage. A migrer en DB avant prod (cf. P1 #2.3)
