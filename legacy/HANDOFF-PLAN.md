# ADVE-project — Plan d'actions restantes

**Date** : 2026-04-28 (revision 5)
**Repo canonique** : `https://github.com/xtincell/ADVE-project` — branche `main` (single-branch workflow)
**Version** : 4.0.0-alpha (consolidation v3 + v4 + paywall + Notoria wiring + payment persistence + admin endpoints + LLM cascade tests)
**Tests** : 713 unit pass, 22 LLM smoke (requiert ANTHROPIC_API_KEY)
**Build** : 164 pages compilees, 0 erreur TS
**Tip main** : `040cae4` (test llm-gateway cascade)

---

## CHANGELOG REVISION 5

Single-branch workflow (`main` only) post-rev 4. Items ajoutes :
- **P1 #2.3-bis** : `payment.listAdmin` + `payment.statsAdmin` (router tRPC, `adminProcedure`, filtrage par status/provider/date + cursor pagination + revenue par devise) — commit `02ad635`
- **P2 #2.7-bis** : exports `_resetProvidersForTest`, `_getProviderStateForTest`, `_selectProviderForTest`, `_recordProviderFailureForTest`, `_recordProviderSuccessForTest` + 9 tests cascade/circuit-breaker (priorite anthropic→openai→ollama, threshold 3 → open 30s, success reset, auto-recovery via fake timers) — commit `040cae4`
- **P2 #2.6** : audit landing (voir section dediee) — pas de modif code, juste reportage

## CHANGELOG REVISION 4

PR [#6](https://github.com/xtincell/ADVE-project/pull/6) mergée dans `main` le 2026-04-27. Tous les items P1 production-ready et 2 items P2 testing du HANDOFF rev 2 sont maintenant en `main`.

### Items fermés par PR #6
- **P1 #2.2 Webhooks paiement** : `/api/payment/webhook/cinetpay` (HMAC `x-token` + double-check via API CinetPay v2) et `/api/payment/webhook/stripe` (signature `t/v1` + tolerance 5min, comparaison constant-time, scope `checkout.session.completed`)
- **P1 #2.3 Persistance paiement** : modele Prisma `IntakePayment` (+ enums `IntakePaymentProvider/Currency/Status`), `payment.ts` migre du Map en memoire vers `db.intakePayment`
- **P1 #2.4 Notoria lifecycle** : `scripts/test-notoria-lifecycle.ts` (headless tsx) verifie pendingRecos → accept → apply → pillar update sur le seed Wakanda
- **P2 #2.5 Tests connecteurs** : `tests/unit/services/advertis-connectors.test.ts` (15 tests Monday/Zoho/MCP advertis-inbound, pure mapping, no DB)
- **P2 #2.7 Tests LLM gateway** : `tests/unit/services/llm-gateway.test.ts` (17 tests extractJSON + withRetry)

### Hors PR #6 mais déjà en main (commits anterieurs)
- **Demo data** : `src/server/services/demo-data/` (`getDemoMode`/`setDemoMode`) + wiring dans `operator-isolation.scopeStrategies` (hide_dummy / only_dummy) + `advertis-scorer.snapshotAllStrategies` exclut `isDummy=true` — commit `8a33b72`
- **Wakanda seed** : `scripts/seed-wakanda/` (6 brands, 844 records, 38 piliers, 68 recos en mix de statuts) — commit `8a33b72`

### Verifie sur `a7e5ac9`
- `npx tsc --noEmit` : **0 erreur**
- `npx vitest run` (unit) : **704/704 pass**
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

(Items closed by PR #6 sont listes dans le CHANGELOG plus haut — pas re-inscrits ici.)

### P1 — Important (production-ready)

#### 2.1 Configurer les cles API en prod
```env
CINETPAY_API_KEY=...
CINETPAY_SITE_ID=...
CINETPAY_SECRET_KEY=...         # HMAC du webhook (rev 3)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=whsec_... # Signature Stripe (rev 3)
ANTHROPIC_API_KEY=sk-ant-...
```
Cote providers, brancher les notify URLs :
- CinetPay : `https://<domain>/api/payment/webhook/cinetpay`
- Stripe : `https://<domain>/api/payment/webhook/stripe`, event = `checkout.session.completed`

En dev sans cles, le paywall reste en mode `MOCK` qui auto-confirme.

#### 2.4-bis Smoke-test UI Notoria/Jehuty
Le lifecycle backend est verifie par `scripts/test-notoria-lifecycle.ts`, mais le flow UI cockpit (`/cockpit/brand/notoria`, `/cockpit/brand/jehuty`) n'a pas ete teste en navigateur reel (sandbox CI bloque le bundling Turbopack des fonts Google). A faire en local : seed Wakanda → login admin → exercer accept/reject/apply.

#### 2.3-bis Endpoint admin paiements
`IntakePayment` est en DB mais pas expose au cockpit operateur. Ajouter un router tRPC `payment.list({ status?, dateRange? })` + page console pour audit. Pas urgent : Prisma Studio fait l'affaire en interim.

---

### P2 — Amelioration

#### 2.6 Landing page — audit (rev 4)

**Etat structurel** : 12 composants assembles dans `src/app/page.tsx` (Navbar / Hero / ProblemSection / HowItWorks / ScoreShowcase / NeteruShowcase / SocialProof / PortalsSection / PricingSection / FaqSection / FinalCta / Footer). Toutes les ancres internes (`#methode`, `#score`, `#neteru`, `#tarifs`, `#faq`) ont une cible `<SectionWrapper id="...">` — navigation OK. CTAs principaux (`/intake`, `/login`, `/cockpit`, `/creator`, `/agency`) tous actifs.

**Placeholders trouves (`href="#"` qui scrolle en haut au clic)** :
- `src/components/landing/pricing-section.tsx:53` — tier "Enterprise" CTA "Nous contacter" → routes a creer (`/contact` ou `mailto:`)
- `src/components/landing/footer.tsx:18-26` — 7 liens : "A propos", "UPgraders", "Contact", "Carrieres", "Mentions legales", "Confidentialite", "CGU"

**Action restante** : creer les pages legales (`/legal/mentions`, `/legal/privacy`, `/legal/cgu`) + page `/contact` ou un `mailto:contact@lafusee.io`. Pas urgent pour un demo, bloquant pour une mise en prod RGPD-compliant.

**Test de regression visuelle** : aucun en place. Candidat pour Playwright + screenshot diff si la landing entre en cycle de pivot frequent.

#### 2.7-bis LLM gateway — cascade multi-vendor en test
Tests unit `extractJSON` + `withRetry` deja en place. Reste : exposer un `_resetProvidersForTest()` (export sous `__test__/` ou conditionne par `NODE_ENV`) pour tester en isolation la priorite Anthropic → OpenAI → Ollama et le circuit breaker (3 echecs → 30s open).

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
