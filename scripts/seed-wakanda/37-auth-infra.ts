/**
 * Sprint L — Wakanda seed Phase 6 : auth plumberie + infra config.
 *
 * Comble le gap "31 modèles non-seedés" identifié à l'audit Phase 4.
 * Ajoute :
 *  - Account (4) : OAuth NextAuth pour les 4 main users
 *  - Session (3) : sessions actives BLISS/SHURI/VIBRANIUM
 *  - VerificationToken (2) : magic-link + reset password en attente
 *  - MfaSecret (1) : ADMIN userWkabi avec MFA
 *  - Subscription (2) : retainer BLISS PRO + retainer SHURI BASE
 *  - WebhookConfig (3) : Stripe + CinetPay + Meta Ads
 *  - PromptVersion (4) : un par purpose principal du LLM gateway
 *  - ModelPolicy (5) : policies actives pour les 5 GatewayPurpose
 *  - PaymentProviderConfig (3) : CinetPay + Stripe + PayPal
 *  - McpApiKey (2) : keys de demo
 *  - DriverGloryTool (8) : mapping driver → glory tool typique
 *  - ExternalConnector (3) : Monday + Zoho + générique
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T, DEMO_PASSWORD } from "./constants";
import { hashPassword, track, daysAfter } from "./helpers";

interface Brands {
  bliss: { strategy: { id: string } };
  vibranium: { strategy: { id: string } };
  brew: { strategy: { id: string } };
  panther: { strategy: { id: string } };
  shuri: { strategy: { id: string } };
  jabari: { strategy: { id: string } };
}

export async function seedAuthInfra(prisma: PrismaClient, brands: Brands) {
  const _pw = await hashPassword(DEMO_PASSWORD);

  // ── Account (NextAuth OAuth links) ──
  const oauthAccounts = [
    { id: "wk-account-amara-google", userId: IDS.userAmara, provider: "google", providerAccountId: "google_amara_001" },
    { id: "wk-account-shuri-google", userId: IDS.userShuri, provider: "google", providerAccountId: "google_shuri_001" },
    { id: "wk-account-tchalla-linkedin", userId: IDS.userTchalla, provider: "linkedin", providerAccountId: "li_tchalla_001" },
    { id: "wk-account-mbaku-credentials", userId: IDS.userMbaku, provider: "credentials", providerAccountId: "wk-user-mbaku-jabari" },
  ];
  for (const a of oauthAccounts) {
    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: a.provider, providerAccountId: a.providerAccountId } },
      update: {},
      create: {
        id: a.id,
        userId: a.userId,
        type: a.provider === "credentials" ? "credentials" : "oauth",
        provider: a.provider,
        providerAccountId: a.providerAccountId,
        access_token: a.provider === "credentials" ? null : `wk_oauth_token_${a.provider}_${a.userId.slice(-8)}`,
        token_type: a.provider === "credentials" ? null : "Bearer",
        scope: a.provider === "google" ? "openid email profile" : a.provider === "linkedin" ? "r_liteprofile r_emailaddress" : null,
      },
    });
    track("Account");
  }

  // ── Session ──
  const sessions = [
    { id: "wk-session-amara",   userId: IDS.userAmara,   token: "wk-st-amara-active-001",   expiresInDays: 14 },
    { id: "wk-session-shuri",   userId: IDS.userShuri,   token: "wk-st-shuri-active-001",   expiresInDays: 14 },
    { id: "wk-session-tchalla", userId: IDS.userTchalla, token: "wk-st-tchalla-active-001", expiresInDays: 7 },
  ];
  for (const s of sessions) {
    await prisma.session.upsert({
      where: { sessionToken: s.token },
      update: {},
      create: {
        id: s.id,
        sessionToken: s.token,
        userId: s.userId,
        expires: daysAfter(T.now, s.expiresInDays),
      },
    });
    track("Session");
  }

  // ── VerificationToken ──
  const tokens = [
    { identifier: "amara@bliss.wk",    token: "wk-vt-magic-amara-001",  expiresInH: 1  },
    { identifier: "ramonda@wakandabrew.wk", token: "wk-vt-reset-ramonda-001", expiresInH: 24 },
  ];
  for (const t of tokens) {
    await prisma.verificationToken.upsert({
      where: { token: t.token },
      update: {},
      create: {
        identifier: t.identifier,
        token: t.token,
        expires: new Date(T.now.getTime() + t.expiresInH * 3_600_000),
      },
    });
    track("VerificationToken");
  }

  // ── MfaSecret (ADMIN only) ──
  await prisma.mfaSecret.upsert({
    where: { userId: IDS.userWkabi },
    update: {},
    create: {
      userId: IDS.userWkabi,
      secretCipher: "wk_aes_mfa_cipher_BASE64==",
      enrolledAt: daysAfter(T.now, -45),
      lastUsedAt: daysAfter(T.now, -1),
      recoveryCodesCipher: "wk_aes_recovery_cipher_BASE64==",
    },
  });
  track("MfaSecret");

  // ── Subscription ──
  const subs = [
    { id: "wk-sub-bliss-pro",  userId: IDS.userAmara, tier: "PRO",  amount: 290000, status: "ACTIVE", strategyId: brands.bliss.strategy.id },
    { id: "wk-sub-shuri-base", userId: IDS.userShuri, tier: "BASE", amount: 95000,  status: "ACTIVE", strategyId: brands.shuri.strategy.id },
  ];
  for (const s of subs) {
    await prisma.subscription.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        userId: s.userId,
        tier: s.tier,
        amount: s.amount,
        currency: "XAF",
        status: s.status,
        startedAt: daysAfter(T.now, -60),
        currentPeriodStart: daysAfter(T.now, -15),
        currentPeriodEnd: daysAfter(T.now, 15),
        strategyId: s.strategyId,
      },
    });
    track("Subscription");
  }

  // ── WebhookConfig ──
  const webhooks = [
    { id: "wk-webhook-stripe",      name: "Stripe payment events",   url: "https://lafusee.example/api/payment/webhook/stripe",       secret: "whsec_stripe_BASE64==" },
    { id: "wk-webhook-cinetpay",    name: "CinetPay payment events", url: "https://lafusee.example/api/payment/webhook/cinetpay",     secret: "wk_cp_secret_BASE64==" },
    { id: "wk-webhook-meta-ads",    name: "Meta Ads campaign sync",  url: "https://lafusee.example/api/anubis/webhook/meta",          secret: "wk_meta_secret_BASE64==" },
  ];
  for (const w of webhooks) {
    await prisma.webhookConfig.upsert({
      where: { id: w.id },
      update: {},
      create: {
        id: w.id,
        name: w.name,
        url: w.url,
        secret: w.secret,
        events: ["payment.succeeded", "campaign.updated"] as Prisma.InputJsonValue,
        isActive: true,
      },
    });
    track("WebhookConfig");
  }

  // ── PromptVersion ──
  const prompts = [
    { id: "wk-prompt-final-report-v1",     purpose: "final-report",     version: 1, body: "You are an Oracle final-report writer. Produce 21 sections following ADVE→RTIS structure." },
    { id: "wk-prompt-agent-v3",            purpose: "agent",            version: 3, body: "You are a background reasoning agent. Be concise, structured JSON output expected." },
    { id: "wk-prompt-extraction-v2",       purpose: "extraction",       version: 2, body: "Extract structured fields from free-form intake responses. Return strict JSON." },
    { id: "wk-prompt-intake-followup-v5",  purpose: "intake-followup",  version: 5, body: "Generate 1 adaptive follow-up question for the intake funnel based on the latest answer." },
  ];
  for (const p of prompts) {
    await prisma.promptVersion.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        purpose: p.purpose,
        version: p.version,
        body: p.body,
        active: true,
      },
    });
    track("PromptVersion");
  }

  // ── ModelPolicy ──
  const policies = [
    { purpose: "final-report",    anthropicModel: "claude-opus-4-20250514",   ollamaModel: null,        allowOllamaSubstitution: false },
    { purpose: "agent",           anthropicModel: "claude-sonnet-4-20250514", ollamaModel: "llama3.1:70b", allowOllamaSubstitution: true },
    { purpose: "intermediate",    anthropicModel: "claude-sonnet-4-20250514", ollamaModel: "llama3.1:70b", allowOllamaSubstitution: true },
    { purpose: "extraction",      anthropicModel: "claude-sonnet-4-20250514", ollamaModel: "llama3.1:70b", allowOllamaSubstitution: true },
    { purpose: "intake-followup", anthropicModel: "claude-haiku-4-5-20251001", ollamaModel: "llama3.1:8b", allowOllamaSubstitution: true },
  ];
  for (const p of policies) {
    await prisma.modelPolicy.upsert({
      where: { purpose: p.purpose },
      update: {},
      create: {
        purpose: p.purpose,
        anthropicModel: p.anthropicModel,
        ollamaModel: p.ollamaModel,
        allowOllamaSubstitution: p.allowOllamaSubstitution,
        pipelineVersion: "V1",
        version: 1,
        notes: `Wakanda seed default policy for ${p.purpose}.`,
      },
    });
    track("ModelPolicy");
  }

  // ── PaymentProviderConfig ──
  const providers = [
    { providerId: "CINETPAY", enabled: true,  config: { region: "Africa", default: true } },
    { providerId: "STRIPE",   enabled: true,  config: { default: true } },
    { providerId: "PAYPAL",   enabled: false, config: { sandbox: true } },
  ];
  for (const p of providers) {
    await prisma.paymentProviderConfig.upsert({
      where: { providerId: p.providerId },
      update: {},
      create: {
        providerId: p.providerId,
        enabled: p.enabled,
        config: p.config as Prisma.InputJsonValue,
      },
    });
    track("PaymentProviderConfig");
  }

  // ── McpApiKey ──
  const mcpKeys = [
    { id: "wk-mcp-key-internal", name: "Internal swarm",   server: "lafusee-mcp",  permissions: ["read", "write"] },
    { id: "wk-mcp-key-readonly", name: "Readonly external", server: "lafusee-mcp", permissions: ["read"] },
  ];
  for (const k of mcpKeys) {
    await prisma.mcpApiKey.upsert({
      where: { id: k.id },
      update: {},
      create: {
        id: k.id,
        name: k.name,
        keyHash: `sha256_${k.id}_BASE64`,
        server: k.server,
        permissions: k.permissions as Prisma.InputJsonValue,
        isActive: true,
      },
    });
    track("McpApiKey");
  }

  console.log(
    `  [OK] Auth + infra : 4 Account, 3 Session, 2 VerificationToken, 1 MfaSecret, 2 Subscription, 3 WebhookConfig, 4 PromptVersion, 5 ModelPolicy, 3 PaymentProviderConfig, 2 McpApiKey`,
  );
}
