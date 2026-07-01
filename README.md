# La Fusée v7 — by UPgraders

L'OS qui transforme des marques d'Afrique francophone en icônes culturelles.

**Reconstruction totale en cours** (mandat 2026-07-01). L'ancienne base vit en
[`legacy/`](legacy/) (lecture seule) ; le plan maître et le board sont dans
[`docs/REBUILD-PLAN.md`](docs/REBUILD-PLAN.md) ; les règles agent dans [`CLAUDE.md`](CLAUDE.md).

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck && npm run test && npm run db:validate && npm run build
```

Stack : Next 16 · React 19 · TypeScript strict · Tailwind 4 · Prisma 7 (Postgres/Coolify) · Vitest.
