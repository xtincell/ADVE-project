/**
 * WAKANDA SEED — Phase 1: Operator + Clients
 */

import type { PrismaClient, Operator, Client } from "@prisma/client";
import { IDS, T } from "./constants";
import { track } from "./helpers";
import type { Prisma } from "@prisma/client";

export async function seedOperator(prisma: PrismaClient) {
  // ── Operator: WAKANDA DIGITAL ──────────────────────────────────────
  const operator = await prisma.operator.upsert({
    where: { id: IDS.operator },
    update: {},
    create: {
      id: IDS.operator,
      name: "WAKANDA DIGITAL Agency",
      slug: "wakanda-digital",
      status: "ACTIVE",
      licenseType: "LICENSED",
      licensedAt: new Date("2025-10-01"),
      licenseExpiry: new Date("2027-10-01"),
      maxBrands: 20,
      commissionRate: 0.12,
      isDummy: true,
      branding: {
        primaryColor: "#7C3AED",
        secondaryColor: "#C084FC",
        logo: "/demo/wakanda-digital-logo.svg",
        tagline: "Wakanda Forever — Brands That Inspire",
      } as Prisma.InputJsonValue,
    },
  });
  track("Operator");
  console.log(`[OK] Operator: ${operator.name}`);

  // ── Clients (one per brand) ────────────────────────────────────────
  const clientDefs = [
    { id: IDS.clientBliss, name: "BLISS by Wakanda", sector: "Cosmetiques & Skincare" },
    { id: IDS.clientVibranium, name: "Vibranium Tech", sector: "Fintech / Mobile Money" },
    { id: IDS.clientBrew, name: "Wakanda Brew Co.", sector: "Brasserie Artisanale" },
    { id: IDS.clientPanther, name: "Panther Athletics", sector: "Sportswear" },
    { id: IDS.clientShuri, name: "Shuri Academy", sector: "EdTech" },
    { id: IDS.clientJabari, name: "Jabari Heritage", sector: "Tourisme Culturel" },
  ];

  const clients: Record<string, Client> = {};
  for (const def of clientDefs) {
    const client = await prisma.client.upsert({
      where: { id: def.id },
      update: {},
      create: {
        id: def.id,
        name: def.name,
        operatorId: operator.id,
        sector: def.sector,
        country: "Wakanda",
        contactEmail: `contact@${def.name.toLowerCase().replace(/[^a-z]/g, "")}.wk`,
        contactPhone: "+237 6 00 00 00 00",
      },
    });
    clients[def.id] = client;
    track("Client");
  }
  console.log(`[OK] Clients: ${clientDefs.length} created`);

  // ── Client Allocations ─────────────────────────────────────────────
  await prisma.clientAllocation.upsert({
    where: { id: "wk-alloc-bliss-lead" },
    update: {},
    create: {
      id: "wk-alloc-bliss-lead",
      clientId: IDS.clientBliss,
      operatorId: operator.id,
      role: "LEAD",
      startDate: T.intake,
    },
  });
  track("ClientAllocation");

  return { operator, clients };
}
