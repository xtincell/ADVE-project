# ADR-0136 — COMPOSE_DELIVERABLE : mode DISPATCHED (le forge output-first passe de l'aperçu au réel)

- **Status** : Accepted
- **Date** : 2026-07-13 (soir)
- **Phase** : suite de l'audit [BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13](../../audits/BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13.md) — bloc B
- **Depends on** : ADR-0050 (Deliverable Forge output-first — dont ceci complète le dispatch), ADR-0009 (Ptah forge), ADR-0124 (spine), ADR-0021 (DEFERRED_AWAITING_CREDENTIALS)
- **Supersedes** : — (complète ADR-0050)

## Contexte

L'audit (T3) a établi que `COMPOSE_DELIVERABLE` (ADR-0050) était **figé en mode PREVIEW** : le composer résolvait le DAG des briefs, scannait le vault, estimait le coût… puis renvoyait toujours `PREVIEW` avec `operatorId`/`campaignId`/`overrideManipulationMode`/`previewOnly` **`void`és**. Le « mode DISPATCHED (commit 4) » annoncé en commentaire n'a jamais été construit — le composant analytique était complet mais ne déclenchait **jamais** un forge.

Contrainte découverte à l'implémentation : `executeSequence` (le moteur de forge, ~1400 lignes) n'accepte qu'une **clé de séquence enregistrée**, pas une séquence ad-hoc ; il n'existe **aucune** séquence-wrapper par Glory tool ni de résolveur slug→séquence. Le dispatch « n'importe quel livrable cible via une GlorySequence ad-hoc » exigerait donc soit un refactor du cœur du moteur (rayon d'impact large — toutes les générations Oracle en dépendent), soit un runtime parallèle. De plus, sans clés provider, la forge DÉFÈRE toujours : le happy-path n'est pas vérifiable hors d'un environnement à clés.

## Décision

Dispatch réel **à faible rayon d'impact**, qui réutilise les primitives éprouvées **sans refactorer `executeSequence`** :

1. **`chainGloryToPtah` exporté** (était interne à `sequence-executor`) — additif, zéro impact sur les callers existants.
2. **`composer.dispatchForge`** (nouveau chemin) : exécute le Glory tool producteur du livrable cible via `executeTool(targetSlug)` (moteur single-tool existant), puis — si le tool déclare un `forgeOutput` (`shouldChainPtahForge`) — chaîne vers Ptah via `chainGloryToPtah` (matérialisation). `sourceIntentId` = l'émission réelle du tool (`run.intentId`), lignée hash-chain correcte.
   - **Livrable brief-only** (sans `forgeOutput`) : la sortie du tool EST le livrable → `DISPATCHED` sans forge Ptah.
   - **Livrable matériel** : `chainGloryToPtah` → `PTAH_MATERIALIZE_BRIEF` → `taskId` (forge lancée) OU `undefined` (provider absent → `DEFERRED_AWAITING_CREDENTIALS`, ADR-0021). Les deux sont des issues **honnêtes** ; jamais un faux succès.
3. **Garde backward-compatible** : le dispatch n'a lieu que sur `previewOnly === false` **explicite**. Le défaut (`undefined`/`true`) reste `PREVIEW` — les callers existants (router `previewOnly.default(true)`, page forge) sont **inchangés**. Le chemin dispatch est dormant jusqu'à opt-in.
4. **Surface founder/opérateur** : la page `/cockpit/operate/forge` affiche d'abord l'aperçu (UX output-first : on voit ce qui sera produit), puis un bouton **« Forger réellement ce livrable »** gardé par un `ConfirmDialog` (coût) qui rappelle `compose({ previewOnly: false })` et rend l'issue honnêtement (forge lancée / différée).

### Portée v1 et limite assumée

Le tool cible produit son brief avec le **contexte disponible** (piliers + briefs upstream réutilisables du vault). La **génération automatique des briefs upstream MANQUANTS** (dérouler tout le DAG) n'est PAS faite en v1 — elle exigerait le refactor du moteur de séquence + un environnement à clés pour la vérifier. Tracée RESIDUAL-DEBT (chantier env-avec-clés).

## Conséquences

- `COMPOSE_DELIVERABLE` n'est plus figé en PREVIEW : il **matérialise réellement** le livrable cible (ou DÉFÈRE honnêtement sans clés). Le trou T3 est fermé pour le cas single-target ; le déroulé multi-brief reste tracé.
- **Faible rayon d'impact** : aucun refactor de `executeSequence`. Un export additif + un chemin composer additif (dormant par défaut). Les générations Oracle et séquences Glory existantes ne sont pas touchées.
- **Vérifiable jusqu'à la frontière DEFERRED** : sans clés provider, le happy-path forge n'est pas exerçable ici — c'est explicite. PREVIEW (défaut) est vérifié inchangé ; le câblage + la non-régression sont vérifiés (tsc + tests).
- 0 nouveau modèle Prisma, 0 nouveau kind (réutilise `PTAH_MATERIALIZE_BRIEF`), cap 7/7. Test `deliverable-dispatch.test.ts`.
- Reste tracé RESIDUAL-DEBT : génération auto des briefs upstream manquants (déroulé complet du DAG) — nécessite refactor du moteur de séquence + env à clés.
