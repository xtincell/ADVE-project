/**
 * sms-broadcast — Sprint I (Phase 8+ Anubis sub-service).
 *
 * Multi-provider SMS gateway : Twilio + Africa's Talking + Vonage.
 * Provider sélectionné par capacité régionale + dispo env.
 *
 * Anubis.dispatchMessage(channel=SMS, ...) délègue ici.
 */

interface SendSmsInput {
  to: string;          // E.164 format (e.g. "+237...")
  body: string;        // Max 160 chars per segment
  countryCode?: string;
  tag?: string;
}

interface SendSmsResult {
  ok: boolean;
  provider: "twilio" | "africastalking" | "vonage" | "log";
  externalMessageId?: string;
  error?: string;
}

function pickProvider(countryCode: string | undefined): "twilio" | "africastalking" | "vonage" | null {
  // Africa's Talking covers WK/CM/CI/SN/KE/UG/etc. ; Twilio global ; Vonage SMS fallback.
  const africanCountries = new Set(["WK", "CM", "CI", "SN", "KE", "UG", "TZ", "GH", "NG", "RW", "ZA", "ZM", "ZW"]);
  if (countryCode && africanCountries.has(countryCode) && process.env.AFRICASTALKING_API_KEY) {
    return "africastalking";
  }
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) return "twilio";
  if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) return "vonage";
  return null;
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const provider = pickProvider(input.countryCode);
  if (!provider) {
    console.log(`[sms:log] to=${input.to} body="${input.body.slice(0, 100)}"`);
    return { ok: true, provider: "log" };
  }
  if (provider === "twilio") return sendViaTwilio(input);
  if (provider === "africastalking") return sendViaAfricasTalking(input);
  return sendViaVonage(input);
}

async function sendViaTwilio(input: SendSmsInput): Promise<SendSmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const tok = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER ?? "+15005550006";
  const auth = Buffer.from(`${sid}:${tok}`).toString("base64");
  const body = new URLSearchParams({ To: input.to, From: from, Body: input.body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
  if (!res.ok || !data.sid) {
    return { ok: false, provider: "twilio", error: data.message ?? `code ${data.code}` };
  }
  return { ok: true, provider: "twilio", externalMessageId: data.sid };
}

async function sendViaAfricasTalking(input: SendSmsInput): Promise<SendSmsResult> {
  const apiKey = process.env.AFRICASTALKING_API_KEY!;
  const username = process.env.AFRICASTALKING_USERNAME ?? "sandbox";
  const body = new URLSearchParams({
    username,
    to: input.to,
    message: input.body,
    from: process.env.AFRICASTALKING_SENDER_ID ?? "LAFUSEE",
  });
  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: { apiKey, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as {
    SMSMessageData?: { Recipients?: Array<{ messageId?: string; status?: string }> };
  };
  const r = data.SMSMessageData?.Recipients?.[0];
  if (!res.ok || !r?.messageId) {
    return { ok: false, provider: "africastalking", error: r?.status ?? "unknown" };
  }
  return { ok: true, provider: "africastalking", externalMessageId: r.messageId };
}

async function sendViaVonage(input: SendSmsInput): Promise<SendSmsResult> {
  const apiKey = process.env.VONAGE_API_KEY!;
  const apiSecret = process.env.VONAGE_API_SECRET!;
  const from = process.env.VONAGE_FROM_NUMBER ?? "LAFUSEE";
  const body = new URLSearchParams({
    api_key: apiKey,
    api_secret: apiSecret,
    to: input.to.replace(/^\+/, ""),
    from,
    text: input.body,
  });
  const res = await fetch("https://rest.nexmo.com/sms/json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as {
    messages?: Array<{ "message-id"?: string; status?: string; "error-text"?: string }>;
  };
  const m = data.messages?.[0];
  if (!res.ok || m?.status !== "0") {
    return { ok: false, provider: "vonage", error: m?.["error-text"] ?? "unknown" };
  }
  return { ok: true, provider: "vonage", externalMessageId: m["message-id"] };
}
