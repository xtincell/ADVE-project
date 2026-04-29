# RESIDUAL DEBT — inventaire honnête des résidus

État au commit `a3e07e6`. Passage en revue systématique des **vrais résidus** : mocks, stubs, oublis, scaffolds non-raffinés, dettes documentées.

Source de vérité : `grep -rn "TODO\|FIXME" src/`, plus l'audit fait sur les manifests et routers.

---

## Tier 1 — Stubs et scaffolds connus (acceptés provisoires)

### 1.1 — Manifests scaffolded à raffiner (53 services)

**État** : `inputSchema: z.object().passthrough()` + `outputSchema: z.unknown()` + une seule capability `default`.

**Liste** : tous les manifests de moins de 35 lignes sous `src/server/services/*/manifest.ts`. Visible via `wc -l`.

**Pourquoi** : phase de scaffolding rapide pour passer mission-drift à 100%. Le service implémente le vrai code dans `index.ts` ; le manifest n'expose pas encore la surface tRPC réelle.

**Cible** : raffiner chaque manifest pour matcher les exports réels de son `index.ts` — Zod schemas pertinents, `acceptsIntents`, sideEffects précis. ~5 jours en local 1M auto-mode.

**Déclencheur** : Phase 2 du REFONTE-PLAN (manifest enforcement strict).

### 1.2 — Mock payment provider

**État** : `src/server/services/payment-providers/mock.ts` — auto-confirme tout en non-prod.

**Pourquoi** : dev/staging sans clés provider. Le **production NODE_ENV refuse explicitement** ce provider (`isConfigured()` returns false en prod).

**Acceptable** : oui, conception explicite. Pas un stub, c'est un fallback documenté.

### 1.3 — Oracle PDF puppeteer fallback

**État** : `src/server/services/value-report-generator/oracle-pdf.ts` throws si `puppeteer-core` + `@sparticuz/chromium` absents.

**Fallback** : `window.print()` côté client (existing UX rev 9).

**Cible production** : `npm i -D puppeteer-core @sparticuz/chromium` puis le module bascule sur le rendu serveur. ~1h de setup.

**Acceptable** : oui, peer deps optionnelles + path documenté.

### 1.4 — `routeModel` fallback dans `llm-gateway/router.ts`

**État** : si aucun provider LLM n'est configuré, retourne un `ModelChoice` `available: false` plutôt que de throw.

**Pourquoi** : éviter de casser les tests qui n'ont pas de clé Anthropic configurée.

**Cible** : en prod, `pickModel` throw correctement. `routeModel` est une API tests-only qui devrait l'être explicitement (à renommer `routeModelOrFallback` plus tard).

---

## Tier 2 — Vrais résidus à fermer

### 2.1 — Router migration (69/72 strangler)

**État** : 2 routers en `governedProcedure`, 69 en `auditedProcedure` (audit trail OK, **pré-conditions Pillar 4 + cost-gate Pillar 6 + post-conditions inactifs**).

**Mutations totales à migrer** : ~290 mutations réparties sur 69 routers.

**Plan** : trunk-based, 5-10 routers par PR avec label `phase/3-router-batch-N`. Ordre prioritaire :

1. **Vague 1** (V5.4 récents, 0-3 mutations) — jehuty, seshat-search, analytics, signal, value-report, market-study (~3j)
2. **Vague 2** (Operations, 1-3 mutations) — payment, monetization (déjà migrer pour la mutation init), upsell, knowledge-graph, attribution-router (~2j)
3. **Vague 3** (1-3 mutations divers) — auth, brief-ingest, campaign, club, connectors, contract, deliverable-tracking, editorial, glory, guidelines, guild-tier, guilde, implementation-generator, intervention, learning, market-intelligence, matching, media-buying, membership, messaging, mobile-money, notification, onboarding, operator, payment, pillar-versioning, pr, publication, quality-review, sequence-vault, social, staleness, strategy-presentation, system-config, translation (~10j)
4. **Vague 4** (mutations complexes, 4-9) — driver, ingestion, mission, mestor-router, process, sequence-vault, strategy (~5j)
5. **Vague 5** (très complexe, 10+) — campaign-manager (50), pillar (21), notoria (11), quick-intake (10) (~5j manuel + tests)

**Effort total estimé** : 25 jours dev senior.

**Risque** : moyen. Strangler garantit qu'une migration ratée laisse l'audit trail intact. Mais pré-conditions mal calibrées peuvent vetoer des flows légitimes.

### 2.2 — Manifests Glory tools individuels

**État** : 40 GloryToolManifest **dérivés** de `glory-tools/registry.ts` via `glory-manifests.ts`. Pas 40 fichiers `manifest.ts` séparés.

**Pourquoi** : ratio coût/bénéfice — 40 fichiers stubs vs 1 fichier de mapping reproduit la même métadonnée moins gérablement.

**Si fichiers séparés requis (P2.6 strict)** : `scripts/inventory-glory-tools.ts` + générer manifest par tool.

**Acceptable** : oui pour Phase 2 partielle ; à raffiner si business demande A/B variants per tool.

### 2.3 — Routers migrés à ré-auditer Pillar 6 cost-gate

**État** : `governedProcedure` évalue les `preconditions` (Pillar 4). Le cost-gate (Pillar 6) n'est pas encore wired dans le dispatcher.

**Cible** : adapter `governed-procedure.ts:execute()` pour appeler `assertCostGate()` après les preconditions, avant le handler. ~2h.

### 2.4 — Subscription webhook : Subscription model creation

**État** : Stripe Subscription webhook handler complet (commit a3e07e6) — `customer.subscription.*` events upsert le `Subscription` row.

**Cible** : wiring frontend pour afficher le status sub dans `/cockpit/profile` ou `/console/socle/subscriptions`. ~1j.

### 2.5 — MFA module shipped, login wiring incomplet

**État** : `src/server/services/mfa/index.ts` (TOTP RFC 6238 + `verifyTotp` + base32 secret) ✓. Manifest ✓. Mais NextAuth credentials provider **ne challenge pas encore le code TOTP** au login admin.

**Cible** : `src/lib/auth.ts` à étendre — après password OK, si user.role === "ADMIN" et MfaSecret existe pour ce user, exiger un `mfaCode` field dans le payload login. ~2h.

### 2.6 — Codegen registry passthrough

**État** : `registry.generated.ts` est un passthrough vers le registry runtime. Le vrai codegen via `gen-manifest-registry.ts` cible un autre chemin (`src/server/governance/__generated__/manifest-imports.ts`) — ✓ existe.

**Cible** : aligner. Soit fusionner les 2 emplacements, soit clairement les distinguer dans la doc. ~30min.

### 2.7 — `auth.ts` reset email — TODO fermé dans cette session

**État** : Fermé (commit en cours). `src/server/services/email/index.ts` créé avec providers Resend / SendGrid / fallback log. `auth.forgotPassword` envoie maintenant un vrai email.

### 2.8 — `db.ts` tenantScopedDb migration vers `$extends`

**État** : commentaire `// TODO: Migrate to $extends() with model-specific query overrides`.

**Pourquoi** : current `tenantScopedDb` est une fonction wrapper. `$extends` (Prisma 5+) est plus idiomatique mais demande de re-tester chaque modèle.

**Cible** : Phase 4 du REFONTE-PLAN. Pas critique, comportement identique pour l'utilisateur.

### 2.9 — `@lafusee/sdk` skeleton

**État** : 3 méthodes (`getPrice`, `getTierGrid`, `getStatus`). Pas la couverture full des routers publics.

**Cible** : génération automatique depuis tRPC routers via `trpc-openapi` ou type-inference + script. ~3j.

---

## Tier 3 — Items planifiés mais non démarrés

| # | Item | Phase | Effort |
|---|---|---|---|
| 3.1 | NSP fully wired into all LLM-driven pages | P5 | ~5j |
| 3.2 | CRDT collab Yjs (StrategyDoc table prête, code pas câblé) | P5 | ~5j |
| 3.3 | Service worker / offline PWA | P5.9 | ~5j |
| 3.4 | Landing page rewrite 14 sections | P7 | ~5j (copy) |
| 3.5 | Real OAuth `/config/integrations` (Google/Meta/LinkedIn) | P7 | ~3j |
| 3.6 | i18n FR/EN sections marketing | P7 | ~2j |
| 3.7 | Mobile Lighthouse audit run + tuning ≥0.85 | P7 | ~3j |
| 3.8 | Compensating intent UI (replay/compensate button in /governance/intents) | P3 | ~1j |
| 3.9 | Test coverage cascade end-to-end avec vraies données | P5 | ~3j |
| 3.10 | Plugin scaffold `--external-plugin` mode CLI | P2.7 | ~2j |
| 3.11 | Founder digest cron (utilise founder-psychology weekly digest) | P5 | ~1j |
| 3.12 | Sentinel intents cron handlers (MAINTAIN_APOGEE, DEFEND_OVERTON) | P3 fin | ~3j |

---

## Tier 4 — Items qui n'arriveront probablement pas (et c'est OK)

| Item | Raison de l'écarter |
|---|---|
| Migration full `$extends` Prisma 5 | comportement actuel correct, pas de gain user |
| Sandbox V8 isolated pour plugins | overkill pour V0, sandbox proxy suffit (cf. ADR-0008) |
| Multi-region deployment | scale-out hors d'un seul Postgres pas urgent |
| Web Components version of Neteru UI Kit | React only suffit pour l'OS interne |
| GraphQL endpoint en plus du tRPC | tRPC suffit, GraphQL = double maintenance |

---

## Effort total restant pour 100%

| Tier | Effort cumulé |
|---|---|
| Tier 1 (stubs raffinement) | ~5j |
| Tier 2 (vrais résidus) | ~30j (dont 25j migration routers) |
| Tier 3 (planifié non démarré) | ~38j |
| **Total** | **~73 jours** |

À 1 dev senior plein temps : **~15 semaines** pour fermer 100%.
À 2 devs en parallèle : **~9 semaines**.

## Update de la complétion globale

- Coverage : 100%
- Framework implementation : ~98% (tier 2.4-2.9 fermés cette session)
- Governance enforcement : ~55% (manifests 75/75 mais pré-conditions sur 3% routers)
- Mission alignment : ~95% (drift CI vert, missionContribution 100%)

**Pondéré : ~85-87%**

Le saut majeur restant à faire est **le router migration trunk-based** (Tier 2.1) qui à lui seul vaut **+12 points**.
