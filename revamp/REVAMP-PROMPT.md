# REVAMP PROMPT — LA FUSÉE v2 (Claude Fable 5)

## Mode d'emploi opérateur (ceci n'est PAS le prompt)

1. **Créer un repo GitHub neuf** (vide, branche `main`, licence privée) et le cloner.
2. **Copier à la racine** : `CAHIER-DES-CHARGES.md` (obligatoire).
3. Optionnel mais recommandé — créer `_reference/` (gitignoré) contenant : le dump texte du repo v1, plus les dossiers d'assets v1 `public/brand/` et `src/assets/fonts/`.
4. Préparer un `.env` de dev : `DATABASE_URL` (un Postgres 16 local ou distant), `NEXTAUTH_SECRET`, `NEXT_PUBLIC_BASE_URL=http://localhost:3000`. Tout le reste est optionnel.
5. Lancer **Claude Code avec Claude Fable 5** à la racine du repo, effort `high` (ou `xhigh`), permissions d'édition et d'exécution accordées, puis coller **l'intégralité du prompt ci-dessous**.
6. Le run est long (plusieurs heures, plusieurs fenêtres de contexte). Pour reprendre une session interrompue : coller le **Bloc de reprise** (Annexe A) au lieu du prompt complet.

---

## LE PROMPT (copier tout ce qui suit)

Tu construis **La Fusée v2** pour UPgraders : la reconstruction from scratch, dans ce repo neuf, d'un produit SaaS réel qui existe déjà en v1.

<contexte>
Le v1 (~282k LOC) fonctionne et a des clients potentiels, mais ses fondations sont sur-ingéniérées au point d'étouffer le produit : méta-gouvernance omniprésente, 202 tables, 546 types d'intents, régime documentaire auto-référentiel. Décision de l'opérateur : repartir de zéro plutôt que de trimballer ces erreurs enfouies dans les fondamentaux. Tout ce qui mérite de survivre du v1 a été distillé dans un cahier des charges — l'intention produit et les fonctionnalités réellement développées, rien d'autre.

Le déploiement se fera sur un serveur Node standard géré par l'opérateur : ce n'est pas ton sujet. Ton sujet est que le projet soit **agnostique de sa zone de déploiement** (contrat de portabilité du cahier §11.1) et impeccable en tant que produit.
</contexte>

<mission>
Livrer une application **production-ready** conforme à `CAHIER-DES-CHARGES.md` (racine du repo). Ce cahier est l'autorité unique : périmètre §13, exigences §1–§11, budgets de sobriété §14. La mission est terminée quand la Definition of Done (ci-dessous) est vérifiée, pas avant.
</mission>

<ressources>
- `CAHIER-DES-CHARGES.md` — la spec. Lis-le intégralement avant toute décision.
- `_reference/` (si présent) — dump du code v1 + assets de marque. Usage autorisé : recherche ciblée d'un détail métier précis (un wording, une formule, une grille de valeurs, le contenu des seeds canon UPgraders/La Fusée) et récupération telle quelle des **assets binaires** (logos, photos, fonts). Usage interdit : copier des couches de code, t'inspirer de l'architecture v1, importer ses patterns de gouvernance. En cas de conflit entre le v1 et le cahier, le cahier gagne.
- Absence de `_reference/` : le cahier suffit ; pour les seeds canon et les assets, crée des placeholders propres et note-le au journal.
</ressources>

<regles_de_construction>
- **Qualité production uniquement.** Pas de scaffolding pour un futur hypothétique, pas d'implémentation à moitié finie, pas de TODO silencieux. Chaque tranche livrée est utilisable de bout en bout.
- **Sobriété.** N'ajoute ni feature, ni abstraction, ni configurabilité au-delà de ce que le cahier demande. Pas de gestion d'erreur pour des scénarios impossibles ; valide aux frontières du système (entrées utilisateur, APIs externes), fais confiance au code interne. Le bon niveau de complexité est le minimum qui sert le parcours utilisateur. Les budgets du cahier §14 sont tes garde-fous ; si tu dois les dépasser, justifie-le en une phrase au journal.
- **Anti-patterns v1 = interdits** (cahier §12) : pas de bus d'intents généralisé, pas de hash-chain, pas de mythologie dans le nommage, pas de double implémentation, pas de feature fantôme, pas de test de doctrine. Si tu te surprends à construire de la gouvernance plutôt que du produit, arrête-toi et simplifie.
- **Honest-empty & manual-first & LLM-optionnel** (cahier §3.5) : ce sont des invariants de conception, applique-les à chaque écran et chaque service.
- **Portabilité** (cahier §11.1) : config 100 % env, build pur, aucune API d'hébergeur, runtime Node partout, migrations/seeds en commandes explicites. Ne crée aucun pipeline de déploiement.
- **Décide, n'inventorie pas.** Quand tu as assez d'informations pour agir, agis. Ne re-dérive pas ce qui est déjà établi, ne rouvre pas les décisions du cahier, ne présente pas d'éventail d'options que tu ne suivras pas : choisis, applique, note la décision en une ligne.
</regles_de_construction>

<methode>
**Phase 0 — Fondations de travail** (première fenêtre de contexte) :
1. Lis `CAHIER-DES-CHARGES.md` en entier.
2. Écris `ARCHITECTURE.md` : une page maximum — stack retenu (cahier §11 : TypeScript + Next.js App Router + Prisma + PostgreSQL ; la couche API — tRPC ou route handlers/server actions — est ton choix, justifié en deux phrases), découpage en modules, modèle de données initial (liste des tables), conventions. Décision unique, pas de comparatif.
3. Scaffolde le projet + outillage : lint, typecheck, Vitest, Playwright, scripts npm (`dev`, `build`, `db:migrate`, `db:seed`, `test`, `e2e`), un `scripts/init.sh` qui amorce une machine de dev en une commande, CI GitHub Actions minimale (typecheck + lint + tests + build).
4. Crée l'état de mission : `_build/LEDGER.json` (chaque ligne du périmètre cahier §13 avec statut `pending/in_progress/done/out` + preuve) et `_build/JOURNAL.md` (décisions datées, une ligne chacune). Ces deux fichiers sont ta mémoire entre fenêtres de contexte — tiens-les à jour après chaque tranche.
5. Écris le `CLAUDE.md` du nouveau repo : court (commandes, architecture en 10 lignes, conventions, lien vers le cahier).
6. Premier commit + push.

**Phase 1 — Colonne vertébrale** : auth + rôles + god-mode + tenant scoping ; schéma DB initial + migrations + seeds (admin, canon UPgraders/La Fusée, pays/grille, démo) ; design tokens + layout + navigation ; puis le **funnel public complet en happy path** (landing → intake → résultat scoré → paywall stub → activation compte) avec son test E2E Playwright vert. Ce test vert est le premier jalon : rien d'autre ne commence avant.

**Phase 2 — Tranches verticales**, dans l'ordre du cahier §13 (méthode ADVE/RTIS/scoring → Oracle+PDF → paiements réels → Console → Guilde → notifications → intelligence → Creator/Agency minces → MCP). Pour chaque tranche : construire → seeder → tester (unitaires domaine + E2E du parcours) → mettre à jour LEDGER/JOURNAL → commit. Une tranche n'est `done` que si son parcours utilisateur s'exécute réellement dans l'app lancée.

**Phase 3 — Durcissement** : passe responsive/a11y/i18n de base ; `.env.example` exhaustif relu ; Dockerfile + standalone + pm2 vérifiés par un build/run réel ; README d'installation (5 minutes chrono) ; purge de tout code mort ; audit final contre la Definition of Done, ligne par ligne, preuves à l'appui.
</methode>

<verification>
- Après chaque tranche : `typecheck`, `lint`, tests, E2E ciblé — tous verts avant commit. Ne jamais affaiblir un test pour le faire passer ; si un test est faux, corrige-le et dis pourquoi au journal.
- **Vérifie en exécutant, pas en relisant.** Lance l'app (dev server + Playwright) et exerce le parcours modifié. « Ça devrait marcher » n'existe pas.
- À la fin de chaque phase, lance des **sous-agents vérificateurs à contexte frais** : donne-leur le cahier + la Definition of Done et demande-leur de tenter de réfuter la conformité de ce qui vient d'être livré (parcours cassés, écarts au cahier, données inventées, budgets dépassés). Corrige ce qui survit à ta contre-vérification.
- Avant tout rapport d'avancement : audite chaque affirmation contre un résultat d'outil de cette session (sortie de test, capture, log). Ne rapporte que ce que tu peux prouver ; si quelque chose n'est pas vérifié, dis-le explicitement. Si des tests échouent, montre la sortie.
</verification>

<autonomie>
Tu opères en autonomie ; l'opérateur ne suit pas en temps réel. Pour toute action réversible qui découle du cahier, avance sans demander. Ne t'interromps que pour : une action destructive ou irréversible, un secret/credential que seul l'opérateur peut fournir, ou une vraie décision de périmètre que le cahier ne tranche pas — dans ce cas pose UNE question précise et termine ton tour ; sinon choisis l'option la plus simple et note-la au journal.

Délègue aux sous-agents les sous-tâches indépendantes (recherches dans `_reference/`, vérifications, audits parallèles) et continue à travailler pendant qu'ils tournent.

Avant de terminer un tour, relis ton dernier paragraphe : si c'est un plan, une promesse (« je vais… ») ou une liste d'étapes non faites, fais ce travail maintenant. Termine ton tour uniquement quand la mission est complète ou que tu es bloqué sur un input opérateur. Ne t'arrête jamais par souci de budget de contexte : commit + LEDGER/JOURNAL à jour, puis continue — la session se poursuit d'une fenêtre à l'autre et il est encouragé d'utiliser tout le contexte disponible.
</autonomie>

<communication>
Tes rapports (fins de phase, fin de mission) s'adressent à un lecteur qui n'a pas vu ton travail : commence par le résultat en une phrase, puis le détail utile. Phrases complètes, français clair, zéro jargon interne ni abréviations inventées en cours de route ; chaque fichier/commande/décision mentionné est expliqué en clair. Entre les appels d'outils, contente-toi de notes brèves.
</communication>

<definition_of_done>
1. `npm run build` pur (zéro migration/seed/réseau dedans) ; typecheck 0 erreur ; lint 0 erreur ; tous les tests verts.
2. E2E Playwright verts sur les parcours d'argent : funnel complet (landing→intake→résultat→paiement test→activation) ; amendement ADVE→refresh RTIS→export PDF Oracle ; dépôt mission Guilde→modération→candidature ; abonnement manuel WhatsApp→validation opérateur→gate premium ouvert ; notification in-app reçue via SSE.
3. L'app démarre et fonctionne avec pour seule config `DATABASE_URL` + `NEXTAUTH_SECRET` + base URL ; sans aucune clé LLM, tout le périmètre déterministe fonctionne ; les connecteurs sans credentials affichent des états `DEFERRED` explicites.
4. `docker build` + run de l'image OK ; démarrage pm2 documenté.
5. `.env.example` exhaustif ; aucun secret en dur ; aucune référence à un hébergeur dans le code applicatif.
6. Seeds : un `db:seed` donne un admin god-mode fonctionnel + les 2 marques canon + données démo — aucun écran vide non-intentionnel à la première visite.
7. `_build/LEDGER.json` : 100 % des lignes du périmètre §13 en `done` ou `out` motivé ; budgets §14 respectés ou dépassement justifié.
8. README (installation locale en 5 minutes) + CLAUDE.md court + ARCHITECTURE.md à jour.
9. Zéro code mort, zéro `@deprecated`, zéro mock en chemin de production.
10. Rapport final : ce qui est livré, ce qui est `out` et pourquoi, les décisions notables du journal — chaque claim adossé à une preuve.
</definition_of_done>

Commence maintenant par la Phase 0.

---

## Annexe A — Bloc de reprise de session (coller dans une nouvelle session du même repo)

```
Tu reprends la construction de La Fusée v2 dans ce repo (mission en cours, pas un nouveau projet).
1. Lis CAHIER-DES-CHARGES.md (autorité), ARCHITECTURE.md, _build/LEDGER.json, _build/JOURNAL.md, puis `git log --oneline -30`.
2. Vérifie l'état réel : `npm run typecheck && npm run lint && npm test`, lance l'app et rejoue le dernier parcours E2E touché.
3. Reprends la première ligne LEDGER en `in_progress` (ou la suivante en `pending`) et continue selon la <methode>, <verification>, <autonomie> et la <definition_of_done> du prompt d'origine (revamp/REVAMP-PROMPT.md du repo v1, ou demande-les à l'opérateur si absentes du repo).
Les règles clés restent : cahier = autorité ; sobriété ; honest-empty ; manual-first ; LLM optionnel ; portabilité §11.1 ; vérifier en exécutant ; LEDGER/JOURNAL à jour ; ne t'arrête que bloqué ou fini.
```

## Annexe B — Checklist de lancement (opérateur)

- [ ] Repo GitHub neuf créé, cloné, `main` protégée si souhaité.
- [ ] `CAHIER-DES-CHARGES.md` copié à la racine (depuis `revamp/` du repo v1).
- [ ] `_reference/` déposé (dump v1 + `public/brand/` + `src/assets/fonts/`) et ajouté au `.gitignore` — optionnel mais recommandé pour les seeds canon et les assets.
- [ ] Postgres 16 de dev disponible ; `.env` minimal écrit (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_BASE_URL`).
- [ ] Clés optionnelles si disponibles (Anthropic/OpenRouter, Stripe test) — sinon rien : l'app doit tourner sans.
- [ ] Session Claude Code (Fable 5, effort high/xhigh), permissions accordées, prompt collé.
- [ ] À chaque reprise : Annexe A.
