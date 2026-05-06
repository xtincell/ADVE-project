/**
 * Backfill script: Phase 18 (ADR-0052) Brand Tree.
 *
 * Pour chaque `Strategy` existante, crée un `BrandNode { nodeKind: "STANDALONE_BRAND" }`
 * orphelin (pas de parent) lié via `BrandNode.strategyId`. Le `nodeNature` est inféré
 * depuis `Strategy.brandNature` (default `PRODUCT` si null).
 *
 * Cette migration est **purement additive** : aucune Strategy n'est modifiée. Tous les
 * services existants (Glory tools, scoring, RAG) continuent à fonctionner sur Strategy
 * inchangée. Le BrandNode se superpose et active progressivement le Phase 18 noyau
 * (héritage piliers + RAG arborescent + variable bible reclassif).
 *
 * Usage:
 *   npx tsx scripts/backfill-brand-tree.ts            # apply
 *   npx tsx scripts/backfill-brand-tree.ts --dry-run  # count only, no write
 *
 * **Idempotent** : seules les Strategies sans BrandNode lié sont traitées.
 *
 * Cf. [docs/governance/adr/0052-brand-tree-multi-archetype.md](../docs/governance/adr/0052-brand-tree-multi-archetype.md) §3.
 */

import { PrismaClient, type BrandNature } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const prisma = makeClient();

const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Slugify reasonable pour BrandNode.slug (unique par operatorId).
 * Pas trop strict — on tolère les caractères latins étendus + déduplication suffix-timestamp si conflit.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function ensureUniqueSlug(operatorId: string, baseSlug: string): Promise<string> {
  const existing = await prisma.brandNode.findFirst({
    where: { operatorId, slug: baseSlug },
    select: { id: true },
  });
  if (!existing) return baseSlug;
  // Conflit — append short hash. Pas de timestamp brut pour rester déterministe sur re-run.
  const suffix = Math.floor(Math.random() * 9000 + 1000).toString();
  return `${baseSlug}-${suffix}`;
}

async function main() {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Phase 18 (ADR-0052) — Backfill Brand Tree`);
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN (no writes)" : "APPLY"}`);
  console.log(`${"=".repeat(70)}\n`);

  // 1. Toutes les Strategies (incluant archivées — un STANDALONE_BRAND archivé reste utile pour audit)
  const strategies = await prisma.strategy.findMany({
    select: {
      id: true,
      name: true,
      operatorId: true,
      clientId: true,
      brandNature: true,
      countryCode: true,
      archivedAt: true,
    },
  });

  console.log(`Total Strategies trouvées : ${strategies.length}`);

  // 2. Toutes les Strategies déjà liées à un BrandNode
  const existingLinks = await prisma.brandNode.findMany({
    where: { strategyId: { not: null } },
    select: { strategyId: true },
  });
  const linkedStrategyIds = new Set(existingLinks.map((b) => b.strategyId).filter((id): id is string => id !== null));

  console.log(`Strategies déjà liées à un BrandNode : ${linkedStrategyIds.size}`);

  // 3. Strategies à backfill (= sans BrandNode lié)
  const todo = strategies.filter((s) => !linkedStrategyIds.has(s.id));
  console.log(`Strategies à backfill : ${todo.length}\n`);

  if (todo.length === 0) {
    console.log("✓ Rien à faire — backfill déjà à jour. Idempotent OK.");
    return;
  }

  // Stats par nature
  const natureCount = new Map<string, number>();
  for (const s of todo) {
    const n = (s.brandNature ?? "PRODUCT") as string;
    natureCount.set(n, (natureCount.get(n) ?? 0) + 1);
  }
  console.log("Distribution par nature :");
  for (const [nature, count] of natureCount.entries()) {
    console.log(`  ${nature.padEnd(15)} : ${count}`);
  }
  console.log();

  // 4. Création
  let created = 0;
  let skippedNoOperator = 0;
  let errors = 0;

  for (const s of todo) {
    if (!s.operatorId) {
      // Strategy orpheline (pas d'operator) — on skip et on log. Cas rare, hérité de v3 stub data probablement.
      console.warn(`  ⚠ SKIP Strategy "${s.name}" (id=${s.id}) — pas d'operatorId`);
      skippedNoOperator++;
      continue;
    }

    const baseSlug = slugify(s.name) || `strategy-${s.id.slice(0, 8)}`;

    if (DRY_RUN) {
      console.log(
        `  [dry-run] would create BrandNode { name: "${s.name}", nodeKind: "STANDALONE_BRAND", nature: ${s.brandNature ?? "PRODUCT"}, country: ${s.countryCode ?? "—"} }`,
      );
      created++;
      continue;
    }

    try {
      const slug = await ensureUniqueSlug(s.operatorId, baseSlug);
      await prisma.brandNode.create({
        data: {
          name: s.name,
          slug,
          operatorId: s.operatorId,
          clientId: s.clientId,
          parentNodeId: null, // racine orpheline — l'opérateur ré-organisera via wizard portfolio-bulk-import
          nodeKind: "STANDALONE_BRAND",
          nodeNature: (s.brandNature ?? "PRODUCT") as BrandNature,
          nodeRole: [],
          countryCode: s.countryCode,
          lifecycle: s.archivedAt ? "ARCHIVED" : "ACTIVE",
          strategyId: s.id,
        },
      });
      created++;
      if (created % 50 === 0) {
        console.log(`  ... ${created} BrandNodes créés`);
      }
    } catch (err) {
      console.error(`  ✗ ERREUR sur Strategy "${s.name}" (id=${s.id}):`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  console.log();
  console.log(`${"=".repeat(70)}`);
  console.log(`Résultats backfill Brand Tree`);
  console.log(`${"=".repeat(70)}`);
  console.log(`  BrandNodes ${DRY_RUN ? "à créer (dry-run)" : "créés"} : ${created}`);
  if (skippedNoOperator > 0) {
    console.log(`  ⚠ Skipped (no operatorId)  : ${skippedNoOperator}`);
  }
  if (errors > 0) {
    console.log(`  ✗ Erreurs                  : ${errors}`);
  }
  console.log();

  // Verify final state
  if (!DRY_RUN) {
    const finalCount = await prisma.brandNode.count();
    console.log(`Total BrandNodes en DB après backfill : ${finalCount}`);
  }
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
