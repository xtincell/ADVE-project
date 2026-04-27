# ADVE-project — Plan d'actions restantes

**Date** : 2026-04-27 (revision 3)
**Repo canonique** : `https://github.com/xtincell/ADVE-project` — branche `main`
**Version** : 4.0.0-alpha (consolidation v3 + v4 + paywall + Notoria wiring + payment persistence)
**Tests** : 704 unit pass, 22 LLM smoke (requiert ANTHROPIC_API_KEY)
**Build** : 164 pages compilees, 0 erreur TS

---

## CHANGELOG DEPUIS REVISION 2

### Ajouts (revision 3)
- **P1 #2.2 Webhooks paiement** : `/api/payment/webhook/cinetpay` (HMAC `x-token` + double-check via API CinetPay v2) et `/api/payment/webhook/stripe` (signature `t/v1` + tolerance 5min, comparaison constant-time, scope `checkout.session.completed`)
- **P1 #2.3 Persistance paiement** : nouveau modele Prisma `IntakePayment` (+ enums `IntakePaymentProvider/Currency/Status`), `payment.ts` migre du Map en memoire vers `db.intakePayment`
- **P1 #2.4 Notoria lifecycle** : `scripts/test-notoria-lifecycle.ts` (headless tsx) verifie pendingRecos → accept → apply → pillar update sur le seed Wakanda
- **P2 #2.5 Tests connecteurs** : `tests/unit/services/advertis-connectors.test.ts` (15 tests Monday/Zoho/MCP advertis-inbound, pure mapping, no DB)
- **P2 #2.7 Tests LLM gateway** : `tests/unit/services/llm-gateway.test.ts` (17 tests extractJSON + withRetry)
- **Demo data** : `src/server/services/demo-data/` (getDemoMode) + wiring dans `operator-isolation.scopeStrategies` (hide_dummy / only_dummy) + `advertis-scorer.snapshotAllStrategies` exclut `isDummy=true`
- **Wakanda seed** : `scripts/seed-wakanda/` (6 brands, 844 records, 38 piliers, 68 recos en mix de statuts)

### Verifie
- `npx tsc --noEmit` : **0 erreur**
- `npx vitest run` (unit) : **704/704 pass** (672 + 32 nouveaux)
- `npx prisma db push` : applique la table `IntakePayment` (idempotent)
- `npx tsx scripts/test-notoria-lifecycle.ts` : 3 recos PENDING → ACCEPTED → APPLIED, pillar `a` mute

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
CINETPAY_SECRET_KEY=...        # Pour HMAC du webhook
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=whsec_... # Pour signature Stripe
ANTHROPIC_API_KEY=sk-ant-...
```
En dev sans cles, le paywall passe en mode `MOCK` qui auto-confirme le paiement.

#### ~~2.2 Webhooks de paiement~~ — **DONE en revision 3**
Routes implementees, signatures verifiees avec HMAC constant-time. Configurer cote provider :
- CinetPay : notify_url = `https://<domain>/api/payment/webhook/cinetpay`
- Stripe : webhook endpoint = `https://<domain>/api/payment/webhook/stripe`, evenement = `checkout.session.completed`

#### ~~2.3 Persister les paiements en DB~~ — **DONE en revision 3**
Modele `IntakePayment` cree, router migre. **Action restante** : exposer un endpoint admin pour lister les paiements (pas urgent — Prisma Studio fait l'affaire en interim).

#### ~~2.4 Notoria headless~~ — **DONE en revision 3**
Test tsx valide le lifecycle. **Action restante** : tester le flow UI cockpit complet (`/cockpit/brand/notoria`, `/cockpit/brand/jehuty`) en navigateur reel — bloque dans la sandbox actuelle (Turbopack tente de bundler les fonts Google).

---

### P2 — Amelioration

#### ~~2.5 Tests connectors externes~~ — **DONE en revision 3**

#### 2.6 Landing page
- Composants existent (hero, navbar, pricing, FAQ, footer, social-proof, etc.)
- `src/app/page.tsx` assemble bien les composants
- Pas de test de regression visuel actuellement

#### ~~2.7 LLM gateway~~ — **PARTIELLEMENT DONE en revision 3**
- Tests unit pour `extractJSON` + `withRetry` ajoutes (17 cas).
- **Action restante** : ajouter une fonction `_resetProvidersForTest()` (export interne) pour tester la cascade multi-vendor + circuit breaker en isolation.

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
