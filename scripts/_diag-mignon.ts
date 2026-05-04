#!/usr/bin/env tsx
/* eslint-disable */
import "dotenv/config";
import { db } from "@/lib/db";

async function main() {
  const strategies = await db.strategy.findMany({
    where: { name: { contains: "mignon", mode: "insensitive" } },
    select: { id: true, name: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("Strategies matching 'mignon':");
  for (const s of strategies) {
    console.log(`  - ${s.name} (${s.id}) status=${s.status} org=${s.organizationId} created=${s.createdAt.toISOString()}`);
  }
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
