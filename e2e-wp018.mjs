// Seed E2E jetable WP-018 (supprimé après usage) — crée une agence + un client
// complet (campagne→action→brief→missions + candidature + finance) et imprime
// deux cookies de session signés (opérateur agence / fondateur sans agence).
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SignJWT } from "jose";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const DAY = 24 * 60 * 60 * 1000;
const stamp = `e2e-${Date.now()}`;

async function sign(payload) {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(secret);
}

const operator = await db.user.create({
  data: { email: `${stamp}-op@lafusee.test`, name: "Awa Opératrice" },
});
const agencyWs = await db.workspace.create({
  data: { slug: `${stamp}-agence`, name: "Studio Baobab", kind: "AGENCY" },
});
await db.membership.create({
  data: { userId: operator.id, workspaceId: agencyWs.id, role: "OPERATOR" },
});

const wsClient = await db.workspace.create({
  data: { slug: `${stamp}-client`, name: "Maison Nnem", kind: "BRAND" },
});
await db.membership.create({
  data: { userId: operator.id, workspaceId: wsClient.id, role: "MEMBER" },
});
const brand = await db.brand.create({
  data: {
    workspaceId: wsClient.id,
    slug: `${stamp}-marque`,
    name: "Nnem Cosmétiques",
    sector: "Beauté",
    level: "FRAGILE",
    countryCode: "CM",
  },
});
await db.brandScore.create({
  data: { brandId: brand.id, total: 118, dimensions: {}, level: "FRAGILE" },
});
const sub = await db.subscription.create({
  data: {
    workspaceId: wsClient.id,
    plan: "cockpit",
    status: "active",
    provider: "manual_whatsapp",
    expiresAt: new Date(Date.now() + 22 * DAY),
  },
});
const ref = `LF-${sub.id.slice(-6).toUpperCase()}`;
await db.payment.createMany({
  data: [
    {
      workspaceId: wsClient.id,
      amount: 8000,
      currency: "XOF",
      method: "manual_whatsapp",
      status: "confirmed",
      reference: ref,
    },
    {
      workspaceId: wsClient.id,
      amount: 8000,
      currency: "XAF",
      method: "manual_whatsapp",
      status: "confirmed",
      createdAt: new Date(Date.now() - 45 * DAY),
    },
  ],
});
const campaign = await db.campaign.create({
  data: {
    brandId: brand.id,
    name: "Lancement gamme karité",
    objective: "Faire de la gamme karité la référence beauté à Douala.",
    countryCode: "CM",
    status: "ACTIVE",
  },
});
const action = await db.campaignAction.create({
  data: {
    campaignId: campaign.id,
    name: "Séance photo produit",
    kind: "photo-session",
    status: "BRIEFED",
    estimatedCost: 150000,
    costCurrency: "XAF",
  },
});
await db.campaignAction.create({
  data: { campaignId: campaign.id, name: "Activation marché", kind: "custom", status: "PLANNED" },
});
const brief = await db.brief.create({
  data: { actionId: action.id, title: "Brief — Séance photo produit", content: {}, status: "VALIDATED" },
});
const mission = await db.mission.create({
  data: { briefId: brief.id, title: "Shooting 12 visuels karité", status: "OPEN", openToGuild: true },
});
await db.mission.create({
  data: {
    briefId: brief.id,
    title: "Retouches lot 1",
    status: "VALIDATED",
    assignee: "Chantal K.",
    validatedAt: new Date(),
  },
});
const talentUser = await db.user.create({
  data: { email: `${stamp}-talent@lafusee.test`, name: "Talent E2E" },
});
const talent = await db.talentProfile.create({
  data: {
    userId: talentUser.id,
    headline: "Photographe produit — Douala",
    city: "Douala",
    countryCode: "CM",
  },
});
await db.missionApplication.create({
  data: { missionId: mission.id, talentId: talent.id, pitch: "Portfolio dispo.", status: "APPLIED" },
});

// Fondateur SANS agence (état de refus honnête).
const founder = await db.user.create({
  data: { email: `${stamp}-fondateur@lafusee.test`, name: "Fondateur Solo" },
});
const wsSolo = await db.workspace.create({
  data: { slug: `${stamp}-solo`, name: "Solo Brand", kind: "BRAND" },
});
await db.membership.create({
  data: { userId: founder.id, workspaceId: wsSolo.id, role: "OWNER" },
});

const agencyCookie = await sign({
  userId: operator.id,
  workspaceId: agencyWs.id,
  role: "OPERATOR",
  workspaceKind: "AGENCY",
});
const founderCookie = await sign({
  userId: founder.id,
  workspaceId: wsSolo.id,
  role: "OWNER",
  workspaceKind: "BRAND",
});

console.log(JSON.stringify({ agencyCookie, founderCookie, wsClientId: wsClient.id, wsSoloId: wsSolo.id }));
await db.$disconnect();
