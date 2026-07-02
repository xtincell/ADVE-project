# La Fusée v7 — Project Memory

Ce repo est en **reconstruction totale** (mandat exceptionnel opérateur 2026-07-01 :
« carte blanche — tu décides de tout, wipe ce qui n'est pas exceptionnel »). Ancienne base
(v6.27.x, ~200 modèles, gouvernance Neteru) : **quarantinée dans [`legacy/`](legacy/)**, lecture
seule, banque d'organes. `main` sert l'ancienne app jusqu'à la bascule ; la branche de rebuild ne
casse donc rien par construction.

## Ce qu'est le produit

**Hiérarchie de marque (corrigée 2026-07-02) : UPgraders est la marque-mère — l'agence — et VEND
La Fusée, son OS.** Le site, le domaine cible (upgraders.*), les titres : UPgraders d'abord ;
La Fusée est LE produit (/lafusee). **La Fusée** : l'OS qui transforme des marques d'Afrique francophone en icônes
culturelles, en industrialisant l'accumulation de superfans qui déplacent la fenêtre d'Overton de
leur secteur. Le cœur méthodologique est la cascade **A→D→V→E→R→T→I→S** (ADVE déclaré par
l'opérateur, RTIS dérivé) ; le funnel : intake public → diagnostic → workspace marque → livrables
(dont l'Oracle) → campagnes/missions → guilde de talents → paiement mobile money (FCFA, Wave/OM/MTN/Moov).

## Reprise depuis le VPS

**[docs/PONT-VPS.md](docs/PONT-VPS.md)** : setup, récupération du Design System UPgraders canon
(claude.ai/design, exige /design-login interactif), passe DS vague 6, deploy, vagues suivantes.

## Règles du rebuild (non négociables)

1. **[docs/REBUILD-PLAN.md](docs/REBUILD-PLAN.md) est le plan maître** — WP, ordre de port, ce qu'on
   garde/wipe, board d'état. Le lire avant toute action ; y mettre à jour ta ligne WP.
2. **Porter = réécrire en lisant `legacy/`**, jamais copier-coller aveugle. On transplante la
   logique métier (moteurs déterministes, méthode, contenus), pas la plomberie.
3. **Noms plats, français/anglais techniques.** Zéro mythologie interne (Mestor/Artemis/Seshat… →
   audit, studio, market, finance…). Le registre client Fusée/Cockpit est conservé côté produit.
4. **CI toujours verte** sur ce monde : `npm run typecheck && npm run test && npm run db:validate && npm run build`.
   Pas de « rouge toléré » — le neuf n'a pas d'excuse.
5. **Schéma par tranches** : chaque WP étend `prisma/schema.prisma` par migration additive dans son
   contexte borné. Toute mutation métier écrit une ligne `AuditLog` (hash-chaînée) — c'est TOUT le
   remplacement du bus Intents.
6. **Jamais de donnée inventée** : trou → EmptyState / `DEFERRED_AWAITING_CREDENTIALS`. Barèmes,
   taxonomies, indices = lignes seedées, jamais constantes en dur.
7. **Un WP = une session = une PR** vers la branche de rebuild, claim déclaré dans le board.
   Secrets uniquement en variables d'environnement — jamais dans le repo ni dans les docs.
8. Ce qui touche la prod (Coolify, DNS, wipe de données) = WP de bascule, backup d'abord,
   confirmation opérateur explicite.

## Stack

Next 16 (App Router) · React 19 · TypeScript 6 strict · Tailwind 4 (tokens UPgraders : corail
`#E56458`, or `#FACC15`, panda ink/bone) · Prisma 7 + `@prisma/adapter-pg` (Postgres sur Coolify,
URL via env) · Zod 4 · Vitest 4. tRPC réintroduit au WP-003 si utile — pas avant d'en avoir besoin.

## Où chercher dans legacy/

Moteurs déterministes : `legacy/src/lib/utils/scoring.ts`, `legacy/src/server/services/strategy-presentation/`
(composers Oracle), `legacy/src/server/services/financial-brain/` (calculators), variable bible
`legacy/src/lib/types/variable-bible.ts`. Gateway LLM : `legacy/src/server/services/llm-gateway/`.
DS : `legacy/docs/design-system/upgraders/` + `legacy/src/styles/`. Seeds : `legacy/prisma/seed-*.ts`.
Historique décisions : `legacy/docs/governance/adr/` (0001-0121). Doctrine produit :
`legacy/docs/governance/STATE_FINAL_BLUEPRINT.md`.
