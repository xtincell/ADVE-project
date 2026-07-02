# PONT VPS — amorcer le travail depuis Claude Code sur le VPS

> Pour Alexandre. La session cloud a mené le rebuild jusqu'ici ; ce document est le point de
> reprise **depuis un terminal interactif** (ton VPS) — notamment pour la passe Design System qui
> exige `/design-login` (impossible en session cloud headless).

## 0. État au moment du pont (2026-07-02)

- **Prod** : https://lafusee-v7.76-13-128-23.sslip.io (Coolify, projet `lafusee-v7`, app + Postgres dédiés, seed au boot). L'ancienne app `lafusee` intacte.
- **Branche** : `claude/project-revamp-agent-safe-doc3ip` (PR #401). `main` = ancienne app, intouchée.
- **Parité** ([PARITY.md](PARITY.md)) : PORTÉ 32 · FUSIONNÉ 85+ · OBSOLÈTE 57 justifiées · À PORTER ~77 (P1 en tête de synthèse). Board : [REBUILD-PLAN.md §5](REBUILD-PLAN.md).
- **Identité corrigée (2026-07-02)** : **UPgraders vend La Fusée** — UPgraders est la marque-mère
  (logo, titres, home) ; La Fusée est LE produit (`/lafusee`). Domaine cible à la bascule :
  **upgraders.\*** (La Fusée en section/sous-domaine produit). Le rééquilibrage complet page par
  page se fait pendant la passe DS (ci-dessous).

## 1. Setup VPS (une fois)

```bash
git clone https://github.com/xtincell/ADVE-project.git && cd ADVE-project
git checkout claude/project-revamp-agent-safe-doc3ip
npm install && npx prisma generate
npm run typecheck && npm run test && npm run db:validate && npm run build   # doit être vert
claude   # lance Claude Code dans le repo — CLAUDE.md briefe la session automatiquement
```

## 2. Récupérer le Design System UPgraders (la raison d'être de ce pont)

Le canon est ton projet Claude Design : `https://claude.ai/design/p/6a9ef3f0-f8b2-46cc-8270-3fa6e6cde801`
(privé — inaccessible depuis le cloud, 403). Depuis Claude Code sur le VPS :

1. Dans la session : `/design-login` (ouvre l'auth claude.ai — terminal interactif requis).
2. Puis demande : *« Via DesignSync, liste mes projets design, prends le projet UPgraders
   (6a9ef3f0-…) et tire tous ses fichiers dans `design/upgraders-ds/` (lecture seule, aucun write
   vers claude.ai). »*
3. Vérifie que `design/upgraders-ds/` contient tokens + composants + previews.

## 3. Lancer la passe DS (vague 6 — WP au board, task définie)

Prompt à donner à la session VPS une fois `design/upgraders-ds/` présent :

> Tu es sur La Fusée v7 (lis CLAUDE.md, docs/REBUILD-PLAN.md §5 vague 6, docs/PARITY.md).
> Le canon DS est dans design/upgraders-ds/ (source de vérité absolue, prime sur globals.css).
> Mission : (1) diff tokens canon ↔ src/app/globals.css → aligne les valeurs exactes ;
> (2) conforme les primitives src/components/ui/* aux specs des composants du canon ;
> (3) harmonise les ~70 pages (espacements, variantes, typo, states) — **identité : UPgraders
> marque-mère, La Fusée produit** ; (4) doctrine motion (easings tokens) + passe a11y + responsive
> mobile page par page ; (5) test CI anti-hex-brut (hex hors globals.css → fail) ; (6) DESIGN.md
> court documentant le canon v7. Chaîne verte à chaque commit, board + PARITY à jour.

## 4. Déployer depuis le VPS

```bash
# token Coolify RÉGÉNÉRÉ (l'ancien a circulé en clair : chat + logs — à révoquer)
COOLIFY_URL=https://76-13-128-23.sslip.io COOLIFY_TOKEN=<nouveau> bash scripts/deploy-coolify.sh
```
Le script est idempotent (retrouve projet/db/app existants, pousse les envs, déclenche le deploy).
Alternative : workflow GitHub « Deploy Coolify » (secrets `COOLIFY_URL`/`COOLIFY_TOKEN`).

## 5. Continuer les vagues de parité

La mécanique : prendre les « À PORTER » de [PARITY.md](PARITY.md) par priorité (P1 d'abord — la
synthèse en fin de fichier les ordonne), une vague = 2-3 périmètres disjoints, chaîne verte,
flips PARITY + board dans le même commit, deploy. P1 restants après la vague 5 : communauté/
superfans, Overton sectoriel, social-audit, ingestion de documents à l'intake, benchmarks.

## 6. Bascule finale (WP-013 — ton GO explicite)

Backup ancienne base → liste des données vivantes à migrer → DNS **upgraders.\*** → merge PR #401
vers main → wipe ancien projet Coolify. Rien de tout ça sans ta décision.
