/**
 * WAKANDA SEED — Batch 6a: Comms / broadcast (Anubis, ADR-0020/0021).
 *
 * Irrigue « comms / broadcast (anubis) » : `CommsPlan` → `BroadcastJob`,
 * `EmailTemplate`/`SmsTemplate`, et `ExternalConnector`. Les connecteurs ad-network
 * / email / SMS sont credential-gated → semés en MOCK HONNÊTE (status INACTIVE +
 * `config._mocked` / jobs `DEFERRED`), jamais en faux live (les clés réelles
 * vivent dans le Credentials Vault, ADR-0021).
 *
 * Déterministe. BroadcastJob après CommsPlan (FK).
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter } from "./helpers";

export async function seedCommsBroadcast(prisma: PrismaClient) {
  // ── External connectors — credential-gated → MOCK honnête ────────────
  const connectors: Array<{ type: string; pillar?: Record<string, string> }> = [
    { type: "meta-ads", pillar: { "meta-reach": "e" } },
    { type: "google-ads" },
    { type: "mailgun" },
    { type: "twilio" },
    { type: "slack", pillar: { "slack-velocity": "e" } },
  ];
  for (const c of connectors) {
    await prisma.externalConnector.upsert({
      where: { operatorId_connectorType: { operatorId: IDS.operator, connectorType: c.type } },
      update: {},
      create: {
        id: `wk-connector-${c.type}`,
        operatorId: IDS.operator,
        connectorType: c.type,
        config: { _mocked: true, reason: "AWAITING_CREDENTIALS" } as Prisma.InputJsonValue,
        status: "INACTIVE",
        signalCount: 0,
        // Json? — omettre (undefined) plutôt que JS null (Prisma rejette null sur Json).
        pillarMapping: c.pillar ? (c.pillar as Prisma.InputJsonValue) : undefined,
      },
    });
    track("ExternalConnector");
  }

  // ── Email / SMS templates (rendus déterministes Handlebars/MJML) ─────
  const emailTemplates: Array<{ id: string; name: string; subject: string; category: string }> = [
    { id: "wk-email-welcome", name: "welcome-cockpit", subject: "Bienvenue dans votre Cockpit — {{brandName}}", category: "transactional" },
    { id: "wk-email-launch", name: "campaign-launch", subject: "{{campaignName}} est lancée 🚀", category: "marketing" },
  ];
  for (const t of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { operatorId_name: { operatorId: IDS.operator, name: t.name } },
      update: {},
      create: {
        id: t.id,
        operatorId: IDS.operator,
        name: t.name,
        subject: t.subject,
        htmlBody: `<mjml><mj-body><mj-section><mj-column><mj-text>Bonjour {{firstName}},</mj-text></mj-column></mj-section></mj-body></mjml>`,
        textBody: "Bonjour {{firstName}},",
        variables: { brandName: "string", firstName: "string", campaignName: "string" } as Prisma.InputJsonValue,
        category: t.category,
        isActive: true,
      },
    });
    track("EmailTemplate");
  }

  await prisma.smsTemplate.upsert({
    where: { operatorId_name: { operatorId: IDS.operator, name: "campaign-reminder" } },
    update: {},
    create: {
      id: "wk-sms-reminder",
      operatorId: IDS.operator,
      name: "campaign-reminder",
      body: "{{brandName}}: {{message}} — Stop au 36111",
      variables: { brandName: "string", message: "string" } as Prisma.InputJsonValue,
      isActive: true,
    },
  });
  track("SmsTemplate");

  // ── CommsPlan → BroadcastJob ─────────────────────────────────────────
  const plans: Array<{
    id: string;
    strategyId: string;
    campaignId: string;
    mode: string;
    status: string;
    channels: string[];
    jobs: Array<{ channel: string; status: string; deferred?: boolean }>;
  }> = [
    {
      id: "wk-comms-heritage",
      strategyId: IDS.stratBliss,
      campaignId: IDS.campaignHeritage,
      mode: "entertainer",
      status: "COMPLETED",
      channels: ["email", "sms", "push", "meta-ads"],
      jobs: [
        { channel: "email", status: "SENT" },
        { channel: "sms", status: "SENT" },
        { channel: "push", status: "SENT" },
        { channel: "meta-ads", status: "DEFERRED", deferred: true },
      ],
    },
    {
      id: "wk-comms-glow",
      strategyId: IDS.stratBliss,
      campaignId: IDS.campaignGlow,
      mode: "dealer",
      status: "ACTIVE",
      channels: ["email", "meta-ads", "tiktok-ads"],
      jobs: [
        { channel: "email", status: "SENT" },
        { channel: "meta-ads", status: "DEFERRED", deferred: true },
        { channel: "tiktok-ads", status: "DEFERRED", deferred: true },
      ],
    },
  ];

  let jobCount = 0;
  for (const p of plans) {
    await prisma.commsPlan.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        strategyId: p.strategyId,
        campaignId: p.campaignId,
        mode: p.mode,
        channels: p.channels as Prisma.InputJsonValue,
        audience: { rule: "superfans + ambassadeurs", estimatedReach: 45000 } as Prisma.InputJsonValue,
        status: p.status,
        scheduledFor: T.heritageLive,
        operatorId: IDS.operator,
        createdAt: T.campaignBriefed,
      },
    });
    track("CommsPlan");

    let idx = 0;
    for (const j of p.jobs) {
      await prisma.broadcastJob.upsert({
        where: { id: `${p.id}-job-${idx}` },
        update: {},
        create: {
          id: `${p.id}-job-${idx}`,
          commsPlanId: p.id,
          channel: j.channel,
          payload: j.channel === "email"
            ? { templateName: "campaign-launch", subject: "Campagne lancée" }
            : { message: "Découvrez la nouvelle collection." },
          status: j.status,
          providerTaskId: j.deferred ? null : `mock-${j.channel}-${idx}`,
          attempts: j.deferred ? 0 : 1,
          errorLog: j.deferred ? ({ _mocked: true, reason: "AWAITING_CREDENTIALS" } as Prisma.InputJsonValue) : undefined,
          metrics: j.deferred ? undefined : ({ delivered: 42000, opened: 18500, clicked: 6200 } as Prisma.InputJsonValue),
          operatorId: IDS.operator,
          sentAt: j.status === "SENT" ? T.heritageLive : null,
          createdAt: T.campaignBriefed,
        },
      });
      idx++;
      jobCount++;
    }
  }
  track("BroadcastJob", jobCount);

  console.log(
    `[OK] Comms: ${connectors.length} connectors (mock) + ${emailTemplates.length} email + 1 sms templates + ${plans.length} plans + ${jobCount} broadcast jobs`,
  );
}
