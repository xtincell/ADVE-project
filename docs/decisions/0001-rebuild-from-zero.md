# 0001 — Rebuild v7 from zero, legacy quarantiné en banque d'organes

- **Statut** : Accepted · **Date** : 2026-07-01
- **Décideur** : Alexandre (mandat exceptionnel carte blanche, verbatim dans REBUILD-PLAN §0) ;
  arbitrages d'exécution : l'agent.

## Contexte

Deux mandats successifs le 2026-07-01. Le premier (« structure le revamp pour une équipe d'agents,
sans rien casser ») a produit la couche d'exécution de la refonte-v3.3 (legacy `ADR-0121`, PR #401
v1). Le second l'a explicitement élargi : *tout* est refondable, wipe autorisé, ne garder que
l'exceptionnel, ne pas honorer l'effort passé au détriment de la performance.

Constat d'ingénierie sur la base v6.27.75 : la complexité accidentelle (bus d'Intents mythologique,
200 modèles, 121 ADRs, 876 tests de cohérence narrative, renommage cosmétique planifié de ~440
fichiers) excède largement la valeur portée (méthode ADVE/RTIS, moteurs déterministes, funnel,
pricing Afrique). Refondre l'échafaudage coûterait plus cher que reconstruire autour des organes.

## Décision

1. **Rebuild greenfield dans le même repo** : l'intégralité de l'ancien tree est déplacée en
   `legacy/` (lecture seule, aucun import runtime) ; la racine repart de zéro (Next 16 / React 19 /
   TS strict / Tailwind 4 / Prisma 7 + adapter-pg / Zod / Vitest).
2. **La branche de rebuild ne touche pas `main`** avant la bascule (WP-013, GO opérateur +
   backup) : l'app actuelle continue de tourner, le wipe de code est donc réversible et sans risque
   d'exploitation.
3. **Supersede** : refonte-v3.3 (spec + exécution ADR-0121 legacy) est caduque — ses intentions
   valables sont natives dans v7 (paliers LATENT, noms plats, pas de substrat nommé). Le ledger de
   décisions repart à 0001 (ceci) ; l'historique complet reste consultable dans
   `legacy/docs/governance/adr/`.
4. **Doctrines conservées comme lois** : déterministe d'abord (LLM optionnel), barèmes seedés
   jamais codés en dur, needsHuman INFERRED→DECLARED, audit hash-chaîné (réduit à une table
   `AuditLog`), mobile-money-first, aucune donnée inventée, secrets en env.
5. **Infra cible : Coolify** (Supabase et Vercel/Cloudflare legacy déprécés). Accès prod
   exclusivement via variables d'environnement ; le token partagé en chat doit être révoqué.

## Conséquences

- Vélocité maximale pour la flotte (13 WP, plan §5) ; chaque organe est réécrit petit, testé,
  compréhensible.
- Perte assumée : les subsystems legacy non listés « exceptionnels » ne seront PAS portés sauf
  besoin démontré (règle : on porte à la demande du produit, pas par nostalgie).
- Risque rewrite classique (jamais finir) borné par : funnel d'abord (WP-004 = valeur client
  end-to-end), parité mesurée sur le funnel avant bascule, legacy toujours en prod pendant le build.
