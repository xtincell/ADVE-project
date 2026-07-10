# Base de données — architecture

**Production (depuis le 2026-07-05) : PostgreSQL self-hosted sur le VPS, orchestré par Coolify.**

La Fusée v6 (`powerupgraders.com`) tourne sur le VPS ; sa base est un Postgres Coolify
dédié (base `lafusee`), atteint par Prisma via `DATABASE_URL`. Contrairement à Supabase,
il n'y a **aucune API REST publique** devant la base — la surface d'attaque est réduite
(le contrôle d'accès est celui du réseau + des identifiants Postgres, pas une clé anon).

## Migration depuis Supabase (2026-07-05)

Les données (204 tables Prisma, ~4 500 lignes) ont été migrées du projet Supabase
`ADVE-project` (`myhzthcfmbcelsfbrbcf`, région `eu-central-1`, Postgres 17) vers le
Postgres Coolify du VPS par `pg_dump` / restore. Les comptes de lignes ont été vérifiés
**identiques** à la source (schéma, contraintes, enums, migrations Prisma inclus).

**Supabase est déprécié.** Le dossier `supabase/` (config CLI) et le pooler
transaction-mode (port 6543) ne concernent plus la production. Le projet Supabase peut
être mis en pause après une courte période de sécurité (en gardant un backup).

## Connexion

- Prisma lit **`DATABASE_URL`** (et `DIRECT_URL` pour les migrations/seed si distinct).
- Self-hosted → **pas de pgbouncer requis** ; `DIRECT_URL` peut viser le même Postgres
  que `DATABASE_URL` (plus de contrainte « session-mode vs transaction-mode »).
- Garde-fous de pool applicatifs : `DB_POOL_MAX`, `DB_POOL_IDLE_MS` (`src/lib/db.ts`).

Exemple :

```env
DATABASE_URL="postgresql://lafusee:<mot-de-passe>@<hote-coolify-postgres>:5432/lafusee?schema=public"
# Migrations/seed : peut viser le même Postgres (pas de pooler)
DIRECT_URL="postgresql://lafusee:<mot-de-passe>@<hote-coolify-postgres>:5432/lafusee?schema=public"
```

Le mot de passe DB ne vit **qu'en variable d'environnement** (ADR-0075) — jamais committé.
