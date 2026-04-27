/**
 * Seed script: Migrate all 91 Glory Tool prompt templates to PromptVersion table.
 *
 * Usage: npx tsx scripts/seed-prompt-versions.ts
 *
 * This creates PromptVersion v1 for every tool that has a promptTemplate.
 * Idempotent: skips tools that already have a version in the registry.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Dynamic import to handle the registry module
  const { EXTENDED_GLORY_TOOLS } = await import(
    "../src/server/services/artemis/tools/registry"
  );

  const tools = Object.values(EXTENDED_GLORY_TOOLS) as Array<{
    slug: string;
    name: string;
    promptTemplate?: string;
  }>;

  console.log(`Found ${tools.length} Glory Tools in registry`);

  let seeded = 0;
  let skipped = 0;

  for (const tool of tools) {
    if (!tool.promptTemplate) {
      skipped++;
      continue;
    }

    // Check if already seeded
    const existing = await prisma.promptVersion.findFirst({
      where: { toolSlug: tool.slug },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Extract template variables
    const variables = [...tool.promptTemplate.matchAll(/\{\{(\w+)\}\}/g)].map(
      (m) => m[1]
    );

    await prisma.promptVersion.create({
      data: {
        toolSlug: tool.slug,
        version: 1,
        template: tool.promptTemplate,
        variables: [...new Set(variables)],
        isActive: true,
        createdBy: "seed-script-v4",
      },
    });

    seeded++;
  }

  console.log(`Seeded: ${seeded} | Skipped: ${skipped} | Total: ${tools.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
